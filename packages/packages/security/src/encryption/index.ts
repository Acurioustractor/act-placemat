/**
 * Encryption Module Export Index for ACT Placemat
 * 
 * Comprehensive end-to-end encryption module including TLS configuration,
 * secure server implementation, and certificate management
 */

// === TLS CONFIGURATION ===
export { 
  TLSConfigurationService,
  TLSConfigSchema,
  CipherSuites,
  createHighSecurityTLSConfig,
  createMutualTLSConfig,
  createISMCompliantTLSConfig
} from './TLSConfig';

export type { TLSConfig } from './TLSConfig';

// === SECURE SERVER ===
export {
  SecureServer,
  SecureServerConfigSchema
} from './SecureServer';

export type {
  SecureServerConfig,
  ConnectionMetrics,
  SecurityEvent
} from './SecureServer';

// === CERTIFICATE MANAGEMENT ===
export {
  CertificateManager,
  CertificateConfigSchema,
  createServerCertificateManager,
  createCACertificateManager
} from './CertificateManager';

export type {
  CertificateConfig,
  CertificateInfo,
  CertificateValidationResult
} from './CertificateManager';

// === DATA ENCRYPTION AT REST ===
export {
  DataEncryptionService,
  EncryptionConfigSchema
} from './DataEncryption';

export type {
  EncryptionConfig,
  EncryptionKey,
  EncryptedData,
  EncryptionResult,
  DecryptionResult,
  KeyManager
} from './DataEncryption';

// === KEY MANAGEMENT ===
export {
  FileBasedKeyManager,
  KeyManagerConfigSchema
} from './KeyManager';

export type {
  KeyManagerConfig,
  StoredKey,
  KeyBackup
} from './KeyManager';

// === DATABASE ENCRYPTION ===
export {
  DatabaseEncryptionService,
  DatabaseEncryptionConfigSchema
} from './DatabaseEncryption';

export type {
  DatabaseEncryptionConfig,
  EncryptedFieldDefinition,
  EncryptedRecord,
  SearchToken,
  DatabaseMigrationResult
} from './DatabaseEncryption';

// === FILE ENCRYPTION ===
export {
  FileEncryptionService,
  FileEncryptionConfigSchema
} from './FileEncryption';

export type {
  FileEncryptionConfig,
  EncryptedFileMetadata,
  FileEncryptionResult,
  FileDecryptionResult,
  DirectoryEncryptionResult
} from './FileEncryption';

// === FACTORY FUNCTIONS ===

/**
 * Create complete data encryption system with all components
 */
export function createDataEncryptionSystem(options: {
  keyStorePath: string;
  encryptedDataPath: string;
  masterKey: string;
  enableIndigenousProtection?: boolean;
  australianCompliance?: boolean;
}) {
  const {
    keyStorePath,
    encryptedDataPath,
    masterKey,
    enableIndigenousProtection = true,
    australianCompliance = true
  } = options;

  // Key manager configuration
  const keyManagerConfig: KeyManagerConfig = {
    keyStorePath,
    enableBackup: true,
    backupEncryption: true,
    requireAustralianGeneration: australianCompliance,
    enableFIPSMode: australianCompliance,
    auditKeyOperations: true,
    enableCommunityKeys: enableIndigenousProtection,
    requireCommunityConsent: enableIndigenousProtection,
    enableAutoRotation: true
  };

  // Encryption configuration
  const encryptionConfig: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'scrypt',
    keyRotationDays: 90,
    dataClassification: 'internal',
    requireAustralianKeys: australianCompliance,
    enableDataResidency: australianCompliance,
    indigenousDataProtection: enableIndigenousProtection,
    culturalProtocolCompliance: enableIndigenousProtection,
    enableIntegrityChecks: true,
    enableTimestamps: true,
    enableAuditTrail: true
  };

  // Database encryption configuration
  const databaseConfig: DatabaseEncryptionConfig = {
    encryptedFields: {},
    enableMigration: true,
    enableSearchableEncryption: true,
    auditAllAccess: true,
    enableIndigenousProtection,
    enforceDataClassification: true
  };

  // File encryption configuration
  const fileConfig: FileEncryptionConfig = {
    encryptedRoot: encryptedDataPath,
    keyStorePath,
    enableCompression: true,
    enableIntegrityVerification: true,
    shredOriginalFiles: true,
    enforceDataResidency: australianCompliance,
    auditFileOperations: true,
    enableIndigenousProtection
  };

  // Create services
  const keyManager = new FileBasedKeyManager(keyManagerConfig, masterKey);
  const dataEncryption = new DataEncryptionService(encryptionConfig, keyManager);
  const databaseEncryption = new DatabaseEncryptionService(
    databaseConfig,
    encryptionConfig,
    keyManagerConfig,
    masterKey
  );
  const fileEncryption = new FileEncryptionService(
    fileConfig,
    encryptionConfig,
    keyManagerConfig,
    masterKey
  );

  return {
    keyManager,
    dataEncryption,
    databaseEncryption,
    fileEncryption
  };
}

