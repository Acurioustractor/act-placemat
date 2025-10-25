/**
 * Connection Discovery Service
 * Automatically discovers connections between projects using:
 * - Gmail email mining
 * - AI theme matching
 * - Location-based clustering
 *
 * Goal: Move 43 isolated projects (0-5 connections) → resilient (16+ connections)
 */

import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import freeResearchAI from './freeResearchAI.js';

class ConnectionDiscoveryService {
  constructor(gmailService, notionService) {
    this.gmailService = gmailService;
    this.notionService = notionService;
    this.cache = new Map();
  }

  /**
   * Discover connections for a project from Gmail emails
   * Scans emails for mentions of project name and extracts connected entities
   */
  async discoverFromGmail(project, options = {}) {
    const {
      lookbackDays = 365,
      minMentions = 2,
      maxResults = 100
    } = options;

    try {
      logger.info(`🔍 Discovering Gmail connections for: ${project.name}`);

      // Search Gmail for emails mentioning this project
      const searchQuery = this.buildGmailSearchQuery(project.name, lookbackDays);
      const emails = await this.searchGmailMessages(searchQuery, maxResults);

      logger.info(`📧 Found ${emails.length} emails mentioning "${project.name}"`);

      // Extract entities from emails
      const entities = await this.extractEntitiesFromEmails(emails, project);

      // Score connections by confidence
      const scoredConnections = this.scoreConnections(entities, minMentions);

      // Group by type
      const discovered = {
        organizations: scoredConnections.filter(c => c.type === 'organization'),
        people: scoredConnections.filter(c => c.type === 'person'),
        relatedProjects: scoredConnections.filter(c => c.type === 'project'),
        total: scoredConnections.length
      };

      logger.info(`✅ Discovered ${discovered.total} potential connections for ${project.name}`);
      logger.info(`   - Organizations: ${discovered.organizations.length}`);
      logger.info(`   - People: ${discovered.people.length}`);
      logger.info(`   - Projects: ${discovered.relatedProjects.length}`);

      return {
        project: project.name,
        projectId: project.id,
        emailsScanned: emails.length,
        discovered,
        suggestedActions: this.generateSuggestedActions(discovered)
      };

    } catch (error) {
      logger.error(`❌ Gmail discovery failed for ${project.name}:`, error);
      throw error;
    }
  }

  /**
   * Build Gmail search query for project
   */
  buildGmailSearchQuery(projectName, lookbackDays) {
    const now = new Date();
    const cutoffDate = new Date(now - lookbackDays * 24 * 60 * 60 * 1000);
    const dateStr = cutoffDate.toISOString().split('T')[0].replace(/-/g, '/');

    // Search for exact project name in quotes
    return `"${projectName}" after:${dateStr}`;
  }

  /**
   * Search Gmail for messages matching query
   */
  async searchGmailMessages(query, maxResults = 100) {
    if (!this.gmailService.gmail) {
      throw new Error('Gmail not authenticated');
    }

    try {
      const response = await this.gmailService.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      const messages = response.data.messages || [];

      // Fetch full message details in parallel (limit to avoid quota)
      const emailDetails = await Promise.all(
        messages.slice(0, 50).map(msg => this.getMessageDetails(msg.id))
      );

      return emailDetails.filter(e => e !== null);

    } catch (error) {
      logger.error('Gmail search failed:', error);
      return [];
    }
  }

  /**
   * Get full message details
   */
  async getMessageDetails(messageId) {
    try {
      const response = await this.gmailService.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = response.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const cc = headers.find(h => h.name === 'Cc')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Get email body (simplified - just get snippet for now)
      const snippet = response.data.snippet || '';

      return {
        id: messageId,
        subject,
        from,
        to,
        cc,
        date,
        snippet
      };

    } catch (error) {
      logger.error(`Failed to get message ${messageId}:`, error.message);
      return null;
    }
  }

  /**
   * Extract entities (organizations, people, projects) from emails
   */
  async extractEntitiesFromEmails(emails, project) {
    const entities = {
      organizations: new Map(),
      people: new Map(),
      projects: new Map()
    };

    // Get all existing projects from Notion for matching
    const allProjects = await this.notionService.getProjects();
    const projectNames = allProjects.map(p => p.name);

    for (const email of emails) {
      const text = `${email.subject} ${email.snippet} ${email.from} ${email.to} ${email.cc}`;

      // Extract project mentions
      for (const projName of projectNames) {
        if (projName === project.name) continue; // Skip self
        if (text.includes(projName)) {
          if (!entities.projects.has(projName)) {
            entities.projects.set(projName, { name: projName, count: 0, emails: [] });
          }
          const proj = entities.projects.get(projName);
          proj.count++;
          proj.emails.push(email.id);
        }
      }

      // Extract email addresses (people)
      const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
      const emailAddresses = text.match(emailRegex) || [];

      for (const addr of emailAddresses) {
        // Skip common domains (gmail, outlook, etc.) - focus on org emails
        if (addr.includes('@gmail.') || addr.includes('@outlook.') || addr.includes('@hotmail.')) continue;

        if (!entities.people.has(addr)) {
          entities.people.set(addr, { email: addr, count: 0, emails: [] });
        }
        const person = entities.people.get(addr);
        person.count++;
        person.emails.push(email.id);
      }

      // Extract organization names (heuristic: capitalize words, domain names)
      const domainRegex = /@([\w\.-]+)\./g;
      let match;
      while ((match = domainRegex.exec(text)) !== null) {
        const domain = match[1];
        // Clean up domain to get org name
        const orgName = domain.split('.')[0]; // e.g., "mmeic" from "mmeic.org.au"

        if (orgName && orgName.length > 2) {
          if (!entities.organizations.has(orgName)) {
            entities.organizations.set(orgName, { name: orgName, count: 0, emails: [] });
          }
          const org = entities.organizations.get(orgName);
          org.count++;
          org.emails.push(email.id);
        }
      }
    }

    // Convert Maps to arrays
    return {
      organizations: Array.from(entities.organizations.values()),
      people: Array.from(entities.people.values()),
      projects: Array.from(entities.projects.values())
    };
  }

