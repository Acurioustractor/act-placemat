/**
 * ACT Platform - Centralized Integration Registry
 *
 * This registry provides a single source of truth for all API integrations,
 * data sources, and external services used by the ACT Platform.
 *
 * Usage:
 * import { IntegrationRegistry } from './integrations/registry.js';
 * const registry = new IntegrationRegistry();
 * await registry.initialize();
 * const postgres = registry.getDataSource('postgres');
 */

import type {
  IntegrationType,
  DataFlowDirection,
  IntegrationStatus,
  HealthCheckFunction,
  IntegrationMetadata,
  ConnectorInterface,
} from './types/integrationTypes.js';

export interface IntegrationRegistryEntry {
  name: string;
  type: IntegrationType;
  description: string;
  version: string;
  status: IntegrationStatus;
  dataFlow: DataFlowDirection;

  // Connection details
  connector: ConnectorInterface;
  healthCheck?: HealthCheckFunction;

  // Metadata
  owner: string;
  documentationUrl?: string;
  lastHealthCheck?: Date;
  dependencies?: string[];

  // Operational details
  rateLimits?: {
    requestsPerSecond?: number;
    requestsPerHour?: number;
    burstLimit?: number;
  };

  // Authentication
  authType: 'none' | 'api-key' | 'oauth' | 'basic' | 'certificate';

  // Data classification
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';

  // Performance metrics
  metrics?: {
    averageResponseTime?: number;
    successRate?: number;
    errorRate?: number;
    lastErrorTime?: Date;
  };
}

export class IntegrationRegistry {
  private integrations: Map<string, IntegrationRegistryEntry> = new Map();
  private initialized: boolean = false;

  constructor() {
    // Registry will be populated during initialization
  }

  /**
   * Initialize the registry by discovering and registering all integrations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔍 Initializing Integration Registry...');

    try {
      // Register core data sources
      await this.registerDataSources();

      // Register external API integrations
      await this.registerExternalAPIs();

      // Register internal services
      await this.registerInternalServices();

      // Run initial health checks
      await this.runHealthChecks();

      this.initialized = true;

      console.log(
        `✅ Integration Registry initialized with ${this.integrations.size} integrations`
      );
      this.logRegistrySummary();
    } catch (error) {
      console.error('❌ Failed to initialize Integration Registry:', error);
      throw error;
    }
  }

  /**
   * Register core data sources (PostgreSQL, Redis, Neo4j)
   */
  private async registerDataSources(): Promise<void> {
    const PostgreSQLDataSource = (
      await import('../services/dataSources/postgresDataSource.js')
    ).default;
    const RedisDataSource = (await import('../services/dataSources/redisDataSource.js'))
      .default;
    const Neo4jDataSource = (await import('../services/dataSources/neo4jDataSource.js'))
      .default;

    // PostgreSQL Database
    this.register('postgres', {
      name: 'PostgreSQL Database',
      type: 'database',
      description: 'Primary database for structured data with field-level encryption',
      version: '15.0',
      status: 'active',
      dataFlow: 'bidirectional',
      connector: new PostgreSQLDataSource(),
      owner: 'Data Team',
      authType: 'basic',
      dataClassification: 'restricted',
      documentationUrl: '/docs/integrations/postgresql',
      healthCheck: async connector => {
        return await connector.healthCheck();
      },
    });

    // Redis Cache
    this.register('redis', {
      name: 'Redis Cache',
      type: 'cache',
      description: 'In-memory cache and session storage',
      version: '7.0',
      status: 'active',
      dataFlow: 'bidirectional',
      connector: new RedisDataSource(),
      owner: 'Platform Team',
      authType: 'basic',
      dataClassification: 'internal',
      documentationUrl: '/docs/integrations/redis',
      healthCheck: async connector => {
        return await connector.healthCheck();
      },
    });

    // Neo4j Knowledge Graph
    this.register('neo4j', {
      name: 'Neo4j Knowledge Graph',
      type: 'graph-database',
      description: 'Graph database for relationship and knowledge management',
      version: '5.0',
      status: 'active',
      dataFlow: 'bidirectional',
      connector: new Neo4jDataSource(),
      owner: 'AI Team',
      authType: 'basic',
      dataClassification: 'confidential',
      documentationUrl: '/docs/integrations/neo4j',
      healthCheck: async connector => {
        return await connector.healthCheck();
      },
    });
  }

