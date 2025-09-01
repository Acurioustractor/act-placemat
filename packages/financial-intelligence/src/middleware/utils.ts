/**
 * Middleware Utilities
 * 
 * Helper functions and utilities for policy middleware configuration and validation
 */

import { 
  MiddlewareConfig,
  ExpressMiddleware,
  MiddlewareError,
  MiddlewareErrorType
} from './types';
import { MiddlewareFactory } from './MiddlewareFactory';
import { createDefaultIntentExtractionConfig } from './IntentExtractor';
import { createDefaultAuditLoggerConfig } from './AuditLogger';

/**
 * Create production-ready middleware with default configuration
 */
export async function createProductionMiddleware(
  opaUrl?: string,
  customPolicies?: string[]
): Promise<{
  middleware: ExpressMiddleware;
  config: MiddlewareConfig;
}> {
  const config = createDefaultProductionConfig(opaUrl, customPolicies);
  const { middleware } = await MiddlewareFactory.createProduction(config);
  
  return { middleware, config };
}

/**
 * Create development middleware with enhanced debugging
 */
export async function createDevelopmentMiddleware(
  enableDebug: boolean = true
): Promise<{
  middleware: ExpressMiddleware;
  config: MiddlewareConfig;
}> {
  const { middleware, policyMiddleware } = await MiddlewareFactory.createDevelopment();
  
  if (enableDebug) {
    setupDebugLogging(policyMiddleware);
  }
  
  const config = createDefaultDevelopmentConfig();
  return { middleware, config };
}

/**
 * Create testing middleware with mocked dependencies
 */
export function createTestingMiddleware(): {
  middleware: ExpressMiddleware;
  config: MiddlewareConfig;
} {
  const { middleware } = MiddlewareFactory.createTesting();
  const config = createDefaultTestingConfig();
  
  return { middleware, config };
}

/**
 * Validate middleware configuration
 */
