/**
 * Attestation Storage and Digital Signing System
 * 
 * Complete system for secure attestation storage with cryptographic signatures,
 * immutable audit trails, and Indigenous data sovereignty compliance
 */

// Core types
export * from './types';

// Main components
export { DigitalSigningServiceImpl, InMemoryKeyStorage } from './DigitalSigningService';
export type { KeyStorage, CertificateService, TimestampService } from './DigitalSigningService';

export { PostgreSQLAttestationStorage } from './AttestationStorage';
export type { DatabaseConnection } from './AttestationStorage';

export { AttestationLifecycleManager } from './AttestationLifecycleManager';
export type { 
  AttestationRequest, 
  AttestationResponse, 
  RevocationRequest,
  EventHandler 
} from './AttestationLifecycleManager';

export { 
  AttestationAuditLoggerImpl, 
  InMemoryAuditStorage 
} from './AttestationAuditLogger';
export type {
  AuditEntry,
  AuditQuery,
  AuditReport,
  AuditContext,
  AuditStorage,
  AttestationAuditLogger
} from './AttestationAuditLogger';

// Factory function for easy system setup
export const createAttestationSystem = async (config: {
  database: any; // Database connection
  encryptionKey: string;
  integrityKey: string;
  auditStorage?: any;
  enableCulturalValidation?: boolean;
}) => {
  // Initialize key storage
  const keyStorage = new InMemoryKeyStorage();
  
  // Initialize signing service
  const signingService = new DigitalSigningServiceImpl(keyStorage);
  
  // Initialize attestation storage
  const attestationStorage = new PostgreSQLAttestationStorage(
    config.database,
    config.integrityKey
  );
  
  // Initialize audit storage and logger
  const auditStorage = config.auditStorage || new InMemoryAuditStorage();
  const auditLogger = new AttestationAuditLoggerImpl(auditStorage, config.integrityKey);
  
  // Initialize lifecycle manager
  const lifecycleManager = new AttestationLifecycleManager(
    attestationStorage,
    signingService,
    config.enableCulturalValidation ?? true
  );
  
  // Register audit logger as event handler
  lifecycleManager.registerEventHandler('attestation.created', auditLogger);
  lifecycleManager.registerEventHandler('attestation.signed', auditLogger);
  lifecycleManager.registerEventHandler('attestation.verified', auditLogger);
  lifecycleManager.registerEventHandler('attestation.revoked', auditLogger);
  lifecycleManager.registerEventHandler('attestation.expired', auditLogger);

  return {
    signingService,
    attestationStorage,
    lifecycleManager,
    auditLogger,
    keyStorage
  };
};

// Constants for common configurations
export const SUPPORTED_ALGORITHMS = [
  'RSA-PKCS1-SHA256',
  'RSA-PSS-SHA256', 
  'ECDSA-P256-SHA256',
  'ECDSA-P384-SHA384',
  'ECDSA-P521-SHA512',
  'EdDSA-Ed25519'
] as const;

export const CULTURAL_TERRITORIES = [
  'Wurundjeri Country',
  'Bundjalung Country',
  'Yolŋu Country',
  'Arrernte Country',
  'Noongar Country'
] as const;

export const COMPLIANCE_FRAMEWORKS = [
  'privacy_act_1988',
  'austrac',
  'acnc',
  'care_principles',
  'corporations_act',
  'native_title_act'
] as const;

export const DEFAULT_RETENTION_PERIODS = {
  GENERAL_ATTESTATION: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  CULTURAL_ATTESTATION: 50 * 365 * 24 * 60 * 60 * 1000, // 50 years
  AUDIT_LOGS: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  CULTURAL_AUDIT_LOGS: 50 * 365 * 24 * 60 * 60 * 1000 // 50 years
} as const;

// Utility functions
export const generateSecureKey = (algorithm: 'encryption' | 'integrity' | 'signing' = 'encryption'): string => {
  const keyLength = algorithm === 'signing' ? 64 : 32; // 64 bytes for signing, 32 for others
  return require('crypto').randomBytes(keyLength).toString('hex');
};

export const validateAttestationData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.type) {
    errors.push('Attestation type is required');
  }
  
  if (!data.subjectId) {
    errors.push('Subject ID is required');
  }
  
  if (!data.attestedBy) {
    errors.push('Attested by is required');
  }
  
  if (!data.attestationData) {
    errors.push('Attestation data is required');
  }
  
  if (!data.complianceFrameworks || data.complianceFrameworks.length === 0) {
    errors.push('At least one compliance framework must be specified');
  }
  
  return { valid: errors.length === 0, errors };
};

export const isCulturalData = (data: any): boolean => {
  if (!data) return false;
  
  const dataString = JSON.stringify(data).toLowerCase();
  const culturalIndicators = [
    'traditional', 'indigenous', 'aboriginal', 'torres strait',
    'elder', 'ceremony', 'sacred', 'cultural', 'community',
    'dreamtime', 'songline', 'sorry business'
  ];
  
  return culturalIndicators.some(indicator => dataString.includes(indicator));
};

export const calculateRetentionPeriod = (
  isCultural: boolean,
  complianceFrameworks: string[] = []
): number => {
  if (isCultural) {
    return DEFAULT_RETENTION_PERIODS.CULTURAL_ATTESTATION;
  }
  
  // Longer retention for specific compliance frameworks
  if (complianceFrameworks.includes('austrac')) {
    return 7 * 365 * 24 * 60 * 60 * 1000; // 7 years for AUSTRAC
  }
  
  return DEFAULT_RETENTION_PERIODS.GENERAL_ATTESTATION;
};