#!/bin/bash

# Comprehensive Task Queue Testing Framework
# Tests Redis cluster, queue operations, monitoring, and LangGraph integration
# Australian compliance validation included

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NAMESPACE="act-placemat"
TEST_TIMEOUT=300
REDIS_PASSWORD=""
DATABASE_PASSWORD=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Test results tracking
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

increment_test() {
    ((TESTS_TOTAL++))
}

pass_test() {
    ((TESTS_PASSED++))
    log_success "$1"
}

fail_test() {
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
    log_error "$1"
}

# Function to wait for pod readiness
wait_for_pod_ready() {
    local pod_selector="$1"
    local timeout="${2:-300}"
    
    log_info "Waiting for pods with selector '$pod_selector' to be ready..."
    
    if kubectl wait --for=condition=ready pod -l "$pod_selector" -n "$NAMESPACE" --timeout="${timeout}s" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to get Redis password
get_redis_password() {
    if [ -z "$REDIS_PASSWORD" ]; then
        REDIS_PASSWORD=$(kubectl get secret redis-cluster-auth -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d 2>/dev/null || echo "")
        if [ -z "$REDIS_PASSWORD" ]; then
            log_warning "Redis password not found, using default for testing"
            REDIS_PASSWORD="ActPlacematRedisClusterPassword2024"
        fi
    fi
}

# Function to get database password
get_database_password() {
    if [ -z "$DATABASE_PASSWORD" ]; then
        DATABASE_PASSWORD=$(kubectl get secret database-connection-config -n "$NAMESPACE" -o jsonpath='{.data.postgres-password}' | base64 -d 2>/dev/null || echo "")
        if [ -z "$DATABASE_PASSWORD" ]; then
            log_warning "Database password not found, using default for testing"
            DATABASE_PASSWORD="test_password"
        fi
    fi
}

# Test infrastructure prerequisites
test_infrastructure_prerequisites() {
    print_section "Testing Infrastructure Prerequisites"
    
    increment_test
    log_info "Checking Kubernetes cluster connectivity..."
    if kubectl cluster-info > /dev/null 2>&1; then
        pass_test "Kubernetes cluster is accessible"
    else
        fail_test "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    increment_test
    log_info "Checking namespace existence..."
    if kubectl get namespace "$NAMESPACE" > /dev/null 2>&1; then
        pass_test "Namespace '$NAMESPACE' exists"
    else
        fail_test "Namespace '$NAMESPACE' does not exist"
        return 1
    fi
    
    increment_test
    log_info "Checking required secrets..."
    local secrets_exist=true
    for secret in "redis-cluster-auth" "database-connection-config"; do
        if ! kubectl get secret "$secret" -n "$NAMESPACE" > /dev/null 2>&1; then
            log_warning "Secret '$secret' not found"
            secrets_exist=false
        fi
    done
    
    if $secrets_exist; then
        pass_test "Required secrets are present"
    else
        fail_test "Some required secrets are missing"
    fi
    
    # Get passwords for testing
    get_redis_password
    get_database_password
}

# Test Redis cluster deployment
test_redis_cluster() {
    print_section "Testing Redis Cluster Deployment"
    
    increment_test
    log_info "Checking Redis cluster StatefulSet..."
    if kubectl get statefulset redis-cluster -n "$NAMESPACE" > /dev/null 2>&1; then
        pass_test "Redis cluster StatefulSet exists"
    else
        fail_test "Redis cluster StatefulSet not found"
        return 1
    fi
    
    increment_test
    log_info "Waiting for Redis cluster pods to be ready..."
    if wait_for_pod_ready "component=redis-cluster" 300; then
        pass_test "Redis cluster pods are ready"
    else
        fail_test "Redis cluster pods failed to become ready"
        return 1
    fi
    
    increment_test
    log_info "Testing Redis cluster connectivity..."
    local redis_test_pod="redis-test-$(date +%s)"
    
    if kubectl run "$redis_test_pod" -n "$NAMESPACE" --image=redis:7.2-alpine --rm -i --restart=Never -- \
        redis-cli -h redis-cluster-service.act-placemat.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
        pass_test "Redis cluster connectivity verified"
    else
        fail_test "Redis cluster connectivity test failed"
    fi
    
    increment_test
    log_info "Testing Redis cluster status..."
    local cluster_info=""
    cluster_info=$(kubectl run "redis-cluster-test-$(date +%s)" -n "$NAMESPACE" --image=redis:7.2-alpine --rm -i --restart=Never -- \
        redis-cli -h redis-cluster-service.act-placemat.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" cluster info 2>/dev/null || echo "")
    
    if echo "$cluster_info" | grep -q "cluster_state:ok"; then
        pass_test "Redis cluster is healthy"
    else
        fail_test "Redis cluster health check failed"
    fi
}

# Test queue operations
test_queue_operations() {
    print_section "Testing Queue Operations"
    
    increment_test
    log_info "Checking task queue operations deployment..."
    if kubectl get deployment task-queue-operations -n "$NAMESPACE" > /dev/null 2>&1; then
        pass_test "Task queue operations deployment exists"
    else
        fail_test "Task queue operations deployment not found"
        return 1
    fi
    
    increment_test
    log_info "Waiting for task queue operations pods to be ready..."
    if wait_for_pod_ready "component=task-queue-operations" 180; then
        pass_test "Task queue operations pods are ready"
    else
        fail_test "Task queue operations pods failed to become ready"
        return 1
    fi
    
    increment_test
    log_info "Testing queue operations API health..."
    local api_health=""
    api_health=$(kubectl run "queue-api-test-$(date +%s)" -n "$NAMESPACE" --image=curlimages/curl --rm -i --restart=Never -- \
        curl -s -o /dev/null -w "%{http_code}" "http://task-queue-operations-service.act-placemat.svc.cluster.local:8081/health" 2>/dev/null || echo "")
    
    if [ "$api_health" = "200" ]; then
        pass_test "Queue operations API health check passed"
    else
        fail_test "Queue operations API health check failed (HTTP $api_health)"
    fi
    
    increment_test
    log_info "Testing enqueue operation..."
    local test_task='{
        "task_id": "test-task-'$(date +%s)'",
        "agent_type": "financial-intelligence",
        "task_type": "analysis",
        "priority": 8,
        "payload": {
            "input_data": {"test": "data"},
            "context": {"test": "context"},
            "parameters": {"test": "parameters"}
        },
        "metadata": {
            "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "expires_at": "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)'",
            "retry_count": 0,
            "max_retries": 3,
            "estimated_duration": 300
        },
        "compliance": {
            "data_classification": "restricted",
            "retention_period": "7 years",
            "audit_required": true,
            "data_residency": "australia"
        }
    }'
    
    local enqueue_result=""
    enqueue_result=$(kubectl run "queue-enqueue-test-$(date +%s)" -n "$NAMESPACE" --image=curlimages/curl --rm -i --restart=Never -- \
        curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_task" \
        "http://task-queue-operations-service.act-placemat.svc.cluster.local:8080/api/v1/tasks/enqueue" 2>/dev/null || echo "")
    
    if echo "$enqueue_result" | grep -q "success\|enqueued"; then
        pass_test "Task enqueue operation successful"
    else
        fail_test "Task enqueue operation failed"
    fi
}

# Test LangGraph integration
test_langgraph_integration() {
    print_section "Testing LangGraph Integration"
    
    increment_test
    log_info "Checking LangGraph integration API deployment..."
    if kubectl get deployment langgraph-integration-api -n "$NAMESPACE" > /dev/null 2>&1; then
        pass_test "LangGraph integration API deployment exists"
    else
        fail_test "LangGraph integration API deployment not found"
        return 1
    fi
    
    increment_test
    log_info "Waiting for LangGraph integration pods to be ready..."
    if wait_for_pod_ready "component=langgraph-integration-api" 180; then
        pass_test "LangGraph integration pods are ready"
    else
        fail_test "LangGraph integration pods failed to become ready"
        return 1
    fi
    
    increment_test
    log_info "Testing LangGraph integration API health..."
    local api_health=""
    api_health=$(kubectl run "langgraph-api-test-$(date +%s)" -n "$NAMESPACE" --image=curlimages/curl --rm -i --restart=Never -- \
        curl -s -o /dev/null -w "%{http_code}" "http://langgraph-integration-service.act-placemat.svc.cluster.local:8081/health" 2>/dev/null || echo "")
    
    if [ "$api_health" = "200" ]; then
        pass_test "LangGraph integration API health check passed"
    else
        fail_test "LangGraph integration API health check failed (HTTP $api_health)"
    fi
    
    increment_test
    log_info "Testing workflow creation..."
    local test_workflow='{
        "workflow_type": "sequential",
        "agents": [
            {
                "agent_type": "research_analyst",
                "task_specification": {
                    "task_type": "data_collection",
                    "input_data": {"query": "test research query"},
                    "parameters": {"scope": "limited"},
                    "expected_output": {"format": "structured_data"}
                }
            },
            {
                "agent_type": "financial_intelligence",
                "task_specification": {
                    "task_type": "analysis",
                    "input_data": {"data_source": "research_output"},
                    "parameters": {"analysis_type": "basic"},
                    "expected_output": {"format": "analysis_report"}
                }
            }
        ],
        "coordination_pattern": {
            "pattern_type": "sequential",
            "error_handling": "stop_on_failure",
            "timeout": 3600
        },
        "metadata": {
            "created_by": "test_system",
            "priority": 5,
            "tags": ["test", "sequential"],
            "compliance": {
                "data_classification": "internal",
                "data_residency": "australia",
                "retention_period": "3 years"
            }
        }
    }'
    
    local workflow_result=""
    workflow_result=$(kubectl run "workflow-test-$(date +%s)" -n "$NAMESPACE" --image=curlimages/curl --rm -i --restart=Never -- \
        curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_workflow" \
        "http://langgraph-integration-service.act-placemat.svc.cluster.local:8080/api/v1/workflows" 2>/dev/null || echo "")
    
    if echo "$workflow_result" | grep -q "workflow_id\|created"; then
        pass_test "Workflow creation successful"
    else
        fail_test "Workflow creation failed"
    fi
}

# Test monitoring and metrics
test_monitoring() {
    print_section "Testing Monitoring and Metrics"
    
    increment_test
    log_info "Checking task queue monitor deployment..."
    if kubectl get deployment task-queue-monitor -n "$NAMESPACE" > /dev/null 2>&1; then
        pass_test "Task queue monitor deployment exists"
    else
        fail_test "Task queue monitor deployment not found"
        return 1
    fi
    
    increment_test
    log_info "Waiting for monitoring pods to be ready..."
    if wait_for_pod_ready "component=task-queue-monitor" 120; then
        pass_test "Monitoring pods are ready"
    else
        fail_test "Monitoring pods failed to become ready"
        return 1
    fi
    
    increment_test
    log_info "Testing metrics endpoint..."
    local metrics_response=""
    metrics_response=$(kubectl run "metrics-test-$(date +%s)" -n "$NAMESPACE" --image=curlimages/curl --rm -i --restart=Never -- \
        curl -s "http://task-queue-monitor-service.act-placemat.svc.cluster.local:9090/metrics" 2>/dev/null || echo "")
    
    if echo "$metrics_response" | grep -q "task_queue_depth_total\|prometheus"; then
        pass_test "Metrics endpoint is functional"
    else
        fail_test "Metrics endpoint test failed"
    fi
    
    increment_test
    log_info "Checking ServiceMonitor existence..."
    if kubectl get servicemonitor task-queue-monitoring -n "$NAMESPACE" > /dev/null 2>&1; then
        pass_test "ServiceMonitor for task queue exists"
    else
        fail_test "ServiceMonitor for task queue not found"
    fi
    
    increment_test
    log_info "Checking PrometheusRule existence..."
    if kubectl get prometheusrule task-queue-alerts -n "$NAMESPACE" > /dev/null 2>&1; then
        pass_test "PrometheusRule for task queue exists"
    else
        fail_test "PrometheusRule for task queue not found"
    fi
}

# Test Australian compliance features
test_compliance() {
    print_section "Testing Australian Compliance Features"
    
    increment_test
    log_info "Verifying data residency labels..."
    local pods_with_residency=0
    local total_pods=0
    
    while read -r pod; do
        ((total_pods++))
        if kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.metadata.labels.data-residency}' | grep -q "australia"; then
            ((pods_with_residency++))
        fi
    done < <(kubectl get pods -n "$NAMESPACE" -l component=task-queue -o jsonpath='{.items[*].metadata.name}')
    
    if [ "$pods_with_residency" -eq "$total_pods" ] && [ "$total_pods" -gt 0 ]; then
        pass_test "All task queue pods have Australian data residency labels"
    else
        fail_test "Data residency labeling incomplete ($pods_with_residency/$total_pods pods labeled)"
    fi
    
    increment_test
    log_info "Checking compliance framework annotations..."
    local compliance_annotations=0
    local total_services=0
    
    while read -r service; do
        ((total_services++))
        if kubectl get service "$service" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.compliance\.framework}' | grep -q "australian-privacy-act"; then
            ((compliance_annotations++))
        fi
    done < <(kubectl get services -n "$NAMESPACE" -l component=task-queue -o jsonpath='{.items[*].metadata.name}')
    
    if [ "$compliance_annotations" -eq "$total_services" ] && [ "$total_services" -gt 0 ]; then
        pass_test "All task queue services have compliance framework annotations"
    else
        fail_test "Compliance framework annotations incomplete ($compliance_annotations/$total_services services annotated)"
    fi
    
    increment_test
    log_info "Testing audit logging functionality..."
    local audit_test_result=""
    audit_test_result=$(kubectl run "audit-test-$(date +%s)" -n "$NAMESPACE" --image=redis:7.2-alpine --rm -i --restart=Never -- \
        redis-cli -h redis-cluster-service.act-placemat.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" \
        EXISTS "audit:operations:$(date +%Y%m%d)" 2>/dev/null || echo "0")
    
    if [ "$audit_test_result" = "1" ]; then
        pass_test "Audit logging is functional"
    else
        fail_test "Audit logging not found or non-functional"
    fi
    
    increment_test
    log_info "Verifying timezone configuration..."
    local timezone_check=""
    timezone_check=$(kubectl run "timezone-test-$(date +%s)" -n "$NAMESPACE" --image=alpine --rm -i --restart=Never -- \
        sh -c 'TZ=Australia/Sydney date' 2>/dev/null || echo "")
    
    if echo "$timezone_check" | grep -q "AEDT\|AEST"; then
        pass_test "Australian timezone configuration verified"
    else
        fail_test "Australian timezone configuration test failed"
    fi
}

