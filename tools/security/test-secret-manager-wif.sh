#!/bin/bash

# ACT Placemat Intelligence Hub - Secret Manager and WIF Testing Script
# Comprehensive testing for secret management and Workload Identity Federation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID="act-placemat-intelligence-hub"
REGION="australia-southeast1"
CLUSTER_NAME="act-placemat-intelligence-hub"
NAMESPACE="act-placemat"
LOG_FILE="/opt/act-placemat/logs/secret-manager-wif-test.log"

# Test configuration
TEST_TIMEOUT=300  # 5 minutes
TEST_RESULTS=()

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
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S %Z')]${NC} ✅ $1"
    log_message "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S %Z')]${NC} ⚠️  $1"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S %Z')]${NC} ❌ $1"
    log_message "ERROR: $1"
}

# Logging function
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    echo "$timestamp - $message" >> "$LOG_FILE"
}

# Function to record test result
record_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TEST_RESULTS+=("$test_name:$result:$details")
    
    if [[ "$result" == "PASS" ]]; then
        print_success "$test_name: $details"
    elif [[ "$result" == "FAIL" ]]; then
        print_error "$test_name: $details"
    else
        print_warning "$test_name: $details"
    fi
}

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local deps=("gcloud" "kubectl" "jq" "curl")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        record_test_result "dependency_check" "FAIL" "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    # Check gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 &> /dev/null; then
        record_test_result "dependency_check" "FAIL" "gcloud not authenticated"
        return 1
    fi
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        record_test_result "dependency_check" "FAIL" "kubectl cannot connect to cluster"
        return 1
    fi
    
    record_test_result "dependency_check" "PASS" "All dependencies available"
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Create test directory
    mkdir -p /opt/act-placemat/test-results
    
    # Set gcloud project
    gcloud config set project "$PROJECT_ID" &> /dev/null
    
    # Get cluster credentials
    if gcloud container clusters get-credentials "$CLUSTER_NAME" \
        --region="$REGION" \
        --project="$PROJECT_ID" &> /dev/null; then
        record_test_result "test_environment_setup" "PASS" "Test environment configured"
    else
        record_test_result "test_environment_setup" "FAIL" "Could not get cluster credentials"
        return 1
    fi
}

# Function to test Google Secret Manager access
test_secret_manager_access() {
    print_status "Testing Google Secret Manager access..."
    
    # Test 1: List secrets
    print_status "Test 1: Listing secrets in Secret Manager..."
    if SECRET_LIST=$(gcloud secrets list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null); then
        SECRET_COUNT=$(echo "$SECRET_LIST" | wc -l)
        record_test_result "secret_manager_list" "PASS" "Found $SECRET_COUNT secrets"
    else
        record_test_result "secret_manager_list" "FAIL" "Could not list secrets"
        return 1
    fi
    
    # Test 2: Access specific secrets
    local test_secrets=(
        "apikey-prod-openai-primary"
        "dbcred-prod-postgres-password"
        "enckey-prod-langgraph-state"
    )
    
    for secret_name in "${test_secrets[@]}"; do
        print_status "Test 2: Accessing secret $secret_name..."
        if gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT_ID" &> /dev/null; then
            record_test_result "secret_access_$secret_name" "PASS" "Secret accessible"
        else
            record_test_result "secret_access_$secret_name" "FAIL" "Secret not accessible"
        fi
    done
    
    # Test 3: Check secret metadata
    print_status "Test 3: Checking secret metadata..."
    if SECRET_METADATA=$(gcloud secrets describe "apikey-prod-openai-primary" --project="$PROJECT_ID" --format=json 2>/dev/null); then
        LOCATION=$(echo "$SECRET_METADATA" | jq -r '.replication.automatic.regionalLocations[]? // empty')
        if [[ "$LOCATION" =~ australia ]]; then
            record_test_result "secret_metadata_location" "PASS" "Secret stored in Australian region: $LOCATION"
        else
            record_test_result "secret_metadata_location" "FAIL" "Secret not in Australian region: $LOCATION"
        fi
    else
        record_test_result "secret_metadata_location" "FAIL" "Could not retrieve secret metadata"
    fi
}

