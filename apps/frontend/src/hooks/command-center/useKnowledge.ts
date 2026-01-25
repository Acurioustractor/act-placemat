/**
 * useKnowledge - Data fetching hook for knowledge layer stats
 *
 * Fetches knowledge layer statistics and metrics.
 *
 * USAGE:
 *   const { stats, loading, error } = useKnowledgeStats()
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { KnowledgeStats } from './types'

interface UseKnowledgeStatsReturn {
  stats: KnowledgeStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch knowledge layer statistics
 */
export function useKnowledgeStats(): UseKnowledgeStatsReturn {
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(resolveCommandCenterUrl('/api/knowledge/stats'))

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.stats) {
          setStats(data.stats)
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching knowledge stats:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch knowledge stats'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { stats, loading, error, refetch: fetchData }
}
