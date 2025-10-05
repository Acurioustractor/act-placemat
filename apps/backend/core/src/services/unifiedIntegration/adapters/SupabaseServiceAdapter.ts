/**
 * Supabase Service Adapter
 * Enterprise-grade adapter for comprehensive contact intelligence system
 * Manages 20,000+ contacts with AI/ML processing, campaigns, and relationship intelligence
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Contact, ContactFilters, Project, ProjectFilters, FinanceData, FinanceFilters } from '../interfaces/IIntegrationService.js';
import { IntegrationLogger } from '../utils/Logger.js';

interface PersonIdentityRecord {
  person_id: string;
  full_name?: string;
  email?: string;
  linkedin_contact_id?: string;
  gmail_id?: string;
  notion_id?: string;
  contact_data?: any;
  youth_justice_relevance_score?: number;
  engagement_priority?: 'low' | 'medium' | 'high' | 'critical';
  engagement_strategy?: string;
  sector?: string;
  organization_type?: string;
  location_region?: string;
  indigenous_affiliation?: boolean;
  media_reach?: string;
  government_influence?: number;
  funding_capacity?: string;
  collaboration_potential?: number;
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ContactIntelligenceScores {
  influence_score: number;
  accessibility_score: number;
  alignment_score: number;
  timing_score: number;
  strategic_value_score: number;
  composite_score: number;
  engagement_readiness: number;
  response_likelihood: number;
  confidence_level: number;
}

interface ContactInteraction {
  id: string;
  interaction_type: string;
  interaction_date: string;
  subject?: string;
  description?: string;
  outcome?: string;
  sentiment_score?: number;
  follow_up_required: boolean;
  follow_up_date?: string;
}

export class SupabaseServiceAdapter {
  private readonly supabase: SupabaseClient;
  private readonly logger: IntegrationLogger;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.logger = IntegrationLogger.getInstance();
  }

  /**
   * Get contacts from the enterprise contact intelligence system
   * Leverages person_identity_map with AI/ML scoring and relationship intelligence
   */
  async getContacts(filters: ContactFilters = {}): Promise<Contact[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'SupabaseServiceAdapter', 'getContacts');

    try {
      timedLogger.info('Fetching enterprise contacts from Supabase', { filters });

      // Query the comprehensive contact dashboard view
      let query = this.supabase
        .from('contact_dashboard_summary')
        .select(`
          person_id,
          full_name,
          email,
          youth_justice_relevance_score,
          engagement_priority,
          sector,
          indigenous_affiliation,
          composite_score,
          engagement_readiness,
          interaction_count,
          last_interaction,
          pending_tasks,
          created_at,
          updated_at
        `);

      // Apply enterprise-level filters
      if (filters.search) {
        // Enhanced search across multiple fields
        query = query.or(
          `full_name.ilike.%${filters.search}%,` +
          `email.ilike.%${filters.search}%,` +
          `sector.ilike.%${filters.search}%`
        );
      }

      if (filters.strategicValue) {
        // Map to engagement priority
        const priorityMap = {
          'high': ['high', 'critical'],
          'medium': ['medium'],
          'low': ['low'],
          'unknown': ['low']
        };
        query = query.in('engagement_priority', priorityMap[filters.strategicValue] || ['low']);
      }

      // Apply intelligent sorting
      if (filters.sortBy) {
        const sortColumn = this.mapSortField(filters.sortBy);
        query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });
      } else {
        // Default enterprise sorting: priority, then composite score
        query = query.order('engagement_priority', { ascending: false })
                     .order('composite_score', { ascending: false });
      }

      // Apply pagination
      if (filters.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Enrich with additional intelligence data
      const enrichedContacts = await this.enrichContactsWithIntelligence(data || []);

      timedLogger.finish(true, {
        contactCount: enrichedContacts.length,
        highPriorityCount: enrichedContacts.filter(c => c.strategicValue === 'high').length
      });

      return enrichedContacts;

    } catch (error) {
      timedLogger.error('Failed to fetch enterprise contacts', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Get high-value contacts using enterprise intelligence scoring
   */
  async getHighValueContacts(limit = 100): Promise<Contact[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'SupabaseServiceAdapter', 'getHighValueContacts');

    try {
      timedLogger.info('Fetching high-value enterprise contacts', { limit });

      const { data, error } = await this.supabase
        .from('contact_dashboard_summary')
        .select('*')
        .in('engagement_priority', ['high', 'critical'])
        .gte('composite_score', 70)
        .order('composite_score', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const enrichedContacts = await this.enrichContactsWithIntelligence(data || []);

      timedLogger.finish(true, {
        contactCount: enrichedContacts.length,
        avgCompositeScore: enrichedContacts.reduce((sum, c) => sum + (c.relationshipScore || 0), 0) / enrichedContacts.length
      });

      return enrichedContacts;

    } catch (error) {
      timedLogger.error('Failed to fetch high-value enterprise contacts', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Get contacts by sector with intelligence filtering
   */
  async getContactsBySector(sector: string, limit = 50): Promise<Contact[]> {
    try {
      const { data, error } = await this.supabase
        .from('contact_dashboard_summary')
        .select('*')
        .eq('sector', sector)
        .order('composite_score', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return await this.enrichContactsWithIntelligence(data || []);

    } catch (error) {
      this.logger.error('Failed to fetch contacts by sector', error);
      throw error;
    }
  }

  /**
   * Get strategic contacts for Indigenous engagement
   */
  async getIndigenousStrategicContacts(limit = 50): Promise<Contact[]> {
    try {
      const { data, error } = await this.supabase
        .from('contact_dashboard_summary')
        .select('*')
        .eq('indigenous_affiliation', true)
        .gte('composite_score', 50)
        .order('composite_score', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return await this.enrichContactsWithIntelligence(data || []);

    } catch (error) {
      this.logger.error('Failed to fetch Indigenous strategic contacts', error);
      throw error;
    }
  }

  /**
   * Get projects from Notion integration via person_identity_map
   */
  async getProjects(filters: ProjectFilters = {}): Promise<Project[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'SupabaseServiceAdapter', 'getProjects');

    try {
      timedLogger.info('Fetching projects with contact linkages', { filters });

      // This would typically query a projects table linked to person_identity_map
      // For now, return empty array as this requires Notion integration
      // TODO: Implement project fetching with contact relationships

      timedLogger.finish(true, { projectCount: 0 });
      return [];

    } catch (error) {
      timedLogger.error('Failed to fetch projects', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Get financial data (placeholder for integration with bookkeeping system)
   */
  async getFinanceData(filters: FinanceFilters = {}): Promise<FinanceData[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'SupabaseServiceAdapter', 'getFinanceData');

    try {
      timedLogger.info('Fetching financial data', { filters });

      // TODO: Implement financial data integration
      // This would connect to bookkeeping tables and link to contact campaigns

      timedLogger.finish(true, { financeRecordCount: 0 });
      return [];

    } catch (error) {
      timedLogger.error('Failed to fetch financial data', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Health check for Supabase connection and key tables
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check key tables exist and are accessible
      const checks = await Promise.all([
        this.supabase.from('person_identity_map').select('count').limit(1),
        this.supabase.from('contact_intelligence_scores').select('count').limit(1),
        this.supabase.from('contact_interactions').select('count').limit(1),
        this.supabase.from('linkedin_contacts').select('count').limit(1)
      ]);

      return checks.every(check => !check.error);

    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive contact statistics for enterprise dashboard
   */
  async getEnterpriseContactStats(): Promise<{
    totalContacts: number;
    highPriorityContacts: number;
    criticalPriorityContacts: number;
    indigenousContacts: number;
    governmentContacts: number;
    mediaContacts: number;
    academicContacts: number;
    avgIntelligenceScore: number;
    avgEngagementReadiness: number;
    totalInteractions: number;
    activeCampaigns: number;
    pendingTasks: number;
    sectorBreakdown: Record<string, number>;
    engagementPriorityBreakdown: Record<string, number>;
  }> {
    try {
      // Get comprehensive stats from multiple tables
      const [contactStats, interactionStats, campaignStats, taskStats] = await Promise.all([
        this.getContactStatistics(),
        this.getInteractionStatistics(),
        this.getCampaignStatistics(),
        this.getTaskStatistics()
      ]);

      return {
        ...contactStats,
        ...interactionStats,
        ...campaignStats,
        ...taskStats
      };

    } catch (error) {
      this.logger.error('Failed to get enterprise contact stats', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async enrichContactsWithIntelligence(dashboardData: any[]): Promise<Contact[]> {
    if (!dashboardData.length) return [];

    try {
      // Get additional intelligence data for contacts
      const personIds = dashboardData.map(contact => contact.person_id);

      // Fetch intelligence scores
      const { data: intelligenceData } = await this.supabase
        .from('contact_intelligence_scores')
        .select('*')
        .in('person_id', personIds);

      // Fetch recent interactions
      const { data: interactionData } = await this.supabase
        .from('contact_interactions')
        .select('person_id, interaction_type, interaction_date, outcome')
        .in('person_id', personIds)
        .order('interaction_date', { ascending: false });

      // Map intelligence data by person_id
      const intelligenceMap = new Map(
        (intelligenceData || []).map(score => [score.person_id, score])
      );

      const interactionMap = new Map<string, ContactInteraction[]>();
      (interactionData || []).forEach(interaction => {
        if (!interactionMap.has(interaction.person_id)) {
          interactionMap.set(interaction.person_id, []);
        }
        interactionMap.get(interaction.person_id)!.push(interaction);
      });

      return dashboardData.map(contact => this.transformToUnifiedContact(
        contact,
        intelligenceMap.get(contact.person_id),
        interactionMap.get(contact.person_id) || []
      ));

    } catch (error) {
      this.logger.error('Failed to enrich contacts with intelligence', error);
      // Return basic transformation if enrichment fails
      return dashboardData.map(contact => this.transformToUnifiedContact(contact));
    }
  }

  private transformToUnifiedContact(
    dashboardContact: any,
    intelligence?: ContactIntelligenceScores,
    interactions: ContactInteraction[] = []
  ): Contact {
    return {
      id: `supabase:${dashboardContact.person_id}`,
      fullName: dashboardContact.full_name,
      firstName: dashboardContact.full_name?.split(' ')[0],
      lastName: dashboardContact.full_name?.split(' ').slice(1).join(' '),
      emailAddress: dashboardContact.email,
      relationshipScore: intelligence?.composite_score ? intelligence.composite_score / 100 : 0,
      strategicValue: this.mapEngagementPriorityToStrategicValue(dashboardContact.engagement_priority),
      engagementFrequency: this.calculateEngagementFrequency(intelligence?.engagement_readiness),
      lastInteraction: dashboardContact.last_interaction || dashboardContact.updated_at,
      dataSource: 'supabase',
      enrichmentData: {
        personId: dashboardContact.person_id,
        youthJusticeRelevanceScore: dashboardContact.youth_justice_relevance_score,
        sector: dashboardContact.sector,
        indigenousAffiliation: dashboardContact.indigenous_affiliation,
        interactionCount: dashboardContact.interaction_count,
        pendingTasks: dashboardContact.pending_tasks,
        intelligence: intelligence ? {
          influenceScore: intelligence.influence_score,
          accessibilityScore: intelligence.accessibility_score,
          alignmentScore: intelligence.alignment_score,
          timingScore: intelligence.timing_score,
          strategicValueScore: intelligence.strategic_value_score,
          compositeScore: intelligence.composite_score,
          engagementReadiness: intelligence.engagement_readiness,
          responseLikelihood: intelligence.response_likelihood,
          confidenceLevel: intelligence.confidence_level
        } : undefined,
        recentInteractions: interactions.slice(0, 5).map(interaction => ({
          type: interaction.interaction_type,
          date: interaction.interaction_date,
          outcome: interaction.outcome,
          subject: interaction.subject
        }))
      }
    };
  }

  private mapEngagementPriorityToStrategicValue(priority?: string): 'high' | 'medium' | 'low' | 'unknown' {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'unknown';
    }
  }

  private calculateEngagementFrequency(engagementReadiness?: number): string {
    if (!engagementReadiness) return 'unknown';

    if (engagementReadiness >= 80) return 'weekly';
    if (engagementReadiness >= 60) return 'monthly';
    if (engagementReadiness >= 40) return 'quarterly';
    if (engagementReadiness >= 20) return 'biannual';
    return 'annual';
  }

  private mapSortField(sortBy: string): string {
    switch (sortBy) {
      case 'name':
        return 'full_name';
      case 'company':
        return 'sector'; // Using sector as proxy for company
      case 'lastInteraction':
        return 'last_interaction';
      case 'relationshipScore':
        return 'composite_score';
      default:
        return 'composite_score';
    }
  }

  private async getContactStatistics() {
    const { data, error } = await this.supabase
      .from('person_identity_map')
      .select('engagement_priority, sector, indigenous_affiliation, youth_justice_relevance_score');

    if (error) throw error;

    const totalContacts = data.length;
    const highPriorityContacts = data.filter(c => c.engagement_priority === 'high').length;
    const criticalPriorityContacts = data.filter(c => c.engagement_priority === 'critical').length;
    const indigenousContacts = data.filter(c => c.indigenous_affiliation).length;

    const sectorBreakdown: Record<string, number> = {};
    const engagementPriorityBreakdown: Record<string, number> = {};

    data.forEach(contact => {
      if (contact.sector) {
        sectorBreakdown[contact.sector] = (sectorBreakdown[contact.sector] || 0) + 1;
      }
      if (contact.engagement_priority) {
        engagementPriorityBreakdown[contact.engagement_priority] =
          (engagementPriorityBreakdown[contact.engagement_priority] || 0) + 1;
      }
    });

    const governmentContacts = sectorBreakdown['government'] || 0;
    const mediaContacts = sectorBreakdown['media'] || 0;
    const academicContacts = sectorBreakdown['academic'] || 0;

    const avgYouthJusticeScore = data
      .filter(c => c.youth_justice_relevance_score)
      .reduce((sum, c) => sum + c.youth_justice_relevance_score, 0) / totalContacts;

    return {
      totalContacts,
      highPriorityContacts,
      criticalPriorityContacts,
      indigenousContacts,
      governmentContacts,
      mediaContacts,
      academicContacts,
      avgIntelligenceScore: avgYouthJusticeScore,
      sectorBreakdown,
      engagementPriorityBreakdown
    };
  }

  private async getInteractionStatistics() {
    const { count: totalInteractions } = await this.supabase
      .from('contact_interactions')
      .select('*', { count: 'exact', head: true });

    // Get average engagement readiness from intelligence scores
    const { data: intelligenceData } = await this.supabase
      .from('contact_intelligence_scores')
      .select('engagement_readiness');

    const avgEngagementReadiness = intelligenceData && intelligenceData.length > 0
      ? intelligenceData.reduce((sum, score) => sum + score.engagement_readiness, 0) / intelligenceData.length
      : 0;

    return {
      totalInteractions: totalInteractions || 0,
      avgEngagementReadiness
    };
  }

  private async getCampaignStatistics() {
    const { count: activeCampaigns } = await this.supabase
      .from('contact_campaigns')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'planning']);

    return {
      activeCampaigns: activeCampaigns || 0
    };
  }

  private async getTaskStatistics() {
    const { count: pendingTasks } = await this.supabase
      .from('contact_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      pendingTasks: pendingTasks || 0
    };
  }
}