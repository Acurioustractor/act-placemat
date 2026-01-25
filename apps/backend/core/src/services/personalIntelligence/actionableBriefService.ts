/**
 * ACT Actionable Brief
 *
 * Generates specific, actionable recommendations with direct links:
 * - Who to email (with mailto: links)
 * - Who to call (with tel: links)
 * - What to update in GHL (with direct GHL links)
 * - What to update in Notion (with direct Notion links)
 *
 * Output options:
 * - CLI: Human-readable with clickable links
 * - JSON: For app/email integration
 * - Markdown: For email digest
 *
 * Migrated from: act-personal-ai/services/actionable-brief.mjs
 */

import { db } from './databaseHelper.js';
import { modeDetector } from './modeDetectorService.js';
import {
  ActionableAction,
  ActionType,
  ActionPriority,
  ActionLinks,
  ActionContext,
  ActionableBriefOutput,
  GHLOpportunity,
  GHLPipeline,
  GHLContact,
  MoonPhase,
} from './types.js';

const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'agzsSZWgovjwgpcoASWG';
const GHL_BASE_URL = `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}`;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASES = {
  projects: '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  actions: '177ebcf9-81cf-8023-af6e-dff974284218',
  goals: '036c90a0-e843-4044-ac84-76866cbc64f7',
};

/**
 * Options for ActionableBrief service
 */
export interface ActionableBriefOptions {
  enableLogging?: boolean;
}

/**
 * Actionable Brief service class
 */
export class ActionableBriefService {
  private actions: ActionableAction[] = [];
  private enableLogging: boolean;

  constructor(options: ActionableBriefOptions = {}) {
    this.enableLogging = options.enableLogging !== false;
  }

  /**
   * Add an action and optionally log it to the database
   *
   * @param action - The action object
   * @param entityId - Entity ID for logging
   * @param entityType - Entity type
   */
  async addAction(
    action: ActionableAction,
    entityId: string | null = null,
    entityType: string = 'contact'
  ): Promise<void> {
    // Log the recommendation if logging is enabled
    if (this.enableLogging && entityId) {
      const confidence = action.priority === 'high' ? 0.8 :
                         action.priority === 'medium' ? 0.6 : 0.4;

      try {
        const { data, error } = await db.main
          .from('recommendation_outcomes')
          .insert({
            recommendation_type: action.type,
            entity_id: entityId,
            entity_type: entityType,
            recommended_action: action.title,
            confidence_score: confidence,
            recommended_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (data?.id) {
          action.recommendation_id = data.id;
        }
      } catch (err) {
        console.error('Error logging recommendation:', (err as Error).message);
      }
    }
    this.actions.push(action);
  }

  /**
   * Make a request to Notion API
   */
  private async notionRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) throw new Error(`Notion API error: ${response.status}`);
    return response.json();
  }

  /**
   * Generate all actionable recommendations
   *
   * @returns Array of actionable actions
   */
  async generateActions(): Promise<ActionableAction[]> {
    this.actions = [];

    console.log('Generating actionable recommendations...\n');

    // Get rhythm context
    const moon = modeDetector.getMoonPhase(new Date());

    // Generate actions from different sources
    await Promise.all([
      this.generatePipelineActions(),
      this.generateColdContactActions(),
      this.generateOpportunityActions(),
      this.generateProjectActions(),
      this.generateMoonActions(moon),
    ]);

    // Sort by priority
    this.actions.sort((a, b) => {
      const order: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });

    return this.actions;
  }

