# Neo4j Knowledge Graph

Graph database for relationship and knowledge management

## Overview

| Property | Value |
|----------|-------|
| **Type** | graph-database |
| **Version** | 5.0 |
| **Status** | ✅ active |
| **Data Flow** | bidirectional |
| **Owner** | AI Team |
| **Authentication** | basic |
| **Data Classification** | 🔒 confidential |

## Configuration

### Environment Variables

## Usage Examples

### Basic Usage

```typescript
import { integrationRegistry } from '../integrations/registry.js';

// Get the connector
const neo4jConnector = integrationRegistry.getDataSource('neo4j');

```

### Health Check

```typescript
// Check integration health
const isHealthy = await neo4jConnector.healthCheck();
console.log('Integration healthy:', isHealthy);

// Get connection info
const connectionInfo = neo4jConnector.getConnectionInfo();
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
     /api/integration-registry/neo4j

# Run health check
curl -X POST -H "Authorization: Bearer $API_KEY" \
     /api/integration-registry/neo4j/health-check
```

## Troubleshooting

### Common Issues

---

*Last Updated: 2025-08-28T09:55:40.498Z*
*Owner: AI Team*
*[Back to Integration Overview](README.md)*
