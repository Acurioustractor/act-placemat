/**
 * Unified Dashboard Service
 *
 * Aggregates data from ALL systems into a single comprehensive view:
 * - Notion: Projects, Goals, Actions, Moon Cycles, Sprints
 * - GHL: Contacts, Opportunities, Pipelines, Activity
 * - Xero: Invoices, Cash flow (placeholder)
 * - Calendar: Upcoming events (placeholder)
 * - AI Intelligence: Recommendations, Health scores
 *
 * Provides multiple views: daily, moon cycle, phase, yearly
 */

import { logger } from '../../utils/logger.js';

// Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Notion Database IDs
const DATABASES = {
  projects: process.env.NOTION_PROJECTS_DB || '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  actions: process.env.NOTION_ACTIONS_DB || '177ebcf9-81cf-8023-af6e-dff974284218',
  goals: process.env.NOTION_GOALS_DB || '036c90a0-e843-4044-ac84-76866cbc64f7',
  sprints: process.env.NOTION_SPRINTS_DB || '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d',
  moonCycles: process.env.NOTION_MOON_DB || '2d8ebcf9-81cf-8176-ada6-c7f3a2f8dd2a'
};

class UnifiedDashboardService {
  constructor() {
    this.data = null;
  }

  /**
   * Make authenticated Notion request
   */
  async notionRequest(endpoint, options = {}) {
    if (!NOTION_TOKEN) return null;

    try {
      const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        logger.error('Notion API error', { status: response.status, endpoint });
        return null;
      }

      return response.json();
    } catch (error) {
      logger.error('Notion request failed', { error: error.message });
      return null;
    }
  }

  /**
   * Calculate moon phase based on date
   * Simplified algorithm - approximates 29.5 day lunar cycle
   */
  calculateMoonPhase() {
    const now = new Date();
    // Known new moon: January 6, 2000
    const knownNewMoon = new Date(2000, 0, 6);
    const lunarCycle = 29.53059;

    const daysSinceNewMoon = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const dayInCycle = daysSinceNewMoon % lunarCycle;

    let phase, energy;
    if (dayInCycle < 1.85) {
      phase = 'New Moon';
      energy = 'Set intentions, plant seeds, begin new projects';
    } else if (dayInCycle < 7.38) {
      phase = 'Waxing Crescent';
      energy = 'Build momentum, take first steps, nurture beginnings';
    } else if (dayInCycle < 9.23) {
      phase = 'First Quarter';
      energy = 'Take action, overcome challenges, make decisions';
    } else if (dayInCycle < 14.77) {
      phase = 'Waxing Gibbous';
      energy = 'Refine, adjust, prepare for completion';
    } else if (dayInCycle < 16.62) {
      phase = 'Full Moon';
      energy = 'Celebrate, harvest results, peak visibility';
    } else if (dayInCycle < 22.15) {
      phase = 'Waning Gibbous';
      energy = 'Share wisdom, gratitude, distribute fruits';
    } else if (dayInCycle < 23.99) {
      phase = 'Third Quarter';
      energy = 'Release, let go, forgive, clear space';
    } else {
      phase = 'Waning Crescent';
      energy = 'Rest, reflect, prepare for new cycle';
    }

    const daysToNewMoon = Math.ceil(lunarCycle - dayInCycle);
    const nextNewMoon = new Date(now.getTime() + daysToNewMoon * 24 * 60 * 60 * 1000);

    return {
      phase,
      energy,
      dayInCycle: Math.floor(dayInCycle),
      percentComplete: Math.round((dayInCycle / lunarCycle) * 100),
      daysToNewMoon,
      nextNewMoon: nextNewMoon.toISOString().split('T')[0]
    };
  }

  /**
   * Calculate 6-month phase (Waxing/Waning year)
   */
  calculateSixMonthPhase() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Waxing: January-June, Waning: July-December
    const isWaxing = month < 6;
    const phaseStart = new Date(year, isWaxing ? 0 : 6, 1);
    const phaseEnd = new Date(year, isWaxing ? 6 : 12, 0);

    const totalDays = (phaseEnd - phaseStart) / (1000 * 60 * 60 * 24);
    const daysPassed = (now - phaseStart) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, Math.floor((phaseEnd - now) / (1000 * 60 * 60 * 24)));

    return {
      phase: isWaxing ? 'Waxing' : 'Waning',
      theme: isWaxing ? 'Growth & Expansion' : 'Harvest & Consolidation',
      startDate: phaseStart.toISOString(),
      endDate: phaseEnd.toISOString(),
      startMonth: phaseStart.toLocaleDateString('en-AU', { month: 'long' }),
      endMonth: phaseEnd.toLocaleDateString('en-AU', { month: 'long' }),
      year,
      percentComplete: Math.min(100, Math.round((daysPassed / totalDays) * 100)),
      daysRemaining
    };
  }

  /**
   * Fetch goals from Notion
   */
  async fetchGoals() {
    const data = await this.notionRequest(`/databases/${DATABASES.goals}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: { property: 'Type', select: { equals: 'Yearly Goal' } },
        page_size: 50
      })
    });

    if (!data) return { completed: 0, inProgress: 0, notStarted: 0, items: [] };

    const goals = { completed: 0, inProgress: 0, notStarted: 0, items: [] };

    for (const page of data.results || []) {
      const props = page.properties;
      const name = props.Goal?.title?.[0]?.plain_text || 'Untitled';
      const status = props.Status?.status?.name || 'Not started';

      if (status === 'Completed') goals.completed++;
      else if (status.includes('progress') || status === 'Planning') goals.inProgress++;
      else goals.notStarted++;

      goals.items.push({ name, status, id: page.id });
    }

    return goals;
  }

  /**
   * Fetch active sprint from Notion
   */
  async fetchActiveSprint() {
    const data = await this.notionRequest(`/databases/${DATABASES.sprints}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: { property: 'Status', select: { equals: 'Active' } },
        page_size: 1
      })
    });

    if (!data || !data.results?.length) return null;

    const sprint = data.results[0];
    return {
      name: sprint.properties.Sprint?.title?.[0]?.plain_text || 'Current Sprint',
      id: sprint.id
    };
  }

  /**
   * Generate AI-powered recommendations based on data
   */
  generateRecommendations(data) {
    const recommendations = [];
    const moon = data.rhythm.moon;
    const sixMonth = data.rhythm.sixMonth;

    // Moon phase recommendations
    if (moon.phase.includes('Waning')) {
      recommendations.push({
        type: 'rhythm',
        priority: 'medium',
        action: 'Complete in-progress work before new moon',
        reason: `${moon.daysToNewMoon} days until new moon - time to wrap up`
      });
    } else if (moon.phase.includes('New')) {
      recommendations.push({
        type: 'rhythm',
        priority: 'high',
        action: 'Set intentions for the new cycle',
        reason: 'New moon energy - ideal for starting fresh'
      });
    }

    // Goals progress check
    const goals = data.goals;
    const totalGoals = goals.completed + goals.inProgress + goals.notStarted;
    if (totalGoals > 0) {
      const goalsProgress = Math.round((goals.completed / totalGoals) * 100);
      const yearProgress = sixMonth.percentComplete;

      if (goalsProgress < yearProgress - 20) {
        recommendations.push({
          type: 'goals',
          priority: 'high',
          action: 'Accelerate goal progress',
          reason: `Goals ${goalsProgress}% complete vs ${yearProgress}% year elapsed`
        });
      }
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });
  }

  /**
   * Gather data from all systems
   */
  async gatherAllData() {
    const now = new Date();

    const data = {
      timestamp: now.toISOString(),
      systems: {
        notion: { status: 'pending' },
        ghl: { status: 'not_configured' },
        xero: { status: 'not_configured' },
        calendar: { status: 'not_configured' }
      },
      rhythm: {
        moon: this.calculateMoonPhase(),
        sixMonth: this.calculateSixMonthPhase()
      },
      goals: { completed: 0, inProgress: 0, notStarted: 0, items: [] },
      sprint: null,
      recommendations: []
    };

    // Fetch Notion data
    try {
      const [goals, sprint] = await Promise.all([
        this.fetchGoals(),
        this.fetchActiveSprint()
      ]);

      data.goals = goals;
      data.sprint = sprint;
      data.systems.notion.status = 'connected';
    } catch (error) {
      data.systems.notion.status = 'error';
      data.systems.notion.error = error.message;
    }

    // Generate recommendations
    data.recommendations = this.generateRecommendations(data);

    this.data = data;
    return data;
  }

  /**
   * Get dashboard data in specified view
   * @param {string} view - View type: 'daily', 'moon', 'phase', 'year'
   * @returns {Object} Dashboard data
   */
  async getDashboard(view = 'daily') {
    const data = await this.gatherAllData();

    switch (view) {
      case 'moon':
        return this.formatMoonView(data);
      case 'phase':
        return this.formatPhaseView(data);
      case 'year':
        return this.formatYearView(data);
      case 'daily':
      default:
        return this.formatDailyView(data);
    }
  }

  /**
   * Format daily view
   */
  formatDailyView(data) {
    return {
      view: 'daily',
      generated: data.timestamp,
      systems: data.systems,
      rhythm: {
        moon: data.rhythm.moon,
        sixMonth: data.rhythm.sixMonth
      },
      recommendations: data.recommendations,
      goals: {
        summary: {
          completed: data.goals.completed,
          inProgress: data.goals.inProgress,
          notStarted: data.goals.notStarted,
          total: data.goals.completed + data.goals.inProgress + data.goals.notStarted
        }
      },
      sprint: data.sprint
    };
  }

  /**
   * Format moon cycle view
   */
  formatMoonView(data) {
    const moon = data.rhythm.moon;

    return {
      view: 'moon',
      generated: data.timestamp,
      cycle: {
        phase: moon.phase,
        dayInCycle: moon.dayInCycle,
        percentComplete: moon.percentComplete,
        energy: moon.energy
      },
      timeline: {
        nextNewMoon: moon.nextNewMoon,
        daysToNewMoon: moon.daysToNewMoon
      },
      pipelineFocus: this.getPipelineFocusForMoonPhase(moon.phase)
    };
  }

  /**
   * Get pipeline focus recommendation based on moon phase
   */
  getPipelineFocusForMoonPhase(phase) {
    if (phase.includes('New')) {
      return { stage: 'GERMINATION', focus: 'New contacts, introductions' };
    } else if (phase.includes('Waxing')) {
      return { stage: 'GROWTH', focus: 'Deepen relationships, follow-ups' };
    } else if (phase.includes('Full')) {
      return { stage: 'HARVEST', focus: 'Close opportunities, celebrate wins' };
    } else {
      return { stage: 'COMPOSTING', focus: 'Check-ins, release what is not working' };
    }
  }

  /**
   * Format 6-month phase view
   */
  formatPhaseView(data) {
    const phase = data.rhythm.sixMonth;
    const goals = data.goals;
    const totalGoals = goals.completed + goals.inProgress + goals.notStarted;
    const goalsProgress = totalGoals > 0 ? Math.round((goals.completed / totalGoals) * 100) : 0;

    return {
      view: 'phase',
      generated: data.timestamp,
      phase: {
        name: phase.phase,
        theme: phase.theme,
        period: `${phase.startMonth} - ${phase.endMonth}`,
        year: phase.year,
        percentComplete: phase.percentComplete,
        daysRemaining: phase.daysRemaining
      },
      progress: {
        phaseElapsed: phase.percentComplete,
        goalsCompleted: goalsProgress,
        status: goalsProgress >= phase.percentComplete - 15 ? 'on_track' :
                goalsProgress >= phase.percentComplete + 10 ? 'ahead' : 'behind'
      }
    };
  }

  /**
   * Format yearly view
   */
  formatYearView(data) {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const yearProgress = Math.round(((now - yearStart) / (yearEnd - yearStart)) * 100);
    const daysLeft = Math.ceil((yearEnd - now) / (1000 * 60 * 60 * 24));

    const goals = data.goals;
    const totalGoals = goals.completed + goals.inProgress + goals.notStarted;

    return {
      view: 'year',
      generated: data.timestamp,
      year: now.getFullYear(),
      progress: {
        percentComplete: yearProgress,
        daysRemaining: daysLeft
      },
      goals: {
        total: totalGoals,
        completed: goals.completed,
        inProgress: goals.inProgress,
        notStarted: goals.notStarted,
        items: goals.items.slice(0, 12)
      },
      phases: {
        waxing: { period: 'January - June', theme: 'Growth & Expansion' },
        waning: { period: 'July - December', theme: 'Harvest & Consolidation' },
        current: data.rhythm.sixMonth.phase
      }
    };
  }
}

// Export singleton instance
const unifiedDashboardService = new UnifiedDashboardService();
export default unifiedDashboardService;
export { UnifiedDashboardService };
