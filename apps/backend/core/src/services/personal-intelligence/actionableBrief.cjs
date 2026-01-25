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
 * Usage:
 *   const { ActionableBrief } = require('./actionableBrief');
 *   const brief = new ActionableBrief();
 *   await brief.generateActions();
 *   console.log(brief.toJSON());
 *
 * Migrated from: act-personal-ai/services/actionable-brief.mjs
 */

const { db } = require('./db.cjs');
const { modeDetector } = require('./modeDetector.cjs');

const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'agzsSZWgovjwgpcoASWG';
const GHL_BASE_URL = `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}`;

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASES = {
  projects: '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  actions: '177ebcf9-81cf-8023-af6e-dff974284218',
  goals: '036c90a0-e843-4044-ac84-76866cbc64f7',
};

class ActionableBrief {
  constructor(options = {}) {
    this.actions = [];
    // Option to disable logging (for testing or dry runs)
    this.enableLogging = options.enableLogging !== false;
    this.modeDetector = modeDetector;
  }

  /**
   * Add an action
   * @param {Object} action - The action object
   * @param {string} entityId - Entity ID for logging (contact_id, opportunity_id, etc.)
   * @param {string} entityType - Entity type ('contact', 'opportunity', 'project')
   */
  async addAction(action, entityId = null, entityType = 'contact') {
    // Log the recommendation if logging is enabled
    if (this.enableLogging && entityId && db.isConfigured().main) {
      try {
        const confidence = action.priority === 'high' ? 0.8 :
                           action.priority === 'medium' ? 0.6 : 0.4;
        const { data } = await db.main
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
        console.error('Error logging recommendation:', err.message);
      }
    }
    this.actions.push(action);
  }

  async notionRequest(endpoint, options = {}) {
    const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    if (!response.ok) throw new Error(`Notion API error: ${response.status}`);
    return response.json();
  }

  /**
   * Get moon phase for rhythm-based recommendations
   */
  getMoonPhase() {
    const now = new Date();
    const knownNewMoon = new Date('2024-01-11T11:57:00Z');
    const lunarCycle = 29.53;
    const daysSinceNewMoon = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const currentCycleDay = daysSinceNewMoon % lunarCycle;

    let phase, energy;
    if (currentCycleDay < 1.85) {
      phase = 'New Moon';
      energy = 'Set intentions, plant seeds';
    } else if (currentCycleDay < 7.38) {
      phase = 'Waxing Crescent';
      energy = 'Take action, build momentum';
    } else if (currentCycleDay < 9.23) {
      phase = 'First Quarter';
      energy = 'Overcome challenges, push forward';
    } else if (currentCycleDay < 13.77) {
      phase = 'Waxing Gibbous';
      energy = 'Refine and adjust, almost there';
    } else if (currentCycleDay < 15.62) {
      phase = 'Full Moon';
      energy = 'Celebrate, harvest, culmination';
    } else if (currentCycleDay < 20.15) {
      phase = 'Waning Gibbous';
      energy = 'Share learnings, gratitude';
    } else if (currentCycleDay < 22.0) {
      phase = 'Last Quarter';
      energy = "Release what doesn't serve";
    } else {
      phase = 'Waning Crescent';
      energy = 'Rest, reflect, prepare for new cycle';
    }

    const daysToNewMoon = lunarCycle - currentCycleDay;

    return {
      phase,
      energy,
      dayInCycle: Math.floor(currentCycleDay),
      daysToNewMoon: Math.floor(daysToNewMoon),
      percentComplete: Math.round((currentCycleDay / lunarCycle) * 100),
    };
  }

