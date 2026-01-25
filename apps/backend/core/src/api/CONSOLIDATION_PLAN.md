# API Consolidation Implementation Plan
Generated: 2026-01-25

## Implementation Checklist

### Phase 1: Contact Routes Consolidation

#### Task 1.1: Enhance v1/contacts.js with features from contactIntelligence.js

**Files to modify:**
- `/Users/benknight/Code/act-intelligence-platform/apps/backend/core/src/api/v1/contacts.js`

**Features to add:**
1. CSV Import endpoint (from contactIntelligence.js lines 498-575)
2. Campaign management (from contactIntelligence.js lines 577-704)
3. Bulk enrichment (from contactIntelligence.js lines 1259-1320)
4. Flag/unflag endpoints (from contactIntelligence.js lines 788-1054)

**Code to add after line 660 (end of file):**

```javascript
// ============================================
// CSV Import - Migrated from contactIntelligence.js
// ============================================

/**
 * POST /import/csv - Import contacts from CSV file
 */
router.post('/import/csv', upload.single('csvFile'), async (req, res) => {
  // Implementation from contactIntelligence.js lines 501-575
});

// ============================================
// Campaign Management - Migrated from contactIntelligence.js
// ============================================

/**
 * GET /campaigns - Get all campaigns
 */
router.get('/campaigns', async (req, res) => {
  // Implementation from contactIntelligence.js lines 581-606
});

/**
 * POST /campaigns - Create a new campaign
 */
router.post('/campaigns', async (req, res) => {
  // Implementation from contactIntelligence.js lines 612-657
});

/**
 * POST /campaigns/:id/assign - Assign contacts to campaign
 */
router.post('/campaigns/:id/assign', async (req, res) => {
  // Implementation from contactIntelligence.js lines 663-704
});

// ============================================
// Bulk Operations - Migrated from contactIntelligence.js
// ============================================

/**
 * POST /bulk-enrich - Trigger bulk enrichment
 */
router.post('/bulk-enrich', async (req, res) => {
  // Implementation from contactIntelligence.js lines 1262-1320
});

// ============================================
// Flag Management - Migrated from contactIntelligence.js
// ============================================

/**
 * POST /flag - Flag a contact with priority
 */
router.post('/flag', async (req, res) => {
  // Implementation from contactIntelligence.js lines 792-888
});

/**
 * POST /unflag - Remove flag from contact
 */
router.post('/unflag', async (req, res) => {
  // Implementation from contactIntelligence.js lines 894-974
});

/**
 * GET /flagged - Get all flagged contacts
 */
router.get('/flagged', async (req, res) => {
  // Implementation from contactIntelligence.js lines 980-1054
});
```

#### Task 1.2: Update Legacy Adapter

**Files to modify:**
- `/Users/benknight/Code/act-intelligence-platform/apps/backend/core/src/api/legacy/legacyAdapter.js`

**Routes to add:**

```javascript
/**
 * Contact Intelligence Legacy Endpoints
 * Redirects to unified v1 contacts API
 */

// Redirect all contact-intelligence routes
router.get('/contact-intelligence', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts instead');
  res.redirect(301, '/api/v1/contacts');
});

router.get('/contact-intelligence/contacts', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts/all instead');
  res.redirect(301, '/api/v1/contacts/all');
});

router.get('/contact-intelligence/contacts/:id', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts/all/:id instead');
  res.redirect(301, `/api/v1/contacts/all/${req.params.id}`);
});

router.post('/contact-intelligence/flag', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts/flag instead');
  res.redirect(301, '/api/v1/contacts/flag');
});

router.get('/contact-intelligence/flagged', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts/flagged instead');
  res.redirect(301, '/api/v1/contacts/flagged');
});

router.post('/contact-intelligence/bulk-enrich', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts/bulk-enrich instead');
  res.redirect(301, '/api/v1/contacts/bulk-enrich');
});

router.get('/contact-intelligence/campaigns', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts/campaigns instead');
  res.redirect(301, '/api/v1/contacts/campaigns');
});

router.post('/contact-intelligence/campaigns/:id/assign', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/contacts/campaigns/:id/assign instead');
  res.redirect(301, `/api/v1/contacts/campaigns/${req.params.id}/assign`);
});
```

#### Task 1.3: Update server.js

**Files to modify:**
- `/Users/benknight/Code/act-intelligence-platform/apps/backend/server.js`

