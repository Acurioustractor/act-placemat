/**
 * Project Intelligence Service
 *
 * Provides deep project health scoring, relationship mapping, and action recommendations
 * across the ACT ecosystem. Integrates Notion, GHL, and AI for unified project visibility.
 *
 * Key capabilities:
 * - Pull all projects from Notion with full relations
 * - Calculate multi-dimensional health scores (Funding, Relationships, Momentum, Resources)
 * - Map contacts to projects via GHL
 * - Generate AI-powered action recommendations
 *
 * Usage:
 *   const { projectIntelligence } = require('./projectIntelligence');
 *
 *   // Get all projects with health scores
 *   const projects = await projectIntelligence.getProjectsWithHealth();
 *
 *   // Get project statistics
 *   const stats = await projectIntelligence.getProjectStats();
 *
 *   // Get pipeline analysis
 *   const pipeline = await projectIntelligence.getProjectPipelineAnalysis();
 *
 * Migrated from: act-personal-ai/services/project-intelligence.mjs
 */

const { db } = require('./db.cjs');

// Notion Project Database ID (main Projects database with rich relations)
const PROJECTS_DATABASE_ID = process.env.NOTION_PROJECTS_DB || '177ebcf9-81cf-80dd-9514-f1ec32f3314c';

// Project status weights for scoring
const STATUS_WEIGHTS = {
  'Active': 1.0,
  'Ideation': 0.6,
  'Sunsetting': 0.3,
  'Transferred': 0.1,
  'Internal': 0.5,
};

class ProjectIntelligence {
  constructor() {
    this.notionToken = process.env.NOTION_TOKEN;
    this.projectsCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    return !!this.notionToken;
  }

