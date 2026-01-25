/**
 * Goals Module - Consolidated Goals Functionality
 *
 * This module provides a unified interface for all goals-related components:
 * - GoalsDashboard: Main dashboard with lanes, calendar, and list views
 * - GoalCard: Individual goal display with inline editing
 * - GoalCalendar: Calendar view for goals with due dates
 * - GoalProgress: Progress widget for goals
 * - useGoals: Hook for goals state management
 *
 * Usage:
 *   import { GoalsDashboard, useGoals } from '@/components/dashboard/goals'
 */

// Types
export * from './types'

// Hooks
export { useGoals } from './hooks/useGoals'

// Components
export { GoalsDashboard } from './components/GoalsDashboard'
export { GoalCard } from './components/GoalCard'
export { GoalCalendar } from './components/GoalCalendar'
export { GoalProgress } from './components/GoalProgress'
