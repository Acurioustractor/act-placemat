#!/bin/bash

# ACT Placemat - Auto Recovery Script
# Monitors services and automatically restarts them on failure

LOG_FILE="logs/auto-recovery.log"
MAX_FAILURES=3
FAILURE_COUNT=0
CHECK_INTERVAL=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p logs

log_message() {
    local message="$(date '+%Y-%m-%d %H:%M:%S'): $1"
    echo -e "$message" | tee -a "$LOG_FILE"
}

check_service() {
    local url=$1
    local service_name=$2
    local timeout=${3:-10}
    
    if curl -s -f --max-time $timeout "$url" > /dev/null 2>&1; then
        return 0  # Success
    else
        return 1  # Failure
    fi
}

get_service_status() {
    local main_app_healthy=false
    local backend_healthy=false
    local frontend_healthy=false
    
    # Check main application (Docker mode)
    if check_service "http://localhost:3000/health" "Main Application" 5; then
        main_app_healthy=true
        log_message "✅ Main Application (port 3000) is healthy"
    fi
    
    # Check backend directly
    if check_service "http://localhost:4000/health" "Backend API" 5; then
        backend_healthy=true
        log_message "✅ Backend API (port 4000) is healthy"
    fi
    
    # Check frontend directly
    if check_service "http://localhost:5173" "Frontend" 5; then
        frontend_healthy=true
        log_message "✅ Frontend (port 5173) is healthy"
    fi
    
    # Determine overall health
    if [ "$main_app_healthy" = true ] || ([ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ]); then
        return 0  # Overall healthy
    else
        return 1  # Overall unhealthy
    fi
}

restart_services() {
    log_message "🔄 Attempting to restart services due to repeated failures..."
    
    # Try different restart strategies based on what's available
    if [ -f "docker-compose.dev.yml" ] && command -v docker-compose &> /dev/null; then
        log_message "📦 Restarting Docker containers..."
        docker-compose -f docker-compose.dev.yml restart
        sleep 15
        
    elif command -v pm2 &> /dev/null && [ -f "ecosystem.config.js" ]; then
        log_message "🔧 Restarting PM2 processes..."
        pm2 restart all
        sleep 10
        
    else
        log_message "⚡ Restarting simple mode services..."
        # Stop existing services
        ./stop.sh > /dev/null 2>&1
        sleep 5
        # Start services again
        ./dev.sh simple > /dev/null 2>&1 &
        sleep 15
    fi
    
    log_message "✅ Restart attempt completed"
}

send_alert() {
    local message=$1
    log_message "🚨 ALERT: $message"
    
    # Here you could add additional alerting mechanisms:
    # - Send email
    # - Send Slack notification
    # - Send SMS
    # - Write to monitoring system
    
    # For now, just ensure it's prominently logged
    echo "$(date '+%Y-%m-%d %H:%M:%S'): CRITICAL ALERT - $message" >> logs/critical-alerts.log
}

cleanup() {
    log_message "🛑 Auto-recovery script stopping..."
    exit 0
}

# Set up signal handlers for clean shutdown
trap cleanup SIGTERM SIGINT

print_startup_info() {
    echo -e "${BLUE}"
    echo "🔄 ACT Placemat Auto-Recovery Service"
    echo "======================================"
    echo -e "${NC}"
    echo -e "${GREEN}📊 Monitoring Configuration:${NC}"
    echo "   Check Interval: ${CHECK_INTERVAL} seconds"
    echo "   Max Failures: ${MAX_FAILURES}"
    echo "   Log File: ${LOG_FILE}"
    echo ""
    echo -e "${GREEN}🎯 Monitored Services:${NC}"
    echo "   Main App: http://localhost:3000/health"
    echo "   Backend:  http://localhost:4000/health" 
    echo "   Frontend: http://localhost:5173"
    echo ""
    echo -e "${YELLOW}🚀 Starting monitoring...${NC}"
    echo ""
}

# Main execution
print_startup_info
log_message "🚀 Auto-recovery service started (PID: $$)"

# Main monitoring loop
while true; do
    if get_service_status; then
        # Services are healthy
        if [ $FAILURE_COUNT -gt 0 ]; then
            log_message "💚 Services recovered! Resetting failure count."
            FAILURE_COUNT=0
        fi
    else
        # Services are unhealthy
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        log_message "❌ Service check failed. Failure count: $FAILURE_COUNT/$MAX_FAILURES"
        
        if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
            send_alert "Maximum failures reached ($MAX_FAILURES). Attempting automatic restart."
            restart_services
            FAILURE_COUNT=0
            
            # Wait longer after restart attempt
            log_message "⏳ Waiting 60 seconds after restart before next check..."
            sleep 60
            continue
        fi
    fi
    
    # Wait before next check
    sleep $CHECK_INTERVAL
done