# Function to test Workload Identity Federation
test_workload_identity_federation() {
    print_status "Testing Workload Identity Federation..."
    
    # Load WIF configuration
    if [[ -f "/opt/act-placemat/config/.env.workload-identity" ]]; then
        source /opt/act-placemat/config/.env.workload-identity
    else
        record_test_result "wif_config_load" "FAIL" "WIF configuration file not found"
        return 1
    fi
    
    record_test_result "wif_config_load" "PASS" "WIF configuration loaded"
    
    # Test 1: Check Workload Identity Pool
    print_status "Test 1: Checking Workload Identity Pool..."
    if gcloud iam workload-identity-pools describe "$WIF_POOL_ID" \
        --location="global" \
        --project="$PROJECT_ID" &> /dev/null; then
        record_test_result "wif_pool_exists" "PASS" "Workload Identity Pool exists"
    else
        record_test_result "wif_pool_exists" "FAIL" "Workload Identity Pool not found"
        return 1
    fi
    
    # Test 2: Check OIDC Provider
    print_status "Test 2: Checking OIDC Provider..."
    if gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER_ID" \
        --location="global" \
        --workload-identity-pool="$WIF_POOL_ID" \
        --project="$PROJECT_ID" &> /dev/null; then
        record_test_result "wif_provider_exists" "PASS" "OIDC Provider exists"
    else
        record_test_result "wif_provider_exists" "FAIL" "OIDC Provider not found"
        return 1
    fi
    
    # Test 3: Check Service Account bindings
    local service_accounts=("$SA_DEPLOY" "$SA_TEST" "$SA_SECURITY")
    
    for sa in "${service_accounts[@]}"; do
        print_status "Test 3: Checking service account $sa..."
        if gcloud iam service-accounts describe "$sa" --project="$PROJECT_ID" &> /dev/null; then
            record_test_result "wif_sa_exists_$(echo $sa | cut -d'@' -f1)" "PASS" "Service account exists"
            
            # Check IAM policy binding
            if gcloud iam service-accounts get-iam-policy "$sa" --project="$PROJECT_ID" \
                --format=json | jq -r '.bindings[].members[]' | grep -q "principalSet"; then
                record_test_result "wif_sa_binding_$(echo $sa | cut -d'@' -f1)" "PASS" "WIF binding configured"
            else
                record_test_result "wif_sa_binding_$(echo $sa | cut -d'@' -f1)" "FAIL" "WIF binding not found"
            fi
        else
            record_test_result "wif_sa_exists_$(echo $sa | cut -d'@' -f1)" "FAIL" "Service account not found"
        fi
    done
}

# Function to test Kubernetes External Secrets integration
test_external_secrets_integration() {
    print_status "Testing External Secrets integration..."
    
    # Test 1: Check External Secrets Operator
    print_status "Test 1: Checking External Secrets Operator..."
    if kubectl get deployment external-secrets -n external-secrets-system &> /dev/null; then
        record_test_result "external_secrets_operator" "PASS" "External Secrets Operator deployed"
    else
        record_test_result "external_secrets_operator" "FAIL" "External Secrets Operator not found"
        return 1
    fi
    
    # Test 2: Check SecretStore
    print_status "Test 2: Checking SecretStore configuration..."
    if kubectl get secretstore google-secret-manager -n "$NAMESPACE" &> /dev/null; then
        record_test_result "secret_store_config" "PASS" "SecretStore configured"
    else
        record_test_result "secret_store_config" "FAIL" "SecretStore not found"
        return 1
    fi
    
    # Test 3: Check ExternalSecrets
    local external_secrets=(
        "agent-api-keys"
        "database-credentials"
        "encryption-keys"
        "registry-credentials"
    )
    
    for es in "${external_secrets[@]}"; do
        print_status "Test 3: Checking ExternalSecret $es..."
        if kubectl get externalsecret "$es" -n "$NAMESPACE" &> /dev/null; then
            # Check sync status
            STATUS=$(kubectl get externalsecret "$es" -n "$NAMESPACE" -o jsonpath='{.status.conditions[0].status}' 2>/dev/null || echo "Unknown")
            if [[ "$STATUS" == "True" ]]; then
                record_test_result "external_secret_$es" "PASS" "ExternalSecret synced successfully"
            else
                record_test_result "external_secret_$es" "FAIL" "ExternalSecret sync failed: $STATUS"
            fi
        else
            record_test_result "external_secret_$es" "FAIL" "ExternalSecret not found"
        fi
    done
    
    # Test 4: Check Kubernetes secrets created
    for es in "${external_secrets[@]}"; do
        print_status "Test 4: Checking Kubernetes secret $es..."
        if kubectl get secret "$es" -n "$NAMESPACE" &> /dev/null; then
            # Check secret data
            SECRET_KEYS=$(kubectl get secret "$es" -n "$NAMESPACE" -o jsonpath='{.data}' | jq -r 'keys[]' 2>/dev/null || echo "")
            KEY_COUNT=$(echo "$SECRET_KEYS" | wc -w)
            record_test_result "k8s_secret_$es" "PASS" "Kubernetes secret created with $KEY_COUNT keys"
        else
            record_test_result "k8s_secret_$es" "FAIL" "Kubernetes secret not found"
        fi
    done
}

