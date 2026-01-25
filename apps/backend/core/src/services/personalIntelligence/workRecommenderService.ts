/**
 * Work Recommender Service
 *
 * Analyzes multiple context sources to recommend optimal work priorities.
 * Combines mode detection, calendar, relationships, and sprint data.
 *
 * Enhanced with predictive capabilities:
 * - Time-of-day patterns (when tasks actually get done)
 * - Day-of-week patterns (admin vs deep work days)
 * - Task completion velocity tracking
 * - Personal energy pattern learning
 *
 * Migrated from: act-personal-ai/services/work-recommender.mjs
 */

import { promises as fs } from 'fs';
import { db } from './databaseHelper.js';
import { modeDetector, MODES } from './modeDetectorService.js';
import {
  DayPattern,
  HourPattern,
  WorkPatterns,
  PredictiveContext,
  TimeBasedRecommendation,
  CalendarContext,
  CalendarEvent,
  FreeBlock,
  Issue,
  ScoredTask,
  StaleContact,
  ProjectHealth,
  WorkRecommendations,
  PatternAnalysisResult,
  ModeDetectionResult,
  DatabaseConfiguration,
  WorkModeKey,
} from './types.js';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

/**
 * Default day patterns - learned from typical knowledge worker patterns
 * Will be enhanced with actual usage data over time
 */
export const DEFAULT_DAY_PATTERNS: Record<number, DayPattern> = {
  0: { type: 'REST', energy: 'low', focus: ['rest', 'planning'] },      // Sunday
  1: { type: 'ADMIN', energy: 'medium', focus: ['meetings', 'planning', 'email'] }, // Monday
  2: { type: 'DEEP_WORK', energy: 'high', focus: ['coding', 'writing', 'strategy'] }, // Tuesday
  3: { type: 'DEEP_WORK', energy: 'high', focus: ['coding', 'writing', 'strategy'] }, // Wednesday
  4: { type: 'CONNECT', energy: 'medium', focus: ['meetings', 'collaboration'] }, // Thursday
  5: { type: 'CREATE', energy: 'medium', focus: ['review', 'documentation', 'wrap-up'] }, // Friday
  6: { type: 'REST', energy: 'low', focus: ['personal', 'creative'] },   // Saturday
};

/**
 * Default hour patterns - optimal task types by time of day
 */
export const DEFAULT_HOUR_PATTERNS: Record<string, HourPattern> = {
  morning: { hours: [6, 7, 8, 9, 10, 11], type: 'DEEP_WORK', energy: 'high' },
  midday: { hours: [12, 13], type: 'ADMIN', energy: 'medium' },
  afternoon: { hours: [14, 15, 16, 17], type: 'CONNECT', energy: 'medium' },
  evening: { hours: [18, 19, 20, 21], type: 'CREATE', energy: 'low' },
};

/**
 * Work Recommender Service class
 */
