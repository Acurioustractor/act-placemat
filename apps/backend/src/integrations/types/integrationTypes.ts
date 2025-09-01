/**
 * ACT Platform - Integration Type Definitions
 *
 * Defines the type system for all integrations, data sources, and connectors
 * in the ACT Platform. These types ensure consistency and type safety across
 * all integration implementations.
 */

// Core integration types
export type IntegrationType =
  | 'database'
  | 'graph-database'
  | 'cache'
  | 'rest-api'
  | 'graphql-api'
  | 'websocket'
  | 'message-queue'
  | 'file-storage'
  | 'search-engine'
  | 'internal-service'
  | 'external-service';

export type DataFlowDirection =
  | 'source' // Only reads data from this integration
  | 'sink' // Only writes data to this integration
  | 'bidirectional' // Both reads and writes data
  | 'stream'; // Continuous data streaming

export type IntegrationStatus =
  | 'active' // Integration is working normally
  | 'inactive' // Integration is disabled
  | 'unhealthy' // Integration has health check failures
  | 'error' // Integration has critical errors
  | 'maintenance' // Integration is under maintenance
  | 'deprecated'; // Integration is deprecated but still functional

// Authentication types
export type AuthenticationType =
  | 'none'
  | 'api-key'
  | 'oauth'
  | 'oauth2'
  | 'basic'
  | 'bearer'
  | 'certificate'
  | 'jwt';

// Data classification levels (following common security frameworks)
export type DataClassification =
  | 'public' // Can be shared publicly
  | 'internal' // Internal company use only
  | 'confidential' // Sensitive business information
  | 'restricted'; // Highly sensitive, regulated data

// Health check function signature
export type HealthCheckFunction = (connector: ConnectorInterface) => Promise<boolean>;

// Base connector interface that all integrations must implement
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

// Database connector interface
export interface DatabaseConnectorInterface extends ConnectorInterface {
  // Query methods
  query(sql: string, params?: any[]): Promise<any>;
  execute(sql: string, params?: any[]): Promise<any>;

  // Transaction support
  beginTransaction?(): Promise<void>;
  commitTransaction?(): Promise<void>;
  rollbackTransaction?(): Promise<void>;

  // Schema operations
  createTable?(tableName: string, schema: any): Promise<void>;
  dropTable?(tableName: string): Promise<void>;

  // CRUD operations
  insert?(table: string, data: any): Promise<any>;
  update?(table: string, data: any, where: any): Promise<any>;
  delete?(table: string, where: any): Promise<any>;
  select?(table: string, fields?: string[], where?: any): Promise<any>;
}

// API connector interface
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

// Cache connector interface
export interface CacheConnectorInterface extends ConnectorInterface {
  // Cache operations
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear?(): Promise<void>;

  // Batch operations
  mget?(keys: string[]): Promise<any[]>;
  mset?(keyValuePairs: Record<string, any>, ttl?: number): Promise<void>;

  // Advanced operations
  exists?(key: string): Promise<boolean>;
  expire?(key: string, ttl: number): Promise<boolean>;
}

// Connection information
export interface ConnectionInfo {
  host?: string;
  port?: number;
  database?: string;
  schema?: string;
  url?: string;
  status: IntegrationStatus;
  connectedAt?: Date;
  lastActivity?: Date;
  connectionPool?: {
    active: number;
    idle: number;
    max: number;
  };
}

// Rate limiting information
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Performance metrics
export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  totalRequests: number;
  lastRequestTime?: Date;
  lastErrorTime?: Date;
  slowestRequest?: {
    duration: number;
    timestamp: Date;
    endpoint?: string;
  };
  fastestRequest?: {
    duration: number;
    timestamp: Date;
    endpoint?: string;
  };
}

// Integration metadata
export interface IntegrationMetadata {
  name: string;
  description: string;
  version: string;
  tags?: string[];
  owner: string;
  team?: string;
  repository?: string;
  documentationUrl?: string;
  supportContact?: string;
  created: Date;
  lastUpdated: Date;
  deprecationNotice?: {
    message: string;
    replacedBy?: string;
    sunsetDate?: Date;
  };
}

// Configuration schema for integrations
export interface IntegrationConfig {
  // Connection settings
  connection: {
    host?: string;
    port?: number;
    url?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };

  // Authentication settings
  authentication?: {
    type: AuthenticationType;
    apiKey?: string;
    username?: string;
    password?: string;
    token?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string[];
  };

  // Operational settings
  operational?: {
    healthCheckInterval?: number;
    connectionPoolSize?: number;
    queryTimeout?: number;
    rateLimitPerSecond?: number;
    rateLimitPerHour?: number;
    enableMetrics?: boolean;
    enableLogging?: boolean;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
  };

  // Security settings
  security?: {
    enableEncryption?: boolean;
    sslMode?: 'disable' | 'require' | 'prefer';
    certificatePath?: string;
    validateCertificate?: boolean;
    dataClassification: DataClassification;
  };
}

// Error types for integrations
export interface IntegrationError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  integration: string;
  operation?: string;
  retryable: boolean;
}

// Integration event types for monitoring
export type IntegrationEventType =
  | 'connection-established'
  | 'connection-lost'
  | 'authentication-success'
  | 'authentication-failed'
  | 'rate-limit-exceeded'
  | 'health-check-failed'
  | 'error-occurred'
  | 'performance-threshold-exceeded';

export interface IntegrationEvent {
  type: IntegrationEventType;
  integration: string;
  timestamp: Date;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Dependency information
export interface IntegrationDependency {
  integration: string;
  type: 'required' | 'optional' | 'fallback';
  description?: string;
  version?: string;
}

// Export configuration for external systems
export interface IntegrationExportConfig {
  includeCredentials?: boolean;
  includeMetrics?: boolean;
  includeHealthStatus?: boolean;
  format: 'json' | 'yaml' | 'xml';
  filter?: {
    types?: IntegrationType[];
    statuses?: IntegrationStatus[];
    owners?: string[];
  };
}