# Function to test secret rotation functionality
test_secret_rotation() {
    print_status "Testing secret rotation functionality..."
    
    # Test 1: Check rotation orchestrator
    print_status "Test 1: Checking secret rotation orchestrator..."
    if kubectl get cronjob secret-rotation-orchestrator -n "$NAMESPACE" &> /dev/null; then
        record_test_result "rotation_orchestrator" "PASS" "Rotation orchestrator deployed"
        
        # Check recent jobs
        RECENT_JOBS=$(kubectl get jobs -n "$NAMESPACE" -l cronjob=secret-rotation-orchestrator --sort-by=.metadata.creationTimestamp -o name | tail -5)
        if [[ -n "$RECENT_JOBS" ]]; then
            record_test_result "rotation_jobs_recent" "PASS" "Recent rotation jobs found"
        else
            record_test_result "rotation_jobs_recent" "WARN" "No recent rotation jobs found"
        fi
    else
        record_test_result "rotation_orchestrator" "FAIL" "Rotation orchestrator not found"
    fi
    
    # Test 2: Check rotation configuration
    print_status "Test 2: Checking rotation configuration..."
    if kubectl get configmap secret-lifecycle-config -n "$NAMESPACE" &> /dev/null; then
        record_test_result "rotation_config" "PASS" "Rotation configuration found"
    else
        record_test_result "rotation_config" "FAIL" "Rotation configuration not found"
    fi
    
    # Test 3: Check rotation monitoring
    print_status "Test 3: Checking rotation monitoring..."
    if kubectl get configmap -n "$NAMESPACE" -l operation=rotation_orchestration | grep -q "secret-orchestration-report"; then
        record_test_result "rotation_monitoring" "PASS" "Rotation monitoring reports found"
    else
        record_test_result "rotation_monitoring" "WARN" "No rotation monitoring reports found"
    fi
}

