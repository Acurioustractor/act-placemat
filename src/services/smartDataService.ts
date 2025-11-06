// Smart data service that handles fallbacks and caching intelligently

import { apiService } from './apiService';
import { configService } from './configService';
import { API_ENDPOINTS } from '../constants';
import { getMockProjects, getMockOpportunities, getMockOrganizations, getMockPeople } from '../utils/mockData';
import {
  transformNotionResponse,
  transformNotionProject,
  transformNotionOpportunity,
  transformNotionOrganization,
  transformNotionPerson,
  transformNotionArtifact
} from './notionTransform';

// Import NotionPage type
type NotionPage = Parameters<typeof transformNotionProject>[0];

interface DataServiceConfig {
  useCache: boolean;
  fallbackToMock: boolean;
  retryAttempts: number;
  cacheTimeout: number;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

/**
 * Smart data service that provides intelligent fallbacks, caching, and error recovery.
 * Handles data fetching from Notion with automatic retries, fallbacks, and transformation.
 */
class SmartDataService {
  private cache = new Map<string, CacheEntry>();
  private config: DataServiceConfig = {
    useCache: false, // Disable cache temporarily for debugging
    fallbackToMock: false, // NO MOCK DATA - only real data
    retryAttempts: 1,
    cacheTimeout: 30 * 60 * 1000 // 30 minutes caching
  };

