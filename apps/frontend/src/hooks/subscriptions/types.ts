/**
 * Subscriptions Module Types
 *
 * Type definitions for subscription tracker hooks
 */

import type { DiscoverParams, ListParams, ReconcileParams } from '../../services/subscriptionApi'

// ============================================
// Query Keys
// ============================================

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (params: ListParams) => [...subscriptionKeys.lists(), params] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
  analytics: () => [...subscriptionKeys.all, 'analytics'] as const,
  summary: (tenantId: string) => [...subscriptionKeys.analytics(), 'summary', tenantId] as const,
  outstanding: (tenantId: string) => [...subscriptionKeys.analytics(), 'outstanding', tenantId] as const,
  paymentCalendar: (tenantId: string) =>
    [...subscriptionKeys.analytics(), 'payment-calendar', tenantId] as const,
  costByAccount: (tenantId: string) => [...subscriptionKeys.analytics(), 'cost-by-account', tenantId] as const,
  costByVendor: (tenantId: string) => [...subscriptionKeys.analytics(), 'cost-by-vendor', tenantId] as const,
  consolidation: () => [...subscriptionKeys.all, 'consolidation'] as const,
  consolidationProgress: (tenantId: string) =>
    [...subscriptionKeys.consolidation(), 'progress', tenantId] as const,
}

// ============================================
// Parameters
// ============================================

export type { DiscoverParams, ListParams, ReconcileParams } from '../../services/subscriptionApi'
