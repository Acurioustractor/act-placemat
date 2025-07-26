// Custom hook for fetching and managing projects

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services';
import { Project, ProjectFilters, SortOption } from '../types';
import { CACHE_CONFIG } from '../constants';

/**
 * Hook for fetching projects with optional filters and sorting
 * @param filters - Optional filters to apply
 * @param sort - Optional sort configuration
 * @returns Query result with projects data
 */
export function useProjects(filters?: ProjectFilters, sort?: SortOption) {
  const queryResult = useQuery({
    queryKey: ['projects', filters, sort],
    queryFn: async () => {
      console.log('🔍 useProjects: Starting fetch with filters:', filters, 'sort:', sort);
      const result = await projectService.getProjects(filters, sort);
      console.log('🔍 useProjects: Fetch completed, got', result.length, 'projects');
      return result;
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    retryDelay: CACHE_CONFIG.RETRY_DELAY,
    refetchOnWindowFocus: false, // Never refetch on focus
    refetchOnMount: true, // Force refetch on mount for debugging
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData // Keep showing old data while fetching
  });
  
  console.log('🔍 useProjects: Query result:', {
    data: queryResult.data?.length || 0,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    status: queryResult.status
  });
  
  return queryResult;
}

/**
 * Hook for fetching a single project by ID
 * @param id - Project ID
 * @returns Query result with project data
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => id ? projectService.getProjectById(id) : Promise.resolve(undefined),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: CACHE_CONFIG.RETRY_ATTEMPTS,
    enabled: !!id // Only run query if ID is provided
  });
}

/**
 * Hook for fetching projects by area
 * @param area - Project area
 * @returns Query result with projects data
 */
export function useProjectsByArea(area: string | undefined) {
  const filters: ProjectFilters | undefined = area 
    ? { area: [area] }
    : undefined;
    
  return useProjects(filters);
}

/**
 * Hook for fetching projects by status
 * @param status - Project status
 * @returns Query result with projects data
 */
export function useProjectsByStatus(status: string | undefined) {
  const filters: ProjectFilters | undefined = status 
    ? { status: [status] }
    : undefined;
    
  return useProjects(filters);
}

/**
 * Hook for fetching projects related to an opportunity
 * @param opportunityId - Opportunity ID
 * @returns Query result with projects data
 */
export function useProjectsForOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'opportunity', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      
      const allProjects = await projectService.getProjects();
      return allProjects.filter(project => 
        project.relatedOpportunities.includes(opportunityId)
      );
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    enabled: !!opportunityId // Only run query if ID is provided
  });
}

/**
 * Hook for fetching projects related to an organization
 * @param organizationId - Organization ID
 * @returns Query result with projects data
 */
export function useProjectsForOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const allProjects = await projectService.getProjects();
      return allProjects.filter(project => 
        project.partnerOrganizations.includes(organizationId)
      );
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    enabled: !!organizationId // Only run query if ID is provided
  });
}

/**
 * Hook for project metrics and analytics
 * @returns Query result with project metrics
 */
export function useProjectMetrics() {
  const { data: projects = [] } = useProjects();
  
  const metrics = {
    total: projects.length,
    byArea: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    totalRevenue: 0,
    potentialRevenue: 0
  };
  
  // Calculate metrics
  projects.forEach(project => {
    // Count by area
    metrics.byArea[project.area] = (metrics.byArea[project.area] || 0) + 1;
    
    // Count by status
    metrics.byStatus[project.status] = (metrics.byStatus[project.status] || 0) + 1;
    
    // Sum revenue
    metrics.totalRevenue += project.revenueActual;
    metrics.potentialRevenue += project.revenuePotential;
  });
  
  return metrics;
}