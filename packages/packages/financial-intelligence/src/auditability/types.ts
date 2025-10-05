/**
 * Auditability and Policy Rollback Types
 * 
 * Type definitions for policy versioning, change tracking, and rollback operations
 * supporting comprehensive audit trails and atomic policy set management
 */

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: string; // Semantic version (e.g., "1.2.3")
  hash: string; // SHA-256 hash of policy content
  content: PolicyContent;
  metadata: PolicyVersionMetadata;
  parentVersion?: string; // Previous version for change history
  branches: string[]; // Parallel development branches
  tags: string[]; // Version tags (e.g., "stable", "experimental")
  createdAt: Date;
  createdBy: string;
  status: PolicyVersionStatus;
}

export interface PolicyContent {
  rego: string; // Rego policy code
  data: Record<string, any>; // Associated data
  config: PolicyConfiguration;
  dependencies: PolicyDependency[];
  constraints: PolicyConstraint[];
}

export interface PolicyConfiguration {
  enforcement: EnforcementLevel;
  scope: PolicyScope;
  priority: number;
  timeWindow?: TimeWindow;
  jurisdiction: Jurisdiction[];
  complianceFrameworks: string[];
}

export interface PolicyDependency {
  dependsOn: string; // Policy ID
  version: string; // Required version or range
  type: DependencyType;
  required: boolean;
}

export interface PolicyConstraint {
  type: ConstraintType;
  condition: string;
  value: any;
  enforced: boolean;
}

export enum PolicyVersionStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived',
  ROLLBACK_TARGET = 'rollback_target'
}

export enum EnforcementLevel {
  ADVISORY = 'advisory',
  WARNING = 'warning',
  BLOCKING = 'blocking',
  EMERGENCY_OVERRIDE = 'emergency_override'
}

export enum PolicyScope {
  GLOBAL = 'global',
  JURISDICTION = 'jurisdiction',
  ORGANISATION = 'organisation',
  DEPARTMENT = 'department',
  USER = 'user'
}

export enum DependencyType {
  REQUIRES = 'requires',
  CONFLICTS = 'conflicts',
  SUGGESTS = 'suggests',
  ENHANCES = 'enhances'
}

export enum ConstraintType {
  TIME_BASED = 'time_based',
  USER_ROLE = 'user_role',
  RESOURCE_TYPE = 'resource_type',
  JURISDICTION = 'jurisdiction',
  COMPLIANCE = 'compliance'
}

export interface TimeWindow {
  start: string; // ISO time string
  end: string;
  timezone: string;
  recurring?: RecurrencePattern;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  months?: number[];
}

export interface PolicyVersionMetadata {
  title: string;
  description: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  impact: PolicyImpact;
  changeType: ChangeType;
  releaseNotes: string;
  reviewers: string[];
  approvedBy?: string;
  approvedAt?: Date;
  testResults?: TestResult[];
  complianceValidation?: ComplianceValidation[];
}

export enum PolicyCategory {
  FINANCIAL = 'financial',
  SECURITY = 'security',
  PRIVACY = 'privacy',
  COMPLIANCE = 'compliance',
  OPERATIONAL = 'operational',
  CONSTITUTIONAL = 'constitutional',
  CULTURAL = 'cultural'
}

export enum PolicySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum PolicyImpact {
  MINIMAL = 'minimal',      // < 1% of operations affected
  LOW = 'low',              // 1-10% of operations affected
  MODERATE = 'moderate',    // 10-30% of operations affected
  HIGH = 'high',            // 30-70% of operations affected
  MAJOR = 'major'           // > 70% of operations affected
}

export enum ChangeType {
  CREATION = 'creation',
  UPDATE = 'update',
  DELETION = 'deletion',
  ROLLBACK = 'rollback',
  MERGE = 'merge',
  BRANCH = 'branch',
  TAG = 'tag'
}

export interface TestResult {
  testSuite: string;
  passed: boolean;
  coverage: number;
  executionTime: number;
  failures: TestFailure[];
  timestamp: Date;
}

