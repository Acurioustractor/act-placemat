/**
 * Transformation Utilities
 * 
 * Helper functions and utilities for data transformation operations
 * with Australian compliance and performance optimizations
 */

import { createHash, randomBytes } from 'crypto';
import {
  TransformationRule,
  TransformationContext,
  TransformationType,
  AustralianPatterns,
  FieldPattern,
  TransformationConfig,
  TransformationStats
} from './types';
import { ConsentLevel, SovereigntyLevel } from '../types/governance';

/**
 * Rule builder utility for creating transformation rules
 */
export class RuleBuilder {
  private rule: Partial<TransformationRule> = {};

  static create(): RuleBuilder {
    return new RuleBuilder();
  }

  id(id: string): RuleBuilder {
    this.rule.id = id;
    return this;
  }

  name(name: string): RuleBuilder {
    this.rule.name = name;
    return this;
  }

  description(description: string): RuleBuilder {
    this.rule.description = description;
    return this;
  }

  priority(priority: number): RuleBuilder {
    this.rule.priority = priority;
    return this;
  }

  enabled(enabled: boolean = true): RuleBuilder {
    this.rule.enabled = enabled;
    return this;
  }

  matchField(path: string, options: Partial<FieldPattern> = {}): RuleBuilder {
    if (!this.rule.fieldPatterns) {
      this.rule.fieldPatterns = [];
    }
    this.rule.fieldPatterns.push({
      path,
      caseSensitive: false,
      ...options
    });
    return this;
  }

  matchFields(paths: string[]): RuleBuilder {
    paths.forEach(path => this.matchField(path));
    return this;
  }

  whenRole(role: string): RuleBuilder {
    return this.when('user_role', 'contains', role);
  }

  whenConsentLevel(level: ConsentLevel): RuleBuilder {
    return this.when('consent_level', 'equals', level);
  }

  whenSovereigntyLevel(level: SovereigntyLevel): RuleBuilder {
    return this.when('sovereignty_level', 'equals', level);
  }

  whenComplianceFramework(framework: string): RuleBuilder {
    return this.when('compliance_framework', 'contains', framework);
  }

  when(type: string, operator: string, value: any): RuleBuilder {
    if (!this.rule.conditions) {
      this.rule.conditions = [];
    }
    this.rule.conditions.push({
      type: type as any,
      field: type.replace('_', ''),
      operator: operator as any,
      value
    });
    return this;
  }

  redact(replaceWith: string = '[REDACTED]'): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.REDACT,
      parameters: { replaceWith },
      reversible: false,
      deterministic: true,
      preserveFormat: false
    };
    return this;
  }

  mask(maskChar: string = '*', visibleChars: number = 3): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.MASK,
      parameters: { maskChar, visibleChars },
      reversible: false,
      deterministic: true,
      preserveFormat: false
    };
    return this;
  }

  encrypt(keyId: string = 'default', algorithm: string = 'aes-256-gcm'): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.ENCRYPT,
      parameters: { keyId, algorithm },
      reversible: true,
      deterministic: false,
      preserveFormat: false
    };
    return this;
  }

  hash(algorithm: string = 'sha256', salt: string = ''): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.HASH,
      parameters: { hashAlgorithm: algorithm, salt },
      reversible: false,
      deterministic: true,
      preserveFormat: false
    };
    return this;
  }

  tokenize(strategy: 'random' | 'sequential' | 'format_preserving' = 'random'): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.TOKENIZE,
      parameters: { tokenStrategy: strategy },
      reversible: true,
      deterministic: false,
      preserveFormat: strategy === 'format_preserving'
    };
    return this;
  }

  generalize(level: number = 1): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.GENERALIZE,
      parameters: { generalizationLevel: level },
      reversible: false,
      deterministic: true,
      preserveFormat: false
    };
    return this;
  }

  remove(): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.REMOVE,
      parameters: {},
      reversible: false,
      deterministic: true,
      preserveFormat: false
    };
    return this;
  }

  replace(replaceWith: string): RuleBuilder {
    this.rule.transformation = {
      type: TransformationType.REPLACE,
      parameters: { replaceWith },
      reversible: false,
      deterministic: true,
      preserveFormat: false
    };
    return this;
  }

  compliance(frameworks: string[], reason: string, legalBasis?: string): RuleBuilder {
    this.rule.compliance = {
      frameworks,
      reason,
      legalBasis
    };
    return this;
  }

  tag(...tags: string[]): RuleBuilder {
    if (!this.rule.metadata) {
      this.rule.metadata = {
        createdBy: 'system',
        createdAt: new Date(),
        version: '1.0.0',
        tags: []
      };
    }
    this.rule.metadata.tags = [...(this.rule.metadata.tags || []), ...tags];
    return this;
  }

  build(): TransformationRule {
    if (!this.rule.id || !this.rule.name) {
      throw new Error('Rule must have id and name');
    }
    
    if (!this.rule.fieldPatterns || this.rule.fieldPatterns.length === 0) {
      throw new Error('Rule must have at least one field pattern');
    }
    
    if (!this.rule.transformation) {
      throw new Error('Rule must specify transformation');
    }
    
    if (!this.rule.compliance) {
      throw new Error('Rule must specify compliance information');
    }

    const rule: TransformationRule = {
      id: this.rule.id,
      name: this.rule.name,
      description: this.rule.description || '',
      priority: this.rule.priority || 100,
      enabled: this.rule.enabled ?? true,
      fieldPatterns: this.rule.fieldPatterns,
      conditions: this.rule.conditions || [],
      transformation: this.rule.transformation,
      compliance: this.rule.compliance,
      metadata: this.rule.metadata || {
        createdBy: 'system',
        createdAt: new Date(),
        version: '1.0.0',
        tags: []
      }
    };

    return rule;
  }
}

