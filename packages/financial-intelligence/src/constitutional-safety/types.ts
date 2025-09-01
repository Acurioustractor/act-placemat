/**
 * Constitutional Safety Types
 * 
 * Type definitions for constitutional compliance checks and safety prompts
 * for AI agents operating within Australian financial systems
 */

export interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  category: ConstitutionalCategory;
  source: ConstitutionalSource;
  enforcementLevel: EnforcementLevel;
  applicableJurisdictions: Jurisdiction[];
  relatedPrinciples: string[];
}

export enum ConstitutionalCategory {
  DEMOCRACY = 'democracy',
  RULE_OF_LAW = 'rule_of_law',
  SEPARATION_OF_POWERS = 'separation_of_powers',
  JUDICIAL_INDEPENDENCE = 'judicial_independence',
  RESPONSIBLE_GOVERNMENT = 'responsible_government',
  FEDERALISM = 'federalism',
  HUMAN_RIGHTS = 'human_rights',
  INDIGENOUS_RIGHTS = 'indigenous_rights',
  CONSTITUTIONAL_SUPREMACY = 'constitutional_supremacy'
}

export enum ConstitutionalSource {
  AUSTRALIAN_CONSTITUTION = 'australian_constitution',
  HIGH_COURT_PRECEDENT = 'high_court_precedent',
  FEDERAL_LEGISLATION = 'federal_legislation',
  STATE_CONSTITUTION = 'state_constitution',
  COMMON_LAW = 'common_law',
  INTERNATIONAL_TREATY = 'international_treaty',
  CONSTITUTIONAL_CONVENTION = 'constitutional_convention'
}

export enum EnforcementLevel {
  MANDATORY = 'mandatory',        // Must comply - system blocks action
  ADVISORY = 'advisory',          // Warning provided - action may proceed
  INFORMATIONAL = 'informational' // Information only - no action
}

export enum Jurisdiction {
  FEDERAL = 'federal',
  NSW = 'nsw',
  VIC = 'vic',
  QLD = 'qld',
  WA = 'wa',
  SA = 'sa',
  TAS = 'tas',
  NT = 'nt',
  ACT = 'act',
  INDIGENOUS_NATION = 'indigenous_nation'
}

export interface SafetyPrompt {
  id: string;
  principleId: string;
  trigger: SafetyTrigger;
  promptType: PromptType;
  severity: SafetySeverity;
  title: string;
  message: string;
  reasoning: string;
  suggestedActions: string[];
  escalationRequired: boolean;
  humanReviewRequired: boolean;
  blockingConditions: BlockingCondition[];
  exemptions?: SafetyExemption[];
}

export interface SafetyTrigger {
  eventType: AgentEventType;
  conditions: TriggerCondition[];
  dataThresholds?: DataThreshold[];
  financialThresholds?: FinancialThreshold[];
  temporalConstraints?: TemporalConstraint[];
  contextRequirements?: ContextRequirement[];
}

export enum AgentEventType {
  FINANCIAL_TRANSACTION = 'financial_transaction',
  DATA_ACCESS = 'data_access',
  POLICY_DECISION = 'policy_decision',
  USER_CONSENT = 'user_consent',
  SYSTEM_INTEGRATION = 'system_integration',
  AUDIT_LOG_ACCESS = 'audit_log_access',
  CONSTITUTIONAL_OVERRIDE = 'constitutional_override',
  EMERGENCY_ACTION = 'emergency_action',
  CROSS_BORDER_TRANSFER = 'cross_border_transfer',
  INDIGENOUS_DATA_ACCESS = 'indigenous_data_access'
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex' | 'in' | 'not_in';
  value: any;
  description: string;
}

export interface DataThreshold {
  metric: DataMetric;
  threshold: number;
  unit: string;
  timeWindow?: number; // milliseconds
}

export enum DataMetric {
  RECORD_COUNT = 'record_count',
  DATA_SIZE = 'data_size',
  PERSONAL_RECORDS = 'personal_records',
  CULTURAL_RECORDS = 'cultural_records',
  FINANCIAL_RECORDS = 'financial_records',
  SENSITIVE_FIELDS = 'sensitive_fields'
}

export interface FinancialThreshold {
  metric: FinancialMetric;
  amount: number;
  currency: string;
  timeWindow?: number; // milliseconds
}

