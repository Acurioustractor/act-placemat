/**
 * Compliance Validator
 * 
 * Validates data operations against Australian legal frameworks
 * and Indigenous data governance principles
 */

import {
  ComplianceValidator as IComplianceValidator,
  ValidationResult,
  RedactionContext,
  ComplianceReport,
  AuditEntry,
  TransformationType
} from './types';

export class ComplianceValidator implements IComplianceValidator {
  private frameworks: Map<string, ComplianceFramework> = new Map();

  constructor() {
    this.initializeFrameworks();
  }

  private initializeFrameworks(): void {
    // Privacy Act 1988 (Cth)
    this.frameworks.set('privacy_act_1988', {
      name: 'Privacy Act 1988 (Commonwealth)',
      requirements: [
        'consent_required_for_collection',
        'purpose_limitation',
        'data_minimisation',
        'accuracy_requirement',
        'security_safeguards',
        'access_and_correction_rights',
        'notification_of_eligible_data_breaches'
      ],
      validationRules: [
        'explicit_consent_for_sensitive_data',
        'anonymisation_when_possible',
        'retention_period_limits',
        'cross_border_disclosure_restrictions'
      ],
      auditFrequency: 90, // days
      penalties: {
        individual: 2222000, // AUD
        body_corporate: 11100000 // AUD
      }
    });

    // AUSTRAC (Anti-Money Laundering and Counter-Terrorism Financing)
    this.frameworks.set('austrac', {
      name: 'AUSTRAC - AML/CTF Act 2006',
      requirements: [
        'customer_due_diligence',
        'ongoing_customer_due_diligence',
        'suspicious_matter_reporting',
        'transaction_monitoring',
        'record_keeping',
        'compliance_program'
      ],
      validationRules: [
        'kyc_verification_required',
        'transaction_threshold_monitoring',
        'pep_screening',
        'sanctions_list_checking',
        'enhanced_due_diligence_high_risk'
      ],
      auditFrequency: 365, // annual
      penalties: {
        individual: 21000000, // AUD
        body_corporate: 105000000 // AUD
      }
    });

    // ACNC (Australian Charities and Not-for-profits Commission)
    this.frameworks.set('acnc', {
      name: 'ACNC - Charities Act 2013',
      requirements: [
        'governance_standards',
        'external_conduct_standards',
        'financial_reporting',
        'public_disclosure',
        'responsible_persons',
        'conflicts_of_interest_management'
      ],
      validationRules: [
        'charitable_purpose_alignment',
        'public_benefit_test',
        'not_for_profit_requirement',
        'governance_accountability'
      ],
      auditFrequency: 365,
      penalties: {
        individual: 12600, // AUD
        body_corporate: 63000 // AUD
      }
    });

    // CARE Principles for Indigenous Data Governance
    this.frameworks.set('care_principles', {
      name: 'CARE Principles for Indigenous Data Governance',
      requirements: [
        'collective_benefit',
        'authority_to_control',
        'responsibility',
        'ethics'
      ],
      validationRules: [
        'community_consultation_required',
        'traditional_owner_consent',
        'cultural_protocol_adherence',
        'reciprocal_benefit_demonstration',
        'ethical_use_framework'
      ],
      auditFrequency: 180, // semi-annual
      penalties: {
        individual: 0, // No monetary penalties, but legal/cultural consequences
        body_corporate: 0
      }
    });

    // Corporations Act 2001
    this.frameworks.set('corporations_act', {
      name: 'Corporations Act 2001',
      requirements: [
        'financial_reporting',
        'audit_requirements',
        'continuous_disclosure',
        'related_party_transactions',
        'capital_raising_compliance'
      ],
      validationRules: [
        'director_duties_compliance',
        'shareholder_rights_protection',
        'financial_services_licensing'
      ],
      auditFrequency: 365,
      penalties: {
        individual: 1110000, // AUD
        body_corporate: 11100000 // AUD
      }
    });
  }