/**
 * Australian compliance rule templates
 */
export const AustralianRuleTemplates = {
  /**
   * Privacy Act 1988 compliance rules
   */
  privacyAct: {
    personalData(): TransformationRule {
      return RuleBuilder.create()
        .id('aus-privacy-personal-data')
        .name('Privacy Act - Personal Data Protection')
        .description('Encrypt personal data under Privacy Act 1988')
        .priority(100)
        .matchFields(['*.email', '*.phone', '*.address'])
        .whenComplianceFramework('privacy_act_1988')
        .encrypt('privacy-act-key')
        .compliance(['privacy_act_1988'], 'Personal information protection', 'Privacy Act 1988 (Cth) s 13')
        .tag('privacy-act', 'personal-data', 'australia')
        .build();
    },

    sensitiveData(): TransformationRule {
      return RuleBuilder.create()
        .id('aus-privacy-sensitive-data')
        .name('Privacy Act - Sensitive Data Protection')
        .description('Redact sensitive personal information')
        .priority(150)
        .matchFields(['*.race', '*.ethnicity', '*.political_opinion', '*.religious_belief'])
        .whenComplianceFramework('privacy_act_1988')
        .redact('[SENSITIVE_DATA_PROTECTED]')
        .compliance(['privacy_act_1988'], 'Sensitive information protection', 'Privacy Act 1988 (Cth) s 6')
        .tag('privacy-act', 'sensitive-data', 'australia')
        .build();
    },

    healthData(): TransformationRule {
      return RuleBuilder.create()
        .id('aus-privacy-health-data')
        .name('Privacy Act - Health Data Protection')
        .description('Encrypt health information')
        .priority(200)
        .matchFields(['*.medicare', '*.health_record', '*.medical_*'])
        .whenComplianceFramework('privacy_act_1988')
        .encrypt('health-data-key')
        .compliance(['privacy_act_1988'], 'Health information protection', 'Privacy Act 1988 (Cth) s 6')
        .tag('privacy-act', 'health-data', 'australia')
        .build();
    }
  },

  /**
   * AUSTRAC compliance rules
   */
  austrac: {
    tfnProtection(): TransformationRule {
      return RuleBuilder.create()
        .id('austrac-tfn-protection')
        .name('AUSTRAC - TFN Protection')
        .description('Encrypt Tax File Numbers for AUSTRAC compliance')
        .priority(250)
        .matchField('*.tfn', { valuePattern: AustralianPatterns.TFN.source })
        .matchField('*.tax_file_number')
        .whenComplianceFramework('austrac')
        .encrypt('tfn-key', 'aes-256-gcm')
        .compliance(['austrac'], 'TFN protection under tax secrecy', 'Taxation Administration Act 1953 (Cth) s 355-65')
        .tag('austrac', 'tfn', 'high-security')
        .build();
    },

    financialReporting(): TransformationRule {
      return RuleBuilder.create()
        .id('austrac-financial-reporting')
        .name('AUSTRAC - Financial Reporting')
        .description('Generalize financial amounts for reporting')
        .priority(100)
        .matchFields(['*.amount', '*.balance', '*.transaction_amount'])
        .whenComplianceFramework('austrac')
        .generalize(2) // Round to nearest $100
        .compliance(['austrac'], 'Financial transaction reporting', 'Anti-Money Laundering and Counter-Terrorism Financing Act 2006')
        .tag('austrac', 'financial-reporting')
        .build();
    },

    abnMasking(): TransformationRule {
      return RuleBuilder.create()
        .id('austrac-abn-masking')
        .name('AUSTRAC - ABN Masking')
        .description('Mask Australian Business Numbers')
        .priority(120)
        .matchField('*.abn', { valuePattern: AustralianPatterns.ABN.source })
        .whenComplianceFramework('austrac')
        .mask('*', 4)
        .compliance(['austrac'], 'Business number protection')
        .tag('austrac', 'abn', 'business')
        .build();
    }
  },

  /**
   * Indigenous data sovereignty rules (CARE Principles)
   */
  indigenous: {
    culturalData(): TransformationRule {
      return RuleBuilder.create()
        .id('indigenous-cultural-data')
        .name('Indigenous - Cultural Data Sovereignty')
        .description('Protect Indigenous cultural information')
        .priority(300)
        .matchFields([
          '*.indigenous_status',
          '*.traditional_owner',
          '*.cultural_*',
          '*.sacred_*',
          '*.ceremony_*',
          '*.dreamtime_*'
        ])
        .whenSovereigntyLevel(SovereigntyLevel.TRADITIONAL_OWNER)
        .redact('[INDIGENOUS_DATA_PROTECTED]')
        .compliance(['care_principles', 'indigenous_sovereignty'], 'Cultural information protection', 'CARE Principles for Indigenous Data Governance')
        .tag('indigenous', 'cultural', 'sovereignty', 'care-principles')
        .build();
    },

    personalData(): TransformationRule {
      return RuleBuilder.create()
        .id('indigenous-personal-data')
        .name('Indigenous - Personal Data Extended Retention')
        .description('Special handling for Indigenous personal data')
        .priority(250)
        .matchFields(['*.name', '*.contact_*'])
        .whenSovereigntyLevel(SovereigntyLevel.TRADITIONAL_OWNER)
        .encrypt('indigenous-data-key')
        .compliance(['care_principles'], 'Indigenous personal data with extended retention')
        .tag('indigenous', 'personal-data', 'extended-retention')
        .build();
    }
  },

  /**
   * ACNC compliance rules
   */
  acnc: {
    financialData(): TransformationRule {
      return RuleBuilder.create()
        .id('acnc-financial-data')
        .name('ACNC - Financial Data Reporting')
        .description('Prepare financial data for ACNC reporting')
        .priority(100)
        .matchFields(['*.revenue', '*.expenses', '*.assets', '*.liabilities'])
        .whenComplianceFramework('acnc_compliance')
        .generalize(3) // Round to nearest $1000
        .compliance(['acnc_compliance'], 'Financial transparency for charities', 'Australian Charities and Not-for-profits Commission Act 2012')
        .tag('acnc', 'financial-transparency')
        .build();
    },

    beneficiaryData(): TransformationRule {
      return RuleBuilder.create()
        .id('acnc-beneficiary-data')
        .name('ACNC - Beneficiary Data Protection')
        .description('Anonymize beneficiary data for reporting')
        .priority(150)
        .matchFields(['*.beneficiary_name', '*.client_name'])
        .whenComplianceFramework('acnc_compliance')
        .tokenize('random')
        .compliance(['acnc_compliance', 'privacy_act_1988'], 'Beneficiary privacy in charity reporting')
        .tag('acnc', 'beneficiary', 'anonymization')
        .build();
    }
  }
};

