/**
 * Audit Logging System Export Index for ACT Placemat
 * 
 * Comprehensive tamper-proof audit logging with Australian compliance,
 * Indigenous sovereignty protections, and integrity verification
 */

// === CORE AUDIT LOGGER ===
export {
  AuditLogger,
  AuditEventSchema,
  AuditConfigSchema,
  type AuditEvent,
  type AuditConfig,
  type AuditStorage,
  type AuditQueryCriteria,
  type AuditStatistics
} from './AuditLogger';

// === FILE-BASED STORAGE ===
export {
  FileBasedAuditStorage,
  FileStorageConfigSchema,
  type FileStorageConfig
} from './FileBasedAuditStorage';

// === DATABASE STORAGE ===
export {
  DatabaseAuditStorage,
  DatabaseStorageConfigSchema,
  type DatabaseStorageConfig
} from './DatabaseAuditStorage';

// === FACTORY FUNCTIONS ===

/**
 * Create audit logger with file-based storage
 */
export function createFileBasedAuditLogger(options: {
  logDirectory: string;
  indexDirectory: string;
  archiveDirectory?: string;
  enableDigitalSignatures?: boolean;
  signingKeyPath?: string;
  enableBlockchainMode?: boolean;
  enableRealTimeAlerts?: boolean;
  enforceAustralianCompliance?: boolean;
  enableIndigenousProtection?: boolean;
}): AuditLogger {
  const {
    logDirectory,
    indexDirectory,
    archiveDirectory,
    enableDigitalSignatures = true,
    signingKeyPath,
    enableBlockchainMode = true,
    enableRealTimeAlerts = true,
    enforceAustralianCompliance = true,
    enableIndigenousProtection = true
  } = options;

  // File storage configuration
  const storageConfig: FileStorageConfig = {
    logDirectory,
    indexDirectory,
    archiveDirectory,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFilesPerDirectory: 1000,
    fileExtension: '.audit',
    compressionEnabled: true,
    enableChecksums: true,
    checksumAlgorithm: 'sha256',
    enableSignatures: enableDigitalSignatures,
    signingKeyPath,
    enableIndexing: true,
    indexFlushInterval: 5000,
    rebuildIndexOnStart: false,
    bufferSize: 64 * 1024,
    enableAsync: true,
    writeTimeout: 30000,
    enforceDataResidency: enforceAustralianCompliance,
    enableWriteOnce: true,
    enableTamperDetection: true
  };

  // Audit logger configuration
  const auditConfig: AuditConfig = {
    storageType: 'file',
    enableDigitalSignatures,
    signingKeyPath,
    enableBlockchainMode,
    defaultRetentionDays: 2555, // 7 years for Australian compliance
    enableAutoArchive: true,
    archivePath: archiveDirectory,
    enableCompression: true,
    enableRealTimeAlerts,
    alertThresholds: {
      criticalEvents: 1,
      highSeverityEvents: 5,
      failedLogins: 10,
      dataAccessViolations: 3
    },
    enforceAustralianCompliance,
    enableIndigenousProtection,
    enableDataResidencyTracking: enforceAustralianCompliance,
    enableBatching: true,
    batchSize: 100,
    flushIntervalMs: 5000,
    enableAsyncLogging: true,
    enableTamperDetection: true,
    enableEncryption: true
  };

  // Create storage and logger
  const storage = new FileBasedAuditStorage(storageConfig);
  return new AuditLogger(auditConfig, storage);
}

/**
 * Create audit logger with database storage
 */