  validateOperation(
    operation: string,
    data: any,
    context: RedactionContext,
    frameworks: string[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const frameworkId of frameworks) {
      const framework = this.frameworks.get(frameworkId);
      if (!framework) {
        warnings.push(`Unknown compliance framework: ${frameworkId}`);
        continue;
      }

      const frameworkValidation = this.validateAgainstFramework(
        operation,
        data,
        context,
        framework,
        frameworkId
      );

      errors.push(...frameworkValidation.errors);
      warnings.push(...frameworkValidation.warnings);
      suggestions.push(...frameworkValidation.suggestions);
    }

    return {
      valid: errors.length === 0,
      ruleId: `compliance-validation-${frameworks.join('-')}`,
      errors,
      warnings,
      suggestions
    };
  }

  validatePrivacyAct(
    operation: string,
    data: any,
    context: RedactionContext
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check consent level adequacy
    if (context.consentLevel === 'none' || context.consentLevel === 'implied') {
      if (this.isSensitivePersonalInformation(data)) {
        errors.push('Explicit consent required for sensitive personal information under Privacy Act 1988');
      }
    }

    // Check purpose limitation
    if (context.purpose.includes('marketing') && !context.purpose.includes('consent_marketing')) {
      warnings.push('Marketing purposes require specific consent under Privacy Act');
    }

    // Check cross-border disclosure
    if (context.purpose.includes('international_transfer')) {
      if (!this.hasAdequateProtections(context)) {
        errors.push('Cross-border disclosure requires adequate privacy protections');
      }
    }

    // Check retention period
    if (context.complianceContext.retentionPeriod > 7 * 365 * 24 * 60 * 60 * 1000) {
      warnings.push('Retention period exceeds typical Privacy Act requirements');
    }

    // Indigenous data special requirements
    if (context.culturalContext?.traditionalTerritory) {
      if (!context.purpose.includes('community_benefit')) {
        warnings.push('Indigenous data should primarily benefit the community');
      }
    }

    return {
      valid: errors.length === 0,
      ruleId: 'privacy-act-1988',
      errors,
      warnings,
      suggestions
    };
  }

  validateAUSTRAC(
    operation: string,
    data: any,
    context: RedactionContext
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for financial transaction data
    if (this.isFinancialTransactionData(data)) {
      if (!context.purpose.includes('aml_compliance')) {
        warnings.push('Financial transaction data may require AML/CTF compliance review');
      }

      // Check transaction threshold monitoring
      if (this.getTransactionAmount(data) >= 10000) {
        if (!context.purpose.includes('threshold_transaction_monitoring')) {
          errors.push('Transactions ≥$10,000 require AUSTRAC threshold monitoring');
        }
      }

      // Check for international transfers
      if (this.isInternationalTransfer(data)) {
        if (!context.purpose.includes('international_funds_transfer_instruction')) {
          errors.push('International transfers require IFTI reporting to AUSTRAC');
        }
      }
    }

    // Check for suspicious matter indicators
    if (this.hasSuspiciousMatterIndicators(data)) {
      suggestions.push('Consider suspicious matter reporting requirements');
    }

    // Customer Due Diligence requirements
    if (this.requiresCustomerDueDiligence(data, context)) {
      if (!context.purpose.includes('customer_due_diligence')) {
        errors.push('Customer due diligence required under AML/CTF Act');
      }
    }

    return {
      valid: errors.length === 0,
      ruleId: 'austrac-aml-ctf',
      errors,
      warnings,
      suggestions
    };
  }

  validateACNC(
    operation: string,
    data: any,
    context: RedactionContext
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if organisation is ACNC registered charity
    if (this.isCharityData(data, context)) {
      // Governance standards compliance
      if (!this.hasGovernanceStandards(context)) {
        warnings.push('ACNC governance standards may apply to this data');
      }

      // Public disclosure requirements
      if (this.isPublicDisclosureRequired(data)) {
        if (!context.purpose.includes('public_disclosure')) {
          warnings.push('Data may be subject to ACNC public disclosure requirements');
        }
      }

      // Financial reporting compliance
      if (this.isFinancialReportingData(data)) {
        if (!context.purpose.includes('financial_reporting')) {
          warnings.push('Financial data may require ACNC reporting compliance');
        }
      }

      // Charitable purpose alignment
      if (!this.alignsWithCharitablePurpose(context)) {
        errors.push('Data use must align with registered charitable purposes');
      }
    }

    return {
      valid: errors.length === 0,
      ruleId: 'acnc-charities',
      errors,
      warnings,
      suggestions
    };
  }

