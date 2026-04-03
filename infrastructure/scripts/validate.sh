#!/bin/bash
# Infrastructure validation script for FinFlow
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INFRA_DIR="${INFRA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ERRORS=0

print_status() {
  if [ "$1" -eq 0 ]; then
    echo -e "  ${GREEN}✓ $2${NC}"
  else
    echo -e "  ${RED}✗ $2${NC}"
    [ -n "${3:-}" ] && echo -e "    ${YELLOW}→ $3${NC}"
    ERRORS=$((ERRORS + 1))
  fi
}

section() { echo -e "\n${BLUE}▶ $1${NC}"; }

echo "=== FinFlow Infrastructure Validation ==="
echo "Base dir: $INFRA_DIR"
echo "Started : $(date)"

section "Directory structure"
for dir in docker kubernetes ansible terraform scripts monitoring; do
  [ -d "$INFRA_DIR/$dir" ]
  print_status $? "Directory: $dir"
done

section "Dockerfiles"
for svc in frontend api-gateway auth-service payments-service accounting-service analytics-service credit-engine; do
  [ -f "$INFRA_DIR/docker/$svc/Dockerfile" ]
  print_status $? "Dockerfile: $svc"
done

section "Kubernetes manifests"
for svc in frontend api-gateway auth-service payments-service accounting-service analytics-service credit-engine databases; do
  [ -d "$INFRA_DIR/kubernetes/$svc" ]
  print_status $? "K8s dir: $svc"
done

section "Kubernetes ingress files"
for f in "kubernetes/frontend/ingress.yaml" "kubernetes/api-gateway/ingress.yaml"; do
  [ -f "$INFRA_DIR/$f" ]
  print_status $? "File: $f"
done

section "Kafka & ZooKeeper manifests"
grep -q "zookeeper" "$INFRA_DIR/kubernetes/databases/kafka-statefulset.yaml" 2>/dev/null
print_status $? "ZooKeeper StatefulSet present in kafka-statefulset.yaml"
grep -q "zookeeper" "$INFRA_DIR/kubernetes/databases/kafka-service.yaml" 2>/dev/null
print_status $? "ZooKeeper Service present in kafka-service.yaml"

section "Port consistency"
GW_PORT=$(grep -A2 'name: http' "$INFRA_DIR/kubernetes/api-gateway/service.yaml" 2>/dev/null | grep 'port:' | head -1 | awk '{print $2}')
CE_PORT=$(grep -A2 'name: http' "$INFRA_DIR/kubernetes/credit-engine/service.yaml" 2>/dev/null | grep 'port:' | head -1 | awk '{print $2}')
[ "$GW_PORT" != "$CE_PORT" ]
print_status $? "api-gateway ($GW_PORT) and credit-engine ($CE_PORT) ports are different"

section "Ansible playbooks and roles"
[ -f "$INFRA_DIR/ansible/site.yml" ]
print_status $? "ansible/site.yml"
for role in common docker kubernetes monitoring deployment; do
  [ -d "$INFRA_DIR/ansible/roles/$role" ]
  print_status $? "Ansible role: $role"
done

section "Terraform modules"
[ -f "$INFRA_DIR/terraform/main.tf" ]
print_status $? "terraform/main.tf"
[ -f "$INFRA_DIR/terraform/variables.tf" ]
print_status $? "terraform/variables.tf"
[ -f "$INFRA_DIR/terraform/outputs.tf" ]
print_status $? "terraform/outputs.tf"
[ ! -f "$INFRA_DIR/terraform/outputs.tf.duplicate_backup" ]
print_status $? "No duplicate outputs backup file"
for mod in vpc eks rds ecr route53 bastion iam cloudwatch_logging secrets_manager; do
  [ -d "$INFRA_DIR/terraform/modules/$mod" ]
  print_status $? "Terraform module: $mod"
done

section "Helm values"
for f in prometheus-values.yaml fluentd-values.yaml elasticsearch-values.yaml grafana-values.yaml; do
  [ -f "$INFRA_DIR/terraform/helm-values/$f" ]
  print_status $? "Helm values: $f"
done

section "Docker Compose files"
[ -f "$INFRA_DIR/docker-compose.yml" ]
print_status $? "docker-compose.yml (root)"
[ -f "$INFRA_DIR/docker-compose.override.yml" ]
print_status $? "docker-compose.override.yml (dev overrides)"

section "Scripts"
for script in setup.sh deploy.sh backup.sh monitoring-setup.sh validate.sh; do
  [ -f "$INFRA_DIR/scripts/$script" ]
  print_status $? "Script exists: $script"
  [ -x "$INFRA_DIR/scripts/$script" ]
  print_status $? "Script executable: $script"
done

section "No hardcoded absolute paths in scripts"
BAD_PATHS=$(grep -rl '/FinFlow/\|/finflow-infra/' "$INFRA_DIR/scripts/" 2>/dev/null | tr '\n' ' ')
[ -z "$BAD_PATHS" ]
print_status $? "No hardcoded /FinFlow/ or /finflow-infra/ paths in scripts"

echo ""
echo "Completed: $(date)"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
else
  echo -e "${RED}$ERRORS check(s) failed.${NC}"
  exit 1
fi