export class WorkRecommenderService {
  private dbConfigured: DatabaseConfiguration = { main: false, ghl: false };
  private patterns: WorkPatterns | null = null;
  private completionHistory: Array<{
    taskType: string;
    dayOfWeek: number;
    hour: number;
    timestamp: string;
  }> = [];
  private notionConfig: Record<string, string> | null = null;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.dbConfigured = db.isConfigured();
    await this.loadPatterns();
    await this.loadNotionConfig();
  }

  /**
   * Load Notion database configuration
   */
  private async loadNotionConfig(): Promise<void> {
    try {
      const configPath = process.env.NOTION_CONFIG_PATH ||
        '/Users/benknight/act-global-infrastructure/config/notion-database-ids.json';
      const configData = await fs.readFile(configPath, 'utf8');
      this.notionConfig = JSON.parse(configData);
    } catch {
      this.notionConfig = {};
    }
  }

  /**
   * Load learned patterns from storage
   */
  private async loadPatterns(): Promise<void> {
    if (!this.dbConfigured.main) {
      this.patterns = {
        day: DEFAULT_DAY_PATTERNS,
        hour: DEFAULT_HOUR_PATTERNS,
        taskTypes: {},
        learned: false,
      };
      return;
    }

    try {
      const { data } = await db.main
        .from('sync_state')
        .select('state')
        .eq('sync_type', 'work_patterns')
        .single();

      if (data?.state) {
        this.patterns = data.state as WorkPatterns;
        this.patterns.learned = true;
      } else {
        this.patterns = {
          day: DEFAULT_DAY_PATTERNS,
          hour: DEFAULT_HOUR_PATTERNS,
          taskTypes: {},
          learned: false,
        };
      }
    } catch {
      this.patterns = {
        day: DEFAULT_DAY_PATTERNS,
        hour: DEFAULT_HOUR_PATTERNS,
        taskTypes: {},
        learned: false,
      };
    }
  }

  /**
   * Save learned patterns to storage
   */
  async savePatterns(): Promise<void> {
    if (!this.dbConfigured.main || !this.patterns) return;

    try {
      await db.main
        .from('sync_state')
        .upsert({
          sync_type: 'work_patterns',
          state: this.patterns,
          last_sync: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Failed to save patterns:', (err as Error).message);
    }
  }

  /**
   * Get predictive context based on current time
   *
   * @returns Predictive context including day/hour patterns and recommendations
   */
  getPredictiveContext(): PredictiveContext {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // Get day pattern
    const dayPattern = this.patterns?.day?.[dayOfWeek] || DEFAULT_DAY_PATTERNS[dayOfWeek];

    // Get hour pattern
    let hourPattern: HourPattern & { period?: string } = { ...DEFAULT_HOUR_PATTERNS.morning };
    for (const [period, pattern] of Object.entries(DEFAULT_HOUR_PATTERNS)) {
      if (pattern.hours.includes(hour)) {
        hourPattern = { ...pattern, period };
        break;
      }
    }

    // Calculate optimal task type
    const optimalType = dayPattern.energy === 'high' && hourPattern.energy === 'high'
      ? 'DEEP_WORK'
      : dayPattern.energy === 'low' || hourPattern.energy === 'low'
        ? 'REST'
        : dayPattern.type;

    return {
      dayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      hour,
      dayPattern,
      hourPattern,
      optimalType,
      recommendation: this.getTimeBasedRecommendation(dayPattern, hourPattern, hour),
    };
  }

  /**
   * Generate time-based recommendation
   */
  private getTimeBasedRecommendation(
    dayPattern: DayPattern,
    hourPattern: HourPattern,
    hour: number
  ): TimeBasedRecommendation {
    // Morning deep work optimization
    if (hour >= 8 && hour <= 11 && dayPattern.energy !== 'low') {
      return {
        message: 'Peak focus time - tackle your hardest task now',
        taskTypes: ['coding', 'writing', 'strategy', 'complex-problem'],
        avoid: ['email', 'meetings', 'admin'],
      };
    }

    // Post-lunch slump
    if (hour >= 13 && hour <= 14) {
      return {
        message: 'Energy dip - good for lighter tasks',
        taskTypes: ['email', 'documentation', 'simple-fixes'],
        avoid: ['complex-coding', 'important-decisions'],
      };
    }

    // Late afternoon collaboration
    if (hour >= 15 && hour <= 17) {
      return {
        message: 'Social energy peak - connect with others',
        taskTypes: ['meetings', 'code-review', 'collaboration', 'feedback'],
        avoid: ['deep-focus-work'],
      };
    }

    // End of day wrap-up
    if (hour >= 17 && hour <= 18) {
      return {
        message: 'Wrap-up time - close loops and plan tomorrow',
        taskTypes: ['documentation', 'commit-changes', 'daily-capture'],
        avoid: ['starting-new-features'],
      };
    }

    // Default based on day type
    return {
      message: `${dayPattern.type} day - focus on ${dayPattern.focus.join(', ')}`,
      taskTypes: dayPattern.focus,
      avoid: [],
    };
  }

  /**
   * Analyze completion patterns from Daily Work Log
   *
   * @returns Analysis result with learned patterns
   */
  async analyzePatterns(): Promise<PatternAnalysisResult> {
    if (!NOTION_TOKEN) {
      return { error: 'Notion not configured', patterns: this.patterns! };
    }

    try {
      const dbId = this.notionConfig?.dailyWorkLog;

      if (!dbId) {
        return { error: 'Daily Work Log not configured', patterns: this.patterns! };
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION,
        },
        body: JSON.stringify({
          filter: {
            property: 'Date',
            date: { on_or_after: thirtyDaysAgo.toISOString().split('T')[0] },
          },
          page_size: 30,
        }),
      });

      const data = await response.json();
      const entries = data.results || [];

      // Analyze patterns
      const dayStats: Record<number, Array<{ type: string; energy: string }>> = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
      };
      const taskTypeCounts: Record<string, number> = {};

      for (const entry of entries) {
        const props = entry.properties;
        const dateStr = props.Date?.date?.start;
        if (!dateStr) continue;

        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();

        const type = props['Work Type']?.select?.name || 'Unknown';
        const energy = props['Energy Level']?.select?.name || 'Medium';

        dayStats[dayOfWeek].push({ type, energy });
        taskTypeCounts[type] = (taskTypeCounts[type] || 0) + 1;
      }

      // Calculate patterns from actual data
      const learnedDayPatterns: Record<number, DayPattern> = {};
      for (const [day, logs] of Object.entries(dayStats)) {
        if (logs.length === 0) continue;

        const typeCounts: Record<string, number> = {};
        const energyCounts = { high: 0, medium: 0, low: 0 };

        for (const log of logs) {
          typeCounts[log.type] = (typeCounts[log.type] || 0) + 1;
          const energyKey = log.energy.toLowerCase() as 'high' | 'medium' | 'low';
          energyCounts[energyKey] = (energyCounts[energyKey] || 0) + 1;
        }

        const mostCommonType = Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

        const avgEnergy = energyCounts.high > energyCounts.low ? 'high' :
                         energyCounts.low > energyCounts.high ? 'low' : 'medium';

        learnedDayPatterns[parseInt(day)] = {
          type: mostCommonType,
          energy: avgEnergy as 'high' | 'medium' | 'low',
          sampleSize: logs.length,
          focus: this.inferFocusFromType(mostCommonType),
        };
      }

      // Merge learned patterns with defaults
      if (Object.keys(learnedDayPatterns).length > 0) {
        this.patterns = {
          day: { ...DEFAULT_DAY_PATTERNS, ...learnedDayPatterns },
          hour: DEFAULT_HOUR_PATTERNS,
          taskTypes: taskTypeCounts,
          learned: true,
          lastAnalyzed: new Date().toISOString(),
          sampleSize: entries.length,
        };

        await this.savePatterns();
      }

      return {
        patterns: this.patterns!,
        entriesAnalyzed: entries.length,
        taskTypes: taskTypeCounts,
        recommendation: this.generatePatternInsight(),
      };
    } catch (err) {
      return { error: (err as Error).message, patterns: this.patterns! };
    }
  }

  /**
   * Infer focus areas from work type
   */
  private inferFocusFromType(type: string): string[] {
    const typeToFocus: Record<string, string[]> = {
      'Deep Work': ['coding', 'writing', 'strategy'],
      'Admin': ['email', 'planning', 'documentation'],
      'Meetings': ['collaboration', 'feedback', 'discussion'],
      'Creative': ['design', 'content', 'ideation'],
      'Rest': ['learning', 'reflection'],
    };
    return typeToFocus[type] || ['general'];
  }

  /**
   * Generate insight from patterns
   */
  private generatePatternInsight(): string {
    if (!this.patterns?.learned) {
      return 'No patterns learned yet. Use the Daily Work Log consistently to improve recommendations.';
    }

    const insights: string[] = [];

    // Find best deep work days
    const deepWorkDays = Object.entries(this.patterns.day)
      .filter(([_, p]) => p.energy === 'high' && p.type?.includes('DEEP'))
      .map(([day, _]) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)]);

    if (deepWorkDays.length > 0) {
      insights.push(`Best deep work days: ${deepWorkDays.join(', ')}`);
    }

    // Find patterns in task types
    const topType = Object.entries(this.patterns.taskTypes || {})
      .sort((a, b) => b[1] - a[1])[0];

    if (topType) {
      insights.push(`Most common work type: ${topType[0]} (${topType[1]} days)`);
    }

    return insights.join('. ') || 'Keep logging to improve predictions.';
  }

  /**
   * Record task completion for learning
   *
   * @param taskType - Type of task completed
   * @param completedAt - When the task was completed
   * @returns Completion record
   */
  async recordCompletion(
    taskType: string,
    completedAt: Date = new Date()
  ): Promise<{ taskType: string; dayOfWeek: number; hour: number; timestamp: string }> {
    const completion = {
      taskType,
      dayOfWeek: completedAt.getDay(),
      hour: completedAt.getHours(),
      timestamp: completedAt.toISOString(),
    };

    this.completionHistory.push(completion);

    if (this.patterns) {
      this.patterns.taskTypes = this.patterns.taskTypes || {};
      this.patterns.taskTypes[taskType] = (this.patterns.taskTypes[taskType] || 0) + 1;
      await this.savePatterns();
    }

    return completion;
  }

  /**
   * Get comprehensive work recommendations
   *
   * @returns Full recommendations including priorities, calendar, and predictive context
   */
  async getRecommendations(): Promise<WorkRecommendations> {
    await this.initialize();

    // Gather all context including predictive
    const [mode, calendar, issues, contacts, projects] = await Promise.all([
      modeDetector.detectMode(),
      this.getCalendarContext(),
      this.getActiveIssues(),
      this.getContactsNeedingAttention(),
      this.getProjectHealth(),
    ]);

    // Get predictive context
    const predictive = this.getPredictiveContext();

    // Score and rank tasks with predictive input
    const scoredTasks = this.scoreTasks(issues, mode, calendar, predictive);

    // Build recommendations
    const recommendations: WorkRecommendations = {
      timestamp: new Date().toISOString(),
      mode,
      predictive,
      topPriorities: scoredTasks.slice(0, 3),
      calendarContext: calendar,
      relationshipCheck: contacts,
      projectHealth: projects,
      suggestion: this.generateSuggestion(scoredTasks[0], mode, calendar, predictive),
      patternsLearned: this.patterns?.learned || false,
    };

    return recommendations;
  }

  /**
   * Get today's calendar context
   */
  async getCalendarContext(): Promise<CalendarContext> {
    if (!this.dbConfigured.main) {
      return { events: [], freeBlocks: [], meetingCount: 0, nextMeeting: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const { data: events } = await db.main
        .from('calendar_events')
        .select('*')
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true });

      const meetings = (events || []).filter((e: CalendarEvent) => e.event_type === 'meeting');
      const freeBlocks = this.calculateFreeBlocks(events || [], today);

      return {
        events: events || [],
        meetings,
        meetingCount: meetings.length,
        freeBlocks,
        nextMeeting: meetings[0] || null,
      };
    } catch {
      return { events: [], meetings: [], meetingCount: 0, freeBlocks: [], nextMeeting: null };
    }
  }

  /**
   * Calculate free time blocks
   */
  private calculateFreeBlocks(events: CalendarEvent[], date: Date): FreeBlock[] {
    const blocks: FreeBlock[] = [];
    const workStart = 9;
    const workEnd = 18;

    const meetings = events
      .filter((e) => e.event_type === 'meeting')
      .map((e) => ({
        start: new Date(e.start_time).getHours(),
        end: new Date(e.end_time).getHours(),
      }))
      .sort((a, b) => a.start - b.start);

    let currentHour = workStart;

    for (const meeting of meetings) {
      if (meeting.start > currentHour) {
        blocks.push({
          start: currentHour,
          end: meeting.start,
          duration: meeting.start - currentHour,
        });
      }
      currentHour = Math.max(currentHour, meeting.end);
    }

    if (currentHour < workEnd) {
      blocks.push({
        start: currentHour,
        end: workEnd,
        duration: workEnd - currentHour,
      });
    }

    return blocks;
  }

  /**
   * Get active issues from Notion
   */
  async getActiveIssues(): Promise<Issue[]> {
    if (!NOTION_TOKEN) return [];

    try {
      const dbId = this.notionConfig?.githubIssues;
      if (!dbId) return [];

      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION,
        },
        body: JSON.stringify({
          filter: {
            property: 'Status',
            select: {
              equals: 'In Progress',
            },
          },
          page_size: 20,
        }),
      });

      const data = await response.json();
      return (data.results || []).map((page: any) => this.extractIssueData(page));
    } catch (err) {
      console.error('Error fetching issues:', (err as Error).message);
      return [];
    }
  }

  /**
   * Extract issue data from Notion page
   */
  private extractIssueData(page: any): Issue {
    const props = page.properties;

    return {
      id: page.id,
      title: props.Title?.title?.[0]?.plain_text || 'Untitled',
      status: props.Status?.select?.name || 'Unknown',
      priority: props.Priority?.select?.name || 'Medium',
      labels: props.Labels?.multi_select?.map((l: any) => l.name) || [],
      sprint: props.Sprint?.select?.name || null,
      assignee: props.Assignee?.people?.[0]?.name || null,
      isBlocking: (props.Labels?.multi_select || []).some((l: any) =>
        l.name.toLowerCase().includes('block')
      ),
      createdAt: page.created_time,
      url: page.url,
    };
  }

  /**
   * Get contacts needing attention
   */
  async getContactsNeedingAttention(daysThreshold: number = 25): Promise<StaleContact[]> {
    if (!this.dbConfigured.ghl) return [];

    try {
      const { data: comms } = await db.ghl
        .from('contact_communications')
        .select('ghl_contact_id, occurred_at')
        .order('occurred_at', { ascending: false });

      if (!comms) return [];

      // Group by contact, find stale ones
      const contactLastComm: Record<string, Date> = {};
      for (const comm of comms) {
        if (!contactLastComm[comm.ghl_contact_id]) {
          contactLastComm[comm.ghl_contact_id] = new Date(comm.occurred_at);
        }
      }

      const threshold = new Date();
      threshold.setDate(threshold.getDate() - daysThreshold);

      const stale: StaleContact[] = Object.entries(contactLastComm)
        .filter(([_, lastDate]) => lastDate < threshold)
        .map(([contactId, lastDate]) => ({
          ghl_contact_id: contactId,
          last_communication: lastDate,
          days_since_contact: Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => b.days_since_contact - a.days_since_contact)
        .slice(0, 5);

      return stale;
    } catch {
      return [];
    }
  }

  /**
   * Get project health from Notion
   */
  async getProjectHealth(): Promise<ProjectHealth[]> {
    if (!NOTION_TOKEN) return [];

    try {
      const dbId = this.notionConfig?.actProjects;
      if (!dbId) return [];

      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
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
   * Score tasks based on multiple factors including predictive context
   */
  private scoreTasks(
    issues: Issue[],
    mode: ModeDetectionResult,
    calendar: CalendarContext,
    predictive: PredictiveContext | null = null
  ): ScoredTask[] {
    const modeTaskAlignment: Record<WorkModeKey, string[]> = {
      DEEP_WORK: ['enhancement', 'feature', 'refactor', 'architecture'],
      CONNECT: ['discussion', 'review', 'feedback'],
      ADMIN: ['documentation', 'chore', 'update'],
      CREATE: ['design', 'content', 'ux'],
      PLAN: ['planning', 'roadmap', 'strategy'],
      REST: ['learning', 'research'],
    };

    const alignedLabels = modeTaskAlignment[mode.mode] || [];

    const predictiveTaskTypes = predictive?.recommendation?.taskTypes || [];
    const avoidTaskTypes = predictive?.recommendation?.avoid || [];

    return issues
      .map((issue) => {
        let score = 0;
        const reasons: string[] = [];

        // Urgency: blocking others
        if (issue.isBlocking) {
          score += 3;
          reasons.push('Blocking others');
        }

        // Priority
        if (issue.priority === 'High' || issue.priority === 'Urgent') {
          score += 2;
          reasons.push('High priority');
        } else if (issue.priority === 'Medium') {
          score += 1;
        }

        // Mode alignment
        const hasAlignedLabel = issue.labels.some((l) =>
          alignedLabels.some((al) => l.toLowerCase().includes(al))
        );
        if (hasAlignedLabel) {
          score += 2;
          reasons.push(`Fits ${mode.modeInfo.name} mode`);
        }

        // Predictive alignment
        if (predictive) {
          const labelText = issue.labels.join(' ').toLowerCase();
          const titleLower = issue.title.toLowerCase();

          const matchesPredictive = predictiveTaskTypes.some(t =>
            labelText.includes(t.toLowerCase()) || titleLower.includes(t.toLowerCase())
          );
          const shouldAvoid = avoidTaskTypes.some(t =>
            labelText.includes(t.toLowerCase()) || titleLower.includes(t.toLowerCase())
          );

          if (matchesPredictive) {
            score += 1.5;
            reasons.push(`Good for ${predictive.hourPattern.period}`);
          }
          if (shouldAvoid) {
            score -= 1;
            reasons.push(`Avoid in ${predictive.hourPattern.period}`);
          }
        }

        // Already in progress (continuity)
        if (issue.status === 'In Progress') {
          score += 1;
          reasons.push('Already started');
        }

        // Free time availability
        const longestBlock = calendar.freeBlocks?.[0]?.duration || 0;
        if (longestBlock >= 2 && !hasAlignedLabel) {
          score += 0.5;
        }

        return {
          ...issue,
          score,
          reasons,
          modeAlignment: hasAlignedLabel,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Generate actionable suggestion with predictive context
   */
  private generateSuggestion(
    topTask: ScoredTask | undefined,
    mode: ModeDetectionResult,
    calendar: CalendarContext,
    predictive: PredictiveContext | null = null
  ): string {
    const predictiveHint = predictive?.recommendation?.message || '';

    if (!topTask) {
      const hint = predictiveHint ? ` (${predictiveHint})` : '';
      return `${mode.modeInfo.icon} Focus on ${mode.modeInfo.description.toLowerCase()}${hint}. Check your backlog for suitable tasks.`;
    }

    const freeTime = calendar.freeBlocks?.[0];
    const timeContext = freeTime
      ? `You have ${freeTime.duration} hours free until ${freeTime.end}:00.`
      : 'Your calendar is clear.';

    const predictiveAdvice = predictiveHint ? ` ${predictiveHint}.` : '';

    return `${mode.modeInfo.icon} Start with "${topTask.title}" - ${topTask.reasons.join(', ')}.${predictiveAdvice} ${timeContext}`;
  }

  /**
   * Format recommendations for display
   *
   * @param recommendations - Recommendations to format
   * @returns Formatted string output
   */
  formatRecommendations(recommendations: WorkRecommendations): string {
    const lines: string[] = [];

    lines.push('Work Recommendations');
    lines.push('');

    if (recommendations.predictive) {
      const pred = recommendations.predictive;
      lines.push('## Time Optimization\n');
      lines.push(`${pred.dayName} ${pred.hour}:00 - ${pred.recommendation.message}`);

      if (pred.recommendation.taskTypes?.length > 0) {
        lines.push(`Good for: ${pred.recommendation.taskTypes.slice(0, 4).join(', ')}`);
      }
      if (pred.recommendation.avoid?.length > 0) {
        lines.push(`Avoid: ${pred.recommendation.avoid.join(', ')}`);
      }

      const learnedStatus = recommendations.patternsLearned ? 'Personalized' : 'Default patterns';
      lines.push(`(${learnedStatus})`);
      lines.push('');
    }

    lines.push('## Top 3 Priorities\n');

    if (recommendations.topPriorities.length === 0) {
      lines.push('No in-progress issues found. Check your backlog!');
    } else {
      recommendations.topPriorities.forEach((task, i) => {
        lines.push(`${i + 1}. **${task.title}**`);
        lines.push(`   - Why: ${task.reasons.join(', ') || 'In progress'}`);
        lines.push(`   - Mode fit: ${task.modeAlignment ? 'Good' : 'Neutral'}`);
        lines.push('');
      });
    }

    lines.push('## Energy Alignment\n');
    lines.push(`${recommendations.mode.context.moonPhase.phase}: ${recommendations.mode.context.moonPhase.energy}`);
    lines.push('');

    lines.push('## Calendar Context\n');
    const cal = recommendations.calendarContext;
    if (cal.meetingCount > 0) {
      lines.push(`- ${cal.meetingCount} meeting(s) today`);
      if (cal.nextMeeting) {
        const time = new Date(cal.nextMeeting.start_time).toLocaleTimeString('en-AU', {
          hour: '2-digit',
          minute: '2-digit',
        });
        lines.push(`- Next: ${cal.nextMeeting.title} at ${time}`);
      }
    } else {
      lines.push('- No meetings scheduled');
    }
    if (cal.freeBlocks?.length) {
      const longest = cal.freeBlocks[0];
      lines.push(`- Longest free block: ${longest.duration}h (${longest.start}:00-${longest.end}:00)`);
    }
    lines.push('');

    lines.push('## Relationship Check\n');
    if (recommendations.relationshipCheck.length === 0) {
      lines.push('All contacts are recently engaged!');
    } else {
      recommendations.relationshipCheck.slice(0, 3).forEach((contact) => {
        lines.push(`- ${contact.ghl_contact_id}: ${contact.days_since_contact} days since contact`);
      });
    }
    lines.push('');

    lines.push('## Suggestion\n');
    lines.push(recommendations.suggestion);
    lines.push('');

    return lines.join('\n');
  }
}

// Singleton instance
export const workRecommender = new WorkRecommenderService();

export default workRecommender;
