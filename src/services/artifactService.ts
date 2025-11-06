// Artifact service for fetching and managing artifact data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Artifact, ArtifactFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing artifact data
 */
class ArtifactService {
  /**
   * Fetch all artifacts with optional filters
   * @param filters - Optional filters to apply
   * @param sort - Optional sort configuration
   * @returns Promise with array of artifacts
   */
  async getArtifacts(filters?: ArtifactFilters, sort?: SortOption): Promise<Artifact[]> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('artifacts');
      
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
      return smartDataService.fetchData<Artifact>('artifacts', requestPayload);
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
      // Return empty array as fallback
      return [];
    }
  }
  
  /**
   * Fetch a single artifact by ID
   * @param id - Artifact ID
   * @returns Promise with artifact or undefined if not found
   */
  async getArtifactById(id: string): Promise<Artifact | undefined> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('artifacts');
      
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
      const artifacts = await smartDataService.fetchData<Artifact>('artifacts', requestPayload);
      
      // Return first match or undefined
      return artifacts[0];
    } catch (error) {
      console.error(`Failed to fetch artifact ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Get artifacts for a specific entity (project, opportunity, etc.)
   * @param entityType - Type of entity ('project', 'opportunity', 'organization', 'person')
   * @param entityId - ID of the entity
   * @returns Promise with array of related artifacts
   */
  async getArtifactsForEntity(entityType: 'project' | 'opportunity' | 'organization' | 'person', entityId: string): Promise<Artifact[]> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('artifacts');
      
      // Map entity type to Notion property name
      const propertyMap: Record<string, string> = {
        project: 'Related Projects',
        opportunity: 'Related Opportunities',
        organization: 'Related Organizations',
        person: 'Related People'
      };
      
      const propertyName = propertyMap[entityType];
      
      if (!propertyName) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      
      // Create request payload to filter by relation
      const requestPayload: NotionQueryRequest = {
        databaseId,
        filters: {
          property: propertyName,
          relation: {
            contains: entityId
          }
        }
      };
      
      // Use smart data service
      return smartDataService.fetchData<Artifact>('artifacts', requestPayload);
    } catch (error) {
      console.error(`Failed to fetch artifacts for ${entityType} ${entityId}:`, error);
      return [];
    }
  }
  
  /**
   * Build Notion filter object from application filters
   * @param filters - Application filter object
   * @returns Notion filter object
   */
  private buildNotionFilters(filters?: ArtifactFilters): Record<string, unknown> {
    if (!filters) return {};
    
    const conditions = [];
    
    // Type filter
    if (filters.type && filters.type.length > 0) {
      conditions.push({
        property: 'Type',
        select: {
          equals: filters.type[0]
        }
      });
    }
    
    // Format filter
    if (filters.format && filters.format.length > 0) {
      conditions.push({
        property: 'Format',
        select: {
          equals: filters.format[0]
        }
      });
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      conditions.push({
        property: 'Status',
        select: {
          equals: filters.status[0]
        }
      });
    }
    
    // Purpose filter
    if (filters.purpose && filters.purpose.length > 0) {
      conditions.push({
        property: 'Purpose',
        select: {
          equals: filters.purpose[0]
        }
      });
    }
    
    // Access level filter
    if (filters.accessLevel && filters.accessLevel.length > 0) {
      conditions.push({
        property: 'Access Level',
        select: {
          equals: filters.accessLevel[0]
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
    return conditions.length > 0 ? { and: conditions } : {};
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
      version: 'Version',
      reviewDate: 'Review Date'
    };
    
    const notionProperty = fieldMap[sort.field] || sort.field;
    
    return {
      property: notionProperty,
      direction: sort.direction === 'asc' ? 'ascending' : 'descending'
    };
  }
}

// Export singleton instance
export const artifactService = new ArtifactService();

// Export class for testing and extension
export default ArtifactService;