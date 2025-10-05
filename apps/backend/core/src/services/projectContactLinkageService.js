/**
 * Project-Contact Linkage Service
 * Automatically links contacts to relevant Notion projects based on expertise, interests, and strategic value
 */

import { createClient } from '@supabase/supabase-js';
import MultiProviderAI from './multiProviderAI.js';

class ProjectContactLinkageService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.ai = new MultiProviderAI();
  }

  /**
   * Automatically link contacts to relevant projects
   */
  async generateProjectContactLinkages(projectId = null, contactId = null) {
    try {
      // Get projects from Notion database
      const projects = await this.getNotionProjects(projectId);

      // Get strategic contacts from LinkedIn database
      const contacts = await this.getStrategicContacts(contactId);

      if (!projects.length || !contacts.length) {
        return {
          success: false,
          message: 'No projects or contacts available for linkage analysis',
          total_linkages: 0
        };
      }

      // Generate AI-powered linkages
      const linkages = [];

      for (const project of projects) {
        const projectLinkages = await this.generateProjectLinkages(project, contacts);
        linkages.push(...projectLinkages);
      }

      // Store linkages in database
      await this.storeLinkages(linkages);

      return {
        success: true,
        total_linkages: linkages.length,
        projects_analyzed: projects.length,
        contacts_analyzed: contacts.length,
        linkages: linkages.slice(0, 10), // Return top 10 for preview
        message: `Generated ${linkages.length} strategic project-contact linkages`
      };

    } catch (error) {
      console.error('Error generating project-contact linkages:', error);
      return {
        success: false,
        error: 'Failed to generate project-contact linkages',
        message: error.message
      };
    }
  }

  /**
   * Get projects from Notion database
   */
  async getNotionProjects(projectId = null) {
    try {
      let query = this.supabase
        .from('notion_projects')
        .select(`
          id,
          project_name,
          project_description,
          status,
          priority_level,
          required_skills,
          target_outcomes,
          key_stakeholders,
          budget_range,
          timeline,
          collaboration_opportunities,
          created_at,
          updated_at
        `)
        .in('status', ['active', 'planning', 'seeking_partners']);

      if (projectId) {
        query = query.eq('id', projectId);
      }

      const { data: projects, error } = await query.limit(20);

      if (error) {
        console.error('Error fetching Notion projects:', error);
        return [];
      }

      return projects || [];

    } catch (error) {
      console.error('Error in getNotionProjects:', error);
      return [];
    }
  }

  /**
   * Get strategic contacts from LinkedIn database
   */
  async getStrategicContacts(contactId = null) {
    try {
      let query = this.supabase
        .from('linkedin_contacts')
        .select(`
          id,
          full_name,
          current_company,
          current_position,
          location,
          industry,
          specialities,
          skills,
          interests,
          strategic_value,
          relationship_score,
          last_interaction,
          interaction_count,
          bio,
          experience_summary,
          education
        `)
        .gte('strategic_value', 6); // Strategic contacts only

      if (contactId) {
        query = query.eq('id', contactId);
      }

      const { data: contacts, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching strategic contacts:', error);
        return [];
      }

      return contacts || [];

    } catch (error) {
      console.error('Error in getStrategicContacts:', error);
      return [];
    }
  }

  /**
   * Generate AI-powered linkages for a specific project
   */
  async generateProjectLinkages(project, contacts) {
    try {
      const linkages = [];

      // Create project context for AI analysis
      const projectContext = {
        name: project.project_name,
        description: project.project_description,
        status: project.status,
        priority: project.priority_level,
        required_skills: project.required_skills,
        target_outcomes: project.target_outcomes,
        collaboration_opportunities: project.collaboration_opportunities
      };

      // Analyze contacts in batches of 10 for performance
      const batchSize = 10;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const contactBatch = contacts.slice(i, i + batchSize);

        const batchLinkages = await this.analyzeContactBatch(projectContext, contactBatch);
        linkages.push(...batchLinkages);
      }

      // Sort by relevance score and return top matches
      return linkages
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 20); // Top 20 matches per project

    } catch (error) {
      console.error('Error generating project linkages:', error);
      return [];
    }
  }

  /**
   * Analyze a batch of contacts for project relevance using AI
   */
  async analyzeContactBatch(projectContext, contacts) {
    try {
      const contactSummaries = contacts.map(contact => ({
        id: contact.id,
        name: contact.full_name,
        company: contact.current_company,
        position: contact.current_position,
        industry: contact.industry,
        skills: contact.skills,
        specialities: contact.specialities,
        interests: contact.interests,
        strategic_value: contact.strategic_value,
        experience: contact.experience_summary
      }));

      const aiPrompt = `
        Analyze the relevance of these contacts to the project below. For each contact, determine:
        1. Relevance score (0-100)
        2. Specific value they could bring
        3. Collaboration type (advisor, partner, contributor, stakeholder)
        4. Priority level (high, medium, low)
        5. Suggested approach for engagement

        Project Context:
        - Name: ${projectContext.name}
        - Description: ${projectContext.description}
        - Required Skills: ${projectContext.required_skills}
        - Target Outcomes: ${projectContext.target_outcomes}
        - Collaboration Opportunities: ${projectContext.collaboration_opportunities}

        Contacts to Analyze:
        ${contactSummaries.map(c => `
        Contact ${c.id}: ${c.name} - ${c.position} at ${c.company}
        Industry: ${c.industry}
        Skills: ${c.skills}
        Specialities: ${c.specialities}
        Strategic Value: ${c.strategic_value}/10
        `).join('\n')}

        Return analysis as JSON array with format:
        [{
          "contact_id": "id",
          "relevance_score": 85,
          "specific_value": "Expert in renewable energy policy with government connections",
          "collaboration_type": "advisor",
          "priority": "high",
          "suggested_approach": "Initial coffee meeting to explore policy alignment",
          "key_strengths": ["policy expertise", "government network", "sustainability focus"]
        }]

        Only include contacts with relevance_score >= 60.
      `;

      const aiResponse = await this.ai.generateResponse(aiPrompt, {
        maxTokens: 2000,
        temperature: 0.3
      });

      let linkageAnalysis;
      try {
        // Extract JSON from AI response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          linkageAnalysis = JSON.parse(jsonMatch[0]);
        } else {
          linkageAnalysis = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return [];
      }

      // Transform AI analysis into linkage objects
      return linkageAnalysis.map(analysis => ({
        project_id: projectContext.id,
        contact_id: analysis.contact_id,
        relevance_score: analysis.relevance_score,
        specific_value: analysis.specific_value,
        collaboration_type: analysis.collaboration_type,
        priority: analysis.priority,
        suggested_approach: analysis.suggested_approach,
        key_strengths: analysis.key_strengths,
        created_at: new Date().toISOString(),
        ai_generated: true,
        needs_review: analysis.relevance_score < 80 // High-score matches are auto-approved
      }));

    } catch (error) {
      console.error('Error analyzing contact batch:', error);
      return [];
    }
  }

  /**
   * Store linkages in database
   */
  async storeLinkages(linkages) {
    try {
      if (!linkages.length) return;

      // Clear existing AI-generated linkages for these projects
      const projectIds = [...new Set(linkages.map(l => l.project_id))];

      await this.supabase
        .from('project_contact_linkages')
        .delete()
        .in('project_id', projectIds)
        .eq('ai_generated', true);

      // Insert new linkages
      const { error } = await this.supabase
        .from('project_contact_linkages')
        .insert(linkages);

      if (error) {
        console.error('Error storing linkages:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error in storeLinkages:', error);
      throw error;
    }
  }

  /**
   * Get existing linkages for a project
   */
  async getProjectLinkages(projectId, includeContacts = false) {
    try {
      let query = this.supabase
        .from('project_contact_linkages')
        .select(`
          *,
          ${includeContacts ? 'linkedin_contacts!inner(*)' : ''}
        `)
        .eq('project_id', projectId)
        .order('relevance_score', { ascending: false });

      const { data: linkages, error } = await query;

      if (error) {
        console.error('Error fetching project linkages:', error);
        return [];
      }

      return linkages || [];

    } catch (error) {
      console.error('Error in getProjectLinkages:', error);
      return [];
    }
  }

  /**
   * Get existing linkages for a contact
   */
  async getContactLinkages(contactId, includeProjects = false) {
    try {
      let query = this.supabase
        .from('project_contact_linkages')
        .select(`
          *,
          ${includeProjects ? 'notion_projects!inner(*)' : ''}
        `)
        .eq('contact_id', contactId)
        .order('relevance_score', { ascending: false });

      const { data: linkages, error } = await query;

      if (error) {
        console.error('Error fetching contact linkages:', error);
        return [];
      }

      return linkages || [];

    } catch (error) {
      console.error('Error in getContactLinkages:', error);
      return [];
    }
  }

  /**
   * Mark linkage as actioned (contacted, meeting scheduled, etc.)
   */
  async markLinkageActioned(linkageId, actionType, notes) {
    try {
      const { data, error } = await this.supabase
        .from('project_contact_linkages')
        .update({
          status: 'actioned',
          action_type: actionType,
          action_notes: notes,
          actioned_at: new Date().toISOString()
        })
        .eq('id', linkageId)
        .select();

      if (error) {
        console.error('Error marking linkage as actioned:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        linkage: data[0],
        message: 'Linkage marked as actioned successfully'
      };

    } catch (error) {
      console.error('Error in markLinkageActioned:', error);
      return {
        success: false,
        error: 'Failed to mark linkage as actioned',
        message: error.message
      };
    }
  }

  /**
   * Get linkage recommendations for daily dashboard
   */
  async getDailyLinkageRecommendations(limit = 10) {
    try {
      const { data: linkages, error } = await this.supabase
        .from('project_contact_linkages')
        .select(`
          *,
          notion_projects!inner(project_name, status, priority_level),
          linkedin_contacts!inner(full_name, current_company, strategic_value)
        `)
        .is('status', null) // Unactioned linkages
        .gte('relevance_score', 75) // High-relevance only
        .order('relevance_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching daily linkage recommendations:', error);
        return [];
      }

      return linkages || [];

    } catch (error) {
      console.error('Error in getDailyLinkageRecommendations:', error);
      return [];
    }
  }

  /**
   * Generate project-contact network insights
   */
  async generateNetworkInsights() {
    try {
      // Get linkage statistics
      const { data: stats } = await this.supabase
        .from('project_contact_linkages')
        .select('project_id, contact_id, relevance_score, collaboration_type, priority')
        .gte('relevance_score', 60);

      if (!stats || !stats.length) {
        return {
          success: false,
          message: 'No linkage data available for network analysis'
        };
      }

      // Analyze network patterns
      const projectCounts = {};
      const contactCounts = {};
      const collaborationTypes = {};
      const priorities = {};

      stats.forEach(linkage => {
        // Project connection counts
        projectCounts[linkage.project_id] = (projectCounts[linkage.project_id] || 0) + 1;

        // Contact connection counts
        contactCounts[linkage.contact_id] = (contactCounts[linkage.contact_id] || 0) + 1;

        // Collaboration type distribution
        collaborationTypes[linkage.collaboration_type] =
          (collaborationTypes[linkage.collaboration_type] || 0) + 1;

        // Priority distribution
        priorities[linkage.priority] = (priorities[linkage.priority] || 0) + 1;
      });

      // Identify key insights
      const topProjects = Object.entries(projectCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      const topContacts = Object.entries(contactCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      const averageRelevanceScore = stats.reduce((sum, s) => sum + s.relevance_score, 0) / stats.length;

      return {
        success: true,
        insights: {
          total_linkages: stats.length,
          average_relevance_score: Math.round(averageRelevanceScore * 100) / 100,
          top_connected_projects: topProjects,
          top_connected_contacts: topContacts,
          collaboration_type_distribution: collaborationTypes,
          priority_distribution: priorities,
          network_density: stats.length / (Object.keys(projectCounts).length * Object.keys(contactCounts).length),
          recommendations: await this.generateNetworkRecommendations(stats)
        }
      };

    } catch (error) {
      console.error('Error generating network insights:', error);
      return {
        success: false,
        error: 'Failed to generate network insights',
        message: error.message
      };
    }
  }

  /**
   * Generate strategic recommendations based on network analysis
   */
  async generateNetworkRecommendations(linkageData) {
    try {
      const recommendations = [];

      // Identify under-connected high-value projects
      const projectConnections = {};
      linkageData.forEach(l => {
        projectConnections[l.project_id] = (projectConnections[l.project_id] || 0) + 1;
      });

      const underConnectedProjects = Object.entries(projectConnections)
        .filter(([, count]) => count < 3)
        .map(([projectId]) => projectId);

      if (underConnectedProjects.length > 0) {
        recommendations.push({
          type: 'under_connected_projects',
          title: 'Projects Need More Strategic Connections',
          description: `${underConnectedProjects.length} projects have fewer than 3 strategic contacts linked`,
          action: 'Run linkage analysis for these projects',
          priority: 'medium'
        });
      }

      // Identify super-connectors (contacts linked to many projects)
      const contactConnections = {};
      linkageData.forEach(l => {
        contactConnections[l.contact_id] = (contactConnections[l.contact_id] || 0) + 1;
      });

      const superConnectors = Object.entries(contactConnections)
        .filter(([, count]) => count >= 5)
        .map(([contactId]) => contactId);

      if (superConnectors.length > 0) {
        recommendations.push({
          type: 'super_connectors',
          title: 'Leverage Super-Connected Contacts',
          description: `${superConnectors.length} contacts are relevant to 5+ projects - consider strategic engagement`,
          action: 'Prioritise outreach to super-connectors',
          priority: 'high'
        });
      }

      // Check for missing collaboration types
      const collaborationTypes = [...new Set(linkageData.map(l => l.collaboration_type))];
      const expectedTypes = ['advisor', 'partner', 'contributor', 'stakeholder'];
      const missingTypes = expectedTypes.filter(type => !collaborationTypes.includes(type));

      if (missingTypes.length > 0) {
        recommendations.push({
          type: 'missing_collaboration_types',
          title: 'Diversify Collaboration Types',
          description: `Missing collaboration types: ${missingTypes.join(', ')}`,
          action: 'Expand contact analysis to find diverse collaboration opportunities',
          priority: 'low'
        });
      }

      return recommendations;

    } catch (error) {
      console.error('Error generating network recommendations:', error);
      return [];
    }
  }
}

export default ProjectContactLinkageService;