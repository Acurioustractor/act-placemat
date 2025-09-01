# ACT Placemat Data Lake Ecosystem Inventory

**Generated**: 2025-08-27  
**Purpose**: Complete inventory of data sources, APIs, and integration points for observability dashboard implementation  
**Task**: 18.1 - Map Data Lake Ecosystem and Define Monitoring Requirements

## Executive Summary

The ACT Placemat platform operates as a comprehensive data lake connecting multiple external services and internal systems. This inventory identifies **12 primary data sources**, **4 internal databases**, **15+ API endpoints**, and **25+ integration services** that require monitoring for optimal platform health.

## Data Sources Inventory

### 1. External Data Sources

#### Primary Business Systems
1. **Xero (Accounting Platform)**
   - **Purpose**: Financial data, invoices, transactions, compliance reporting
   - **API Type**: REST API v2.0
   - **Auth Method**: OAuth 2.0 + JWT tokens
   - **Update Frequency**: Real-time webhooks + polling every 15 minutes
   - **Data Flow**: Bidirectional (read financial data, create transactions)
   - **Key Endpoints**: 
     - `/Invoices` - Invoice management
     - `/BankTransactions` - Banking data
     - `/Reports` - Financial reports
   - **Integration Files**: `src/services/xeroTokenManager.js`, `src/api/xeroAuth.js`

2. **Notion (Knowledge Management)**
   - **Purpose**: Projects, people, organisations, opportunities database
   - **API Type**: REST API v2021-08-16  
   - **Auth Method**: Integration tokens (Bearer)
   - **Update Frequency**: Real-time via webhooks + sync every 30 minutes
   - **Data Flow**: Bidirectional (read/write content, sync databases)
   - **Key Databases**:
     - Projects Database
     - People/Contacts Database  
     - Organisations Database
     - Opportunities Database
   - **Integration Files**: `src/services/notionService.js`, `src/notion-integration.js`

3. **Google Workspace (Calendar & Gmail)**
   - **Purpose**: Calendar events, email intelligence, contact management
   - **API Type**: REST API (Calendar v3, Gmail v1)
   - **Auth Method**: OAuth 2.0 Service Account + JWT
   - **Update Frequency**: Real-time push notifications + polling every 5 minutes
   - **Data Flow**: Read-heavy with selective write (calendar events)
   - **Key Services**:
     - Google Calendar API
     - Gmail API  
     - Contacts API
   - **Integration Files**: `src/services/googleCalendarService.js`, `src/services/gmailIntelligenceService.js`

4. **LinkedIn (Professional Network)**
   - **Purpose**: Contact relationships, professional intelligence, network analysis
   - **API Type**: REST API v2
   - **Auth Method**: OAuth 2.0 (User consent required)
   - **Update Frequency**: Batch import + manual sync
   - **Data Flow**: Read-only (profile data, connections, messages)
   - **Integration Files**: `src/api/linkedinIntelligence.js`, `src/services/linkedinIntelligenceService.js`

#### AI/ML Services  
5. **Anthropic Claude (Primary AI)**
   - **Purpose**: Content analysis, intelligent insights, decision support
   - **API Type**: REST API
   - **Auth Method**: API Key (Bearer token)
   - **Usage Pattern**: On-demand processing, content enhancement
   - **Integration Files**: `src/services/multiProviderAI.js`

6. **OpenAI (Secondary AI)**
   - **Purpose**: Backup AI processing, specialized tasks
   - **API Type**: REST API v1
   - **Auth Method**: API Key (Bearer token)  
   - **Usage Pattern**: Fallback processing, specialized analysis
   - **Integration Files**: `src/services/multiProviderAI.js`

7. **Perplexity (Research AI)**
   - **Purpose**: Research-backed analysis, fact verification
   - **API Type**: REST API
   - **Auth Method**: API Key
   - **Usage Pattern**: Research queries, data validation
   - **Integration Files**: `src/services/researchAnalystService.js`

### 2. Internal Data Storage

