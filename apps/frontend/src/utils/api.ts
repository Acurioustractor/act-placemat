/**
 * API Configuration for ACT Platform v3
 * 
 * Centralized API configuration with proper error handling
 */

const API_BASE_URL = 'http://localhost:4000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`🔍 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Success:`, { endpoint, dataKeys: Object.keys(data) });

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`❌ API Error for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Business Agent Methods
  async queryAgent(query: string) {
    return this.request('/api/v3/agent/query', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  async getMonitoring() {
    return this.request('/api/v3/agent/monitoring');
  }

  async getCompliance() {
    return this.request('/api/v3/agent/compliance');
  }

  async getGrants() {
    return this.request('/api/v3/agent/grants');
  }

  async getProjectHealth() {
    return this.request('/api/v3/agent/projects/health');
  }

  // CRM Methods
  async getContacts(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/v3/crm/contacts${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.request(endpoint);
  }

  async getContact(contactId: string) {
    return this.request(`/api/v3/crm/contacts/${contactId}`);
  }

  async enrichContact(contactId: string, mode: 'ai' | 'basic' = 'ai') {
    return this.request(`/api/v3/crm/contacts/${contactId}/enrich`, {
      method: 'POST',
      body: JSON.stringify({ mode })
    });
  }

  async getProjectMatches(projectId: string) {
    return this.request(`/api/v3/crm/projects/${projectId}/matches`);
  }

  async getOutreachStrategy(contactId: string) {
    return this.request(`/api/v3/crm/contacts/${contactId}/outreach`);
  }

  // Project Alignment v3
  async getAlignedProjects(limit = 50) {
    return this.request(`/api/v3/project-alignment/projects?limit=${limit}`);
  }

  async getProjectOutreachPlan(projectId: string, limit = 5) {
    return this.request(
      `/api/v3/project-alignment/projects/${projectId}/outreach-plan?limit=${limit}`
    );
  }

  async refreshProjectAlignment(options: Record<string, any> = {}) {
    const payload = {
      enableResearch: true,
      projectsLimit: 5,
      contactsLimit: 150,
      minScore: 40,
      researchDepth: 'basic',
      ...options,
    };

    return this.request('/api/v3/project-alignment/refresh', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Fallback Methods (for when v3 APIs aren't available)
  async getFallbackContacts() {
    return this.request('/api/real/projects');
  }

  async getSystemHealth() {
    return this.request('/api/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Helper wrappers to preserve `this`
export const queryAgent = (query: string) => apiClient.queryAgent(query);
export const getMonitoring = () => apiClient.getMonitoring();
export const getCompliance = () => apiClient.getCompliance();
export const getGrants = () => apiClient.getGrants();
export const getProjectHealth = () => apiClient.getProjectHealth();
export const getContacts = (params?: Record<string, any>) => apiClient.getContacts(params);
export const getContact = (contactId: string) => apiClient.getContact(contactId);
export const enrichContact = (contactId: string, mode: 'ai' | 'basic' = 'ai') =>
  apiClient.enrichContact(contactId, mode);
export const getProjectMatches = (projectId: string) => apiClient.getProjectMatches(projectId);
export const getOutreachStrategy = (contactId: string) => apiClient.getOutreachStrategy(contactId);
export const getAlignedProjects = (limit = 50) => apiClient.getAlignedProjects(limit);
export const getProjectOutreachPlan = (projectId: string, limit = 5) =>
  apiClient.getProjectOutreachPlan(projectId, limit);
export const refreshProjectAlignment = (options?: Record<string, any>) =>
  apiClient.refreshProjectAlignment(options);
export const getFallbackContacts = () => apiClient.getFallbackContacts();
export const getSystemHealth = () => apiClient.getSystemHealth();
