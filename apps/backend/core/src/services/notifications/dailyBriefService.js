/**
 * Daily Brief Service
 *
 * Generates daily briefings by querying multiple systems:
 * - Notion: Projects, Goals, Actions
 * - GHL: Contacts, Opportunities, Pipeline activity
 * - Calendar: Upcoming events
 * - Financial: Invoice status (placeholder)
 *
 * Supports multiple output formats: CLI, JSON, Markdown (email digest)
 */

import { logger } from '../../utils/logger.js';

// Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

// Notion Database IDs (configurable via environment)
const DATABASES = {
  projects: process.env.NOTION_PROJECTS_DB || '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  actions: process.env.NOTION_ACTIONS_DB || '177ebcf9-81cf-8023-af6e-dff974284218'
};

class DailyBriefService {
  constructor() {
    this.data = this.initializeData();
  }

  /**
   * Initialize empty data structure
   */
  initializeData() {
    return {
      timestamp: new Date().toISOString(),
      notion: { projects: [], actions: [] },
      ghl: { recentContacts: [], tasks: [], totalContacts: 0 },
      calendar: { events: [] },
      xero: { summary: null }
    };
  }

  /**
   * Check which integrations are configured
   */
  getConfiguredIntegrations() {
    return {
      notion: !!NOTION_TOKEN,
      ghl: !!(GHL_API_KEY && GHL_LOCATION_ID),
      calendar: false, // Placeholder - would check Google Calendar credentials
      xero: !!process.env.XERO_CLIENT_ID
    };
  }

