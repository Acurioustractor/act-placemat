# Domain-Based API Organization Plan

## Current State Analysis
Currently we have ~50+ individual API endpoints scattered across different paths. Many follow inconsistent naming patterns and don't group related functionality.

## Proposed Domain Structure

### `/api/v1/` - Versioned APIs (Consolidated)
**Status: ✅ Partially Complete**
- `intelligence.js` ✅ (15+ intelligence APIs consolidated)
- `financial.js` ✅ (4 financial APIs consolidated) 
- `linkedin.js` ✅ (7 LinkedIn APIs consolidated)

### `/api/v1/integrations/` - External Service Integrations
**Consolidate into:** `/apps/backend/src/api/v1/integrations.js`

**Current endpoints to consolidate:**
- `/api/notion` + `/api/notion-publish` + `/api/notion-projects` → `/api/v1/integrations/notion`
- `/api/gmail-sync` + `/api/gmail-intelligence` → `/api/v1/integrations/gmail` 
- `/api/gmail-linkedin` + `/api/notion-linkedin` → `/api/v1/integrations/cross-platform`
- `/api/xero` → `/api/v1/integrations/xero`
- `/api/enhanced-integration` → `/api/v1/integrations/enhanced`

### `/api/v1/platform/` - Platform Operations & Management
**Consolidate into:** `/apps/backend/src/api/v1/platform.js`

**Current endpoints to consolidate:**
- `/api/platform` → `/api/v1/platform/media`
- `/api/integration-registry` → `/api/v1/platform/registry`
- `/api/ecosystem` + `/api/ecosystem-data` → `/api/v1/platform/ecosystem`
- `/api/data-sovereignty` → `/api/v1/platform/data-governance`
- `/api/privacy` → `/api/v1/platform/privacy`

### `/api/v1/monitoring/` - Observability & Performance
**Consolidate into:** `/apps/backend/src/api/v1/monitoring.js`

**Current endpoints to consolidate:**
- `/api/sla-monitoring` + `/api/performance-dashboard` → `/api/v1/monitoring/performance`
- `/api/tracing` + `/api/observability` → `/api/v1/monitoring/observability`
- `/api/error-taxonomy` → `/api/v1/monitoring/errors`
- `/api/record-replay` → `/api/v1/monitoring/replay`
- `/api/events` → `/api/v1/monitoring/events`

### `/api/v1/data/` - Data Management & Processing
**Consolidate into:** `/apps/backend/src/api/v1/data.js`

**Current endpoints to consolidate:**
- `/api/knowledge` + `/api/knowledge-graph` + `/api/knowledge-graph-sync` → `/api/v1/data/knowledge`
- `/api/data-normalization` + `/api/data-consistency` → `/api/v1/data/quality`
- `/api/sync-webhook` + `/api/sync-queue` → `/api/v1/data/sync`
- `/api/ml-pipeline` → `/api/v1/data/ml`

### `/api/v1/applications/` - Business Applications
**Consolidate into:** `/apps/backend/src/api/v1/applications.js`

**Current endpoints to consolidate:**
- `/api/empathy-ledger` → `/api/v1/applications/empathy-ledger`
- `/api/farmhand` + `/api/farm-workflow` → `/api/v1/applications/farmhand`
- `/api/opportunity-scout` → `/api/v1/applications/opportunities`
- `/api/ai-decision-support` + `/api/decision-intelligence` → `/api/v1/applications/decision-support`

### `/api/v1/dashboard/` - Dashboard & Visualization
**Consolidate into:** `/apps/backend/src/api/v1/dashboard.js`

**Current endpoints to consolidate:**
- `/api/dashboard` + `/api/adaptive-dashboard` → `/api/v1/dashboard/dynamic`
- `/api/compliance-dashboard` → `/api/v1/dashboard/compliance`
- `/api/metabase` → `/api/v1/dashboard/analytics`
- `/api/performance-optimization` → `/api/v1/dashboard/optimization`

### `/api/v1/community/` - Community & Social Features
**Consolidate into:** `/apps/backend/src/api/v1/community.js`

**Current endpoints to consolidate:**
- `/api/bookkeeping` + `/api/community-bookkeeping` → `/api/v1/community/bookkeeping`
- `/api/personalization` → `/api/v1/community/personalization`
- `/api/universal-knowledge-hub` → `/api/v1/community/knowledge`

### `/api/v1/security/` - Security & Compliance
**Consolidate into:** `/apps/backend/src/api/v1/security.js`

**Current endpoints to consolidate:**
- `/api/security` → `/api/v1/security/monitoring`
- `/api/billing` → `/api/v1/security/billing`
- `/api/realtime` → `/api/v1/security/realtime`

## Implementation Strategy

### Phase 1: Create New Domain APIs ✅ 
Create consolidated API files following the intelligence.js pattern:
- Comprehensive endpoint coverage
- Swagger documentation
- Real service integration
- Consistent error handling
- Health monitoring

### Phase 2: Update Route Registration
Update server.js to use new domain-based routes while maintaining backward compatibility temporarily.

### Phase 3: Migration Support
- Create migration guides for each domain
- Add deprecation warnings to old endpoints
- Provide automatic redirects where possible

### Phase 4: Cleanup
- Remove old API files after migration period
- Update client applications
- Remove deprecated routes

## Benefits

### Developer Experience
- **Logical Organization:** Related functionality grouped together
- **Consistent Patterns:** All v1 APIs follow same structure
- **Better Documentation:** Domain-based Swagger docs
- **Easier Discovery:** Clear API hierarchy

### Performance
- **Reduced Bundle Size:** Consolidated files reduce overhead
- **Better Caching:** Related endpoints share caching strategies
- **Connection Pooling:** Domain services can share connections

### Maintenance
- **Single Source of Truth:** One file per domain
- **Consistent Error Handling:** Standardized across domains
- **Easier Testing:** Domain-focused test suites
- **Clear Ownership:** Team responsibility by domain

## Migration Timeline

- **Week 1:** Create integrations.js and platform.js
- **Week 2:** Create monitoring.js and data.js  
- **Week 3:** Create applications.js and dashboard.js
- **Week 4:** Create community.js and security.js
- **Week 5:** Update server.js and add migration guides
- **Week 6:** Test and optimize new structure
- **Week 7-8:** Migrate clients and deprecate old endpoints
- **Week 9:** Remove old API files and routes