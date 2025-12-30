/**
 * Migration React Query Hooks
 *
 * React Query hooks for subscription email migration workflow
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { migrationApi } from '../services/migrationApi';

/**
 * Get migration progress summary
 */
export const useMigrationProgress = (tenantId: string) => {
  return useQuery({
    queryKey: ['migration-progress', tenantId],
    queryFn: () => migrationApi.getProgress(tenantId),
    refetchInterval: 30000, // Refresh every 30s
    enabled: !!tenantId
  });
};

/**
 * Initialize migration workflow
 */
export const useInitMigration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, forceRediscover = false }: { tenantId: string; forceRediscover?: boolean }) =>
      migrationApi.initialize(tenantId, forceRediscover),
    onSuccess: (_, variables) => {
      // Invalidate progress and subscriptions queries
      queryClient.invalidateQueries({ queryKey: ['migration-progress', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', variables.tenantId] });
    }
  });
};

/**
 * Contact vendors via email
 */
export const useContactVendors = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      subscriptionIds,
      dryRun = false,
      maxBatchSize = 50
    }: {
      tenantId: string;
      subscriptionIds?: string[];
      dryRun?: boolean;
      maxBatchSize?: number;
    }) => migrationApi.contactVendors(tenantId, subscriptionIds, dryRun, maxBatchSize),
    onSuccess: (_, variables) => {
      // Invalidate progress and subscriptions queries
      queryClient.invalidateQueries({ queryKey: ['migration-progress', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', variables.tenantId] });
    }
  });
};

/**
 * Update migration status (confirm, complete, skip)
 */
export const useUpdateMigrationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      action,
      notes,
      tenantId
    }: {
      subscriptionId: string;
      action: 'confirm' | 'complete' | 'skip';
      notes?: string;
      tenantId: string;
    }) => migrationApi.updateStatus(subscriptionId, action, notes),
    onSuccess: (_, variables) => {
      // Invalidate progress and subscriptions queries
      queryClient.invalidateQueries({ queryKey: ['migration-progress', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', variables.tenantId] });
    }
  });
};

/**
 * Get next batch of subscriptions to process
 */
export const useNextBatch = (tenantId: string, batchSize = 10) => {
  return useQuery({
    queryKey: ['migration-next-batch', tenantId, batchSize],
    queryFn: () => migrationApi.getNextBatch(tenantId, batchSize),
    enabled: !!tenantId
  });
};

/**
 * List subscriptions with filters
 */
export const useSubscriptions = (
  tenantId: string,
  options: {
    limit?: number;
    offset?: number;
    minConfidence?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    migrationStatus?: string;
  } = {}
) => {
  return useQuery({
    queryKey: ['subscriptions', tenantId, options],
    queryFn: () => migrationApi.listSubscriptions(tenantId, options),
    enabled: !!tenantId
  });
};

/**
 * Update subscription fields
 */
export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      tenantId,
      updates
    }: {
      subscriptionId: string;
      tenantId: string;
      updates: any;
    }) => migrationApi.updateSubscription(subscriptionId, tenantId, updates),
    onSuccess: (_, variables) => {
      // Invalidate subscriptions queries
      queryClient.invalidateQueries({ queryKey: ['subscriptions', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['migration-progress', variables.tenantId] });
    }
  });
};

/**
 * Get analytics summary
 */
export const useAnalyticsSummary = (tenantId: string) => {
  return useQuery({
    queryKey: ['analytics-summary', tenantId],
    queryFn: () => migrationApi.getAnalyticsSummary(tenantId),
    enabled: !!tenantId
  });
};
