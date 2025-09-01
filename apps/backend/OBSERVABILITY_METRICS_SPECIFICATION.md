# ACT Platform - Observability Metrics Specification

This document provides technical specifications for all metrics, alerting rules, and observability data structures used in the ACT Platform Data Lake Health Monitoring system.

## Metric Categories and Definitions

### System Health Metrics

#### Core System Indicators

```prometheus
# Server uptime in seconds
act_system_uptime_seconds{instance="backend-01"} 86400

# Overall system health status (0=unhealthy, 1=healthy)
act_system_health{component="overall"} 1

# Memory usage percentage
act_system_memory_usage_ratio{instance="backend-01"} 0.75

# CPU usage percentage
act_system_cpu_usage_ratio{instance="backend-01"} 0.45

# Disk usage percentage
act_system_disk_usage_ratio{instance="backend-01", mount="/"} 0.60
```

#### Data Source Health

```prometheus
# Data source availability (0=down, 1=up)
act_datasource_up{source="postgresql", type="database"} 1
act_datasource_up{source="neo4j", type="graph"} 1
act_datasource_up{source="redis", type="cache"} 1

# Consecutive failure count
act_datasource_consecutive_failures{source="postgresql"} 0

# Time since last successful sync (Unix timestamp)
act_datasource_last_sync_timestamp{source="postgresql"} 1642248600

# Connection pool utilization
act_datasource_connection_pool_usage{source="postgresql"} 25
act_datasource_connection_pool_max{source="postgresql"} 100
```

### Performance Metrics

#### HTTP Request Metrics

```prometheus
# Total HTTP requests
act_http_requests_total{method="GET", endpoint="/api/dashboard", status="200"} 15420

# HTTP request duration histogram (seconds)
act_http_request_duration_seconds_bucket{method="GET", endpoint="/api/dashboard", le="0.1"} 12000
act_http_request_duration_seconds_bucket{method="GET", endpoint="/api/dashboard", le="0.5"} 15000
act_http_request_duration_seconds_sum{method="GET", endpoint="/api/dashboard"} 1542.5
act_http_request_duration_seconds_count{method="GET", endpoint="/api/dashboard"} 15420

# HTTP errors by status code
act_http_errors_total{method="GET", endpoint="/api/dashboard", status="500"} 45
act_http_errors_total{method="GET", endpoint="/api/dashboard", status="404"} 12
```

#### Database Performance

```prometheus
# PostgreSQL query duration
act_postgresql_query_duration_seconds{query_type="select"} 0.045
act_postgresql_query_duration_seconds{query_type="insert"} 0.012

# Neo4j query performance
act_neo4j_query_duration_seconds{query_type="cypher"} 0.089

# Redis operation latency
act_redis_operation_duration_seconds{operation="get"} 0.001
act_redis_operation_duration_seconds{operation="set"} 0.002

# Cache hit ratio
act_cache_hit_ratio{cache="redis"} 0.95
```

### Business Metrics

#### User Engagement

```prometheus
# Daily active users
act_business_daily_active_users{date="2024-01-15"} 150

# Session duration average (minutes)
act_business_avg_session_duration_minutes 12.5

# Page views per session
act_business_avg_pageviews_per_session 4.2
```

#### Data Processing

```prometheus
# Daily data volume processed (MB)
act_business_data_volume_mb{date="2024-01-15", type="stories"} 450
act_business_data_volume_mb{date="2024-01-15", type="projects"} 320

# AI API requests
act_business_ai_requests_total{service="openai", endpoint="chat"} 890
act_business_ai_requests_total{service="anthropic", endpoint="claude"} 567

# Sync operations
act_business_sync_operations_total{source="notion", status="success"} 245
act_business_sync_operations_total{source="notion", status="failure"} 8
```

#### Compliance and Security

