#!/bin/bash

# ===========================================
# ACT Placemat - Stop Year in Review Environment
# ===========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}Stopping Year in Review environment...${NC}"
echo ""

# Kill by PID files if they exist
if [ -f /tmp/year-review-backend.pid ]; then
    PID=$(cat /tmp/year-review-backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}✓ Backend stopped (PID: $PID)${NC}"
    fi
    rm -f /tmp/year-review-backend.pid
fi

if [ -f /tmp/year-review-frontend.pid ]; then
    PID=$(cat /tmp/year-review-frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}✓ Frontend stopped (PID: $PID)${NC}"
    fi
    rm -f /tmp/year-review-frontend.pid
fi

# Also check old pid files (from previous script)
if [ -f /tmp/act_backend.pid ]; then
    PID=$(cat /tmp/act_backend.pid)
    kill $PID 2>/dev/null && echo -e "${GREEN}✓ Old backend stopped${NC}" || true
    rm -f /tmp/act_backend.pid
fi

if [ -f /tmp/act_frontend.pid ]; then
    PID=$(cat /tmp/act_frontend.pid)
    kill $PID 2>/dev/null && echo -e "${GREEN}✓ Old frontend stopped${NC}" || true
    rm -f /tmp/act_frontend.pid
fi

# Clean up any orphaned processes on ports
lsof -ti:4000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Cleared port 4000${NC}" || true
lsof -ti:5175 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Cleared port 5175${NC}" || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true
lsof -ti:5176 | xargs kill -9 2>/dev/null || true

# Kill any vite/next processes
pkill -f "vite" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Year in Review environment stopped${NC}"
echo ""
