/**
 * useSubscriptionActions - Mutation hooks for subscriptions (React Query)
 *
 * Provides write hooks for subscription operations.
 * Uses React Query for caching and invalidation.
 *
 * USAGE:
 *   const { mutate: discover } = useDiscoverSubscriptions()
 *   const { mutate: update } = useUpdateSubscription()
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  subscriptionApi,
  type DiscoverParams,
  type ReconcileParams,
} from '../../services/subscriptionApi'
import { subscriptionKeys } from './types'

// ============================================
// Discovery
// ============================================

export function useDiscoverSubscriptions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: DiscoverParams) => subscriptionApi.discover(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.summary(variables.tenantId) })
    },
  })
}

// ============================================
// Reconciliation
// ============================================

export function useReconcileSubscriptions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: ReconcileParams) => subscriptionApi.reconcile(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.summary(variables.tenantId) })
    },
  })
}

// ============================================
// Update Subscription
// ============================================

export function useUpdateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<import('../../types/subscription').Subscription>
    }) => subscriptionApi.update(id, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.analytics() })
    },
  })
}

// ============================================
// Update Consolidation Status
// ============================================

export function useUpdateConsolidationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      id: string
      status?: string
      notes?: string
      vendorContactEmail?: string
    }) => subscriptionApi.updateConsolidationStatus(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.consolidation() })
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(variables.id) })
    },
  })
}
