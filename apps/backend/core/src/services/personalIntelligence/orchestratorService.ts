/**
 * ACT Personal AI Orchestrator
 *
 * Unified entry point that coordinates all AI services intelligently.
 * The "brain" that combines mode detection, calendar, relationships,
 * RAG knowledge, and work recommendations into actionable insights.
 *
 * Migrated from: act-personal-ai/services/orchestrator.mjs
 */

import { promises as fs } from 'fs';
import { db } from './databaseHelper.js';
import { modeDetector } from './modeDetectorService.js';
import { workRecommender } from './workRecommenderService.js';
import {
  InsightFocus,
  InsightOptions,
  OrchestratorInsights,
  RelationshipAlert,
  EnrichedMeeting,
  MeetingPrepContext,
  ProjectHealth,
  CalendarEvent,
  ModeDetectionResult,
  WorkRecommendations,
  AttendeeContext,
} from './types.js';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

/**
 * Orchestrator Service class
 * Coordinates all personal intelligence services
 */
export class OrchestratorService {
  private initialized: boolean = false;
  private config: Record<string, string> | null = null;

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load Notion database config
    try {
      const configPath = '/Users/benknight/act-global-infrastructure/config/notion-database-ids.json';
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch {
      this.config = {};
    }

    this.initialized = true;
  }

  /**
   * Get unified insights - the main entry point
   *
   * @param options - Configuration options for insights
   * @returns Comprehensive insights object
   */
  async getInsights(options: InsightOptions = {}): Promise<OrchestratorInsights> {
    await this.initialize();

    const {
      focus = 'quick-check',
      query = null,
      includeKnowledge = false,
    } = options;

    const startTime = Date.now();

    // Gather all context in parallel for speed
    const [
      mode,
      workRecs,
      relationshipAlerts,
      upcomingMeetings,
      projectHealth,
      knowledgeContext,
    ] = await Promise.all([
      modeDetector.detectMode(),
      workRecommender.getRecommendations(),
      this.getRelationshipAlerts(),
      this.getUpcomingMeetings(),
      this.getProjectHealth(),
      includeKnowledge && query ? this.getKnowledgeContext(query) : Promise.resolve(null),
    ]);

    // Get predictive context from work recommender
    const predictive = workRecs.predictive || null;

    // Build unified insights based on focus
    const insights: OrchestratorInsights = {
      timestamp: new Date().toISOString(),
      focus: focus as InsightFocus,
      processingTimeMs: Date.now() - startTime,

      mode: {
        current: mode.mode,
        name: mode.modeInfo.name,
        icon: mode.modeInfo.icon,
        description: mode.modeInfo.description,
        confidence: mode.confidence,
        alternative: mode.alternative.modeInfo.name,
      },

      predictive: predictive ? {
        dayName: predictive.dayName,
        hour: predictive.hour,
        optimalType: predictive.optimalType,
        recommendation: predictive.recommendation.message,
        taskTypes: predictive.recommendation.taskTypes || [],
        avoid: predictive.recommendation.avoid || [],
        learned: workRecs.patternsLearned || false,
      } : null,

      energy: {
        phase: mode.context.moonPhase.phase,
        guidance: mode.context.moonPhase.energy,
        dayInCycle: mode.context.moonPhase.dayInCycle,
      },

      priorities: workRecs.topPriorities.slice(0, 3).map(task => ({
        title: task.title,
        reasons: task.reasons,
        modeAlignment: task.modeAlignment,
        url: task.url,
      })),

      calendar: {
        meetingsToday: workRecs.calendarContext.meetingCount,
        nextMeeting: workRecs.calendarContext.nextMeeting,
        freeBlocks: workRecs.calendarContext.freeBlocks,
        upcomingMeetings: upcomingMeetings.slice(0, 3),
      },

      relationships: {
        needingAttention: relationshipAlerts.length,
        alerts: relationshipAlerts.slice(0, 3),
      },

      projects: {
        healthy: projectHealth.filter(p => p.health === 'Healthy').length,
        needsAttention: projectHealth.filter(p => p.health !== 'Healthy').length,
        issues: projectHealth.filter(p => p.health !== 'Healthy'),
      },

      suggestion: this.generateSuggestion(focus as InsightFocus, mode, workRecs, relationshipAlerts, upcomingMeetings),

      knowledge: knowledgeContext ? {
        query,
        context: knowledgeContext.context,
        sources: knowledgeContext.stats?.sourceTypes || [],
      } : null,
    };

    // Add focus-specific enhancements
    if (focus === 'morning-brief') {
      insights.morningBrief = this.generateMorningBrief(insights);
    } else if (focus === 'meeting-prep') {
      insights.meetingPrep = await this.generateMeetingPrep(upcomingMeetings[0]);
    }

    return insights;
  }

