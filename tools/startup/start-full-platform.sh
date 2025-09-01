#!/bin/bash
# ACT Ecosystem - Full Platform Startup (Backend + React Frontend)
# Starts the complete integrated system with rich UI

set -e  # Exit on any error

echo "🚀 Starting Complete ACT Ecosystem Platform"
echo "============================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if ports are available
port_available() {
    ! lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null
}

# Clean up any existing processes
print_info "Cleaning up existing processes..."
pkill -f "ecosystem-server.js" 2>/dev/null || true
pkill -f "vite.*--port.*3000" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
print_status "Cleanup complete"

# Start the bulletproof backend first
print_info "Starting bulletproof backend ecosystem..."
./start-ecosystem-bulletproof.sh &
backend_pid=$!

# Wait for backend to be ready
print_info "Waiting for backend to initialize..."
sleep 8

# Check if backend is running
if ! curl -s http://localhost:4000/health >/dev/null 2>&1; then
    print_warning "Backend not responding yet, continuing with frontend startup..."
fi

# Install frontend dependencies if needed
if [ ! -d "apps/frontend/node_modules" ]; then
    print_info "Installing frontend dependencies..."
    cd apps/frontend
    npm install
    cd ../..
    print_status "Frontend dependencies installed"
fi

# Start React frontend
print_info "Starting React frontend with full ACT Placemat platform..."

cd apps/frontend

# Create a development script that ensures proper API connection
cat > start-dev-integrated.js << 'EOF'
#!/usr/bin/env node
/**
 * Development server with integrated backend APIs
 */

const { spawn } = require('child_process');

console.log('🚀 Starting React frontend with integrated backend connection...');

// Start Vite dev server
const vite = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_BASE_URL: 'http://localhost:4000',
    VITE_BACKEND_URL: 'http://localhost:4000',
    VITE_ECOSYSTEM_MODE: 'integrated'
  }
});

vite.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down frontend...');
  vite.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down frontend...');
  vite.kill();
  process.exit(0);
});
EOF

node start-dev-integrated.js &
frontend_pid=$!

cd ../..

# Wait a moment for services to start
sleep 5

echo ""
echo "============================================"
print_status "ACT Ecosystem Platform is now running!"
echo "============================================"
echo ""

print_info "Access Points:"
echo "   🌐 Full Platform (React):  http://localhost:3000"
echo "   🤖 Backend APIs:           http://localhost:4000"
echo "   📊 Command Center:         http://localhost:4000/command-center"
echo "   🏥 Health Check:           http://localhost:4000/health"
echo ""

print_info "What You Get:"
echo "   ✅ Complete ACT Placemat React frontend"
echo "   ✅ Bulletproof backend with ecosystem APIs"
echo "   ✅ Integrated Farmhand Intelligence + Bot Platform"
echo "   ✅ All your rich dashboard components"
echo "   ✅ Project management, people, opportunities"
echo "   ✅ Analytics, charts, and ecosystem visualization"
echo "   ✅ Bot command center with workflow execution"
echo "   ✅ Learning system with continuous improvement"
echo ""

print_info "Frontend Features Available:"
echo "   🎯 Dashboard with real-time metrics"
echo "   👥 People management (142+ connections)"
echo "   📋 Project showcase and tracking"
echo "   💰 Grant opportunities pipeline"
echo "   🤝 Partnership management"
echo "   📊 Analytics and business intelligence"
echo "   🌐 Interactive Australia map"
echo "   📝 Story collection and consent management"
echo "   🔄 Workflow automation and monitoring"
echo "   🧠 AI-powered decision support"
echo ""

print_info "Testing Workflows:"
echo "   1. Visit http://localhost:3000 for the full platform"
echo "   2. Navigate to different sections to see all components"
echo "   3. Test API integrations with mock or real data"
echo "   4. Execute workflows from the Bot Command Center"
echo "   5. Monitor learning system improvements"
echo ""

# Save process IDs for easy stopping
echo "$backend_pid" > .backend.pid
echo "$frontend_pid" > .frontend.pid

print_info "To stop the platform:"
echo "   ./stop-full-platform.sh"
echo "   Or: kill \$(cat .backend.pid .frontend.pid)"
echo ""

print_status "🌾🤖 Complete ACT Ecosystem Platform ready!"
echo "Visit http://localhost:3000 to experience the full system"

# Keep script running to monitor processes
trap 'echo -e "\n${YELLOW}⚠️  Shutting down platform...${NC}"; kill $backend_pid $frontend_pid 2>/dev/null; exit 0' INT TERM

while kill -0 $backend_pid 2>/dev/null && kill -0 $frontend_pid 2>/dev/null; do
    sleep 5
done

print_warning "One or both services have stopped"