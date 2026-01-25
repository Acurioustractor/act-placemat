# API Audit and Consolidation Report
Generated: 2026-01-25

## Executive Summary

The ACT Intelligence Platform has significant API route duplication and inconsistency across multiple API versions. This report documents the current state and provides a consolidation plan.

---

## Part 1: Current API Structure Audit

### 1.1 Directory Overview

| Directory | File Count | Purpose |
|-----------|------------|---------|
| `/api/` | 100+ files | Legacy and root-level routes |
| `/api/v1/` | 18 files | Standardized v1 routes |
| `/api/v2/` | 1 file | V2 integrations (stub) |
| `/api/v3/` | 4 files | V3 experimental routes |
| `/api/legacy/` | 1 file | Legacy adapter for backward compatibility |
| `/api/archive/` | 50+ files | Deprecated routes (should be removed) |
| `/routes/` | 4 files | Additional routing (notifications, personal-intelligence) |

### 1.2 Contact Management Routes (HIGH DUPLICATION)

| File | Location | Endpoints | Status |
|------|----------|-----------|--------|
| `contact-intelligence.js` | `/api/` | 18 endpoints | Active - Strategic contact management |
| `contactIntelligence.js` | `/api/` | 40+ endpoints | Active - Full service with CSV import |
| `contacts.js` | `/api/` | LinkedIn-specific | Active |
| `v1/contacts.js` | `/api/v1/` | 15 endpoints | Standardized - Person identity map |
| `search-contacts.js` | `/api/` | Search endpoint | Active |
| `simpleContactDashboard.js` | `/api/` | Dashboard | Active |
| `linkedin-contacts.js` | `/api/` | 4,459 contacts | Active |

**Key Issues:**
- `contact-intelligence.js` and `contactIntelligence.js` have significant overlap
- Both expose `/contacts`, `/contacts/:id`, `/flag`, `/flagged`, `/link-project` endpoints
- Different data sources: linkedin_contacts vs person_identity_map

### 1.3 Financial Routes (HIGH DUPLICATION)

| File | Location | Endpoints | Status |
|------|----------|-----------|--------|
| `bookkeeping.js` | `/api/` | 100+ endpoints | Active - Core Xero integration |
| `v1/financial.js` | `/api/v1/` | 50+ endpoints | Standardized - Comprehensive |
| `cashFlowIntelligence.js` | `/api/` | Cash flow specific | Active |
| `financialReports.js` | `/api/` | Reports specific | Active |
| `financialDiscovery.js` | `/api/` | Discovery endpoints | Active |
| `xeroIntelligenceSync.js` | `/api/` | Xero sync | Active |

**Key Issues:**
- `bookkeeping.js` (70KB) contains most endpoints
- `v1/financial.js` (1460 lines) consolidates much of bookkeeping
- Redundant sync, reports, and transaction endpoints

### 1.4 Intelligence Routes (MODERATE DUPLICATION)

| File | Location | Endpoints | Status |
|------|----------|-----------|--------|
| `unified-intelligence.js` | `/api/` | General intelligence | Active |
| `intelligenceLayer.js` | `/api/` | Project intelligence | Active |
| `v1/intelligence.js` | `/api/v1/` | Redirector only (30 lines) | Stub |
| `unified-intelligence-lite.js` | `/api/` | Light version | Active |
| `relationship-intelligence.js` | `/api/` | Relationship data | Active |
| `projectIntelligence.js` | `/api/` | Project + Gmail/Calendar | Active |

**Key Issues:**
- `v1/intelligence.js` is a minimal redirector with no real functionality
- `unified-intelligence.js` and `intelligenceLayer.js` have overlapping purpose
- Multiple intelligence endpoints with no clear hierarchy

### 1.5 Integration Routes

| File | Location | Integration | Status |
|------|----------|-------------|--------|
| `gmailService.js` | `/services/` | Gmail | Service file |
| `workspaceGmail.js` | `/api/` | Multi-account Gmail | Active |
| `gmailSync.js` | `/api/` | Gmail sync | Active |
| `notion-proxy.js` | `/api/` | Notion | Active |
| `xeroAuth.js` | `/api/` | Xero OAuth | Active |
| `linkedin-contacts.js` | `/api/` | LinkedIn | Active |
| `v1/integrations.js` | `/api/v1/` | Unified integrations | Standardized |
| `v2/integrations.js` | `/api/v2/` | V2 integrations | Stub |

### 1.6 Project Routes

| File | Location | Endpoints | Status |
|------|----------|-----------|--------|
| `v1/projects.js` | `/api/v1/` | Standardized projects | Active |
| `projectHealth.js` | `/api/` | Project health | Active |
| `projectFinancials.js` | `/api/` | Project financials | Active |
| `projectIntelligence.js` | `/api/` | Project intelligence | Active |
| `v3/projectAlignment.js` | `/api/v3/` | Project alignment | Experimental |
| `v3/bulkEnrichment.js` | `/api/v3/` | Bulk enrichment | Experimental |

---