  /**
   * Pipeline contacts in follow-up stages
   */
  private async generatePipelineActions(): Promise<void> {
    if (!db.isConfigured().ghl) return;

    try {
      const { data: opportunities } = await db.ghl
        .from('ghl_opportunities')
        .select('*, ghl_contacts(ghl_id, first_name, last_name, email, phone)')
        .eq('status', 'open');

      const { data: pipelines } = await db.ghl
        .from('ghl_pipelines')
        .select('*');

      // Create stage lookup
      const stageLookup: Record<string, { name: string; pipeline: string }> = {};
      for (const p of (pipelines as GHLPipeline[]) || []) {
        for (const s of p.stages || []) {
          stageLookup[s.id] = { name: s.name, pipeline: p.name };
        }
      }

      // Find contacts in follow-up stages
      const followUpStages = ['Contacted', 'Growth', 'Follow', 'Assessment'];

      for (const opp of (opportunities as GHLOpportunity[]) || []) {
        const stage = stageLookup[opp.ghl_stage_id];
        const contact = opp.ghl_contacts;

        if (!stage || !contact) continue;

        if (followUpStages.some(s => stage.name.includes(s))) {
          const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

          await this.addAction({
            type: 'email',
            priority: 'high',
            title: `Follow up with ${name}`,
            description: `${opp.name} - currently in "${stage.name}" stage (${stage.pipeline})`,
            value: opp.monetary_value || 0,
            links: {
              email: contact.email ? `mailto:${contact.email}?subject=Following up - ${opp.name}` : null,
              phone: contact.phone ? `tel:${contact.phone}` : null,
              ghl: `${GHL_BASE_URL}/contacts/${contact.ghl_id}`,
              opportunity: `${GHL_BASE_URL}/opportunities/${opp.ghl_id || ''}`,
            },
            context: {
              contact: name,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              pipeline: stage.pipeline,
              stage: stage.name,
            },
          }, contact.ghl_id, 'contact');
        }
      }
    } catch (err) {
      console.error('Error generating pipeline actions:', (err as Error).message);
    }
  }

  /**
   * Contacts with no recent activity
   */
  private async generateColdContactActions(): Promise<void> {
    if (!db.isConfigured().ghl) return;

    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: coldContacts } = await db.ghl
        .from('ghl_contacts')
        .select('ghl_id, first_name, last_name, email, phone, last_activity, tags, company_name')
        .eq('sync_status', 'synced')
        .not('email', 'is', null)
        .lt('last_activity', fourteenDaysAgo.toISOString())
        .order('last_activity', { ascending: true })
        .limit(10);

      for (const contact of (coldContacts as GHLContact[]) || []) {
        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
        const daysSince = contact.last_activity
          ? Math.floor((Date.now() - new Date(contact.last_activity).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Only flag important contacts (have tags or company)
        if (!contact.tags?.length && !contact.company_name) continue;

        await this.addAction({
          type: 'email',
          priority: daysSince > 30 ? 'high' : 'medium',
          title: `Re-engage ${name}`,
          description: `No activity in ${daysSince} days${contact.company_name ? ` (${contact.company_name})` : ''}`,
          links: {
            email: `mailto:${contact.email}?subject=Checking in`,
            phone: contact.phone ? `tel:${contact.phone}` : null,
            ghl: `${GHL_BASE_URL}/contacts/${contact.ghl_id}`,
          },
          context: {
            contact: name,
            email: contact.email || undefined,
            daysSinceActivity: daysSince,
            tags: contact.tags || [],
          },
        }, contact.ghl_id, 'contact');
      }
    } catch (err) {
      console.error('Error generating cold contact actions:', (err as Error).message);
    }
  }

