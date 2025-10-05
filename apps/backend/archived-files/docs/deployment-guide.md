# ACT Farmhand AI - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Configuration](#database-configuration)
6. [API Configuration](#api-configuration)
7. [System Integration Setup](#system-integration-setup)
8. [Production Deployment](#production-deployment)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Security Considerations](#security-considerations)
11. [Backup and Recovery](#backup-and-recovery)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **PostgreSQL**: 13.x or higher (for Empathy Ledger integration)
- **Redis**: 6.x or higher (for caching and sessions)
- **Docker**: 20.x or higher (optional but recommended)
- **Git**: Latest version

### Hardware Requirements

#### Development Environment
- **CPU**: 2+ cores
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB free space
- **Network**: Stable internet for API calls

#### Production Environment
- **CPU**: 4+ cores
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 100GB+ SSD storage
- **Network**: High-speed internet with low latency
- **Load Balancer**: For high availability (optional)

### External Dependencies
- **OpenAI API**: For AI processing (or alternative AI service)
- **Perplexity API**: For research capabilities (optional)
- **Xero API**: For financial integration (optional)
- **Neo4j**: For knowledge graph (optional)
- **Email Service**: For notifications (optional)

## Environment Setup

### Environment Variables

Create `.env` files in both backend and frontend directories:

#### Backend `.env`
```bash
# Server Configuration
NODE_ENV=production
PORT=5010
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/act_farmhand
REDIS_URL=redis://localhost:6379

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
XERO_API_KEY=your_xero_api_key_here

# External System URLs
EMPATHY_LEDGER_URL=http://localhost:5000
OPPORTUNITY_ECOSYSTEM_URL=http://localhost:3000
NOTION_API_URL=https://api.notion.com

# Security
JWT_SECRET=your_jwt_secret_here
API_KEY_SECRET=your_api_key_secret_here
CORS_ORIGIN=https://your-domain.com

# Cultural Safety
CULTURAL_SAFETY_THRESHOLD=90
COMMUNITY_CONSENT_REQUIRED=true
INDIGENOUS_DATA_SOVEREIGNTY=enabled

# Monitoring
LOG_LEVEL=info
HEALTH_CHECK_INTERVAL=30000
PIPELINE_TIMEOUT=600000
```

#### Frontend `.env`
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5010
REACT_APP_GRAPHQL_URL=http://localhost:5010/graphql
REACT_APP_WEBSOCKET_URL=ws://localhost:5010/graphql

# Feature Flags
REACT_APP_ENABLE_REAL_TIME=true
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_CULTURAL_SAFETY_ALERTS=true

# Monitoring
REACT_APP_LOG_LEVEL=warn
REACT_APP_ERROR_REPORTING=enabled
```

### Package Installation

#### Backend Setup
```bash
cd apps/backend
npm install

# Install additional dependencies if needed
npm install --save apollo-server-express graphql-ws
npm install --save-dev @types/node typescript ts-node
```

#### Frontend Setup
```bash
cd apps/frontend
npm install

# Install additional UI dependencies
npm install --save lucide-react clsx tailwind-merge
npm install --save-dev @types/react @types/react-dom
```

## Backend Deployment

### Development Server
```bash
cd apps/backend
npm run dev
```

### Production Build
```bash
cd apps/backend

# Build TypeScript
npm run build

# Start production server
npm start
```

### Process Manager (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'act-farmhand-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5010
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Docker Deployment
```bash
# Create Dockerfile
cat > Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S farmhand -u 1001

# Change ownership
RUN chown -R farmhand:nodejs /app
USER farmhand

EXPOSE 5010

CMD ["npm", "start"]
EOF

# Build image
docker build -t act-farmhand-backend .

# Run container
docker run -d \
  --name act-farmhand-backend \
  -p 5010:5010 \
  --env-file .env \
  act-farmhand-backend
```

## Frontend Deployment

### Development Server
```bash
cd apps/frontend
npm run dev
```

### Production Build
```bash
cd apps/frontend

# Build for production
npm run build

# Serve with static server
npm install -g serve
serve -s build -l 3000
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    root /var/www/act-farmhand/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /graphql {
        proxy_pass http://localhost:5010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker Frontend
```bash
# Multi-stage Dockerfile for frontend
cat > Dockerfile << EOF
# Build stage
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy build files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Build and run
docker build -t act-farmhand-frontend .
docker run -d -p 80:80 act-farmhand-frontend
```

## Database Configuration

### PostgreSQL Setup
```sql
-- Create database
CREATE DATABASE act_farmhand;

-- Create user
CREATE USER farmhand_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE act_farmhand TO farmhand_user;

-- Connect to database
\c act_farmhand

-- Create schema for farmhand
CREATE SCHEMA farmhand AUTHORIZATION farmhand_user;
```

### Migration Scripts
```bash
cd apps/backend

# Create migration script
cat > migrations/001_initial_schema.sql << EOF
-- Workflow tasks table
CREATE TABLE farmhand.workflow_tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    farm_stage VARCHAR(20) DEFAULT 'seeded',
    progress INTEGER DEFAULT 0,
    cultural_safety_score DECIMAL(5,2) DEFAULT 95.0,
    skill_pods_assigned TEXT[],
    insights JSONB DEFAULT '[]',
    blockers JSONB DEFAULT '[]',
    farm_metaphor TEXT,
    estimated_yield TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- System integration events
CREATE TABLE farmhand.integration_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    pipeline VARCHAR(100),
    message TEXT NOT NULL,
    data JSONB,
    severity VARCHAR(20) DEFAULT 'info',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Cultural safety logs
CREATE TABLE farmhand.cultural_safety_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    safety_score DECIMAL(5,2) NOT NULL,
    validation_details JSONB,
    community_consent BOOLEAN DEFAULT true,
    protocol_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Skill pod performance
CREATE TABLE farmhand.skill_pod_performance (
    id SERIAL PRIMARY KEY,
    pod_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'idle',
    progress INTEGER DEFAULT 0,
    insights_generated INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0,
    total_queries INTEGER DEFAULT 0,
    success_rate DECIMAL(4,3) DEFAULT 1.0,
    cultural_safety_score DECIMAL(5,2) DEFAULT 95.0,
    last_activity TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_workflow_tasks_status ON farmhand.workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_priority ON farmhand.workflow_tasks(priority);
CREATE INDEX idx_integration_events_type ON farmhand.integration_events(event_type);
CREATE INDEX idx_cultural_safety_logs_entity ON farmhand.cultural_safety_logs(entity_type, entity_id);
CREATE INDEX idx_skill_pod_performance_pod_id ON farmhand.skill_pod_performance(pod_id);
EOF

# Run migration
psql -U farmhand_user -d act_farmhand -f migrations/001_initial_schema.sql
```

### Redis Configuration
```bash
# Redis configuration for caching
redis-cli

# Set basic configuration
CONFIG SET maxmemory 256mb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET save "900 1 300 10 60 10000"

# Create namespace for farmhand
SET farmhand:config:cultural_safety_threshold 90
SET farmhand:config:pipeline_timeout 600000
```

## API Configuration

### GraphQL Schema Deployment
```bash
cd apps/backend

# Validate schema
npm run graphql:validate

# Generate schema documentation
npm run graphql:docs

# Test introspection
curl -X POST http://localhost:5010/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query IntrospectionQuery{__schema{types{name}}}"}'
```

### API Key Management
```bash
# Generate API keys for external access
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Store in database or environment
export SYSTEM_API_KEY=generated_key_here
```

### Rate Limiting Configuration
```javascript
// Add to server configuration
const rateLimit = require('express-rate-limit');

const farmworkflowLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests to farm workflow API'
});

const aiProcessingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute  
  max: 10, // 10 requests per minute
  message: 'Too many AI processing requests'
});

app.use('/api/farm-workflow', farmworkflowLimiter);
app.use('/api/farm-workflow/query', aiProcessingLimiter);
```

## System Integration Setup

### Empathy Ledger Connection
```bash
# Test connection
curl -X GET http://localhost:5000/api/stories \
  -H "Authorization: Bearer your_token"

# Verify data access
node -e "
const service = require('./src/services/empathyLedgerService.js');
service.getStories().then(stories => {
  console.log('Stories:', stories.length);
}).catch(console.error);
"
```

### Opportunity Ecosystem Integration
```bash
# Test opportunity system
curl -X GET http://localhost:3000/api/opportunities \
  -H "Content-Type: application/json"
```

### Pipeline Configuration
```bash
# Create pipeline configuration
cat > config/pipelines.json << EOF
{
  "pipelines": {
    "story_intelligence": {
      "schedule": "0 */6 * * *",
      "processors": ["story_analyzer", "theme_extractor", "cultural_validator"],
      "timeout": 300000
    },
    "opportunity_discovery": {
      "schedule": "0 0 * * 1",
      "processors": ["opportunity_scanner", "alignment_analyzer", "cultural_assessor"],
      "timeout": 900000
    },
    "impact_measurement": {
      "schedule": "0 0 1 * *",
      "processors": ["sroi_calculator", "outcome_tracker", "visualization_generator"],
      "timeout": 1800000
    },
    "system_optimization": {
      "schedule": "*/15 * * * *",
      "processors": ["performance_monitor", "improvement_identifier", "automation_detector"],
      "timeout": 600000
    }
  }
}
EOF
```

## Production Deployment

### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: act_farmhand
      POSTGRES_USER: farmhand_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build: 
      context: ./apps/backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://farmhand_user:${POSTGRES_PASSWORD}@postgres:5432/act_farmhand
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5010/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment
```yaml
# kubernetes/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: act-farmhand

---
# kubernetes/deployment.yaml  
apiVersion: apps/v1
kind: Deployment
metadata:
  name: act-farmhand-backend
  namespace: act-farmhand
spec:
  replicas: 3
  selector:
    matchLabels:
      app: act-farmhand-backend
  template:
    metadata:
      labels:
        app: act-farmhand-backend
    spec:
      containers:
      - name: backend
        image: act-farmhand-backend:latest
        ports:
        - containerPort: 5010
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 5010
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5010
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: act-farmhand-backend-service
  namespace: act-farmhand
spec:
  selector:
    app: act-farmhand-backend
  ports:
  - port: 5010
    targetPort: 5010
  type: ClusterIP
```

## Monitoring and Maintenance

### Health Checks
```bash
# Backend health check
curl http://localhost:5010/health

# API endpoint checks
curl http://localhost:5010/api/farm-workflow/status
curl http://localhost:5010/api/system-integration/status

# GraphQL health
curl -X POST http://localhost:5010/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query{farmStatus{status}}"}'
```

### Log Management
```bash
# Configure log rotation
sudo tee /etc/logrotate.d/act-farmhand << EOF
/var/log/act-farmhand/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 farmhand farmhand
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create log directory
sudo mkdir -p /var/log/act-farmhand
sudo chown farmhand:farmhand /var/log/act-farmhand
```

### Performance Monitoring
```javascript
// Add to server.js
const prometheus = require('prom-client');

// Create metrics
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const culturalSafetyScore = new prometheus.Gauge({
  name: 'cultural_safety_score',
  help: 'Current cultural safety score'
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

## Security Considerations

### HTTPS Configuration
```bash
# Generate SSL certificates (Let's Encrypt)
sudo certbot --nginx -d your-domain.com

# Or use custom certificates
sudo cp certificate.crt /etc/ssl/certs/
sudo cp private.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/private.key
```

### API Security
```javascript
// Security middleware
const helmet = require('helmet');
const cors = require('cors');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### Data Protection
```bash
# Encrypt sensitive environment variables
npm install dotenv-vault

# Initialize vault
npx dotenv-vault new
npx dotenv-vault push
npx dotenv-vault pull
```

## Backup and Recovery

### Database Backup
```bash
# Create backup script
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/act-farmhand"
mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
pg_dump -U farmhand_user -h localhost act_farmhand > "$BACKUP_DIR/postgres_$DATE.sql"

# Redis backup
redis-cli --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Compress backups
gzip "$BACKUP_DIR/postgres_$DATE.sql"

# Retain only last 30 days
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +30 -delete
EOF

chmod +x scripts/backup.sh

# Add to crontab
echo "0 2 * * * /path/to/scripts/backup.sh" | crontab -
```

### Recovery Procedures
```bash
# Restore PostgreSQL
gunzip -c /backups/act-farmhand/postgres_YYYYMMDD_HHMMSS.sql.gz | psql -U farmhand_user act_farmhand

# Restore Redis
redis-cli --rdb /backups/act-farmhand/redis_YYYYMMDD_HHMMSS.rdb

# Restart services
pm2 restart all
```

## Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check logs
pm2 logs act-farmhand-backend

# Verify database connection
psql -U farmhand_user -d act_farmhand -c "SELECT 1;"

# Check port availability  
netstat -tlnp | grep 5010
```

#### API Calls Failing
```bash
# Test API connectivity
curl -I http://localhost:5010/health

# Check CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:5010/api/farm-workflow/status
```

#### Cultural Safety Scores Low
```bash
# Check cultural safety configuration
grep -r "CULTURAL_SAFETY" .env

# Review recent safety logs
psql -U farmhand_user -d act_farmhand -c "
SELECT * FROM farmhand.cultural_safety_logs 
WHERE safety_score < 90 
ORDER BY created_at DESC 
LIMIT 10;
"
```

#### Performance Issues
```bash
# Check system resources
top -p $(pgrep -f "act-farmhand")
free -h
df -h

# Monitor database performance
psql -U farmhand_user -d act_farmhand -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"
```

### Support Contacts
- **Technical Issues**: tech@act.place
- **Cultural Safety**: cultural-safety@act.place  
- **Emergency**: emergency@act.place

---

**Document Version**: 1.0.0  
**Last Updated**: August 2025  
**Next Review**: November 2025