/**
 * Create complete secure HTTPS server with certificate management
 */
export function createSecureHTTPSServer(options: {
  domain: string;
  port?: number;
  certificateDir: string;
  enableMutualTLS?: boolean;
  australianCompliance?: boolean;
}) {
  const {
    domain,
    port = 443,
    certificateDir,
    enableMutualTLS = false,
    australianCompliance = true
  } = options;

  // Create certificate manager
  const certManager = createServerCertificateManager(domain, certificateDir, {
    subjectAltNames: [domain, `*.${domain}`, 'localhost'],
    autoRenew: true,
    renewBeforeDays: 30,
    enableAustralianConstraints: australianCompliance
  });

  // Create TLS configuration
  const tlsConfig = australianCompliance
    ? createISMCompliantTLSConfig(
        `${certificateDir}/${domain}.crt`,
        `${certificateDir}/${domain}.key`
      )
    : createHighSecurityTLSConfig(
        `${certificateDir}/${domain}.crt`,
        `${certificateDir}/${domain}.key`
      );

  // Enable mutual TLS if requested
  if (enableMutualTLS) {
    tlsConfig.mutualTLS = {
      enabled: true,
      clientCertificateRequired: true,
      trustedCAs: [`${certificateDir}/ca.crt`],
      verifyClientCert: true
    };
  }

  // Create secure server
  const server = new SecureServer({
    port,
    tlsConfig,
    forceHttps: true,
    redirectHttpToHttps: true,
    enableSecurityHeaders: true,
    enforceDataResidency: australianCompliance,
    enableAuditLogging: true
  });

  return {
    server,
    certificateManager: certManager,
    tlsService: server.getTLSService()
  };
}

/**
 * Create development server with self-signed certificates
 */
export async function createDevelopmentServer(options: {
  domain?: string;
  port?: number;
  certificateDir: string;
}) {
  const {
    domain = 'localhost',
    port = 8443,
    certificateDir
  } = options;

  // Create certificate manager for development
  const certManager = createServerCertificateManager(domain, certificateDir, {
    subjectAltNames: [domain, 'localhost', '127.0.0.1'],
    validityDays: 30, // Short validity for development
    autoRenew: false, // Manual renewal for development
    enableAustralianConstraints: false // Less strict for development
  });

  // Generate certificate if it doesn't exist
  try {
    await certManager.validateCertificate();
  } catch (error) {
    console.log('Generating development certificate...');
    await certManager.generateCertificate();
  }

  // Create relaxed TLS configuration for development
  const tlsConfig = createHighSecurityTLSConfig(
    `${certificateDir}/${domain}.crt`,
    `${certificateDir}/${domain}.key`
  );

  // Relax some settings for development
  tlsConfig.certificateConfig.allowSelfSigned = true;
  tlsConfig.securityFeatures.enableHSTS = false;
  tlsConfig.monitoring.logAllConnections = false;

  // Create server
  const server = new SecureServer({
    port,
    httpPort: port === 8443 ? 8080 : port - 363, // HTTP port for redirects
    tlsConfig,
    forceHttps: false, // Allow HTTP in development
    redirectHttpToHttps: true,
    enableSecurityHeaders: true,
    enforceDataResidency: false, // Not required in development
    enableAuditLogging: false // Reduce logging in development
  });

  return {
    server,
    certificateManager: certManager,
    tlsService: server.getTLSService()
  };
}

