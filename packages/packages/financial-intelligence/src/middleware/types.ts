/**
 * API Middleware Types
 * 
 * Type definitions for intent-policy evaluation middleware
 * supporting Express, NestJS, and other Node.js frameworks
 */

import { Request, Response, NextFunction } from 'express';
import { FinancialIntent, UserContext, FinancialContext, PolicyDecision } from '../types/financial';

/**
 * Extended request interface with policy evaluation context
 */
export interface PolicyEvaluatedRequest extends Request {
  /** Policy evaluation result */
  policyEvaluation?: PolicyEvaluation;
  
  /** Extracted user intent */
  userIntent?: FinancialIntent;
  
  /** User context */
  userContext?: UserContext;
  
  /** Financial context */
  financialContext?: FinancialContext;
  
  /** Original request body before transformation */
  originalBody?: any;
  
  /** Redacted/transformed request data */
  transformedData?: any;
  
  /** Audit trail ID for tracking */
  auditTrailId?: string;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluation {
  /** Whether the request is allowed */
  allowed: boolean;
  
  /** Policy decision details */
  decision: PolicyDecision;
  
  /** Transformation instructions */
  transformations?: DataTransformation[];
  
  /** Required consent confirmations */
  consentRequired?: ConsentRequirement[];
  
  /** Audit requirements */
  auditRequirements?: AuditRequirement[];
  
  /** Performance metrics */
  evaluationTime: number;
  
  /** Cached result indicator */
  fromCache: boolean;
}

/**
 * Data transformation instruction
 */
export interface DataTransformation {
  /** Field path to transform */
  field: string;
  
  /** Transformation type */
  type: 'redact' | 'mask' | 'hash' | 'encrypt' | 'remove' | 'replace';
  
  /** Transformation parameters */
  parameters?: Record<string, any>;
  
  /** Reason for transformation */
  reason: string;
  
  /** Reversible transformation info */
  reversible?: {
    keyId: string;
    algorithm: string;
  };
}

/**
 * Consent requirement
 */
export interface ConsentRequirement {
  /** Consent type required */
  type: string;
  
  /** Consent level needed */
  level: string;
  
  /** Purpose of consent */
  purpose: string;
  
  /** Data categories requiring consent */
  dataCategories: string[];
  
  /** Expiry of required consent */
  expiryDays?: number;
}

/**
 * Audit requirement
 */
export interface AuditRequirement {
  /** Audit level required */
  level: 'basic' | 'detailed' | 'comprehensive';
  
  /** Fields to audit */
  fields: string[];
  
  /** Retention period for audit logs */
  retentionDays: number;
  
  /** Compliance frameworks requiring audit */
  frameworks: string[];
}

/**
 * Intent extraction configuration
 */
export interface IntentExtractionConfig {
  /** Enabled extractors */
  extractors: {
    /** Extract from HTTP method and path */
    httpMethod: boolean;
    
    /** Extract from request headers */
    headers: boolean;
    
    /** Extract from request body */
    body: boolean;
    
    /** Extract from query parameters */
    query: boolean;
    
    /** Extract from route parameters */
    params: boolean;
    
    /** Extract from user agent */
    userAgent: boolean;
  };
  
  /** Custom extraction rules */
  customRules: IntentExtractionRule[];
  
  /** Field mappings */
  fieldMappings: Record<string, string>;
}

/**
 * Intent extraction rule
 */
export interface IntentExtractionRule {
  /** Rule name */
  name: string;
  
  /** Condition for applying rule */
  condition: {
    field: string;
    operator: 'equals' | 'contains' | 'matches' | 'exists';
    value?: any;
  };
  
  /** Intent properties to set */
  intent: Partial<FinancialIntent>;
  
  /** Priority (higher numbers processed first) */
  priority: number;
  
  /** Whether rule is enabled */
  enabled: boolean;
}

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  /** OPA service configuration */
  opa: {
    /** OPA service URL */
    url: string;
    
    /** Request timeout */
    timeout: number;
    
    /** Retry configuration */
    retries: {
      max: number;
      delay: number;
    };
    
    /** Default policies to evaluate */
    defaultPolicies: string[];
  };
  
  /** Intent extraction configuration */
  intentExtraction: IntentExtractionConfig;
  
  /** Caching configuration */
  caching: {
    /** Whether caching is enabled */
    enabled: boolean;
    
    /** Cache TTL in seconds */
    ttl: number;
    
    /** Maximum cache entries */
    maxEntries: number;
    
    /** Cache key generation strategy */
    keyStrategy: 'simple' | 'content_hash' | 'custom';
    
    /** Custom cache key function */
    customKeyGenerator?: (intent: FinancialIntent) => string;
  };
  
  /** Audit logging configuration */
  audit: {
    /** Whether audit logging is enabled */
    enabled: boolean;
    
    /** Audit log level */
    level: 'minimal' | 'standard' | 'comprehensive';
    
    /** Fields to exclude from audit logs */
    excludeFields: string[];
    
    /** Audit log destination */
    destination: 'database' | 'file' | 'remote';
  };
  
  /** Error handling configuration */
  errorHandling: {
    /** How to handle policy evaluation failures */
    onEvaluationFailure: 'allow' | 'deny' | 'custom';
    
    /** How to handle OPA service unavailability */
    onServiceUnavailable: 'allow' | 'deny' | 'cache_only';
    
    /** Whether to expose detailed error messages */
    exposeDetails: boolean;
    
    /** Custom error handler */
    customErrorHandler?: (error: Error, req: PolicyEvaluatedRequest) => any;
  };
  
  /** Performance configuration */
  performance: {
    /** Request timeout in milliseconds */
    requestTimeout: number;
    
    /** Enable async evaluation */
    asyncEvaluation: boolean;
    
    /** Maximum concurrent evaluations */
    maxConcurrentEvaluations: number;
  };
  
