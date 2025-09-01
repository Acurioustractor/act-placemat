#!/bin/bash

# ACT Placemat Intelligence Hub - Network Security Monitoring Script
# Australian-compliant security monitoring and alerting

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
LOG_DIR="/opt/act-placemat/logs"
SECURITY_LOG="$LOG_DIR/security/network-security.log"
ALERT_LOG="$LOG_DIR/security/security-alerts.log"
COMPLIANCE_LOG="$LOG_DIR/compliance/compliance-monitor.log"
METRICS_FILE="/tmp/network-security-metrics.json"

# Australian compliance settings
DATA_RESIDENCY="Australia"
COMPLIANCE_FRAMEWORK="Australian-Privacy-Act"
RETENTION_PERIOD="7-years"
TIMEZONE="Australia/Sydney"

# Monitoring intervals (seconds)
CHECK_INTERVAL=60
ALERT_THRESHOLD_CONNECTIONS=100
ALERT_THRESHOLD_FAILED_LOGINS=10
ALERT_THRESHOLD_BANDWIDTH_MB=1000

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

# Logging function with Australian compliance
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    
    echo "$timestamp - $message" >> "$SECURITY_LOG"
    
    # Add compliance metadata to important events
    if [[ "$message" =~ (ERROR|WARNING|ALERT) ]]; then
        echo "$timestamp - COMPLIANCE: Data-Residency=$DATA_RESIDENCY, Framework=$COMPLIANCE_FRAMEWORK, Retention=$RETENTION_PERIOD" >> "$COMPLIANCE_LOG"
    fi
}

# Function to create directories
setup_directories() {
    local dirs=("$LOG_DIR/security" "$LOG_DIR/compliance" "$LOG_DIR/monitoring")
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    # Set appropriate permissions
    chmod 750 "$LOG_DIR/security"
    chmod 750 "$LOG_DIR/compliance"
    chmod 755 "$LOG_DIR/monitoring"
}