/**
 * Create production server with CA-signed certificates
 */
export function createProductionServer(options: {
  domain: string;
  port?: number;
  certificateDir: string;
  caCertificatePath: string;
  enableMutualTLS?: boolean;
  monitoringEnabled?: boolean;
}) {
  const {
    domain,
    port = 443,
    certificateDir,
    caCertificatePath,
    enableMutualTLS = false,
    monitoringEnabled = true
  } = options;

  // Create certificate manager with CA signing
  const certManager = createServerCertificateManager(domain, certificateDir, {
    subjectAltNames: [domain, `*.${domain}`],
    caCertificatePath,
    autoRenew: true,
    renewBeforeDays: 14, // Earlier renewal for production
    enableAustralianConstraints: true,
    dataResidencyRequired: true
  });

  // Create production TLS configuration
  const tlsConfig = createISMCompliantTLSConfig(
    `${certificateDir}/${domain}.crt`,
    `${certificateDir}/${domain}.key`
  );

  // Set CA certificate
  tlsConfig.certificateConfig.caCertificatePath = caCertificatePath;

  // Configure mutual TLS if enabled
  if (enableMutualTLS) {
    tlsConfig.mutualTLS = {
      enabled: true,
      clientCertificateRequired: true,
      trustedCAs: [caCertificatePath],
      verifyClientCert: true
    };
  }

  // Create production server
  const server = new SecureServer({
    port,
    httpPort: 80,
    tlsConfig,
    forceHttps: true,
    redirectHttpToHttps: true,
    enableSecurityHeaders: true,
    enforceDataResidency: true,
    enableAuditLogging: true,
    enableConnectionLogging: monitoringEnabled,
    logFailedConnections: true,
    enableMetrics: monitoringEnabled
  });

  return {
    server,
    certificateManager: certManager,
    tlsService: server.getTLSService()
  };
}

// === UTILITY FUNCTIONS ===

/**
 * Validate encryption configuration
 */