## Part 2: Duplication Analysis

### 2.1 Contact Routes - Detailed Comparison

| Feature | contact-intelligence.js | contactIntelligence.js | v1/contacts.js |
|---------|-------------------------|------------------------|----------------|
| Database | Supabase + Notion | Supabase | Supabase |
| Main Table | person_identity_map | person_identity_map | linkedin_contacts + person_identity_map |
| GET /contacts | Yes | Yes | Yes |
| GET /contacts/:id | Yes | Yes | Yes |
| POST /contacts/:id/enrich | No | Yes | No |
| GET /stats | Yes | Yes | Via /all/stats |
| POST /flag | No | Yes | No |
| GET /flagged | No | Yes | No |
| POST /link-project | No | Yes | Via /all/:personId/projects |
| CSV Import | No | Yes | No |
| Campaign Management | No | Yes | No |

**Recommendation:** Consolidate to `v1/contacts.js` as the canonical source, migrate unique features from `contactIntelligence.js`.

### 2.2 Financial Routes - Detailed Comparison

| Feature | bookkeeping.js | v1/financial.js |
|---------|----------------|-----------------|
| Lines of Code | ~2200 | ~1460 |
| Xero Integration | Yes | Yes |
| Transaction Sync | Yes | Yes |
| Transaction List | Yes | Yes |
| Export CSV | Yes | Yes |
| Receipt Processing | Yes | Yes |
| Reports | Partial | Comprehensive |
| Categorization Rules | Yes | Yes |
| Aging Reports | Yes | Yes |
| Automation/Digest | Yes | Yes |
| Validation Middleware | No | Yes |
| API Response Helpers | No | Yes |

**Recommendation:** `v1/financial.js` is the standardized version. Keep it as canonical, deprecate `bookkeeping.js`.

### 2.3 Intelligence Routes - Detailed Comparison

| Feature | unified-intelligence.js | intelligenceLayer.js | v1/intelligence.js |
|---------|-------------------------|----------------------|--------------------|
| Lines of Code | ~670 | ~190 | ~130 |
| Recommendations | Yes | No | Yes (mock) |
| Health/Status | Yes | Yes | Yes |
| Project Intelligence | No | Yes | No |
| Gmail/Calendar | No | Yes | No |
| Validation | No | Partial | No |

**Recommendation:** Merge intelligenceLayer.js into unified-intelligence.js, make v1/intelligence.js a proper router.

---

## Part 3: Consolidation Plan

### 3.1 Target Structure

```
/api/
├── v1/                          # Canonical v1 API
│   ├── index.js                 # Main router (18 endpoints registered)
│   ├── contacts.js              # CONSOLIDATED - Contact management
│   ├── financial.js             # CONSOLIDATED - Financial management
│   ├── intelligence.js          # CONSOLIDATED - Unified intelligence
│   ├── integrations.js          # CONSOLIDATED - Integration management
│   ├── projects.js              # Standardized projects
│   ├── search.js                # Unified search
│   ├── personal-intelligence.js # Migrated from routes/
│   ├── relationship-intelligence.js # Migrated from /api/
│   ├── contact-enrichment.js    # Contact enrichment
│   ├── agents.js                # Agent orchestration
│   ├── command-center.js        # Command center
│   ├── subscriptions.js         # Subscription tracker
│   ├── media.js                 # Media management
│   ├── year-in-review.js        # Year in review
│   └── linkedin.js              # LinkedIn integration
│
├── v2/                          # V2 API (future development)
│   └── integrations.js          # Unified integrations v2
│
├── legacy/                      # Legacy adapter (backward compat)
│   └── legacyAdapter.js         # Redirects to v1
│
└── archive/                     # ARCHIVE - To be removed
    └── [50+ deprecated files]
```

### 3.2 Migration Actions

#### Phase 1: Contact Consolidation (Week 1)

1. **Create merged contacts service** (`v1/contacts.js`)
   - Import unique features from `contactIntelligence.js`:
     - CSV import functionality
     - Campaign management
     - Bulk enrichment
   - Keep v1 validation middleware
   - Add deprecation headers for legacy routes

2. **Update legacy adapter** (`legacy/legacyAdapter.js`)
   - Redirect `/api/contact-intelligence` to `/api/v1/contacts`
   - Redirect `/api/contactIntelligence` to `/api/v1/contacts`
   - Add deprecation warnings

3. **Remove duplicates**
   - Archive `contact-intelligence.js`
   - Archive `contactIntelligence.js` (after feature migration)
   - Archive `simpleContactDashboard.js`

#### Phase 2: Financial Consolidation (Week 2)

1. **Finalize v1/financial.js**
   - Ensure all bookkeeping.js features are present
   - Add any missing endpoints from bookkeeping.js
   - Add comprehensive validation

2. **Update server.js**
   - Remove direct `bookkeeping.js` mounting
   - Ensure v1/financial is mounted at `/api/v1/financial`

3. **Archive legacy financial files**
   - Archive `bookkeeping.js`
   - Archive `financialIntelligenceRecommendations.js`
   - Keep `cashFlowIntelligence.js` as specialized endpoint

