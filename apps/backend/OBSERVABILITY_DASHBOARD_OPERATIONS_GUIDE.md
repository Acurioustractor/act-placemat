# ACT Platform - Observability Dashboard Operations Guide

This comprehensive guide covers the operation, monitoring, and maintenance of the ACT Platform's Data Lake Health Monitoring and Observability Dashboard.

## Quick Start

### Access Requirements

The observability dashboard implements role-based access control with three access levels:

1. **Monitoring Tools Access** (Prometheus, Grafana)
   - Header: `X-Monitoring-Key: <monitoring-key>`
   - Query param: `?monitoring_key=<monitoring-key>`
   - Access: Metrics endpoint only

2. **Standard API Access** (Development, Operations)
   - Header: `X-Api-Key: <api-key>`
   - Query param: `?api_key=<api-key>`
   - Access: All read-only endpoints

3. **Admin Access** (System Administration)
   - Header: `X-Admin-Key: <admin-key>`
   - Query param: `?admin_key=<admin-key>`
   - Access: Write operations, testing endpoints

### Environment Variables

Configure these environment variables for secure access:

```bash
# Standard API access (comma-separated list)
VALID_API_KEYS=prod-api-key-1,ops-api-key-2,dev-api-key-3

# Admin access (single key)
ADMIN_API_KEY=secure-admin-key-change-in-production

# Monitoring tools access (comma-separated list)
MONITORING_API_KEYS=prometheus-key,grafana-key,alertmanager-key

# Optional: Override defaults for demo/development
# VALID_API_KEYS=demo-api-key
# ADMIN_API_KEY=demo-admin-key-change-in-production
# MONITORING_API_KEYS=prometheus-key,grafana-key
```

## API Endpoints Reference

### Core Monitoring Endpoints

#### GET `/api/observability/metrics` 
**Access Level:** Monitoring Tools  
**Purpose:** Prometheus-compatible metrics for all monitored services  
**Response Format:** Plain text (Prometheus format)  
**Usage:** Primary endpoint for Prometheus scraping  

```bash
# Example usage
curl -H "X-Monitoring-Key: prometheus-key" \
  http://localhost:4000/api/observability/metrics
```

#### GET `/api/observability/health`
**Access Level:** Standard API  
**Purpose:** Overall system health status  
**Response Format:** JSON  
**Key Metrics:**
- Overall system status (healthy/unhealthy)
- Data lake health summary
- System component status
- Response time and uptime

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dataLake": {
    "overall": { "status": "healthy" },
    "dataSources": [...]
  },
  "system": {
    "status": "healthy",
    "uptime": 86400,
    "memory": {...}
  }
}
```

#### GET `/api/observability/dashboard`
**Access Level:** Standard API  
**Purpose:** Complete dashboard data for UI display  
**Response Format:** JSON  
**Contains:** All monitoring data optimized for dashboard visualization

### Data Source Monitoring

#### GET `/api/observability/health/:source`
**Access Level:** Standard API  
**Purpose:** Health status for specific data source  
**Parameters:** `:source` - Data source name (e.g., 'postgresql', 'neo4j')  

#### GET `/api/observability/freshness`
**Access Level:** Standard API  
**Purpose:** Data staleness indicators for all sources  
**Key Metrics:**
- Last sync timestamps
- Staleness duration (seconds)
- Current/stale status per source

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dataSources": [
    {
      "source": "postgresql",
      "type": "database",
      "lastSync": "2024-01-15T10:25:00.000Z",
      "status": "current",
      "staleness": 300
    }
  ]
}
```

### Performance and Incidents

#### GET `/api/observability/performance`
**Access Level:** Standard API  
**Purpose:** System performance metrics  
**Key Metrics:**
- Response times by endpoint
- Request volumes
- Error rates
- Resource utilization

#### GET `/api/observability/incidents`
**Access Level:** Standard API  
**Purpose:** Recent incidents and error summaries  
**Key Metrics:**
- Recent error incidents
- Error rate trends
- Recovery status

### Administrative Operations

#### POST `/api/observability/test/:source`
**Access Level:** Admin  
**Purpose:** Force connection test for specific data source  
**Parameters:** `:source` - Data source to test  
**Response:** Real-time test results

```bash
# Example: Test PostgreSQL connection
curl -X POST \
  -H "X-Admin-Key: your-admin-key" \
  http://localhost:4000/api/observability/test/postgresql
```

### Business Intelligence

#### GET `/api/observability/business`
**Access Level:** Standard API  
**Purpose:** Business KPIs and operational metrics  
**Key Metrics:**
- Daily active users
- Data processing volume
- AI request counts
- Sync success rates

### Configuration and Documentation

#### GET `/api/observability/config`
**Access Level:** Standard API  
**Purpose:** System configuration and capabilities  
**Response:** Environment, capabilities, available data sources

