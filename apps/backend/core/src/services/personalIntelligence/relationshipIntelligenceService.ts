/**
 * Relationship Intelligence Service
 *
 * Tracks and learns from every interaction to build compounding understanding
 * of relationships. Connects emails, meetings, pipeline stages, and outcomes.
 *
 * The Learning Loop:
 *   1. OBSERVE - Track all touchpoints (emails, meetings, calls)
 *   2. LEARN - Extract patterns and relationship signals
 *   3. RECOMMEND - Suggest next best actions
 *   4. MEASURE - Track outcomes to improve recommendations
 *
 * Migrated from: act-personal-ai/services/relationship-intelligence.mjs
 */

import { db } from './databaseHelper.js';
import {
  RelationshipStage,
  RelationshipSignal,
  SignalType,
  SignalPriority,
  Touchpoint,
  TouchpointStats,
  ContactProfile,
  NextAction,
} from './types.js';

/**
 * Relationship Intelligence Service class
 * Calculates relationship health and detects relationship signals
 */
export class RelationshipIntelligenceService {
  /**
   * Calculate relationship health score (0-100)
   * Based on recency, frequency, reciprocity, and depth
   *
   * @param touchpoints - Array of touchpoint objects sorted by date (most recent first)
   * @returns Health score from 0 to 100
   */
  calculateHealthScore(touchpoints: Touchpoint[] | null): number {
    if (!touchpoints || touchpoints.length === 0) return 0;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Recency (0-25): How recent was last contact?
    const lastContact = new Date(touchpoints[0].occurred_at).getTime();
    const daysSince = (now - lastContact) / dayMs;
    const recencyScore = daysSince <= 7 ? 25 :
                         daysSince <= 30 ? 20 :
                         daysSince <= 90 ? 15 :
                         daysSince <= 180 ? 10 : 5;

    // Frequency (0-25): How often do we communicate?
    const thirtyDaysAgo = now - (30 * dayMs);
    const recentCount = touchpoints.filter(t =>
      new Date(t.occurred_at).getTime() > thirtyDaysAgo
    ).length;
    const frequencyScore = Math.min(25, recentCount * 5);

    // Reciprocity (0-25): Is communication two-way?
    const inbound = touchpoints.filter(t => t.direction === 'inbound').length;
    const outbound = touchpoints.filter(t => t.direction === 'outbound').length;
    const total = inbound + outbound;
    const ratio = total > 0 ? Math.min(inbound, outbound) / Math.max(inbound, outbound) : 0;
    const reciprocityScore = Math.round(ratio * 25);

    // Depth (0-25): Length of relationship
    const oldestContact = new Date(touchpoints[touchpoints.length - 1].occurred_at).getTime();
    const relationshipDays = (now - oldestContact) / dayMs;
    const depthScore = relationshipDays > 365 ? 25 :
                       relationshipDays > 180 ? 20 :
                       relationshipDays > 90 ? 15 :
                       relationshipDays > 30 ? 10 : 5;

    return recencyScore + frequencyScore + reciprocityScore + depthScore;
  }

  /**
   * Determine relationship stage based on score and touchpoint count
   *
   * @param score - Health score
   * @param touchpoints - Array of touchpoints
   * @returns Relationship stage
   */
  determineStage(score: number, touchpoints: any[] | null): RelationshipStage {
    const total = touchpoints?.length || 0;

    if (score >= 70 && total >= 10) return 'Strong Partner';
    if (score >= 50 && total >= 5) return 'Active Relationship';
    if (score >= 30 && total >= 2) return 'Developing';
    if (total >= 1) return 'New Connection';
    return 'Prospect';
  }