export function createDatabaseAuditLogger(options: {
  connectionString: string;
  tableName?: string;
  archiveTableName?: string;
  enableDigitalSignatures?: boolean;
  enableBlockchainMode?: boolean;
  enableRealTimeAlerts?: boolean;
  enforceAustralianCompliance?: boolean;
  enableIndigenousProtection?: boolean;
  enablePartitioning?: boolean;
  enableImmutableTables?: boolean;
}): AuditLogger {
  const {
    connectionString,
    tableName = 'audit_events',
    archiveTableName = 'audit_archive',
    enableDigitalSignatures = true,
    enableBlockchainMode = true,
    enableRealTimeAlerts = true,
    enforceAustralianCompliance = true,
    enableIndigenousProtection = true,
    enablePartitioning = true,
    enableImmutableTables = true
  } = options;

  // Database storage configuration
  const storageConfig: DatabaseStorageConfig = {
    connectionString,
    tableName,
    indexTableName: 'audit_indexes',
    archiveTableName,
    enablePartitioning,
    partitionBy: 'date',
    enableCompression: true,
    batchSize: 1000,
    connectionPoolSize: 10,
    queryTimeout: 30000,
    enablePreparedStatements: true,
    enableImmutableTables,
    enableRowLevelSecurity: true,
    enableChecksums: true,
    enableAuditTriggers: true,
    enableCustomIndexes: true,
    indexColumns: ['event_type', 'severity', 'actor_id', 'timestamp', 'community_id'],
    enableFullTextSearch: true,
    enableDataResidency: enforceAustralianCompliance,
    enableEncryptionAtRest: true,
    auditTableAccess: true
  };

  // Audit logger configuration
  const auditConfig: AuditConfig = {
    storageType: 'database',
    enableDigitalSignatures,
    enableBlockchainMode,
    defaultRetentionDays: 2555, // 7 years for Australian compliance
    enableAutoArchive: true,
    enableCompression: true,
    enableRealTimeAlerts,
    alertThresholds: {
      criticalEvents: 1,
      highSeverityEvents: 5,
      failedLogins: 10,
      dataAccessViolations: 3
    },
    enforceAustralianCompliance,
    enableIndigenousProtection,
    enableDataResidencyTracking: enforceAustralianCompliance,
    enableBatching: true,
    batchSize: 1000,
    flushIntervalMs: 5000,
    enableAsyncLogging: true,
    enableTamperDetection: true,
    enableEncryption: true
  };

  // Create storage and logger
  const storage = new DatabaseAuditStorage(storageConfig);
  return new AuditLogger(auditConfig, storage);
}

/**
 * Create development audit logger with minimal configuration
 */
export function createDevelopmentAuditLogger(options: {
  logDirectory: string;
  enableConsoleOutput?: boolean;
}): AuditLogger {
  const { logDirectory, enableConsoleOutput = true } = options;

  const config: AuditConfig = {
    storageType: 'file',
    enableDigitalSignatures: false, // Simplified for development
    enableBlockchainMode: false,
    defaultRetentionDays: 30, // Short retention for development
    enableAutoArchive: false,
    enableRealTimeAlerts: enableConsoleOutput,
    alertThresholds: {
      criticalEvents: 1,
      highSeverityEvents: 10,
      failedLogins: 20,
      dataAccessViolations: 10
    },
    enforceAustralianCompliance: false,
    enableIndigenousProtection: false,
    enableDataResidencyTracking: false,
    enableBatching: false,
    batchSize: 10,
    flushIntervalMs: 1000,
    enableAsyncLogging: false,
    enableTamperDetection: false,
    enableEncryption: false
  };

  const storageConfig: FileStorageConfig = {
    logDirectory,
    indexDirectory: `${logDirectory}/indexes`,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    enableChecksums: false,
    enableSignatures: false,
    enableIndexing: true,
    enableAsync: false,
    enforceDataResidency: false,
    enableWriteOnce: false,
    enableTamperDetection: false
  };

  const storage = new FileBasedAuditStorage(storageConfig);
  return new AuditLogger(config, storage);
}

/**
 * Create production audit logger with high security
 */
export function createProductionAuditLogger(options: {
  connectionString: string;
  signingKeyPath: string;
  archiveConnectionString?: string;
  enableHighAvailability?: boolean;
}): AuditLogger {
  const {
    connectionString,
    signingKeyPath,
    archiveConnectionString,
    enableHighAvailability = true
  } = options;

  const config: AuditConfig = {
    storageType: 'database',
    enableDigitalSignatures: true,
    signingKeyPath,
    enableBlockchainMode: true,
    defaultRetentionDays: 2555, // 7 years Australian compliance
    enableAutoArchive: true,
    enableCompression: true,
    enableRealTimeAlerts: true,
    alertThresholds: {
      criticalEvents: 1,
      highSeverityEvents: 3,
      failedLogins: 5,
      dataAccessViolations: 2
    },
    enforceAustralianCompliance: true,
    enableIndigenousProtection: true,
    enableDataResidencyTracking: true,
    enableBatching: true,
    batchSize: 1000,
    flushIntervalMs: 2000,
    enableAsyncLogging: true,
    enableTamperDetection: true,
    enableEncryption: true
  };

  const storageConfig: DatabaseStorageConfig = {
    connectionString,
    tableName: 'audit_events',
    archiveTableName: archiveConnectionString ? 'audit_archive' : 'audit_events_archive',
    enablePartitioning: true,
    partitionBy: 'date',
    enableCompression: true,
    batchSize: 1000,
    connectionPoolSize: enableHighAvailability ? 20 : 10,
    queryTimeout: 15000,
    enablePreparedStatements: true,
    enableImmutableTables: true,
    enableRowLevelSecurity: true,
    enableChecksums: true,
    enableAuditTriggers: true,
    enableCustomIndexes: true,
    indexColumns: [
      'event_type', 'severity', 'actor_id', 'timestamp', 
      'community_id', 'security_classification', 'outcome'
    ],
    enableFullTextSearch: true,
    enableDataResidency: true,
    enableEncryptionAtRest: true,
    auditTableAccess: true
  };

  const storage = new DatabaseAuditStorage(storageConfig);
  return new AuditLogger(config, storage);
}

