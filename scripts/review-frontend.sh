#!/bin/bash

# ===========================================
# ACT Placemat - Year in Review Frontend Review
# ===========================================
# A reliable, seamless way to launch the Year in Review
# environment (webflow-portfolio) for reviewing frontend changes.
#
# Usage: ./scripts/review-frontend.sh
# ===========================================

set -e

PROJECT_ROOT="/Users/benknight/Code/ACT Placemat"
BACKEND_PORT=4000
FRONTEND_PORT=5175
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
ADMIN_URL="http://localhost:$FRONTEND_PORT/2025-review/admin"
TIMELINE_URL="http://localhost:$FRONTEND_PORT/2025-review"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd "$PROJECT_ROOT"

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Year in Review - Frontend Review        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Clean up any existing processes
echo -e "${YELLOW}[1/6]${NC} Cleaning up existing processes..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true
lsof -ti:5176 | xargs kill -9 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1
echo -e "${GREEN}   ✓ Ports cleared${NC}"

# Step 2: Clear Next.js cache
echo -e "${YELLOW}[2/6]${NC} Clearing Next.js cache..."
rm -rf "$PROJECT_ROOT/apps/webflow-portfolio/.next"
echo -e "${GREEN}   ✓ Cache cleared${NC}"

# Step 3: Start Backend
echo -e "${YELLOW}[3/6]${NC} Starting backend on port $BACKEND_PORT..."
cd "$PROJECT_ROOT/apps/backend"
node server.js > /tmp/year-review-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/year-review-backend.pid
cd "$PROJECT_ROOT"

# Wait for backend to be healthy
echo -e "       Waiting for backend health check..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Backend is healthy (PID: $BACKEND_PID)${NC}"
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
    echo -ne "\r       Waiting... ${WAITED}s"
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}   ✗ Backend failed to start. Check logs: tail -f /tmp/year-review-backend.log${NC}"
    exit 1
fi

# Step 4: Start Frontend (Next.js)
echo -e "${YELLOW}[4/6]${NC} Starting Year in Review frontend on port $FRONTEND_PORT..."
cd "$PROJECT_ROOT/apps/webflow-portfolio"
NODE_ENV=development npx next dev -p $FRONTEND_PORT > /tmp/year-review-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/year-review-frontend.pid
cd "$PROJECT_ROOT"

# Wait for frontend to be ready (Next.js shows "Ready" when compiled)
echo -e "       Waiting for Next.js to compile..."
MAX_WAIT=90
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if grep -q "Ready" /tmp/year-review-frontend.log 2>/dev/null; then
        echo -e "${GREEN}   ✓ Frontend is ready (PID: $FRONTEND_PID)${NC}"
        break
    fi
    # Also check if port is responding
    if [ $WAITED -gt 10 ] && curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Frontend is ready (PID: $FRONTEND_PID)${NC}"
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
    echo -ne "\r       Compiling... ${WAITED}s"
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}   ✗ Frontend failed to start. Check logs: tail -f /tmp/year-review-frontend.log${NC}"
    exit 1
fi

# Step 5: Verify everything is running
echo -e "${YELLOW}[5/6]${NC} Verifying services..."
sleep 2

BACKEND_OK=false
FRONTEND_OK=false

if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    BACKEND_OK=true
    echo -e "${GREEN}   ✓ Backend API responding${NC}"
else
    echo -e "${RED}   ✗ Backend not responding${NC}"
fi

if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    FRONTEND_OK=true
    echo -e "${GREEN}   ✓ Frontend responding${NC}"
else
    echo -e "${RED}   ✗ Frontend not responding${NC}"
fi

# Step 6: Open browser
echo -e "${YELLOW}[6/6]${NC} Opening browser..."
if [ "$FRONTEND_OK" = true ]; then
    open "$ADMIN_URL"
    echo -e "${GREEN}   ✓ Browser opened to Admin Panel${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}✅ READY FOR REVIEW${NC}"
else
    echo -e "${YELLOW}⚠️  PARTIAL START - Check logs${NC}"
fi
echo ""
echo -e "   ${BLUE}Year in Review:${NC}"
echo -e "     Admin Panel: ${GREEN}$ADMIN_URL${NC}"
echo -e "     Timeline:    ${GREEN}$TIMELINE_URL${NC}"
echo ""
echo -e "   ${BLUE}Backend API:${NC}  ${GREEN}$BACKEND_URL${NC}"
echo ""
echo -e "   ${BLUE}Logs:${NC}"
echo -e "     Backend:  tail -f /tmp/year-review-backend.log"
echo -e "     Frontend: tail -f /tmp/year-review-frontend.log"
echo ""
echo -e "   ${BLUE}To stop:${NC}"
echo -e "     ./scripts/stop-review.sh"
echo -e "     or: npm run review:stop"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
