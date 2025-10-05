/**
 * Intelligent Newsletter Service
 * AI-powered newsletter generation with project updates and strategic messaging
 */

import { createClient } from '@supabase/supabase-js';
import MultiProviderAI from './multiProviderAI.js';

class IntelligentNewsletterService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.ai = new MultiProviderAI();
  }

  /**
   * Generate comprehensive newsletter with project updates and strategic insights
   */
  async generateIntelligentNewsletter(options = {}) {
    try {
      const {
        audience_type = 'general',
        include_projects = true,
        include_contacts = true,
        include_insights = true,
        include_opportunities = true,
        frequency = 'weekly',
        max_projects = 10,
        max_insights = 5
      } = options;

      console.log('🗞️ Generating intelligent newsletter...');

      // Gather newsletter content from various sources
      const newsletterData = await Promise.all([
        this.getProjectUpdates(max_projects),
        this.getStrategicInsights(max_insights),
        this.getNetworkHighlights(),
        this.getOpportunityAlerts(),
        this.getActivitySummary(frequency),
        this.getCommunityHighlights()
      ]);

      const [
        projectUpdates,
        strategicInsights,
        networkHighlights,
        opportunityAlerts,
        activitySummary,
        communityHighlights
      ] = newsletterData;

      // Generate AI-powered newsletter content
      const newsletter = await this.generateNewsletterContent({
        audience_type,
        frequency,
        projectUpdates,
        strategicInsights,
        networkHighlights,
        opportunityAlerts,
        activitySummary,
        communityHighlights
      });

      // Store newsletter in database
      await this.storeNewsletter(newsletter);

      return {
        success: true,
        newsletter,
        generation_stats: {
          projects_included: projectUpdates.length,
          insights_included: strategicInsights.length,
          opportunities_included: opportunityAlerts.length,
          total_word_count: this.estimateWordCount(newsletter.content)
        },
        message: `Intelligent newsletter generated successfully for ${audience_type} audience`
      };

    } catch (error) {
      console.error('Error generating intelligent newsletter:', error);
      return {
        success: false,
        error: 'Failed to generate intelligent newsletter',
        message: error.message
      };
    }
  }

  /**
   * Get project updates from Notion database
   */
  async getProjectUpdates(maxProjects = 10) {
    try {
      const { data: projects, error } = await this.supabase
        .from('notion_projects')
        .select(`
          id,
          project_name,
          project_description,
          status,
          priority_level,
          progress_percentage,
          key_milestones,
          recent_activities,
          next_steps,
          team_members,
          budget_status,
          timeline_status,
          created_at,
          updated_at
        `)
        .in('status', ['active', 'in_progress', 'recently_completed'])
        .order('priority_level', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(maxProjects);

      if (error) {
        console.error('Error fetching project updates:', error);
        return [];
      }

      // Enrich projects with recent activity and progress insights
      return (projects || []).map(project => ({
        ...project,
        progress_trend: this.calculateProgressTrend(project),
        key_achievements: this.extractKeyAchievements(project),
        upcoming_milestones: this.extractUpcomingMilestones(project),
        team_size: project.team_members ? project.team_members.length : 0,
        days_since_update: this.calculateDaysSinceUpdate(project.updated_at)
      }));

    } catch (error) {
      console.error('Error in getProjectUpdates:', error);
      return [];
    }
  }

  /**
   * Get strategic insights from contact intelligence and network analysis
   */
  async getStrategicInsights(maxInsights = 5) {
    try {
      const insights = [];

      // Get relationship insights
      const { data: relationshipStats } = await this.supabase
        .from('linkedin_contacts')
        .select('strategic_value, relationship_score, industry, current_company')
        .gte('strategic_value', 7);

      if (relationshipStats && relationshipStats.length > 0) {
        insights.push({
          type: 'network_growth',
          title: 'Strategic Network Expansion',
          insight: `Network includes ${relationshipStats.length} high-value contacts across ${this.countUniqueValues(relationshipStats, 'industry')} industries`,
          data: {
            total_strategic_contacts: relationshipStats.length,
            top_industries: this.getTopValues(relationshipStats, 'industry', 3),
            avg_strategic_value: this.calculateAverage(relationshipStats, 'strategic_value')
          }
        });
      }

      // Get project completion insights
      const { data: projectStats } = await this.supabase
        .from('notion_projects')
        .select('status, priority_level, progress_percentage')
        .neq('status', 'archived');

      if (projectStats && projectStats.length > 0) {
        const completedProjects = projectStats.filter(p => p.status === 'completed').length;
        const activeProjects = projectStats.filter(p => p.status === 'active').length;
        const avgProgress = this.calculateAverage(projectStats, 'progress_percentage');

        insights.push({
          type: 'project_momentum',
          title: 'Project Portfolio Performance',
          insight: `${activeProjects} active projects with ${Math.round(avgProgress)}% average completion rate`,
          data: {
            total_projects: projectStats.length,
            completed_projects: completedProjects,
            active_projects: activeProjects,
            average_progress: avgProgress
          }
        });
      }

      // Get interaction insights
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: recentInteractions } = await this.supabase
        .from('email_interactions')
        .select('contact_id, interaction_type')
        .gte('received_date', sevenDaysAgo.toISOString());

      if (recentInteractions && recentInteractions.length > 0) {
        insights.push({
          type: 'engagement_velocity',
          title: 'Communication Momentum',
          insight: `${recentInteractions.length} new interactions this week with key contacts`,
          data: {
            weekly_interactions: recentInteractions.length,
            unique_contacts: this.countUniqueValues(recentInteractions, 'contact_id'),
            interaction_types: this.getTopValues(recentInteractions, 'interaction_type', 3)
          }
        });
      }

      return insights.slice(0, maxInsights);

    } catch (error) {
      console.error('Error generating strategic insights:', error);
      return [];
    }
  }

  /**
   * Get network highlights and key relationship updates
   */
  async getNetworkHighlights() {
    try {
      const highlights = [];

      // Get recently added high-value contacts
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: newContacts } = await this.supabase
        .from('linkedin_contacts')
        .select('full_name, current_company, strategic_value')
        .gte('created_at', sevenDaysAgo.toISOString())
        .gte('strategic_value', 7)
        .order('strategic_value', { ascending: false })
        .limit(5);

      if (newContacts && newContacts.length > 0) {
        highlights.push({
          type: 'new_strategic_contacts',
          title: 'New Strategic Connections',
          contacts: newContacts,
          summary: `Added ${newContacts.length} high-value contacts this week`
        });
      }

      // Get contacts with recent high engagement
      const { data: activeContacts } = await this.supabase
        .from('email_interactions')
        .select(`
          contact_id,
          linkedin_contacts!inner(full_name, current_company, strategic_value)
        `)
        .gte('received_date', sevenDaysAgo.toISOString())
        .gte('linkedin_contacts.strategic_value', 6);

      if (activeContacts && activeContacts.length > 0) {
        const uniqueActiveContacts = this.deduplicateByField(activeContacts, 'contact_id')
          .slice(0, 5);

        highlights.push({
          type: 'active_relationships',
          title: 'Recently Active Relationships',
          contacts: uniqueActiveContacts.map(c => c.linkedin_contacts),
          summary: `${uniqueActiveContacts.length} strategic contacts have been highly engaged this week`
        });
      }

      return highlights;

    } catch (error) {
      console.error('Error getting network highlights:', error);
      return [];
    }
  }

  /**
   * Get opportunity alerts and strategic recommendations
   */
  async getOpportunityAlerts() {
    try {
      const alerts = [];

      // Get project-contact linkage opportunities
      const { data: linkageOpportunities } = await this.supabase
        .from('project_contact_linkages')
        .select(`
          relevance_score,
          specific_value,
          collaboration_type,
          suggested_approach,
          notion_projects!inner(project_name),
          linkedin_contacts!inner(full_name, current_company)
        `)
        .is('status', null) // Unactioned opportunities
        .gte('relevance_score', 80)
        .order('relevance_score', { ascending: false })
        .limit(5);

      if (linkageOpportunities && linkageOpportunities.length > 0) {
        alerts.push({
          type: 'collaboration_opportunities',
          title: 'High-Value Collaboration Opportunities',
          opportunities: linkageOpportunities,
          summary: `${linkageOpportunities.length} high-relevance project-contact matches ready for action`
        });
      }

      // Get overdue follow-ups
      const { data: overdueFollowups } = await this.supabase
        .from('linkedin_contacts')
        .select('full_name, current_company, strategic_value, last_interaction')
        .gte('strategic_value', 7)
        .lt('last_interaction', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('strategic_value', { ascending: false })
        .limit(5);

      if (overdueFollowups && overdueFollowups.length > 0) {
        alerts.push({
          type: 'follow_up_alerts',
          title: 'Strategic Relationships Need Attention',
          contacts: overdueFollowups,
          summary: `${overdueFollowups.length} high-value contacts haven't been contacted in 2+ weeks`
        });
      }

      return alerts;

    } catch (error) {
      console.error('Error getting opportunity alerts:', error);
      return [];
    }
  }

  /**
   * Get activity summary for specified period
   */
  async getActivitySummary(frequency = 'weekly') {
    try {
      const days = frequency === 'monthly' ? 30 : 7;
      const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [emailCount, meetingCount, newContactCount, projectUpdateCount] = await Promise.all([
        // Email interactions
        this.supabase
          .from('email_interactions')
          .select('*', { count: 'exact', head: true })
          .gte('received_date', periodStart.toISOString())
          .then(({ count }) => count || 0),

        // Meeting count
        this.supabase
          .from('calendar_events')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', periodStart.toISOString())
          .then(({ count }) => count || 0),

        // New contacts
        this.supabase
          .from('linkedin_contacts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', periodStart.toISOString())
          .then(({ count }) => count || 0),

        // Project updates
        this.supabase
          .from('notion_projects')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', periodStart.toISOString())
          .then(({ count }) => count || 0)
      ]);

      return {
        period: frequency,
        days: days,
        email_interactions: emailCount,
        meetings_attended: meetingCount,
        new_contacts_added: newContactCount,
        projects_updated: projectUpdateCount,
        activity_score: Math.round(((emailCount + meetingCount + newContactCount + projectUpdateCount) / days) * 10) / 10
      };

    } catch (error) {
      console.error('Error getting activity summary:', error);
      return {
        period: frequency,
        days: frequency === 'monthly' ? 30 : 7,
        email_interactions: 0,
        meetings_attended: 0,
        new_contacts_added: 0,
        projects_updated: 0,
        activity_score: 0
      };
    }
  }

  /**
   * Get community highlights from stories and themes
   */
  async getCommunityHighlights() {
    try {
      const highlights = [];

      // Get recent stories
      const { data: recentStories } = await this.supabase
        .from('stories')
        .select('title, summary, themes, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentStories && recentStories.length > 0) {
        highlights.push({
          type: 'community_stories',
          title: 'Latest Community Stories',
          stories: recentStories,
          summary: `${recentStories.length} new community stories shared recently`
        });
      }

      // Get active themes
      const { data: activeThemes } = await this.supabase
        .from('themes')
        .select('name, description, story_count')
        .eq('status', 'active')
        .order('story_count', { ascending: false })
        .limit(5);

      if (activeThemes && activeThemes.length > 0) {
        highlights.push({
          type: 'trending_themes',
          title: 'Trending Community Themes',
          themes: activeThemes,
          summary: `${activeThemes.length} themes are actively engaging the community`
        });
      }

      return highlights;

    } catch (error) {
      console.error('Error getting community highlights:', error);
      return [];
    }
  }

  /**
   * Generate AI-powered newsletter content
   */
  async generateNewsletterContent(data) {
    try {
      const {
        audience_type,
        frequency,
        projectUpdates,
        strategicInsights,
        networkHighlights,
        opportunityAlerts,
        activitySummary,
        communityHighlights
      } = data;

      const aiPrompt = `
        Generate a professional, engaging newsletter for ACT Community with the following data:

        AUDIENCE: ${audience_type} (adjust tone and focus accordingly)
        FREQUENCY: ${frequency}

        PROJECT UPDATES (${projectUpdates.length} projects):
        ${projectUpdates.map(p => `
        - ${p.project_name}: ${p.status} (${p.progress_percentage}% complete)
          ${p.project_description}
          Key achievements: ${p.key_achievements}
          Next steps: ${p.next_steps}
        `).join('\n')}

        STRATEGIC INSIGHTS:
        ${strategicInsights.map(i => `
        - ${i.title}: ${i.insight}
        `).join('\n')}

        NETWORK HIGHLIGHTS:
        ${networkHighlights.map(h => `
        - ${h.title}: ${h.summary}
        `).join('\n')}

        OPPORTUNITY ALERTS:
        ${opportunityAlerts.map(a => `
        - ${a.title}: ${a.summary}
        `).join('\n')}

        ACTIVITY SUMMARY:
        This ${activitySummary.period}: ${activitySummary.email_interactions} email interactions,
        ${activitySummary.meetings_attended} meetings, ${activitySummary.new_contacts_added} new contacts,
        ${activitySummary.projects_updated} project updates

        COMMUNITY HIGHLIGHTS:
        ${communityHighlights.map(h => `
        - ${h.title}: ${h.summary}
        `).join('\n')}

        Generate a newsletter with:
        1. Compelling subject line
        2. Executive summary (2-3 sentences)
        3. Project spotlight section
        4. Strategic insights section
        5. Network & relationship updates
        6. Opportunities requiring action
        7. Community highlights
        8. Forward-looking statements

        Use professional Australian English, maintain ACT's collaborative tone,
        and include actionable insights where possible.

        Format as JSON with these fields:
        {
          "subject_line": "...",
          "executive_summary": "...",
          "content": "... (full HTML newsletter content)",
          "key_themes": ["...", "..."],
          "call_to_actions": ["...", "..."],
          "next_edition_preview": "..."
        }
      `;

      const aiResponse = await this.ai.generateResponse(aiPrompt, {
        maxTokens: 3000,
        temperature: 0.7
      });

      // Parse AI response
      let newsletterContent;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          newsletterContent = JSON.parse(jsonMatch[0]);
        } else {
          newsletterContent = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        // Fallback to structured content
        newsletterContent = this.generateFallbackNewsletter(data);
      }

      return {
        id: `newsletter_${Date.now()}`,
        generated_at: new Date().toISOString(),
        audience_type,
        frequency,
        ...newsletterContent,
        data_sources: {
          projects: projectUpdates.length,
          insights: strategicInsights.length,
          highlights: networkHighlights.length + communityHighlights.length,
          alerts: opportunityAlerts.length
        }
      };

    } catch (error) {
      console.error('Error generating newsletter content:', error);
      return this.generateFallbackNewsletter(data);
    }
  }

  /**
   * Generate fallback newsletter content if AI fails
   */
  generateFallbackNewsletter(data) {
    const { frequency, projectUpdates, activitySummary } = data;

    return {
      id: `newsletter_${Date.now()}`,
      generated_at: new Date().toISOString(),
      subject_line: `ACT Community ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Update`,
      executive_summary: `This ${frequency} we've made progress across ${projectUpdates.length} active projects with ${activitySummary.activity_score} daily activity score.`,
      content: this.generateBasicNewsletterHTML(data),
      key_themes: ['project_updates', 'network_growth', 'community_engagement'],
      call_to_actions: ['Review project opportunities', 'Connect with new contacts', 'Engage with community'],
      next_edition_preview: `Next ${frequency} we'll focus on project outcomes and partnership opportunities.`
    };
  }

  /**
   * Generate basic HTML newsletter content
   */
  generateBasicNewsletterHTML(data) {
    const { projectUpdates, strategicInsights, activitySummary } = data;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">ACT Community Update</h1>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>Project Highlights</h2>
          ${projectUpdates.slice(0, 3).map(project => `
            <div style="margin: 15px 0; padding: 15px; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 10px 0;">${project.project_name}</h3>
              <p>${project.project_description}</p>
              <div style="font-size: 14px; color: #6b7280;">
                Status: ${project.status} • Progress: ${project.progress_percentage}%
              </div>
            </div>
          `).join('')}
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>Strategic Insights</h2>
          ${strategicInsights.slice(0, 2).map(insight => `
            <div style="margin: 15px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">${insight.title}</h4>
              <p>${insight.insight}</p>
            </div>
          `).join('')}
        </div>

        <div style="background: #f6f8fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>Activity Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div><strong>${activitySummary.email_interactions}</strong><br>Email Interactions</div>
            <div><strong>${activitySummary.meetings_attended}</strong><br>Meetings</div>
            <div><strong>${activitySummary.new_contacts_added}</strong><br>New Contacts</div>
            <div><strong>${activitySummary.projects_updated}</strong><br>Project Updates</div>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #6b7280;">Thank you for being part of the ACT Community</p>
        </div>
      </div>
    `;
  }

  /**
   * Store newsletter in database
   */
  async storeNewsletter(newsletter) {
    try {
      const { error } = await this.supabase
        .from('generated_newsletters')
        .insert({
          newsletter_id: newsletter.id,
          subject_line: newsletter.subject_line,
          content: newsletter.content,
          executive_summary: newsletter.executive_summary,
          audience_type: newsletter.audience_type,
          frequency: newsletter.frequency,
          key_themes: newsletter.key_themes,
          call_to_actions: newsletter.call_to_actions,
          data_sources: newsletter.data_sources,
          generated_at: newsletter.generated_at,
          word_count: this.estimateWordCount(newsletter.content),
          status: 'generated'
        });

      if (error) {
        console.error('Error storing newsletter:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error in storeNewsletter:', error);
      throw error;
    }
  }

  // Helper methods
  calculateProgressTrend(project) {
    return project.progress_percentage > 50 ? 'on_track' :
           project.progress_percentage > 25 ? 'needs_attention' : 'at_risk';
  }

  extractKeyAchievements(project) {
    return project.recent_activities || project.key_milestones || 'Progress updates available';
  }

  extractUpcomingMilestones(project) {
    return project.next_steps || 'Next steps being planned';
  }

  calculateDaysSinceUpdate(updatedAt) {
    return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  countUniqueValues(array, field) {
    return [...new Set(array.map(item => item[field]).filter(Boolean))].length;
  }

  getTopValues(array, field, limit) {
    const counts = {};
    array.forEach(item => {
      if (item[field]) {
        counts[item[field]] = (counts[item[field]] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([value]) => value);
  }

  calculateAverage(array, field) {
    const values = array.filter(item => item[field] !== null && item[field] !== undefined);
    if (values.length === 0) return 0;
    return values.reduce((sum, item) => sum + item[field], 0) / values.length;
  }

  deduplicateByField(array, field) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[field];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  estimateWordCount(content) {
    return content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(word => word.length > 0).length;
  }
}

export default IntelligentNewsletterService;