# ACT Placemat - Ecosystem Integration Strategy

**Date:** 2025-12-27
**Purpose:** Comprehensive strategy for aligning ACT Placemat with the ACT Farm multi-site development framework
**Framework Docs:**
- `dev-hub-setup.md` - Multi-project orchestration
- `cross-codebase-best-practices.md` - Type safety and API contracts
- `env-management.md` - Environment variable standards
- `vscode-setup.md` - Development workspace setup

---

## Executive Summary

ACT Placemat needs strategic alignment with the established ACT ecosystem patterns while maintaining its unique backend services role. This document provides the **right method** for integration based on proven patterns across ACT Farm, Empathy Ledger, JusticeHub, and The Harvest.

### Current State vs Framework

**ACT Placemat Today:**
- ❌ Not in orchestrator port allocation
- ❌ Doesn't follow shared types pattern
- ❌ Environment vars duplicated, not centralized
- ❌ Not in VSCode workspace
- ❌ No API versioning strategy
- ✅ Has excellent service architecture
- ✅ Modern tech stack (Next.js, Supabase, Express)

**After Integration:**
- ✅ Registered ports: Backend (4000), Frontend (3006), Year Review (3007)
- ✅ Shared types source of truth (ACT Main Website pattern)
- ✅ Environment vault integration
- ✅ VSCode workspace included
- ✅ API v1 consistency
- ✅ Maintains service excellence

---

## The Right Method: Hybrid Integration Approach

Based on the ecosystem documentation, ACT Placemat should follow a **hybrid integration** model:

### 1. Shared Types: Consumer-Driven Pattern

**Principle from cross-codebase-best-practices.md:**
> "ACT Main Website is the source of truth for all shared types. It's the consumer of APIs, so it defines what it expects to receive."

**Application to ACT Placemat:**

```
┌─────────────────────────────────────────────────┐
│  ACT Main Website (Source of Truth)            │
│  /src/types/shared/                             │
│  ├── act-projects.ts                            │
│  ├── year-in-review.ts        ← NEW            │
│  ├── media-library.ts         ← NEW            │
│  └── backend-services.ts      ← NEW            │
└──────────────┬──────────────────────────────────┘
               │
               │ Copy types (one-way sync)
               ↓
┌─────────────────────────────────────────────────┐
│  ACT Placemat (API Provider + Consumer)        │
│  /packages/shared-types/    ← SYNCED FROM ACT  │
│  ├── act-projects.ts                            │
│  ├── year-in-review.ts                          │
│  ├── media-library.ts                           │
│  └── backend-services.ts                        │
└─────────────────────────────────────────────────┘
               │
               │ Provides APIs
               ↓
┌─────────────────────────────────────────────────┐
│  Consuming Sites                                │
│  - ACT Main Website                             │
│  - Empathy Ledger                               │
│  - JusticeHub                                   │
│  - The Harvest                                  │
└─────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// 1. Define in ACT Main Website: /src/types/shared/year-in-review.ts
/**
 * Year in Review API Types
 * Source of Truth: ACT Main Website
 * Provider: ACT Placemat
 * Last Updated: 2025-12-27
 */

export namespace YearInReviewAPI {
  export interface GetTimelineRequest {
    year: number;
    season?: 'planting' | 'growing' | 'harvesting' | 'resting';
  }

  export interface GetTimelineResponse {
    entries: TimelineEntry[];
    featured_projects: FeaturedProject[];
    meta: {
      total_entries: number;
      seasons: Season[];
    };
  }

  export interface TimelineEntry {
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'project' | 'milestone' | 'partnership';
    media_url?: string;
    project_id?: string;
  }
}

// 2. Copy to ACT Placemat: /packages/shared-types/year-in-review.ts
// (Exact copy from ACT Website, with sync timestamp)

// 3. Implement in ACT Placemat: /apps/backend/core/src/api/v1/year-in-review/route.ts
import { YearInReviewAPI } from '@act/shared-types';

export async function GET(
  req: Request
): Promise<Response<YearInReviewAPI.GetTimelineResponse>> {
  // Implementation with type safety
}
```

---

### 2. Environment Management: Vault Pattern

**Principle from env-management.md:**
> "Use centralized template repository with .env-vault/ for actual secrets"