  /**
   * Make authenticated Notion API request
   */
  async notionRequest(endpoint, options = {}) {
    if (!NOTION_TOKEN) {
      logger.warn('Notion token not configured');
      return null;
    }

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
      logger.error('Notion request failed', { error: error.message, endpoint });
      return null;
    }
  }

  /**
   * Fetch active projects from Notion
   */
  async fetchNotionProjects() {
    const data = await this.notionRequest(`/databases/${DATABASES.projects}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: 'Status',
          select: { equals: 'Active' }
        },
        page_size: 20
      })
    });

    if (!data) return [];

    return (data.results || []).map(p => ({
      id: p.id,
      name: p.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
      type: p.properties?.['Project Type']?.select?.name || 'Unknown',
      theme: p.properties?.Theme?.multi_select?.map(t => t.name) || [],
      url: p.url
    }));
  }

  /**
   * Fetch pending actions from Notion
   */
  async fetchNotionActions() {
    const data = await this.notionRequest(`/databases/${DATABASES.actions}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: 'Status',
          status: { does_not_equal: 'Done' }
        },
        page_size: 10,
        sorts: [{ property: 'Due Date', direction: 'ascending' }]
      })
    });

    if (!data) return [];

    return (data.results || []).map(a => ({
      id: a.id,
      title: a.properties?.['Action Item']?.title?.[0]?.plain_text || 'Untitled',
      status: a.properties?.Status?.status?.name || 'Unknown',
      dueDate: a.properties?.['Due Date']?.date?.start || null,
      url: a.url
    }));
  }

  /**
   * Fetch GHL activity (contacts and basic stats)
   */
  async fetchGHLActivity() {
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      logger.warn('GHL credentials not configured');
      return { recentContacts: [], totalContacts: 0 };
    }

    try {
      const response = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Version': '2021-07-28'
          }
        }
      );

      if (!response.ok) {
        logger.error('GHL API error', { status: response.status });
        return { recentContacts: [], totalContacts: 0 };
      }

      const data = await response.json();

      const recentContacts = (data.contacts || []).slice(0, 5).map(c => ({
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email,
        company: c.companyName,
        tags: c.tags || [],
        dateAdded: c.dateAdded
      }));

      return {
        recentContacts,
        totalContacts: data.meta?.total || data.contacts?.length || 0
      };
    } catch (error) {
      logger.error('GHL request failed', { error: error.message });
      return { recentContacts: [], totalContacts: 0 };
    }
  }

  /**
   * Fetch all data from configured systems
   */
  async fetchAll() {
    this.data = this.initializeData();

    const results = await Promise.allSettled([
      this.fetchNotionProjects(),
      this.fetchNotionActions(),
      this.fetchGHLActivity()
    ]);

    // Process results
    if (results[0].status === 'fulfilled') {
      this.data.notion.projects = results[0].value || [];
    }
    if (results[1].status === 'fulfilled') {
      this.data.notion.actions = results[1].value || [];
    }
    if (results[2].status === 'fulfilled') {
      this.data.ghl = results[2].value || { recentContacts: [], totalContacts: 0 };
    }

    return this.data;
  }

  /**
   * Generate brief in specified format
   * @param {string} format - Output format: 'json', 'markdown', 'text'
   * @returns {Object|string} Formatted brief
   */
  async generateBrief(format = 'json') {
    await this.fetchAll();

    switch (format) {
      case 'markdown':
        return this.toMarkdown();
      case 'text':
        return this.toText();
      case 'json':
      default:
        return this.toJSON();
    }
  }

  /**
   * Convert brief to JSON format
   */
  toJSON() {
    return {
      generated: this.data.timestamp,
      integrations: this.getConfiguredIntegrations(),
      projects: {
        total: this.data.notion.projects.length,
        items: this.data.notion.projects
      },
      actions: {
        total: this.data.notion.actions.length,
        items: this.data.notion.actions
      },
      crm: {
        totalContacts: this.data.ghl.totalContacts,
        recentActivity: this.data.ghl.recentContacts
      }
    };
  }

  /**
   * Convert brief to Markdown format (for email digest)
   */
  toMarkdown() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let md = `# ACT Daily Brief\n\n**${dateStr}**\n\n`;

    // Active Projects
    if (this.data.notion.projects.length > 0) {
      md += `## Active Projects (${this.data.notion.projects.length})\n\n`;
      for (const p of this.data.notion.projects.slice(0, 8)) {
        const themes = p.theme.length > 0 ? ` [${p.theme.join(', ')}]` : '';
        md += `- [${p.name}](${p.url})${themes}\n`;
      }
      md += '\n';
    }

    // Upcoming Actions
    if (this.data.notion.actions.length > 0) {
      md += `## Upcoming Actions (${this.data.notion.actions.length})\n\n`;
      for (const a of this.data.notion.actions) {
        const dueStr = a.dueDate ? ` - Due: ${a.dueDate}` : '';
        md += `- [${a.status}] ${a.title}${dueStr}\n`;
      }
      md += '\n';
    }

    // CRM Snapshot
    if (this.data.ghl.totalContacts > 0) {
      md += `## CRM Snapshot\n\n`;
      md += `- Total Contacts: ${this.data.ghl.totalContacts}\n`;
      if (this.data.ghl.recentContacts.length > 0) {
        md += '- Recent:\n';
        for (const c of this.data.ghl.recentContacts.slice(0, 3)) {
          const company = c.company ? ` (${c.company})` : '';
          md += `  - ${c.name}${company}\n`;
        }
      }
      md += '\n';
    }

    md += '---\n\n';
    md += '*Generated by ACT Intelligence Platform*\n';

    return md;
  }

  /**
   * Convert brief to plain text format (for CLI)
   */
  toText() {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-AU', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

    let text = '\n';
    text += '='.repeat(60) + '\n';
    text += '              ACT DAILY BRIEF\n';
    text += `              ${dayName}, ${dateStr}\n`;
    text += '='.repeat(60) + '\n\n';

    // Active Projects
    if (this.data.notion.projects.length > 0) {
      text += 'ACTIVE PROJECTS\n';
      text += '-'.repeat(40) + '\n';
      for (const p of this.data.notion.projects.slice(0, 8)) {
        const themes = p.theme.length > 0 ? ` [${p.theme.join(', ')}]` : '';
        text += `   * ${p.name}${themes}\n`;
      }
      text += '\n';
    }

    // Upcoming Actions
    if (this.data.notion.actions.length > 0) {
      text += 'UPCOMING ACTIONS\n';
      text += '-'.repeat(40) + '\n';
      for (const a of this.data.notion.actions) {
        const dueStr = a.dueDate ? ` (${a.dueDate})` : '';
        text += `   [${a.status}] ${a.title}${dueStr}\n`;
      }
      text += '\n';
    }

    // CRM Snapshot
    if (this.data.ghl.totalContacts > 0) {
      text += 'CRM SNAPSHOT\n';
      text += '-'.repeat(40) + '\n';
      text += `   Total Contacts: ${this.data.ghl.totalContacts}\n`;
      text += '\n';
    }

    return text;
  }
}

// Export singleton instance
const dailyBriefService = new DailyBriefService();
export default dailyBriefService;
export { DailyBriefService };
