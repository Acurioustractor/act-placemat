#!/bin/bash

echo "🚀 LAUNCHING ACT PLACEMAT - NO BULLSHIT VERSION"
echo "================================================"

# Kill any existing processes
echo "🧹 Killing existing processes..."
pkill -f "python3 -m http.server" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Kill by port numbers to be sure
lsof -ti :4000 | xargs kill -9 2>/dev/null || true
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 3

# Start backend with CORS disabled
echo "🔧 Starting backend with CORS disabled..."
cd apps/backend
ALLOWED_ORIGINS="*" npm run dev > ../../backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend to start and test it
echo "⏳ Waiting for backend to start..."
for i in {1..10}; do
    sleep 2
    echo "🧪 Testing backend (attempt $i/10)..."
    if curl -s http://localhost:4000/health > /dev/null; then
        echo "✅ Backend is running on http://localhost:4000"
        break
    elif [ $i -eq 10 ]; then
        echo "❌ Backend failed to start after 10 attempts"
        echo "📋 Backend log:"
        tail -20 backend.log
        exit 1
    fi
done

# Start simple HTML server
echo "🌐 Starting simple HTML server..."
python3 -m http.server 8080 > simple-server.log 2>&1 &
HTML_PID=$!

# Wait for HTML server
sleep 2

echo ""
echo "🎉 SUCCESS! Everything is running:"
echo "=================================="
echo "📄 Simple Test Page: http://localhost:8080/simple-test.html"
echo "🔧 Backend API: http://localhost:4000/health"
echo ""
echo "🔥 OPEN THIS NOW: http://localhost:8080/simple-test.html"
echo ""
echo "💡 The test page will show you:"
echo "   - Proof that HTML works"
echo "   - Backend connection test"
echo "   - Links to try other parts"
echo ""
echo "🛑 To stop everything, run: ./STOP.sh"

# Save PIDs for stopping later
echo $BACKEND_PID > .backend.pid
echo $HTML_PID > .html.pid

# Open browser automatically
if command -v open &> /dev/null; then
    echo "🌐 Opening browser..."
    open http://localhost:8080/simple-test.html
fi

echo ""
echo "✅ DONE! Check your browser or go to: http://localhost:8080/simple-test.html"