**ACT Placemat Integration:**

```bash
# ACT Farm and Regenerative Innovation Studio/
├── .env-vault/                    # GITIGNORED - actual secrets
│   ├── the-harvest.env.local
│   ├── act-farm.env.local
│   ├── empathy-ledger.env.local
│   ├── justicehub.env.local
│   ├── placemat-backend.env.local    ← NEW
│   ├── placemat-frontend.env.local   ← NEW
│   └── placemat-yearreview.env.local ← NEW
│
├── .env-templates/
│   ├── SHARED.env                # Redis, ChromaDB, Resend
│   ├── placemat-backend.env.template
│   ├── placemat-frontend.env.template
│   └── placemat-yearreview.env.template
│
└── scripts/
    ├── sync-env.sh               # Updated to include Placemat
    └── validate-env.sh           # Updated validation rules
```

**Shared Variables (Auto-Injected):**

```bash
# .env-templates/SHARED.env
REDIS_URL=redis://192.168.0.34:6379
CHROMADB_URL=http://192.168.0.34:8000
RESEND_API_KEY=re_[shared_key]
```

**Placemat-Specific Variables:**

```bash
# .env-vault/placemat-backend.env.local
# Supabase (ACT Placemat project)
SUPABASE_URL=https://tednluwflfhxyucgwigh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[secret]

# Notion API
NOTION_TOKEN=[secret]

# Gmail API
GMAIL_CLIENT_ID=[secret]
GMAIL_CLIENT_SECRET=[secret]

# AI Services
ANTHROPIC_API_KEY=[secret]
OPENAI_API_KEY=[secret]

# GoHighLevel (if ACT Placemat needs CRM)
GHL_API_KEY=[secret]
GHL_LOCATION_ID=[secret]
```

**Why This Pattern:**
- ✅ Matches ecosystem standard
- ✅ Secrets never in git
- ✅ Easy sync across all apps
- ✅ Centralized backup location
- ✅ Validation scripts catch missing vars

---

### 3. Port Allocation: Orchestrator Integration

**Principle from dev-hub-setup.md:**
> "One command starts everything - all ACT projects running simultaneously"

**Updated Port Allocation:**

```javascript
// ACT Farm/dev-servers.mjs
const servers = [
  {
    name: 'ACT Hub',
    port: 3000,
    path: '/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio',
    command: 'npm run dev'
  },
  {
    name: 'ACT Farm',
    port: 3001,
    path: '/Users/benknight/Code/ACT Farm/act-farm',
    command: 'PORT=3001 npm run dev'
  },
  {
    name: 'JusticeHub',
    port: 3002,
    path: '/Users/benknight/Code/JusticeHub',
    command: 'PORT=3002 npm run dev'
  },
  {
    name: 'Empathy Ledger',
    port: 3005,
    path: '/Users/benknight/Code/Empathy Ledger v.02',
    command: 'npm run dev'
  },
  {
    name: 'The Harvest',
    port: 3004,
    path: '/Users/benknight/Code/The Harvest',
    command: 'PORT=3004 npm run dev'
  },
  // ========== ACT PLACEMAT INTEGRATION ==========
  {
    name: 'ACT Placemat - Backend',
    port: 4000,
    path: '/Users/benknight/Code/ACT Placemat/apps/backend',
    command: 'PORT=4000 npm start',
    tier: 'shared-services', // Backend tier
    env: {
      REDIS_URL: 'redis://192.168.0.34:6379',
      CHROMADB_URL: 'http://192.168.0.34:8000'
    }
  },
  {
    name: 'ACT Dashboard',
    port: 3006,
    path: '/Users/benknight/Code/ACT Placemat/apps/frontend',
    command: 'PORT=3006 npm run dev',
    env: {
      VITE_API_URL: 'http://localhost:4000'
    }
  },
  {
    name: 'Year in Review',
    port: 3007,
    path: '/Users/benknight/Code/ACT Placemat/apps/webflow-portfolio',
    command: 'PORT=3007 npm run dev',
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:4000'
    }
  },
  {
    name: 'Dashboard Monitor',
    port: 3999,
    path: '/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio',
    command: 'npm run dashboard'
  }
];
```

