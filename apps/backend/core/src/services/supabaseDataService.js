/**
 * Supabase Data Service
 * Comprehensive service for accessing all Supabase data sources
 * 
 * Available Tables:
 * - stories: 347 records (community stories and impact narratives)
 * - storytellers: 220 records (community members with detailed profiles)
 * - organizations: 20 records (partner organizations)
 * - projects: 11 records (active community projects)
 * - locations: 21 records (geographic data)
 * - impact_stories: 0 records (empty, future use)
 * - themes: 0 records (empty, future use)
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../utils/loadEnv.js';

loadEnv();

class SupabaseDataService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Cache for performance
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    console.log('📊 Supabase Data Service initialized');
  }

  // Cache management
  getCacheKey(table, filter = {}) {
    return `${table}_${JSON.stringify(filter)}`;
  }

  isCacheValid(cacheKey) {
    if (!this.cache.has(cacheKey)) return false;
    const cached = this.cache.get(cacheKey);
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  setCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  getCache(cacheKey) {
    return this.cache.get(cacheKey)?.data;
  }

  /**
   * Get all stories with storyteller relationships
   */
  async getAllStories(useCache = true) {
    const cacheKey = this.getCacheKey('stories_full');
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('stories')
        .select(`
          *,
          storyteller:storyteller_id(
            full_name,
            bio,
            location_id,
            consent_given,
            expertise_areas,
            key_insights,
            organization_id,
            project_id
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.warn('Failed to fetch stories:', error.message);
      return [];
    }
  }

  /**
   * Get all storytellers with full profile data
   */
  async getAllStorytellers(useCache = true) {
    const cacheKey = this.getCacheKey('storytellers_full');
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('storytellers')
        .select(`
          *,
          organization:organization_id(name, description, type),
          project:project_id(name, description, status),
          location:location_id(name, country, state_province)
        `)
        .eq('consent_given', true)
        .order('full_name');

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.warn('Failed to fetch storytellers:', error.message);
      return [];
    }
  }

  /**
   * Get all organizations with their projects and storytellers
   */
  async getAllOrganizations(useCache = true) {
    const cacheKey = this.getCacheKey('organizations_full');
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get related data for each organization
      const enrichedOrganizations = await Promise.all(
        (data || []).map(async (org) => {
          const [projects, storytellers] = await Promise.allSettled([
            this.supabase
              .from('projects')
              .select('*')
              .eq('organization_id', org.id),
            this.supabase
              .from('storytellers')
              .select('id, full_name, bio')
              .eq('organization_id', org.id)
              .eq('consent_given', true)
          ]);

          return {
            ...org,
            projects: projects.status === 'fulfilled' ? projects.value.data || [] : [],
            storytellers: storytellers.status === 'fulfilled' ? storytellers.value.data || [] : []
          };
        })
      );

      this.setCache(cacheKey, enrichedOrganizations);
      return enrichedOrganizations;
    } catch (error) {
      console.warn('Failed to fetch organizations:', error.message);
      return [];
    }
  }

  /**
   * Get all projects with their storytellers and organization info
   */
  async getAllProjects(useCache = true) {
    const cacheKey = this.getCacheKey('projects_full');
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select(`
          *,
          organization:organization_id(name, description, type)
        `)
        .order('name');

      if (error) throw error;

      // Get storytellers for each project
      const enrichedProjects = await Promise.all(
        (data || []).map(async (project) => {
          const { data: storytellers } = await this.supabase
            .from('storytellers')
            .select('id, full_name, bio, expertise_areas')
            .eq('project_id', project.id)
            .eq('consent_given', true);

          return {
            ...project,
            storytellers: storytellers || []
          };
        })
      );

      this.setCache(cacheKey, enrichedProjects);
      return enrichedProjects;
    } catch (error) {
      console.warn('Failed to fetch projects:', error.message);
      return [];
    }
  }

  /**
   * Get all locations with related data
   */
  async getAllLocations(useCache = true) {
    const cacheKey = this.getCacheKey('locations_full');
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const { data, error } = await this.supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get storytellers for each location
      const enrichedLocations = await Promise.all(
        (data || []).map(async (location) => {
          const { data: storytellers } = await this.supabase
            .from('storytellers')
            .select('id, full_name, bio')
            .eq('location_id', location.id)
            .eq('consent_given', true);

          return {
            ...location,
            storytellers: storytellers || [],
            storyteller_count: (storytellers || []).length
          };
        })
      );

      this.setCache(cacheKey, enrichedLocations);
      return enrichedLocations;
    } catch (error) {
      console.warn('Failed to fetch locations:', error.message);
      return [];
    }
  }

  /**
   * Search across all Supabase data
   */
  async searchAll(query, options = {}) {
    try {
      const searchResults = {
        stories: [],
        storytellers: [],
        organizations: [],
        projects: [],
        total: 0
      };

      // Search stories
      const { data: stories } = await this.supabase
        .from('stories')
        .select(`
          *,
          storyteller:storyteller_id(full_name, bio)
        `)
        .eq('is_public', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,summary.ilike.%${query}%`)
        .limit(options.storiesLimit || 10);

      searchResults.stories = stories || [];

      // Search storytellers
      const { data: storytellers } = await this.supabase
        .from('storytellers')
        .select(`
          *,
          organization:organization_id(name),
          project:project_id(name)
        `)
        .eq('consent_given', true)
        .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(options.storytellersLimit || 10);

      searchResults.storytellers = storytellers || [];

      // Search organizations
      const { data: organizations } = await this.supabase
        .from('organizations')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(options.organizationsLimit || 5);

      searchResults.organizations = organizations || [];

      // Search projects
      const { data: projects } = await this.supabase
        .from('projects')
        .select(`
          *,
          organization:organization_id(name)
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(options.projectsLimit || 5);

      searchResults.projects = projects || [];

      searchResults.total = searchResults.stories.length + 
                           searchResults.storytellers.length + 
                           searchResults.organizations.length + 
                           searchResults.projects.length;

      return searchResults;
    } catch (error) {
      console.warn('Supabase search failed:', error.message);
      return {
        stories: [],
        storytellers: [],
        organizations: [],
        projects: [],
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive platform statistics
   */
  async getPlatformStats() {
    try {
      const [stories, storytellers, organizations, projects, locations] = await Promise.allSettled([
        this.supabase.from('stories').select('*', { count: 'exact', head: true }).eq('is_public', true),
        this.supabase.from('storytellers').select('*', { count: 'exact', head: true }).eq('consent_given', true),
        this.supabase.from('organizations').select('*', { count: 'exact', head: true }),
        this.supabase.from('projects').select('*', { count: 'exact', head: true }),
        this.supabase.from('locations').select('*', { count: 'exact', head: true })
      ]);

      return {
        stories: stories.status === 'fulfilled' ? stories.value.count || 0 : 0,
        storytellers: storytellers.status === 'fulfilled' ? storytellers.value.count || 0 : 0,
        organizations: organizations.status === 'fulfilled' ? organizations.value.count || 0 : 0,
        projects: projects.status === 'fulfilled' ? projects.value.count || 0 : 0,
        locations: locations.status === 'fulfilled' ? locations.value.count || 0 : 0
      };
    } catch (error) {
      console.warn('Failed to get platform stats:', error.message);
      return {
        stories: 0,
        storytellers: 0,
        organizations: 0,
        projects: 0,
        locations: 0
      };
    }
  }

  /**
   * Get storytellers by organization
   */
  async getStorytellersByOrganization(organizationId) {
    try {
      const { data, error } = await this.supabase
        .from('storytellers')
        .select(`
          *,
          organization:organization_id(name, description),
          project:project_id(name, description)
        `)
        .eq('organization_id', organizationId)
        .eq('consent_given', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Failed to get storytellers by organization:', error.message);
      return [];
    }
  }

  /**
   * Get stories by location
   */
  async getStoriesByLocation(locationId) {
    try {
      const { data, error } = await this.supabase
        .from('stories')
        .select(`
          *,
          storyteller:storyteller_id!inner(
            full_name,
            bio,
            location_id
          )
        `)
        .eq('storyteller.location_id', locationId)
        .eq('is_public', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Failed to get stories by location:', error.message);
      return [];
    }
  }

  /**
   * Health check for all tables
   */
  async healthCheck() {
    const health = {
      overall: 'healthy',
      tables: {},
      stats: {}
    };

    const tables = ['stories', 'storytellers', 'organizations', 'projects', 'locations'];

    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) throw error;

        health.tables[table] = {
          status: 'healthy',
          count: count || 0,
          accessible: true
        };
      } catch (error) {
        health.tables[table] = {
          status: 'error',
          count: 0,
          accessible: false,
          error: error.message
        };
        health.overall = 'degraded';
      }
    }

    health.stats = await this.getPlatformStats();

    return health;
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Supabase data cache cleared');
  }
}

// Export singleton instance
export default new SupabaseDataService();
