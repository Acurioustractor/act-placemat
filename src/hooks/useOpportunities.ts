// Custom hook for fetching and managing opportunities

import { useQuery } from '@tanstack/react-query';
import { opportunityService } from '../services';
import { OpportunityFilters, SortOption } from '../types';
import { CACHE_CONFIG } from '../constants';

/**
 * Fetches opportunities with optional filtering and sorting using React Query.
 * Provides automatic caching, background updates, and error handling.
 *
 * @param {OpportunityFilters} [filters] - Optional filters to apply to the opportunity query
 * @param {SortOption} [sort] - Optional sort configuration for ordering results
 * @returns {UseQueryResult<Opportunity[]>} React Query result containing opportunities data
 * @example
 * // Fetch opportunities in proposal stage
 * const { data: opportunities } = useOpportunities({ stage: ['Proposal'] });
 *
 * @example
 * // Fetch opportunities sorted by amount
 * const { data: opportunities } = useOpportunities(undefined, { field: 'amount', direction: 'desc' });
 */
export function useOpportunities(filters?: OpportunityFilters, sort?: SortOption) {
  return useQuery({
    queryKey: ['opportunities', filters, sort],
    queryFn: () => opportunityService.getOpportunities(filters, sort),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    retryDelay: CACHE_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData
  });
}

/**
 * Hook for fetching a single opportunity by ID
 * @param id - Opportunity ID
 * @returns Query result with opportunity data
 */
export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => id ? opportunityService.getOpportunityById(id) : Promise.resolve(undefined),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!id // Only run query if ID is provided
  });
}

/**
 * Hook for fetching opportunities by stage
 * @param stage - Opportunity stage
 * @returns Query result with opportunities data
 */
export function useOpportunitiesByStage(stage: string | undefined) {
  const filters: OpportunityFilters | undefined = stage 
    ? { stage: [stage] }
    : undefined;
    
  return useOpportunities(filters);
}

/**
 * Hook for fetching opportunities by type
 * @param type - Opportunity type
 * @returns Query result with opportunities data
 */
export function useOpportunitiesByType(type: string | undefined) {
  const filters: OpportunityFilters | undefined = type 
    ? { type: [type] }
    : undefined;
    
  return useOpportunities(filters);
}

/**
 * Hook for fetching opportunities related to a project
 * @param projectId - Project ID
 * @returns Query result with opportunities data
 */
export function useOpportunitiesForProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['opportunities', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const allOpportunities = await opportunityService.getOpportunities();
      return allOpportunities.filter(opportunity => 
        opportunity.relatedProjects.includes(projectId)
      );
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    enabled: !!projectId // Only run query if ID is provided
  });
}

/**
 * Hook for fetching opportunities for an organization
 * @param organizationName - Organization name
 * @returns Query result with opportunities data
 */
export function useOpportunitiesForOrganization(organizationName: string | undefined) {
  const filters: OpportunityFilters | undefined = organizationName 
    ? { organization: [organizationName] }
    : undefined;
    
  return useOpportunities(filters);
}

/**
 * Hook for opportunity pipeline metrics
 * @returns Query result with pipeline metrics
 */
export function useOpportunityPipelineMetrics() {
  const { data: opportunities = [] } = useOpportunities();
  
  return {
    ...opportunityService.calculatePipelineMetrics(opportunities),
    opportunities
  };
}