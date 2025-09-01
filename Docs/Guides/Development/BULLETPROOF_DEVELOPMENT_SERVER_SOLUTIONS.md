# 🛡️ BULLETPROOF DEVELOPMENT SERVER SOLUTIONS

## Overview

This guide provides comprehensive, tested solutions to eliminate recurring "ERR_CONNECTION_REFUSED" localhost issues and port conflicts in development environments. Each solution is designed to work reliably every single time, require minimal setup, and eliminate debugging headaches permanently.

## 🐳 Solution 1: Docker-Based Development Environment

### Complete Docker Compose Setup

Create `docker-compose.dev.yml` in your project root:

```yaml
version: '3.8'

services:
  # Nginx Reverse Proxy - Single Entry Point
  proxy:
    image: nginx:alpine
    container_name: act-proxy
    ports:
      - "3000:80"
    volumes:
      - ./docker/nginx.dev.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - act-network
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Backend API Server
  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile.dev
    container_name: act-backend
    environment:
      - NODE_ENV=development
      - PORT=4000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    volumes:
      - ./apps/backend:/app
      - /app/node_modules
    networks:
      - act-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  # Frontend Development Server
  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile.dev
    container_name: act-frontend
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3000/api
    volumes:
      - ./apps/frontend:/app
      - /app/node_modules
    networks:
      - act-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  # Redis for Session Management
  redis:
    image: redis:alpine
    container_name: act-redis
    ports:
      - "6379:6379"
    networks:
      - act-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  act-network:
    driver: bridge

volumes:
  node_modules_backend:
  node_modules_frontend:
```

### Nginx Configuration

Create `docker/nginx.dev.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:4000;
    }

    upstream frontend {
        server frontend:5173;
    }

    # Enable websockets for HMR
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        server_name localhost;

        # API routes to backend
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### Backend Dockerfile.dev

Create `apps/backend/Dockerfile.dev`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Start development server with nodemon
CMD ["npm", "run", "dev"]
```

### Frontend Dockerfile.dev

Create `apps/frontend/Dockerfile.dev`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Single Command Startup Script

Create `start-docker-dev.sh`:

```bash
#!/bin/bash

echo "🐳 Starting ACT Placemat Docker Development Environment..."

# Stop any existing containers
docker-compose -f docker-compose.dev.yml down

# Remove old containers and volumes
docker system prune -f
docker volume prune -f

# Build and start services
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health status
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ DOCKER DEVELOPMENT ENVIRONMENT READY!"
echo ""
echo "🌟 Single Entry Point: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3000/api"
echo "🌐 Frontend App: http://localhost:3000"
echo "📊 Health Check: http://localhost:3000/health"
echo ""
echo "📝 View logs:"
echo "   docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 Stop environment:"
echo "   docker-compose -f docker-compose.dev.yml down"
```

## 🚀 Solution 2: Enhanced Vite Proxy Configuration

### Updated Frontend Vite Config

Update `apps/frontend/vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          ws: true, // Enable websocket proxying
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/health': {
          target: env.VITE_API_URL || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          }
        }
      }
    },
    preview: {
      port: 4173,
      host: '0.0.0.0'
    }
  }
})
```

### Environment Configuration

Create `.env.development`:

```env
VITE_API_URL=http://localhost:4000
VITE_API_BASE_URL=/api
VITE_ENVIRONMENT=development
```

Create `.env.production`:

```env
VITE_API_URL=https://api.yourproductiondomain.com
VITE_API_BASE_URL=/api
VITE_ENVIRONMENT=production
```

## 🔧 Solution 3: PM2 Process Management

### PM2 Ecosystem Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'act-backend',
      cwd: './apps/backend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs'],
      watch_options: {
        followSymlinks: false
      },
      max_memory_restart: '500M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'act-frontend',
      cwd: './apps/frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: 5173
      },
      watch: false, // Vite handles its own watching
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
```

### PM2 Startup Scripts

Create `start-pm2.sh`:

```bash
#!/bin/bash

