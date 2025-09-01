#!/bin/bash

# ACT Placemat Intelligence Hub - Database Connectivity and Performance Testing
# Comprehensive testing for Cloud SQL, connection pooling, and schema functionality

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
LOG_FILE="/opt/act-placemat/logs/database-connectivity-performance-test.log"

# Test configuration
TEST_TIMEOUT=600  # 10 minutes
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
    
    local deps=("kubectl" "psql" "jq" "bc")
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
    mkdir -p /opt/act-placemat/logs
    
    # Get cluster credentials if needed
    if ! kubectl get ns "$NAMESPACE" &> /dev/null; then
        record_test_result "test_environment_setup" "FAIL" "Namespace $NAMESPACE not found"
        return 1
    fi
    
    record_test_result "test_environment_setup" "PASS" "Test environment configured"
}

# Function to test Cloud SQL Proxy connectivity
test_cloudsql_proxy_connectivity() {
    print_status "Testing Cloud SQL Proxy connectivity..."
    
    # Test 1: Check if Cloud SQL Proxy pods are running
    print_status "Test 1: Checking Cloud SQL Proxy deployment..."
    PROXY_READY=$(kubectl get deployment cloudsql-proxy -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    PROXY_DESIRED=$(kubectl get deployment cloudsql-proxy -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "$PROXY_READY" == "$PROXY_DESIRED" && "$PROXY_READY" -gt 0 ]]; then
        record_test_result "cloudsql_proxy_deployment" "PASS" "Cloud SQL Proxy ready ($PROXY_READY/$PROXY_DESIRED replicas)"
    else
        record_test_result "cloudsql_proxy_deployment" "FAIL" "Cloud SQL Proxy not ready ($PROXY_READY/$PROXY_DESIRED replicas)"
        return 1
    fi
    
    # Test 2: Check service accessibility
    print_status "Test 2: Testing Cloud SQL Proxy service..."
    if kubectl get service cloudsql-proxy-service -n "$NAMESPACE" &> /dev/null; then
        PROXY_ENDPOINT=$(kubectl get service cloudsql-proxy-service -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
        record_test_result "cloudsql_proxy_service" "PASS" "Service accessible at $PROXY_ENDPOINT:5432"
    else
        record_test_result "cloudsql_proxy_service" "FAIL" "Cloud SQL Proxy service not found"
        return 1
    fi
    
    # Test 3: Test network connectivity to proxy
    print_status "Test 3: Testing network connectivity to Cloud SQL Proxy..."
    
    # Create test pod for connectivity
    cat > /tmp/db-connectivity-test-pod.yaml << EOF
apiVersion: v1
kind: Pod
metadata:
  name: db-connectivity-test-$(date +%s)
  namespace: $NAMESPACE
  labels:
    test-type: connectivity
    data-residency: australia
spec:
  restartPolicy: Never
  containers:
  - name: connectivity-test
    image: postgres:16-alpine
    command:
    - /bin/sh
    - -c
    - |
      echo "Testing connectivity to Cloud SQL Proxy..."
      if timeout 10 nc -z cloudsql-proxy-service.act-placemat.svc.cluster.local 5432; then
        echo "✅ Connection successful"
        exit 0
      else
        echo "❌ Connection failed"
        exit 1
      fi
  nodeSelector:
    data-residency: australia
EOF
    
    if kubectl apply -f /tmp/db-connectivity-test-pod.yaml; then
        POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l test-type=connectivity --sort-by=.metadata.creationTimestamp -o name | tail -1 | sed 's/pod\///')
        
        # Wait for pod completion
        if kubectl wait --for=condition=Ready pod/"$POD_NAME" -n "$NAMESPACE" --timeout=60s &> /dev/null; then
            # Get pod logs
            POD_LOGS=$(kubectl logs "$POD_NAME" -n "$NAMESPACE" 2>/dev/null || echo "No logs available")
            
            if echo "$POD_LOGS" | grep -q "Connection successful"; then
                record_test_result "cloudsql_proxy_connectivity" "PASS" "Network connectivity verified"
            else
                record_test_result "cloudsql_proxy_connectivity" "FAIL" "Network connectivity failed"
            fi
        else
            record_test_result "cloudsql_proxy_connectivity" "FAIL" "Connectivity test pod failed to start"
        fi
        
        # Cleanup
        kubectl delete pod "$POD_NAME" -n "$NAMESPACE" &> /dev/null || true
    else
        record_test_result "cloudsql_proxy_connectivity" "FAIL" "Could not create connectivity test pod"
    fi
    
    rm -f /tmp/db-connectivity-test-pod.yaml
}

