#!/bin/bash
# Stop Complete ACT Ecosystem Platform

echo "🛑 Stopping Complete ACT Ecosystem Platform..."

# Kill processes by PID if available
if [ -f .backend.pid ]; then
    backend_pid=$(cat .backend.pid)
    if kill -0 $backend_pid 2>/dev/null; then
        echo "   Stopping backend (PID: $backend_pid)..."
        kill $backend_pid
    fi
    rm -f .backend.pid
fi

if [ -f .frontend.pid ]; then
    frontend_pid=$(cat .frontend.pid)
    if kill -0 $frontend_pid 2>/dev/null; then
        echo "   Stopping frontend (PID: $frontend_pid)..."
        kill $frontend_pid
    fi
    rm -f .frontend.pid
fi

# Kill by process name
pkill -f "ecosystem-server.js" 2>/dev/null || true
pkill -f "vite.*--port.*3000" 2>/dev/null || true
pkill -f "start-dev-integrated.js" 2>/dev/null || true

# Force kill processes on specific ports
for port in 3000 4000; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "   Cleaning up port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

# Clean up temp files
rm -f apps/frontend/start-dev-integrated.js
rm -f ecosystem-server.js
rm -f .ecosystem-server.pid

echo "✅ ACT Ecosystem Platform stopped"