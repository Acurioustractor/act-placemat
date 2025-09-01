#!/bin/bash

# Simple local test runner for ACT Placemat
# This gives you a clean way to test locally

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}     ACT Placemat Local Test      ${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
echo -e "${GREEN}✓ Node.js version: v${NODE_VERSION}${NC}"

# Clean up any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
lsof -ti :4000 | xargs kill -9 2>/dev/null || true
sleep 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing root dependencies...${NC}"
    npm install
fi

if [ ! -d "apps/frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd apps/frontend && npm install && cd ../..
fi

if [ ! -d "apps/backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd apps/backend && npm install && cd ../..
fi

# Create log directory
mkdir -p logs

echo ""
echo -e "${GREEN}Starting servers...${NC}"
echo -e "${BLUE}Frontend will be at: http://localhost:5173${NC}"
echo -e "${BLUE}Backend will be at: http://localhost:4000${NC}"
echo ""

# Start backend
echo -e "${YELLOW}Starting backend...${NC}"
cd apps/backend
npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    sleep 1
done

# Start frontend
echo -e "${YELLOW}Starting frontend...${NC}"
cd apps/frontend
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to be ready...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}    Services are running!         ${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${BLUE}Frontend: http://localhost:5173${NC}"
echo -e "${BLUE}Backend:  http://localhost:4000/health${NC}"
echo ""
echo -e "${YELLOW}Logs are available at:${NC}"
echo "  - logs/frontend.log"
echo "  - logs/backend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*server.js" 2>/dev/null || true
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM

# Keep script running and show logs
tail -f logs/backend.log logs/frontend.log