/**
 * useRelationships - Data fetching hook for relationship intelligence
 *
 * Fetches relationships/contacts with temperature tracking and health metrics.
 *
 * USAGE:
 *   const { relationships, health, loading, error } = useRelationships({ limit: 100 })
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type {
  Relationship,
  RelationshipHealth,
  UseRelationshipsOptions,
} from './types'

interface UseRelationshipsReturn {
  relationships: Relationship[]
  health: RelationshipHealth | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch relationships with temperature tracking
 */
export function useRelationships(
  options: UseRelationshipsOptions = {}
): UseRelationshipsReturn {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [health, setHealth] = useState<RelationshipHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { limit = 100, temperature, lcaaStage, project } = options

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Build query params
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      if (temperature) params.set('temperature', temperature)
      if (lcaaStage) params.set('lcaa_stage', lcaaStage)
      if (project) params.set('project', project)

      // Fetch relationships and health in parallel
      const [relRes, healthRes] = await Promise.allSettled([
        fetch(resolveCommandCenterUrl(`/api/relationships/list?${params}`)),
        fetch(resolveCommandCenterUrl('/api/relationships/health')),
      ])

      // Process relationships
      if (relRes.status === 'fulfilled' && relRes.value.ok) {
        const data = await relRes.value.json()
        const rawContacts = data.relationships || data.contacts || []
        if (rawContacts.length > 0 || data.success) {
          let contacts = rawContacts as Relationship[]

          // Client-side temperature filtering if needed
          if (temperature) {
            contacts = contacts.filter((c) => {
              if (temperature === 'hot') return c.temperature >= 70
              if (temperature === 'warm')
                return c.temperature >= 40 && c.temperature < 70
              if (temperature === 'cool') return c.temperature < 40
              return true
            })
          }

          // Client-side LCAA filtering if needed
          if (lcaaStage) {
            contacts = contacts.filter((c) => c.lcaa_stage === lcaaStage)
          }

          setRelationships(contacts)
        }
      }

      // Process health stats
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const data = await healthRes.value.json()
        const healthData: RelationshipHealth = {
          total_contacts: data.total ?? data.health?.total_contacts ?? 0,
          hot_count: data.hot ?? data.health?.hot_count ?? 0,
          warm_count: data.warm ?? data.health?.warm_count ?? 0,
          cool_count: data.cool ?? data.health?.cool_count ?? 0,
          at_risk_count: data.needsAttention ?? data.health?.at_risk_count ?? 0,
          avg_temperature:
            data.avgTemperature ?? data.health?.avg_temperature ?? 50,
        }
        setHealth(healthData)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching relationships:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch relationships'
      )
    } finally {
      setLoading(false)
    }
  }, [limit, temperature, lcaaStage, project])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { relationships, health, loading, error, refetch: fetchData }
}

/**
 * Fetch contacts grouped by LCAA stage
 */
export function useLCAAStages() {
  const [stages, setStages] = useState<import('./types').LCAAStageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(
        resolveCommandCenterUrl('/api/relationships/list?limit=500')
      )

      if (res.ok) {
        const data = await res.json()
        const rawContacts = data.relationships || data.contacts || []
        if (rawContacts.length > 0 || data.success) {
          const contacts = rawContacts as Relationship[]

          // Group by LCAA stage
          const stageMap = new Map<string, Relationship[]>()
          const stageOrder = ['Listen', 'Connect', 'Act', 'Amplify']

          // Initialize all stages
          stageOrder.forEach((s) => stageMap.set(s, []))

          // Group contacts
          contacts.forEach((c) => {
            const stage = c.lcaa_stage || 'Listen'
            const existing = stageMap.get(stage) || []
            existing.push(c)
            stageMap.set(stage, existing)
          })

          // Convert to array
          const stageData: import('./types').LCAAStageData[] = stageOrder.map(
            (stage) => ({
              stage,
              contacts: stageMap.get(stage) || [],
              count: (stageMap.get(stage) || []).length,
            })
          )

          setStages(stageData)
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching LCAA stages:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch LCAA stages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { stages, loading, error, refetch: fetchData }
}

/**
 * Fetch contacts requiring attention
 */
export function useAttentionRequired() {
  const [contacts, setContacts] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(
        resolveCommandCenterUrl('/api/relationships/attention')
      )

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.contacts) {
          setContacts(data.contacts)
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching attention required:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to fetch attention required'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { contacts, loading, error, refetch: fetchData }
}
