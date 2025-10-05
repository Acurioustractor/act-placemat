/**
 * Intelligent Suggestions Engine
 * Real-time interaction detection and smart follow-up recommendations
 * Analyzes email and meeting patterns to generate actionable suggestions
 */

import { createClient } from '@supabase/supabase-js';
import MultiProviderAI from './multiProviderAI.js';

class IntelligentSuggestionsEngine {
  constructor() {
    // Initialize Supabase for contact and interaction data
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    this.ai = new MultiProviderAI();

    // Suggestion types and their priority weights
    this.suggestionTypes = {
      'overdue_followup': {
        priority: 10,
        urgency: 'high',
        category: 'follow_up'
      },
      'strategic_check_in': {
        priority: 8,
        urgency: 'medium',
        category: 'relationship'
      },
      'meeting_follow_up': {
        priority: 9,
        urgency: 'high',
        category: 'follow_up'
      },
      'introduction_opportunity': {
        priority: 7,
        urgency: 'low',
        category: 'networking'
      },
      'collaboration_suggestion': {
        priority: 6,
        urgency: 'medium',
        category: 'opportunity'
      },
      'thank_you_reminder': {
        priority: 5,
        urgency: 'low',
        category: 'courtesy'
      },
      'birthday_anniversary': {
        priority: 4,
        urgency: 'low',
        category: 'personal'
      }
    };

    // Interaction analysis thresholds
    this.thresholds = {
      overdue_days: 14,          // Days without contact = overdue
      strategic_days: 30,        // Strategic contacts check-in period
      meeting_followup_days: 3,  // Days after meeting to follow up
      high_value_score: 70,      // Relationship score threshold
      response_time_hours: 48    // Expected response time
    };

    console.log('🧠 Intelligent Suggestions Engine initialized');
  }

  /**
   * Generate intelligent suggestions for all contacts
   */
  async generateAllSuggestions() {
    console.log('🧠 Generating intelligent suggestions for all contacts...');

    try {
      const suggestions = [];

      // Get all suggestions in parallel
      const [
        overdueSuggestions,
        strategicSuggestions,
        meetingSuggestions,
        introductionSuggestions,
        collaborationSuggestions
      ] = await Promise.all([
        this.getOverdueFollowUpSuggestions(),
        this.getStrategicCheckInSuggestions(),
        this.getMeetingFollowUpSuggestions(),
        this.getIntroductionOpportunities(),
        this.getCollaborationSuggestions()
      ]);

      suggestions.push(
        ...overdueSuggestions,
        ...strategicSuggestions,
        ...meetingSuggestions,
        ...introductionSuggestions,
        ...collaborationSuggestions
      );

      // Sort by priority and urgency
      const sortedSuggestions = this.prioritizeSuggestions(suggestions);

      // Enhance with AI-generated context
      const enhancedSuggestions = await this.enhanceSuggestionsWithAI(sortedSuggestions);

      console.log(`✅ Generated ${enhancedSuggestions.length} intelligent suggestions`);

      return {
        suggestions: enhancedSuggestions,
        total_suggestions: enhancedSuggestions.length,
        high_priority: enhancedSuggestions.filter(s => s.urgency === 'high').length,
        medium_priority: enhancedSuggestions.filter(s => s.urgency === 'medium').length,
        low_priority: enhancedSuggestions.filter(s => s.urgency === 'low').length,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to generate suggestions:', error);
      throw error;
    }
  }

  /**
   * Get overdue follow-up suggestions
   */
  async getOverdueFollowUpSuggestions() {
    const cutoffDate = new Date(Date.now() - this.thresholds.overdue_days * 24 * 60 * 60 * 1000);

    const { data: overdueContacts } = await this.supabase
      .from('linkedin_contacts')
      .select(`
        id, first_name, last_name, current_company, strategic_value, relationship_score,
        last_interaction, interaction_count
      `)
      .or(`last_interaction.lt.${cutoffDate.toISOString()},last_interaction.is.null`)
      .gte('relationship_score', 30) // Only suggest for contacts with some relationship
      .order('relationship_score', { ascending: false })
      .limit(20);

    return (overdueContacts || []).map(contact => ({
      id: `overdue_${contact.id}`,
      type: 'overdue_followup',
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name}`,
      contact_company: contact.current_company,
      priority: this.suggestionTypes.overdue_followup.priority,
      urgency: this.suggestionTypes.overdue_followup.urgency,
      category: this.suggestionTypes.overdue_followup.category,
      title: `Follow up with ${contact.first_name} ${contact.last_name}`,
      description: `No contact for ${this.getDaysSince(contact.last_interaction)} days`,
      context: {
        days_since_contact: this.getDaysSince(contact.last_interaction),
        relationship_score: contact.relationship_score,
        strategic_value: contact.strategic_value,
        last_interaction: contact.last_interaction
      },
      suggested_actions: [
        'Send a check-in email',
        'Schedule a coffee meeting',
        'Share relevant industry update'
      ]
    }));
  }

  /**
   * Get strategic check-in suggestions
   */
  async getStrategicCheckInSuggestions() {
    const cutoffDate = new Date(Date.now() - this.thresholds.strategic_days * 24 * 60 * 60 * 1000);

    const { data: strategicContacts } = await this.supabase
      .from('linkedin_contacts')
      .select(`
        id, first_name, last_name, current_company, strategic_value, relationship_score,
        last_interaction, interaction_count
      `)
      .eq('strategic_value', 'high')
      .lt('last_interaction', cutoffDate.toISOString())
      .gte('relationship_score', this.thresholds.high_value_score)
      .order('relationship_score', { ascending: false })
      .limit(10);

    return (strategicContacts || []).map(contact => ({
      id: `strategic_${contact.id}`,
      type: 'strategic_check_in',
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name}`,
      contact_company: contact.current_company,
      priority: this.suggestionTypes.strategic_check_in.priority,
      urgency: this.suggestionTypes.strategic_check_in.urgency,
      category: this.suggestionTypes.strategic_check_in.category,
      title: `Strategic check-in with ${contact.first_name}`,
      description: `High-value contact, maintain regular communication`,
      context: {
        days_since_contact: this.getDaysSince(contact.last_interaction),
        relationship_score: contact.relationship_score,
        strategic_value: contact.strategic_value,
        interaction_count: contact.interaction_count
      },
      suggested_actions: [
        'Schedule quarterly business review',
        'Invite to strategic event',
        'Share market insights'
      ]
    }));
  }

