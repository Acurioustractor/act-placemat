#!/bin/bash

echo "🛑 STOPPING ALL ACT PLACEMAT SERVICES"
echo "====================================="

# Kill processes by PID if available
if [ -f .backend.pid ]; then
    echo "🔧 Stopping backend..."
    kill $(cat .backend.pid) 2>/dev/null || true
    rm .backend.pid
fi

if [ -f .html.pid ]; then
    echo "🌐 Stopping HTML server..."
    kill $(cat .html.pid) 2>/dev/null || true
    rm .html.pid
fi

# Kill by process name as backup
echo "🧹 Cleaning up any remaining processes..."
pkill -f "python3 -m http.server" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "✅ All services stopped!"