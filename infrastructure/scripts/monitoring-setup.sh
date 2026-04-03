#!/bin/bash
# Monitoring setup script for FinFlow infrastructure
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

INFRA_DIR="${INFRA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DOMAIN="${DOMAIN:-finflow.example.com}"

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

check_helm() {
  if ! command -v helm &>/dev/null; then
    print_error "helm is not installed."
    exit 1
  fi
}

print_header "Checking prerequisites"
check_kubectl
check_helm

print_header "Setting up monitoring namespace"
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

print_header "Adding Helm repositories"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add elastic https://helm.elastic.co
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

print_header "Installing Prometheus stack"
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values "$INFRA_DIR/terraform/helm-values/prometheus-values.yaml" \
  --timeout 10m \
  --wait

kubectl rollout status deployment/prometheus-kube-prometheus-operator -n monitoring --timeout=300s
kubectl rollout status statefulset/prometheus-prometheus-kube-prometheus-prometheus -n monitoring --timeout=300s
kubectl rollout status deployment/prometheus-grafana -n monitoring --timeout=300s

print_header "Installing Elasticsearch"
helm upgrade --install elasticsearch elastic/elasticsearch \
  --namespace monitoring \
  --values "$INFRA_DIR/terraform/helm-values/elasticsearch-values.yaml" \
  --timeout 10m \
  --wait

kubectl rollout status statefulset/elasticsearch-master -n monitoring --timeout=600s

print_header "Installing Fluentd"
helm upgrade --install fluentd fluent/fluentd \
  --namespace monitoring \
  --values "$INFRA_DIR/terraform/helm-values/fluentd-values.yaml" \
  --timeout 5m \
  --wait

kubectl rollout status daemonset/fluentd -n monitoring --timeout=300s

print_header "Installing Kibana"
helm upgrade --install kibana elastic/kibana \
  --namespace monitoring \
  --set elasticsearchHosts="http://elasticsearch-master:9200" \
  --timeout 5m \
  --wait

kubectl rollout status deployment/kibana-kibana -n monitoring --timeout=300s

print_header "Configuring ServiceMonitor for FinFlow services"
kubectl apply -f "$INFRA_DIR/monitoring/kubernetes/service-monitor.yaml"

print_header "Applying Prometheus alert rules"
kubectl apply -f - <<YAML
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: finflow-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
$(sed 's/^/    /' "$INFRA_DIR/monitoring/prometheus/rules.yml")
YAML

print_header "Applying Grafana dashboards"
kubectl apply -f "$INFRA_DIR/monitoring/grafana/dashboards-configmap.yaml"

print_header "Configuring monitoring ingress"
kubectl apply -f - <<YAML
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: monitoring
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - grafana.${DOMAIN}
        - prometheus.${DOMAIN}
        - kibana.${DOMAIN}
      secretName: monitoring-tls
  rules:
    - host: grafana.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prometheus-grafana
                port:
                  number: 80
    - host: prometheus.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prometheus-kube-prometheus-prometheus
                port:
                  number: 9090
    - host: kibana.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kibana-kibana
                port:
                  number: 5601
YAML

print_header "Verifying monitoring stack"
kubectl get pods -n monitoring

GRAFANA_PASS=$(kubectl get secret -n monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" 2>/dev/null | base64 -d || echo "check-secret")

print_header "Monitoring setup complete"
echo -e "${GREEN}Monitoring stack deployed successfully!${NC}"
echo "Grafana    : https://grafana.${DOMAIN}  (admin / ${GRAFANA_PASS})"
echo "Prometheus : https://prometheus.${DOMAIN}"
echo "Kibana     : https://kibana.${DOMAIN}"
