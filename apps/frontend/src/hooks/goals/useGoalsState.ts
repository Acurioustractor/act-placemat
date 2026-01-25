/**
 * useGoalsState - State management hook for goals
 *
 * Manages goal state including selection, filtering, and derived state.
 * No API calls - purely client-side state management.
 *
 * USAGE:
 *   const { selectedGoalId, setSelectedGoalId, filteredGoals } = useGoalsState(goals)
 */

import { useMemo, useState } from 'react'
import type { Goal } from './types'

interface UseGoalsStateReturn {
  selectedGoalId: string | null
  setSelectedGoalId: (id: string | null) => void
  selectedGoal: Goal | null
  filteredGoals: Goal[]
  goalsByStatus: Record<string, Goal[]>
  goalsByLane: Record<string, Goal[]>
  averageProgress: number
}

/**
 * Manage goal selection and derived state
 */
export function useGoalsState(goals: Goal[]): UseGoalsStateReturn {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId) || null,
    [goals, selectedGoalId]
  )

  const filteredGoals = useMemo(() => goals, [goals])

  const goalsByStatus = useMemo(() => {
    const grouped: Record<string, Goal[]> = {}
    goals.forEach((goal) => {
      const status = goal.status || 'Unknown'
      if (!grouped[status]) {
        grouped[status] = []
      }
      grouped[status].push(goal)
    })
    return grouped
  }, [goals])

  const goalsByLane = useMemo(() => {
    const grouped: Record<string, Goal[]> = {}
    goals.forEach((goal) => {
      const lane = goal.lane_name || 'Unassigned'
      if (!grouped[lane]) {
        grouped[lane] = []
      }
      grouped[lane].push(goal)
    })
    return grouped
  }, [goals])

  const averageProgress = useMemo(() => {
    if (goals.length === 0) return 0
    const total = goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0)
    return Math.round(total / goals.length)
  }, [goals])

  return {
    selectedGoalId,
    setSelectedGoalId,
    selectedGoal,
    filteredGoals,
    goalsByStatus,
    goalsByLane,
    averageProgress,
  }
}

/**
 * Track expanded/collapsed state for goal groups
 */
export function useGoalsExpansion(initialExpanded: string[] = []) {
  const [expandedIds, setExpandedIds] = useState<string[]>(initialExpanded)

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }, [])

  const expandAll = useCallback(() => {
    setExpandedIds((prev) => Array.from(new Set([...prev])))
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedIds([])
  }, [])

  const isExpanded = useCallback(
    (id: string) => expandedIds.includes(id),
    [expandedIds]
  )

  return {
    expandedIds,
    toggleExpanded,
    expandAll,
    collapseAll,
    isExpanded,
  }
}