  /**
   * Fetches data from Notion API with intelligent fallback strategies.
   * Implements caching, error recovery, and automatic data transformation.
   *
   * @template T - The expected data type (Project, Opportunity, Organization, Person, or Artifact)
   * @param {'projects' | 'opportunities' | 'organizations' | 'people' | 'artifacts'} type - The type of data to fetch
   * @param {Record<string, unknown>} requestPayload - The Notion API query payload with filters and sorts
   * @returns {Promise<T[]>} Promise resolving to an array of transformed data
   * @throws {Error} Logs errors and falls back to cache or mock data if enabled
   * @example
   * // Fetch all projects
   * const projects = await smartDataService.fetchData<Project>('projects', {
   *   databaseId: 'abc123',
   *   filters: {},
   *   sorts: []
   * });
   */
  async fetchData<T>(
    type: 'projects' | 'opportunities' | 'organizations' | 'people' | 'artifacts',
    requestPayload: Record<string, unknown>
  ): Promise<T[]> {
    const cacheKey = `${type}_${JSON.stringify(requestPayload)}`;
    
    // Try cache first
    if (this.config.useCache) {
      const cached = this.getFromCache<T[]>(cacheKey);
      if (cached) {
        console.log(`📦 Using cached data for ${type}`);
        return cached;
      }
    }

    // Skip mock data - go straight to real data

    try {
      // Try Notion API
      console.log(`🌐 Fetching ${type} from Notion API`);

      const response = await apiService.post<{ results: unknown[]; has_more: boolean }>(
        API_ENDPOINTS.NOTION_QUERY,
        requestPayload
      );

      if (response && response.results && Array.isArray(response.results)) {
        console.log(`🔍 Raw Notion response for ${type}:`, {
          resultCount: response.results.length,
          hasMoreResults: response.has_more,
          sampleResult: response.results[0] || 'No results'
        });
        
        const transformedData = this.transformNotionData<T>(type, response);
        
        console.log(`🔍 Transformed ${type} data:`, {
          originalCount: response.results.length,
          transformedCount: transformedData.length,
          sampleTransformed: transformedData[0] || 'No transformed data'
        });
        
        // Cache successful response
        if (this.config.useCache && transformedData.length > 0) {
          this.setCache(cacheKey, transformedData);
        }
        
        console.log(`✅ Successfully fetched ${transformedData.length} ${type} from Notion`);
        return transformedData;
      } else {
        throw new Error(`Invalid response structure for ${type}`);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Notion API failed for ${type}:`, errorMessage);
      
      // Try cache as fallback
      const staleCache = this.getFromCache<T[]>(cacheKey, true); // Allow stale
      if (staleCache) {
        console.log(`📦 Using stale cached data for ${type}`);
        return staleCache;
      }

      // Fall back to mock data if enabled
      if (this.config.fallbackToMock) {
        console.log(`🎭 Using mock data for ${type}`);
        return this.getMockData<T>(type);
      }

      // Last resort: return empty array with error info
      console.error(`❌ No fallback available for ${type}`);
      return [];
    }
  }

  /**
   * Clears all cached data entries.
   * Useful for forcing a refresh of all data.
   *
   * @returns {void}
   * @example
   * smartDataService.clearCache();
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Clears cached entries for a specific data type.
   * Useful for refreshing only certain types of data.
   *
   * @param {string} type - The data type to clear from cache (e.g., 'projects', 'opportunities')
   * @returns {void}
   * @example
   * smartDataService.clearCacheForType('projects');
   */
  clearCacheForType(type: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(type));
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Cache cleared for ${type}`);
  }

  /**
   * Fetch real data in background after serving mock data
   */
  private async fetchRealDataInBackground(type: string, requestPayload: Record<string, unknown>, cacheKey: string) {
    try {
      console.log(`🔄 Background fetching real ${type} data...`);
      
      const response = await apiService.post<{ results: unknown[] }>(
        API_ENDPOINTS.NOTION_QUERY,
        requestPayload
      );

      if (response && response.results && Array.isArray(response.results)) {
        const transformedData = this.transformNotionData(type, response);
        
        // Cache for next time
        if (this.config.useCache && transformedData.length > 0) {
          this.setCache(cacheKey, transformedData);
          console.log(`✅ Background cached ${transformedData.length} ${type} items`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Background fetch failed for ${type}:`, error);
    }
  }


  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string, allowStale = false): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired && !allowStale) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTimeout
    });
  }

  /**
   * Transform Notion response to application format
   */
  private transformNotionData<T>(type: string, response: { results: unknown[]; object?: string; next_cursor?: string | null; has_more?: boolean }): T[] {
    // Cast response to NotionResponse format for transformation
    const notionResponse = {
      object: 'list' as const,
      results: response.results as NotionPage[],
      next_cursor: response.next_cursor || null,
      has_more: response.has_more || false,
      type: 'page_or_database' as const,
      page_or_database: {} as Record<string, never>
    };

    switch (type) {
      case 'projects':
        return transformNotionResponse(notionResponse, transformNotionProject) as T[];
      case 'opportunities':
        return transformNotionResponse(notionResponse, transformNotionOpportunity) as T[];
      case 'organizations':
        return transformNotionResponse(notionResponse, transformNotionOrganization) as T[];
      case 'people':
        return transformNotionResponse(notionResponse, transformNotionPerson) as T[];
      case 'artifacts':
        return transformNotionResponse(notionResponse, transformNotionArtifact) as T[];
      default:
        return [];
    }
  }

  /**
   * Get mock data for fallback
   */
  private getMockData<T>(type: string): T[] {
    switch (type) {
      case 'projects':
        return getMockProjects() as T[];
      case 'opportunities':
        return getMockOpportunities() as T[];
      case 'organizations':
        return getMockOrganizations() as T[];
      case 'people':
        return getMockPeople() as T[];
      default:
        return [];
    }
  }

  /**
   * Checks if a specific database is properly configured and available.
   * Queries the config service to determine database availability.
   *
   * @param {'projects' | 'opportunities' | 'organizations' | 'people' | 'artifacts'} type - The database type to check
   * @returns {Promise<boolean>} Promise resolving to true if database is available, false otherwise
   * @example
   * const isAvailable = await smartDataService.isDatabaseConfigured('projects');
   * if (!isAvailable) {
   *   console.log('Projects database is not configured');
   * }
   */
  async isDatabaseConfigured(type: 'projects' | 'opportunities' | 'organizations' | 'people' | 'artifacts'): Promise<boolean> {
    try {
      return await configService.isDatabaseAvailable(type);
    } catch (error) {
      console.warn(`Failed to check database configuration for ${type}:`, error);
      return false;
    }
  }

  /**
   * Retrieves the configuration status for all database types.
   * Checks availability of projects, opportunities, organizations, people, and artifacts databases.
   *
   * @returns {Promise<{ projects: boolean; opportunities: boolean; organizations: boolean; people: boolean; artifacts: boolean }>} Promise resolving to an object with availability status for each database
   * @example
   * const status = await smartDataService.getDatabaseStatus();
   * console.log('Projects available:', status.projects);
   * console.log('Opportunities available:', status.opportunities);
   */
  async getDatabaseStatus() {
    return {
      projects: await this.isDatabaseConfigured('projects'),
      opportunities: await this.isDatabaseConfigured('opportunities'),
      organizations: await this.isDatabaseConfigured('organizations'),
      people: await this.isDatabaseConfigured('people'),
      artifacts: await this.isDatabaseConfigured('artifacts')
    };
  }

  /**
   * Retrieves statistics about the current cache state.
   * Useful for monitoring and debugging caching behavior.
   *
   * @returns {{ totalEntries: number; totalSize: number; expiredEntries: number; hitRate: number }} Object containing cache statistics
   * @example
   * const stats = await smartDataService.getCacheStats();
   * console.log(`Cache has ${stats.totalEntries} entries, ${stats.expiredEntries} expired`);
   */
  getCacheStats() {
    const entries = Array.from(this.cache.entries());
    const totalEntries = entries.length;
    const totalSize = JSON.stringify(Array.from(this.cache.values())).length;
    const expiredEntries = entries.filter(([, entry]) =>
      Date.now() - entry.timestamp > entry.ttl
    ).length;

    return {
      totalEntries,
      totalSize,
      expiredEntries,
      hitRate: 0 // TODO: Track hit rate
    };
  }
}

// Export singleton instance
export const smartDataService = new SmartDataService();

// Export class for testing
export default SmartDataService;