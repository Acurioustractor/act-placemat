# Integration Registry API Reference

This document provides a comprehensive reference for the Integration Registry API endpoints.

## Base URL

```
https://your-domain.com/api/integration-registry
```

## Authentication

All endpoints require authentication via API key or JWT token:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/integration-registry
```

## GET /

Get overview of all registered integrations

### Request

```bash
curl -X GET \
     -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/integration-registry/
```

### Response

```json
{
  "success": true,
  "data": {
    "stats": { "total": 8, "healthy": 6, "unhealthy": 2 },
    "integrations": [...]
  }
}
```

## GET /stats

Get detailed statistics about the integration registry

### Request

```bash
curl -X GET \
     -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/integration-registry/stats
```

### Response

```json
{
  "success": true,
  "data": {
    "total": 8,
    "byType": { "database": 1, "rest-api": 4 },
    "byOwner": { "Data Team": 3, "Intelligence Team": 3 }
  }
}
```

## GET /:key

Get detailed information about a specific integration

### Request

```bash
curl -X GET \
     -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/integration-registry/postgres
```

### Response

```json
{
  "success": true,
  "data": {
    "key": "postgres",
    "name": "PostgreSQL Database",
    "status": "active",
    "connectionInfo": {...},
    "recentEvents": [...]
  }
}
```

## POST /health-check

Run health checks for all integrations

### Request

```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/api/integration-registry/health-check
```

### Response

```json
{
  "success": true,
  "data": {
    "healthCheckResults": {
      "postgres": true,
      "redis": true,
      "gmail-api": false
    },
    "stats": {...}
  }
}
```

