/**
 * Shared Dashboard Components
 *
 * Reusable components for dashboard modules:
 * - EmptyState: Empty state patterns
 * - StatCard: Reusable stat cards
 * - FilterBar: Common filter components
 *
 * Usage:
 *   import { EmptyState, StatCard, FilterBar } from '@/components/dashboard/shared'
 */

// Empty State
export { EmptyState, TableEmptyState, CardEmptyState } from './EmptyState'

// Stat Cards
export { StatCard, CompactStatCard, ProgressStatCard } from './StatCard'

// Filter Components
export { FilterBar, FilterChip, FilterChips, SearchInput } from './FilterBar'
