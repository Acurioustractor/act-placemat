/**
 * Tagging Pipeline Utilities
 * 
 * Helper functions for configuration, validation, and common operations
 */

import { 
  SyncPipelineConfig, 
  DataCatalogConfig, 
  PostgreSQLConfig, 
  SyncConfig, 
  TaggingConfig, 
  MonitoringConfig,
  DataAssetType
} from './types';

/**
 * Create default tagging configuration for production use
 */
export function createDefaultTaggingConfig(): SyncPipelineConfig {
  return {
    dataCatalog: {
      type: 'apache_atlas',
      connection: {
        url: process.env.ATLAS_URL || 'http://localhost:21000',
        username: process.env.ATLAS_USERNAME || 'admin',
        password: process.env.ATLAS_PASSWORD || 'admin',
        timeout: 30000
      },
      query: {
        batchSize: 100,
        maxRetries: 3,
        retryDelay: 5000
      },
      filters: {
        includedTypes: [DataAssetType.TABLE, DataAssetType.VIEW, DataAssetType.MATERIALIZED_VIEW],
        excludedTypes: [],
        includedTags: [],
        excludedTags: ['test', 'temp', 'sandbox']
      }
    },
    postgresql: {
      connection: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'financial_intelligence',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        ssl: process.env.NODE_ENV === 'production',
        poolSize: 10
      },
      schema: {
        catalogSchema: 'data_catalog',
        tagsSchema: 'data_tags',
        metadataSchema: 'data_metadata'
      },
      performance: {
        batchSize: 1000,
        parallelWorkers: 4,
        enablePartitioning: true
      }
    },
    sync: {
      mode: 'incremental',
      frequency: {
        full: '0 2 * * 0', // Weekly at 2 AM Sunday
        incremental: '0 * * * *', // Hourly
        realTime: 300 // 5 minutes
      },
      changeDetection: {
        enabled: true,
        strategy: 'timestamp',
        timestampField: 'lastModified'
      },
      conflictResolution: {
        strategy: 'catalog_wins',
        manualApprovalRequired: false
      },
      errorHandling: {
        maxRetries: 3,
        retryDelay: 5000,
        continueOnError: true,
        deadLetterQueue: true
      }
    },
    tagging: {
      autoTagging: {
        enabled: true,
        rules: []
      },
      validation: {
        enabled: true,
        requiredTags: ['sensitivity', 'data_type'],
        allowedValues: {
          sensitivity: ['public', 'internal', 'confidential', 'restricted', 'secret'],
          data_type: ['personal_data', 'financial_data', 'indigenous_data', 'system_data'],
          consent_level: ['no_consent', 'basic_consent', 'explicit_consent', 'enhanced_operations', 'full_automation'],
          sovereignty_level: ['individual', 'community', 'indigenous', 'organizational', 'national', 'international']
        }
      },
      propagation: {
        enabled: true,
        inheritanceRules: []
      },
      compliance: {
        autoDetectPII: true,
        autoDetectIndigenous: true,
        autoApplyPrivacyAct: true,
        autoApplyDataResidency: true
      }
    },
    monitoring: {
      metrics: {
        enabled: true,
        provider: 'prometheus',
        interval: 60000
      },
      alerting: {
        enabled: true,
        channels: [],
        rules: []
      },
      logging: {
        level: 'info',
        destination: 'console',
        format: 'json'
      }
    }
  };
}

/**
 * Create development/testing configuration
 */
export function createDevelopmentConfig(): SyncPipelineConfig {
  const config = createDefaultTaggingConfig();
  
  return {
    ...config,
    sync: {
      ...config.sync,
      frequency: {
        full: '0 0 * * *', // Daily at midnight
        incremental: '*/15 * * * *', // Every 15 minutes
        realTime: 60 // 1 minute
      },
      errorHandling: {
        ...config.sync.errorHandling,
        maxRetries: 1,
        retryDelay: 1000,
        deadLetterQueue: false
      }
    },
    monitoring: {
      ...config.monitoring,
      metrics: {
        ...config.monitoring.metrics,
        enabled: false
      },
      alerting: {
        ...config.monitoring.alerting,
        enabled: false
      },
      logging: {
        level: 'debug',
        destination: 'console',
        format: 'text'
      }
    }
  };
}

