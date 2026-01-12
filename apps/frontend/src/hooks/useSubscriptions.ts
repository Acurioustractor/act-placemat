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
  paymentCalendar: (tenantId: string) => [...subscriptionKeys.analytics(), 'payment-calendar', tenantId] as const,
  costByAccount: (tenantId: string) => [...subscriptionKeys.analytics(), 'cost-by-account', tenantId] as const,
  costByVendor: (tenantId: string) => [...subscriptionKeys.analytics(), 'cost-by-vendor', tenantId] as const,
  consolidation: () => [...subscriptionKeys.all, 'consolidation'] as const,
  consolidationProgress: (tenantId: string) => [...subscriptionKeys.consolidation(), 'progress', tenantId] as const,
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

// ============================================================================
// Payment Calendar
// ============================================================================

export function usePaymentCalendar(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.paymentCalendar(tenantId),
    queryFn: () => subscriptionApi.getPaymentCalendar(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes - refresh to keep urgency classification current
  });
}

// ============================================================================
// Cost Analysis
// ============================================================================

export function useCostByAccount(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.costByAccount(tenantId),
    queryFn: () => subscriptionApi.getCostByAccount(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useCostByVendor(tenantId: string, limit?: number, enabled = true) {
  return useQuery({
    queryKey: [...subscriptionKeys.costByVendor(tenantId), limit],
    queryFn: () => subscriptionApi.getCostByVendor(tenantId, limit),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ============================================================================
// Consolidation Tracking
// ============================================================================

export function useConsolidationProgress(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.consolidationProgress(tenantId),
    queryFn: () => subscriptionApi.getConsolidationProgress(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateConsolidationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      status?: string;
      notes?: string;
      vendorContactEmail?: string;
    }) => subscriptionApi.updateConsolidationStatus(params),
    onSuccess: (data, variables) => {
      // Invalidate consolidation queries
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.consolidation(),
      });
      // Invalidate the specific subscription detail
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.detail(variables.id),
      });
    },
  });
}

// ============================================================================
// Update Subscription
// ============================================================================

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<import('../types/subscription').Subscription> }) =>
      subscriptionApi.update(id, updates),
    onSuccess: (data, variables) => {
      // Invalidate lists to refresh with new data
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.lists(),
      });
      // Invalidate the specific subscription detail
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.detail(variables.id),
      });
      // Invalidate analytics in case status/amount changed
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.analytics(),
      });
    },
  });
}
