// Artifact service for fetching and managing artifact data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Artifact, ArtifactFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing artifact/document data from Notion databases.
 * Provides methods to query, filter, and manage project artifacts, documents, and media.
 */
class ArtifactService {
  /**
   * Fetches all artifacts with optional filtering and sorting capabilities.
   * Returns empty array as fallback if the API fails.
   *
   * @param {ArtifactFilters} [filters] - Optional filters to apply to the artifact query
   * @param {SortOption} [sort] - Optional sort configuration for ordering results
   * @returns {Promise<Artifact[]>} Promise resolving to an array of artifacts matching the criteria
   * @throws {Error} Logs errors but returns empty array to prevent app crashes
   * @example
   * // Fetch all presentation artifacts
   * const presentations = await artifactService.getArtifacts({ type: ['PRESENTATION'] });
   *
   * @example
   * // Fetch artifacts sorted by last modified date
   * const recentArtifacts = await artifactService.getArtifacts(
   *   undefined,
   *   { field: 'lastModified', direction: 'desc' }
   * );
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
   * Fetches a single artifact by its unique identifier.
   * Queries the Notion database for an artifact with a matching ID.
   *
   * @param {string} id - The unique identifier of the artifact to fetch
   * @returns {Promise<Artifact | undefined>} Promise resolving to the artifact if found, undefined otherwise
   * @throws {Error} Logs errors and returns undefined to handle missing artifacts gracefully
   * @example
   * const artifact = await artifactService.getArtifactById('artifact-456');
   * if (artifact) {
   *   console.log(`Found artifact: ${artifact.name} (${artifact.type})`);
   * }
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
   * Fetches all artifacts related to a specific entity.
   * Queries Notion using the relation property corresponding to the entity type.
   *
   * @param {'project' | 'opportunity' | 'organization' | 'person'} entityType - Type of entity to filter by
   * @param {string} entityId - The unique identifier of the entity
   * @returns {Promise<Artifact[]>} Promise resolving to an array of related artifacts
   * @throws {Error} If entityType is invalid, or logs errors and returns empty array for other failures
   * @example
   * // Get all artifacts for a project
   * const projectArtifacts = await artifactService.getArtifactsForEntity('project', 'proj-123');
   *
   * @example
   * // Get all artifacts for an opportunity
   * const oppArtifacts = await artifactService.getArtifactsForEntity('opportunity', 'opp-456');
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
   * Converts application-level artifact filters into Notion API filter format.
   * Maps filter properties to their corresponding Notion database property names.
   *
   * @private
   * @param {ArtifactFilters} [filters] - Application filter object with typed properties
   * @returns {Record<string, unknown>} Notion-formatted filter object with AND conditions
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
   * Converts application-level sort options into Notion API sort format.
   * Maps application field names to their corresponding Notion property names.
   *
   * @private
   * @param {SortOption} sort - Application sort option with field and direction
   * @returns {{ property: string; direction: 'ascending' | 'descending' }} Notion-formatted sort object
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