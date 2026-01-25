/**
 * ACT Dashboard Sync Service
 *
 * Syncs all planning data to the ACT Command Center dashboard in Notion.
 * Updates content blocks with live data from:
 * - Moon phases and current cycle
 * - 6-month phase progress
 * - Yearly goals status
 * - Project health scores
 * - Pipeline activity
 * - Actions due
 *
 * Setup:
 * 1. Create Notion integration: https://www.notion.so/my-integrations
 * 2. Set environment variable: NOTION_TOKEN
 * 3. Share dashboard page with integration
 *
 * Migrated from: act-personal-ai/services/dashboard-sync.mjs
 */

import { db } from './databaseHelper.js';
import { modeDetector } from './modeDetectorService.js';
import {
  MoonPhase,
  GHLOpportunity,
  GHLPipeline,
  ActionableAction,
} from './types.js';

/**
 * Configuration options for DashboardSyncService
 */
export interface DashboardSyncConfig {
  notionToken?: string;
  dashboardId?: string;
  databases?: {
    projects?: string;
    actions?: string;
    goals?: string;
    sprints?: string;
    moonCycles?: string;
    sixMonthPhases?: string;
  };
}

/**
 * Dashboard data structure
 */
export interface DashboardData {
  timestamp: string;
  moon: MoonPhase;
  sixMonth: {
    phase: string;
    startDate: string;
    endDate: string;
    startMonth: string;
    endMonth: string;
    year: number;
    theme: string;
    energy: string;
    percentComplete: number;
    daysRemaining: number;
  };
  week: {
    number: number;
    inMonth: number;
  };
  projects: {
    healthy: any[];
    attention: any[];
    critical: any[];
  };
  actions: {
    overdue: any[];
    dueToday: any[];
    dueThisWeek: any[];
  };
  goals: {
    completed: number;
    inProgress: number;
    notStarted: number;
    items: any[];
  };
  pipelines: {
    total: number;
    needingFollowUp: number;
    byStage: Record<string, number>;
    byPipeline: Record<string, { total: number; stages: Record<string, number> }>;
  };
  sprint: { name: string; id: string } | null;
  moonCycle: { name: string; focus: string; id: string } | null;
}

/**
 * View content structure
 */
export interface ViewContent {
  title: string;
  sections: Array<{
    name: string;
    content: string;
  }>;
  moon?: MoonPhase;
  sixMonth?: DashboardData['sixMonth'];
  yearProgress?: number;
  goals?: DashboardData['goals'];
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Default database IDs
const DEFAULT_DATABASES = {
  projects: '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  actions: '177ebcf9-81cf-8023-af6e-dff974284218',
  goals: '036c90a0-e843-4044-ac84-76866cbc64f7',
  sprints: '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d',
  moonCycles: '2d8ebcf9-81cf-8176-ada6-c7f3a2f8dd2a',
  sixMonthPhases: '2d8ebcf9-81cf-81fe-bdfb-f2f2309fe50f',
};

// Default dashboard page ID
const DEFAULT_DASHBOARD_ID = '2e1ebcf9-81cf-81d8-9a83-d1227f86fecb';

/**
 * Dashboard Sync Service for updating Notion dashboards
 */
export class DashboardSyncService {
  private notionToken: string;
  private dashboardId: string;
  private databases: typeof DEFAULT_DATABASES;

  constructor(config: DashboardSyncConfig = {}) {
    this.notionToken = config.notionToken || process.env.NOTION_TOKEN || '';
    this.dashboardId = config.dashboardId || DEFAULT_DASHBOARD_ID;
    this.databases = { ...DEFAULT_DATABASES, ...config.databases };
  }

  /**
   * Check if Notion is configured
   */
  isConfigured(): boolean {
    return !!this.notionToken;
  }

  /**
   * Make authenticated request to Notion API
   */
  async notionRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notion API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Get 6-month phase information
   */
  private getSixMonthPhase(): DashboardData['sixMonth'] {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    // Waxing: Jan-Jun, Waning: Jul-Dec
    const isWaxing = month < 6;
    const phase = isWaxing ? 'Waxing' : 'Waning';
    const theme = isWaxing ? 'Growth & Expansion' : 'Harvest & Consolidation';

    const startDate = isWaxing
      ? new Date(year, 0, 1)
      : new Date(year, 6, 1);
    const endDate = isWaxing
      ? new Date(year, 5, 30)
      : new Date(year, 11, 31);

    const totalDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysPassed =
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(
      0,
      Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      phase,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startMonth: startDate.toLocaleDateString('en-AU', { month: 'long' }),
      endMonth: endDate.toLocaleDateString('en-AU', { month: 'long' }),
      year,
      theme,
      energy: theme,
      percentComplete: Math.min(
        100,
        Math.round((daysPassed / totalDays) * 100)
      ),
      daysRemaining,
    };
  }

