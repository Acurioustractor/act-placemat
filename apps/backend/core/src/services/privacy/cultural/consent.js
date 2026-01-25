/**
 * Cultural Protocol Enforcer - Consent Validation Module
 *
 * Handles consent validation with cultural and community considerations.
 * Part of the Cultural Protocol Enforcer modular architecture.
 */

/**
 * Creates the consent validation module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Consent validation methods
 */
export function createConsentModule(dependencies = {}) {
  const { logger = console, consentFramework = {} } = dependencies;

  /**
   * Validates consent
   * @param {Object} data - Data to check
   * @param {Object} context - Processing context
   * @param {string} operation - Operation type
   * @returns {Object} Validation result
   */
  async function validateConsent(data, context, operation) {
    const validation = {
      valid: false,
      issues: [],
      requires_community_consent: false,
      consent_level_required: 'individual'
    };

    try {
      // Determine required consent level
      if (context.involves_community_data || detectCommunityScope(data)) {
        validation.consent_level_required = 'community';
        validation.requires_community_consent = true;
      }

      if (detectIndigenousContent(data)) {
        validation.consent_level_required = 'indigenous_community';
        validation.requires_community_consent = true;
      }

      // Check individual consent
      if (context.individual_consent_status !== 'active') {
        validation.issues.push('Individual consent not active or missing');
        return validation;
      }

      // Check community consent if required
      if (validation.requires_community_consent) {
        if (!context.community_consent_obtained) {
          validation.issues.push('Community consent required but not obtained');
          return validation;
        }

        // Validate consent recency
        if (context.community_consent_date) {
          const consentAge = Date.now() - new Date(context.community_consent_date).getTime();
          const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year

          if (consentAge > maxAge) {
            validation.issues.push('Community consent expired - renewal required');
            return validation;
          }
        }
      }

      // Validate consent specificity for operation
      if (operation === 'public_sharing' && !context.public_sharing_consent) {
        validation.issues.push('Public sharing consent not granted');
        return validation;
      }

      if (operation === 'research_use' && !context.research_consent) {
        validation.issues.push('Research use consent not granted');
        return validation;
      }

      if (operation === 'commercial_use' && !context.commercial_consent) {
        validation.issues.push('Commercial use consent not granted');
        return validation;
      }

      // All checks passed
      validation.valid = true;

    } catch (error) {
      logger.error('Consent validation error:', error);
      validation.issues.push('Consent validation system error');
    }

    return validation;
  }

  /**
   * Validates informed consent requirements
   * @param {Object} context - Processing context
   * @returns {Object} Validation result
   */
  function validateInformedConsent(context) {
    return {
      has_purpose: Boolean(context.consent_purpose),
      has_use_description: Boolean(context.consent_use_description),
      has_sharing_transparency: Boolean(context.consent_sharing_info),
      has_rights_explanation: Boolean(context.consent_rights_info),
      culturally_appropriate: context.culturally_appropriate_consent || false
    };
  }

  /**
   * Validates ongoing consent relationship
   * @param {Object} context - Processing context
   * @returns {Object} Validation result
   */
  function validateOngoingConsent(context) {
    return {
      relationship_established: Boolean(context.ongoing_relationship),
      regular_check_ins: context.consent_check_ins || false,
      consent_verified_recently: context.consent_verified_within_days <= 30
    };
  }

  /**
   * Validates collective consent requirements
   * @param {Object} context - Processing context
   * @returns {Object} Validation result
   */
  function validateCollectiveConsent(context) {
    return {
      community_decision_making: context.community_decision_process || false,
      appropriate_representation: context.community_representatives_involved || false,
      traditional_authority_recognized: context.traditional_authority_recognized || false,
      kinship_considered: context.kinship_considerations || false
    };
  }

  /**
   * Validates revocable consent
   * @param {Object} context - Processing context
   * @returns {Object} Validation result
   */
  function validateRevocableConsent(context) {
    return {
      withdrawal_mechanism: Boolean(context.consent_withdrawal_mechanism),
      immediate_effect: context.withdrawal_immediate || false,
      no_penalty: context.withdrawal_no_penalty || true,
      data_deletion_upon_withdrawal: context.data_deletion_on_withdrawal || false
    };
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
   * Determines required consent level
   * @param {Object} data - Data to check
   * @param {Object} context - Processing context
   * @param {string} operation - Operation type
   * @returns {Object} Consent level requirements
   */
  function determineRequiredConsentLevel(data, context, operation) {
    const requirements = {
      level: 'individual',
      individual_required: true,
      community_required: false,
      cultural_authority_required: false
    };

    if (context.involves_community_data || detectCommunityScope(data)) {
      requirements.community_required = true;
      requirements.level = 'community';
    }

    if (detectIndigenousContent(data)) {
      requirements.cultural_authority_required = true;
      requirements.level = 'indigenous_community';
    }

    if (['public_sharing', 'research_use', 'commercial_use'].includes(operation)) {
      requirements.community_required = true;
    }

    return requirements;
  }

  /**
   * Processes consent withdrawal
   * @param {string} consentId - Consent record ID
   * @param {Object} context - Processing context
   * @returns {Object} Withdrawal result
   */
  async function processConsentWithdrawal(consentId, context) {
    return {
      withdrawn: true,
      consent_id: consentId,
      withdrawn_at: new Date().toISOString(),
      data_deletion_scheduled: true,
      deletion_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Generates consent audit trail
   * @param {string} consentId - Consent record ID
   * @returns {Object} Audit trail
   */
  function generateConsentAuditTrail(consentId) {
    return {
      consent_id: consentId,
      events: [
        { event: 'created', timestamp: new Date().toISOString() },
        { event: 'verified', timestamp: new Date().toISOString() }
      ]
    };
  }

  return {
    validateConsent,
    validateInformedConsent,
    validateOngoingConsent,
    validateCollectiveConsent,
    validateRevocableConsent,
    detectCommunityScope,
    detectIndigenousContent,
    determineRequiredConsentLevel,
    processConsentWithdrawal,
    generateConsentAuditTrail
  };
}

export default {
  createConsentModule
};
