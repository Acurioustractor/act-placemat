/**
 * useApi - Generic API data fetching hook
 *
 * Provides a reusable pattern for fetching data from REST APIs with:
 * - Loading state management
 * - Error handling
 * - Automatic refresh on mount
 * - Manual refetch capability
 *
 * USAGE:
 *   const { data, loading, error, refetch } = useApi('/api/endpoint')
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'

/**
 * Generic API hook options
 */
export interface UseApiOptions<T = unknown> {
  /** URL to fetch data from (appended to base URL) */
  url: string
  /** Whether to fetch on mount (default: true) */
  fetchOnMount?: boolean
  /** Whether to transform the response data */
  transform?: (data: unknown) => T
  /** Error message prefix for better debugging */
  errorPrefix?: string
}

/**
 * Generic API hook return type
 */
export interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic API hook for fetching data from REST endpoints
 */
export function useApi<T = unknown>(options: UseApiOptions<T>): UseApiReturn<T> {
  const { url, fetchOnMount = true, transform, errorPrefix = 'Failed to fetch' } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(resolveCommandCenterUrl(url))

      if (!res.ok) {
        throw new Error(`${errorPrefix}: ${res.status}`)
      }

      const rawData = await res.json()
      const processedData = transform ? transform(rawData) : (rawData as T)

      setData(processedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : `${errorPrefix}: Unknown error`)
    } finally {
      setLoading(false)
    }
  }, [url, transform, errorPrefix])

  useEffect(() => {
    if (fetchOnMount) {
      fetchData()
    }
  }, [fetchData, fetchOnMount])

  return { data, loading, error, refetch: fetchData }
}

/**
 * useApiMutation - Generic API mutation hook for POST/PUT/DELETE operations
 *
 * USAGE:
 *   const { mutate, loading, error } = useApiMutation({
 *     url: '/api/endpoint',
 *     method: 'POST',
 *     onSuccess: () => { refetch() }
 *   })
 */

import type { Dispatch, SetStateAction } from 'react'

export interface UseApiMutationOptions {
  url: string
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
  onError?: (error: Error) => void
}

/**
 * Generic API mutation hook for data modifications
 */
export function useApiMutation(options: UseApiMutationOptions) {
  const { url, method = 'POST', body, onSuccess, onError } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (mutationBody?: Record<string, unknown>): Promise<unknown | null> => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(resolveCommandCenterUrl(url), {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body || mutationBody || {}),
        })

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }

        const data = await res.json()

        if (onSuccess) {
          onSuccess(data)
        }

        return data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Request failed'
        setError(errorMessage)

        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage))
        }

        return null
      } finally {
        setLoading(false)
      }
    },
    [url, method, body, onSuccess, onError]
  )

  return { mutate, loading, error }
}

/**
 * useLoadingState - Hook for managing async operation loading states
 *
 * USAGE:
 *   const { isLoading, setLoading, runAsync } = useLoadingState()
 */
export function useLoadingState(initialValue = false): {
  isLoading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  runAsync: <T>(promise: Promise<T>) => Promise<T | null>
} {
  const [isLoading, setLoading] = useState(initialValue)

  const runAsync = useCallback(
    async <T,>(promise: Promise<T>): Promise<T | null> => {
      try {
        setLoading(true)
        return await promise
      } catch {
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { isLoading, setLoading, runAsync }
}
