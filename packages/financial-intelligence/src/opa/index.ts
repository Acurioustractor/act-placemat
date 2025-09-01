/**
 * OPA Integration Module
 * 
 * Complete Open Policy Agent integration for Financial Intelligence
 * with decision logging, audit capabilities, and Australian compliance
 */

// Core types
export * from './types';

// Main OPA service
export { OPAService } from './OPAService';

// Decision logging implementations
export { PostgreSQLDecisionLogger } from './PostgreSQLDecisionLogger';

// Audit query utilities
export { 
  AuditQueryBuilder, 
  AuditQueryTemplates, 
  AuditReportGenerator,
  ComplianceSummaryReport,
  UserActivityReport,
  PolicyEffectivenessReport
} from './AuditQueryBuilder';

// Convenience factory for creating OPA service instances
export class OPAServiceFactory {
  /**
   * Create OPA service with PostgreSQL logging
   */
  static createWithPostgreSQL(opaConfig: any, dbConfig: any) {
    const config = {
      server: opaConfig,
      logging: {
        enabled: true,
        destination: 'postgresql' as const,
        config: dbConfig,
        retention: {
          defaultYears: 7,
          complianceYears: 10,
          indigenousDataYears: 50
        }
      },
      cache: {
        enabled: true,
        type: 'memory' as const,
        config: {},
        defaultTTL: 300,
        maxSize: 1000
      },
      monitoring: {
        enabled: true,
        metricsProvider: 'prometheus' as const,
        alertThresholds: {
          latencyMs: 1000,
          errorRate: 0.05,
          cacheHitRate: 0.8
        }
      },
      security: {
        enableInputValidation: true,
        sanitizeInputs: true,
        enableAuditLogging: true,
        encryptSensitiveData: true
      },
      compliance: {
        enforceDataResidency: true,
        enablePrivacyActCompliance: true,
        enableIndigenousProtocols: true,
        austracReportingEnabled: true,
        auditRetentionYears: 7
      }
    };

    return new OPAService(config);
  }

  /**
   * Create OPA service for development/testing
   */
  static createForDevelopment(opaUrl: string = 'http://localhost:8181') {
    const config = {
      server: {
        url: opaUrl,
        timeout: 5000,
        retries: 3,
        retryDelay: 1000
      },
      logging: {
        enabled: true,
        destination: 'file' as const,
        config: { path: './logs/opa-decisions.log' },
        retention: {
          defaultYears: 1,
          complianceYears: 1,
          indigenousDataYears: 1
        }
      },
      cache: {
        enabled: true,
        type: 'memory' as const,
        config: {},
        defaultTTL: 60,
        maxSize: 100
      },
      monitoring: {
        enabled: false,
        metricsProvider: 'custom' as const,
        alertThresholds: {
          latencyMs: 5000,
          errorRate: 0.1,
          cacheHitRate: 0.5
        }
      },
      security: {
        enableInputValidation: true,
        sanitizeInputs: true,
        enableAuditLogging: true,
        encryptSensitiveData: false
      },
      compliance: {
        enforceDataResidency: false,
        enablePrivacyActCompliance: true,
        enableIndigenousProtocols: true,
        austracReportingEnabled: false,
        auditRetentionYears: 1
      }
    };

    return new OPAService(config);
  }
}

// Default export for convenience
export default OPAService;