/**
 * Context builder utility
 */
export class ContextBuilder {
  private context: Partial<TransformationContext> = {};

  static create(): ContextBuilder {
    return new ContextBuilder();
  }

  user(userId: string, organisationId?: string): ContextBuilder {
    this.context.userId = userId;
    this.context.organisationId = organisationId;
    return this;
  }

  roles(...roles: string[]): ContextBuilder {
    this.context.roles = roles;
    return this;
  }

  consent(level: ConsentLevel): ContextBuilder {
    this.context.consentLevel = level;
    return this;
  }

  sovereignty(level: SovereigntyLevel): ContextBuilder {
    this.context.sovereigntyLevel = level;
    return this;
  }

  purpose(purpose: string): ContextBuilder {
    this.context.purpose = purpose;
    return this;
  }

  compliance(...frameworks: string[]): ContextBuilder {
    this.context.complianceFrameworks = frameworks;
    return this;
  }

  location(country: string, region: string): ContextBuilder {
    this.context.location = { country, region };
    return this;
  }

  temporal(accessTime: Date, expiryTime?: Date, businessHours: boolean = true): ContextBuilder {
    this.context.temporal = {
      accessTime,
      expiryTime,
      businessHours
    };
    return this;
  }

  build(): TransformationContext {
    if (!this.context.userId) {
      throw new Error('Context must have userId');
    }

    return {
      userId: this.context.userId,
      organisationId: this.context.organisationId,
      roles: this.context.roles || [],
      consentLevel: this.context.consentLevel || ConsentLevel.NO_CONSENT,
      sovereigntyLevel: this.context.sovereigntyLevel || SovereigntyLevel.INDIVIDUAL,
      purpose: this.context.purpose || '',
      complianceFrameworks: this.context.complianceFrameworks || [],
      location: this.context.location,
      temporal: this.context.temporal
    };
  }
}

