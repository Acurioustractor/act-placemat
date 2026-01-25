/**
 * useEcosystem - Data fetching hook for ecosystem sites
 *
 * Fetches ecosystem sites with health monitoring and optional category filtering.
 *
 * USAGE:
 *   const { sites, categories, health, loading, error } = useEcosystem({ category: 'core' })
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { EcosystemSite, CategoryData, EcosystemHealth, UseEcosystemOptions } from './types'

interface UseEcosystemReturn {
  sites: EcosystemSite[]
  categories: Record<string, CategoryData>
  health: EcosystemHealth | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch ecosystem sites with health monitoring
 */
export function useEcosystem(options: UseEcosystemOptions = {}): UseEcosystemReturn {
  const [sites, setSites] = useState<EcosystemSite[]>([])
  const [categories, setCategories] = useState<Record<string, CategoryData>>({})
  const [health, setHealth] = useState<EcosystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { category } = options

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(resolveCommandCenterUrl('/api/ecosystem'))

      if (res.ok) {
        const data = await res.json()

        // Apply category filter
        let filteredSites = data.sites || []
        if (category) {
          filteredSites = filteredSites.filter((s: EcosystemSite) => s.category === category)
        }

        setSites(filteredSites)
        setCategories(data.categories || {})
        setHealth(data.health || null)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching ecosystem:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch ecosystem')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { sites, categories, health, loading, error, refetch: fetchData }
}