```prometheus
# Compliance score percentage
act_compliance_score_percent{category="data_sovereignty"} 94.2
act_compliance_score_percent{category="privacy"} 97.8

# Encryption operations
act_encryption_operations_total{operation="encrypt", table="users"} 156
act_encryption_operations_total{operation="decrypt", table="users"} 143

# Audit events logged
act_audit_events_total{category="privacy_request", action="export"} 12
act_audit_events_total{category="privacy_request", action="delete"} 5
```

## Alert Rules Specification

### Critical Alerts (Severity: Critical)

#### System Availability

```yaml
groups:
  - name: system_critical
    rules:
      - alert: SystemDown
        expr: act_system_health{component="overall"} == 0
        for: 30s
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "ACT Platform system is down"
          description: "Overall system health check has failed"

      - alert: DataSourceDown
        expr: act_datasource_up == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Data source {{ $labels.source }} is unavailable"
          description: "Data source {{ $labels.source }} has been down for more than 1 minute"

      - alert: HighErrorRate
        expr: |
          (
            rate(act_http_errors_total[5m]) / 
            rate(act_http_requests_total[5m])
          ) > 0.05
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High HTTP error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
```

#### Performance Critical

```yaml
      - alert: VeryHighResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(act_http_request_duration_seconds_bucket[5m])
          ) > 2.0
        for: 3m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Very high response times detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: MemoryExhaustion
        expr: act_system_memory_usage_ratio > 0.95
        for: 1m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Memory usage critically high"
          description: "Memory usage is {{ $value | humanizePercentage }}"
```

### Warning Alerts (Severity: Warning)

#### Performance Warnings

```yaml
  - name: performance_warnings
    rules:
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(act_http_request_duration_seconds_bucket[5m])
          ) > 0.5
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High response times detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighMemoryUsage
        expr: act_system_memory_usage_ratio > 0.8
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: DataStaleness
        expr: |
          (time() - act_datasource_last_sync_timestamp) > 600
        for: 2m
        labels:
          severity: warning
          team: data
        annotations:
          summary: "Data from {{ $labels.source }} is stale"
          description: "Last sync was {{ $value }} seconds ago"
```

#### Business Metric Warnings

```yaml
  - name: business_warnings
    rules:
      - alert: LowSyncSuccessRate
        expr: |
          (
            act_business_sync_operations_total{status="success"} /
            (act_business_sync_operations_total{status="success"} + 
             act_business_sync_operations_total{status="failure"})
          ) < 0.9
        for: 15m
        labels:
          severity: warning
          team: data
        annotations:
          summary: "Low sync success rate for {{ $labels.source }}"
          description: "Success rate is {{ $value | humanizePercentage }}"

      - alert: ComplianceScoreLow
        expr: act_compliance_score_percent < 90
        for: 5m
        labels:
          severity: warning
          team: compliance
        annotations:
          summary: "Compliance score below threshold"
          description: "{{ $labels.category }} compliance score is {{ $value }}%"
```

### Info Alerts (Severity: Info)

```yaml
  - name: informational
    rules:
      - alert: HighAPIUsage
        expr: increase(act_business_ai_requests_total[1h]) > 1000
        for: 0s
        labels:
          severity: info
          team: product
        annotations:
          summary: "High AI API usage detected"
          description: "{{ $labels.service }} API usage increased by {{ $value }} in the last hour"

      - alert: NewUserSignup
        expr: increase(act_business_daily_active_users[1d]) > 0
        for: 0s
        labels:
          severity: info
          team: product
        annotations:
          summary: "New user activity detected"
          description: "{{ $value }} new active users today"
```

## Dashboard Configuration

### Grafana Dashboard JSON Structure

#### Main System Dashboard Variables

