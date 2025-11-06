// Opportunity service for fetching and managing opportunity data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Opportunity, OpportunityFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing opportunity data from Notion databases.
 * Provides methods to query, filter, and analyze opportunities with intelligent fallbacks.
 */
class OpportunityService {
  /**
   * Fetches all opportunities with optional filtering and sorting capabilities.
   * Includes intelligent fallback to mock data if the API fails.
   *
   * @param {OpportunityFilters} [filters] - Optional filters to apply to the opportunity query
   * @param {SortOption} [sort] - Optional sort configuration for ordering results
   * @returns {Promise<Opportunity[]>} Promise resolving to an array of opportunities matching the criteria
   * @throws {Error} Logs errors but falls back to mock data to prevent app crashes
   * @example
   * // Fetch opportunities by stage
   * const opportunities = await opportunityService.getOpportunities({ stage: ['Proposal'] });
   *
   * @example
   * // Fetch opportunities sorted by amount
   * const sortedOpps = await opportunityService.getOpportunities(
   *   undefined,
   *   { field: 'amount', direction: 'desc' }
   * );
   */
  async getOpportunities(filters?: OpportunityFilters, sort?: SortOption): Promise<Opportunity[]> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('opportunities');
      
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
      return smartDataService.fetchData<Opportunity>('opportunities', requestPayload);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      // Fall back to smart data service with empty payload for mock data
      return smartDataService.fetchData<Opportunity>('opportunities', {});
    }
  }
  
  /**
   * Fetches a single opportunity by its unique identifier.
   * Queries the Notion database for an opportunity with a matching ID.
   *
   * @param {string} id - The unique identifier of the opportunity to fetch
   * @returns {Promise<Opportunity | undefined>} Promise resolving to the opportunity if found, undefined otherwise
   * @throws {Error} Logs errors and returns undefined to handle missing opportunities gracefully
   * @example
   * const opportunity = await opportunityService.getOpportunityById('opp-456');
   * if (opportunity) {
   *   console.log(`Found opportunity: ${opportunity.name} - $${opportunity.amount}`);
   * }
   */
  async getOpportunityById(id: string): Promise<Opportunity | undefined> {
    try {
      // Get database ID from config service
      const databaseId = await configService.getDatabaseId('opportunities');
      
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
      const opportunities = await smartDataService.fetchData<Opportunity>('opportunities', requestPayload);
      
      // Return first match or undefined
      return opportunities[0];
    } catch (error) {
      console.error(`Error fetching opportunity with ID ${id}:`, error);
      
      // Fall back to smart data service for mock data
      return undefined;
    }
  }
  
  /**
   * Calculates comprehensive pipeline metrics for a set of opportunities.
   * Computes total value, weighted value, average probability, and breakdowns by stage.
   *
   * @param {Opportunity[]} opportunities - Array of opportunities to analyze
   * @returns {{ totalValue: number; weightedValue: number; averageProbability: number; totalCount: number; byStage: Record<string, number> }} Object containing calculated pipeline metrics
   * @example
   * const opportunities = await opportunityService.getOpportunities();
   * const metrics = opportunityService.calculatePipelineMetrics(opportunities);
   * console.log(`Total pipeline value: $${metrics.totalValue}`);
   * console.log(`Weighted pipeline value: $${metrics.weightedValue}`);
   * console.log(`Average win probability: ${metrics.averageProbability}%`);
   */
  calculatePipelineMetrics(opportunities: Opportunity[]) {
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
    const weightedValue = opportunities.reduce((sum, opp) => sum + opp.weightedValue, 0);
    
    const totalCount = opportunities.length;
    const averageProbability = totalCount > 0
      ? opportunities.reduce((sum, opp) => sum + opp.probability, 0) / totalCount
      : 0;
    
    // Count opportunities by stage
    const byStage: Record<string, number> = {};
    opportunities.forEach(opp => {
      byStage[opp.stage] = (byStage[opp.stage] || 0) + 1;
    });
    
    return {
      totalValue,
      weightedValue,
      averageProbability,
      totalCount,
      byStage
    };
  }
  
  /**
   * Converts application-level opportunity filters into Notion API filter format.
   * Maps filter properties to their corresponding Notion database property names
   * and constructs compound AND filters for multiple criteria.
   *
   * @private
   * @param {OpportunityFilters} [filters] - Application filter object with typed properties
   * @returns {Record<string, unknown>} Notion-formatted filter object with AND conditions
   * @example
   * // Input filters
   * const filters = { stage: ['Proposal'], amountRange: { min: 10000, max: 50000 } };
   * // Returns Notion filter with AND conditions for stage and amount range
   */
  private buildNotionFilters(filters?: OpportunityFilters): Record<string, unknown> {
    console.log('🔍 Building Notion filters for opportunities with:', filters);
    if (!filters) return {};
    
    const conditions = [];
    
    // Stage filter
    if (filters.stage && filters.stage.length > 0) {
      conditions.push({
        property: 'Stage',
        select: {
          equals: filters.stage[0] // Notion only supports single select equals
        }
      });
    }
    
    // Organization filter (relation property in actual schema)
    if (filters.organization && filters.organization.length > 0) {
      conditions.push({
        property: 'Organisations',
        relation: {
          contains: filters.organization[0]
        }
      });
    }
    
    // Amount range filter
    if (filters.amountRange) {
      if (filters.amountRange.min !== undefined) {
        conditions.push({
          property: 'Amount',
          number: {
            greater_than_or_equal_to: filters.amountRange.min
          }
        });
      }
      
      if (filters.amountRange.max !== undefined) {
        conditions.push({
          property: 'Amount',
          number: {
            less_than_or_equal_to: filters.amountRange.max
          }
        });
      }
    }
    
    // Probability filter (select field with percentage options: "25%", "50%", "75%", "90%")
    if (filters.probability && filters.probability.length > 0) {
      conditions.push({
        property: 'Probability',
        select: {
          equals: filters.probability[0] // Already includes % from database
        }
      });
    }
    
    // Deadline range filter
    if (filters.deadlineRange) {
      if (filters.deadlineRange.start) {
        conditions.push({
          property: 'Deadline',
          date: {
            on_or_after: filters.deadlineRange.start.toISOString()
          }
        });
      }
      
      if (filters.deadlineRange.end) {
        conditions.push({
          property: 'Deadline',
          date: {
            on_or_before: filters.deadlineRange.end.toISOString()
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
    console.log('📋 Built Notion filters for opportunities:', JSON.stringify(result, null, 2));
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
   * // Input: { field: 'amount', direction: 'desc' }
   * // Returns: { property: 'Amount', direction: 'descending' }
   */
  private buildNotionSort(sort: SortOption): { property: string; direction: 'ascending' | 'descending' } {
    // Map application field names to Notion property names
    const fieldMap: Record<string, string> = {
      name: 'Name',
      lastModified: 'last_edited_time',
      amount: 'Amount',
      probability: 'Probability',
      weightedValue: 'Weighted Value',
      deadline: 'Deadline'
    };
    
    const notionProperty = fieldMap[sort.field] || sort.field;
    
    return {
      property: notionProperty,
      direction: sort.direction === 'asc' ? 'ascending' : 'descending'
    };
  }
}

// Export singleton instance
export const opportunityService = new OpportunityService();

// Export class for testing and extension
export default OpportunityService;