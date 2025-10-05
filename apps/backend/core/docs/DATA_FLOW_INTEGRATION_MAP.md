# ACT Platform - Data Flow and Integration Mapping

*Generated on: 2025-08-28 as part of Task 16.3: Map Backend Code to Data Flows and Integrations*

## 📋 Executive Summary

This document provides a comprehensive analysis of data flows and integration patterns across the ACT Platform backend. It maps **81 API route files**, **3 core data sources**, **8 external integrations**, and **10+ internal services** to create a complete picture of how data moves through the system.

## 🏗️ Core Architecture Overview

### **Data Source Layer**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL     │    │     Redis       │    │     Neo4j       │
│  (Supabase)     │    │    Cache        │    │ Knowledge Graph │
│  Structured     │    │  Session        │    │  Relationships  │
│  Data + FLE     │    │  Storage        │    │   & Graph Data  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Integration Registry Layer**
The `IntegrationRegistry` class serves as the central orchestrator for all data sources and external integrations:

- **Core Data Sources**: PostgreSQL, Redis, Neo4j with health monitoring
- **External APIs**: Gmail, LinkedIn, Notion, Xero with rate limiting
- **Internal Services**: Compliance, Observability, ML Pipeline with security controls

### **API Endpoint Layer**
**81 Route Files** organized by domain:
- **Financial**: 10+ endpoints (bookkeeping, finance dashboard, receipts, billing)
- **Intelligence**: 15+ endpoints (AI services, ML pipeline, relationship analysis)
- **Integration**: 20+ endpoints (Notion, Gmail, LinkedIn, Xero sync)
- **Dashboard**: 8+ endpoints (analytics, performance, business intelligence)
- **Security**: 6+ endpoints (compliance, privacy, data sovereignty)
- **Ecosystem**: 5+ endpoints (projects, organizations, opportunities)

## 🔄 Data Flow Patterns Analysis

### **Pattern 1: Direct Database Access**
```
API Endpoint → PostgreSQL Data Source → Field-Level Encryption → Response
```

**Examples:**
- `dashboard.js` → PostgreSQL → Project/Story data → Dashboard metrics
- `empathyLedger.js` → PostgreSQL → User/Organization data → Community insights
- `bookkeeping.js` → PostgreSQL → Financial transactions → Accounting reports

**Key Files:**
- `src/services/dataSources/postgresDataSource.js` - Handles Supabase client with FLE
- `src/services/encryptionService.js` - Field-level encryption for sensitive data

### **Pattern 2: External API Integration with Caching**
```
API Endpoint → External Service → Data Processing → Cache (Redis) → Response
                     ↓
                Neo4j (Relationship data)
```

**Examples:**
- `gmailIntelligence.js` → Gmail API → Intelligence processing → Redis cache → Insights
- `linkedinRelationshipIntelligence.js` → LinkedIn API → Graph analysis → Neo4j → Relationships
- `notion-proxy.js` → Notion API → Content processing → Cache → Structured data

**Key Files:**
- `src/services/gmailIntelligenceService.js` - Gmail data processing
- `src/services/linkedinIntelligenceService.js` - LinkedIn relationship analysis
- `src/services/notionService.js` - Notion content management

### **Pattern 3: Multi-Source Data Aggregation**
```
API Endpoint → Multiple Sources → Data Normalization → Unified Response
     ↓              ↓                    ↓
PostgreSQL    External APIs        Knowledge Graph
```

**Examples:**
- `ecosystem.js` → Notion + PostgreSQL + Neo4j → Enriched ecosystem data
- `universalIntelligence.js` → Gmail + LinkedIn + Notion → Comprehensive insights
- `dashboard.js` → PostgreSQL + Redis + External APIs → Real-time metrics

**Key Files:**
- `src/services/ecosystemEnrichmentService.js` - Multi-source data enrichment
- `src/services/unifiedEcosystemSyncService.js` - Cross-platform synchronization
- `src/services/universalIntelligenceOrchestrator.js` - Multi-source AI processing

### **Pattern 4: Event-Driven Data Processing**
```
External Webhook → Event Queue → Background Processing → Data Storage → Notifications
```

**Examples:**
- `syncEventWebhook.js` → Event queue → Background sync → PostgreSQL → Notifications
- `bookkeepingNotifications.js` → Financial events → Processing → Email alerts
- `knowledgeGraphSync.js` → Data changes → Graph updates → Relationship rebuilding

**Key Files:**
- `src/services/syncEventQueueService.js` - Event processing queue
- `src/services/syncEventWebhookService.js` - Webhook management
- `src/services/knowledgeGraphSyncService.js` - Graph synchronization

## 🗺️ Detailed Integration Mapping

### **Core Data Sources**

#### **PostgreSQL (Supabase) - Primary Database**
- **Classification**: Restricted
- **Encryption**: Field-level encryption for sensitive data
- **Tables**: users, stories, organizations, opportunities, transactions, etc.
- **Connected APIs**: 60+ endpoints
- **Key Features**: Row-level security, real-time subscriptions, auto-generated APIs