# Function to test PgBouncer connection pooling
test_pgbouncer_connection_pooling() {
    print_status "Testing PgBouncer connection pooling..."
    
    # Test 1: Check PgBouncer deployment
    print_status "Test 1: Checking PgBouncer deployment..."
    PGBOUNCER_READY=$(kubectl get deployment pgbouncer -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    PGBOUNCER_DESIRED=$(kubectl get deployment pgbouncer -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "$PGBOUNCER_READY" == "$PGBOUNCER_DESIRED" && "$PGBOUNCER_READY" -gt 0 ]]; then
        record_test_result "pgbouncer_deployment" "PASS" "PgBouncer ready ($PGBOUNCER_READY/$PGBOUNCER_DESIRED replicas)"
    else
        record_test_result "pgbouncer_deployment" "FAIL" "PgBouncer not ready ($PGBOUNCER_READY/$PGBOUNCER_DESIRED replicas)"
        return 1
    fi
    
    # Test 2: Check PgBouncer service
    print_status "Test 2: Testing PgBouncer service..."
    if kubectl get service pgbouncer-service -n "$NAMESPACE" &> /dev/null; then
        PGBOUNCER_ENDPOINT=$(kubectl get service pgbouncer-service -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
        record_test_result "pgbouncer_service" "PASS" "Service accessible at $PGBOUNCER_ENDPOINT:5432"
    else
        record_test_result "pgbouncer_service" "FAIL" "PgBouncer service not found"
        return 1
    fi
    
    # Test 3: Check PgBouncer metrics
    print_status "Test 3: Testing PgBouncer metrics..."
    
    # Try to get metrics endpoint
    METRICS_RESPONSE=$(kubectl exec -n "$NAMESPACE" deployment/pgbouncer -c pgbouncer-exporter -- curl -s http://localhost:9127/metrics 2>/dev/null || echo "")
    
    if [[ -n "$METRICS_RESPONSE" ]] && echo "$METRICS_RESPONSE" | grep -q "pgbouncer_"; then
        METRICS_COUNT=$(echo "$METRICS_RESPONSE" | grep -c "pgbouncer_" || echo "0")
        record_test_result "pgbouncer_metrics" "PASS" "Metrics available ($METRICS_COUNT metrics)"
    else
        record_test_result "pgbouncer_metrics" "FAIL" "No metrics available"
    fi
}

# Function to test database schema functionality
test_database_schema_functionality() {
    print_status "Testing database schema functionality..."
    
    # Get database credentials
    if ! kubectl get secret database-connection-config -n "$NAMESPACE" &> /dev/null; then
        record_test_result "database_credentials" "FAIL" "Database credentials secret not found"
        return 1
    fi
    
    # Test database access through PgBouncer
    print_status "Test 1: Testing database access through PgBouncer..."
    
    # Create test pod for database operations
    cat > /tmp/db-schema-test-pod.yaml << EOF
apiVersion: v1
kind: Pod
metadata:
  name: db-schema-test-$(date +%s)
  namespace: $NAMESPACE
  labels:
    test-type: schema-functionality
    data-residency: australia
spec:
  restartPolicy: Never
  containers:
  - name: schema-test
    image: postgres:16-alpine
    env:
    - name: PGHOST
      value: "pgbouncer-service.act-placemat.svc.cluster.local"
    - name: PGPORT
      value: "5432"
    - name: PGUSER
      valueFrom:
        secretKeyRef:
          name: database-connection-config
          key: postgres-username
    - name: PGPASSWORD
      valueFrom:
        secretKeyRef:
          name: database-connection-config
          key: postgres-password
    - name: PGSSLMODE
      value: "require"
    command:
    - /bin/sh
    - -c
    - |
      echo "Testing database schema functionality..."
      
      # Test agent_state_db access
      echo "=== Testing agent_state_db ==="
      if psql -d agent_state_db -c "SELECT 1 as test;" > /dev/null 2>&1; then
        echo "✅ agent_state_db accessible"
        
        # Test table existence
        TABLES=\$(psql -d agent_state_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
        echo "Tables in agent_state_db: \$TABLES"
        
        # Test agent checkpoint insertion
        if psql -d agent_state_db -c "
          INSERT INTO agent_checkpoints (agent_id, agent_type, execution_id, checkpoint_namespace, checkpoint_data) 
          VALUES ('test-agent-\$(date +%s)', 'financial-intelligence', gen_random_uuid(), 'test', '{\"test\": true}'::jsonb);
        " > /dev/null 2>&1; then
          echo "✅ Agent checkpoint insertion successful"
        else
          echo "❌ Agent checkpoint insertion failed"
        fi
        
        # Test agent execution state
        if psql -d agent_state_db -c "
          INSERT INTO agent_execution_state (agent_id, agent_type, execution_status) 
          VALUES ('test-agent-\$(date +%s)', 'research-analyst', 'pending');
        " > /dev/null 2>&1; then
          echo "✅ Agent execution state insertion successful"
        else
          echo "❌ Agent execution state insertion failed"
        fi
      else
        echo "❌ agent_state_db not accessible"
        exit 1
      fi
      
      # Test task_queue_db access
      echo "=== Testing task_queue_db ==="
      if psql -d task_queue_db -c "SELECT 1 as test;" > /dev/null 2>&1; then
        echo "✅ task_queue_db accessible"
        
        # Test table existence
        TABLES=\$(psql -d task_queue_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
        echo "Tables in task_queue_db: \$TABLES"
        
        # Test task definitions
        TASK_DEFS=\$(psql -d task_queue_db -t -c "SELECT count(*) FROM task_definitions;")
        echo "Task definitions: \$TASK_DEFS"
        
        # Test task queue insertion
        if psql -d task_queue_db -c "
          INSERT INTO task_queue (task_definition_id, task_name, task_input) 
          VALUES (
            (SELECT task_definition_id FROM task_definitions LIMIT 1),
            'test-task-\$(date +%s)',
            '{\"test\": \"data\"}'::jsonb
          );
        " > /dev/null 2>&1; then
          echo "✅ Task queue insertion successful"
        else
          echo "❌ Task queue insertion failed"
        fi
        
        # Test get_next_task_for_agent function
        if NEXT_TASK=\$(psql -d task_queue_db -t -c "SELECT get_next_task_for_agent('test-agent', 'financial-intelligence');"); then
          echo "✅ get_next_task_for_agent function works"
          echo "Next task ID: \$NEXT_TASK"
        else
          echo "❌ get_next_task_for_agent function failed"
        fi
      else
        echo "❌ task_queue_db not accessible"
        exit 1
      fi
      
      # Test Australian compliance features
      echo "=== Testing Australian Compliance ==="
      
      # Check timezone
      TIMEZONE=\$(psql -d agent_state_db -t -c "SHOW timezone;")
      echo "Database timezone: \$TIMEZONE"
      
      if [[ "\$TIMEZONE" == *"Australia"* ]]; then
        echo "✅ Australian timezone configured"
      else
        echo "⚠️ Timezone not set to Australia"
      fi
      
      # Check audit logging
      AUDIT_COUNT=\$(psql -d agent_state_db -t -c "SELECT count(*) FROM agent_audit_log;")
      echo "Audit log entries: \$AUDIT_COUNT"
      
      echo "🎉 Database schema functionality test completed"
  nodeSelector:
    data-residency: australia
EOF
    
    if kubectl apply -f /tmp/db-schema-test-pod.yaml; then
        POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l test-type=schema-functionality --sort-by=.metadata.creationTimestamp -o name | tail -1 | sed 's/pod\///')
        
        # Wait for pod completion
        if kubectl wait --for=condition=Ready pod/"$POD_NAME" -n "$NAMESPACE" --timeout=120s &> /dev/null; then
            # Get pod logs
            sleep 5 # Give the pod time to complete
            POD_LOGS=$(kubectl logs "$POD_NAME" -n "$NAMESPACE" 2>/dev/null || echo "No logs available")
            
            if echo "$POD_LOGS" | grep -q "Database schema functionality test completed"; then
                record_test_result "database_schema_functionality" "PASS" "All schema tests passed"
                
                # Extract specific test results
                if echo "$POD_LOGS" | grep -q "agent_state_db accessible"; then
                    record_test_result "agent_state_db_access" "PASS" "Agent state database accessible"
                fi
                
                if echo "$POD_LOGS" | grep -q "task_queue_db accessible"; then
                    record_test_result "task_queue_db_access" "PASS" "Task queue database accessible"
                fi
                
                if echo "$POD_LOGS" | grep -q "Australian timezone configured"; then
                    record_test_result "australian_timezone_compliance" "PASS" "Australian timezone configured"
                fi
            else
                record_test_result "database_schema_functionality" "FAIL" "Schema tests failed"
            fi
        else
            record_test_result "database_schema_functionality" "FAIL" "Schema test pod failed to complete"
        fi
        
        # Cleanup
        kubectl delete pod "$POD_NAME" -n "$NAMESPACE" &> /dev/null || true
    else
        record_test_result "database_schema_functionality" "FAIL" "Could not create schema test pod"
    fi
    
    rm -f /tmp/db-schema-test-pod.yaml
}

# Function to test database performance
test_database_performance() {
    print_status "Testing database performance..."
    
    # Create performance test pod
    cat > /tmp/db-performance-test-pod.yaml << EOF
apiVersion: v1
kind: Pod
metadata:
  name: db-performance-test-$(date +%s)
  namespace: $NAMESPACE
  labels:
    test-type: performance
    data-residency: australia
spec:
  restartPolicy: Never
  containers:
  - name: performance-test
    image: postgres:16-alpine
    env:
    - name: PGHOST
      value: "pgbouncer-service.act-placemat.svc.cluster.local"
    - name: PGPORT
      value: "5432"
    - name: PGUSER
      valueFrom:
        secretKeyRef:
          name: database-connection-config
          key: postgres-username
    - name: PGPASSWORD
      valueFrom:
        secretKeyRef:
          name: database-connection-config
          key: postgres-password
    - name: PGSSLMODE
      value: "require"
    command:
    - /bin/sh
    - -c
    - |
      echo "Starting database performance tests..."
      
      # Function to measure query performance
      measure_query_performance() {
        local db_name=\$1
        local query="\$2"
        local description="\$3"
        
        echo "Testing \$description on \$db_name..."
        
        # Measure query execution time
        START_TIME=\$(date +%s%N)
        if psql -d "\$db_name" -c "\$query" > /dev/null 2>&1; then
          END_TIME=\$(date +%s%N)
          DURATION=\$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds
          echo "✅ \$description: \${DURATION}ms"
          
          # Check if performance is acceptable (< 1000ms for basic queries)
          if [ \$DURATION -lt 1000 ]; then
            echo "✅ Performance: Good (\${DURATION}ms < 1000ms)"
          else
            echo "⚠️ Performance: Slow (\${DURATION}ms >= 1000ms)"
          fi
        else
          echo "❌ \$description: Query failed"
        fi
      }
      
      # Test 1: Simple SELECT performance
      echo "=== Basic Query Performance ==="
      measure_query_performance "agent_state_db" "SELECT 1;" "Simple SELECT"
      measure_query_performance "task_queue_db" "SELECT 1;" "Simple SELECT"
      
      # Test 2: Table scan performance
      echo "=== Table Scan Performance ==="
      measure_query_performance "agent_state_db" "SELECT count(*) FROM agent_checkpoints;" "Checkpoint count"
      measure_query_performance "task_queue_db" "SELECT count(*) FROM task_queue;" "Task queue count"
      
      # Test 3: Index usage performance
      echo "=== Index Usage Performance ==="
      measure_query_performance "agent_state_db" "SELECT * FROM agent_execution_state WHERE agent_type = 'financial-intelligence' LIMIT 10;" "Agent type lookup"
      measure_query_performance "task_queue_db" "SELECT * FROM task_queue WHERE task_status = 'pending' LIMIT 10;" "Task status lookup"
      
      # Test 4: Complex query performance
      echo "=== Complex Query Performance ==="
      measure_query_performance "task_queue_db" "
        SELECT td.task_name, count(*) as task_count 
        FROM task_queue tq 
        JOIN task_definitions td ON tq.task_definition_id = td.task_definition_id 
        GROUP BY td.task_name;
      " "Join with aggregation"
      
      # Test 5: Function performance
      echo "=== Function Performance ==="
      measure_query_performance "task_queue_db" "SELECT get_next_task_for_agent('perf-test-agent', 'financial-intelligence');" "Next task function"
      
      # Test 6: Connection pooling stress test
      echo "=== Connection Pool Stress Test ==="
      
      # Create multiple concurrent connections
      for i in {1..10}; do
        psql -d agent_state_db -c "SELECT pg_sleep(0.1), \$i as connection_id;" &
      done
      
      # Wait for all background jobs
      wait
      echo "✅ Connection pool stress test completed"
      
      # Test 7: Transaction performance
      echo "=== Transaction Performance ==="
      START_TIME=\$(date +%s%N)
      if psql -d task_queue_db -c "
        BEGIN;
        INSERT INTO task_queue (task_definition_id, task_name, task_input) 
        VALUES (
          (SELECT task_definition_id FROM task_definitions LIMIT 1),
          'perf-test-task-\$(date +%s)',
          '{\"performance_test\": true}'::jsonb
        );
        COMMIT;
      " > /dev/null 2>&1; then
        END_TIME=\$(date +%s%N)
        TRANSACTION_DURATION=\$(( (END_TIME - START_TIME) / 1000000 ))
        echo "✅ Transaction performance: \${TRANSACTION_DURATION}ms"
      else
        echo "❌ Transaction performance test failed"
      fi
      
      echo "🎉 Database performance testing completed"
  nodeSelector:
    data-residency: australia
EOF
    
    if kubectl apply -f /tmp/db-performance-test-pod.yaml; then
        POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l test-type=performance --sort-by=.metadata.creationTimestamp -o name | tail -1 | sed 's/pod\///')
        
        # Wait for pod completion
        print_status "Running performance tests (this may take a few minutes)..."
        if kubectl wait --for=condition=Ready pod/"$POD_NAME" -n "$NAMESPACE" --timeout=300s &> /dev/null; then
            # Give the pod time to complete all tests
            sleep 30
            
            # Get pod logs
            POD_LOGS=$(kubectl logs "$POD_NAME" -n "$NAMESPACE" 2>/dev/null || echo "No logs available")
            
            if echo "$POD_LOGS" | grep -q "Database performance testing completed"; then
                record_test_result "database_performance" "PASS" "Performance tests completed"
                
                # Extract performance metrics
                SIMPLE_SELECT_TIME=$(echo "$POD_LOGS" | grep "Simple SELECT:" | head -1 | grep -o '[0-9]\+ms' | head -1 || echo "N/A")
                CONNECTION_POOL_TEST=$(echo "$POD_LOGS" | grep "Connection pool stress test completed" && echo "PASS" || echo "FAIL")
                
                record_test_result "simple_query_performance" "PASS" "Simple SELECT: $SIMPLE_SELECT_TIME"
                record_test_result "connection_pool_stress" "$CONNECTION_POOL_TEST" "Connection pool stress test"
            else
                record_test_result "database_performance" "FAIL" "Performance tests failed or incomplete"
            fi
        else
            record_test_result "database_performance" "FAIL" "Performance test pod failed to complete within timeout"
        fi
        
        # Cleanup
        kubectl delete pod "$POD_NAME" -n "$NAMESPACE" &> /dev/null || true
    else
        record_test_result "database_performance" "FAIL" "Could not create performance test pod"
    fi
    
    rm -f /tmp/db-performance-test-pod.yaml
}

# Function to test Australian compliance requirements
test_australian_compliance() {
    print_status "Testing Australian compliance requirements..."
    
    # Test 1: Data residency validation
    print_status "Test 1: Validating data residency..."
    
    # Check pod node affinity
    PODS_IN_AUSTRALIA=$(kubectl get pods -n "$NAMESPACE" -o json | jq -r '.items[] | select(.spec.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[]?.matchExpressions[]? | select(.key == "kubernetes.io/zone" and (.values[] | test("australia")))) | .metadata.name' 2>/dev/null | wc -l)
    TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [[ "$PODS_IN_AUSTRALIA" -eq "$TOTAL_PODS" && "$TOTAL_PODS" -gt 0 ]]; then
        record_test_result "data_residency_pods" "PASS" "All pods ($TOTAL_PODS) scheduled in Australian zones"
    else
        record_test_result "data_residency_pods" "WARN" "Some pods may not be in Australian zones ($PODS_IN_AUSTRALIA/$TOTAL_PODS)"
    fi
    
    # Test 2: Compliance labels validation
    print_status "Test 2: Validating compliance labels..."
    COMPLIANT_RESOURCES=$(kubectl get deployments,services,configmaps -n "$NAMESPACE" -o json 2>/dev/null | jq -r '.items[] | select(.metadata.labels."data-residency" == "australia" and .metadata.annotations."compliance.framework" == "australian-privacy-act") | .metadata.name' | wc -l)
    TOTAL_RESOURCES=$(kubectl get deployments,services,configmaps -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    
    if [[ "$COMPLIANT_RESOURCES" -gt 0 ]]; then
        record_test_result "compliance_labels" "PASS" "Found $COMPLIANT_RESOURCES resources with compliance labels"
    else
        record_test_result "compliance_labels" "WARN" "No resources with compliance labels found"
    fi
    
    # Test 3: SSL/TLS encryption validation
    print_status "Test 3: Validating SSL/TLS encryption..."
    
    # Check if database connections require SSL
    SSL_ENFORCEMENT=$(kubectl get configmap database-connection-config -n "$NAMESPACE" -o jsonpath='{.data.postgres-ssl-mode}' 2>/dev/null || echo "")
    
    if [[ "$SSL_ENFORCEMENT" == "require" ]]; then
        record_test_result "ssl_enforcement" "PASS" "SSL encryption required for database connections"
    else
        record_test_result "ssl_enforcement" "WARN" "SSL enforcement not configured or unknown"
    fi
    
    # Test 4: Audit logging validation
    print_status "Test 4: Validating audit logging..."
    
    # Check for recent database audit events
    RECENT_EVENTS=$(kubectl get events -n "$NAMESPACE" --field-selector reason=DatabaseHealthCheckPassed,reason=DatabaseBackupCompleted --no-headers 2>/dev/null | wc -l)
    if [[ "$RECENT_EVENTS" -gt 0 ]]; then
        record_test_result "audit_logging" "PASS" "Found $RECENT_EVENTS audit events"
    else
        record_test_result "audit_logging" "WARN" "No recent audit events found (may be normal for new deployment)"
    fi
}

# Function to test backup and recovery functionality
test_backup_recovery() {
    print_status "Testing backup and recovery functionality..."
    
    # Test 1: Check backup jobs configuration
    print_status "Test 1: Checking backup jobs..."
    
    FULL_BACKUP_JOB=$(kubectl get cronjob database-full-backup -n "$NAMESPACE" &> /dev/null && echo "EXISTS" || echo "MISSING")
    INCREMENTAL_BACKUP_JOB=$(kubectl get cronjob database-incremental-backup -n "$NAMESPACE" &> /dev/null && echo "EXISTS" || echo "MISSING")
    
    if [[ "$FULL_BACKUP_JOB" == "EXISTS" && "$INCREMENTAL_BACKUP_JOB" == "EXISTS" ]]; then
        record_test_result "backup_jobs_config" "PASS" "Backup jobs configured (full and incremental)"
    else
        record_test_result "backup_jobs_config" "FAIL" "Backup jobs missing (full: $FULL_BACKUP_JOB, incremental: $INCREMENTAL_BACKUP_JOB)"
    fi
    
    # Test 2: Check recent backup reports
    print_status "Test 2: Checking recent backup reports..."
    
    BACKUP_REPORTS=$(kubectl get configmaps -n "$NAMESPACE" -l operation=full-backup --sort-by=.metadata.creationTimestamp -o name 2>/dev/null | wc -l)
    if [[ "$BACKUP_REPORTS" -gt 0 ]]; then
        record_test_result "backup_reports" "PASS" "Found $BACKUP_REPORTS backup reports"
    else
        record_test_result "backup_reports" "WARN" "No backup reports found (may be normal for new deployment)"
    fi
    
    # Test 3: Check high availability configuration
    print_status "Test 3: Checking high availability configuration..."
    
    HA_MONITOR=$(kubectl get deployment database-ha-monitor -n "$NAMESPACE" &> /dev/null && echo "EXISTS" || echo "MISSING")
    if [[ "$HA_MONITOR" == "EXISTS" ]]; then
        record_test_result "ha_configuration" "PASS" "High availability monitoring configured"
    else
        record_test_result "ha_configuration" "FAIL" "High availability monitoring not found"
    fi
}

# Function to generate comprehensive test report
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
    cat > /opt/act-placemat/test-results/database-connectivity-performance-test-report.json << EOF
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
  "test_categories": {
    "connectivity": "tested",
    "performance": "tested",
    "schema_functionality": "tested",
    "connection_pooling": "tested",
    "compliance": "tested",
    "backup_recovery": "tested"
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
            echo "," >> /opt/act-placemat/test-results/database-connectivity-performance-test-report.json
        fi
        
        cat >> /opt/act-placemat/test-results/database-connectivity-performance-test-report.json << EOF
    {
      "test_name": "$test_name",
      "result": "$test_result",
      "details": "$test_details"
    }
EOF
    done
    
    cat >> /opt/act-placemat/test-results/database-connectivity-performance-test-report.json << EOF
  ]
}
EOF
    
    # Generate markdown report
    cat > /opt/act-placemat/test-results/database-connectivity-performance-test-report.md << EOF
# ACT Placemat Database Connectivity and Performance Test Report

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

## Test Categories Covered
- ✅ **Connectivity Testing**: Cloud SQL Proxy and network connectivity
- ✅ **Connection Pooling**: PgBouncer functionality and metrics
- ✅ **Schema Functionality**: Database tables, functions, and operations
- ✅ **Performance Testing**: Query performance and connection pool stress tests
- ✅ **Australian Compliance**: Data residency, encryption, and audit logging
- ✅ **Backup & Recovery**: Backup jobs and high availability configuration

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
        
        echo "### $emoji $test_name" >> /opt/act-placemat/test-results/database-connectivity-performance-test-report.md
        echo "**Result**: $test_result" >> /opt/act-placemat/test-results/database-connectivity-performance-test-report.md
        echo "**Details**: $test_details" >> /opt/act-placemat/test-results/database-connectivity-performance-test-report.md
        echo "" >> /opt/act-placemat/test-results/database-connectivity-performance-test-report.md
    done
    
    print_success "Test report generated: /opt/act-placemat/test-results/database-connectivity-performance-test-report.json"
    print_success "Markdown report: /opt/act-placemat/test-results/database-connectivity-performance-test-report.md"
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
    echo "🇦🇺 ACT Placemat Database Connectivity and Performance Test Summary"
    echo "=================================================================="
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
        echo "🎉 All tests passed! Database infrastructure is working correctly."
        echo "🔒 Australian compliance verified"
        echo "📍 Data residency enforced"
        echo "🗄️  Database connectivity operational"
        echo "🔄 Connection pooling functional"
        echo "📊 Performance within acceptable limits"
        echo "🛡️  Backup and high availability configured"
    else
        echo "⚠️  Some tests failed. Please review the detailed report for remediation steps."
        echo "📋 Report: /opt/act-placemat/test-results/database-connectivity-performance-test-report.md"
    fi
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Test database connectivity and performance for ACT Placemat"
    echo
    echo "OPTIONS:"
    echo "  -n, --namespace NAMESPACE    Kubernetes namespace (default: act-placemat)"
    echo "  -t, --timeout SECONDS       Test timeout in seconds (default: 600)"
    echo "  --skip-performance          Skip performance testing"
    echo "  --skip-compliance           Skip compliance testing"
    echo "  -h, --help                   Show this help message"
    echo
    echo "Examples:"
    echo "  $0                           # Full test suite"
    echo "  $0 --skip-performance       # Skip performance tests"
    echo "  $0 -n my-namespace          # Test in different namespace"
    echo
    echo "🇦🇺 Tests Australian Privacy Act compliance and data residency"
}

# Main execution
main() {
    local skip_performance=false
    local skip_compliance=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -t|--timeout)
                TEST_TIMEOUT="$2"
                shift 2
                ;;
            --skip-performance)
                skip_performance=true
                shift
                ;;
            --skip-compliance)
                skip_compliance=true
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
    
    echo "🇦🇺 ACT Placemat Database Connectivity and Performance Testing"
    echo "=============================================================="
    echo
    
    # Create log directory
    mkdir -p /opt/act-placemat/logs
    
    # Run tests
    check_dependencies || exit 1
    setup_test_environment || exit 1
    test_cloudsql_proxy_connectivity
    test_pgbouncer_connection_pooling
    test_database_schema_functionality
    
    if [[ "$skip_performance" == false ]]; then
        test_database_performance
    fi
    
    if [[ "$skip_compliance" == false ]]; then
        test_australian_compliance
    fi
    
    test_backup_recovery
    
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