export enum FinancialMetric {
  TRANSACTION_AMOUNT = 'transaction_amount',
  DAILY_TOTAL = 'daily_total',
  WEEKLY_TOTAL = 'weekly_total',
  MONTHLY_TOTAL = 'monthly_total',
  ACCOUNT_BALANCE = 'account_balance',
  CREDIT_LIMIT = 'credit_limit'
}

export interface TemporalConstraint {
  type: TemporalType;
  startTime?: string; // ISO time string
  endTime?: string;   // ISO time string
  daysOfWeek?: number[]; // 0-6, Sunday-Saturday
  timeZone: string;
  description: string;
}

export enum TemporalType {
  BUSINESS_HOURS = 'business_hours',
  AFTER_HOURS = 'after_hours',
  WEEKENDS = 'weekends',
  HOLIDAYS = 'holidays',
  EMERGENCY_HOURS = 'emergency_hours',
  MAINTENANCE_WINDOW = 'maintenance_window'
}

export interface ContextRequirement {
  type: ContextType;
  required: boolean;
  validValues?: string[];
  description: string;
}

export enum ContextType {
  USER_ROLE = 'user_role',
  APPROVAL_LEVEL = 'approval_level',
  PURPOSE_CODE = 'purpose_code',
  JURISDICTION = 'jurisdiction',
  CULTURAL_AUTHORITY = 'cultural_authority',
  EMERGENCY_DESIGNATION = 'emergency_designation'
}

export enum PromptType {
  BLOCKING = 'blocking',        // Prevents action until resolved
  WARNING = 'warning',          // Shows warning but allows action
  ADVISORY = 'advisory',        // Provides guidance
  CONFIRMATION = 'confirmation' // Requires explicit confirmation
}

export enum SafetySeverity {
  CRITICAL = 'critical',     // Constitutional violation
  HIGH = 'high',            // Serious compliance issue
  MEDIUM = 'medium',        // Moderate risk
  LOW = 'low',              // Minor concern
  INFO = 'info'             // Informational
}

export interface BlockingCondition {
  id: string;
  description: string;
  condition: TriggerCondition;
  resolution: BlockingResolution;
  automaticResolution?: boolean;
  timeoutMinutes?: number;
}

export interface BlockingResolution {
  type: ResolutionType;
  requiredRole?: string;
  requiredApprovals?: number;
  escalationPath?: string[];
  documentation?: DocumentationRequirement;
}

export enum ResolutionType {
  MANUAL_APPROVAL = 'manual_approval',
  POLICY_REVIEW = 'policy_review',
  LEGAL_REVIEW = 'legal_review',
  CONSTITUTIONAL_REVIEW = 'constitutional_review',
  EMERGENCY_OVERRIDE = 'emergency_override',
  SYSTEM_CONFIGURATION = 'system_configuration'
}

export interface DocumentationRequirement {
  template: string;
  requiredFields: string[];
  approvalRequired: boolean;
  retentionPeriod: number; // days
}

export interface SafetyExemption {
  id: string;
  description: string;
  conditions: TriggerCondition[];
  approvedBy: string;
  approvedAt: Date;
  expiresAt?: Date;
  reason: string;
  reviewRequired: boolean;
}

export interface SafetyCheck {
  id: string;
  agentId: string;
  eventType: AgentEventType;
  timestamp: Date;
  context: SafetyCheckContext;
  triggeredPrompts: TriggeredPrompt[];
  result: SafetyCheckResult;
  resolution?: SafetyResolution;
  auditTrail: SafetyAuditEntry[];
}

export interface SafetyCheckContext {
  userId: string;
  sessionId: string;
  requestId: string;
  userRoles: string[];
  jurisdiction: Jurisdiction;
  requestData: any;
  systemContext: {
    environment: string;
    version: string;
    configVersion: string;
  };
  culturalContext?: {
    traditionalTerritory?: string;
    elderApproval?: boolean;
    communityConsent?: boolean;
  };
}

export interface TriggeredPrompt {
  promptId: string;
  principleId: string;
  triggeredAt: Date;
  triggerDetails: {
    conditions: TriggerCondition[];
    thresholds: (DataThreshold | FinancialThreshold)[];
  };
  severity: SafetySeverity;
  userResponse?: PromptResponse;
}

export interface PromptResponse {
  responseType: ResponseType;
  timestamp: Date;
  userId: string;
  justification?: string;
  approvals?: ApprovalRecord[];
  exemptionClaimed?: string;
}

export enum ResponseType {
  ACKNOWLEDGE = 'acknowledge',
  APPROVE = 'approve',
  DENY = 'deny',
  ESCALATE = 'escalate',
  REQUEST_EXEMPTION = 'request_exemption',
  EMERGENCY_OVERRIDE = 'emergency_override'
}

