/**
 * useGoalHistory - Hook for tracking goal change history
 *
 * Fetches and manages the history of changes made to a goal.
 *
 * USAGE:
 *   const { history, loading, error } = useGoalHistory(goalId)
 */

import { useState, useEffect } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { GoalUpdate } from './types'

interface UseGoalHistoryReturn {
  history: GoalUpdate[]
  loading: boolean
  error: string | null
}

/**
 * Fetch goal change history
 */
export function useGoalHistory(goalId: string | null): UseGoalHistoryReturn {
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
