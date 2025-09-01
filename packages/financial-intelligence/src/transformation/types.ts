/**
 * Data Transformation and Redaction Types
 * 
 * Type definitions for configurable data transformation, redaction,
 * and reversible masking with Australian compliance support
 */

import { ConsentLevel, SovereigntyLevel } from '../types/governance';

/**
 * Transformation operation types
 */
export enum TransformationType {
  /** Complete removal of field */
  REDACT = 'redact',
  
  /** Partial masking with visible characters */
  MASK = 'mask',
  
  /** Cryptographic hashing (irreversible) */
  HASH = 'hash',
  
  /** Reversible encryption */
  ENCRYPT = 'encrypt',
  
  /** Field removal */
  REMOVE = 'remove',
  
  /** Value replacement */
  REPLACE = 'replace',
  
  /** Tokenization with lookup */
  TOKENIZE = 'tokenize',
  
  /** Format-preserving encryption */
  FORMAT_PRESERVING_ENCRYPT = 'format_preserving_encrypt',
  
  /** Pseudonymization */
  PSEUDONYMIZE = 'pseudonymize',
  
  /** Aggregation/generalization */
  GENERALIZE = 'generalize'
}

/**
 * Transformation context
 */
export interface TransformationContext {
  /** User requesting the transformation */
  userId: string;
  
  /** User's organization */
  organisationId?: string;
  
  /** User's roles */
  roles: string[];
  
  /** User's consent level */
  consentLevel: ConsentLevel;
  
  /** Data sovereignty level */
  sovereigntyLevel: SovereigntyLevel;
  
  /** Purpose of data access */
  purpose: string;
  
  /** Compliance frameworks applicable */
  complianceFrameworks: string[];
  
  /** Geographic location of request */
  location?: {
    country: string;
    region: string;
  };
  
  /** Temporal constraints */
  temporal?: {
    accessTime: Date;
    expiryTime?: Date;
    businessHours: boolean;
  };
}

/**
 * Transformation rule definition
 */
export interface TransformationRule {
  /** Unique rule identifier */
  id: string;
  
  /** Human-readable rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Rule priority (higher = processed first) */
  priority: number;
  
  /** Whether rule is enabled */
  enabled: boolean;
  
  /** Field selector patterns */
  fieldPatterns: FieldPattern[];
  
  /** Conditions for applying rule */
  conditions: TransformationCondition[];
  
  /** Transformation to apply */
  transformation: TransformationSpec;
  
  /** Compliance justification */
  compliance: {
    frameworks: string[];
    reason: string;
    legalBasis?: string;
  };
  
  /** Rule metadata */
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedBy?: string;
    updatedAt?: Date;
    version: string;
    tags: string[];
  };
}

/**
 * Field pattern for matching fields to transform
 */
export interface FieldPattern {
  /** Field path pattern (supports wildcards) */
  path: string;
  
  /** Field type constraints */
  type?: string[];
  
  /** Value pattern matching */
  valuePattern?: string;
  
  /** Exclude patterns */
  exclude?: string[];
  
  /** Case sensitivity */
  caseSensitive: boolean;
}

/**
 * Condition for applying transformation
 */
export interface TransformationCondition {
  /** Condition type */
  type: ConditionType;
  
  /** Field or context to evaluate */
  field: string;
  
  /** Comparison operator */
  operator: ConditionOperator;
  
  /** Expected value(s) */
  value: any;
  
  /** Logical connector with next condition */
  connector?: 'AND' | 'OR';
}

/**
 * Condition types
 */
export enum ConditionType {
  FIELD_VALUE = 'field_value',
  FIELD_TYPE = 'field_type',
  FIELD_EXISTS = 'field_exists',
  USER_ROLE = 'user_role',
  CONSENT_LEVEL = 'consent_level',
  SOVEREIGNTY_LEVEL = 'sovereignty_level',
  PURPOSE = 'purpose',
  COMPLIANCE_FRAMEWORK = 'compliance_framework',
  TIME_CONSTRAINT = 'time_constraint',
  LOCATION = 'location',
  DATA_CLASSIFICATION = 'data_classification'
}

/**
 * Condition operators
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  MATCHES = 'matches',
  NOT_MATCHES = 'not_matches',
  IN = 'in',
  NOT_IN = 'not_in',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

/**
 * Transformation specification
 */
export interface TransformationSpec {
  /** Type of transformation */
  type: TransformationType;
  
  /** Transformation parameters */
  parameters: TransformationParameters;
  
  /** Whether transformation is reversible */
  reversible: boolean;
  
  /** Deterministic (same input = same output) */
  deterministic: boolean;
  
  /** Preserve format/structure */
  preserveFormat: boolean;
  
  /** Custom transformation function */
  customFunction?: string;
}

