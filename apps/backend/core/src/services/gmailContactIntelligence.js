/**
 * Gmail Contact Intelligence Service
 * Bridges Gmail emails with Contact Intelligence database
 * Automatically detects interactions and updates relationship scores
 */

import { createClient } from '@supabase/supabase-js';
import SmartGmailSyncService from './smartGmailSyncService.js';
import MultiProviderAI from './multiProviderAI.js';

class GmailContactIntelligenceService {
  constructor() {
    // Initialize Supabase for contact database access
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Initialize Gmail service
    this.gmailSync = null;
    this.ai = new MultiProviderAI();

    // Email-to-contact matching algorithms
    this.matchingStrategies = [
      'exact_email_match',
      'domain_organization_match',
      'name_similarity_match',
      'signature_extraction_match'
    ];

    // Interaction types and scoring weights
    this.interactionWeights = {
      'email_sent': 2,
      'email_received': 1,
      'email_replied': 3,
      'meeting_scheduled': 4,
      'document_shared': 2,
      'introduction_made': 5
    };

    // Relationship scoring factors
    this.scoringFactors = {
      frequency: 0.3,      // How often they communicate
      recency: 0.3,        // How recently they communicated
      depth: 0.2,          // Quality of interactions (replies, meetings)
      strategic_value: 0.2  // Contact's strategic importance
    };

    console.log('🔗 Gmail Contact Intelligence Service initialized');
  }

  /**
   * Initialize Gmail service connection
   */
  async initialize() {
    try {
      if (!this.gmailSync) {
        this.gmailSync = new SmartGmailSyncService();
        await this.gmailSync.initialize();
      }
      console.log('✅ Gmail Contact Intelligence ready');
      return true;
    } catch (error) {
      console.error('❌ Gmail Contact Intelligence initialization failed:', error);
      return false;
    }
  }

  /**
   * Process new Gmail emails and match to contacts
   */
  async processNewEmails(limit = 50) {
    console.log(`📧 Processing ${limit} recent emails for contact intelligence...`);

    try {
      // Get recent emails from Gmail
      const emails = await this.gmailSync.getRecentEmails(limit);

      const processedEmails = [];
      const contactUpdates = [];

      for (const email of emails) {
        // Match email to contacts in our database
        const matchedContacts = await this.matchEmailToContacts(email);

        if (matchedContacts.length > 0) {
          // Process each matched contact
          for (const contact of matchedContacts) {
            const interaction = await this.createInteractionRecord(email, contact);
            const updatedScore = await this.updateRelationshipScore(contact, interaction);

            contactUpdates.push({
              contact_id: contact.id,
              interaction_id: interaction.id,
              new_score: updatedScore,
              interaction_type: interaction.interaction_type
            });
          }

          processedEmails.push({
            email_id: email.id,
            matched_contacts: matchedContacts.length,
            subject: email.subject,
            from: email.from
          });
        }
      }

      console.log(`✅ Processed ${processedEmails.length} emails, updated ${contactUpdates.length} contact relationships`);

      return {
        processed_emails: processedEmails,
        contact_updates: contactUpdates,
        total_emails_processed: emails.length,
        emails_with_matches: processedEmails.length
      };

    } catch (error) {
      console.error('❌ Email processing failed:', error);
      throw error;
    }
  }

  /**
   * Match email to contacts using multiple strategies
   */
  async matchEmailToContacts(email) {
    const matchedContacts = [];
    const emailAddresses = this.extractEmailAddresses(email);

    // Strategy 1: Exact email match
    for (const emailAddr of emailAddresses) {
      const { data: exactMatches } = await this.supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('email_address', emailAddr.toLowerCase());

      if (exactMatches) {
        matchedContacts.push(...exactMatches.map(contact => ({
          ...contact,
          match_strategy: 'exact_email_match',
          match_confidence: 1.0
        })));
      }
    }

    // Strategy 2: Domain-based organization matching
    if (matchedContacts.length === 0) {
      const domains = emailAddresses.map(email => email.split('@')[1]);
      for (const domain of domains) {
        const { data: domainMatches } = await this.supabase
          .from('linkedin_contacts')
          .select('*')
          .ilike('current_company', `%${domain.split('.')[0]}%`);

        if (domainMatches) {
          matchedContacts.push(...domainMatches.map(contact => ({
            ...contact,
            match_strategy: 'domain_organization_match',
            match_confidence: 0.7
          })));
        }
      }
    }

    // Strategy 3: Name similarity matching (AI-powered)
    if (matchedContacts.length === 0 && email.fromName) {
      const nameMatches = await this.findContactsByNameSimilarity(email.fromName);
      matchedContacts.push(...nameMatches);
    }

    // Remove duplicates and sort by confidence
    const uniqueContacts = this.deduplicateContacts(matchedContacts);
    return uniqueContacts.sort((a, b) => b.match_confidence - a.match_confidence);
  }

