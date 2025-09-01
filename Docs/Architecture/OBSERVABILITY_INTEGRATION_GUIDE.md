# ACT Placemat Observability Integration Guide

**Generated**: 2025-08-27  
**Purpose**: Integration guide for Task 18.2 - Instrument Data Lake Services for Standardized Metrics Collection  
**Status**: Implementation Complete ✅

## Overview

This guide shows how to integrate the new observability instrumentation into existing ACT Placemat services. The instrumentation provides Prometheus metrics, health monitoring, and comprehensive tracking for all data lake components.

## Quick Start

### 1. Basic Service Integration

```javascript
// Example: Instrumenting the Notion service
const { createInstrumentedServices } = require('../services/instrumentationWrappers');
const { notionService } = require('../services/notionService');

// Create instrumented version
const instrumentedServices = createInstrumentedServices();
const instrumentedNotionService = instrumentedServices.notion(notionService);

// Use the instrumented service as normal
const projects = await instrumentedNotionService.getProjects();
// Metrics are automatically tracked: response time, success/failure, record counts
```

### 2. Express App Integration

```javascript
// In your main server.js or app.js
const express = require('express');
const { observabilityService } = require('./services/observabilityService');
const observabilityRoutes = require('./api/observability');

const app = express();

// Add HTTP request tracking middleware
app.use(observabilityService.createHTTPMiddleware());

// Add observability API routes
app.use('/api/observability', observabilityRoutes);

// Health check endpoint (for load balancers)
app.get('/health', async (req, res) => {
  const health = observabilityService.getDataLakeHealthSummary();
  res.status(health.overall.status === 'healthy' ? 200 : 503).json(health);
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(observabilityService.getMetrics());
});
```

## Service-Specific Integration Examples

### Notion Service Integration

```javascript
// Before: Basic Notion service
class NotionService {
  async syncProjects() {
    const projects = await this.notion.databases.query({
      database_id: this.projectsDbId
    });
    return this.processProjects(projects);
  }
}

// After: Instrumented Notion service
const { instrumentNotionService } = require('../services/instrumentationWrappers');

class NotionService {
  constructor() {
    // Instrument this service to track all method calls
    return instrumentNotionService(this);
  }
  
  async syncProjects() {
    const projects = await this.notion.databases.query({
      database_id: this.projectsDbId
    });
    // Metrics automatically tracked:
    // - data_sync_duration_seconds{source="notion",sync_type="syncProjects"}
    // - data_sync_records_processed{source="notion",sync_type="syncProjects",operation="processed"}
    // - data_source_response_time_seconds{source="notion",operation="syncProjects",status="success"}
    return this.processProjects(projects);
  }
}
```

### AI Service Integration

```javascript
// Instrumenting AI service calls
const { instrumentAIService } = require('../services/instrumentationWrappers');

class AIService {
  constructor() {
    this.anthropic = instrumentAIService(anthropicClient, 'anthropic');
    this.openai = instrumentAIService(openaiClient, 'openai');
  }
  
  async generateContent(prompt, options = {}) {
    const result = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      messages: [{ role: 'user', content: prompt }],
      ...options
    });
    
    // Automatically tracked metrics:
    // - ai_requests_total{provider="anthropic",model="claude-3-sonnet-20240229",operation="create",status="success"}
    // - ai_request_duration_seconds{provider="anthropic",model="claude-3-sonnet-20240229",operation="create"}
    // - ai_tokens_used_total{provider="anthropic",model="claude-3-sonnet-20240229",token_type="total"}
    // - ai_cost_usd_total{provider="anthropic",model="claude-3-sonnet-20240229"}
    
    return result;
  }
}
```

### Database Service Integration  

```javascript
// Instrumenting database operations
const { instrumentDatabaseService } = require('../services/instrumentationWrappers');

class DatabaseService {
  constructor() {
    this.pg = instrumentDatabaseService(pgClient, 'postgresql');
    this.supabase = instrumentDatabaseService(supabaseClient, 'supabase');
  }
  
  async getUsers() {
    const users = await this.pg.query('SELECT * FROM users WHERE active = $1', [true]);
    // Automatically tracked:
    // - database_query_duration_seconds{database="postgresql",operation="query",table="users"}
    return users.rows;
  }
}
```

### Queue Service Integration

```javascript
// Instrumenting queue operations
const { instrumentQueueService } = require('../services/instrumentationWrappers');

class QueueService {
  constructor() {
    this.syncQueue = instrumentQueueService(syncQueue, 'data_sync');
    this.aiQueue = instrumentQueueService(aiQueue, 'ai_processing');
  }
  
  async addSyncJob(source, operation, data) {
    await this.syncQueue.add({
      type: `${source}_${operation}`,
      source,
      operation,
      data
    }, { priority: 'high' });
    
    // Automatically tracked:
    // - queue_depth{queue_name="data_sync",priority="high"}
  }
  
  async processSyncJob(job) {
    // Processing time automatically tracked:
    // - queue_processing_duration_seconds{queue_name="data_sync",job_type="notion_sync"}
    const result = await this.performSync(job.data);
    return result;
  }
}
```

