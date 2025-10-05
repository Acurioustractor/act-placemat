/**
 * Redaction and Transformation Types
 * 
 * Type definitions for data redaction, transformation, and audit trail
 * with Australian compliance and Indigenous data sovereignty support
 */

export enum DataSensitivityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  SACRED = 'sacred', // Indigenous cultural data
  CLASSIFIED = 'classified'
}

export enum RedactionType {
  MASK = 'mask',
  HASH = 'hash',
  ENCRYPT = 'encrypt',
  REMOVE = 'remove',
  REPLACE = 'replace',
  TOKENIZE = 'tokenize',
  BLUR = 'blur', // For numerical approximations
  CULTURAL_PROTECT = 'cultural_protect' // Special Indigenous data protection
}

export enum TransformationType {
  REVERSIBLE_ENCRYPT = 'reversible_encrypt',
  FORMAT_PRESERVE_ENCRYPT = 'format_preserve_encrypt',
  DETERMINISTIC_HASH = 'deterministic_hash',
  ANONYMIZE = 'anonymize',
  PSEUDONYMIZE = 'pseudonymize',
  AGGREGATE = 'aggregate',
  STATISTICAL_NOISE = 'statistical_noise',
  CULTURAL_ABSTRACTION = 'cultural_abstraction'
}

export interface RedactionRule {
  id: string;
  name: string;
  description: string;
  fieldPattern: string | RegExp;
  dataType: string[];
  sensitivityLevels: DataSensitivityLevel[];
  redactionType: RedactionType;
  parameters: Record<string, any>;
  reversible: boolean;
  culturalSensitive: boolean;
  complianceFrameworks: string[];
  retentionPeriod: number; // milliseconds
  auditRequired: boolean;
  createdAt: Date;
  lastModified: Date;
  version: string;
}

export interface TransformationRule {
  id: string;
  name: string;
  description: string;
  fieldPattern: string | RegExp;
  dataType: string[];
  transformationType: TransformationType;
  parameters: Record<string, any>;
  reversible: boolean;
  keyRotationPeriod?: number; // days
  culturalProtections: CulturalProtection[];
  complianceValidation: ComplianceValidation[];
  performanceHint: PerformanceHint;
  createdAt: Date;
  lastModified: Date;
  version: string;
}

export interface CulturalProtection {
  territory: string;
  protectionLevel: 'basic' | 'sacred' | 'ceremonial';
  elderApprovalRequired: boolean;
  accessRestrictions: string[];
  seasonalRestrictions?: string[];
  witnessRequirements?: string[];
}

export interface ComplianceValidation {
  framework: string; // 'privacy_act_1988', 'austrac', 'care_principles'
  requirements: string[];
  validationRules: string[];
  auditFrequency: number; // days
}

export interface PerformanceHint {
  cacheableDuration: number; // seconds
  computeIntensity: 'low' | 'medium' | 'high';
  memoryRequirement: number; // bytes
  batchingRecommended: boolean;
  parallelizable: boolean;
}

