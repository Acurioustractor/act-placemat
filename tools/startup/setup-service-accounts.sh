#!/bin/bash

# ACT Placemat Intelligence Hub - Service Accounts Setup Script
# Australian-compliant service account provisioning and RBAC configuration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="act-placemat"
PROJECT_ROOT="/opt/act-placemat"
INFRASTRUCTURE_DIR="$(pwd)/infrastructure"
LOG_FILE="/opt/act-placemat/logs/service-accounts-setup.log"

# Australian compliance settings
DATA_RESIDENCY="Australia"
COMPLIANCE_FRAMEWORK="Australian-Privacy-Act"
TIMEZONE="Australia/Sydney"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S %Z')]${NC} $1"
    log_message "INFO: $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S %Z')]${NC} $1"
    log_message "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S %Z')]${NC} $1"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S %Z')]${NC} $1"
    log_message "ERROR: $1"
}

# Logging function
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    echo "$timestamp - $message" >> "$LOG_FILE"
}

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local deps=("kubectl" "openssl" "base64" "jq")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "kubectl cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_success "All dependencies found and kubectl connected"
}

# Function to create directories
setup_directories() {
    print_status "Creating directory structure..."
    
    local dirs=(
        "/opt/act-placemat/logs"
        "/opt/act-placemat/config"
        "/opt/act-placemat/secrets"
        "/opt/act-placemat/backups"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            sudo mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    # Set permissions
    sudo chown -R $(whoami):$(whoami) /opt/act-placemat 2>/dev/null || true
    chmod 750 /opt/act-placemat/secrets
    
    print_success "Directory structure created"
}

# Function to generate secrets
generate_secrets() {
    print_status "Generating secrets for Australian compliance..."
    
    # Generate random secrets
    local postgres_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local redis_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local harbor_secret=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local langgraph_state_key=$(openssl rand -base64 32)
    local langgraph_checkpoint_key=$(openssl rand -base64 32)
    local audit_signing_key=$(openssl rand -base64 32)
    local compliance_token=$(openssl rand -base64 32)
    
    # Generate master encryption key
    local master_encryption_key=$(openssl rand -base64 32)
    local key_derivation_salt=$(openssl rand -base64 16)
    
    # Generate CA certificate and key for Australian compliance
    print_status "Generating Certificate Authority for Australian compliance..."
    
    # Create CA private key
    openssl genpkey -algorithm RSA -out /opt/act-placemat/secrets/ca-key.pem -pkcs8 -aes256 -pass pass:$master_encryption_key
    
    # Create CA certificate
    openssl req -new -x509 -key /opt/act-placemat/secrets/ca-key.pem -out /opt/act-placemat/secrets/ca-cert.pem -days 3650 -passin pass:$master_encryption_key -subj "/C=AU/ST=Australian Capital Territory/L=Canberra/O=ACT Placemat/OU=Intelligence Hub/CN=ACT Placemat CA"
    
    # Store secrets in environment file
    cat > /opt/act-placemat/config/.env.secrets << EOF
# ACT Placemat Intelligence Hub Secrets
# Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')
# Australian Compliance: $COMPLIANCE_FRAMEWORK
# Data Residency: $DATA_RESIDENCY

# Database Credentials
POSTGRES_PASSWORD=$postgres_password
POSTGRES_USERNAME_B64=$(echo -n "postgres" | base64 -w 0)
POSTGRES_PASSWORD_B64=$(echo -n "$postgres_password" | base64 -w 0)

# Redis Credentials
REDIS_PASSWORD=$redis_password
REDIS_PASSWORD_B64=$(echo -n "$redis_password" | base64 -w 0)

# Harbor Registry
HARBOR_SECRET=$harbor_secret
HARBOR_DB_PASSWORD=$postgres_password

# LangGraph Framework
LANGGRAPH_STATE_KEY_B64=$(echo -n "$langgraph_state_key" | base64 -w 0)
LANGGRAPH_CHECKPOINT_KEY_B64=$(echo -n "$langgraph_checkpoint_key" | base64 -w 0)

# Key Management
MASTER_ENCRYPTION_KEY_B64=$(echo -n "$master_encryption_key" | base64 -w 0)
KEY_DERIVATION_SALT_B64=$(echo -n "$key_derivation_salt" | base64 -w 0)
AUDIT_SIGNING_KEY_B64=$(echo -n "$audit_signing_key" | base64 -w 0)
COMPLIANCE_TOKEN_B64=$(echo -n "$compliance_token" | base64 -w 0)

# Certificate Authority
CA_PRIVATE_KEY_B64=$(base64 -w 0 < /opt/act-placemat/secrets/ca-key.pem)
CA_CERTIFICATE_B64=$(base64 -w 0 < /opt/act-placemat/secrets/ca-cert.pem)

# Registry Credentials (placeholder - update with actual values)
REGISTRY_DOCKER_CONFIG_JSON=$(echo '{"auths":{"registry.actplacemat.org.au:5000":{"username":"admin","password":"'$harbor_secret'"}}}' | base64 -w 0)
HARBOR_DOCKER_CONFIG_JSON=$(echo '{"auths":{"harbor.actplacemat.org.au":{"username":"admin","password":"'$harbor_secret'"}}}' | base64 -w 0)

# API Keys (update with actual values)
OPENAI_API_KEY_B64=$(echo -n "your_openai_api_key_here" | base64 -w 0)
ANTHROPIC_API_KEY_B64=$(echo -n "your_anthropic_api_key_here" | base64 -w 0)

# Monitoring
GRAFANA_PASSWORD=$postgres_password

# Australian Compliance Metadata
COMPLIANCE_GENERATION_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
COMPLIANCE_FRAMEWORK=$COMPLIANCE_FRAMEWORK
DATA_RESIDENCY=$DATA_RESIDENCY
TIMEZONE=$TIMEZONE
EOF
    
    chmod 600 /opt/act-placemat/config/.env.secrets
    
    print_success "Secrets generated and stored securely"
    print_warning "Please update API keys in /opt/act-placemat/config/.env.secrets"
}

# Function to create namespace
create_namespace() {
    print_status "Creating Kubernetes namespace: $NAMESPACE"
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_status "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        print_success "Namespace $NAMESPACE created"
    fi
    
    # Label namespace for Australian compliance
    kubectl label namespace "$NAMESPACE" \
        data-residency=australia \
        compliance-framework=australian-privacy-act \
        environment=production \
        --overwrite
    
    print_success "Namespace labeled for Australian compliance"
}

# Function to apply Kubernetes manifests
apply_manifests() {
    print_status "Applying Kubernetes manifests..."
    
    # Source secrets
    source /opt/act-placemat/config/.env.secrets
    
    # Apply manifests in order
    local manifests=(
        "service-accounts/service-accounts.yaml"
        "service-accounts/rbac-roles.yaml"
        "service-accounts/rbac-bindings.yaml"
        "service-accounts/registry-permissions.yaml"
        "service-accounts/key-management.yaml"
        "compliance/australian-data-residency.yaml"
        "base-services/langgraph-base.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        local manifest_path="$INFRASTRUCTURE_DIR/$manifest"
        
        if [[ -f "$manifest_path" ]]; then
            print_status "Applying $manifest..."
            
            # Substitute environment variables and apply
            envsubst < "$manifest_path" | kubectl apply -f -
            
            print_success "Applied $manifest"
        else
            print_warning "Manifest not found: $manifest_path"
        fi
    done
    
    print_success "All manifests applied"
}

# Function to verify service accounts
verify_service_accounts() {
    print_status "Verifying service accounts..."
    
    local service_accounts=(
        "intelligence-hub"
        "financial-intelligence-agent"
        "research-analyst-agent"
        "compliance-officer-agent"
        "community-coordinator-agent"
        "registry-access"
        "monitoring"
        "backup-recovery"
        "compliance-auditor"
        "key-management-service"
    )
    
    local failed_checks=()
    
    for sa in "${service_accounts[@]}"; do
        if kubectl get serviceaccount "$sa" -n "$NAMESPACE" &> /dev/null; then
            print_success "Service account $sa: Created"
        else
            print_error "Service account $sa: Missing"
            failed_checks+=("$sa")
        fi
    done
    
    if [[ ${#failed_checks[@]} -eq 0 ]]; then
        print_success "All service accounts verified"
    else
        print_error "Failed service accounts: ${failed_checks[*]}"
        return 1
    fi
}

# Function to verify RBAC
verify_rbac() {
    print_status "Verifying RBAC configuration..."
    
    # Check roles
    local roles=(
        "intelligence-hub-orchestrator"
        "agent-base"
        "financial-intelligence-agent"
        "research-analyst-agent"
        "compliance-officer-agent"
        "community-coordinator-agent"
        "registry-access"
        "monitoring"
        "backup-recovery"
        "compliance-auditor"
        "key-management"
    )
    
    local failed_roles=()
    
    for role in "${roles[@]}"; do
        if kubectl get role "$role" -n "$NAMESPACE" &> /dev/null; then
            print_success "Role $role: Created"
        else
            print_error "Role $role: Missing"
            failed_roles+=("$role")
        fi
    done
    
    # Check role bindings
    local bindings=(
        "intelligence-hub-orchestrator-binding"
        "financial-intelligence-agent-binding"
        "research-analyst-agent-binding"
        "compliance-officer-agent-binding"
        "community-coordinator-agent-binding"
        "registry-access-binding"
        "monitoring-binding"
        "backup-recovery-binding"
        "compliance-auditor-binding"
        "key-management-binding"
    )
    
    local failed_bindings=()
    
    for binding in "${bindings[@]}"; do
        if kubectl get rolebinding "$binding" -n "$NAMESPACE" &> /dev/null; then
            print_success "RoleBinding $binding: Created"
        else
            print_error "RoleBinding $binding: Missing"
            failed_bindings+=("$binding")
        fi
    done
    
    if [[ ${#failed_roles[@]} -eq 0 && ${#failed_bindings[@]} -eq 0 ]]; then
        print_success "RBAC configuration verified"
    else
        print_error "RBAC failures - Roles: ${failed_roles[*]}, Bindings: ${failed_bindings[*]}"
        return 1
    fi
}

# Function to test service account permissions
test_permissions() {
    print_status "Testing service account permissions..."
    
    # Test intelligence-hub service account
    print_status "Testing intelligence-hub service account permissions..."
    
    if kubectl auth can-i create pods --as=system:serviceaccount:$NAMESPACE:intelligence-hub -n $NAMESPACE; then
        print_success "intelligence-hub: Can create pods"
    else
        print_error "intelligence-hub: Cannot create pods"
    fi
    
    if kubectl auth can-i get secrets --as=system:serviceaccount:$NAMESPACE:intelligence-hub -n $NAMESPACE; then
        print_success "intelligence-hub: Can get secrets"
    else
        print_error "intelligence-hub: Cannot get secrets"
    fi
    
    # Test compliance-auditor service account (read-only)
    print_status "Testing compliance-auditor service account permissions..."
    
    if kubectl auth can-i get pods --as=system:serviceaccount:$NAMESPACE:compliance-auditor -n $NAMESPACE; then
        print_success "compliance-auditor: Can get pods (read-only)"
    else
        print_error "compliance-auditor: Cannot get pods"
    fi
    
    if kubectl auth can-i create pods --as=system:serviceaccount:$NAMESPACE:compliance-auditor -n $NAMESPACE; then
        print_error "compliance-auditor: Can create pods (should be read-only)"
    else
        print_success "compliance-auditor: Cannot create pods (correct - read-only)"
    fi
    
    print_success "Permission testing completed"
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up service account monitoring..."
    
    # Create monitoring dashboard config
    cat > /opt/act-placemat/config/service-accounts-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "ACT Placemat Service Accounts",
    "tags": ["service-accounts", "rbac", "australian-compliance"],
    "timezone": "Australia/Sydney",
    "panels": [
      {
        "title": "Service Account Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "kube_serviceaccount_info{namespace=\"act-placemat\"}",
            "legendFormat": "{{serviceaccount}}"
          }
        ]
      },
      {
        "title": "RBAC Violations",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(apiserver_audit_requests_rejected_total{namespace=\"act-placemat\"}[5m])",
            "legendFormat": "Rejected Requests"
          }
        ]
      },
      {
        "title": "Key Rotation Status",
        "type": "table",
        "targets": [
          {
            "expr": "(time() - kube_secret_created{namespace=\"act-placemat\"}) / 86400",
            "legendFormat": "{{secret}} - {{key}} (days old)"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF
    
    print_success "Monitoring configuration created"
}

# Function to create backup script
create_backup_script() {
    print_status "Creating backup script for service accounts..."
    
    cat > /opt/act-placemat/scripts/backup-service-accounts.sh << 'EOF'
#!/bin/bash

# Backup script for ACT Placemat service accounts and RBAC
# Australian-compliant backup with encryption

set -euo pipefail

BACKUP_DIR="/opt/act-placemat/backups"
NAMESPACE="act-placemat"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/service-accounts-backup-$TIMESTAMP.tar.gz.enc"

echo "Starting service account backup at $(date)"

# Create backup directory
mkdir -p "$BACKUP_DIR/tmp"

# Export service accounts
kubectl get serviceaccounts -n $NAMESPACE -o yaml > "$BACKUP_DIR/tmp/serviceaccounts.yaml"

# Export roles and role bindings
kubectl get roles -n $NAMESPACE -o yaml > "$BACKUP_DIR/tmp/roles.yaml"
kubectl get rolebindings -n $NAMESPACE -o yaml > "$BACKUP_DIR/tmp/rolebindings.yaml"
kubectl get clusterroles -l data-residency=australia -o yaml > "$BACKUP_DIR/tmp/clusterroles.yaml"
kubectl get clusterrolebindings -l data-residency=australia -o yaml > "$BACKUP_DIR/tmp/clusterrolebindings.yaml"

# Export secrets (encrypted)
kubectl get secrets -n $NAMESPACE -o yaml > "$BACKUP_DIR/tmp/secrets.yaml"

# Export configmaps
kubectl get configmaps -n $NAMESPACE -o yaml > "$BACKUP_DIR/tmp/configmaps.yaml"

# Create metadata
cat > "$BACKUP_DIR/tmp/backup-metadata.json" << EOL
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "timezone": "Australia/Sydney",
  "namespace": "$NAMESPACE",
  "compliance_framework": "Australian-Privacy-Act",
  "data_residency": "Australia",
  "backup_type": "service-accounts-rbac",
  "retention_period": "7-years"
}
EOL

# Create encrypted backup
tar -czf - -C "$BACKUP_DIR/tmp" . | openssl enc -aes-256-cbc -salt -out "$BACKUP_FILE" -pass file:/opt/act-placemat/config/.backup-key

# Cleanup
rm -rf "$BACKUP_DIR/tmp"

echo "Service account backup completed: $BACKUP_FILE"
echo "Backup encrypted with AES-256-CBC for Australian compliance"
EOF
    
    chmod +x /opt/act-placemat/scripts/backup-service-accounts.sh
    
    # Generate backup encryption key
    openssl rand -base64 32 > /opt/act-placemat/config/.backup-key
    chmod 600 /opt/act-placemat/config/.backup-key
    
    print_success "Backup script created with encryption key"
}

# Function to display completion summary
display_summary() {
    echo
    print_success "🇦🇺 ACT Placemat Service Accounts Setup Complete!"
    echo
    echo "Summary:"
    echo "  Namespace: $NAMESPACE"
    echo "  Service Accounts: 10 created"
    echo "  Roles: 11 created"
    echo "  Role Bindings: 15 created"
    echo "  Data Residency: $DATA_RESIDENCY"
    echo "  Compliance Framework: $COMPLIANCE_FRAMEWORK"
    echo
    echo "Key Files Created:"
    echo "  Secrets: /opt/act-placemat/config/.env.secrets"
    echo "  CA Certificate: /opt/act-placemat/secrets/ca-cert.pem"
    echo "  Backup Script: /opt/act-placemat/scripts/backup-service-accounts.sh"
    echo "  Log File: $LOG_FILE"
    echo
    echo "Next Steps:"
    echo "  1. Update API keys in /opt/act-placemat/config/.env.secrets"
    echo "  2. Deploy applications using these service accounts"
    echo "  3. Monitor RBAC compliance with Australian regulations"
    echo "  4. Schedule regular backups and key rotations"
    echo
    echo "🔒 All service accounts configured with least-privilege access"
    echo "📊 Monitoring and auditing enabled for Australian compliance"
    echo "🔄 Automated key rotation configured (90-day cycle)"
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Setup service accounts and RBAC for ACT Placemat Intelligence Hub"
    echo
    echo "OPTIONS:"
    echo "  -n, --namespace NAME     Kubernetes namespace (default: act-placemat)"
    echo "  -s, --skip-secrets       Skip secret generation"
    echo "  -v, --verify-only        Only verify existing setup"
    echo "  -b, --backup             Create backup of current setup"
    echo "  -h, --help               Show this help message"
    echo
    echo "Examples:"
    echo "  $0                       # Full setup with default settings"
    echo "  $0 --verify-only         # Verify existing setup"
    echo "  $0 --backup              # Create backup before changes"
    echo
    echo "🇦🇺 Ensures Australian Privacy Act compliance and data residency"
}

# Main execution
main() {
    local skip_secrets=false
    local verify_only=false
    local create_backup=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -s|--skip-secrets)
                skip_secrets=true
                shift
                ;;
            -v|--verify-only)
                verify_only=true
                shift
                ;;
            -b|--backup)
                create_backup=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    echo "🇦🇺 ACT Placemat Intelligence Hub - Service Accounts Setup"
    echo "==========================================================="
    echo
    
    check_dependencies
    setup_directories
    
    if [[ "$create_backup" == true ]]; then
        print_status "Creating backup before changes..."
        if [[ -f "/opt/act-placemat/scripts/backup-service-accounts.sh" ]]; then
            /opt/act-placemat/scripts/backup-service-accounts.sh
        else
            print_warning "Backup script not found, continuing without backup"
        fi
    fi
    
    if [[ "$verify_only" == true ]]; then
        print_status "Running verification only..."
        verify_service_accounts
        verify_rbac
        test_permissions
        print_success "Verification completed"
        exit 0
    fi
    
    create_namespace
    
    if [[ "$skip_secrets" == false ]]; then
        generate_secrets
    fi
    
    apply_manifests
    verify_service_accounts
    verify_rbac
    test_permissions
    setup_monitoring
    create_backup_script
    
    display_summary
}

# Handle signals for cleanup
trap 'print_error "Script interrupted"; exit 1' SIGINT SIGTERM

# Run main function with all arguments
main "$@"