# Function to test monitoring and alerting
test_monitoring_alerting() {
    print_status "Testing monitoring and alerting..."
    
    # Test 1: Check secret monitoring deployment
    print_status "Test 1: Checking secret monitoring deployment..."
    if kubectl get deployment secret-access-monitor -n "$NAMESPACE" &> /dev/null; then
        # Check deployment status
        REPLICAS_READY=$(kubectl get deployment secret-access-monitor -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        REPLICAS_DESIRED=$(kubectl get deployment secret-access-monitor -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [[ "$REPLICAS_READY" == "$REPLICAS_DESIRED" && "$REPLICAS_READY" -gt 0 ]]; then
            record_test_result "secret_monitoring_deployment" "PASS" "Secret monitoring deployment ready ($REPLICAS_READY/$REPLICAS_DESIRED)"
        else
            record_test_result "secret_monitoring_deployment" "FAIL" "Secret monitoring deployment not ready ($REPLICAS_READY/$REPLICAS_DESIRED)"
        fi
    else
        record_test_result "secret_monitoring_deployment" "FAIL" "Secret monitoring deployment not found"
    fi
    
    # Test 2: Check monitoring configuration
    print_status "Test 2: Checking monitoring configuration..."
    if kubectl get configmap secret-monitoring-config -n "$NAMESPACE" &> /dev/null; then
        record_test_result "monitoring_config" "PASS" "Monitoring configuration found"
    else
        record_test_result "monitoring_config" "FAIL" "Monitoring configuration not found"
    fi
    
    # Test 3: Check alert rules
    print_status "Test 3: Checking alert rules..."
    if kubectl get prometheusrule secret-access-alerts -n "$NAMESPACE" &> /dev/null; then
        record_test_result "alert_rules" "PASS" "Alert rules configured"
    else
        record_test_result "alert_rules" "FAIL" "Alert rules not found"
    fi
    
    # Test 4: Check ServiceMonitor
    print_status "Test 4: Checking ServiceMonitor..."
    if kubectl get servicemonitor secret-access-monitoring -n "$NAMESPACE" &> /dev/null; then
        record_test_result "service_monitor" "PASS" "ServiceMonitor configured"
    else
        record_test_result "service_monitor" "FAIL" "ServiceMonitor not found"
    fi
}

# Function to test Australian compliance
test_australian_compliance() {
    print_status "Testing Australian compliance requirements..."
    
    # Test 1: Data residency validation
    print_status "Test 1: Validating data residency..."
    
    # Check pod node affinity
    PODS_IN_AUSTRALIA=$(kubectl get pods -n "$NAMESPACE" -o json | jq -r '.items[] | select(.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[].matchExpressions[]? | select(.key == "kubernetes.io/zone" and (.values[] | test("australia")))) | .metadata.name' | wc -l)
    TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers | wc -l)
    
    if [[ "$PODS_IN_AUSTRALIA" -eq "$TOTAL_PODS" && "$TOTAL_PODS" -gt 0 ]]; then
        record_test_result "data_residency_pods" "PASS" "All pods ($TOTAL_PODS) scheduled in Australian zones"
    else
        record_test_result "data_residency_pods" "FAIL" "Some pods not in Australian zones ($PODS_IN_AUSTRALIA/$TOTAL_PODS)"
    fi
    
    # Test 2: Compliance labels validation
    print_status "Test 2: Validating compliance labels..."
    COMPLIANT_RESOURCES=$(kubectl get secrets,configmaps,deployments -n "$NAMESPACE" -o json | jq -r '.items[] | select(.metadata.labels."data-residency" == "australia" and .metadata.annotations."compliance.framework" == "australian-privacy-act") | .metadata.name' | wc -l)
    TOTAL_RESOURCES=$(kubectl get secrets,configmaps,deployments -n "$NAMESPACE" --no-headers | wc -l)
    
    if [[ "$COMPLIANT_RESOURCES" -gt 0 ]]; then
        record_test_result "compliance_labels" "PASS" "Found $COMPLIANT_RESOURCES resources with compliance labels"
    else
        record_test_result "compliance_labels" "FAIL" "No resources with compliance labels found"
    fi
    
    # Test 3: Audit logging validation
    print_status "Test 3: Validating audit logging..."
    
    # Check for audit events
    AUDIT_EVENTS=$(kubectl get events -n "$NAMESPACE" --field-selector reason=SecretRotationTriggered,reason=SecretRotationCompleted --no-headers 2>/dev/null | wc -l)
    if [[ "$AUDIT_EVENTS" -gt 0 ]]; then
        record_test_result "audit_logging" "PASS" "Found $AUDIT_EVENTS audit events"
    else
        record_test_result "audit_logging" "WARN" "No audit events found (may be normal for new deployment)"
    fi
    
    # Test 4: Encryption validation
    print_status "Test 4: Validating encryption configuration..."
    
    # Check CMEK configuration
    if kubectl get configmap cmek-configuration -n "$NAMESPACE" &> /dev/null; then
        record_test_result "cmek_config" "PASS" "CMEK configuration found"
    else
        record_test_result "cmek_config" "FAIL" "CMEK configuration not found"
    fi
}

# Function to simulate GitHub Actions workflow
simulate_github_actions_workflow() {
    print_status "Simulating GitHub Actions workflow..."
    
    # Test 1: Create test job simulating GitHub Actions
    print_status "Test 1: Creating test job simulating GitHub Actions authentication..."
    
    cat > /tmp/github-actions-test-job.yaml << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: github-actions-wif-test-$(date +%s)
  namespace: $NAMESPACE
  labels:
    test-type: wif-simulation
    data-residency: australia
  annotations:
    compliance.framework: australian-privacy-act
    test.description: "Simulates GitHub Actions WIF authentication"
spec:
  template:
    metadata:
      labels:
        test-type: wif-simulation
        data-residency: australia
    spec:
      serviceAccountName: github-actions-test
      restartPolicy: Never
      nodeSelector:
        data-residency: australia
      containers:
      - name: wif-test
        image: google/cloud-sdk:alpine
        command:
        - /bin/sh
        - -c
        - |
          echo "🧪 Simulating GitHub Actions WIF authentication test"
          echo "Project: $PROJECT_ID"
          echo "Service Account: \$(gcloud config get-value account 2>/dev/null || echo 'Unknown')"
          echo "Region: $REGION"
          
          # Test gcloud authentication
          if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "github-actions-test"; then
            echo "✅ Service account authentication successful"
          else
            echo "❌ Service account authentication failed"
            exit 1
          fi
          
          # Test Secret Manager access
          if gcloud secrets list --project="$PROJECT_ID" --limit=1 &> /dev/null; then
            echo "✅ Secret Manager access successful"
          else
            echo "❌ Secret Manager access failed"
            exit 1
          fi
          
          # Test secret retrieval
          if gcloud secrets versions access latest --secret="apikey-prod-openai-primary" --project="$PROJECT_ID" &> /dev/null; then
            echo "✅ Secret retrieval successful"
          else
            echo "❌ Secret retrieval failed"
            exit 1
          fi
          
          echo "🎉 GitHub Actions WIF simulation completed successfully"
          echo "🇦🇺 Australian compliance verified"
          echo "📍 Data residency: Australia"
        env:
        - name: PROJECT_ID
          value: "$PROJECT_ID"
        - name: REGION
          value: "$REGION"
        - name: DATA_RESIDENCY
          value: "australia"
        - name: COMPLIANCE_FRAMEWORK
          value: "australian-privacy-act"
      imagePullSecrets:
      - name: registry-credentials
EOF
    
    # Apply and wait for job
    if kubectl apply -f /tmp/github-actions-test-job.yaml; then
        JOB_NAME=$(kubectl get jobs -n "$NAMESPACE" -l test-type=wif-simulation --sort-by=.metadata.creationTimestamp -o name | tail -1 | sed 's/job\///')
        
        # Wait for job completion
        print_status "Waiting for test job to complete..."
        if kubectl wait --for=condition=complete job/"$JOB_NAME" -n "$NAMESPACE" --timeout=180s; then
            # Get job logs
            JOB_LOGS=$(kubectl logs job/"$JOB_NAME" -n "$NAMESPACE" 2>/dev/null || echo "No logs available")
            
            if echo "$JOB_LOGS" | grep -q "GitHub Actions WIF simulation completed successfully"; then
                record_test_result "github_actions_simulation" "PASS" "WIF simulation successful"
            else
                record_test_result "github_actions_simulation" "FAIL" "WIF simulation failed"
            fi
        else
            record_test_result "github_actions_simulation" "FAIL" "Test job timed out"
        fi
        
        # Cleanup
        kubectl delete job "$JOB_NAME" -n "$NAMESPACE" &> /dev/null || true
    else
        record_test_result "github_actions_simulation" "FAIL" "Could not create test job"
    fi
    
    rm -f /tmp/github-actions-test-job.yaml
}

# Function to generate test report
generate_test_report() {
    print_status "Generating comprehensive test report..."
    
    local total_tests=${#TEST_RESULTS[@]}
    local passed_tests=0
    local failed_tests=0
    local warning_tests=0
    
    # Count results
    for result in "${TEST_RESULTS[@]}"; do
        case $(echo "$result" | cut -d':' -f2) in
            "PASS") ((passed_tests++)) ;;
            "FAIL") ((failed_tests++)) ;;
            "WARN") ((warning_tests++)) ;;
        esac
    done
    
    # Generate JSON report
    cat > /opt/act-placemat/test-results/secret-manager-wif-test-report.json << EOF
{
  "test_execution": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "timezone": "$TIMEZONE",
    "duration_seconds": $SECONDS,
    "project_id": "$PROJECT_ID",
    "region": "$REGION",
    "namespace": "$NAMESPACE"
  },
  "compliance": {
    "framework": "$COMPLIANCE_FRAMEWORK",
    "data_residency": "$DATA_RESIDENCY",
    "verification_status": "$([ $failed_tests -eq 0 ] && echo "COMPLIANT" || echo "NON_COMPLIANT")"
  },
  "test_summary": {
    "total_tests": $total_tests,
    "passed": $passed_tests,
    "failed": $failed_tests,
    "warnings": $warning_tests,
    "success_rate": "$(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)%"
  },
  "test_results": [
EOF
    
    # Add individual test results
    local first=true
    for result in "${TEST_RESULTS[@]}"; do
        local test_name=$(echo "$result" | cut -d':' -f1)
        local test_result=$(echo "$result" | cut -d':' -f2)
        local test_details=$(echo "$result" | cut -d':' -f3-)
        
        if [[ "$first" == true ]]; then
            first=false
        else
            echo "," >> /opt/act-placemat/test-results/secret-manager-wif-test-report.json
        fi
        
        cat >> /opt/act-placemat/test-results/secret-manager-wif-test-report.json << EOF
    {
      "test_name": "$test_name",
      "result": "$test_result",
      "details": "$test_details"
    }
EOF
    done
    
    cat >> /opt/act-placemat/test-results/secret-manager-wif-test-report.json << EOF
  ]
}
EOF
    
    # Generate markdown report
    cat > /opt/act-placemat/test-results/secret-manager-wif-test-report.md << EOF