  /**
   * Register external API integrations
   */
  private async registerExternalAPIs(): Promise<void> {
    // Gmail API
    this.register('gmail-api', {
      name: 'Gmail API',
      type: 'rest-api',
      description: 'Google Gmail API for email intelligence and sync',
      version: 'v1',
      status: 'active',
      dataFlow: 'source',
      connector: await import('../services/gmailIntelligenceService.js'),
      owner: 'Intelligence Team',
      authType: 'oauth',
      dataClassification: 'confidential',
      documentationUrl: '/docs/integrations/gmail',
      rateLimits: {
        requestsPerSecond: 5,
        requestsPerHour: 1000,
        burstLimit: 10,
      },
    });

    // LinkedIn API
    this.register('linkedin-api', {
      name: 'LinkedIn API',
      type: 'rest-api',
      description: 'LinkedIn API for professional relationship intelligence',
      version: 'v2',
      status: 'active',
      dataFlow: 'source',
      connector: await import('../services/linkedinIntelligenceService.js'),
      owner: 'Intelligence Team',
      authType: 'oauth',
      dataClassification: 'confidential',
      documentationUrl: '/docs/integrations/linkedin',
      rateLimits: {
        requestsPerSecond: 2,
        requestsPerHour: 500,
        burstLimit: 5,
      },
    });

    // Notion API
    this.register('notion-api', {
      name: 'Notion API',
      type: 'rest-api',
      description: 'Notion API for content management and project sync',
      version: 'v1',
      status: 'active',
      dataFlow: 'bidirectional',
      connector: await import('../services/notionService.js'),
      owner: 'Content Team',
      authType: 'api-key',
      dataClassification: 'internal',
      documentationUrl: '/docs/integrations/notion',
      rateLimits: {
        requestsPerSecond: 3,
        requestsPerHour: 1000,
        burstLimit: 5,
      },
    });

    // Xero API
    this.register('xero-api', {
      name: 'Xero API',
      type: 'rest-api',
      description: 'Xero accounting API for financial data integration',
      version: 'v2',
      status: 'active',
      dataFlow: 'source',
      connector: await import('../services/xeroTokenManager.js'),
      owner: 'Finance Team',
      authType: 'oauth',
      dataClassification: 'restricted',
      documentationUrl: '/docs/integrations/xero',
      rateLimits: {
        requestsPerSecond: 1,
        requestsPerHour: 5000,
        burstLimit: 3,
      },
    });
  }

  /**
   * Register internal service integrations
   */
  private async registerInternalServices(): Promise<void> {
    // Compliance System
    this.register('compliance-service', {
      name: 'Compliance Service',
      type: 'internal-service',
      description: 'Internal compliance monitoring and audit service',
      version: '1.0',
      status: 'active',
      dataFlow: 'bidirectional',
      connector: await import('../startup/complianceStartup.js'),
      owner: 'Compliance Team',
      authType: 'api-key',
      dataClassification: 'restricted',
      documentationUrl: '/docs/integrations/compliance',
    });

    // Observability Service
    this.register('observability-service', {
      name: 'Observability Service',
      type: 'internal-service',
      description: 'Internal observability and monitoring service',
      version: '1.0',
      status: 'active',
      dataFlow: 'sink',
      connector: await import('../services/observabilityService.js'),
      owner: 'Platform Team',
      authType: 'api-key',
      dataClassification: 'internal',
      documentationUrl: '/docs/integrations/observability',
    });

    // ML Pipeline Service
    this.register('ml-pipeline-service', {
      name: 'ML Pipeline Service',
      type: 'internal-service',
      description: 'Internal machine learning pipeline and intelligence service',
      version: '1.0',
      status: 'active',
      dataFlow: 'bidirectional',
      connector: await import('../services/mlPipelineService.js'),
      owner: 'AI Team',
      authType: 'api-key',
      dataClassification: 'confidential',
      documentationUrl: '/docs/integrations/ml-pipeline',
    });
  }

  /**
   * Register a new integration
   */
  register(
    key: string,
    integration: Omit<IntegrationRegistryEntry, 'name'> & { name?: string }
  ): void {
    if (this.integrations.has(key)) {
      console.warn(`⚠️ Integration '${key}' already registered. Overwriting...`);
    }

    const entry: IntegrationRegistryEntry = {
      name: integration.name || key,
      ...integration,
    };

    this.integrations.set(key, entry);
    console.log(`✅ Registered integration: ${key} (${entry.type})`);
  }

