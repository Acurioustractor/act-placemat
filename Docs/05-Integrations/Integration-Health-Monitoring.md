# Integration Health Monitoring

## Overview

The ACT Platform includes a comprehensive **Integration Health Monitor** that provides real-time monitoring of all data source integrations. This ensures you always know the status of your data connections and can quickly identify and resolve issues.

## Features

- **Real-Time Health Checks**: Automated monitoring of all 6 data sources
- **Health Scoring**: 0-100 health scores based on connectivity, errors, and data freshness
- **Automatic Alerting**: Notifications for consecutive failures or stale data
- **Manual Sync Triggering**: Ability to manually initiate data synchronization
- **SSE Streaming**: Real-time updates via Server-Sent Events
- **Comprehensive Statistics**: Overall system health metrics

## Monitored Integrations

| Integration | Check Interval | Purpose |
|-------------|---------------|---------|
| Gmail | 5 minutes | Email intelligence and contact discovery |
| Calendar | 5 minutes | Meeting insights and scheduling |
| LinkedIn | 30 minutes | Professional network analysis (rate-limited) |
| Notion | 2 minutes | Project management and documentation |
| Xero | 10 minutes | Financial data and bookkeeping |
| Supabase | 1 minute | Real-time database health |

## API Endpoints

### GET /api/v2/monitoring/health

Overall system health status with summary metrics.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-09-29T21:14:34.645Z",
  "summary": {
    "total_integrations": 6,
    "connected": 5,
    "errors": 1,
    "warnings": 0,
    "overall_health_score": 85,
    "average_latency_ms": 450,
    "average_freshness_seconds": 120
  },
  "integrations": [
    {
      "source": "linkedin",
      "status": "connected",
      "health_score": 100,
      "record_count": 20398,
      "last_sync": "2025-09-29T21:14:37.109Z",
      "latency_ms": 2465,
      "freshness_seconds": 7
    }
  ]
}
```

**Status Values:**
- `healthy` - All integrations operational
- `degraded` - Some integrations have issues
- `unhealthy` - Majority of integrations failing

### GET /api/v2/monitoring/integrations

Detailed health status for all integrations.

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-09-29T21:14:38.705Z",
  "integrations": {
    "linkedin": {
      "source": "linkedin",
      "status": "connected",
      "lastCheck": "2025-09-29T21:14:37.109Z",
      "lastSync": "2025-09-29T21:14:37.109Z",
      "recordCount": 20398,
      "consecutiveErrors": 0,
      "latency": 2465,
      "error": null,
      "freshness": 1,
      "healthScore": 100
    },
    "gmail": {
      "source": "gmail",
      "status": "not_configured",
      "error": "Supabase table not configured",
      "healthScore": 0
    }
  }
}
```

**Integration Status Values:**
- `connected` - Integration is healthy and syncing
- `syncing` - Currently performing data sync
- `error` - Integration has encountered errors
- `disconnected` - Integration is not connected
- `rate_limited` - API rate limits reached
- `not_configured` - Integration credentials missing
- `no_data` - Integration connected but no data available
- `unknown` - Status not yet determined

### GET /api/v2/monitoring/integrations/:source

Health status for a specific integration.

**Parameters:**
- `source` - Integration name (`gmail`, `calendar`, `linkedin`, `notion`, `xero`, `supabase`)

**Example:**
```bash
curl http://localhost:4001/api/v2/monitoring/integrations/linkedin
```

### POST /api/v2/monitoring/integrations/:source/sync

Manually trigger sync for a specific integration.

**Example:**
```bash
curl -X POST http://localhost:4001/api/v2/monitoring/integrations/linkedin/sync
```

**Response:**
```json
{
  "success": true,
  "message": "Sync initiated for linkedin",
  "timestamp": "2025-09-29T21:15:00.000Z"
}
```

### GET /api/v2/monitoring/statistics

