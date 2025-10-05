/**
 * Type definitions for Policy-as-Code system
 */

import { PolicyMetadata, ConsentScope, SovereigntyLevel, PolicyType, PolicyEnforcement } from '../types/governance';

/**
 * Rego policy definition with metadata
 */
export interface RegoPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  module: string;
  rego: string;
  metadata: PolicyMetadata;
  dependencies: string[];
  testCases: PolicyTestCase[];
  documentation: string;
  tags: string[];
  
  // CI/CD integration
  cicd: {
    lastValidated: Date;
    lastDeployed?: Date;
    validationStatus: 'pending' | 'passed' | 'failed';
    deploymentStatus: 'pending' | 'deployed' | 'failed' | 'rollback';
    automatedTests: boolean;
  };
  
  // Australian compliance
  australianCompliance: {
    regulatoryFramework: string[];
    indigenousProtocols: boolean;
    dataResidency: 'australia' | 'international';
    privacyActCompliant: boolean;
  };
}

/**
 * Policy definition for creation/update
 */
export interface PolicyDefinition {
  name: string;
  description: string;
  module: string;
  rego: string;
  type: PolicyType;
  enforcement: PolicyEnforcement;
  scopes: ConsentScope[];
  dependencies?: string[];
  tags?: string[];
  documentation?: string;
  testCases?: PolicyTestCase[];
  australianCompliance?: {
    regulatoryFramework?: string[];
    indigenousProtocols?: boolean;
    dataResidency?: 'australia' | 'international';
  };
}

/**
 * Policy version tracking
 */
export interface PolicyVersion {
  id: string;
  policyId: string;
  version: string;
  changeLog: string;
  changes: PolicyChange[];
  createdBy: string;
  createdAt: Date;
  deployedAt?: Date;
  rollbackAvailable: boolean;
  previousVersion?: string;
  status: 'draft' | 'review' | 'approved' | 'deployed' | 'deprecated';
}

/**
 * Policy change tracking
 */
export interface PolicyChange {
  type: 'create' | 'update' | 'delete' | 'dependency_update';
  field?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
}

/**
 * Policy deployment tracking
 */
export interface PolicyDeployment {
  id: string;
  policyId: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  deployedAt: Date;
  deployedBy: string;
  rollbackId?: string;
  status: 'active' | 'inactive' | 'rollback';
  healthCheck: {
    status: 'healthy' | 'warning' | 'error';
    lastCheck: Date;
    issues: string[];
  };
}

/**
 * Policy test case
 */
export interface PolicyTestCase {
  id: string;
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  expectedDecision: 'allow' | 'deny' | 'conditional';
  metadata?: {
    scenario: string;
    tags: string[];
    australianContext?: boolean;
  };
}

/**
 * Policy validation result
 */
export interface PolicyValidationResult {
  valid: boolean;
  errors: PolicyValidationError[];
  warnings: PolicyValidationWarning[];
  testResults: PolicyTestResult[];
  complianceCheck: {
    australianLawCompliant: boolean;
    indigenousProtocolsChecked: boolean;
    dataResidencyCompliant: boolean;
    issues: string[];
  };
  performance: {
    validationTime: number; // milliseconds
    complexity: 'low' | 'medium' | 'high';
    memoryUsage?: number;
  };
}

/**
 * Policy validation error
 */
export interface PolicyValidationError {
  type: 'syntax' | 'semantic' | 'dependency' | 'compliance' | 'security';
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'critical';
  rule?: string;
  suggestion?: string;
}

/**
 * Policy validation warning
 */
export interface PolicyValidationWarning {
  type: 'performance' | 'style' | 'compatibility' | 'maintenance';
  message: string;
  line?: number;
  column?: number;
  severity: 'warning' | 'info';
  rule?: string;
  suggestion?: string;
}

/**
 * Policy test result
 */
export interface PolicyTestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: any;
  actualDecision?: 'allow' | 'deny' | 'conditional';
  error?: string;
  executionTime: number; // milliseconds
}

/**
 * Policy repository configuration
 */
export interface PolicyRepositoryConfig {
  // Storage configuration
  storage: {
    type: 'filesystem' | 'database' | 'git';
    path?: string;
    connectionString?: string;
    gitUrl?: string;
    branch?: string;
  };
  
  // Version control
  versionControl: {
    autoVersioning: boolean;
    semanticVersioning: boolean;
    requireChangeLog: boolean;
    maxVersionHistory: number;
  };
  
  // CI/CD integration
  cicd: {
    enableAutomatedTesting: boolean;
    enableAutomatedDeployment: boolean;
    requireApprovalForProduction: boolean;
    rollbackOnFailure: boolean;
    healthCheckInterval: number; // minutes
  };
  
