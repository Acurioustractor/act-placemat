// Custom hook for fetching and managing people

import { useQuery } from '@tanstack/react-query';
import { personService } from '../services';
import { PersonFilters, SortOption } from '../types';
import { CACHE_CONFIG } from '../constants';

/**
 * Hook for fetching people with optional filters and sorting
 * @param filters - Optional filters to apply
 * @param sort - Optional sort configuration
 * @returns Query result with people data
 */
export function usePeople(filters?: PersonFilters, sort?: SortOption) {
  return useQuery({
    queryKey: ['people', filters, sort],
    queryFn: () => personService.getPeople(filters, sort),
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
 * Hook for fetching a single person by ID
 * @param id - Person ID
 * @returns Query result with person data
 */
export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: ['person', id],
    queryFn: () => id ? personService.getPersonById(id) : Promise.resolve(undefined),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!id // Only run query if ID is provided
  });
}

/**
 * Hook for fetching people by organization
 * @param organization - Organization name
 * @returns Query result with people data
 */
export function usePeopleByOrganization(organization: string | undefined) {
  const filters: PersonFilters | undefined = organization 
    ? { organization: [organization] }
    : undefined;
    
  return usePeople(filters);
}

/**
 * Hook for fetching people by relationship type
 * @param relationshipType - Relationship type
 * @returns Query result with people data
 */
export function usePeopleByRelationshipType(relationshipType: string | undefined) {
  const filters: PersonFilters | undefined = relationshipType 
    ? { relationshipType: [relationshipType] }
    : undefined;
    
  return usePeople(filters);
}

/**
 * Hook for fetching people by influence level
 * @param influenceLevel - Influence level
 * @returns Query result with people data
 */
export function usePeopleByInfluenceLevel(influenceLevel: string | undefined) {
  const filters: PersonFilters | undefined = influenceLevel 
    ? { influenceLevel: [influenceLevel] }
    : undefined;
    
  return usePeople(filters);
}

/**
 * Hook for fetching people needing follow-up
 * @param daysThreshold - Number of days to consider for follow-up
 * @returns Query result with people data
 */
export function usePeopleNeedingFollowUp(daysThreshold = 7) {
  return useQuery({
    queryKey: ['people', 'follow-up', daysThreshold],
    queryFn: () => personService.getPeopleNeedingFollowUp(daysThreshold),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS
  });
}

/**
 * Hook for people metrics and analytics
 * @returns People metrics
 */
export function usePeopleMetrics() {
  const { data: people = [] } = usePeople();
  
  const metrics = {
    total: people.length,
    byRelationshipType: {} as Record<string, number>,
    byInfluenceLevel: {} as Record<string, number>,
    byOrganization: {} as Record<string, number>,
    needingFollowUp: 0
  };
  
  const today = new Date();
  
  // Calculate metrics
  people.forEach(person => {
    // Count by relationship type
    metrics.byRelationshipType[person.relationshipType] = 
      (metrics.byRelationshipType[person.relationshipType] || 0) + 1;
    
    // Count by influence level
    metrics.byInfluenceLevel[person.influenceLevel] = 
      (metrics.byInfluenceLevel[person.influenceLevel] || 0) + 1;
    
    // Count by organization
    metrics.byOrganization[person.organization] = 
      (metrics.byOrganization[person.organization] || 0) + 1;
    
    // Count people needing follow-up
    if (person.nextContactDate && person.nextContactDate <= today) {
      metrics.needingFollowUp++;
    }
  });
  
  return metrics;
}