/**
 * Performance Caching Types
 * 
 * Type definitions for caching policy decisions and related data
 * for high-frequency financial operations
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  metadata: CacheMetadata;
  ttl: number; // Time to live in milliseconds
  createdAt: Date;
  lastAccessed: Date;
  hitCount: number;
  version: string;
}

export interface CacheMetadata {
  source: CacheSource;
  tags: string[];
  dependencies: string[];
  checksum: string;
  compressed: boolean;
  sensitive: boolean;
  retentionPolicy: RetentionPolicy;
  accessControl?: AccessControl;
}

export enum CacheSource {
  POLICY_DECISION = 'policy_decision',
  CONSENT_CHECK = 'consent_check',
  COMPLIANCE_VALIDATION = 'compliance_validation',
  CONSTITUTIONAL_CHECK = 'constitutional_check',
  DATA_CLASSIFICATION = 'data_classification',
  USER_PERMISSIONS = 'user_permissions',
  AUDIT_METADATA = 'audit_metadata',
  CONFIGURATION = 'configuration'
}

export interface RetentionPolicy {
  maxAge: number; // Maximum age in milliseconds
  maxIdleTime: number; // Maximum idle time before eviction
  maxVersions: number; // Maximum number of versions to keep
  culturalSensitive: boolean; // Special handling for cultural data
  complianceRequired: boolean; // Compliance-related data
}

export interface AccessControl {
  requiredRoles: string[];
  userRestrictions: string[];
  jurisdictionRestrictions: string[];
  timeRestrictions?: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export interface CacheKey {
  namespace: string;
  identifier: string;
  version?: string;
  parameters?: Record<string, any>;
}

export interface PolicyDecisionCacheEntry {
  decisionId: string;
  policyVersion: string;
  input: PolicyDecisionInput;
  decision: PolicyDecision;
  reasoning: string[];
  metadata: PolicyDecisionMetadata;
  cacheKey: string;
  invalidationTriggers: InvalidationTrigger[];
}

export interface PolicyDecisionInput {
  userId: string;
  action: string;
  resource: string;
  context: Record<string, any>;
  timestamp: Date;
  inputHash: string; // SHA-256 hash of normalized input
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  conditions?: string[];
  obligations?: string[];
  advice?: string[];
  errors?: string[];
  confidence: number; // 0-1 confidence score
}

export interface PolicyDecisionMetadata {
  evaluationTime: number; // milliseconds
  rulesEvaluated: number;
  cacheHit: boolean;
  complianceFrameworks: string[];
  riskLevel: RiskLevel;
  dataClassification: DataClassification;
  auditRequired: boolean;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  CULTURAL = 'cultural'
}

export interface InvalidationTrigger {
  type: InvalidationType;
  condition: string;
  priority: InvalidationPriority;
}

export enum InvalidationType {
  POLICY_CHANGE = 'policy_change',
  CONSENT_CHANGE = 'consent_change',
  USER_ROLE_CHANGE = 'user_role_change',
  CONFIGURATION_CHANGE = 'configuration_change',
  TIME_EXPIRY = 'time_expiry',
  DATA_CHANGE = 'data_change',
  MANUAL_INVALIDATION = 'manual_invalidation',
  COMPLIANCE_UPDATE = 'compliance_update',
  CONSTITUTIONAL_UPDATE = 'constitutional_update'
}

export enum InvalidationPriority {
  IMMEDIATE = 'immediate',    // Invalidate immediately
  HIGH = 'high',             // Invalidate within 1 minute
  MEDIUM = 'medium',         // Invalidate within 5 minutes
  LOW = 'low',               // Invalidate within 15 minutes
  BACKGROUND = 'background'   // Invalidate during next maintenance window
}

export interface CacheConfiguration {
  enabled: boolean;
  defaultTtl: number; // milliseconds
  maxEntries: number;
  maxMemoryUsage: number; // bytes
  compressionEnabled: boolean;
  compressionThreshold: number; // bytes
  encryptionEnabled: boolean;
  evictionPolicy: EvictionPolicy;
  persistenceEnabled: boolean;
  replicationEnabled: boolean;
  namespaces: NamespaceConfig[];
}

export interface NamespaceConfig {
  name: string;
  enabled: boolean;
  ttl: number;
  maxEntries: number;
  evictionPolicy: EvictionPolicy;
  compressionEnabled: boolean;
  encryptionRequired: boolean;
  accessControl?: AccessControl;
  invalidationRules: InvalidationRule[];
}

export interface InvalidationRule {
  trigger: InvalidationType;
  pattern: string; // Regex pattern for cache keys
  action: InvalidationAction;
  priority: InvalidationPriority;
  cascading: boolean; // Whether to invalidate dependent entries
}

export enum InvalidationAction {
  DELETE = 'delete',           // Remove from cache
  REFRESH = 'refresh',         // Refresh from source
  MARK_STALE = 'mark_stale',   // Mark as stale but keep
  DOWNGRADE_TTL = 'downgrade_ttl' // Reduce TTL
}

export enum EvictionPolicy {
  LRU = 'lru',           // Least Recently Used
  LFU = 'lfu',           // Least Frequently Used
  FIFO = 'fifo',         // First In First Out
  TTL = 'ttl',           // Time To Live based
  SIZE = 'size',         // Size based
  PRIORITY = 'priority'  // Priority based
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  compressionRatio: number;
  averageResponseTime: number;
  evictionsCount: number;
  invalidationsCount: number;
  namespaceStats: NamespaceStats[];
  performanceMetrics: PerformanceMetrics;
}

export interface NamespaceStats {
  namespace: string;
  entries: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  averageResponseTime: number;
  oldestEntry: Date;
  newestEntry: Date;
}

export interface PerformanceMetrics {
  averageGetTime: number;
  averageSetTime: number;
  averageDeleteTime: number;
  peakMemoryUsage: number;
  gcCollections: number;
  compressionSavings: number;
  networkRequestsSaved: number;
}

export interface CacheQuery {
  namespace?: string;
  tags?: string[];
  pattern?: string;
  source?: CacheSource;
  minAge?: Date;
  maxAge?: Date;
  riskLevel?: RiskLevel;
  dataClassification?: DataClassification;
  limit?: number;
  offset?: number;
}

export interface CacheBatch {
  operations: CacheOperation[];
  atomicExecution: boolean;
  failurePolicy: BatchFailurePolicy;
}

export interface CacheOperation {
  type: CacheOperationType;
  key: string;
  value?: any;
  metadata?: Partial<CacheMetadata>;
  ttl?: number;
}

export enum CacheOperationType {
  GET = 'get',
  SET = 'set',
  DELETE = 'delete',
  INVALIDATE = 'invalidate',
  REFRESH = 'refresh',
  TOUCH = 'touch' // Update last accessed time
}

export enum BatchFailurePolicy {
  FAIL_FAST = 'fail_fast',       // Stop on first failure
  BEST_EFFORT = 'best_effort',   // Continue despite failures
  ROLLBACK = 'rollback'          // Rollback all changes on failure
}

export interface CacheProvider {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: T, metadata: CacheMetadata, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  invalidate(pattern: string, reason: string): Promise<number>;
  clear(namespace?: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  touch(key: string): Promise<boolean>;
  batch(operations: CacheBatch): Promise<BatchResult>;
  query(criteria: CacheQuery): Promise<CacheEntry[]>;
  getStats(): Promise<CacheStats>;
  monitor(callback: (event: CacheEvent) => void): void;
}

export interface BatchResult {
  success: boolean;
  results: OperationResult[];
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  executionTime: number;
}

export interface OperationResult {
  operation: CacheOperation;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

export interface CacheEvent {
  type: CacheEventType;
  timestamp: Date;
  key?: string;
  namespace?: string;
  metadata?: Record<string, any>;
}

export enum CacheEventType {
  ENTRY_ADDED = 'entry_added',
  ENTRY_UPDATED = 'entry_updated',
  ENTRY_DELETED = 'entry_deleted',
  ENTRY_EXPIRED = 'entry_expired',
  ENTRY_EVICTED = 'entry_evicted',
  CACHE_CLEARED = 'cache_cleared',
  INVALIDATION_TRIGGERED = 'invalidation_triggered',
  MEMORY_WARNING = 'memory_warning',
  PERFORMANCE_DEGRADATION = 'performance_degradation'
}

// Policy Decision Cache specific interfaces
export interface PolicyDecisionCache {
  getCachedDecision(input: PolicyDecisionInput): Promise<PolicyDecisionCacheEntry | null>;
  cacheDecision(entry: PolicyDecisionCacheEntry): Promise<boolean>;
  invalidatePolicyDecisions(policyId: string, reason: string): Promise<number>;
  invalidateUserDecisions(userId: string, reason: string): Promise<number>;
  invalidateResourceDecisions(resource: string, reason: string): Promise<number>;
  getDecisionStats(): Promise<PolicyDecisionStats>;
  warmupCache(patterns: string[]): Promise<WarmupResult>;
}

export interface PolicyDecisionStats extends CacheStats {
  policyHitRates: Record<string, number>;
  userHitRates: Record<string, number>;
  resourceHitRates: Record<string, number>;
  averageDecisionTime: number;
  cacheEffectiveness: number;
  invalidationReasons: Record<string, number>;
}

export interface WarmupResult {
  success: boolean;
  entriesLoaded: number;
  loadTime: number;
  errors: string[];
}

// Configuration interfaces
export interface CacheKeyBuilder {
  buildPolicyDecisionKey(input: PolicyDecisionInput): string;
  buildConsentKey(userId: string, resource: string, purpose: string): string;
  buildPermissionKey(userId: string, action: string, resource: string): string;
  buildConfigurationKey(configType: string, version: string): string;
  buildAuditKey(entityType: string, entityId: string): string;
  parseKey(key: string): ParsedCacheKey;
}

export interface ParsedCacheKey {
  namespace: string;
  type: string;
  identifier: string;
  version?: string;
  parameters?: Record<string, any>;
  valid: boolean;
}

export interface CacheMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  getHealthStatus(): CacheHealthStatus;
  triggerMaintenence(): Promise<MaintenanceResult>;
  exportMetrics(): Promise<CacheMetricsExport>;
}

export interface CacheHealthStatus {
  healthy: boolean;
  issues: HealthIssue[];
  recommendations: string[];
  metrics: {
    hitRate: number;
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
}

export interface HealthIssue {
  severity: IssueSeverity;
  type: IssueType;
  description: string;
  recommendation: string;
  affectedNamespaces: string[];
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IssueType {
  MEMORY_PRESSURE = 'memory_pressure',
  HIGH_MISS_RATE = 'high_miss_rate',
  SLOW_RESPONSE = 'slow_response',
  FREQUENT_EVICTIONS = 'frequent_evictions',
  INVALIDATION_STORM = 'invalidation_storm',
  CONFIGURATION_ISSUE = 'configuration_issue'
}

export interface MaintenanceResult {
  entriesEvicted: number;
  memoryFreed: number;
  indexesRebuilt: number;
  corruptedEntriesFixed: number;
  executionTime: number;
  errors: string[];
}

export interface CacheMetricsExport {
  timestamp: Date;
  format: 'json' | 'csv' | 'prometheus';
  data: string;
  compressed: boolean;
  checksum: string;
}