# PostgreSQL Database

Primary database for structured data with field-level encryption

## Overview

| Property | Value |
|----------|-------|
| **Type** | database |
| **Version** | 15.0 |
| **Status** | ✅ active |
| **Data Flow** | bidirectional |
| **Owner** | Data Team |
| **Authentication** | basic |
| **Data Classification** | 🔐 restricted |

## Configuration

### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
ENCRYPTION_KEY=base64-encoded-32-byte-key
```

## Usage Examples

### Basic Usage

```typescript
import { integrationRegistry } from '../integrations/registry.js';

// Get the connector
const postgresConnector = integrationRegistry.getDataSource('postgres');

// Query data
const users = await postgresConnector.select('users', ['id', 'name']);
console.log('Users:', users);

// Insert data
const newUser = await postgresConnector.insert('users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

### Health Check

```typescript
// Check integration health
const isHealthy = await postgresConnector.healthCheck();
console.log('Integration healthy:', isHealthy);

// Get connection info
const connectionInfo = postgresConnector.getConnectionInfo();
console.log('Connection status:', connectionInfo);
```

## Error Handling

Common error scenarios and their solutions:

### Connection Errors
- **Connection Failed**: Check database URL and network connectivity
- **Authentication Failed**: Verify username and password
- **Query Timeout**: Increase query timeout or optimize queries

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
     /api/integration-registry/postgres

# Run health check
curl -X POST -H "Authorization: Bearer $API_KEY" \
     /api/integration-registry/postgres/health-check
```

## Troubleshooting

### Common Issues

---

*Last Updated: 2025-08-28T09:55:40.498Z*
*Owner: Data Team*
*[Back to Integration Overview](README.md)*