  /**
   * Get all data needed for dashboard
   */
  async gatherAllData(): Promise<DashboardData> {
    const now = new Date();
    const moon = modeDetector.getMoonPhase(now);
    const sixMonth = this.getSixMonthPhase();

    // Get week info
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7
    );
    const weekInMonth = Math.ceil(now.getDate() / 7);

    const data: DashboardData = {
      timestamp: now.toISOString(),
      moon,
      sixMonth,
      week: { number: weekNumber, inMonth: weekInMonth },
      projects: { healthy: [], attention: [], critical: [] },
      actions: { overdue: [], dueToday: [], dueThisWeek: [] },
      goals: { completed: 0, inProgress: 0, notStarted: 0, items: [] },
      pipelines: { total: 0, needingFollowUp: 0, byStage: {}, byPipeline: {} },
      sprint: null,
      moonCycle: null,
    };

    // Get actions from Notion (if configured)
    if (this.isConfigured()) {
      try {
        const actionsData = await this.notionRequest(
          `/databases/${this.databases.actions}/query`,
          {
            method: 'POST',
            body: JSON.stringify({
              filter: {
                and: [
                  { property: 'Status', status: { does_not_equal: 'Done' } },
                ],
              },
              sorts: [{ property: 'Due', direction: 'ascending' }],
              page_size: 50,
            }),
          }
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        for (const page of actionsData.results || []) {
          const props = page.properties;
          const name =
            props.Action?.title?.[0]?.plain_text ||
            props.Name?.title?.[0]?.plain_text ||
            'Untitled';
          const dueDate = props.Due?.date?.start;
          const status = props.Status?.status?.name || 'Not started';

          const action = { name, dueDate, status, id: page.id };

          if (dueDate) {
            const due = new Date(dueDate);
            due.setHours(0, 0, 0, 0);

            if (due < today) {
              data.actions.overdue.push(action);
            } else if (due.getTime() === today.getTime()) {
              data.actions.dueToday.push(action);
            } else if (due <= weekEnd) {
              data.actions.dueThisWeek.push(action);
            }
          }
        }
      } catch (e) {
        console.log('Warning: Could not fetch actions:', (e as Error).message);
      }

      // Get goals
      try {
        const goalsData = await this.notionRequest(
          `/databases/${this.databases.goals}/query`,
          {
            method: 'POST',
            body: JSON.stringify({
              filter: {
                property: 'Type',
                select: { equals: 'Yearly Goal' },
              },
              page_size: 50,
            }),
          }
        );

        for (const page of goalsData.results || []) {
          const props = page.properties;
          const name = props.Goal?.title?.[0]?.plain_text || 'Untitled';
          const status = props.Status?.status?.name || 'Not started';

          if (status === 'Completed') data.goals.completed++;
          else if (status === 'In progress' || status === 'Planning')
            data.goals.inProgress++;
          else data.goals.notStarted++;

          data.goals.items.push({ name, status, id: page.id });
        }
      } catch (e) {
        console.log('Warning: Could not fetch goals:', (e as Error).message);
      }

      // Get active sprint
      try {
        const sprintData = await this.notionRequest(
          `/databases/${this.databases.sprints}/query`,
          {
            method: 'POST',
            body: JSON.stringify({
              filter: {
                property: 'Status',
                select: { equals: 'Active' },
              },
              page_size: 1,
            }),
          }
        );

        if (sprintData.results?.length > 0) {
          const sprint = sprintData.results[0];
          data.sprint = {
            name:
              sprint.properties.Sprint?.title?.[0]?.plain_text ||
              'Current Sprint',
            id: sprint.id,
          };
        }
      } catch (e) {
        console.log('Warning: Could not fetch sprint:', (e as Error).message);
      }

      // Get current moon cycle
      try {
        const moonData = await this.notionRequest(
          `/databases/${this.databases.moonCycles}/query`,
          {
            method: 'POST',
            body: JSON.stringify({
              sorts: [{ property: 'Start Date', direction: 'descending' }],
              page_size: 1,
            }),
          }
        );

        if (moonData.results?.length > 0) {
          const cycle = moonData.results[0];
          data.moonCycle = {
            name:
              cycle.properties.Cycle?.title?.[0]?.plain_text || 'Current Cycle',
            focus: cycle.properties.Focus?.rich_text?.[0]?.plain_text || '',
            id: cycle.id,
          };
        }
      } catch (e) {
        console.log(
          'Warning: Could not fetch moon cycle:',
          (e as Error).message
        );
      }
    }

    // Get pipeline data from GHL
    if (db.isConfigured().ghl) {
      try {
        const { data: opportunities } = await db.ghl
          .from('ghl_opportunities')
          .select('*')
          .eq('status', 'open');

        const { data: pipelines } = await db.ghl
          .from('ghl_pipelines')
          .select('*');

        // Create stage lookup
        const stageLookup: Record<string, { name: string; pipeline: string }> =
          {};
        for (const p of (pipelines as GHLPipeline[]) || []) {
          for (const s of p.stages || []) {
            stageLookup[s.id] = { name: s.name, pipeline: p.name };
          }
        }

        data.pipelines.total = opportunities?.length || 0;

        for (const opp of (opportunities as GHLOpportunity[]) || []) {
          const stage = stageLookup[opp.ghl_stage_id];
          if (stage) {
            const stageName = stage.name;
            const pipelineName = stage.pipeline;

            // By stage
            if (!data.pipelines.byStage[stageName]) {
              data.pipelines.byStage[stageName] = 0;
            }
            data.pipelines.byStage[stageName]++;

            // By pipeline
            if (!data.pipelines.byPipeline[pipelineName]) {
              data.pipelines.byPipeline[pipelineName] = { total: 0, stages: {} };
            }
            data.pipelines.byPipeline[pipelineName].total++;
            if (!data.pipelines.byPipeline[pipelineName].stages[stageName]) {
              data.pipelines.byPipeline[pipelineName].stages[stageName] = 0;
            }
            data.pipelines.byPipeline[pipelineName].stages[stageName]++;

            // Count follow-ups needed
            if (stageName.includes('Follow') || stageName.includes('Contact')) {
              data.pipelines.needingFollowUp++;
            }
          }
        }
      } catch (e) {
        console.log(
          'Warning: Could not fetch pipeline data:',
          (e as Error).message
        );
      }
    }

    return data;
  }

