# ACT Platform - Codebase Cleanup Audit
**Date**: October 5, 2025
**Purpose**: Identify bloat, simplify architecture, create clean foundation for new development

---

## 🚨 CRITICAL FINDINGS

### **Problem 1: Multiple Server Files (11 servers!)**
```
/apps/backend/stable-real-data-server.js          ← PORT 4001 (CURRENT)
/apps/backend/unified-intelligence-server.js      ← PORT 4000
/apps/backend/simple-real-data-server.js
/apps/backend/core/src/server.js
/apps/backend/core/src/server-minimal.js
/apps/backend/core/src/server-community.js
/apps/backend/archived-files/servers/intelligence-server.js
/apps/backend/archived-files/servers/server-enhanced.js
/apps/backend/archived-files/servers/unified-domain-server.js
/apps/backend/archived-files/graphql/server.js
```

**Impact**: Confusion about which server to run, port conflicts, duplicate code

**Recommendation**:
- ✅ Keep: `stable-real-data-server.js` (rename to `server.js`)
- 🗑️ Archive: All others → `/apps/backend/archived-servers/`

---

### **Problem 2: Too Many .env Files (11 files!)**
```
/.env                                    ← ROOT (CURRENT - GOOD)
/.env.example
/.env.notion-ai-agent
/docker/.env.metabase
/docker/.env.metabase.example
/apps/backend/.env                       ← DUPLICATE
/apps/backend/.env.example               ← DUPLICATE
/apps/backend/archived-env/.env.worldclass
/apps/backend/archived-env/.env.backup
/apps/backend/archived-env/.env.test
/apps/backend/archived-env/.env.PERFECT.md
```

**Impact**: Environment variable conflicts, confusion about which file is used

**Recommendation**:
- ✅ Keep: `/.env` (root) - ALL config here
- ✅ Keep: `/.env.example` (template)
- 🗑️ Delete: `/apps/backend/.env` and `.env.example` (already archived)
- ✅ Document: All services use ROOT `.env` only

---

### **Problem 3: Massive Backend Bloat (35,868 JS files!)**
```
Total backend JS files: 35,868
Root level scripts: 79 files
API files in core: 73 files
```

**Key Issues**:
- 79 test/setup/migration scripts in root
- Multiple duplicate servers
- Archived files mixed with active code
- Test files everywhere

**Recommendation**:
```
/apps/backend/
├── server.js                    ← Single entry point
├── package.json
├── .env → ../../.env           ← Symlink to root
├── core/
│   ├── src/
│   │   ├── api/                ← Clean API modules
│   │   ├── services/           ← Business logic
│   │   └── config/             ← Configuration
│   └── database/
│       └── migrations/         ← SQL migrations only
├── scripts/                    ← Dev/admin scripts
├── tests/                      ← All tests here
└── archived/                   ← Everything old
```

---

### **Problem 4: API Complexity (73 API files)**

**Current APIs in stable-real-data-server.js:**
```javascript
✅ ACTIVE (Keep):
- financialWebhooks.js
- integrationMonitoring.js
- gmailIntelligenceSync.js
- xeroIntelligenceSync.js
- unifiedBusinessIntelligence.js
- automationEngine.js
- dashboardAggregation.js
- financialDiscovery.js
- cashFlowIntelligence.js
- aiBusinessAgent.js
- projectFinancials.js
- financialReports.js
- curious-tractor-research.js

❌ COMMENTED OUT (Already identified as bloat):
- businessAgentAustralia.js (missing dependencies)
- agentScheduler.js (missing dependencies)
```

**73 other API files** in `/core/src/api/` - need review

**Recommendation**: Audit each API for:
1. Is it imported by `stable-real-data-server.js`?
2. Is it called by frontend?
3. Does it work without errors?
4. Archive if NO to any

---

### **Problem 5: Frontend Complexity (30 components)**