  /**
   * Get meeting follow-up suggestions
   */
  async getMeetingFollowUpSuggestions() {
    const cutoffDate = new Date(Date.now() - this.thresholds.meeting_followup_days * 24 * 60 * 60 * 1000);

    const { data: recentMeetings } = await this.supabase
      .from('contact_interactions')
      .select(`
        contact_id, interaction_date, interaction_type, notes, metadata,
        linkedin_contacts (
          id, first_name, last_name, current_company, strategic_value
        )
      `)
      .eq('source', 'calendar_auto_detection')
      .in('interaction_type', ['1on1_meeting', 'small_meeting', 'team_meeting'])
      .gte('interaction_date', cutoffDate.toISOString())
      .order('interaction_date', { ascending: false });

    // Check which meetings don't have follow-up emails yet
    const meetingsNeedingFollowUp = [];

    for (const meeting of recentMeetings || []) {
      const followUpEmails = await this.supabase
        .from('contact_interactions')
        .select('id')
        .eq('contact_id', meeting.contact_id)
        .eq('source', 'gmail_auto_detection')
        .gte('interaction_date', meeting.interaction_date)
        .limit(1);

      if (!followUpEmails.data || followUpEmails.data.length === 0) {
        meetingsNeedingFollowUp.push(meeting);
      }
    }

    return meetingsNeedingFollowUp.map(meeting => {
      const contact = meeting.linkedin_contacts;
      return {
        id: `meeting_followup_${meeting.contact_id}_${meeting.interaction_date}`,
        type: 'meeting_follow_up',
        contact_id: meeting.contact_id,
        contact_name: `${contact.first_name} ${contact.last_name}`,
        contact_company: contact.current_company,
        priority: this.suggestionTypes.meeting_follow_up.priority,
        urgency: this.suggestionTypes.meeting_follow_up.urgency,
        category: this.suggestionTypes.meeting_follow_up.category,
        title: `Follow up on meeting with ${contact.first_name}`,
        description: `Meeting on ${this.formatDate(meeting.interaction_date)} needs follow-up`,
        context: {
          meeting_date: meeting.interaction_date,
          meeting_type: meeting.interaction_type,
          meeting_duration: meeting.metadata?.meeting_duration,
          meeting_title: meeting.metadata?.meeting_title,
          days_since_meeting: this.getDaysSince(meeting.interaction_date)
        },
        suggested_actions: [
          'Send meeting recap email',
          'Share discussed documents',
          'Schedule next steps meeting'
        ]
      };
    });
  }