  /**
   * Generate daily dashboard content
   */
  async generateDailyView(): Promise<ViewContent> {
    const data = await this.gatherAllData();
    const moon = data.moon;
    const now = new Date();

    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const sections = [
      {
        name: 'Current Rhythm',
        content: `Moon: ${moon.phase} (Day ${moon.dayInCycle}/29)\nEnergy: ${moon.energy}\nPhase: ${data.sixMonth.phase}`,
      },
      {
        name: 'Actions',
        content: `Overdue: ${data.actions.overdue.length}\nDue Today: ${data.actions.dueToday.length}\nThis Week: ${data.actions.dueThisWeek.length}`,
      },
      {
        name: 'Projects',
        content: `Healthy: ${data.projects.healthy.length}\nAttention: ${data.projects.attention.length}\nCritical: ${data.projects.critical.length}`,
      },
      {
        name: 'Pipeline',
        content: `Total: ${data.pipelines.total}\nNeed Follow-up: ${data.pipelines.needingFollowUp}`,
      },
    ];

    return {
      title: `ACT Command Center - ${dateStr}`,
      sections,
      moon: data.moon,
      sixMonth: data.sixMonth,
    };
  }

  /**
   * Generate moon cycle view (29-day focus)
   */
  async generateMoonView(): Promise<ViewContent> {
    const data = await this.gatherAllData();
    const moon = data.moon;

    return {
      title: 'Moon Cycle Dashboard',
      sections: [
        {
          name: 'Current Cycle',
          content: data.moonCycle
            ? `${data.moonCycle.name}\nFocus: ${data.moonCycle.focus || 'Not set'}`
            : 'No cycle defined',
        },
        {
          name: 'Phase',
          content: `${moon.phase} (Day ${moon.dayInCycle}/29)\nProgress: ${Math.round((moon.dayInCycle / 29) * 100)}%`,
        },
        {
          name: 'Energy',
          content: moon.energy,
        },
      ],
      moon: data.moon,
    };
  }

  /**
   * Generate 6-month phase view
   */
  async generatePhaseView(): Promise<ViewContent> {
    const data = await this.gatherAllData();
    const phase = data.sixMonth;

    return {
      title: '6-Month Phase Dashboard',
      sections: [
        {
          name: 'Current Phase',
          content: `${phase.phase} (${phase.startMonth} - ${phase.endMonth} ${phase.year})`,
        },
        {
          name: 'Progress',
          content: `${phase.percentComplete}% complete\n${phase.daysRemaining} days remaining`,
        },
        {
          name: 'Theme',
          content: phase.theme,
        },
      ],
      sixMonth: phase,
    };
  }