**ACTIVE (Good):**
```tsx
✅ App.tsx                        ← Main app
✅ MorningBrief.tsx              ← Tab 1
✅ ContactIntelligenceHub.tsx    ← Tab 2
✅ CommunityProjects.tsx         ← Tab 3
✅ AIAgentChat.tsx               ← Sidebar
✅ CuriousTractorResearch.tsx    ← Tab 4
```

**UNUSED (Financial tools - correctly hidden):**
```tsx
🔒 MoneyFlowDashboard.tsx        ← Hidden until Thriday
🔒 BookkeepingChecklist.tsx      ← Hidden until Thriday
🔒 ReceiptProcessor.tsx          ← Hidden until Thriday
🔒 ProjectFinancials.tsx         ← Hidden until Thriday
🔒 BusinessAutopilot.tsx         ← Hidden until Thriday
🔒 FinancialReports.tsx          ← Hidden until Thriday
🔒 RealCashFlow.tsx              ← Hidden until Thriday
```

**NEED REVIEW (16 other components):**
```tsx
❓ DashboardLanding.tsx
❓ CommunityNetwork.tsx
❓ OutreachTasks.tsx
❓ ProjectIntelligencePage.tsx
❓ RevenueTransparency.tsx
❓ StoryManagement.tsx
❓ DataSovereignty.tsx
❓ DashboardInsights.tsx
❓ BusinessAgentDashboard.tsx
❓ EnhancedDashboard.tsx
... (10 more)
```

**Recommendation**:
- Move financial components → `/archived-financial/`
- Audit other 16 components - are they used?

---

## 🎯 PROPOSED CLEAN STRUCTURE

### **Backend** (Single Server, Clear Organization)
```
/apps/backend/
├── server.js                          ← ONLY server file
├── package.json
├── README.md                          ← How to run
│
├── api/                               ← Active APIs only
│   ├── intelligence/
│   │   ├── morning-brief.js
│   │   ├── contacts.js
│   │   ├── projects.js
│   │   └── opportunities.js
│   ├── integrations/
│   │   ├── notion.js
│   │   ├── gmail.js
│   │   ├── calendar.js
│   │   └── xero.js
│   └── research/
│       └── curious-tractor.js
│
├── services/                          ← Business logic
│   ├── notion-service.js
│   ├── gmail-service.js
│   ├── supabase-service.js
│   └── ai-service.js
│
├── database/
│   └── migrations/                    ← SQL only
│
├── scripts/                           ← Dev tools
│   ├── setup-gmail.js
│   ├── test-apis.js
│   └── migrate-database.js
│
└── archived/                          ← Old code
    ├── servers/                       ← 10 old servers
    ├── apis/                          ← 60 old APIs
    └── services/                      ← Old services
```

### **Frontend** (Clean Component Structure)
```
/apps/frontend/src/
├── App.tsx                            ← Main app
├── main.tsx
├── index.css
│
├── components/
│   ├── tabs/                          ← Active tabs
│   │   ├── MorningBrief.tsx
│   │   ├── ContactIntelligenceHub.tsx
│   │   ├── CommunityProjects.tsx
│   │   ├── CuriousTractorResearch.tsx
│   │   ├── Opportunities.tsx          ← NEW
│   │   ├── Calendar.tsx               ← NEW
│   │   ├── Gmail.tsx                  ← NEW
│   │   └── Stories.tsx                ← NEW
│   │
│   ├── shared/                        ← Shared components
│   │   ├── AIAgentChat.tsx
│   │   └── ui/
│   │       ├── Card.tsx
│   │       ├── MetricTile.tsx
│   │       └── EmptyState.tsx
│   │
│   └── archived-financial/            ← Hidden financial
│       ├── MoneyFlowDashboard.tsx
│       ├── BookkeepingChecklist.tsx
│       └── ...
│
└── lib/
    └── api.ts                         ← API client
```

