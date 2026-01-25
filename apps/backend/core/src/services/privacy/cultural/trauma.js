/**
 * Cultural Protocol Enforcer - Trauma Sensitivity Module
 *
 * Handles trauma-informed data handling and sensitivity assessment.
 * Part of the Cultural Protocol Enforcer modular architecture.
 */

/**
 * Creates the trauma sensitivity module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Trauma sensitivity methods
 */
export function createTraumaModule(dependencies = {}) {
  const { logger = console, traumaProtocols = {} } = dependencies;

  /**
   * Assesses trauma sensitivity
   * @param {Object} data - Data to check
   * @param {Object} context - Processing context
   * @returns {Object} Assessment result
   */
  async function assessTraumaSensitivity(data, context) {
    const assessment = {
      trauma_risk_high: false,
      trauma_indicators_detected: [],
      warnings: [],
      support_resources_needed: false,
      healing_approach_required: false
    };

    try {
      const dataString = JSON.stringify(data).toLowerCase();

      // Check for trauma indicators
      const traumaIndicators = [
        'abuse', 'violence', 'assault', 'discrimination', 'racism',
        'removal', 'stolen generation', 'family separation',
        'suicide', 'self harm', 'depression', 'anxiety',
        'substance abuse', 'addiction', 'incarceration',
        'death', 'loss', 'grief', 'mourning'
      ];

      for (const indicator of traumaIndicators) {
        if (dataString.includes(indicator)) {
          assessment.trauma_indicators_detected.push(indicator);
          assessment.trauma_risk_high = true;
        }
      }

      // Historical trauma indicators
      const historicalTraumaIndicators = [
        'colonization', 'genocide', 'dispossession', 'forced removal',
        'cultural destruction', 'language loss', 'traditional knowledge loss',
        'mission', 'reserve', 'government control', 'assimilation'
      ];

      for (const indicator of historicalTraumaIndicators) {
        if (dataString.includes(indicator)) {
          assessment.trauma_indicators_detected.push(`historical: ${indicator}`);
          assessment.trauma_risk_high = true;
          assessment.healing_approach_required = true;
        }
      }

      // Generate warnings
      if (assessment.trauma_risk_high) {
        assessment.warnings.push('Content contains potentially traumatic material');
        assessment.warnings.push('Trauma-informed handling protocols required');
        assessment.support_resources_needed = true;

        if (assessment.healing_approach_required) {
          assessment.warnings.push('Healing-centered approach required for historical trauma content');
        }
      }

      // Check for vulnerable populations
      if (dataString.includes('youth') || dataString.includes('child') || dataString.includes('young')) {
        assessment.warnings.push('Youth-focused content requires additional protection');
        assessment.support_resources_needed = true;
      }

    } catch (error) {
      logger.error('Trauma sensitivity assessment error:', error);
      assessment.trauma_risk_high = true;
      assessment.warnings.push('Trauma sensitivity assessment system error - applying maximum protection');
    }

    return assessment;
  }

  /**
   * Checks for historical trauma indicators
   * @param {Object} data - Data to check
   * @returns {Object} Historical trauma assessment
   */
  function assessHistoricalTrauma(data) {
    const assessment = {
      has_historical_trauma: false,
      indicators: [],
      healing_approach_required: false
    };

    const dataString = JSON.stringify(data).toLowerCase();
    const historicalIndicators = [
      'colonization', 'genocide', 'dispossession', 'forced removal',
      'cultural destruction', 'language loss', 'mission', 'reserve',
      'government control', 'assimilation', 'stolen generation'
    ];

    for (const indicator of historicalIndicators) {
      if (dataString.includes(indicator)) {
        assessment.indicators.push(indicator);
        assessment.has_historical_trauma = true;
        assessment.healing_approach_required = true;
      }
    }

    return assessment;
  }

  /**
   * Generates appropriate content warnings
   * @param {Object} assessment - Trauma assessment result
   * @returns {string[]} Content warnings
   */
  function generateContentWarnings(assessment) {
    const warnings = [];

    if (assessment.trauma_risk_high) {
      warnings.push('Content Warning: This material contains references to trauma');
    }

    if (assessment.trauma_indicators_detected.some(i => i.includes('historical'))) {
      warnings.push('Content Warning: Historical trauma references included');
    }

    if (assessment.trauma_indicators_detected.includes('suicide') ||
        assessment.trauma_indicators_detected.includes('self harm')) {
      warnings.push('Content Warning: Suicide and self-harm references');
    }

    if (assessment.trauma_indicators_detected.includes('violence') ||
        assessment.trauma_indicators_detected.includes('abuse')) {
      warnings.push('Content Warning: Violence and abuse references');
    }

    return warnings;
  }

  /**
   * Gets support resources for trauma-related content
   * @param {Object} context - Processing context
   * @returns {Object} Support resources
   */
  function getSupportResources(context) {
    return {
      crisis_support: {
        australia: '13 11 14',
        international: 'Find resources at findahelpline.com'
      },
      cultural_support: {
        description: 'Culturally appropriate support services',
        recommended: true
      },
      general_resources: {
        mental_health: 'Beyond Blue: 1300 22 4636',
        kids_helpline: '1800 55 1800'
      }
    };
  }

  /**
   * Validates storytelling ethics for trauma content
   * @param {Object} story - Story content
   * @param {Object} context - Processing context
   * @returns {Object} Ethics validation result
   */
  function validateStorytellingEthics(story, context) {
    return {
      valid: true,
      concerns: [],
      requirements: [
        'Explicit informed consent for trauma story sharing',
        'Storyteller maintains agency over their story',
        'Clear healing or advocacy purpose for story sharing',
        'Protection from exploitation or voyeurism'
      ]
    };
  }

  /**
   * Applies trauma-informed handling to data
   * @param {Object} data - Data to process
   * @param {Object} context - Processing context
   * @returns {Object} Trauma-informed processing result
   */
  async function applyTraumaInformedHandling(data, context) {
    const assessment = await assessTraumaSensitivity(data, context);

    const result = {
      processed: true,
      trauma_risk_high: assessment.trauma_risk_high,
      content_warnings: generateContentWarnings(assessment),
      support_resources_provided: assessment.support_resources_needed,
      healing_approach: assessment.healing_approach_required,
      recommendations: []
    };

    if (assessment.trauma_risk_high) {
      result.recommendations.push('Provide content warnings before display');
      result.recommendations.push('Ensure support resources are available');
    }

    if (assessment.healing_approach_required) {
      result.recommendations.push('Use healing-centered framing');
      result.recommendations.push('Highlight community resilience and strengths');
    }

    return result;
  }

  /**
   * Checks for vulnerable populations
   * @param {Object} data - Data to check
   * @returns {Object} Vulnerability assessment
   */
  function assessVulnerability(data) {
    const dataString = JSON.stringify(data).toLowerCase();
    const vulnerableIndicators = [];

    if (dataString.includes('youth') || dataString.includes('child') || dataString.includes('young')) {
      vulnerableIndicators.push({ type: 'youth', severity: 'high' });
    }

    if (dataString.includes('elder') || dataString.includes('senior')) {
      vulnerableIndicators.push({ type: 'elder', severity: 'medium' });
    }

    if (dataString.includes('disabil') || dataString.includes('neurodivergent')) {
      vulnerableIndicators.push({ type: 'disability', severity: 'high' });
    }

    return {
      has_vulnerable_populations: vulnerableIndicators.length > 0,
      indicators: vulnerableIndicators,
      additional_protections_required: vulnerableIndicators.length > 0
    };
  }

  return {
    assessTraumaSensitivity,
    assessHistoricalTrauma,
    generateContentWarnings,
    getSupportResources,
    validateStorytellingEthics,
    applyTraumaInformedHandling,
    assessVulnerability
  };
}

export default {
  createTraumaModule
};
