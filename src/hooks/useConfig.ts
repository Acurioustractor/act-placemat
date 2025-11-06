// Hook for fetching and managing application configuration

import { useQuery } from '@tanstack/react-query';
import { configService } from '../services';
import { QUERY_KEYS, CACHE_CONFIG } from '../constants';

/**
 * Fetches and caches application configuration from the backend.
 * Provides database IDs and availability status with automatic refetching.
 *
 * @returns {UseQueryResult<AppConfig>} React Query result containing configuration data
 * @example
 * const { data: config, isLoading } = useConfig();
 * if (config) {
 *   console.log('Projects DB:', config.databases.projects);
 * }
 */
export function useConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.CONFIG,
    queryFn: () => configService.getConfig(),
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
}

/**
 * Fetches and monitors the backend API health status.
 * Automatically refetches every 30 seconds to monitor API availability.
 *
 * @returns {UseQueryResult<HealthStatus>} React Query result containing health status data
 * @example
 * const { data: health } = useHealthStatus();
 * if (health?.status !== 'ok') {
 *   console.warn('API is not healthy');
 * }
 */
export function useHealthStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.HEALTH,
    queryFn: () => configService.getHealthStatus(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    retry: 1,
    retryDelay: 500,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    refetchOnWindowFocus: true
  });
}

/**
 * Checks if a specific database type is configured and available.
 * Returns availability status and database ID from the cached configuration.
 *
 * @param {'projects' | 'opportunities' | 'organizations' | 'people' | 'artifacts'} type - The database type to check
 * @returns {{ isAvailable: boolean; databaseId: string | undefined; isConfigured: boolean }} Availability status object
 * @example
 * const { isAvailable, databaseId } = useDatabaseAvailability('projects');
 * if (!isAvailable) {
 *   console.warn('Projects database is not available');
 * }
 */
export function useDatabaseAvailability(type: 'projects' | 'opportunities' | 'organizations' | 'people' | 'artifacts') {
  const { data: config } = useConfig();
  
  const isAvailable = config?.status?.[`${type}_available` as keyof typeof config.status] || false;
  const databaseId = config?.databases?.[type];
  
  return {
    isAvailable,
    databaseId,
    isConfigured: Boolean(databaseId)
  };
}