```json
{
  "dashboard": {
    "id": null,
    "title": "ACT Platform - System Overview",
    "tags": ["act-platform", "observability"],
    "templating": {
      "list": [
        {
          "name": "instance",
          "type": "query",
          "query": "label_values(act_system_uptime_seconds, instance)",
          "current": {"text": "All", "value": "$__all"}
        },
        {
          "name": "datasource",
          "type": "query", 
          "query": "label_values(act_datasource_up, source)",
          "current": {"text": "All", "value": "$__all"}
        }
      ]
    }
  }
}
```

#### Panel Configurations

**System Health Panel:**
```json
{
  "title": "System Health Status",
  "type": "stat",
  "targets": [
    {
      "expr": "act_system_health{component=\"overall\"}",
      "legendFormat": "Overall Health"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "mappings": [
        {"options": {"0": {"text": "Unhealthy", "color": "red"}}}
        {"options": {"1": {"text": "Healthy", "color": "green"}}}
      ]
    }
  }
}
```

**Response Time Panel:**
```json
{
  "title": "API Response Times",
  "type": "graph",
  "targets": [
    {
      "expr": "histogram_quantile(0.50, rate(act_http_request_duration_seconds_bucket[5m]))",
      "legendFormat": "50th percentile"
    },
    {
      "expr": "histogram_quantile(0.95, rate(act_http_request_duration_seconds_bucket[5m]))",
      "legendFormat": "95th percentile"
    }
  ],
  "yAxes": [{"unit": "s", "min": 0}]
}
```

## Data Collection Architecture

### Metric Collection Flow

```
Application Code
    ↓ (instruments metrics)
Prometheus Client Libraries
    ↓ (exposes /metrics)
Prometheus Server
    ↓ (scrapes every 15s)
Time Series Database
    ↓ (queries)
Grafana Dashboards
    ↓ (displays)
Operations Team
```

### Data Retention Policies

```yaml
# Prometheus retention configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'act-platform'
    region: 'australia'

# Data retention tiers
retention_policies:
  raw_metrics: 7d      # High resolution for recent data
  downsampled_1m: 30d  # 1-minute aggregates for medium term
  downsampled_5m: 90d  # 5-minute aggregates for long term
  downsampled_1h: 1y   # Hourly aggregates for historical analysis
```

### Storage Requirements

**Daily Storage Estimates:**
- Raw metrics (15s intervals): ~500MB/day
- Downsampled 1m: ~50MB/day
- Downsampled 5m: ~15MB/day
- Downsampled 1h: ~3MB/day

**Annual Storage Projection:**
- Year 1: ~200GB total
- Year 2: ~350GB total (with growth)
- Year 3: ~500GB total (with additional metrics)

## API Response Schemas

### Health Check Response

```json
{
  "status": "healthy|unhealthy|error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dataLake": {
    "overall": {
      "status": "healthy",
      "score": 95.5
    },
    "dataSources": [
      {
        "name": "postgresql",
        "type": "database",
        "status": "healthy",
        "lastCheck": "2024-01-15T10:29:45.000Z",
        "consecutiveFailures": 0,
        "lastSuccessfulSync": "2024-01-15T10:25:00.000Z",
        "metrics": {
          "connectionPool": 25,
          "maxConnections": 100,
          "avgQueryTime": 45.2
        }
      }
    ]
  },
  "system": {
    "status": "healthy",
    "uptime": 86400,
    "memory": {
      "used": 756,
      "total": 1024,
      "percentage": 73.8
    },
    "cpu": {
      "usage": 45.2,
      "cores": 4
    }
  }
}
```