  /**
   * High-value opportunities needing attention
   */
  private async generateOpportunityActions(): Promise<void> {
    if (!db.isConfigured().ghl) return;

    try {
      const { data: opportunities } = await db.ghl
        .from('ghl_opportunities')
        .select('*, ghl_contacts(ghl_id, first_name, last_name, email)')
        .eq('status', 'open')
        .gt('monetary_value', 5000)
        .order('monetary_value', { ascending: false })
        .limit(5);

      for (const opp of (opportunities as GHLOpportunity[]) || []) {
        const contact = opp.ghl_contacts;
        const name = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Unknown';

        const daysSinceUpdate = opp.updated_at
          ? Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceUpdate > 7) {
          await this.addAction({
            type: 'update',
            priority: (opp.monetary_value || 0) > 20000 ? 'high' : 'medium',
            title: `Update ${opp.name}`,
            description: `$${(opp.monetary_value || 0).toLocaleString()} opportunity - no update in ${daysSinceUpdate} days`,
            value: opp.monetary_value || 0,
            links: {
              ghl: `${GHL_BASE_URL}/opportunities/list`,
              contact: contact ? `${GHL_BASE_URL}/contacts/${contact.ghl_id}` : null,
              email: contact?.email ? `mailto:${contact.email}?subject=${opp.name}` : null,
            },
            context: {
              opportunity: opp.name,
              contact: name,
              value: opp.monetary_value || 0,
              daysSinceUpdate,
            },
          }, opp.ghl_id, 'opportunity');
        }
      }
    } catch (err) {
      console.error('Error generating opportunity actions:', (err as Error).message);
    }
  }

  /**
   * Projects needing data enrichment
   */
  private async generateProjectActions(): Promise<void> {
    if (!NOTION_TOKEN) return;

    try {
      // Get projects from Notion
      const data = await this.notionRequest(`/databases/${DATABASES.projects}/query`, {
        method: 'POST',
        body: JSON.stringify({ page_size: 20 }),
      });

      const projects = (data.results || []).map((page: any) => {
        const props = page.properties;
        return {
          id: page.id,
          name: props['Project Name']?.title?.[0]?.plain_text || 'Unknown',
          status: props.Status?.status?.name || 'Unknown',
          url: page.url,
          totalFunding: props['Total Funding']?.number || 0,
          organisationIds: props['Organisations']?.relation?.length || 0,
          resourceIds: props['Resources']?.relation?.length || 0,
          health: {
            overall: props['Health Score']?.number || 0,
          },
        };
      });

      // Find active projects with low health due to missing data
      const needingEnrichment = projects
        .filter((p: any) => p.status?.includes('Active'))
        .filter((p: any) => {
          const hasNoFunding = p.totalFunding === 0;
          const hasNoOrgs = p.organisationIds === 0;
          const hasNoResources = p.resourceIds === 0;
          return hasNoFunding && hasNoOrgs && hasNoResources;
        })
        .slice(0, 5);

      for (const project of needingEnrichment) {
        await this.addAction({
          type: 'notion',
          priority: 'low',
          title: `Enrich ${project.name}`,
          description: 'Add funding, organizations, or resources to track health properly',
          links: {
            notion: project.url,
          },
          context: {
            project: project.name,
            status: project.status,
            currentHealth: project.health?.overall || 0,
          },
        }, project.id, 'project');
      }
    } catch (err) {
      console.log('Warning: Could not fetch project data:', (err as Error).message);
    }
  }

  /**
   * Moon phase recommendations
   */
  private async generateMoonActions(moon: MoonPhase): Promise<void> {
    const daysToNewMoon = 29 - moon.dayInCycle;

    if (daysToNewMoon <= 3) {
      await this.addAction({
        type: 'planning',
        priority: 'medium',
        title: 'New Moon Planning',
        description: `${daysToNewMoon} days until new moon - time to set intentions for the next cycle`,
        links: {
          notion: 'https://notion.so/Moon-Cycles-2d8ebcf981cf8176ada6c7f3a2f8dd2a',
        },
        context: {
          moonPhase: moon.phase,
          daysToNewMoon,
        },
      }, null, 'planning');
    }

    if (moon.phase.includes('Waning')) {
      await this.addAction({
        type: 'planning',
        priority: 'low',
        title: 'Complete open work',
        description: 'Waning moon energy - focus on finishing rather than starting',
        links: {
          notion: `https://notion.so/${DATABASES.actions.replace(/-/g, '')}`,
        },
        context: {
          moonPhase: moon.phase,
          energy: moon.energy,
        },
      }, null, 'planning');
    }
  }

  /**
   * Print CLI output with clickable links
   */
  printCLI(): void {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    console.log('');
    console.log('====================================================================');
    console.log('                   ACTIONABLE BRIEF                                 ');
    console.log(`                   ${dateStr}`);
    console.log('====================================================================');
    console.log('');

    if (this.actions.length === 0) {
      console.log('No urgent actions needed right now!');
      return;
    }

    // Group by priority
    const high = this.actions.filter(a => a.priority === 'high');
    const medium = this.actions.filter(a => a.priority === 'medium');
    const low = this.actions.filter(a => a.priority === 'low');

    if (high.length > 0) {
      console.log('HIGH PRIORITY');
      console.log('---------------------------------------------------------------------');
      for (const action of high) {
        this.printAction(action);
      }
      console.log('');
    }

    if (medium.length > 0) {
      console.log('MEDIUM PRIORITY');
      console.log('---------------------------------------------------------------------');
      for (const action of medium) {
        this.printAction(action);
      }
      console.log('');
    }

    if (low.length > 0) {
      console.log('LOW PRIORITY');
      console.log('---------------------------------------------------------------------');
      for (const action of low.slice(0, 5)) {
        this.printAction(action);
      }
      if (low.length > 5) {
        console.log(`   ... and ${low.length - 5} more`);
      }
      console.log('');
    }

    // Summary
    console.log('===================================================================');
    console.log('SUMMARY');
    console.log('===================================================================');
    console.log(`   High: ${high.length} | Medium: ${medium.length} | Low: ${low.length}`);

    const emailActions = this.actions.filter(a => a.type === 'email');
    const totalValue = this.actions.reduce((sum, a) => sum + (a.value || 0), 0);

    if (emailActions.length > 0) {
      console.log(`   ${emailActions.length} people to contact`);
    }
    if (totalValue > 0) {
      console.log(`   $${totalValue.toLocaleString()} in pipeline needing attention`);
    }
    console.log('');
  }

  /**
   * Print a single action
   */
  private printAction(action: ActionableAction): void {
    const icon = action.type === 'email' ? '[Email]' :
                 action.type === 'update' ? '[Update]' :
                 action.type === 'notion' ? '[Notion]' :
                 action.type === 'planning' ? '[Plan]' : '[*]';

    console.log(`   ${icon} ${action.title}`);
    console.log(`      ${action.description}`);

    // Print links
    const links: string[] = [];
    if (action.links.email) links.push(`Email: ${action.links.email}`);
    if (action.links.phone) links.push(`Call: ${action.links.phone}`);
    if (action.links.ghl) links.push(`GHL: ${action.links.ghl}`);
    if (action.links.notion) links.push(`Notion: ${action.links.notion}`);

    if (links.length > 0) {
      console.log(`      -> ${links[0]}`);
      for (const link of links.slice(1)) {
        console.log(`      -> ${link}`);
      }
    }
    console.log('');
  }

  /**
   * Generate markdown for email digest
   */
  toMarkdown(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let md = `# ACT Daily Brief\n\n**${dateStr}**\n\n`;

    if (this.actions.length === 0) {
      return md + 'No urgent actions needed today!\n';
    }

    const high = this.actions.filter(a => a.priority === 'high');
    const medium = this.actions.filter(a => a.priority === 'medium');

    if (high.length > 0) {
      md += '## High Priority\n\n';
      for (const action of high) {
        md += this.actionToMarkdown(action);
      }
    }

    if (medium.length > 0) {
      md += '## Medium Priority\n\n';
      for (const action of medium) {
        md += this.actionToMarkdown(action);
      }
    }

    // Summary
    const emailActions = this.actions.filter(a => a.type === 'email');
    const totalValue = this.actions.reduce((sum, a) => sum + (a.value || 0), 0);

    md += '---\n\n';
    md += `**Summary:** ${high.length} high, ${medium.length} medium priority actions\n`;
    if (emailActions.length > 0) {
      md += `${emailActions.length} people to contact\n`;
    }
    if (totalValue > 0) {
      md += `$${totalValue.toLocaleString()} in pipeline\n`;
    }

    return md;
  }

  /**
   * Convert action to markdown
   */
  private actionToMarkdown(action: ActionableAction): string {
    let md = `### ${action.title}\n\n`;
    md += `${action.description}\n\n`;

    if (action.links.email) {
      md += `- [Send Email](${action.links.email})\n`;
    }
    if (action.links.ghl) {
      md += `- [View in GHL](${action.links.ghl})\n`;
    }
    if (action.links.notion) {
      md += `- [View in Notion](${action.links.notion})\n`;
    }

    md += '\n';
    return md;
  }

  /**
   * Return JSON for app integration
   */
  toJSON(): ActionableBriefOutput {
    return {
      generated: new Date().toISOString(),
      summary: {
        total: this.actions.length,
        high: this.actions.filter(a => a.priority === 'high').length,
        medium: this.actions.filter(a => a.priority === 'medium').length,
        low: this.actions.filter(a => a.priority === 'low').length,
        totalValue: this.actions.reduce((sum, a) => sum + (a.value || 0), 0),
      },
      actions: this.actions,
    };
  }

  /**
   * Get current actions
   */
  getActions(): ActionableAction[] {
    return this.actions;
  }
}

// Factory function for easy instantiation
export function createActionableBrief(options?: ActionableBriefOptions): ActionableBriefService {
  return new ActionableBriefService(options);
}

export default ActionableBriefService;
