/**
 * Calendar Contact Intelligence Service
 * Bridges Google Calendar meetings with Contact Intelligence database
 * Automatically detects meeting interactions and updates relationship scores
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import MultiProviderAI from './multiProviderAI.js';

class CalendarContactIntelligenceService {
  constructor() {
    // Initialize Supabase for contact database access
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Initialize Google Calendar API
    this.calendar = null;
    this.auth = null;
    this.ai = new MultiProviderAI();

    // Meeting-to-contact matching strategies
    this.matchingStrategies = [
      'exact_email_match',
      'domain_organization_match',
      'name_similarity_match',
      'calendar_signature_match'
    ];

    // Meeting interaction types and scoring weights
    this.meetingWeights = {
      '1on1_meeting': 8,        // Highest value - direct relationship
      'small_meeting': 5,       // 2-4 people meetings
      'team_meeting': 3,        // 5-10 people
      'large_meeting': 2,       // 10+ people
      'recurring_meeting': 4,   // Regular touchpoints
      'external_meeting': 6,    // Meetings with external contacts
      'cancelled_meeting': -1   // Negative impact
    };

    // Meeting priority scoring factors
    this.meetingFactors = {
      duration: 0.2,           // Meeting length importance
      attendee_count: 0.3,     // Smaller = higher value
      frequency: 0.2,          // Regular meetings = stronger relationship
      strategic_value: 0.3     // Contact's strategic importance
    };

    console.log('📅 Calendar Contact Intelligence Service initialized');
  }

  /**
   * Initialize Google Calendar API connection
   */
  async initialize() {
    try {
      // Initialize Google OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials if available
      if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          access_token: process.env.GOOGLE_ACCESS_TOKEN,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        // Initialize Calendar API
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });

        console.log('✅ Calendar Contact Intelligence ready');
        return true;
      } else {
        console.warn('⚠️ Google Calendar credentials not configured');
        return false;
      }
    } catch (error) {
      console.error('❌ Calendar Contact Intelligence initialization failed:', error);
      return false;
    }
  }

  /**
   * Process recent calendar events and match attendees to contacts
   */
  async processRecentMeetings(daysBack = 7) {
    console.log(`📅 Processing meetings from the last ${daysBack} days...`);

    try {
      // Calculate date range
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - daysBack);
      const timeMax = new Date();

      // Get calendar events
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100
      });

      const events = response.data.items || [];
      const processedMeetings = [];
      const contactUpdates = [];

      for (const event of events) {
        // Skip events without attendees or that are all-day events
        if (!event.attendees || event.start.date) continue;

        // Match meeting attendees to contacts
        const matchedContacts = await this.matchMeetingToContacts(event);

        if (matchedContacts.length > 0) {
          // Process each matched contact
          for (const contact of matchedContacts) {
            const interaction = await this.createMeetingInteractionRecord(event, contact);
            const updatedScore = await this.updateRelationshipScore(contact, interaction, event);

            contactUpdates.push({
              contact_id: contact.id,
              interaction_id: interaction.id,
              new_score: updatedScore,
              meeting_type: interaction.interaction_type,
              meeting_title: event.summary
            });
          }

          processedMeetings.push({
            event_id: event.id,
            matched_contacts: matchedContacts.length,
            title: event.summary,
            attendees: event.attendees.length,
            start_time: event.start.dateTime
          });
        }
      }

      console.log(`✅ Processed ${processedMeetings.length} meetings, updated ${contactUpdates.length} contact relationships`);

      return {
        processed_meetings: processedMeetings,
        contact_updates: contactUpdates,
        total_meetings_processed: events.length,
        meetings_with_matches: processedMeetings.length
      };

    } catch (error) {
      console.error('❌ Meeting processing failed:', error);
      throw error;
    }
  }

  /**
   * Match meeting attendees to contacts using multiple strategies
   */
  async matchMeetingToContacts(event) {
    const matchedContacts = [];
    const attendeeEmails = event.attendees.map(attendee => attendee.email.toLowerCase());

    // Strategy 1: Exact email match
    for (const email of attendeeEmails) {
      const { data: exactMatches } = await this.supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('email_address', email);

      if (exactMatches) {
        matchedContacts.push(...exactMatches.map(contact => ({
          ...contact,
          match_strategy: 'exact_email_match',
          match_confidence: 1.0,
          attendee_email: email
        })));
      }
    }

    // Strategy 2: Domain-based organization matching
    if (matchedContacts.length < attendeeEmails.length) {
      const domains = attendeeEmails.map(email => email.split('@')[1]);
      for (const domain of domains) {
        if (domain === 'gmail.com' || domain === 'outlook.com') continue; // Skip generic domains

        const { data: domainMatches } = await this.supabase
          .from('linkedin_contacts')
          .select('*')
          .ilike('current_company', `%${domain.split('.')[0]}%`);

        if (domainMatches) {
          matchedContacts.push(...domainMatches.map(contact => ({
            ...contact,
            match_strategy: 'domain_organization_match',
            match_confidence: 0.8,
            matched_domain: domain
          })));
        }
      }
    }

    // Strategy 3: Name similarity matching using attendee display names
    const attendeeNames = event.attendees
      .filter(attendee => attendee.displayName)
      .map(attendee => attendee.displayName);

    for (const name of attendeeNames) {
      const nameMatches = await this.findContactsByNameSimilarity(name);
      matchedContacts.push(...nameMatches);
    }

    // Remove duplicates and sort by confidence
    const uniqueContacts = this.deduplicateContacts(matchedContacts);
    return uniqueContacts.sort((a, b) => b.match_confidence - a.match_confidence);
  }

  /**
   * Find contacts by name similarity using AI
   */
  async findContactsByNameSimilarity(attendeeName) {
    try {
      // Split name for better matching
      const nameParts = attendeeName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];

      // Get potential name matches from database
      const { data: nameContacts } = await this.supabase
        .from('linkedin_contacts')
        .select('*')
        .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`);

      if (!nameContacts || nameContacts.length === 0) return [];

      // Use AI to determine similarity scores
      const similarityPrompt = `
        Compare the name "${attendeeName}" with these contact names and return similarity scores:
        ${nameContacts.map((c, i) => `${i}: ${c.first_name} ${c.last_name}`).join('\n')}

        Return only JSON array of objects with: {"index": number, "score": 0.0-1.0}
        Only include scores > 0.75
      `;

      const aiResponse = await this.ai.generateText({
        prompt: similarityPrompt,
        maxTokens: 500
      });

      if (aiResponse.success) {
        try {
          const similarities = JSON.parse(aiResponse.text);
          return similarities
            .filter(s => s.score > 0.75)
            .map(s => ({
              ...nameContacts[s.index],
              match_strategy: 'calendar_name_similarity_match',
              match_confidence: s.score,
              matched_name: attendeeName
            }));
        } catch (parseError) {
          console.warn('AI response parsing failed for calendar name similarity');
        }
      }

      return [];
    } catch (error) {
      console.warn('Calendar name similarity matching failed:', error);
      return [];
    }
  }

  /**
   * Create meeting interaction record in database
   */
  async createMeetingInteractionRecord(event, contact) {
    const meetingType = this.determineMeetingType(event, contact);
    const duration = this.calculateMeetingDuration(event);

    const interactionData = {
      contact_id: contact.id,
      interaction_type: meetingType,
      interaction_date: new Date(event.start.dateTime),
      notes: `Meeting: ${event.summary} (${duration} minutes)`,
      metadata: {
        calendar_event_id: event.id,
        meeting_title: event.summary,
        meeting_duration: duration,
        attendee_count: event.attendees.length,
        meeting_location: event.location,
        match_strategy: contact.match_strategy,
        match_confidence: contact.match_confidence,
        attendee_email: contact.attendee_email,
        meeting_link: event.hangoutLink || event.location
      },
      created_at: new Date(),
      source: 'calendar_auto_detection'
    };

    const { data: interaction, error } = await this.supabase
      .from('contact_interactions')
      .insert(interactionData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create meeting interaction:', error);
      throw error;
    }

    return interaction;
  }

  /**
   * Determine meeting type from event context
   */
  determineMeetingType(event, contact) {
    const attendeeCount = event.attendees.length;
    const title = event.summary?.toLowerCase() || '';
    const duration = this.calculateMeetingDuration(event);

    // Check if cancelled
    if (event.status === 'cancelled') {
      return 'cancelled_meeting';
    }

    // Check if recurring
    if (event.recurringEventId) {
      return 'recurring_meeting';
    }

    // Determine by attendee count and context
    if (attendeeCount === 2) {
      return '1on1_meeting';
    } else if (attendeeCount <= 4) {
      return 'small_meeting';
    } else if (attendeeCount <= 10) {
      return 'team_meeting';
    } else {
      return 'large_meeting';
    }
  }

  /**
   * Calculate meeting duration in minutes
   */
  calculateMeetingDuration(event) {
    if (!event.start?.dateTime || !event.end?.dateTime) return 30; // Default

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return Math.round((end - start) / (1000 * 60));
  }

  /**
   * Update relationship score based on meeting interaction
   */
  async updateRelationshipScore(contact, interaction, event) {
    try {
      // Get recent interaction history
      const { data: interactions } = await this.supabase
        .from('contact_interactions')
        .select('*')
        .eq('contact_id', contact.id)
        .order('interaction_date', { ascending: false })
        .limit(15);

      // Calculate new relationship score with meeting context
      const newScore = this.calculateMeetingRelationshipScore(contact, interactions || [], event);

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
        console.error('Failed to update meeting relationship score:', error);
        return contact.relationship_score || 0;
      }

      return newScore;
    } catch (error) {
      console.error('Meeting relationship score update failed:', error);
      return contact.relationship_score || 0;
    }
  }

  /**
   * Calculate relationship score with meeting-specific factors
   */
  calculateMeetingRelationshipScore(contact, recentInteractions, event) {
    let score = 0;

    // Base frequency score (meetings are weighted higher than emails)
    const meetingInteractions = recentInteractions.filter(i =>
      i.source === 'calendar_auto_detection'
    );
    const emailInteractions = recentInteractions.filter(i =>
      i.source === 'gmail_auto_detection'
    );

    const frequencyScore = Math.min(
      (meetingInteractions.length * 2 + emailInteractions.length) / 15,
      1.0
    );
    score += frequencyScore * 0.25;

    // Recency score (weighted towards recent meetings)
    if (recentInteractions.length > 0) {
      const daysSinceLastInteraction = Math.floor(
        (Date.now() - new Date(recentInteractions[0].interaction_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyScore = Math.max(0, 1 - daysSinceLastInteraction / 30);
      score += recencyScore * 0.25;
    }

    // Meeting depth score (1on1s and small meetings score higher)
    const meetingType = this.determineMeetingType(event, contact);
    const meetingWeight = this.meetingWeights[meetingType] || 3;
    const depthScore = Math.min(meetingWeight / 8, 1.0);
    score += depthScore * 0.25;

    // Strategic value score
    const strategicValue = this.getStrategicValueScore(contact);
    score += strategicValue * 0.25;

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
   * Get upcoming meetings with contact intelligence
   */
  async getUpcomingMeetingsWithContacts(daysAhead = 7) {
    try {
      // Calculate date range
      const timeMin = new Date();
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + daysAhead);

      // Get upcoming calendar events
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });

      const events = response.data.items || [];
      const meetingsWithContacts = [];

      for (const event of events) {
        if (!event.attendees || event.start.date) continue;

        const matchedContacts = await this.matchMeetingToContacts(event);

        if (matchedContacts.length > 0) {
          meetingsWithContacts.push({
            event_id: event.id,
            title: event.summary,
            start_time: event.start.dateTime,
            duration: this.calculateMeetingDuration(event),
            attendee_count: event.attendees.length,
            location: event.location,
            matched_contacts: matchedContacts.map(contact => ({
              id: contact.id,
              name: `${contact.first_name} ${contact.last_name}`,
              company: contact.current_company,
              strategic_value: contact.strategic_value,
              relationship_score: contact.relationship_score,
              match_confidence: contact.match_confidence
            }))
          });
        }
      }

      return meetingsWithContacts;
    } catch (error) {
      console.error('Failed to get upcoming meetings:', error);
      return [];
    }
  }

  /**
   * Get meeting statistics for dashboard
   */
  async getMeetingStats() {
    try {
      // Get recent meeting interactions
      const { data: meetingInteractions, count: meetingCount } = await this.supabase
        .from('contact_interactions')
        .select('*', { count: 'exact' })
        .eq('source', 'calendar_auto_detection')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get contacts with recent meeting updates
      const { data: recentMeetingContacts, count: contactsWithMeetings } = await this.supabase
        .from('linkedin_contacts')
        .select('*', { count: 'exact' })
        .gte('last_interaction', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not('relationship_score', 'is', null);

      // Calculate meeting type distribution
      const meetingTypeStats = {};
      if (meetingInteractions) {
        meetingInteractions.forEach(interaction => {
          const type = interaction.interaction_type;
          meetingTypeStats[type] = (meetingTypeStats[type] || 0) + 1;
        });
      }

      return {
        meetings_this_week: meetingCount || 0,
        contacts_with_meetings: contactsWithMeetings || 0,
        meeting_types: meetingTypeStats,
        avg_relationship_score: recentMeetingContacts?.reduce((sum, c) => sum + (c.relationship_score || 0), 0) / (recentMeetingContacts?.length || 1),
        last_processing_run: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get meeting stats:', error);
      return {
        meetings_this_week: 0,
        contacts_with_meetings: 0,
        meeting_types: {},
        avg_relationship_score: 0,
        error: error.message
      };
    }
  }
}

export default CalendarContactIntelligenceService;