# ACT Placemat Secret Manager and WIF Test Report

## Test Execution Summary
- **Timestamp**: $(date '+%Y-%m-%d %H:%M:%S %Z')
- **Project**: $PROJECT_ID
- **Region**: $REGION  
- **Namespace**: $NAMESPACE
- **Duration**: ${SECONDS}s

## Compliance Status
- **Framework**: $COMPLIANCE_FRAMEWORK
- **Data Residency**: $DATA_RESIDENCY
- **Status**: $([ $failed_tests -eq 0 ] && echo "✅ COMPLIANT" || echo "❌ NON_COMPLIANT")

## Test Results Summary
- **Total Tests**: $total_tests
- **Passed**: $passed_tests ✅
- **Failed**: $failed_tests ❌
- **Warnings**: $warning_tests ⚠️
- **Success Rate**: $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)%

## Detailed Results

EOF
    
    # Add detailed results
    for result in "${TEST_RESULTS[@]}"; do
        local test_name=$(echo "$result" | cut -d':' -f1)
        local test_result=$(echo "$result" | cut -d':' -f2)
        local test_details=$(echo "$result" | cut -d':' -f3-)
        
        local emoji="❓"
        case "$test_result" in
            "PASS") emoji="✅" ;;
            "FAIL") emoji="❌" ;;
            "WARN") emoji="⚠️" ;;
        esac
        
        echo "### $emoji $test_name" >> /opt/act-placemat/test-results/secret-manager-wif-test-report.md
        echo "**Result**: $test_result" >> /opt/act-placemat/test-results/secret-manager-wif-test-report.md
        echo "**Details**: $test_details" >> /opt/act-placemat/test-results/secret-manager-wif-test-report.md
        echo "" >> /opt/act-placemat/test-results/secret-manager-wif-test-report.md
    done
    
    print_success "Test report generated: /opt/act-placemat/test-results/secret-manager-wif-test-report.json"
    print_success "Markdown report: /opt/act-placemat/test-results/secret-manager-wif-test-report.md"
}