  /**
   * Extract all email addresses from email headers
   */
  extractEmailAddresses(email) {
    const addresses = [];

    // From address
    if (email.from) addresses.push(email.from);

    // To addresses
    if (email.to && Array.isArray(email.to)) {
      addresses.push(...email.to);
    }

    // CC addresses
    if (email.cc && Array.isArray(email.cc)) {
      addresses.push(...email.cc);
    }

    // Extract just the email part from "Name <email@domain.com>" format
    return addresses.map(addr => {
      const match = addr.match(/<([^>]+)>/);
      return match ? match[1] : addr;
    }).filter(Boolean);
  }

  /**
   * Find contacts by name similarity using AI
   */
  async findContactsByNameSimilarity(fromName) {
    try {
      // Get potential name matches from database
      const { data: nameContacts } = await this.supabase
        .from('linkedin_contacts')
        .select('*')
        .or(`first_name.ilike.%${fromName.split(' ')[0]}%,last_name.ilike.%${fromName.split(' ')[1] || ''}%`);

      if (!nameContacts || nameContacts.length === 0) return [];

      // Use AI to determine similarity scores
      const similarityPrompt = `
        Compare the name "${fromName}" with these contact names and return similarity scores:
        ${nameContacts.map((c, i) => `${i}: ${c.first_name} ${c.last_name}`).join('\n')}

        Return only JSON array of objects with: {"index": number, "score": 0.0-1.0}
        Only include scores > 0.7
      `;

      const aiResponse = await this.ai.generateText({
        prompt: similarityPrompt,
        maxTokens: 500
      });

      if (aiResponse.success) {
        try {
          const similarities = JSON.parse(aiResponse.text);
          return similarities
            .filter(s => s.score > 0.7)
            .map(s => ({
              ...nameContacts[s.index],
              match_strategy: 'name_similarity_match',
              match_confidence: s.score
            }));
        } catch (parseError) {
          console.warn('AI response parsing failed for name similarity');
        }
      }

      return [];
    } catch (error) {
      console.warn('Name similarity matching failed:', error);
      return [];
    }
  }

  /**
   * Create interaction record in database
   */
  async createInteractionRecord(email, contact) {
    const interactionType = this.determineInteractionType(email, contact);

    const interactionData = {
      contact_id: contact.id,
      interaction_type: interactionType,
      interaction_date: new Date(email.date || Date.now()),
      notes: `Email: ${email.subject}`,
      metadata: {
        email_id: email.id,
        email_subject: email.subject,
        email_from: email.from,
        match_strategy: contact.match_strategy,
        match_confidence: contact.match_confidence
      },
      created_at: new Date(),
      source: 'gmail_auto_detection'
    };

    const { data: interaction, error } = await this.supabase
      .from('contact_interactions')
      .insert(interactionData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create interaction:', error);
      throw error;
    }

    return interaction;
  }

  /**
   * Determine interaction type from email context
   */
  determineInteractionType(email, contact) {
    const subject = email.subject?.toLowerCase() || '';
    const isFromContact = email.from?.includes(contact.email_address);

    // Meeting-related emails
    if (subject.includes('meeting') || subject.includes('calendar') || subject.includes('zoom')) {
      return 'meeting_scheduled';
    }

    // Document sharing
    if (subject.includes('document') || subject.includes('attachment') || email.hasAttachments) {
      return 'document_shared';
    }

    // Introduction emails
    if (subject.includes('introduction') || subject.includes('intro') || subject.includes('connect')) {
      return 'introduction_made';
    }

    // Reply vs initial contact
    if (subject.startsWith('re:') || subject.startsWith('fwd:')) {
      return isFromContact ? 'email_received' : 'email_replied';
    }

    return isFromContact ? 'email_received' : 'email_sent';
  }

