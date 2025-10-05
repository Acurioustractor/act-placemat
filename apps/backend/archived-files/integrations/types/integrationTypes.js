/**
 * ACT Platform - Integration Type Definitions
 *
 * Defines the type system for all integrations, data sources, and connectors
 * in the ACT Platform. These types ensure consistency across all integration implementations.
 */

// Type validation helpers
export const IntegrationType = {
  DATABASE: 'database',
  GRAPH_DATABASE: 'graph-database',
  CACHE: 'cache',
  REST_API: 'rest-api',
  GRAPHQL_API: 'graphql-api',
  WEBSOCKET: 'websocket',
  MESSAGE_QUEUE: 'message-queue',
  FILE_STORAGE: 'file-storage',
  SEARCH_ENGINE: 'search-engine',
  INTERNAL_SERVICE: 'internal-service',
  EXTERNAL_SERVICE: 'external-service',
};

export const DataFlowDirection = {
  SOURCE: 'source', // Only reads data from this integration
  SINK: 'sink', // Only writes data to this integration
  BIDIRECTIONAL: 'bidirectional', // Both reads and writes data
  STREAM: 'stream', // Continuous data streaming
};

export const IntegrationStatus = {
  ACTIVE: 'active', // Integration is working normally
  INACTIVE: 'inactive', // Integration is disabled
  UNHEALTHY: 'unhealthy', // Integration has health check failures
  ERROR: 'error', // Integration has critical errors
  MAINTENANCE: 'maintenance', // Integration is under maintenance
  DEPRECATED: 'deprecated', // Integration is deprecated but still functional
};

export const AuthenticationType = {
  NONE: 'none',
  API_KEY: 'api-key',
  OAUTH: 'oauth',
  OAUTH2: 'oauth2',
  BASIC: 'basic',
  BEARER: 'bearer',
  CERTIFICATE: 'certificate',
  JWT: 'jwt',
};

export const DataClassification = {
  PUBLIC: 'public', // Can be shared publicly
  INTERNAL: 'internal', // Internal company use only
  CONFIDENTIAL: 'confidential', // Sensitive business information
  RESTRICTED: 'restricted', // Highly sensitive, regulated data
};

export const IntegrationEventType = {
  CONNECTION_ESTABLISHED: 'connection-established',
  CONNECTION_LOST: 'connection-lost',
  AUTHENTICATION_SUCCESS: 'authentication-success',
  AUTHENTICATION_FAILED: 'authentication-failed',
  RATE_LIMIT_EXCEEDED: 'rate-limit-exceeded',
  HEALTH_CHECK_FAILED: 'health-check-failed',
  ERROR_OCCURRED: 'error-occurred',
  PERFORMANCE_THRESHOLD_EXCEEDED: 'performance-threshold-exceeded',
};

// Validation functions
export const validateIntegrationType = (type) => {
  return Object.values(IntegrationType).includes(type);
};

export const validateDataFlowDirection = (direction) => {
  return Object.values(DataFlowDirection).includes(direction);
};

export const validateIntegrationStatus = (status) => {
  return Object.values(IntegrationStatus).includes(status);
};

export const validateAuthenticationType = (authType) => {
  return Object.values(AuthenticationType).includes(authType);
};

export const validateDataClassification = (classification) => {
  return Object.values(DataClassification).includes(classification);
};

// Default implementations for base connector interface
export class BaseConnector {
  constructor() {
    this.status = IntegrationStatus.INACTIVE;
    this.connected = false;
    this.lastHealthCheck = null;
  }

  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  async disconnect() {
    this.connected = false;
    this.status = IntegrationStatus.INACTIVE;
  }

  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  getStatus() {
    return this.status;
  }

  isConnected() {
    return this.connected;
  }

  getConnectionInfo() {
    return {
      status: this.status,
      connectedAt: this.connectedAt || null,
      lastActivity: this.lastActivity || null,
    };
  }
}

// Database connector base class
export class BaseDatabaseConnector extends BaseConnector {
  async query(sql, params = []) {
    throw new Error('query() must be implemented by subclass');
  }

  async execute(sql, params = []) {
    throw new Error('execute() must be implemented by subclass');
  }
}

// API connector base class
export class BaseAPIConnector extends BaseConnector {
  constructor(baseURL) {
    super();
    this.baseURL = baseURL;
    this.rateLimitInfo = null;
  }

  async get(endpoint, params = {}) {
    throw new Error('get() must be implemented by subclass');
  }

  async post(endpoint, data, params = {}) {
    throw new Error('post() must be implemented by subclass');
  }

  getRateLimit() {
    return this.rateLimitInfo;
  }
}

// Cache connector base class
export class BaseCacheConnector extends BaseConnector {
  async get(key) {
    throw new Error('get() must be implemented by subclass');
  }

  async set(key, value, ttl) {
    throw new Error('set() must be implemented by subclass');
  }

  async delete(key) {
    throw new Error('delete() must be implemented by subclass');
  }
}