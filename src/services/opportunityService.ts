// Opportunity service for fetching and managing opportunity data

import { smartDataService } from './smartDataService';
import { configService } from './configService';
import { Opportunity, OpportunityFilters, NotionQueryRequest, SortOption } from '../types';

/**
 * Service for fetching and managing opportunity data
 */
class OpportunityService {
  /**
   * Fetch all opportunities with optional filters
   * @param filters - Optional filters to apply
   * @param sort - Optional sort configuration
   * @returns Promise with array of opportunities
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
   * Fetch a single opportunity by ID
   * @param id - Opportunity ID
   * @returns Promise with opportunity or undefined if not found
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
   * Calculate pipeline metrics for opportunities
   * @param opportunities - Array of opportunities
   * @returns Object with pipeline metrics
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
   * Build Notion filter object from application filters
   * @param filters - Application filter object
   * @returns Notion filter object
   */
  private buildNotionFilters(filters?: OpportunityFilters): any {
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
   * Build Notion sort object from application sort option
   * @param sort - Application sort option
   * @returns Notion sort object
   */
  private buildNotionSort(sort: SortOption): any {
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