#### Primary Databases
1. **PostgreSQL (Primary Database)**
   - **Purpose**: Structured data, user accounts, processed analytics
   - **Technology**: PostgreSQL 16 with Alpine Linux
   - **Connection**: Direct TCP connection via Prisma ORM
   - **Schemas**: Multiple schemas (empathy_ledger, bookkeeping, privacy, etc.)
   - **Monitoring Needs**: Connection pool, query performance, disk usage
   - **Config**: `docker-compose.yml` - postgres service

2. **Supabase (Cloud PostgreSQL)**
   - **Purpose**: Additional structured storage, backup, specific datasets
   - **Technology**: Supabase-managed PostgreSQL
   - **Connection**: REST API + PostgREST
   - **Auth**: Service role keys
   - **Integration Files**: `src/config/supabase.js`, `src/services/supabaseDataService.js`

3. **Redis (Cache & Task Queue)**
   - **Purpose**: Session storage, caching, background job queue
   - **Technology**: Redis 7 Alpine
   - **Connection**: Redis protocol
   - **Data Types**: Strings, hashes, lists, sets, sorted sets
   - **Monitoring Needs**: Memory usage, connection count, cache hit ratio
   - **Config**: `docker-compose.yml` - redis service

4. **Neo4j (Knowledge Graph)**
   - **Purpose**: Relationship modeling, graph analytics
   - **Technology**: Neo4j 5.x (planned)
   - **Connection**: Bolt protocol
   - **Schema**: Custom knowledge graph (projects, people, relationships)
   - **Integration Files**: `src/database/neo4j-knowledge-graph-schema.cypher`

## API Endpoints Inventory

### Internal APIs (Backend Services)

#### Core Platform APIs
- **Intelligence Hub**: `http://intelligence-hub:3002`
  - `/health` - Health check
  - `/api/metrics/agents` - Multi-agent system metrics
  - `/api/metrics/tasks` - Task queue metrics  
  - `/api/metrics/compliance` - Compliance monitoring

- **AI Workhouse**: `http://ai-workhouse:3003` 
  - `/health` - Health check
  - Financial intelligence APIs
  - Receipt processing APIs

- **Values Compliance**: `http://values-compliance:3001`
  - `/health` - Health check
  - Compliance validation APIs

#### Data Integration APIs  
- **Notion Integration**: Multiple endpoints for database sync
- **Gmail Intelligence**: Email processing and insights
- **LinkedIn Integration**: Professional network analysis
- **Xero Integration**: Financial data synchronization
- **Knowledge Graph**: Relationship and project mapping

### External API Dependencies

#### Business System APIs
- **Xero API**: `https://api.xero.com/api.xro/2.0/`
- **Notion API**: `https://api.notion.com/v1/`
- **Google Calendar**: `https://www.googleapis.com/calendar/v3/`
- **Gmail API**: `https://gmail.googleapis.com/gmail/v1/`
- **LinkedIn API**: `https://api.linkedin.com/v2/`

#### AI Service APIs
- **Anthropic**: `https://api.anthropic.com/v1/`
- **OpenAI**: `https://api.openai.com/v1/`
- **Perplexity**: `https://api.perplexity.ai/`

## Integration Services & Data Flows

### Data Processing Services
1. **Multi-Provider AI Orchestrator** (`multiProviderAIOrchestrator.js`)
   - Routes AI requests across providers
   - Handles failover and load balancing
   - Monitoring needs: Response times, error rates, cost tracking

2. **Ecosystem Orchestrator** (`ecosystemOrchestrator.js`)
   - Coordinates data flows between services
   - Manages sync schedules and dependencies
   - Monitoring needs: Pipeline success rates, data freshness

3. **Knowledge Graph Service** (`knowledgeGraphService.js`)
   - Maintains relationship mappings
   - Processes entity relationships
   - Monitoring needs: Graph consistency, update latency

4. **Intelligence Service** (`intelligenceAI.js`)
   - Processes insights and patterns
   - Generates recommendations
   - Monitoring needs: Processing queue, accuracy metrics

