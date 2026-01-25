/**
 * useAsync - React hook for managing async operations with state
 *
 * Provides a standardized pattern for:
 * - Running async functions
 * - Tracking loading, error, and data states
 * - Callback handling on success/error
 *
 * USAGE:
 *   const { execute, data, loading, error } = useAsync(async () => {
 *     return await fetchData()
 *   }, { onSuccess: (data) => {...} })
 */

import { useState, useCallback, useRef } from 'react'

/**
 * useAsync hook options
 */
export interface UseAsyncOptions<T, E = Error> {
  /** Callback on successful completion */
  onSuccess?: (data: T) => void
  /** Callback on error */
  onError?: (error: E) => void
  /** Whether to execute on mount (default: false) */
  executeOnMount?: boolean
}

/**
 * useAsync hook return type
 */
export interface UseAsyncReturn<T, E = Error> {
  /** Execute the async function */
  execute: (...args: Parameters<typeof Promise.resolve<T>> extends [infer U] ? [U] : []) => Promise<T | null>
  /** The returned data from the async function */
  data: T | null
  /** Whether the async function is currently running */
  loading: boolean
  /** Any error that occurred */
  error: E | null
  /** Reset all state */
  reset: () => void
}

/**
 * useAsync hook for managing async operations with standardized state
 */
export function useAsync<T, E = Error>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions<T, E> = {}
): UseAsyncReturn<T, E> {
  const { onSuccess, onError, executeOnMount = false } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<E | null>(null)

  // Track mounted state to prevent state updates on unmounted components
  const isMounted = useRef(true)

  useState(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  })

  const execute = useCallback(
    async (...args: Parameters<typeof Promise.resolve<T>> extends [infer U] ? [U] : []) => {
      setLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...(args as []))

        if (isMounted.current) {
          setData(result)
          if (onSuccess) {
            onSuccess(result)
          }
        }

        return result
      } catch (err) {
        const error = err as E

        if (isMounted.current) {
          setError(error)
          if (onError) {
            onError(error)
          }
        }

        return null
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    },
    [asyncFunction, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  // Optionally execute on mount
  if (executeOnMount && !loading && !data && !error) {
    execute()
  }

  return { execute, data, loading, error, reset }
}

/**
 * useAsyncCallback - useAsync variant that returns a callback
 *
 * USAGE:
 *   const fetchUser = useAsyncCallback(async (userId) => {
 *     return await api.getUser(userId)
 *   })
 */
export function useAsyncCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  asyncFunction: T,
  options: UseAsyncOptions<ReturnType<T>, Error> = {}
): {
  execute: T
  data: ReturnType<T> | null
  loading: boolean
  error: Error | null
} {
  const [data, setData] = useState<ReturnType<T> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...args)
        setData(result)

        if (options.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (err) {
        const error = err as Error
        setError(error)

        if (options.onError) {
          options.onError(error)
        }

        throw err
      } finally {
        setLoading(false)
      }
    },
    [asyncFunction, options]
  )

  return { execute, data, loading, error }
}