  // Australian compliance
  compliance: {
    enforceDataResidency: boolean;
    requireIndigenousProtocols: boolean;
    mandatoryComplianceChecks: string[];
    auditRetentionDays: number;
  };
}

/**
 * Policy engine configuration
 */
export interface PolicyEngineConfig {
  // OPA configuration
  opa: {
    serverUrl?: string;
    timeout: number; // milliseconds
    retries: number;
    enableDecisionLogging: boolean;
    enableBundles: boolean;
  };
  
  // Caching
  cache: {
    enableCaching: boolean;
    cacheTTL: number; // seconds
    maxCacheSize: number;
    invalidateOnPolicyChange: boolean;
  };
  
  // Performance
  performance: {
    maxExecutionTime: number; // milliseconds
    enableProfiling: boolean;
    memoryLimit?: number; // MB
  };
  
  // Security
  security: {
    enableInputValidation: boolean;
    sanitizeInputs: boolean;
    enableAuditLogging: boolean;
    requireAuthentication: boolean;
  };
}

/**
 * Policy decision result
 */
export interface PolicyDecisionResult {
  decision: 'allow' | 'deny' | 'conditional';
  policyId: string;
  version: string;
  input: any;
  output: any;
  executionTime: number;
  metadata: {
    evaluatedPolicies: string[];
    triggeredRules: string[];
    timestamp: Date;
    requestId: string;
  };
  conditions?: PolicyCondition[];
  explanation?: string;
  auditTrail: PolicyAuditEntry[];
}

/**
 * Policy condition for conditional decisions
 */
export interface PolicyCondition {
  type: 'approval_required' | 'limit_check' | 'time_restriction' | 'consent_verification';
  description: string;
  parameters: Record<string, any>;
  expiresAt?: Date;
}

/**
 * Policy audit entry
 */
export interface PolicyAuditEntry {
  action: 'policy_evaluated' | 'decision_made' | 'condition_applied' | 'error_occurred';
  timestamp: Date;
  userId?: string;
  policyId: string;
  details: Record<string, any>;
  compliance: {
    dataResidency: boolean;
    auditLogged: boolean;
    indigenousProtocols?: boolean;
  };
}

/**
 * Policy bundle for deployment
 */
export interface PolicyBundle {
  id: string;
  name: string;
  version: string;
  policies: RegoPolicy[];
  createdAt: Date;
  createdBy: string;
  environment: 'development' | 'staging' | 'production';
  checksum: string;
  signature?: string;
  metadata: {
    description: string;
    changeLog: string;
    dependencies: string[];
    australianCompliance: boolean;
  };
}

/**
 * Policy repository interface
 */
export interface IPolicyRepository {
  // Policy CRUD operations
  createPolicy(definition: PolicyDefinition): Promise<RegoPolicy>;
  getPolicy(id: string): Promise<RegoPolicy | null>;
  updatePolicy(id: string, definition: Partial<PolicyDefinition>): Promise<RegoPolicy>;
  deletePolicy(id: string): Promise<void>;
  listPolicies(filter?: PolicyFilter): Promise<RegoPolicy[]>;
  
  // Version management
  createVersion(policyId: string, changeLog: string): Promise<PolicyVersion>;
  getVersion(policyId: string, version: string): Promise<PolicyVersion | null>;
  listVersions(policyId: string): Promise<PolicyVersion[]>;
  rollbackToVersion(policyId: string, version: string): Promise<void>;
  
  // Deployment management
  deployPolicy(policyId: string, environment: string): Promise<PolicyDeployment>;
  getDeployments(policyId: string): Promise<PolicyDeployment[]>;
  rollbackDeployment(deploymentId: string): Promise<void>;
  
  // Validation and testing
  validatePolicy(policy: RegoPolicy): Promise<PolicyValidationResult>;
  runTests(policyId: string): Promise<PolicyTestResult[]>;
  
  // Bundle operations
  createBundle(policies: string[], metadata: any): Promise<PolicyBundle>;
  deployBundle(bundleId: string, environment: string): Promise<void>;
}

/**
 * Policy filter options
 */
export interface PolicyFilter {
  type?: PolicyType;
  enforcement?: PolicyEnforcement;
  tags?: string[];
  scopes?: ConsentScope[];
  status?: string[];
  australianCompliance?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Policy metrics for monitoring
 */
export interface PolicyMetrics {
  totalPolicies: number;
  activePolicies: number;
  deprecatedPolicies: number;
  evaluationsPerHour: number;
  averageExecutionTime: number;
  errorRate: number;
  complianceRate: number;
  topExecutedPolicies: Array<{
    policyId: string;
    name: string;
    executions: number;
  }>;
  recentErrors: Array<{
    policyId: string;
    error: string;
    timestamp: Date;
  }>;
}