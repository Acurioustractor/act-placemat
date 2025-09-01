#!/bin/bash

# ACT Placemat - Bulletproof Development Server
# Eliminates all localhost connection issues permanently

set -euo pipefail

PROJECT_NAME="act-placemat"
FRONTEND_PORT=5173
BACKEND_PORT=4000
PROXY_PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

# Kill any existing processes on our ports
cleanup_ports() {
    log "🧹 Cleaning up existing processes..."
    
    for port in $FRONTEND_PORT $BACKEND_PORT $PROXY_PORT 8080; do
        if lsof -i :$port > /dev/null 2>&1; then
            log "Killing process on port $port"
            lsof -ti :$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Kill any docker containers
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Kill any background processes
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    sleep 2
}

# Check if Docker is available and working
check_docker() {
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if PM2 is available
check_pm2() {
    if command -v pm2 &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Docker mode - most reliable
start_docker_mode() {
    log "🐳 Starting Docker development environment..."
    
    if ! check_docker; then
        error "Docker is not available or not running"
        return 1
    fi
    
    # Build and start containers
    docker-compose -f docker-compose.dev.yml up --build -d
    
    # Wait for services to be healthy
    log "⏳ Waiting for services to start..."
    sleep 10
    
    # Check health
    for i in {1..30}; do
        if curl -s http://localhost:$PROXY_PORT/health > /dev/null; then
            log "✅ All services are healthy!"
            log "🌐 Access your app at: http://localhost:$PROXY_PORT"
            log "📊 Daily Habits: http://localhost:$PROXY_PORT/daily-habits"
            log "🏠 Real Dashboard: http://localhost:$PROXY_PORT/real-dashboard"
            return 0
        fi
        sleep 2
    done
    
    error "Services failed to start properly"
    docker-compose -f docker-compose.dev.yml logs
    return 1
}

# PM2 mode - production-like process management
start_pm2_mode() {
    log "⚡ Starting PM2 development environment..."
    
    if ! check_pm2; then
        log "Installing PM2..."
        npm install -g pm2
    fi
    
    # Start backend
    cd apps/backend
    pm2 start --name "${PROJECT_NAME}-backend" npm -- run dev
    # Nightly finance cron at 02:15 local time
    pm2 start --name "${PROJECT_NAME}-finance-nightly" --cron "15 2 * * *" node -- src/workers/financeNightly.js
    # Weekly finance digest at 07:15 every Monday (requires SENDGRID env)
    pm2 start --name "${PROJECT_NAME}-finance-weekly-digest" --cron "15 7 * * 1" curl -- -s -X POST http://localhost:${BACKEND_PORT}/api/bookkeeping/digest/send
    cd ../..
    
    # Start frontend  
    cd apps/frontend
    pm2 start --name "${PROJECT_NAME}-frontend" npm -- run dev
    cd ../..
    
    # Wait for services
    log "⏳ Waiting for services to start..."
    sleep 5
    
    # Check health
    for i in {1..20}; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
            log "✅ Backend is healthy!"
            break
        fi
        sleep 2
    done
    
    for i in {1..20}; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
            log "✅ Frontend is healthy!"
            log "🌐 Access your app at: http://localhost:$FRONTEND_PORT"
            log "📊 Daily Habits: http://localhost:$FRONTEND_PORT/daily-habits"
            return 0
        fi
        sleep 2
    done
    
    error "Services failed to start"
    pm2 logs
    return 1
}

# Simple mode - background processes
start_simple_mode() {
    log "🚀 Starting simple development environment..."
    
    # Start backend in background
    cd apps/backend
    npm run dev > ../../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ../..
    
    # Start frontend in background
    cd apps/frontend  
    npm run dev > ../../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    
    # Store PIDs
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
    
    # Wait for services
    log "⏳ Waiting for services to start..."
    sleep 8
    
    # Check health
    for i in {1..20}; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
            log "✅ Backend is healthy!"
            break
        fi
        sleep 2
    done
    
    for i in {1..20}; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
            log "✅ Frontend is healthy!"
            log "🌐 Access your app at: http://localhost:$FRONTEND_PORT"
            log "📊 Daily Habits: http://localhost:$FRONTEND_PORT/daily-habits"
            
            # Open browser
            if command -v open &> /dev/null; then
                open http://localhost:$FRONTEND_PORT/daily-habits
            fi
            
            return 0
        fi
        sleep 2
    done
    
    error "Services failed to start"
    echo "Backend log:"
    tail backend.log 2>/dev/null || echo "No backend log"
    echo "Frontend log:"  
    tail frontend.log 2>/dev/null || echo "No frontend log"
    return 1
}

# Auto mode - detect best available option
start_auto_mode() {
    log "🤖 Auto-detecting best development mode..."
    
    if check_docker; then
        log "🐳 Docker available - using Docker mode for maximum reliability"
        start_docker_mode
    elif check_pm2; then
        log "⚡ PM2 available - using PM2 mode for process management"
        start_pm2_mode
    else
        log "🚀 Using simple mode with background processes"
        start_simple_mode
    fi
}

# Stop all services
stop_services() {
    log "🛑 Stopping all development services..."
    
    # Stop Docker
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Stop PM2
    if check_pm2; then
        pm2 delete "${PROJECT_NAME}-backend" 2>/dev/null || true
        pm2 delete "${PROJECT_NAME}-frontend" 2>/dev/null || true
    fi
    
    # Stop simple mode processes
    if [ -f .backend.pid ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm .backend.pid
    fi
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
    
    cleanup_ports
    log "✅ All services stopped"
}

# Show status
show_status() {
    log "📊 Development Environment Status"
    echo ""
    
    # Check Docker
    if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        echo "🐳 Docker: Running"
        docker-compose -f docker-compose.dev.yml ps
    else
        echo "🐳 Docker: Stopped"
    fi
    
    echo ""
    
    # Check PM2
    if check_pm2 && pm2 list | grep -q "${PROJECT_NAME}"; then
        echo "⚡ PM2: Running"
        pm2 list | grep "${PROJECT_NAME}"
    else
        echo "⚡ PM2: Stopped"
    fi
    
    echo ""
    
    # Check ports
    echo "🌐 Port Status:"
    for port in $FRONTEND_PORT $BACKEND_PORT $PROXY_PORT; do
        if lsof -i :$port > /dev/null 2>&1; then
            echo "  Port $port: In use"
        else
            echo "  Port $port: Available"
        fi
    done
}

# Health check
health_check() {
    log "🏥 Running health check..."
    
    local healthy=true
    
    # Check backend
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
        echo "✅ Backend: Healthy (port $BACKEND_PORT)"
    else
        echo "❌ Backend: Unhealthy (port $BACKEND_PORT)"
        healthy=false
    fi
    
    # Check frontend
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
        echo "✅ Frontend: Healthy (port $FRONTEND_PORT)"
    else
        echo "❌ Frontend: Unhealthy (port $FRONTEND_PORT)"
        healthy=false
    fi
    
    # Check proxy (if Docker mode)
    if curl -s http://localhost:$PROXY_PORT/health > /dev/null; then
        echo "✅ Proxy: Healthy (port $PROXY_PORT)"
    else
        echo "ℹ️  Proxy: Not running (Docker mode only)"
    fi
    
    if $healthy; then
        log "🎉 All services are healthy!"
        return 0
    else
        error "Some services are unhealthy"
        return 1
    fi
}

# Main script logic
case "${1:-auto}" in
    "docker")
        cleanup_ports
        start_docker_mode
        ;;
    "pm2")
        cleanup_ports
        start_pm2_mode
        ;;
    "simple")
        cleanup_ports
        start_simple_mode
        ;;
    "auto")
        cleanup_ports
        start_auto_mode
        ;;
    "stop")
        stop_services
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    "restart")
        stop_services
        sleep 2
        start_auto_mode
        ;;
    *)
        echo "ACT Placemat - Bulletproof Development Server"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  auto     Auto-detect best mode and start (default)"
        echo "  docker   Start with Docker + nginx proxy (most reliable)"
        echo "  pm2      Start with PM2 process management"
        echo "  simple   Start with background processes"
        echo "  stop     Stop all services"
        echo "  status   Show service status"
        echo "  health   Run health check"
        echo "  restart  Restart all services"
        echo ""
        echo "Quick start: ./dev.sh auto"
        ;;
esac