**Port Summary Table:**

| Project | Port | Role | Tier |
|---------|------|------|------|
| ACT Hub | 3000 | Main website | T1 |
| ACT Farm | 3001 | Production site | T1 |
| JusticeHub | 3002 | Platform | T2 |
| The Harvest | 3004 | Production site | T1 |
| Empathy Ledger | 3005 | Platform | T2 |
| **ACT Dashboard** | **3006** | **Admin frontend** | **T3** |
| **Year in Review** | **3007** | **Public site** | **T1** |
| Dashboard Monitor | 3999 | Dev tools | T3 |
| **Placemat Backend** | **4000** | **Shared services** | **Services** |

---

### 4. API Versioning: v1 Standard

**Principle from cross-codebase-best-practices.md:**
> "Use URL versioning (/api/v1/) for all public APIs"

**Current ACT Placemat API Structure:**

```
❌ /api/real/projects
❌ /api/year-in-review/:year
❌ /api/media/items
❌ /api/v2/direction/scorecard
❌ /api/v3/some-endpoint
```

**Standardized v1 Structure:**

```
✅ /api/v1/projects
✅ /api/v1/year-in-review/:year
✅ /api/v1/media/items
✅ /api/v1/direction/scorecard
```

**Implementation Strategy:**

```typescript
// Phase 1: Add v1 routes (non-breaking)
// apps/backend/server.js

// NEW v1 routes
import projectsV1 from './core/src/api/v1/projects.js';
import yearInReviewV1 from './core/src/api/v1/year-in-review.js';
import mediaV1 from './core/src/api/v1/media.js';

app.use('/api/v1/projects', projectsV1);
app.use('/api/v1/year-in-review', yearInReviewV1);
app.use('/api/v1/media', mediaV1);

// LEGACY routes (keep for 1 release cycle)
app.use('/api/real', legacyProjectsRouter);
app.use('/api/year-in-review', legacyYearReviewRouter);
app.use('/api/media', legacyMediaRouter);

// Add deprecation warnings
app.use((req, res, next) => {
  if (req.path.startsWith('/api/real') ||
      req.path.startsWith('/api/media') && !req.path.startsWith('/api/v1')) {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Migration-Guide', 'https://docs.act.org/api-v1-migration');
    console.warn(`[DEPRECATED] ${req.method} ${req.path} - Migrate to /api/v1/`);
  }
  next();
});

// Phase 2: Update all consumers to use v1
// Phase 3: Remove legacy routes after 1 release
```

---

### 5. VSCode Workspace: Multi-Project Integration

**Principle from vscode-setup.md:**
> "One VSCode window with ALL projects"

**Updated Workspace Configuration:**

