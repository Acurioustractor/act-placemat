#!/bin/bash

# ACT Perfect System Launch Sequence
# Orchestrates the complete platform startup with all services

set -e

echo "🚀 ACT Perfect System Launch Sequence Initiated"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    if lsof -Pi :$2 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓${NC} $1 is running on port $2"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not running on port $2"
        return 1
    fi
}

# Function to wait for a service
wait_for_service() {
    echo -e "${YELLOW}⏳${NC} Waiting for $1 to start on port $2..."
    while ! lsof -Pi :$2 -sTCP:LISTEN -t >/dev/null ; do
        sleep 1
    done
    echo -e "${GREEN}✓${NC} $1 is ready!"
}

# Step 1: Environment Check
echo -e "\n${BLUE}Step 1: Environment Check${NC}"
echo "================================"

# Check for required environment variables
if [ ! -f apps/backend/.env ]; then
    echo -e "${RED}✗${NC} Backend .env file not found!"
    echo "Please copy .env.example to .env and configure your API keys"
    exit 1
fi

if [ ! -f apps/frontend/.env ]; then
    echo -e "${YELLOW}⚠${NC} Frontend .env file not found, creating from template..."
    cat > apps/frontend/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF
    echo -e "${GREEN}✓${NC} Frontend .env created"
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗${NC} Node.js 18+ required (found $(node -v))"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js version check passed"

# Check npm packages
echo -e "${YELLOW}⏳${NC} Installing dependencies..."
npm install --silent 2>/dev/null || echo -e "${YELLOW}⚠${NC} Some packages may need updating"

# Step 2: Infrastructure Services
echo -e "\n${BLUE}Step 2: Starting Infrastructure Services${NC}"
echo "==========================================="

# Start Redis if not running
if ! check_service "Redis" 6379; then
    echo -e "${YELLOW}⏳${NC} Starting Redis..."
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
        wait_for_service "Redis" 6379
    else
        echo -e "${YELLOW}⚠${NC} Redis not installed, some features will be limited"
    fi
fi

# Check Supabase connection
echo -e "${YELLOW}⏳${NC} Testing Supabase connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('people').select('count').single()
  .then(() => console.log('✓ Supabase connection successful'))
  .catch(err => console.error('✗ Supabase connection failed:', err.message));
" 2>/dev/null || echo -e "${YELLOW}⚠${NC} Supabase connection check failed"

# Step 3: Backend Services
echo -e "\n${BLUE}Step 3: Starting Backend Services${NC}"
echo "======================================"

# Kill existing backend processes
echo -e "${YELLOW}⏳${NC} Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Start backend server
echo -e "${YELLOW}⏳${NC} Starting backend server..."
cd apps/backend
npm start > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

wait_for_service "Backend API" 4000

# Verify backend endpoints
echo -e "${YELLOW}⏳${NC} Verifying backend endpoints..."
curl -s http://localhost:4000/health > /dev/null 2>&1 && \
    echo -e "${GREEN}✓${NC} Backend health check passed" || \
    echo -e "${YELLOW}⚠${NC} Backend health endpoint not responding"

# Step 4: Frontend Application
echo -e "\n${BLUE}Step 4: Starting Frontend Application${NC}"
echo "========================================="

# Kill existing frontend processes
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start frontend dev server
echo -e "${YELLOW}⏳${NC} Starting frontend development server..."
cd apps/frontend
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

wait_for_service "Frontend" 5173

# Step 5: Sync Services
echo -e "\n${BLUE}Step 5: Initializing Sync Services${NC}"
echo "======================================="

# Trigger initial Notion sync
echo -e "${YELLOW}⏳${NC} Triggering initial Notion sync..."
curl -X POST http://localhost:4000/api/platform/sync \
    -H "Content-Type: application/json" \
    -d '{"full": true}' \
    -s > /dev/null 2>&1 && \
    echo -e "${GREEN}✓${NC} Notion sync initiated" || \
    echo -e "${YELLOW}⚠${NC} Notion sync trigger failed"

# Step 6: AI Services Check
echo -e "\n${BLUE}Step 6: Checking AI Services${NC}"
echo "================================="

