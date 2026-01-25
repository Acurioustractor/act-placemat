/**
 * useGoalsActions - Action/mutation hooks for goals
 *
 * Provides CRUD operations and mutations for goals.
 * Focuses solely on actions - no data fetching.
 *
 * USAGE:
 *   const { updateGoal, updating, error } = useGoalsActions()
 */

import { useState, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { UseGoalUpdateOptions } from './types'

interface UseGoalsActionsReturn {
  updateGoal: (
    goalId: string,
    updates: UseGoalUpdateOptions
  ) => Promise<unknown>
  updating: boolean
  error: string | null
}

/**
 * Update a goal's progress, status, or add comments
 */
export function useGoalUpdate(): UseGoalsActionsReturn {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateGoal = useCallback(
    async (
      goalId: string,
      updates: UseGoalUpdateOptions
    ) => {
      setUpdating(true)
      setError(null)
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/update`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update goal')
        }
        return await res.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setUpdating(false)
      }
    },
    []
  )

  return { updateGoal, updating, error }
}

// ============================================
// Goal Move Actions
// ============================================

interface UseGoalMoveReturn {
  moveGoal: (goalId: string, lane: string, position?: number) => Promise<unknown>
  moving: boolean
  error: string | null
}

/**
 * Move a goal to a different lane
 */
export function useGoalMove(): UseGoalMoveReturn {
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moveGoal = useCallback(
    async (goalId: string, lane: string, position?: number) => {
      setMoving(true)
      setError(null)
      try {
        const res = await fetch(
          resolveCommandCenterUrl(`/api/goals/${goalId}/move`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lane, position }),
          }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to move goal')
        }
        return await res.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setMoving(false)
      }
    },
    []
  )

  return { moveGoal, moving, error }
}

// ============================================
// Goal Reorder Actions
// ============================================

interface UseGoalReorderReturn {
  reorderLane: (lane: string, goalIds: string[]) => Promise<unknown>
  reordering: boolean
  error: string | null
}

/**
 * Reorder goals within a lane
 */
export function useGoalReorder(): UseGoalReorderReturn {
  const [reordering, setReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reorderLane = useCallback(
    async (lane: string, goalIds: string[]) => {
      setReordering(true)
      setError(null)
      try {
        const res = await fetch(resolveCommandCenterUrl('/api/goals/reorder'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lane, goalIds }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to reorder lane')
        }
        return await res.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        throw err
      } finally {
        setReordering(false)
      }
    },
    []
  )

  return { reorderLane, reordering, error }
}

// ============================================
// Goal CRUD Actions (Async helpers)
// ============================================

/**
 * Create a new goal
 */
export async function createGoal(
  goalData: Partial<import('./types').Goal>
): Promise<import('./types').Goal | null> {
  console.log('Creating goal:', goalData)
  return null // Not implemented
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<boolean> {
  console.log('Deleting goal:', goalId)
  return false // Not implemented
}