  /**
   * Get introduction opportunities
   */
  async getIntroductionOpportunities() {
    // Find contacts in similar industries or with complementary interests
    const { data: contacts } = await this.supabase
      .from('linkedin_contacts')
      .select('id, first_name, last_name, current_company, strategic_value, current_position')
      .gte('relationship_score', 50)
      .limit(100);

    const introductionOpportunities = [];

    // Simple algorithm: match contacts by industry keywords
    const industryGroups = {};

    for (const contact of contacts || []) {
      const company = contact.current_company?.toLowerCase() || '';
      const position = contact.current_position?.toLowerCase() || '';

      // Extract industry keywords
      const keywords = [
        ...company.split(/\s+/),
        ...position.split(/\s+/)
      ].filter(word => word.length > 3);

      for (const keyword of keywords) {
        if (!industryGroups[keyword]) industryGroups[keyword] = [];
        industryGroups[keyword].push(contact);
      }
    }

    // Find introduction opportunities
    for (const [industry, groupContacts] of Object.entries(industryGroups)) {
      if (groupContacts.length >= 2) {
        const contact1 = groupContacts[0];
        const contact2 = groupContacts[1];

        if (contact1.id !== contact2.id) {
          introductionOpportunities.push({
            id: `intro_${contact1.id}_${contact2.id}`,
            type: 'introduction_opportunity',
            contact_id: contact1.id,
            contact_name: `${contact1.first_name} ${contact1.last_name}`,
            contact_company: contact1.current_company,
            priority: this.suggestionTypes.introduction_opportunity.priority,
            urgency: this.suggestionTypes.introduction_opportunity.urgency,
            category: this.suggestionTypes.introduction_opportunity.category,
            title: `Introduce ${contact1.first_name} to ${contact2.first_name}`,
            description: `Both work in ${industry} - potential collaboration`,
            context: {
              contact_2_name: `${contact2.first_name} ${contact2.last_name}`,
              contact_2_company: contact2.current_company,
              common_industry: industry,
              strategic_value_1: contact1.strategic_value,
              strategic_value_2: contact2.strategic_value
            },
            suggested_actions: [
              'Send introduction email',
              'Set up three-way coffee meeting',
              'Share each other\'s LinkedIn profiles'
            ]
          });
        }
      }
    }

    return introductionOpportunities.slice(0, 5); // Limit to top 5
  }

  /**
   * Get collaboration suggestions
   */
  async getCollaborationSuggestions() {
    // Find high-value contacts with recent positive interactions
    const { data: activeContacts } = await this.supabase
      .from('linkedin_contacts')
      .select(`
        id, first_name, last_name, current_company, strategic_value, relationship_score,
        current_position, last_interaction
      `)
      .gte('relationship_score', this.thresholds.high_value_score)
      .gte('last_interaction', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order('relationship_score', { ascending: false })
      .limit(15);

    return (activeContacts || []).map(contact => ({
      id: `collaboration_${contact.id}`,
      type: 'collaboration_suggestion',
      contact_id: contact.id,
      contact_name: `${contact.first_name} ${contact.last_name}`,
      contact_company: contact.current_company,
      priority: this.suggestionTypes.collaboration_suggestion.priority,
      urgency: this.suggestionTypes.collaboration_suggestion.urgency,
      category: this.suggestionTypes.collaboration_suggestion.category,
      title: `Explore collaboration with ${contact.first_name}`,
      description: `Strong relationship - explore partnership opportunities`,
      context: {
        relationship_score: contact.relationship_score,
        strategic_value: contact.strategic_value,
        position: contact.current_position,
        last_interaction: contact.last_interaction
      },
      suggested_actions: [
        'Propose joint project',
        'Invite to strategic planning session',
        'Explore partnership opportunities'
      ]
    }));
  }

  /**
   * Prioritize suggestions by urgency and importance
   */
  prioritizeSuggestions(suggestions) {
    return suggestions.sort((a, b) => {
      // First sort by urgency
      const urgencyOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];

      if (urgencyDiff !== 0) return urgencyDiff;

      // Then by priority score
      return b.priority - a.priority;
    });
  }