#### GET `/api/observability/docs`
**Access Level:** Public  
**Purpose:** OpenAPI/Swagger documentation  
**Format:** OpenAPI 3.0 specification

## Monitored Metrics

### System Health Indicators

| Metric | Description | Normal Range | Alert Threshold |
|--------|-------------|--------------|-----------------|
| `system_uptime_seconds` | Server uptime | > 0 | N/A |
| `data_source_health` | Data source status | 1 (healthy) | < 1 |
| `consecutive_failures` | Failed connection attempts | 0 | > 3 |
| `last_successful_sync` | Time since last sync | < 300s | > 600s |

### Performance Metrics

| Metric | Description | Normal Range | Alert Threshold |
|--------|-------------|--------------|-----------------|
| `http_request_duration_ms` | API response time | < 200ms avg | > 500ms avg |
| `http_requests_total` | Total request count | Varies | Sudden drops |
| `http_errors_total` | HTTP error count | < 1% | > 5% |
| `memory_usage_bytes` | Memory consumption | < 80% | > 90% |

### Business Metrics

| Metric | Description | Normal Range | Alert Threshold |
|--------|-------------|--------------|-----------------|
| `daily_active_users` | Active user count | Trend-based | -20% day-over-day |
| `data_processing_volume_mb` | Daily data volume | Trend-based | -50% day-over-day |
| `ai_requests_daily` | AI API usage | Trend-based | Service limits |
| `sync_success_rate_percent` | Data sync reliability | > 95% | < 90% |

### Data Source Specific Metrics

#### PostgreSQL
- Connection pool utilization
- Query execution time
- Active connections
- Database size

#### Neo4j
- Node count
- Relationship count
- Query performance
- Memory usage

#### Redis
- Cache hit rate
- Memory usage
- Key expiration rate
- Connection count

## Alerting Rules

### Critical Alerts (Immediate Response Required)

```yaml
# System Down
alert: SystemDown
expr: up == 0
for: 1m
severity: critical

# High Error Rate
alert: HighErrorRate
expr: (rate(http_errors_total[5m]) / rate(http_requests_total[5m])) > 0.05
for: 2m
severity: critical

# Data Source Unavailable
alert: DataSourceDown
expr: data_source_health == 0
for: 1m
severity: critical
```

### Warning Alerts (Monitor and Plan Response)

```yaml
# High Response Time
alert: HighResponseTime
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
for: 5m
severity: warning

# Data Staleness
alert: StaleData
expr: (time() - last_successful_sync_timestamp) > 600
for: 2m
severity: warning

# High Memory Usage
alert: HighMemoryUsage
expr: (memory_usage_bytes / memory_total_bytes) > 0.8
for: 10m
severity: warning
```

## Dashboard Layout

### Main Dashboard View

**Top Row - System Overview:**
- Overall health status indicator
- Total uptime
- Active data sources
- Current alert count

**Second Row - Performance Metrics:**
- Average response time (last 1h)
- Request rate (requests/sec)
- Error rate percentage
- Memory/CPU utilization

**Third Row - Data Lake Status:**
- Data freshness heatmap
- Sync success rates
- Data source health grid
- Processing volume trends

**Bottom Row - Business Metrics:**
- Daily active users
- AI request volume
- Data processing stats
- Compliance score

### Detailed Views

Each section provides drill-down capabilities:
- **Health Details:** Per-source health history and diagnostics
- **Performance Deep Dive:** Endpoint-specific metrics and traces
- **Data Source Inspector:** Connection details, schema info, recent queries
- **Incident Timeline:** Historical incidents, resolution times, root causes

## Operational Procedures

### Daily Operations

1. **Morning Health Check** (9:00 AM)
   - Review overnight alerts and incidents
   - Check data freshness for all sources
   - Verify backup completion status
   - Review resource utilization trends

2. **Midday Performance Review** (1:00 PM)
   - Analyze peak usage patterns
   - Check for performance degradation
   - Review error logs for new patterns
   - Update capacity planning metrics

3. **End of Day Summary** (6:00 PM)
   - Generate daily operations report
   - Document any incidents or changes
   - Review upcoming maintenance windows
   - Update on-call handover notes

### Weekly Reviews

**Monday - Capacity Planning:**
- Review resource utilization trends
- Analyze growth patterns
- Plan scaling activities
- Update performance baselines

**Wednesday - Security and Compliance:**
- Review access logs
- Check compliance scores
- Audit data sovereignty controls
- Update security configurations

**Friday - System Optimization:**
- Analyze performance bottlenecks
- Review slow queries
- Plan system optimizations
- Update monitoring configurations

### Monthly Tasks

**System Health Assessment:**
- Comprehensive system performance review
- Data source optimization
- Alert rule refinement
- Dashboard layout improvements

**Capacity Planning:**
- Resource growth projections
- Infrastructure scaling plans
- Cost optimization analysis
- Technology refresh planning