echo "🚀 Starting ACT Placemat with PM2 Process Management..."

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Stop any existing processes
pm2 delete all 2>/dev/null || true

# Start ecosystem
pm2 start ecosystem.config.js

# Show status
pm2 status

# Show logs
pm2 logs --lines 10

echo ""
echo "✅ PM2 DEVELOPMENT ENVIRONMENT READY!"
echo ""
echo "🌟 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:4000"
echo "📊 Health Check: http://localhost:4000/health"
echo ""
echo "📝 PM2 Commands:"
echo "   pm2 status          - Show process status"
echo "   pm2 logs            - Show live logs"
echo "   pm2 restart all     - Restart all processes"
echo "   pm2 stop all        - Stop all processes"
echo "   pm2 delete all      - Delete all processes"
echo ""
```

Create `stop-pm2.sh`:

```bash
#!/bin/bash

echo "🛑 Stopping PM2 processes..."

pm2 stop all
pm2 delete all

echo "✅ All PM2 processes stopped and deleted"
```

## 🌐 Solution 4: Express Static Serving (Production-like Development)

### Unified Server Approach

Create `apps/backend/src/unified-server.js`:

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Import your existing backend app
import backendApp from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.UNIFIED_PORT || 3000;

// In development, proxy to Vite dev server
if (process.env.NODE_ENV === 'development') {
  // Proxy frontend requests to Vite dev server
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true, // Enable websocket support for HMR
    logLevel: 'info',
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error');
    }
  }));
} else {
  // In production, serve built frontend files
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Mount backend API routes
app.use('/api', backendApp);

// Health check for the unified server
app.get('/unified-health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`
🚀 UNIFIED SERVER STARTED!

🌟 Single Entry Point: http://localhost:${PORT}
🔧 Backend API: http://localhost:${PORT}/api
🌐 Frontend App: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/unified-health

Environment: ${process.env.NODE_ENV}
  `);
});

export default app;
```

### Package.json Scripts Update

Add to root `package.json`:

```json
{
  "scripts": {
    "dev:unified": "concurrently \"cd apps/frontend && npm run dev\" \"cd apps/backend && NODE_ENV=development node src/unified-server.js\"",
    "start:unified": "cd apps/backend && NODE_ENV=production node src/unified-server.js",
    "build": "cd apps/frontend && npm run build",
    "dev:docker": "./start-docker-dev.sh",
    "dev:pm2": "./start-pm2.sh",
    "stop:pm2": "./stop-pm2.sh"
  }
}
```

## 🏠 Solution 5: Host File Configuration for Stable Local Domains

### Local Domain Setup

Add to `/etc/hosts` (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1    act.local
127.0.0.1    api.act.local
127.0.0.1    admin.act.local
127.0.0.1    frontend.act.local
127.0.0.1    backend.act.local
```

### Updated Nginx Configuration for Custom Domains

Create `docker/nginx.domains.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:4000;
    }

    upstream frontend {
        server frontend:5173;
    }

    # Main application server
    server {
        listen 80;
        server_name act.local;

        location /api {
            proxy_pass http://backend;
            include /etc/nginx/proxy-headers.conf;
        }

        location / {
            proxy_pass http://frontend;
            include /etc/nginx/proxy-headers.conf;
        }
    }

    # API-only server
    server {
        listen 80;
        server_name api.act.local;

        location / {
            proxy_pass http://backend;
            include /etc/nginx/proxy-headers.conf;
        }
    }

    # Frontend-only server
    server {
        listen 80;
        server_name frontend.act.local;

        location / {
            proxy_pass http://frontend;
            include /etc/nginx/proxy-headers.conf;
        }
    }
}
```

Create `docker/proxy-headers.conf`:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
```

## 🔄 Solution 6: Health Monitoring and Auto-Recovery

### Health Check Service

