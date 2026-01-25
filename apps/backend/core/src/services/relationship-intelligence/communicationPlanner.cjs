/**
 * Communication Planner Service
 *
 * Generates weekly communication recommendations by combining:
 * - Project health scores
 * - Contact relationship scores
 * - Pipeline stage data
 *
 * Outputs prioritized recommendations for:
 * - Direct outreach (email, calls)
 * - Newsletter features
 * - Social media content
 * - Event invitations
 *
 * Usage:
 *   const { communicationPlanner } = require('./communicationPlanner');
 *
 *   // Get weekly plan
 *   const plan = await communicationPlanner.generateWeeklyPlan();
 *
 *   // Get recommendations for a specific project
 *   const recs = await communicationPlanner.getProjectRecommendations('Project Name');
 *
 *   // Get contact-focused view
 *   const contacts = await communicationPlanner.getContactsNeedingOutreach();
 *
 * Migrated from: act-personal-ai/services/communication-planner.mjs
 */

const { db } = require('./db.cjs');
const { followupDetector } = require('./followupDetector.cjs');

// Relationship score thresholds
const RELATIONSHIP_HEALTHY = 60;
const RELATIONSHIP_WARNING = 30;

// Communication channel recommendations
const CHANNELS = {
  directOutreach: { label: 'Direct Outreach', icon: 'email' },
  newsletter: { label: 'Newsletter Feature', icon: 'newspaper' },
  social: { label: 'Social Media', icon: 'share' },
  event: { label: 'Event Invitation', icon: 'calendar' },
  call: { label: 'Phone/Video Call', icon: 'phone' },
};

