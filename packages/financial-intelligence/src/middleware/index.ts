/**
 * Policy Middleware
 * 
 * Complete API middleware system for intent-policy evaluation
 * with Australian compliance, audit logging, and performance optimization
 */

// Export main middleware components
export { PolicyMiddleware } from './PolicyMiddleware';
export { IntentExtractor, createDefaultIntentExtractionConfig } from './IntentExtractor';
export { AuditLogger, createDefaultAuditLoggerConfig } from './AuditLogger';

// Export factory and convenience functions
export { 
  MiddlewareFactory,
  MiddlewareEnvironment,
  createAustralianComplianceMiddleware,
  createIndigenousDataMiddleware,
  createFinancialOperationsMiddleware,
  createHighPerformanceMiddleware
} from './MiddlewareFactory';

// Export all types
export * from './types';

// Export utilities
export { 
  createProductionMiddleware,
  createDevelopmentMiddleware,
  createTestingMiddleware,
  validateMiddlewareConfig
} from './utils';

// Package metadata
export const MIDDLEWARE_VERSION = '1.0.0';
export const SUPPORTED_FRAMEWORKS = ['express', 'nestjs', 'fastify', 'koa'] as const;
export const DEFAULT_OPA_POLICIES = [
  'financial_operations',
  'australian_compliance',
  'consent_management',
  'data_sovereignty'
] as const;