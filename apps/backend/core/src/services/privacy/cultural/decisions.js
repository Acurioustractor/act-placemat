/**
 * Cultural Protocol Enforcer - Enforcement Decisions Module
 *
 * Handles enforcement decision generation and policy application.
 * Part of the Cultural Protocol Enforcer modular architecture.
 */

/**
 * Creates the enforcement decisions module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Decision methods
 */
export function createDecisionsModule(dependencies = {}) {
  const { logger = console } = dependencies;

  /**
   * Generates enforcement decision based on enforcement state
   * @param {Object} enforcement - Enforcement state
   * @returns {Object} Decision with approval status and next steps
   */
  function generateEnforcementDecision(enforcement) {
    const decision = {
      approved: false,
      reason: '',
      conditions: [],
      next_steps: [],
      requires_manual_review: false,
      cultural_advisor_review_required: false
    };

    try {
      // Automatic rejection for sacred knowledge violations
      if (enforcement.violations_detected.some(v => v.includes('Sacred') || v.includes('Ceremonial'))) {
        decision.approved = false;
        decision.reason = 'Sacred knowledge protection violations detected';
        decision.requires_manual_review = true;
        decision.cultural_advisor_review_required = true;
        decision.next_steps = [
          'Consult with appropriate cultural authorities',
          'Review cultural protocols with community Elders',
          'Obtain explicit cultural permission before proceeding'
        ];
        return decision;
      }

      // Rejection for major violations
      if (enforcement.violations_detected.length > 0) {
        const majorViolations = enforcement.violations_detected.filter(v =>
          v.includes('sovereignty') || v.includes('consent') || v.includes('community')
        );

        if (majorViolations.length > 0) {
          decision.approved = false;
          decision.reason = 'Major cultural protocol violations detected';
          decision.requires_manual_review = true;
          decision.next_steps = [
            'Address consent and sovereignty issues',
            'Engage with affected communities',
            'Implement appropriate safeguards'
          ];
          return decision;
        }
      }

      // Conditional approval with warnings
      if (enforcement.warnings_issued.length > 0) {
        decision.approved = true;
        decision.reason = 'Approved with cultural sensitivity conditions';
        decision.conditions = enforcement.warnings_issued.map(w => `Address: ${w}`);
        decision.next_steps = [
          'Implement trauma-informed approaches',
          'Provide appropriate content warnings',
          'Ensure ongoing cultural sensitivity monitoring'
        ];

        if (enforcement.cultural_review_needed) {
          decision.cultural_advisor_review_required = true;
          decision.conditions.push('Cultural advisor review required within 48 hours');
        }

        return decision;
      }

      // Full approval
      if (enforcement.violations_detected.length === 0) {
        decision.approved = true;
        decision.reason = 'All cultural protocols satisfied';
        decision.next_steps = [
          'Proceed with ongoing cultural sensitivity monitoring',
          'Maintain consent and relationship protocols'
        ];
        return decision;
      }

      // Default to requiring review
      decision.approved = false;
      decision.reason = 'Uncertain compliance status - requires manual review';
      decision.requires_manual_review = true;

    } catch (error) {
      logger.error('Enforcement decision generation error:', error);
      decision.approved = false;
      decision.reason = 'Decision system error - defaulting to manual review';
      decision.requires_manual_review = true;
    }

    return decision;
  }

  /**
   * Determines if escalation is required
   * @param {Object} enforcement - Enforcement state
   * @returns {Object} Escalation requirements
   */
  function determineEscalationRequirements(enforcement) {
    const escalations = {
      required: false,
      types: [],
      urgency: 'normal'
    };

    if (enforcement.violations_detected.some(v => v.includes('Sacred') || v.includes('Ceremonial'))) {
      escalations.required = true;
      escalations.types.push('IMMEDIATE_CULTURAL_AUTHORITY_CONSULTATION');
      escalations.urgency = 'critical';
    }

    if (enforcement.violations_detected.some(v => v.includes('sovereignty'))) {
      escalations.required = true;
      escalations.types.push('COMMUNITY_LEADERSHIP_ESCALATION');
      escalations.urgency = 'high';
    }

    if (enforcement.violations_detected.some(v => v.includes('consent'))) {
      escalations.required = true;
      escalations.types.push('CONSENT_MANAGEMENT_ESCALATION');
      escalations.urgency = 'high';
    }

    return escalations;
  }

  /**
   * Generates next steps based on enforcement state
   * @param {Object} enforcement - Enforcement state
   * @returns {string[]} List of next steps
   */
  function generateNextSteps(enforcement) {
    const nextSteps = [];

    if (enforcement.violations_detected.some(v => v.includes('Sacred'))) {
      nextSteps.push('Consult with appropriate cultural authorities');
      nextSteps.push('Review cultural protocols with community Elders');
      nextSteps.push('Obtain explicit cultural permission before proceeding');
    }

    if (enforcement.violations_detected.some(v => v.includes('sovereignty'))) {
      nextSteps.push('Address consent and sovereignty issues');
      nextSteps.push('Engage with affected communities');
      nextSteps.push('Implement appropriate safeguards');
    }

    if (enforcement.warnings_issued.length > 0) {
      nextSteps.push('Implement trauma-informed approaches');
      nextSteps.push('Provide appropriate content warnings');
      nextSteps.push('Ensure ongoing cultural sensitivity monitoring');
    }

    if (enforcement.cultural_review_needed) {
      nextSteps.push('Schedule cultural advisor review within 48 hours');
    }

    if (enforcement.violations_detected.length === 0) {
      nextSteps.push('Proceed with ongoing cultural sensitivity monitoring');
      nextSteps.push('Maintain consent and relationship protocols');
    }

    return nextSteps;
  }

  /**
   * Determines conditions for approval
   * @param {Object} enforcement - Enforcement state
   * @returns {string[]} List of conditions
   */
  function determineApprovalConditions(enforcement) {
    const conditions = [];

    if (enforcement.warnings_issued.length > 0) {
      conditions.push(...enforcement.warnings_issued.map(w => `Address: ${w}`));
    }

    if (enforcement.cultural_review_needed) {
      conditions.push('Cultural advisor review required within 48 hours');
    }

    return conditions;
  }

  /**
   * Calculates compliance score
   * @param {Object} enforcement - Enforcement state
   * @returns {number} Compliance score (0-100)
   */
  function calculateComplianceScore(enforcement) {
    const baseScore = 100;
    const violationPenalty = enforcement.violations_detected.length * 20;
    const warningPenalty = enforcement.warnings_issued.length * 5;

    return Math.max(0, Math.min(100, baseScore - violationPenalty - warningPenalty));
  }

  /**
   * Generates compliance report
   * @param {Object} enforcement - Enforcement state
   * @param {Object} decision - Enforcement decision
   * @returns {Object} Compliance report
   */
  function generateComplianceReport(enforcement, decision) {
    return {
      report_id: `compliance-${Date.now()}`,
      generated_at: new Date().toISOString(),
      operation: enforcement.operation,
      compliance_status: decision.approved ? 'COMPLIANT' : 'NON_COMPLIANT',
      compliance_score: calculateComplianceScore(enforcement),
      protocols_checked: enforcement.protocols_checked.length,
      violations: enforcement.violations_detected,
      warnings: enforcement.warnings_issued,
      decision: decision,
      next_steps: decision.next_steps
    };
  }

  /**
   * Determines review urgency
   * @param {Object} enforcement - Enforcement state
   * @returns {string} Urgency level
   */
  function determineReviewUrgency(enforcement) {
    if (enforcement.violations_detected.some(v => v.includes('Sacred') || v.includes('Ceremonial'))) {
      return 'critical';
    }
    if (enforcement.violations_detected.length > 0) {
      return 'high';
    }
    if (enforcement.warnings_issued.length > 0) {
      return 'normal';
    }
    return 'low';
  }

  return {
    generateEnforcementDecision,
    determineEscalationRequirements,
    generateNextSteps,
    determineApprovalConditions,
    calculateComplianceScore,
    generateComplianceReport,
    determineReviewUrgency
  };
}

export default {
  createDecisionsModule
};
