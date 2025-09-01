/**
 * 🌟 Project Service - Real Notion Data Integration
 * Connects to backend APIs to fetch actual project data from Notion
 */

import { ProjectData } from '../components/CommunityShowcase/ProjectCard';

class ProjectService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getApiUrl();
  }

  private getApiUrl(): string {
    // In development, Vite proxies API calls to the frontend port
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    
    // Server-side fallback
    return process.env.VITE_API_URL 
      ? `${process.env.VITE_API_URL}/api`
      : 'http://localhost:4000/api';
  }

  /**
   * Fetch all projects with RICH NOTION DATA via backend API
   */
  async getAllProjects(): Promise<ProjectData[]> {
    try {
      // Use the FULL projects endpoint, not the network visualization one
      const response = await fetch(`${this.baseUrl}/dashboard/projects`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const projects = await response.json();
      
      // Transform the rich project data to our ProjectData format
      const transformedProjects = projects.map((project: any) => this.transformToProjectData(project));

      return transformedProjects;
    } catch (error) {
      console.error('Failed to fetch projects from API:', error);
      // Return empty array on error - component will handle gracefully
      return [];
    }
  }

  /**
   * Fetch projects with ecosystem data
   */
  async getProjectsWithEcosystem(): Promise<ProjectData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/ecosystem/opportunities`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ecosystem data: ${response.statusText}`);
      }

      const ecosystemData = await response.json();
      
      // Transform ecosystem data to ProjectData format
      const projects = ecosystemData.map((opportunity: any) => 
        this.transformEcosystemToProjectData(opportunity)
      );

      return projects;
    } catch (error) {
      console.error('Failed to fetch ecosystem data:', error);
      return [];
    }
  }

  /**
   * Transform network API data to ProjectData format using REAL Notion fields
   */
  private transformToProjectData(apiProject: any): ProjectData {
    // Debug logging
    const inputData = {
      id: apiProject.id,
      name: apiProject.name,
      aiSummary: apiProject.aiSummary,
      coreValues: apiProject.coreValues,
      actualIncoming: apiProject.actualIncoming,
      potentialIncoming: apiProject.potentialIncoming,
      fullApiObject: Object.keys(apiProject)
    };
    console.log('🔧 TRANSFORM INPUT:', inputData);
    
    // Debug alerts removed - data transformation working correctly
    
    const transformed = {
      id: apiProject.id,
      title: apiProject.name || 'Untitled Project',
      
      // Use REAL AI summary from Notion instead of fake description
      description: apiProject.aiSummary || apiProject.description || 'No description available',
      
      // Use REAL location from Notion rollup
      location: apiProject.location || 'Location not set',
      
      // Use REAL status from Notion
      status: apiProject.status || 'Status not set',
      
      // Use REAL tags from Notion multi-select
      tags: Array.isArray(apiProject.tags) ? apiProject.tags : [],
      
      // Use REAL core values and themes
      community_name: this.extractCommunityName(apiProject.name),
      core_values: apiProject.coreValues || null,
      themes: Array.isArray(apiProject.theme) ? apiProject.theme : [],
      
      // Use REAL collaborator count from Notion rollup
      collaborators: this.generateCollaboratorsFromCount(apiProject.partnerCount || 0),
      
      // Use REAL financial data
      impact_metrics: {
        totalFunding: apiProject.totalFunding || 0,
        partnerCount: apiProject.partnerCount || 0,
        supporters: apiProject.supporters || 0,
        actualIncoming: apiProject.actualIncoming || 0,
        potentialIncoming: apiProject.potentialIncoming || 0,
        revenueActual: apiProject.revenueActual || 0,
        revenuePotential: apiProject.revenuePotential || 0,
        nextMilestone: apiProject.nextMilestoneDate,
        projectLead: apiProject.projectLead?.name || null
      },
      
      // Calculate community control from partner count (if available)
      community_control_percentage: this.calculateCommunityControlFromData(apiProject),
      
      // Use real relation data
      related_opportunities: apiProject.relatedOpportunities || [],
      related_organisations: apiProject.relatedOrganisations || [],
      related_actions: apiProject.relatedActions || [],
      related_resources: apiProject.relatedResources || [],
      related_artifacts: apiProject.relatedArtifacts || [],
      related_conversations: apiProject.relatedConversations || [],
      related_places: apiProject.relatedPlaces || [],
      related_fields: apiProject.relatedFields || [],
      
      created_date: apiProject.startDate || new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    
    // Debug logging output
    console.log('🎯 TRANSFORM OUTPUT:', {
      id: transformed.id,
      title: transformed.title,
      description: transformed.description,
      core_values: transformed.core_values
    });
    
    return transformed;
  }

  /**
   * Transform ecosystem API data to ProjectData format
   */
  private transformEcosystemToProjectData(opportunity: any): ProjectData {
    const connectedProjects = opportunity.connections?.projects || [];
    const connectedOrgs = opportunity.connections?.organizations || [];
    const impacts = opportunity.connections?.impacts || [];

    return {
      id: opportunity.id,
      title: opportunity.name || 'Community Opportunity',
      description: impacts[0]?.description || 'Community-driven initiative creating positive impact.',
      community_name: this.extractCommunityName(opportunity.name),
      location: 'Australia',
      status: 'active',
      tags: this.extractTagsFromOpportunity(opportunity),
      collaborators: [
        ...connectedProjects.slice(0, 2).map((p: any) => p.name),
        ...connectedOrgs.map((org: any) => org.name)
      ],
      impact_metrics: {
        amount: opportunity.amount,
        probability: opportunity.probability,
        type: opportunity.type,
        communities_impacted: impacts[0]?.communities || 1,
        impact_level: impacts[0]?.impact || 'medium'
      },
      community_control_percentage: this.calculateCommunityControlFromData(opportunity),
      created_date: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Extract community name from project title
   */
  private extractCommunityName(title: string): string {
    if (!title) return 'Community Project';
    
    // Common patterns for extracting community names
    const patterns = [
      /^(.+?)\s+(Project|Initiative|Program)/i,
      /(.+?)\s+Community/i,
      /(.+?)\s+(Hub|Centre|Center)/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fallback: use first few words
    const words = title.split(' ');
    return words.slice(0, 2).join(' ') || 'Community Project';
  }

  /**
   * Extract relevant tags from project data
   */
  private extractTags(project: any): string[] {
    const tags = [];
    
    if (project.area) tags.push(project.area.toLowerCase());
    if (project.status) tags.push(project.status);
    
    // Add some contextual tags based on project type
    tags.push('community-led', 'collaboration', 'impact');
    
    return tags.slice(0, 4); // Limit to 4 tags
  }

  /**
   * Extract tags from opportunity data
   */
  private extractTagsFromOpportunity(opportunity: any): string[] {
    const tags = [];
    
    if (opportunity.type) tags.push(opportunity.type.toLowerCase());
    if (opportunity.probability > 80) tags.push('high-confidence');
    if (opportunity.amount && opportunity.amount > 100000) tags.push('major-funding');
    
    tags.push('opportunity', 'funding', 'community');
    
    return tags.slice(0, 4);
  }

  /**
   * Generate realistic collaborator info from actual partner count
   */
  private generateCollaboratorsFromCount(partnerCount: number): string[] {
    if (!partnerCount || partnerCount === 0) {
      return [];
    }

    const collaboratorTypes = [
      'Community Partners',
      'Local Organizations', 
      'Government Agencies',
      'Research Partners',
      'Funding Bodies',
      'Volunteer Groups',
      'Industry Partners'
    ];

    // Show actual count of partners without making up names
    const count = Math.min(partnerCount, collaboratorTypes.length);
    return collaboratorTypes.slice(0, count).map((type, index) => 
      `${type} (${Math.ceil(partnerCount / count)} ${index === 0 && partnerCount % count > 0 ? '+ ' + (partnerCount % count) + ' more' : ''})`
    );
  }

  /**
   * Calculate community control from actual data or provide honest default
   */
  private calculateCommunityControlFromData(project: any): number {
    // If we have real financial data, calculate based on community funding vs total
    if (project.totalFunding && project.actualIncoming) {
      const communityRatio = Math.min(project.actualIncoming / project.totalFunding, 1);
      return Math.round(communityRatio * 100);
    }
    
    // If we have partner count, estimate based on that
    if (project.partnerCount && project.partnerCount > 0) {
      // More partners typically means more distributed control
      const controlEstimate = Math.min(50 + (project.partnerCount * 8), 90);
      return Math.round(controlEstimate);
    }

    // Honest default when we don't have data
    return 0; // Will be shown as "Not tracked" in UI
  }

  /**
   * Health check for API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/network/relationships`);
      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();
export default projectService;