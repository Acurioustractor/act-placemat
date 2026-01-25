/**
 * useGoals - Goal management hooks
 *
 * @deprecated Use hooks from './goals' instead
 * This file re-exports from the goals/ module for backward compatibility.
 *
 * Provides:
 * - useGoals() - Fetch and manage goals
 * - useGoalUpdate() - Update goal progress
 * - useGoalHistory() - Goal change history
 * - useGoalDetails() - Fetch goal details
 * - useGoalMetrics() - Goal metrics/key results
 * - useGoalMove() - Move goal between lanes
 * - useGoalReorder() - Reorder goals in a lane
 * - useCalendarGoals() - Calendar-specific goals
 * - createGoal() - Create a new goal
 * - deleteGoal() - Delete a goal
 */

// Re-export from the new goals/ module
export * from './goals'

// Also re-export types for convenience
export type {
  Goal,
  GoalUpdate,
  GoalMetrics,
  GoalDetails,
  UseGoalsOptions,
  UseGoalUpdateOptions,
  UseGoalMoveOptions,
  UseGoalReorderOptions,
} from './goals/types'
