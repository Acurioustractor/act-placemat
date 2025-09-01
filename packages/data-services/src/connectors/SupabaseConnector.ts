/**
 * Mobile-optimized Supabase Connector for ACT Placemat
 * Australian community story and data management with offline support
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { BaseConnector } from '../core/BaseConnector';
import type {
  ApiResponse,
  Story,
  Storyteller,
  SearchQuery,
  SearchResult,
  OfflineAction,
  ComplianceMetadata
} from '../types';

// Validation schemas for Australian compliance
const StorySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  impact: z.string().optional(),
  themes: z.array(z.string()),
  storyteller_id: z.string(),
  is_public: z.boolean(),
  consent_status: z.enum(['given', 'pending', 'revoked']),
  created_at: z.string(),
  location_id: z.string().optional()
});

const StorytellerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  location_id: z.string().optional(),
  bio: z.string().optional(),
  consent_given: z.boolean()
});

export class SupabaseConnector extends BaseConnector {
  private client: SupabaseClient | null = null;
  private isInitialized = false;

  constructor(config: { 
    supabaseUrl?: string; 
    supabaseKey?: string; 
    serviceRoleKey?: string;
  } = {}) {
    super({
      timeout: 15000, // Shorter timeout for mobile
      cache: {
        ttl: 10 * 60 * 1000, // 10 minutes for story data
        maxSize: 500, // Smaller cache for mobile
        compressionEnabled: true,
        offlineMode: true
      },
      compliance: {
        dataResidency: 'australia',
        encryptionRequired: true,
        auditEnabled: true
      },
      mobile: {
        backgroundSync: true,
        wifiOnlySync: false, // Allow cellular for critical updates
        compressionEnabled: true,
        batteryOptimization: true
      }
    });

    this.initializeClient(config);
  }

  /**
   * Initialize Supabase client with Australian data residency
   */
  private async initializeClient(config: { 
    supabaseUrl?: string; 
    supabaseKey?: string; 
    serviceRoleKey?: string;
  }): Promise<void> {
    try {
      // Get credentials from secure storage or config
      const supabaseUrl = config.supabaseUrl || await this.getApiKey('supabase_url');
      const supabaseKey = config.serviceRoleKey || config.supabaseKey || await this.getApiKey('supabase_key');

      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials not found - connector will work in offline mode only');
        return;
      }

      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          storage: {
            getItem: async (key: string) => {
              return await this.getApiKey(`supabase_auth_${key}`);
            },
            setItem: async (key: string, value: string) => {
              await this.storeApiKey(`supabase_auth_${key}`, value);
            },
            removeItem: async (key: string) => {
              await this.storeApiKey(`supabase_auth_${key}`, '');
            }
          }
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Data-Residency': 'australia',
            'X-Client-Info': 'act-placemat-mobile'
          }
        }
      });

      this.isInitialized = true;
      console.log('🔌 Supabase connector initialized for Australian data residency');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }

  /**
   * Search stories with mobile-optimized caching and Australian compliance
   */
  public async searchStories(query: SearchQuery): Promise<ApiResponse<SearchResult<Story>>> {
    const cacheKey = `search_stories_${JSON.stringify(query)}`;
    
    // Try cache first for mobile performance
    const cached = await this.getCachedData<SearchResult<Story>>(cacheKey);
    if (cached && this.networkStatus.isMetered) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    if (!this.client || !this.isInitialized) {
      return await this.handleOfflineSearch<Story>(query, 'stories');
    }

    try {
      let queryBuilder = this.client
        .from('stories')
        .select(`
          *,
          storyteller:storyteller_id(
            full_name,
            location_id,
            bio,
            consent_given
          )
        `)
        .eq('is_public', true)
        .eq('consent_status', 'given'); // Australian privacy compliance

      // Apply search filters
      if (query.query) {
        // Try theme match first
        const themeQuery = this.client
          .from('stories')
          .select('*')
          .contains('themes', [query.query.toLowerCase()])
          .limit(query.pagination?.limit || 20);

        const { data: themeResults } = await themeQuery;

        if (themeResults && themeResults.length > 0) {
          const stories = themeResults.map(story => ({
            ...story,
            compliance: this.generateComplianceMetadata('story', story)
          })) as Story[];

          const result: SearchResult<Story> = {
            items: stories,
            total: themeResults.length,
            page: query.pagination?.page || 1,
            hasMore: false
          };

          await this.cacheData(cacheKey, result);
          return {
            data: result,
            source: 'network',
            timestamp: new Date().toISOString()
          };
        }

        // Fall back to text search
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query.query}%,content.ilike.%${query.query}%,impact.ilike.%${query.query}%`
        );
      }

      // Apply location filter for Australian regions
      if (query.filters?.location?.length) {
        queryBuilder = queryBuilder.in('storyteller.location_id', query.filters.location);
      }

      // Apply theme filters
      if (query.filters?.themes?.length) {
        queryBuilder = queryBuilder.overlaps('themes', query.filters.themes);
      }

      // Apply date range filter
      if (query.filters?.dateRange) {
        queryBuilder = queryBuilder
          .gte('created_at', query.filters.dateRange.start)
          .lte('created_at', query.filters.dateRange.end);
      }

      // Apply pagination
      const page = query.pagination?.page || 1;
      const limit = query.pagination?.limit || 20;
      const from = (page - 1) * limit;
      queryBuilder = queryBuilder.range(from, from + limit - 1);

      // Order by relevance and recency
      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error, count } = await queryBuilder;

      if (error) {
        throw error;
      }

      // Add compliance metadata to each story
      const stories = (data || []).map(story => ({
        ...story,
        compliance: this.generateComplianceMetadata('story', story)
      })) as Story[];

      const result: SearchResult<Story> = {
        items: stories,
        total: count || stories.length,
        page,
        hasMore: stories.length === limit
      };

      // Cache for mobile performance
      await this.cacheData(cacheKey, result);

      await this.logUsageMetrics('search_stories', {
        query: query.query,
        filters: query.filters,
        resultCount: stories.length
      });

      return {
        data: result,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Story search failed:', error);
      
      // Return cached data if available
      if (cached) {
        return {
          data: cached,
          source: 'cache',
          timestamp: new Date().toISOString(),
          cached: true,
          error: 'Network search failed, serving cached data'
        };
      }

      throw error;
    }
  }

  /**
   * Get all stories with consent verification for Australian compliance
   */
  public async getAllStories(): Promise<ApiResponse<Story[]>> {
    const cacheKey = 'all_stories_consented';
    
    // Check cache first for mobile performance
    const cached = await this.getCachedData<Story[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    if (!this.client || !this.isInitialized) {
      return {
        data: cached || [],
        source: 'offline',
        timestamp: new Date().toISOString(),
        error: 'Offline mode - no network connection'
      };
    }

    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          storyteller:storyteller_id(
            full_name,
            location_id,
            bio,
            consent_given
          )
        `)
        .eq('is_public', true)
        .eq('consent_status', 'given') // Australian Privacy Act compliance
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Add compliance metadata
      const stories = (data || []).map(story => ({
        ...story,
        compliance: this.generateComplianceMetadata('story', story)
      })) as Story[];

      // Cache for offline access
      await this.cacheData(cacheKey, stories, 15 * 60 * 1000); // 15 minutes

      await this.logUsageMetrics('get_all_stories', {
        storyCount: stories.length
      });

      return {
        data: stories,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to fetch all stories:', error);
      
      return {
        data: cached || [],
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get storytellers with privacy controls
   */
  public async getStorytellers(): Promise<ApiResponse<Storyteller[]>> {
    const cacheKey = 'storytellers_consented';
    
    const cached = await this.getCachedData<Storyteller[]>(cacheKey);
    if (cached && this.networkStatus.isMetered) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    if (!this.client || !this.isInitialized) {
      return {
        data: cached || [],
        source: 'offline',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const { data, error } = await this.client
        .from('storytellers')
        .select(`
          *,
          stories(
            id,
            title,
            themes,
            impact,
            consent_status
          )
        `)
        .eq('consent_given', true) // Only consented storytellers
        .order('full_name');

      if (error) {
        throw error;
      }

      // Add contact preferences and compliance metadata
      const storytellers = (data || []).map(storyteller => ({
        ...storyteller,
        contact_preferences: {
          email: false, // Default conservative settings
          sms: false,
          push: false
        },
        compliance: this.generateComplianceMetadata('storyteller', storyteller)
      })) as Storyteller[];

      await this.cacheData(cacheKey, storytellers);

      return {
        data: storytellers,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to fetch storytellers:', error);
      
      return {
        data: cached || [],
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get impact metrics for Australian community reporting
   */
  public async getImpactMetrics(): Promise<ApiResponse<any>> {
    const cacheKey = 'impact_metrics';
    
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    const stories = await this.getAllStories();
    const storyData = stories.data || [];

    try {
      // Calculate Australian-focused metrics
      const themes: Record<string, number> = {};
      const locations: Record<string, number> = {};
      const impacts: any[] = [];

      storyData.forEach(story => {
        // Theme frequency analysis
        if (story.themes) {
          story.themes.forEach(theme => {
            themes[theme] = (themes[theme] || 0) + 1;
          });
        }

        // Geographic distribution across Australian states/territories
        if (story.storyteller?.location_id) {
          const location = story.storyteller.location_id;
          locations[location] = (locations[location] || 0) + 1;
        }

        // Extract quantifiable impacts
        if (story.impact) {
          const numbers = story.impact.match(/\\d+/g);
          if (numbers) {
            impacts.push({
              story: story.title,
              numbers,
              impact: story.impact,
              location: story.storyteller?.location_id
            });
          }
        }
      });

      const metrics = {
        totalStories: storyData.length,
        totalStorytellers: new Set(storyData.map(s => s.storyteller_id)).size,
        topThemes: Object.entries(themes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([theme, count]) => ({ theme, count })),
        australianLocations: Object.entries(locations)
          .sort((a, b) => b[1] - a[1])
          .map(([location, count]) => ({ location, count })),
        quantifiableImpacts: impacts.length,
        geographicReach: Object.keys(locations).length,
        consentCompliance: '100%', // All stories are consent-verified
        dataResidency: 'australia',
        lastUpdated: new Date().toISOString(),
        exampleImpacts: impacts.slice(0, 5)
      };

      // Cache for 30 minutes
      await this.cacheData(cacheKey, metrics, 30 * 60 * 1000);

      return {
        data: metrics,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to calculate impact metrics:', error);
      
      return {
        data: cached || null,
        source: 'cache',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to calculate metrics'
      };
    }
  }

  /**
   * Handle offline search requests
   */
  private async handleOfflineSearch<T>(query: SearchQuery, entity: string): Promise<ApiResponse<SearchResult<T>>> {
    const cacheKey = `search_${entity}_${JSON.stringify(query)}`;
    const cached = await this.getCachedData<SearchResult<T>>(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        source: 'offline',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    // Return empty result for offline mode
    return {
      data: {
        items: [],
        total: 0,
        page: 1,
        hasMore: false
      } as SearchResult<T>,
      source: 'offline',
      timestamp: new Date().toISOString(),
      error: 'No cached data available for offline search'
    };
  }

  /**
   * Generate compliance metadata for Australian regulations
   */
  private generateComplianceMetadata(entityType: string, data: any): ComplianceMetadata {
    return {
      dataResidency: 'australia',
      privacyLevel: data.is_public ? 'public' : 'community',
      consentRequired: true,
      retentionPeriod: entityType === 'story' ? 365 * 7 : 365 * 3, // 7 years for stories, 3 for profiles
      auditTrail: true
    };
  }

  /**
   * Process offline actions when network is restored
   */
  protected async processOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.client || !this.isInitialized) {
      throw new Error('Supabase client not initialized');
    }

    console.log(`🔄 Processing offline ${action.type} for ${action.entity} ${action.id}`);

    try {
      switch (action.type) {
        case 'create':
          await this.client.from(`${action.entity}s`).insert(action.data);
          break;
        case 'update':
          await this.client.from(`${action.entity}s`).update(action.data).eq('id', action.id);
          break;
        case 'delete':
          await this.client.from(`${action.entity}s`).delete().eq('id', action.id);
          break;
      }

      console.log(`✅ Successfully processed offline ${action.type} for ${action.entity}`);
    } catch (error) {
      console.error(`❌ Failed to process offline ${action.type}:`, error);
      throw error;
    }
  }

  /**
   * Check authentication status
   */
  public async isAuthenticated(): Promise<boolean> {
    if (!this.client) return false;
    
    const { data: { user } } = await this.client.auth.getUser();
    return user !== null;
  }

  /**
   * Sign in with Australian privacy compliance
   */
  public async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      await this.logUsageMetrics('user_signin', {
        userId: data.user?.id,
        method: 'email_password'
      });

      return {
        data,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Get connection status for mobile UI
   */
  public getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    dataResidency: string;
    cacheSize: number;
  } {
    return {
      connected: this.isInitialized && this.networkStatus.isConnected,
      authenticated: false, // Would need to check auth state
      dataResidency: 'australia',
      cacheSize: this.cache.size
    };
  }
}