export interface TestFailure {
  testCase: string;
  error: string;
  expected: any;
  actual: any;
}

export interface ComplianceValidation {
  framework: string; // e.g., "AUSTRAC", "Privacy Act"
  passed: boolean;
  issues: ComplianceIssue[];
  validatedBy: string;
  validatedAt: Date;
}

export interface ComplianceIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
  description: string;
  remedy: string;
}

// Change Tracking and Audit Trail

export interface PolicyChange {
  id: string;
  changeType: ChangeType;
  policyId: string;
  fromVersion?: string;
  toVersion: string;
  diff: PolicyDiff;
  changeset: Changeset;
  metadata: ChangeMetadata;
  auditTrail: AuditEntry[];
  timestamp: Date;
  userId: string;
  sessionId: string;
  requestId: string;
}

export interface PolicyDiff {
  added: DiffEntry[];
  modified: DiffEntry[];
  removed: DiffEntry[];
  summary: DiffSummary;
}

export interface DiffEntry {
  path: string; // JSON path (e.g., "content.rego", "metadata.title")
  oldValue?: any;
  newValue?: any;
  operation: DiffOperation;
}

export enum DiffOperation {
  ADD = 'add',
  MODIFY = 'modify',
  DELETE = 'delete',
  MOVE = 'move',
  COPY = 'copy'
}

export interface DiffSummary {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  filesChanged: number;
  complexity: ChangeComplexity;
}

export enum ChangeComplexity {
  TRIVIAL = 'trivial',     // Documentation, comments only
  SIMPLE = 'simple',       // Single rule changes
  MODERATE = 'moderate',   // Multiple rule changes
  COMPLEX = 'complex',     // Logic flow changes
  MAJOR = 'major'          // Architecture changes
}

export interface Changeset {
  files: ChangesetFile[];
  operations: ChangesetOperation[];
  rollbackInstructions: RollbackInstruction[];
  dependencies: ChangesetDependency[];
}

export interface ChangesetFile {
  path: string;
  operation: DiffOperation;
  content?: string;
  checksum: string;
  size: number;
}

export interface ChangesetOperation {
  type: 'create' | 'update' | 'delete' | 'validate';
  target: string;
  parameters: Record<string, any>;
  rollbackOperation?: ChangesetOperation;
}

export interface RollbackInstruction {
  step: number;
  operation: 'restore_file' | 'execute_sql' | 'clear_cache' | 'notify_systems';
  target: string;
  data: any;
  validation?: ValidationRule;
}

export interface ValidationRule {
  type: 'checksum' | 'schema' | 'policy_test' | 'compliance_check';
  expected: any;
  critical: boolean;
}

export interface ChangesetDependency {
  dependsOn: string; // Change ID or policy version
  type: 'sequential' | 'parallel' | 'conditional';
  condition?: string;
}

export interface ChangeMetadata {
  description: string;
  reason: ChangeReason;
  urgency: ChangeUrgency;
  impact: PolicyImpact;
  rollbackWindow: number; // Hours after which rollback becomes complex
  reviewRequired: boolean;
  approvalRequired: boolean;
  notificationRequired: boolean;
  affectedSystems: string[];
  affectedUsers: string[];
  rollbackComplexity: RollbackComplexity;
}

export enum ChangeReason {
  BUG_FIX = 'bug_fix',
  FEATURE_ADDITION = 'feature_addition',
  COMPLIANCE_UPDATE = 'compliance_update',
  SECURITY_PATCH = 'security_patch',
  PERFORMANCE_IMPROVEMENT = 'performance_improvement',
  CONFIGURATION_CHANGE = 'configuration_change',
  EMERGENCY_RESPONSE = 'emergency_response',
  ROUTINE_MAINTENANCE = 'routine_maintenance'
}

export enum ChangeUrgency {
  LOW = 'low',              // Can wait for next maintenance window
  MEDIUM = 'medium',        // Should be deployed within 24 hours
  HIGH = 'high',            // Should be deployed within 4 hours
  EMERGENCY = 'emergency'   // Deploy immediately
}

