/**
 * Redaction and Transformation Library
 * 
 * Main entry point for the redaction and transformation library
 * providing comprehensive data protection for financial intelligence
 */

// Core types
export * from './types';

// Main components
export { DataTypeClassifier } from './DataTypeClassifier';
export { RedactionEngine } from './RedactionEngine';
export { CulturalDataHandler } from './CulturalDataHandler';
export { ComplianceValidator } from './ComplianceValidator';
export { 
  AuditLogger,
  AuditLoggerImpl,
  AuditStorage,
  InMemoryAuditStorage
} from './AuditLogger';
export { BatchRedactionProcessor } from './BatchRedactionProcessor';

// Type guards and utilities
export const isRedactionRule = (rule: any): rule is import('./types').RedactionRule => {
  return rule && typeof rule.redactionType === 'string';
};

export const isTransformationRule = (rule: any): rule is import('./types').TransformationRule => {
  return rule && typeof rule.transformationType === 'string';
};

// Factory functions for easy setup
export const createRedactionSystem = (config: {
  encryptionKey: string;
  integrityKey: string;
  auditStorage?: import('./AuditLogger').AuditStorage;
}) => {
  const auditStorage = config.auditStorage || new InMemoryAuditStorage();
  const auditLogger = new AuditLoggerImpl(
    auditStorage,
    config.integrityKey,
    config.encryptionKey
  );
  
  const culturalHandler = new CulturalDataHandler();
  const complianceValidator = new ComplianceValidator();
  
  const redactionEngine = new RedactionEngine(
    config.encryptionKey,
    auditLogger,
    culturalHandler,
    complianceValidator
  );
  
  const batchProcessor = new BatchRedactionProcessor(
    redactionEngine,
    auditLogger,
    culturalHandler
  );

  return {
    redactionEngine,
    auditLogger,
    culturalHandler,
    complianceValidator,
    batchProcessor,
    classifier: new DataTypeClassifier()
  };
};

// Constants for common configurations
export const AUSTRALIAN_COMPLIANCE_FRAMEWORKS = [
  'privacy_act_1988',
  'austrac',
  'acnc',
  'corporations_act',
  'care_principles'
] as const;

export const CULTURAL_PROTECTION_LEVELS = [
  'basic',
  'sacred',
  'ceremonial'
] as const;

export const DEFAULT_RETENTION_PERIODS = {
  GENERAL_DATA: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  FINANCIAL_DATA: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years  
  CULTURAL_DATA: 50 * 365 * 24 * 60 * 60 * 1000, // 50 years
  SACRED_DATA: 50 * 365 * 24 * 60 * 60 * 1000 // 50 years
} as const;