```json
// ACT Farm and Regenerative Innovation Studio/ACT-Workspace.code-workspace
{
  "folders": [
    {
      "name": "🏠 ACT Farm",
      "path": "../ACT Farm/act-farm"
    },
    {
      "name": "⚖️ JusticeHub",
      "path": "../JusticeHub"
    },
    {
      "name": "💚 Empathy Ledger",
      "path": "../Empathy Ledger v.02"
    },
    {
      "name": "🌾 The Harvest",
      "path": "../The Harvest"
    },
    // ========== ACT PLACEMAT FOLDERS ==========
    {
      "name": "🗂️ Placemat - Backend",
      "path": "../ACT Placemat/apps/backend"
    },
    {
      "name": "📊 Placemat - Dashboard",
      "path": "../ACT Placemat/apps/frontend"
    },
    {
      "name": "📅 Placemat - Year Review",
      "path": "../ACT Placemat/apps/webflow-portfolio"
    },
    // ========================================
    {
      "name": "🎛️ Dev Hub",
      "path": "."
    }
  ],
  "settings": {
    "editor.formatOnSave": true,
    "typescript.tsdk": "node_modules/typescript/lib",
    "files.exclude": {
      "**/node_modules": true,
      "**/.next": true,
      "**/dist": true
    }
  },
  "launch": {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "▶️ ACT Farm (3001)",
        "type": "node-terminal",
        "request": "launch",
        "command": "PORT=3001 npm run dev",
        "cwd": "${workspaceFolder:🏠 ACT Farm}"
      },
      // ... other existing configs ...
      // ========== ACT PLACEMAT CONFIGS ==========
      {
        "name": "▶️ Placemat Backend (4000)",
        "type": "node-terminal",
        "request": "launch",
        "command": "PORT=4000 npm start",
        "cwd": "${workspaceFolder:🗂️ Placemat - Backend}"
      },
      {
        "name": "▶️ Placemat Dashboard (3006)",
        "type": "node-terminal",
        "request": "launch",
        "command": "PORT=3006 npm run dev",
        "cwd": "${workspaceFolder:📊 Placemat - Dashboard}",
        "env": {
          "VITE_API_URL": "http://localhost:4000"
        }
      },
      {
        "name": "▶️ Year in Review (3007)",
        "type": "node-terminal",
        "request": "launch",
        "command": "PORT=3007 npm run dev",
        "cwd": "${workspaceFolder:📅 Placemat - Year Review}",
        "env": {
          "NEXT_PUBLIC_API_URL": "http://localhost:4000"
        }
      },
      // ========================================
      {
        "name": "🎯 Start All Projects",
        "type": "compound",
        "configurations": [
          "▶️ ACT Farm (3001)",
          "▶️ JusticeHub (3002)",
          "▶️ Empathy Ledger (3005)",
          "▶️ The Harvest (3004)",
          "▶️ Placemat Backend (4000)",
          "▶️ Placemat Dashboard (3006)",
          "▶️ Year in Review (3007)"
        ]
      }
    ]
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) ⚡

**Goal:** Integrate ACT Placemat into ecosystem infrastructure

#### Task 1.1: Create Shared Types Package

```bash
# 1. Create package structure in ACT Placemat
mkdir -p "/Users/benknight/Code/ACT Placemat/packages/shared-types"

# 2. Initialize package.json
cat > "/Users/benknight/Code/ACT Placemat/packages/shared-types/package.json" <<'EOF'
{
  "name": "@act/shared-types",
  "version": "1.0.0",
  "description": "Shared TypeScript types for ACT Placemat APIs",
  "main": "index.ts",
  "types": "index.ts",
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF

# 3. Copy types from ACT Website (when defined there)
# Source of truth: ACT Farm and Regenerative Innovation Studio/src/types/shared/
```

#### Task 1.2: Set Up Environment Vault

```bash
# 1. Create vault structure
cd "/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio"
mkdir -p .env-vault .env-templates/placemat

# 2. Gitignore vault
echo ".env-vault/" >> .gitignore

# 3. Copy existing Placemat env files to vault
cp "/Users/benknight/Code/ACT Placemat/apps/backend/.env" \
   ".env-vault/placemat-backend.env.local"

# 4. Create templates
cp "/Users/benknight/Code/ACT Placemat/apps/frontend/.env.example" \
   ".env-templates/placemat/frontend.env.template"

cp "/Users/benknight/Code/ACT Placemat/apps/webflow-portfolio/.env.local.example" \
   ".env-templates/placemat/year-review.env.template"
```

#### Task 1.3: Update Orchestrator

```bash
# 1. Edit dev-servers.mjs
# Add ACT Placemat servers (see port allocation above)

# 2. Update port allocation docs
# Edit docs/development/dev-hub-setup.md

# 3. Test orchestrator
npm start
# Should start all 8 servers including Placemat
```

#### Task 1.4: Update VSCode Workspace

```bash
# 1. Edit ACT-Workspace.code-workspace
# Add ACT Placemat folders and launch configs

# 2. Test workspace
open ACT-Workspace.code-workspace
# Should show all 8 folders in sidebar
```

**Deliverables:**
- ✅ Shared types package structure
- ✅ Environment vault with Placemat files
- ✅ Orchestrator includes Placemat
- ✅ VSCode workspace updated

---

### Phase 2: API Standardization (Week 2) 🔧

**Goal:** Align Placemat APIs with ecosystem v1 pattern

#### Task 2.1: Create v1 API Structure

```bash
# 1. Create v1 directory structure
mkdir -p "/Users/benknight/Code/ACT Placemat/apps/backend/core/src/api/v1"

# 2. Create v1 routes following ecosystem pattern
```

```typescript
// apps/backend/core/src/api/v1/projects.ts
import { Router } from 'express';
import type { ACTProjectsAPI } from '@act/shared-types';

const router = Router();

/**
 * GET /api/v1/projects
 * Returns all ACT projects
 * Type-safe response matching shared types
 */
router.get('/', async (req, res): Promise<ACTProjectsAPI.ListResponse> => {
  // Implementation with runtime validation
  const projects = await getProjects();

  // Validate response matches type
  if (!isValidProjectsResponse(projects)) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json(projects);
});

export default router;
```

#### Task 2.2: Add Runtime Validation

```typescript
// apps/backend/core/src/api/v1/validators.ts
import type { ACTProjectsAPI } from '@act/shared-types';

export function isValidProjectsResponse(
  data: any
): data is ACTProjectsAPI.ListResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.projects) &&
    typeof data.total === 'number'
  );
}
```

#### Task 2.3: Deprecate Legacy Routes

```typescript
// apps/backend/server.js