  /**
   * Make authenticated Notion API request
   */
  async notionRequest(endpoint, options = {}) {
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
      throw new Error(`Notion API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  /**
   * Get all projects from Notion with full property data
   * Falls back to cached data if API is not accessible
   */
  async getProjects(forceRefresh = false) {
    // Use cache if fresh (less than 5 minutes old)
    const cacheAge = this.cacheTimestamp ? Date.now() - this.cacheTimestamp : Infinity;
    if (!forceRefresh && this.projectsCache && cacheAge < 5 * 60 * 1000) {
      return this.projectsCache;
    }

    if (!this.isConfigured()) {
      return this.projectsCache || [];
    }

    const projects = [];
    let hasMore = true;
    let startCursor = null;

    try {
      while (hasMore) {
        const body = { page_size: 100 };
        if (startCursor) body.start_cursor = startCursor;

        const response = await this.notionRequest(
          `/databases/${PROJECTS_DATABASE_ID}/query`,
          { method: 'POST', body: JSON.stringify(body) }
        );

        for (const page of response.results) {
          const props = page.properties;

          // Extract status and normalize
          let status = props.Status?.select?.name || 'Unknown';
          // Normalize status names (remove emojis for consistent lookup)
          const statusNormalized = status.replace(/[^a-zA-Z]/g, '').trim();

          projects.push({
            id: page.id,
            url: page.url,
            name: props.Name?.title?.[0]?.plain_text || 'Untitled',
            status,
            statusNormalized,
            projectType: props['Project Type']?.select?.name || null,

            // Financial
            revenueActual: props['Revenue Actual']?.number || 0,
            revenuePotential: props['Revenue Potential']?.number || 0,
            totalFunding: props['Total Funding']?.rollup?.number || 0,
            potentialIncoming: props['Potential Incoming']?.number || 0,
            actualIncoming: props['Actual Incoming']?.number || 0,

            // Relations (count only for now)
            organisationIds: (props.Organisations?.relation || []).map(r => r.id),
            opportunityIds: (props.Opportunities?.relation || []).map(r => r.id),
            actionIds: (props.Actions?.relation || []).map(r => r.id),
            resourceIds: (props.Resources?.relation || []).map(r => r.id),
            placeIds: (props.Places?.relation || []).map(r => r.id),
            goalIds: (props['Related Goals']?.relation || []).map(r => r.id),

            // Metadata
            themes: (props.Theme?.multi_select || []).map(t => t.name),
            tags: (props.Tags?.multi_select || []).map(t => t.name),
            coreValue: props['Core Values']?.select?.name || null,
            projectLead: props['Project Lead']?.people?.[0]?.name || null,
            coverPhoto: props['Cover Photo']?.files?.[0]?.file?.url || null,
            websiteUrl: props.URL?.url || null,
            nextMilestoneDate: props['Next Milestone Date']?.date?.start || null,

            // Rollups
            partnerCount: props['Partner Count']?.rollup?.number || 0,
            supporters: props.Supporters?.rollup?.array?.length || 0,

            // Timestamps
            createdAt: page.created_time,
            updatedAt: page.last_edited_time,
          });
        }

        hasMore = response.has_more;
        startCursor = response.next_cursor;
      }

      this.projectsCache = projects;
      this.cacheTimestamp = Date.now();

      return projects;
    } catch (error) {
      console.warn('Could not fetch projects from Notion API:', error.message);

      // Return cached data if available
      if (this.projectsCache) {
        return this.projectsCache;
      }

      return [];
    }
  }

  /**
   * Calculate health score for a single project (0-100)
   */
  calculateProjectHealth(project) {
    const scores = {
      funding: 0,
      relationships: 0,
      momentum: 0,
      resources: 0,
    };

    // Funding health (0-100)
    // Based on funding secured vs potential
    const fundingRatio = project.revenuePotential > 0
      ? (project.totalFunding + project.revenueActual) / project.revenuePotential
      : project.totalFunding > 0 ? 1 : 0;
    scores.funding = Math.min(100, fundingRatio * 100);

    // Relationship health (0-100)
    // Based on organisation and opportunity connections
    const orgScore = Math.min(50, project.organisationIds.length * 15);
    const oppScore = Math.min(50, project.opportunityIds.length * 12);
    scores.relationships = orgScore + oppScore;

    // Momentum health (0-100)
    // Based on status, recent updates, and actions
    const statusWeight = STATUS_WEIGHTS[project.statusNormalized] ||
      STATUS_WEIGHTS[project.status] || 0.5;
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(0, 100 - daysSinceUpdate * 2);
    const actionScore = Math.min(30, project.actionIds.length * 5);
    scores.momentum = (statusWeight * 40) + (recencyScore * 0.3) + actionScore;

    // Resource health (0-100)
    // Based on resources, places, and goals linked
    const resourceScore = Math.min(40, project.resourceIds.length * 10);
    const placeScore = Math.min(30, project.placeIds.length * 15);
    const goalScore = Math.min(30, project.goalIds.length * 15);
    scores.resources = resourceScore + placeScore + goalScore;

    // Overall health (weighted average)
    const overall = Math.round(
      scores.funding * 0.3 +
      scores.relationships * 0.25 +
      scores.momentum * 0.25 +
      scores.resources * 0.2
    );

    return {
      overall,
      dimensions: scores,
      level: overall >= 70 ? 'Healthy' : overall >= 40 ? 'Needs Attention' : 'Critical',
    };
  }

  /**
   * Get projects with health scores
   */
  async getProjectsWithHealth(forceRefresh = false) {
    const projects = await this.getProjects(forceRefresh);

    return projects.map(project => ({
      ...project,
      health: this.calculateProjectHealth(project),
    }));
  }

  /**
   * Get projects grouped by status
   */
  async getProjectsByStatus() {
    const projects = await this.getProjectsWithHealth();

    const grouped = {};

    for (const project of projects) {
      const status = project.status || 'Unknown';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(project);
    }

    return grouped;
  }

  /**
   * Get project summary stats
   */
  async getProjectStats() {
    const projects = await this.getProjectsWithHealth();

    const stats = {
      total: projects.length,
      byStatus: {},
      byHealthLevel: { Healthy: 0, 'Needs Attention': 0, Critical: 0 },
      totalFunding: 0,
      totalRevenue: 0,
      totalPotential: 0,
      avgHealth: 0,
      themes: {},
    };

    for (const project of projects) {
      // By status
      const status = project.status || 'Unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // By health
      stats.byHealthLevel[project.health.level]++;

      // Financials
      stats.totalFunding += project.totalFunding;
      stats.totalRevenue += project.revenueActual;
      stats.totalPotential += project.revenuePotential;
      stats.avgHealth += project.health.overall;

      // Themes
      for (const theme of project.themes) {
        stats.themes[theme] = (stats.themes[theme] || 0) + 1;
      }
    }

    stats.avgHealth = projects.length > 0 ? Math.round(stats.avgHealth / projects.length) : 0;

    return stats;
  }

  /**
   * Get GHL contacts linked to a project
   */
  async getProjectContacts(projectName) {
    if (!db.isConfigured().ghl) return [];

    try {
      const { data: contacts } = await db.ghl
        .from('ghl_contacts')
        .select('*')
        .contains('projects', [projectName.toLowerCase().replace(/\s+/g, '-')]);

      return contacts || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate action recommendations for a project
   */
  generateProjectActions(project) {
    const actions = [];

    // Funding actions
    if (project.health.dimensions.funding < 40) {
      actions.push({
        type: 'funding',
        priority: 'high',
        action: 'Identify new funding opportunities',
        reason: `Only ${Math.round(project.health.dimensions.funding)}% funding secured`,
      });
    }

    // Relationship actions
    if (project.organisationIds.length === 0) {
      actions.push({
        type: 'relationship',
        priority: 'high',
        action: 'Link partner organisations',
        reason: 'No organisations connected to this project',
      });
    }

    if (project.opportunityIds.length === 0 && project.statusNormalized === 'Active') {
      actions.push({
        type: 'opportunity',
        priority: 'medium',
        action: 'Create opportunity pipeline entries',
        reason: 'Active project with no tracked opportunities',
      });
    }

    // Momentum actions
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate > 14 && project.statusNormalized === 'Active') {
      actions.push({
        type: 'update',
        priority: 'medium',
        action: 'Update project status',
        reason: `No updates in ${daysSinceUpdate} days`,
      });
    }

    // Goal alignment
    if (project.goalIds.length === 0) {
      actions.push({
        type: 'alignment',
        priority: 'low',
        action: 'Link to strategic goals',
        reason: 'Project not aligned to any goals',
      });
    }

    return actions;
  }

  /**
   * Get all projects with their recommended actions
   */
  async getProjectsWithActions() {
    const projects = await this.getProjectsWithHealth();

    return projects.map(project => ({
      ...project,
      actions: this.generateProjectActions(project),
    }));
  }

  /**
   * Get pipeline analysis with contacts mapped to stages and projects
   */
  async getProjectPipelineAnalysis() {
    if (!db.isConfigured().ghl) {
      return { pipelines: [], summary: { totalPipelines: 0, totalOpportunities: 0, totalValue: 0, activeProjects: 0 } };
    }

    try {
      // Get pipelines
      const { data: pipelines } = await db.ghl
        .from('ghl_pipelines')
        .select('*');

      // Get opportunities with contact info
      const { data: opportunities } = await db.ghl
        .from('ghl_opportunities')
        .select('*');

      // Get contacts for mapping
      const { data: contacts } = await db.ghl
        .from('ghl_contacts')
        .select('id, ghl_id, first_name, last_name, tags, projects')
        .eq('sync_status', 'synced');

      // Create contact lookup by GHL ID
      const contactLookup = {};
      for (const contact of contacts || []) {
        contactLookup[contact.ghl_id] = contact;
      }

      // Get active projects for reference
      const projects = await this.getProjects();
      const activeProjects = projects.filter(p =>
        p.statusNormalized === 'Active' || p.status?.includes('Active')
      );

      // Build pipeline analysis
      const analysis = [];

      for (const pipeline of pipelines || []) {
        const pipelineOpps = (opportunities || []).filter(o => o.ghl_pipeline_id === pipeline.ghl_id);

        const stageAnalysis = [];
        for (const stage of pipeline.stages || []) {
          const stageOpps = pipelineOpps.filter(o => o.ghl_stage_id === stage.id);

          const contactsInStage = stageOpps.map(opp => {
            const contact = contactLookup[opp.ghl_contact_id];
            return {
              oppId: opp.id,
              oppName: opp.name,
              contactName: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Unknown',
              contactProjects: contact?.projects || [],
              monetaryValue: opp.monetary_value || 0,
              status: opp.status,
            };
          });

          stageAnalysis.push({
            name: stage.name,
            position: stage.position,
            contactCount: contactsInStage.length,
            totalValue: contactsInStage.reduce((sum, c) => sum + c.monetaryValue, 0),
            contacts: contactsInStage,
          });
        }

        analysis.push({
          name: pipeline.name,
          ghlId: pipeline.ghl_id,
          totalOpportunities: pipelineOpps.length,
          totalValue: pipelineOpps.reduce((sum, o) => sum + (o.monetary_value || 0), 0),
          stages: stageAnalysis,
        });
      }

      return {
        pipelines: analysis,
        summary: {
          totalPipelines: pipelines?.length || 0,
          totalOpportunities: opportunities?.length || 0,
          totalValue: opportunities?.reduce((sum, o) => sum + (o.monetary_value || 0), 0) || 0,
          activeProjects: activeProjects.length,
        },
      };
    } catch (err) {
      console.error('Error getting pipeline analysis:', err.message);
      return { pipelines: [], summary: { totalPipelines: 0, totalOpportunities: 0, totalValue: 0, activeProjects: 0 } };
    }
  }

  /**
   * Get single project by name with full details
   */
  async getProjectByName(projectName) {
    const projects = await this.getProjectsWithActions();

    // Try exact match
    let project = projects.find(p => p.name === projectName);

    // Try fuzzy match
    if (!project) {
      const normalized = projectName.toLowerCase();
      project = projects.find(p => p.name.toLowerCase().includes(normalized));
    }

    if (!project) {
      return { error: `Project "${projectName}" not found` };
    }

    // Get linked contacts
    const contacts = await this.getProjectContacts(project.name);

    return {
      ...project,
      linkedContacts: contacts.map(c => ({
        id: c.ghl_id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
        company: c.company_name,
        lastContact: c.last_contact_date,
      })),
    };
  }
}

// Singleton instance
const projectIntelligence = new ProjectIntelligence();

module.exports = { projectIntelligence, ProjectIntelligence, STATUS_WEIGHTS };
module.exports.default = projectIntelligence;