  /**
   * Score connections by confidence (0-1)
   */
  scoreConnections(entities, minMentions = 2) {
    const scored = [];

    // Score organizations
    for (const org of entities.organizations) {
      if (org.count >= minMentions) {
        scored.push({
          type: 'organization',
          name: org.name,
          confidence: Math.min(0.5 + (org.count * 0.1), 0.95), // Cap at 0.95
          evidence: `mentioned in ${org.count} emails`,
          mentionCount: org.count,
          emailIds: org.emails
        });
      }
    }

    // Score people
    for (const person of entities.people) {
      if (person.count >= minMentions) {
        scored.push({
          type: 'person',
          email: person.email,
          name: person.email.split('@')[0], // Simple name extraction
          confidence: Math.min(0.5 + (person.count * 0.1), 0.95),
          evidence: `${person.count} email conversations`,
          mentionCount: person.count,
          emailIds: person.emails
        });
      }
    }

    // Score related projects (higher confidence since these are exact matches)
    for (const proj of entities.projects) {
      if (proj.count >= minMentions) {
        scored.push({
          type: 'project',
          name: proj.name,
          confidence: Math.min(0.7 + (proj.count * 0.05), 0.98), // Higher base confidence
          evidence: `mentioned together in ${proj.count} emails`,
          mentionCount: proj.count,
          emailIds: proj.emails
        });
      }
    }

    // Sort by confidence descending
    return scored.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate suggested actions from discovered connections
   */
  generateSuggestedActions(discovered) {
    const actions = [];

    // High confidence connections (> 0.8)
    const highConfidence = [
      ...discovered.organizations,
      ...discovered.people,
      ...discovered.relatedProjects
    ].filter(c => c.confidence > 0.8);

    for (const conn of highConfidence.slice(0, 10)) { // Top 10
      if (conn.type === 'organization') {
        actions.push(`Add "${conn.name}" as Related Organization (${Math.round(conn.confidence * 100)}% confidence)`);
      } else if (conn.type === 'person') {
        actions.push(`Add ${conn.email} to Related People (${Math.round(conn.confidence * 100)}% confidence)`);
      } else if (conn.type === 'project') {
        actions.push(`Link to project "${conn.name}" (${Math.round(conn.confidence * 100)}% confidence)`);
      }
    }

    return actions;
  }

  /**
   * Discover connections based on shared themes
   */
  async discoverFromThemes(project) {
    try {
      logger.info(`🎨 Discovering theme-based connections for: ${project.name}`);

      const themes = project.themes || [];
      if (themes.length === 0) {
        return { project: project.name, discovered: { sameThemeProjects: [] } };
      }

      // Get all projects with shared themes
      const allProjects = await this.notionService.getProjects();
      const sameThemeProjects = [];

      for (const otherProject of allProjects) {
        if (otherProject.id === project.id) continue;

        const otherThemes = otherProject.themes || [];
        const sharedThemes = themes.filter(t => otherThemes.includes(t));

        if (sharedThemes.length > 0) {
          sameThemeProjects.push({
            name: otherProject.name,
            id: otherProject.id,
            sharedThemes,
            score: sharedThemes.length / themes.length, // Proportion of themes shared
            confidence: 0.7 + (sharedThemes.length * 0.1) // Higher score for more themes
          });
        }
      }

      // Sort by score
      sameThemeProjects.sort((a, b) => b.score - a.score);

      logger.info(`✅ Found ${sameThemeProjects.length} projects with shared themes`);

      return {
        project: project.name,
        projectId: project.id,
        themes,
        discovered: {
          sameThemeProjects: sameThemeProjects.slice(0, 10) // Top 10
        },
        suggestedActions: sameThemeProjects.slice(0, 5).map(p =>
          `Connect with "${p.name}" (shared themes: ${p.sharedThemes.join(', ')})`
        )
      };

    } catch (error) {
      logger.error(`❌ Theme discovery failed for ${project.name}:`, error);
      throw error;
    }
  }

  /**
   * Batch discover connections for multiple projects
   */
  async batchDiscover(projectIds, options = {}) {
    logger.info(`🚀 Starting batch connection discovery for ${projectIds.length} projects`);

    const results = [];

    for (const projectId of projectIds) {
      try {
        const project = await this.notionService.getProjectById(projectId);

        // Run both Gmail and theme-based discovery
        const [gmailResults, themeResults] = await Promise.all([
          this.discoverFromGmail(project, options),
          this.discoverFromThemes(project)
        ]);

        results.push({
          projectId,
          projectName: project.name,
          gmail: gmailResults,
          themes: themeResults,
          totalDiscovered:
            gmailResults.discovered.total +
            themeResults.discovered.sameThemeProjects.length
        });

      } catch (error) {
        logger.error(`Failed to discover connections for ${projectId}:`, error);
        results.push({
          projectId,
          error: error.message
        });
      }
    }

    const totalDiscovered = results.reduce((sum, r) => sum + (r.totalDiscovered || 0), 0);
    logger.info(`✅ Batch discovery complete: ${totalDiscovered} total connections discovered`);

    return {
      projectsProcessed: projectIds.length,
      totalConnectionsDiscovered: totalDiscovered,
      results
    };
  }
}

export default ConnectionDiscoveryService;
