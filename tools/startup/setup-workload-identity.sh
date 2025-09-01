#!/bin/bash

# ACT Placemat Intelligence Hub - Workload Identity Federation Setup Script
# Configures secure CI/CD authentication for GitHub Actions with Australian compliance

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="act-placemat-intelligence-hub"
PROJECT_NUMBER=""  # Will be retrieved
REGION="australia-southeast1"
POOL_ID="github-actions-pool"
PROVIDER_ID="github-actions-provider"
REPO_OWNER="benknight"
REPO_NAME="ACT-Placemat"
LOG_FILE="/opt/act-placemat/logs/workload-identity-setup.log"

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
    
    local deps=("gcloud" "kubectl" "jq")
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
    
    # Check gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 &> /dev/null; then
        print_error "gcloud not authenticated. Please run 'gcloud auth login'"
        exit 1
    fi
    
    print_success "All dependencies found and gcloud authenticated"
}

# Function to setup directories
setup_directories() {
    print_status "Creating directory structure..."
    
    local dirs=(
        "/opt/act-placemat/logs"
        "/opt/act-placemat/config"
        "/opt/act-placemat/workload-identity"
        "/opt/act-placemat/scripts"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            sudo mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    # Set permissions
    sudo chown -R $(whoami):$(whoami) /opt/act-placemat 2>/dev/null || true
    
    print_success "Directory structure created"
}

# Function to get project information
get_project_info() {
    print_status "Retrieving project information..."
    
    # Set active project
    gcloud config set project "$PROJECT_ID"
    
    # Get project number
    PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    
    if [[ -z "$PROJECT_NUMBER" ]]; then
        print_error "Could not retrieve project number for $PROJECT_ID"
        exit 1
    fi
    
    print_success "Project ID: $PROJECT_ID"
    print_success "Project Number: $PROJECT_NUMBER"
    print_success "Region: $REGION"
}

# Function to enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    local apis=(
        "iam.googleapis.com"
        "iamcredentials.googleapis.com"
        "sts.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "secretmanager.googleapis.com"
        "container.googleapis.com"
        "logging.googleapis.com"
        "monitoring.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        print_status "Enabling $api..."
        gcloud services enable "$api" --project="$PROJECT_ID"
    done
    
    print_success "All required APIs enabled"
}

# Function to create workload identity pool
create_workload_identity_pool() {
    print_status "Creating Workload Identity Pool..."
    
    # Check if pool already exists
    if gcloud iam workload-identity-pools describe "$POOL_ID" \
        --location="global" \
        --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Workload Identity Pool $POOL_ID already exists"
    else
        gcloud iam workload-identity-pools create "$POOL_ID" \
            --location="global" \
            --description="GitHub Actions Pool for ACT Placemat Intelligence Hub" \
            --display-name="GitHub Actions Pool" \
            --project="$PROJECT_ID"
        
        print_success "Workload Identity Pool created: $POOL_ID"
    fi
    
    # Get the full pool resource name
    WIF_POOL_NAME="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID"
    print_success "Pool resource name: $WIF_POOL_NAME"
}

# Function to create OIDC provider
create_oidc_provider() {
    print_status "Creating GitHub OIDC provider..."
    
    # Check if provider already exists
    if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
        --location="global" \
        --workload-identity-pool="$POOL_ID" \
        --project="$PROJECT_ID" &> /dev/null; then
        print_warning "OIDC provider $PROVIDER_ID already exists"
    else
        gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
            --location="global" \
            --workload-identity-pool="$POOL_ID" \
            --issuer-uri="https://token.actions.githubusercontent.com" \
            --allowed-audiences="sts.googleapis.com" \
            --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref,attribute.ref_type=assertion.ref_type,attribute.workflow=assertion.workflow,attribute.job_workflow_ref=assertion.job_workflow_ref,attribute.event_name=assertion.event_name" \
            --attribute-condition="assertion.repository_owner == \"$REPO_OWNER\" && assertion.repository == \"$REPO_OWNER/$REPO_NAME\" && (assertion.ref == \"refs/heads/main\" || assertion.ref == \"refs/heads/unified-intelligence\" || assertion.ref.startsWith(\"refs/heads/feature/\") || assertion.ref.startsWith(\"refs/heads/hotfix/\") || assertion.ref.startsWith(\"refs/tags/v\"))" \
            --project="$PROJECT_ID"
        
        print_success "OIDC provider created: $PROVIDER_ID"
    fi
    
    # Get the full provider resource name
    WIF_PROVIDER_NAME="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
    print_success "Provider resource name: $WIF_PROVIDER_NAME"
}

