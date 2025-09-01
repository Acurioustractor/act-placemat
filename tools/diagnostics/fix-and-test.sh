#!/bin/bash

# ACT Placemat - Dependency Fix and Test Script
# This will properly install all dependencies and test the app

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}   ACT Placemat Fix & Test        ${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Step 1: Kill any existing processes
echo -e "${YELLOW}Step 1: Cleaning up existing processes...${NC}"
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
lsof -ti :4000 | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✓ Processes cleaned${NC}"

# Step 2: Install root dependencies
echo -e "${YELLOW}Step 2: Installing root dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Root dependencies installed${NC}"

# Step 3: Fix frontend dependencies
echo -e "${YELLOW}Step 3: Fixing frontend dependencies...${NC}"
cd apps/frontend

# Remove old modules and lock file to ensure clean install
if [ -d "node_modules" ]; then
    echo "Removing old node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "Removing old package-lock.json..."
    rm -f package-lock.json
fi

# Fresh install
echo "Installing fresh dependencies..."
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Verify critical dependencies
echo -e "${YELLOW}Step 4: Verifying critical dependencies...${NC}"
if [ -d "node_modules/@tanstack/react-query" ]; then
    echo -e "${GREEN}✓ @tanstack/react-query found${NC}"
else
    echo -e "${RED}✗ @tanstack/react-query MISSING - installing specifically${NC}"
    npm install @tanstack/react-query
fi

if [ -d "node_modules/react-router-dom" ]; then
    echo -e "${GREEN}✓ react-router-dom found${NC}"
else
    echo -e "${RED}✗ react-router-dom MISSING - installing specifically${NC}"
    npm install react-router-dom
fi

cd ../..

# Step 5: Install backend dependencies
echo -e "${YELLOW}Step 5: Installing backend dependencies...${NC}"
cd apps/backend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ../..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Step 6: Create logs directory
mkdir -p logs

# Step 7: Start services
echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Starting services...${NC}"
echo -e "${GREEN}==================================${NC}"

# Start backend
echo -e "${YELLOW}Starting backend...${NC}"
cd apps/backend
npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend
sleep 3
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running on port 4000${NC}"
else
    echo -e "${YELLOW}⚠ Backend may not be ready yet${NC}"
fi

# Start frontend
echo -e "${YELLOW}Starting frontend...${NC}"
cd apps/frontend
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

# Step 8: Test URLs
echo ""
echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Testing Access Points${NC}"
echo -e "${BLUE}==================================${NC}"

# Test main app
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Main App: http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Main App not responding${NC}"
fi

# Test static HTML
if curl -s http://localhost:5173/test.html > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Test Page: http://localhost:5173/test.html${NC}"
else
    echo -e "${YELLOW}⚠ Test page may not be accessible${NC}"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${BLUE}Try these URLs in order:${NC}"
echo ""
echo -e "${YELLOW}1. Basic HTML Test:${NC}"
echo "   http://localhost:5173/test.html"
echo "   (Should show colorful test page)"
echo ""
echo -e "${YELLOW}2. Main Application:${NC}"
echo "   http://localhost:5173"
echo "   (Should show launcher or recovery mode)"
echo ""
echo -e "${YELLOW}3. Backend Health:${NC}"
echo "   http://localhost:4000/health"
echo ""
echo -e "${YELLOW}Logs available at:${NC}"
echo "  tail -f logs/frontend.log"
echo "  tail -f logs/backend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*server" 2>/dev/null || true
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Keep running and show logs
tail -f logs/frontend.log logs/backend.log