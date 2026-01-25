/**
 * useGoalsData - Data fetching hook for goals
 *
 * Fetches goals from the API with optional filtering and auto-refresh.
 * Focuses solely on data retrieval - no mutations.
 *
 * USAGE:
 *   const { goals, loading, error, refetch } = useGoalsData({ autoRefresh: true })
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { Goal, UseGoalsOptions } from './types'

interface UseGoalsDataReturn {
  goals: Goal[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch goals from the API
 */
export function useGoalsData(options: UseGoalsOptions = {}): UseGoalsDataReturn {
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

/**
 * Fetch calendar-specific goals
 */
export function useCalendarGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendarGoals = useCallback(async () => {
    try {
      const res = await fetch(resolveCommandCenterUrl('/api/goals/2026/calendar'))
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

/**
 * Fetch goal details by ID
 */
export function useGoalDetails(goalId: string | null) {
  const [details, setDetails] = useState<Goal | null>(null)
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
        const res = await fetch(resolveCommandCenterUrl(`/api/goals/${goalId}/details`))
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
