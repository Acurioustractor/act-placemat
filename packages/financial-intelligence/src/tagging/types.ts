/**
 * Data Tagging Pipeline Types
 * 
 * Type definitions for the data catalog to PostgreSQL sync pipeline
 * including consent, protocol, and sovereignty metadata
 */

import { ConsentLevel, SovereigntyLevel, PolicyType } from '../types/governance';

/**
 * Data catalog entry representing a data asset
 */
export interface DataCatalogEntry {
  /** Unique identifier for the data asset */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description */
  description: string;
  
  /** Data asset type */
  type: DataAssetType;
  
  /** Database and table information */
  location: DataLocation;
  
  /** Schema information */
  schema: DataSchema;
  
  /** Governance metadata */
  governance: GovernanceMetadata;
  
  /** Technical metadata */
  technical: TechnicalMetadata;
  
  /** Business metadata */
  business: BusinessMetadata;
  
  /** Compliance metadata */
  compliance: ComplianceMetadata;
  
  /** Lineage information */
  lineage: DataLineage;
  
  /** Last modified timestamp */
  lastModified: Date;
  
  /** Version information */
  version: string;
}

/**
 * Types of data assets
 */
export enum DataAssetType {
  TABLE = 'table',
  VIEW = 'view',
  MATERIALIZED_VIEW = 'materialized_view',
  STREAM = 'stream',
  FILE = 'file',
  API = 'api',
  DASHBOARD = 'dashboard',
  REPORT = 'report'
}

/**
 * Physical location of the data
 */
export interface DataLocation {
  /** Data source type */
  sourceType: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 's3' | 'api' | 'file';
  
  /** Connection string or identifier */
  connectionId: string;
  
  /** Database name */
  database?: string;
  
  /** Schema name */
  schema?: string;
  
  /** Table or collection name */
  table?: string;
  
  /** Full path for files or endpoints */
  path?: string;
  
  /** Additional location metadata */
  metadata?: Record<string, any>;
}

/**
 * Data schema definition
 */
export interface DataSchema {
  /** Schema fields */
  fields: SchemaField[];
  
  /** Primary key fields */
  primaryKeys: string[];
  
  /** Foreign key relationships */
  foreignKeys: ForeignKey[];
  
  /** Indexes */
  indexes: Index[];
  
  /** Constraints */
  constraints: Constraint[];
}

/**
 * Individual schema field
 */
export interface SchemaField {
  /** Field name */
  name: string;
  
  /** Data type */
  type: string;
  
  /** Whether field is nullable */
  nullable: boolean;
  
  /** Default value */
  defaultValue?: any;
  
  /** Field description */
  description?: string;
  
  /** Field tags */
  tags: FieldTag[];
  
  /** Sensitivity classification */
  sensitivity: DataSensitivity;
  
  /** Whether field contains personal data */
  personalData: boolean;
  
  /** Whether field contains Indigenous data */
  indigenousData: boolean;
}

/**
 * Data sensitivity levels
 */
export enum DataSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  SECRET = 'secret'
}

/**
 * Field-level tags
 */
export interface FieldTag {
  /** Tag key */
  key: string;
  
  /** Tag value */
  value: string;
  
  /** Tag type */
  type: TagType;
  
  /** Tag source */
  source: TagSource;
  
  /** Confidence level */
  confidence: number;
  
  /** Tag creation timestamp */
  createdAt: Date;
  
  /** Tag creator */
  createdBy: string;
}

/**
 * Types of tags
 */
export enum TagType {
  CLASSIFICATION = 'classification',
  CONSENT = 'consent',
  PROTOCOL = 'protocol',
  SOVEREIGNTY = 'sovereignty',
  COMPLIANCE = 'compliance',
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  QUALITY = 'quality'
}

/**
 * Tag sources
 */
export enum TagSource {
  MANUAL = 'manual',
  AUTOMATED = 'automated',
  INFERRED = 'inferred',
  EXTERNAL = 'external',
  POLICY = 'policy'
}

/**
 * Foreign key relationship
 */
export interface ForeignKey {
  /** Local field name */
  localField: string;
  
  /** Referenced table */
  referencedTable: string;
  
  /** Referenced field */
  referencedField: string;
  
  /** Relationship type */
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

/**
 * Index definition
 */
export interface Index {
  /** Index name */
  name: string;
  
  /** Indexed fields */
  fields: string[];
  