Aggregated monitoring statistics.

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-09-29T21:14:40.000Z",
  "statistics": {
    "total": 6,
    "connected": 5,
    "errors": 1,
    "warnings": 0,
    "averageLatency": 450,
    "averageFreshness": 120,
    "overallHealth": 85
  }
}
```

### GET /api/v2/monitoring/stream

Server-Sent Events (SSE) endpoint for real-time updates.

**Usage:**
```typescript
const eventSource = new EventSource('/api/v2/monitoring/stream')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)

  if (data.type === 'health-update') {
    console.log(`${data.source} status: ${data.health.status}`)
  } else if (data.type === 'alert') {
    console.log(`Alert: ${data.message}`)
  }
}
```

**Event Types:**
- `initial` - Initial state on connection
- `health-update` - Integration health changed
- `alert` - Warning or critical issue detected

## Health Scoring Algorithm

Health scores range from 0-100 based on multiple factors:

### Base Score: 100

**Status Penalties:**
- `error`: -50 points
- `disconnected`: -30 points
- `rate_limited`: -20 points
- `no_data`: -40 points

**Consecutive Error Penalties:**
- -10 points per consecutive error

**Freshness Penalties:**
- Data > 1 hour old: -20 points
- Data > 2 hours old: -30 points (additional)

### Example Calculations

**Healthy Integration:**
- Status: `connected`
- Consecutive errors: 0
- Last sync: 2 minutes ago
- **Score: 100**

**Degraded Integration:**
- Status: `connected`
- Consecutive errors: 2
- Last sync: 90 minutes ago
- **Score: 50** (100 - 20 errors - 30 freshness)

**Critical Integration:**
- Status: `error`
- Consecutive errors: 3
- Last sync: 3 hours ago
- **Score: 0** (100 - 50 status - 30 errors - 50 freshness = 0)

## Alerting System

### Automatic Alerts

The monitor emits alerts for:

1. **Consecutive Failures** (Critical)
   - 3+ consecutive health check failures
   - Immediate notification

2. **Stale Data** (Warning)
   - Data older than 1 hour
   - Notification every 30 minutes

3. **Rate Limiting** (Info)
   - API rate limits reached
   - Next available sync time provided

### Alert Format

```javascript
{
  type: 'alert',
  severity: 'critical' | 'warning' | 'info',
  source: 'gmail',
  message: 'gmail has failed 3 consecutive health checks',
  error: 'Connection timeout',
  timestamp: '2025-09-29T21:15:00.000Z'
}
```

## Frontend Integration

### Using the API Service

```typescript
import { api } from '@/services/api'

// Get overall system health
const health = await api.getMonitoringHealth()

// Get all integration statuses
const integrations = await api.getAllIntegrationHealth()

// Get specific integration
const linkedinHealth = await api.getIntegrationHealth('linkedin')

// Trigger manual sync
await api.triggerIntegrationSync('linkedin')

// Subscribe to real-time updates
const eventSource = api.createMonitoringStream(
  (data) => {
    if (data.type === 'health-update') {
      console.log('Health updated:', data)
    }
  },
  (error) => {
    console.error('Stream error:', error)
  }
)

// Close stream when done
eventSource.close()
```

### Dashboard Component

```typescript
import { useState, useEffect } from 'react'
import { api } from '@/services/api'

