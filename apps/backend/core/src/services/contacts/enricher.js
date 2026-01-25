/**
 * Contact Intelligence Enrichment Module
 *
 * Provides basic contact enrichment without heavy AI calls,
 * calculating scores and preparing contacts for engagement.
 *
 * @module contacts/enricher
 */

import { logger } from '../utils/logger.js';

/**
 * Basic enrichment service for contact intelligence
 */
export class ContactEnricher {
  constructor(supabase, youthJusticeKeywords) {
    this.supabase = supabase;
    this.youthJusticeKeywords = youthJusticeKeywords;
  }

  /**
   * Basic contact enrichment (without heavy AI calls)
   * @param {string} personId - Contact person ID
   * @returns {Promise<Object|null>} Enriched contact data or null on failure
   */
  async enrichContactBasic(personId) {
    try {
      // Get contact data
      const { data: contact, error } = await this.supabase
        .from('person_identity_map')
        .select('*')
        .eq('person_id', personId)
        .single();

      if (error) throw error;

      // Calculate basic scores
      const scores = this.calculateBasicScores(contact);

      // Determine engagement priority
      const engagementPriority = this.determineEngagementPriority(contact, scores);

      // Update contact with enriched data
      const { data: updated, error: updateError } = await this.supabase
        .from('person_identity_map')
        .update({
          youth_justice_relevance_score: scores.youthJusticeRelevance,
          engagement_priority: engagementPriority,
          engagement_strategy: this.suggestEngagementStrategy(contact, scores),
          ai_research_confidence: 0.6, // Basic enrichment confidence
          last_research_update: new Date().toISOString()
        })
        .eq('person_id', personId)
        .select()
        .single();

      if (updateError) throw updateError;

      return updated;

    } catch (error) {
      logger.error(`❌ Basic enrichment failed for ${personId}:`, error);
      return null;
    }
  }

  /**
   * Calculate basic scoring without AI calls
   * @param {Object} contact - Contact record
   * @returns {Object} Calculated scores
   */
  calculateBasicScores(contact) {
    const combinedText = `${contact.full_name} ${contact.contact_data?.title || ''} ${contact.contact_data?.organization || ''} ${contact.tags?.join(' ') || ''}`.toLowerCase();

    // Youth justice relevance based on keywords
    const keywordMatches = this.youthJusticeKeywords.filter(keyword =>
      combinedText.includes(keyword)
    ).length;
    const youthJusticeRelevance = Math.min(100, keywordMatches * 15 + 30);

    // Influence score based on sector and role
    let influenceScore = 30;
    if (contact.sector === 'government') influenceScore += 40;
    if (contact.sector === 'media') influenceScore += 35;
    if (contact.sector === 'academic') influenceScore += 25;
    if (contact.sector === 'foundation') influenceScore += 30;
    if (contact.indigenous_affiliation) influenceScore += 20;

    // Accessibility based on contact information completeness
    let accessibilityScore = 20;
    if (contact.email) accessibilityScore += 25;
    if (contact.contact_data?.phone) accessibilityScore += 15;
    if (contact.contact_data?.linkedin_url) accessibilityScore += 20;
    if (contact.contact_data?.website) accessibilityScore += 10;

    return {
      youthJusticeRelevance,
      influence: Math.min(100, influenceScore),
      accessibility: Math.min(100, accessibilityScore),
      alignment: youthJusticeRelevance, // Use same as relevance for basic scoring
      timing: 50, // Default timing score
      strategicValue: Math.min(100, (influenceScore + youthJusticeRelevance) / 2)
    };
  }

  /**
   * Determine engagement priority based on scores
   * @param {Object} contact - Contact record
   * @param {Object} scores - Calculated scores
   * @returns {string} Engagement priority level
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

export default ContactEnricher;
