/**
 * Cultural Protocol Enforcer - Detection Module
 *
 * Handles content detection for cultural sensitivity indicators.
 * Part of the Cultural Protocol Enforcer modular architecture.
 */

/**
 * Creates the detection module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Detection methods
 */
export function createDetectionModule(dependencies = {}) {
  const { logger = console } = dependencies;

  /**
   * Detects indigenous content
   * @param {Object} data - Data to check
   * @returns {boolean} Whether indigenous content is detected
   */
  function detectIndigenousContent(data) {
    const dataString = JSON.stringify(data).toLowerCase();
    const indigenousIndicators = [
      'aboriginal', 'torres strait', 'indigenous', 'first nations',
      'traditional owner', 'native title', 'country', 'mob',
      'community', 'elder', 'cultural', 'dreamtime', 'tjukurpa'
    ];

    return indigenousIndicators.some(indicator => dataString.includes(indicator));
  }

  /**
   * Detects community scope
   * @param {Object} data - Data to check
   * @returns {boolean} Whether community scope is detected
   */
  function detectCommunityScope(data) {
    const dataString = JSON.stringify(data).toLowerCase();
    const communityIndicators = [
      'community', 'collective', 'group', 'family', 'kinship',
      'neighborhood', 'local', 'regional', 'network'
    ];

    return communityIndicators.some(indicator => dataString.includes(indicator));
  }

  /**
   * Detects sacred content
   * @param {Object} data - Data to check
   * @returns {Object} Sacred content detection result
   */
  function detectSacredContent(data) {
    const result = {
      detected: false,
      indicators: [],
      protection_level: 'standard'
    };

    const dataString = JSON.stringify(data).toLowerCase();

    // Sacred site indicators
    const sacredSiteIndicators = [
      'sacred site', 'ceremony ground', 'burial ground', 'dreaming track',
      'songline', 'story place', 'water hole', 'mountain', 'cave painting'
    ];

    for (const indicator of sacredSiteIndicators) {
      if (dataString.includes(indicator)) {
        result.detected = true;
        result.indicators.push({ type: 'sacred_site', indicator });
        result.protection_level = 'absolute';
      }
    }

    // Ceremonial indicators
    const ceremonialIndicators = [
      'ceremony', 'ritual', 'initiation', 'sacred law', 'traditional law',
      'cultural protocol', 'elder knowledge', 'restricted knowledge'
    ];

    for (const indicator of ceremonialIndicators) {
      if (dataString.includes(indicator)) {
        result.detected = true;
        result.indicators.push({ type: 'ceremonial', indicator });
        result.protection_level = 'absolute';
      }
    }

    // Gender-restricted indicators
    const genderIndicators = [
      "men's business", "women's business", 'sorry business',
      'restricted knowledge', 'gender specific', 'initiated only'
    ];

    for (const indicator of genderIndicators) {
      if (dataString.includes(indicator)) {
        result.detected = true;
        result.indicators.push({ type: 'gender_restricted', indicator });
        result.protection_level = 'absolute';
      }
    }

    return result;
  }

  /**
   * Detects trauma indicators
   * @param {Object} data - Data to check
   * @returns {Object} Trauma detection result
   */
  function detectTraumaIndicators(data) {
    const result = {
      detected: false,
      indicators: [],
      historical_indicators: [],
      risk_level: 'low'
    };

    const dataString = JSON.stringify(data).toLowerCase();

    // Trauma indicators
    const traumaIndicators = [
      'abuse', 'violence', 'assault', 'discrimination', 'racism',
      'removal', 'stolen generation', 'family separation',
      'suicide', 'self harm', 'depression', 'anxiety',
      'substance abuse', 'addiction', 'incarceration',
      'death', 'loss', 'grief', 'mourning'
    ];

    for (const indicator of traumaIndicators) {
      if (dataString.includes(indicator)) {
        result.detected = true;
        result.indicators.push(indicator);
      }
    }

    // Historical trauma indicators
    const historicalIndicators = [
      'colonization', 'genocide', 'dispossession', 'forced removal',
      'cultural destruction', 'language loss', 'traditional knowledge loss',
      'mission', 'reserve', 'government control', 'assimilation'
    ];

    for (const indicator of historicalIndicators) {
      if (dataString.includes(indicator)) {
        result.detected = true;
        result.historical_indicators.push(indicator);
      }
    }

    // Determine risk level
    if (result.historical_indicators.length > 0) {
      result.risk_level = 'high';
    } else if (result.indicators.length > 3) {
      result.risk_level = 'medium';
    } else if (result.indicators.length > 0) {
      result.risk_level = 'low';
    }

    return result;
  }

  /**
   * Detects cultural sensitivity concerns
   * @param {Object} data - Data to check
   * @returns {Object} Sensitivity detection result
   */
  function detectCulturalSensitivity(data) {
    const result = {
      concerns: [],
      risk_level: 'low',
      requires_review: false
    };

    const dataString = JSON.stringify(data).toLowerCase();

    // Deficit narrative indicators
    const deficitIndicators = ['problem', 'crisis', 'struggling', 'at-risk', 'vulnerable'];
    const hasDeficitNarrative = deficitIndicators.some(i => dataString.includes(i));

    if (hasDeficitNarrative) {
      result.concerns.push('Potential deficit narrative detected');
      result.requires_review = true;
    }

    // Missing strength-based framing
    const strengthIndicators = ['resilience', 'strength', 'success', 'achievement', 'community'];
    const hasStrengthFraming = strengthIndicators.some(i => dataString.includes(i));

    if (hasDeficitNarrative && !hasStrengthFraming) {
      result.concerns.push('Missing strength-based framing');
      result.risk_level = 'medium';
    }

    return result;
  }

  /**
   * Detects sensitive data types
   * @param {Object} data - Data to check
   * @returns {Object} Sensitive data detection result
   */
  function detectSensitiveData(data) {
    const result = {
      types: [],
      requires_protection: false
    };

    const dataString = JSON.stringify(data).toLowerCase();

    const sensitiveTypeIndicators = {
      'personal_identifiable': ['name', 'address', 'phone', 'email', 'dob'],
      'health': ['medical', 'health', 'diagnosis', 'medication', 'treatment'],
      'financial': ['bank', 'account', 'credit', 'salary', 'income'],
      'legal': ['legal', 'court', 'police', 'charge', 'conviction'],
      'cultural': ['ceremony', 'sacred', 'traditional', 'elder', 'cultural']
    };

    for (const [type, indicators] of Object.entries(sensitiveTypeIndicators)) {
      if (indicators.some(i => dataString.includes(i))) {
        result.types.push(type);
        result.requires_protection = true;
      }
    }

    return result;
  }

  /**
   * Scans content for all cultural indicators
   * @param {Object} data - Data to scan
   * @returns {Object} Comprehensive scan result
   */
  function scanContent(data) {
    return {
      indigenous: detectIndigenousContent(data),
      community: detectCommunityScope(data),
      sacred: detectSacredContent(data),
      trauma: detectTraumaIndicators(data),
      sensitivity: detectCulturalSensitivity(data),
      sensitive_data: detectSensitiveData(data),
      overall_risk: calculateOverallRisk(data),
      scan_timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculates overall risk score
   * @param {Object} data - Data to assess
   * @returns {number} Risk score (0-100)
   */
  function calculateOverallRisk(data) {
    let score = 0;

    if (detectIndigenousContent(data)) score += 20;
    if (detectSacredContent(data).detected) score += 30;
    if (detectTraumaIndicators(data).detected) score += 25;
    if (detectCommunityScope(data)) score += 15;
    if (detectSensitiveData(data).requires_protection) score += 10;

    return Math.min(100, score);
  }

  return {
    detectIndigenousContent,
    detectCommunityScope,
    detectSacredContent,
    detectTraumaIndicators,
    detectCulturalSensitivity,
    detectSensitiveData,
    scanContent,
    calculateOverallRisk
  };
}

export default {
  createDetectionModule
};
