# Multi-Site Development Framework Alignment Report

**Project:** ACT Placemat
**Date:** 2025-12-27
**Framework Reference:** ACT Farm and Regenerative Innovation Studio - Dev Hub Setup

## Executive Summary

The ACT Placemat codebase has an **excellent technical foundation** with strong service architecture and modern tooling, but requires strategic enhancements to align with the multi-site development framework outlined in the dev-hub-setup documentation.

**Current State:** Single shared backend serving multiple frontend apps without site isolation
**Target State:** Site-aware architecture with proper isolation, authentication, and orchestration
**Readiness:** 60% aligned - Strong foundation, needs site-awareness layer

---

## Critical Gaps Identified

### 🔴 Priority 1: Site Isolation & Identity

**Current:** All sites share same database tables and storage buckets without differentiation
**Required:** Site-specific data isolation with proper tenant boundaries

**Impact:** High - Data leakage risk, no access control between sites

**Action Items:**
1. Add `site_id` column to core tables (projects, media_items, contacts)
2. Implement storage bucket prefixes: `{site-id}/photos/`, `{site-id}/videos/`
3. Create site registry configuration
4. Add Row-Level Security policies with site context

---

### 🔴 Priority 2: Authentication & Authorization

**Current:** All auth middleware is pass-through (no authentication implemented)
**Required:** Site-aware authentication with API keys and JWT support

**Impact:** Critical - No security layer, APIs are publicly accessible

**Action Items:**
1. Implement site-specific API key validation
2. Add JWT authentication with site context
3. Create `site_api_keys` table for key management
4. Add rate limiting per site
5. Configure CORS policies per site

---

### 🟡 Priority 3: Environment Management

**Current:** Duplicate environment variables across apps/backend, apps/frontend, apps/webflow-portfolio
**Required:** Centralized configuration with site-specific overrides

**Impact:** Medium - Configuration drift, maintenance burden

**Action Items:**
1. Create `.env.shared` for common variables (Supabase, Notion, etc.)
2. Add environment validation on startup
3. Create `packages/site-config/` for site registry
4. Implement env sync tooling

---

### 🟡 Priority 4: API Consistency

**Current:** Mixed versioning (/api/, /api/v2/, /api/v3/) with no site awareness
**Required:** Consistent `/api/v1/{site-id}/endpoint` pattern

**Impact:** Medium - API confusion, difficult to maintain

**Action Items:**
1. Standardize on `/api/v1/{site-id}/` pattern
2. Add site detection middleware
3. Create API gateway layer for routing
4. Generate API documentation per site

---

## Detailed Analysis

### 1. Port Allocation Alignment

**Framework Requirements:**
```
ACT Hub (main): 3000
ACT Farm: 3001
JusticeHub: 3002
Empathy Ledger: 3003
The Harvest: 3004
Goods on Country: 3005
```

**Current ACT Placemat:**
```
Backend: 4000
Frontend Dashboard: 5174
Year in Review: 5175
```

**✅ Status:** Compatible - No conflicts with framework port allocation
**⚠️ Note:** Consider adding ACT Placemat to framework registry:
- Dashboard: 3006
- Year Review: 3007
- Backend: 4000 (shared services tier)

---

### 2. Shared Services Integration

**Framework Shared Services:**
- Redis Cache: `redis://192.168.0.34:6379`
- ChromaDB: `http://192.168.0.34:8000`

**Current ACT Placemat Services:**
- Supabase (PostgreSQL + Storage)
- Notion API
- Gmail API
- Google Cloud Vision
- Anthropic AI

**✅ Strengths:**
- Well-architected service abstraction layer
- `DatabaseManager` supports multiple database instances
- Clean service interfaces in `/core/src/services/`

**⚠️ Gaps:**
- Not using shared Redis cache
- Not integrated with ChromaDB for vector search
- Services are backend-specific, not NAS-shared

**Recommendations:**
1. Add Redis integration for shared caching across sites
2. Integrate ChromaDB for cross-project vector search
3. Create shared service discovery mechanism
4. Document service endpoints for framework registry

---

### 3. Database Architecture

**Current Structure:**
```sql
-- Single Supabase instance
-- Tables without site isolation:
projects
media_items
media_collections
storytellers
review_projects
contacts
opportunities
```

