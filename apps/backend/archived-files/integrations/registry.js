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

import {
  IntegrationType,
  DataFlowDirection,
  IntegrationStatus,
  AuthenticationType,
  DataClassification
} from './types/integrationTypes.js';

export class IntegrationRegistry {
  constructor() {
    this.integrations = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the registry by discovering and registering all integrations
   */
  async initialize() {
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
  async registerDataSources() {
    try {
      // PostgreSQL Database
      this.register('postgres', {
        name: 'PostgreSQL Database',
        type: IntegrationType.DATABASE,
        description: 'Primary database for structured data with field-level encryption',
        version: '15.0',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.BIDIRECTIONAL,
        connector: null, // Will be set when actual connectors are available
        owner: 'Data Team',
        authType: AuthenticationType.BASIC,
        dataClassification: DataClassification.RESTRICTED,
        documentationUrl: '/docs/integrations/postgresql',
        healthCheck: null, // Will be set when connector is available
      });

      // Redis Cache
      this.register('redis', {
        name: 'Redis Cache',
        type: IntegrationType.CACHE,
        description: 'In-memory cache and session storage',
        version: '7.0',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.BIDIRECTIONAL,
        connector: null,
        owner: 'Platform Team',
        authType: AuthenticationType.BASIC,
        dataClassification: DataClassification.INTERNAL,
        documentationUrl: '/docs/integrations/redis',
        healthCheck: null,
      });

      // Neo4j Knowledge Graph
      this.register('neo4j', {
        name: 'Neo4j Knowledge Graph',
        type: IntegrationType.GRAPH_DATABASE,
        description: 'Graph database for relationship and knowledge management',
        version: '5.0',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.BIDIRECTIONAL,
        connector: null,
        owner: 'AI Team',
        authType: AuthenticationType.BASIC,
        dataClassification: DataClassification.CONFIDENTIAL,
        documentationUrl: '/docs/integrations/neo4j',
        healthCheck: null,
      });
    } catch (error) {
      console.error('Error registering data sources:', error);
    }
  }

  /**
   * Register external API integrations
   */
  async registerExternalAPIs() {
    try {
      // Gmail API
      this.register('gmail-api', {
        name: 'Gmail API',
        type: IntegrationType.REST_API,
        description: 'Google Gmail API for email intelligence and sync',
        version: 'v1',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.SOURCE,
        connector: null,
        owner: 'Intelligence Team',
        authType: AuthenticationType.OAUTH,
        dataClassification: DataClassification.CONFIDENTIAL,
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
        type: IntegrationType.REST_API,
        description: 'LinkedIn API for professional relationship intelligence',
        version: 'v2',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.SOURCE,
        connector: null,
        owner: 'Intelligence Team',
        authType: AuthenticationType.OAUTH,
        dataClassification: DataClassification.CONFIDENTIAL,
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
        type: IntegrationType.REST_API,
        description: 'Notion API for content management and project sync',
        version: 'v1',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.BIDIRECTIONAL,
        connector: null,
        owner: 'Content Team',
        authType: AuthenticationType.API_KEY,
        dataClassification: DataClassification.INTERNAL,
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
        type: IntegrationType.REST_API,
        description: 'Xero accounting API for financial data integration',
        version: 'v2',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.SOURCE,
        connector: null,
        owner: 'Finance Team',
        authType: AuthenticationType.OAUTH,
        dataClassification: DataClassification.RESTRICTED,
        documentationUrl: '/docs/integrations/xero',
        rateLimits: {
          requestsPerSecond: 1,
          requestsPerHour: 5000,
          burstLimit: 3,
        },
      });
    } catch (error) {
      console.error('Error registering external APIs:', error);
    }
  }

  /**
   * Register internal service integrations
   */
  async registerInternalServices() {
    try {
      // Compliance System
      this.register('compliance-service', {
        name: 'Compliance Service',
        type: IntegrationType.INTERNAL_SERVICE,
        description: 'Internal compliance monitoring and audit service',
        version: '1.0',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.BIDIRECTIONAL,
        connector: null,
        owner: 'Compliance Team',
        authType: AuthenticationType.API_KEY,
        dataClassification: DataClassification.RESTRICTED,
        documentationUrl: '/docs/integrations/compliance',
      });

      // Observability Service
      this.register('observability-service', {
        name: 'Observability Service',
        type: IntegrationType.INTERNAL_SERVICE,
        description: 'Internal observability and monitoring service',
        version: '1.0',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.SINK,
        connector: null,
        owner: 'Platform Team',
        authType: AuthenticationType.API_KEY,
        dataClassification: DataClassification.INTERNAL,
        documentationUrl: '/docs/integrations/observability',
      });

      // ML Pipeline Service
      this.register('ml-pipeline-service', {
        name: 'ML Pipeline Service',
        type: IntegrationType.INTERNAL_SERVICE,
        description: 'Internal machine learning pipeline and intelligence service',
        version: '1.0',
        status: IntegrationStatus.ACTIVE,
        dataFlow: DataFlowDirection.BIDIRECTIONAL,
        connector: null,
        owner: 'AI Team',
        authType: AuthenticationType.API_KEY,
        dataClassification: DataClassification.CONFIDENTIAL,
        documentationUrl: '/docs/integrations/ml-pipeline',
      });
    } catch (error) {
      console.error('Error registering internal services:', error);
    }
  }

  /**
   * Register a new integration
   */
  register(key, integration) {
    if (this.integrations.has(key)) {
      console.warn(`⚠️ Integration '${key}' already registered. Overwriting...`);
    }

    const entry = {
      name: integration.name || key,
      ...integration,
    };

    this.integrations.set(key, entry);
    console.log(`✅ Registered integration: ${key} (${entry.type})`);
  }

  /**
   * Get an integration by key
   */
  get(key) {
    return this.integrations.get(key);
  }

  /**
   * Get a data source connector by key
   */
  getDataSource(key) {
    const integration = this.integrations.get(key);
    return integration?.connector;
  }

  /**
   * Get all integrations of a specific type
   */
  getByType(type) {
    return Array.from(this.integrations.values()).filter(
      integration => integration.type === type
    );
  }

  /**
   * Get all integrations with a specific data flow direction
   */
  getByDataFlow(dataFlow) {
    return Array.from(this.integrations.values()).filter(
      integration => integration.dataFlow === dataFlow
    );
  }

  /**
   * Get all active integrations
   */
  getActive() {
    return Array.from(this.integrations.values()).filter(
      integration => integration.status === IntegrationStatus.ACTIVE
    );
  }

  /**
   * Run health checks for all integrations
   */
  async runHealthChecks() {
    const results = new Map();

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
          integration.status = IntegrationStatus.UNHEALTHY;
        } else if (integration.status === IntegrationStatus.UNHEALTHY) {
          integration.status = IntegrationStatus.ACTIVE;
        }
      } catch (error) {
        console.error(`❌ Health check error for integration ${key}:`, error);
        results.set(key, false);
        integration.status = IntegrationStatus.ERROR;
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
      healthy: integrations.filter(i => i.status === IntegrationStatus.ACTIVE).length,
      unhealthy: integrations.filter(
        i => i.status === IntegrationStatus.UNHEALTHY || i.status === IntegrationStatus.ERROR
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
  logRegistrySummary() {
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
  groupBy(array, property) {
    return array.reduce(
      (acc, item) => {
        const key = String(item[property]);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );
  }

  /**
   * Get all registered integration keys
   */
  getAllKeys() {
    return Array.from(this.integrations.keys());
  }

  /**
   * Check if an integration is registered
   */
  has(key) {
    return this.integrations.has(key);
  }

  /**
   * Remove an integration from the registry
   */
  unregister(key) {
    return this.integrations.delete(key);
  }
}

// Singleton instance for global access
export const integrationRegistry = new IntegrationRegistry();