**Major API Consumers:**
```
bookkeeping.js (20 endpoints) → Financial transactions
dashboard.js (14 endpoints) → Dashboard metrics  
empathyLedger.js (8 endpoints) → Community data
ecosystem.js (13 endpoints) → Project/organization data
privacy.js (6 endpoints) → Data governance
```

#### **Redis - Cache & Session Storage**
- **Classification**: Internal
- **Purpose**: Performance optimization, session management, rate limiting
- **Connected APIs**: 40+ endpoints (via caching layer)
- **Key Features**: TTL management, pub/sub messaging, distributed locking

**Major API Consumers:**
```
All intelligence APIs → Response caching
xeroAuth.js → Token storage
gmailSync.js → Rate limiting
bookkeeping.js → Distributed locking
```

#### **Neo4j - Knowledge Graph**
- **Classification**: Confidential
- **Purpose**: Relationship analysis, graph traversal, AI features
- **Connected APIs**: 15+ intelligence endpoints
- **Key Features**: CYPHER queries, relationship modeling, graph algorithms

**Major API Consumers:**
```
relationshipIntelligence.js → Professional networks
knowledgeGraph.js → Entity relationships
linkedinRelationshipIntelligence.js → Social connections
universalIntelligence.js → Cross-platform insights
```

### **External API Integrations**

#### **Gmail API Integration**
- **Flow Direction**: Source (Read-only)
- **Authentication**: OAuth 2.0
- **Rate Limits**: 5 req/sec, 1000 req/hour
- **Data Classification**: Confidential

**Integration Chain:**
```
Gmail API → gmailIntelligenceService → Processing → Redis Cache → Neo4j Relationships
```

**Connected Endpoints:**
- `gmailIntelligence.js` - Email analysis and insights
- `gmailSync.js` - Email synchronization
- `gmailLinkedInIntegration.js` - Cross-platform correlation

#### **LinkedIn API Integration**
- **Flow Direction**: Source (Read-only)
- **Authentication**: OAuth 2.0
- **Rate Limits**: 2 req/sec, 500 req/hour
- **Data Classification**: Confidential

**Integration Chain:**
```
LinkedIn API → linkedinIntelligenceService → Graph Analysis → Neo4j → Relationship Insights
```

**Connected Endpoints:**
- `linkedinRelationshipIntelligence.js` - Professional relationship analysis
- `linkedinMassive.js` - Bulk data processing
- `linkedinRealData.js` - Live data integration
- `linkedinLocalAnalytics.js` - Local analysis processing

#### **Notion API Integration**
- **Flow Direction**: Bidirectional (Read/Write)
- **Authentication**: API Key
- **Rate Limits**: 3 req/sec, 1000 req/hour
- **Data Classification**: Internal

**Integration Chain:**
```
Notion API ↔ notionService ↔ Content Processing ↔ PostgreSQL ↔ Dashboard APIs
```

**Connected Endpoints:**
- `notion-proxy.js` - Content management proxy
- `notionPublish.js` - Publishing workflows
- `notionProjectTemplate.js` - Project templates
- `ecosystem.js` - Project/organization sync

#### **Xero API Integration**
- **Flow Direction**: Source (Read-only)
- **Authentication**: OAuth 2.0
- **Rate Limits**: 1 req/sec, 5000 req/hour
- **Data Classification**: Restricted (Financial)

**Integration Chain:**
```
Xero API → xeroTokenManager → Financial Processing → PostgreSQL → Bookkeeping APIs
```

**Connected Endpoints:**
- `bookkeeping.js` - Transaction synchronization
- `financeDashboard.js` - Financial analytics
- `xeroAuth.js` - Authentication management

### **Internal Service Integrations**

#### **AI/ML Pipeline Services**
- **Services**: `mlPipelineService`, `universalIntelligenceOrchestrator`, `multiProviderAI`
- **Data Flow**: PostgreSQL + External APIs → AI Processing → Insights → Neo4j + Cache
- **Connected APIs**: 10+ intelligence endpoints

#### **Compliance & Security Services**
- **Services**: `complianceMonitor`, `privacyService`, `securityGuardrailsService`
- **Data Flow**: All APIs → Security validation → Audit logging → Compliance reporting
- **Connected APIs**: All 81 endpoints (middleware layer)

#### **Observability & Monitoring**
- **Services**: `observabilityService`, `tracingService`, `slaMonitoringService`
- **Data Flow**: API calls → Performance metrics → Monitoring dashboard → Alerts
- **Connected APIs**: All endpoints (instrumentation layer)

## 📊 Data Flow Metrics & Analysis

### **API Endpoint Distribution by Data Source**