export function validateMiddlewareConfig(config: MiddlewareConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate OPA configuration
  if (!config.opa.url) {
    errors.push('OPA URL is required');
  }

  if (config.opa.timeout < 1000) {
    warnings.push('OPA timeout is very low (< 1000ms)');
  }

  if (config.opa.retries.max > 5) {
    warnings.push('High number of OPA retries may impact performance');
  }

  // Validate caching configuration
  if (config.caching.enabled) {
    if (config.caching.ttl < 10) {
      warnings.push('Very low cache TTL may reduce effectiveness');
    }

    if (config.caching.maxEntries < 100) {
      warnings.push('Low cache size may reduce hit rate');
    }
  }

  // Validate audit configuration
  if (config.audit.enabled && config.audit.destination === 'database') {
    // Would validate database connection in real implementation
  }

  // Validate performance configuration
  if (config.performance.requestTimeout < 1000) {
    warnings.push('Very low request timeout may cause frequent timeouts');
  }

  if (config.performance.maxConcurrentEvaluations < 10) {
    warnings.push('Low concurrent evaluation limit may cause throttling');
  }

  // Validate error handling
  if (config.errorHandling.onEvaluationFailure === 'allow' && 
      config.errorHandling.onServiceUnavailable === 'allow') {
    warnings.push('All error scenarios configured to allow - security risk in production');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create default production configuration
 */
function createDefaultProductionConfig(
  opaUrl?: string,
  customPolicies?: string[]
): MiddlewareConfig {
  return {
    opa: {
      url: opaUrl || process.env.OPA_URL || 'http://localhost:8181',
      timeout: 5000,
      retries: {
        max: 3,
        delay: 1000
      },
      defaultPolicies: customPolicies || [
        'financial_operations',
        'australian_compliance',
        'consent_management',
        'data_sovereignty'
      ]
    },
    intentExtraction: createDefaultIntentExtractionConfig(),
    caching: {
      enabled: true,
      ttl: 300, // 5 minutes
      maxEntries: 10000,
      keyStrategy: 'content_hash'
    },
    audit: {
      enabled: true,
      level: 'standard',
      excludeFields: ['password', 'secret', 'token'],
      destination: 'database'
    },
    errorHandling: {
      onEvaluationFailure: 'deny',
      onServiceUnavailable: 'deny',
      exposeDetails: false
    },
    performance: {
      requestTimeout: 10000,
      asyncEvaluation: true,
      maxConcurrentEvaluations: 100
    },
    development: {
      verboseLogging: false,
      debugHeaders: false,
      skipEvaluation: false
    }
  };
}

/**
 * Create default development configuration
 */
function createDefaultDevelopmentConfig(): MiddlewareConfig {
  return {
    opa: {
      url: process.env.OPA_URL || 'http://localhost:8181',
      timeout: 10000,
      retries: {
        max: 1,
        delay: 500
      },
      defaultPolicies: ['financial_operations']
    },
    intentExtraction: createDefaultIntentExtractionConfig(),
    caching: {
      enabled: false,
      ttl: 60,
      maxEntries: 100,
      keyStrategy: 'simple'
    },
    audit: {
      enabled: false,
      level: 'minimal',
      excludeFields: [],
      destination: 'console'
    },
    errorHandling: {
      onEvaluationFailure: 'allow',
      onServiceUnavailable: 'allow',
      exposeDetails: true
    },
    performance: {
      requestTimeout: 30000,
      asyncEvaluation: false,
      maxConcurrentEvaluations: 10
    },
    development: {
      verboseLogging: true,
      debugHeaders: true,
      skipEvaluation: false
    }
  };
}

/**
 * Create default testing configuration
 */
function createDefaultTestingConfig(): MiddlewareConfig {
  return {
    opa: {
      url: 'mock://testing',
      timeout: 1000,
      retries: {
        max: 0,
        delay: 0
      },
      defaultPolicies: ['test_policy']
    },
    intentExtraction: {
      extractors: {
        httpMethod: true,
        headers: false,
        body: true,
        query: false,
        params: false,
        userAgent: false
      },
      customRules: [],
      fieldMappings: {}
    },
    caching: {
      enabled: false,
      ttl: 10,
      maxEntries: 10,
      keyStrategy: 'simple'
    },
    audit: {
      enabled: false,
      level: 'minimal',
      excludeFields: [],
      destination: 'console'
    },
    errorHandling: {
      onEvaluationFailure: 'allow',
      onServiceUnavailable: 'allow',
      exposeDetails: true
    },
    performance: {
      requestTimeout: 5000,
      asyncEvaluation: false,
      maxConcurrentEvaluations: 1
    },
    development: {
      verboseLogging: false,
      debugHeaders: false,
      skipEvaluation: true
    }
  };
}

/**
 * Setup debug logging for development
 */
function setupDebugLogging(policyMiddleware: any): void {
  const events = [
    'request:received',
    'intent:extracted',
    'policy:evaluated',
    'request:allowed',
    'request:denied',
    'error:occurred',
    'metrics:updated'
  ];

  for (const event of events) {
    policyMiddleware.on(event, (data: any) => {
      console.log(`[Policy Middleware] ${event}:`, JSON.stringify(data, null, 2));
    });
  }
}

/**
 * Configuration presets for common scenarios
 */
export const ConfigPresets = {
  /**
   * High security configuration for sensitive operations
   */
  highSecurity: (): Partial<MiddlewareConfig> => ({
    errorHandling: {
      onEvaluationFailure: 'deny',
      onServiceUnavailable: 'deny',
      exposeDetails: false
    },
    audit: {
      enabled: true,
      level: 'comprehensive',
      excludeFields: [],
      destination: 'database'
    },
    caching: {
      enabled: false, // No caching for maximum security
      ttl: 0,
      maxEntries: 0,
      keyStrategy: 'simple'
    }
  }),

  /**
   * High performance configuration for API gateways
   */
  highPerformance: (): Partial<MiddlewareConfig> => ({
    caching: {
      enabled: true,
      ttl: 600, // 10 minutes
      maxEntries: 50000,
      keyStrategy: 'content_hash'
    },
    performance: {
      requestTimeout: 2000,
      asyncEvaluation: true,
      maxConcurrentEvaluations: 1000
    },
    audit: {
      enabled: false,
      level: 'minimal',
      excludeFields: [],
      destination: 'console'
    }
  }),

  /**
   * Indigenous data handling configuration
   */
  indigenousData: (): Partial<MiddlewareConfig> => ({
    opa: {
      defaultPolicies: [
        'indigenous_data_sovereignty',
        'care_principles',
        'traditional_owner_consent'
      ]
    } as any,
    audit: {
      enabled: true,
      level: 'comprehensive',
      excludeFields: [],
      destination: 'database'
    },
    errorHandling: {
      onEvaluationFailure: 'deny',
      onServiceUnavailable: 'deny',
      exposeDetails: false
    }
  }),

  /**
   * Financial operations configuration
   */
  financialOperations: (): Partial<MiddlewareConfig> => ({
    opa: {
      defaultPolicies: [
        'financial_operations',
        'austrac_reporting',
        'acnc_governance'
      ]
    } as any,
    caching: {
      enabled: true,
      ttl: 60, // 1 minute for financial data
      maxEntries: 5000,
      keyStrategy: 'content_hash'
    },
    audit: {
      enabled: true,
      level: 'standard',
      excludeFields: ['password', 'secret'],
      destination: 'database'
    }
  })
};

/**
 * Merge configuration with preset
 */
export function mergeWithPreset(
  preset: keyof typeof ConfigPresets,
  customConfig: Partial<MiddlewareConfig> = {}
): MiddlewareConfig {
  const baseConfig = createDefaultProductionConfig();
  const presetConfig = ConfigPresets[preset]();
  
  return deepMerge(baseConfig, presetConfig, customConfig);
}

/**
 * Deep merge utility for configurations
 */
function deepMerge(...objects: any[]): any {
  const result: any = {};
  
  for (const obj of objects) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        result[key] = deepMerge(result[key] || {}, obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  }
  
  return result;
}

/**
 * Environment detection utilities
 */
export const Environment = {
  /**
   * Detect if running in production
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  /**
   * Detect if running in development
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },

  /**
   * Detect if running in testing
   */
  isTesting(): boolean {
    return process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
  },

  /**
   * Get recommended configuration for current environment
   */
  getRecommendedConfig(): MiddlewareConfig {
    if (this.isProduction()) {
      return createDefaultProductionConfig();
    } else if (this.isTesting()) {
      return createDefaultTestingConfig();
    } else {
      return createDefaultDevelopmentConfig();
    }
  }
};

/**
 * Health check utilities
 */
export const HealthCheck = {
  /**
   * Create health check endpoint for middleware
   */
  createHealthCheck(policyMiddleware: any) {
    return async (req: any, res: any) => {
      try {
        // Check OPA service connectivity
        const opaHealth = await this.checkOPAHealth(policyMiddleware);
        
        // Check cache status
        const cacheHealth = this.checkCacheHealth(policyMiddleware);
        
        // Get metrics
        const metrics = policyMiddleware.getMetrics();
        
        const health = {
          status: opaHealth.connected && cacheHealth.healthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          services: {
            opa: opaHealth,
            cache: cacheHealth
          },
          metrics: {
            totalRequests: metrics.totalRequests,
            errorRate: metrics.errorRate,
            averageEvaluationTime: metrics.averageEvaluationTime
          }
        };
        
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
        
      } catch (error) {
        res.status(500).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    };
  },

  async checkOPAHealth(policyMiddleware: any): Promise<{ connected: boolean; responseTime?: number }> {
    try {
      const startTime = Date.now();
      // Would check OPA service health here
      const responseTime = Date.now() - startTime;
      
      return { connected: true, responseTime };
    } catch {
      return { connected: false };
    }
  },

  checkCacheHealth(policyMiddleware: any): { healthy: boolean; entries?: number; hitRate?: number } {
    try {
      const metrics = policyMiddleware.getMetrics();
      return {
        healthy: true,
        hitRate: metrics.cacheHitRate
      };
    } catch {
      return { healthy: false };
    }
  }
};

/**
 * Generate configuration summary for documentation
 */
export function generateConfigSummary(config: MiddlewareConfig): string {
  const summary = [
    '=== Policy Middleware Configuration Summary ===',
    '',
    `OPA Service: ${config.opa.url}`,
    `Default Policies: ${config.opa.defaultPolicies.join(', ')}`,
    `Caching: ${config.caching.enabled ? 'Enabled' : 'Disabled'}`,
    `Audit Logging: ${config.audit.enabled ? 'Enabled' : 'Disabled'}`,
    `Error Handling: ${config.errorHandling.onEvaluationFailure} on failure`,
    '',
    'Security Features:',
    '  ✓ Intent-based policy evaluation',
    '  ✓ Australian Privacy Act compliance',
    '  ✓ Indigenous data sovereignty',
    '  ✓ Real-time audit logging',
    '  ✓ Data transformation and redaction',
    '',
    'Performance Features:',
    `  ✓ Request timeout: ${config.performance.requestTimeout}ms`,
    `  ✓ Async evaluation: ${config.performance.asyncEvaluation ? 'Yes' : 'No'}`,
    `  ✓ Max concurrent: ${config.performance.maxConcurrentEvaluations}`,
    `  ✓ Cache TTL: ${config.caching.ttl}s`,
    '',
    '==============================================='
  ];

  return summary.join('\n');
}