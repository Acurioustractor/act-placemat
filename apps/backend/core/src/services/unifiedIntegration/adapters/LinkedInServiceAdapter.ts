/**
 * LinkedIn Service Adapter
 * Connects UnifiedIntegrationService to enterprise LinkedIn contact intelligence
 * Leverages linkedin_contacts table integrated with person_identity_map
 * Supports 20,000+ contacts with comprehensive AI/ML processing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Contact, ContactFilters } from '../interfaces/IIntegrationService.js';
import { IntegrationLogger } from '../utils/Logger.js';

interface LinkedInContact {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  linkedin_url?: string;
  email_address?: string;
  current_position?: string;
  current_company?: string;
  industry?: string;
  location?: string;
  connected_on?: string;
  connection_source?: string;
  relationship_score?: number;
  strategic_value?: 'high' | 'medium' | 'low';
  alignment_tags?: string[];
  created_at: string;
  updated_at: string;
  last_analyzed_at?: string;
}

export class LinkedInServiceAdapter {
  private readonly supabase: SupabaseClient;
  private readonly logger: IntegrationLogger;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.logger = IntegrationLogger.getInstance();
  }

  async getContacts(filters: ContactFilters = {}): Promise<Contact[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'LinkedInServiceAdapter', 'getContacts');

    try {
      timedLogger.info('Fetching LinkedIn contacts', { filters });

      let query = this.supabase
        .from('linkedin_contacts')
        .select('*');

      // Apply filters
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,` +
          `current_company.ilike.%${filters.search}%,` +
          `current_position.ilike.%${filters.search}%,` +
          `email_address.ilike.%${filters.search}%`
        );
      }

      if (filters.company) {
        query = query.ilike('current_company', `%${filters.company}%`);
      }

      if (filters.strategicValue) {
        // Map unified strategic value to LinkedIn strategic_value
        query = query.eq('strategic_value', filters.strategicValue);
      }

      // Apply sorting
      if (filters.sortBy) {
        const sortColumn = this.mapSortField(filters.sortBy);
        query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });
      } else {
        // Default sort by relationship score descending
        query = query.order('relationship_score', { ascending: false });
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

      const contacts = (data || []).map(this.transformToUnifiedContact);

      timedLogger.finish(true, { contactCount: contacts.length });
      return contacts;

    } catch (error) {
      timedLogger.error('Failed to fetch LinkedIn contacts', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('linkedin_contacts')
        .select('count')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get high-value strategic contacts (leverages existing analysis)
   */
  async getHighValueContacts(limit = 50): Promise<Contact[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'LinkedInServiceAdapter', 'getHighValueContacts');

    try {
      timedLogger.info('Fetching high-value LinkedIn contacts', { limit });

      const { data, error } = await this.supabase
        .from('linkedin_contacts')
        .select('*')
        .in('strategic_value', ['high', 'medium'])
        .gte('relationship_score', 0.5)
        .order('relationship_score', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const contacts = (data || []).map(this.transformToUnifiedContact);

      timedLogger.finish(true, {
        contactCount: contacts.length,
        highValueCount: contacts.filter(c => c.strategicValue === 'high').length
      });

      return contacts;

    } catch (error) {
      timedLogger.error('Failed to fetch high-value LinkedIn contacts', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Get contacts by alignment tags (industry expertise, government, funding, etc.)
   */
  async getContactsByAlignment(alignmentTags: string[], limit = 100): Promise<Contact[]> {
    try {
      const { data, error } = await this.supabase
        .from('linkedin_contacts')
        .select('*')
        .overlaps('alignment_tags', alignmentTags)
        .order('relationship_score', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(this.transformToUnifiedContact);

    } catch (error) {
      this.logger.error('Failed to fetch contacts by alignment', error);
      throw error;
    }
  }

  /**
   * Get contact statistics for dashboard
   */
  async getContactStats(): Promise<{
    total: number;
    highValue: number;
    mediumValue: number;
    avgRelationshipScore: number;
    topCompanies: Array<{ company: string; count: number; avgScore: number }>;
    alignmentBreakdown: Record<string, number>;
  }> {
    try {
      // Get basic stats
      const { data: stats, error: statsError } = await this.supabase
        .from('linkedin_contacts')
        .select('strategic_value, relationship_score, current_company, alignment_tags')
        .not('email_address', 'is', null);

      if (statsError) throw statsError;

      const total = stats.length;
      const highValue = stats.filter(c => c.strategic_value === 'high').length;
      const mediumValue = stats.filter(c => c.strategic_value === 'medium').length;

      const relationshipScores = stats
        .map(c => parseFloat(c.relationship_score || '0'))
        .filter(score => score > 0);

      const avgRelationshipScore = relationshipScores.length > 0
        ? relationshipScores.reduce((sum, score) => sum + score, 0) / relationshipScores.length
        : 0;

      // Calculate top companies
      const companyMap = new Map<string, { count: number; scores: number[] }>();
      stats.forEach(contact => {
        if (contact.current_company) {
          const company = contact.current_company;
          if (!companyMap.has(company)) {
            companyMap.set(company, { count: 0, scores: [] });
          }
          const companyData = companyMap.get(company)!;
          companyData.count++;
          if (contact.relationship_score) {
            companyData.scores.push(parseFloat(contact.relationship_score));
          }
        }
      });

      const topCompanies = Array.from(companyMap.entries())
        .map(([company, data]) => ({
          company,
          count: data.count,
          avgScore: data.scores.length > 0
            ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
            : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate alignment breakdown
      const alignmentBreakdown: Record<string, number> = {};
      stats.forEach(contact => {
        if (contact.alignment_tags) {
          contact.alignment_tags.forEach((tag: string) => {
            alignmentBreakdown[tag] = (alignmentBreakdown[tag] || 0) + 1;
          });
        }
      });

      return {
        total,
        highValue,
        mediumValue,
        avgRelationshipScore,
        topCompanies,
        alignmentBreakdown
      };

    } catch (error) {
      this.logger.error('Failed to get LinkedIn contact stats', error);
      throw error;
    }
  }

  /**
   * Transform LinkedIn contact to unified Contact interface
   */
  private transformToUnifiedContact = (linkedinContact: LinkedInContact): Contact => {
    return {
      id: `linkedin:${linkedinContact.id}`,
      fullName: linkedinContact.full_name,
      firstName: linkedinContact.first_name,
      lastName: linkedinContact.last_name,
      emailAddress: linkedinContact.email_address || undefined,
      currentCompany: linkedinContact.current_company || undefined,
      currentPosition: linkedinContact.current_position || undefined,
      relationshipScore: linkedinContact.relationship_score || 0,
      strategicValue: linkedinContact.strategic_value || 'unknown',
      engagementFrequency: this.calculateEngagementFrequency(linkedinContact.relationship_score),
      lastInteraction: linkedinContact.updated_at,
      dataSource: 'linkedin',
      linkedinUrl: linkedinContact.linkedin_url || undefined,
      enrichmentData: {
        industry: linkedinContact.industry,
        location: linkedinContact.location,
        connectedOn: linkedinContact.connected_on,
        connectionSource: linkedinContact.connection_source,
        alignmentTags: linkedinContact.alignment_tags || [],
        lastAnalyzedAt: linkedinContact.last_analyzed_at,
        originalId: linkedinContact.id
      }
    };
  };

  /**
   * Map unified sort fields to LinkedIn table columns
   */
  private mapSortField(sortBy: string): string {
    switch (sortBy) {
      case 'name':
        return 'full_name';
      case 'company':
        return 'current_company';
      case 'lastInteraction':
        return 'updated_at';
      case 'relationshipScore':
        return 'relationship_score';
      default:
        return 'relationship_score';
    }
  }

  /**
   * Calculate engagement frequency based on relationship score
   */
  private calculateEngagementFrequency(score?: number): string {
    if (!score) return 'unknown';

    if (score >= 0.8) return 'weekly';
    if (score >= 0.6) return 'monthly';
    if (score >= 0.4) return 'quarterly';
    if (score >= 0.2) return 'biannual';
    return 'annual';
  }
}