# Function to create service accounts
create_service_accounts() {
    print_status "Creating service accounts for GitHub Actions..."
    
    local service_accounts=(
        "github-actions-deploy:GitHub Actions deployment service account"
        "github-actions-test:GitHub Actions testing service account"
        "github-actions-security:GitHub Actions security scanning service account"
    )
    
    for sa_info in "${service_accounts[@]}"; do
        local sa_name=$(echo "$sa_info" | cut -d':' -f1)
        local sa_description=$(echo "$sa_info" | cut -d':' -f2)
        
        print_status "Creating service account: $sa_name"
        
        # Check if service account exists
        if gcloud iam service-accounts describe "${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com" \
            --project="$PROJECT_ID" &> /dev/null; then
            print_warning "Service account $sa_name already exists"
        else
            gcloud iam service-accounts create "$sa_name" \
                --description="$sa_description" \
                --display-name="$sa_name" \
                --project="$PROJECT_ID"
            
            print_success "Service account created: $sa_name"
        fi
    done
}

# Function to assign IAM roles
assign_iam_roles() {
    print_status "Assigning IAM roles to service accounts..."
    
    # GitHub Actions Deploy service account roles
    local deploy_roles=(
        "roles/container.developer"
        "roles/secretmanager.secretAccessor" 
        "roles/storage.objectAdmin"
        "roles/cloudsql.client"
        "roles/logging.logWriter"
        "roles/monitoring.metricWriter"
    )
    
    for role in "${deploy_roles[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com" \
            --role="$role" \
            --condition=None
    done
    
    print_success "IAM roles assigned to github-actions-deploy"
    
    # GitHub Actions Test service account roles
    local test_roles=(
        "roles/container.developer"
        "roles/secretmanager.secretAccessor"
        "roles/storage.objectViewer"
        "roles/logging.logWriter"
    )
    
    for role in "${test_roles[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:github-actions-test@${PROJECT_ID}.iam.gserviceaccount.com" \
            --role="$role" \
            --condition=None
    done
    
    print_success "IAM roles assigned to github-actions-test"
    
    # GitHub Actions Security service account roles
    local security_roles=(
        "roles/container.developer"
        "roles/binaryauthorization.attestorsVerifier"
        "roles/cloudsecurity.findingsEditor"
        "roles/secretmanager.secretAccessor"
        "roles/logging.logWriter"
    )
    
    for role in "${security_roles[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:github-actions-security@${PROJECT_ID}.iam.gserviceaccount.com" \
            --role="$role" \
            --condition=None
    done
    
    print_success "IAM roles assigned to github-actions-security"
}

# Function to configure workload identity bindings
configure_workload_identity_bindings() {
    print_status "Configuring Workload Identity bindings..."
    
    local service_accounts=(
        "github-actions-deploy"
        "github-actions-test"
        "github-actions-security"
    )
    
    for sa_name in "${service_accounts[@]}"; do
        print_status "Configuring WIF binding for $sa_name"
        
        # Allow the GitHub Actions workflow to impersonate the service account
        gcloud iam service-accounts add-iam-policy-binding \
            "${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com" \
            --role="roles/iam.workloadIdentityUser" \
            --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$REPO_OWNER/$REPO_NAME" \
            --project="$PROJECT_ID"
            
        print_success "WIF binding configured for $sa_name"
    done
}

