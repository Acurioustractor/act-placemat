// Hook for fetching and managing application configuration

import { useQuery } from '@tanstack/react-query';
import { configService } from '../services';
import { QUERY_KEYS, CACHE_CONFIG } from '../constants';

/**
 * Hook for fetching application configuration
 * @returns Query result with config data
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
 * Hook for fetching health status
 * @returns Query result with health status
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
 * Hook for checking if a specific database is configured
 * @param type - Database type
 * @returns Query result with availability status
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