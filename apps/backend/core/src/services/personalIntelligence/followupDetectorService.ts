/**
 * Follow-up Detector Service
 *
 * Detects items needing follow-up across multiple systems:
 * - Unanswered emails (outbound without reply)
 * - Overdue GHL opportunities (next action past due)
 * - Stale relationships (no contact in X days)
 * - Pending Notion actions past due date
 *
 * Migrated from: act-personal-ai/services/followup-detector.mjs
 */

import { db } from './databaseHelper.js';
import { thresholdLearner } from './thresholdLearnerService.js';
import {
  ContactSegment,
  AlertLevel,
  FollowupItem,
  FollowupStats,
  FollowupDetectionResult,
  FollowupDetectionOptions,
  GHLContact,
} from './types.js';

// Priority multipliers for different contact types
const PRIORITY_WEIGHTS: Record<string, number> = {
  partner: 2.0,
  funder: 2.5,
  community: 1.5,
  default: 1.0,
};

// Threshold cache for performance
const thresholdCache = new Map<string, { value: number; timestamp: number }>();

/**
 * Get dynamic threshold for a segment
 * Uses learned values when available, falls back to defaults
 */
async function getDynamicThreshold(type: string, segment: ContactSegment = 'default'): Promise<number> {
  const cacheKey = `${type}:${segment}`;

  // Check cache (valid for 5 minutes)
  const cached = thresholdCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.value;
  }

  try {
    const threshold = await thresholdLearner.getThreshold(type as any, segment);
    const value = threshold?.value || thresholdLearner.getDefaultThreshold(type as any, segment);
    thresholdCache.set(cacheKey, { value, timestamp: Date.now() });
    return value;
  } catch {
    return thresholdLearner.getDefaultThreshold(type as any, segment);
  }
}

/**
 * Follow-up Detector Service class
 * Identifies contacts and opportunities that need follow-up
 */
export class FollowupDetectorService {
  private followups: FollowupItem[] = [];
  private stats: FollowupStats = {
    total: 0,
    urgent: 0,
    attention: 0,
    normal: 0,
  };

  /**
   * Calculate days since a date
   *
   * @param dateString - ISO date string
   * @returns Number of days since the date, or null if no date provided
   */
  daysSince(dateString: string | null): number | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine segment from contact tags
   *
   * @param contact - Contact object with tags array
   * @returns Contact segment
   */
  getContactSegment(contact: { tags?: string[] | null }): ContactSegment {
    const tags = contact.tags || [];

    if (tags.some(t => t.toLowerCase().includes('funder') || t.toLowerCase().includes('funding'))) {
      return 'funder';
    }
    if (tags.some(t => t.toLowerCase().includes('partner'))) {
      return 'partner';
    }
    if (tags.some(t => t.toLowerCase().includes('community'))) {
      return 'community';
    }
    return 'default';
  }

  /**
   * Get alert level based on days and segment
   * Uses dynamic thresholds from threshold-learner
   *
   * @param days - Days since last contact
   * @param segment - Contact segment
   * @returns Alert level or null if not due
   */
  async getAlertLevel(days: number, segment: ContactSegment = 'default'): Promise<AlertLevel | null> {
    const staleThreshold = await getDynamicThreshold('stale_days', segment);
    const attentionThreshold = await getDynamicThreshold('attention_days', segment);
    const normalThreshold = await getDynamicThreshold('normal_days', segment);

    if (days >= staleThreshold) return 'urgent';
    if (days >= attentionThreshold) return 'attention';
    if (days >= normalThreshold) return 'normal';
    return null; // Not yet due for follow-up
  }

  /**
   * Calculate priority score for a follow-up
   *
   * @param contact - Contact object with tags and projects
   * @param days - Days since last contact
   * @param alertLevel - Current alert level
   * @returns Priority score (higher = more urgent)
   */
  calculatePriority(
    contact: { tags?: string[] | null; projects?: string[] | null },
    days: number,
    alertLevel: AlertLevel
  ): number {
    let baseScore = days;

    // Apply contact type multiplier
    const tags = contact.tags || [];
    let multiplier = PRIORITY_WEIGHTS.default;

    if (tags.some(t => t.toLowerCase().includes('partner'))) {
      multiplier = PRIORITY_WEIGHTS.partner;
    } else if (tags.some(t => t.toLowerCase().includes('funder') || t.toLowerCase().includes('funding'))) {
      multiplier = PRIORITY_WEIGHTS.funder;
    } else if (tags.some(t => t.toLowerCase().includes('community'))) {
      multiplier = PRIORITY_WEIGHTS.community;
    }

    // Project involvement bonus
    const projectCount = contact.projects?.length || 0;
    if (projectCount > 0) {
      multiplier += 0.2 * projectCount;
    }

    // Alert level bonus
    const alertBonus: Record<AlertLevel, number> = {
      urgent: 50,
      attention: 20,
      normal: 0,
    };

    return Math.round((baseScore * multiplier) + (alertBonus[alertLevel] || 0));
  }

  /**
   * Generate a human-readable reason for follow-up
   *
   * @param contact - Contact object with projects
   * @param days - Days since last contact
   * @param segment - Contact segment
   * @returns Reason string
   */
  generateReason(
    contact: { projects?: string[] | null },
    days: number,
    segment: ContactSegment = 'default'
  ): string {
    const projects = contact.projects || [];

    // Use segment-aware messaging
    const segmentLabels: Record<ContactSegment, string> = {
      funder: 'Funder relationship',
      partner: 'Partnership maintenance',
      community: 'Community connection',
      default: 'Relationship nurturing',
    };

    const label = segmentLabels[segment] || segmentLabels.default;

    if (projects.length > 1) {
      return `${label} (${projects.join(', ')}) - ${days} days`;
    }
    if (projects.length === 1) {
      return `${projects[0]} ${label.toLowerCase()} - ${days} days`;
    }
    return `${label} - ${days} days since last contact`;
  }

  /**
   * Suggest an action based on contact and timing
   *
   * @param contact - Contact object with tags
   * @param days - Days since last contact
   * @returns Suggested action string
   */
  suggestAction(contact: { tags?: string[] | null }, days: number): string {
    const tags = contact.tags || [];

    if (days >= 30) {
      return 'Schedule a catch-up call to reconnect';
    }
    if (tags.some(t => t.toLowerCase().includes('funder'))) {
      return 'Send project update or progress report';
    }
    if (tags.some(t => t.toLowerCase().includes('partner'))) {
      return 'Check in on collaboration progress';
    }
    return 'Send a brief check-in email';
  }

  /**
   * Detect contacts needing follow-up based on last contact date
   *
   * @returns Promise resolving to array of stale contacts
   */
  async detectStaleRelationships(): Promise<FollowupItem[]> {
    if (!db.isConfigured().ghl) return [];

    try {
      const { data: contacts, error } = await db.ghl
        .from('ghl_contacts')
        .select('*')
        .eq('sync_status', 'synced')
        .order('last_contact_date', { ascending: true, nullsFirst: true });

      if (error) {
        console.error('Error fetching contacts:', error);
        return [];
      }

      const staleContacts: FollowupItem[] = [];
      const seenEntityIds = new Set<string>();

      for (const contact of contacts || []) {
        const days = this.daysSince(contact.last_contact_date);

        // Skip if never contacted (different category)
        if (days === null) continue;

        // Determine segment for this contact
        const segment = this.getContactSegment(contact);

        // Get alert level using dynamic thresholds for this segment
        const alertLevel = await this.getAlertLevel(days, segment);
        if (!alertLevel) continue; // Not due yet

        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown';

        staleContacts.push({
          type: 'stale_relationship',
          contactId: contact.ghl_id,
          entityId: null, // Would be populated by entity resolver
          contactName: name,
          email: contact.email,
          segment,
          days,
          alertLevel,
          priority: this.calculatePriority(contact, days, alertLevel),
          engagementScore: null, // Would be populated by relationship strength
          projects: contact.projects || [],
          tags: contact.tags || [],
          reason: this.generateReason(contact, days, segment),
          suggestedAction: this.suggestAction(contact, days),
        });
      }

      return staleContacts;
    } catch (error) {
      console.error('Error in detectStaleRelationships:', (error as Error).message);
      return [];
    }
  }

  /**
   * Detect GHL opportunities that need attention based on staleness
   *
   * @returns Promise resolving to array of stale opportunities
   */
  async detectOverdueOpportunities(): Promise<FollowupItem[]> {
    if (!db.isConfigured().ghl) return [];

    try {
      const { data: opportunities, error } = await db.ghl
        .from('ghl_opportunities')
        .select('*')
        .not('status', 'ilike', '%won%')
        .not('status', 'ilike', '%lost%')
        .order('ghl_updated_at', { ascending: true });

      if (error) {
        // Table might not exist yet
        if ((error as any).code === '42P01') {
          return [];
        }
        console.error('Error fetching opportunities:', error);
        return [];
      }

      const staleOps: FollowupItem[] = [];
      const staleThresholdDays = 14; // Opportunities not touched in 14+ days

      for (const opp of opportunities || []) {
        const lastUpdated = opp.ghl_updated_at || opp.updated_at;
        if (!lastUpdated) continue;

        const days = this.daysSince(lastUpdated);
        if (days === null || days < staleThresholdDays) continue;

        const alertLevel = await this.getAlertLevel(days, 'default');

        staleOps.push({
          type: 'stale_opportunity',
          opportunityId: opp.id,
          ghlId: opp.ghl_id,
          contactName: opp.name || 'Unnamed Opportunity',
          name: opp.name,
          contactId: opp.ghl_contact_id,
          days,
          alertLevel: alertLevel || 'normal',
          priority: 50 + days,
          value: opp.monetary_value,
          stage: opp.stage_name,
          pipeline: opp.pipeline_name,
          reason: `Opportunity not updated in ${days} days`,
          suggestedAction: `Follow up on stale opportunity: ${opp.name}`,
        });
      }

      return staleOps;
    } catch (error) {
      console.error('Error in detectOverdueOpportunities:', (error as Error).message);
      return [];
    }
  }

  /**
   * Run all detection methods and compile results
   *
   * @param options - Detection options
   * @returns Promise resolving to detection result
   */
  async detectAll(options: FollowupDetectionOptions = {}): Promise<FollowupDetectionResult> {
    const { urgentOnly = false, contactId = null } = options;

    // Run all detectors
    const [staleRelationships, overdueOpportunities] = await Promise.all([
      this.detectStaleRelationships(),
      this.detectOverdueOpportunities(),
    ]);

    // Combine all follow-ups
    this.followups = [
      ...staleRelationships,
      ...overdueOpportunities,
    ];

    // Filter by contact if specified
    if (contactId) {
      this.followups = this.followups.filter(f => f.contactId === contactId);
    }

    // Filter by urgency if specified
    if (urgentOnly) {
      this.followups = this.followups.filter(f => f.alertLevel === 'urgent');
    }

    // Sort by priority (highest first)
    this.followups.sort((a, b) => b.priority - a.priority);

    // Calculate stats
    this.stats.total = this.followups.length;
    this.stats.urgent = this.followups.filter(f => f.alertLevel === 'urgent').length;
    this.stats.attention = this.followups.filter(f => f.alertLevel === 'attention').length;
    this.stats.normal = this.followups.filter(f => f.alertLevel === 'normal').length;

    return {
      followups: this.followups,
      stats: this.stats,
    };
  }

  /**
   * Get structured data for API/integration use
   */
  getStructuredOutput(): {
    generated: string;
    stats: FollowupStats;
    urgent: FollowupItem[];
    attention: FollowupItem[];
    normal: FollowupItem[];
  } {
    return {
      generated: new Date().toISOString(),
      stats: this.stats,
      urgent: this.followups.filter(f => f.alertLevel === 'urgent'),
      attention: this.followups.filter(f => f.alertLevel === 'attention'),
      normal: this.followups.filter(f => f.alertLevel === 'normal'),
    };
  }
}

// Singleton instance
export const followupDetector = new FollowupDetectorService();

export default followupDetector;
