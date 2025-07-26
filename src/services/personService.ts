// Person service for fetching and managing person data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Person, PersonFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing person data
 */
class PersonService {
  /**
   * Fetch all people with optional filters
   * @param filters - Optional filters to apply
   * @param sort - Optional sort configuration
   * @returns Promise with array of people
   */
  async getPeople(filters?: PersonFilters, sort?: SortOption): Promise<Person[]> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('people');
      
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
      return smartDataService.fetchData<Person>('people', requestPayload);
    } catch (error) {
      console.error('Error fetching people:', error);
      // Fall back to smart data service with empty payload for mock data
      return smartDataService.fetchData<Person>('people', {});
    }
  }
  
  /**
   * Fetch a single person by ID
   * @param id - Person ID
   * @returns Promise with person or undefined if not found
   */
  async getPersonById(id: string): Promise<Person | undefined> {
    try {
      // Create request payload to filter by ID
      const requestPayload: NotionQueryRequest = {
        databaseId: DATABASE_IDS.PEOPLE,
        filters: {
          property: 'id',
          rich_text: {
            equals: id
          }
        }
      };
      
      // Make API request
      const response = await apiService.post<NotionResponse<any>>(
        API_ENDPOINTS.PEOPLE,
        requestPayload
      );
      
      // Transform response to Person objects
      const people = transformNotionResponse<Person>(response, transformNotionPerson);
      
      // Return first match or undefined
      return people[0];
    } catch (error) {
      console.error(`Error fetching person with ID ${id}:`, error);
      
      // If feature flag for real-time updates is off, return mock data
      if (!FEATURE_FLAGS.REAL_TIME_UPDATES) {
        console.log('Using mock person data');
        return getMockPersonById(id);
      }
      
      throw error;
    }
  }
  
  /**
   * Get people who need follow-up soon
   * @param daysThreshold - Number of days to consider for follow-up
   * @returns Promise with array of people needing follow-up
   */
  async getPeopleNeedingFollowUp(daysThreshold = 7): Promise<Person[]> {
    try {
      const today = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + daysThreshold);
      
      // Create request payload to filter by next contact date
      const requestPayload: NotionQueryRequest = {
        databaseId: DATABASE_IDS.PEOPLE,
        filters: {
          property: 'Next Contact Date',
          date: {
            on_or_before: thresholdDate.toISOString()
          }
        },
        sorts: [
          {
            property: 'Next Contact Date',
            direction: 'ascending'
          }
        ]
      };
      
      // Make API request
      const response = await apiService.post<NotionResponse<any>>(
        API_ENDPOINTS.PEOPLE,
        requestPayload
      );
      
      // Transform response to Person objects
      return transformNotionResponse<Person>(response, transformNotionPerson);
    } catch (error) {
      console.error('Error fetching people needing follow-up:', error);
      
      // If feature flag for real-time updates is off, return filtered mock data
      if (!FEATURE_FLAGS.REAL_TIME_UPDATES) {
        console.log('Using mock person data for follow-ups');
        const today = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(today.getDate() + daysThreshold);
        
        return getMockPeople().filter(person => 
          person.nextContactDate && person.nextContactDate <= thresholdDate
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Build Notion filter object from application filters
   * @param filters - Application filter object
   * @returns Notion filter object
   */
  private buildNotionFilters(filters?: PersonFilters): any {
    console.log('👤 Building Notion filters for people with:', filters);
    if (!filters) return {};
    
    const conditions = [];
    
    // Company filter (actual database property)
    if (filters.organization && filters.organization.length > 0) {
      conditions.push({
        property: 'Company',
        select: {
          equals: filters.organization[0] // Company is a select field with many options
        }
      });
    }
    
    // Email filter 
    if (filters.email) {
      conditions.push({
        property: 'Email',
        email: {
          equals: filters.email
        }
      });
    }
    
    // Mobile filter
    if (filters.mobile) {
      conditions.push({
        property: 'Mobile',
        phone_number: {
          equals: filters.mobile
        }
      });
    }
    
    // Source filter
    if (filters.source) {
      conditions.push({
        property: 'Source',
        rich_text: {
          contains: filters.source
        }
      });
    }
    
    // Search filter - Note: no title field found in actual schema, might need to search Email instead
    if (filters.search) {
      conditions.push({
        property: 'Email',
        email: {
          contains: filters.search
        }
      });
    }
    
    // Remove unsupported filters (no Relationship Type, Influence Level, Location, Expertise in actual schema)
    
    // Return combined filters
    const result = conditions.length > 0 ? { and: conditions } : {};
    console.log('👤 Built Notion filters for people:', JSON.stringify(result, null, 2));
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
      fullName: 'Full Name',
      lastModified: 'last_edited_time',
      lastContactDate: 'Last Contact Date',
      nextContactDate: 'Next Contact Date',
      relationshipStrength: 'Relationship Strength'
    };
    
    const notionProperty = fieldMap[sort.field] || sort.field;
    
    return {
      property: notionProperty,
      direction: sort.direction === 'asc' ? 'ascending' : 'descending'
    };
  }
}

// Export singleton instance
export const personService = new PersonService();

// Export class for testing and extension
export default PersonService;