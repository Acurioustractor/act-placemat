/**
 * OPA Integration Service Types
 * 
 * Type definitions for Open Policy Agent integration including
 * decision evaluation, logging, and audit capabilities
 */

import { RegoPolicy } from '../policy/types';

/**
 * Financial intent that needs policy evaluation
 */
export interface FinancialIntent {
  /** Unique identifier for this intent */
  id: string;
  
  /** Type of financial operation being requested */
  operation: FinancialOperation;
  
  /** User making the request */
  user: UserContext;
  
  /** Financial data involved in the operation */
  financial: FinancialContext;
  
  /** Request metadata */
  request: RequestContext;
  
  /** Temporal constraints */
  temporal?: TemporalContext;
  
  /** Australian regulatory context */
  compliance: ComplianceContext;
}

/**
 * Types of financial operations
 */
export enum FinancialOperation {
  // Read operations
  VIEW_BALANCE = 'view_balance',
  GENERATE_REPORT = 'generate_report',
  EXPORT_DATA = 'export_data',
  
  // Transaction operations
  CREATE_PAYMENT = 'create_payment',
  APPROVE_PAYMENT = 'approve_payment',
  CANCEL_PAYMENT = 'cancel_payment',
  
  // Budget operations
  CREATE_BUDGET = 'create_budget',
  MODIFY_BUDGET = 'modify_budget',
  ALLOCATE_FUNDS = 'allocate_funds',
  
  // Governance operations
  DISTRIBUTE_BENEFITS = 'distribute_benefits',
  RECORD_ATTESTATION = 'record_attestation',
  MODIFY_CONSENT = 'modify_consent',
  
  // Administrative operations
  CONFIGURE_POLICIES = 'configure_policies',
  ACCESS_AUDIT_LOGS = 'access_audit_logs',
  SYSTEM_ADMINISTRATION = 'system_administration'
}

/**
 * User context for policy evaluation
 */
export interface UserContext {
  /** User identifier */
  id: string;
  
  /** User roles and permissions */
  roles: string[];
  
  /** Consent levels granted */
  consentLevels: string[];
  
  /** Authentication status */
  authentication: {
    verified: boolean;
    mfaCompleted: boolean;
    sessionAge: number; // hours
    lastPasswordChange: number; // days ago
  };
  
  /** User location */
  location: {
    country: string;
    region?: string;
    verified: boolean;
  };
  
  /** Network context */
  network: {
    type: 'corporate' | 'vpn' | 'public' | 'government';
    securityVerified: boolean;
    ipAddress: string;
  };
  
  /** User attributes */
  attributes?: Record<string, any>;
}

/**
 * Financial operation context
 */
export interface FinancialContext {
  /** Amount involved (in cents for precision) */
  amount?: number;
  
  /** Currency code */
  currency: string;
  
  /** Account or budget being accessed */
  account?: string;
  
  /** Transaction categories */
  categories: string[];
  
  /** Benefit allocation details */
  allocation?: BenefitAllocation;
  
  /** Data sensitivity classification */
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted' | 'secret';
  
  /** Whether personal data is involved */
  containsPersonalData: boolean;
  
  /** Whether Indigenous data is involved */
  indigenousData?: IndigenousDataContext;
}

/**
 * Benefit allocation details for community operations
 */
export interface BenefitAllocation {
  /** Allocation percentages by category */
  allocations: Array<{
    category: string;
    percentage: number;
    amount: number;
  }>;
  
  /** Community approval details */
  communityApproval: {
    meetingHeld: boolean;
    quorumAchieved: boolean;
    approvalPercentage: number;
  };
  
  /** Stakeholder consent */
  stakeholderConsent: boolean;
}

/**
 * Indigenous data context
 */
export interface IndigenousDataContext {
  /** Traditional owners involved */
  traditionalOwners: string[];
  
  /** CARE principles compliance */
  careCompliance: {
    collectiveBenefit: boolean;
    authorityToControl: boolean;
    responsibility: boolean;
    ethics: boolean;
  };
  
  /** Cultural protocols */
  culturalProtocols: {
    consultationCompleted: boolean;
    elderApproval: boolean;
    culturalImpactAssessed: boolean;
  };
  
  /** Contains sacred or sensitive knowledge */
  containsSacredKnowledge: boolean;
}

/**
 * Request context and metadata
 */
export interface RequestContext {
  /** Request timestamp */
  timestamp: Date;
  
  /** Request ID for tracing */
  requestId: string;
  
  /** Session ID */
  sessionId: string;
  
  /** User agent / client information */
  userAgent?: string;
  