  /**
   * Enhance suggestions with AI-generated context and messaging
   */
  async enhanceSuggestionsWithAI(suggestions) {
    const enhancedSuggestions = [];

    // Process in batches to avoid API rate limits
    const batchSize = 5;
    for (let i = 0; i < suggestions.length; i += batchSize) {
      const batch = suggestions.slice(i, i + batchSize);

      const batchPromises = batch.map(async (suggestion) => {
        try {
          const aiContext = await this.generateAIContext(suggestion);
          return {
            ...suggestion,
            ai_context: aiContext,
            suggested_message_templates: await this.generateMessageTemplates(suggestion)
          };
        } catch (error) {
          console.warn(`Failed to enhance suggestion ${suggestion.id}:`, error);
          return suggestion; // Return original if AI enhancement fails
        }
      });

      const enhancedBatch = await Promise.all(batchPromises);
      enhancedSuggestions.push(...enhancedBatch);

      // Small delay between batches
      if (i + batchSize < suggestions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enhancedSuggestions;
  }

  /**
   * Generate AI context for a suggestion
   */
  async generateAIContext(suggestion) {
    const prompt = `
      Analyze this contact relationship suggestion and provide strategic context:

      Contact: ${suggestion.contact_name} at ${suggestion.contact_company}
      Suggestion Type: ${suggestion.type}
      Context: ${JSON.stringify(suggestion.context)}

      Provide:
      1. Why this follow-up is strategically important
      2. Best approach based on the relationship history
      3. Potential conversation topics or angles
      4. Expected outcome or next steps

      Keep response concise (2-3 sentences max per point).
    `;

    const aiResponse = await this.ai.generateText({
      prompt,
      maxTokens: 300
    });

    return aiResponse.success ? aiResponse.text : 'AI context not available';
  }

  /**
   * Generate message templates
   */
  async generateMessageTemplates(suggestion) {
    const prompt = `
      Create 3 different email/message templates for this contact situation:

      Contact: ${suggestion.contact_name} at ${suggestion.contact_company}
      Suggestion: ${suggestion.title}
      Context: ${suggestion.description}

      Create:
      1. FORMAL template - professional, business-focused
      2. CASUAL template - friendly, relationship-focused
      3. VALUE template - sharing something useful/relevant

      Each template should be 2-3 sentences, ready to personalize and send.
      Format as JSON: {"formal": "...", "casual": "...", "value": "..."}
    `;

    const aiResponse = await this.ai.generateText({
      prompt,
      maxTokens: 500
    });

    if (aiResponse.success) {
      try {
        return JSON.parse(aiResponse.text);
      } catch (e) {
        console.warn('Failed to parse AI message templates');
      }
    }

    return {
      formal: `Hi ${suggestion.contact_name.split(' ')[0]}, I hope you're doing well. I wanted to follow up and see how things are going at ${suggestion.contact_company}.`,
      casual: `Hey ${suggestion.contact_name.split(' ')[0]}! Hope you're having a great week. Would love to catch up soon - how have things been?`,
      value: `Hi ${suggestion.contact_name.split(' ')[0]}, I came across something that might interest you given your work at ${suggestion.contact_company}. Would love to share it with you.`
    };
  }

  /**
   * Get suggestions for a specific contact
   */
  async getContactSuggestions(contactId) {
    const allSuggestions = await this.generateAllSuggestions();
    return {
      ...allSuggestions,
      suggestions: allSuggestions.suggestions.filter(s => s.contact_id === parseInt(contactId))
    };
  }

  /**
   * Mark suggestion as completed/dismissed
   */
  async completeSuggestion(suggestionId, action = 'completed') {
    // Store completed suggestions for learning and avoiding duplicates
    const { error } = await this.supabase
      .from('suggestion_history')
      .insert({
        suggestion_id: suggestionId,
        action,
        completed_at: new Date(),
        created_at: new Date()
      });

    if (error) {
      console.warn('Failed to record suggestion completion:', error);
    }

    return { success: !error };
  }

  /**
   * Get suggestions by category
   */
  async getSuggestionsByCategory(category) {
    const allSuggestions = await this.generateAllSuggestions();
    return {
      ...allSuggestions,
      suggestions: allSuggestions.suggestions.filter(s => s.category === category)
    };
  }

  /**
   * Helper: Calculate days since a date
   */
  getDaysSince(dateString) {
    if (!dateString) return 999; // Very old if no date
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Format date for display
   */
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  /**
   * Get real-time alerts (high urgency suggestions)
   */
  async getRealTimeAlerts() {
    const allSuggestions = await this.generateAllSuggestions();

    return {
      alerts: allSuggestions.suggestions.filter(s => s.urgency === 'high'),
      total_alerts: allSuggestions.suggestions.filter(s => s.urgency === 'high').length,
      generated_at: new Date().toISOString()
    };
  }
}

export default IntelligentSuggestionsEngine;