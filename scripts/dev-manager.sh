#!/bin/bash

# ACT Placemat Development Manager - Bulletproof Process Control
# Ensures clean, single-instance development environment

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"
PID_DIR="$PROJECT_ROOT/.pids"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create PID directory if it doesn't exist
mkdir -p "$PID_DIR"

function print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

function print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function cleanup_processes() {
    print_status "🧹 Cleaning up all existing processes..."

    # Kill processes on all dev ports
    local ports=(3000 3001 4000 4001 5173 5174 5175 8080)
    for port in "${ports[@]}"; do
        if lsof -ti:$port > /dev/null 2>&1; then
            print_warning "Killing processes on port $port"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done

    # Kill all npm/node processes related to ACT Placemat
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "node.*ACT.*Placemat" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx.*server" 2>/dev/null || true

    # Clean up PID files
    rm -f "$PID_DIR"/*.pid

    # Clear Vite cache
    rm -rf "$FRONTEND_DIR/node_modules/.vite" 2>/dev/null || true

    sleep 2
    print_success "All processes cleaned up"
}

function check_dependencies() {
    print_status "📦 Checking dependencies..."

    # Check if node_modules exist
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        print_warning "Backend dependencies missing. Installing..."
        cd "$BACKEND_DIR" && npm install --legacy-peer-deps
    fi

    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        print_warning "Frontend dependencies missing. Installing..."
        cd "$FRONTEND_DIR" && npm install --legacy-peer-deps
    fi

    print_success "Dependencies verified"
}

function start_backend() {
    print_status "🚀 Starting backend server..."

    cd "$BACKEND_DIR"

    # Start backend and save PID
    PORT=4000 npm run dev > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/backend.pid"

    # Wait for backend to be ready
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:4000/health > /dev/null 2>&1; then
            print_success "Backend running on http://localhost:4000 (PID: $pid)"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    print_error "Backend failed to start"
    return 1
}

function start_frontend() {
    print_status "🎨 Starting frontend server..."

    cd "$FRONTEND_DIR"

    # Start frontend and save PID
    npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/frontend.pid"

    # Wait for frontend to be ready
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:5175 > /dev/null 2>&1; then
            print_success "Frontend running on http://localhost:5175 (PID: $pid)"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    print_error "Frontend failed to start"
    return 1
}

function check_status() {
    print_status "🔍 Checking service status..."

    # Check backend
    if [ -f "$PID_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$PID_DIR/backend.pid")
        if ps -p $backend_pid > /dev/null 2>&1; then
            print_success "Backend is running (PID: $backend_pid)"
        else
            print_warning "Backend PID file exists but process is not running"
        fi
    else
        print_warning "Backend is not running"
    fi

    # Check frontend
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$PID_DIR/frontend.pid")
        if ps -p $frontend_pid > /dev/null 2>&1; then
            print_success "Frontend is running (PID: $frontend_pid)"
        else
            print_warning "Frontend PID file exists but process is not running"
        fi
    else
        print_warning "Frontend is not running"
    fi

    # Check ports
    echo ""
    print_status "Port usage:"
    lsof -i :4000,5175 2>/dev/null | grep LISTEN || echo "  No services listening on expected ports"
}

function stop_services() {
    print_status "⏹️  Stopping services..."

    # Stop backend
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || true
            print_success "Backend stopped"
        fi
        rm -f "$PID_DIR/backend.pid"
    fi

    # Stop frontend
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || true
            print_success "Frontend stopped"
        fi
        rm -f "$PID_DIR/frontend.pid"
    fi

    cleanup_processes
}

function show_logs() {
    local service=$1

    if [ "$service" = "backend" ]; then
        tail -f "$PROJECT_ROOT/logs/backend.log"
    elif [ "$service" = "frontend" ]; then
        tail -f "$PROJECT_ROOT/logs/frontend.log"
    else
        print_error "Unknown service: $service"
        echo "Usage: $0 logs [backend|frontend]"
    fi
}

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Main command handler
case "$1" in
    start)
        cleanup_processes
        check_dependencies
        start_backend
        start_frontend
        echo ""
        print_success "🎉 Development environment is ready!"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  Backend:  ${BLUE}http://localhost:4000${NC}"
        echo -e "  Frontend: ${BLUE}http://localhost:5175${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        cleanup_processes
        check_dependencies
        start_backend
        start_frontend
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs "$2"
        ;;
    clean)
        cleanup_processes
        ;;
    *)
        echo "ACT Placemat Development Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|clean}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services with clean environment"
        echo "  stop     - Stop all services gracefully"
        echo "  restart  - Restart all services"
        echo "  status   - Check service status"
        echo "  logs     - Show service logs (backend|frontend)"
        echo "  clean    - Clean up all processes"
        exit 1
        ;;
esac