  /** Index type */
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  
  /** Whether index is unique */
  unique: boolean;
}

/**
 * Data constraint
 */
export interface Constraint {
  /** Constraint name */
  name: string;
  
  /** Constraint type */
  type: 'check' | 'unique' | 'foreign_key' | 'not_null';
  
  /** Constraint definition */
  definition: string;
}

/**
 * Governance metadata
 */
export interface GovernanceMetadata {
  /** Data owner */
  owner: string;
  
  /** Data steward */
  steward: string;
  
  /** Data custodian */
  custodian: string;
  
  /** Consent requirements */
  consent: ConsentMetadata;
  
  /** Protocol requirements */
  protocols: ProtocolMetadata[];
  
  /** Sovereignty information */
  sovereignty: SovereigntyMetadata;
  
  /** Retention policy */
  retention: RetentionPolicy;
  
  /** Access controls */
  accessControls: AccessControl[];
}

/**
 * Consent metadata
 */
export interface ConsentMetadata {
  /** Required consent level */
  requiredLevel: ConsentLevel;
  
  /** Consent purposes */
  purposes: string[];
  
  /** Consent expiry */
  expiryDays?: number;
  
  /** Whether explicit consent is required */
  explicitRequired: boolean;
  
  /** Consent withdrawal allowed */
  withdrawalAllowed: boolean;
  
  /** Granular consent fields */
  granularFields?: string[];
}

/**
 * Protocol metadata
 */
export interface ProtocolMetadata {
  /** Protocol type */
  type: PolicyType;
  
  /** Protocol name */
  name: string;
  
  /** Protocol rules */
  rules: string[];
  
  /** Enforcement level */
  enforcement: 'mandatory' | 'optional' | 'advisory';
  
  /** Protocol applicability conditions */
  conditions?: Record<string, any>;
}

/**
 * Sovereignty metadata
 */
export interface SovereigntyMetadata {
  /** Sovereignty level */
  level: SovereigntyLevel;
  
  /** Traditional owners */
  traditionalOwners?: string[];
  
  /** Data residency requirements */
  residency: {
    country: string;
    region?: string;
    restrictions?: string[];
  };
  
  /** Indigenous data indicators */
  indigenous?: {
    careCompliance: boolean;
    culturalProtocols: string[];
    sacredKnowledge: boolean;
  };
  
  /** Community ownership */
  community?: {
    representatives: string[];
    consentRequired: boolean;
    benefitSharing: boolean;
  };
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
  /** Retention period in years */
  years: number;
  
  /** Retention reason */
  reason: string;
  
  /** Legal basis */
  legalBasis?: string;
  
  /** Disposal method */
  disposalMethod: 'deletion' | 'anonymization' | 'archival';
  
  /** Review frequency */
  reviewFrequency: 'annual' | 'biannual' | 'triennial';
}

/**
 * Access control definition
 */
export interface AccessControl {
  /** Role or user */
  principal: string;
  
  /** Principal type */
  principalType: 'user' | 'role' | 'group';
  
  /** Access level */
  access: 'read' | 'write' | 'admin' | 'deny';
  
  /** Conditions */
  conditions?: Record<string, any>;
  
  /** Time restrictions */
  timeRestrictions?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
  };
}

/**
 * Technical metadata
 */
export interface TechnicalMetadata {
  /** Data size */
  size: DataSize;
  
  /** Performance characteristics */
  performance: PerformanceMetrics;
  
  /** Data quality */
  quality: DataQuality;
  
  /** Update frequency */
  updateFrequency: UpdateFrequency;
  
  /** Dependencies */
  dependencies: string[];
}

/**
 * Data size information
 */
export interface DataSize {
  /** Number of rows */
  rows: number;
  
  /** Number of columns */
  columns: number;
  
  /** Storage size in bytes */
  storageBytes: number;
  
  /** Compressed size in bytes */
  compressedBytes?: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Average query time in milliseconds */
  avgQueryTime: number;
  
  /** Query volume per day */
  dailyQueries: number;
  
  /** Peak usage hours */
  peakHours: number[];
  
  /** Performance tier */
  tier: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Data quality metrics
 */
export interface DataQuality {
  /** Completeness percentage */
  completeness: number;
  
  /** Accuracy percentage */
  accuracy: number;
  
  /** Consistency percentage */
  consistency: number;
  
  /** Timeliness score */
  timeliness: number;
  
  /** Validity percentage */
  validity: number;
  
