# ACT Platform - Integration Standards and Guidelines

This document defines the standards, patterns, and conventions for all integrations in the ACT Platform. All new integrations must follow these guidelines, and existing integrations should be migrated to conform over time.

## Table of Contents

- [Overview](#overview)
- [Naming Conventions](#naming-conventions)
- [Directory Structure](#directory-structure)
- [Connector Interfaces](#connector-interfaces)
- [Registration Requirements](#registration-requirements)
- [Error Handling Standards](#error-handling-standards)
- [Health Check Implementation](#health-check-implementation)
- [Documentation Requirements](#documentation-requirements)
- [Testing Standards](#testing-standards)
- [Migration Guide](#migration-guide)

## Overview

The ACT Platform uses a centralized integration registry to manage all external APIs, data sources, and internal services. This provides:

- **Unified Management**: Single source of truth for all integrations
- **Standardized Patterns**: Consistent interfaces and error handling
- **Monitoring & Health Checks**: Automated health monitoring and alerting
- **Documentation Generation**: Automatic documentation from registry metadata
- **Type Safety**: TypeScript interfaces for all integration types

## Naming Conventions

### Integration Keys
Integration keys in the registry must follow these patterns:

```typescript
// Data sources
'postgres'           // Primary PostgreSQL database
'redis'             // Redis cache
'neo4j'             // Neo4j knowledge graph

// External APIs  
'gmail-api'         // Google Gmail API
'linkedin-api'      // LinkedIn API
'notion-api'        // Notion API
'xero-api'          // Xero accounting API

// Internal services
'compliance-service'     // Internal compliance system
'observability-service'  // Internal monitoring
'ml-pipeline-service'    // Machine learning pipeline
```

**Rules:**
- Use lowercase with hyphens (kebab-case)
- Include service type suffix for clarity (`-api`, `-service`, `-db`)
- Keep names concise but descriptive
- Avoid abbreviations unless widely understood

### File and Directory Names

```
src/integrations/
├── registry.ts                    # Main registry implementation
├── types/
│   └── integrationTypes.ts       # Type definitions
├── connectors/
│   ├── BaseConnector.ts          # Base connector class
│   ├── BaseDatabaseConnector.ts  # Database connector base
│   └── BaseAPIConnector.ts       # API connector base
└── adapters/                     # Specific integration adapters
    ├── postgresql/
    │   ├── PostgreSQLConnector.ts
    │   ├── index.ts
    │   └── README.md
    ├── gmail-api/
    │   ├── GmailAPIConnector.ts
    │   ├── index.ts
    │   └── README.md
    └── ...
```

**Rules:**
- Use PascalCase for TypeScript classes and interfaces
- Use camelCase for functions and variables
- Use kebab-case for directories and API routes
- Include index.ts files for clean imports

### Function and Variable Names

```typescript
// ✅ Good
const postgresConnector = new PostgreSQLConnector();
const gmailApiClient = new GmailAPIConnector();
await integrationRegistry.initialize();
const healthCheckResult = await connector.performHealthCheck();

// ❌ Bad
const pgConn = new PostgreSQLConnector();
const gmail = new GmailAPIConnector();
await registry.init();
const hcResult = await connector.check();
```

## Directory Structure

### Standard Integration Structure

Each integration should follow this directory structure:

```
src/integrations/adapters/[integration-name]/
├── index.ts                    # Main export file
├── [IntegrationName]Connector.ts  # Main connector class
├── types.ts                    # Integration-specific types
├── config.ts                   # Configuration schema
├── utils.ts                    # Utility functions
├── README.md                   # Integration documentation
└── __tests__/
    ├── connector.test.ts       # Connector tests
    └── integration.test.ts     # Integration tests
```

### Example: PostgreSQL Integration

```
src/integrations/adapters/postgresql/
├── index.ts
├── PostgreSQLConnector.ts
├── types.ts
├── config.ts
├── utils.ts
├── README.md
└── __tests__/
    ├── connector.test.ts
    └── integration.test.ts
```

## Connector Interfaces

All connectors must implement the appropriate base interface based on their type:

### Base Connector Interface

```typescript
export interface ConnectorInterface {
  // Lifecycle methods
  initialize(): Promise<void>;
  disconnect?(): Promise<void>;
  
  // Health and status
  healthCheck(): Promise<boolean>;
  getStatus?(): IntegrationStatus;
  
  // Optional connection details
  isConnected?(): boolean;
  getConnectionInfo?(): ConnectionInfo;
}
```

### Database Connector Interface

```typescript
export interface DatabaseConnectorInterface extends ConnectorInterface {
  // Query methods
  query(sql: string, params?: any[]): Promise<any>;
  execute(sql: string, params?: any[]): Promise<any>;
  
  // Transaction support
  beginTransaction?(): Promise<void>;
  commitTransaction?(): Promise<void>;
  rollbackTransaction?(): Promise<void>;
  
  // CRUD operations
  insert?(table: string, data: any): Promise<any>;
  update?(table: string, data: any, where: any): Promise<any>;
  delete?(table: string, where: any): Promise<any>;
  select?(table: string, fields?: string[], where?: any): Promise<any>;
}
```

### API Connector Interface

```typescript
export interface APIConnectorInterface extends ConnectorInterface {
  // HTTP methods
  get(endpoint: string, params?: any): Promise<any>;
  post(endpoint: string, data: any, params?: any): Promise<any>;
  put?(endpoint: string, data: any, params?: any): Promise<any>;
  patch?(endpoint: string, data: any, params?: any): Promise<any>;
  delete?(endpoint: string, params?: any): Promise<any>;
  
  // Authentication
  authenticate?(): Promise<void>;
  refreshToken?(): Promise<void>;
  
  // Rate limiting
  getRateLimit?(): RateLimitInfo;
}
```

## Registration Requirements

All integrations must be registered in the central registry with complete metadata:

### Required Registration Fields

```typescript
integrationRegistry.register('integration-key', {
  name: 'Human-readable Name',
  type: 'database' | 'rest-api' | 'internal-service', // Required type
  description: 'Clear description of what this integration does',
  version: '1.0.0',                    // Integration version
  status: 'active',                    // Current status
  dataFlow: 'bidirectional',          // Data flow direction
  connector: new ConnectorInstance(), // Connector implementation
  owner: 'Team Name',                 // Responsible team
  authType: 'oauth',                  // Authentication type
  dataClassification: 'confidential', // Data sensitivity level
  
  // Optional but recommended
  documentationUrl: '/docs/integrations/integration-name',
  rateLimits: {
    requestsPerSecond: 5,
    requestsPerHour: 1000,
    burstLimit: 10
  },
  healthCheck: async (connector) => await connector.healthCheck(),
  dependencies: ['other-integration-key']
});
```

### Integration Types

Use these standardized integration types:

- `database` - Relational databases (PostgreSQL, MySQL, etc.)
- `graph-database` - Graph databases (Neo4j, etc.)
- `cache` - Caching systems (Redis, Memcached, etc.)
- `rest-api` - REST API integrations
- `graphql-api` - GraphQL API integrations
- `websocket` - WebSocket connections
- `message-queue` - Message queues (RabbitMQ, Apache Kafka, etc.)
- `file-storage` - File storage systems (S3, etc.)
- `search-engine` - Search engines (Elasticsearch, etc.)
- `internal-service` - Internal platform services
- `external-service` - External third-party services

### Data Flow Types

- `source` - Only reads data from this integration
- `sink` - Only writes data to this integration
- `bidirectional` - Both reads and writes data
- `stream` - Continuous data streaming

### Data Classification Levels

- `public` - Can be shared publicly
- `internal` - Internal company use only
- `confidential` - Sensitive business information
- `restricted` - Highly sensitive, regulated data

## Error Handling Standards

All connectors must implement standardized error handling:

### Error Types

```typescript
interface IntegrationError {
  code: string;           // Standardized error code
  message: string;        // Human-readable message
  details?: any;          // Additional error context
  timestamp: Date;        // When the error occurred
  integration: string;    // Which integration failed
  operation?: string;     // What operation was being performed
  retryable: boolean;     // Whether the operation can be retried
}
```

### Standard Error Codes

```typescript
// Connection errors
'CONNECTION_FAILED'      // Failed to establish connection
'CONNECTION_TIMEOUT'     // Connection timed out
'CONNECTION_REFUSED'     // Connection refused by server
'CONNECTION_LOST'        // Existing connection was lost

// Authentication errors
'AUTH_FAILED'           // Authentication failed
'AUTH_EXPIRED'          // Authentication token expired
'AUTH_INVALID'          // Invalid credentials
'AUTH_REQUIRED'         // Authentication required but not provided

// API errors
'RATE_LIMIT_EXCEEDED'   // Rate limit exceeded
'API_ERROR'             // General API error
'INVALID_RESPONSE'      // Invalid response format
'NOT_FOUND'            // Resource not found

// Data errors
'VALIDATION_FAILED'     // Data validation failed
'CONSTRAINT_VIOLATION'  // Database constraint violation
'DATA_CORRUPTION'       // Data corruption detected

// System errors
'TIMEOUT'              // Operation timed out
'RETRY_EXHAUSTED'      // Maximum retry attempts exceeded
'CONFIGURATION_ERROR'   // Configuration problem
'UNKNOWN_ERROR'        // Catch-all for unexpected errors
```

### Error Handling Example

```typescript
export class PostgreSQLConnector extends BaseDatabaseConnector {
  async query(sql: string, params?: any[]): Promise<any> {
    try {
      this.updateLastActivity();
      return await this.retry(() => this.executeQuery(sql, params), 'query');
    } catch (error) {
      this.setError(
        'QUERY_FAILED',
        `PostgreSQL query failed: ${error.message}`,
        { sql: sql.substring(0, 100), params },
        this.isRetryableError(error)
      );
      throw error;
    }
  }
  
  private isRetryableError(error: any): boolean {
    // Determine if error is retryable based on error code/type
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.message.includes('connection');
  }
}
```

## Health Check Implementation

All connectors must implement health checks:

### Health Check Requirements

```typescript
export class ExampleConnector extends BaseConnector {
  async healthCheck(): Promise<boolean> {
    try {
      // Perform minimal operation to verify connectivity
      // For databases: simple SELECT 1
      // For APIs: GET /health or /status endpoint
      // For caches: SET/GET a test key
      
      const result = await this.performHealthCheckOperation();
      
      // Update status based on result
      if (result) {
        this.clearError();
        return true;
      } else {
        this.setError('HEALTH_CHECK_FAILED', 'Health check operation failed');
        return false;
      }
    } catch (error) {
      this.setError(
        'HEALTH_CHECK_ERROR',
        `Health check failed: ${error.message}`,
        error,
        true
      );
      return false;
    }
  }
  
  private async performHealthCheckOperation(): Promise<boolean> {
    // Implementation specific to the integration type
    // Should be lightweight and non-destructive
  }
}
```

### Health Check Best Practices

- **Lightweight**: Health checks should be fast and use minimal resources
- **Non-destructive**: Never modify data during health checks
- **Specific**: Test the actual functionality, not just network connectivity
- **Timeout**: Include reasonable timeouts to prevent hanging
- **Logging**: Log failures for debugging but not successes (too noisy)

## Documentation Requirements

Each integration must include comprehensive documentation:

### README.md Template

```markdown
# [Integration Name] Integration

Brief description of what this integration does and why it's needed.

## Overview

- **Type**: [database/rest-api/internal-service]
- **Data Flow**: [source/sink/bidirectional/stream]
- **Owner**: [Team Name]
- **Status**: [active/inactive/deprecated]

## Configuration

### Environment Variables

```bash
INTEGRATION_URL=https://api.example.com
INTEGRATION_API_KEY=your-api-key-here
INTEGRATION_TIMEOUT=30000
```

### Configuration Schema

```typescript
interface IntegrationConfig {
  url: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
}
```

## Usage Examples

### Basic Usage

```typescript
import { IntegrationConnector } from './IntegrationConnector';

const connector = new IntegrationConnector(config);
await connector.initialize();

// Use the connector
const result = await connector.someMethod();
```

### Advanced Usage

[More complex examples]

## API Reference

### Methods

#### `initialize(): Promise<void>`
Description of what this method does.

#### `healthCheck(): Promise<boolean>`
Description of health check behavior.

## Error Handling

Common error scenarios and how to handle them:

- **Connection Failed**: Usually indicates network or configuration issues
- **Authentication Failed**: Check API credentials and permissions
- **Rate Limited**: Implement exponential backoff

## Troubleshooting

Common issues and solutions:

### Issue: Connection Timeouts
**Cause**: Network connectivity or server overload
**Solution**: Check network connection and increase timeout values

## Dependencies

- External libraries used
- Other integrations this depends on
- Version requirements

## Testing

How to test this integration:

```bash
# Run unit tests
npm test src/integrations/adapters/integration-name

# Run integration tests
npm run test:integration integration-name
```

## Changelog

### v1.1.0 - 2024-01-15
- Added support for bulk operations
- Improved error handling

### v1.0.0 - 2024-01-01
- Initial implementation
```

### Code Documentation Standards

All connector classes must include comprehensive JSDoc comments:

```typescript
/**
 * PostgreSQL Database Connector
 * 
 * Provides standardized access to PostgreSQL databases with automatic
 * field-level encryption for sensitive data.
 * 
 * @example
 * ```typescript
 * const connector = new PostgreSQLConnector({
 *   connectionString: process.env.DATABASE_URL,
 *   encryptionKey: process.env.ENCRYPTION_KEY
 * });
 * 
 * await connector.initialize();
 * const users = await connector.select('users', ['id', 'name']);
 * ```
 */
export class PostgreSQLConnector extends BaseDatabaseConnector {
  /**
   * Execute a SQL query with automatic parameter binding
   * 
   * @param sql - SQL query with parameter placeholders ($1, $2, etc.)
   * @param params - Parameters to bind to the query
   * @returns Query result rows
   * 
   * @throws {IntegrationError} When query execution fails
   * 
   * @example
   * ```typescript
   * const users = await connector.query(
   *   'SELECT * FROM users WHERE age > $1',
   *   [18]
   * );
   * ```
   */
  async query(sql: string, params?: any[]): Promise<any> {
    // Implementation...
  }
}
```

## Testing Standards

All integrations must include comprehensive tests:

### Test Structure

```
src/integrations/adapters/integration-name/__tests__/
├── connector.test.ts       # Unit tests for connector methods
├── integration.test.ts     # Integration tests with real services
├── mocks.ts               # Mock data and responses
└── fixtures.ts            # Test fixtures and setup
```

### Unit Test Example

```typescript
import { PostgreSQLConnector } from '../PostgreSQLConnector';
import { createMockConfig } from './mocks';

describe('PostgreSQLConnector', () => {
  let connector: PostgreSQLConnector;
  
  beforeEach(() => {
    connector = new PostgreSQLConnector(createMockConfig());
  });
  
  describe('query', () => {
    it('should execute queries with parameters', async () => {
      const mockResult = [{ id: 1, name: 'Test' }];
      jest.spyOn(connector, 'executeQuery').mockResolvedValue(mockResult);
      
      const result = await connector.query('SELECT * FROM users WHERE id = $1', [1]);
      
      expect(result).toEqual(mockResult);
      expect(connector.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
    });
    
    it('should handle query errors gracefully', async () => {
      const mockError = new Error('Connection failed');
      jest.spyOn(connector, 'executeQuery').mockRejectedValue(mockError);
      
      await expect(
        connector.query('SELECT * FROM users')
      ).rejects.toThrow('Connection failed');
      
      expect(connector.getLastError()).toMatchObject({
        code: 'QUERY_FAILED',
        message: expect.stringContaining('PostgreSQL query failed')
      });
    });
  });
  
  describe('healthCheck', () => {
    it('should return true when connection is healthy', async () => {
      jest.spyOn(connector, 'query').mockResolvedValue([{ result: 1 }]);
      
      const result = await connector.healthCheck();
      
      expect(result).toBe(true);
      expect(connector.query).toHaveBeenCalledWith('SELECT 1');
    });
  });
});
```

### Integration Test Example

```typescript
import { PostgreSQLConnector } from '../PostgreSQLConnector';

describe('PostgreSQL Integration Tests', () => {
  let connector: PostgreSQLConnector;
  
  beforeAll(async () => {
    // Only run if test database is available
    if (!process.env.TEST_DATABASE_URL) {
      console.log('Skipping integration tests - TEST_DATABASE_URL not set');
      return;
    }
    
    connector = new PostgreSQLConnector({
      connectionString: process.env.TEST_DATABASE_URL
    });
    
    await connector.initialize();
  });
  
  afterAll(async () => {
    if (connector) {
      await connector.disconnect();
    }
  });
  
  it('should connect to real database', async () => {
    if (!connector) return;
    
    const result = await connector.healthCheck();
    expect(result).toBe(true);
  });
  
  it('should execute real queries', async () => {
    if (!connector) return;
    
    const result = await connector.query('SELECT NOW() as current_time');
    expect(result).toHaveLength(1);
    expect(result[0].current_time).toBeInstanceOf(Date);
  });
});
```

## Migration Guide

### Migrating Existing Integrations

To migrate existing integrations to the new standards:

1. **Create new connector class**:
   ```typescript
   export class ExistingServiceConnector extends BaseConnector {
     // Implement required methods
   }
   ```

2. **Register in the registry**:
   ```typescript
   integrationRegistry.register('existing-service', {
     name: 'Existing Service',
     type: 'rest-api',
     // ... other required fields
   });
   ```

3. **Update imports throughout codebase**:
   ```typescript
   // Old way
   import existingService from '../services/existingService.js';
   
   // New way
   import { integrationRegistry } from '../integrations/registry.js';
   const existingService = integrationRegistry.getDataSource('existing-service');
   ```

4. **Add comprehensive tests**
5. **Create documentation**
6. **Remove old service files** (after thorough testing)

### Breaking Changes

When updating integration interfaces, follow these steps:

1. **Deprecate old methods** with JSDoc `@deprecated` tags
2. **Add new methods** alongside old ones
3. **Update documentation** to reflect preferred usage
4. **Create migration timeline** (typically 2-3 releases)
5. **Remove deprecated methods** after migration period

## Compliance and Security

All integrations must adhere to security and compliance standards:

### Data Classification

- **Restricted**: Encrypt at rest, audit all access, minimal retention
- **Confidential**: Encrypt in transit, role-based access, documented retention
- **Internal**: Access logging, reasonable retention policies
- **Public**: Standard security practices, no special restrictions

### Authentication Standards

- Use environment variables for credentials
- Support token refresh where applicable
- Implement proper OAuth flows for third-party APIs
- Use least-privilege access principles

### Monitoring Requirements

- All integrations must be registered for health monitoring
- Critical integrations require alerting on failure
- Performance metrics should be tracked
- Error rates must be monitored and alerted

This completes the Integration Standards documentation. All new integrations must follow these guidelines, and existing integrations should be migrated to conform over time.