### Sync & Queue Services
1. **Sync Event Queue** (`syncEventQueueService.js`)
   - Manages asynchronous data synchronization
   - Handles retry logic and failure recovery
   - Monitoring needs: Queue depth, processing time, failure rates

2. **Gmail Sync Service** (`smartGmailSyncService.js`)
   - Syncs email data and intelligence
   - Processes attachments and calendar integration
   - Monitoring needs: Sync latency, API quota usage

3. **Notion Sync Engine** (`notionSyncEngine.js`)
   - Bidirectional sync with Notion databases
   - Handles schema changes and conflicts
   - Monitoring needs: Sync conflicts, data consistency

## Critical Monitoring Requirements

### High Priority Metrics

#### System Health
- **Service Availability**: All internal APIs (intelligence-hub, ai-workhouse, values-compliance)
- **Database Connections**: PostgreSQL, Redis connection pools
- **API Response Times**: < 2s for critical paths, < 5s for heavy processing
- **Error Rates**: < 1% for critical APIs, < 5% for experimental features

#### Data Flow Health
- **Sync Status**: Last successful sync timestamps for each external service
- **Queue Depth**: Background job queues (Redis, sync events)
- **Data Freshness**: Time since last update from each external source
- **Sync Conflicts**: Rate of data conflicts requiring manual resolution

#### External API Health
- **Rate Limiting**: API quota usage vs limits (Google, Xero, Notion, AI services)
- **Token Status**: OAuth token expiration alerts  
- **Webhook Health**: Incoming webhook success rates
- **Cost Tracking**: AI API usage and costs

#### Business Metrics
- **Data Processing Volume**: Records processed per hour/day
- **Intelligence Accuracy**: AI recommendation success rates
- **User Engagement**: Dashboard usage patterns
- **Platform Adoption**: Active users, feature utilization

### Medium Priority Metrics

#### Performance  
- **Memory Usage**: Service memory consumption trends
- **CPU Utilization**: Processing load distribution
- **Disk Usage**: Database growth, log storage
- **Network I/O**: Service-to-service communication patterns

#### Security & Compliance
- **Authentication Success Rate**: Login/token validation
- **Privacy Compliance**: Data handling audit trails
- **Security Events**: Failed authentication attempts, unusual access patterns
- **Data Residency**: Australian data locality compliance

## Recommended Dashboard Panels

### Executive Dashboard
1. **System Status Overview**: Traffic light status for all critical services
2. **Data Freshness Indicators**: Last update times for each external source  
3. **Key Business Metrics**: Daily/weekly processing volumes
4. **Alert Summary**: Active alerts requiring attention

### Technical Operations Dashboard  
1. **API Performance Grid**: Response times and error rates for all APIs
2. **Database Health Panel**: Connection pools, query performance, storage
3. **Queue Monitoring**: Background job processing and backlogs
4. **External Dependencies**: Third-party API health and quota usage

### Data Intelligence Dashboard
1. **AI Processing Metrics**: Model usage, costs, success rates
2. **Sync Pipeline Status**: Data flow health across all integrations  
3. **Knowledge Graph Health**: Entity relationships, graph consistency
4. **Intelligence Quality**: Recommendation accuracy and user feedback

## Implementation Priority

### Phase 1 (Immediate)
1. Health check endpoints for all internal services
2. Database connection and performance monitoring
3. Critical API response time tracking
4. External service availability monitoring

### Phase 2 (Short-term)  
1. Data sync status and freshness monitoring
2. Queue depth and processing time tracking
3. AI API usage and cost monitoring
4. Authentication and security event tracking

### Phase 3 (Medium-term)
1. Advanced analytics on data flow patterns
2. Predictive alerting based on usage trends
3. Automated capacity scaling triggers  
4. Comprehensive compliance reporting

This inventory provides the foundation for implementing comprehensive observability across the ACT Placemat data lake ecosystem.