  /** Quality score */
  overallScore: number;
  
  /** Last quality check */
  lastChecked: Date;
}

/**
 * Update frequency
 */
export interface UpdateFrequency {
  /** Frequency type */
  type: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad-hoc';
  
  /** Specific schedule */
  schedule?: string;
  
  /** Last update time */
  lastUpdate: Date;
  
  /** Next scheduled update */
  nextUpdate?: Date;
}

/**
 * Business metadata
 */
export interface BusinessMetadata {
  /** Business domain */
  domain: string;
  
  /** Business purpose */
  purpose: string;
  
  /** Business value */
  value: BusinessValue;
  
  /** Usage patterns */
  usage: UsagePattern[];
  
  /** Business glossary terms */
  glossaryTerms: string[];
  
  /** Related business processes */
  processes: string[];
}

/**
 * Business value assessment
 */
export interface BusinessValue {
  /** Value tier */
  tier: 'low' | 'medium' | 'high' | 'critical';
  
  /** Revenue impact */
  revenueImpact: number;
  
  /** Strategic importance */
  strategicImportance: number;
  
  /** Operational criticality */
  operationalCriticality: number;
}

/**
 * Usage pattern
 */
export interface UsagePattern {
  /** Usage type */
  type: 'reporting' | 'analytics' | 'operational' | 'compliance' | 'research';
  
  /** Frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ad-hoc';
  
  /** User groups */
  userGroups: string[];
  
  /** Peak usage times */
  peakTimes: string[];
}

/**
 * Compliance metadata
 */
export interface ComplianceMetadata {
  /** Regulatory frameworks */
  frameworks: ComplianceFramework[];
  
  /** Australian specific compliance */
  australian: AustralianCompliance;
  
  /** International compliance */
  international: InternationalCompliance;
  
  /** Compliance status */
  status: ComplianceStatus;
  
  /** Last compliance review */
  lastReview: Date;
  
  /** Next compliance review */
  nextReview: Date;
}

/**
 * Compliance framework
 */
export interface ComplianceFramework {
  /** Framework name */
  name: string;
  
  /** Framework version */
  version: string;
  
  /** Applicable requirements */
  requirements: string[];
  
  /** Compliance level */
  level: 'not_applicable' | 'partial' | 'full' | 'exceeds';
  
  /** Evidence */
  evidence?: string[];
}

/**
 * Australian compliance
 */
export interface AustralianCompliance {
  /** Privacy Act 1988 */
  privacyAct: {
    applicable: boolean;
    apps: number[]; // Australian Privacy Principles
    crossBorder: boolean;
  };
  
  /** ACNC requirements */
  acnc?: {
    applicable: boolean;
    governanceStandards: number[];
    reportingThreshold: 'small' | 'medium' | 'large';
  };
  
  /** AUSTRAC requirements */
  austrac?: {
    applicable: boolean;
    reportingRequired: boolean;
    thresholds: number[];
  };
  
  /** Indigenous data */
  indigenous?: {
    careApplicable: boolean;
    traditionalOwners: string[];
    culturalProtocols: string[];
  };
  
  /** Data residency */
  dataResidency: {
    required: boolean;
    allowedRegions: string[];
    exceptions: string[];
  };
}

/**
 * International compliance
 */
export interface InternationalCompliance {
  /** GDPR */
  gdpr?: {
    applicable: boolean;
    lawfulBasis: string[];
    transfers: boolean;
  };
  
  /** CCPA */
  ccpa?: {
    applicable: boolean;
    categories: string[];
    rights: string[];
  };
  
  /** Other frameworks */
  other: Array<{
    name: string;
    applicable: boolean;
    requirements: string[];
  }>;
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  /** Overall status */
  overall: 'compliant' | 'non_compliant' | 'partial' | 'under_review';
  
  /** Specific violations */
  violations: ComplianceViolation[];
  
  /** Remediation actions */
  remediations: RemediationAction[];
  
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  /** Violation ID */
  id: string;
  
  /** Framework */
  framework: string;
  
  /** Requirement */
  requirement: string;
  
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Description */
  description: string;
  
  /** Detection date */
  detectedAt: Date;
  
  /** Status */
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
}

/**
 * Remediation action
 */
export interface RemediationAction {
  /** Action ID */
  id: string;
  
  /** Related violation */
  violationId?: string;
  
  /** Action description */
  description: string;
  