// === UTILITY FUNCTIONS ===

/**
 * Validate audit logger configuration
 */
export function validateAuditConfig(config: AuditConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate storage configuration
  if (!config.storageType) {
    errors.push('Storage type is required');
  }

  // Validate digital signatures
  if (config.enableDigitalSignatures && !config.signingKeyPath) {
    warnings.push('Digital signatures enabled but no signing key path provided');
  }

  // Validate Australian compliance
  if (config.enforceAustralianCompliance) {
    if (config.defaultRetentionDays < 2555) {
      warnings.push('Retention period below 7 years may not meet Australian compliance requirements');
    }

    if (!config.enableDataResidencyTracking) {
      warnings.push('Data residency tracking recommended for Australian compliance');
    }
  }

  // Validate Indigenous protection
  if (config.enableIndigenousProtection) {
    if (!config.enforceAustralianCompliance) {
      warnings.push('Australian compliance recommended when Indigenous protection is enabled');
    }
  }

  // Validate real-time alerts
  if (config.enableRealTimeAlerts) {
    if (!config.alertThresholds.criticalEvents) {
      warnings.push('No critical event threshold set for real-time alerts');
    }
  }

  // Validate performance settings
  if (config.enableAsyncLogging && config.batchSize < 10) {
    warnings.push('Small batch size may impact performance with async logging');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get audit system health status
 */
export async function getAuditSystemHealth(logger: AuditLogger): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  checks: Record<string, boolean>;
  details: Record<string, any>;
}> {
  const checks: Record<string, boolean> = {};
  const details: Record<string, any> = {};

  try {
    // Test basic logging
    const testEventId = await logger.logEvent({
      eventType: 'system_access',
      severity: 'low',
      action: 'health_check',
      description: 'Audit system health check',
      outcome: 'success',
      source: {
        service: 'audit-system',
        component: 'health-check'
      },
      actor: {
        type: 'system',
        id: 'health-checker'
      },
      security: {
        classification: 'internal',
        riskLevel: 'low',
        requiresNotification: false,
        complianceFrameworks: []
      },
      metadata: {},
      compliance: {
        australianPrivacyAct: false,
        indigenousSovereignty: false,
        dataResidency: false
      },
      timestamp: new Date()
    });

    checks.canLogEvents = !!testEventId;
    details.testEventId = testEventId;

    // Test event retrieval
    const retrievedEvent = await logger.getEvent(testEventId);
    checks.canRetrieveEvents = !!retrievedEvent;

    // Test integrity verification
    const integrityResult = await logger.verifyIntegrity();
    checks.integrityValid = integrityResult.valid;
    details.integrityErrors = integrityResult.errors;

    // Test statistics
    const stats = await logger.getStatistics();
    checks.canGetStatistics = stats.totalEvents >= 0;
    details.statistics = stats;

  } catch (error) {
    checks.systemOperational = false;
    details.error = (error as Error).message;
  }

  // Overall health assessment
  const criticalChecks = ['canLogEvents', 'integrityValid'];
  const hasCriticalFailures = criticalChecks.some(check => !checks[check]);
  const hasWarnings = !checks.canRetrieveEvents || !checks.canGetStatistics;

  const status = hasCriticalFailures ? 'critical' : (hasWarnings ? 'warning' : 'healthy');

  return {
    status,
    checks,
    details
  };
}

/**
 * Generate audit system report
 */
export async function generateAuditReport(logger: AuditLogger): Promise<{
  timestamp: Date;
  summary: string;
  statistics: AuditStatistics;
  integrityStatus: { valid: boolean; errors: string[] };
  recommendations: string[];
}> {
  const timestamp = new Date();
  const statistics = await logger.getStatistics();
  const integrityStatus = await logger.verifyIntegrity();
  const recommendations: string[] = [];

  // Generate recommendations based on statistics
  if (statistics.criticalEventsLastHour > 5) {
    recommendations.push('High number of critical events detected - investigate immediately');
  }

  if (statistics.integrityViolations > 0) {
    recommendations.push('Integrity violations detected - verify system security');
  }

  if (statistics.eventsByType.security_violation > statistics.totalEvents * 0.1) {
    recommendations.push('High rate of security violations - review security controls');
  }

  const summary = `Audit system processed ${statistics.totalEvents} events. ` +
    `${statistics.eventsToday} events today, ${statistics.criticalEventsLastHour} critical events in last hour. ` +
    `Integrity: ${integrityStatus.valid ? 'Valid' : 'Issues detected'}.`;

  return {
    timestamp,
    summary,
    statistics,
    integrityStatus,
    recommendations
  };
}