// Add deprecation middleware
import { deprecationWarning } from './core/src/middleware/deprecation.js';

app.use('/api/real', deprecationWarning('/api/v1/projects'));
app.use('/api/year-in-review', deprecationWarning('/api/v1/year-in-review'));
```

**Deliverables:**
- ✅ v1 API routes created
- ✅ Runtime validation added
- ✅ Legacy routes deprecated
- ✅ Migration guide written

---

### Phase 3: Types Integration (Week 3) 📝

**Goal:** Establish ACT Website as source of truth for Placemat types

#### Task 3.1: Define Types in ACT Website

```bash
# 1. Create shared types in ACT Main Website
mkdir -p "/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/src/types/shared/placemat"
```

```typescript
// ACT Farm/src/types/shared/placemat/year-in-review.ts
/**
 * Year in Review API Types
 * Source of Truth: ACT Main Website
 * Provider: ACT Placemat
 * Consumers: ACT Website, Empathy Ledger
 * Last Updated: 2025-12-27
 */

export namespace YearInReviewAPI {
  // Request/Response types
  // (moved from ACT Placemat to here)
}
```

#### Task 3.2: Create Sync Script

```bash
#!/bin/bash
# scripts/sync-placemat-types.sh

SRC="/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio/src/types/shared/placemat"
DEST="/Users/benknight/Code/ACT Placemat/packages/shared-types"

echo "📋 Syncing Placemat types from ACT Website..."
cp -r "$SRC/"* "$DEST/"
echo "✅ Types synced on $(date)" > "$DEST/LAST_SYNC.txt"
echo "✅ Placemat types synced!"
```

#### Task 3.3: Update Consumers

```typescript
// ACT Placemat - Update to use shared types
import { YearInReviewAPI } from '@act/shared-types';

// ACT Website - Consume Placemat APIs
import { YearInReviewAPI } from '@/types/shared/placemat/year-in-review';

const data = await fetch('http://localhost:4000/api/v1/year-in-review/2025');
if (!isValidYearInReviewResponse(data)) {
  console.error('Invalid API response');
  return null;
}
```

**Deliverables:**
- ✅ Types defined in ACT Website
- ✅ Sync script operational
- ✅ Placemat uses synced types
- ✅ Consumers validated

---

### Phase 4: Testing & Documentation (Week 4) ✅

**Goal:** Validate integration and document patterns

#### Task 4.1: Integration Testing

```bash
# 1. Start all servers via orchestrator
npm start

# 2. Test each Placemat API from ACT Website
# 3. Verify type safety
# 4. Check runtime validation
```

#### Task 4.2: Update Documentation

```markdown
# MULTI_REPO_CHANGELOG.md

## 2025-12-27 - ACT Placemat Ecosystem Integration

### Changes Made
- **ACT Main Website**
  - Added: `/src/types/shared/placemat/` (source of truth for Placemat types)
  - Added: API clients for Placemat endpoints

- **ACT Placemat**
  - Created: `/packages/shared-types/` (synced from ACT Website)
  - Migrated: Legacy API routes to `/api/v1/`
  - Updated: Environment management to use ecosystem vault

- **Dev Hub**
  - Updated: Orchestrator to include Placemat (ports 4000, 3006, 3007)
  - Updated: VSCode workspace with Placemat folders
  - Updated: Environment sync scripts

