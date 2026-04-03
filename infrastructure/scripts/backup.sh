#!/bin/bash
# Backup script for FinFlow infrastructure
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

INFRA_DIR="${INFRA_DIR:-/opt/finflow/infrastructure}"
BACKUP_DIR="/finflow-backups/$(date +%Y-%m-%d)"
S3_BUCKET="${S3_BUCKET:-finflow-backups}"
NAMESPACE="${NAMESPACE:-finflow-prod}"
REGION=$(aws configure get region 2>/dev/null || echo "us-west-2")

print_header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }
print_step()   { echo -e "${YELLOW}>>> $1${NC}"; }
print_error()  { echo -e "${RED}ERROR: $1${NC}" >&2; }

check_kubectl() {
  if ! kubectl get nodes &>/dev/null; then
    print_error "kubectl is not connected to the cluster."
    echo "Run: aws eks update-kubeconfig --region <region> --name <cluster-name>"
    exit 1
  fi
}

print_header "Checking prerequisites"
print_step "Verifying kubectl connection"
check_kubectl

print_header "Setting up backup directory"
mkdir -p "$BACKUP_DIR/kubernetes" "$BACKUP_DIR/databases" "$BACKUP_DIR/terraform" "$BACKUP_DIR/ansible"

print_header "Backing up Kubernetes resources"
print_step "Backing up all resources in $NAMESPACE namespace"
kubectl get all -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/kubernetes/all-resources.yaml"
kubectl get configmaps -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/kubernetes/configmaps.yaml"
kubectl get secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/kubernetes/secrets.yaml"
kubectl get pvc -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/kubernetes/pvcs.yaml"
kubectl get ingress -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/kubernetes/ingress.yaml"

print_header "Backing up databases"

backup_postgres() {
  local service=$1
  local db_name=$2
  print_step "Backing up $service database"

  local secret_name="${service}-credentials"
  local db_password
  db_password=$(kubectl get secret "$secret_name" -n "$NAMESPACE" \
    -o jsonpath='{.data.password}' 2>/dev/null | base64 -d) || {
    print_error "Could not retrieve password for $service. Skipping."
    return 1
  }

  kubectl run "pg-dump-${service}" \
    --image=postgres:14 \
    --restart=Never \
    --namespace="$NAMESPACE" \
    --env="PGPASSWORD=${db_password}" \
    --command -- sleep 3600 2>/dev/null || true

  kubectl wait --for=condition=Ready "pod/pg-dump-${service}" \
    -n "$NAMESPACE" --timeout=60s

  local dump_file="/tmp/${service}-$(date +%Y-%m-%d).dump"
  kubectl exec -n "$NAMESPACE" "pg-dump-${service}" -- \
    pg_dump -h "$service" -U postgres -d "$db_name" -F c -f "$dump_file"

  kubectl cp "${NAMESPACE}/pg-dump-${service}:${dump_file}" \
    "$BACKUP_DIR/databases/${service}-$(date +%Y-%m-%d).dump"

  kubectl delete pod "pg-dump-${service}" -n "$NAMESPACE" --grace-period=0 2>/dev/null || true
}

backup_postgres "auth-db" "auth"
backup_postgres "payments-db" "payments"
backup_postgres "accounting-db" "accounting"
backup_postgres "analytics-db" "analytics"

print_header "Backing up Terraform state"
aws s3 cp "s3://finflow-terraform-state" "$BACKUP_DIR/terraform" --recursive || \
  print_error "Could not copy Terraform state - continuing"

print_header "Backing up Ansible files"
if [ -d "$INFRA_DIR/ansible" ]; then
  cp -r "$INFRA_DIR/ansible/vars" "$BACKUP_DIR/ansible/" 2>/dev/null || true
  [ -f "$INFRA_DIR/ansible/inventory.example" ] && \
    cp "$INFRA_DIR/ansible/inventory.example" "$BACKUP_DIR/ansible/"
fi

print_header "Creating compressed archive"
ARCHIVE_NAME="finflow-backup-$(date +%Y-%m-%d).tar.gz"
ARCHIVE_PATH="/finflow-backups/${ARCHIVE_NAME}"
cd /finflow-backups
tar -czf "$ARCHIVE_NAME" "$(basename "$BACKUP_DIR")"

print_header "Uploading to S3"
if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
  print_step "Creating S3 bucket: $S3_BUCKET"
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$S3_BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$S3_BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  aws s3api put-bucket-versioning --bucket "$S3_BUCKET" \
    --versioning-configuration Status=Enabled
  aws s3api put-bucket-encryption --bucket "$S3_BUCKET" \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-public-access-block --bucket "$S3_BUCKET" \
    --public-access-block-configuration \
    'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'
fi

print_step "Uploading backup archive to S3"
aws s3 cp "$ARCHIVE_PATH" "s3://${S3_BUCKET}/"

print_header "Cleaning up old local backups (keeping last 7 days)"
find /finflow-backups -maxdepth 1 -type d -name "????-??-??" -mtime +7 -exec rm -rf {} + 2>/dev/null || true

print_header "Backup complete"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo "Local archive : $ARCHIVE_PATH"
echo "S3 location   : s3://${S3_BUCKET}/${ARCHIVE_NAME}"