  /**
   * Generate all actionable recommendations
   */
  async generateActions() {
    this.actions = [];

    console.log('Generating actionable recommendations...\n');

    // Get rhythm context
    const moon = this.getMoonPhase();

    // 1. Pipeline contacts needing follow-up
    await this.generatePipelineActions();

    // 2. Contacts going cold (no activity 14+ days)
    await this.generateColdContactActions();

    // 3. Opportunities needing movement
    await this.generateOpportunityActions();

    // 4. Projects needing enrichment
    await this.generateProjectActions();

    // 5. Moon phase recommendations
    await this.generateMoonActions(moon);

    // Sort by priority
    this.actions.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });

    return this.actions;
  }

  /**
   * Pipeline contacts in follow-up stages
   */
  async generatePipelineActions() {
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
              email: contact.email,
              phone: contact.phone,
              pipeline: stage.pipeline,
              stage: stage.name,
            }
          }, contact.ghl_id, 'contact');
        }
      }
    } catch (err) {
      console.error('Error generating pipeline actions:', err.message);
    }
  }

  /**
   * Contacts with no recent activity
   */
  async generateColdContactActions() {
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

      for (const contact of coldContacts || []) {
        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
        const daysSince = contact.last_activity ?
          Math.floor((Date.now() - new Date(contact.last_activity).getTime()) / (1000*60*60*24)) : 999;

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
            email: contact.email,
            daysSinceActivity: daysSince,
            tags: contact.tags || [],
          }
        }, contact.ghl_id, 'contact');
      }
    } catch (err) {
      console.error('Error generating cold contact actions:', err.message);
    }
  }

  /**
   * High-value opportunities needing attention
   */
  async generateOpportunityActions() {
    if (!db.isConfigured().ghl) return;

    try {
      const { data: opportunities } = await db.ghl
        .from('ghl_opportunities')
        .select('*, ghl_contacts(ghl_id, first_name, last_name, email)')
        .eq('status', 'open')
        .gt('monetary_value', 5000)
        .order('monetary_value', { ascending: false })
        .limit(5);

      for (const opp of opportunities || []) {
        const contact = opp.ghl_contacts;
        const name = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Unknown';

        // Calculate days since last update
        const daysSinceUpdate = opp.updated_at ?
          Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / (1000*60*60*24)) : 999;

        if (daysSinceUpdate > 7) {
          await this.addAction({
            type: 'update',
            priority: opp.monetary_value > 20000 ? 'high' : 'medium',
            title: `Update ${opp.name}`,
            description: `$${opp.monetary_value.toLocaleString()} opportunity - no update in ${daysSinceUpdate} days`,
            value: opp.monetary_value,
            links: {
              ghl: `${GHL_BASE_URL}/opportunities/list`,
              contact: contact ? `${GHL_BASE_URL}/contacts/${contact.ghl_id}` : null,
              email: contact?.email ? `mailto:${contact.email}?subject=${opp.name}` : null,
            },
            context: {
              opportunity: opp.name,
              contact: name,
              value: opp.monetary_value,
              daysSinceUpdate,
            }
          }, opp.ghl_id, 'opportunity');
        }
      }
    } catch (err) {
      console.error('Error generating opportunity actions:', err.message);
    }
  }

  /**
   * Projects needing data enrichment
   */
  async generateProjectActions() {
    // Simplified version - just check for projects in Notion if configured
    if (!NOTION_TOKEN) return;

    try {
      const response = await this.notionRequest(`/databases/${DATABASES.projects}/query`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            property: 'Status',
            status: { equals: 'Active' }
          },
          page_size: 5,
        }),
      });

      const projects = response.results || [];

      for (const project of projects) {
        const props = project.properties;
        const name = props['Project Name']?.title?.[0]?.plain_text || 'Unnamed Project';

        // Check for missing data
        const hasFunding = props['Total Funding']?.number > 0;
        const hasOrgs = (props['Organisations']?.relation?.length || 0) > 0;

        if (!hasFunding && !hasOrgs) {
          await this.addAction({
            type: 'notion',
            priority: 'low',
            title: `Enrich ${name}`,
            description: 'Add funding, organizations, or resources to track health properly',
            links: {
              notion: project.url,
            },
            context: {
              project: name,
              status: props.Status?.status?.name,
            }
          }, project.id, 'project');
        }
      }
    } catch (err) {
      console.error('Error generating project actions:', err.message);
    }
  }

  /**
   * Moon phase recommendations
   */
  async generateMoonActions(moon) {
    if (moon.daysToNewMoon <= 3) {
      await this.addAction({
        type: 'planning',
        priority: 'medium',
        title: 'New Moon Planning',
        description: `${moon.daysToNewMoon} days until new moon - time to set intentions for the next cycle`,
        links: {
          notion: 'https://notion.so/Moon-Cycles-2d8ebcf981cf8176ada6c7f3a2f8dd2a',
        },
        context: {
          moonPhase: moon.phase,
          daysToNewMoon: moon.daysToNewMoon,
        }
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
        }
      }, null, 'planning');
    }
  }

  /**
   * Print CLI output with clickable links
   */
  printCLI() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    console.log('');
    console.log('ACTIONABLE BRIEF');
    console.log(`${dateStr}`);
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
      console.log('[HIGH PRIORITY]');
      console.log('-'.repeat(60));
      for (const action of high) {
        this.printAction(action);
      }
      console.log('');
    }

    if (medium.length > 0) {
      console.log('[MEDIUM PRIORITY]');
      console.log('-'.repeat(60));
      for (const action of medium) {
        this.printAction(action);
      }
      console.log('');
    }

    if (low.length > 0) {
      console.log('[LOW PRIORITY]');
      console.log('-'.repeat(60));
      for (const action of low.slice(0, 5)) {
        this.printAction(action);
      }
      if (low.length > 5) {
        console.log(`   ... and ${low.length - 5} more`);
      }
      console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
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

  printAction(action) {
    const icon = action.type === 'email' ? '[EMAIL]' :
                 action.type === 'update' ? '[UPDATE]' :
                 action.type === 'notion' ? '[NOTION]' :
                 action.type === 'planning' ? '[PLAN]' : '*';

    console.log(`   ${icon} ${action.title}`);
    console.log(`      ${action.description}`);

    // Print links
    const links = [];
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
  toMarkdown() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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

  actionToMarkdown(action) {
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
  toJSON() {
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
}

module.exports = { ActionableBrief };
module.exports.default = ActionableBrief;
