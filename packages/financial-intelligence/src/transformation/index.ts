/**
 * Data Transformation and Redaction Library
 * 
 * Complete Australian compliance-focused transformation system
 * with reversible operations, audit trails, and sovereignty controls
 */

// Export main transformation engine
export { 
  TransformationEngine, 
  createDefaultTransformationConfig 
} from './TransformationEngine';

// Export all types
export * from './types';

// Export utilities and builders
export {
  RuleBuilder,
  ContextBuilder,
  AustralianRuleTemplates,
  AustralianContextPresets,
  ValidationUtils,
  PerformanceUtils,
  StatsUtils,
  MaskingUtils
} from './utils';

// Package metadata
export const TRANSFORMATION_VERSION = '1.0.0';
export const SUPPORTED_ALGORITHMS = [
  'aes-256-gcm',
  'aes-256-cbc',
  'sha256',
  'sha512'
] as const;

export const SUPPORTED_COMPLIANCE_FRAMEWORKS = [
  'privacy_act_1988',
  'austrac',
  'acnc_compliance',
  'care_principles',
  'indigenous_sovereignty',
  'banking_act',
  'government_information_act',
  'nhmrc_guidelines'
] as const;

/**
 * Quick start transformation engine factory
 */
export async function createTransformationEngine(options?: {
  includeDefaultRules?: boolean;
  complianceFrameworks?: string[];
  performanceMode?: 'high_security' | 'balanced' | 'high_performance';
}): Promise<TransformationEngine> {
  const { 
    includeDefaultRules = true,
    complianceFrameworks = ['privacy_act_1988'],
    performanceMode = 'balanced'
  } = options || {};

  // Create configuration based on performance mode
  let config = createDefaultTransformationConfig();

  switch (performanceMode) {
    case 'high_security':
      config = {
        ...config,
        performance: {
          ...config.performance,
          enableCaching: false,
          maxConcurrentTransformations: 10
        },
        security: {
          ...config.security,
          auditLogging: true,
          integrityChecking: true,
          secureErase: true
        }
      };
      break;

    case 'high_performance':
      config = {
        ...config,
        performance: {
          ...config.performance,
          enableCaching: true,
          maxConcurrentTransformations: 1000,
          cacheSize: 50000
        },
        security: {
          ...config.security,
          auditLogging: false,
          integrityChecking: false
        }
      };
      break;

    case 'balanced':
    default:
      // Use default configuration
      break;
  }

  const engine = new TransformationEngine(config);
  await engine.initialize();

  // Add compliance-specific rules if requested
  if (includeDefaultRules) {
    if (complianceFrameworks.includes('privacy_act_1988')) {
      engine.addRule(AustralianRuleTemplates.privacyAct.personalData());
      engine.addRule(AustralianRuleTemplates.privacyAct.sensitiveData());
      engine.addRule(AustralianRuleTemplates.privacyAct.healthData());
    }

    if (complianceFrameworks.includes('austrac')) {
      engine.addRule(AustralianRuleTemplates.austrac.tfnProtection());
      engine.addRule(AustralianRuleTemplates.austrac.financialReporting());
      engine.addRule(AustralianRuleTemplates.austrac.abnMasking());
    }

    if (complianceFrameworks.includes('care_principles') || 
        complianceFrameworks.includes('indigenous_sovereignty')) {
      engine.addRule(AustralianRuleTemplates.indigenous.culturalData());
      engine.addRule(AustralianRuleTemplates.indigenous.personalData());
    }

    if (complianceFrameworks.includes('acnc_compliance')) {
      engine.addRule(AustralianRuleTemplates.acnc.financialData());
      engine.addRule(AustralianRuleTemplates.acnc.beneficiaryData());
    }
  }

  return engine;
}

/**
 * Convenience function for one-off transformations
 */
export async function transformData(
  data: any,
  context: {
    userId: string;
    roles?: string[];
    purpose: string;
    complianceFrameworks?: string[];
  },
  options?: {
    rules?: string[];
    performanceMode?: 'high_security' | 'balanced' | 'high_performance';
  }
) {
  const engine = await createTransformationEngine({
    complianceFrameworks: context.complianceFrameworks,
    performanceMode: options?.performanceMode
  });

  const fullContext = ContextBuilder.create()
    .user(context.userId)
    .roles(...(context.roles || ['user']))
    .purpose(context.purpose)
    .compliance(...(context.complianceFrameworks || ['privacy_act_1988']))
    .location('Australia', 'National')
    .temporal(new Date())
    .build();

  return engine.transform(data, fullContext, options?.rules);
}

