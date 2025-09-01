# API Consolidation Plan - Phase 1.2

## Executive Summary
Current state: **82 API route files** with **619+ individual endpoints** showing massive duplication and poor organization.
Target state: **~15-20 consolidated API domains** with clear structure and versioning.

## Critical Duplication Issues

### 1. LinkedIn Integration (6 files → 1 file)
**Current:** 6 separate files with overlapping functionality
- `linkedinIntelligence.js` - Basic LinkedIn intelligence  
- `linkedinLocalImport.js` - Local data import
- `linkedinLocalAnalytics.js` - Analytics processing
- `linkedinDebug.js` - Debugging tools
- `linkedinMassive.js` - Mass data extraction
- `linkedinRealData.js` - Real data analysis
- `linkedinRelationshipIntelligence.js` - Advanced relationship mapping

**Target:** Single `linkedin.js` with organized endpoints:
```
/api/v1/linkedin/
├── /intelligence/*      # Basic intelligence queries
├── /analytics/*         # Analytics and reporting  
├── /import/*           # Data import operations
├── /relationships/*    # Relationship mapping
├── /debug/*           # Debug and diagnostic tools
└── /extract/*         # Mass data extraction
```

### 2. Financial APIs (10+ files → 3 files) 
**Current:** Multiple overlapping financial systems
- `bookkeeping.js` (20+ endpoints) vs `communityBookkeeping.js`
- `financeDashboard.js` vs `realFinanceDashboard.js` 
- Scattered receipt, billing, and Xero integration files

**Target:** Organized financial domain:
```
/api/v1/financial/
├── /bookkeeping/*      # Core bookkeeping (consolidated)
├── /dashboard/*        # Unified dashboard (merge duplicates)
├── /integrations/*     # Xero, Stripe, receipts
└── /reporting/*        # Financial reports and analytics
```

### 3. Intelligence APIs (15+ files → 4 files)
**Current:** Massive AI/ML API sprawl with unclear boundaries
- Multiple intelligence systems (`intelligence.js`, `universalIntelligence.js`, `realIntelligence.js`)
- Separate content creation, research, compliance APIs
- Fragmented dashboard intelligence

**Target:** Logical AI service domains:
```
/api/v1/intelligence/
├── /query/*           # Universal intelligence queries  
├── /content/*         # Content creation and analysis
├── /research/*        # Research and compliance automation
└── /insights/*        # Dashboard and data insights
```

## Consolidation Priority Matrix

| Domain | Files Count | Duplication Level | Business Impact | Priority |
|--------|-------------|-------------------|-----------------|----------|
| LinkedIn | 6 | Critical | High | 🔴 P0 |
| Financial | 10+ | High | Critical | 🔴 P0 |
| Intelligence | 15+ | High | High | 🟡 P1 |
| Gmail | 4 | Medium | Medium | 🟡 P1 |
| Notion | 6 | Medium | Medium | 🟡 P1 |
| Dashboard | 8+ | Medium | High | 🟡 P1 |

## Phase 1.2 Implementation Plan

### Step 1: LinkedIn API Consolidation (Day 1)
1. **Audit Current LinkedIn Routes**
   - Map all existing endpoints across 6 files
   - Identify duplicate functionality
   - Document unique features in each file

2. **Create Unified LinkedIn API**
   - New file: `/apps/backend/src/api/v1/linkedin.js`
   - Migrate unique functionality from each file
   - Remove duplicate code
   - Implement consistent authentication
   - Add OpenAPI documentation

3. **Update Server Configuration**
   - Remove old route files from server.js
   - Mount new unified LinkedIn routes
   - Test all functionality

### Step 2: Financial API Consolidation (Day 2)
1. **Merge Dashboard Duplicates**
   - Analyze `financeDashboard.js` vs `realFinanceDashboard.js`
   - Keep best implementation, merge unique features
   - Create single unified dashboard API

2. **Consolidate Bookkeeping**
   - Merge `bookkeeping.js` and `communityBookkeeping.js`
   - Organize endpoints by function
   - Maintain all existing functionality

3. **Create Integration Endpoints**
   - Combine Xero, Stripe, and receipt processing
   - Standardize external API patterns
   - Add proper error handling

### Step 3: Intelligence API Organization (Day 3-4)
1. **Map Intelligence Functionality**
   - Document all 15+ intelligence API files
   - Identify core vs specialized functionality
   - Create consolidation matrix

2. **Create Unified Intelligence API**
   - Merge overlapping intelligence systems
   - Organize by function (query, content, research, insights)
   - Maintain AI agent functionality

## Success Metrics

### Quantitative Goals
- **Reduce API files:** 82 → ~20 files (-75%)
- **Eliminate duplicates:** Target 90% duplicate elimination
- **Improve maintainability:** Single source of truth per domain
- **Add documentation:** 100% OpenAPI coverage for consolidated APIs

### Quality Improvements  
- **Consistent routing:** All APIs use `/api/v1/domain/` pattern
- **Standard authentication:** Unified auth middleware across domains
- **Error handling:** Consistent error responses
- **Testing:** Comprehensive endpoint testing

## Risk Mitigation

### Backwards Compatibility
- Maintain existing routes during transition
- Add deprecation warnings to old endpoints
- Provide migration timeline for consumers

### Testing Strategy
- Unit tests for each consolidated endpoint
- Integration tests for cross-domain functionality  
- API contract testing with OpenAPI specs
- Performance testing for merged endpoints

### Rollback Plan
- Keep original files in `/archive/api/` during transition
- Feature flags for new vs old API behavior
- Database migration rollback procedures

## Next Steps After Consolidation

1. **API Versioning Strategy**
   - Implement semantic versioning for all APIs
   - Create deprecation and sunset policies
   - Add version negotiation middleware

2. **Documentation & Developer Experience**
   - Generate interactive API documentation
   - Create SDK/client library
   - Add comprehensive examples

3. **Performance Optimization**
   - Implement API caching strategies
   - Add response compression
   - Optimize database queries

4. **Monitoring & Analytics**
   - Add API usage analytics
   - Implement performance monitoring
   - Create alerting for API health

---

*This consolidation plan will transform the ACT Placemat API from an unmaintainable sprawl into a clean, organized, and scalable architecture.*