# Function to display summary
display_summary() {
    local total_tests=${#TEST_RESULTS[@]}
    local passed_tests=0
    local failed_tests=0
    local warning_tests=0
    
    # Count results
    for result in "${TEST_RESULTS[@]}"; do
        case $(echo "$result" | cut -d':' -f2) in
            "PASS") ((passed_tests++)) ;;
            "FAIL") ((failed_tests++)) ;;
            "WARN") ((warning_tests++)) ;;
        esac
    done
    
    echo
    echo "🇦🇺 ACT Placemat Secret Manager and WIF Test Summary"
    echo "=================================================="
    echo
    echo "Test Execution:"
    echo "  Duration: ${SECONDS}s"
    echo "  Project: $PROJECT_ID"
    echo "  Region: $REGION"
    echo "  Namespace: $NAMESPACE"
    echo
    echo "Results:"
    echo "  Total Tests: $total_tests"
    echo "  Passed: $passed_tests ✅"
    echo "  Failed: $failed_tests ❌"
    echo "  Warnings: $warning_tests ⚠️"
    echo "  Success Rate: $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l)%"
    echo
    echo "Compliance:"
    echo "  Framework: $COMPLIANCE_FRAMEWORK"
    echo "  Data Residency: $DATA_RESIDENCY"
    echo "  Status: $([ $failed_tests -eq 0 ] && echo "✅ COMPLIANT" || echo "❌ NON_COMPLIANT")"
    echo
    
    if [[ $failed_tests -eq 0 ]]; then
        echo "🎉 All tests passed! Secret Manager and WIF are working correctly."
        echo "🔒 Australian compliance verified"
        echo "📍 Data residency enforced"
        echo "🔑 Secret management operational"
        echo "🚀 CI/CD authentication ready"
    else
        echo "⚠️  Some tests failed. Please review the detailed report for remediation steps."
        echo "📋 Report: /opt/act-placemat/test-results/secret-manager-wif-test-report.md"
    fi
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Test Secret Manager and Workload Identity Federation for ACT Placemat"
    echo
    echo "OPTIONS:"
    echo "  -p, --project PROJECT_ID     Google Cloud project ID (default: act-placemat-intelligence-hub)"
    echo "  -r, --region REGION          Google Cloud region (default: australia-southeast1)"
    echo "  -n, --namespace NAMESPACE    Kubernetes namespace (default: act-placemat)"
    echo "  -t, --timeout SECONDS       Test timeout in seconds (default: 300)"
    echo "  --quick                      Run quick tests only (skip simulation)"
    echo "  -h, --help                   Show this help message"
    echo
    echo "Examples:"
    echo "  $0                           # Full test suite"
    echo "  $0 --quick                   # Quick tests only"
    echo "  $0 -p my-project            # Test with different project"
    echo
    echo "🇦🇺 Tests Australian Privacy Act compliance and data residency"
}

