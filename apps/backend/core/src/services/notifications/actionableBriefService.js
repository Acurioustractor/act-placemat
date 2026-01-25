/**
 * Actionable Brief Service
 *
 * Generates specific, actionable recommendations with direct links:
 * - Who to email (with mailto: links)
 * - Who to call (with tel: links)
 * - What to update in GHL (with direct GHL links)
 * - What to update in Notion (with direct Notion links)
 *
 * Output formats: JSON, Markdown (email digest), plain text
 */

import { logger } from '../../utils/logger.js';
import { createClient } from '@supabase/supabase-js';

// Configuration
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'agzsSZWgovjwgpcoASWG';
const GHL_BASE_URL = `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}`;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

const DATABASES = {
  projects: process.env.NOTION_PROJECTS_DB || '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  actions: process.env.NOTION_ACTIONS_DB || '177ebcf9-81cf-8023-af6e-dff974284218'
};

class ActionableBriefService {
  constructor() {
    this.actions = [];
    this.ghlDb = null;
  }

  /**
   * Get GHL database client
   */
  getGhlDb() {
    if (!this.ghlDb) {
      const url = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        this.ghlDb = createClient(url, key);
      }
    }
    return this.ghlDb;
  }

  /**
   * Make Notion API request
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

      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      logger.error('Notion request failed', { error: error.message });
      return null;
    }
  }

  /**
   * Add an action to the list
   */
  addAction(action) {
    this.actions.push(action);
  }

  /**
   * Generate pipeline contact actions
   */
  async generatePipelineActions() {
    const db = this.getGhlDb();
    if (!db) return;

    try {
      const { data: opportunities } = await db
        .from('ghl_opportunities')
        .select('*, ghl_contacts(ghl_id, first_name, last_name, email, phone)')
        .eq('status', 'open');

      const { data: pipelines } = await db
        .from('ghl_pipelines')
        .select('*');

      // Create stage lookup
      const stageLookup = {};
      for (const p of pipelines || []) {
        for (const s of p.stages || []) {
          stageLookup[s.id] = { name: s.name, pipeline: p.name };
        }
      }

      // Find contacts in follow-up stages
      const followUpStages = ['Contacted', 'Growth', 'Follow', 'Assessment'];

      for (const opp of opportunities || []) {
        const stage = stageLookup[opp.ghl_stage_id];
        const contact = opp.ghl_contacts;

        if (!stage || !contact) continue;

        if (followUpStages.some(s => stage.name.includes(s))) {
          const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

          this.addAction({
            type: 'email',
            priority: 'high',
            title: `Follow up with ${name}`,
            description: `${opp.name} - currently in "${stage.name}" stage (${stage.pipeline})`,
            value: opp.monetary_value || 0,
            links: {
              email: contact.email ? `mailto:${contact.email}?subject=Following up - ${opp.name}` : null,
              phone: contact.phone ? `tel:${contact.phone}` : null,
              ghl: `${GHL_BASE_URL}/contacts/${contact.ghl_id}`
            },
            context: {
              contact: name,
              email: contact.email,
              phone: contact.phone,
              pipeline: stage.pipeline,
              stage: stage.name
            }
          });
        }
      }
    } catch (error) {
      logger.error('Failed to generate pipeline actions', { error: error.message });
    }
  }

  /**
   * Generate cold contact re-engagement actions
   */
  async generateColdContactActions() {
    const db = this.getGhlDb();
    if (!db) return;

    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: coldContacts } = await db
        .from('ghl_contacts')
        .select('ghl_id, first_name, last_name, email, phone, last_activity, tags, company_name')
        .eq('sync_status', 'synced')
        .not('email', 'is', null)
        .lt('last_activity', fourteenDaysAgo.toISOString())
        .order('last_activity', { ascending: true })
        .limit(10);

      for (const contact of coldContacts || []) {
        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
        const daysSince = contact.last_activity
          ? Math.floor((Date.now() - new Date(contact.last_activity).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Only flag important contacts
        if (!contact.tags?.length && !contact.company_name) continue;

        this.addAction({
          type: 'email',
          priority: daysSince > 30 ? 'high' : 'medium',
          title: `Re-engage ${name}`,
          description: `No activity in ${daysSince} days${contact.company_name ? ` (${contact.company_name})` : ''}`,
          links: {
            email: `mailto:${contact.email}?subject=Checking in`,
            phone: contact.phone ? `tel:${contact.phone}` : null,
            ghl: `${GHL_BASE_URL}/contacts/${contact.ghl_id}`
          },
          context: {
            contact: name,
            email: contact.email,
            daysSinceActivity: daysSince,
            tags: contact.tags || []
          }
        });
      }
    } catch (error) {
      logger.error('Failed to generate cold contact actions', { error: error.message });
    }
  }

  /**
   * Generate high-value opportunity actions
   */
  async generateOpportunityActions() {
    const db = this.getGhlDb();
    if (!db) return;

    try {
      const { data: opportunities } = await db
        .from('ghl_opportunities')
        .select('*, ghl_contacts(ghl_id, first_name, last_name, email)')
        .eq('status', 'open')
        .gt('monetary_value', 5000)
        .order('monetary_value', { ascending: false })
        .limit(5);

      for (const opp of opportunities || []) {
        const contact = opp.ghl_contacts;
        const name = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Unknown';

        const daysSinceUpdate = opp.updated_at
          ? Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceUpdate > 7) {
          this.addAction({
            type: 'update',
            priority: opp.monetary_value > 20000 ? 'high' : 'medium',
            title: `Update ${opp.name}`,
            description: `$${opp.monetary_value.toLocaleString()} opportunity - no update in ${daysSinceUpdate} days`,
            value: opp.monetary_value,
            links: {
              ghl: `${GHL_BASE_URL}/opportunities/list`,
              contact: contact ? `${GHL_BASE_URL}/contacts/${contact.ghl_id}` : null,
              email: contact?.email ? `mailto:${contact.email}?subject=${opp.name}` : null
            },
            context: {
              opportunity: opp.name,
              contact: name,
              value: opp.monetary_value,
              daysSinceUpdate
            }
          });
        }
      }
    } catch (error) {
      logger.error('Failed to generate opportunity actions', { error: error.message });
    }
  }

  /**
   * Generate project enrichment actions
   */
  async generateProjectActions() {
    if (!NOTION_TOKEN) return;

    try {
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

      if (!data) return;

      const needingEnrichment = (data.results || [])
        .filter(p => {
          const props = p.properties;
          // Check for missing key data
          const hasNoFunding = !props.Funding?.number;
          const hasNoOrgs = !props.Organizations?.relation?.length;
          return hasNoFunding && hasNoOrgs;
        })
        .slice(0, 5);

      for (const project of needingEnrichment) {
        const name = project.properties.Name?.title?.[0]?.plain_text || 'Untitled';

        this.addAction({
          type: 'notion',
          priority: 'low',
          title: `Enrich ${name}`,
          description: 'Add funding, organizations, or resources to track health properly',
          links: {
            notion: project.url
          },
          context: {
            project: name,
            status: project.properties.Status?.select?.name
          }
        });
      }
    } catch (error) {
      logger.error('Failed to generate project actions', { error: error.message });
    }
  }

  /**
   * Calculate moon phase for rhythm-based recommendations
   */
  getMoonPhase() {
    const now = new Date();
    const knownNewMoon = new Date(2000, 0, 6);
    const lunarCycle = 29.53059;
    const daysSinceNewMoon = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const dayInCycle = daysSinceNewMoon % lunarCycle;

    let phase, energy;
    if (dayInCycle < 7.38) {
      phase = 'Waxing';
      energy = 'Growth - build momentum';
    } else if (dayInCycle < 14.77) {
      phase = 'Full';
      energy = 'Harvest - complete tasks';
    } else if (dayInCycle < 22.15) {
      phase = 'Waning';
      energy = 'Release - wrap up loose ends';
    } else {
      phase = 'New';
      energy = 'Plant seeds - start fresh';
    }

    return {
      phase,
      energy,
      dayInCycle: Math.floor(dayInCycle),
      daysToNewMoon: Math.ceil(lunarCycle - dayInCycle)
    };
  }

  /**
   * Generate moon phase planning actions
   */
  generateMoonActions() {
    const moon = this.getMoonPhase();

    if (moon.daysToNewMoon <= 3) {
      this.addAction({
        type: 'planning',
        priority: 'medium',
        title: 'New Moon Planning',
        description: `${moon.daysToNewMoon} days until new moon - time to set intentions for the next cycle`,
        links: {
          notion: `https://notion.so/${DATABASES.actions.replace(/-/g, '')}`
        },
        context: {
          moonPhase: moon.phase,
          daysToNewMoon: moon.daysToNewMoon
        }
      });
    }

    if (moon.phase === 'Waning') {
      this.addAction({
        type: 'planning',
        priority: 'low',
        title: 'Complete open work',
        description: 'Waning moon energy - focus on finishing rather than starting',
        links: {
          notion: `https://notion.so/${DATABASES.actions.replace(/-/g, '')}`
        },
        context: {
          moonPhase: moon.phase,
          energy: moon.energy
        }
      });
    }
  }

  /**
   * Generate all actionable recommendations
   * @returns {Object} Brief data with actions and summary
   */
  async generateBrief() {
    this.actions = [];

    logger.info('Generating actionable recommendations...');

    await Promise.all([
      this.generatePipelineActions(),
      this.generateColdContactActions(),
      this.generateOpportunityActions(),
      this.generateProjectActions()
    ]);

    this.generateMoonActions();

    // Sort by priority
    this.actions.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });

    const high = this.actions.filter(a => a.priority === 'high');
    const medium = this.actions.filter(a => a.priority === 'medium');
    const low = this.actions.filter(a => a.priority === 'low');
    const emailActions = this.actions.filter(a => a.type === 'email');
    const totalValue = this.actions.reduce((sum, a) => sum + (a.value || 0), 0);

    return {
      generated: new Date().toISOString(),
      summary: {
        total: this.actions.length,
        high: high.length,
        medium: medium.length,
        low: low.length,
        emailCount: emailActions.length,
        totalValue
      },
      actions: this.actions,
      moonPhase: this.getMoonPhase()
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

    let md = `# ACT Actionable Brief\n\n**${dateStr}**\n\n`;

    if (this.actions.length === 0) {
      return md + 'No urgent actions needed today!\n';
    }

    const high = this.actions.filter(a => a.priority === 'high');
    const medium = this.actions.filter(a => a.priority === 'medium');

    if (high.length > 0) {
      md += '## High Priority\n\n';
      for (const action of high) {
        md += `### ${action.title}\n\n`;
        md += `${action.description}\n\n`;
        if (action.links.email) md += `- [Send Email](${action.links.email})\n`;
        if (action.links.ghl) md += `- [View in GHL](${action.links.ghl})\n`;
        if (action.links.notion) md += `- [View in Notion](${action.links.notion})\n`;
        md += '\n';
      }
    }

    if (medium.length > 0) {
      md += '## Medium Priority\n\n';
      for (const action of medium) {
        md += `### ${action.title}\n\n`;
        md += `${action.description}\n\n`;
      }
    }

    // Summary
    const emailActions = this.actions.filter(a => a.type === 'email');
    const totalValue = this.actions.reduce((sum, a) => sum + (a.value || 0), 0);

    md += '---\n\n';
    md += `**Summary:** ${high.length} high, ${medium.length} medium priority actions\n`;
    if (emailActions.length > 0) md += `- ${emailActions.length} people to contact\n`;
    if (totalValue > 0) md += `- $${totalValue.toLocaleString()} in pipeline\n`;

    return md;
  }
}

// Export singleton instance
const actionableBriefService = new ActionableBriefService();
export default actionableBriefService;
export { ActionableBriefService };