/**
 * Transformation parameters
 */
export interface TransformationParameters {
  /** Masking character for MASK type */
  maskChar?: string;
  
  /** Visible character count for MASK type */
  visibleChars?: number;
  
  /** Replacement value for REPLACE type */
  replaceWith?: string;
  
  /** Encryption algorithm for ENCRYPT type */
  algorithm?: string;
  
  /** Key identifier for encryption */
  keyId?: string;
  
  /** Hash algorithm for HASH type */
  hashAlgorithm?: string;
  
  /** Salt for hashing */
  salt?: string;
  
  /** Tokenization strategy */
  tokenStrategy?: 'random' | 'sequential' | 'format_preserving';
  
  /** Generalization level */
  generalizationLevel?: number;
  
  /** Custom parameters */
  custom?: Record<string, any>;
}

/**
 * Transformation result
 */
export interface TransformationResult {
  /** Transformation operation ID */
  operationId: string;
  
  /** Original data hash */
  originalHash: string;
  
  /** Transformed data */
  transformedData: any;
  
  /** Applied transformations */
  appliedTransformations: AppliedTransformation[];
  
  /** Transformation summary */
  summary: {
    fieldsTransformed: number;
    rulesApplied: number;
    reversibleTransformations: number;
    irreversibleTransformations: number;
  };
  
  /** Performance metrics */
  performance: {
    startTime: Date;
    endTime: Date;
    duration: number;
    memoryUsage?: number;
  };
  
  /** Audit information */
  audit: {
    requestId: string;
    userId: string;
    purpose: string;
    complianceFrameworks: string[];
    retentionPeriod: number;
  };
}

/**
 * Applied transformation record
 */
export interface AppliedTransformation {
  /** Transformation ID */
  id: string;
  
  /** Field path that was transformed */
  fieldPath: string;
  
  /** Original value hash */
  originalValueHash: string;
  
  /** Applied rule */
  ruleId: string;
  
  /** Transformation type applied */
  type: TransformationType;
  
  /** Parameters used */
  parameters: TransformationParameters;
  
  /** Whether transformation is reversible */
  reversible: boolean;
  
  /** Reversal information if applicable */
  reversalInfo?: ReversalInfo;
  
  /** Transformation timestamp */
  timestamp: Date;
  
  /** Compliance justification */
  complianceReason: string;
}

/**
 * Information needed to reverse a transformation
 */
export interface ReversalInfo {
  /** Encryption key ID */
  keyId?: string;
  
  /** Tokenization map reference */
  tokenMapId?: string;
  
  /** Algorithm used */
  algorithm: string;
  
  /** Additional reversal parameters */
  parameters: Record<string, any>;
  
  /** Expiry time for reversal capability */
  expiryTime?: Date;
  
  /** Required authorization level for reversal */
  authorizationLevel: string;
}

/**
 * Transformation engine configuration
 */
export interface TransformationConfig {
  /** Default transformation settings */
  defaults: {
    maskChar: string;
    visibleChars: number;
    hashAlgorithm: string;
    encryptionAlgorithm: string;
  };
  
  /** Performance settings */
  performance: {
    maxConcurrentTransformations: number;
    timeoutMs: number;
    memoryLimitMB: number;
    enableCaching: boolean;
    cacheSize: number;
  };
  
  /** Security settings */
  security: {
    keyManagement: KeyManagementConfig;
    auditLogging: boolean;
    integrityChecking: boolean;
    secureErase: boolean;
  };
  
  /** Australian compliance settings */
  compliance: {
    privacyAct: {
      enabled: boolean;
      dataBreachNotification: boolean;
      crossBorderRestrictions: boolean;
    };
    indigenous: {
      careCompliance: boolean;
      extendedRetention: boolean;
      culturalSensitivity: boolean;
    };
    financial: {
      austracCompliance: boolean;
      acncReporting: boolean;
      dataResidency: boolean;
    };
  };
}

/**
 * Key management configuration
 */
export interface KeyManagementConfig {
  /** Key storage backend */
  backend: 'aws_kms' | 'azure_key_vault' | 'local' | 'hsm';
  
  /** Key rotation policy */
  rotation: {
    enabled: boolean;
    frequencyDays: number;
    retainOldKeys: boolean;
  };
  
  /** Access control */
  access: {
    requiredRole: string;
    mfaRequired: boolean;
    auditAccess: boolean;
  };
}

/**
 * Transformation statistics
 */
export interface TransformationStats {
  /** Total transformations performed */
  totalTransformations: number;
  
  /** Transformations by type */
  byType: Record<TransformationType, number>;
  
  /** Average transformation time */
  averageTime: number;
  
  /** Success rate */
  successRate: number;
  
  /** Reversals performed */
  reversalsPerformed: number;
  
