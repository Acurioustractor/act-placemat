// Person service for fetching and managing person data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Person, PersonFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing person/contact data from Notion databases.
 * Provides methods to query, filter, and manage relationships with key contacts and stakeholders.
 */
class PersonService {
  /**
   * Fetches all people/contacts with optional filtering and sorting capabilities.
   * Includes intelligent fallback to mock data if the API fails.
   *
   * @param {PersonFilters} [filters] - Optional filters to apply to the person query
   * @param {SortOption} [sort] - Optional sort configuration for ordering results
   * @returns {Promise<Person[]>} Promise resolving to an array of people matching the criteria
   * @throws {Error} Logs errors but falls back to mock data to prevent app crashes
   * @example
   * // Fetch people by organization
   * const people = await personService.getPeople({ organization: ['Company XYZ'] });
   *
   * @example
   * // Fetch people sorted by relationship strength
   * const sortedPeople = await personService.getPeople(
   *   undefined,
   *   { field: 'relationshipStrength', direction: 'desc' }
   * );
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
   * Fetches a single person by their unique identifier.
   * Queries the Notion database for a person with a matching ID.
   *
   * @param {string} id - The unique identifier of the person to fetch
   * @returns {Promise<Person | undefined>} Promise resolving to the person if found, undefined otherwise
   * @throws {Error} Logs errors and returns undefined to handle missing persons gracefully
   * @example
   * const person = await personService.getPersonById('person-123');
   * if (person) {
   *   console.log(`Found contact: ${person.fullName} at ${person.organization}`);
   * }
   */
  async getPersonById(id: string): Promise<Person | undefined> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('people');

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
      const people = await smartDataService.fetchData<Person>('people', requestPayload);

      // Return first match or undefined
      return people[0];
    } catch (error) {
      console.error(`Error fetching person with ID ${id}:`, error);

      // Fall back to smart data service for mock data
      return undefined;
    }
  }
  
  /**
   * Fetches people whose next contact date falls within the specified time threshold.
   * Useful for identifying contacts that need follow-up soon.
   *
   * @param {number} [daysThreshold=7] - Number of days to look ahead for follow-ups (default: 7)
   * @returns {Promise<Person[]>} Promise resolving to an array of people needing follow-up, sorted by next contact date
   * @throws {Error} Logs errors but falls back to mock data to prevent app crashes
   * @example
   * // Get people needing follow-up in the next week
   * const followUps = await personService.getPeopleNeedingFollowUp();
   *
   * @example
   * // Get people needing follow-up in the next 30 days
   * const monthlyFollowUps = await personService.getPeopleNeedingFollowUp(30);
   */
  async getPeopleNeedingFollowUp(daysThreshold = 7): Promise<Person[]> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('people');

      const today = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + daysThreshold);

      // Create request payload to filter by next contact date
      const requestPayload: NotionQueryRequest = {
        databaseId,
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

      // Use smart data service with intelligent fallbacks
      return await smartDataService.fetchData<Person>('people', requestPayload);
    } catch (error) {
      console.error('Error fetching people needing follow-up:', error);

      // Fall back to smart data service with empty payload for mock data
      return smartDataService.fetchData<Person>('people', {});
    }
  }
  
  /**
   * Converts application-level person filters into Notion API filter format.
   * Maps filter properties to their corresponding Notion database property names.
   *
   * @private
   * @param {PersonFilters} [filters] - Application filter object with typed properties
   * @returns {Record<string, unknown>} Notion-formatted filter object with AND conditions
   */
  private buildNotionFilters(filters?: PersonFilters): Record<string, unknown> {
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