/**
 * Australian compliance context presets
 */
export const AustralianContextPresets = {
  /**
   * Government agency access context
   */
  governmentAgency(userId: string, purpose: string): TransformationContext {
    return ContextBuilder.create()
      .user(userId, 'government-agency')
      .roles('government_officer', 'compliance_officer')
      .consent(ConsentLevel.FULL_AUTOMATION)
      .sovereignty(SovereigntyLevel.GOVERNMENT)
      .purpose(purpose)
      .compliance('privacy_act_1988', 'government_information_act')
      .location('Australia', 'ACT')
      .temporal(new Date(), undefined, true)
      .build();
  },

  /**
   * Traditional Owner access context
   */
  traditionalOwner(userId: string, purpose: string): TransformationContext {
    return ContextBuilder.create()
      .user(userId)
      .roles('traditional_owner', 'elder', 'cultural_keeper')
      .consent(ConsentLevel.FULL_AUTOMATION)
      .sovereignty(SovereigntyLevel.TRADITIONAL_OWNER)
      .purpose(purpose)
      .compliance('care_principles', 'indigenous_sovereignty')
      .location('Australia', 'National')
      .temporal(new Date(), undefined, true)
      .build();
  },

  /**
   * Charity organization context
   */
  charityOrganisation(userId: string, orgId: string, purpose: string): TransformationContext {
    return ContextBuilder.create()
      .user(userId, orgId)
      .roles('charity_worker', 'case_manager')
      .consent(ConsentLevel.PARTIAL_AUTOMATION)
      .sovereignty(SovereigntyLevel.ORGANISATION)
      .purpose(purpose)
      .compliance('privacy_act_1988', 'acnc_compliance')
      .location('Australia', 'National')
      .temporal(new Date(), undefined, true)
      .build();
  },

  /**
   * Financial institution context
   */
  financialInstitution(userId: string, purpose: string): TransformationContext {
    return ContextBuilder.create()
      .user(userId, 'financial-institution')
      .roles('financial_officer', 'compliance_officer')
      .consent(ConsentLevel.PARTIAL_AUTOMATION)
      .sovereignty(SovereigntyLevel.ORGANISATION)
      .purpose(purpose)
      .compliance('privacy_act_1988', 'austrac', 'banking_act')
      .location('Australia', 'National')
      .temporal(new Date(), undefined, true)
      .build();
  },

  /**
   * Researcher access context
   */
  researcher(userId: string, purpose: string): TransformationContext {
    return ContextBuilder.create()
      .user(userId, 'research-institution')
      .roles('researcher', 'data_analyst')
      .consent(ConsentLevel.MANUAL_ONLY)
      .sovereignty(SovereigntyLevel.INDIVIDUAL)
      .purpose(purpose)
      .compliance('privacy_act_1988', 'nhmrc_guidelines')
      .location('Australia', 'National')
      .temporal(new Date(), undefined, true)
      .build();
  }
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
  /**
   * Validate Australian TFN format
   */
  isValidTFN(tfn: string): boolean {
    const cleanTFN = tfn.replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleanTFN)) return false;

    // TFN checksum validation
    const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
    const sum = cleanTFN
      .split('')
      .slice(0, 8)
      .reduce((acc, digit, index) => acc + parseInt(digit) * weights[index], 0);
    
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return checkDigit === parseInt(cleanTFN[8]);
  },

  /**
   * Validate Australian ABN format
   */
  isValidABN(abn: string): boolean {
    const cleanABN = abn.replace(/\s/g, '');
    if (!/^\d{11}$/.test(cleanABN)) return false;

    // ABN checksum validation
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    let sum = 0;
    
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(cleanABN[i]);
      if (i === 0) {
        sum += (digit - 1) * weights[i];
      } else {
        sum += digit * weights[i];
      }
    }
    
    return sum % 89 === 0;
  },

  /**
   * Validate Australian phone number format
   */
  isValidAustralianPhone(phone: string): boolean {
    return AustralianPatterns.PHONE.test(phone);
  },

  /**
   * Validate Australian postcode
   */
  isValidAustralianPostcode(postcode: string): boolean {
    return AustralianPatterns.POSTCODE.test(postcode);
  },

  /**
   * Validate BSB format
   */
  isValidBSB(bsb: string): boolean {
    return AustralianPatterns.BSB.test(bsb);
  }
};