class CommunicationPlanner {
  constructor() {
    this.projectsCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Normalize project name for matching
   */
  normalizeProjectName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Get contacts needing attention with relationship context
   */
  async getContactsNeedingAttention(daysThreshold = 25) {
    const { followups } = await followupDetector.detectAll();

    // Filter to just relationship-based follow-ups
    const relationshipFollowups = followups.filter(f =>
      f.type === 'stale_relationship' && f.days >= daysThreshold
    );

    // Enrich with additional project data
    if (!db.isConfigured().ghl) return relationshipFollowups;

    try {
      const { data: allContacts } = await db.ghl
        .from('ghl_contacts')
        .select('id, ghl_id, first_name, last_name, email, company_name, tags, projects')
        .eq('sync_status', 'synced');

      const contactLookup = {};
      for (const c of allContacts || []) {
        contactLookup[c.ghl_id] = c;
      }

      return relationshipFollowups.map(f => ({
        ...f,
        contact: {
          id: f.contactId,
          first_name: contactLookup[f.contactId]?.first_name,
          last_name: contactLookup[f.contactId]?.last_name,
          email: f.email,
        },
        projects: f.projects || contactLookup[f.contactId]?.projects || [],
        tags: f.tags || contactLookup[f.contactId]?.tags || [],
        company: contactLookup[f.contactId]?.company_name,
        relationshipScore: f.engagementScore || 50, // Default to 50 if not available
      }));
    } catch {
      return relationshipFollowups;
    }
  }

  /**
   * Get active projects with basic health info
   * Uses Notion Projects database if configured
   */
  async getActiveProjects() {
    // Use cache if fresh (less than 5 minutes old)
    const cacheAge = this.cacheTimestamp ? Date.now() - this.cacheTimestamp : Infinity;
    if (this.projectsCache && cacheAge < 5 * 60 * 1000) {
      return this.projectsCache;
    }

    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const PROJECTS_DATABASE_ID = process.env.NOTION_PROJECTS_DB || '177ebcf9-81cf-80dd-9514-f1ec32f3314c';

    if (!NOTION_TOKEN) {
      return [];
    }

    try {
      const response = await fetch(
        `https://api.notion.com/v1/databases/${PROJECTS_DATABASE_ID}/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            page_size: 100,
            filter: {
              property: 'Status',
              select: { equals: 'Active' },
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Notion API error:', response.status);
        return [];
      }

      const data = await response.json();

      const projects = (data.results || []).map(page => {
        const props = page.properties;
        return {
          id: page.id,
          name: props.Name?.title?.[0]?.plain_text || 'Unknown',
          status: props.Status?.select?.name || 'Active',
          themes: (props.Theme?.multi_select || []).map(t => t.name),
          health: {
            overall: 50, // Default health score
            level: 'Unknown',
          },
        };
      });

      this.projectsCache = projects;
      this.cacheTimestamp = Date.now();

      return projects;
    } catch (err) {
      console.error('Error fetching projects:', err.message);
      return [];
    }
  }

  /**
   * Match contacts to projects by tags, company, or explicit project field
   */
  matchContactToProjects(contact, projects) {
    const matches = [];
    const contactTags = (contact.tags || []).map(t => this.normalizeProjectName(t));
    const contactProjects = (contact.projects || []).map(p => this.normalizeProjectName(p));
    const contactCompany = this.normalizeProjectName(contact.company || '');

    for (const project of projects) {
      const projectNorm = this.normalizeProjectName(project.name);

      // Match by explicit project field
      if (contactProjects.some(p => p.includes(projectNorm) || projectNorm.includes(p))) {
        matches.push(project);
        continue;
      }

      // Match by tags
      if (contactTags.some(t => t.includes(projectNorm) || projectNorm.includes(t))) {
        matches.push(project);
        continue;
      }

      // Match by company
      if (contactCompany && (contactCompany.includes(projectNorm) || projectNorm.includes(contactCompany))) {
        matches.push(project);
      }
    }

    return matches;
  }

  /**
   * Generate communication recommendations
   */
  async generateRecommendations() {
    // Get active projects
    const projects = await this.getActiveProjects();

    // Get contacts needing attention
    const contactsNeedingAttention = await this.getContactsNeedingAttention();

    // Build recommendations by priority
    const recommendations = {
      high: [],
      medium: [],
      low: [],
      projectSpecific: {},
    };

    // Initialize project-specific recommendations
    for (const project of projects) {
      recommendations.projectSpecific[project.name] = {
        project,
        contacts: [],
        channels: new Set(),
        priority: 'low',
        reasons: [],
      };
    }

    // Process contacts needing attention
    for (const contactData of contactsNeedingAttention) {
      const matchedProjects = this.matchContactToProjects(contactData, projects);
      const contactName = contactData.contactName ||
        `${contactData.contact?.first_name || ''} ${contactData.contact?.last_name || ''}`.trim() ||
        contactData.email;

      // Determine priority based on relationship score and days since contact
      let priority = 'low';
      if (contactData.relationshipScore < RELATIONSHIP_WARNING || contactData.days > 60) {
        priority = 'high';
      } else if (contactData.relationshipScore < RELATIONSHIP_HEALTHY || contactData.days > 30) {
        priority = 'medium';
      }

      // Determine recommended channel
      let channel = 'directOutreach';
      if (contactData.days > 90) {
        channel = 'call'; // Long absence needs personal touch
      } else if (contactData.days === null) {
        channel = 'newsletter'; // New contacts get newsletter first
      }

      const recommendation = {
        contact: contactName,
        email: contactData.email,
        company: contactData.company,
        daysSince: contactData.days,
        relationshipScore: contactData.relationshipScore,
        suggestedAction: contactData.suggestedAction,
        channel,
        projects: matchedProjects.map(p => p.name),
      };

      // Add to general priority lists
      recommendations[priority].push(recommendation);

      // Add to project-specific lists
      for (const project of matchedProjects) {
        recommendations.projectSpecific[project.name].contacts.push(recommendation);
        recommendations.projectSpecific[project.name].channels.add(channel);

        // Escalate project priority if needed
        if (priority === 'high') {
          recommendations.projectSpecific[project.name].priority = 'high';
          recommendations.projectSpecific[project.name].reasons.push(
            `${contactName} relationship cooling (${contactData.relationshipScore}%)`
          );
        } else if (priority === 'medium' && recommendations.projectSpecific[project.name].priority !== 'high') {
          recommendations.projectSpecific[project.name].priority = 'medium';
          recommendations.projectSpecific[project.name].reasons.push(
            `${contactName} needs follow-up (${contactData.days} days)`
          );
        }
      }
    }

    // Check project health to add project-level recommendations
    for (const project of projects) {
      const rec = recommendations.projectSpecific[project.name];

      // Low health projects need newsletter/social attention
      if (project.health.overall < 40) {
        rec.channels.add('newsletter');
        rec.channels.add('social');
        rec.reasons.push(`Low project health (${project.health.overall}%)`);
        if (rec.priority !== 'high') rec.priority = 'high';
      } else if (project.health.overall < 60) {
        rec.channels.add('newsletter');
        rec.reasons.push(`Project needs attention (${project.health.overall}%)`);
        if (rec.priority === 'low') rec.priority = 'medium';
      }

      // Projects with no contacts need outreach campaign
      if (rec.contacts.length === 0) {
        rec.channels.add('social');
        rec.channels.add('newsletter');
        rec.reasons.push('No active contacts linked');
        if (rec.priority === 'low') rec.priority = 'medium';
      }
    }

    return recommendations;
  }

  /**
   * Generate weekly communication plan
   */
  async generateWeeklyPlan() {
    const recommendations = await this.generateRecommendations();

    // Build summary
    const summary = {
      generated: new Date().toISOString(),
      totalContacts: recommendations.high.length + recommendations.medium.length + recommendations.low.length,
      highPriority: recommendations.high.length,
      mediumPriority: recommendations.medium.length,
      lowPriority: recommendations.low.length,
    };

    // Get priority project recommendations
    const priorityProjects = Object.entries(recommendations.projectSpecific)
      .filter(([_, r]) => r.priority === 'high' || r.priority === 'medium')
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      })
      .slice(0, 10)
      .map(([name, rec]) => ({
        name,
        priority: rec.priority,
        contactCount: rec.contacts.length,
        channels: Array.from(rec.channels),
        reasons: rec.reasons.slice(0, 3),
        health: rec.project.health.overall,
      }));

    // Get newsletter content suggestions
    const newsletterProjects = Object.entries(recommendations.projectSpecific)
      .filter(([_, r]) => r.channels.has('newsletter'))
      .sort((a, b) => a[1].project.health.overall - b[1].project.health.overall)
      .slice(0, 5)
      .map(([name, rec]) => ({
        name,
        theme: rec.project.themes[0] || 'General',
        health: rec.project.health.overall,
      }));

    return {
      summary,
      highPriority: recommendations.high.slice(0, 15).map(r => ({
        contact: r.contact,
        email: r.email,
        company: r.company,
        daysSince: r.daysSince,
        relationshipScore: r.relationshipScore,
        suggestedAction: r.suggestedAction,
        channel: r.channel,
        channelInfo: CHANNELS[r.channel],
        projects: r.projects,
      })),
      mediumPriority: recommendations.medium.slice(0, 10).map(r => ({
        contact: r.contact,
        email: r.email,
        daysSince: r.daysSince,
        suggestedAction: r.suggestedAction,
        channel: r.channel,
        projects: r.projects,
      })),
      priorityProjects,
      newsletterSuggestions: newsletterProjects,
      nextSteps: [
        'Address HIGH PRIORITY contacts this week',
        'Schedule newsletter with suggested project features',
        'Plan social media posts for low-visibility projects',
        'Review MEDIUM priority contacts for next week',
      ],
    };
  }

  /**
   * Get recommendations for a specific project
   */
  async getProjectRecommendations(projectName) {
    const recommendations = await this.generateRecommendations();

    // Try exact match first
    let rec = recommendations.projectSpecific[projectName];

    // Try fuzzy match
    if (!rec) {
      const match = Object.keys(recommendations.projectSpecific).find(
        p => this.normalizeProjectName(p).includes(this.normalizeProjectName(projectName))
      );
      if (match) {
        rec = recommendations.projectSpecific[match];
        projectName = match;
      }
    }

    if (!rec) {
      return { error: `Project "${projectName}" not found` };
    }

    return {
      project: projectName,
      priority: rec.priority,
      health: rec.project.health.overall,
      healthLevel: rec.project.health.level,
      themes: rec.project.themes,
      channels: Array.from(rec.channels).map(c => ({
        id: c,
        ...CHANNELS[c],
      })),
      reasons: rec.reasons,
      contacts: rec.contacts.map(c => ({
        name: c.contact,
        email: c.email,
        daysSince: c.daysSince,
        relationshipScore: c.relationshipScore,
        suggestedAction: c.suggestedAction,
        channel: c.channel,
      })),
      contactCount: rec.contacts.length,
    };
  }

  /**
   * Get contacts needing outreach (contact-focused view)
   */
  async getContactsNeedingOutreach() {
    const contacts = await this.getContactsNeedingAttention();
    const projects = await this.getActiveProjects();

    // Group by relationship score ranges
    const critical = contacts.filter(c => c.relationshipScore < 20);
    const warning = contacts.filter(c => c.relationshipScore >= 20 && c.relationshipScore < 40);
    const attention = contacts.filter(c => c.relationshipScore >= 40 && c.relationshipScore < 60);

    const enriched = (list) => list.map(c => {
      const matchedProjects = this.matchContactToProjects(c, projects);
      return {
        name: c.contactName || `${c.contact?.first_name || ''} ${c.contact?.last_name || ''}`.trim(),
        email: c.email,
        company: c.company,
        daysSince: c.days,
        relationshipScore: c.relationshipScore,
        suggestedAction: c.suggestedAction,
        projects: matchedProjects.map(p => p.name),
      };
    });

    return {
      generated: new Date().toISOString(),
      total: contacts.length,
      critical: {
        count: critical.length,
        contacts: enriched(critical).slice(0, 15),
      },
      warning: {
        count: warning.length,
        contacts: enriched(warning).slice(0, 10),
      },
      attention: {
        count: attention.length,
        contacts: enriched(attention).slice(0, 5),
      },
    };
  }
}

// Singleton instance
const communicationPlanner = new CommunicationPlanner();

module.exports = {
  communicationPlanner,
  CommunicationPlanner,
  CHANNELS,
  RELATIONSHIP_HEALTHY,
  RELATIONSHIP_WARNING,
};
module.exports.default = communicationPlanner;
