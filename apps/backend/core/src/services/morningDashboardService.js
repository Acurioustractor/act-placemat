/**
 * Morning Dashboard Service
 * Provides intelligent daily briefing for relationship management
 * UPDATED: Now integrates with existing ACT ecosystem APIs
 */

import { createClient } from '@supabase/supabase-js';
import IntelligentSuggestionsEngine from './intelligentSuggestionsEngine.js';

class MorningDashboardService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.suggestionsEngine = new IntelligentSuggestionsEngine();

    // Internal APIs for fetching existing data
    this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';
  }

  /**
   * Fetch data from internal APIs
   */
  async fetchFromAPI(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Warning: Failed to fetch ${endpoint}:`, error.message);
      return { success: false, data: null };
    }
  }

  /**
   * Generate comprehensive morning briefing
   */
  async generateMorningBriefing(userId = 'default') {
    try {
      const briefingData = await Promise.all([
        this.getUrgentPriorities(),
        this.getStrategicOpportunities(),
        this.getTodaysScheduleContext(),
        this.getRecentActivitySummary(),
        this.getWeeklyRelationshipGoals()
      ]);

      const [
        urgentPriorities,
        strategicOpportunities,
        scheduleContext,
        activitySummary,
        weeklyGoals
      ] = briefingData;

      return {
        success: true,
        briefing: {
          date: new Date().toISOString().split('T')[0],
          time_generated: new Date().toISOString(),
          user_id: userId,

          // Critical Actions (Top Priority)
          urgent_priorities: {
            total_count: urgentPriorities.total_count,
            overdue_followups: urgentPriorities.overdue_followups,
            meeting_followups: urgentPriorities.meeting_followups,
            high_value_alerts: urgentPriorities.high_value_alerts
          },

          // Strategic Opportunities (Medium Priority)
          strategic_opportunities: {
            total_count: strategicOpportunities.total_count,
            warm_introductions: strategicOpportunities.warm_introductions,
            collaboration_potential: strategicOpportunities.collaboration_potential,
            strategic_checkins: strategicOpportunities.strategic_checkins
          },

          // Today's Context
          schedule_context: scheduleContext,

          // Recent Activity Insights
          activity_summary: activitySummary,

          // Weekly Goals Progress
          weekly_goals: weeklyGoals,

          // AI-Generated Daily Focus
          daily_focus: await this.generateDailyFocus(urgentPriorities, strategicOpportunities)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate morning briefing',
        message: error.message
      };
    }
  }

  /**
   * Get urgent priorities requiring immediate attention
   * UPDATED: Uses existing Life Orchestrator and Contact Dashboard APIs
   */
  async getUrgentPriorities() {
    try {
      // Get data from Life Orchestrator (has real relationship & communication data)
      const lifeOrchestrator = await this.fetchFromAPI('/api/life-orchestrator/dashboard');
      const contactDashboard = await this.fetchFromAPI('/api/simple-contact-dashboard');

      // Extract urgent items from real data
      let urgentItems = [];
      let overdueFollowups = 0;
      let meetingFollowups = 0;
      let highValueAlerts = 0;

      // Get urgent communications from Life Orchestrator
      if (lifeOrchestrator.success && lifeOrchestrator.dashboard?.communications?.urgentActions) {
        urgentItems = lifeOrchestrator.dashboard.communications.urgentActions.map(action => ({
          type: 'communication',
          priority: action.priority,
          title: action.action,
          description: action.reason,
          person_name: action.action.replace('Respond to ', ''),
          estimated_time: action.estimatedTime,
          project_context: action.projectContext,
          days_waiting: action.reason.includes('Waiting') ?
            parseInt(action.reason.match(/Waiting (\d+) days/)?.[1]) || 0 : 0
        }));

        overdueFollowups = urgentItems.filter(item => item.days_waiting > 3).length;
        meetingFollowups = urgentItems.filter(item => item.type === 'communication').length;
      }

      // Get high-value contacts from Contact Dashboard
      if (contactDashboard.success && contactDashboard.data) {
        highValueAlerts = contactDashboard.data.high_value_contacts || 0;
      }

      // Get contacts with overdue follow-ups from contact_interactions
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: overdueFollowupData } = await this.supabase
        .from('contact_interactions')
        .select(`
          person_id,
          interaction_date,
          follow_up_date,
          person_identity_map (
            person_id,
            full_name,
            email,
            contact_data,
            youth_justice_relevance_score
          )
        `)
        .eq('follow_up_required', true)
        .not('follow_up_completed', 'eq', true)
        .lt('follow_up_date', new Date().toISOString())
        .order('follow_up_date', { ascending: true })
        .limit(10);

      // Get high-value contacts without recent interactions
      const { data: highValueAlertsData } = await this.supabase
        .from('person_identity_map')
        .select(`
          person_id,
          full_name,
          email,
          contact_data,
          youth_justice_relevance_score,
          engagement_priority,
          last_research_update
        `)
        .gte('youth_justice_relevance_score', 80)
        .in('engagement_priority', ['high', 'critical'])
        .or(`last_research_update.is.null,last_research_update.lt.${sevenDaysAgo.toISOString()}`)
        .order('youth_justice_relevance_score', { ascending: false })
        .limit(8);

      // Get meeting follow-ups (fallback to empty if suggestions engine fails)
      let meetingFollowupsData = [];
      try {
        meetingFollowupsData = await this.suggestionsEngine.getMeetingFollowUpSuggestions();
      } catch (suggestionError) {
        console.warn('Suggestions engine unavailable, using contact data:', suggestionError.message);
        meetingFollowupsData = [];
      }

      return {
        total_count: (urgentContacts?.length || 0) + (overdueFollowupData?.length || 0) + (highValueAlertsData?.length || 0),
        urgent_contacts: urgentContacts || [],
        overdue_followups: overdueFollowupData?.map(f => ({
          person_id: f.person_identity_map?.person_id,
          full_name: f.person_identity_map?.full_name,
          email: f.person_identity_map?.email,
          organization: f.person_identity_map?.contact_data?.organization,
          youth_justice_score: f.person_identity_map?.youth_justice_relevance_score,
          follow_up_date: f.follow_up_date,
          days_overdue: Math.floor((new Date() - new Date(f.follow_up_date)) / (1000 * 60 * 60 * 24))
        })) || [],
        meeting_followups: meetingFollowupsData.slice(0, 5),
        high_value_alerts: highValueAlertsData?.map(contact => ({
          person_id: contact.person_id,
          full_name: contact.full_name,
          email: contact.email,
          organization: contact.contact_data?.organization,
          sector: contact.sector,
          youth_justice_score: contact.youth_justice_relevance_score,
          engagement_priority: contact.engagement_priority,
          days_since_update: contact.last_research_update
            ? Math.floor((new Date() - new Date(contact.last_research_update)) / (1000 * 60 * 60 * 24))
            : null
        })) || []
      };

    } catch (error) {
      console.error('Error getting urgent priorities:', error);
      return {
        total_count: 0,
        urgent_contacts: [],
        overdue_followups: [],
        meeting_followups: [],
        high_value_alerts: []
      };
    }
  }

  /**
   * Get strategic opportunities for relationship building
   */
  async getStrategicOpportunities() {
    try {
      // Get potential collaboration opportunities based on sector alignment
      const { data: collaborationOpportunities } = await this.supabase
        .from('person_identity_map')
        .select(`
          person_id,
          full_name,
          email,
          contact_data,
          sector,
          youth_justice_relevance_score,
          engagement_priority,
          indigenous_affiliation,
          collaboration_potential
        `)
        .in('sector', ['government', 'foundation', 'academic', 'media'])
        .gte('youth_justice_relevance_score', 60)
        .gte('collaboration_potential', 60)
        .order('collaboration_potential', { ascending: false })
        .limit(8);

      // Get contacts for strategic check-ins (medium priority, good scores, no recent activity)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: strategicCheckins } = await this.supabase
        .from('person_identity_map')
        .select(`
          person_id,
          full_name,
          email,
          contact_data,
          sector,
          youth_justice_relevance_score,
          engagement_priority,
          last_research_update,
          contact_intelligence_scores (
            composite_score,
            engagement_readiness
          )
        `)
        .in('engagement_priority', ['medium', 'high'])
        .gte('youth_justice_relevance_score', 50)
        .or(`last_research_update.is.null,last_research_update.lt.${thirtyDaysAgo.toISOString()}`)
        .order('youth_justice_relevance_score', { ascending: false })
        .limit(10);

      // Get warm introduction opportunities based on sector connections
      const { data: warmIntroOpportunities } = await this.supabase
        .from('person_identity_map')
        .select(`
          person_id,
          full_name,
          email,
          contact_data,
          sector,
          youth_justice_relevance_score,
          indigenous_affiliation,
          location_region
        `)
        .in('sector', ['government', 'foundation'])
        .gte('youth_justice_relevance_score', 70)
        .eq('indigenous_affiliation', true)
        .order('youth_justice_relevance_score', { ascending: false })
        .limit(5);

      // Try to get AI suggestions, but gracefully handle failures
      let aiSuggestions = { introOpportunities: [], collaborationSuggestions: [], strategicCheckInSuggestions: [] };
      try {
        const [intros, collabs, checkins] = await Promise.all([
          this.suggestionsEngine.getIntroductionOpportunities(),
          this.suggestionsEngine.getCollaborationSuggestions(),
          this.suggestionsEngine.getStrategicCheckInSuggestions()
        ]);
        aiSuggestions = {
          introOpportunities: intros || [],
          collaborationSuggestions: collabs || [],
          strategicCheckInSuggestions: checkins || []
        };
      } catch (suggestionError) {
        console.warn('AI suggestions engine unavailable, using database data:', suggestionError.message);
      }

      return {
        total_count: (collaborationOpportunities?.length || 0) + (strategicCheckins?.length || 0) + (warmIntroOpportunities?.length || 0),

        collaboration_potential: collaborationOpportunities?.map(contact => ({
          person_id: contact.person_id,
          full_name: contact.full_name,
          email: contact.email,
          organization: contact.contact_data?.organization,
          sector: contact.sector,
          youth_justice_score: contact.youth_justice_relevance_score,
          collaboration_score: contact.collaboration_potential,
          reason: `${contact.sector} sector alignment with ${contact.youth_justice_relevance_score}% youth justice relevance`,
          suggested_approach: contact.sector === 'government' ? 'Policy collaboration' :
                             contact.sector === 'foundation' ? 'Funding partnership' :
                             contact.sector === 'academic' ? 'Research collaboration' : 'Strategic partnership'
        })) || [],

        strategic_checkins: strategicCheckins?.map(contact => ({
          person_id: contact.person_id,
          full_name: contact.full_name,
          email: contact.email,
          organization: contact.contact_data?.organization,
          sector: contact.sector,
          youth_justice_score: contact.youth_justice_relevance_score,
          engagement_readiness: contact.contact_intelligence_scores?.[0]?.engagement_readiness,
          days_since_contact: contact.last_research_update
            ? Math.floor((new Date() - new Date(contact.last_research_update)) / (1000 * 60 * 60 * 24))
            : 'Never contacted',
          reason: 'Strategic relationship maintenance opportunity'
        })) || [],

        warm_introductions: warmIntroOpportunities?.map(contact => ({
          person_id: contact.person_id,
          full_name: contact.full_name,
          email: contact.email,
          organization: contact.contact_data?.organization,
          sector: contact.sector,
          youth_justice_score: contact.youth_justice_relevance_score,
          indigenous_connection: contact.indigenous_affiliation,
          location: contact.location_region,
          intro_value: 'High - Indigenous youth justice focus',
          suggested_connector: 'Find mutual connection through sector networks'
        })) || [],

        // Include any AI suggestions if available
        ai_suggestions: aiSuggestions
      };

    } catch (error) {
      console.error('Error getting strategic opportunities:', error);
      return {
        total_count: 0,
        collaboration_potential: [],
        strategic_checkins: [],
        warm_introductions: [],
        ai_suggestions: { introOpportunities: [], collaborationSuggestions: [], strategicCheckInSuggestions: [] }
      };
    }
  }

  /**
   * Get today's schedule context for relationship planning
   */
  async getTodaysScheduleContext() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get today's meetings from calendar intelligence
      const { data: todaysMeetings } = await this.supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          start_time,
          attendee_count,
          meeting_type,
          follow_up_required,
          linked_contacts
        `)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      // Calculate meeting preparation needs
      const meetingsNeedingPrep = todaysMeetings?.filter(meeting =>
        meeting.linked_contacts && meeting.linked_contacts.length > 0
      ) || [];

      return {
        total_meetings: todaysMeetings?.length || 0,
        meetings_with_contacts: meetingsNeedingPrep.length,
        prep_required: meetingsNeedingPrep.map(meeting => ({
          meeting_title: meeting.title,
          start_time: meeting.start_time,
          contact_count: meeting.linked_contacts?.length || 0,
          meeting_type: meeting.meeting_type
        }))
      };

    } catch (error) {
      console.error('Error getting schedule context:', error);
      return {
        total_meetings: 0,
        meetings_with_contacts: 0,
        prep_required: []
      };
    }
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivitySummary() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get recent contact interactions from our intelligence system
      const { data: recentInteractions, count: interactionCount } = await this.supabase
        .from('contact_interactions')
        .select('*', { count: 'exact' })
        .gte('interaction_date', sevenDaysAgo.toISOString())
        .order('interaction_date', { ascending: false });

      // Get recent research updates (new intelligence gathering)
      const { data: recentResearch, count: researchCount } = await this.supabase
        .from('contact_research_log')
        .select('*', { count: 'exact' })
        .gte('research_date', sevenDaysAgo.toISOString())
        .eq('success', true);

      // Calculate new contacts added to person_identity_map this week
      const { data: newContacts, count: newContactCount } = await this.supabase
        .from('person_identity_map')
        .select('*', { count: 'exact' })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Calculate intelligence scores updated this week
      const { data: updatedScores, count: scoresCount } = await this.supabase
        .from('contact_intelligence_scores')
        .select('*', { count: 'exact' })
        .gte('last_calculated', sevenDaysAgo.toISOString());

      // Calculate engagement metrics
      const positiveInteractions = recentInteractions?.filter(i => i.outcome === 'positive').length || 0;
      const followUpsPending = recentInteractions?.filter(i => i.follow_up_required && !i.follow_up_completed).length || 0;

      return {
        period: '7 days',
        total_contact_interactions: interactionCount || 0,
        positive_interactions: positiveInteractions,
        ai_research_conducted: researchCount || 0,
        new_contacts_added: newContactCount || 0,
        intelligence_scores_updated: scoresCount || 0,
        follow_ups_pending: followUpsPending,
        relationship_velocity: Math.round(((newContactCount || 0) / 7) * 10) / 10,
        engagement_rate: interactionCount > 0 ? Math.round((positiveInteractions / interactionCount) * 100) : 0,

        // Activity breakdown
        activity_breakdown: {
          email_interactions: recentInteractions?.filter(i => i.interaction_type === 'email').length || 0,
          meeting_interactions: recentInteractions?.filter(i => i.interaction_type === 'meeting').length || 0,
          call_interactions: recentInteractions?.filter(i => i.interaction_type === 'call').length || 0,
          social_media_interactions: recentInteractions?.filter(i => i.interaction_type === 'social_media').length || 0
        },

        // Recent high-impact activities
        recent_highlights: recentInteractions?.filter(i => i.outcome === 'positive')
          .slice(0, 5)
          .map(interaction => ({
            type: interaction.interaction_type,
            date: interaction.interaction_date,
            outcome: interaction.outcome,
            person_id: interaction.person_id
          })) || []
      };

    } catch (error) {
      console.error('Error getting activity summary:', error);
      return {
        period: '7 days',
        total_contact_interactions: 0,
        positive_interactions: 0,
        ai_research_conducted: 0,
        new_contacts_added: 0,
        intelligence_scores_updated: 0,
        follow_ups_pending: 0,
        relationship_velocity: 0,
        engagement_rate: 0,
        activity_breakdown: {
          email_interactions: 0,
          meeting_interactions: 0,
          call_interactions: 0,
          social_media_interactions: 0
        },
        recent_highlights: []
      };
    }
  }

  /**
   * Get weekly relationship goals and progress
   */
  async getWeeklyRelationshipGoals() {
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Get high-value interactions this week (contacts with high youth justice relevance)
      const { data: highValueInteractions, count: highValueCount } = await this.supabase
        .from('contact_interactions')
        .select(`
          *,
          person_identity_map (
            youth_justice_relevance_score,
            engagement_priority
          )
        `, { count: 'exact' })
        .gte('interaction_date', startOfWeek.toISOString())
        .order('interaction_date', { ascending: false });

      // Get new strategic connections added this week
      const { data: newStrategicConnections, count: strategicCount } = await this.supabase
        .from('person_identity_map')
        .select('*', { count: 'exact' })
        .gte('created_at', startOfWeek.toISOString())
        .gte('youth_justice_relevance_score', 70)
        .in('engagement_priority', ['high', 'critical']);

      // Get completed follow-ups this week
      const { data: completedFollowUps, count: followUpCount } = await this.supabase
        .from('contact_interactions')
        .select('*', { count: 'exact' })
        .gte('interaction_date', startOfWeek.toISOString())
        .eq('follow_up_completed', true);

      // Get AI research conducted this week
      const { data: weeklyResearch, count: researchCount } = await this.supabase
        .from('contact_research_log')
        .select('*', { count: 'exact' })
        .gte('research_date', startOfWeek.toISOString())
        .eq('success', true);

      // Calculate quality metrics
      const highValueInteractionCount = highValueInteractions?.filter(i =>
        i.person_identity_map?.youth_justice_relevance_score >= 70
      ).length || 0;

      const positiveOutcomes = highValueInteractions?.filter(i =>
        i.outcome === 'positive'
      ).length || 0;

      const goalsData = {
        // Weekly Targets
        target_high_value_interactions: 12,
        target_new_strategic_connections: 5,
        target_follow_up_completion: 15,
        target_ai_research_sessions: 8,

        // Weekly Actuals
        actual_high_value_interactions: highValueInteractionCount,
        actual_strategic_connections: strategicCount || 0,
        actual_follow_up_completion: followUpCount || 0,
        actual_ai_research_sessions: researchCount || 0,

        // Quality metrics
        positive_outcome_rate: highValueCount > 0 ? Math.round((positiveOutcomes / highValueCount) * 100) : 0,
        total_interactions_this_week: highValueCount || 0
      };

      return {
        ...goalsData,
        high_value_progress: Math.round((goalsData.actual_high_value_interactions / goalsData.target_high_value_interactions) * 100),
        strategic_progress: Math.round((goalsData.actual_strategic_connections / goalsData.target_new_strategic_connections) * 100),
        follow_up_progress: Math.round((goalsData.actual_follow_up_completion / goalsData.target_follow_up_completion) * 100),
        research_progress: Math.round((goalsData.actual_ai_research_sessions / goalsData.target_ai_research_sessions) * 100),

        // Weekly insights
        week_summary: {
          most_active_day: 'Data analysis pending',
          top_performing_sector: 'Data analysis pending',
          engagement_trend: goalsData.positive_outcome_rate >= 70 ? 'Excellent' :
                           goalsData.positive_outcome_rate >= 50 ? 'Good' : 'Needs improvement',
          recommended_focus: goalsData.actual_high_value_interactions < goalsData.target_high_value_interactions * 0.5
                           ? 'Increase high-value contact engagement'
                           : 'Maintain current momentum'
        }
      };

    } catch (error) {
      console.error('Error getting weekly goals:', error);
      return {
        target_high_value_interactions: 12,
        target_new_strategic_connections: 5,
        target_follow_up_completion: 15,
        target_ai_research_sessions: 8,
        actual_high_value_interactions: 0,
        actual_strategic_connections: 0,
        actual_follow_up_completion: 0,
        actual_ai_research_sessions: 0,
        high_value_progress: 0,
        strategic_progress: 0,
        follow_up_progress: 0,
        research_progress: 0,
        positive_outcome_rate: 0,
        total_interactions_this_week: 0,
        week_summary: {
          most_active_day: 'No data',
          top_performing_sector: 'No data',
          engagement_trend: 'No data',
          recommended_focus: 'Start engaging with high-value contacts'
        }
      };
    }
  }

  /**
   * Generate AI-powered daily focus recommendations
   */
  async generateDailyFocus(urgentPriorities, strategicOpportunities) {
    try {
      const totalUrgent = urgentPriorities.total_count;
      const totalStrategic = strategicOpportunities.total_count;

      let focusType = 'balanced';
      let primaryAction = 'Maintain steady relationship momentum';
      let secondaryActions = [];

      if (totalUrgent > 10) {
        focusType = 'urgent';
        primaryAction = 'Focus on urgent relationship maintenance - several high-value connections need immediate attention';
        secondaryActions = [
          'Prioritise overdue follow-ups with strategic value 8+',
          'Complete meeting follow-ups from recent engagements',
          'Address high-value relationship alerts'
        ];
      } else if (totalStrategic > 8) {
        focusType = 'strategic';
        primaryAction = 'Excellent day for strategic relationship building - multiple opportunities available';
        secondaryActions = [
          'Make warm introductions between aligned contacts',
          'Explore collaboration opportunities',
          'Conduct strategic check-ins with key relationships'
        ];
      } else {
        focusType = 'balanced';
        primaryAction = 'Balanced relationship management day - maintain momentum across all areas';
        secondaryActions = [
          'Complete 2-3 urgent follow-ups',
          'Explore 1-2 strategic opportunities',
          'Prepare for today\'s meetings with relationship context'
        ];
      }

      return {
        focus_type: focusType,
        primary_action: primaryAction,
        secondary_actions: secondaryActions,
        recommended_time_allocation: {
          urgent_actions: focusType === 'urgent' ? '60%' : '30%',
          strategic_building: focusType === 'strategic' ? '70%' : '40%',
          routine_maintenance: '30%'
        }
      };

    } catch (error) {
      console.error('Error generating daily focus:', error);
      return {
        focus_type: 'balanced',
        primary_action: 'Focus on relationship management priorities',
        secondary_actions: ['Complete urgent follow-ups', 'Explore strategic opportunities'],
        recommended_time_allocation: {
          urgent_actions: '40%',
          strategic_building: '40%',
          routine_maintenance: '20%'
        }
      };
    }
  }

  /**
   * Get quick action items for immediate execution
   */
  async getQuickActions(limit = 5) {
    try {
      const quickActions = [];

      // Get overdue follow-ups from contact_interactions (highest priority)
      const { data: overdueFollowUps } = await this.supabase
        .from('contact_interactions')
        .select(`
          person_id,
          follow_up_date,
          subject,
          person_identity_map (
            person_id,
            full_name,
            email,
            contact_data,
            youth_justice_relevance_score
          )
        `)
        .eq('follow_up_required', true)
        .eq('follow_up_completed', false)
        .lt('follow_up_date', new Date().toISOString())
        .order('follow_up_date', { ascending: true })
        .limit(3);

      if (overdueFollowUps?.length) {
        quickActions.push(...overdueFollowUps.map(followUp => ({
          person_id: followUp.person_id,
          full_name: followUp.person_identity_map?.full_name,
          email: followUp.person_identity_map?.email,
          organization: followUp.person_identity_map?.contact_data?.organization,
          action_title: `Follow up: ${followUp.subject || 'Previous conversation'}`,
          action_description: `Overdue follow-up with ${followUp.person_identity_map?.full_name}`,
          priority: 'high',
          estimated_time: '5 minutes',
          action_type: 'overdue_follow_up',
          due_date: followUp.follow_up_date,
          youth_justice_score: followUp.person_identity_map?.youth_justice_relevance_score
        })));
      }

      // Get high-priority contacts that haven't been contacted recently (medium priority)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: strategicContacts } = await this.supabase
        .from('person_identity_map')
        .select(`
          person_id,
          full_name,
          email,
          contact_data,
          youth_justice_relevance_score,
          engagement_priority,
          last_research_update
        `)
        .in('engagement_priority', ['high', 'critical'])
        .or(`last_research_update.is.null,last_research_update.lt.${thirtyDaysAgo.toISOString()}`)
        .order('youth_justice_relevance_score', { ascending: false })
        .limit(3);

      if (strategicContacts?.length) {
        quickActions.push(...strategicContacts.map(contact => ({
          person_id: contact.person_id,
          full_name: contact.full_name,
          email: contact.email,
          organization: contact.contact_data?.organization,
          action_title: `Strategic check-in: ${contact.full_name}`,
          action_description: `High-priority contact needs engagement`,
          priority: contact.engagement_priority === 'critical' ? 'high' : 'medium',
          estimated_time: '10 minutes',
          action_type: 'strategic_checkin',
          youth_justice_score: contact.youth_justice_relevance_score,
          reason: `${contact.engagement_priority} priority contact with ${contact.youth_justice_relevance_score}% youth justice relevance`
        })));
      }

      // Get contacts that need AI research update (lower priority)
      const { data: researchNeeded } = await this.supabase
        .from('person_identity_map')
        .select(`
          person_id,
          full_name,
          email,
          contact_data,
          youth_justice_relevance_score,
          last_research_update
        `)
        .gte('youth_justice_relevance_score', 60)
        .or(`last_research_update.is.null,last_research_update.lt.${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()}`)
        .order('youth_justice_relevance_score', { ascending: false })
        .limit(2);

      if (researchNeeded?.length) {
        quickActions.push(...researchNeeded.map(contact => ({
          person_id: contact.person_id,
          full_name: contact.full_name,
          email: contact.email,
          organization: contact.contact_data?.organization,
          action_title: `Research update: ${contact.full_name}`,
          action_description: `Update intelligence data for strategic contact`,
          priority: 'low',
          estimated_time: '15 minutes',
          action_type: 'research_update',
          youth_justice_score: contact.youth_justice_relevance_score,
          reason: 'Intelligence data needs refreshing'
        })));
      }

      // Try to get AI-powered suggestions as additional context
      let aiSuggestions = [];
      try {
        const allSuggestions = await this.suggestionsEngine.generateAllSuggestions();
        if (allSuggestions?.meeting_followups?.length) {
          aiSuggestions = allSuggestions.meeting_followups.slice(0, 2).map(action => ({
            ...action,
            priority: 'high',
            estimated_time: '10 minutes',
            action_type: 'ai_meeting_follow_up'
          }));
        }
      } catch (suggestionError) {
        console.warn('AI suggestions unavailable for quick actions:', suggestionError.message);
      }

      // Combine and prioritize all actions
      const allActions = [...quickActions, ...aiSuggestions];
      const prioritizedActions = allActions
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
          if (priorityDiff !== 0) return priorityDiff;
          return (b.youth_justice_score || 0) - (a.youth_justice_score || 0);
        })
        .slice(0, limit);

      const totalTime = prioritizedActions.reduce((total, action) => {
        const minutes = parseInt(action.estimated_time?.match(/\d+/)?.[0]) || 10;
        return total + minutes;
      }, 0);

      return {
        success: true,
        quick_actions: prioritizedActions,
        total_available: allActions.length,
        estimated_total_time: totalTime,
        time_breakdown: {
          high_priority: prioritizedActions.filter(a => a.priority === 'high').length * 8,
          medium_priority: prioritizedActions.filter(a => a.priority === 'medium').length * 12,
          low_priority: prioritizedActions.filter(a => a.priority === 'low').length * 15
        }
      };

    } catch (error) {
      console.error('Error getting quick actions:', error);
      return {
        success: false,
        error: 'Failed to get quick actions',
        message: error.message,
        quick_actions: [],
        total_available: 0,
        estimated_total_time: 0
      };
    }
  }

  /**
   * Mark morning briefing as reviewed
   */
  async markBriefingReviewed(userId = 'default', briefingDate = null) {
    try {
      const reviewDate = briefingDate || new Date().toISOString().split('T')[0];

      // Store briefing review in user preferences or activity log
      const { data, error } = await this.supabase
        .from('user_activity_log')
        .insert({
          user_id: userId,
          activity_type: 'morning_briefing_reviewed',
          activity_date: reviewDate,
          created_at: new Date().toISOString()
        });

      return {
        success: !error,
        reviewed_date: reviewDate,
        user_id: userId
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to mark briefing as reviewed',
        message: error.message
      };
    }
  }
}

export default MorningDashboardService;