/**
 * Validate tagging pipeline configuration
 */
export function validateTaggingConfig(config: SyncPipelineConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate data catalog configuration
  const catalogErrors = validateDataCatalogConfig(config.dataCatalog);
  errors.push(...catalogErrors);

  // Validate PostgreSQL configuration
  const pgErrors = validatePostgreSQLConfig(config.postgresql);
  errors.push(...pgErrors);

  // Validate sync configuration
  const syncErrors = validateSyncConfig(config.sync);
  errors.push(...syncErrors);

  // Validate tagging configuration
  const taggingErrors = validateTaggingConfiguration(config.tagging);
  errors.push(...taggingErrors);

  // Validate monitoring configuration
  const monitoringWarnings = validateMonitoringConfig(config.monitoring);
  warnings.push(...monitoringWarnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate data catalog configuration
 */
function validateDataCatalogConfig(config: DataCatalogConfig): string[] {
  const errors: string[] = [];

  if (!config.connection.url) {
    errors.push('Data catalog URL is required');
  }

  if (config.connection.timeout < 1000) {
    errors.push('Data catalog timeout must be at least 1000ms');
  }

  if (config.query.batchSize < 1 || config.query.batchSize > 10000) {
    errors.push('Data catalog batch size must be between 1 and 10000');
  }

  if (config.query.maxRetries < 0 || config.query.maxRetries > 10) {
    errors.push('Data catalog max retries must be between 0 and 10');
  }

  return errors;
}

/**
 * Validate PostgreSQL configuration
 */
function validatePostgreSQLConfig(config: PostgreSQLConfig): string[] {
  const errors: string[] = [];

  if (!config.connection.host) {
    errors.push('PostgreSQL host is required');
  }

  if (config.connection.port < 1 || config.connection.port > 65535) {
    errors.push('PostgreSQL port must be between 1 and 65535');
  }

  if (!config.connection.database) {
    errors.push('PostgreSQL database name is required');
  }

  if (!config.connection.user) {
    errors.push('PostgreSQL user is required');
  }

  if (config.connection.poolSize < 1 || config.connection.poolSize > 100) {
    errors.push('PostgreSQL pool size must be between 1 and 100');
  }

  if (!config.schema.catalogSchema || !config.schema.tagsSchema || !config.schema.metadataSchema) {
    errors.push('All PostgreSQL schema names are required');
  }

  return errors;
}

/**
 * Validate sync configuration
 */
function validateSyncConfig(config: SyncConfig): string[] {
  const errors: string[] = [];

  if (!['full', 'incremental', 'real_time'].includes(config.mode)) {
    errors.push('Sync mode must be full, incremental, or real_time');
  }

  if (config.mode === 'real_time' && (!config.frequency.realTime || config.frequency.realTime < 10)) {
    errors.push('Real-time sync interval must be at least 10 seconds');
  }

  if (!['timestamp', 'checksum', 'event'].includes(config.changeDetection.strategy)) {
    errors.push('Change detection strategy must be timestamp, checksum, or event');
  }

  if (config.changeDetection.strategy === 'timestamp' && !config.changeDetection.timestampField) {
    errors.push('Timestamp field is required for timestamp-based change detection');
  }

  if (!['catalog_wins', 'postgres_wins', 'manual', 'merge'].includes(config.conflictResolution.strategy)) {
    errors.push('Conflict resolution strategy must be catalog_wins, postgres_wins, manual, or merge');
  }

  if (config.errorHandling.maxRetries < 0 || config.errorHandling.maxRetries > 10) {
    errors.push('Error handling max retries must be between 0 and 10');
  }

  return errors;
}

/**
 * Validate tagging configuration
 */
function validateTaggingConfiguration(config: TaggingConfig): string[] {
  const errors: string[] = [];

  if (config.autoTagging.enabled && !Array.isArray(config.autoTagging.rules)) {
    errors.push('Auto-tagging rules must be an array when auto-tagging is enabled');
  }

  if (config.validation.enabled) {
    if (!Array.isArray(config.validation.requiredTags)) {
      errors.push('Required tags must be an array when validation is enabled');
    }

    if (typeof config.validation.allowedValues !== 'object') {
      errors.push('Allowed values must be an object when validation is enabled');
    }
  }

  if (config.propagation.enabled && !Array.isArray(config.propagation.inheritanceRules)) {
    errors.push('Inheritance rules must be an array when propagation is enabled');
  }

  return errors;
}

/**
 * Validate monitoring configuration
 */
function validateMonitoringConfig(config: MonitoringConfig): string[] {
  const warnings: string[] = [];

  if (config.metrics.enabled && !config.metrics.provider) {
    warnings.push('Metrics provider should be specified when metrics are enabled');
  }

  if (config.alerting.enabled && config.alerting.channels.length === 0) {
    warnings.push('No alert channels configured while alerting is enabled');
  }

  if (!['debug', 'info', 'warn', 'error'].includes(config.logging.level)) {
    warnings.push('Invalid logging level, should be debug, info, warn, or error');
  }

  return warnings;
}

/**
 * Generate summary of tagging pipeline configuration
 */
export function generateConfigSummary(config: SyncPipelineConfig): string {
  const summary = [
    '=== Tagging Pipeline Configuration Summary ===',
    '',
    `Data Catalog: ${config.dataCatalog.type} (${config.dataCatalog.connection.url})`,
    `PostgreSQL: ${config.postgresql.connection.host}:${config.postgresql.connection.port}/${config.postgresql.connection.database}`,
    `Sync Mode: ${config.sync.mode}`,
    `Change Detection: ${config.changeDetection.strategy}`,
    `Auto-Tagging: ${config.tagging.autoTagging.enabled ? 'Enabled' : 'Disabled'}`,
    `Compliance Checks: PII=${config.tagging.compliance.autoDetectPII}, Indigenous=${config.tagging.compliance.autoDetectIndigenous}`,
    `Monitoring: Metrics=${config.monitoring.metrics.enabled}, Alerting=${config.monitoring.alerting.enabled}`,
    '',
    'Sync Frequencies:',
    `  Full: ${config.sync.frequency.full}`,
    `  Incremental: ${config.sync.frequency.incremental}`,
    config.sync.mode === 'real_time' ? `  Real-time: ${config.sync.frequency.realTime}s` : '',
    '',
    'Australian Compliance Features:',
    '  ✓ Privacy Act 1988 automatic detection',
    '  ✓ CARE principles for Indigenous data',
    '  ✓ Data residency enforcement (ap-southeast-2)',
    '  ✓ ACNC and AUSTRAC compliance tagging',
    '',
    '==============================================='
  ].filter(line => line !== ''); // Remove empty strings

  return summary.join('\n');
}

/**
 * Create minimal configuration for testing
 */
export function createTestConfig(): SyncPipelineConfig {
  return {
    dataCatalog: {
      type: 'custom',
      connection: {
        url: 'test://localhost',
        timeout: 5000
      },
      query: {
        batchSize: 10,
        maxRetries: 1,
        retryDelay: 100
      },
      filters: {
        includedTypes: [DataAssetType.TABLE],
        excludedTypes: [],
        includedTags: [],
        excludedTags: []
      }
    },
    postgresql: {
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_pass',
        ssl: false,
        poolSize: 2
      },
      schema: {
        catalogSchema: 'test_catalog',
        tagsSchema: 'test_tags',
        metadataSchema: 'test_metadata'
      },
      performance: {
        batchSize: 10,
        parallelWorkers: 1,
        enablePartitioning: false
      }
    },
    sync: {
      mode: 'incremental',
      frequency: {
        full: '0 0 * * *',
        incremental: '* * * * *',
        realTime: 10
      },
      changeDetection: {
        enabled: false,
        strategy: 'timestamp'
      },
      conflictResolution: {
        strategy: 'catalog_wins',
        manualApprovalRequired: false
      },
      errorHandling: {
        maxRetries: 0,
        retryDelay: 100,
        continueOnError: true,
        deadLetterQueue: false
      }
    },
    tagging: {
      autoTagging: {
        enabled: true,
        rules: []
      },
      validation: {
        enabled: false,
        requiredTags: [],
        allowedValues: {}
      },
      propagation: {
        enabled: false,
        inheritanceRules: []
      },
      compliance: {
        autoDetectPII: true,
        autoDetectIndigenous: true,
        autoApplyPrivacyAct: true,
        autoApplyDataResidency: true
      }
    },
    monitoring: {
      metrics: {
        enabled: false,
        provider: 'prometheus',
        interval: 60000
      },
      alerting: {
        enabled: false,
        channels: [],
        rules: []
      },
      logging: {
        level: 'info',
        destination: 'console',
        format: 'text'
      }
    }
  };
}

/**
 * Environment-specific configuration helpers
 */
export const ConfigHelpers = {
  /**
   * Load configuration from environment variables
   */
  fromEnvironment(): Partial<SyncPipelineConfig> {
    return {
      dataCatalog: {
        type: (process.env.CATALOG_TYPE as any) || 'apache_atlas',
        connection: {
          url: process.env.CATALOG_URL || 'http://localhost:21000',
          username: process.env.CATALOG_USERNAME,
          password: process.env.CATALOG_PASSWORD,
          apiKey: process.env.CATALOG_API_KEY,
          timeout: parseInt(process.env.CATALOG_TIMEOUT || '30000')
        },
        query: {
          batchSize: parseInt(process.env.CATALOG_BATCH_SIZE || '100'),
          maxRetries: parseInt(process.env.CATALOG_MAX_RETRIES || '3'),
          retryDelay: parseInt(process.env.CATALOG_RETRY_DELAY || '5000')
        },
        filters: {
          includedTypes: process.env.CATALOG_INCLUDED_TYPES?.split(',') as any || [DataAssetType.TABLE],
          excludedTypes: process.env.CATALOG_EXCLUDED_TYPES?.split(',') as any || [],
          includedTags: process.env.CATALOG_INCLUDED_TAGS?.split(',') || [],
          excludedTags: process.env.CATALOG_EXCLUDED_TAGS?.split(',') || []
        }
      },
      postgresql: {
        connection: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DB || 'financial_intelligence',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'postgres',
          ssl: process.env.POSTGRES_SSL === 'true',
          poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10')
        },
        schema: {
          catalogSchema: process.env.POSTGRES_CATALOG_SCHEMA || 'data_catalog',
          tagsSchema: process.env.POSTGRES_TAGS_SCHEMA || 'data_tags',
          metadataSchema: process.env.POSTGRES_METADATA_SCHEMA || 'data_metadata'
        },
        performance: {
          batchSize: parseInt(process.env.POSTGRES_BATCH_SIZE || '1000'),
          parallelWorkers: parseInt(process.env.POSTGRES_WORKERS || '4'),
          enablePartitioning: process.env.POSTGRES_PARTITIONING !== 'false'
        }
      }
    };
  },

  /**
   * Merge configurations with precedence
   */
  merge(...configs: Partial<SyncPipelineConfig>[]): SyncPipelineConfig {
    const base = createDefaultTaggingConfig();
    
    // Deep merge all configs
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, base);
  },

  /**
   * Deep merge utility
   */
  deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
};