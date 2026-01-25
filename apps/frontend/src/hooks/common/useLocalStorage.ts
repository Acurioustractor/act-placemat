/**
 * useLocalStorage - React hook for managing localStorage values
 *
 * Provides:
 * - Type-safe localStorage access
 * - Automatic serialization/deserialization
 * - SSR-safe handling
 * - Default value support
 *
 * USAGE:
 *   const [value, setValue] = useLocalStorage('key', defaultValue)
 */

import { useState, useCallback, useEffect } from 'react'

/**
 * Generic localStorage hook options
 */
export interface UseLocalStorageOptions<T> {
  /** Default value when key doesn't exist */
  defaultValue: T
  /** Function to serialize value to string (default: JSON.stringify) */
  serialize?: (value: T) => string
  /** Function to deserialize string to value (default: JSON.parse) */
  deserialize?: (str: string) => T
}

/**
 * Generic localStorage hook return type
 */
export interface UseLocalStorageReturn<T> {
  /** The stored value */
  value: T
  /** Function to update the stored value */
  setValue: (value: T | ((prev: T) => T)) => void
  /** Function to remove the stored value */
  removeValue: () => void
}

/**
 * Generic localStorage hook for persistent client-side state
 */
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T>
): UseLocalStorageReturn<T> {
  const { defaultValue, serialize = JSON.stringify, deserialize = JSON.parse } = options

  // State to hold the current value
  const [value, setValue] = useState<T>(defaultValue)

  // Load initial value from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        setValue(deserialize(stored))
      }
    } catch {
      // localStorage access failed (SSR or disabled) - use default
      console.warn(`Failed to read localStorage key "${key}"`)
    }
  }, [key, deserialize])

  // Update localStorage when value changes
  const updateValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue

      try {
        localStorage.setItem(key, serialize(valueToStore))
        setValue(valueToStore)
      } catch {
        // localStorage write failed (quota exceeded or disabled)
        console.warn(`Failed to write localStorage key "${key}"`)
      }
    },
    [key, serialize, value]
  )

  // Remove the value from localStorage
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      setValue(defaultValue)
    } catch {
      console.warn(`Failed to remove localStorage key "${key}"`)
    }
  }, [key, defaultValue])

  return { value, setValue: updateValue, removeValue }
}

/**
 * useLocalStorageBoolean - Boolean-specific localStorage hook
 *
 * USAGE:
 *   const [isEnabled, setIsEnabled] = useLocalStorageBoolean('feature.enabled', false)
 */
export function useLocalStorageBoolean(
  key: string,
  defaultValue = false
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useLocalStorage(key, {
    defaultValue,
    serialize: (v) => String(v),
    deserialize: (str) => str === 'true',
  })

  return [value as boolean, setValue as (value: boolean) => void]
}

/**
 * useLocalStorageNumber - Number-specific localStorage hook
 *
 * USAGE:
 *   const [count, setCount] = useLocalStorageNumber('counter', 0)
 */
export function useLocalStorageNumber(
  key: string,
  defaultValue = 0
): [number, (value: number) => void] {
  const [value, setValue] = useLocalStorage(key, {
    defaultValue,
    serialize: (v) => String(v),
    deserialize: (str) => parseFloat(str) || defaultValue,
  })

  return [value as number, setValue as (value: number) => void]
}