  /**
   * Get an integration by key
   */
  get(key: string): IntegrationRegistryEntry | undefined {
    return this.integrations.get(key);
  }

  /**
   * Get a data source connector by key
   */
  getDataSource(key: string): ConnectorInterface | undefined {
    const integration = this.integrations.get(key);
    return integration?.connector;
  }

  /**
   * Get all integrations of a specific type
   */
  getByType(type: IntegrationType): IntegrationRegistryEntry[] {
    return Array.from(this.integrations.values()).filter(
      integration => integration.type === type
    );
  }

  /**
   * Get all integrations with a specific data flow direction
   */
  getByDataFlow(dataFlow: DataFlowDirection): IntegrationRegistryEntry[] {
    return Array.from(this.integrations.values()).filter(
      integration => integration.dataFlow === dataFlow
    );
  }

  /**
   * Get all active integrations
   */
  getActive(): IntegrationRegistryEntry[] {
    return Array.from(this.integrations.values()).filter(
      integration => integration.status === 'active'
    );
  }

  /**
   * Run health checks for all integrations
   */
  async runHealthChecks(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [key, integration] of this.integrations.entries()) {
      if (!integration.healthCheck) {
        results.set(key, true); // Assume healthy if no health check
        continue;
      }

      try {
        const isHealthy = await integration.healthCheck(integration.connector);
        results.set(key, isHealthy);

        // Update last health check time
        integration.lastHealthCheck = new Date();

        if (!isHealthy) {
          console.warn(`⚠️ Health check failed for integration: ${key}`);
          integration.status = 'unhealthy';
        } else if (integration.status === 'unhealthy') {
          integration.status = 'active';
        }
      } catch (error) {
        console.error(`❌ Health check error for integration ${key}:`, error);
        results.set(key, false);
        integration.status = 'error';
      }
    }

    return results;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const integrations = Array.from(this.integrations.values());

    return {
      total: integrations.length,
      byType: this.groupBy(integrations, 'type'),
      byStatus: this.groupBy(integrations, 'status'),
      byDataFlow: this.groupBy(integrations, 'dataFlow'),
      byOwner: this.groupBy(integrations, 'owner'),
      healthy: integrations.filter(i => i.status === 'active').length,
      unhealthy: integrations.filter(
        i => i.status === 'unhealthy' || i.status === 'error'
      ).length,
    };
  }

  /**
   * Export registry data for documentation
   */
  exportForDocumentation() {
    return Array.from(this.integrations.entries()).map(([key, integration]) => ({
      key,
      name: integration.name,
      type: integration.type,
      description: integration.description,
      version: integration.version,
      status: integration.status,
      dataFlow: integration.dataFlow,
      owner: integration.owner,
      documentationUrl: integration.documentationUrl,
      authType: integration.authType,
      dataClassification: integration.dataClassification,
      rateLimits: integration.rateLimits,
      lastHealthCheck: integration.lastHealthCheck,
    }));
  }

  /**
   * Log a summary of the registry
   */
  private logRegistrySummary(): void {
    const stats = this.getStats();

    console.log('\n📊 Integration Registry Summary:');
    console.log(`   Total Integrations: ${stats.total}`);
    console.log(`   Active: ${stats.healthy} | Unhealthy: ${stats.unhealthy}`);
    console.log('\n   By Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    console.log('\n   By Owner:');
    Object.entries(stats.byOwner).forEach(([owner, count]) => {
      console.log(`     ${owner}: ${count}`);
    });
    console.log('');
  }

  /**
   * Helper method to group array by property
   */
  private groupBy<T>(array: T[], property: keyof T): Record<string, number> {
    return array.reduce(
      (acc, item) => {
        const key = String(item[property]);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Get all registered integration keys
   */
  getAllKeys(): string[] {
    return Array.from(this.integrations.keys());
  }

  /**
   * Check if an integration is registered
   */
  has(key: string): boolean {
    return this.integrations.has(key);
  }

  /**
   * Remove an integration from the registry
   */
  unregister(key: string): boolean {
    return this.integrations.delete(key);
  }
}

// Singleton instance for global access
export const integrationRegistry = new IntegrationRegistry();