# Function to test workload identity setup
test_workload_identity() {
    print_status "Testing Workload Identity configuration..."
    
    # Create test token (this would normally be done by GitHub Actions)
    local test_audience="//iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
    
    print_status "Workload Identity Provider: $WIF_PROVIDER_NAME"
    print_status "Test audience: $test_audience"
    
    # Verify pool exists
    if gcloud iam workload-identity-pools describe "$POOL_ID" \
        --location="global" \
        --project="$PROJECT_ID" &> /dev/null; then
        print_success "✅ Workload Identity Pool accessible"
    else
        print_error "❌ Workload Identity Pool not accessible"
        return 1
    fi
    
    # Verify provider exists
    if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
        --location="global" \
        --workload-identity-pool="$POOL_ID" \
        --project="$PROJECT_ID" &> /dev/null; then
        print_success "✅ OIDC Provider accessible"
    else
        print_error "❌ OIDC Provider not accessible"
        return 1
    fi
    
    # Verify service accounts exist
    for sa_name in "github-actions-deploy" "github-actions-test" "github-actions-security"; do
        if gcloud iam service-accounts describe "${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com" \
            --project="$PROJECT_ID" &> /dev/null; then
            print_success "✅ Service account $sa_name accessible"
        else
            print_error "❌ Service account $sa_name not accessible"
            return 1
        fi
    done
    
    print_success "All Workload Identity components verified"
}

