#!/bin/bash

# ACT Placemat Development Server Launcher
# This script starts both frontend and backend servers in the background
# and keeps them running until you explicitly stop them

echo "🚀 Starting ACT Placemat Development Servers..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "vite" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null

# Wait a moment for cleanup
sleep 2

# Create log directory
mkdir -p logs

echo "🔧 Starting Backend Server (Port 4000)..."
cd apps/backend
nohup npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ../..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

echo "🌐 Starting Frontend Server (Port 5173)..."
cd apps/frontend  
nohup npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ../..

# Save PIDs for later cleanup
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo ""
echo "✅ SERVERS STARTED SUCCESSFULLY!"
echo ""
echo "🌟 Frontend Dashboard: http://localhost:5173"
echo "🔧 Backend API: http://localhost:4000" 
echo "🧪 Visual Testing: http://localhost:5173/visual-testing"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop servers: ./stop-servers.sh"
echo ""

# Test if servers are responding
echo "🔍 Testing server connectivity..."
sleep 3

if curl -s http://localhost:4000/health > /dev/null; then
    echo "✅ Backend is responding"
else
    echo "❌ Backend not responding - check logs/backend.log"
fi

if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend is responding"  
else
    echo "❌ Frontend not responding - check logs/frontend.log"
fi

echo ""
echo "🎉 Setup complete! Your servers are running in the background."
echo "   They will continue running until you stop them or restart your computer."