  /**
   * Generate yearly goals view
   */
  async generateYearView(): Promise<ViewContent> {
    const data = await this.gatherAllData();
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const yearProgress = Math.round(
      ((now.getTime() - yearStart.getTime()) /
        (yearEnd.getTime() - yearStart.getTime())) *
        100
    );

    const totalGoals =
      data.goals.completed + data.goals.inProgress + data.goals.notStarted;

    return {
      title: `${now.getFullYear()} Yearly Dashboard`,
      sections: [
        {
          name: 'Year Progress',
          content: `${yearProgress}% of year elapsed`,
        },
        {
          name: 'Goals',
          content: `Completed: ${data.goals.completed}/${totalGoals}\nIn Progress: ${data.goals.inProgress}\nNot Started: ${data.goals.notStarted}`,
        },
        {
          name: '6-Month Phase',
          content: `Current: ${data.sixMonth.phase} (${data.sixMonth.percentComplete}%)`,
        },
      ],
      yearProgress,
      goals: data.goals,
    };
  }

  /**
   * Full dashboard sync - replaces all content with live data
   */
  async syncFullDashboard(): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Notion token not configured. Set NOTION_TOKEN environment variable.',
      };
    }

    console.log('Syncing dashboard to Notion...\n');

    try {
      const data = await this.gatherAllData();
      const moon = data.moon;
      const phase = data.sixMonth;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Delete existing blocks
      try {
        const existingBlocks = await this.notionRequest(
          `/blocks/${this.dashboardId}/children`
        );
        for (const block of existingBlocks.results || []) {
          await this.notionRequest(`/blocks/${block.id}`, { method: 'DELETE' });
        }
      } catch (e) {
        console.log(
          'Note: Could not clear existing blocks:',
          (e as Error).message
        );
      }

      // Build new blocks
      const blocks = [
        // Last updated callout
        {
          type: 'callout',
          callout: {
            icon: { emoji: '[Tractor]' },
            rich_text: [
              {
                text: {
                  content: `Last synced: ${dateStr} at ${now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`,
                },
                annotations: { italic: true },
              },
            ],
            color: 'gray_background',
          },
        },
        { type: 'divider', divider: {} },

        // Current Rhythm
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: 'Current Rhythm' } }],
          },
        },
        {
          type: 'callout',
          callout: {
            icon: { emoji: moon.phase.includes('New') ? '[Moon-New]' : moon.phase.includes('Full') ? '[Moon-Full]' : '[Moon-Half]' },
            rich_text: [
              {
                text: {
                  content: `${moon.phase} (Day ${moon.dayInCycle}/29)\n\nEnergy: ${moon.energy}\nPhase: ${phase.phase} (${phase.percentComplete}% through ${phase.startMonth}-${phase.endMonth})`,
                },
              },
            ],
            color: 'purple_background',
          },
        },

        // Actions
        {
          type: 'heading_1',
          heading_1: { rich_text: [{ text: { content: 'Actions Today' } }] },
        },
        {
          type: 'callout',
          callout: {
            icon: { emoji: '[Lightning]' },
            rich_text: [
              {
                text: {
                  content: `Overdue: ${data.actions.overdue.length} | Due Today: ${data.actions.dueToday.length} | This Week: ${data.actions.dueThisWeek.length}`,
                },
              },
            ],
            color: 'yellow_background',
          },
        },

        // Pipeline
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: 'Pipeline Activity' } }],
          },
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: `Total opportunities: ${data.pipelines.total}\nNeeding follow-up: ${data.pipelines.needingFollowUp}`,
                },
              },
            ],
          },
        },

        // Goals
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: `${now.getFullYear()} Goals` } }],
          },
        },
        {
          type: 'callout',
          callout: {
            icon: { emoji: '[Target]' },
            rich_text: [
              {
                text: {
                  content: `Completed: ${data.goals.completed} | In Progress: ${data.goals.inProgress} | Not Started: ${data.goals.notStarted}`,
                },
              },
            ],
            color: 'blue_background',
          },
        },

        // Footer
        { type: 'divider', divider: {} },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content:
                    'The tractor shares its power take-off with different implements.',
                },
                annotations: { italic: true, color: 'gray' },
              },
            ],
          },
        },
      ];

      // Add blocks to page
      await this.notionRequest(`/blocks/${this.dashboardId}/children`, {
        method: 'PATCH',
        body: JSON.stringify({ children: blocks }),
      });

      console.log('Dashboard synced to Notion');
      const url = `https://notion.so/ACT-Command-Center-${this.dashboardId.replace(/-/g, '')}`;
      console.log(`  URL: ${url}`);

      return { success: true, url };
    } catch (e) {
      const error = (e as Error).message;
      console.error('Error syncing dashboard:', error);
      return { success: false, error };
    }
  }
}

// Factory function for easy instantiation
export function createDashboardSync(
  config?: DashboardSyncConfig
): DashboardSyncService {
  return new DashboardSyncService(config);
}

// Singleton instance
export const dashboardSync = new DashboardSyncService();

export default DashboardSyncService;
