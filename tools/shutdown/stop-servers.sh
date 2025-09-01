#!/bin/bash

# ACT Placemat Development Server Stopper
# This script stops all development servers

echo "🛑 Stopping ACT Placemat Development Servers..."

# Kill by PID if we have them saved
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    echo "Stopping backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    rm logs/backend.pid
fi

if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    echo "Stopping frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    rm logs/frontend.pid
fi

# Kill by process name as backup
echo "🧹 Cleaning up any remaining processes..."
pkill -f "vite" 2>/dev/null
pkill -f "nodemon" 2>/dev/null  
pkill -f "node.*server.js" 2>/dev/null

# Kill by port as final cleanup
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null

echo ""
echo "✅ All servers stopped successfully!"
echo "📝 Logs are preserved in the logs/ directory"