/**
 * useGoalMetrics - Hook for managing goal key results and metrics
 *
 * Fetches, adds, and updates goal metrics/key results.
 *
 * USAGE:
 *   const { metrics, addMetric, updateMetric, loading, error } = useGoalMetrics(goalId)
 */

import { useState, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { GoalMetrics } from './types'

interface UseGoalMetricsReturn {
  metrics: GoalMetrics[]
  loading: boolean
  error: string | null
  addMetric: (metric: AddMetricInput) => Promise<GoalMetrics | null>
  updateMetric: (
    metricId: string,
    updates: UpdateMetricInput
  ) => Promise<GoalMetrics | null>
}

interface AddMetricInput {
  metric_name: string
  target_value: number
  unit: string
  current_value?: number
}

interface UpdateMetricInput {
  current_value?: number
  target_value?: number
}

/**
 * Fetch and manage goal metrics
 */
export function useGoalMetrics(goalId: string | null): UseGoalMetricsReturn {
  const [metrics, setMetrics] = useState<GoalMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addMetric = useCallback(
    async (newMetric: AddMetricInput): Promise<GoalMetrics | null> => {
      if (!goalId) return null
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
        return null
      } finally {
        setLoading(false)
      }
    },
    [goalId]
  )

  const updateMetric = useCallback(
    async (
      metricId: string,
      updates: UpdateMetricInput
    ): Promise<GoalMetrics | null> => {
      if (!goalId) return null
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
        return null
      }
    },
    [goalId]
  )

  return { metrics, loading, error, addMetric, updateMetric }
}
