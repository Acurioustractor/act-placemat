# LinkedIn API

LinkedIn API for professional relationship intelligence

## Overview

| Property | Value |
|----------|-------|
| **Type** | rest-api |
| **Version** | v2 |
| **Status** | ✅ active |
| **Data Flow** | source |
| **Owner** | Intelligence Team |
| **Authentication** | oauth |
| **Data Classification** | 🔒 confidential |

## Rate Limits

| Limit Type | Value |
|------------|-------|
| **Requests per Second** | 2 |
| **Requests per Hour** | 500 |
| **Burst Limit** | 5 |

## Configuration

### Environment Variables

```bash
LINKEDIN_API_CLIENT_ID=your-client-id
LINKEDIN_API_CLIENT_SECRET=your-client-secret
LINKEDIN_API_REDIRECT_URI=your-redirect-uri
```

## Usage Examples

### Basic Usage

```typescript
import { integrationRegistry } from '../integrations/registry.js';

// Get the connector
const linkedinapiConnector = integrationRegistry.getDataSource('linkedin-api');

// Make API call
const response = await linkedinapiConnector.get('/endpoint');
console.log('API response:', response);
```

### Health Check

```typescript
// Check integration health
const isHealthy = await linkedinapiConnector.healthCheck();
console.log('Integration healthy:', isHealthy);

// Get connection info
const connectionInfo = linkedinapiConnector.getConnectionInfo();
console.log('Connection status:', connectionInfo);
```

## Error Handling

Common error scenarios and their solutions:

### API Errors
- **401 Unauthorized**: Check API credentials and refresh tokens
- **429 Rate Limited**: Implement exponential backoff retry logic
- **500 Server Error**: Check API service status and retry

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
     /api/integration-registry/linkedin-api

# Run health check
curl -X POST -H "Authorization: Bearer $API_KEY" \
     /api/integration-registry/linkedin-api/health-check
```

## Troubleshooting

### Common Issues

#### OAuth Authentication Issues
1. **Token Expired**: Tokens expire regularly, ensure refresh logic is working
2. **Invalid Redirect URI**: Must match exactly what's configured in the API console
3. **Scope Permissions**: Ensure requested scopes are approved

#### Rate Limiting
- **Current Limits**: See rate limits table above
- **Best Practice**: Implement exponential backoff when rate limited
- **Monitoring**: Track request counts to stay within limits

---

*Last Updated: 2025-08-28T09:55:40.499Z*
*Owner: Intelligence Team*
*[Back to Integration Overview](README.md)*