  validateTransformation(
    transformationType: TransformationType,
    data: any,
    context: RedactionContext,
    complianceValidations: any[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate transformation type appropriateness
    switch (transformationType) {
      case TransformationType.REVERSIBLE_ENCRYPT:
        if (this.isSensitivePersonalInformation(data) && context.consentLevel === 'none') {
          errors.push('Reversible encryption of sensitive data requires explicit consent');
        }
        break;

      case TransformationType.ANONYMIZE:
        if (context.culturalContext?.traditionalTerritory) {
          warnings.push('Anonymisation of Indigenous data may not preserve cultural context');
        }
        break;

      case TransformationType.CULTURAL_ABSTRACTION:
        if (!context.culturalContext?.elderApproval) {
          errors.push('Cultural abstraction requires Elder approval');
        }
        break;

      case TransformationType.STATISTICAL_NOISE:
        if (this.isFinancialTransactionData(data)) {
          warnings.push('Statistical noise may affect AUSTRAC compliance requirements');
        }
        break;
    }

    // Check retention period compliance
    if (context.complianceContext.retentionPeriod < this.getMinimumRetentionPeriod(data, context)) {
      errors.push('Retention period below legal minimum requirements');
    }

    return {
      valid: errors.length === 0,
      ruleId: `transformation-compliance-${transformationType}`,
      errors,
      warnings,
      suggestions
    };
  }

  generateComplianceReport(auditEntries: AuditEntry[]): ComplianceReport {
    const frameworks = [...new Set(auditEntries.flatMap(entry => entry.complianceFrameworks))];
    const period = this.calculateReportingPeriod(auditEntries);

    const summary = {
      totalOperations: auditEntries.length,
      compliantOperations: auditEntries.filter(entry => entry.success).length,
      violations: auditEntries.filter(entry => !entry.success).length,
      culturalDataOperations: auditEntries.filter(entry => entry.culturalSensitive).length
    };

    const violations = this.identifyViolations(auditEntries);
    const recommendations = this.generateRecommendations(auditEntries, violations);
    const culturalCompliance = this.assessCulturalCompliance(auditEntries);

    return {
      framework: frameworks.join(', '),
      period,
      summary,
      violations,
      recommendations,
      culturalCompliance
    };
  }

  // Private helper methods

  private validateAgainstFramework(
    operation: string,
    data: any,
    context: RedactionContext,
    framework: ComplianceFramework,
    frameworkId: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Framework-specific validation
    switch (frameworkId) {
      case 'privacy_act_1988':
        const privacyValidation = this.validatePrivacyAct(operation, data, context);
        errors.push(...privacyValidation.errors);
        warnings.push(...privacyValidation.warnings);
        suggestions.push(...privacyValidation.suggestions);
        break;

      case 'austrac':
        const austracValidation = this.validateAUSTRAC(operation, data, context);
        errors.push(...austracValidation.errors);
        warnings.push(...austracValidation.warnings);
        suggestions.push(...austracValidation.suggestions);
        break;

      case 'acnc':
        const acncValidation = this.validateACNC(operation, data, context);
        errors.push(...acncValidation.errors);
        warnings.push(...acncValidation.warnings);
        suggestions.push(...acncValidation.suggestions);
        break;

      case 'care_principles':
        const careValidation = this.validateCAREPrinciples(operation, data, context);
        errors.push(...careValidation.errors);
        warnings.push(...careValidation.warnings);
        suggestions.push(...careValidation.suggestions);
        break;
    }

    return {
      valid: errors.length === 0,
      ruleId: frameworkId,
      errors,
      warnings,
      suggestions
    };
  }

  private validateCAREPrinciples(
    operation: string,
    data: any,
    context: RedactionContext
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!context.culturalContext?.traditionalTerritory) {
      return { valid: true, ruleId: 'care-principles', errors, warnings, suggestions };
    }

    // Collective Benefit
    if (!context.purpose.includes('community_benefit')) {
      warnings.push('CARE Principle - Collective Benefit: Operations should benefit Indigenous communities');
    }

    // Authority to Control
    if (context.sovereigntyLevel !== 'traditional_owner' && !context.culturalContext.elderApproval) {
      errors.push('CARE Principle - Authority to Control: Traditional Owner consent required');
    }

    // Responsibility
    const harmfulPurposes = ['commercial_exploitation', 'cultural_appropriation'];
    if (context.purpose.some(purpose => harmfulPurposes.includes(purpose))) {
      errors.push('CARE Principle - Responsibility: Data use must respect Indigenous rights');
    }

    // Ethics
    if (!context.purpose.includes('ethical_use') && !context.purpose.includes('reciprocal_benefit')) {
      warnings.push('CARE Principle - Ethics: Consider reciprocal relationships and ethical frameworks');
    }

    return {
      valid: errors.length === 0,
      ruleId: 'care-principles',
      errors,
      warnings,
      suggestions
    };
  }