  /** Priority */
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  /** Assigned to */
  assignedTo: string;
  
  /** Due date */
  dueDate: Date;
  
  /** Status */
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Data lineage information
 */
export interface DataLineage {
  /** Upstream dependencies */
  upstream: DataLineageNode[];
  
  /** Downstream dependencies */
  downstream: DataLineageNode[];
  
  /** Transformation logic */
  transformations: DataTransformation[];
}

/**
 * Data lineage node
 */
export interface DataLineageNode {
  /** Node ID */
  id: string;
  
  /** Node name */
  name: string;
  
  /** Node type */
  type: DataAssetType;
  
  /** Relationship type */
  relationship: 'source' | 'target' | 'transformation' | 'reference';
  
  /** Connection strength */
  strength: number; // 0-1
}

/**
 * Data transformation
 */
export interface DataTransformation {
  /** Transformation ID */
  id: string;
  
  /** Transformation type */
  type: 'etl' | 'elt' | 'aggregation' | 'enrichment' | 'cleansing' | 'masking';
  
  /** Description */
  description: string;
  
  /** Logic */
  logic: string;
  
  /** Source fields */
  sourceFields: string[];
  
  /** Target fields */
  targetFields: string[];
  
  /** Transformation rules */
  rules: TransformationRule[];
}

/**
 * Transformation rule
 */
export interface TransformationRule {
  /** Rule ID */
  id: string;
  
  /** Rule type */
  type: 'mapping' | 'calculation' | 'validation' | 'masking' | 'enrichment';
  
  /** Source expression */
  source: string;
  
  /** Target expression */
  target: string;
  
  /** Conditions */
  conditions?: string[];
}

/**
 * Sync pipeline configuration
 */
export interface SyncPipelineConfig {
  /** Data catalog configuration */
  dataCatalog: DataCatalogConfig;
  
  /** PostgreSQL configuration */
  postgresql: PostgreSQLConfig;
  
  /** Sync configuration */
  sync: SyncConfig;
  
  /** Tagging configuration */
  tagging: TaggingConfig;
  
  /** Monitoring configuration */
  monitoring: MonitoringConfig;
}

/**
 * Data catalog configuration
 */
export interface DataCatalogConfig {
  /** Catalog type */
  type: 'apache_atlas' | 'datahub' | 'amundsen' | 'custom';
  
  /** Connection details */
  connection: {
    url: string;
    apiKey?: string;
    username?: string;
    password?: string;
    timeout: number;
  };
  
  /** Query configuration */
  query: {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
  };
  
  /** Filtering */
  filters: {
    includedTypes: DataAssetType[];
    excludedTypes: DataAssetType[];
    includedTags: string[];
    excludedTags: string[];
  };
}

/**
 * PostgreSQL configuration for tagging
 */
export interface PostgreSQLConfig {
  /** Connection details */
  connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
    poolSize: number;
  };
  
  /** Schema configuration */
  schema: {
    catalogSchema: string;
    tagsSchema: string;
    metadataSchema: string;
  };
  
  /** Performance configuration */
  performance: {
    batchSize: number;
    parallelWorkers: number;
    enablePartitioning: boolean;
  };
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Sync mode */
  mode: 'full' | 'incremental' | 'real_time';
  
  /** Sync frequency */
  frequency: {
    full: string; // cron expression
    incremental: string; // cron expression
    realTime: number; // polling interval in seconds
  };
  
  /** Change detection */
  changeDetection: {
    enabled: boolean;
    strategy: 'timestamp' | 'checksum' | 'event';
    timestampField?: string;
    checksumFields?: string[];
  };
  
  /** Conflict resolution */
  conflictResolution: {
    strategy: 'catalog_wins' | 'postgres_wins' | 'manual' | 'merge';
    manualApprovalRequired: boolean;
  };
  
  /** Error handling */
  errorHandling: {
    maxRetries: number;
    retryDelay: number;
    continueOnError: boolean;
    deadLetterQueue: boolean;
  };
}

/**
 * Tagging configuration
 */
export interface TaggingConfig {
  /** Auto-tagging rules */
  autoTagging: {
    enabled: boolean;
    rules: AutoTaggingRule[];
  };
  
  /** Tag validation */
  validation: {
    enabled: boolean;
    requiredTags: string[];
    allowedValues: Record<string, string[]>;
  };
  
