/**
 * Middleware Factory
 * 
 * Factory for creating configured policy middleware instances
 * with comprehensive Australian compliance and audit capabilities
 */

import { PolicyMiddleware } from './PolicyMiddleware';
import { AuditLogger, createDefaultAuditLoggerConfig } from './AuditLogger';
import { createDefaultIntentExtractionConfig } from './IntentExtractor';
import { 
  MiddlewareConfig,
  ExpressMiddleware,
  PolicyEvaluatedRequest,
  MiddlewareError,
  MiddlewareErrorType
} from './types';
import { Response, NextFunction } from 'express';

/**
 * Middleware factory for creating production-ready policy middleware
 */
export class MiddlewareFactory {
  /**
   * Create production middleware with full audit logging
   */
  static async createProduction(overrides: Partial<MiddlewareConfig> = {}): Promise<{
    middleware: ExpressMiddleware;
    policyMiddleware: PolicyMiddleware;
    auditLogger: AuditLogger;
  }> {
    const config = this.createProductionConfig(overrides);
    
    // Create audit logger
    const auditLogger = new AuditLogger(createDefaultAuditLoggerConfig());
    await auditLogger.initialize();
    
    // Create policy middleware
    const policyMiddleware = new PolicyMiddleware(config);
    await policyMiddleware.initialize();
    
    // Create Express middleware with audit integration
    const middleware = this.createAuditIntegratedMiddleware(policyMiddleware, auditLogger);
    
    return {
      middleware,
      policyMiddleware,
      auditLogger
    };
  }

  /**
   * Create development middleware with minimal overhead
   */
  static async createDevelopment(): Promise<{
    middleware: ExpressMiddleware;
    policyMiddleware: PolicyMiddleware;
  }> {
    const config = this.createDevelopmentConfig();
    
    const policyMiddleware = new PolicyMiddleware(config);
    await policyMiddleware.initialize();
    
    const middleware = policyMiddleware.createExpressMiddleware();
    
    return {
      middleware,
      policyMiddleware
    };
  }

  /**
   * Create testing middleware with mocked dependencies
   */
  static createTesting(): {
    middleware: ExpressMiddleware;
    policyMiddleware: PolicyMiddleware;
  } {
    const config = this.createTestingConfig();
    
    const policyMiddleware = new PolicyMiddleware(config);
    
    // Override OPA service for testing
    (policyMiddleware as any).opaService = this.createMockOPAService();
    
    const middleware = policyMiddleware.createExpressMiddleware();
    
    return {
      middleware,
      policyMiddleware
    };
  }

  /**
   * Create middleware with custom configuration
   */
  static async createCustom(config: MiddlewareConfig): Promise<{
    middleware: ExpressMiddleware;
    policyMiddleware: PolicyMiddleware;
    auditLogger?: AuditLogger;
  }> {
    let auditLogger: AuditLogger | undefined;
    
    if (config.audit.enabled) {
      auditLogger = new AuditLogger(createDefaultAuditLoggerConfig());
      await auditLogger.initialize();
    }
    
    const policyMiddleware = new PolicyMiddleware(config);
    await policyMiddleware.initialize();
    
    const middleware = auditLogger 
      ? this.createAuditIntegratedMiddleware(policyMiddleware, auditLogger)
      : policyMiddleware.createExpressMiddleware();
    
    return {
      middleware,
      policyMiddleware,
      auditLogger
    };
  }

  // Private helper methods

