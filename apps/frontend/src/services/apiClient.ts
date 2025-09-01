/**
 * Clean API Client Service
 * Replaces broken projectService with direct, reliable API calls
 * Aligns with API_DATA_STANDARDS.md for clean build foundation
 */

export interface Project {
  id: string;
  name: string;
  title: string;
  description: string;
  status: string;
  relatedActions: string[];
  relatedOpportunities: string[];
  relatedOrganisations: string[];
  relatedResources: string[];
  relatedArtifacts: string[];
  relatedConversations: string[];
  relatedPlaces: string[];
  relatedFields: string[];
  coreValues: string | null;
  actualIncoming: number;
  potentialIncoming: number;
  aiSummary?: string;
  themes?: string[];
  tags?: string[];
  location?: string;
  lead?: string;
  funding?: string;
}

export interface Place {
  id: string;
  name: string;
  place: string;
  westernName: string;
  state: string;
  map: string;
  protocols: string;
  relatedOrganisations: string[];
  relatedPeople: string[];
  relatedProjects: string[];
  // For frontend compatibility
  indigenousName: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionCounts {
  actions: number;
  opportunities: number;
  organizations: number;
  resources: number;
  artifacts: number;
  conversations: number;
  places: number;
  fields: number;
  total: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api'; // Use Vite proxy
  }

  /**
   * Get all projects with full relationship data
   */
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${this.baseUrl}/dashboard/projects`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a specific project by name or title
   */
  async getProject(nameOrTitle: string): Promise<Project | null> {
    const projects = await this.getProjects();
    
    return projects.find(project => 
      project.name === nameOrTitle ||
      project.title === nameOrTitle ||
      project.name?.toLowerCase().includes(nameOrTitle.toLowerCase())
    ) || null;
  }

  /**
   * Calculate connection counts for a project
   */
  calculateConnectionCounts(project: Project): ConnectionCounts {
    const counts = {
      actions: project.relatedActions?.length || 0,
      opportunities: project.relatedOpportunities?.length || 0,
      organizations: project.relatedOrganisations?.length || 0,
      resources: project.relatedResources?.length || 0,
      artifacts: project.relatedArtifacts?.length || 0,
      conversations: project.relatedConversations?.length || 0,
      places: project.relatedPlaces?.length || 0,
      fields: project.relatedFields?.length || 0,
      total: 0
    };

    counts.total = Object.values(counts).filter((_, index) => index < 8).reduce((sum, count) => sum + count, 0);
    
    return counts;
  }

  /**
   * Get all places from Notion database
   */
  async getPlaces(): Promise<Place[]> {
    const response = await fetch(`${this.baseUrl}/dashboard/places`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch places: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a specific place by ID
   */
  async getPlace(placeId: string): Promise<Place | null> {
    const response = await fetch(`${this.baseUrl}/dashboard/places/${placeId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch place: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get places associated with a project
   */
  async getProjectPlaces(project: Project): Promise<Place[]> {
    if (!project.relatedPlaces || project.relatedPlaces.length === 0) {
      return [];
    }

    const places = await this.getPlaces();
    return places.filter(place => 
      project.relatedPlaces.includes(place.id) ||
      place.relatedProjects.includes(project.id)
    );
  }

  /**
   * Format project data for display components
   */
  formatProjectForDisplay(project: Project): Project & { connectionCounts: ConnectionCounts } {
    return {
      ...project,
      connectionCounts: this.calculateConnectionCounts(project)
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;