  /** Tag propagation */
  propagation: {
    enabled: boolean;
    inheritanceRules: TagInheritanceRule[];
  };
  
  /** Australian compliance tagging */
  compliance: {
    autoDetectPII: boolean;
    autoDetectIndigenous: boolean;
    autoApplyPrivacyAct: boolean;
    autoApplyDataResidency: boolean;
  };
}

/**
 * Auto-tagging rule
 */
export interface AutoTaggingRule {
  /** Rule ID */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Conditions */
  conditions: TaggingCondition[];
  
  /** Actions */
  actions: TaggingAction[];
  
  /** Priority */
  priority: number;
  
  /** Enabled */
  enabled: boolean;
}

/**
 * Tagging condition
 */
export interface TaggingCondition {
  /** Field to check */
  field: string;
  
  /** Operator */
  operator: 'equals' | 'contains' | 'matches' | 'starts_with' | 'ends_with';
  
  /** Value */
  value: string;
  
  /** Case sensitive */
  caseSensitive: boolean;
}

/**
 * Tagging action
 */
export interface TaggingAction {
  /** Action type */
  type: 'add_tag' | 'remove_tag' | 'set_classification' | 'set_consent' | 'set_sovereignty';
  
  /** Tag key */
  key: string;
  
  /** Tag value */
  value: string;
  
  /** Confidence */
  confidence: number;
}

/**
 * Tag inheritance rule
 */
export interface TagInheritanceRule {
  /** Source tag */
  sourceTag: string;
  
  /** Target tags */
  targetTags: string[];
  
  /** Inheritance strategy */
  strategy: 'copy' | 'derive' | 'aggregate';
  
  /** Conditions */
  conditions?: string[];
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Metrics collection */
  metrics: {
    enabled: boolean;
    provider: 'prometheus' | 'datadog' | 'cloudwatch' | 'custom';
    endpoint?: string;
    interval: number;
  };
  
  /** Alerting */
  alerting: {
    enabled: boolean;
    channels: AlertChannel[];
    rules: AlertRule[];
  };
  
  /** Logging */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    destination: 'console' | 'file' | 'syslog';
    format: 'json' | 'text';
  };
}

/**
 * Alert channel
 */
export interface AlertChannel {
  /** Channel type */
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  
  /** Channel configuration */
  config: Record<string, any>;
  
  /** Enabled */
  enabled: boolean;
}

/**
 * Alert rule
 */
export interface AlertRule {
  /** Rule ID */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Condition */
  condition: string;
  
  /** Severity */
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  /** Channels */
  channels: string[];
  
  /** Enabled */
  enabled: boolean;
}

/**
 * Sync operation result
 */
export interface SyncResult {
  /** Operation ID */
  operationId: string;
  
  /** Start time */
  startTime: Date;
  
  /** End time */
  endTime: Date;
  
  /** Duration in milliseconds */
  duration: number;
  
  /** Status */
  status: 'success' | 'failure' | 'partial' | 'cancelled';
  
  /** Statistics */
  statistics: SyncStatistics;
  
  /** Errors */
  errors: SyncError[];
  
  /** Warnings */
  warnings: SyncWarning[];
}

/**
 * Sync statistics
 */
export interface SyncStatistics {
  /** Total records processed */
  totalRecords: number;
  
  /** Records inserted */
  inserted: number;
  
  /** Records updated */
  updated: number;
  
  /** Records deleted */
  deleted: number;
  
  /** Records skipped */
  skipped: number;
  
  /** Records failed */
  failed: number;
  
  /** Tags applied */
  tagsApplied: number;
  
  /** Compliance issues detected */
  complianceIssues: number;
}

/**
 * Sync error
 */
export interface SyncError {
  /** Error ID */
  id: string;
  
  /** Record ID */
  recordId?: string;
  
  /** Error type */
  type: 'validation' | 'transformation' | 'database' | 'network' | 'authorization';
  
  /** Error message */
  message: string;
  
  /** Error details */
  details?: any;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Retryable */
  retryable: boolean;
}

/**
 * Sync warning
 */
export interface SyncWarning {
  /** Warning ID */
  id: string;
  
  /** Record ID */
  recordId?: string;
  
  /** Warning type */
  type: 'data_quality' | 'compliance' | 'performance' | 'configuration';
  
  /** Warning message */
  message: string;
  
  /** Severity */
  severity: 'low' | 'medium' | 'high';
  
  /** Timestamp */
  timestamp: Date;
}