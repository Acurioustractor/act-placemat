# 🚀 ACT Perfect System - Production Deployment Guide

## Executive Summary

The ACT Perfect System is a world-class, AI-powered community platform that automatically learns, predicts, and evolves with your organization. This guide provides step-by-step instructions for deploying the system to production.

---

## 🎯 System Overview

### Core Features
- **Universal Intelligence**: Multi-source knowledge aggregation with AI analysis
- **Real-time Updates**: WebSocket connections for instant data flow
- **Multi-Provider AI**: 6 providers with intelligent fallback
- **Pattern Detection**: ML-powered insights and predictions
- **Automated Sync**: Continuous Notion and data synchronization
- **Living Platform**: Self-updating content and metrics

### Architecture Components
```
┌─────────────────────────────────────────┐
│         User Interface Layer            │
│  • Living Brand Page                    │
│  • Perfect System Dashboard             │
│  • Business Intelligence                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Application Services Layer         │
│  • Universal Platform API               │
│  • WebSocket Server                     │
│  • Content Generation                   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     Intelligence Services Layer         │
│  • Universal Intelligence Orchestrator  │
│  • Multi-Provider AI System            │
│  • Intelligent Insights Engine         │
│  • Pattern Detection & Predictions     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Data Services Layer            │
│  • Notion Sync Engine                  │
│  • Supabase PostgreSQL                 │
│  • Redis Cache                         │
│  • Gmail Integration                   │
└─────────────────────────────────────────┘
```

---

## 📋 Pre-Deployment Checklist

### Required Services
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database (Supabase)
- [ ] Redis server (optional but recommended)
- [ ] Domain name with SSL certificate
- [ ] Server with 4GB+ RAM

### Required API Keys
- [ ] `NOTION_API_KEY` - Notion integration
- [ ] `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` - Database
- [ ] At least ONE AI provider key:
  - [ ] `ANTHROPIC_API_KEY` (Recommended)
  - [ ] `OPENAI_API_KEY`
  - [ ] `GROQ_API_KEY`
  - [ ] `GOOGLE_API_KEY`
  - [ ] `OPENROUTER_API_KEY`
  - [ ] `TOGETHER_API_KEY`

### Optional Integrations
- [ ] `GMAIL_USER` & `GMAIL_APP_PASSWORD` - Email intelligence
- [ ] `XERO_CLIENT_ID` & `XERO_CLIENT_SECRET` - Financial data
- [ ] `LINKEDIN_TOKEN` - Network analysis
- [ ] `PERPLEXITY_API_KEY` - Research capabilities

---

## 🛠️ Deployment Steps

### Step 1: Clone and Setup

```bash
# Clone repository
git clone https://github.com/act/perfect-system.git
cd perfect-system

# Install dependencies
npm install

# Install backend dependencies
cd apps/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ../..
```

### Step 2: Environment Configuration

Create `.env` files:

**Backend (.env)**
```bash
# apps/backend/.env
NODE_ENV=production

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# AI Providers (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
GOOGLE_API_KEY=your_google_key
OPENROUTER_API_KEY=your_openrouter_key
TOGETHER_API_KEY=your_together_key

# Notion
NOTION_API_KEY=your_notion_key
NOTION_DATABASE_IDS={
  "projects": "your_projects_db_id",
  "people": "your_people_db_id",
  "stories": "your_stories_db_id"
}

# Optional
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
REDIS_URL=redis://localhost:6379
```

**Frontend (.env)**
```bash
# apps/frontend/.env
VITE_API_URL=https://api.yourdomain.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3: Database Setup

```sql
-- Run in Supabase SQL editor
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notion_id TEXT UNIQUE,
  name TEXT,
  description TEXT,
  status TEXT,
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notion_id TEXT UNIQUE,
  name TEXT,
  email TEXT,
  role TEXT,
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notion_id TEXT UNIQUE,
  title TEXT,
  content TEXT,
  impact_metrics JSONB,
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON people FOR SELECT USING (true);
CREATE POLICY "Public read access" ON stories FOR SELECT USING (true);
```

### Step 4: Build for Production

```bash
# Build frontend
cd apps/frontend
npm run build

