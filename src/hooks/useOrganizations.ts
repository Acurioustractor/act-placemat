// Custom hook for fetching and managing organizations

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../services';
import { OrganizationFilters, SortOption } from '../types';
import { CACHE_CONFIG } from '../constants';

/**
 * Fetches organizations with optional filtering and sorting using React Query.
 * Provides automatic caching, background updates, and error handling.
 *
 * @param {OrganizationFilters} [filters] - Optional filters to apply to the organization query
 * @param {SortOption} [sort] - Optional sort configuration for ordering results
 * @returns {UseQueryResult<Organization[]>} React Query result containing organizations data
 * @example
 * // Fetch partner organizations
 * const { data: partners } = useOrganizations({ relationshipStatus: ['Partner'] });
 *
 * @example
 * // Fetch organizations by type
 * const { data: orgs } = useOrganizations({ type: ['Foundation'] });
 */
export function useOrganizations(filters?: OrganizationFilters, sort?: SortOption) {
  return useQuery({
    queryKey: ['organizations', filters, sort],
    queryFn: () => organizationService.getOrganizations(filters, sort),
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
 * Hook for fetching a single organization by ID
 * @param id - Organization ID
 * @returns Query result with organization data
 */
export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => id ? organizationService.getOrganizationById(id) : Promise.resolve(undefined),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!id // Only run query if ID is provided
  });
}

/**
 * Hook for fetching organizations by type
 * @param type - Organization type
 * @returns Query result with organizations data
 */
export function useOrganizationsByType(type: string | undefined) {
  const filters: OrganizationFilters | undefined = type 
    ? { type: [type] }
    : undefined;
    
  return useOrganizations(filters);
}

/**
 * Hook for fetching organizations by relationship status
 * @param status - Relationship status
 * @returns Query result with organizations data
 */
export function useOrganizationsByStatus(status: string | undefined) {
  const filters: OrganizationFilters | undefined = status 
    ? { relationshipStatus: [status] }
    : undefined;
    
  return useOrganizations(filters);
}

/**
 * Hook for fetching organizations by sector
 * @param sector - Organization sector
 * @returns Query result with organizations data
 */
export function useOrganizationsBySector(sector: string | undefined) {
  const filters: OrganizationFilters | undefined = sector 
    ? { sector: [sector] }
    : undefined;
    
  return useOrganizations(filters);
}

/**
 * Hook for organization metrics and analytics
 * @returns Organization metrics
 */
export function useOrganizationMetrics() {
  const { data: organizations = [] } = useOrganizations();
  
  const metrics = {
    total: organizations.length,
    byType: {} as Record<string, number>,
    byRelationshipStatus: {} as Record<string, number>,
    bySector: {} as Record<string, number>
  };
  
  // Calculate metrics
  organizations.forEach(org => {
    // Count by type
    metrics.byType[org.type] = (metrics.byType[org.type] || 0) + 1;
    
    // Count by relationship status
    metrics.byRelationshipStatus[org.relationshipStatus] = 
      (metrics.byRelationshipStatus[org.relationshipStatus] || 0) + 1;
    
    // Count by sector (an organization can be in multiple sectors)
    org.sector.forEach(sector => {
      metrics.bySector[sector] = (metrics.bySector[sector] || 0) + 1;
    });
  });
  
  return metrics;
}