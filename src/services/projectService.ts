// Project service for fetching and managing project data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Project, ProjectFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing project data from Notion databases.
 * Provides methods to query, filter, and sort projects with intelligent fallbacks.
 */
class ProjectService {
  /**
   * Fetches all projects with optional filtering and sorting capabilities.
   * Uses the smart data service for intelligent caching and fallback strategies.
   *
   * @param {ProjectFilters} [filters] - Optional filters to apply to the project query
   * @param {SortOption} [sort] - Optional sort configuration for ordering results
   * @returns {Promise<Project[]>} Promise resolving to an array of projects matching the criteria
   * @throws {Error} Logs errors but returns empty array as fallback to prevent app crashes
   * @example
   * // Fetch all active projects
   * const projects = await projectService.getProjects({ status: ['Active'] });
   *
   * @example
   * // Fetch projects with sorting
   * const sortedProjects = await projectService.getProjects(
   *   undefined,
   *   { field: 'lastModified', direction: 'desc' }
   * );
   */
  async getProjects(filters?: ProjectFilters, sort?: SortOption): Promise<Project[]> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('projects');
      
      // Build Notion filter object
      const notionFilters = this.buildNotionFilters(filters);
      
      // Build Notion sort object
      const notionSorts = sort ? [this.buildNotionSort(sort)] : [];
      
      // Create request payload
      const requestPayload: NotionQueryRequest = {
        databaseId,
        filters: notionFilters,
        sorts: notionSorts
      };
      
      // Use smart data service with intelligent fallbacks
      return smartDataService.fetchData<Project>('projects', requestPayload);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      // Return empty array as fallback
      return [];
    }
  }
  
  /**
   * Fetches a single project by its unique identifier.
   * Queries the Notion database for a project with a matching ID.
   *
   * @param {string} id - The unique identifier of the project to fetch
   * @returns {Promise<Project | undefined>} Promise resolving to the project if found, undefined otherwise
   * @throws {Error} Logs errors and returns undefined to handle missing projects gracefully
   * @example
   * const project = await projectService.getProjectById('project-123');
   * if (project) {
   *   console.log('Found project:', project.name);
   * }
   */
  async getProjectById(id: string): Promise<Project | undefined> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('projects');
      
      // Create request payload to filter by ID
      const requestPayload: NotionQueryRequest = {
        databaseId,
        filters: {
          property: 'id',
          rich_text: {
            equals: id
          }
        }
      };
      
      // Use smart data service
      const projects = await smartDataService.fetchData<Project>('projects', requestPayload);
      
      // Return first match or undefined
      return projects[0];
    } catch (error) {
      console.error(`Failed to fetch project ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Converts application-level project filters into Notion API filter format.
   * Maps filter properties to their corresponding Notion database property names
   * and constructs compound AND filters for multiple criteria.
   *
   * @private
   * @param {ProjectFilters} [filters] - Application filter object with typed properties
   * @returns {Record<string, unknown>} Notion-formatted filter object with AND conditions
   * @example
   * // Input filters
   * const filters = { area: ['Economic Freedom'], status: ['Active'] };
   * // Returns: { and: [{ property: 'Theme', multi_select: { contains: 'Economic Freedom' } }, ...] }
   */
  private buildNotionFilters(filters?: ProjectFilters): Record<string, unknown> {
    console.log('🔍 Building Notion filters with:', filters);
    if (!filters) return {};
    
    const conditions = [];
    
    // Area filter - database has "Theme" property as multi_select
    if (filters.area && filters.area.length > 0) {
      conditions.push({
        property: 'Theme',
        multi_select: {
          contains: filters.area[0] // Theme is multi_select in database
        }
      });
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      conditions.push({
        property: 'Status',
        select: {
          equals: filters.status[0] // Notion only supports single select equals
        }
      });
    }
    
    // Location filter - database has "Location" property as select
    if (filters.location && filters.location.length > 0) {
      conditions.push({
        property: 'Location',
        select: {
          equals: filters.location[0] // Location is a select property
        }
      });
    }
    
    // Tags filter (multi-select)
    if (filters.tags && filters.tags.length > 0) {
      conditions.push({
        property: 'Tags',
        multi_select: {
          contains: filters.tags[0]
        }
      });
    }
    
    // Revenue range filter
    if (filters.revenueRange) {
      if (filters.revenueRange.min !== undefined) {
        conditions.push({
          property: 'Revenue Actual',
          number: {
            greater_than_or_equal_to: filters.revenueRange.min
          }
        });
      }
      
      if (filters.revenueRange.max !== undefined) {
        conditions.push({
          property: 'Revenue Actual',
          number: {
            less_than_or_equal_to: filters.revenueRange.max
          }
        });
      }
    }
    
    // Date range filter
    if (filters.dateRange) {
      if (filters.dateRange.start) {
        conditions.push({
          property: 'Start Date',
          date: {
            on_or_after: filters.dateRange.start.toISOString()
          }
        });
      }
      
      if (filters.dateRange.end) {
        conditions.push({
          property: 'End Date',
          date: {
            on_or_before: filters.dateRange.end.toISOString()
          }
        });
      }
    }
    
    // Search filter
    if (filters.search) {
      conditions.push({
        property: 'Name',
        title: {
          contains: filters.search
        }
      });
    }
    
    // Return combined filters
    const result = conditions.length > 0 ? { and: conditions } : {};
    console.log('📋 Built Notion filters:', JSON.stringify(result, null, 2));
    return result;
  }
  
  /**
   * Converts application-level sort options into Notion API sort format.
   * Maps application field names to their corresponding Notion property names
   * and translates sort directions to Notion's ascending/descending format.
   *
   * @private
   * @param {SortOption} sort - Application sort option with field and direction
   * @returns {{ property: string; direction: 'ascending' | 'descending' }} Notion-formatted sort object
   * @example
   * // Input: { field: 'name', direction: 'asc' }
   * // Returns: { property: 'Name', direction: 'ascending' }
   */
  private buildNotionSort(sort: SortOption): { property: string; direction: 'ascending' | 'descending' } {
    // Map application field names to Notion property names
    const fieldMap: Record<string, string> = {
      name: 'Name',
      lastModified: 'last_edited_time',
      revenueActual: 'Revenue Actual',
      revenuePotential: 'Revenue Potential',
      nextMilestone: 'Next Milestone'
    };

    const notionProperty = fieldMap[sort.field] || sort.field;

    return {
      property: notionProperty,
      direction: sort.direction === 'asc' ? 'ascending' : 'descending'
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService();

// Export class for testing and extension
export default ProjectService;