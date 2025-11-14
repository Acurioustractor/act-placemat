/**
 * Gmail Service Adapter
 * Bridges UnifiedIntegrationService with Gmail-derived relationship intelligence
 * Uses gmail_contacts table that GmailIntelligenceSync keeps fresh
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Contact, ContactFilters } from '../interfaces/IIntegrationService.js';
import { IntegrationLogger } from '../utils/Logger.js';

interface GmailContactRecord {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  domain?: string;
  total_emails?: number;
  emails_sent?: number;
  emails_received?: number;
  first_interaction?: string;
  last_interaction?: string;
  interaction_frequency?: 'daily' | 'weekly' | 'monthly' | 'occasional' | 'rare';
  relationship_strength?: 'strong' | 'moderate' | 'weak';
  average_response_time_hours?: number;
  contact_type?: string;
  is_vip?: boolean;
  metadata?: Record<string, any>;
  discovered_at?: string;
  updated_at?: string;
}

export class GmailServiceAdapter {
  private readonly supabase: SupabaseClient | null;
  private readonly logger: IntegrationLogger;

  constructor() {
    this.logger = IntegrationLogger.getInstance();
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      this.supabase = null;
    }
  }

  async getContacts(filters: ContactFilters = {}): Promise<Contact[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'GmailServiceAdapter', 'getContacts');

    if (!this.supabase) {
      timedLogger.warn('Supabase credentials missing - Gmail adapter disabled');
      timedLogger.finish(false);
      throw new Error('Gmail integration not configured');
    }

    try {
      let query = this.supabase
        .from('gmail_contacts')
        .select(`
          id,
          email,
          name,
          display_name,
          domain,
          total_emails,
          emails_sent,
          emails_received,
          first_interaction,
          last_interaction,
          interaction_frequency,
          relationship_strength,
          average_response_time_hours,
          contact_type,
          is_vip,
          metadata,
          discovered_at,
          updated_at
        `);

      if (filters.search) {
        query = query.or(
          `email.ilike.%${filters.search}%,` +
          `name.ilike.%${filters.search}%,` +
          `display_name.ilike.%${filters.search}%,` +
          `domain.ilike.%${filters.search}%`
        );
      }

      if (filters.company) {
        query = query.ilike('domain', `%${filters.company}%`);
      }

      if (filters.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      if (filters.sortBy) {
        query = query.order(this.mapSortField(filters.sortBy), {
          ascending: filters.sortOrder === 'asc'
        });
      } else {
        query = query.order('last_interaction', { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      const contacts = (data || []).map(record => this.transform(record));
      timedLogger.finish(true, { contactCount: contacts.length });
      return contacts;
    } catch (error) {
      timedLogger.error('Failed to fetch Gmail contacts', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { data, error } = await this.supabase
        .from('gmail_contacts')
        .select('id')
        .limit(1);

      return !error && Array.isArray(data);
    } catch {
      return false;
    }
  }

  private transform(record: GmailContactRecord): Contact {
    const fullName = record.name || record.display_name || record.email;
    const relationshipScore = this.calculateRelationshipScore(record);

    return {
      id: record.id || record.email,
      fullName,
      emailAddress: record.email,
      currentCompany: this.deriveCompany(record),
      relationshipScore,
      strategicValue: record.is_vip ? 'high' : 'unknown',
      engagementFrequency: record.interaction_frequency,
      lastInteraction: record.last_interaction || record.updated_at,
      dataSource: 'gmail',
      enrichmentData: {
        domain: record.domain,
        totalEmails: record.total_emails,
        emailsSent: record.emails_sent,
        emailsReceived: record.emails_received,
        firstInteraction: record.first_interaction,
        responseTimeHours: record.average_response_time_hours,
        relationshipStrength: record.relationship_strength,
        contactType: record.contact_type,
        metadata: record.metadata || {}
      }
    };
  }

  private mapSortField(sortBy: NonNullable<ContactFilters['sortBy']>): string {
    switch (sortBy) {
      case 'company':
        return 'domain';
      case 'lastInteraction':
        return 'last_interaction';
      case 'relationshipScore':
        return 'relationship_strength';
      default:
        return 'name';
    }
  }

  private deriveCompany(record: GmailContactRecord): string | undefined {
    if (record.metadata && record.metadata.company) {
      return record.metadata.company;
    }

    if (record.domain) {
      return record.domain.replace(/@/g, '').replace(/\..*/, '').toUpperCase();
    }
    return undefined;
  }

  private calculateRelationshipScore(record: GmailContactRecord): number {
    let score = 30;

    if (record.relationship_strength === 'strong') score += 40;
    else if (record.relationship_strength === 'moderate') score += 25;
    else if (record.relationship_strength === 'weak') score += 10;

    const frequencyBoost = {
      daily: 25,
      weekly: 20,
      monthly: 12,
      occasional: 6,
      rare: 2
    } as const;

    if (record.interaction_frequency) {
      score += frequencyBoost[record.interaction_frequency] || 0;
    }

    if (record.average_response_time_hours && record.average_response_time_hours < 12) {
      score += 10;
    } else if (record.average_response_time_hours && record.average_response_time_hours < 24) {
      score += 6;
    }

    if (record.is_vip) {
      score += 8;
    }

    const totalEmails = (record.total_emails || 0);
    if (totalEmails > 30) score += 5;
    else if (totalEmails > 10) score += 3;

    return Math.min(100, score);
  }
}
