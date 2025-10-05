# API Cleanup Analysis

## KEEP - Core Functional APIs (26 APIs)

### Dashboard & Data (5 APIs)
- `/api/dashboard` - Core dashboard functionality
- `/api/ecosystem` - Public ecosystem data
- `/api/ecosystem-data` - Unified ecosystem data
- `/api/system` - System health and status
- `/api/trpc` - Type-safe API endpoints

### Contact Intelligence (4 APIs)
- `/api/contact-intelligence` - Contact management system
- `/api/simple-contact-dashboard` - Real LinkedIn data dashboard
- `/api/search-contacts` - Contact search functionality
- `/api/interaction-tracking` - Contact interaction tracking

### Financial (3 APIs)
- `/api/v1/financial` - Consolidated financial API
- `/api/bookkeeping` - Core bookkeeping functionality
- `/api/billing` - Stripe billing integration

### Integration & Sync (4 APIs)
- `/api/v1/integrations` - Core integrations API
- `/api/notion` - Notion integration (2 routers combined)
- `/api/gmail-sync` - Gmail synchronization
- `/api/sync` - Cross-app data sync

### Authentication (3 APIs)
- `/api/xero` - Xero OAuth integration
- `/api/gmail` - Gmail OAuth
- `/auth` - OAuth 2.0 authentication

### Intelligence (4 APIs)
- `/api/unified-intelligence` - Unified intelligence system
- `/api/life-orchestrator` - Life orchestrator functionality
- `/api/v1/linkedin` - LinkedIn integration
- `/api/notion-ai-agent` - Notion AI agent

### Community (3 APIs)
- `/api/empathy-ledger` - Community stories
- `/api/knowledge` - Knowledge management
- `/api/privacy` - Privacy compliance

## DELETE - Redundant/Legacy APIs (40+ APIs)

### Duplicate Intelligence APIs (12 APIs)
- `/api/gmail-intelligence` - DUPLICATE of unified-intelligence
- `/api/gmail-contact-intelligence` - DUPLICATE via backward compatibility
- `/api/calendar-contact-intelligence` - DUPLICATE via backward compatibility
- `/api/intelligent-suggestions` - DUPLICATE of unified-intelligence
- `/api/morning-dashboard` - DUPLICATE of unified-intelligence
- `/api/project-contact-linkage` - DUPLICATE via backward compatibility
- `/api/intelligent-newsletter` - DUPLICATE of unified-intelligence
- `/api/real-time-alerts` - DUPLICATE of unified-intelligence
- `/api/decision-intelligence` - DUPLICATE of unified-intelligence
- `/api/gmail-linkedin` - DUPLICATE functionality
- `/api/notion-linkedin` - DUPLICATE functionality
- `/api/financial-intelligence` - DUPLICATE via backward compatibility

### Experimental/Testing APIs (8 APIs)
- `/api/farm-workflow` - Farm metaphor experiment
- `/api/opportunity-scout` - Experimental feature
- `/api/universal-knowledge-hub` - Experimental
- `/api/data-normalization` - Development tool
- `/api/performance-optimization` - Development tool
- `/api/enhanced-integration` - Development tool
- `/api/observability` - Development tool
- `/api/universal-platform` - Development tool

### Infrastructure APIs (6 APIs)
- `/api/sla-monitoring` - Infrastructure monitoring
- `/api/performance-dashboard` - Infrastructure monitoring
- `/api/events` - Analytics tracking
- `/api/metabase` - Analytics dashboard
- `/api/personalization` - User preferences
- `/api/ml` - ML diagnostics

### Complex Graph APIs (6 APIs)
- `/api/knowledge-graph` - Neo4j integration
- `/api/knowledge-graph-sync` - Neo4j sync
- `/api/sync-webhook` - Real-time sync events
- `/api/sync-queue` - Sync queue management
- `/api/data-consistency` - Data validation
- `/api/realtime` - Socket.IO management

### Legacy Compliance APIs (4 APIs)
- `/api/data-sovereignty` - GDPR compliance
- `/api/compliance-dashboard` - Compliance monitoring
- `/api/tracing` - Request tracing
- `/api/security` - Security management

### Legacy Business APIs (6 APIs)
- `/api/community-bookkeeping` - Legacy bookkeeping
- `/api/platform` - Platform media management
- `/api/integration-registry` - Legacy integration registry
- `/api/adaptive-dashboard` - Legacy dashboard
- `/api/v2/integrations` - Legacy v2 API
- `/api/legacy` - Legacy adapter

### Testing APIs (2 APIs)
- `/api/test/create-goods` - Test endpoint
- `/api/test/create-entities` - Test endpoint

### Error/Debug APIs (2 APIs)
- `/api/record-replay` - Error recording
- `/api/error-taxonomy` - Error classification

## Action Plan

1. **Delete API files** from `/apps/backend/src/api/` directory
2. **Remove imports** from `server.js`
3. **Remove app.use()** route registrations
4. **Test core functionality** still works
5. **Update documentation** to reflect new API structure

This cleanup will reduce from 70+ APIs to ~26 core APIs, making the system much more maintainable.