export enum RollbackComplexity {
  SIMPLE = 'simple',        // Single file restore
  MODERATE = 'moderate',    // Multiple files, clear dependencies
  COMPLEX = 'complex',      // Cross-system impacts
  DANGEROUS = 'dangerous'   // May require manual intervention
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  target: string;
  details: Record<string, any>;
  result: AuditResult;
  sessionId: string;
  requestId: string;
  ipAddress: string;
  userAgent?: string;
  integrityHash: string;
}

export enum AuditAction {
  CREATE_POLICY = 'create_policy',
  UPDATE_POLICY = 'update_policy',
  DELETE_POLICY = 'delete_policy',
  APPROVE_POLICY = 'approve_policy',
  DEPLOY_POLICY = 'deploy_policy',
  ROLLBACK_POLICY = 'rollback_policy',
  VIEW_POLICY = 'view_policy',
  EXPORT_POLICY = 'export_policy',
  IMPORT_POLICY = 'import_policy',
  VALIDATE_POLICY = 'validate_policy',
  MERGE_POLICIES = 'merge_policies',
  BRANCH_POLICY = 'branch_policy',
  TAG_POLICY = 'tag_policy'
}

export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  WARNING = 'warning',
  UNAUTHORIZED = 'unauthorized',
  BLOCKED = 'blocked'
}

// Rollback System

export interface RollbackPlan {
  id: string;
  name: string;
  description: string;
  targetState: RollbackTarget;
  scope: RollbackScope;
  phases: RollbackPhase[];
  validation: RollbackValidation;
  contingency: ContingencyPlan;
  metadata: RollbackMetadata;
  createdAt: Date;
  createdBy: string;
  status: RollbackStatus;
}

export interface RollbackTarget {
  type: 'version' | 'timestamp' | 'changeset' | 'tag';
  value: string; // Version ID, ISO timestamp, changeset ID, or tag name
  policyIds: string[]; // Specific policies to rollback
  includeData: boolean; // Whether to rollback associated data
  preserveAuditTrail: boolean;
}

export interface RollbackScope {
  policies: string[]; // Policy IDs to include
  exclusions: string[]; // Policy IDs to exclude
  systems: string[]; // Affected systems
  timeWindow: TimeWindow; // When rollback can be executed
  impactAssessment: ImpactAssessment;
}

export interface ImpactAssessment {
  affectedUsers: number;
  affectedTransactions: number;
  systemDowntime: number; // Estimated minutes
  dataLoss: DataLossAssessment;
  complianceRisk: ComplianceRisk;
  businessImpact: BusinessImpact;
}

export interface DataLossAssessment {
  risk: 'none' | 'minimal' | 'moderate' | 'significant' | 'major';
  affectedRecords: number;
  recoverable: boolean;
  backupAvailable: boolean;
}

export interface ComplianceRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  frameworks: string[];
  mitigations: string[];
}

export interface BusinessImpact {
  severity: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  duration: number; // Minutes
  affectedOperations: string[];
  financialImpact?: number; // AUD
}

export interface RollbackPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  operations: RollbackOperation[];
  dependencies: string[]; // Phase IDs that must complete first
  validation: PhaseValidation;
  rollbackOnFailure: boolean;
  timeoutMinutes: number;
}

export interface RollbackOperation {
  id: string;
  type: RollbackOperationType;
  target: string;
  instructions: string;
  parameters: Record<string, any>;
  validation: OperationValidation;
  rollbackInstruction?: string; // How to undo this operation
  timeoutSeconds: number;
  retryCount: number;
  critical: boolean; // Failure stops entire rollback
}

export enum RollbackOperationType {
  RESTORE_POLICY = 'restore_policy',
  RESTORE_DATA = 'restore_data',
  CLEAR_CACHE = 'clear_cache',
  RESTART_SERVICE = 'restart_service',
  EXECUTE_SCRIPT = 'execute_script',
  VALIDATE_STATE = 'validate_state',
  NOTIFY_SYSTEMS = 'notify_systems',
  UPDATE_CONFIG = 'update_config',
  BACKUP_CURRENT = 'backup_current'
}

