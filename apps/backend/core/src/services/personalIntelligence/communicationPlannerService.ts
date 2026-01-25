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
 * Migrated from: act-personal-ai/services/communication-planner.mjs
 */

import { db } from './databaseHelper.js';
import {
  CommunicationChannel,
  CommunicationPriority,
  ChannelInfo,
  ContactRecommendation,
  ProjectRecommendation,
  CommunicationRecommendations,
  ProjectHealth,
} from './types.js';

// Relationship score thresholds
const RELATIONSHIP_HEALTHY = 60;
const RELATIONSHIP_WARNING = 30;

// Communication channel definitions
export const CHANNELS: Record<CommunicationChannel, ChannelInfo> = {
  directOutreach: { label: 'Direct Outreach', icon: 'email' },
  newsletter: { label: 'Newsletter Feature', icon: 'news' },
  social: { label: 'Social Media', icon: 'share' },
  event: { label: 'Event Invitation', icon: 'event' },
  call: { label: 'Phone/Video Call', icon: 'phone' },
};

/**
 * Communication Planner Service class
 * Generates prioritized communication recommendations
 */
export class CommunicationPlannerService {
  /**
   * Normalize project name for matching
   *
   * @param name - Project name to normalize
   * @returns Normalized name (lowercase alphanumeric only)
   */
  normalizeProjectName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Match contacts to projects by tags, company, or explicit project field
   *
   * @param contact - Contact object with projects, tags, and company
   * @param projects - Array of project objects
   * @returns Array of matched projects
   */
  matchContactToProjects(
    contact: { projects?: string[]; tags?: string[]; company?: string },
    projects: { name: string }[]
  ): { name: string }[] {
    const matches: { name: string }[] = [];
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
   * Determine priority based on relationship score and days since contact
   *
   * @param relationshipScore - Score from 0-100
   * @param daysSince - Days since last contact
   * @returns Priority level
   */
  determinePriority(relationshipScore: number, daysSince: number | null): CommunicationPriority {
    const days = daysSince ?? 0;

    if (relationshipScore < RELATIONSHIP_WARNING || days > 60) {
      return 'high';
    }
    if (relationshipScore < RELATIONSHIP_HEALTHY || days > 30) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine recommended communication channel
   *
   * @param daysSince - Days since last contact (null for new contacts)
   * @returns Recommended channel
   */
  determineChannel(daysSince: number | null): CommunicationChannel {
    if (daysSince === null) {
      return 'newsletter'; // New contacts get newsletter first
    }
    if (daysSince > 90) {
      return 'call'; // Long absence needs personal touch
    }
    return 'directOutreach';
  }

  /**
   * Get contacts needing attention with relationship context
   *
   * @param daysThreshold - Days threshold for staleness
   * @returns Promise resolving to array of contacts needing attention
   */
  async getContactsNeedingAttention(daysThreshold: number = 25): Promise<any[]> {
    if (!db.isConfigured().ghl) return [];

    try {
      const { data: allContacts } = await db.ghl
        .from('ghl_contacts')
        .select('id, ghl_id, first_name, last_name, email, company_name, tags, projects, last_contact_date')
        .eq('sync_status', 'synced');

      const now = new Date();
      const contacts: any[] = [];

      for (const c of allContacts || []) {
        const lastContactDate = c.last_contact_date ? new Date(c.last_contact_date) : null;
        const daysSince = lastContactDate
          ? Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // Only include contacts that need attention
        if (daysSince === null || daysSince >= daysThreshold) {
          // Calculate a basic relationship score based on days
          const relationshipScore = daysSince === null ? 0 :
                                    daysSince <= 7 ? 80 :
                                    daysSince <= 30 ? 60 :
                                    daysSince <= 60 ? 40 :
                                    daysSince <= 90 ? 20 : 10;

          contacts.push({
            contact: {
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              email: c.email,
            },
            daysSince,
            relationshipScore,
            suggestedAction: this.getSuggestedAction(daysSince, c.tags),
            projects: c.projects || [],
            tags: c.tags || [],
            company: c.company_name,
          });
        }
      }

      return contacts;
    } catch (error) {
      console.error('Error getting contacts needing attention:', (error as Error).message);
      return [];
    }
  }

  /**
   * Get suggested action based on time since contact
   *
   * @param daysSince - Days since last contact
   * @param tags - Contact tags
   * @returns Suggested action string
   */
  private getSuggestedAction(daysSince: number | null, tags: string[] | null): string {
    if (daysSince === null) {
      return 'Introduce yourself - no contact history';
    }
    if (daysSince > 90) {
      return 'Schedule reconnection call';
    }
    if (tags?.some(t => t.toLowerCase().includes('funder'))) {
      return 'Send project update';
    }
    if (tags?.some(t => t.toLowerCase().includes('partner'))) {
      return 'Check in on collaboration';
    }
    return 'Send check-in email';
  }

  /**
   * Generate communication recommendations
   *
   * @param projects - Array of active projects with health data
   * @returns Promise resolving to communication recommendations
   */
  async generateRecommendations(
    projects: (ProjectHealth & { themes?: string[] })[]
  ): Promise<CommunicationRecommendations> {
    const recommendations: CommunicationRecommendations = {
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

    // Get contacts needing attention
    const contactsNeedingAttention = await this.getContactsNeedingAttention();

    // Process contacts
    for (const contactData of contactsNeedingAttention) {
      const { contact, daysSince, relationshipScore, suggestedAction } = contactData;
      const matchedProjects = this.matchContactToProjects(contactData, projects);
      const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;

      const priority = this.determinePriority(relationshipScore, daysSince);
      const channel = this.determineChannel(daysSince);

      const recommendation: ContactRecommendation = {
        contact: contactName,
        email: contact.email,
        company: contactData.company,
        daysSince,
        relationshipScore,
        suggestedAction,
        channel,
        projects: matchedProjects.map(p => p.name),
      };

      // Add to general priority lists
      recommendations[priority].push(recommendation);

      // Add to project-specific lists
      for (const project of matchedProjects) {
        const projectRec = recommendations.projectSpecific[project.name];
        if (projectRec) {
          projectRec.contacts.push(recommendation);
          projectRec.channels.add(channel);

          // Escalate project priority if needed
          if (priority === 'high') {
            projectRec.priority = 'high';
            projectRec.reasons.push(`${contactName} relationship cooling (${relationshipScore}%)`);
          } else if (priority === 'medium' && projectRec.priority !== 'high') {
            projectRec.priority = 'medium';
            projectRec.reasons.push(`${contactName} needs follow-up (${daysSince} days)`);
          }
        }
      }
    }

    // Check project health to add project-level recommendations
    for (const project of projects) {
      const rec = recommendations.projectSpecific[project.name];
      if (!rec) continue;

      // Get numeric health if available
      const healthNum = typeof (project as any).health?.overall === 'number'
        ? (project as any).health.overall
        : project.health === 'Healthy' ? 80 : 40;

      // Low health projects need newsletter/social attention
      if (healthNum < 40) {
        rec.channels.add('newsletter');
        rec.channels.add('social');
        rec.reasons.push(`Low project health (${healthNum}%)`);
        if (rec.priority !== 'high') rec.priority = 'high';
      } else if (healthNum < 60) {
        rec.channels.add('newsletter');
        rec.reasons.push(`Project needs attention (${healthNum}%)`);
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
   * Get newsletter content suggestions based on project health
   *
   * @param projectRecs - Map of project recommendations
   * @returns Array of project names to feature in newsletter
   */
  getNewsletterSuggestions(
    projectRecs: Record<string, ProjectRecommendation>
  ): { name: string; health: number; theme?: string }[] {
    return Object.entries(projectRecs)
      .filter(([_, r]) => r.channels.has('newsletter'))
      .map(([name, r]) => ({
        name,
        health: typeof (r.project as any).health?.overall === 'number'
          ? (r.project as any).health.overall
          : 50,
        theme: (r.project as any).themes?.[0],
      }))
      .sort((a, b) => a.health - b.health)
      .slice(0, 5);
  }
}

// Singleton instance
export const communicationPlanner = new CommunicationPlannerService();

export default communicationPlanner;