### Dashboard Data Response

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "overview": {
    "systemHealth": "healthy",
    "totalDataSources": 8,
    "healthyDataSources": 7,
    "activeAlerts": 2,
    "uptime": 86400
  },
  "performance": {
    "avgResponseTime": 125.5,
    "requestsPerSecond": 45.2,
    "errorRate": 0.02,
    "p95ResponseTime": 245.8
  },
  "dataLake": {
    "totalSources": 8,
    "healthyCount": 7,
    "staleCount": 1,
    "lastSyncTimes": {
      "postgresql": "2024-01-15T10:25:00.000Z",
      "neo4j": "2024-01-15T10:24:30.000Z"
    }
  },
  "business": {
    "dailyActiveUsers": 150,
    "aiRequestsToday": 890,
    "syncSuccessRate": 97.5,
    "complianceScore": 94.2
  },
  "alerts": [
    {
      "level": "warning",
      "source": "redis",
      "message": "High memory usage detected",
      "timestamp": "2024-01-15T10:15:00.000Z"
    }
  ]
}
```

### Metrics Response (Prometheus Format)

```
# HELP act_system_uptime_seconds Server uptime in seconds
# TYPE act_system_uptime_seconds counter
act_system_uptime_seconds{instance="backend-01"} 86400

# HELP act_datasource_up Data source availability
# TYPE act_datasource_up gauge
act_datasource_up{source="postgresql",type="database"} 1
act_datasource_up{source="neo4j",type="graph"} 1
act_datasource_up{source="redis",type="cache"} 0

# HELP act_http_requests_total Total HTTP requests
# TYPE act_http_requests_total counter
act_http_requests_total{method="GET",endpoint="/api/dashboard",status="200"} 15420
act_http_requests_total{method="POST",endpoint="/api/stories",status="201"} 2840

# HELP act_http_request_duration_seconds HTTP request duration
# TYPE act_http_request_duration_seconds histogram
act_http_request_duration_seconds_bucket{method="GET",endpoint="/api/dashboard",le="0.1"} 12000
act_http_request_duration_seconds_bucket{method="GET",endpoint="/api/dashboard",le="0.5"} 15000
act_http_request_duration_seconds_bucket{method="GET",endpoint="/api/dashboard",le="+Inf"} 15420
act_http_request_duration_seconds_sum{method="GET",endpoint="/api/dashboard"} 1542.5
act_http_request_duration_seconds_count{method="GET",endpoint="/api/dashboard"} 15420
```

## Integration Specifications

### Prometheus Scrape Configuration

```yaml
scrape_configs:
  - job_name: 'act-platform-backend'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/api/observability/metrics'
    scheme: https
    bearer_token: 'prometheus-monitoring-key'
    static_configs:
      - targets: 
          - 'backend-01.act.platform:4000'
          - 'backend-02.act.platform:4000'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
      - source_labels: [__address__]
        regex: '([^:]+):.*'
        target_label: host
        replacement: '${1}'
```

### Alertmanager Integration

```yaml
webhook_configs:
  - url: 'https://act-platform-backend/api/observability/webhook/alerts'
    http_config:
      bearer_token: 'alertmanager-webhook-key'
    send_resolved: true
    max_alerts: 10
```

### Grafana Data Source Configuration

```yaml
apiVersion: 1
datasources:
  - name: ACT Platform Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      httpMethod: POST
      manageAlerts: true
      alertmanagerUid: act-alertmanager
```

## Security and Access Control

### API Key Requirements by Endpoint

| Endpoint | Access Level | Required Header/Param |
|----------|--------------|----------------------|
| `/metrics` | Monitoring | `X-Monitoring-Key` or `?monitoring_key=` |
| `/health` | Standard | `X-Api-Key` or `?api_key=` |
| `/dashboard` | Standard | `X-Api-Key` or `?api_key=` |
| `/performance` | Standard | `X-Api-Key` or `?api_key=` |
| `/test/*` | Admin | `X-Admin-Key` or `?admin_key=` |
| `/docs` | Public | None |

### Rate Limiting

```yaml
rate_limits:
  monitoring_endpoints:
    requests_per_minute: 300  # Prometheus scraping
    burst: 10
  
  standard_endpoints:
    requests_per_minute: 60   # Dashboard refreshes
    burst: 20
  
  admin_endpoints:
    requests_per_minute: 10   # Administrative operations
    burst: 5
```

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Maintained By:** Platform Operations Team  
**Next Review:** April 2024