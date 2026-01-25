/**
 * useDebounce - React hook for debouncing values
 *
 * Delays updating the debounced value until after the specified delay
 * has passed since the last change to the original value.
 *
 * USAGE:
 *   const debouncedSearchTerm = useDebounce(searchTerm, 300)
 */

import { useState, useEffect } from 'react'

/**
 * useDebounce hook options
 */
export interface UseDebounceOptions<T> {
  /** The value to debounce */
  value: T
  /** Delay in milliseconds (default: 300) */
  delay?: number
}

/**
 * useDebounce hook for delaying value updates
 */
export function useDebounce<T>(options: UseDebounceOptions<T>): T {
  const { value, delay = 300 } = options

  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up timer to update debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up timer on value or delay change
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * useDebounceCallback - Debounce a callback function
 *
 * USAGE:
 *   const debouncedSearch = useDebounceCallback((query) => {
 *     // Perform search
 *   }, 300)
 */
export function useDebounceCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay = 300
): T {
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Set new timeout
      const newTimeoutId = setTimeout(() => {
        callback(...args)
      }, delay)

      setTimeoutId(newTimeoutId)
    },
    [callback, delay, timeoutId]
  ) as T

  return debouncedCallback
}

/**
 * useThrottle - Throttle value updates
 *
 * Ensures the value is only updated at most once per specified interval.
 *
 * USAGE:
 *   const throttledScroll = useThrottle(scrollPosition, 100)
 */
export function useThrottle<T>(value: T, delay = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const [lastUpdated, setLastUpdated] = useState<number>(0)

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdated

    if (timeSinceLastUpdate >= delay) {
      // Enough time has passed, update immediately
      setThrottledValue(value)
      setLastUpdated(now)
    } else {
      // Update will happen after remaining delay
      const timer = setTimeout(() => {
        setThrottledValue(value)
        setLastUpdated(Date.now())
      }, delay - timeSinceLastUpdate)

      return () => clearTimeout(timer)
    }
  }, [value, delay, lastUpdated])

  return throttledValue
}