# Check AI provider status
echo -e "${YELLOW}⏳${NC} Checking AI provider availability..."
curl -s http://localhost:4000/api/platform/status | \
    node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    const providers = data.services?.ai_providers || {};
    console.log('AI Providers Status:');
    Object.entries(providers).forEach(([name, status]) => {
        const icon = status.available ? '✓' : '✗';
        const color = status.available ? '\033[0;32m' : '\033[0;31m';
        console.log(\`  \${color}\${icon}\033[0m \${name}: \${status.available ? 'Available' : status.reason || 'Unavailable'}\`);
    });
    " 2>/dev/null || echo -e "${YELLOW}⚠${NC} Could not check AI provider status"

# Step 7: WebSocket Connection Test
echo -e "\n${BLUE}Step 7: Testing WebSocket Connection${NC}"
echo "========================================"

echo -e "${YELLOW}⏳${NC} Testing WebSocket connection..."
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:4000/live');
ws.on('open', () => {
    console.log('✓ WebSocket connection established');
    ws.close();
    process.exit(0);
});
ws.on('error', (err) => {
    console.error('✗ WebSocket connection failed:', err.message);
    process.exit(1);
});
setTimeout(() => {
    console.error('✗ WebSocket connection timeout');
    process.exit(1);
}, 5000);
" 2>/dev/null || echo -e "${YELLOW}⚠${NC} WebSocket connection test failed"

# Step 8: Generate Initial Insights
echo -e "\n${BLUE}Step 8: Generating Initial Insights${NC}"
echo "======================================="

echo -e "${YELLOW}⏳${NC} Generating AI insights..."
curl -s http://localhost:4000/api/platform/insights?timeRange=7d > /dev/null 2>&1 && \
    echo -e "${GREEN}✓${NC} Initial insights generated" || \
    echo -e "${YELLOW}⚠${NC} Insights generation failed"

# Step 9: System Status Report
echo -e "\n${BLUE}Step 9: System Status Report${NC}"
echo "================================"

# Get comprehensive status
STATUS=$(curl -s http://localhost:4000/api/platform/status 2>/dev/null || echo '{}')

echo -e "\n${GREEN}System Status Summary:${NC}"
echo "======================="
check_service "Frontend" 5173
check_service "Backend API" 4000
check_service "Redis Cache" 6379

# Display WebSocket connections
WS_COUNT=$(echo $STATUS | node -e "
try {
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(data.websocket_connections || 0);
} catch(e) { console.log(0); }
" 2>/dev/null)
echo -e "${BLUE}WebSocket Connections:${NC} $WS_COUNT"

# Step 10: Open Browser
echo -e "\n${BLUE}Step 10: Launching Application${NC}"
echo "==================================="

echo -e "${GREEN}✨ ACT Perfect System is Ready!${NC}"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:4000"
echo "📊 Living Brand Page: http://localhost:5173/living-brand"
echo "🧠 Business Intelligence: http://localhost:5173/intelligence"
echo "📡 WebSocket: ws://localhost:4000/live"
echo ""
echo "📝 Logs:"
echo "  - Backend: logs/backend.log"
echo "  - Frontend: logs/frontend.log"
echo ""
echo "🛑 To stop all services, run: ./stop.sh"
echo ""

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}Opening browser...${NC}"
    sleep 2
    open http://localhost:5173/living-brand
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:5173/living-brand
    fi
fi

# Keep script running and monitor services
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"
echo "===================================="

# Trap Ctrl+C and cleanup
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    lsof -ti:4000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓${NC} All services stopped"
    exit 0
}

trap cleanup INT

# Monitor services
while true; do
    sleep 30
    
    # Check if services are still running
    if ! check_service "Backend API" 4000 > /dev/null 2>&1; then
        echo -e "${RED}⚠ Backend crashed, restarting...${NC}"
        cd apps/backend && npm start > ../../logs/backend.log 2>&1 &
        BACKEND_PID=$!
        cd ../..
    fi
    
    if ! check_service "Frontend" 5173 > /dev/null 2>&1; then
        echo -e "${RED}⚠ Frontend crashed, restarting...${NC}"
        cd apps/frontend && npm run dev > ../../logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ../..
    fi
done