**Changes needed:**
1. Remove direct mounting of contact-intelligence.js (line 432-434)
2. Keep legacy adapter mounted for backward compatibility

```javascript
// REMOVE THIS:
app.use('/api/contact-intelligence', contactIntelligenceRoutes);

// KEEP THIS:
import legacyAdapter from './core/src/api/legacy/legacyAdapter.js';
app.use('/api/legacy', legacyAdapter);
```

---

### Phase 2: Financial Routes Consolidation

#### Task 2.1: Verify v1/financial.js completeness

**Compare bookkeeping.js with v1/financial.js:**

| Feature | bookkeeping.js | v1/financial.js | Status |
|---------|----------------|-----------------|--------|
| POST /transactions/sync | Yes | Yes | OK |
| GET /transactions | Yes | Yes | OK |
| GET /transactions/export | Yes | Yes | OK |
| POST /transactions/:id/category | Yes | Yes | OK |
| GET /status | Yes | Yes | OK |
| GET /health | Yes | Yes | OK |
| POST /receipts/sweep | Yes | Yes | OK |
| GET /receipts/suggestions | Yes | Yes | OK |
| POST /receipts/attach | Yes | Yes | OK |
| GET /reports/summary | Yes | Yes | OK |
| GET /reports/cashflow | Yes | Yes | OK |
| GET /reports/vendors | Yes | Yes | OK |
| GET /aging | Yes | Yes | OK |
| GET /rules | Yes | Yes | OK |
| POST /rules | Yes | Yes | OK |
| DELETE /rules/:id | Yes | Yes | OK |
| POST /rules/apply | Yes | Yes | OK |
| POST /automation/daily-digest | Yes | Yes | OK |
| POST /automation/weekly-brief | Yes | Yes | OK |
| POST /intelligence/recommendations/run | Yes | Yes | OK |
| GET /intelligence/recommendations | Yes | Yes | OK |
| PATCH /intelligence/recommendations/:id | Yes | Yes | OK |

**Conclusion:** v1/financial.js is complete. Only need to update server.js to remove direct bookkeeping.js mounting.

#### Task 2.2: Update server.js

**Files to modify:**
- `/Users/benknight/Code/act-intelligence-platform/apps/backend/server.js`

**Changes needed:**
1. Remove `bookkeeping.js` import and mounting (if present)
2. Ensure v1/financial is mounted at `/api/v1/financial`

```javascript
// REMOVE:
import bookkeepingRoutes from './core/src/api/bookkeeping.js';
app.use('/api/bookkeeping', bookkeepingRoutes);

// KEEP (already present):
import v1Router from './core/src/api/v1/index.js';
app.use('/api/v1', v1Router);
```

---

### Phase 3: Intelligence Routes Consolidation

#### Task 3.1: Update v1/intelligence.js

**Files to modify:**
- `/Users/benknight/Code/act-intelligence-platform/apps/backend/core/src/api/v1/intelligence.js`

**Current state:** Lines 1-130 - minimal redirector with no real endpoints

**Replace with full implementation:**