  /**
   * Update relationship score based on new interaction
   */
  async updateRelationshipScore(contact, interaction) {
    try {
      // Get interaction history
      const { data: interactions } = await this.supabase
        .from('contact_interactions')
        .select('*')
        .eq('contact_id', contact.id)
        .order('interaction_date', { ascending: false })
        .limit(10);

      // Calculate new relationship score
      const newScore = this.calculateRelationshipScore(contact, interactions || []);

      // Update contact with new score and last interaction date
      const { error } = await this.supabase
        .from('linkedin_contacts')
        .update({
          relationship_score: newScore,
          last_interaction: interaction.interaction_date,
          interaction_count: (contact.interaction_count || 0) + 1,
          updated_at: new Date()
        })
        .eq('id', contact.id);

      if (error) {
        console.error('Failed to update relationship score:', error);
        return contact.relationship_score || 0;
      }

      return newScore;
    } catch (error) {
      console.error('Relationship score update failed:', error);
      return contact.relationship_score || 0;
    }
  }

  /**
   * Calculate relationship score using multiple factors
   */
  calculateRelationshipScore(contact, recentInteractions) {
    let score = 0;

    // Factor 1: Frequency (30% weight)
    const interactionCount = recentInteractions.length;
    const frequencyScore = Math.min(interactionCount / 10, 1.0); // Max at 10 interactions
    score += frequencyScore * this.scoringFactors.frequency;

    // Factor 2: Recency (30% weight)
    if (recentInteractions.length > 0) {
      const daysSinceLastInteraction = Math.floor(
        (Date.now() - new Date(recentInteractions[0].interaction_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyScore = Math.max(0, 1 - daysSinceLastInteraction / 30); // Decays over 30 days
      score += recencyScore * this.scoringFactors.recency;
    }

    // Factor 3: Interaction Depth (20% weight)
    const weightedInteractions = recentInteractions.reduce((sum, interaction) => {
      return sum + (this.interactionWeights[interaction.interaction_type] || 1);
    }, 0);
    const depthScore = Math.min(weightedInteractions / 20, 1.0); // Max at weighted score of 20
    score += depthScore * this.scoringFactors.depth;

    // Factor 4: Strategic Value (20% weight)
    const strategicValue = this.getStrategicValueScore(contact);
    score += strategicValue * this.scoringFactors.strategic_value;

    // Return score as percentage (0-100)
    return Math.round(Math.max(0, Math.min(100, score * 100)));
  }

  /**
   * Get strategic value score for contact
   */
  getStrategicValueScore(contact) {
    const strategicValue = contact.strategic_value?.toLowerCase();

    switch (strategicValue) {
      case 'high': return 1.0;
      case 'medium': return 0.6;
      case 'low': return 0.3;
      default: return 0.5;
    }
  }

  /**
   * Remove duplicate contacts from matching results
   */
  deduplicateContacts(contacts) {
    const seen = new Set();
    return contacts.filter(contact => {
      if (seen.has(contact.id)) return false;
      seen.add(contact.id);
      return true;
    });
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    try {
      // Get recent auto-detected interactions
      const { data: autoInteractions, count: autoCount } = await this.supabase
        .from('contact_interactions')
        .select('*', { count: 'exact' })
        .eq('source', 'gmail_auto_detection')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get contacts with recent score updates
      const { data: recentUpdates, count: updatedCount } = await this.supabase
        .from('linkedin_contacts')
        .select('*', { count: 'exact' })
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not('relationship_score', 'is', null);

      return {
        auto_interactions_this_week: autoCount || 0,
        contacts_updated_this_week: updatedCount || 0,
        avg_relationship_score: recentUpdates?.reduce((sum, c) => sum + (c.relationship_score || 0), 0) / (recentUpdates?.length || 1),
        last_processing_run: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        auto_interactions_this_week: 0,
        contacts_updated_this_week: 0,
        avg_relationship_score: 0,
        error: error.message
      };
    }
  }
}

export default GmailContactIntelligenceService;