export interface PhaseValidation {
  preConditions: ValidationCheck[];
  postConditions: ValidationCheck[];
  rollbackTriggers: RollbackTrigger[];
}

export interface OperationValidation {
  preExecution: ValidationCheck[];
  postExecution: ValidationCheck[];
  successCriteria: SuccessCriterion[];
}

export interface ValidationCheck {
  type: ValidationType;
  target: string;
  expected: any;
  tolerance?: number; // For numeric comparisons
  timeout: number; // Seconds
  critical: boolean;
}

export enum ValidationType {
  POLICY_SYNTAX = 'policy_syntax',
  POLICY_SEMANTICS = 'policy_semantics',
  DATA_INTEGRITY = 'data_integrity',
  SYSTEM_HEALTH = 'system_health',
  COMPLIANCE_STATUS = 'compliance_status',
  PERFORMANCE_BASELINE = 'performance_baseline',
  USER_ACCESS = 'user_access',
  DEPENDENCY_CHECK = 'dependency_check'
}

export interface SuccessCriterion {
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: any;
  weight: number; // 1-10, for weighted success calculation
}

export interface RollbackTrigger {
  condition: string;
  action: 'abort' | 'continue' | 'pause' | 'escalate';
  threshold: number;
  message: string;
}

export interface RollbackValidation {
  preRollback: ValidationSuite;
  postRollback: ValidationSuite;
  performanceBaseline: PerformanceBaseline;
  complianceChecks: ComplianceCheck[];
}

export interface ValidationSuite {
  tests: ValidationTest[];
  requiredSuccessRate: number; // 0.0 to 1.0
  maxExecutionTime: number; // Minutes
  parallelExecution: boolean;
}

export interface ValidationTest {
  id: string;
  name: string;
  type: ValidationType;
  target: string;
  parameters: Record<string, any>;
  expectedResult: any;
  critical: boolean;
  timeout: number;
}

export interface PerformanceBaseline {
  metrics: PerformanceMetric[];
  tolerances: Record<string, number>;
  measurementPeriod: number; // Minutes
}