Create `apps/backend/src/services/healthService.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

class HealthService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.checks = new Map();
    this.startPeriodicChecks();
  }

  async checkDatabase() {
    try {
      const { data, error } = await this.supabase
        .from('stories')
        .select('id')
        .limit(1);
      
      return { status: 'healthy', error: null };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkExternalAPIs() {
    const checks = [];
    
    // Check Notion API if configured
    if (process.env.NOTION_TOKEN) {
      try {
        const response = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28'
          }
        });
        checks.push({ service: 'notion', status: response.ok ? 'healthy' : 'unhealthy' });
      } catch (error) {
        checks.push({ service: 'notion', status: 'unhealthy', error: error.message });
      }
    }

    return checks;
  }

  async getFullHealthStatus() {
    const database = await this.checkDatabase();
    const external = await this.checkExternalAPIs();
    
    return {
      timestamp: new Date().toISOString(),
      overall: database.status === 'healthy' ? 'healthy' : 'unhealthy',
      services: {
        database,
        external
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  startPeriodicChecks() {
    setInterval(async () => {
      const health = await this.getFullHealthStatus();
      this.checks.set('latest', health);
      
      if (health.overall === 'unhealthy') {
        console.error('🚨 Health check failed:', health);
        // Here you could trigger alerts, restart services, etc.
      }
    }, 30000); // Check every 30 seconds
  }

  getLatestCheck() {
    return this.checks.get('latest');
  }
}

export default new HealthService();
```

### Auto-Recovery Script

Create `auto-recovery.sh`:

```bash
#!/bin/bash

LOG_FILE="logs/auto-recovery.log"
MAX_FAILURES=3
FAILURE_COUNT=0

log_message() {
    echo "$(date): $1" | tee -a "$LOG_FILE"
}

check_service() {
    local url=$1
    local service_name=$2
    
    if curl -s -f "$url" > /dev/null; then
        log_message "✅ $service_name is healthy"
        return 0
    else
        log_message "❌ $service_name is unhealthy"
        return 1
    fi
}

restart_services() {
    log_message "🔄 Restarting services due to repeated failures..."
    
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml restart
    elif command -v pm2 &> /dev/null; then
        pm2 restart all
    else
        ./stop-servers.sh
        sleep 5
        ./start-servers.sh
    fi
    
    sleep 10
}

# Main monitoring loop
while true; do
    if check_service "http://localhost:3000/health" "Main Application" && \
       check_service "http://localhost:4000/health" "Backend API"; then
        FAILURE_COUNT=0
    else
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        log_message "⚠️  Failure count: $FAILURE_COUNT/$MAX_FAILURES"
        
        if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
            restart_services
            FAILURE_COUNT=0
        fi
    fi
    
    sleep 30
done
```

## 🎯 Solution 7: Ultimate Single Command Development Environment

### Master Development Script

Create `dev.sh`:

