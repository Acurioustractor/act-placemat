#!/bin/bash

# ACT Perfect System - Production Launch Script
# Complete deployment with PM2 process management

set -e

echo "
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🚀 ACT PERFECT SYSTEM - PRODUCTION DEPLOYMENT          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_section() { echo -e "\n${BLUE}═══ $1 ═══${NC}\n"; }

# Check prerequisites
log_section "Checking Prerequisites"

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 18+ required (found $(node -v))"
    exit 1
fi
log_success "Node.js $(node -v) installed"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 not found, installing..."
    npm install -g pm2
fi
log_success "PM2 installed"

# Check environment files
if [ ! -f apps/backend/.env ]; then
    log_error "Backend .env file not found"
    log_info "Please create apps/backend/.env with required API keys"
    exit 1
fi
log_success "Backend environment configured"

if [ ! -f apps/frontend/.env ]; then
    log_warning "Frontend .env not found, creating from template..."
    cat > apps/frontend/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF
fi
log_success "Frontend environment configured"

# Install dependencies
log_section "Installing Dependencies"

log_info "Installing root dependencies..."
npm install --production

log_info "Installing backend dependencies..."
cd apps/backend
npm install --production
cd ../..

log_info "Installing frontend dependencies..."
cd apps/frontend
npm install --production
cd ../..

log_success "All dependencies installed"

# Build frontend
log_section "Building Frontend"

cd apps/frontend
log_info "Building production bundle..."
npm run build
cd ../..
log_success "Frontend built successfully"

# Create log directory
mkdir -p logs
log_success "Log directory created"

# Stop existing PM2 processes
log_section "Managing PM2 Processes"

log_info "Stopping existing processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start services with PM2
log_section "Starting Services"

log_info "Starting Perfect System with PM2..."
pm2 start ecosystem.config.js --env production

# Wait for services to start
sleep 5

# Check service status
log_section "Verifying Services"

# Check backend
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    log_success "Backend API is running"
else
    log_error "Backend API is not responding"
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    log_success "Frontend is running"
else
    log_warning "Frontend may need manual start"
fi

# Show PM2 status
log_section "Service Status"
pm2 status

# Save PM2 configuration
log_info "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
log_info "Setting up auto-start on boot..."
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

# Display access information
log_section "🎉 Deployment Complete!"

echo "
${GREEN}The ACT Perfect System is now running in production mode!${NC}

📊 Access Points:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Frontend:       http://localhost:5173
🔧 Backend API:    http://localhost:4000
📡 WebSocket:      ws://localhost:4000/live
📊 Dashboard:      http://localhost:5173/dashboard
🧠 Intelligence:   http://localhost:5173/intelligence

📝 Management Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
View logs:         pm2 logs
Monitor:           pm2 monit
Stop all:          pm2 stop all
Restart:           pm2 restart all
Status:            pm2 status

📁 Log Files:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend:           logs/backend-out.log
Frontend:          logs/frontend-out.log
Worker:            logs/worker-out.log
Errors:            logs/*-error.log

🔧 Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM2 Config:        ecosystem.config.js
Backend Env:       apps/backend/.env
Frontend Env:      apps/frontend/.env

${YELLOW}⚠️  Next Steps:${NC}
1. Configure your domain and SSL certificates
2. Set up nginx reverse proxy
3. Enable firewall rules
4. Configure monitoring and alerts
5. Set up automated backups

${GREEN}✨ Your Perfect System is ready for production!${NC}
"

# Monitor logs
log_section "Monitoring Logs (Press Ctrl+C to exit)"
pm2 logs --lines 20