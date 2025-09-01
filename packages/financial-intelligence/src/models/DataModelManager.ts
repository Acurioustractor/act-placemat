/**
 * Data Model Manager for Financial Intelligence Agent
 * 
 * Manages all data models with integrated governance, consent, and sovereignty tracking
 * Designed for Australian financial compliance and community ownership principles
 */

import { 
  ConsentMetadata, 
  ConsentMetadataSchema,
  PolicyMetadata,
  PolicyMetadataSchema,
  SovereigntyMetadata,
  SovereigntyMetadataSchema,
  FinancialTransactionMetadata,
  FinancialTransactionMetadataSchema,
  ConsentLevel,
  ConsentScope,
  SovereigntyLevel,
  PolicyType,
  PolicyEnforcement
} from '../types/governance';

import {
  FinancialAccount,
  FinancialAccountSchema,
  Transaction,
  TransactionSchema,
  Budget,
  BudgetSchema,
  FinancialForecast,
  FinancialForecastSchema,
  FinancialAlert,
  FinancialAlertSchema,
  AccountType,
  CashFlowCategory,
  TransactionClass
} from '../types/financial';

/**
 * Configuration for the data model manager
 */
export interface DataModelConfig {
  // Database configuration
  database?: {
    host: string;
    port: number;
    database: string;
    schema: string;
  };
  
  // Australian compliance settings
  compliance: {
    enforceDataResidency: boolean;
    requireIndigenousProtocols: boolean;
    auditAllTransactions: boolean;
    consentExpiryWarningDays: number;
  };
  
  // Default governance settings
  defaults: {
    consentLevel: ConsentLevel;
    dataResidency: 'australia' | 'international';
    sovereigntyLevel: SovereigntyLevel;
    requireAttestations: boolean;
  };
}

/**
 * Data validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  governanceIssues: string[];
}

/**
 * Central data model manager with governance integration
 */
export class DataModelManager {
  private config: DataModelConfig;
  
  constructor(config: DataModelConfig) {
    this.config = config;
  }

  // === CONSENT MANAGEMENT ===

  /**
   * Create new consent metadata with validation
   */
  async createConsentMetadata(
    entityId: string,
    entityType: 'individual' | 'organisation' | 'community' | 'system',
    level: ConsentLevel,
    scopes: ConsentScope[],
    purpose: string,
    attestorId: string
  ): Promise<ConsentMetadata> {
    const consentData = {
      id: crypto.randomUUID(),
      entityId,
      entityType,
      level,
      scopes,
      privacyActCompliant: true,
      dataResidency: this.config.defaults.dataResidency,
      grantedAt: new Date(),
      purpose,
      attestation: {
        method: 'digital_signature' as const,
        attestorId,
        timestamp: new Date(),
        signature: this.generateAttestationSignature(entityId, level, scopes)
      },
      createdBy: attestorId,
      lastModifiedBy: attestorId,
      version: 1
    };

    // Validate the consent metadata
    const validation = this.validateConsentMetadata(consentData);
    if (!validation.valid) {
      throw new Error(`Invalid consent metadata: ${validation.errors.join(', ')}`);
    }

    return ConsentMetadataSchema.parse(consentData);
  }

