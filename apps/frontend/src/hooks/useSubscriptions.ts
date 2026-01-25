/**
 * useSubscriptions - React Query hooks for Subscription Tracker
 *
 * @deprecated Use hooks from './subscriptions' instead
 * This file re-exports from the subscriptions/ module for backward compatibility.
 *
 * Follows ACT Platform best practices for React Query integration.
 */

// Re-export from the new subscriptions/ module
export * from './subscriptions'

// Also re-export types and query keys for convenience
export { subscriptionKeys } from './subscriptions/types'