## Troubleshooting Guide

### Common Issues and Resolution

#### High Response Times
**Symptoms:** Average response time > 500ms
**Investigation Steps:**
1. Check `/api/observability/performance` for affected endpoints
2. Review database query performance
3. Check resource utilization (CPU, memory, disk I/O)
4. Analyze network latency

**Resolution:**
- Optimize slow database queries
- Scale resources if needed
- Implement caching where appropriate
- Review and optimize API endpoints

#### Data Source Connection Failures
**Symptoms:** `data_source_health` = 0 for specific source
**Investigation Steps:**
1. Use `/api/observability/test/:source` to test connection
2. Check network connectivity
3. Review authentication credentials
4. Check database/service logs

**Resolution:**
- Restart database connections
- Update expired credentials
- Resolve network issues
- Scale database resources if needed

#### Memory Pressure
**Symptoms:** Memory usage > 80%
**Investigation Steps:**
1. Review memory usage trends
2. Check for memory leaks in application
3. Analyze cached data size
4. Review background processes

**Resolution:**
- Restart services if memory leak suspected
- Optimize cache configurations
- Scale memory resources
- Review and optimize data structures

#### Data Staleness
**Symptoms:** Data not syncing, staleness > 10 minutes
**Investigation Steps:**
1. Check sync service status
2. Review API rate limits
3. Check external service availability
4. Analyze sync error logs

**Resolution:**
- Restart sync services
- Adjust rate limiting
- Implement retry mechanisms
- Contact external service providers

### Emergency Procedures

#### System Outage Response
1. **Immediate (0-5 minutes):**
   - Assess scope of outage
   - Check system health endpoints
   - Verify critical data sources
   - Escalate to on-call team

2. **Short-term (5-30 minutes):**
   - Implement failover procedures
   - Communicate status to stakeholders
   - Begin root cause analysis
   - Document timeline of events

3. **Recovery (30+ minutes):**
   - Execute recovery procedures
   - Verify system functionality
   - Update stakeholder communications
   - Schedule post-incident review

#### Data Loss Prevention
1. **Immediate Assessment:**
   - Identify affected data sources
   - Check backup integrity
   - Assess data consistency
   - Isolate affected systems

2. **Recovery Actions:**
   - Restore from latest backups
   - Verify data consistency
   - Re-sync affected systems
   - Validate application functionality

## Integration with DevOps Tools

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'act-observability'
    scrape_interval: 15s
    metrics_path: '/api/observability/metrics'
    static_configs:
      - targets: ['act-backend:4000']
    bearer_token: 'your-monitoring-key'
```

### Grafana Dashboard Import

The platform provides Grafana dashboard JSON exports:
- Main system dashboard: Import ID `act-system-001`
- Data lake dashboard: Import ID `act-datalake-002`
- Business metrics dashboard: Import ID `act-business-003`

### Alertmanager Integration

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'act-platform-alerts'

receivers:
- name: 'act-platform-alerts'
  webhook_configs:
  - url: 'http://act-backend:4000/api/observability/alerts'
    http_config:
      bearer_token: 'your-admin-key'
```

## Security Considerations

### Access Control Best Practices

1. **API Key Management:**
   - Rotate keys quarterly
   - Use different keys for different environments
   - Never commit keys to version control
   - Use secrets management systems

2. **Network Security:**
   - Restrict access to monitoring endpoints
   - Use HTTPS in production
   - Implement IP allowlisting for sensitive endpoints
   - Monitor access logs regularly

3. **Data Privacy:**
   - Ensure metrics don't contain sensitive data
   - Implement data retention policies
   - Regular security audits
   - Compliance with data protection regulations

### Audit Trail

All administrative operations are logged with:
- Timestamp
- User/API key identifier
- Operation performed
- Source IP address
- Request parameters
- Response status

## Support and Escalation

### Contact Information

**Primary Support:** Platform Operations Team  
**Email:** ops@actplacemat.org  
**Slack:** #platform-ops  
**On-call:** +61 XXX XXX XXX  

**Secondary Support:** Development Team  
**Email:** dev@actplacemat.org  
**Slack:** #development  

### Escalation Matrix

**Level 1:** Platform Operators
- Response time: 15 minutes
- Issues: Performance degradation, minor outages

**Level 2:** Senior Engineers
- Response time: 30 minutes
- Issues: System outages, data corruption

**Level 3:** Architecture Team
- Response time: 1 hour
- Issues: Systemic failures, security incidents

## Documentation Updates

This document should be updated:
- After any significant system changes
- Following incident post-mortems
- During quarterly operational reviews
- When new monitoring capabilities are added

**Last Updated:** January 2024  
**Version:** 1.0  
**Next Review:** April 2024

---

*This guide provides comprehensive operational instructions for the ACT Platform's Data Lake Health Monitoring and Observability Dashboard. Regular updates ensure continued effectiveness and accuracy.*