### **Environment Configuration** (Single Source)
```
/.env                                  ← ONLY .env file
/.env.example                          ← Template

All apps read from ROOT .env:
- apps/backend/server.js → ../../.env
- apps/frontend/vite.config.ts → ../../.env
```

---

## 📋 CLEANUP ACTION PLAN

### **Phase 1: Backend Cleanup** (2 hours)

#### 1.1 Archive Old Servers
```bash
mkdir -p /apps/backend/archived/servers
mv unified-intelligence-server.js archived/servers/
mv simple-real-data-server.js archived/servers/
mv core/src/server*.js archived/servers/
```

#### 1.2 Rename Stable Server
```bash
mv stable-real-data-server.js server.js
# Update PORT from 4001 → 4000
```

#### 1.3 Archive Root Scripts (79 files)
```bash
mkdir -p /apps/backend/scripts/archived
mv test-*.js scripts/archived/
mv setup-*.js scripts/archived/
mv apply-*.js scripts/archived/
```

#### 1.4 Remove Duplicate .env
```bash
# Already in archived-env/ - just document
echo "All config in /.env (root)" > apps/backend/.env.md
```

### **Phase 2: API Audit** (3 hours)

#### 2.1 List Active APIs
Review `/core/src/api/` - keep only what's imported in server.js

#### 2.2 Archive Unused
```bash
mkdir -p /apps/backend/archived/apis
# Move 60+ unused APIs
```

#### 2.3 Reorganize Active APIs
```bash
mkdir -p api/intelligence api/integrations api/research
# Move active APIs to clean structure
```

### **Phase 3: Frontend Cleanup** (2 hours)

#### 3.1 Archive Financial Components
```bash
mkdir -p /apps/frontend/src/components/archived-financial
mv MoneyFlowDashboard.tsx archived-financial/
mv BookkeepingChecklist.tsx archived-financial/
# ... (7 financial components)
```

#### 3.2 Audit Other Components
Review 16 components - move unused to `/archived/`

#### 3.3 Create Tabs Directory
```bash
mkdir -p /apps/frontend/src/components/tabs
mv MorningBrief.tsx tabs/
mv ContactIntelligenceHub.tsx tabs/
# ... (organize active tabs)
```

### **Phase 4: Documentation** (1 hour)

#### 4.1 Update README
- Single server command
- Single .env location
- Clean API reference

#### 4.2 Create ARCHITECTURE.md
- Document clean structure
- API organization
- Development workflow

#### 4.3 Create ARCHIVED.md
- What's archived and why
- How to restore if needed
- Migration notes

---

## 🚀 AFTER CLEANUP - READY TO BUILD

### **New Development Will Be:**
✅ **Simple** - One server, clear structure
✅ **Fast** - No duplicate code, minimal bloat
✅ **Maintainable** - Easy to find things
✅ **Documented** - Clear architecture

### **New Features Can Go:**
```
/api/intelligence/opportunities.js     ← Grant discovery
/api/intelligence/calendar.js          ← Meeting intelligence
/api/intelligence/stories.js           ← Impact documentation
/components/tabs/Opportunities.tsx     ← New tab
/components/tabs/Calendar.tsx          ← New tab
```

---

## ✅ VALIDATION CHECKLIST

After cleanup, verify:
- [ ] Single server starts: `node server.js`
- [ ] Frontend connects to port 4000
- [ ] All 4 active tabs work
- [ ] AI agent works
- [ ] No errors in console
- [ ] Environment variables from root `.env`
- [ ] Documentation updated
- [ ] Git commit: "chore: cleanup codebase bloat"

---

## 📊 EXPECTED RESULTS

**Before:**
- 35,868 backend files
- 11 server files
- 11 .env files
- 73 API files
- 30 frontend components

**After:**
- ~100 active backend files
- 1 server file
- 1 .env file (root)
- ~15 active API files
- ~10 active frontend components

**Reduction**: ~99% of files archived, 100% cleaner architecture

---

**Ready to execute this cleanup?** Say the word and I'll systematically work through each phase.
