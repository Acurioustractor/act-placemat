#!/bin/bash

# ACT Placemat Bulletproof Server Startup
# World-class reliability with automatic recovery

set -euo pipefail

echo "🛡️ ACT Bulletproof Server Startup v1.0"
echo "======================================"

# Configuration
PORT=${PORT:-4000}
MAX_RETRIES=5
RETRY_DELAY=5
HEALTH_CHECK_TIMEOUT=10

# Function to check if server is responsive
check_server_health() {
    echo "🔍 Checking server health on port $PORT..."
    
    # Try to connect to health endpoint with timeout
    if timeout $HEALTH_CHECK_TIMEOUT curl -s -f "http://localhost:$PORT/health" > /dev/null 2>&1; then
        echo "✅ Server is healthy and responding"
        return 0
    else
        echo "❌ Server is not responding"
        return 1
    fi
}

# Function to kill existing processes
cleanup_existing_processes() {
    echo "🧹 Cleaning up existing processes on port $PORT..."
    
    # Find and kill processes using the port
    if lsof -ti:$PORT >/dev/null 2>&1; then
        echo "Found processes using port $PORT, terminating..."
        lsof -ti:$PORT | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if lsof -ti:$PORT >/dev/null 2>&1; then
            echo "Force killing stubborn processes..."
            lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    fi
    
    # Kill any node processes with our server name
    pkill -f "src/server.js" 2>/dev/null || true
    pkill -f "act-backend" 2>/dev/null || true
    
    echo "✅ Cleanup complete"
}

# Function to start server with monitoring
start_server() {
    echo "🚀 Starting ACT Backend Server..."
    
    cd "/Users/benknight/Code/ACT Placemat/apps/backend"
    
    # Start server in background with logging
    nohup npm start > server.log 2>&1 &
    SERVER_PID=$!
    
    echo "📊 Server started with PID: $SERVER_PID"
    echo "📋 Server logs: apps/backend/server.log"
    
    # Wait for server to start up
    echo "⏳ Waiting for server to initialize..."
    sleep 8
    
    # Check if process is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "❌ Server process died during startup"
        echo "📋 Last 20 lines of server.log:"
        tail -20 server.log 2>/dev/null || echo "No log file found"
        return 1
    fi
    
    # Save PID for monitoring
    echo $SERVER_PID > server.pid
    
    return 0
}

# Function to verify all critical endpoints
verify_endpoints() {
    echo "🔍 Verifying critical endpoints..."
    
    local base_url="http://localhost:$PORT"
    local endpoints=(
        "/health"
        "/api/farm-workflow/status"
        "/api/farmhand/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        echo "  Testing: $endpoint"
        if timeout 5 curl -s -f "$base_url$endpoint" > /dev/null 2>&1; then
            echo "    ✅ $endpoint - OK"
        else
            echo "    ⚠️ $endpoint - Not responding (may be loading)"
        fi
    done
}

# Main startup function with retry logic
main() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo ""
        echo "🎯 Startup Attempt $attempt of $MAX_RETRIES"
        echo "=================================="
        
        # Cleanup first
        cleanup_existing_processes
        
        # Wait a moment for cleanup to complete
        sleep 2
        
        # Start the server
        if start_server; then
            # Check if server is healthy
            if check_server_health; then
                echo ""
                echo "🎉 SUCCESS! ACT Backend Server is running bulletproof!"
                echo "🌐 Access: http://localhost:$PORT"
                echo "🏥 Health: http://localhost:$PORT/health"
                echo "🌾 Farm Workflow: http://localhost:$PORT/api/farm-workflow/status"
                echo ""
                
                # Verify all endpoints
                verify_endpoints
                
                echo ""
                echo "📊 Server Statistics:"
                echo "  - PID: $(cat server.pid 2>/dev/null || echo 'Unknown')"
                echo "  - Port: $PORT"
                echo "  - Attempt: $attempt"
                echo "  - Status: OPERATIONAL"
                echo ""
                echo "🛡️ Bulletproof startup complete. Server is ready for critical business operations."
                
                return 0
            else
                echo "❌ Server started but failed health check"
            fi
        else
            echo "❌ Server failed to start"
        fi
        
        echo "⏳ Waiting $RETRY_DELAY seconds before retry $attempt..."
        sleep $RETRY_DELAY
        ((attempt++))
        
        # Cleanup before next attempt
        cleanup_existing_processes
        sleep 1
    done
    
    echo ""
    echo "💥 CRITICAL ERROR: Failed to start server after $MAX_RETRIES attempts"
    echo "📋 Diagnostic information:"
    
    # Show recent logs
    if [ -f "apps/backend/server.log" ]; then
        echo "Last 30 lines of server.log:"
        tail -30 "apps/backend/server.log"
    fi
    
    # Show port status
    echo ""
    echo "Port $PORT status:"
    lsof -i :$PORT || echo "No processes found on port $PORT"
    
    # Show node processes
    echo ""
    echo "Node processes:"
    ps aux | grep node | grep -v grep || echo "No node processes found"
    
    return 1
}

# Handle interrupts gracefully
trap 'echo "🛑 Interrupted. Cleaning up..."; cleanup_existing_processes; exit 1' INT TERM

# Run main function
main "$@"