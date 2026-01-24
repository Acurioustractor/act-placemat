/**
 * useGoals - Goal management hooks
 *
 * Provides:
 * - useGoals() - Fetch and manage goals
 * - useGoalUpdate() - Update goal progress
 * - useGoalHistory() - Goal change history
 */

import { useState, useCallback, useEffect } from 'react'
import { resolveCommandCenterUrl } from '../config/env'

interface Goal {
  id: string
  title: string
  description?: string
  status: 'Planning' | 'In progress' | 'Review' | 'Completed' | 'Paused'
  progress_percentage: number
  lane_name?: string
  key_results?: string[]
  due_date?: string
  created_at?: string
  updated_at?: string
}

interface GoalUpdate {
  field_changed: string
  old_value?: string
  new_value?: string
  created_at: string
  updated_by?: string
  comment?: string
}

interface GoalMetrics {
  id: string
  metric_name: string
  current_value: number
  target_value: number
  unit: string
  progress_percentage: number
}

interface GoalDetails extends Goal {
  metrics?: GoalMetrics[]
  updates?: GoalUpdate[]
}

interface UseGoalsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useGoals(options: UseGoalsOptions = {}) {
  const { autoRefresh = true, refreshInterval = 60000 } = options
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch(resolveCommandCenterUrl('/api/goals/2026'))
      if (!res.ok) throw new Error('Failed to fetch goals')
      const data = await res.json()
      setGoals(data.goals || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
    if (autoRefresh) {
      const interval = setInterval(fetchGoals, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchGoals, autoRefresh, refreshInterval])

  return { goals, loading, error, refetch: fetchGoals }
}

export function useGoalUpdate() {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateGoal = useCallback(
    async (
      goalId: string,
      updates: {
        progress_percentage?: number
        status?: string
        comment?: string
      }
    ) => {
      setUpdating(true)
      setError(null)
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/update`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update goal')
        }
        return await res.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setUpdating(false)
      }
    },
    []
  )

  return { updateGoal, updating, error }
}

export function useGoalHistory(goalId: string | null) {
  const [history, setHistory] = useState<GoalUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!goalId) {
      setHistory([])
      return
    }

    const fetchHistory = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/history`)
        )
        if (!res.ok) throw new Error('Failed to fetch history')
        const data = await res.json()
        setHistory(data.updates || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [goalId])

  return { history, loading, error }
}

export function useGoalDetails(goalId: string | null) {
  const [details, setDetails] = useState<GoalDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!goalId) {
      setDetails(null)
      return
    }

    const fetchDetails = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/details`)
        )
        if (!res.ok) throw new Error('Failed to fetch details')
        const data = await res.json()
        setDetails(data.goal || null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [goalId])

  return { details, loading, error }
}

export function useGoalMetrics(goalId: string | null) {
  const [metrics, setMetrics] = useState<GoalMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addMetric = useCallback(
    async (
      newMetric: {
        metric_name: string
        target_value: number
        unit: string
        current_value?: number
      }
    ) => {
      if (!goalId) return
      setLoading(true)
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/metrics`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMetric),
          }
        )
        if (!res.ok) throw new Error('Failed to add metric')
        const data = await res.json()
        setMetrics((prev) => [...prev, data.metric])
        return data.metric
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [goalId]
  )

  const updateMetric = useCallback(
    async (
      metricId: string,
      updates: {
        current_value?: number
        target_value?: number
      }
    ) => {
      if (!goalId) return
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/metrics/${metricId}`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          }
        )
        if (!res.ok) throw new Error('Failed to update metric')
        const data = await res.json()
        setMetrics((prev) =>
          prev.map((m) => (m.id === metricId ? { ...m, ...data.metric } : m))
        )
        return data.metric
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      }
    },
    [goalId]
  )

  return { metrics, loading, error, addMetric, updateMetric }
}

// Helper function to create a new goal
export async function createGoal(
  goalData: Partial<Goal>
): Promise<Goal | null> {
  // This would POST to /api/goals in a full implementation
  // For now, returns null to indicate not implemented
  console.log('Creating goal:', goalData)
  return null
}

// Helper function to delete a goal
export async function deleteGoal(goalId: string): Promise<boolean> {
  console.log('Deleting goal:', goalId)
  return false // Not implemented
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOAL REORDER & MOVE HOOKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useGoalMove() {
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moveGoal = useCallback(
    async (goalId: string, lane: string, position?: number) => {
      setMoving(true)
      setError(null)
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/move`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lane, position }),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to move goal')
        }
        return await res.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setMoving(false)
      }
    },
    []
  )

  return { moveGoal, moving, error }
}

export function useGoalReorder() {
  const [reordering, setReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reorderLane = useCallback(
    async (lane: string, goalIds: string[]) => {
      setReordering(true)
      setError(null)
      try {
        const res = await fetch(
          resolveCommandCenterUrl('/api/goals/reorder'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lane, goalIds }),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to reorder lane')
        }
        return await res.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setReordering(false)
      }
    },
    []
  )

  return { reorderLane, reordering, error }
}

export function useCalendarGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendarGoals = useCallback(async () => {
    try {
      const res = await fetch(
        resolveCommandCenterUrl('/api/goals/2026/calendar')
      )
      if (!res.ok) throw new Error('Failed to fetch calendar goals')
      const data = await res.json()
      setGoals(data.goals || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendarGoals()
  }, [fetchCalendarGoals])

  return { goals, loading, error, refetch: fetchCalendarGoals }
}