export interface PerformanceMetric {
  name: string;
  current: number;
  baseline: number;
  unit: string;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface ComplianceCheck {
  framework: string;
  checks: string[];
  required: boolean;
  automatedValidation: boolean;
}

export interface ContingencyPlan {
  triggers: ContingencyTrigger[];
  actions: ContingencyAction[];
  escalationPath: EscalationLevel[];
  communicationPlan: CommunicationPlan;
}

export interface ContingencyTrigger {
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoTrigger: boolean;
}

export interface ContingencyAction {
  trigger: string;
  action: string;
  parameters: Record<string, any>;
  owner: string;
  timeoutMinutes: number;
}

export interface EscalationLevel {
  level: number;
  roles: string[];
  notificationMethods: string[];
  timeoutMinutes: number;
  autoEscalate: boolean;
}

export interface CommunicationPlan {
  stakeholders: Stakeholder[];
  templates: NotificationTemplate[];
  channels: CommunicationChannel[];
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  contactMethods: ContactMethod[];
  notificationLevel: 'all' | 'critical' | 'major';
}

export interface ContactMethod {
  type: 'email' | 'sms' | 'slack' | 'webhook';
  address: string;
  priority: number;
}

export interface NotificationTemplate {
  trigger: string;
  subject: string;
  body: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface CommunicationChannel {
  name: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface RollbackMetadata {
  estimatedDuration: number; // Minutes
  risk: RollbackRisk;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  scheduledAt?: Date;
  maintenanceWindow: boolean;
  businessJustification: string;
  technicalJustification: string;
}

export enum RollbackRisk {
  LOW = 'low',              // Standard rollback, minimal risk
  MEDIUM = 'medium',        // Some complexity, managed risk
  HIGH = 'high',            // Complex rollback, elevated risk
  CRITICAL = 'critical'     // High-risk rollback, extensive validation needed
}

export enum RollbackStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIAL = 'partial'
}

export interface RollbackExecution {
  id: string;
  planId: string;
  executedBy: string;
  startTime: Date;
  endTime?: Date;
  status: RollbackExecutionStatus;
  currentPhase?: string;
  phases: PhaseExecution[];
  logs: ExecutionLog[];
  metrics: ExecutionMetrics;
  result?: RollbackResult;
}

export enum RollbackExecutionStatus {
  PREPARING = 'preparing',
  VALIDATING = 'validating',
  EXECUTING = 'executing',
  VALIDATING_RESULT = 'validating_result',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ROLLING_BACK = 'rolling_back' // Rolling back the rollback
}

export interface PhaseExecution {
  phaseId: string;
  status: PhaseExecutionStatus;
  startTime: Date;
  endTime?: Date;
  operations: OperationExecution[];
  validationResults: ValidationResult[];
}

export enum PhaseExecutionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export interface OperationExecution {
  operationId: string;
  status: OperationExecutionStatus;
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  retryCount: number;
  metrics: OperationMetrics;
}

export enum OperationExecutionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  SKIPPED = 'skipped'
}

export interface OperationMetrics {
  executionTime: number; // Milliseconds
  memoryUsage?: number;
  cpuUsage?: number;
  networkCalls?: number;
  errorsEncountered: number;
}

export interface ValidationResult {
  checkId: string;
  passed: boolean;
  result: any;
  expected: any;
  message: string;
  timestamp: Date;
  executionTime: number;
}

export interface ExecutionLog {
  timestamp: Date;
  level: LogLevel;
  source: string; // Phase or operation ID
  message: string;
  metadata?: Record<string, any>;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ExecutionMetrics {
  totalDuration: number;
  phasesCompleted: number;
  operationsCompleted: number;
  validationsPassed: number;
  validationsFailed: number;
  errorsEncountered: number;
  retryAttempts: number;
}

export interface RollbackResult {
  success: boolean;
  summary: string;
  completedPhases: string[];
  failedPhases: string[];
  validationResults: ValidationResult[];
  performanceImpact: PerformanceImpact;
  dataIntegrityStatus: DataIntegrityStatus;
  recommendedActions: string[];
}

export interface PerformanceImpact {
  before: PerformanceSnapshot;
  after: PerformanceSnapshot;
  degradation: number; // Percentage
  acceptableThreshold: number;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: Record<string, number>;
  systemLoad: number;
  responseTime: number;
  throughput: number;
}

export interface DataIntegrityStatus {
  checks: DataIntegrityCheck[];
  overallStatus: 'intact' | 'minor_issues' | 'major_issues' | 'corrupted';
  affectedRecords: number;
  recoverableIssues: number;
}

export interface DataIntegrityCheck {
  type: string;
  target: string;
  passed: boolean;
  issuesFound: number;
  details: string;
}

// Repository and Service Interfaces

export interface PolicyVersionRepository {
  // Version management
  saveVersion(version: PolicyVersion): Promise<string>;
  getVersion(policyId: string, version: string): Promise<PolicyVersion | null>;
  getLatestVersion(policyId: string): Promise<PolicyVersion | null>;
  getAllVersions(policyId: string): Promise<PolicyVersion[]>;
  deleteVersion(policyId: string, version: string): Promise<boolean>;
  
  // Change tracking
  saveChange(change: PolicyChange): Promise<string>;
  getChange(changeId: string): Promise<PolicyChange | null>;
  getChanges(policyId: string, options?: ChangeQueryOptions): Promise<PolicyChange[]>;
  
  // Audit trail
  saveAuditEntry(entry: AuditEntry): Promise<string>;
  getAuditTrail(target: string, options?: AuditQueryOptions): Promise<AuditEntry[]>;
  
