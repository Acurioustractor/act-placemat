/**
 * Contact Intelligence Engagement Module
 *
 * Handles engagement strategy determination and priority assessment
 * for contact intelligence.
 *
 * @module contacts/engagement
 */

/**
 * Engagement strategies for contact intelligence
 */
export class ContactEngagement {
  /**
   * Determine engagement priority based on contact and scores
   * @param {Object} contact - Contact record
   * @param {Object} scores - Calculated scores
   * @returns {string} Engagement priority level ('critical', 'high', 'medium', 'low')
   */
  determineEngagementPriority(contact, scores) {
    const compositeScore = (
      scores.influence * 0.3 +
      scores.alignment * 0.25 +
      scores.accessibility * 0.2 +
      scores.timing * 0.15 +
      scores.strategicValue * 0.1
    );

    if (compositeScore >= 80) return 'critical';
    if (compositeScore >= 65) return 'high';
    if (compositeScore >= 45) return 'medium';
    return 'low';
  }

  /**
   * Suggest engagement strategy based on contact profile
   * @param {Object} contact - Contact record
   * @param {Object} scores - Calculated scores
   * @returns {string} Suggested engagement strategy
   */
  suggestEngagementStrategy(contact, scores) {
    if (contact.sector === 'government') {
      return 'Formal policy briefing with evidence-based recommendations';
    }
    if (contact.sector === 'media') {
      return 'Media collaboration with exclusive access to data and stories';
    }
    if (contact.sector === 'academic') {
      return 'Research partnership and joint publication opportunities';
    }
    if (contact.indigenous_affiliation) {
      return 'Culturally appropriate community consultation and partnership';
    }
    if (contact.sector === 'foundation') {
      return 'Strategic partnership proposal with outcome measurement';
    }

    return 'Informational networking meeting with value proposition';
  }
}

export default ContactEngagement;