function IntegrationHealthDashboard() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    // Initial load
    api.getMonitoringHealth().then(setHealth)

    // Real-time updates
    const stream = api.createMonitoringStream((data) => {
      if (data.type === 'health-update') {
        // Update specific integration
        setHealth(prev => ({
          ...prev,
          integrations: prev.integrations.map(int =>
            int.source === data.source ? data.health : int
          )
        }))
      }
    })

    return () => stream.close()
  }, [])

  return (
    <div>
      <h2>System Health: {health?.status}</h2>
      {health?.integrations.map(integration => (
        <IntegrationCard key={integration.source} {...integration} />
      ))}
    </div>
  )
}
```

## Configuration

### Check Intervals

Customize check intervals in [integrationHealthMonitor.js:28-35](../../apps/backend/core/src/services/integrationHealthMonitor.js#L28-L35):

```javascript
this.checkIntervals = {
  gmail: 5 * 60 * 1000,      // 5 minutes
  calendar: 5 * 60 * 1000,   // 5 minutes
  linkedin: 30 * 60 * 1000,  // 30 minutes (respect rate limits)
  notion: 2 * 60 * 1000,     // 2 minutes
  xero: 10 * 60 * 1000,      // 10 minutes
  supabase: 1 * 60 * 1000    // 1 minute
}
```

### Environment Variables

Required for full monitoring functionality:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Notion
NOTION_TOKEN=secret_xxxxx
NOTION_PROJECTS_DATABASE_ID=xxxxx

# Xero (optional)
XERO_CLIENT_ID=xxxxx
XERO_CLIENT_SECRET=xxxxx

# Gmail (optional)
GMAIL_CLIENT_ID=xxxxx
GMAIL_CLIENT_SECRET=xxxxx

# LinkedIn (data already imported)
# No API credentials needed - monitoring reads from Supabase
```

## Architecture

### Service Class

The `IntegrationHealthMonitor` class extends Node.js `EventEmitter` for real-time notifications:

```javascript
class IntegrationHealthMonitor extends EventEmitter {
  // Event emissions:
  // - 'health-update': Integration status changed
  // - 'alert': Warning or critical issue
  // - 'error': Health check failed
  // - 'sync-start': Manual sync initiated
  // - 'sync-complete': Manual sync finished
  // - 'sync-error': Manual sync failed
}
```

### Monitoring Flow

```
1. Monitor starts → Initialize all integrations
2. Schedule health checks → Set timers for each integration
3. Execute health check → Query integration-specific health
4. Calculate metrics → Health score, freshness, latency
5. Emit events → Notify subscribers of changes
6. Update state → Store latest health status
7. Check alerts → Determine if alerts needed
8. Reschedule → Queue next health check
```

## Current Status

As of September 2025, the monitoring system is detecting:

- ✅ **LinkedIn**: Connected (20,398 contacts imported)
- ⚠️ **Gmail**: Table not configured in Supabase
- ⚠️ **Calendar**: Table not configured in Supabase
- ⚠️ **Notion**: Credentials available, integration active
- ⚠️ **Xero**: Not configured
- ⚠️ **Supabase**: Connected but missing some tables

## Next Steps

1. **Create Missing Database Tables**
   - Add `gmail_sync_status` table to Supabase
   - Add `calendar_events` table to Supabase
   - Add `financial_transactions` table for Xero

2. **Configure Gmail Integration**
   - Set up OAuth 2.0 credentials
   - Implement Gmail sync service
   - Add sync scheduler

3. **Configure Xero Integration**
   - Register application
   - Set up OAuth 2.0
   - Implement financial data sync

4. **Build Dashboard UI**
   - Real-time health status display
   - Integration cards with metrics
   - Manual sync buttons
   - Alert notifications

5. **Add Monitoring Alerts**
   - Email notifications for critical failures
   - Slack/Discord webhooks
   - SMS alerts for downtime

## Troubleshooting

### Integration Shows "not_configured"

**Cause**: Missing environment variables or Supabase tables

**Solution**:
1. Check `.env` file for required credentials
2. Verify Supabase tables exist
3. Restart server after adding credentials

### Health Score is 0

**Cause**: Multiple consecutive failures or very stale data

**Solution**:
1. Check integration error message
2. Verify API credentials are valid
3. Trigger manual sync
4. Check for API rate limits

### SSE Stream Disconnects

**Cause**: Network timeout or server restart

**Solution**:
- Implement automatic reconnection in frontend
- Add exponential backoff for retries
- Handle connection errors gracefully

## Related Documentation

- [Gmail Integration](./Gmail.md)
- [LinkedIn Integration](./LinkedIn.md)
- [Notion Integration](./Notion.md)
- [Xero Integration](./Xero.md)
- [Supabase Setup](./Supabase.md)
- [API Reference](../03-Development/API-Reference.md)

---

**Built with ❤️ for reliable data integration monitoring**