  private isSensitivePersonalInformation(data: any): boolean {
    const dataString = String(data).toLowerCase();
    const sensitivePatterns = [
      /\b(?:aboriginal|torres strait islander|indigenous)\b/i,
      /\b(?:health|medical|disability)\b/i,
      /\b(?:criminal|conviction|offence)\b/i,
      /\b(?:political|union|religious)\b/i,
      /\b(?:sexual|biometric|genetic)\b/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  private hasAdequateProtections(context: RedactionContext): boolean {
    return context.complianceContext.frameworks.includes('gdpr') ||
           context.complianceContext.frameworks.includes('privacy_shield') ||
           context.purpose.includes('adequacy_decision');
  }

  private isFinancialTransactionData(data: any): boolean {
    const dataString = String(data).toLowerCase();
    return /\$[\d,]+\.?\d*/.test(dataString) ||
           /\b(?:transaction|payment|transfer|deposit|withdrawal)\b/i.test(dataString);
  }

  private getTransactionAmount(data: any): number {
    const dataString = String(data);
    const match = dataString.match(/\$?([\d,]+\.?\d*)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  }

  private isInternationalTransfer(data: any): boolean {
    const dataString = String(data).toLowerCase();
    return /\b(?:international|overseas|swift|iban)\b/i.test(dataString);
  }

  private hasSuspiciousMatterIndicators(data: any): boolean {
    const dataString = String(data).toLowerCase();
    const suspiciousPatterns = [
      /\b(?:cash|structuring|smurfing)\b/i,
      /\b(?:unusual|suspicious|complex)\b/i,
      /\b(?:high.risk|sanctions|pep)\b/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(dataString));
  }

  private requiresCustomerDueDiligence(data: any, context: RedactionContext): boolean {
    return this.isFinancialTransactionData(data) &&
           (this.getTransactionAmount(data) >= 10000 ||
            context.purpose.includes('account_opening') ||
            this.hasSuspiciousMatterIndicators(data));
  }

  private isCharityData(data: any, context: RedactionContext): boolean {
    return context.purpose.includes('charitable_purpose') ||
           context.complianceContext.frameworks.includes('acnc');
  }

  private hasGovernanceStandards(context: RedactionContext): boolean {
    return context.purpose.includes('governance_compliance');
  }

  private isPublicDisclosureRequired(data: any): boolean {
    const dataString = String(data).toLowerCase();
    return /\b(?:annual.report|financial.statement|public.disclosure)\b/i.test(dataString);
  }

  private isFinancialReportingData(data: any): boolean {
    const dataString = String(data).toLowerCase();
    return /\b(?:revenue|expense|asset|liability|equity)\b/i.test(dataString);
  }

  private alignsWithCharitablePurpose(context: RedactionContext): boolean {
    const charitablePurposes = [
      'relief_poverty', 'advancement_education', 'advancement_religion',
      'beneficial_community', 'environmental_protection'
    ];
    return context.purpose.some(purpose => charitablePurposes.includes(purpose));
  }

  private getMinimumRetentionPeriod(data: any, context: RedactionContext): number {
    if (context.culturalContext?.traditionalTerritory) {
      return 50 * 365 * 24 * 60 * 60 * 1000; // 50 years for Indigenous data
    }

    if (this.isFinancialTransactionData(data)) {
      return 7 * 365 * 24 * 60 * 60 * 1000; // 7 years for financial records
    }

    return 3 * 365 * 24 * 60 * 60 * 1000; // 3 years default
  }

  private calculateReportingPeriod(auditEntries: AuditEntry[]): { start: Date; end: Date } {
    const timestamps = auditEntries.map(entry => entry.timestamp);
    return {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };
  }

  private identifyViolations(auditEntries: AuditEntry[]): Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    rule: string;
    description: string;
    auditEntryId: string;
    recommendation: string;
  }> {
    const violations: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      rule: string;
      description: string;
      auditEntryId: string;
      recommendation: string;
    }> = [];

    for (const entry of auditEntries) {
      if (!entry.success) {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        
        if (entry.culturalSensitive) {
          severity = 'high';
        }
        
        if (entry.complianceFrameworks.includes('austrac')) {
          severity = 'critical';
        }

        violations.push({
          severity,
          rule: entry.complianceFrameworks.join(', '),
          description: entry.errorDetails || 'Operation failed compliance validation',
          auditEntryId: entry.id,
          recommendation: this.getViolationRecommendation(entry)
        });
      }
    }

    return violations;
  }

  private getViolationRecommendation(entry: AuditEntry): string {
    if (entry.culturalSensitive) {
      return 'Consult with Traditional Owners and Cultural Keepers for appropriate protocols';
    }

    if (entry.complianceFrameworks.includes('austrac')) {
      return 'Review AML/CTF compliance procedures and customer due diligence requirements';
    }

    if (entry.complianceFrameworks.includes('privacy_act_1988')) {
      return 'Ensure explicit consent and purpose limitation compliance';
    }

    return 'Review compliance procedures and seek legal advice if necessary';
  }

  private generateRecommendations(
    auditEntries: AuditEntry[],
    violations: any[]
  ): string[] {
    const recommendations: string[] = [];

    const culturalDataCount = auditEntries.filter(entry => entry.culturalSensitive).length;
    if (culturalDataCount > 0) {
      recommendations.push('Establish formal Cultural Advisory Board for Indigenous data governance');
    }

    const failureRate = violations.length / auditEntries.length;
    if (failureRate > 0.1) {
      recommendations.push('Review and update compliance training programs');
    }

    const austracViolations = violations.filter(v => v.rule.includes('austrac')).length;
    if (austracViolations > 0) {
      recommendations.push('Enhance AML/CTF compliance monitoring and reporting procedures');
    }

    return recommendations;
  }

  private assessCulturalCompliance(auditEntries: AuditEntry[]): {
    careComplianceScore: number;
    elderApprovalsRequired: number;
    elderApprovalsReceived: number;
    protocolViolations: number;
  } {
    const culturalEntries = auditEntries.filter(entry => entry.culturalSensitive);
    
    if (culturalEntries.length === 0) {
      return {
        careComplianceScore: 1.0,
        elderApprovalsRequired: 0,
        elderApprovalsReceived: 0,
        protocolViolations: 0
      };
    }

    const successfulCulturalOperations = culturalEntries.filter(entry => entry.success).length;
    const careComplianceScore = successfulCulturalOperations / culturalEntries.length;

    return {
      careComplianceScore,
      elderApprovalsRequired: culturalEntries.length,
      elderApprovalsReceived: successfulCulturalOperations,
      protocolViolations: culturalEntries.length - successfulCulturalOperations
    };
  }
}

interface ComplianceFramework {
  name: string;
  requirements: string[];
  validationRules: string[];
  auditFrequency: number; // days
  penalties: {
    individual: number; // AUD
    body_corporate: number; // AUD
  };
}