### API Changes
- New endpoints: `/api/v1/projects`, `/api/v1/year-in-review`, `/api/v1/media`
- Deprecated: `/api/real/*`, `/api/year-in-review` (legacy)
- Breaking: None (additive only)

### Testing
- [x] Type checking passed in all repos
- [x] Orchestrator starts all 8 projects
- [x] API contracts validated
- [x] Runtime validation working
- [x] VSCode workspace functional
```

**Deliverables:**
- ✅ Integration tests passing
- ✅ Documentation complete
- ✅ Changelog updated
- ✅ Team onboarding guide

---

## Success Metrics

### Technical Metrics

**After Phase 4 completion:**

- [ ] All 8 projects start with one command (`npm start`)
- [ ] Placemat APIs use `/api/v1/` pattern
- [ ] Types synced from ACT Website (source of truth)
- [ ] Environment vars in central vault
- [ ] VSCode workspace includes all Placemat folders
- [ ] Zero duplicated type definitions
- [ ] Runtime validation on all API boundaries
- [ ] 100% type safety across all APIs

### Developer Experience Metrics

- [ ] Setup time < 5 minutes (clone + npm start)
- [ ] Hot reload working across all projects
- [ ] Type errors caught at compile time
- [ ] API contract violations logged clearly
- [ ] Documentation accurate and complete
- [ ] Onboarding guide functional

---

## Rollout Strategy

### Development Phase (Now → 1 week)

1. **Implement Phase 1** (Foundation)
   - Set up infrastructure
   - No breaking changes
   - Test locally

2. **Implement Phase 2** (API Standardization)
   - Add v1 routes alongside legacy
   - Keep legacy functional
   - Test with both

3. **Implement Phase 3** (Types Integration)
   - Define types in ACT Website
   - Sync to Placemat
   - Validate type safety

4. **Implement Phase 4** (Testing & Docs)
   - Full integration testing
   - Document everything
   - Create migration guide

### Staging Phase (Week 2)

1. **Deploy to Staging**
   - Backend v1 APIs live
   - Legacy APIs still working
   - Monitoring enabled

2. **Update Consumers**
   - ACT Website switches to v1
   - Empathy Ledger switches to v1
   - Test thoroughly

3. **Validate**
   - All API calls working
   - No errors in logs
   - Performance acceptable

### Production Phase (Week 3)

1. **Deploy Backend**
   - v1 APIs to production
   - Legacy APIs still active
   - Deprecation warnings enabled

2. **Deploy Consumers**
   - All sites using v1
   - Monitor for issues
   - Ready to rollback if needed

3. **Deprecation Period** (1 release cycle)
   - Keep legacy APIs for 2 weeks
   - Monitor deprecation warnings
   - Ensure no legacy usage

4. **Cleanup**
   - Remove legacy API routes
   - Clean up old code
   - Archive old types

---

## Summary: The Right Method

**Based on ACT ecosystem best practices:**

✅ **DO:**
1. Use ACT Website as source of truth for shared types
2. Copy types one-way to Placemat (never modify copies)
3. Version all APIs as `/api/v1/`
4. Store secrets in centralized vault
5. Integrate into orchestrator (ports 4000, 3006, 3007)
6. Add to VSCode workspace
7. Add runtime validation at all API boundaries
8. Deploy provider before consumers
9. Use Redis and ChromaDB from NAS
10. Follow additive-only migration pattern

❌ **DON'T:**
1. Create types in Placemat then sync to ACT Website
2. Mix versioning patterns (v1, v2, v3, unversioned)
3. Store different secrets per app (use vault)
4. Run Placemat separately from orchestrator
5. Trust TypeScript types without runtime validation
6. Make breaking API changes without versioning
7. Deploy consumers before provider APIs
8. Duplicate NAS services (Redis, ChromaDB)
9. Skip migration periods on breaking changes
10. Hardcode environment variables

**Timeline:** 4 weeks to full integration
**Effort:** ~80 hours
**Risk:** Low (additive changes, no breaking)
**Benefits:** Unified development experience, type safety, centralized management

This is **the right method** based on proven patterns across the ACT ecosystem. Follow this strategy for successful integration.