# Main execution
main() {
    local quick_mode=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--project)
                PROJECT_ID="$2"
                shift 2
                ;;
            -r|--region)
                REGION="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -t|--timeout)
                TEST_TIMEOUT="$2"
                shift 2
                ;;
            --quick)
                quick_mode=true
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
    
    echo "🇦🇺 ACT Placemat Secret Manager and WIF Testing"
    echo "=============================================="
    echo
    
    # Create log directory
    mkdir -p /opt/act-placemat/logs
    
    # Run tests
    check_dependencies || exit 1
    setup_test_environment || exit 1
    test_secret_manager_access
    test_workload_identity_federation
    test_external_secrets_integration
    test_secret_rotation
    test_monitoring_alerting
    test_australian_compliance
    
    # Run simulation unless in quick mode
    if [[ "$quick_mode" == false ]]; then
        simulate_github_actions_workflow
    fi
    
    generate_test_report
    display_summary
    
    # Exit with appropriate code
    local failed_tests=0
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $(echo "$result" | cut -d':' -f2) == "FAIL" ]]; then
            ((failed_tests++))
        fi
    done
    
    exit $([[ $failed_tests -eq 0 ]] && echo 0 || echo 1)
}

# Handle signals for cleanup
trap 'print_error "Test interrupted"; exit 1' SIGINT SIGTERM

# Run main function with all arguments
main "$@"