/**
 * Goals Module Index
 *
 * Unified exports for all goals-related hooks.
 * Provides backward compatibility with the original useGoals.ts.
 */

// Types
export * from './types'

// Data fetching hooks
export { useGoalsData, useCalendarGoals, useGoalDetails } from './useGoalsData'

// State management hooks
export { useGoalsState, useGoalsExpansion } from './useGoalsState'

// Action/mutation hooks
export {
  useGoalUpdate,
  useGoalMove,
  useGoalReorder,
  createGoal,
  deleteGoal,
} from './useGoalsActions'

// Specialized hooks
export { useGoalHistory } from './useGoalHistory'
export { useGoalMetrics } from './useGoalMetrics'

// ============================================
// Backward Compatibility
// ============================================

/**
 * @deprecated Use useGoalsData instead
 * Combined hook for fetching goals (original useGoals pattern)
 */
import { useGoalsData as _useGoalsData } from './useGoalsData'

export function useGoals(options: Parameters<typeof _useGoalsData>[0] = {}) {
  return _useGoalsData(options)
}
