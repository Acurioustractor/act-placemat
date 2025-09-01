# ACT Placemat Observability Infrastructure

**Generated**: 2025-08-27  
**Task**: 18.3 - Integrate Metrics Aggregation and Storage Infrastructure  
**Status**: Implementation Complete ✅

## Overview

This directory contains the complete observability infrastructure for the ACT Placemat Intelligence Hub, including Grafana dashboards, data source configurations, and alerting rules that provide comprehensive monitoring of the data lake ecosystem.

## Dashboard Architecture

### Core Dashboards

1. **Data Lake Overview** (`json/data-lake-overview.json`)
   - Data source health status across all 12 integrated sources
   - Real-time sync operations and record processing rates
   - API response times and data freshness tracking
   - Overall sync success rate monitoring

2. **AI Services Monitoring** (`json/ai-services-monitoring.json`)
   - Request rates by AI provider (Anthropic, OpenAI, Perplexity)
   - Token usage and cost tracking in AUD
   - Model performance and success rates
   - Response time distributions

3. **Infrastructure Performance** (`infrastructure/system-performance.json`)
   - HTTP request metrics and response times
   - Database connection pool monitoring
   - Queue depth and processing times
   - Error rates by endpoint

4. **Australian Compliance** (`compliance/australian-compliance.json`)
   - Data residency compliance tracking
   - Privacy Act compliance scoring
   - Cross-border data transfer monitoring
   - Consent management and audit completeness

5. **Multi-Agent System** (`agents/multi-agent-system.json`)
   - Active agent monitoring and task completion rates
   - Inter-agent communication patterns
   - Democratic task prioritisation metrics
   - Agent collaboration network visualisation

6. **Community Governance** (`community/governance-metrics.json`)
   - Community engagement and participation rates
   - Project creation trends and cross-sector collaboration
   - Geographic distribution of engagement
   - Transparency and impact measurement tracking

7. **Security Monitoring** (`security/security-monitoring.json`)
   - Failed authentication attempts and suspicious activity
   - API rate limiting and SSL certificate status
   - Firewall events and intrusion detection
   - Network bandwidth monitoring

## Data Source Configuration

The Grafana data sources are automatically provisioned via `datasources/prometheus.yml`:

