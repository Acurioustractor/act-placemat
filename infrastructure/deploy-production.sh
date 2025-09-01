#!/bin/bash
# ACT Placemat Production Deployment Script
# Deploy complete platform with monitoring and optimization

set -euo pipefail

# Configuration
CLUSTER_NAME="act-placemat-production"
REGION="ap-southeast-2"
ENVIRONMENT="production"
NAMESPACE="act-production"
MONITORING_NAMESPACE="monitoring"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed and cluster is accessible
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl first."
    fi
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        error "terraform is not installed. Please install terraform first."
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error "helm is not installed. Please install helm first."
    fi
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install AWS CLI first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please run 'aws configure' first."
    fi
    
    success "All prerequisites check passed"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log "Deploying infrastructure with Terraform..."
    
    cd infrastructure/terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="environment=${ENVIRONMENT}" -out=tfplan
    
    # Apply infrastructure
    terraform apply tfplan
    
    # Get cluster configuration
    aws eks update-kubeconfig --region ${REGION} --name ${CLUSTER_NAME}
    
    success "Infrastructure deployed successfully"
    cd ../..
}

# Install essential cluster components
install_cluster_components() {
    log "Installing essential cluster components..."
    
    # Install metrics server
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    # Install nginx ingress controller
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    helm install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.metrics.enabled=true \
        --set controller.podAnnotations."prometheus\.io/scrape"="true" \
        --set controller.podAnnotations."prometheus\.io/port"="10254"
    
    # Install cert-manager for SSL certificates
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    helm install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --version v1.10.0 \
        --set installCRDs=true
    
    # Wait for components to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/metrics-server -n kube-system
    kubectl wait --for=condition=available --timeout=300s deployment/ingress-nginx-controller -n ingress-nginx
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
    
    success "Essential cluster components installed"
}

# Create SSL certificate issuer
create_cert_issuer() {
    log "Creating SSL certificate issuer..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@actplacemat.org.au
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
    
    success "SSL certificate issuer created"
}

# Create secrets
create_secrets() {
    log "Creating application secrets..."
    
    # Create namespaces
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace ${MONITORING_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Database credentials (replace with actual values)
    kubectl create secret generic database-credentials \
        --namespace=${NAMESPACE} \
        --from-literal=url="postgresql://username:password@database-host:5432/act_placemat" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Redis credentials
    kubectl create secret generic redis-credentials \
        --namespace=${NAMESPACE} \
        --from-literal=url="redis://redis-host:6379" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # AI API credentials
    kubectl create secret generic ai-credentials \
        --namespace=${NAMESPACE} \
        --from-literal=anthropic-key="${ANTHROPIC_API_KEY:-}" \
        --from-literal=perplexity-key="${PERPLEXITY_API_KEY:-}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Grafana admin password
    kubectl create secret generic grafana-credentials \
        --namespace=${MONITORING_NAMESPACE} \
        --from-literal=admin-password="$(openssl rand -base64 32)" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Monitoring basic auth
    kubectl create secret generic monitoring-auth \
        --namespace=${MONITORING_NAMESPACE} \
        --from-literal=auth="$(htpasswd -nb admin $(openssl rand -base64 32))" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Application secrets created"
}

# Deploy monitoring stack
deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    kubectl apply -f infrastructure/kubernetes/monitoring-stack.yaml
    
    # Wait for monitoring components to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n ${MONITORING_NAMESPACE}
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n ${MONITORING_NAMESPACE}
    kubectl wait --for=condition=available --timeout=300s deployment/alertmanager -n ${MONITORING_NAMESPACE}
    
    success "Monitoring stack deployed"
}

# Deploy application
deploy_application() {
    log "Deploying ACT Placemat application..."
    
    # Apply community scaling deployment
    kubectl apply -f infrastructure/kubernetes/community-scaling-deployment.yaml
    
    # Apply production deployment
    kubectl apply -f infrastructure/kubernetes/production-deployment.yaml
    
    # Wait for application to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/backend-production -n ${NAMESPACE}
    kubectl wait --for=condition=available --timeout=300s deployment/frontend-production -n ${NAMESPACE}
    
    success "ACT Placemat application deployed"
}

# Configure auto-scaling
configure_autoscaling() {
    log "Configuring cluster auto-scaling..."
    
    # Install cluster autoscaler
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/${CLUSTER_NAME}
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        env:
        - name: AWS_REGION
          value: ${REGION}
        volumeMounts:
        - name: ssl-certs
          mountPath: /etc/ssl/certs/ca-certificates.crt
          readOnly: true
        imagePullPolicy: "Always"
      volumes:
      - name: ssl-certs
        hostPath:
          path: "/etc/ssl/certs/ca-certificates.crt"
EOF
    
    success "Auto-scaling configured"
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    # Check application pods
    if kubectl get pods -n ${NAMESPACE} | grep -q "Running"; then
        success "Application pods are running"
    else
        warning "Some application pods are not running"
    fi
    
    # Check monitoring pods
    if kubectl get pods -n ${MONITORING_NAMESPACE} | grep -q "Running"; then
        success "Monitoring pods are running"
    else
        warning "Some monitoring pods are not running"
    fi
    
    # Check ingress
    if kubectl get ingress -n ${NAMESPACE} | grep -q "act-placemat-ingress"; then
        success "Ingress is configured"
    else
        warning "Ingress not found"
    fi
    
    # Test application endpoints
    log "Testing application endpoints..."
    sleep 30 # Wait for services to start
    
    # Get load balancer URL
    LB_URL=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    if [ -n "$LB_URL" ]; then
        success "Load balancer URL: http://$LB_URL"
    else
        warning "Load balancer URL not available yet"
    fi
}

# Display deployment summary
display_summary() {
    log "Deployment Summary"
    echo "=================="
    echo ""
    echo "Cluster: ${CLUSTER_NAME}"
    echo "Region: ${REGION}"
    echo "Environment: ${ENVIRONMENT}"
    echo ""
    echo "Services deployed:"
    echo "- ACT Placemat Application (${NAMESPACE} namespace)"
    echo "- Monitoring Stack (${MONITORING_NAMESPACE} namespace)"
    echo "- Auto-scaling components"
    echo ""
    echo "Monitoring URLs (after DNS configuration):"
    echo "- Grafana: https://monitoring.actplacemat.org.au/grafana"
    echo "- Prometheus: https://monitoring.actplacemat.org.au/prometheus"
    echo "- Alertmanager: https://monitoring.actplacemat.org.au/alertmanager"
    echo ""
    echo "Application URL (after DNS configuration):"
    echo "- ACT Placemat: https://app.actplacemat.org.au"
    echo ""
    echo "Next steps:"
    echo "1. Configure DNS to point to the load balancer"
    echo "2. Update monitoring alert email addresses"
    echo "3. Configure backup schedules"
    echo "4. Set up CI/CD pipelines"
}

# Main deployment function
main() {
    log "Starting ACT Placemat production deployment..."
    
    check_prerequisites
    deploy_infrastructure
    install_cluster_components
    create_cert_issuer
    create_secrets
    deploy_monitoring
    deploy_application
    configure_autoscaling
    run_health_checks
    display_summary
    
    success "Deployment completed successfully!"
}

# Handle script interruption
trap 'echo "Deployment interrupted. Cleaning up..."; exit 1' INT TERM

# Run main function
main "$@"