/**
 * Australian compliance presets for common scenarios
 */
export const AustralianCompliancePresets = {
  /**
   * Government data handling
   */
  async government(): Promise<TransformationEngine> {
    return createTransformationEngine({
      complianceFrameworks: [
        'privacy_act_1988',
        'government_information_act',
        'austrac'
      ],
      performanceMode: 'high_security'
    });
  },

  /**
   * Healthcare data handling
   */
  async healthcare(): Promise<TransformationEngine> {
    return createTransformationEngine({
      complianceFrameworks: [
        'privacy_act_1988',
        'nhmrc_guidelines'
      ],
      performanceMode: 'high_security'
    });
  },

  /**
   * Financial services data handling
   */
  async financial(): Promise<TransformationEngine> {
    return createTransformationEngine({
      complianceFrameworks: [
        'privacy_act_1988',
        'austrac',
        'banking_act'
      ],
      performanceMode: 'balanced'
    });
  },

  /**
   * Charity and NFP data handling
   */
  async charity(): Promise<TransformationEngine> {
    return createTransformationEngine({
      complianceFrameworks: [
        'privacy_act_1988',
        'acnc_compliance'
      ],
      performanceMode: 'balanced'
    });
  },

  /**
   * Indigenous data handling
   */
  async indigenous(): Promise<TransformationEngine> {
    return createTransformationEngine({
      complianceFrameworks: [
        'privacy_act_1988',
        'care_principles',
        'indigenous_sovereignty'
      ],
      performanceMode: 'high_security'
    });
  },

  /**
   * Research data handling
   */
  async research(): Promise<TransformationEngine> {
    return createTransformationEngine({
      complianceFrameworks: [
        'privacy_act_1988',
        'nhmrc_guidelines'
      ],
      performanceMode: 'balanced'
    });
  },

  /**
   * High-performance API gateway
   */
  async apiGateway(): Promise<TransformationEngine> {
    return createTransformationEngine({
      complianceFrameworks: ['privacy_act_1988'],
      performanceMode: 'high_performance'
    });
  }
};

/**
 * Common transformation patterns for Australian data
 */
export const AustralianTransformationPatterns = {
  /**
   * Protect all Australian government identifiers
   */
  governmentIdentifiers: [
    '*.tfn',
    '*.tax_file_number',
    '*.abn',
    '*.australian_business_number', 
    '*.medicare',
    '*.medicare_number',
    '*.centrelink_*',
    '*.pension_number'
  ],

  /**
   * Financial data fields
   */
  financialData: [
    '*.account_number',
    '*.bsb',
    '*.iban',
    '*.credit_card',
    '*.salary',
    '*.income',
    '*.assets',
    '*.liabilities',
    '*.transaction_*'
  ],

  /**
   * Contact information
   */
  contactInformation: [
    '*.email',
    '*.phone',
    '*.mobile',
    '*.address',
    '*.postcode',
    '*.street_address'
  ],

  /**
   * Indigenous cultural data
   */
  indigenousData: [
    '*.indigenous_status',
    '*.traditional_owner',
    '*.cultural_*',
    '*.sacred_*',
    '*.ceremony_*',
    '*.dreamtime_*',
    '*.elder_*',
    '*.spiritual_*'
  ],

  /**
   * Health data
   */
  healthData: [
    '*.medicare',
    '*.health_record',
    '*.medical_*',
    '*.diagnosis',
    '*.treatment',
    '*.medication',
    '*.hospital_*',
    '*.doctor_*'
  ],

  /**
   * Sensitive personal data
   */
  sensitivePersonalData: [
    '*.race',
    '*.ethnicity',
    '*.religion',
    '*.political_opinion',
    '*.sexual_orientation',
    '*.criminal_record',
    '*.union_membership'
  ]
};

/**
 * Validation helpers
 */
export { ValidationUtils as AustralianValidators } from './utils';

/**
 * Performance monitoring helpers
 */
export { PerformanceUtils as TransformationPerformance } from './utils';

/**
 * Statistics and reporting helpers
 */
export { StatsUtils as TransformationStats } from './utils';

/**
 * Data masking helpers
 */
export { MaskingUtils as DataMasking } from './utils';