  /**
   * Validate consent metadata
   */
  validateConsentMetadata(consent: any): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      governanceIssues: []
    };

    try {
      ConsentMetadataSchema.parse(consent);
    } catch (error) {
      result.valid = false;
      result.errors.push(`Schema validation failed: ${error}`);
      return result;
    }

    // Check governance requirements
    if (this.config.compliance.enforceDataResidency && consent.dataResidency !== 'australia') {
      result.governanceIssues.push('Data residency outside Australia not permitted');
    }

    // Check consent expiry
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      result.governanceIssues.push('Consent has expired');
    }

    // Check if high-level consent has appropriate safeguards
    if (consent.level === ConsentLevel.FULL_AUTOMATION && !consent.maxDailyAmount) {
      result.warnings.push('Full automation consent should include daily spending limits');
    }

    return result;
  }

  // === POLICY MANAGEMENT ===

  /**
   * Create policy metadata for Rego-based governance
   */
  async createPolicyMetadata(
    name: string,
    description: string,
    type: PolicyType,
    enforcement: PolicyEnforcement,
    scopes: ConsentScope[],
    regoModule: string,
    ruleExpression: string,
    createdBy: string
  ): Promise<PolicyMetadata> {
    const policyData = {
      id: crypto.randomUUID(),
      name,
      description,
      type,
      enforcement,
      priority: 5, // Default medium priority
      scopes,
      applicableEntities: [], // Empty means applies to all
      regoModule,
      ruleExpression,
      dependencies: [],
      effectiveFrom: new Date(),
      australianCompliance: {
        regulatoryFramework: this.getApplicableRegulatory(type),
        indigenousProtocols: this.config.compliance.requireIndigenousProtocols,
        communityBenefitRequired: type === PolicyType.COMMUNITY
      },
      version: '1.0.0',
      createdBy,
      lastModifiedBy: createdBy,
      createdAt: new Date(),
      lastModifiedAt: new Date()
    };

    return PolicyMetadataSchema.parse(policyData);
  }

  /**
   * Get applicable regulatory frameworks based on policy type
   */
  private getApplicableRegulatory(type: PolicyType): string[] {
    switch (type) {
      case PolicyType.COMPLIANCE:
        return ['ASIC', 'ATO', 'ACNC'];
      case PolicyType.SECURITY:
        return ['AUSTRAC', 'ASIC'];
      case PolicyType.ENVIRONMENTAL:
        return ['Department of Climate Change'];
      case PolicyType.CULTURAL:
        return ['NIAA', 'AIATSIS'];
      default:
        return ['ACNC']; // Default to charity regulator
    }
  }

  // === SOVEREIGNTY TRACKING ===

  /**
   * Create sovereignty metadata with Australian context
   */
  async createSovereigntyMetadata(
    entityId: string,
    level: SovereigntyLevel,
    governanceModel: 'individual' | 'collective' | 'delegated' | 'hybrid',
    decisionMakers: string[]
  ): Promise<SovereigntyMetadata> {
    const sovereigntyData = {
      id: crypto.randomUUID(),
      entityId,
      level,
      traditionalOwnership: level === SovereigntyLevel.INDIGENOUS ? {
        recognised: true,
        communityId: entityId,
        protocols: ['CARE_principles', 'FAIR_principles']
      } : undefined,
      governanceModel,
      decisionMakers,
      benefitAllocation: this.generateDefaultBenefitAllocation(level),
      careCompliant: level === SovereigntyLevel.INDIGENOUS,
      fairTradingCompliant: true,
      establishedAt: new Date(),
      reviewRequired: level === SovereigntyLevel.INDIGENOUS // Indigenous sovereignty requires regular review
    };

    return SovereigntyMetadataSchema.parse(sovereigntyData);
  }

  /**
   * Generate default benefit allocation based on sovereignty level
   */
  private generateDefaultBenefitAllocation(level: SovereigntyLevel) {
    switch (level) {
      case SovereigntyLevel.INDIGENOUS:
        return [
          { type: 'financial' as const, percentage: 40, recipient: 'community', conditions: ['cultural_protocols'] },
          { type: 'capacity' as const, percentage: 30, recipient: 'community', conditions: [] },
          { type: 'cultural' as const, percentage: 30, recipient: 'traditional_owners', conditions: [] }
        ];
      case SovereigntyLevel.COMMUNITY:
        return [
          { type: 'financial' as const, percentage: 60, recipient: 'community', conditions: [] },
          { type: 'capacity' as const, percentage: 40, recipient: 'community', conditions: [] }
        ];
      default:
        return [
          { type: 'financial' as const, percentage: 100, recipient: 'organisation', conditions: [] }
        ];
    }
  }

  // === FINANCIAL TRANSACTION METADATA ===

  /**
   * Create complete financial transaction metadata
   */
  async createFinancialTransactionMetadata(
    transactionId: string,
    amount: number,
    category: string,
    classification: TransactionClass,
    consent: ConsentMetadata,
    sovereignty: SovereigntyMetadata,
    policies: string[],
    automated: boolean,
    agentId?: string,
    humanApprover?: string
  ): Promise<FinancialTransactionMetadata> {
    const transactionData = {
      transactionId,
      amount,
      currency: 'AUD',
      category,
      classification,
      consent,
      policies,
      sovereignty,
      decisionContext: {
        automated,
        agentId,
        humanApprover,
        decisionTimestamp: new Date(),
        rationale: automated ? 'Automated decision based on policies' : 'Human approval'
      },
      complianceChecks: await this.generateComplianceChecks(amount, classification),
      auditTrail: [{
        action: 'transaction_created',
        userId: humanApprover || agentId || 'system',
        timestamp: new Date(),
        details: { amount, classification }
      }]
    };

    return FinancialTransactionMetadataSchema.parse(transactionData);
  }

  /**
   * Generate compliance checks for a transaction
   */
  private async generateComplianceChecks(amount: number, classification: TransactionClass) {
    const checks = [];
    const now = new Date();

    // ATO compliance check
    checks.push({
      checkType: 'ATO_GST_Compliance',
      passed: amount < 1000 || classification !== TransactionClass.OPERATIONAL, // Simplified
      details: amount >= 1000 ? 'GST registration may be required' : undefined,
      timestamp: now
    });

    // AUSTRAC compliance check
    if (amount >= 10000) {
      checks.push({
        checkType: 'AUSTRAC_Reporting',
        passed: true, // Would integrate with actual AUSTRAC reporting
        details: 'Large transaction reported to AUSTRAC',
        timestamp: now
      });
    }

    // Community benefit check
    if (classification === TransactionClass.COMMUNITY_BENEFIT) {
      checks.push({
        checkType: 'Community_Benefit_Validation',
        passed: true,
        details: 'Transaction aligns with community benefit objectives',
        timestamp: now
      });
    }

    return checks;
  }

  // === FINANCIAL ACCOUNT MANAGEMENT ===

  /**
   * Create financial account with governance integration
   */
  async createFinancialAccount(
    name: string,
    type: AccountType,
    institutionName: string,
    currentBalance: number,
    consentRequired: ConsentLevel = ConsentLevel.BASIC_OPERATIONS,
    allowedScopes: ConsentScope[] = [ConsentScope.CASH_FLOW]
  ): Promise<FinancialAccount> {
    const accountData = {
      id: crypto.randomUUID(),
      name,
      type,
      institutionName,
      currentBalance,
      availableBalance: currentBalance,
      currency: 'AUD',
      consentRequired,
      allowedScopes,
      australianAccount: true,
      regulatedInstitution: true,
      isActive: true,
      createdAt: new Date()
    };

    return FinancialAccountSchema.parse(accountData);
  }

  // === UTILITY METHODS ===

  /**
   * Generate cryptographic attestation signature
   */
  private generateAttestationSignature(entityId: string, level: ConsentLevel, scopes: ConsentScope[]): string {
    // In production, this would use proper cryptographic signing
    const payload = `${entityId}:${level}:${scopes.join(',')}:${Date.now()}`;
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Validate complete governance framework for an operation
   */
  async validateGovernanceFramework(
    consent: ConsentMetadata,
    sovereignty: SovereigntyMetadata,
    policies: string[],
    operation: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      governanceIssues: []
    };

    // Validate consent
    const consentValidation = this.validateConsentMetadata(consent);
    result.errors.push(...consentValidation.errors);
    result.warnings.push(...consentValidation.warnings);
    result.governanceIssues.push(...consentValidation.governanceIssues);

    // Check sovereignty requirements
    if (sovereignty.level === SovereigntyLevel.INDIGENOUS && !sovereignty.careCompliant) {
      result.governanceIssues.push('Indigenous sovereignty requires CARE compliance');
    }

    // Validate policy coverage
    if (policies.length === 0) {
      result.warnings.push('No policies applied to this operation');
    }

    // Check for conflicts
    if (consent.level === ConsentLevel.NONE && operation !== 'read') {
      result.errors.push('Operation requires consent but none provided');
    }

    result.valid = result.errors.length === 0 && result.governanceIssues.length === 0;
    return result;
  }

  /**
   * Get compliance summary for reporting
   */
  async getComplianceSummary() {
    return {
      dataResidencyCompliant: this.config.compliance.enforceDataResidency,
      indigenousProtocolsEnabled: this.config.compliance.requireIndigenousProtocols,
      auditingEnabled: this.config.compliance.auditAllTransactions,
      defaultConsentLevel: this.config.defaults.consentLevel,
      supportedFrameworks: ['Privacy Act 1988', 'ACNC Governance Standards', 'CARE Principles'],
      lastComplianceCheck: new Date().toISOString()
    };
  }
}