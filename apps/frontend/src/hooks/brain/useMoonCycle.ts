/**
 * useMoonCycle - Data fetching hook for moon cycle data
 *
 * Fetches current moon phase with LCAA alignment information.
 *
 * USAGE:
 *   const { phase, act, next, loading, error } = useMoonCycle()
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { MoonPhaseData } from './types'

interface UseMoonCycleReturn extends Omit<MoonPhaseData, 'date'> {
  date: string
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch current moon cycle data with LCAA alignment
 */
export function useMoonCycle(): UseMoonCycleReturn {
  const [moonData, setMoonData] = useState<MoonPhaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(resolveCommandCenterUrl('/api/moon-cycle/current'))

      if (res.ok) {
        const data = await res.json()
        setMoonData(data)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching moon cycle:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch moon cycle')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Return spread data + loading/error states
  if (!moonData) {
    return {
      phase: '',
      emoji: '',
      illumination: 0,
      age: 0,
      act: { mode: 'Listen', focus: '' },
      next: { newMoon: 0, fullMoon: 0 },
      date: '',
      lcaa: { listen: '', connect: '', act: '', amplify: '' },
      loading,
      error,
      refetch: fetchData,
    }
  }

  return {
    ...moonData,
    loading,
    error,
    refetch: fetchData,
  }
}
