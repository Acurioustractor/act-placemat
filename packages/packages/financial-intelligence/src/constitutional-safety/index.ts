/**
 * Constitutional Safety System
 * 
 * Complete system for constitutional compliance checking and safety prompts
 * for AI agents operating within Australian financial systems
 */

// Core types
export * from './types';

// Constitutional principles and prompts
export * from './principles';
export * from './prompts';

// Main service implementation
export { ConstitutionalSafetyServiceImpl } from './ConstitutionalSafetyService';

// Repository implementation
export { PostgreSQLConstitutionalRepository } from './PostgreSQLConstitutionalRepository';
export type { DatabaseConnection } from './PostgreSQLConstitutionalRepository';

// Agent integration
export {
  BaseConstitutionalAgent,
  FinancialIntelligenceAgent,
  CulturalDataAgent,
  createConstitutionalAgent
} from './ConstitutionalAgentIntegration';

// Factory function for easy system setup
export const createConstitutionalSafetySystem = async (config: {
  database: any; // Database connection
  integrityKey: string;
  strictMode?: boolean;
  emergencyOverrideEnabled?: boolean;
  auditRetentionDays?: number;
}) => {
  // Initialize repository
  const repository = new PostgreSQLConstitutionalRepository(
    config.database,
    config.integrityKey
  );
  
  // Initialize database tables
  await repository.initializeTables();
  
  // Get configuration
  const systemConfig = await repository.getConfig();
  
  // Override with provided config
  const finalConfig = {
    ...systemConfig,
    strictMode: config.strictMode ?? systemConfig.strictMode,
    emergencyOverrideEnabled: config.emergencyOverrideEnabled ?? systemConfig.emergencyOverrideEnabled,
    auditRetentionDays: config.auditRetentionDays ?? systemConfig.auditRetentionDays
  };
  
  // Initialize service
  const service = new ConstitutionalSafetyServiceImpl(repository, finalConfig);
  
  // Validate system
  const validation = await service.validatePrinciples();
  if (!validation.valid) {
    console.warn('Constitutional safety system validation warnings:', validation.errors);
  }
  
  return {
    service,
    repository,
    config: finalConfig,
    validation
  };
};

// Constants for common configurations
export const DEFAULT_CONSTITUTIONAL_CONFIG = {
  enabled: true,
  strictMode: false,
  defaultJurisdiction: 'federal' as const,
  emergencyOverrideEnabled: true,
  emergencyOverrideRoles: ['constitutional_officer', 'emergency_coordinator'],
  auditRetentionDays: 2555, // 7 years
  escalationTimeoutMinutes: 60,
  principlesConfig: {}
};

export const AGENT_SAFETY_PROFILES = {
  CONSERVATIVE: {
    riskTolerance: 'low' as const,
    autoAcknowledgeThreshold: 'info' as const,
    escalationRequired: true
  },
  BALANCED: {
    riskTolerance: 'medium' as const,
    autoAcknowledgeThreshold: 'low' as const,
    escalationRequired: false
  },
  PERMISSIVE: {
    riskTolerance: 'high' as const,
    autoAcknowledgeThreshold: 'medium' as const,
    escalationRequired: false
  }
};

// Utility functions
export const generateSecureIntegrityKey = (): string => {
  return require('crypto').randomBytes(32).toString('hex');
};

export const validateConstitutionalData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.agentId) {
    errors.push('Agent ID is required');
  }
  
  if (!data.eventType) {
    errors.push('Event type is required');
  }
  
  if (!data.context || !data.context.userId) {
    errors.push('User context is required');
  }
  
  if (!data.context || !data.context.jurisdiction) {
    errors.push('Jurisdiction is required');
  }
  
  return { valid: errors.length === 0, errors };
};

export const isConstitutionalEvent = (eventType: string): boolean => {
  const constitutionalEvents = [
    'financial_transaction',
    'data_access',
    'policy_decision',
    'user_consent',
    'system_integration',
    'audit_log_access',
    'constitutional_override',
    'emergency_action',
    'cross_border_transfer',
    'indigenous_data_access'
  ];
  
  return constitutionalEvents.includes(eventType);
};

export const getConstitutionalSeverity = (principleId: string): string => {
  // Map principle IDs to default severity levels
  const criticalPrinciples = ['CP001', 'CP002', 'CP003', 'CP015', 'CP018', 'CP024'];
  const highPrinciples = ['CP004', 'CP005', 'CP006', 'CP007', 'CP016', 'CP020'];
  
  if (criticalPrinciples.includes(principleId)) {
    return 'critical';
  }
  
  if (highPrinciples.includes(principleId)) {
    return 'high';
  }
  
  return 'medium';
};

// Re-export specific types for convenience
export type {
  ConstitutionalSafetyService,
  ConstitutionalRepository,
  ConstitutionalAgent,
  SafetyCheck,
  SafetyCheckContext,
  TriggeredPrompt,
  SafetyPrompt,
  ConstitutionalPrinciple,
  ConstitutionalConfig
} from './types';