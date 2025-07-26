// Organization service for fetching and managing organization data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Organization, OrganizationFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing organization data
 */
class OrganizationService {
  /**
   * Fetch all organizations with optional filters
   * @param filters - Optional filters to apply
   * @param sort - Optional sort configuration
   * @returns Promise with array of organizations
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
   * Fetch a single organization by ID
   * @param id - Organization ID
   * @returns Promise with organization or undefined if not found
   */
  async getOrganizationById(id: string): Promise<Organization | undefined> {
    try {
      // Create request payload to filter by ID
      const requestPayload: NotionQueryRequest = {
        databaseId: DATABASE_IDS.ORGANIZATIONS,
        filters: {
          property: 'id',
          rich_text: {
            equals: id
          }
        }
      };
      
      // Make API request
      const response = await apiService.post<NotionResponse<any>>(
        API_ENDPOINTS.ORGANIZATIONS,
        requestPayload
      );
      
      // Transform response to Organization objects
      const organizations = transformNotionResponse<Organization>(response, transformNotionOrganization);
      
      // Return first match or undefined
      return organizations[0];
    } catch (error) {
      console.error(`Error fetching organization with ID ${id}:`, error);
      
      // If feature flag for real-time updates is off, return mock data
      if (!FEATURE_FLAGS.REAL_TIME_UPDATES) {
        console.log('Using mock organization data');
        return getMockOrganizationById(id);
      }
      
      throw error;
    }
  }
  
  /**
   * Build Notion filter object from application filters
   * @param filters - Application filter object
   * @returns Notion filter object
   */
  private buildNotionFilters(filters?: OrganizationFilters): any {
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
   * Build Notion sort object from application sort option
   * @param sort - Application sort option
   * @returns Notion sort object
   */
  private buildNotionSort(sort: SortOption): any {
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