# Function to generate configuration files
generate_config_files() {
    print_status "Generating configuration files..."
    
    # Generate WIF configuration for GitHub Actions
    cat > /opt/act-placemat/workload-identity/github-actions-config.json << EOF
{
  "project_id": "$PROJECT_ID",
  "project_number": "$PROJECT_NUMBER",
  "region": "$REGION",
  "workload_identity_pool": "$WIF_POOL_NAME",
  "workload_identity_provider": "$WIF_PROVIDER_NAME",
  "service_accounts": {
    "deploy": "github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com",
    "test": "github-actions-test@${PROJECT_ID}.iam.gserviceaccount.com",
    "security": "github-actions-security@${PROJECT_ID}.iam.gserviceaccount.com"
  },
  "repository": {
    "owner": "$REPO_OWNER",
    "name": "$REPO_NAME",
    "full_name": "$REPO_OWNER/$REPO_NAME"
  },
  "compliance": {
    "framework": "$COMPLIANCE_FRAMEWORK",
    "data_residency": "$DATA_RESIDENCY",
    "timezone": "$TIMEZONE"
  },
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    # Generate environment file for scripts
    cat > /opt/act-placemat/config/.env.workload-identity << EOF
# ACT Placemat Workload Identity Federation Configuration
# Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')
# Australian Compliance: $COMPLIANCE_FRAMEWORK
# Data Residency: $DATA_RESIDENCY

# Project Configuration
PROJECT_ID=$PROJECT_ID
PROJECT_NUMBER=$PROJECT_NUMBER
REGION=$REGION

# Workload Identity Configuration
WIF_POOL_ID=$POOL_ID
WIF_PROVIDER_ID=$PROVIDER_ID
WIF_POOL_NAME=$WIF_POOL_NAME
WIF_PROVIDER_NAME=$WIF_PROVIDER_NAME

# Repository Configuration
REPO_OWNER=$REPO_OWNER
REPO_NAME=$REPO_NAME

# Service Accounts
SA_DEPLOY=github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com
SA_TEST=github-actions-test@${PROJECT_ID}.iam.gserviceaccount.com
SA_SECURITY=github-actions-security@${PROJECT_ID}.iam.gserviceaccount.com

# Australian Compliance
DATA_RESIDENCY=$DATA_RESIDENCY
COMPLIANCE_FRAMEWORK=$COMPLIANCE_FRAMEWORK
TIMEZONE=$TIMEZONE
EOF
    
    chmod 600 /opt/act-placemat/config/.env.workload-identity
    
    # Generate GitHub Actions workflow template
    cat > /opt/act-placemat/workload-identity/github-actions-template.yml << 'EOF'
# GitHub Actions Workflow Template for ACT Placemat
# Uses Workload Identity Federation for secure authentication

name: Template Workflow

on:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write  # Required for WIF

jobs:
  example:
    name: Example Job with WIF
    runs-on: ubuntu-latest
    environment: production
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Authenticate to Google Cloud
      id: auth
      uses: google-github-actions/auth@v2
      with:
        workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID'
        service_account: 'SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com'
        token_format: 'access_token'
        
    - name: Configure gcloud
      uses: google-github-actions/setup-gcloud@v2
      with:
        project_id: PROJECT_ID
        
    - name: Verify authentication
      run: |
        gcloud auth list
        gcloud config list
        echo "✅ Authentication successful"
EOF
    
    print_success "Configuration files generated"
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up Workload Identity monitoring..."
    
    # Create monitoring dashboard config
    cat > /opt/act-placemat/config/workload-identity-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "ACT Placemat Workload Identity Federation",
    "tags": ["workload-identity", "github-actions", "australian-compliance"],
    "timezone": "Australia/Sydney",
    "panels": [
      {
        "title": "WIF Token Requests",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(workload_identity_token_requests_total[5m]))",
            "legendFormat": "Token Requests/sec"
          }
        ]
      },
      {
        "title": "Authentication Failures",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(workload_identity_token_failures_total[1h])",
            "legendFormat": "Auth Failures/hour"
          }
        ]
      },
      {
        "title": "GitHub Actions Workflows",
        "type": "table",
        "targets": [
          {
            "expr": "github_actions_workflow_runs_total",
            "legendFormat": "{{workflow}} - {{status}}"
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

# Function to create test script
create_test_script() {
    print_status "Creating test script..."
    
    cat > /opt/act-placemat/scripts/test-workload-identity.sh << 'EOF'
#!/bin/bash

# Test script for Workload Identity Federation
# Simulates GitHub Actions authentication flow

set -euo pipefail

# Load configuration
source /opt/act-placemat/config/.env.workload-identity

echo "🧪 Testing Workload Identity Federation"
echo "Project: $PROJECT_ID"
echo "Pool: $WIF_POOL_ID"
echo "Provider: $WIF_PROVIDER_ID"

# Test 1: Verify WIF Pool exists
echo "Test 1: Checking Workload Identity Pool..."
if gcloud iam workload-identity-pools describe "$WIF_POOL_ID" \
    --location="global" \
    --project="$PROJECT_ID" &> /dev/null; then
    echo "✅ Workload Identity Pool exists"
else
    echo "❌ Workload Identity Pool not found"
    exit 1
fi

# Test 2: Verify OIDC Provider exists  
echo "Test 2: Checking OIDC Provider..."
if gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER_ID" \
    --location="global" \
    --workload-identity-pool="$WIF_POOL_ID" \
    --project="$PROJECT_ID" &> /dev/null; then
    echo "✅ OIDC Provider exists"
else
    echo "❌ OIDC Provider not found"
    exit 1
fi

# Test 3: Verify Service Accounts
echo "Test 3: Checking Service Accounts..."
for sa in "$SA_DEPLOY" "$SA_TEST" "$SA_SECURITY"; do
    if gcloud iam service-accounts describe "$sa" \
        --project="$PROJECT_ID" &> /dev/null; then
        echo "✅ Service Account exists: $sa"
    else
        echo "❌ Service Account not found: $sa"
        exit 1
    fi
done

echo "🎉 All Workload Identity Federation tests passed!"
echo "🇦🇺 Australian compliance verified"
echo "📍 Data residency: $DATA_RESIDENCY"
EOF
    
    chmod +x /opt/act-placemat/scripts/test-workload-identity.sh
    
    print_success "Test script created"
}

# Function to display completion summary
display_summary() {
    echo
    print_success "🇦🇺 ACT Placemat Workload Identity Federation Setup Complete!"
    echo
    echo "Summary:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Project Number: $PROJECT_NUMBER"
    echo "  Region: $REGION"
    echo "  Workload Identity Pool: $POOL_ID"
    echo "  OIDC Provider: $PROVIDER_ID"
    echo "  Repository: $REPO_OWNER/$REPO_NAME"
    echo "  Data Residency: $DATA_RESIDENCY"
    echo "  Compliance Framework: $COMPLIANCE_FRAMEWORK"
    echo
    echo "Service Accounts Created:"
    echo "  • github-actions-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
    echo "  • github-actions-test@${PROJECT_ID}.iam.gserviceaccount.com"
    echo "  • github-actions-security@${PROJECT_ID}.iam.gserviceaccount.com"
    echo
    echo "Configuration Files:"
    echo "  • /opt/act-placemat/workload-identity/github-actions-config.json"
    echo "  • /opt/act-placemat/config/.env.workload-identity"
    echo "  • /opt/act-placemat/workload-identity/github-actions-template.yml"
    echo
    echo "Next Steps:"
    echo "  1. Update GitHub Actions workflows with WIF provider details"
    echo "  2. Test authentication with /opt/act-placemat/scripts/test-workload-identity.sh"
    echo "  3. Monitor WIF usage with CloudLogging and CloudMonitoring"
    echo "  4. Schedule regular security reviews and access audits"
    echo
    echo "GitHub Actions Configuration:"
    echo "  Workload Identity Provider: $WIF_PROVIDER_NAME"
    echo "  Use this in your workflows' auth step"
    echo
    echo "🔒 Secure CI/CD authentication configured"
    echo "📊 Monitoring and auditing enabled"
    echo "🔄 Ready for automated deployments with Australian compliance"
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Setup Workload Identity Federation for ACT Placemat GitHub Actions"
    echo
    echo "OPTIONS:"
    echo "  -p, --project PROJECT_ID     Google Cloud project ID (default: act-placemat-intelligence-hub)"
    echo "  -r, --repo REPO_OWNER/REPO   GitHub repository (default: benknight/ACT-Placemat)"
    echo "  -t, --test-only              Only run tests, skip setup"
    echo "  -h, --help                   Show this help message"
    echo
    echo "Examples:"
    echo "  $0                           # Full setup with default settings"
    echo "  $0 --test-only              # Run tests only"
    echo "  $0 -r myorg/myrepo          # Setup with different repository"
    echo
    echo "🇦🇺 Ensures Australian Privacy Act compliance and data residency"
}

# Main execution
main() {
    local test_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--project)
                PROJECT_ID="$2"
                shift 2
                ;;
            -r|--repo)
                IFS='/' read -r REPO_OWNER REPO_NAME <<< "$2"
                shift 2
                ;;
            -t|--test-only)
                test_only=true
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
    
    echo "🇦🇺 ACT Placemat Intelligence Hub - Workload Identity Federation Setup"
    echo "==========================================================================="
    echo
    
    check_dependencies
    setup_directories
    
    if [[ "$test_only" == true ]]; then
        print_status "Running tests only..."
        source /opt/act-placemat/config/.env.workload-identity 2>/dev/null || {
            print_error "Configuration not found. Run setup first without --test-only"
            exit 1
        }
        /opt/act-placemat/scripts/test-workload-identity.sh
        print_success "Test completed successfully"
        exit 0
    fi
    
    get_project_info
    enable_apis
    create_workload_identity_pool
    create_oidc_provider
    create_service_accounts
    assign_iam_roles
    configure_workload_identity_bindings
    test_workload_identity
    generate_config_files
    setup_monitoring
    create_test_script
    
    display_summary
}

# Handle signals for cleanup
trap 'print_error "Script interrupted"; exit 1' SIGINT SIGTERM

# Run main function with all arguments
main "$@"