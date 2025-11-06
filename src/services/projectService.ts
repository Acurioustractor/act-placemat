// Project service for fetching and managing project data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Project, ProjectFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing project data
 */
class ProjectService {
  /**
   * Fetch all projects with optional filters
   * @param filters - Optional filters to apply
   * @param sort - Optional sort configuration
   * @returns Promise with array of projects
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
   * Fetch a single project by ID
   * @param id - Project ID
   * @returns Promise with project or undefined if not found
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
   * Build Notion filter object from application filters
   * @param filters - Application filter object
   * @returns Notion filter object
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
   * Build Notion sort object from application sort option
   * @param sort - Application sort option
   * @returns Notion sort object
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