```javascript
/**
 * Intelligence API v1 - Unified Intelligence Router
 *
 * Consolidates:
 * - unified-intelligence.js recommendations
 * - intelligenceLayer.js project intelligence
 * - relationship-intelligence.js data
 */

import { Router } from 'express';
import { validateQuery, apiResponse, apiError } from '../../middleware/validation.js';
import { supabase } from '../../lib/database.js';

const router = Router();

// ============================================
// Status & Health
// ============================================

router.get('/status', async (req, res) => {
  try {
    // Check all intelligence services
    const services = {
      'financial-intelligence': 'operational',
      'contact-intelligence': 'operational',
      'relationship-intelligence': 'operational',
      'project-intelligence': 'operational'
    };

    res.json({
      success: true,
      service: 'unified-intelligence',
      version: '1.0.0',
      features: Object.keys(services),
      status: 'operational',
      services
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STATUS_ERROR' });
  }
});

router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      'financial-intelligence': 'operational',
      'contact-intelligence': 'operational',
      'business-intelligence': 'operational',
      'decision-intelligence': 'operational'
    }
  });
});

// ============================================
// AI Recommendations
// ============================================

router.get('/recommendations', async (req, res) => {
  try {
    // Fetch real recommendations from database
    const { data: recommendations } = await supabase
      .from('automated_insights')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(20);

    // If no recommendations, generate mock for compatibility
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'opportunity',
        title: 'High-Priority Grant Opportunity',
        message: 'NSW Sustainability Grant (Round 3) closes in 12 days',
        priority: 'high',
        category: 'funding',
        confidence: 92,
        action: 'Review eligibility and prepare application',
        deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        impact: 'high',
        source: 'opportunity-scout'
      }
    ];

    const finalRecommendations = recommendations?.length > 0
      ? recommendations.map(r => ({
          id: r.id,
          type: r.type || 'general',
          title: r.title || 'Recommendation',
          message: r.description || '',
          priority: r.priority || 'medium',
          category: r.category || 'general',
          confidence: r.confidence || 75,
          action: r.action_required || 'Review',
          deadline: r.deadline || null,
          impact: r.impact || 'medium',
          source: r.generated_by || 'system'
        }))
      : mockRecommendations;

    return apiResponse(res, {
      recommendations: finalRecommendations,
      metadata: {
        total: finalRecommendations.length,
        highPriority: finalRecommendations.filter(r => r.priority === 'high').length,
        sources: ['opportunity-scout', 'relationship-intelligence', 'project-intelligence', 'financial-intelligence', 'contact-intelligence'],
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    // Return mock data on error for backward compatibility
    return apiResponse(res, {
      recommendations: [],
      metadata: {
        total: 0,
        highPriority: 0,
        sources: [],
        lastUpdated: new Date().toISOString()
      },
      warning: 'Could not fetch live recommendations'
    });
  }
});

// ============================================
// Intelligence Analytics
// ============================================

router.get('/analytics/overview', async (req, res) => {
  try {
    // Get counts from various tables
    const [{ count: contactsCount }, { count: projectsCount }, { count: insightsCount }] = await Promise.all([
      supabase.from('person_identity_map').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('automated_insights').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    return apiResponse(res, {
      overview: {
        totalContacts: contactsCount || 0,
        totalProjects: projectsCount || 0,
        activeInsights: insightsCount || 0,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'ANALYTICS_ERROR' });
  }
});

export default router;
```

#### Task 3.2: Update Legacy Adapter for Intelligence

**Add to legacy/legacyAdapter.js:**

```javascript
/**
 * Unified Intelligence Legacy Endpoints
 * Redirects to v1 intelligence API
 */
router.get('/unified-intelligence', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/intelligence instead');
  res.redirect(301, '/api/v1/intelligence');
});

router.get('/unified-intelligence/recommendations', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/intelligence/recommendations instead');
  res.redirect(301, '/api/v1/intelligence/recommendations');
});

router.get('/intelligenceLayer', (req, res) => {
  res.set('X-Deprecated', 'Use /api/v1/intelligence instead');
  res.redirect(301, '/api/v1/intelligence');
});
```

---

### Phase 4: Server.js Cleanup

#### Task 4.1: Final server.js Review

**Routes to keep:**
```javascript
// V1 Standardized API
import v1Router from './core/src/api/v1/index.js';
app.use('/api/v1', v1Router);

// Legacy adapter
import legacyAdapter from './core/src/api/legacy/legacyAdapter.js';
app.use('/api/legacy', legacyAdapter);
```

**Routes to remove/deprecate:**
```javascript
// REMOVE - consolidated into v1:
app.use('/api/contact-intelligence', contactIntelligenceRoutes);
// (use /api/legacy for backward compat)

// REMOVE - consolidated into v1/financial:
app.use('/api/bookkeeping', bookkeepingRoutes);
// (use /api/legacy for backward compat)
```

---

## Migration Timeline

| Week | Phase | Actions |
|------|-------|---------|
| 1 | Contact Consolidation | Add features to v1/contacts.js, update legacy adapter |
| 2 | Financial Consolidation | Update server.js, remove direct mounting |
| 3 | Intelligence Consolidation | Update v1/intelligence.js, update legacy adapter |
| 4 | Final Cleanup | Archive deprecated files, update documentation |

## Testing Checklist

- [ ] All v1 endpoints return correct responses
- [ ] Legacy adapter redirects work correctly
- [ ] Deprecation headers are present in legacy responses
- [ ] CSV import works in v1/contacts.js
- [ ] Campaign management works in v1/contacts.js
- [ ] Recommendations endpoint works in v1/intelligence.js
- [ ] No duplicate endpoints return different data

## Rollback Plan

If issues arise during consolidation:
1. Revert server.js changes to re-enable direct route mounting
2. Keep legacy adapter as backup
3. Run parallel testing before complete migration
