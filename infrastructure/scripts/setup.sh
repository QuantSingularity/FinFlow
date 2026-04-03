#!/bin/bash
# Setup script for FinFlow infrastructure
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

INFRA_DIR="${INFRA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

print_header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }
print_step()   { echo -e "${YELLOW}>>> $1${NC}"; }
print_error()  { echo -e "${RED}ERROR: $1${NC}" >&2; }

print_header "Checking prerequisites"
print_step "Checking AWS CLI configuration"
if ! aws sts get-caller-identity &>/dev/null; then
  print_error "AWS CLI is not configured. Run 'aws configure' first."
  exit 1
fi

print_step "Checking required tools"
MISSING=()
for tool in terraform ansible kubectl helm; do
  if ! command -v "$tool" &>/dev/null; then
    MISSING+=("$tool")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  print_error "Missing tools: ${MISSING[*]}"
  exit 1
fi

REGION=$(aws configure get region 2>/dev/null || echo "us-west-2")
BUCKET_NAME="finflow-terraform-state"
TABLE_NAME="finflow-terraform-locks"

print_header "Setting up Terraform backend"
print_step "Ensuring S3 bucket: $BUCKET_NAME"
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  aws s3api put-bucket-versioning --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled
  aws s3api put-bucket-encryption --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'
  echo "S3 bucket created."
fi

print_step "Ensuring DynamoDB lock table: $TABLE_NAME"
if ! aws dynamodb describe-table --table-name "$TABLE_NAME" &>/dev/null; then
  aws dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"
  echo "DynamoDB table created."
fi

print_header "Initializing Terraform"
cd "$INFRA_DIR/terraform"
terraform init -upgrade

print_header "Validating Terraform"
terraform validate

print_header "Planning Terraform"
terraform plan -out=tfplan

print_header "Applying Terraform configuration"
terraform apply tfplan

print_header "Configuring kubectl"
CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"

print_header "Running Ansible playbooks"
cd "$INFRA_DIR/ansible"
if [ -f "inventory/prod" ]; then
  ansible-playbook -i inventory/prod site.yml
else
  echo "No Ansible inventory found at inventory/prod — skipping Ansible step."
fi

print_header "Deploying applications"
INFRA_DIR="$INFRA_DIR" bash "$INFRA_DIR/scripts/deploy.sh"

print_header "Setting up monitoring"
INFRA_DIR="$INFRA_DIR" bash "$INFRA_DIR/scripts/monitoring-setup.sh"

print_header "Infrastructure setup complete"
echo -e "${GREEN}Setup finished!${NC}"
echo "Grafana   : https://grafana.finflow.example.com"
echo "Kibana    : https://kibana.finflow.example.com"
echo "Frontend  : $(kubectl get svc frontend -n finflow-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo 'pending')"
echo "API       : $(kubectl get svc api-gateway -n finflow-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo 'pending')"