- **Prometheus**: Main metrics collection (http://prometheus:9090)
- **Loki**: Log aggregation (http://loki:3100)  
- **Intelligence Hub Database**: Direct PostgreSQL connection for detailed queries
- **Redis Metrics**: Task queue and caching metrics
- **Australian Compliance Metrics**: Custom compliance endpoint monitoring

All data sources are configured with Australian compliance headers:
```yaml
customHttpHeaders:
  X-Data-Residency: Australia
  X-Compliance-Framework: Australian-Privacy-Act
  X-Timezone: Australia/Sydney
```

## Dashboard Provisioning

Dashboards are automatically loaded via `dashboards/dashboard.yml` configuration:

- **Update Interval**: 15-60 seconds depending on dashboard type
- **Folder Structure**: Organised by monitoring domain
- **UI Updates**: Enabled for operational flexibility
- **Auto-deletion**: Disabled to prevent accidental removal

## Alerting Rules

Critical alerts are configured in `alerting/act-placemat-alerts.yml`:

### Data Lake Health Alerts
- **DataSourceDown**: Critical alert when any data source becomes unreachable
- **DataSyncFailures**: Warning when sync failure rate exceeds 10%
- **StaleData**: Warning when data hasn't been updated in over 1 hour

### AI Services Alerts
- **AIServiceHighLatency**: Warning when 95th percentile response time exceeds 30s
- **AIServiceFailures**: Critical when error rate exceeds 5%
- **HighAICosts**: Warning when daily costs projected to exceed $100 USD

### Infrastructure Alerts
- **HighErrorRate**: Critical when HTTP 5xx errors exceed 1%
- **DatabaseConnectionExhaustion**: Warning when connection pool 90% full
- **QueueBacklog**: Warning when queue depth exceeds 1000 jobs

### Security Alerts
- **SuspiciousActivityDetected**: Critical for >10 auth failures/minute
- **RateLimitExceeded**: Warning for high rate limiting activity

### Australian Compliance Alerts
- **NonAustralianDataProcessing**: Critical alert for any non-Australian processing
- **ComplianceScoreLow**: Warning when compliance score drops below 90%

### Community Governance Alerts
- **LowCommunityEngagement**: Warning when daily active users drop below 50
- **DemocraticParticipationLow**: Warning when participation rate drops below 40%

## Metrics Coverage

The dashboards visualise metrics from these key sources:

### Prometheus Metrics (from observability service)
- `data_source_connection_status` - Health of external API connections
- `data_source_response_time_seconds` - API response time histograms
- `data_sync_status` - Success/failure of sync operations
- `data_sync_duration_seconds` - Time taken for sync operations
- `data_sync_records_processed` - Volume of records processed
- `data_freshness_seconds` - Time since last successful update
- `http_requests_total` - HTTP request counters by route/status
- `http_request_duration_seconds` - HTTP response time histograms
- `ai_requests_total` - AI API request counters by provider/model
- `ai_request_duration_seconds` - AI request processing times
- `ai_tokens_used_total` - Token consumption by provider
- `ai_cost_usd_total` - Cumulative AI costs in USD
- `database_connection_pool_size` - Database connection metrics
- `database_query_duration_seconds` - Database query performance
- `queue_depth` - Task queue sizes by priority
- `queue_processing_duration_seconds` - Job processing times
- `business_metrics` - Custom business KPIs and compliance scores

## Australian Compliance Features

All monitoring respects Australian data residency and privacy requirements:

- **Data Residency**: All metrics stored within Australian infrastructure
- **Privacy Protection**: No sensitive data included in metric labels
- **Compliance Monitoring**: Dedicated dashboard for Privacy Act compliance
- **Audit Trail**: Complete monitoring of data access and processing
- **Regional Timestamps**: All dashboards use Australia/Sydney timezone
- **Sovereignty Alerts**: Immediate alerts for any non-compliant data processing

## Integration Points

The observability infrastructure integrates with:

1. **Backend Services**: Automatic instrumentation via `observabilityService.js`
2. **Prometheus**: Metrics collection and storage
3. **Docker Stack**: Containerised deployment with service discovery
4. **API Gateway**: Direct metrics endpoint (`/api/observability/metrics`)
5. **Health Checks**: Automated monitoring of all 12 data sources
6. **Alert Manager**: Integration for notification delivery

## Dashboard Access

Access dashboards via Grafana web interface:
- **URL**: `http://localhost:3000` (development)
- **Folders**: Dashboards organised by monitoring domain
- **Refresh**: Auto-refresh enabled (10s-5min intervals depending on dashboard)
- **Time Ranges**: Optimised for each dashboard type (30min-7d)

## Operational Notes

- **Performance**: Dashboards optimised for real-time monitoring
- **Scalability**: Metrics system designed for high-volume data processing
- **Reliability**: Health checks run every 30 seconds
- **Maintainability**: Dashboard JSON files can be version controlled
- **Extensibility**: Easy to add new panels and metrics

## Next Steps

1. **Custom Business Metrics**: Add specific KPIs relevant to ACT Placemat operations
2. **Alert Channels**: Configure notification delivery (email, Slack, SMS)
3. **Long-term Storage**: Set up remote write for metrics retention beyond 30 days
4. **Advanced Analytics**: Add custom queries for trend analysis and forecasting
5. **Mobile Dashboards**: Optimise key dashboards for mobile monitoring

This observability infrastructure provides comprehensive visibility into the ACT Placemat data lake ecosystem while maintaining strict Australian compliance standards.