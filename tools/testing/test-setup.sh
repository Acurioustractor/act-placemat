#!/bin/bash

# ACT Placemat - Setup Verification Test
# This script tests if the bulletproof development setup is working correctly

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_TOTAL=0

print_header() {
    echo -e "${BLUE}"
    echo "🧪 ACT Placemat - Setup Verification Test"
    echo "========================================="
    echo -e "${NC}"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="${3:-0}"  # Default to expecting success (0)
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ $expected_result -eq 0 ]; then
            echo -e "${GREEN}✅ PASS: $test_name${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: $test_name (expected failure but got success)${NC}"
        fi
    else
        if [ $expected_result -ne 0 ]; then
            echo -e "${GREEN}✅ PASS: $test_name (expected failure)${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ FAIL: $test_name${NC}"
        fi
    fi
}

test_prerequisites() {
    echo -e "${BLUE}📋 Testing Prerequisites${NC}"
    
    run_test "Node.js installed" "command -v node"
    run_test "npm installed" "command -v npm"
    run_test "Node.js version >= 18" "node -v | grep -E 'v(1[8-9]|[2-9][0-9])'"
    run_test "curl installed" "command -v curl"
    run_test "lsof installed" "command -v lsof"
    
    # Optional but recommended
    if command -v docker > /dev/null 2>&1; then
        run_test "Docker installed" "command -v docker"
        run_test "Docker Compose installed" "command -v docker-compose"
    else
        echo -e "${YELLOW}⚠️  Docker not found (optional)${NC}"
    fi
    
    echo ""
}

test_project_structure() {
    echo -e "${BLUE}📁 Testing Project Structure${NC}"
    
    run_test "Root package.json exists" "test -f package.json"
    run_test "Frontend directory exists" "test -d apps/frontend"
    run_test "Backend directory exists" "test -d apps/backend"
    run_test "Frontend package.json exists" "test -f apps/frontend/package.json"
    run_test "Backend package.json exists" "test -f apps/backend/package.json"
    run_test "Development scripts exist" "test -f dev.sh"
    run_test "Stop script exists" "test -f stop.sh"
    run_test "Scripts are executable" "test -x dev.sh && test -x stop.sh"
    
    echo ""
}

test_configuration_files() {
    echo -e "${BLUE}⚙️  Testing Configuration Files${NC}"
    
    run_test "Docker Compose config exists" "test -f docker-compose.dev.yml"
    run_test "PM2 config exists" "test -f ecosystem.config.js"
    run_test "Nginx config exists" "test -f docker/nginx.dev.conf"
    run_test "Vite config exists" "test -f apps/frontend/vite.config.ts"
    
    echo ""
}

test_dependencies() {
    echo -e "${BLUE}📦 Testing Dependencies${NC}"
    
    # Check if node_modules exist
    run_test "Root dependencies installed" "test -d node_modules"
    run_test "Frontend dependencies installed" "test -d apps/frontend/node_modules"
    run_test "Backend dependencies installed" "test -d apps/backend/node_modules"
    
    # Test if we can import key modules
    run_test "Frontend can resolve React" "cd apps/frontend && node -e 'require.resolve(\"react\")'"
    run_test "Backend can resolve Express" "cd apps/backend && node -e 'import(\"express\").then(() => process.exit(0)).catch(() => process.exit(1))'"
    
    echo ""
}

test_port_availability() {
    echo -e "${BLUE}🔌 Testing Port Availability${NC}"
    
    for port in 3000 4000 5173 5174; do
        if lsof -i :$port > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Port $port is in use${NC}"
        else
            echo -e "${GREEN}✅ Port $port is available${NC}"
        fi
    done
    
    echo ""
}

test_scripts() {
    echo -e "${BLUE}📜 Testing Scripts${NC}"
    
    # Test that scripts can be parsed (syntax check)
    run_test "dev.sh syntax check" "bash -n dev.sh"
    run_test "stop.sh syntax check" "bash -n stop.sh"
    
    # Test npm scripts exist
    run_test "npm dev:auto script exists" "npm run dev:auto --dry-run"
    run_test "npm stop script exists" "npm run stop --dry-run"
    run_test "npm health script exists" "npm run health --dry-run"
    
    echo ""
}

run_quick_service_test() {
    echo -e "${BLUE}🚀 Running Quick Service Test${NC}"
    echo -e "${YELLOW}This will start services briefly to test they work...${NC}"
    
    # Clean up first
    ./stop.sh > /dev/null 2>&1
    
    # Start in simple mode (fastest)
    echo "Starting services in simple mode..."
    ./dev.sh simple > /dev/null 2>&1 &
    DEV_PID=$!
    
    # Wait for services to start
    sleep 15
    
    # Test if services are responding
    local backend_healthy=false
    local frontend_healthy=false
    
    if curl -s -f http://localhost:4000/health > /dev/null 2>&1; then
        backend_healthy=true
        echo -e "${GREEN}✅ Backend is responding${NC}"
    else
        echo -e "${RED}❌ Backend not responding${NC}"
    fi
    
    if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
        frontend_healthy=true
        echo -e "${GREEN}✅ Frontend is responding${NC}"
    else
        echo -e "${RED}❌ Frontend not responding${NC}"
    fi
    
    # Clean up
    ./stop.sh > /dev/null 2>&1
    
    if [ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ]; then
        echo -e "${GREEN}🎉 Quick service test PASSED${NC}"
        return 0
    else
        echo -e "${RED}💥 Quick service test FAILED${NC}"
        return 1
    fi
}

show_results() {
    echo -e "${BLUE}"
    echo "📊 Test Results"
    echo "==============="
    echo -e "${NC}"
    
    if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED ($TESTS_PASSED/$TESTS_TOTAL)${NC}"
        echo ""
        echo -e "${GREEN}✅ Your development environment is ready!${NC}"
        echo ""
        echo -e "${BLUE}🚀 Quick start commands:${NC}"
        echo "   ./dev.sh auto     # Start with best available mode"
        echo "   ./dev.sh docker   # Start with Docker (most reliable)"
        echo "   ./stop.sh         # Stop all services"
        echo ""
    else
        echo -e "${RED}❌ Some tests failed ($TESTS_PASSED/$TESTS_TOTAL passed)${NC}"
        echo ""
        echo -e "${YELLOW}🔍 Common fixes:${NC}"
        echo "   npm run setup     # Install dependencies"
        echo "   npm install -g pm2  # Install PM2 globally"
        echo "   ./stop.sh         # Clean up any running services"
        echo ""
        return 1
    fi
}

# Main execution
print_header

test_prerequisites
test_project_structure
test_configuration_files
test_dependencies
test_port_availability
test_scripts

# Ask user if they want to run the service test
echo -e "${YELLOW}🤔 Run quick service test? This will start and stop services briefly. (y/N)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    run_quick_service_test
fi

show_results