/**
 * Performance utilities
 */
export const PerformanceUtils = {
  /**
   * Create performance monitoring decorator
   */
  measurePerformance<T extends (...args: any[]) => any>(
    fn: T,
    label: string
  ): T {
    return ((...args: any[]) => {
      const startTime = performance.now();
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          console.log(`${label}: ${endTime - startTime}ms`);
        });
      } else {
        const endTime = performance.now();
        console.log(`${label}: ${endTime - startTime}ms`);
        return result;
      }
    }) as T;
  },

  /**
   * Batch operations utility
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10,
    concurrency: number = 3
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(processor);
      
      // Process batch with limited concurrency
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  },

  /**
   * Memory usage monitoring
   */
  getMemoryUsage(): { heapUsed: number; heapTotal: number; rss: number } {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024) // MB
    };
  }
};

/**
 * Statistics utilities
 */
export const StatsUtils = {
  /**
   * Calculate percentiles from array of numbers
   */
  calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
    const sorted = values.slice().sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0
    };
  },

  /**
   * Calculate moving average
   */
  movingAverage(values: number[], windowSize: number = 10): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = values.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(average);
    }
    
    return result;
  },

  /**
   * Merge transformation statistics
   */
  mergeStats(stats1: TransformationStats, stats2: TransformationStats): TransformationStats {
    const totalTransformations = stats1.totalTransformations + stats2.totalTransformations;
    
    // Merge transformation counts by type
    const byType: Record<TransformationType, number> = {} as any;
    for (const type of Object.values(TransformationType)) {
      byType[type] = (stats1.byType[type] || 0) + (stats2.byType[type] || 0);
    }
    
    // Calculate weighted averages
    const totalWeight = stats1.totalTransformations + stats2.totalTransformations;
    const averageTime = totalWeight > 0 
      ? (stats1.averageTime * stats1.totalTransformations + stats2.averageTime * stats2.totalTransformations) / totalWeight
      : 0;
    
    const successRate = totalWeight > 0
      ? (stats1.successRate * stats1.totalTransformations + stats2.successRate * stats2.totalTransformations) / totalWeight
      : 100;

    return {
      totalTransformations,
      byType,
      averageTime,
      successRate,
      reversalsPerformed: stats1.reversalsPerformed + stats2.reversalsPerformed,
      complianceViolations: stats1.complianceViolations + stats2.complianceViolations,
      performancePercentiles: {
        p50: Math.max(stats1.performancePercentiles.p50, stats2.performancePercentiles.p50),
        p95: Math.max(stats1.performancePercentiles.p95, stats2.performancePercentiles.p95),
        p99: Math.max(stats1.performancePercentiles.p99, stats2.performancePercentiles.p99)
      }
    };
  }
};

/**
 * Data masking utilities
 */
export const MaskingUtils = {
  /**
   * Mask credit card numbers
   */
  maskCreditCard(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 8) return cardNumber;
    
    const firstFour = cleaned.slice(0, 4);
    const lastFour = cleaned.slice(-4);
    const middle = '*'.repeat(cleaned.length - 8);
    
    return `${firstFour}${middle}${lastFour}`;
  },

  /**
   * Mask email addresses
   */
  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    
    const maskedLocal = local.length > 2 
      ? local.slice(0, 2) + '*'.repeat(local.length - 2)
      : '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  },

  /**
   * Mask Australian phone numbers
   */
  maskAustralianPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 8) return phone;
    
    const prefix = phone.startsWith('+61') ? '+61' : '0';
    const areaCode = cleaned.slice(prefix === '+61' ? 2 : 1, prefix === '+61' ? 3 : 2);
    const masked = '*'.repeat(cleaned.length - (prefix === '+61' ? 3 : 2));
    
    return `${prefix}${areaCode}${masked}`;
  }
};

/**
 * Export all utilities
 */
export {
  RuleBuilder,
  ContextBuilder,
  AustralianRuleTemplates,
  AustralianContextPresets,
  ValidationUtils,
  PerformanceUtils,
  StatsUtils,
  MaskingUtils
};