  /** Development/debugging configuration */
  development: {
    /** Enable detailed logging */
    verboseLogging: boolean;
    
    /** Enable debug headers in responses */
    debugHeaders: boolean;
    
    /** Skip policy evaluation (for testing) */
    skipEvaluation: boolean;
  };
}

/**
 * Middleware error types
 */
export enum MiddlewareErrorType {
  INTENT_EXTRACTION_FAILED = 'intent_extraction_failed',
  POLICY_EVALUATION_FAILED = 'policy_evaluation_failed',
  CONSENT_REQUIRED = 'consent_required',
  POLICY_DENIED = 'policy_denied',
  TRANSFORMATION_FAILED = 'transformation_failed',
  AUDIT_FAILED = 'audit_failed',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  CONFIGURATION_ERROR = 'configuration_error'
}

/**
 * Middleware error
 */
export class MiddlewareError extends Error {
  constructor(
    public type: MiddlewareErrorType,
    message: string,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'MiddlewareError';
  }
}

/**
 * Middleware response
 */
export interface MiddlewareResponse {
  /** Whether request is allowed to proceed */
  allowed: boolean;
  
  /** HTTP status code to return */
  statusCode?: number;
  
  /** Response body */
  body?: any;
  
  /** Additional headers to set */
  headers?: Record<string, string>;
  
  /** Reason for denial (if applicable) */
  reason?: string;
  
  /** Suggestions for remediation */
  suggestions?: string[];
  
  /** Required actions for user */
  requiredActions?: RequiredAction[];
}

/**
 * Required action for user
 */
export interface RequiredAction {
  /** Action type */
  type: 'consent' | 'authentication' | 'verification' | 'approval';
  
  /** Action description */
  description: string;
  
  /** URL for performing action */
  actionUrl?: string;
  
  /** Parameters for action */
  parameters?: Record<string, any>;
  
  /** Deadline for action */
  deadline?: Date;
}

/**
 * Cache entry for policy decisions
 */
export interface PolicyCacheEntry {
  /** Cached decision */
  decision: PolicyDecision;
  
  /** Cache timestamp */
  timestamp: number;
  
  /** Cache expiry timestamp */
  expiry: number;
  
  /** Intent hash that was cached */
  intentHash: string;
  
  /** Policy version used */
  policyVersion: string;
  
  /** Hit count for this cache entry */
  hitCount: number;
}

/**
 * Middleware metrics
 */
export interface MiddlewareMetrics {
  /** Total requests processed */
  totalRequests: number;
  
  /** Requests allowed */
  allowedRequests: number;
  
  /** Requests denied */
  deniedRequests: number;
  
  /** Average evaluation time */
  averageEvaluationTime: number;
  
  /** Cache hit rate */
  cacheHitRate: number;
  
  /** Error rate */
  errorRate: number;
  
  /** Requests by policy outcome */
  outcomeDistribution: Record<string, number>;
  
  /** Performance percentiles */
  performancePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

/**
 * Middleware events
 */
export interface MiddlewareEvents {
  /** Request received */
  'request:received': {
    requestId: string;
    method: string;
    path: string;
    userId?: string;
  };
  
  /** Intent extracted */
  'intent:extracted': {
    requestId: string;
    intent: FinancialIntent;
    extractionTime: number;
  };
  
  /** Policy evaluated */
  'policy:evaluated': {
    requestId: string;
    decision: PolicyDecision;
    evaluationTime: number;
    fromCache: boolean;
  };
  
  /** Request allowed */
  'request:allowed': {
    requestId: string;
    transformations: DataTransformation[];
  };
  
  /** Request denied */
  'request:denied': {
    requestId: string;
    reason: string;
    suggestions: string[];
  };
  
  /** Error occurred */
  'error:occurred': {
    requestId: string;
    error: MiddlewareError;
    recoverable: boolean;
  };
  
  /** Metrics updated */
  'metrics:updated': {
    metrics: MiddlewareMetrics;
  };
}

/**
 * Framework-specific types
 */

// Express middleware function type
export type ExpressMiddleware = (req: PolicyEvaluatedRequest, res: Response, next: NextFunction) => Promise<void>;

// NestJS guard context type
export interface NestJSExecutionContext {
  switchToHttp(): {
    getRequest(): PolicyEvaluatedRequest;
    getResponse(): Response;
  };
}

// Fastify middleware type
export interface FastifyMiddleware {
  (request: any, reply: any, done: any): Promise<void>;
}

/**
 * Australian compliance specific types
 */
export interface AustralianComplianceContext {
  /** Privacy Act 1988 requirements */
  privacyAct: {
    /** Applicable Australian Privacy Principles */
    applicableAPPs: number[];
    
    /** Cross-border transfer restrictions */
    crossBorderRestrictions: boolean;
    
    /** Notifiable data breach considerations */
    notifiableDataBreach: boolean;
  };
  
  /** Indigenous data considerations */
  indigenous: {
    /** CARE principles applicable */
    careApplicable: boolean;
    
    /** Traditional owner consent required */
    traditionalOwnerConsent: boolean;
    
    /** Cultural protocols to follow */
    culturalProtocols: string[];
  };
  
  /** Financial regulations */
  financial: {
    /** AUSTRAC reporting required */
    austracReporting: boolean;
    
    /** ASIC compliance required */
    asicCompliance: boolean;
    
    /** ATO reporting implications */
    atoReporting: boolean;
  };
  
  /** Data residency requirements */
  dataResidency: {
    /** Must remain in Australia */
    australiaOnly: boolean;
    
    /** Allowed regions */
    allowedRegions: string[];
    
    /** Exceptions granted */
    exceptions: string[];
  };
}