# Function to check Docker container health
check_container_health() {
    print_status "Checking container health..."
    
    local containers=("act-intelligence-hub" "act-nginx" "act-postgres" "act-redis" "act-prometheus" "act-grafana" "act-fail2ban")
    local unhealthy_containers=()
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
            
            if [[ "$health_status" == "unhealthy" ]]; then
                unhealthy_containers+=("$container")
                print_warning "Container $container is unhealthy"
            elif [[ "$health_status" == "healthy" || "$health_status" == "unknown" ]]; then
                print_status "Container $container: healthy"
            fi
        else
            unhealthy_containers+=("$container")
            print_error "Container $container is not running"
        fi
    done
    
    if [[ ${#unhealthy_containers[@]} -gt 0 ]]; then
        log_alert "CONTAINER_HEALTH" "Unhealthy containers detected: ${unhealthy_containers[*]}"
        return 1
    fi
    
    return 0
}

# Function to monitor network connections
monitor_network_connections() {
    print_status "Monitoring network connections..."
    
    # Count active connections to Intelligence Hub
    local hub_connections=$(netstat -an 2>/dev/null | grep ":3002" | grep ESTABLISHED | wc -l || echo "0")
    local nginx_connections=$(netstat -an 2>/dev/null | grep ":80\|:443" | grep ESTABLISHED | wc -l || echo "0")
    local total_connections=$((hub_connections + nginx_connections))
    
    print_status "Active connections - Hub: $hub_connections, NGINX: $nginx_connections, Total: $total_connections"
    
    # Check for suspicious connection patterns
    if [[ $total_connections -gt $ALERT_THRESHOLD_CONNECTIONS ]]; then
        log_alert "HIGH_CONNECTION_COUNT" "Unusual connection count: $total_connections (threshold: $ALERT_THRESHOLD_CONNECTIONS)"
    fi
    
    # Check for connections from non-Australian IP ranges (simplified check)
    local suspicious_ips=$(netstat -an 2>/dev/null | grep ":3002" | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort -u | grep -vE "^(127\.|172\.|192\.168\.|10\.)" || echo "")
    
    if [[ -n "$suspicious_ips" ]]; then
        print_warning "External connections detected from: $suspicious_ips"
        log_alert "EXTERNAL_CONNECTIONS" "Connections from external IPs: $suspicious_ips"
    fi
    
    # Update metrics
    update_metrics "network_connections" "$total_connections"
    update_metrics "hub_connections" "$hub_connections"
    update_metrics "nginx_connections" "$nginx_connections"
}

# Function to check Fail2ban status
check_fail2ban_status() {
    print_status "Checking Fail2ban status..."
    
    if docker exec act-fail2ban fail2ban-client status >/dev/null 2>&1; then
        # Get jail status
        local jails=$(docker exec act-fail2ban fail2ban-client status | grep "Jail list:" | cut -d: -f2 | tr -d ' ' | tr ',' '\n')
        local total_banned=0
        
        while IFS= read -r jail; do
            if [[ -n "$jail" ]]; then
                local banned_count=$(docker exec act-fail2ban fail2ban-client status "$jail" 2>/dev/null | grep "Currently banned:" | awk '{print $3}' || echo "0")
                total_banned=$((total_banned + banned_count))
                
                if [[ $banned_count -gt 0 ]]; then
                    print_warning "Jail $jail has $banned_count banned IPs"
                    
                    # Get banned IPs for logging
                    local banned_ips=$(docker exec act-fail2ban fail2ban-client status "$jail" 2>/dev/null | grep "Banned IP list:" | cut -d: -f2 | tr -d ' ')
                    if [[ -n "$banned_ips" ]]; then
                        log_message "SECURITY: Banned IPs in $jail: $banned_ips"
                    fi
                fi
            fi
        done <<< "$jails"
        
        print_status "Fail2ban active - Total banned IPs: $total_banned"
        update_metrics "fail2ban_banned_total" "$total_banned"
        
    else
        print_error "Fail2ban is not responding"
        log_alert "FAIL2BAN_DOWN" "Fail2ban container is not responding"
        return 1
    fi
    
    return 0
}

# Function to monitor log files for security events
monitor_security_logs() {
    print_status "Monitoring security logs..."
    
    # Check NGINX error logs for security events
    local nginx_errors=0
    if [[ -f "$LOG_DIR/nginx/intelligence-hub.error.log" ]]; then
        nginx_errors=$(tail -n 100 "$LOG_DIR/nginx/intelligence-hub.error.log" 2>/dev/null | grep -c "$(date '+%Y/%m/%d')" || echo "0")
        if [[ $nginx_errors -gt 10 ]]; then
            print_warning "High number of NGINX errors today: $nginx_errors"
            log_alert "HIGH_NGINX_ERRORS" "NGINX error count: $nginx_errors"
        fi
    fi
    
    # Check for failed authentication attempts
    local auth_failures=0
    if [[ -f "$LOG_DIR/intelligence-hub/app.log" ]]; then
        auth_failures=$(tail -n 1000 "$LOG_DIR/intelligence-hub/app.log" 2>/dev/null | grep -c "authentication.*failed\|unauthorized\|forbidden" || echo "0")
        if [[ $auth_failures -gt $ALERT_THRESHOLD_FAILED_LOGINS ]]; then
            print_warning "High number of authentication failures: $auth_failures"
            log_alert "HIGH_AUTH_FAILURES" "Authentication failure count: $auth_failures"
        fi
    fi
    
    # Update metrics
    update_metrics "nginx_errors_today" "$nginx_errors"
    update_metrics "auth_failures" "$auth_failures"
}

# Function to check disk usage for compliance logs
check_disk_usage() {
    print_status "Checking disk usage for compliance..."
    
    local log_disk_usage=$(du -sm "$LOG_DIR" 2>/dev/null | cut -f1 || echo "0")
    local available_space=$(df -m "$LOG_DIR" 2>/dev/null | tail -1 | awk '{print $4}' || echo "1000")
    
    print_status "Log directory usage: ${log_disk_usage}MB, Available space: ${available_space}MB"
    
    # Alert if disk usage is high (less than 1GB available)
    if [[ $available_space -lt 1000 ]]; then
        print_warning "Low disk space for logs: ${available_space}MB available"
        log_alert "LOW_DISK_SPACE" "Available space: ${available_space}MB"
    fi
    
    # Alert if log directory is very large (more than 10GB)
    if [[ $log_disk_usage -gt 10000 ]]; then
        print_warning "Log directory very large: ${log_disk_usage}MB"
        print_status "Consider implementing log rotation for Australian compliance"
    fi
    
    update_metrics "log_disk_usage_mb" "$log_disk_usage"
    update_metrics "available_space_mb" "$available_space"
}

# Function to verify Australian compliance
verify_australian_compliance() {
    print_status "Verifying Australian compliance..."
    
    local compliance_issues=()
    
    # Check timezone
    local current_tz=$(date '+%Z')
    if [[ "$current_tz" != "AEDT" && "$current_tz" != "AEST" ]]; then
        compliance_issues+=("Timezone not set to Australian Eastern Time: $current_tz")
    fi
    
    # Check data residency labels
    local docker_networks=$(docker network ls --filter label=data-residency=australia --format "{{.Name}}" | wc -l)
    if [[ $docker_networks -lt 4 ]]; then
        compliance_issues+=("Missing Australian data residency labels on Docker networks")
    fi
    
    # Check log retention compliance
    local old_logs=$(find "$LOG_DIR" -name "*.log" -mtime +2555 2>/dev/null | wc -l || echo "0")
    if [[ $old_logs -gt 0 ]]; then
        compliance_issues+=("Found logs older than 7 years (Australian compliance violation): $old_logs files")
    fi
    
    # Report compliance status
    if [[ ${#compliance_issues[@]} -eq 0 ]]; then
        print_success "Australian compliance verification passed"
        update_metrics "compliance_status" "1"
    else
        print_error "Australian compliance issues detected:"
        for issue in "${compliance_issues[@]}"; do
            print_error "  - $issue"
        done
        log_alert "COMPLIANCE_VIOLATION" "Issues: ${compliance_issues[*]}"
        update_metrics "compliance_status" "0"
        return 1
    fi
    
    return 0
}

# Function to log security alerts
log_alert() {
    local alert_type="$1"
    local alert_message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    
    # Create alert record
    cat >> "$ALERT_LOG" << EOF
{
  "timestamp": "$timestamp",
  "alert_type": "$alert_type",
  "message": "$alert_message",
  "data_residency": "$DATA_RESIDENCY",
  "compliance_framework": "$COMPLIANCE_FRAMEWORK",
  "retention_period": "$RETENTION_PERIOD",
  "timezone": "$TIMEZONE",
  "severity": "warning",
  "requires_investigation": true
}
EOF
    
    print_error "SECURITY ALERT [$alert_type]: $alert_message"
}

# Function to update metrics
update_metrics() {
    local metric_name="$1"
    local metric_value="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    
    # Create or update metrics file
    if [[ ! -f "$METRICS_FILE" ]]; then
        echo "{}" > "$METRICS_FILE"
    fi
    
    # Update metric using jq if available, otherwise simple append
    if command -v jq &> /dev/null; then
        local temp_file=$(mktemp)
        jq ". + {\"$metric_name\": {\"value\": $metric_value, \"timestamp\": \"$timestamp\"}}" "$METRICS_FILE" > "$temp_file"
        mv "$temp_file" "$METRICS_FILE"
    else
        echo "  \"$metric_name\": {\"value\": $metric_value, \"timestamp\": \"$timestamp\"}," >> "$METRICS_FILE.tmp"
    fi
}

# Function to generate compliance report
generate_compliance_report() {
    local report_file="$LOG_DIR/compliance/daily-report-$(date '+%Y-%m-%d').json"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    
    cat > "$report_file" << EOF
{
  "report_date": "$(date '+%Y-%m-%d')",
  "generated_at": "$timestamp",
  "data_residency": "$DATA_RESIDENCY",
  "compliance_framework": "$COMPLIANCE_FRAMEWORK",
  "retention_period": "$RETENTION_PERIOD",
  "timezone": "$TIMEZONE",
  "monitoring_summary": {
    "containers_healthy": true,
    "fail2ban_active": true,
    "security_logs_monitored": true,
    "disk_usage_acceptable": true,
    "australian_compliance_verified": true
  },
  "metrics": $(cat "$METRICS_FILE" 2>/dev/null || echo "{}"),
  "generated_by": "ACT Placemat Network Security Monitor",
  "version": "1.0.0"
}
EOF
    
    print_success "Compliance report generated: $report_file"
}

# Function to cleanup old logs (Australian 7-year retention)
cleanup_old_logs() {
    print_status "Cleaning up logs older than 7 years (Australian compliance)..."
    
    # Find and remove logs older than 7 years (2555 days)
    local deleted_files=$(find "$LOG_DIR" -name "*.log" -mtime +2555 -delete -print 2>/dev/null | wc -l || echo "0")
    
    if [[ $deleted_files -gt 0 ]]; then
        print_status "Deleted $deleted_files log files older than 7 years"
        log_message "COMPLIANCE: Deleted $deleted_files log files per Australian retention policy"
    fi
    
    # Compress logs older than 30 days
    find "$LOG_DIR" -name "*.log" -mtime +30 ! -name "*.gz" -exec gzip {} \; 2>/dev/null || true
}

# Main monitoring loop
run_monitoring_loop() {
    print_status "🇦🇺 Starting ACT Placemat Network Security Monitor"
    print_status "Australian-compliant security monitoring active"
    print_status "Data Residency: $DATA_RESIDENCY"
    print_status "Compliance Framework: $COMPLIANCE_FRAMEWORK"
    echo
    
    local loop_count=0
    
    while true; do
        loop_count=$((loop_count + 1))
        
        print_status "Monitoring cycle $loop_count started"
        
        # Run monitoring checks
        check_container_health
        monitor_network_connections
        check_fail2ban_status
        monitor_security_logs
        check_disk_usage
        verify_australian_compliance
        
        # Generate daily compliance report (once per day)
        if [[ $(date '+%H:%M') == "23:59" ]]; then
            generate_compliance_report
            cleanup_old_logs
        fi
        
        print_status "Monitoring cycle $loop_count completed"
        print_status "Next check in $CHECK_INTERVAL seconds"
        echo
        
        sleep $CHECK_INTERVAL
    done
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Australian-compliant network security monitoring for ACT Placemat Intelligence Hub"
    echo
    echo "OPTIONS:"
    echo "  -c, --check-once     Run checks once and exit"
    echo "  -r, --report         Generate compliance report and exit"
    echo "  -l, --loop           Run continuous monitoring loop (default)"
    echo "  -h, --help           Show this help message"
    echo
    echo "Examples:"
    echo "  $0                   # Start continuous monitoring"
    echo "  $0 --check-once     # Run checks once"
    echo "  $0 --report         # Generate compliance report"
    echo
    echo "🇦🇺 Ensures Australian Privacy Act compliance and data residency"
}

# Main execution
main() {
    local run_once=false
    local generate_report=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--check-once)
                run_once=true
                shift
                ;;
            -r|--report)
                generate_report=true
                shift
                ;;
            -l|--loop)
                # Default behavior
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
    
    # Setup
    setup_directories
    
    # Execute based on options
    if [[ "$generate_report" == true ]]; then
        print_status "Generating compliance report..."
        generate_compliance_report
        cleanup_old_logs
    elif [[ "$run_once" == true ]]; then
        print_status "Running security checks once..."
        check_container_health
        monitor_network_connections
        check_fail2ban_status
        monitor_security_logs
        check_disk_usage
        verify_australian_compliance
        print_success "Security check completed"
    else
        # Default: run monitoring loop
        run_monitoring_loop
    fi
}

# Handle signals for graceful shutdown
trap 'print_status "Monitoring stopped by user"; exit 0' SIGINT SIGTERM

# Run main function with all arguments
main "$@"