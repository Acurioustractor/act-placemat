// Custom hook for fetching and managing artifacts

import { useQuery } from '@tanstack/react-query';
import { artifactService } from '../services';
import { ArtifactFilters, SortOption } from '../types';
import { CACHE_CONFIG } from '../constants';

/**
 * Fetches artifacts/documents with optional filtering and sorting using React Query.
 * Provides automatic caching, background updates, and error handling.
 *
 * @param {ArtifactFilters} [filters] - Optional filters to apply to the artifact query
 * @param {SortOption} [sort] - Optional sort configuration for ordering results
 * @returns {UseQueryResult<Artifact[]>} React Query result containing artifacts data
 * @example
 * // Fetch presentation artifacts
 * const { data: presentations } = useArtifacts({ type: ['PRESENTATION'] });
 *
 * @example
 * // Fetch artifacts sorted by last modified
 * const { data: artifacts } = useArtifacts(undefined, { field: 'lastModified', direction: 'desc' });
 */
export function useArtifacts(filters?: ArtifactFilters, sort?: SortOption) {
  return useQuery({
    queryKey: ['artifacts', filters, sort],
    queryFn: () => artifactService.getArtifacts(filters, sort),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS
  });
}

/**
 * Hook for fetching a single artifact by ID
 * @param id - Artifact ID
 * @returns Query result with artifact data
 */
export function useArtifact(id: string | undefined) {
  return useQuery({
    queryKey: ['artifact', id],
    queryFn: () => id ? artifactService.getArtifactById(id) : Promise.resolve(undefined),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!id // Only run query if ID is provided
  });
}

/**
 * Hook for fetching artifacts by type
 * @param type - Artifact type
 * @returns Query result with artifacts data
 */
export function useArtifactsByType(type: string | undefined) {
  const filters: ArtifactFilters | undefined = type 
    ? { type: [type] }
    : undefined;
    
  return useArtifacts(filters);
}

/**
 * Hook for fetching artifacts by status
 * @param status - Artifact status
 * @returns Query result with artifacts data
 */
export function useArtifactsByStatus(status: string | undefined) {
  const filters: ArtifactFilters | undefined = status 
    ? { status: [status] }
    : undefined;
    
  return useArtifacts(filters);
}

/**
 * Hook for fetching artifacts for a project
 * @param projectId - Project ID
 * @returns Query result with artifacts data
 */
export function useArtifactsForProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['artifacts', 'project', projectId],
    queryFn: () => projectId 
      ? artifactService.getArtifactsForEntity('project', projectId)
      : Promise.resolve([]),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!projectId // Only run query if ID is provided
  });
}

/**
 * Hook for fetching artifacts for an opportunity
 * @param opportunityId - Opportunity ID
 * @returns Query result with artifacts data
 */
export function useArtifactsForOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['artifacts', 'opportunity', opportunityId],
    queryFn: () => opportunityId 
      ? artifactService.getArtifactsForEntity('opportunity', opportunityId)
      : Promise.resolve([]),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!opportunityId // Only run query if ID is provided
  });
}

/**
 * Hook for fetching artifacts for an organization
 * @param organizationId - Organization ID
 * @returns Query result with artifacts data
 */
export function useArtifactsForOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['artifacts', 'organization', organizationId],
    queryFn: () => organizationId 
      ? artifactService.getArtifactsForEntity('organization', organizationId)
      : Promise.resolve([]),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!organizationId // Only run query if ID is provided
  });
}

/**
 * Hook for fetching artifacts for a person
 * @param personId - Person ID
 * @returns Query result with artifacts data
 */
export function useArtifactsForPerson(personId: string | undefined) {
  return useQuery({
    queryKey: ['artifacts', 'person', personId],
    queryFn: () => personId 
      ? artifactService.getArtifactsForEntity('person', personId)
      : Promise.resolve([]),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!personId // Only run query if ID is provided
  });
}

/**
 * Hook for artifact metrics and analytics
 * @returns Artifact metrics
 */
export function useArtifactMetrics() {
  const { data: artifacts = [] } = useArtifacts();
  
  const metrics = {
    total: artifacts.length,
    byType: {} as Record<string, number>,
    byFormat: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    byAccessLevel: {} as Record<string, number>
  };
  
  // Calculate metrics
  artifacts.forEach(artifact => {
    // Count by type
    metrics.byType[artifact.type] = (metrics.byType[artifact.type] || 0) + 1;
    
    // Count by format
    metrics.byFormat[artifact.format] = (metrics.byFormat[artifact.format] || 0) + 1;
    
    // Count by status
    metrics.byStatus[artifact.status] = (metrics.byStatus[artifact.status] || 0) + 1;
    
    // Count by access level
    metrics.byAccessLevel[artifact.accessLevel] = 
      (metrics.byAccessLevel[artifact.accessLevel] || 0) + 1;
  });
  
  return metrics;
}