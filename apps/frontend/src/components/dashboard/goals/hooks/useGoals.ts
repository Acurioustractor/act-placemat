/**
 * useGoals - Goals state management hook
 *
 * Consolidates all goals state logic including:
 * - Lane assignments with optimistic updates
 * - Goal ordering within lanes
 * - Filtering and search
 * - Progress calculations
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type {
  Goal,
  GoalUpdates,
  GoalsStats,
  LaneProgress,
  FilterStatus,
  ViewMode,
  LANES,
  BACKEND_TO_FRONTEND,
  FRONTEND_TO_BACKEND,
} from '../types'

interface UseGoalsOptions {
  goals: Goal[]
  onUpdateGoal?: (id: string, updates: GoalUpdates) => Promise<void>
  onMoveGoal?: (goalId: string, lane: string) => Promise<void>
  onReorderLane?: (lane: string, goalIds: string[]) => Promise<void>
}

interface UseGoalsReturn {
  // State
  searchQuery: string
  statusFilter: FilterStatus
  laneFilter: string | null
  viewMode: ViewMode
  laneAssignments: Record<string, string>
  laneOrder: Record<string, string[]>
  calendarLaneFilter: string | null

  // Setters
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: FilterStatus) => void
  setLaneFilter: (filter: string | null) => void
  setViewMode: (mode: ViewMode) => void
  setCalendarLaneFilter: (filter: string | null) => void

  // Computed
  getGoalsForLane: (laneId: string) => Goal[]
  filteredGoals: Goal[]
  stats: GoalsStats
  laneProgress: LaneProgress[]

  // Actions
  handleUpdateGoal: (id: string, updates: GoalUpdates) => Promise<void>
  handleMoveGoal: (goalId: string, toLaneId: string) => Promise<void>
  handleReorderGoal: (goalId: string, direction: 'up' | 'down', laneId: string) => void
}

export function useGoals({
  goals,
  onUpdateGoal,
  onMoveGoal,
  onReorderLane,
}: UseGoalsOptions): UseGoalsReturn {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [laneFilter, setLaneFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('lanes')
  const [calendarLaneFilter, setCalendarLaneFilter] = useState<string | null>(null)

  // Lane assignments state (optimistic updates)
  const [laneAssignments, setLaneAssignments] = useState<Record<string, string>>({})
  const [laneOrder, setLaneOrder] = useState<Record<string, string[]>>({})

  // Initialize lane assignments and order from goals on mount
  useEffect(() => {
    if (goals.length > 0 && Object.keys(laneAssignments).length === 0) {
      const initial: Record<string, string> = {}
      const order: Record<string, string[]> = {}

      // Initialize all lanes
      LANES.forEach(lane => {
        order[lane.id] = []
        order['unassigned'] = []
      })

      goals.forEach(goal => {
        const backendLane = goal.lane || goal.lane_name || ''
        let frontendLane = 'unassigned'

        if (backendLane && BACKEND_TO_FRONTEND[backendLane]) {
          frontendLane = BACKEND_TO_FRONTEND[backendLane]
        } else if (backendLane) {
          // Try to match by first letter (A, B, C, D)
          for (const [backend, frontend] of Object.entries(BACKEND_TO_FRONTEND)) {
            if (backendLane.startsWith(backend.split(' — ')[0])) {
              frontendLane = frontend
              break
            }
          }
        }

        initial[goal.id] = frontendLane

        // Add to front of lane order (so first loaded is at top)
        if (order[frontendLane]) {
          order[frontendLane].unshift(goal.id)
        }
      })

      setLaneAssignments(initial)
      setLaneOrder(order)
    }
  }, [goals.length])

  // Get goals for a specific lane, sorted by laneOrder
  const getGoalsForLane = useCallback((laneId: string): Goal[] => {
    const laneGoalsList = goals.filter(goal => {
      const assignedLane = laneAssignments[goal.id] || 'unassigned'
      return assignedLane === laneId
    })

    // Sort by laneOrder (put unknown goals at bottom)
    const order = laneOrder[laneId] || []
    return laneGoalsList.sort((a, b) => {
      const idxA = order.indexOf(a.id)
      const idxB = order.indexOf(b.id)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })
  }, [goals, laneAssignments, laneOrder])

  // Filter goals
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          goal.title.toLowerCase().includes(query) ||
          goal.description?.toLowerCase().includes(query) ||
          goal.key_results?.some((kr) => kr.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      if (statusFilter !== 'all' && goal.status !== statusFilter) return false

      return true
    })
  }, [goals, searchQuery, statusFilter])

  // Calculate stats
  const stats = useMemo((): GoalsStats => {
    const total = goals.length
    const completed = goals.filter((g) => g.status === 'Completed').length
    const inProgress = goals.filter((g) => g.status === 'In progress').length
    const avgProgress =
      total > 0
        ? Math.round(goals.reduce((sum, g) => sum + g.progress_percentage, 0) / total)
        : 0

    return { total, completed, inProgress, avgProgress }
  }, [goals])

  // Calculate lane progress
  const laneProgress = useMemo((): LaneProgress[] => {
    return LANES.map(lane => {
      const laneGoals = getGoalsForLane(lane.id)
      const progress =
        laneGoals.length > 0
          ? Math.round(
              laneGoals.reduce((sum, g) => sum + g.progress_percentage, 0) /
                laneGoals.length
            )
          : 0

      return {
        laneId: lane.id,
        goals: laneGoals,
        progress,
        count: laneGoals.length,
      }
    })
  }, [getGoalsForLane])

  // Update goal handler
  const handleUpdateGoal = useCallback(
    async (id: string, updates: GoalUpdates) => {
      if (onUpdateGoal) {
        await onUpdateGoal(id, updates)
      }
    },
    [onUpdateGoal]
  )

  // Move goal between lanes
  const handleMoveGoal = useCallback(
    async (goalId: string, toLaneId: string) => {
      const fromLaneId = laneAssignments[goalId] || 'unassigned'
      if (fromLaneId === toLaneId) return

      // Optimistic update - update both lane assignment and put at top of new lane
      setLaneAssignments(prev => ({
        ...prev,
        [goalId]: toLaneId,
      }))

      // Update order - put moved goal at top of new lane, remove from old lane
      setLaneOrder(prev => {
        const newOrder = { ...prev }
        // Remove from old lane
        if (newOrder[fromLaneId]) {
          newOrder[fromLaneId] = newOrder[fromLaneId].filter(id => id !== goalId)
        }
        // Add to top of new lane
        if (newOrder[toLaneId]) {
          newOrder[toLaneId] = [goalId, ...newOrder[toLaneId].filter(id => id !== goalId)]
        }
        return newOrder
      })

      // Persist to backend
      if (onMoveGoal) {
        const backendLane = FRONTEND_TO_BACKEND[toLaneId] || toLaneId
        await onMoveGoal(goalId, backendLane)
      }
    },
    [laneAssignments, onMoveGoal]
  )

  // Reorder goal within lane
  const handleReorderGoal = useCallback(
    (goalId: string, direction: 'up' | 'down', laneId: string) => {
      const order = [...(laneOrder[laneId] || [])]
      const currentIndex = order.indexOf(goalId)

      if (currentIndex === -1) return

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= order.length) return

      // Swap
      ;[order[currentIndex], order[newIndex]] = [order[newIndex], order[currentIndex]]

      setLaneOrder(prev => ({
        ...prev,
        [laneId]: order,
      }))

      // Persist to backend
      if (onReorderLane) {
        onReorderLane(laneId, order)
      }
    },
    [laneOrder, onReorderLane]
  )

  return {
    // State
    searchQuery,
    statusFilter,
    laneFilter,
    viewMode,
    laneAssignments,
    laneOrder,
    calendarLaneFilter,

    // Setters
    setSearchQuery,
    setStatusFilter,
    setLaneFilter,
    setViewMode,
    setCalendarLaneFilter,

    // Computed
    getGoalsForLane,
    filteredGoals,
    stats,
    laneProgress,

    // Actions
    handleUpdateGoal,
    handleMoveGoal,
    handleReorderGoal,
  }
}
