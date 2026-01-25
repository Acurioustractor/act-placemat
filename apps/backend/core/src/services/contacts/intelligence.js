/**
 * Contact Intelligence Full Enrichment Module
 *
 * Provides AI-powered comprehensive contact enrichment using
 * research orchestration and intelligent analysis.
 *
 * @module contacts/intelligence
 */

import { logger } from '../utils/logger.js';

/**
 * Full AI-powered enrichment service for contact intelligence
 */
export class ContactIntelligence {
  constructor(supabase, research, ai, metrics) {
    this.supabase = supabase;
    this.research = research;
    this.ai = ai;
    this.metrics = metrics;
  }

  /**
   * Update intelligence scores in database
   * @param {string} personId - Contact person ID
   * @param {Object} scores - Calculated scores
   * @returns {Promise<void>}
   */
  async updateIntelligenceScores(personId, scores) {
    const { error } = await this.supabase
      .from('contact_intelligence_scores')
      .upsert({
        person_id: personId,
        influence_score: scores.influence,
        accessibility_score: scores.accessibility,
        alignment_score: scores.alignment,
        timing_score: scores.timing,
        strategic_value_score: scores.strategicValue,
        composite_score: Math.round(
          scores.influence * 0.3 +
          scores.alignment * 0.25 +
          scores.accessibility * 0.2 +
          scores.timing * 0.15 +
          scores.strategicValue * 0.1
        ),
        engagement_readiness: Math.min(100, (scores.accessibility + scores.timing) / 2),
        response_likelihood: Math.min(100, (scores.influence + scores.accessibility) / 2),
        last_calculated: new Date().toISOString(),
        calculation_method: 'basic_algorithm',
        confidence_level: 0.6
      });

    if (error) {
      logger.error('❌ Failed to update intelligence scores:', error);
    }
  }

  /**
   * Full AI-powered contact enrichment
   * @param {string} personId - Contact person ID
   * @returns {Promise<Object>} Enrichment result with insights
   */
  async enrichContactFull(personId) {
    try {
      const startTime = Date.now();

      // Get contact data
      const { data: contact, error } = await this.supabase
        .from('person_identity_map')
        .select('*')
        .eq('person_id', personId)
        .single();

      if (error) throw error;

      // Use existing research orchestrator for comprehensive research
      const researchData = await this.research.conductResearch({
        type: 'contact_intelligence',
        query: `${contact.full_name} ${contact.contact_data?.organization || ''} youth justice advocacy`,
        person_id: personId,
        context: {
          name: contact.full_name,
          organization: contact.contact_data?.organization,
          sector: contact.sector,
          email_domain: contact.email?.split('@')[1]
        }
      });

      // Use AI for intelligent analysis
      const aiAnalysis = await this.ai.generateResponse({
        messages: [{
          role: 'user',
          content: `Analyze this contact for youth justice advocacy potential:

          Name: ${contact.full_name}
          Organization: ${contact.contact_data?.organization || 'Unknown'}
          Sector: ${contact.sector}
          Research Data: ${JSON.stringify(researchData, null, 2)}

          Provide a JSON response with:
          1. youth_justice_relevance (0-100)
          2. influence_potential (0-100)
          3. engagement_approach (string)
          4. priority_reasons (array of strings)
          5. risk_factors (array of strings)
          6. best_contact_timing (string)
          7. conversation_starters (array of strings)`
        }],
        temperature: 0.3,
        max_tokens: 1000
      });

      // Log research data
      await this.logResearchData(personId, 'ai_full_enrichment', researchData, aiAnalysis);

      // Update contact with AI insights
      const aiInsights = this.parseAIAnalysis(aiAnalysis.content);
      await this.updateContactWithAIInsights(personId, aiInsights, researchData);

      const processingTime = Date.now() - startTime;
      this.metrics.ai_calls_made++;
      this.metrics.total_enrichments++;

      logger.info(`✅ Full AI enrichment completed for ${contact.full_name} in ${processingTime}ms`);

      return { success: true, insights: aiInsights, research: researchData };

    } catch (error) {
      logger.error(`❌ Full AI enrichment failed for ${personId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log research data to database
   * @param {string} personId - Contact person ID
   * @param {string} researchType - Type of research conducted
   * @param {Object} researchData - Research results
   * @param {Object} aiAnalysis - AI analysis output
   * @returns {Promise<void>}
   */
  async logResearchData(personId, researchType, researchData, aiAnalysis) {
    const { error } = await this.supabase
      .from('contact_research_log')
      .insert({
        person_id: personId,
        research_type: researchType,
        research_query: `AI enrichment for ${researchType}`,
        research_data: {
          research_results: researchData,
          ai_analysis: aiAnalysis,
          timestamp: new Date().toISOString()
        },
        confidence_score: 0.8,
        ai_provider: 'multi_provider_ai',
        processing_time_ms: Date.now() - this.metrics.start_time || 0,
        success: true
      });

    if (error) {
      logger.error('❌ Failed to log research data:', error);
    }
  }

  /**
   * Parse AI analysis response
   * @param {string} content - AI response content
   * @returns {Object} Parsed analysis
   */
  parseAIAnalysis(content) {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback to basic parsing
      return {
        youth_justice_relevance: 50,
        influence_potential: 50,
        engagement_approach: 'Standard professional outreach',
        priority_reasons: ['Requires further analysis'],
        confidence: 0.5
      };
    } catch (error) {
      logger.warn('⚠️ Failed to parse AI analysis, using defaults');
      return {
        youth_justice_relevance: 50,
        influence_potential: 50,
        engagement_approach: 'Standard professional outreach',
        confidence: 0.3
      };
    }
  }

  /**
   * Update contact with AI insights
   * @param {string} personId - Contact person ID
   * @param {Object} aiInsights - Parsed AI insights
   * @param {Object} researchData - Research data
   * @returns {Promise<void>}
   */
  async updateContactWithAIInsights(personId, aiInsights, researchData) {
    const { error } = await this.supabase
      .from('person_identity_map')
      .update({
        youth_justice_relevance_score: aiInsights.youth_justice_relevance,
        engagement_priority: this.determinePriorityFromInsights(aiInsights),
        engagement_strategy: aiInsights.engagement_approach,
        ai_research_confidence: aiInsights.confidence || 0.8,
        last_research_update: new Date().toISOString(),
        research_data: researchData
      })
      .eq('person_id', personId);

    if (error) {
      logger.error('❌ Failed to update contact with AI insights:', error);
    }
  }

  /**
   * Determine priority from AI insights
   * @param {Object} aiInsights - AI analysis insights
   * @returns {string} Priority level
   */
  determinePriorityFromInsights(aiInsights) {
    const score = aiInsights.youth_justice_relevance + aiInsights.influence_potential;
    if (score >= 160) return 'critical';
    if (score >= 130) return 'high';
    if (score >= 90) return 'medium';
    return 'low';
  }
}

export default ContactIntelligence;