# The backend runs directly from source
cd ../..
```

### Step 5: Deploy with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd apps/backend
pm2 start ecosystem.config.js --env production

# Serve frontend with nginx or PM2
pm2 serve ../frontend/dist 5173 --spa --name "act-frontend"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 6: Nginx Configuration

```nginx
# /etc/nginx/sites-available/act-platform
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /live {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Step 7: Enable and Start Services

```bash
# Enable nginx site
sudo ln -s /etc/nginx/sites-available/act-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Check PM2 services
pm2 status
pm2 logs
```

---

## 🔍 Verification Steps

### 1. Test Core Services
```bash
# Run quick test suite
node test-perfect-system-quick.js

# Check individual endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/api/platform/status
```

### 2. Monitor Services
```bash
# View logs
pm2 logs act-backend
pm2 logs act-frontend

# Monitor resources
pm2 monit
```

### 3. Access Dashboard
- Open: `https://yourdomain.com/dashboard`
- Check service health indicators
- Verify WebSocket connection (should show "Live")
- Review AI provider status

---

## 📊 Performance Optimization

### Caching Strategy
```javascript
// Redis configuration for optimal performance
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  lazyConnect: true
});
```

### Database Indexing
```sql
-- Optimize query performance
CREATE INDEX idx_projects_notion_id ON projects(notion_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_people_email ON people(email);
```

### CDN Configuration
- Static assets: Use Cloudflare or AWS CloudFront
- API caching: Configure edge caching for read endpoints
- WebSocket: Ensure CDN bypasses WebSocket connections

---

## 🛡️ Security Hardening

### Environment Variables
```bash
# Never commit .env files
echo ".env" >> .gitignore
echo "apps/**/.env" >> .gitignore

# Use secrets management
# AWS Secrets Manager, HashiCorp Vault, or dotenv-vault
```

### Rate Limiting
```javascript
// Already configured in server-enhanced.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
```

### CORS Configuration
```javascript
// Restrict to your domains only
const allowedOrigins = [
  'https://yourdomain.com',
  'https://www.yourdomain.com'
];
```

---

## 📈 Monitoring & Alerts

### Health Checks
```bash
# Setup uptime monitoring
curl https://yourdomain.com/health

# Expected response:
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-01-20T12:00:00Z"
}
```

### Error Tracking
- Sentry: Add `@sentry/node` for error tracking
- LogRocket: Frontend session replay
- DataDog: Infrastructure monitoring

### Metrics to Monitor
- API response times (<200ms target)
- WebSocket connections (track active users)
- AI provider success rates (>95% target)
- Sync completion times (<10s target)
- Cache hit rates (>90% target)

---

## 🔄 Backup & Recovery

### Database Backups
```bash
# Daily automated backups
0 2 * * * pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Supabase automatic backups
# Enable in Supabase dashboard > Settings > Backups
```

### Application Backups
```bash
# Backup configuration and data
tar -czf act-backup-$(date +%Y%m%d).tar.gz \
  apps/backend/.env \
  apps/frontend/.env \
  pm2.config.js \
  nginx.conf
```

---

## 🚨 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check logs
pm2 logs --lines 100

# Verify environment variables
pm2 env 0

# Restart services
pm2 restart all
```

#### WebSocket Connection Failed
```bash
# Check nginx configuration
sudo nginx -t

# Verify WebSocket upgrade headers
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://yourdomain.com/live
```

#### AI Providers Failing
```bash
# Test individual providers
curl http://localhost:4000/api/platform/status

# Check API key validity
node -e "console.log(process.env.ANTHROPIC_API_KEY?.slice(0,10))"
```

---

## 📞 Support Resources

### Documentation
- System Architecture: `/Docs/Architecture/`
- API Reference: `/api-docs/`
- Troubleshooting: `/Docs/Guides/Troubleshooting/`

### Getting Help
- GitHub Issues: https://github.com/act/perfect-system/issues
- Community Forum: https://community.act.place
- Email Support: support@act.place

### Monitoring Dashboard
- Production: https://yourdomain.com/dashboard
- Staging: https://staging.yourdomain.com/dashboard
- Local: http://localhost:5173/dashboard

---

## 🎉 Launch Checklist

Before going live:

- [ ] All tests passing (>80% pass rate)
- [ ] SSL certificates installed
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Rate limiting active
- [ ] CORS configured
- [ ] Environment variables secured
- [ ] Database indexed
- [ ] CDN configured
- [ ] Error tracking enabled
- [ ] Team trained on system
- [ ] Documentation complete
- [ ] Support channels ready

---

## 🌟 Post-Launch

### Week 1
- Monitor system metrics closely
- Gather user feedback
- Address any critical issues
- Optimize slow queries

### Month 1
- Analyze usage patterns
- Refine AI model selections
- Optimize caching strategies
- Plan feature enhancements

### Ongoing
- Regular security updates
- Performance optimization
- Feature development
- Community engagement

---

**Congratulations! Your ACT Perfect System is now deployed and operational! 🚀**

The platform will continue to learn and improve as more data flows through the system. Monitor the dashboard regularly and enjoy watching your community grow with the power of AI-driven insights.

---

*Version 1.0.0 | Last Updated: January 2024*