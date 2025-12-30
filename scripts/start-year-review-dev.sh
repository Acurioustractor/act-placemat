#!/bin/bash
# Start Year in Review Development Environment
# Backend: port 4000, Frontend: port 5175
#
# Usage: ./scripts/start-year-review-dev.sh [--open]
#   --open: Automatically open admin panel in browser

set -e

PROJECT_ROOT="/Users/benknight/Code/ACT Placemat"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
FRONTEND_DIR="$PROJECT_ROOT/apps/webflow-portfolio"
OPEN_BROWSER=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --open) OPEN_BROWSER=true ;;
    esac
done

echo "=== Year in Review Dev Environment ==="
echo ""

# Kill any existing processes on our ports
echo "Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:5175 | xargs kill -9 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

# Always clear Next.js cache to avoid stale route issues
echo "Clearing Next.js cache..."
rm -rf "$FRONTEND_DIR/.next"

# Start backend
echo ""
echo "Starting backend on port 4000..."
cd "$BACKEND_DIR"
PORT=4000 node server.js > /tmp/year-review-backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# Verify backend is running
if ! lsof -ti:4000 > /dev/null 2>&1; then
    echo "ERROR: Backend failed to start. Check /tmp/year-review-backend.log"
    exit 1
fi
echo "Backend started (PID: $BACKEND_PID)"

# Start frontend
echo ""
echo "Starting frontend on port 5175..."
cd "$FRONTEND_DIR"
NODE_ENV=development npx next dev -p 5175 > /tmp/year-review-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready (check for "Ready" in log)
echo "Waiting for frontend to compile..."
for i in {1..30}; do
    if grep -q "Ready" /tmp/year-review-frontend.log 2>/dev/null; then
        break
    fi
    sleep 1
done

# Verify frontend is running
if ! lsof -ti:5175 > /dev/null 2>&1; then
    echo "ERROR: Frontend failed to start. Check /tmp/year-review-frontend.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "=== Development Environment Ready ==="
echo ""
echo "Backend API:  http://localhost:4000"
echo "Frontend:     http://localhost:5175"
echo ""
echo "Admin Panel:  http://localhost:5175/2025-review/admin"
echo "Timeline:     http://localhost:5175/2025-review"
echo ""
echo "Logs:"
echo "  Backend:  /tmp/year-review-backend.log"
echo "  Frontend: /tmp/year-review-frontend.log"
echo ""

# Open browser if requested
if [ "$OPEN_BROWSER" = true ]; then
    echo "Opening admin panel in browser..."
    open "http://localhost:5175/2025-review/admin"
fi

echo "Press Ctrl+C to stop all servers"

# Keep script running and handle cleanup
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
