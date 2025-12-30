/**
 * React Query hooks for Subscription Tracker
 * Follows ACT Platform best practices
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  subscriptionApi,
  type DiscoverParams,
  type ListParams,
  type ReconcileParams,
} from '../services/subscriptionApi';

// ============================================================================
// Query Keys
// ============================================================================

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (params: ListParams) => [...subscriptionKeys.lists(), params] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
  analytics: () => [...subscriptionKeys.all, 'analytics'] as const,
  summary: (tenantId: string) => [...subscriptionKeys.analytics(), 'summary', tenantId] as const,
  outstanding: (tenantId: string) => [...subscriptionKeys.analytics(), 'outstanding', tenantId] as const,
};

// ============================================================================
// Subscription Discovery
// ============================================================================

export function useDiscoverSubscriptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DiscoverParams) => subscriptionApi.discover(params),
    onSuccess: (data, variables) => {
      // Invalidate subscription lists after successful discovery
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.summary(variables.tenantId),
      });
    },
  });
}

// ============================================================================
// List Subscriptions
// ============================================================================

export function useSubscriptions(params: ListParams) {
  return useQuery({
    queryKey: subscriptionKeys.list(params),
    queryFn: () => subscriptionApi.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Get Single Subscription
// ============================================================================

export function useSubscription(id: string, tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => subscriptionApi.get(id, tenantId),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Reconciliation
// ============================================================================

export function useReconcileSubscriptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReconcileParams) => subscriptionApi.reconcile(params),
    onSuccess: (data, variables) => {
      // Invalidate subscription lists and analytics after reconciliation
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.summary(variables.tenantId),
      });
    },
  });
}

// ============================================================================
// Analytics Summary
// ============================================================================

export function useSubscriptionSummary(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.summary(tenantId),
    queryFn: () => subscriptionApi.getSummary(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ============================================================================
// Outstanding Invoices
// ============================================================================

export function useOutstandingInvoices(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.outstanding(tenantId),
    queryFn: () => subscriptionApi.getOutstanding(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