  /**
   * Detect relationship signals from recent activity
   *
   * @param touchpoints - Array of touchpoint objects sorted by date (most recent first)
   * @returns Array of detected signals
   */
  detectSignals(touchpoints: Touchpoint[] | null): RelationshipSignal[] {
    if (!touchpoints || touchpoints.length === 0) return [];

    const signals: RelationshipSignal[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Check for response patterns
    const recentInbound = touchpoints.filter(t =>
      t.direction === 'inbound' &&
      (now - new Date(t.occurred_at).getTime()) < (7 * dayMs)
    );

    if (recentInbound.length > 0) {
      signals.push({
        type: 'engagement',
        message: `${recentInbound.length} inbound messages this week`,
        priority: 'high'
      });
    }

    // Check for gaps (potential drift)
    const lastContact = new Date(touchpoints[0].occurred_at).getTime();
    const daysSince = (now - lastContact) / dayMs;

    if (daysSince > 60) {
      signals.push({
        type: 'drift',
        message: `No contact in ${Math.round(daysSince)} days`,
        priority: 'medium'
      });
    }

    // Check for one-way communication
    const recent30 = touchpoints.filter(t =>
      (now - new Date(t.occurred_at).getTime()) < (30 * dayMs)
    );
    const recentIn = recent30.filter(t => t.direction === 'inbound').length;
    const recentOut = recent30.filter(t => t.direction === 'outbound').length;

    if (recentOut > 3 && recentIn === 0) {
      signals.push({
        type: 'no-response',
        message: 'Multiple outreach with no response',
        priority: 'low'
      });
    }

    return signals;
  }

  /**
   * Get contact profile with full relationship context
   *
   * @param email - Contact email address
   * @returns Promise resolving to contact profile
   */
  async getContactProfile(email: string): Promise<ContactProfile> {
    // Get from review decisions
    const { data: reviewData } = await db.main
      .from('contact_review_decisions')
      .select('*')
      .ilike('email', email)
      .single();

    // Get communications
    const { data: comms } = await db.main
      .from('contact_communications')
      .select('*')
      .or(`metadata->>from.ilike.%${email}%,metadata->>to.ilike.%${email}%`)
      .order('occurred_at', { ascending: false })
      .limit(100);

    // Get from GHL
    let ghlContact = null;
    if (db.isConfigured().ghl) {
      const { data } = await db.ghl
        .from('ghl_contacts')
        .select('*')
        .ilike('email', email)
        .single();
      ghlContact = data;
    }

    // Map communications to touchpoints
    const touchpoints: Touchpoint[] = (comms || []).map(c => ({
      occurred_at: c.occurred_at,
      direction: c.direction as 'inbound' | 'outbound',
      subject: c.subject,
      summary: c.summary,
      comm_type: c.comm_type,
    }));

    // Calculate metrics
    const healthScore = this.calculateHealthScore(touchpoints);
    const stage = this.determineStage(healthScore, touchpoints);
    const signals = this.detectSignals(touchpoints);

    return {
      email,
      name: reviewData?.name || ghlContact?.full_name || email.split('@')[0],
      tags: reviewData?.approved_tags || ghlContact?.tags || [],
      inGhl: !!ghlContact,
      ghlId: ghlContact?.ghl_id,
      healthScore,
      stage,
      signals,
      touchpoints: {
        total: touchpoints.length,
        inbound: touchpoints.filter(t => t.direction === 'inbound').length,
        outbound: touchpoints.filter(t => t.direction === 'outbound').length,
        lastContact: touchpoints[0]?.occurred_at || null,
        firstContact: touchpoints[touchpoints.length - 1]?.occurred_at || null,
      },
      recentSubjects: touchpoints.slice(0, 5).map(t => t.subject).filter(Boolean) as string[],
    };
  }

  /**
   * Get all approved contacts with relationship health
   *
   * @returns Promise resolving to array of contact profiles
   */
  async getRelationshipHealth(): Promise<ContactProfile[]> {
    if (!db.isConfigured().main) return [];

    try {
      const { data: approved } = await db.main
        .from('contact_review_decisions')
        .select('email, name, approved_tags')
        .eq('decision', 'approve');

      if (!approved || approved.length === 0) {
        return [];
      }

      const profiles: ContactProfile[] = [];
      for (const contact of approved) {
        const profile = await this.getContactProfile(contact.email);
        profiles.push(profile);
      }

      // Sort by health score
      profiles.sort((a, b) => b.healthScore - a.healthScore);

      return profiles;
    } catch (error) {
      console.error('Error getting relationship health:', (error as Error).message);
      return [];
    }
  }

  /**
   * Suggest next actions based on relationship analysis
   *
   * @returns Promise resolving to array of suggested actions
   */
  async suggestNextActions(): Promise<NextAction[]> {
    const { data: approved } = await db.main
      .from('contact_review_decisions')
      .select('email, name, approved_tags')
      .eq('decision', 'approve');

    const actions: NextAction[] = [];

    for (const contact of approved || []) {
      const profile = await this.getContactProfile(contact.email);

      // New connections need follow-up
      if (profile.stage === 'New Connection' && profile.touchpoints.outbound === 0) {
        actions.push({
          priority: 1,
          type: 'reach-out',
          contact: profile.name || profile.email,
          reason: 'New connection - initiate relationship',
          tags: profile.tags,
        });
      }

      // Drift detection
      const daysSince = profile.touchpoints.lastContact
        ? (Date.now() - new Date(profile.touchpoints.lastContact).getTime()) / (24 * 60 * 60 * 1000)
        : 999;

      if (daysSince > 45 && profile.stage !== 'Prospect') {
        actions.push({
          priority: 2,
          type: 'reconnect',
          contact: profile.name || profile.email,
          reason: `${Math.round(daysSince)} days since last contact`,
          tags: profile.tags,
        });
      }

      // Engagement opportunity
      for (const signal of profile.signals) {
        if (signal.type === 'engagement' && signal.priority === 'high') {
          actions.push({
            priority: 0,
            type: 'respond',
            contact: profile.name || profile.email,
            reason: signal.message,
            tags: profile.tags,
          });
        }
      }
    }

    // Sort by priority
    actions.sort((a, b) => a.priority - b.priority);

    return actions;
  }

  /**
   * Group contacts by relationship stage
   *
   * @param profiles - Array of contact profiles
   * @returns Object with contacts grouped by stage
   */
  groupByStage(profiles: ContactProfile[]): Record<RelationshipStage, ContactProfile[]> {
    const byStage: Record<RelationshipStage, ContactProfile[]> = {
      'Strong Partner': [],
      'Active Relationship': [],
      'Developing': [],
      'New Connection': [],
      'Prospect': [],
    };

    for (const p of profiles) {
      byStage[p.stage]?.push(p);
    }

    return byStage;
  }
}

// Singleton instance
export const relationshipIntelligence = new RelationshipIntelligenceService();

export default relationshipIntelligence;