#### Phase 3: Intelligence Consolidation (Week 3)

1. **Consolidate intelligence endpoints**
   - Merge `intelligenceLayer.js` features into `unified-intelligence.js`
   - Update `v1/intelligence.js` to be a proper router
   - Redirect specific intelligence endpoints to unified

2. **Archive redundant files**
   - Archive `unified-intelligence-lite.js`
   - Archive `v1/intelligence.js` (replaced by unified)
   - Keep `relationship-intelligence.js` as specialized

#### Phase 4: Cleanup (Week 4)

1. **Remove archive directory**
   - Delete deprecated files older than 6 months
   - Keep only essential legacy adapters

2. **Update documentation**
   - Create API migration guide
   - Update OpenAPI specs
   - Add deprecation notices to responses

### 3.3 Backward Compatibility Strategy

1. **Legacy Adapter Pattern**
   - All legacy routes redirect to v1 with deprecation headers
   ```javascript
   router.get('/legacy-endpoint', (req, res) => {
     res.set('X-Deprecated', 'Use /api/v1/new-endpoint instead');
     res.redirect(301, '/api/v1/new-endpoint');
   });
   ```

2. **Response Transformation**
   - Legacy adapter transforms responses to match old format
   - Maintains API compatibility during transition

3. **Deprecation Timeline**
   - Phase 1 (Week 1-2): Deprecation warnings in responses
   - Phase 2 (Week 3-4): Legacy routes return 301 redirects
   - Phase 3 (Month 2): Legacy routes return 410 Gone
   - Phase 4 (Month 3): Legacy adapter removed

---

## Part 4: Implementation Files

### 4.1 Updated v1/contacts.js (Consolidated)

The consolidated contacts API should include:

```javascript
// Core endpoints from v1/contacts.js
- GET /                    - List linkedin_contacts
- GET /all                 - List person_identity_map (master table)
// ... existing v1 endpoints

// Features migrated from contactIntelligence.js
- POST /import/csv         - CSV import with AI enrichment
- POST /bulk-enrich        - Bulk enrichment
- GET /campaigns           - Campaign management
- POST /campaigns          - Create campaign
- POST /campaigns/:id/assign - Assign contacts
- POST /flag               - Flag contact
- POST /unflag             - Unflag contact
- GET /flagged             - Get flagged contacts
```

### 4.2 Updated Legacy Adapter

The legacy adapter should handle:

```javascript
// Contact intelligence redirects
router.get('/contact-intelligence', redirectTo('/api/v1/contacts'));
router.get('/contact-intelligence/contacts', redirectTo('/api/v1/contacts/all'));
router.post('/contact-intelligence/flag', redirectTo('/api/v1/contacts/flag'));
// ... etc

// Intelligence redirects
router.get('/unified-intelligence', redirectTo('/api/v1/intelligence'));
router.get('/unified-intelligence/recommendations', redirectTo('/api/v1/intelligence/recommendations'));
```

---

## Part 5: Files to Archive/Remove

### 5.1 Files to Archive (Move to /api/archive/)

After consolidation:
- `/api/contact-intelligence.js`
- `/api/contactIntelligence.js`
- `/api/contacts.js` (functionality moved to v1/contacts.js)
- `/api/simpleContactDashboard.js`
- `/api/bookkeeping.js`
- `/api/unified-intelligence-lite.js`
- `/api/v1/intelligence.js` (replaced by unified)
- `/api/financialIntelligenceRecommendations.js`

### 5.2 Files to Delete (Unused/Obsolete)

- `/api/archive/` directory contents (all deprecated)
- `/api/gmail-contact-intelligence.js` (redirected)
- `/api/calendar-contact-intelligence.js` (redirected)
- `/api/realFinanceDashboard.js` (duplicate of financeDashboard.js)

---

## Part 6: Success Criteria

1. All client code migrated to v1 endpoints
2. Legacy adapter handles 100% of legacy routes
3. No duplicate endpoints across versions
4. Consistent response format across all v1 endpoints
5. Documentation reflects current structure
6. Deprecation timeline followed

---

## Appendix A: File Inventory

Complete list of all API files by category:

### A.1 Root Level API Files (100+)
[See Glob results - full listing available]

### A.2 V1 Standardized (18 files)
- index.js
- intelligence.js
- linkedin.js
- platform.js
- schemas.js
- projects.js
- year-in-review.js
- media.js
- subscriptions.js
- agents.js
- search.js
- command-center.js
- contact-enrichment.js
- personal-intelligence.js
- relationship-intelligence.js
- contacts.js
- financial.js
- integrations.js

### A.3 V2/V3 (5 files)
- v2/integrations.js
- v3/bulkEnrichment.js
- v3/projectAlignment.js
- v3/businessAgent.js
- v3/crmSystem.js

### A.4 Legacy (1 file)
- legacy/legacyAdapter.js

---

*Report generated by API Audit Tool*
*For questions, contact the platform team*
