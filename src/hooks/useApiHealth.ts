// Custom hook for API health check

import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services';
import { API_ENDPOINTS } from '../constants';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  notion_token: 'configured' | 'missing';
  notion_database: 'configured' | 'missing';
}

/**
 * Hook for checking API health
 * @returns Query result with health check data
 */
export function useApiHealth() {
  return useQuery({
    queryKey: ['api', 'health'],
    queryFn: () => apiService.get<HealthCheckResponse>(API_ENDPOINTS.HEALTH),
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 3,
    refetchOnWindowFocus: true
  });
}

/**
 * Hook for checking if Notion API is properly configured
 * @returns Boolean indicating if Notion API is configured
 */
export function useNotionApiStatus() {
  const { data, isLoading, isError } = useApiHealth();
  
  const isConfigured = data?.notion_token === 'configured' && 
                       data?.notion_database === 'configured';
  
  return {
    isConfigured,
    isLoading,
    isError,
    tokenConfigured: data?.notion_token === 'configured',
    databaseConfigured: data?.notion_database === 'configured'
  };
}