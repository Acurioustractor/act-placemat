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
 * Smart data service that provides intelligent fallbacks and caching
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
   * Generic data fetcher with smart fallbacks
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
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Clear cache for specific data type
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
    const notionResponse = response as { object: 'list'; results: unknown[]; next_cursor: string | null; has_more: boolean; type: 'page_or_database'; page_or_database: Record<string, never> };

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
   * Check if a database is properly configured
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
   * Get configuration status for all databases
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
   * Get cache statistics
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