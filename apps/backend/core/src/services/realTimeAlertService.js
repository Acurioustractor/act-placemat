/**
 * Real-Time Alert Service
 * Monitors relationship scores and triggers alerts for high-value opportunities
 */

import { createClient } from '@supabase/supabase-js';
import MultiProviderAI from './multiProviderAI.js';

class RealTimeAlertService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.ai = new MultiProviderAI();
    this.alertThresholds = {
      high_value_score_change: 2.0, // Strategic value change > 2 points
      relationship_score_boost: 1.5, // Relationship score increase > 1.5 points
      interaction_frequency_spike: 0.8, // 80% increase in interactions
      new_high_value_contact: 8.0, // New contact with strategic value > 8
      overdue_follow_up_critical: 21, // No contact for 21+ days
      collaboration_opportunity_score: 85 // Project-contact relevance > 85%
    };
    this.lastAlertCheck = new Date();
    this.activeAlerts = new Map();
  }

  /**
   * Start real-time monitoring for relationship scoring alerts
   */
  async startRealTimeMonitoring() {
    try {
      console.log('🚨 Starting real-time relationship scoring alerts...');

      // Initial alert generation
      await this.generateRealTimeAlerts();

      // Set up periodic monitoring (every 5 minutes)
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.generateRealTimeAlerts();
        } catch (error) {
          console.error('Error in periodic alert generation:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Set up database change listeners
      await this.setupDatabaseListeners();

      return {
        success: true,
        message: 'Real-time relationship scoring alerts started successfully'
      };

    } catch (error) {
      console.error('Error starting real-time monitoring:', error);
      return {
        success: false,
        error: 'Failed to start real-time monitoring',
        message: error.message
      };
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🔕 Real-time relationship scoring alerts stopped');
    return {
      success: true,
      message: 'Real-time monitoring stopped successfully'
    };
  }

  /**
   * Generate real-time alerts based on current data
   */
  async generateRealTimeAlerts() {
    try {
      const currentTime = new Date();
      const timeSinceLastCheck = (currentTime - this.lastAlertCheck) / (1000 * 60); // minutes

      console.log(`🔍 Checking for alerts (${Math.round(timeSinceLastCheck)} mins since last check)...`);

      const alerts = await Promise.all([
        this.checkHighValueScoreChanges(),
        this.checkRelationshipScoreBoosts(),
        this.checkInteractionFrequencySpikes(),
        this.checkNewHighValueContacts(),
        this.checkOverdueFollowUpsCritical(),
        this.checkCollaborationOpportunities()
      ]);

      const flatAlerts = alerts.flat();
      const newAlerts = this.filterNewAlerts(flatAlerts);

      if (newAlerts.length > 0) {
        await this.processNewAlerts(newAlerts);
      }

      this.lastAlertCheck = currentTime;

      return {
        success: true,
        total_alerts_checked: flatAlerts.length,
        new_alerts_generated: newAlerts.length,
        active_alerts: this.activeAlerts.size
      };

    } catch (error) {
      console.error('Error generating real-time alerts:', error);
      return {
        success: false,
        error: 'Failed to generate alerts',
        message: error.message
      };
    }
  }

  /**
   * Check for significant strategic value score changes
   */
  async checkHighValueScoreChanges() {
    try {
      // This would typically compare current scores with historical data
      // For now, identify contacts with very high strategic values that need attention
      const { data: highValueContacts, error } = await this.supabase
        .from('linkedin_contacts')
        .select('id, full_name, current_company, strategic_value, relationship_score, last_interaction')
        .gte('strategic_value', 8.5)
        .lt('last_interaction', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error checking high value score changes:', error);
        return [];
      }

      return (highValueContacts || []).map(contact => ({
        id: `high_value_${contact.id}`,
        type: 'high_value_score_change',
        priority: 'high',
        contact_id: contact.id,
        contact_name: contact.full_name,
        company: contact.current_company,
        title: 'High-Value Contact Needs Attention',
        message: `${contact.full_name} (Strategic Value: ${contact.strategic_value}) hasn't been contacted in 7+ days`,
        data: {
          strategic_value: contact.strategic_value,
          relationship_score: contact.relationship_score,
          days_since_contact: Math.floor((Date.now() - new Date(contact.last_interaction).getTime()) / (1000 * 60 * 60 * 24))
        },
        suggested_actions: [
          'Schedule strategic check-in call',
          'Send personalised update on recent projects',
          'Explore collaboration opportunities'
        ],
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error in checkHighValueScoreChanges:', error);
      return [];
    }
  }

  /**
   * Check for relationship score improvements
   */
  async checkRelationshipScoreBoosts() {
    try {
      // Identify contacts with high relationship scores and recent interactions
      const { data: recentInteractions, error } = await this.supabase
        .from('email_interactions')
        .select(`
          contact_id,
          linkedin_contacts!inner(full_name, current_company, strategic_value, relationship_score)
        `)
        .gte('received_date', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
        .gte('linkedin_contacts.relationship_score', 7.5);

      if (error) {
        console.error('Error checking relationship score boosts:', error);
        return [];
      }

      const uniqueContacts = this.deduplicateByField(recentInteractions || [], 'contact_id');

      return uniqueContacts.map(interaction => ({
        id: `relationship_boost_${interaction.contact_id}`,
        type: 'relationship_score_boost',
        priority: 'medium',
        contact_id: interaction.contact_id,
        contact_name: interaction.linkedin_contacts.full_name,
        company: interaction.linkedin_contacts.current_company,
        title: 'Relationship Momentum Opportunity',
        message: `Recent interaction with ${interaction.linkedin_contacts.full_name} - relationship score ${interaction.linkedin_contacts.relationship_score}`,
        data: {
          relationship_score: interaction.linkedin_contacts.relationship_score,
          strategic_value: interaction.linkedin_contacts.strategic_value,
          recent_interaction: true
        },
        suggested_actions: [
          'Follow up on recent conversation',
          'Propose specific collaboration',
          'Schedule face-to-face meeting'
        ],
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error in checkRelationshipScoreBoosts:', error);
      return [];
    }
  }

  /**
   * Check for interaction frequency spikes
   */
  async checkInteractionFrequencySpikes() {
    try {
      // Get contacts with multiple interactions in the last week
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data: frequentContacts, error } = await this.supabase
        .from('email_interactions')
        .select(`
          contact_id,
          linkedin_contacts!inner(full_name, current_company, strategic_value)
        `)
        .gte('received_date', sevenDaysAgo.toISOString());

      if (error) {
        console.error('Error checking interaction frequency spikes:', error);
        return [];
      }

      // Count interactions per contact
      const contactInteractionCounts = {};
      (frequentContacts || []).forEach(interaction => {
        const contactId = interaction.contact_id;
        contactInteractionCounts[contactId] = contactInteractionCounts[contactId] || {
          count: 0,
          contact: interaction.linkedin_contacts
        };
        contactInteractionCounts[contactId].count++;
      });

      // Filter contacts with high interaction frequency (3+ interactions in a week)
      const spikeContacts = Object.entries(contactInteractionCounts)
        .filter(([, data]) => data.count >= 3 && data.contact.strategic_value >= 6)
        .map(([contactId, data]) => ({
          contact_id: contactId,
          interaction_count: data.count,
          contact: data.contact
        }));

      return spikeContacts.map(spike => ({
        id: `frequency_spike_${spike.contact_id}`,
        type: 'interaction_frequency_spike',
        priority: 'medium',
        contact_id: spike.contact_id,
        contact_name: spike.contact.full_name,
        company: spike.contact.current_company,
        title: 'High Interaction Frequency Detected',
        message: `${spike.interaction_count} interactions with ${spike.contact.full_name} this week`,
        data: {
          weekly_interaction_count: spike.interaction_count,
          strategic_value: spike.contact.strategic_value
        },
        suggested_actions: [
          'Capitalise on engagement momentum',
          'Discuss formal partnership',
          'Invite to strategic meeting'
        ],
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error in checkInteractionFrequencySpikes:', error);
      return [];
    }
  }

  /**
   * Check for new high-value contacts
   */
  async checkNewHighValueContacts() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data: newHighValueContacts, error } = await this.supabase
        .from('linkedin_contacts')
        .select('id, full_name, current_company, strategic_value, created_at')
        .gte('strategic_value', this.alertThresholds.new_high_value_contact)
        .gte('created_at', last24Hours.toISOString());

      if (error) {
        console.error('Error checking new high-value contacts:', error);
        return [];
      }

      return (newHighValueContacts || []).map(contact => ({
        id: `new_high_value_${contact.id}`,
        type: 'new_high_value_contact',
        priority: 'high',
        contact_id: contact.id,
        contact_name: contact.full_name,
        company: contact.current_company,
        title: 'New High-Value Contact Added',
        message: `${contact.full_name} added with strategic value ${contact.strategic_value}`,
        data: {
          strategic_value: contact.strategic_value,
          hours_since_added: Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60))
        },
        suggested_actions: [
          'Immediate strategic outreach',
          'Research collaboration opportunities',
          'Add to priority follow-up list'
        ],
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error in checkNewHighValueContacts:', error);
      return [];
    }
  }

  /**
   * Check for critically overdue follow-ups
   */
  async checkOverdueFollowUpsCritical() {
    try {
      const criticalThreshold = new Date(Date.now() - this.alertThresholds.overdue_follow_up_critical * 24 * 60 * 60 * 1000);

      const { data: overdueContacts, error } = await this.supabase
        .from('linkedin_contacts')
        .select('id, full_name, current_company, strategic_value, last_interaction')
        .gte('strategic_value', 7.5)
        .lt('last_interaction', criticalThreshold.toISOString());

      if (error) {
        console.error('Error checking critical overdue follow-ups:', error);
        return [];
      }

      return (overdueContacts || []).map(contact => ({
        id: `overdue_critical_${contact.id}`,
        type: 'overdue_follow_up_critical',
        priority: 'critical',
        contact_id: contact.id,
        contact_name: contact.full_name,
        company: contact.current_company,
        title: 'Critical: Long Overdue Follow-Up',
        message: `${contact.full_name} hasn't been contacted in ${this.alertThresholds.overdue_follow_up_critical}+ days (Strategic Value: ${contact.strategic_value})`,
        data: {
          strategic_value: contact.strategic_value,
          days_overdue: Math.floor((Date.now() - new Date(contact.last_interaction).getTime()) / (1000 * 60 * 60 * 24))
        },
        suggested_actions: [
          'URGENT: Schedule immediate call',
          'Send re-engagement email',
          'Offer meeting to discuss collaboration'
        ],
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error in checkOverdueFollowUpsCritical:', error);
      return [];
    }
  }

  /**
   * Check for high-score collaboration opportunities
   */
  async checkCollaborationOpportunities() {
    try {
      const { data: highScoreOpportunities, error } = await this.supabase
        .from('project_contact_linkages')
        .select(`
          id,
          relevance_score,
          specific_value,
          suggested_approach,
          created_at,
          notion_projects!inner(project_name, status),
          linkedin_contacts!inner(full_name, current_company, strategic_value)
        `)
        .gte('relevance_score', this.alertThresholds.collaboration_opportunity_score)
        .is('status', null) // Unactioned
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      if (error) {
        console.error('Error checking collaboration opportunities:', error);
        return [];
      }

      return (highScoreOpportunities || []).map(opportunity => ({
        id: `collaboration_${opportunity.id}`,
        type: 'collaboration_opportunity',
        priority: 'high',
        contact_id: opportunity.linkedin_contacts ? Object.keys(opportunity.linkedin_contacts)[0] : null,
        contact_name: opportunity.linkedin_contacts?.full_name,
        company: opportunity.linkedin_contacts?.current_company,
        project_name: opportunity.notion_projects?.project_name,
        title: 'High-Score Collaboration Opportunity',
        message: `${opportunity.linkedin_contacts?.full_name} × ${opportunity.notion_projects?.project_name} (${opportunity.relevance_score}% match)`,
        data: {
          relevance_score: opportunity.relevance_score,
          specific_value: opportunity.specific_value,
          strategic_value: opportunity.linkedin_contacts?.strategic_value,
          project_status: opportunity.notion_projects?.status
        },
        suggested_actions: [
          opportunity.suggested_approach || 'Reach out with project proposal',
          'Schedule collaboration discussion',
          'Send project overview document'
        ],
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error in checkCollaborationOpportunities:', error);
      return [];
    }
  }

  /**
   * Filter alerts to only return new ones (not already active)
   */
  filterNewAlerts(alerts) {
    return alerts.filter(alert => !this.activeAlerts.has(alert.id));
  }

  /**
   * Process new alerts (store, notify, etc.)
   */
  async processNewAlerts(alerts) {
    try {
      console.log(`📢 Processing ${alerts.length} new alerts...`);

      // Store alerts in database
      await this.storeAlerts(alerts);

      // Add to active alerts map
      alerts.forEach(alert => {
        this.activeAlerts.set(alert.id, {
          ...alert,
          processed_at: new Date().toISOString()
        });
      });

      // TODO: Send notifications (email, Slack, etc.)
      // await this.sendNotifications(alerts);

      console.log(`✅ Processed ${alerts.length} new alerts successfully`);

    } catch (error) {
      console.error('Error processing new alerts:', error);
      throw error;
    }
  }

  /**
   * Store alerts in database
   */
  async storeAlerts(alerts) {
    try {
      if (!alerts.length) return;

      const alertsToStore = alerts.map(alert => ({
        alert_id: alert.id,
        alert_type: alert.type,
        priority: alert.priority,
        contact_id: alert.contact_id,
        contact_name: alert.contact_name,
        company: alert.company,
        title: alert.title,
        message: alert.message,
        data: alert.data,
        suggested_actions: alert.suggested_actions,
        status: 'active',
        created_at: alert.created_at
      }));

      const { error } = await this.supabase
        .from('real_time_alerts')
        .insert(alertsToStore);

      if (error) {
        console.error('Error storing alerts:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error in storeAlerts:', error);
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(priority = null, limit = 50) {
    try {
      let query = this.supabase
        .from('real_time_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (priority) {
        query = query.eq('priority', priority);
      }

      query = query.limit(limit);

      const { data: alerts, error } = await query;

      if (error) {
        throw error;
      }

      return alerts || [];

    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }

  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId, resolution_notes = null) {
    try {
      const { data, error } = await this.supabase
        .from('real_time_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes
        })
        .eq('alert_id', alertId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Remove from active alerts map
      this.activeAlerts.delete(alertId);

      return {
        success: true,
        alert: data,
        message: 'Alert resolved successfully'
      };

    } catch (error) {
      console.error('Error resolving alert:', error);
      return {
        success: false,
        error: 'Failed to resolve alert',
        message: error.message
      };
    }
  }

  /**
   * Setup database listeners for real-time changes
   */
  async setupDatabaseListeners() {
    try {
      // Listen for changes in linkedin_contacts table
      this.supabase
        .channel('contact_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'linkedin_contacts' },
          (payload) => this.handleContactChange(payload)
        )
        .subscribe();

      // Listen for new email interactions
      this.supabase
        .channel('interaction_changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'email_interactions' },
          (payload) => this.handleInteractionChange(payload)
        )
        .subscribe();

      console.log('📡 Database listeners setup for real-time alerts');

    } catch (error) {
      console.error('Error setting up database listeners:', error);
    }
  }

  /**
   * Handle contact changes for real-time alerts
   */
  async handleContactChange(payload) {
    try {
      console.log('👤 Contact change detected:', payload.eventType);

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Trigger immediate alert check for this contact
        setTimeout(() => this.generateRealTimeAlerts(), 1000);
      }

    } catch (error) {
      console.error('Error handling contact change:', error);
    }
  }

  /**
   * Handle interaction changes for real-time alerts
   */
  async handleInteractionChange(payload) {
    try {
      console.log('💬 Interaction change detected:', payload.eventType);

      // Trigger immediate alert check
      setTimeout(() => this.generateRealTimeAlerts(), 1000);

    } catch (error) {
      console.error('Error handling interaction change:', error);
    }
  }

  // Helper method
  deduplicateByField(array, field) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[field];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
}

export default RealTimeAlertService;