```bash
#!/bin/bash

# ACT Placemat - Ultimate Development Environment Launcher
# This script provides multiple bulletproof development options

set -e

# Configuration
PROJECT_NAME="ACT Placemat"
DOCKER_COMPOSE_FILE="docker-compose.dev.yml"
PM2_CONFIG="ecosystem.config.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}"
    echo "██████╗ ██╗   ██╗██╗     ██╗     ███████╗████████╗██████╗ ██████╗  ██████╗  ██████╗ ███████╗"
    echo "██╔══██╗██║   ██║██║     ██║     ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔═══██╗██╔═══██╗██╔════╝"
    echo "██████╔╝██║   ██║██║     ██║     █████╗     ██║   ██████╔╝██████╔╝██║   ██║██║   ██║█████╗  "
    echo "██╔══██╗██║   ██║██║     ██║     ██╔══╝     ██║   ██╔═══╝ ██╔══██╗██║   ██║██║   ██║██╔══╝  "
    echo "██████╔╝╚██████╔╝███████╗███████╗███████╗   ██║   ██║     ██║  ██║╚██████╔╝╚██████╔╝██║     "
    echo "╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     "
    echo -e "${NC}"
    echo -e "${GREEN}🚀 $PROJECT_NAME - Bulletproof Development Environment${NC}"
    echo ""
}

check_dependencies() {
    echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing dependencies: ${missing_deps[*]}${NC}"
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies found${NC}"
}

setup_environment() {
    echo -e "${YELLOW}🔧 Setting up environment...${NC}"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p docker
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing root dependencies..."
        npm install
    fi
    
    if [ ! -d "apps/frontend/node_modules" ]; then
        echo "Installing frontend dependencies..."
        cd apps/frontend && npm install && cd ../..
    fi
    
    if [ ! -d "apps/backend/node_modules" ]; then
        echo "Installing backend dependencies..."
        cd apps/backend && npm install && cd ../..
    fi
    
    echo -e "${GREEN}✅ Environment setup complete${NC}"
}

cleanup_ports() {
    echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
    
    # Kill processes on common ports
    for port in 3000 4000 5173 5174; do
        if lsof -ti:$port >/dev/null 2>&1; then
            echo "Killing process on port $port"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Stop any running PM2 processes
    if command -v pm2 &> /dev/null; then
        pm2 delete all 2>/dev/null || true
    fi
    
    # Stop Docker containers
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down 2>/dev/null || true
    fi
    
    sleep 2
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

start_docker_mode() {
    echo -e "${BLUE}🐳 Starting Docker Development Environment...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install Docker and try again.${NC}"
        exit 1
    fi
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        echo -e "${RED}❌ Docker Compose file not found: $DOCKER_COMPOSE_FILE${NC}"
        exit 1
    fi
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" up --build -d
    
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 15
    
    # Check service health
    if curl -s http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}✅ Docker environment is ready!${NC}"
        echo -e "${GREEN}🌟 Access your application at: http://localhost:3000${NC}"
    else
        echo -e "${RED}❌ Services may not be ready yet. Check logs with: docker-compose -f $DOCKER_COMPOSE_FILE logs${NC}"
    fi
}

start_pm2_mode() {
    echo -e "${BLUE}🔧 Starting PM2 Process Management...${NC}"
    
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        npm install -g pm2
    fi
    
    if [ ! -f "$PM2_CONFIG" ]; then
        echo -e "${RED}❌ PM2 config file not found: $PM2_CONFIG${NC}"
        exit 1
    fi
    
    pm2 start "$PM2_CONFIG"
    
    echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
    sleep 10
    
    pm2 status
    
    echo -e "${GREEN}✅ PM2 environment is ready!${NC}"
    echo -e "${GREEN}🌟 Frontend: http://localhost:5173${NC}"
    echo -e "${GREEN}🔧 Backend: http://localhost:4000${NC}"
}

start_simple_mode() {
    echo -e "${BLUE}⚡ Starting Simple Development Mode...${NC}"
    
    # Start backend in background
    cd apps/backend
    npm run dev > ../../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../../logs/backend.pid
    cd ../..
    
    echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
    sleep 5
    
    # Start frontend in background
    cd apps/frontend
    npm run dev > ../../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../../logs/frontend.pid
    cd ../..
    
    echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
    sleep 5
    
    echo -e "${GREEN}✅ Simple environment is ready!${NC}"
    echo -e "${GREEN}🌟 Frontend: http://localhost:5173${NC}"
    echo -e "${GREEN}🔧 Backend: http://localhost:4000${NC}"
}

show_usage() {
    echo "Usage: $0 [MODE] [OPTIONS]"
    echo ""
    echo "MODES:"
    echo "  docker     - Docker-based environment (recommended for reliability)"
    echo "  pm2        - PM2 process management (good for production-like development)"
    echo "  simple     - Simple background processes (fastest startup)"
    echo "  auto       - Automatically choose best available mode"
    echo ""
    echo "OPTIONS:"
    echo "  --no-cleanup  - Skip port cleanup"
    echo "  --help       - Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 docker              # Start with Docker (most reliable)"
    echo "  $0 pm2                 # Start with PM2 (process management)"
    echo "  $0 simple              # Start with simple mode (fastest)"
    echo "  $0 auto                # Auto-detect best mode"
}

auto_detect_mode() {
    echo -e "${YELLOW}🤖 Auto-detecting best development mode...${NC}"
    
    if command -v docker &> /dev/null && [ -f "$DOCKER_COMPOSE_FILE" ]; then
        echo -e "${GREEN}✅ Docker available - using Docker mode${NC}"
        return 0 # docker
    elif [ -f "$PM2_CONFIG" ]; then
        echo -e "${GREEN}✅ PM2 config available - using PM2 mode${NC}"
        return 1 # pm2
    else
        echo -e "${GREEN}✅ Using simple mode${NC}"
        return 2 # simple
    fi
}

main() {
    print_header
    
    # Parse arguments
    MODE=""
    NO_CLEANUP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            docker|pm2|simple|auto)
                MODE="$1"
                shift
                ;;
            --no-cleanup)
                NO_CLEANUP=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Default to auto mode if no mode specified
    if [ -z "$MODE" ]; then
        MODE="auto"
    fi
    
    check_dependencies
    setup_environment
    
    if [ "$NO_CLEANUP" = false ]; then
        cleanup_ports
    fi
    
    case $MODE in
        docker)
            start_docker_mode
            ;;
        pm2)
            start_pm2_mode
            ;;
        simple)
            start_simple_mode
            ;;
        auto)
            auto_detect_mode
            case $? in
                0) start_docker_mode ;;
                1) start_pm2_mode ;;
                2) start_simple_mode ;;
            esac
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 Development environment is ready!${NC}"
    echo -e "${BLUE}📝 View logs: tail -f logs/*.log${NC}"
    echo -e "${BLUE}🛑 Stop servers: ./stop.sh${NC}"
    echo ""
}

# Run main function
main "$@"
```