**Required Changes:**
```sql
-- Add site_id to all tables
ALTER TABLE projects ADD COLUMN site_id TEXT NOT NULL DEFAULT 'dashboard';
ALTER TABLE media_items ADD COLUMN site_id TEXT NOT NULL DEFAULT 'dashboard';
ALTER TABLE contacts ADD COLUMN site_id TEXT NOT NULL DEFAULT 'dashboard';

-- Create indexes
CREATE INDEX idx_projects_site_id ON projects(site_id);
CREATE INDEX idx_media_site_id ON media_items(site_id);

-- Add RLS policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_isolation ON projects
  USING (site_id = current_setting('app.current_site_id')::text);
```

**Migration Strategy:**
1. Add `site_id` columns with defaults
2. Backfill existing data with site identifiers
3. Enable RLS policies gradually
4. Update all queries to filter by site_id

---

### 4. Storage Organization

**Current:**
```
Bucket: photos/community/{filename}
Bucket: videos/stories/{filename}
Bucket: media/documents/{filename}
```

**Recommended Multi-Site:**
```
Bucket: photos/dashboard/community/{filename}
Bucket: photos/year-review/community/{filename}
Bucket: videos/dashboard/stories/{filename}
Bucket: videos/year-review/stories/{filename}
```

**Implementation:**
```javascript
// apps/backend/core/src/api/media.js
const getStorageConfig = (mimetype, siteId) => {
  if (mimetype.startsWith('image/')) {
    return {
      bucket: 'photos',
      folder: `${siteId}/community`,
      fullPath: `${siteId}/community/${fileName}`
    };
  }
  // ... similar for videos, documents
};
```

---

### 5. API Endpoint Migration

**Current Pattern:**
```javascript
// No site awareness
router.get('/api/media/items', async (req, res) => {
  const { data } = await supabase
    .from('media_items')
    .select('*');
  res.json(data);
});
```

**Recommended Pattern:**
```javascript
// Site-aware with middleware
router.get('/api/v1/:siteId/media/items',
  detectSite,
  requireAuth,
  async (req, res) => {
    const { siteId } = req.params;
    const { data } = await supabase
      .from('media_items')
      .select('*')
      .eq('site_id', siteId);
    res.json(data);
  }
);
```

