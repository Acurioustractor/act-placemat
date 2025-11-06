// Organization service for fetching and managing organization data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Organization, OrganizationFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing organization data from Notion databases.
 * Provides methods to query, filter, and manage relationships with partner organizations.
 */
class OrganizationService {
  /**
   * Fetches all organizations with optional filtering and sorting capabilities.
   * Includes intelligent fallback to mock data if the API fails.
   *
   * @param {OrganizationFilters} [filters] - Optional filters to apply to the organization query
   * @param {SortOption} [sort] - Optional sort configuration for ordering results
   * @returns {Promise<Organization[]>} Promise resolving to an array of organizations matching the criteria
   * @throws {Error} Logs errors but falls back to mock data to prevent app crashes
   * @example
   * // Fetch all partner organizations
   * const partners = await organizationService.getOrganizations({ relationshipStatus: ['Partner'] });
   *
   * @example
   * // Fetch organizations sorted by strategic priority
   * const sortedOrgs = await organizationService.getOrganizations(
   *   undefined,
   *   { field: 'strategicPriority', direction: 'desc' }
   * );
   */
  async getOrganizations(filters?: OrganizationFilters, sort?: SortOption): Promise<Organization[]> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('organizations');
      
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
      return smartDataService.fetchData<Organization>('organizations', requestPayload);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      // Fall back to smart data service with empty payload for mock data
      return smartDataService.fetchData<Organization>('organizations', {});
    }
  }
  
  /**
   * Fetches a single organization by its unique identifier.
   * Queries the Notion database for an organization with a matching ID.
   *
   * @param {string} id - The unique identifier of the organization to fetch
   * @returns {Promise<Organization | undefined>} Promise resolving to the organization if found, undefined otherwise
   * @throws {Error} Logs errors and returns undefined to handle missing organizations gracefully
   * @example
   * const org = await organizationService.getOrganizationById('org-789');
   * if (org) {
   *   console.log(`Found organization: ${org.name} (${org.type})`);
   * }
   */
  async getOrganizationById(id: string): Promise<Organization | undefined> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('organizations');

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

      // Use smart data service with intelligent fallbacks
      const organizations = await smartDataService.fetchData<Organization>('organizations', requestPayload);

      // Return first match or undefined
      return organizations[0];
    } catch (error) {
      console.error(`Error fetching organization with ID ${id}:`, error);

      // Fall back to smart data service for mock data
      return undefined;
    }
  }
  
  /**
   * Converts application-level organization filters into Notion API filter format.
   * Maps filter properties to their corresponding Notion database property names
   * and constructs compound AND filters for multiple criteria.
   *
   * @private
   * @param {OrganizationFilters} [filters] - Application filter object with typed properties
   * @returns {Record<string, unknown>} Notion-formatted filter object with AND conditions
   */
  private buildNotionFilters(filters?: OrganizationFilters): Record<string, unknown> {
    console.log('🏢 Building Notion filters for organizations with:', filters);
    if (!filters) return {};
    
    const conditions = [];
    
    // Status filter (actual database property)
    if (filters.status && filters.status.length > 0) {
      conditions.push({
        property: 'Status',
        select: {
          equals: filters.status[0] // Options: "Contacted", "Research", "Pitched", "Diligence", "Won", "Lost"
        }
      });
    }
    
    // Type filter - Map to Status since that's what exists
    if (filters.type && filters.type.length > 0) {
      conditions.push({
        property: 'Status',
        select: {
          equals: filters.type[0]
        }
      });
    }
    
    // Relationship status filter - Map to Status
    if (filters.relationshipStatus && filters.relationshipStatus.length > 0) {
      conditions.push({
        property: 'Status',
        select: {
          equals: filters.relationshipStatus[0]
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
    
    // Remove unsupported filters for now (no Sector, Size, Location, Funding Capacity in actual schema)
    // Future: These could be added to the database schema if needed
    
    // Return combined filters
    const result = conditions.length > 0 ? { and: conditions } : {};
    console.log('🏢 Built Notion filters for organizations:', JSON.stringify(result, null, 2));
    return result;
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
      lastContactDate: 'Last Contact Date',
      nextContactDate: 'Next Contact Date',
      strategicPriority: 'Strategic Priority'
    };
    
    const notionProperty = fieldMap[sort.field] || sort.field;
    
    return {
      property: notionProperty,
      direction: sort.direction === 'asc' ? 'ascending' : 'descending'
    };
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();

// Export class for testing and extension
export default OrganizationService;