export interface ApprovalRecord {
  approverUserId: string;
  approverRole: string;
  approvedAt: Date;
  notes?: string;
  conditions?: string[];
}

export enum SafetyCheckResult {
  ALLOWED = 'allowed',
  BLOCKED = 'blocked',
  CONDITIONAL = 'conditional',
  ESCALATED = 'escalated',
  PENDING = 'pending'
}

export interface SafetyResolution {
  resolutionType: ResolutionType;
  resolvedAt: Date;
  resolvedBy: string;
  resolution: string;
  conditions?: string[];
  followUpRequired: boolean;
  followUpDate?: Date;
}

export interface SafetyAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: any;
  systemGenerated: boolean;
}

export interface ConstitutionalConfig {
  enabled: boolean;
  strictMode: boolean; // In strict mode, all checks are mandatory
  defaultJurisdiction: Jurisdiction;
  emergencyOverrideEnabled: boolean;
  emergencyOverrideRoles: string[];
  auditRetentionDays: number;
  escalationTimeoutMinutes: number;
  principlesConfig: Record<string, PrincipleConfig>;
}

export interface PrincipleConfig {
  enabled: boolean;
  enforcementLevel: EnforcementLevel;
  customThresholds?: Record<string, number>;
  exemptRoles?: string[];
  requiresJustification: boolean;
}

export interface SafetyMetrics {
  totalChecks: number;
  allowedChecks: number;
  blockedChecks: number;
  escalatedChecks: number;
  averageResolutionTime: number; // minutes
  principleViolations: Record<string, number>;
  exemptionsUsed: number;
  emergencyOverrides: number;
  timeToResolution: {
    p50: number;
    p90: number;
    p99: number;
  };
}

// Core interfaces for the Constitutional Safety System
export interface ConstitutionalSafetyService {
  checkAction(context: SafetyCheckContext, eventType: AgentEventType, data: any): Promise<SafetyCheck>;
  getActivePrompts(checkId: string): Promise<TriggeredPrompt[]>;
  respondToPrompt(checkId: string, promptId: string, response: PromptResponse): Promise<SafetyCheck>;
  resolveCheck(checkId: string, resolution: SafetyResolution): Promise<SafetyCheck>;
  getMetrics(startDate: Date, endDate: Date): Promise<SafetyMetrics>;
  validatePrinciples(): Promise<{ valid: boolean; errors: string[] }>;
}

export interface ConstitutionalRepository {
  getPrinciples(): Promise<ConstitutionalPrinciple[]>;
  getPrompts(): Promise<SafetyPrompt[]>;
  getConfig(): Promise<ConstitutionalConfig>;
  storeSafetyCheck(check: SafetyCheck): Promise<string>;
  getSafetyCheck(id: string): Promise<SafetyCheck | null>;
  updateSafetyCheck(id: string, updates: Partial<SafetyCheck>): Promise<boolean>;
  queryChecks(criteria: SafetyCheckQuery): Promise<SafetyCheck[]>;
}

export interface SafetyCheckQuery {
  startDate?: Date;
  endDate?: Date;
  agentId?: string;
  userId?: string;
  eventTypes?: AgentEventType[];
  results?: SafetyCheckResult[];
  jurisdictions?: Jurisdiction[];
  principleIds?: string[];
  severity?: SafetySeverity[];
  limit?: number;
  offset?: number;
}

// Agent Integration Interface
export interface ConstitutionalAgent {
  agentId: string;
  agentType: string;
  capabilities: AgentCapability[];
  safetyProfile: AgentSafetyProfile;
  registerWithSafetyService(service: ConstitutionalSafetyService): Promise<void>;
  handleSafetyPrompt(prompt: TriggeredPrompt): Promise<PromptResponse>;
  requestEmergencyOverride(justification: string): Promise<boolean>;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  requiredApprovals: string[];
  constitutionalRestrictions: string[];
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AgentSafetyProfile {
  riskTolerance: RiskLevel;
  requiredPrinciples: string[];
  exemptPrinciples: string[];
  escalationRules: EscalationRule[];
  automatedResponses: AutomatedResponse[];
}

export interface EscalationRule {
  condition: TriggerCondition;
  escalateTo: string[];
  timeoutMinutes: number;
  autoResolve: boolean;
}

export interface AutomatedResponse {
  promptType: PromptType;
  responseType: ResponseType;
  conditions: TriggerCondition[];
  justification: string;
}