| Data Source | Connected APIs | Primary Use Cases | Data Classification |
|-------------|----------------|-------------------|-------------------|
| PostgreSQL | 60+ endpoints | Core business data | Restricted |
| Redis | 40+ endpoints | Caching, sessions | Internal |
| Neo4j | 15+ endpoints | Relationships, AI | Confidential |
| External APIs | 35+ endpoints | Data ingestion | Varies |

### **Integration Complexity Analysis**

**High Complexity Integrations** (Multi-source, Real-time):
- `universalIntelligence.js` - 4 data sources, AI processing
- `ecosystem.js` - 3 sources, real-time enrichment
- `dashboard.js` - Multiple sources, real-time metrics

**Medium Complexity** (2-3 sources):
- `bookkeeping.js` - Xero + PostgreSQL + Redis
- `relationshipIntelligence.js` - Neo4j + External APIs
- `gmailIntelligence.js` - Gmail API + Neo4j + Cache

**Low Complexity** (Single source):
- `privacy.js` - PostgreSQL only
- `media.js` - File storage only
- Basic CRUD endpoints

### **Data Flow Bottlenecks & Optimization Points**

**Identified Bottlenecks:**
1. **External API Rate Limits** - Gmail (5 req/sec), LinkedIn (2 req/sec)
2. **Large Dataset Processing** - LinkedIn bulk imports, Gmail sync
3. **Complex Graph Queries** - Neo4j relationship traversal
4. **Cross-Source Joins** - Real-time multi-source aggregation

**Optimization Strategies:**
1. **Intelligent Caching** - Multi-layer Redis caching for expensive operations
2. **Background Processing** - Event-driven async processing for heavy workloads
3. **Connection Pooling** - Database connection optimization
4. **Query Optimization** - Indexed queries, prepared statements

## 🔄 Data Synchronization Patterns

### **Real-time Sync Patterns**
- **Webhook-based**: Notion → Real-time updates → Dashboard refresh
- **Polling-based**: Xero transactions → Scheduled sync → Financial reports
- **Event-driven**: User actions → Event queue → Cross-system updates

### **Batch Processing Patterns**
- **Daily Financial Sync**: Xero → Bulk transaction import → Analysis
- **Weekly Relationship Rebuild**: LinkedIn data → Graph analysis → Neo4j update
- **Monthly Data Consistency Check**: Cross-source validation → Repair operations

### **Conflict Resolution**
- **Last-write-wins**: Simple timestamp-based resolution
- **Business Rule Priority**: Financial data takes precedence
- **Manual Review Queue**: Complex conflicts flagged for human review

## 🎯 Integration Health & Monitoring

### **Health Check Implementation**
Every integration in the registry implements health monitoring:
```javascript
healthCheck: async connector => {
  return await connector.healthCheck();
}
```

**Monitoring Coverage:**
- **Database Connections**: Connection pooling status, query performance
- **External API Status**: Rate limit compliance, response times, error rates
- **Service Dependencies**: Internal service availability, response times

### **Error Handling & Resilience**
- **Circuit Breaker Pattern**: Automatic failover for unhealthy integrations
- **Retry Logic**: Exponential backoff with jitter
- **Graceful Degradation**: Fallback to cached data when possible
- **Error Taxonomy**: Structured error classification and handling

## 📈 Integration Evolution & Scalability

### **Current State**
- **81 API endpoints** across diverse domains
- **11 registered integrations** with health monitoring
- **3 data classification levels** with appropriate security
- **4 authentication methods** (OAuth, API Key, Basic, Certificate)

### **Scalability Considerations**
1. **Horizontal Scaling**: Load balancing across multiple backend instances
2. **Database Sharding**: PostgreSQL partitioning for large datasets
3. **Microservice Architecture**: Service decomposition for independent scaling
4. **API Gateway**: Centralized routing, rate limiting, and monitoring

### **Future Integration Points**
- **Slack API**: Team communication intelligence
- **Airtable**: Alternative content management
- **Zapier**: Workflow automation
- **Stripe**: Payment processing
- **SendGrid**: Email automation

## ⚡ Key Insights & Recommendations

### **Strengths**
1. **Centralized Registry**: Single source of truth for all integrations
2. **Security-First Design**: Field-level encryption, data classification
3. **Health Monitoring**: Proactive integration health tracking
4. **Flexible Architecture**: Support for multiple integration patterns

### **Areas for Improvement**
1. **Rate Limit Management**: More sophisticated throttling and queuing
2. **Data Consistency**: Enhanced cross-source validation and repair
3. **Monitoring Coverage**: More detailed performance and business metrics
4. **Documentation**: Auto-generated integration documentation

### **Immediate Actions**
1. **Complete OpenAPI Documentation**: Extend current 6/626 endpoint coverage
2. **Enhanced Health Checks**: More granular health monitoring
3. **Performance Optimization**: Query optimization and caching improvements
4. **Security Audit**: Regular security review of all integrations

This comprehensive mapping provides the foundation for understanding, maintaining, and evolving the ACT Platform's complex integration ecosystem while ensuring security, performance, and scalability.