  // Rollback management
  saveRollbackPlan(plan: RollbackPlan): Promise<string>;
  getRollbackPlan(planId: string): Promise<RollbackPlan | null>;
  getRollbackPlans(options?: RollbackQueryOptions): Promise<RollbackPlan[]>;
  saveRollbackExecution(execution: RollbackExecution): Promise<string>;
  getRollbackExecution(executionId: string): Promise<RollbackExecution | null>;
}

export interface ChangeQueryOptions {
  fromDate?: Date;
  toDate?: Date;
  userId?: string;
  changeType?: ChangeType;
  limit?: number;
  offset?: number;
}

export interface AuditQueryOptions {
  fromDate?: Date;
  toDate?: Date;
  userId?: string;
  action?: AuditAction;
  result?: AuditResult;
  limit?: number;
  offset?: number;
}

export interface RollbackQueryOptions {
  status?: RollbackStatus;
  createdBy?: string;
  fromDate?: Date;
  toDate?: Date;
  risk?: RollbackRisk;
  limit?: number;
  offset?: number;
}

export interface PolicyVersionService {
  // Version operations
  createVersion(policyId: string, content: PolicyContent, metadata: PolicyVersionMetadata, userId: string): Promise<PolicyVersion>;
  updateVersion(policyId: string, version: string, changes: Partial<PolicyContent>, userId: string): Promise<PolicyVersion>;
  approveVersion(policyId: string, version: string, userId: string): Promise<void>;
  deployVersion(policyId: string, version: string, userId: string): Promise<void>;
  
  // Change management
  compareVersions(policyId: string, fromVersion: string, toVersion: string): Promise<PolicyDiff>;
  mergeVersions(policyId: string, baseVersion: string, sourceVersion: string, userId: string): Promise<PolicyVersion>;
  branchVersion(policyId: string, fromVersion: string, branchName: string, userId: string): Promise<PolicyVersion>;
  
  // Rollback operations
  createRollbackPlan(target: RollbackTarget, scope: RollbackScope, metadata: RollbackMetadata, userId: string): Promise<RollbackPlan>;
  validateRollbackPlan(planId: string): Promise<ValidationResult[]>;
  executeRollback(planId: string, userId: string): Promise<RollbackExecution>;
  monitorRollback(executionId: string): Promise<RollbackExecution>;
  
  // Audit and reporting
  getVersionHistory(policyId: string): Promise<PolicyVersion[]>;
  getChangeHistory(policyId: string, options?: ChangeQueryOptions): Promise<PolicyChange[]>;
  getAuditTrail(target: string, options?: AuditQueryOptions): Promise<AuditEntry[]>;
  generateComplianceReport(fromDate: Date, toDate: Date): Promise<ComplianceReport>;
}

export interface ComplianceReport {
  period: { from: Date; to: Date };
  summary: ComplianceReportSummary;
  policyChanges: PolicyChangeSummary[];
  auditFindings: AuditFinding[];
  rollbackOperations: RollbackSummary[];
  recommendations: ComplianceRecommendation[];
  attachments: ReportAttachment[];
}

export interface ComplianceReportSummary {
  totalPolicies: number;
  changesApproved: number;
  changesRejected: number;
  rollbacksExecuted: number;
  complianceViolations: number;
  auditTrailCompleteness: number; // Percentage
}

export interface PolicyChangeSummary {
  policyId: string;
  changes: number;
  risk: PolicyImpact;
  complianceStatus: 'compliant' | 'non_compliant' | 'under_review';
}

export interface AuditFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPolicies: string[];
  recommendation: string;
  status: 'open' | 'addressed' | 'accepted_risk';
}

export interface RollbackSummary {
  planId: string;
  reason: string;
  success: boolean;
  impact: PolicyImpact;
  duration: number;
}

export interface ComplianceRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  implementation: string;
  timeline: string;
}

export interface ReportAttachment {
  name: string;
  type: string;
  size: number;
  checksum: string;
  content: string; // Base64 encoded or URL
}