**Middleware Implementation:**
```javascript
// apps/backend/core/src/middleware/site-detection.js
export const detectSite = (req, res, next) => {
  // Option 1: From URL parameter
  const siteId = req.params.siteId;

  // Option 2: From API key header
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const site = await validateAndGetSite(apiKey);
    req.site = site;
  }

  // Option 3: From JWT claims
  const user = req.user;
  if (user?.siteId) {
    req.site = { id: user.siteId };
  }

  // Validate site exists
  if (!VALID_SITES.includes(req.site?.id)) {
    return res.status(400).json({ error: 'Invalid site' });
  }

  // Set database context
  await supabase.rpc('set_config', {
    setting: 'app.current_site_id',
    value: req.site.id
  });

  next();
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) 🔧

**Goal:** Create site configuration infrastructure

**Tasks:**
1. ✅ Create `packages/site-config/` package
   ```javascript
   // packages/site-config/index.js
   export const SITES = {
     dashboard: {
       id: 'dashboard',
       name: 'ACT Dashboard',
       port: 5174,
       domains: ['dashboard.act.org', 'localhost:5174'],
       apiPrefix: '/api/v1/dashboard'
     },
     yearReview: {
       id: 'year-review',
       name: 'Year in Review',
       port: 5175,
       domains: ['review.act.org', 'localhost:5175'],
       apiPrefix: '/api/v1/year-review'
     }
   };
   ```

2. ✅ Create shared environment template
   ```bash
   # .env.shared
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=xxx
   NOTION_TOKEN=xxx
   GMAIL_CLIENT_ID=xxx
   # ... other shared vars
   ```

3. ✅ Add environment validation script
   ```javascript
   // tools/env/validate.js
   import { REQUIRED_VARS } from '@act/site-config';
   validateEnv(REQUIRED_VARS);
   ```

**Deliverables:**
- Site configuration package
- Shared .env template
- Env validation tooling
- Updated documentation

---

### Phase 2: Security Layer (Week 2) 🔐

**Goal:** Implement authentication and authorization

**Tasks:**
1. ✅ Create site API keys table
   ```sql
   CREATE TABLE site_api_keys (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     site_id text NOT NULL REFERENCES sites(id),
     api_key text UNIQUE NOT NULL,
     permissions jsonb DEFAULT '[]'::jsonb,
     rate_limit_per_hour integer DEFAULT 1000,
     is_active boolean DEFAULT true,
     created_at timestamptz DEFAULT now(),
     last_used_at timestamptz
   );
   ```

2. ✅ Implement authentication middleware
   ```javascript
   // middleware/auth.js
   export const requireAuth = async (req, res, next) => {
     const apiKey = req.headers['x-api-key'];
     if (!apiKey) {
       return res.status(401).json({ error: 'Missing API key' });
     }

     const { data: keyData } = await supabase
       .from('site_api_keys')
       .select('*, sites(*)')
       .eq('api_key', apiKey)
       .eq('is_active', true)
       .single();

     if (!keyData) {
       return res.status(401).json({ error: 'Invalid API key' });
     }

     req.site = keyData.sites;
     req.apiKey = keyData;
     next();
   };
   ```

3. ✅ Add rate limiting
   ```javascript
   // middleware/rate-limit.js
   import rateLimit from 'express-rate-limit';

   export const siteLimiter = rateLimit({
     windowMs: 60 * 60 * 1000, // 1 hour
     max: async (req) => req.apiKey?.rate_limit_per_hour || 100,
     keyGenerator: (req) => req.site?.id || req.ip
   });
   ```

4. ✅ Configure CORS per site
   ```javascript
   // middleware/cors.js
   const siteOrigins = {
     'dashboard': ['http://localhost:5174', 'https://dashboard.act.org'],
     'year-review': ['http://localhost:5175', 'https://review.act.org']
   };

   app.use((req, res, next) => {
     const origin = req.headers.origin;
     const site = determineSite(origin);
     if (site && siteOrigins[site].includes(origin)) {
       res.setHeader('Access-Control-Allow-Origin', origin);
     }
     next();
   });
   ```

**Deliverables:**
- Authentication system
- API key management
- Rate limiting per site
- CORS configuration

---

### Phase 3: Data Isolation (Week 3) 🗄️

**Goal:** Add site-level data separation

**Tasks:**
1. ✅ Database migration - Add site_id columns
   ```sql
   -- Migration: 20251227_add_site_id.sql
   -- Add site_id to all tables
   ALTER TABLE projects ADD COLUMN site_id TEXT;
   ALTER TABLE media_items ADD COLUMN site_id TEXT;
   ALTER TABLE contacts ADD COLUMN site_id TEXT;
   ALTER TABLE opportunities ADD COLUMN site_id TEXT;

   -- Backfill existing data
   UPDATE projects SET site_id = 'dashboard' WHERE site_id IS NULL;
   UPDATE media_items SET site_id = 'dashboard' WHERE site_id IS NULL;

   -- Make non-nullable after backfill
   ALTER TABLE projects ALTER COLUMN site_id SET NOT NULL;
   ALTER TABLE media_items ALTER COLUMN site_id SET NOT NULL;

   -- Add indexes
   CREATE INDEX idx_projects_site_id ON projects(site_id);
   CREATE INDEX idx_media_items_site_id ON media_items(site_id);
   ```

2. ✅ Update storage paths
   ```javascript
   // services/storage.js
   export class SiteAwareStorage {
     getPath(siteId, bucket, folder, filename) {
       return `${siteId}/${folder}/${filename}`;
     }

     async upload(siteId, file, options) {
       const path = this.getPath(siteId, options.bucket, options.folder, file.name);
       return supabase.storage
         .from(options.bucket)
         .upload(path, file);
     }
   }
   ```

3. ✅ Add RLS policies
   ```sql
   -- Enable RLS
   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
   ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

   -- Site isolation policy
   CREATE POLICY site_isolation_policy ON projects
     FOR ALL
     USING (site_id = current_setting('app.current_site_id', true)::text);

   CREATE POLICY site_isolation_policy ON media_items
     FOR ALL
     USING (site_id = current_setting('app.current_site_id', true)::text);
   ```

4. ✅ Update all API queries
   ```javascript
   // Before
   const { data } = await supabase.from('projects').select('*');

   // After
   const { data } = await supabase
     .from('projects')
     .select('*')
     .eq('site_id', req.site.id);
   ```

**Deliverables:**
- Database migrations
- Site-isolated storage
- RLS policies active
- Updated API queries

---

### Phase 4: Developer Experience (Week 4) 🛠️

**Goal:** Tooling and documentation

**Tasks:**
1. ✅ Create deployment orchestration
   ```json
   // deploy-config.json
   {
     "sites": {
       "dashboard": {
         "platform": "vercel",
         "project": "act-dashboard-prod",
         "buildCommand": "npm run build",
         "envFile": ".env.production"
       },
       "yearReview": {
         "platform": "vercel",
         "project": "act-year-review-prod"
       },
       "backend": {
         "platform": "railway",
         "service": "act-backend-prod",
         "dockerfile": "Dockerfile"
       }
     }
   }
   ```

2. ✅ Add CI/CD workflows
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy All Sites
   on:
     push:
       branches: [main]
   jobs:
     deploy-backend:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy to Railway
           run: railway up

     deploy-dashboard:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy to Vercel
           run: vercel deploy --prod
   ```