  /** API endpoint being accessed */
  endpoint: string;
  
  /** HTTP method */
  method: string;
  
  /** Request headers (sanitized) */
  headers?: Record<string, string>;
  
  /** Reason or justification for the request */
  justification?: string;
}

/**
 * Temporal context for time-based policies
 */
export interface TemporalContext {
  /** Business hours constraints */
  businessHours?: {
    timezone: string;
    startHour: number;
    endHour: number;
    workdays: number[]; // 0=Sunday, 1=Monday, etc.
  };
  
  /** Emergency context */
  emergency?: {
    declared: boolean;
    type: 'natural_disaster' | 'health_crisis' | 'security_incident' | 'system_failure';
    duration: number; // hours
    justification: string;
  };
  
  /** Special periods (ceremonies, cultural events) */
  culturalConsiderations?: {
    ceremonialSeason: boolean;
    culturalEvent?: string;
    restrictions?: string[];
  };
}

/**
 * Australian compliance context
 */
export interface ComplianceContext {
  /** Privacy Act 1988 context */
  privacyAct: {
    personalDataInvolved: boolean;
    consentObtained: boolean;
    purposeLimitation: string[];
    crossBorderTransfer: boolean;
    destinationCountry?: string;
  };
  
  /** ACNC requirements */
  acnc?: {
    charitablePurpose: boolean;
    governanceStandards: boolean;
    reportingThreshold: 'small' | 'medium' | 'large';
  };
  
  /** AUSTRAC requirements */
  austrac?: {
    reportingRequired: boolean;
    transactionType: 'cash' | 'electronic' | 'international';
    suspiciousActivity: boolean;
  };
  
  /** Data residency */
  dataResidency: {
    country: string;
    region: string;
    governmentApproved: boolean;
  };
  
  /** Indigenous protocols */
  indigenousProtocols?: {
    required: boolean;
    protocolsFollowed: boolean;
    traditionalOwnerConsent: boolean;
  };
}

/**
 * OPA evaluation request
 */
export interface OPAEvaluationRequest {
  /** Financial intent to evaluate */
  intent: FinancialIntent;
  
  /** Policies to evaluate against */
  policies: string[]; // Policy IDs or modules
  
  /** Evaluation options */
  options?: OPAEvaluationOptions;
}

/**
 * OPA evaluation options
 */
export interface OPAEvaluationOptions {
  /** Whether to explain the decision */
  explain?: boolean;
  
  /** Whether to include policy traces */
  trace?: boolean;
  
  /** Maximum evaluation time in milliseconds */
  timeout?: number;
  
  /** Whether to use cached results */
  useCache?: boolean;
  
  /** Cache TTL in seconds */
  cacheTTL?: number;
}

/**
 * Policy decision result from OPA
 */
export interface PolicyDecision {
  /** Decision outcome */
  decision: 'allow' | 'deny' | 'conditional';
  
  /** Policies that were evaluated */
  evaluatedPolicies: string[];
  
  /** Decision details for each policy */
  policyResults: PolicyResult[];
  
  /** Overall decision reason */
  reason: string;
  
  /** Conditional requirements (if conditional decision) */
  conditions?: DecisionCondition[];
  
  /** Performance metrics */
  performance: {
    evaluationTime: number; // milliseconds
    cacheHit: boolean;
    policiesEvaluated: number;
  };
  
  /** OPA-specific metadata */
  opa: {
    decisionId: string;
    query: string;
    result: any;
    explanation?: any;
    trace?: any;
  };
}

/**
 * Individual policy evaluation result
 */
export interface PolicyResult {
  /** Policy identifier */
  policyId: string;
  
  /** Policy module name */
  module: string;
  
  /** Policy version */
  version: string;
  
  /** Decision for this policy */
  decision: 'allow' | 'deny' | 'conditional' | 'not_applicable';
  
  /** Policy evaluation details */
  details: {
    rules: string[];
    bindings?: Record<string, any>;
    violations?: string[];
  };
  
  /** Execution time for this policy */
  executionTime: number;
}

/**
 * Conditional decision requirements
 */
export interface DecisionCondition {
  /** Condition type */
  type: 'approval_required' | 'step_up_auth' | 'additional_verification' | 'time_limited' | 'monitoring_required';
  
  /** Human-readable description */
  description: string;
  
  /** Specific requirements */
  requirements: Record<string, any>;
  
  /** Expiry for this condition */
  expiresAt?: Date;
}

/**
 * Decision logging entry
 */
export interface DecisionLog {
  /** Unique log entry ID */
  id: string;
  
  /** Timestamp of the decision */
  timestamp: Date;
  
