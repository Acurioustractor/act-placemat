// Configuration service for fetching app config from backend

import { apiService } from './api';
import { API_ENDPOINTS } from '../constants';

export interface AppConfig {
  databases: {
    projects: string;
    opportunities: string;
    organizations: string;
    people: string;
    artifacts: string;
  };
  status: {
    notion_configured: boolean;
    projects_available: boolean;
    opportunities_available: boolean;
    organizations_available: boolean;
    people_available: boolean;
    artifacts_available: boolean;
  };
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  notion_token: string;
  notion_database: string;
}

/**
 * Service for fetching application configuration and health status
 */
class ConfigService {
  private config: AppConfig | null = null;
  private configPromise: Promise<AppConfig> | null = null;

  /**
   * Get application configuration from backend
   * Uses caching to avoid repeated requests
   */
  async getConfig(): Promise<AppConfig> {
    // Return cached config if available
    if (this.config) {
      return this.config;
    }

    // Return existing promise if already fetching
    if (this.configPromise) {
      return this.configPromise;
    }

    // Create new promise to fetch config
    this.configPromise = this.fetchConfig();
    
    try {
      this.config = await this.configPromise;
      return this.config;
    } catch (error) {
      // Reset promise on error so we can retry
      this.configPromise = null;
      throw error;
    }
  }

  /**
   * Force refresh of configuration from backend
   */
  async refreshConfig(): Promise<AppConfig> {
    this.config = null;
    this.configPromise = null;
    return this.getConfig();
  }

  /**
   * Get database ID for a specific type
   */
  async getDatabaseId(type: keyof AppConfig['databases']): Promise<string> {
    const config = await this.getConfig();
    const databaseId = config.databases[type];
    
    if (!databaseId) {
      throw new Error(`Database ID for "${type}" is not configured in the backend`);
    }
    
    return databaseId;
  }

  /**
   * Check if a specific database is available
   */
  async isDatabaseAvailable(type: keyof AppConfig['databases']): Promise<boolean> {
    const config = await this.getConfig();
    const statusKey = `${type}_available` as keyof AppConfig['status'];
    return config.status[statusKey] || false;
  }

  /**
   * Check if Notion is properly configured
   */
  async isNotionConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config.status.notion_configured;
  }

  /**
   * Get health status from backend
   */
  async getHealthStatus(): Promise<HealthStatus> {
    try {
      return await apiService.get<HealthStatus>(API_ENDPOINTS.HEALTH);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
      throw error;
    }
  }

  /**
   * Private method to fetch config from backend
   */
  private async fetchConfig(): Promise<AppConfig> {
    try {
      console.log('🔧 Fetching application configuration from backend...');
      const config = await apiService.get<AppConfig>(API_ENDPOINTS.CONFIG);
      console.log('✅ Configuration loaded successfully:', config);
      return config;
    } catch (error) {
      console.error('❌ Failed to fetch application configuration:', error);
      
      // Provide fallback configuration for development
      if (import.meta.env.DEV) {
        console.warn('🔄 Using fallback configuration for development');
        return {
          databases: {
            projects: '',
            opportunities: '',
            organizations: '',
            people: '',
            artifacts: ''
          },
          status: {
            notion_configured: false,
            projects_available: false,
            opportunities_available: false,
            organizations_available: false,
            people_available: false,
            artifacts_available: false
          }
        };
      }
      
      throw error;
    }
  }

  /**
   * Clear cached configuration (useful for testing)
   */
  clearCache(): void {
    this.config = null;
    this.configPromise = null;
  }
}

// Export singleton instance
export const configService = new ConfigService();

// Export class for testing and extension
export default ConfigService;