## Available Metrics

### HTTP Metrics
- `http_requests_total` - Counter of HTTP requests by method, route, status code
- `http_request_duration_seconds` - Histogram of HTTP request durations

### Data Source Metrics
- `data_source_connection_status` - Gauge of connection health (1=healthy, 0=unhealthy)  
- `data_source_response_time_seconds` - Histogram of API response times
- `data_sync_status` - Gauge of sync operation success (1=success, 0=failure)
- `data_sync_duration_seconds` - Histogram of sync operation durations
- `data_sync_records_processed` - Gauge of records processed per sync

### AI Metrics
- `ai_requests_total` - Counter of AI API requests by provider, model, operation
- `ai_request_duration_seconds` - Histogram of AI request processing times
- `ai_tokens_used_total` - Counter of tokens consumed by provider and model
- `ai_cost_usd_total` - Counter of cumulative AI costs in USD

### Database Metrics
- `database_connection_pool_size` - Gauge of connection pool sizes
- `database_query_duration_seconds` - Histogram of database query times
- `database_active_connections` - Gauge of active database connections

### Queue Metrics
- `queue_depth` - Gauge of items in each queue by priority
- `queue_processing_duration_seconds` - Histogram of job processing times

### Business Metrics
- `data_freshness_seconds` - Gauge of seconds since last data update
- `business_metrics` - Gauge for custom business KPIs

## API Endpoints

All observability endpoints are available under `/api/observability/`:

### Core Endpoints
- `GET /api/observability/metrics` - Prometheus metrics (for Prometheus scraping)
- `GET /api/observability/health` - Overall system health check
- `GET /api/observability/dashboard` - Complete dashboard data
- `GET /api/observability/config` - Configuration and capabilities

### Detailed Endpoints  
- `GET /api/observability/health/:source` - Health of specific data source
- `GET /api/observability/freshness` - Data freshness status
- `GET /api/observability/performance` - System performance metrics
- `GET /api/observability/incidents` - Recent incidents and errors
- `GET /api/observability/business` - Business metrics and KPIs
- `POST /api/observability/test/:source` - Test specific data source connection

### Documentation
- `GET /api/observability/docs` - OpenAPI documentation

## Manual Metrics Tracking

For custom metrics not covered by the automatic instrumentation:

```javascript
const { observabilityService } = require('../services/observabilityService');

// Track custom business metrics
observabilityService.trackBusinessMetric('active_projects', 45, 'engagement');
observabilityService.trackBusinessMetric('monthly_revenue_aud', 12500, 'finance');

// Track API quota usage manually
observabilityService.trackAPIQuotaUsage('xero', 'invoices', 75.5); // 75.5% used

// Track rate limit hits
observabilityService.trackRateLimitHit('google', 'calendar_events');

// Track custom sync operations
observabilityService.trackDataSync('linkedin', 'contacts_import', 45.2, 1250, true);

// Track custom AI requests (if not using instrumented service)
observabilityService.trackAIRequest(
  'anthropic', 
  'claude-3-sonnet', 
  'content_generation',
  2.3, // duration in seconds
  { total: 1250, prompt: 850, completion: 400 }, // token usage
  0.08, // cost in USD
  true // success
);
```

## Integration with Existing Prometheus Stack

The metrics are compatible with the existing Prometheus configuration in `docker/prometheus/prometheus.yml`. The API Gateway metrics endpoint has been added to the scrape configuration:

```yaml
- job_name: 'api-gateway-observability'
  static_configs:
    - targets: ['api-gateway:3000']
  scrape_interval: 15s
  metrics_path: /api/observability/metrics
```

## Health Check Integration

Health checks run automatically every 30 seconds and check:

- **External APIs**: Xero, Notion, Google Calendar, Gmail, LinkedIn (credential validation)
- **Databases**: PostgreSQL, Supabase, Redis, Neo4j (connection validation)
- **AI Services**: Anthropic, OpenAI, Perplexity (credential validation)

Health status is available via:
- Individual service: `GET /api/observability/health/notion`
- Overall status: `GET /api/observability/health`
- Test specific service: `POST /api/observability/test/xero`

## Next Steps

1. **Add to existing services**: Wrap existing service classes with instrumentation
2. **Configure alerts**: Set up Grafana alerts based on the new metrics
3. **Create dashboards**: Build Grafana dashboards using the metrics endpoints
4. **Monitor usage**: Track the observability endpoints themselves for usage patterns
5. **Extend business metrics**: Add custom business KPIs relevant to your use case

## Configuration Requirements

Ensure these packages are installed in your backend:
```bash
npm install prom-client@^15.1.3
```

The observability services are auto-loaded and will start monitoring immediately when imported.

## Australian Compliance

All metrics collection respects Australian data residency requirements:
- Metrics stored locally in Australian-hosted infrastructure
- No sensitive data included in metric labels
- All data source connections validated for Australian compliance
- Monitoring data retention follows Australian privacy regulations