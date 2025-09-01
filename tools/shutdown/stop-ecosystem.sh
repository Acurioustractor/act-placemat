#!/bin/bash
# Stop ACT Ecosystem Services

echo "🛑 Stopping ACT Ecosystem..."

# Kill the main server if PID file exists
if [ -f .ecosystem-server.pid ]; then
    server_pid=$(cat .ecosystem-server.pid)
    if kill -0 $server_pid 2>/dev/null; then
        echo "   Stopping ecosystem server (PID: $server_pid)..."
        kill $server_pid
        sleep 2
        
        # Force kill if still running
        if kill -0 $server_pid 2>/dev/null; then
            echo "   Force stopping server..."
            kill -9 $server_pid 2>/dev/null
        fi
        
        echo "   ✅ Ecosystem server stopped"
    else
        echo "   ⚠️  Server was not running"
    fi
    
    rm -f .ecosystem-server.pid
else
    echo "   ⚠️  No PID file found"
fi

# Kill any other related processes
pkill -f "ecosystem-server.js" 2>/dev/null || true
pkill -f "node.*ecosystem" 2>/dev/null || true

# Clean up any processes using our default ports
for port in 4000 4001 4002 4003; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "   Cleaning up port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

echo "✅ ACT Ecosystem stopped"