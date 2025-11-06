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
 * Service for fetching and managing application configuration from the backend.
 * Provides centralized access to database IDs, availability status, and health checks.
 */
class ConfigService {
  private config: AppConfig | null = null;
  private configPromise: Promise<AppConfig> | null = null;

  /**
   * Retrieves the application configuration from the backend.
   * Implements caching to avoid repeated requests and returns the cached config if available.
   *
   * @returns {Promise<AppConfig>} Promise resolving to the application configuration with database IDs and status
   * @throws {Error} If the backend request fails and no fallback is available
   * @example
   * const config = await configService.getConfig();
   * console.log('Projects database ID:', config.databases.projects);
   * console.log('Notion configured:', config.status.notion_configured);
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
   * Forces a refresh of the configuration from the backend.
   * Clears the cached config and fetches a fresh copy.
   *
   * @returns {Promise<AppConfig>} Promise resolving to the refreshed application configuration
   * @throws {Error} If the backend request fails and no fallback is available
   * @example
   * // Force refresh after configuration changes
   * const newConfig = await configService.refreshConfig();
   */
  async refreshConfig(): Promise<AppConfig> {
    this.config = null;
    this.configPromise = null;
    return this.getConfig();
  }

  /**
   * Retrieves the Notion database ID for a specific data type.
   * Ensures that the database is configured before returning the ID.
   *
   * @param {keyof AppConfig['databases']} type - The database type ('projects', 'opportunities', 'organizations', 'people', or 'artifacts')
   * @returns {Promise<string>} Promise resolving to the Notion database ID
   * @throws {Error} If the database ID is not configured in the backend
   * @example
   * const projectsDbId = await configService.getDatabaseId('projects');
   * console.log('Projects database ID:', projectsDbId);
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
   * Checks if a specific database is available and properly configured.
   * Queries the backend configuration status.
   *
   * @param {keyof AppConfig['databases']} type - The database type to check
   * @returns {Promise<boolean>} Promise resolving to true if the database is available, false otherwise
   * @example
   * const isAvailable = await configService.isDatabaseAvailable('opportunities');
   * if (!isAvailable) {
   *   console.warn('Opportunities database is not available');
   * }
   */
  async isDatabaseAvailable(type: keyof AppConfig['databases']): Promise<boolean> {
    const config = await this.getConfig();
    const statusKey = `${type}_available` as keyof AppConfig['status'];
    return config.status[statusKey] || false;
  }

  /**
   * Checks if Notion integration is properly configured.
   * Verifies that the Notion API token and connection are working.
   *
   * @returns {Promise<boolean>} Promise resolving to true if Notion is configured, false otherwise
   * @example
   * const isConfigured = await configService.isNotionConfigured();
   * if (!isConfigured) {
   *   console.error('Notion is not configured. Please check your API token.');
   * }
   */
  async isNotionConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config.status.notion_configured;
  }

  /**
   * Retrieves the health status of the backend API.
   * Includes information about API availability, version, and configuration.
   *
   * @returns {Promise<HealthStatus>} Promise resolving to the health status object
   * @throws {Error} If the health check request fails
   * @example
   * const health = await configService.getHealthStatus();
   * console.log('API Status:', health.status);
   * console.log('Version:', health.version);
   * console.log('Notion Token:', health.notion_token);
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
   * Clears the cached configuration.
   * Useful for testing or when you need to force a fresh config fetch.
   *
   * @returns {void}
   * @example
   * configService.clearCache();
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