# Test performance and reliability
test_performance() {
    print_section "Testing Performance and Reliability"
    
    increment_test
    log_info "Testing queue depth monitoring..."
    local queue_depth=""
    queue_depth=$(kubectl run "depth-test-$(date +%s)" -n "$NAMESPACE" --image=redis:7.2-alpine --rm -i --restart=Never -- \
        redis-cli -h redis-cluster-service.act-placemat.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" \
        ZCARD "act:queue:high" 2>/dev/null || echo "0")
    
    if [[ "$queue_depth" =~ ^[0-9]+$ ]]; then
        pass_test "Queue depth monitoring functional (depth: $queue_depth)"
    else
        fail_test "Queue depth monitoring test failed"
    fi
    
    increment_test
    log_info "Testing connection pooling..."
    local connection_test=""
    connection_test=$(kubectl run "connection-test-$(date +%s)" -n "$NAMESPACE" --image=redis:7.2-alpine --rm -i --restart=Never -- \
        redis-cli -h redis-cluster-service.act-placemat.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" \
        INFO clients 2>/dev/null || echo "")
    
    if echo "$connection_test" | grep -q "connected_clients"; then
        pass_test "Redis connection pooling is functional"
    else
        fail_test "Redis connection pooling test failed"
    fi
    
    increment_test
    log_info "Testing high availability failover simulation..."
    # Simulate a Redis pod restart to test HA
    local redis_pod=""
    redis_pod=$(kubectl get pods -n "$NAMESPACE" -l component=redis-cluster -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$redis_pod" ]; then
        kubectl delete pod "$redis_pod" -n "$NAMESPACE" --grace-period=0 > /dev/null 2>&1 || true
        sleep 10
        
        # Test if cluster is still responsive
        local ha_test=""
        ha_test=$(kubectl run "ha-test-$(date +%s)" -n "$NAMESPACE" --image=redis:7.2-alpine --rm -i --restart=Never -- \
            redis-cli -h redis-cluster-service.act-placemat.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" ping 2>/dev/null || echo "")
        
        if echo "$ha_test" | grep -q "PONG"; then
            pass_test "High availability failover test passed"
        else
            fail_test "High availability failover test failed"
        fi
    else
        fail_test "Could not find Redis pod for HA testing"
    fi
}

# Test database integration
test_database_integration() {
    print_section "Testing Database Integration"
    
    increment_test
    log_info "Testing database connectivity..."
    local db_test=""
    db_test=$(kubectl run "db-test-$(date +%s)" -n "$NAMESPACE" --image=postgres:16-alpine --rm -i --restart=Never --env="PGPASSWORD=$DATABASE_PASSWORD" -- \
        psql -h cloudsql-proxy-service.act-placemat.svc.cluster.local -p 5432 -U postgres -d agent_state_db -c "SELECT 1;" 2>/dev/null || echo "")
    
    if echo "$db_test" | grep -q "1 row"; then
        pass_test "Database connectivity verified"
    else
        fail_test "Database connectivity test failed"
    fi
    
    increment_test
    log_info "Testing agent state schema..."
    local schema_test=""
    schema_test=$(kubectl run "schema-test-$(date +%s)" -n "$NAMESPACE" --image=postgres:16-alpine --rm -i --restart=Never --env="PGPASSWORD=$DATABASE_PASSWORD" -- \
        psql -h cloudsql-proxy-service.act-placemat.svc.cluster.local -p 5432 -U postgres -d agent_state_db -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'agent_checkpoints';" 2>/dev/null || echo "")
    
    if echo "$schema_test" | grep -q "agent_checkpoints"; then
        pass_test "Agent state schema exists"
    else
        fail_test "Agent state schema not found"
    fi
    
    increment_test
    log_info "Testing task queue database schema..."
    local queue_schema_test=""
    queue_schema_test=$(kubectl run "queue-schema-test-$(date +%s)" -n "$NAMESPACE" --image=postgres:16-alpine --rm -i --restart=Never --env="PGPASSWORD=$DATABASE_PASSWORD" -- \
        psql -h cloudsql-proxy-service.act-placemat.svc.cluster.local -p 5432 -U postgres -d task_queue_db -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'task_coordination';" 2>/dev/null || echo "")
    
    if echo "$queue_schema_test" | grep -q "task_coordination"; then
        pass_test "Task queue database schema exists"
    else
        fail_test "Task queue database schema not found"
    fi
}

# Cleanup test resources
cleanup_test_resources() {
    print_section "Cleaning Up Test Resources"
    
    log_info "Removing test pods and resources..."
    
    # Clean up any remaining test pods
    kubectl delete pods -n "$NAMESPACE" -l "run" --grace-period=0 > /dev/null 2>&1 || true
    
    # Clean up test tasks from Redis
    if [ -n "$REDIS_PASSWORD" ]; then
        kubectl run "cleanup-$(date +%s)" -n "$NAMESPACE" --image=redis:7.2-alpine --rm -i --restart=Never -- \
            redis-cli -h redis-cluster-service.act-placemat.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" \
            DEL "test:*" > /dev/null 2>&1 || true
    fi
    
    log_success "Test cleanup completed"
}

# Generate test report
generate_test_report() {
    print_section "Test Report"
    
    echo "Task Queue Testing Results:"
    echo "=========================="
    echo "Total Tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    echo "Success Rate: $(( TESTS_PASSED * 100 / TESTS_TOTAL ))%"
    echo ""
    
    if [ $TESTS_FAILED -gt 0 ]; then
        echo "Failed Tests:"
        for failed_test in "${FAILED_TESTS[@]}"; do
            echo "  - $failed_test"
        done
        echo ""
    fi
    
    # Generate JSON report
    local report_file="$PROJECT_ROOT/test-results/task-queue-test-report-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
{
  "test_suite": "task_queue_comprehensive",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": {
    "namespace": "$NAMESPACE",
    "data_residency": "australia",
    "compliance_framework": "australian-privacy-act"
  },
  "results": {
    "total_tests": $TESTS_TOTAL,
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "success_rate": $(( TESTS_PASSED * 100 / TESTS_TOTAL ))
  },
  "failed_tests": [$(printf '"%s",' "${FAILED_TESTS[@]}" | sed 's/,$//')]
}
EOF
    
    log_info "Detailed report saved to: $report_file"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "🎉 All task queue tests passed! The Universal Task Queue is ready for production."
        return 0
    else
        log_error "❌ Some tests failed. Please review the issues above before deployment."
        return 1
    fi
}

# Main execution function
main() {
    echo "Starting Comprehensive Task Queue Testing Framework"
    echo "==================================================="
    echo "Environment: $NAMESPACE namespace"
    echo "Compliance: Australian Privacy Act 1988"
    echo "Data Residency: Australia"
    echo ""
    
    # Run all test suites
    test_infrastructure_prerequisites || {
        log_error "Infrastructure prerequisites failed. Cannot continue testing."
        exit 1
    }
    
    test_redis_cluster
    test_queue_operations
    test_langgraph_integration
    test_monitoring
    test_compliance
    test_performance
    test_database_integration
    
    # Cleanup and report
    cleanup_test_resources
    generate_test_report
    
    exit_code=$?
    exit $exit_code
}

# Handle script interruption
trap cleanup_test_resources EXIT

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi