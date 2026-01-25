/**
 * Follow-up Detector Service
 *
 * Detects items needing follow-up across multiple systems:
 * - Unanswered emails (outbound without reply)
 * - Overdue GHL opportunities (next action past due)
 * - Stale relationships (no contact in X days)
 * - Pending Notion actions past due date
 *
 * Usage:
 *   const { followupDetector } = require('./followupDetector');
 *
 *   // Detect all follow-ups
 *   const { followups, stats } = await followupDetector.detectAll();
 *
 *   // Detect urgent only
 *   const { followups } = await followupDetector.detectAll({ urgentOnly: true });
 *
 *   // Check specific contact
 *   const { followups } = await followupDetector.detectAll({ contactId: 'abc123' });
 *
 * Migrated from: act-personal-ai/services/followup-detector.mjs
 */

const { db } = require('./db.cjs');
const { entityResolver } = require('./entityResolver.cjs');
const { thresholdLearner } = require('./thresholdLearner.cjs');

// Priority multipliers for different contact types
const PRIORITY_WEIGHTS = {
  partner: 2.0,
  funder: 2.5,
  community: 1.5,
  default: 1.0,
};

class FollowupDetector {
  constructor() {
    this.followups = [];
    this.stats = {
      total: 0,
      urgent: 0,
      attention: 0,
      normal: 0,
    };
    this.thresholdCache = new Map();
  }

  /**
   * Get dynamic threshold for a segment
   * Uses learned values when available, falls back to defaults
   */
  async getDynamicThreshold(type, segment = 'default') {
    const cacheKey = `${type}:${segment}`;

    // Check cache (valid for 5 minutes)
    const cached = this.thresholdCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.value;
    }

    try {
      const threshold = await thresholdLearner.getThreshold(type, segment);
      const value = threshold?.value || this.getDefaultThreshold(type, segment);
      this.thresholdCache.set(cacheKey, { value, timestamp: Date.now() });
      return value;
    } catch (err) {
      // Fall back to defaults on error
      return this.getDefaultThreshold(type, segment);
    }
  }

  /**
   * Default thresholds (fallback if database unavailable)
   */
  getDefaultThreshold(type, segment) {
    const defaults = {
      stale_days: { default: 14, funder: 7, partner: 10, community: 30 },
      attention_days: { default: 7, funder: 5, partner: 7, community: 14 },
      normal_days: { default: 3, funder: 2, partner: 3, community: 7 },
    };
    return defaults[type]?.[segment] || defaults[type]?.default || 14;
  }

  /**
   * Calculate days since a date
   */
  daysSince(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine segment from contact tags
   */
  getContactSegment(contact) {
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
   */
  async getAlertLevel(days, segment = 'default') {
    // Get segment-specific thresholds
    const staleThreshold = await this.getDynamicThreshold('stale_days', segment);
    const attentionThreshold = await this.getDynamicThreshold('attention_days', segment);
    const normalThreshold = await this.getDynamicThreshold('normal_days', segment);

    if (days >= staleThreshold) return 'urgent';
    if (days >= attentionThreshold) return 'attention';
    if (days >= normalThreshold) return 'normal';
    return null; // Not yet due for follow-up
  }

  /**
   * Calculate priority score for a follow-up
   */
  calculatePriority(contact, days, alertLevel) {
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
    const alertBonus = {
      urgent: 50,
      attention: 20,
      normal: 0,
    };

    return Math.round((baseScore * multiplier) + (alertBonus[alertLevel] || 0));
  }

  /**
   * Detect contacts needing follow-up based on last contact date
   * Now with entity resolution for unified engagement tracking
   */
  async detectStaleRelationships() {
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

      const staleContacts = [];
      const seenEntityIds = new Set(); // Track seen entities to de-duplicate

      for (const contact of contacts || []) {
        const days = this.daysSince(contact.last_contact_date);

        // Skip if never contacted (different category)
        if (days === null) continue;

        // Determine segment for this contact
        const segment = this.getContactSegment(contact);

        // Get alert level using dynamic thresholds for this segment
        const alertLevel = await this.getAlertLevel(days, segment);
        if (!alertLevel) continue; // Not due yet

        // Resolve to canonical entity
        let entityId = null;
        let engagementScore = null;

        if (contact.email) {
          try {
            const { entity } = await entityResolver.resolveEntity(contact.email, {
              sourceSystem: 'ghl',
              sourceId: contact.ghl_id,
              firstName: contact.first_name,
              lastName: contact.last_name,
              company: contact.company_name,
              createIfMissing: true,
            });

            if (entity) {
              entityId = entity.id;

              // Skip if we've already seen this entity (de-duplication)
              if (seenEntityIds.has(entityId)) {
                continue;
              }
              seenEntityIds.add(entityId);

              // Get unified engagement score
              const strength = await entityResolver.getRelationshipStrength(entityId);
              engagementScore = strength.score;
            }
          } catch (err) {
            // Entity resolution failed, continue without it
            console.error('Entity resolution error:', err.message);
          }
        }

        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown';

        staleContacts.push({
          type: 'stale_relationship',
          contactId: contact.ghl_id,
          entityId, // canonical entity ID
          contactName: name,
          email: contact.email,
          segment, // contact segment used for threshold lookup
          days,
          alertLevel,
          priority: this.calculatePriority(contact, days, alertLevel),
          engagementScore, // unified engagement score (0-100)
          projects: contact.projects || [],
          tags: contact.tags || [],
          reason: this.generateReason(contact, days, segment),
          suggestedAction: this.suggestAction(contact, days),
        });
      }

      return staleContacts;
    } catch (err) {
      console.error('Error detecting stale relationships:', err);
      return [];
    }
  }

  /**
   * Detect GHL opportunities that need attention based on staleness
   * (using ghl_updated_at since next_action_date doesn't exist in schema)
   */
  async detectOverdueOpportunities() {
    if (!db.isConfigured().ghl) return [];

    try {
      // Get opportunities that haven't been updated recently
      const { data: opportunities, error } = await db.ghl
        .from('ghl_opportunities')
        .select('*')
        .not('status', 'ilike', '%won%')
        .not('status', 'ilike', '%lost%')
        .order('ghl_updated_at', { ascending: true });

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01') {
          return [];
        }
        console.error('Error fetching opportunities:', error);
        return [];
      }

      const staleOps = [];
      const staleThresholdDays = 14; // Opportunities not touched in 14+ days

      for (const opp of opportunities || []) {
        const lastUpdated = opp.ghl_updated_at || opp.updated_at;
        if (!lastUpdated) continue;

        const days = this.daysSince(lastUpdated);
        if (days < staleThresholdDays) continue; // Not stale yet

        const alertLevel = await this.getAlertLevel(days);

        staleOps.push({
          type: 'stale_opportunity',
          opportunityId: opp.id,
          ghlId: opp.ghl_id,
          name: opp.name || 'Unnamed Opportunity',
          contactId: opp.ghl_contact_id,
          days: days,
          alertLevel: alertLevel || 'normal',
          priority: 50 + days, // Base priority for opportunities
          value: opp.monetary_value,
          stage: opp.stage_name,
          pipeline: opp.pipeline_name,
          suggestedAction: `Follow up on stale opportunity: ${opp.name}`,
        });
      }

      return staleOps;
    } catch (err) {
      console.error('Error detecting overdue opportunities:', err);
      return [];
    }
  }

  /**
   * Detect pending Notion actions past due date
   */
  async detectOverdueActions() {
    // This would require Notion API access
    // For now, return empty - will be implemented when Notion MCP is used
    return [];
  }

  /**
   * Generate a human-readable reason for follow-up
   */
  generateReason(contact, days, segment = 'default') {
    const projects = contact.projects || [];

    // Use segment-aware messaging
    const segmentLabels = {
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
   */
  suggestAction(contact, days) {
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
   * Run all detection methods and compile results
   */
  async detectAll(options = {}) {
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
  getStructuredOutput() {
    return {
      generated: new Date().toISOString(),
      stats: this.stats,
      urgent: this.followups.filter(f => f.alertLevel === 'urgent'),
      attention: this.followups.filter(f => f.alertLevel === 'attention'),
      normal: this.followups.filter(f => f.alertLevel === 'normal'),
    };
  }

  /**
   * Get contact health score
   *
   * @param {string} contactId - GHL contact ID
   * @returns {Promise<Object>} Health score and factors
   */
  async getContactHealth(contactId) {
    if (!db.isConfigured().ghl) {
      return { score: 0, factors: {}, error: 'Database not configured' };
    }

    try {
      // Get contact
      const { data: contact, error } = await db.ghl
        .from('ghl_contacts')
        .select('*')
        .eq('ghl_id', contactId)
        .single();

      if (error || !contact) {
        return { score: 0, factors: {}, error: error?.message || 'Contact not found' };
      }

      const days = this.daysSince(contact.last_contact_date);
      const segment = this.getContactSegment(contact);
      const alertLevel = days !== null ? await this.getAlertLevel(days, segment) : null;

      // Try to get entity-based relationship strength
      let relationshipStrength = null;
      if (contact.email) {
        try {
          const { entity } = await entityResolver.resolveEntity(contact.email, {
            createIfMissing: false,
          });

          if (entity) {
            relationshipStrength = await entityResolver.getRelationshipStrength(entity.id);
          }
        } catch {
          // Continue without entity data
        }
      }

      // Calculate health score (0-100)
      let score = 100;

      // Deduct for time since contact
      if (days !== null) {
        if (days > 60) score -= 40;
        else if (days > 30) score -= 25;
        else if (days > 14) score -= 15;
        else if (days > 7) score -= 5;
      } else {
        score -= 30; // Never contacted
      }

      // Boost for engagement (if entity data available)
      if (relationshipStrength) {
        score = Math.round((score + relationshipStrength.score) / 2);
      }

      // Clamp to 0-100
      score = Math.max(0, Math.min(100, score));

      return {
        score,
        level: score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical',
        factors: {
          daysSinceContact: days,
          segment,
          alertLevel,
          projectCount: contact.projects?.length || 0,
          tags: contact.tags || [],
          engagementScore: relationshipStrength?.score || null,
        },
        contact: {
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          email: contact.email,
          company: contact.company_name,
        },
        error: null,
      };
    } catch (err) {
      return { score: 0, factors: {}, error: err.message };
    }
  }
}

// Singleton instance
const followupDetector = new FollowupDetector();

module.exports = { followupDetector, FollowupDetector, PRIORITY_WEIGHTS };
module.exports.default = followupDetector;
