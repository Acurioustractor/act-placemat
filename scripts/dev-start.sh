#!/bin/bash

# ACT Universal AI Platform - Development Startup Script
# Handles dependency conflicts and starts all services in correct order

set -e

echo "🚀 Starting ACT Universal AI Platform Development Environment"
echo "🇦🇺 Australian Business Development Command Center"
echo ""

# Set Australian timezone
export TZ=Australia/Sydney

# Create necessary directories
mkdir -p logs
mkdir -p temp
mkdir -p uploads

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up environment...${NC}"

# Copy environment files if they don't exist
if [ ! -f .env ]; then
    if [ -f .env.docker ]; then
        cp .env.docker .env
        echo -e "${GREEN}✓ Copied .env.docker to .env${NC}"
    else
        echo -e "${YELLOW}⚠ No .env file found. Creating basic configuration...${NC}"
        cat > .env << EOF
# ACT Development Environment
NODE_ENV=development
TZ=Australia/Sydney
LOCALE=en-AU
CURRENCY=AUD

# Service URLs
INTELLIGENCE_HUB_URL=http://localhost:3002
AI_WORKHOUSE_URL=http://localhost:3003
VALUES_COMPLIANCE_URL=http://localhost:3001

# Security (Development Only)
JWT_SECRET=dev-jwt-secret-2024
ENCRYPTION_KEY=dev-encryption-key-2024

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:4000
EOF
        echo -e "${GREEN}✓ Created basic .env configuration${NC}"
    fi
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to start service with dependency isolation
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    
    echo -e "${BLUE}Starting $service_name (port $port)...${NC}"
    
    if ! check_port $port; then
        echo -e "${YELLOW}Skipping $service_name - port $port already in use${NC}"
        return
    fi
    
    cd "$service_path"
    
    # Install dependencies with conflict resolution if package.json exists
    if [ -f package.json ]; then
        echo -e "${YELLOW}Installing dependencies for $service_name...${NC}"
        npm install --legacy-peer-deps --silent 2>/dev/null || {
            echo -e "${YELLOW}NPM install failed, trying with different approach...${NC}"
            # Create isolated node_modules for this service
            rm -rf node_modules 2>/dev/null || true
            npm install --no-save --legacy-peer-deps 2>/dev/null || true
        }
    fi
    
    # Start service in background
    if [ -f src/server.js ]; then
        echo -e "${GREEN}✓ Starting $service_name with Node.js${NC}"
        PORT=$port node src/server.js > "../logs/${service_name}.log" 2>&1 &
        echo $! > "../.${service_name}.pid"
    elif [ -f src/main.ts ]; then
        echo -e "${GREEN}✓ Starting $service_name with TypeScript${NC}"
        PORT=$port npx ts-node src/main.ts > "../logs/${service_name}.log" 2>&1 &
        echo $! > "../.${service_name}.pid"
    elif [ -f main.js ]; then
        echo -e "${GREEN}✓ Starting $service_name with main.js${NC}"
        PORT=$port node main.js > "../logs/${service_name}.log" 2>&1 &
        echo $! > "../.${service_name}.pid"
    else
        echo -e "${RED}✗ No entry point found for $service_name${NC}"
    fi
    
    cd - >/dev/null
    sleep 2
}

# Function to start mock service if real service can't start
start_mock_service() {
    local service_name=$1
    local port=$2
    
    echo -e "${YELLOW}Starting mock $service_name (port $port)...${NC}"
    
    if ! check_port $port; then
        echo -e "${YELLOW}Skipping mock $service_name - port $port already in use${NC}"
        return
    fi
    
    # Create simple mock service
    cat > "mock-${service_name}.js" << EOF
const express = require('express');
const app = express();
const port = ${port};

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: '${service_name}',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        timezone: 'Australia/Sydney'
    });
});

app.get('/api/*', (req, res) => {
    res.json({
        message: 'Mock ${service_name} response',
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/*', (req, res) => {
    res.json({
        success: true,
        message: 'Mock ${service_name} processed request',
        endpoint: req.originalUrl,
        body: req.body,
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(\`Mock ${service_name} running on port \${port}\`);
});
EOF
    
    node "mock-${service_name}.js" > "logs/mock-${service_name}.log" 2>&1 &
    echo $! > ".mock-${service_name}.pid"
    
    echo -e "${GREEN}✓ Mock $service_name started on port $port${NC}"
}

echo -e "${BLUE}Phase 1: Starting AI Services...${NC}"

# Start Intelligence Hub
if [ -d "apps/intelligence-hub" ]; then
    start_service "intelligence-hub" "apps/intelligence-hub" 3002
else
    start_mock_service "intelligence-hub" 3002
fi

# Start AI Workhouse  
if [ -d "apps/ai-workhouse" ]; then
    start_service "ai-workhouse" "apps/ai-workhouse" 3003
else
    start_mock_service "ai-workhouse" 3003
fi

# Start Values Compliance
if [ -d "apps/backend" ]; then
    start_service "values-compliance" "apps/backend" 3001
else
    start_mock_service "values-compliance" 3001
fi

echo -e "${BLUE}Phase 2: Starting API Gateway...${NC}"

# Start API Gateway
if [ -d "apps/api-gateway" ]; then
    start_service "api-gateway" "apps/api-gateway" 3000
else
    echo -e "${RED}✗ API Gateway not found${NC}"
fi

echo -e "${BLUE}Phase 3: Starting Frontend...${NC}"

# Start main frontend if it exists
if [ -d "apps/placemat" ]; then
    start_service "placemat-frontend" "apps/placemat" 5173
elif [ -d "static" ]; then
    echo -e "${YELLOW}Starting static file server...${NC}"
    npx serve -s static -l 5173 > logs/static-server.log 2>&1 &
    echo $! > .static-server.pid
    echo -e "${GREEN}✓ Static server started on port 5173${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ACT Universal AI Platform is starting up!${NC}"
echo ""
echo -e "${BLUE}Services Status:${NC}"
echo "🤖 Intelligence Hub (LangGraph):    http://localhost:3002/health"
echo "💰 AI Workhouse (Financial):       http://localhost:3003/api/health"  
echo "⚖️ Values Compliance:               http://localhost:3001/health"
echo "🚪 API Gateway:                     http://localhost:3000/health"
echo "🌐 Frontend:                        http://localhost:5173"
echo ""
echo -e "${BLUE}Business Development Dashboard:${NC}"
echo "📊 Dashboard:                       http://localhost:3000/api/dashboard"
echo "🧾 Receipt Upload:                  http://localhost:3000/api/receipts/upload"
echo "📈 Project Intelligence:            http://localhost:3000/api/projects/intelligence"
echo "💚 Community Control:               http://localhost:3000/api/community/control"
echo ""
echo -e "${YELLOW}Demo Authentication:${NC}"
echo "curl -X POST http://localhost:3000/api/auth/demo"
echo ""
echo -e "${BLUE}Logs Directory:${NC} ./logs/"
echo "📝 View all logs: tail -f logs/*.log"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"

# Wait for Ctrl+C
trap 'echo -e "\n${YELLOW}Stopping all services...${NC}"; kill $(cat .*.pid 2>/dev/null) 2>/dev/null; rm -f .*.pid mock-*.js; echo -e "${GREEN}All services stopped${NC}"; exit' INT

# Keep script running and show service status
while true do
    sleep 30
    echo -e "${BLUE}$(date): Services running...${NC}"
done