  /**
   * Get relationship alerts (contacts needing attention)
   * Enhanced to use actual contact_communications history
   */
  async getRelationshipAlerts(daysThreshold: number = 25): Promise<RelationshipAlert[]> {
    if (!db.isConfigured().ghl) return [];

    try {
      // Get all synced GHL contacts
      const { data: contacts } = await db.ghl
        .from('ghl_contacts')
        .select('id, first_name, last_name, email, company_name, tags')
        .eq('sync_status', 'synced')
        .not('email', 'is', null);

      if (!contacts?.length) return [];

      // Get actual communication history from main database
      const contactIds = contacts.map((c: any) => c.id);
      const emails = contacts.map((c: any) => c.email?.toLowerCase()).filter(Boolean);

      // Query by GHL contact ID (for linked communications)
      const { data: linkedComms } = await db.main
        .from('contact_communications')
        .select('ghl_contact_id, occurred_at, direction, subject, summary')
        .in('ghl_contact_id', contactIds)
        .order('occurred_at', { ascending: false });

      // Query by email (for unlinked communications)
      const { data: emailComms } = await db.main
        .from('contact_communications')
        .select('ghl_contact_id, occurred_at, direction, subject, summary')
        .in('ghl_contact_id', emails)
        .order('occurred_at', { ascending: false });

      // Build communication map by contact ID
      const commsByContact = new Map<string, any[]>();

      // Process linked communications first
      for (const comm of linkedComms || []) {
        if (!commsByContact.has(comm.ghl_contact_id)) {
          commsByContact.set(comm.ghl_contact_id, []);
        }
        commsByContact.get(comm.ghl_contact_id)!.push(comm);
      }

      // Process email-based communications
      for (const comm of emailComms || []) {
        const email = comm.ghl_contact_id?.toLowerCase();
        const contact = contacts.find((c: any) => c.email?.toLowerCase() === email);
        if (contact && !commsByContact.has(contact.id)) {
          commsByContact.set(contact.id, []);
        }
        if (contact) {
          commsByContact.get(contact.id)!.push(comm);
        }
      }

      // Priority multipliers based on tags
      const getPriority = (tags: string[] | null): number => {
        if (!tags || !Array.isArray(tags)) return 1;
        const tagList = tags.map(t => t.toLowerCase());
        if (tagList.some(t => t.includes('funder') || t.includes('investor'))) return 2.5;
        if (tagList.some(t => t.includes('partner') || t.includes('strategic'))) return 2.0;
        if (tagList.some(t => t.includes('client') || t.includes('customer'))) return 1.5;
        if (tagList.some(t => t.includes('mentor') || t.includes('advisor'))) return 1.5;
        return 1;
      };

      // Calculate alerts for each contact
      const now = new Date();
      const alerts: RelationshipAlert[] = [];

      for (const contact of contacts) {
        const comms = commsByContact.get(contact.id) || [];
        const lastComm = comms[0];

        const daysSince = lastComm
          ? Math.floor((now.getTime() - new Date(lastComm.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const priority = getPriority(contact.tags);
        const adjustedThreshold = Math.round(daysThreshold / priority);

        // Alert if no contact ever or past threshold
        if (daysSince === null || daysSince > adjustedThreshold) {
          alerts.push({
            name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email,
            email: contact.email,
            company: contact.company_name,
            daysSinceContact: daysSince,
            lastContact: lastComm?.occurred_at,
            lastSubject: lastComm?.subject || lastComm?.summary,
            lastDirection: lastComm?.direction,
            priority: priority > 1.5 ? 'HIGH' : priority > 1 ? 'MEDIUM' : 'NORMAL',
            action: daysSince === null
              ? 'Introduce yourself - no email history'
              : `Reconnect - last discussed: ${(lastComm?.subject || lastComm?.summary || 'unknown topic').slice(0, 50)}`,
            commCount: comms.length,
          });
        }
      }

      // Sort by priority (HIGH first), then by days since contact
      alerts.sort((a, b) => {
        const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, NORMAL: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        const aDays = a.daysSinceContact ?? 999;
        const bDays = b.daysSinceContact ?? 999;
        return bDays - aDays;
      });

      return alerts.slice(0, 15);
    } catch (error) {
      console.error('Error getting relationship alerts:', (error as Error).message);
      return [];
    }
  }

  /**
   * Get upcoming meetings with attendee context
   */
  async getUpcomingMeetings(hoursAhead: number = 24): Promise<EnrichedMeeting[]> {
    if (!db.isConfigured().main) return [];

    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      const { data: events } = await db.main
        .from('calendar_events')
        .select('*')
        .gte('start_time', now.toISOString())
        .lte('start_time', endTime.toISOString())
        .eq('event_type', 'meeting')
        .order('start_time', { ascending: true })
        .limit(5);

      // Enrich with contact info if available
      const enriched: EnrichedMeeting[] = [];
      for (const event of events || []) {
        const meeting: EnrichedMeeting = {
          title: event.title,
          startTime: event.start_time,
          endTime: event.end_time,
          attendees: event.attendees || [],
          location: event.location,
          description: event.description,
        };

        // Check if any attendees need relationship attention
        if (meeting.attendees.length > 0 && db.isConfigured().ghl) {
          const emails = meeting.attendees.map((a: any) => a.email).filter(Boolean);
          if (emails.length) {
            const { data: contacts } = await db.ghl
              .from('ghl_contacts')
              .select('email, first_name, last_name, last_contact_date, projects')
              .in('email', emails);

            meeting.attendeeContext = (contacts || []).map((c: any) => ({
              name: `${c.first_name} ${c.last_name}`.trim(),
              email: c.email,
              daysSinceContact: c.last_contact_date
                ? Math.floor((new Date().getTime() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
                : null,
              projects: c.projects || [],
            }));
          }
        }

        enriched.push(meeting);
      }

      return enriched;
    } catch {
      return [];
    }
  }

  /**
   * Get project health summary
   */
  async getProjectHealth(): Promise<ProjectHealth[]> {
    if (!NOTION_TOKEN || !this.config?.actProjects) return [];

    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${this.config.actProjects}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION,
        },
        body: JSON.stringify({ page_size: 10 }),
      });

      const data = await response.json();

      return (data.results || []).map((page: any) => {
        const props = page.properties;
        return {
          name: props['Project Name']?.title?.[0]?.plain_text || 'Unknown',
          health: props['Health Status']?.select?.name || 'Unknown',
          status: props.Status?.status?.name || 'Unknown',
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get knowledge context via RAG (placeholder)
   */
  private async getKnowledgeContext(query: string): Promise<{ context: string; stats?: { sourceTypes: string[] } } | null> {
    // TODO: Implement RAG retrieval integration
    // This would connect to the knowledge_chunks table and perform semantic search
    return null;
  }

  /**
   * Generate contextual suggestion based on all inputs
   */
  private generateSuggestion(
    focus: InsightFocus,
    mode: ModeDetectionResult,
    workRecs: WorkRecommendations,
    relationshipAlerts: RelationshipAlert[],
    upcomingMeetings: EnrichedMeeting[]
  ): string {
    const suggestions: string[] = [];

    // Mode-based suggestion
    suggestions.push(`${mode.modeInfo.icon} ${mode.modeInfo.name} mode: ${mode.modeInfo.description}`);

    // Top priority
    if (workRecs.topPriorities.length > 0) {
      const top = workRecs.topPriorities[0];
      suggestions.push(`Top priority: "${top.title}" - ${top.reasons.join(', ')}`);
    }

    // Meeting prep alert
    if (upcomingMeetings.length > 0) {
      const next = upcomingMeetings[0];
      const startTime = new Date(next.startTime);
      const minutesUntil = Math.round((startTime.getTime() - new Date().getTime()) / (1000 * 60));

      if (minutesUntil <= 60) {
        suggestions.push(`Meeting in ${minutesUntil} min: "${next.title}"`);

        const needsAttention = (next.attendeeContext || []).filter((a: AttendeeContext) =>
          a.daysSinceContact !== null && a.daysSinceContact > 25
        );
        if (needsAttention.length > 0) {
          suggestions.push(`Note: ${needsAttention[0].name} - ${needsAttention[0].daysSinceContact} days since last contact`);
        }
      }
    }

    // Relationship alert
    if (relationshipAlerts.length > 0 && focus !== 'meeting-prep') {
      const top = relationshipAlerts[0];
      const daysText = top.daysSinceContact === null ? 'never contacted' : `${top.daysSinceContact} days`;
      const priorityNote = top.priority === 'HIGH' ? ' (important)' : '';
      suggestions.push(`Relationship check: ${top.name} (${daysText})${priorityNote}`);
    }

    // Energy guidance
    suggestions.push(`Energy: ${mode.context.moonPhase.energy}`);

    return suggestions.join('\n');
  }

  /**
   * Generate formatted morning brief
   */
  private generateMorningBrief(insights: OrchestratorInsights): string {
    const lines: string[] = [];
    const date = new Date().toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    lines.push(`# Morning Brief - ${date}`);
    lines.push('');

    // Predictive time context
    if (insights.predictive) {
      const pred = insights.predictive;
      const learnedTag = pred.learned ? 'Personalized' : 'Default patterns';
      lines.push(`## Time Optimization (${learnedTag})`);
      lines.push(pred.recommendation);
      if (pred.taskTypes?.length > 0) {
        lines.push(`Good for: ${pred.taskTypes.slice(0, 4).join(', ')}`);
      }
      if (pred.avoid?.length > 0) {
        lines.push(`Avoid: ${pred.avoid.join(', ')}`);
      }
      lines.push('');
    }

    // Moon phase and energy
    lines.push(`## ${insights.energy.phase} (Day ${insights.energy.dayInCycle}/29)`);
    lines.push(insights.energy.guidance);
    lines.push('');

    // Mode
    lines.push(`## ${insights.mode.icon} Current Mode: ${insights.mode.name}`);
    lines.push(insights.mode.description);
    lines.push('');

    // Top 3 Priorities
    lines.push('## Top 3 Priorities');
    if (insights.priorities.length === 0) {
      lines.push('No in-progress issues. Check backlog for new work.');
    } else {
      insights.priorities.forEach((p, i) => {
        lines.push(`${i + 1}. **${p.title}**`);
        if (p.reasons.length) {
          lines.push(`   ${p.reasons.join(', ')}`);
        }
      });
    }
    lines.push('');

    // Calendar
    lines.push('## Calendar');
    if (insights.calendar.meetingsToday === 0) {
      lines.push('No meetings scheduled - good day for deep work');
    } else {
      lines.push(`${insights.calendar.meetingsToday} meeting(s) today`);
      if (insights.calendar.nextMeeting) {
        const time = new Date(insights.calendar.nextMeeting.start_time).toLocaleTimeString('en-AU', {
          hour: '2-digit',
          minute: '2-digit',
        });
        lines.push(`Next: ${insights.calendar.nextMeeting.title} at ${time}`);
      }
    }

    if (insights.calendar.freeBlocks?.length) {
      const longest = insights.calendar.freeBlocks[0];
      lines.push(`Longest free block: ${longest.duration}h (${longest.start}:00-${longest.end}:00)`);
    }
    lines.push('');

    // Relationship check
    lines.push('## Relationship Check');
    if (insights.relationships.needingAttention === 0) {
      lines.push('All contacts recently engaged!');
    } else {
      lines.push(`${insights.relationships.needingAttention} contact(s) need attention:`);
      insights.relationships.alerts.forEach(r => {
        const priorityIcon = r.priority === 'HIGH' ? '[!]' : r.priority === 'MEDIUM' ? '[~]' : '[ ]';
        const daysText = r.daysSinceContact === null ? 'never contacted' : `${r.daysSinceContact} days`;
        const companyText = r.company ? ` (${r.company})` : '';
        lines.push(`${priorityIcon} **${r.name}**${companyText} - ${daysText}`);
        if (r.action) {
          lines.push(`   -> ${r.action}`);
        }
      });
    }
    lines.push('');

    // Project health
    if (insights.projects.needsAttention > 0) {
      lines.push('## Projects Needing Attention');
      insights.projects.issues.forEach(p => {
        lines.push(`- ${p.name}: ${p.health}`);
      });
      lines.push('');
    }

    // Suggestion
    lines.push('## Suggestion');
    lines.push(insights.suggestion.split('\n')[1] || 'Focus on your top priority.');

    return lines.join('\n');
  }

  /**
   * Generate meeting prep context
   */
  async generateMeetingPrep(meeting: EnrichedMeeting | undefined): Promise<MeetingPrepContext | null> {
    if (!meeting) return null;

    const prep: MeetingPrepContext = {
      title: meeting.title,
      time: new Date(meeting.startTime).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      attendees: meeting.attendees,
      context: [],
    };

    // Add attendee relationship context
    if (meeting.attendeeContext?.length) {
      for (const attendee of meeting.attendeeContext) {
        const context: AttendeeContext = {
          name: attendee.name,
          email: attendee.email,
          projects: attendee.projects,
          daysSinceContact: attendee.daysSinceContact,
        };

        // Get recent communications if available
        if (db.isConfigured().ghl && attendee.email) {
          try {
            const { data: contacts } = await db.ghl
              .from('ghl_contacts')
              .select('ghl_id')
              .eq('email', attendee.email)
              .single();

            if (contacts?.ghl_id) {
              const { data: comms } = await db.ghl
                .from('contact_communications')
                .select('comm_type, subject, summary, occurred_at')
                .eq('ghl_contact_id', contacts.ghl_id)
                .order('occurred_at', { ascending: false })
                .limit(3);

              context.recentComms = (comms || []).map((c: any) => ({
                type: c.comm_type,
                subject: c.subject || c.summary,
                date: new Date(c.occurred_at).toLocaleDateString(),
              }));
            }
          } catch {
            // Skip if error
          }
        }

        prep.context.push(context);
      }
    }

    return prep;
  }

  /**
   * Format insights for display
   */
  formatInsights(insights: OrchestratorInsights): string {
    if (insights.morningBrief) {
      return insights.morningBrief;
    }

    const lines: string[] = [];

    lines.push('-----------------------------------------------------------');
    lines.push(`${insights.mode.icon} ACT Insights - ${insights.mode.name}`);
    lines.push('-----------------------------------------------------------');
    lines.push('');

    lines.push(insights.suggestion);
    lines.push('');

    lines.push(`Meetings: ${insights.calendar.meetingsToday} | Relationships: ${insights.relationships.needingAttention} need attention | Projects: ${insights.projects.healthy}/${insights.projects.healthy + insights.projects.needsAttention} healthy`);
    lines.push('');

    lines.push(`Generated in ${insights.processingTimeMs}ms`);

    return lines.join('\n');
  }
}

// Singleton instance
export const orchestrator = new OrchestratorService();

export default orchestrator;
