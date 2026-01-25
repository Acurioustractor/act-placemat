/**
 * useGoals2026 - Data fetching hook for 2026 goals
 *
 * Fetches 2026 goals from the API with optional lane/type filtering.
 *
 * USAGE:
 *   const { goals, lanes, summary, loading, error } = useGoals2026({ lane: 'A' })
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { Goal2026, LaneData, GoalsSummary, UseGoals2026Options } from './types'

interface UseGoals2026Return {
  goals: Goal2026[]
  lanes: Record<string, LaneData>
  summary: GoalsSummary | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch 2026 goals with optional filtering
 */
export function useGoals2026(options: UseGoals2026Options = {}): UseGoals2026Return {
  const [goals, setGoals] = useState<Goal2026[]>([])
  const [lanes, setLanes] = useState<Record<string, LaneData>>({})
  const [summary, setSummary] = useState<GoalsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { lane, type } = options

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(resolveCommandCenterUrl('/api/goals/2026'))

      if (res.ok) {
        const data = await res.json()

        // Apply filters
        let filteredGoals = data.goals || []
        if (lane) {
          filteredGoals = filteredGoals.filter((g: Goal2026) => g.lane?.startsWith(lane))
        }
        if (type) {
          filteredGoals = filteredGoals.filter((g: Goal2026) => g.type === type)
        }

        setGoals(filteredGoals)
        setLanes(data.lanes || {})
        setSummary(data.summary || null)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching 2026 goals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
    } finally {
      setLoading(false)
    }
  }, [lane, type])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { goals, lanes, summary, loading, error, refetch: fetchData }
}