  private static createProductionConfig(overrides: Partial<MiddlewareConfig>): MiddlewareConfig {
    const defaultConfig: MiddlewareConfig = {
      opa: {
        url: process.env.OPA_URL || 'http://localhost:8181',
        timeout: 5000,
        retries: {
          max: 3,
          delay: 1000
        },
        defaultPolicies: ['financial_operations', 'australian_compliance', 'consent_management']
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

    return this.mergeConfig(defaultConfig, overrides);
  }

  private static createDevelopmentConfig(): MiddlewareConfig {
    return this.createProductionConfig({
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
      development: {
        verboseLogging: true,
        debugHeaders: true,
        skipEvaluation: false
      }
    });
  }

  private static createTestingConfig(): MiddlewareConfig {
    return this.createDevelopmentConfig();
  }

  private static createAuditIntegratedMiddleware(
    policyMiddleware: PolicyMiddleware,
    auditLogger: AuditLogger
  ): ExpressMiddleware {
    return async (req: PolicyEvaluatedRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      try {
        // Log request received
        await auditLogger.logRequestReceived(req, startTime);
        
        // Set up event listeners for audit logging
        const originalEmit = policyMiddleware.emit.bind(policyMiddleware);
        policyMiddleware.emit = (event: string, ...args: any[]) => {
          this.handleAuditEvent(event, args, req, auditLogger, startTime);
          return originalEmit(event, ...args);
        };
        
        // Execute policy middleware
        const middleware = policyMiddleware.createExpressMiddleware();
        await middleware(req, res, next);
        
      } catch (error) {
        // Log error
        if (error instanceof MiddlewareError) {
          await auditLogger.logError(req, error, startTime);
        }
        
        // Re-throw error for standard error handling
        throw error;
      }
    };
  }

  private static async handleAuditEvent(
    event: string,
    args: any[],
    req: PolicyEvaluatedRequest,
    auditLogger: AuditLogger,
    startTime: number
  ): Promise<void> {
    try {
      switch (event) {
        case 'intent:extracted':
          if (args[0]?.intent) {
            await auditLogger.logIntentExtracted(
              req,
              args[0].intent,
              args[0].extractionTime,
              startTime
            );
          }
          break;
        
        case 'policy:evaluated':
          if (args[0]?.decision) {
            await auditLogger.logPolicyEvaluated(req, {
              allowed: args[0].decision.allow,
              decision: args[0].decision,
              evaluationTime: args[0].evaluationTime,
              fromCache: args[0].fromCache
            } as any, startTime);
          }
          break;
        
        case 'request:allowed':
          await auditLogger.logRequestAllowed(
            req,
            args[0]?.transformations || [],
            startTime
          );
          break;
        
        case 'request:denied':
          await auditLogger.logRequestDenied(
            req,
            args[0]?.reason || 'Request denied',
            args[0]?.suggestions || [],
            startTime
          );
          break;
        
        case 'error:occurred':
          if (args[0]?.error) {
            await auditLogger.logError(req, args[0].error, startTime);
          }
          break;
      }
    } catch (auditError) {
      // Don't let audit failures break the main flow
      console.error('Audit logging failed:', auditError);
    }
  }

  private static createMockOPAService(): any {
    return {
      async initialize() {
        return Promise.resolve();
      },
      
      async evaluateIntent(intent: any) {
        // Mock policy decision - allow everything in testing
        return {
          allow: true,
          reason: 'Mock evaluation - testing mode',
          metadata: {
            policyVersion: '1.0-test',
            evaluationTime: 1
          }
        };
      },
      
      async shutdown() {
        return Promise.resolve();
      }
    };
  }

  private static mergeConfig(base: MiddlewareConfig, overrides: Partial<MiddlewareConfig>): MiddlewareConfig {
    return {
      ...base,
      ...overrides,
      opa: { ...base.opa, ...overrides.opa },
      intentExtraction: { ...base.intentExtraction, ...overrides.intentExtraction },
      caching: { ...base.caching, ...overrides.caching },
      audit: { ...base.audit, ...overrides.audit },
      errorHandling: { ...base.errorHandling, ...overrides.errorHandling },
      performance: { ...base.performance, ...overrides.performance },
      development: { ...base.development, ...overrides.development }
    };
  }
}

/**
 * Convenience functions for creating common middleware configurations
 */

/**
 * Create middleware for Australian compliance scenarios
 */
export async function createAustralianComplianceMiddleware(): Promise<{
  middleware: ExpressMiddleware;
  policyMiddleware: PolicyMiddleware;
  auditLogger: AuditLogger;
}> {
  return MiddlewareFactory.createProduction({
    opa: {
      defaultPolicies: [
        'australian_privacy_act',
        'indigenous_data_sovereignty',
        'acnc_compliance',
        'austrac_reporting',
        'data_residency'
      ]
    } as any,
    audit: {
      enabled: true,
      level: 'comprehensive',
      excludeFields: ['password', 'secret'],
      destination: 'database'
    }
  });
}

/**
 * Create middleware for Indigenous data handling
 */
export async function createIndigenousDataMiddleware(): Promise<{
  middleware: ExpressMiddleware;
  policyMiddleware: PolicyMiddleware;
  auditLogger: AuditLogger;
}> {
  return MiddlewareFactory.createProduction({
    opa: {
      defaultPolicies: [
        'indigenous_data_sovereignty',
        'care_principles',
        'traditional_owner_consent',
        'cultural_protocols'
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
  });
}

/**
 * Create middleware for financial operations
 */
export async function createFinancialOperationsMiddleware(): Promise<{
  middleware: ExpressMiddleware;
  policyMiddleware: PolicyMiddleware;
  auditLogger: AuditLogger;
}> {
  return MiddlewareFactory.createProduction({
    opa: {
      defaultPolicies: [
        'financial_operations',
        'austrac_reporting',
        'acnc_governance',
        'benefit_allocation',
        'cash_flow_management'
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
      level: 'comprehensive',
      excludeFields: [],
      destination: 'database'
    }
  });
}

/**
 * Create high-performance middleware for API gateways
 */
export async function createHighPerformanceMiddleware(): Promise<{
  middleware: ExpressMiddleware;
  policyMiddleware: PolicyMiddleware;
}> {
  return MiddlewareFactory.createProduction({
    caching: {
      enabled: true,
      ttl: 600, // 10 minutes
      maxEntries: 50000,
      keyStrategy: 'content_hash'
    },
    audit: {
      enabled: false,
      level: 'minimal',
      excludeFields: [],
      destination: 'console'
    },
    performance: {
      requestTimeout: 2000, // 2 seconds
      asyncEvaluation: true,
      maxConcurrentEvaluations: 1000
    }
  });
}

/**
 * Environment-specific factory methods
 */
export const MiddlewareEnvironment = {
  /**
   * Create middleware from environment variables
   */
  async fromEnvironment(): Promise<{
    middleware: ExpressMiddleware;
    policyMiddleware: PolicyMiddleware;
    auditLogger?: AuditLogger;
  }> {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'production':
        return MiddlewareFactory.createProduction();
      
      case 'development':
        return MiddlewareFactory.createDevelopment();
      
      case 'test':
        return MiddlewareFactory.createTesting();
      
      default:
        return MiddlewareFactory.createDevelopment();
    }
  },

  /**
   * Create middleware for specific deployment environments
   */
  async forDeployment(deployment: 'on-premises' | 'cloud' | 'hybrid'): Promise<{
    middleware: ExpressMiddleware;
    policyMiddleware: PolicyMiddleware;
    auditLogger: AuditLogger;
  }> {
    const baseConfig = deployment === 'on-premises' 
      ? { 
          errorHandling: { 
            onEvaluationFailure: 'allow' as const,
            onServiceUnavailable: 'allow' as const,
            exposeDetails: true 
          } 
        }
      : {
          errorHandling: {
            onEvaluationFailure: 'deny' as const,
            onServiceUnavailable: 'deny' as const,
            exposeDetails: false
          }
        };

    return MiddlewareFactory.createProduction(baseConfig);
  }
};