  /** Compliance violations detected */
  complianceViolations: number;
  
  /** Performance percentiles */
  performancePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

/**
 * Batch transformation request
 */
export interface BatchTransformationRequest {
  /** Request ID */
  requestId: string;
  
  /** Data items to transform */
  items: Array<{
    id: string;
    data: any;
    context?: Partial<TransformationContext>;
  }>;
  
  /** Transformation context */
  context: TransformationContext;
  
  /** Rules to apply (if not using default rule set) */
  rules?: string[];
  
  /** Batch processing options */
  options: {
    parallel: boolean;
    maxConcurrency: number;
    continueOnError: boolean;
    timeout: number;
  };
}

/**
 * Batch transformation result
 */
export interface BatchTransformationResult {
  /** Request ID */
  requestId: string;
  
  /** Overall status */
  status: 'success' | 'partial' | 'failure';
  
  /** Individual results */
  results: Array<{
    id: string;
    status: 'success' | 'error';
    result?: TransformationResult;
    error?: string;
  }>;
  
  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTime: number;
  };
}

/**
 * Reversal request
 */
export interface ReversalRequest {
  /** Original transformation operation ID */
  operationId: string;
  
  /** Specific transformations to reverse */
  transformationIds?: string[];
  
  /** Authorization context */
  authorization: {
    userId: string;
    purpose: string;
    approvalId?: string;
  };
  
  /** Reversal options */
  options: {
    verifyIntegrity: boolean;
    auditReversal: boolean;
    secureErase: boolean;
  };
}

/**
 * Reversal result
 */
export interface ReversalResult {
  /** Reversal operation ID */
  operationId: string;
  
  /** Status of reversal */
  status: 'success' | 'partial' | 'failure';
  
  /** Reversed data */
  reversedData?: any;
  
  /** Reversal details */
  details: Array<{
    transformationId: string;
    status: 'success' | 'error';
    error?: string;
  }>;
  
  /** Audit information */
  audit: {
    reversalTime: Date;
    authorizedBy: string;
    purpose: string;
    integrityVerified: boolean;
  };
}

/**
 * Events emitted by transformation engine
 */
export interface TransformationEvents {
  /** Transformation started */
  'transformation:started': {
    operationId: string;
    context: TransformationContext;
    itemCount: number;
  };
  
  /** Transformation completed */
  'transformation:completed': {
    operationId: string;
    result: TransformationResult;
  };
  
  /** Transformation failed */
  'transformation:failed': {
    operationId: string;
    error: Error;
    context: TransformationContext;
  };
  
  /** Rule applied */
  'rule:applied': {
    ruleId: string;
    fieldPath: string;
    transformation: TransformationType;
  };
  
  /** Compliance violation detected */
  'compliance:violation': {
    violation: string;
    fieldPath: string;
    context: TransformationContext;
  };
  
  /** Reversal performed */
  'reversal:performed': {
    operationId: string;
    reversalResult: ReversalResult;
  };
  
  /** Statistics updated */
  'stats:updated': {
    stats: TransformationStats;
  };
}

/**
 * Australian-specific transformation patterns
 */
export const AustralianPatterns = {
  /** Tax File Number pattern */
  TFN: /^\d{3}\s?\d{3}\s?\d{3}$/,
  
  /** Australian Business Number pattern */
  ABN: /^\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/,
  
  /** Medicare number pattern */
  MEDICARE: /^\d{4}\s?\d{5}\s?\d{1}$/,
  
  /** Australian phone number pattern */
  PHONE: /^(\+61|0)[2-478]\d{8}$/,
  
  /** Australian postcode pattern */
  POSTCODE: /^\d{4}$/,
  
  /** BSB pattern */
  BSB: /^\d{3}-?\d{3}$/,
  
  /** Account number pattern */
  ACCOUNT_NUMBER: /^\d{6,10}$/
} as const;

/**
 * Australian compliance transformation rules
 */
export const AustralianComplianceRules = {
  /** Privacy Act 1988 requirements */
  PRIVACY_ACT: {
    personalData: TransformationType.ENCRYPT,
    sensitiveData: TransformationType.REDACT,
    identifiers: TransformationType.TOKENIZE
  },
  
  /** Indigenous data requirements */
  INDIGENOUS_DATA: {
    culturalInformation: TransformationType.REDACT,
    sacredKnowledge: TransformationType.REMOVE,
    traditionalOwnerData: TransformationType.ENCRYPT
  },
  
  /** Financial compliance requirements */
  FINANCIAL: {
    tfn: TransformationType.ENCRYPT,
    abn: TransformationType.MASK,
    accountNumbers: TransformationType.TOKENIZE,
    amounts: TransformationType.GENERALIZE
  }
} as const;