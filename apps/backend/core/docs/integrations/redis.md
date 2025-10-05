# Redis Cache

In-memory cache and session storage

## Overview

| Property | Value |
|----------|-------|
| **Type** | cache |
| **Version** | 7.0 |
| **Status** | ✅ active |
| **Data Flow** | bidirectional |
| **Owner** | Platform Team |
| **Authentication** | basic |
| **Data Classification** | 🏢 internal |

## Configuration

### Environment Variables

```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

## Usage Examples

### Basic Usage

```typescript
import { integrationRegistry } from '../integrations/registry.js';

// Get the connector
const redisConnector = integrationRegistry.getDataSource('redis');

// Cache data
await redisConnector.set('user:123', { name: 'John' }, 3600);

// Retrieve data
const userData = await redisConnector.get('user:123');
console.log('Cached user:', userData);
```

### Health Check

```typescript
// Check integration health
const isHealthy = await redisConnector.healthCheck();
console.log('Integration healthy:', isHealthy);

// Get connection info
const connectionInfo = redisConnector.getConnectionInfo();
console.log('Connection status:', connectionInfo);
```

## Error Handling

Common error scenarios and their solutions:

## Monitoring

This integration is automatically monitored through:

- **Health Checks**: Every 5 minutes
- **Performance Metrics**: Response time and success rates
- **Error Tracking**: Automatic error logging and alerting
- **Status Dashboard**: Real-time status in Integration Registry

### Monitoring Endpoints

```bash
# Get integration details
curl -H "Authorization: Bearer $API_KEY" \
     /api/integration-registry/redis

# Run health check
curl -X POST -H "Authorization: Bearer $API_KEY" \
     /api/integration-registry/redis/health-check
```

## Troubleshooting

### Common Issues

---

*Last Updated: 2025-08-28T09:55:40.498Z*
*Owner: Platform Team*
*[Back to Integration Overview](README.md)*