3. ✅ Generate API documentation
   ```javascript
   // tools/docs/generate-api-docs.js
   import { generateDocs } from 'express-swagger-generator';

   generateDocs({
     sites: ['dashboard', 'year-review'],
     outputDir: 'docs/api'
   });
   ```

4. ✅ Create developer guide
   ```markdown
   # Multi-Site Development Guide

   ## Adding a New Site
   1. Register in packages/site-config
   2. Create API key in site_api_keys table
   3. Configure CORS origins
   4. Add deployment config
   5. Generate API docs
   ```

**Deliverables:**
- Deployment scripts
- CI/CD pipelines
- API documentation
- Developer guides

---

## Integration with Framework

### Dev Hub Integration

**Add ACT Placemat to dev-servers.js:**
```javascript
// In ACT Farm/dev-servers.js
const servers = [
  {
    name: 'ACT Hub',
    port: 3000,
    path: './',
    command: 'npm run dev'
  },
  // ... other sites ...
  {
    name: 'ACT Placemat - Backend',
    port: 4000,
    path: '../ACT Placemat/apps/backend',
    command: 'npm start'
  },
  {
    name: 'ACT Dashboard',
    port: 3006,
    path: '../ACT Placemat/apps/frontend',
    command: 'PORT=3006 npm run dev'
  },
  {
    name: 'Year in Review',
    port: 3007,
    path: '../ACT Placemat/apps/webflow-portfolio',
    command: 'PORT=3007 npm run dev'
  }
];
```

### Shared Services Usage

**Connect to NAS services:**
```javascript
// apps/backend/.env
REDIS_URL=redis://192.168.0.34:6379
CHROMADB_URL=http://192.168.0.34:8000

// apps/backend/core/src/services/cache.js
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL);

// Cross-site caching
export async function getCachedProjectData(siteId, projectId) {
  const key = `${siteId}:project:${projectId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetchProjectData(projectId);
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
```

---

## Success Metrics

**After alignment, the codebase should achieve:**

✅ **Site Isolation**
- [ ] All database tables have site_id columns
- [ ] RLS policies enforce site boundaries
- [ ] Storage uses site-specific paths
- [ ] Zero data leakage between sites

✅ **Security**
- [ ] All API endpoints require authentication
- [ ] Site-specific API keys implemented
- [ ] Rate limiting per site active
- [ ] CORS properly configured

✅ **Developer Experience**
- [ ] One command starts all sites
- [ ] Clear documentation per site
- [ ] CI/CD for all deployments
- [ ] API docs auto-generated

✅ **Framework Integration**
- [ ] Compatible with dev-hub port allocation
- [ ] Uses shared NAS services (Redis, ChromaDB)
- [ ] Registered in framework site registry
- [ ] Follows framework patterns

---

## Maintenance & Monitoring

### Ongoing Tasks

**Weekly:**
- [ ] Review API key usage and rate limits
- [ ] Check site isolation policies
- [ ] Monitor cross-site performance

**Monthly:**
- [ ] Audit site access logs
- [ ] Review and rotate API keys
- [ ] Update framework documentation
- [ ] Validate RLS policy effectiveness

**Quarterly:**
- [ ] Security audit of multi-site setup
- [ ] Performance optimization
- [ ] Framework alignment review

---

## Conclusion

The ACT Placemat codebase is **well-positioned** for multi-site development with:
- ✅ Strong service architecture
- ✅ Modern tech stack (Express, Supabase, Next.js)
- ✅ Clean separation of concerns
- ✅ Excellent documentation foundation

**Next immediate action:** Implement Phase 1 (Foundation) to create site configuration infrastructure, then proceed with security and data isolation in subsequent phases.

**Timeline:** 4 weeks to full alignment
**Effort:** ~80-120 hours total
**Risk:** Low - Changes are additive, not breaking

The framework alignment will enable:
- Secure multi-tenant architecture
- Scalable site management
- Unified development experience
- Production-ready deployment