export interface RedactionContext {
  userId: string;
  sessionId: string;
  requestId: string;
  purpose: string[];
  consentLevel: string;
  sovereigntyLevel: string;
  culturalContext?: {
    traditionalTerritory?: string;
    communityAffiliation?: string;
    elderApproval?: boolean;
  };
  complianceContext: {
    frameworks: string[];
    auditRequired: boolean;
    retentionPeriod: number;
  };
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface RedactionResult {
  success: boolean;
  originalValue?: any;
  redactedValue: any;
  redactionType: RedactionType;
  ruleId: string;
  reversible: boolean;
  transformationId?: string; // For audit trail
  metadata: {
    dataType: string;
    sensitivityLevel: DataSensitivityLevel;
    complianceFrameworks: string[];
    culturalSensitive: boolean;
    processingTime: number; // milliseconds
  };
  auditTrail: AuditEntry;
  errors?: string[];
  warnings?: string[];
}

export interface TransformationResult {
  success: boolean;
  originalValue?: any;
  transformedValue: any;
  transformationType: TransformationType;
  ruleId: string;
  reversible: boolean;
  reverseKey?: string; // Encrypted key for reversal
  transformationId: string;
  metadata: {
    dataType: string;
    keyVersion?: string;
    culturalProtections: CulturalProtection[];
    complianceValidated: boolean;
    processingTime: number;
  };
  auditTrail: AuditEntry;
  errors?: string[];
  warnings?: string[];
}

export interface AuditEntry {
  id: string;
  operation: 'redaction' | 'transformation' | 'reversal';
  ruleId: string;
  dataIdentifier: string; // Hash of original data
  userId: string;
  sessionId: string;
  requestId: string;
  timestamp: Date;
  success: boolean;
  culturalSensitive: boolean;
  complianceFrameworks: string[];
  retentionPeriod: number;
  ipAddress?: string;
  userAgent?: string;
  errorDetails?: string;
  reversalPossible: boolean;
  reversalRequested?: Date;
  reversalBy?: string;
}

export interface ReversalRequest {
  transformationId: string;
  userId: string;
  justification: string;
  culturalApproval?: {
    elderId: string;
    approvalDate: Date;
    ceremonyRequired: boolean;
  };
  complianceApproval?: {
    framework: string;
    approvalId: string;
    validUntil: Date;
  };
  auditContext: {
    requestId: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface ReversalResult {
  success: boolean;
  originalValue?: any;
  transformationId: string;
  reversalId: string;
  requestedBy: string;
  approvals: Array<{
    type: 'user' | 'cultural' | 'compliance';
    approvedBy: string;
    approvedAt: Date;
    conditions?: string[];
  }>;
  auditTrail: AuditEntry;
  errors?: string[];
  warnings?: string[];
}

export interface DataTypeClassifier {
  classify(value: any): {
    dataType: string;
    sensitivityLevel: DataSensitivityLevel;
    culturalSensitive: boolean;
    patterns: string[];
    confidence: number;
  };
}

export interface RedactionEngine {
  redact(value: any, rules: RedactionRule[], context: RedactionContext): Promise<RedactionResult>;
  transform(value: any, rules: TransformationRule[], context: RedactionContext): Promise<TransformationResult>;
  reverse(transformationId: string, request: ReversalRequest): Promise<ReversalResult>;
  validateRules(rules: (RedactionRule | TransformationRule)[]): ValidationResult[];
  getAuditTrail(criteria: AuditCriteria): Promise<AuditEntry[]>;
}

export interface ValidationResult {
  valid: boolean;
  ruleId: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface AuditCriteria {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ruleId?: string;
  culturalSensitive?: boolean;
  complianceFramework?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  operation?: 'redaction' | 'transformation' | 'reversal';
  dataTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface BatchRedactionRequest {
  items: Array<{
    id: string;
    value: any;
    fieldPath: string;
    dataType?: string;
    customRules?: string[]; // Rule IDs to apply
  }>;
  context: RedactionContext;
  options?: {
    parallel: boolean;
    batchSize: number;
    failFast: boolean;
  };
}

export interface BatchRedactionResult {
  success: boolean;
  results: Array<{
    id: string;
    result: RedactionResult | TransformationResult;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    culturalDataProcessed: number;
    processingTime: number;
  };
  auditSummary: {
    entriesCreated: number;
    complianceFrameworks: string[];
    retentionPeriods: number[];
  };
  errors: string[];
  warnings: string[];
}

export interface CulturalDataHandler {
  requiresElderApproval(data: any, territory: string): boolean;
  validateCulturalProtocols(data: any, protections: CulturalProtection[]): ValidationResult;
  applyCAREPrinciples(operation: string, data: any, context: RedactionContext): Promise<boolean>;
  notifyCommunity(operation: string, dataType: string, territory: string): Promise<void>;
}

export interface ComplianceValidator {
  validatePrivacyAct(operation: string, data: any, context: RedactionContext): ValidationResult;
  validateAUSTRAC(operation: string, data: any, context: RedactionContext): ValidationResult;
  validateACNC(operation: string, data: any, context: RedactionContext): ValidationResult;
  generateComplianceReport(auditEntries: AuditEntry[]): ComplianceReport;
}

export interface ComplianceReport {
  framework: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOperations: number;
    compliantOperations: number;
    violations: number;
    culturalDataOperations: number;
  };
  violations: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    rule: string;
    description: string;
    auditEntryId: string;
    recommendation: string;
  }>;
  recommendations: string[];
  culturalCompliance?: {
    careComplianceScore: number;
    elderApprovalsRequired: number;
    elderApprovalsReceived: number;
    protocolViolations: number;
  };
}