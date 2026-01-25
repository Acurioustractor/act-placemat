/**
 * useSubscriptionState - State hooks for subscriptions (React Query)
 *
 * Provides read-only hooks for fetching subscription data.
 * Uses React Query for caching and state management.
 *
 * USAGE:
 *   const { data: subscriptions } = useSubscriptions(params)
 *   const { data: summary } = useSubscriptionSummary(tenantId)
 */

import { useQuery } from '@tanstack/react-query'
import {
  subscriptionApi,
  type ListParams,
} from '../../services/subscriptionApi'
import { subscriptionKeys } from './types'

// ============================================
// List Subscriptions
// ============================================

export function useSubscriptions(params: ListParams) {
  return useQuery({
    queryKey: subscriptionKeys.list(params),
    queryFn: () => subscriptionApi.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================
// Single Subscription
// ============================================

export function useSubscription(id: string, tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => subscriptionApi.get(id, tenantId),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ============================================
// Analytics
// ============================================

export function useSubscriptionSummary(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.summary(tenantId),
    queryFn: () => subscriptionApi.getSummary(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useOutstandingInvoices(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.outstanding(tenantId),
    queryFn: () => subscriptionApi.getOutstanding(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function usePaymentCalendar(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.paymentCalendar(tenantId),
    queryFn: () => subscriptionApi.getPaymentCalendar(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCostByAccount(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.costByAccount(tenantId),
    queryFn: () => subscriptionApi.getCostByAccount(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useCostByVendor(tenantId: string, limit?: number, enabled = true) {
  return useQuery({
    queryKey: [...subscriptionKeys.costByVendor(tenantId), limit],
    queryFn: () => subscriptionApi.getCostByVendor(tenantId, limit),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// ============================================
// Consolidation
// ============================================

export function useConsolidationProgress(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.consolidationProgress(tenantId),
    queryFn: () => subscriptionApi.getConsolidationProgress(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