  /** Financial intent that was evaluated */
  intent: FinancialIntent;
  
  /** Resulting decision */
  decision: PolicyDecision;
  
  /** Outcome of the decision (was it actually executed?) */
  outcome?: {
    executed: boolean;
    executionTime?: Date;
    result?: 'success' | 'failure' | 'partial';
    error?: string;
  };
  
  /** Audit metadata */
  audit: {
    /** Session and request tracing */
    traceId: string;
    sessionId: string;
    
    /** User attribution */
    userId: string;
    userRoles: string[];
    
    /** System context */
    service: string;
    version: string;
    
    /** Compliance markers */
    complianceFlags: string[];
    sovereigntyContext: string[];
    
    /** Data classification */
    dataClassification: string;
    
    /** Retention period for this log */
    retentionYears: number;
  };
  
  /** Australian regulatory context */
  compliance: {
    privacyActApplicable: boolean;
    acncReporting: boolean;
    austracReporting: boolean;
    indigenousDataInvolved: boolean;
  };
}

/**
 * Audit query for retrieving decision logs
 */
export interface AuditQuery {
  /** Time range for the query */
  timeRange: {
    start: Date;
    end: Date;
  };
  
  /** Filter criteria */
  filters?: {
    userId?: string;
    operation?: FinancialOperation;
    decision?: 'allow' | 'deny' | 'conditional';
    policies?: string[];
    complianceFlags?: string[];
    dataClassification?: string[];
  };
  
  /** Pagination */
  pagination?: {
    offset: number;
    limit: number;
  };
  
  /** Sorting */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

/**
 * Audit query result
 */
export interface AuditQueryResult {
  /** Decision logs matching the query */
  logs: DecisionLog[];
  
  /** Total count of matching logs */
  totalCount: number;
  
  /** Pagination info */
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  
  /** Query performance */
  performance: {
    queryTime: number;
    resultsFromCache: boolean;
  };
}

/**
 * OPA service configuration
 */
export interface OPAServiceConfig {
  /** OPA server configuration */
  server: {
    url: string;
    timeout: number;
    retries: number;
    retryDelay: number;
  };
  
  /** Decision logging configuration */
  logging: {
    enabled: boolean;
    destination: 'postgresql' | 'file' | 'elasticsearch';
    config: Record<string, any>;
    retention: {
      defaultYears: number;
      complianceYears: number;
      indigenousDataYears: number;
    };
  };
  
  /** Caching configuration */
  cache: {
    enabled: boolean;
    type: 'memory' | 'redis';
    config: Record<string, any>;
    defaultTTL: number;
    maxSize: number;
  };
  
  /** Performance monitoring */
  monitoring: {
    enabled: boolean;
    metricsProvider: 'prometheus' | 'datadog' | 'custom';
    alertThresholds: {
      latencyMs: number;
      errorRate: number;
      cacheHitRate: number;
    };
  };
  
  /** Security configuration */
  security: {
    enableInputValidation: boolean;
    sanitizeInputs: boolean;
    enableAuditLogging: boolean;
    encryptSensitiveData: boolean;
  };
  
  /** Australian compliance settings */
  compliance: {
    enforceDataResidency: boolean;
    enablePrivacyActCompliance: boolean;
    enableIndigenousProtocols: boolean;
    austracReportingEnabled: boolean;
    auditRetentionYears: number;
  };
}

/**
 * OPA service statistics
 */
export interface OPAServiceStats {
  /** Request statistics */
  requests: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
  
  /** Performance metrics */
  performance: {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    cacheHitRate: number;
  };
  
  /** Decision statistics */
  decisions: {
    allowed: number;
    denied: number;
    conditional: number;
  };
  
  /** Policy statistics */
  policies: {
    totalEvaluations: number;
    averagePoliciesPerRequest: number;
    policyHitCounts: Record<string, number>;
  };
  
  /** Australian compliance metrics */
  compliance: {
    privacyActDecisions: number;
    indigenousDataDecisions: number;
    austracReports: number;
    sovereigntyViolations: number;
  };
  
  /** Time window for these statistics */
  timeWindow: {
    start: Date;
    end: Date;
  };
}

/**
 * OPA health check result
 */
export interface OPAHealthCheck {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /** Individual component health */
  components: {
    opaServer: 'healthy' | 'unhealthy';
    database: 'healthy' | 'unhealthy';
    cache: 'healthy' | 'unhealthy';
    policies: 'healthy' | 'unhealthy';
  };
  
  /** Health check timestamp */
  timestamp: Date;
  
  /** Additional health details */
  details: Record<string, any>;
}