export function validateEncryptionConfig(config: {
  tlsConfig: any;
  certificateConfig: any;
}): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Validate TLS configuration
  try {
    const tlsService = new TLSConfigurationService(config.tlsConfig);
    const tlsValidation = tlsService.validateConfiguration();
    
    errors.push(...tlsValidation.errors);
    warnings.push(...tlsValidation.warnings);
  } catch (error) {
    errors.push(`TLS configuration invalid: ${(error as Error).message}`);
  }

  // Validate certificate configuration
  try {
    const certConfig = CertificateConfigSchema.parse(config.certificateConfig);
    
    // Check key size
    if (certConfig.algorithm === 'RSA' && certConfig.keySize < 2048) {
      warnings.push('RSA key size below 2048 bits');
    }
    
    // Check validity period
    if (certConfig.validityDays > 825) { // Chrome/Safari limit
      warnings.push('Certificate validity period exceeds browser limits (825 days)');
    }
    
    // Check Australian compliance
    if (certConfig.enableAustralianConstraints) {
      if (certConfig.country !== 'AU') {
        warnings.push('Certificate country not set to AU for Australian compliance');
      }
      
      if (!certConfig.dataResidencyRequired) {
        recommendations.push('Enable data residency requirements for Australian compliance');
      }
    }
    
  } catch (error) {
    errors.push(`Certificate configuration invalid: ${(error as Error).message}`);
  }

  // Security recommendations
  if (config.tlsConfig?.minVersion !== 'TLSv1.3') {
    recommendations.push('Use TLS 1.3 for maximum security');
  }
  
  if (!config.tlsConfig?.securityFeatures?.requirePFS) {
    recommendations.push('Enable Perfect Forward Secrecy');
  }
  
  if (!config.tlsConfig?.securityFeatures?.enableHSTS) {
    recommendations.push('Enable HSTS for web applications');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Get encryption health status
 */
export async function getEncryptionHealthStatus(
  server: SecureServer,
  certManager: CertificateManager
): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  checks: Record<string, boolean>;
  details: Record<string, any>;
}> {
  const checks: Record<string, boolean> = {};
  const details: Record<string, any> = {};

  // Server health
  const serverHealth = server.getHealthStatus();
  checks.serverRunning = serverHealth.status !== 'critical';
  details.serverStatus = serverHealth;

  // Certificate validation
  try {
    const certValidation = await certManager.validateCertificate();
    checks.certificateValid = certValidation.valid;
    checks.certificateNotExpiring = certValidation.daysUntilExpiry > 7;
    
    details.certificateStatus = {
      valid: certValidation.valid,
      daysUntilExpiry: certValidation.daysUntilExpiry,
      errors: certValidation.errors,
      warnings: certValidation.warnings
    };
  } catch (error) {
    checks.certificateValid = false;
    details.certificateError = (error as Error).message;
  }

  // TLS configuration
  const tlsValidation = server.getTLSService().validateConfiguration();
  checks.tlsConfigValid = tlsValidation.valid;
  details.tlsValidation = tlsValidation;

  // Connection metrics
  const metrics = server.getMetrics();
  checks.lowErrorRate = metrics.sslErrors < metrics.totalConnections * 0.01;
  details.connectionMetrics = metrics;

  // Overall status
  const criticalChecks = ['serverRunning', 'certificateValid', 'tlsConfigValid'];
  const hasCriticalFailures = criticalChecks.some(check => !checks[check]);
  const hasWarnings = !checks.certificateNotExpiring || !checks.lowErrorRate;

  const status = hasCriticalFailures ? 'critical' : (hasWarnings ? 'warning' : 'healthy');

  return {
    status,
    checks,
    details
  };
}

/**
 * Generate security report
 */
export async function generateSecurityReport(
  server: SecureServer,
  certManager: CertificateManager
): Promise<{
  timestamp: Date;
  summary: string;
  status: 'healthy' | 'warning' | 'critical';
  encryption: any;
  certificates: any;
  connections: any;
  securityEvents: any;
  recommendations: string[];
}> {
  const healthStatus = await getEncryptionHealthStatus(server, certManager);
  const certInfo = await certManager.getCertificateInfo();
  const renewalStatus = certManager.getRenewalStatus();
  const metrics = server.getMetrics();
  const securityEvents = server.getSecurityEvents(50);

  const recommendations: string[] = [];

  // Generate recommendations based on health status
  if (!healthStatus.checks.certificateNotExpiring) {
    recommendations.push('Certificate renewal required soon');
  }
  
  if (!healthStatus.checks.lowErrorRate) {
    recommendations.push('Investigate high SSL error rate');
  }
  
  if (metrics.connectionsByProtocol['TLSv1.2'] > metrics.connectionsByProtocol['TLSv1.3']) {
    recommendations.push('Encourage clients to upgrade to TLS 1.3');
  }

  return {
    timestamp: new Date(),
    summary: `Encryption system ${healthStatus.status}. ${Object.values(healthStatus.checks).filter(Boolean).length}/${Object.keys(healthStatus.checks).length} checks passed.`,
    status: healthStatus.status,
    encryption: {
      tlsVersions: metrics.connectionsByProtocol,
      cipherSuites: metrics.connectionsByCipher,
      errorRate: metrics.sslErrors / Math.max(metrics.totalConnections, 1)
    },
    certificates: {
      info: certInfo,
      renewalStatus,
      needsRenewal: await certManager.needsRenewal()
    },
    connections: {
      total: metrics.totalConnections,
      active: metrics.activeConnections,
      failed: metrics.failedConnections,
      averageHandshakeTime: metrics.averageHandshakeTime
    },
    securityEvents: {
      total: securityEvents.length,
      byType: securityEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: securityEvents.slice(-10)
    },
    recommendations
  };
}