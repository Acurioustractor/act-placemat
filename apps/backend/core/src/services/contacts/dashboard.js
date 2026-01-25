/**
 * Contact Intelligence Dashboard Module
 *
 * Provides dashboard data aggregation and statistics calculation
 * for contact intelligence metrics.
 *
 * @module contacts/dashboard
 */

import { logger } from '../utils/logger.js';

/**
 * Dashboard operations for contact intelligence
 */
export class ContactDashboard {
  constructor(supabase, metrics) {
    this.supabase = supabase;
    this.metrics = metrics;
  }

  /**
   * Get mock dashboard data when database tables don't exist yet
   * @returns {Object} Mock dashboard data
   */
  getMockDashboardData() {
    return {
      total_contacts: 0,
      high_priority: 0,
      critical_priority: 0,
      government_contacts: 0,
      media_contacts: 0,
      indigenous_contacts: 0,
      avg_relevance_score: 0,
      recent_activity: [],
      top_sectors: [
        { name: 'Government', count: 0, percentage: 0 },
        { name: 'Media', count: 0, percentage: 0 },
        { name: 'Academic', count: 0, percentage: 0 },
        { name: 'Indigenous', count: 0, percentage: 0 }
      ],
      engagement_pipeline: {
        pending: 0,
        in_progress: 0,
        completed: 0
      },
      active_campaigns: 0,
      needs_initialization: true,
      message: 'Database schema needs initialization. Use /initialize endpoint to set up tables.'
    };
  }

  /**
   * Get contact intelligence dashboard data
   * @returns {Promise<Object>} Dashboard data with metrics
   */
  async getDashboardData() {
    try {
      // Get summary statistics from LinkedIn contacts
      const { data: contacts, error: summaryError } = await this.supabase
        .from('linkedin_contacts')
        .select('strategic_value, relationship_score, last_interaction, current_company, interaction_count')
        .limit(1000);

      if (summaryError) {
        // If the table doesn't exist, return mock data
        if (summaryError.code === '42P01') {
          logger.warn('⚠️  Contact intelligence tables not yet created, returning mock data');
          return this.getMockDashboardData();
        }
        throw summaryError;
      }

      // Calculate real metrics from LinkedIn data
      const totalContacts = contacts.length;
      const highValueContacts = contacts.filter(c => c.strategic_value === 'high').length;
      const activeContacts = contacts.filter(c => c.interaction_count > 0 || c.last_interaction).length;

      // Calculate average relationship score (LinkedIn uses 0-1 scale)
      const scores = contacts.filter(c => c.relationship_score).map(c => parseFloat(c.relationship_score));
      const averageResponseRate = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.78;

      // Calculate relationship trends
      const relationshipsStrengthening = contacts.filter(c => parseFloat(c.relationship_score || 0) > 0.7).length;
      const relationshipsNeedingAttention = contacts.filter(c => parseFloat(c.relationship_score || 0) < 0.3).length;

      // Calculate follow-ups (contacts without recent interactions)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const overdueFollowUps = contacts.filter(c => {
        if (!c.last_interaction) return true;
        return new Date(c.last_interaction) < thirtyDaysAgo;
      }).length;

      // Top companies based on real data
      const topCompanies = contacts
        .filter(c => c.current_company)
        .reduce((acc, contact) => {
          const company = contact.current_company;
          if (!acc[company]) {
            acc[company] = { contact_count: 0, scores: [] };
          }
          acc[company].contact_count++;
          if (contact.relationship_score) {
            acc[company].scores.push(parseFloat(contact.relationship_score));
          }
          return acc;
        }, {});

      const topCompaniesArray = Object.entries(topCompanies)
        .map(([company_name, data]) => ({
          company_name,
          contact_count: data.contact_count,
          avg_engagement_score: data.scores.length > 0
            ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
            : 0.5
        }))
        .sort((a, b) => b.contact_count - a.contact_count)
        .slice(0, 5);

      return {
        total_contacts: totalContacts,
        high_value_contacts: highValueContacts,
        active_contacts: activeContacts,
        average_response_rate: averageResponseRate,
        relationships_strengthening: relationshipsStrengthening,
        relationships_declining: relationshipsNeedingAttention,
        overdue_follow_ups: overdueFollowUps,
        total_interactions_this_month: Math.floor(totalContacts * 0.15), // Estimate
        average_engagement_score: averageResponseRate,
        top_companies: topCompaniesArray,
        metrics: this.metrics
      };

    } catch (error) {
      logger.error('❌ Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Calculate dashboard statistics from contacts, campaigns, and interactions
   * @param {Array} contacts - List of contacts
   * @param {Array} campaigns - List of campaigns
   * @param {Array} interactions - List of interactions
   * @returns {Object} Calculated statistics
   */
  calculateDashboardStats(contacts, campaigns, interactions) {
    const stats = {
      total_contacts: contacts.length,
      high_priority: contacts.filter(c => c.engagement_priority === 'high' || c.engagement_priority === 'critical').length,
      indigenous_contacts: contacts.filter(c => c.indigenous_affiliation).length,
      government_contacts: contacts.filter(c => c.sector === 'government').length,
      media_contacts: contacts.filter(c => c.sector === 'media').length,
      recent_interactions: interactions.length,
      active_campaigns: campaigns.length,
      average_youth_justice_score: 0,
      engagement_rate: 0
    };

    if (contacts.length > 0) {
      stats.average_youth_justice_score = Math.round(
        contacts.reduce((sum, c) => sum + (c.youth_justice_relevance_score || 0), 0) / contacts.length
      );

      const contactsWithInteractions = contacts.filter(c => c.interaction_count > 0).length;
      stats.engagement_rate = Math.round((contactsWithInteractions / contacts.length) * 100);
    }

    return stats;
  }
}

export default ContactDashboard;
