// Service to prefetch critical data for instant loading
import { QueryClient } from '@tanstack/react-query';
import { projectService } from './projectService';
import { opportunityService } from './opportunityService';
import { organizationService } from './organizationService';
import { personService } from './personService';
import { CACHE_CONFIG } from '../constants';

/**
 * Prefetch service to load critical data in background for instant UX
 */
class PrefetchService {
  private queryClient: QueryClient | null = null;

  /**
   * Initialize with query client
   */
  init(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Prefetch all critical data that users frequently access
   */
  async prefetchCriticalData() {
    if (!this.queryClient) return;

    console.log('🚀 Prefetching critical data for instant loading...');

    // Prefetch all projects (most common view)
    this.queryClient.prefetchQuery({
      queryKey: ['projects'],
      queryFn: () => projectService.getProjects(),
      staleTime: CACHE_CONFIG.STALE_TIME,
      gcTime: CACHE_CONFIG.CACHE_TIME
    });

    // Prefetch opportunities
    this.queryClient.prefetchQuery({
      queryKey: ['opportunities'],
      queryFn: () => opportunityService.getOpportunities(),
      staleTime: CACHE_CONFIG.STALE_TIME,
      gcTime: CACHE_CONFIG.CACHE_TIME
    });

    // Prefetch organizations
    this.queryClient.prefetchQuery({
      queryKey: ['organizations'],
      queryFn: () => organizationService.getOrganizations(),
      staleTime: CACHE_CONFIG.STALE_TIME,
      gcTime: CACHE_CONFIG.CACHE_TIME
    });

    // Prefetch people
    this.queryClient.prefetchQuery({
      queryKey: ['people'],
      queryFn: () => personService.getPeople(),
      staleTime: CACHE_CONFIG.STALE_TIME,
      gcTime: CACHE_CONFIG.CACHE_TIME
    });

    console.log('✅ Data prefetching initiated');
  }

  /**
   * Prefetch data for specific area (when user shows interest)
   */
  async prefetchAreaData(area: string) {
    if (!this.queryClient) return;

    console.log(`🎯 Prefetching data for area: ${area}`);

    // Prefetch projects for this area
    this.queryClient.prefetchQuery({
      queryKey: ['projects', { area: [area] }],
      queryFn: () => projectService.getProjects({ area: [area] }),
      staleTime: CACHE_CONFIG.STALE_TIME,
      gcTime: CACHE_CONFIG.CACHE_TIME
    });
  }

  /**
   * Warm up cache with local storage data if available
   */
  warmupCache() {
    // This could load from localStorage if we implement persistence
    console.log('🔥 Warming up cache...');
  }

  /**
   * Clear all prefetched data
   */
  clearPrefetchedData() {
    if (!this.queryClient) return;
    this.queryClient.clear();
    console.log('🗑️ Prefetched data cleared');
  }
}

// Export singleton instance
export const prefetchService = new PrefetchService();
export default PrefetchService;