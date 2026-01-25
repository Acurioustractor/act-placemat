/**
 * Subscriptions Module Index
 *
 * Unified exports for all subscription tracker hooks.
 * Provides backward compatibility with the original useSubscriptions.ts.
 */

// Types and query keys
export * from './types'

// State/fetching hooks
export {
  useSubscriptions,
  useSubscription,
  useSubscriptionSummary,
  useOutstandingInvoices,
  usePaymentCalendar,
  useCostByAccount,
  useCostByVendor,
  useConsolidationProgress,
} from './useSubscriptionState'

// Action/mutation hooks
export {
  useDiscoverSubscriptions,
  useReconcileSubscriptions,
  useUpdateSubscription,
  useUpdateConsolidationStatus,
} from './useSubscriptionActions'

// ============================================
// Backward Compatibility
// ============================================

/**
 * @deprecated Use individual hooks instead
 * Combined subscriptions hook (original useSubscriptions pattern)
 */

// Re-export all hooks for backward compatibility
export {
  useSubscriptions as useSubscriptionsOriginal,
  useSubscription as useSubscriptionOriginal,
  useSubscriptionSummary as useSubscriptionSummaryOriginal,
  useOutstandingInvoices as useOutstandingInvoicesOriginal,
  usePaymentCalendar as usePaymentCalendarOriginal,
  useCostByAccount as useCostByAccountOriginal,
  useCostByVendor as useCostByVendorOriginal,
  useConsolidationProgress as useConsolidationProgressOriginal,
} from './useSubscriptionState'

export {
  useDiscoverSubscriptions as useDiscoverSubscriptionsOriginal,
  useReconcileSubscriptions as useReconcileSubscriptionsOriginal,
  useUpdateSubscription as useUpdateSubscriptionOriginal,
  useUpdateConsolidationStatus as useUpdateConsolidationStatusOriginal,
} from './useSubscriptionActions'
