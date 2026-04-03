#!/bin/bash
# Deployment script for FinFlow applications
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

INFRA_DIR="${INFRA_DIR:-/opt/finflow/infrastructure}"
NAMESPACE="${NAMESPACE:-finflow-prod}"
REGISTRY="${REGISTRY:-}"
TAG="${TAG:-latest}"

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

apply_manifests() {
  local component=$1
  local dir="$INFRA_DIR/kubernetes/$component"

  if [ ! -d "$dir" ]; then
    print_error "Manifest directory not found: $dir"
    return 1
  fi

  if [ -n "$REGISTRY" ] && [ -n "$TAG" ]; then
    for f in "$dir"/*.yaml; do
      sed -e "s|\${REGISTRY}|${REGISTRY}|g" -e "s|\${TAG}|${TAG}|g" "$f" | \
        kubectl apply -f - -n "$NAMESPACE"
    done
  else
    kubectl apply -f "$dir/" -n "$NAMESPACE"
  fi
}

print_header "Checking prerequisites"
check_kubectl

print_header "Setting up namespaces"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

print_header "Deploying databases"
print_step "Deploying ZooKeeper"
apply_manifests "databases"
kubectl rollout status statefulset/zookeeper -n "$NAMESPACE" --timeout=300s

print_step "Waiting for Kafka"
kubectl rollout status statefulset/kafka -n "$NAMESPACE" --timeout=300s

print_step "Waiting for databases"
for db in auth-db payments-db accounting-db analytics-db; do
  kubectl rollout status statefulset/$db -n "$NAMESPACE" --timeout=300s
done

print_header "Deploying backend services"
for svc in auth-service payments-service accounting-service analytics-service credit-engine; do
  print_step "Deploying $svc"
  apply_manifests "$svc"
  kubectl rollout status deployment/$svc -n "$NAMESPACE" --timeout=300s
done

print_header "Deploying API Gateway"
apply_manifests "api-gateway"
kubectl rollout status deployment/api-gateway -n "$NAMESPACE" --timeout=300s

print_header "Deploying Frontend"
apply_manifests "frontend"
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s

print_header "Verifying deployments"
kubectl get deployments -n "$NAMESPACE"
kubectl get pods -n "$NAMESPACE"
kubectl get services -n "$NAMESPACE"

FRONTEND_HOST=$(kubectl get svc frontend -n "$NAMESPACE" \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
API_HOST=$(kubectl get svc api-gateway -n "$NAMESPACE" \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")

print_header "Deployment complete"
echo -e "${GREEN}All FinFlow services have been successfully deployed!${NC}"
echo "Frontend  : https://finflow.example.com (LB: $FRONTEND_HOST)"
echo "API       : https://api.finflow.example.com (LB: $API_HOST)"