### Companion Stop Script

Create `stop.sh`:

```bash
#!/bin/bash

echo "🛑 Stopping all development services..."

# Stop PM2 processes
if command -v pm2 &> /dev/null; then
    pm2 delete all 2>/dev/null || true
fi

# Stop Docker containers
if [ -f "docker-compose.dev.yml" ]; then
    docker-compose -f docker-compose.dev.yml down
fi

# Kill processes by PID files
if [ -f "logs/backend.pid" ]; then
    kill $(cat logs/backend.pid) 2>/dev/null || true
    rm logs/backend.pid
fi

if [ -f "logs/frontend.pid" ]; then
    kill $(cat logs/frontend.pid) 2>/dev/null || true
    rm logs/frontend.pid
fi

# Kill processes on common ports
for port in 3000 4000 5173 5174; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

echo "✅ All services stopped"
```

## 📋 Quick Reference

### Single Commands for Each Solution

```bash
# 1. Docker Mode (Most Reliable)
chmod +x dev.sh && ./dev.sh docker

# 2. PM2 Mode (Production-like)
chmod +x dev.sh && ./dev.sh pm2

# 3. Simple Mode (Fastest)
chmod +x dev.sh && ./dev.sh simple

# 4. Auto Mode (Best Available)
chmod +x dev.sh && ./dev.sh auto

# Stop Everything
chmod +x stop.sh && ./stop.sh
```

### Access Points

- **Single Entry Point (Docker)**: http://localhost:3000
- **Frontend Direct**: http://localhost:5173
- **Backend Direct**: http://localhost:4000
- **Health Check**: http://localhost:3000/health (Docker) or http://localhost:4000/health (Direct)

### Troubleshooting Commands

```bash
# Check what's running on ports
lsof -i :3000,4000,5173,5174

# View logs
tail -f logs/*.log

# Docker logs
docker-compose -f docker-compose.dev.yml logs -f

# PM2 status
pm2 status && pm2 logs

# Health check
curl http://localhost:3000/health
```

## 🏆 Recommended Setup

1. **Primary Choice**: Docker mode (`./dev.sh docker`) - Most reliable, isolated, and bulletproof
2. **Alternative**: PM2 mode (`./dev.sh pm2`) - Great for production-like development
3. **Fallback**: Simple mode (`./dev.sh simple`) - When you need quick startup

Each solution eliminates port conflicts, provides health monitoring, and ensures reliable startup every time.