# ACT Platform Deployment Guide
## From Development to World-Class Production

### 🚀 Quick Start

```bash
# Development
npm run dev:all

# Production Build
npm run build:all

# Deploy
npm run deploy:production
```

---

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] All API keys configured in `.env`
- [ ] Notion databases created and IDs set
- [ ] Supabase project configured
- [ ] Redis instance available
- [ ] Domain and SSL certificates ready

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] Linting clean (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Security audit clean (`npm audit`)

### Infrastructure
- [ ] Database migrations run
- [ ] Redis cache configured
- [ ] CDN configured for static assets
- [ ] Monitoring tools set up
- [ ] Backup strategy in place

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   CloudFlare CDN                         │
│                  (Static Assets & Edge)                  │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Load Balancer                         │
│                   (AWS ALB / GCP LB)                     │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┬─────────────┐
        ▼                   ▼             ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Frontend   │   │   Backend    │   │  WebSocket   │
│   (Vercel)   │   │  (AWS/GCP)   │   │   Server     │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                  │
        └───────────────────┼──────────────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
        ┌──────────────┐     ┌──────────────┐
        │   Supabase   │     │    Redis     │
        │  (PostgreSQL)│     │   (Cache)    │
        └──────────────┘     └──────────────┘
```

---

## 🔧 Environment Configuration

### Development (.env.development)
```bash
NODE_ENV=development
API_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173
```

### Production (.env.production)
```bash
NODE_ENV=production
API_URL=https://api.act.place
FRONTEND_URL=https://www.act.place

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_key

# Redis
REDIS_URL=redis://your-redis-instance:6379

# Notion
NOTION_TOKEN=your_production_token

# AI Services (use environment-specific keys)
ANTHROPIC_API_KEY=sk-ant-production-key
OPENAI_API_KEY=sk-production-key
```

---

## 🚢 Deployment Steps

### 1. Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd apps/frontend
vercel --prod

# Environment variables to set in Vercel:
# - VITE_API_URL
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### 2. Backend Deployment (AWS/GCP)

#### Option A: AWS Lambda + API Gateway
```bash
# Install Serverless Framework
npm i -g serverless

# Deploy backend
cd apps/backend
serverless deploy --stage production
```

#### Option B: Google Cloud Run
```bash
# Build Docker image
docker build -t act-backend .

# Push to Google Container Registry
docker tag act-backend gcr.io/act-platform/backend
docker push gcr.io/act-platform/backend

# Deploy to Cloud Run
gcloud run deploy act-backend \
  --image gcr.io/act-platform/backend \
  --platform managed \
  --region australia-southeast1 \
  --allow-unauthenticated
```

### 3. Database Setup

```sql
-- Run migrations
psql $DATABASE_URL < apps/backend/database/migrations/*.sql

-- Create indexes for performance
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_people_engagement ON people(engagement_score DESC);
CREATE INDEX idx_notion_sync ON all_tables(notion_id);
```

### 4. Redis Configuration

```bash
# Redis Sentinel for high availability
redis-cli --cluster create \
  redis1.act.place:6379 \
  redis2.act.place:6379 \
  redis3.act.place:6379 \
  --cluster-replicas 1
```

### 5. CDN Setup (CloudFlare)

```yaml
# CloudFlare configuration
page_rules:
  - target: "*.act.place/api/*"
    actions:
      cache_level: bypass
      
  - target: "*.act.place/static/*"
    actions:
      cache_level: cache_everything
      edge_cache_ttl: 2592000
      
  - target: "*.act.place/*"
    actions:
      cache_level: standard
      browser_cache_ttl: 3600
```

---

## 🔄 Continuous Deployment

### GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run type-check

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v0
      - run: |
          docker build -t act-backend apps/backend
          docker push gcr.io/act-platform/backend
          gcloud run deploy act-backend --image gcr.io/act-platform/backend
```

---

## 📊 Monitoring & Observability

### 1. Application Monitoring (DataDog/New Relic)

```javascript
// Install monitoring agent
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'act-platform',
  env: 'production',
  trackInteractions: true,
  trackFrustrations: true
});
```

### 2. Error Tracking (Sentry)

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1
});
```

### 3. Performance Monitoring

```javascript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(metric)
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 4. Custom Dashboards

```yaml
# Grafana Dashboard Configuration
dashboards:
  - name: ACT Platform Overview
    panels:
      - title: Real-time Users
        query: SELECT count(*) FROM websocket_connections
      - title: Story Submissions
        query: SELECT count(*) FROM stories WHERE created_at > now() - interval '1 day'
      - title: API Response Time
        query: SELECT avg(response_time) FROM api_logs
      - title: Cache Hit Rate
        query: SELECT hits/(hits+misses)*100 FROM redis_stats
```

---

## 🔐 Security Hardening

### 1. API Security

```javascript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Helmet for security headers
import helmet from 'helmet';
app.use(helmet());
```

### 2. Database Security

```sql
-- Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories are viewable by everyone"
  ON stories FOR SELECT
  USING (published = true);

CREATE POLICY "Stories are editable by creators"
  ON stories FOR UPDATE
  USING (auth.uid() = storyteller_id);
```

### 3. Secret Management

```bash
# Use AWS Secrets Manager or GCP Secret Manager
aws secretsmanager create-secret \
  --name act-platform/production \
  --secret-string file://secrets.json

# Reference in application
const secrets = await secretsManager.getSecretValue({
  SecretId: 'act-platform/production'
}).promise();
```

---

## 🔄 Backup & Recovery

### 1. Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Point-in-time recovery setup
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://act-backups/wal/%f'
```

### 2. Disaster Recovery Plan

```yaml
recovery_plan:
  rpo: 1 hour  # Recovery Point Objective
  rto: 4 hours # Recovery Time Objective
  
  procedures:
    - database_restore:
        source: latest_backup
        verify: checksums
        test: staging_first
        
    - cache_rebuild:
        trigger: on_restore
        source: database
        
    - dns_failover:
        primary: australia-southeast1
        secondary: us-west1
        ttl: 60
```

---

## 🎯 Performance Optimization

### 1. Frontend Optimization

```javascript
// Code splitting
const LivingBrandPage = lazy(() => import('./pages/LivingBrand'));

// Image optimization
import { Image } from '@cloudinary/react';

<Image 
  publicId="story-image" 
  width="800" 
  crop="scale"
  quality="auto"
  fetchFormat="auto"
/>

// Bundle optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', '@radix-ui/react-*'],
          utils: ['lodash', 'date-fns']
        }
      }
    }
  }
});
```

### 2. Backend Optimization

```javascript
// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query optimization
const optimizedQuery = `
  SELECT s.*, 
         p.full_name as storyteller_name
  FROM stories s
  JOIN people p ON s.storyteller_id = p.id
  WHERE s.published = true
  ORDER BY s.created_at DESC
  LIMIT 10
`;

// Caching strategy
const cacheMiddleware = async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  const cached = await redis.get(key);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  res.sendResponse = res.json;
  res.json = (body) => {
    redis.set(key, JSON.stringify(body), 'EX', 300);
    res.sendResponse(body);
  };
  
  next();
};
```

---

## 📈 Scaling Strategy

### Horizontal Scaling

```yaml
kubernetes_deployment:
  replicas:
    min: 3
    max: 50
  
  autoscaling:
    metrics:
      - type: cpu
        target: 70%
      - type: memory
        target: 80%
      - type: custom
        metric: request_rate
        target: 1000
  
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

### Database Scaling

```sql
-- Partitioning for large tables
CREATE TABLE stories_2024 PARTITION OF stories
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Read replicas
CREATE PUBLICATION act_pub FOR ALL TABLES;
CREATE SUBSCRIPTION act_sub 
  CONNECTION 'host=replica.act.place dbname=act'
  PUBLICATION act_pub;
```

---

## ✅ Post-Deployment Checklist

### Immediate (First Hour)
- [ ] Verify all services are running
- [ ] Check error rates in monitoring
- [ ] Test critical user flows
- [ ] Verify WebSocket connections
- [ ] Check cache hit rates

### Short Term (First Day)
- [ ] Monitor performance metrics
- [ ] Review error logs
- [ ] Verify backup processes
- [ ] Test failover procedures
- [ ] Check SEO/meta tags

### Long Term (First Week)
- [ ] Analyze user behavior
- [ ] Review resource utilization
- [ ] Optimize slow queries
- [ ] Fine-tune caching
- [ ] Gather user feedback

---

## 🆘 Troubleshooting

### Common Issues

#### High Latency
```bash
# Check database queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# Check Redis
redis-cli --latency
```

#### Memory Issues
```bash
# Node.js memory
node --max-old-space-size=4096 server.js

# PM2 monitoring
pm2 monit
```

#### WebSocket Disconnections
```javascript
// Implement reconnection logic
const connectWebSocket = () => {
  ws = new WebSocket(wsUrl);
  
  ws.onclose = () => {
    setTimeout(connectWebSocket, 5000);
  };
};
```

---

## 📞 Support Contacts

- **Infrastructure**: devops@act.place
- **On-call**: +61 XXX XXX XXX
- **Escalation**: cto@act.place

## 📚 Additional Resources

- [Architecture Documentation](./Docs/Architecture/)
- [API Documentation](./api-docs/)
- [Runbook](./runbook.md)
- [Security Policies](./security.md)