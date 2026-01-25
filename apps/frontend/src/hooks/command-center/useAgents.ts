/**
 * useAgents - Data fetching hook for agent management
 *
 * Fetches agents, proposals, and tasks from the agent system.
 *
 * USAGE:
 *   const { agents, loading, error } = useAgents()
 *   const { proposals, approveProposal } = useProposals()
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import type { Agent, Proposal, Task, UseProposalsOptions, UseTasksOptions } from './types'

// ============================================
// Agents
// ============================================

interface UseAgentsReturn {
  agents: Agent[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch all agents
 */
export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch(resolveCommandCenterUrl('/api/agents'))

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.agents) {
          setAgents(data.agents)
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { agents, loading, error, refetch: fetchData }
}

// ============================================
// Proposals
// ============================================

interface UseProposalsReturn {
  proposals: Proposal[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  approveProposal: (id: string) => Promise<boolean>
  rejectProposal: (id: string, reason?: string) => Promise<boolean>
  generateDraft: (id: string) => Promise<{ subject: string; body: string } | null>
  confirmSend: (id: string, draft: { subject: string; body: string }) => Promise<boolean>
}

/**
 * Fetch and manage agent proposals
 */
export function useProposals(options: UseProposalsOptions = {}): UseProposalsReturn {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { status } = options

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (status) params.set('status', status)

      const res = await fetch(
        resolveCommandCenterUrl(`/api/agents/proposals?${params}`)
      )

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.proposals) {
          setProposals(data.proposals)
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching proposals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch proposals')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Actions
  const approveProposal = async (id: string): Promise<boolean> => {
    const res = await fetch(
      resolveCommandCenterUrl(`/api/agents/proposals/${id}/approve`),
      { method: 'POST' }
    )
    if (res.ok) {
      fetchData()
      return true
    }
    return false
  }

  const rejectProposal = async (id: string, reason?: string): Promise<boolean> => {
    const res = await fetch(
      resolveCommandCenterUrl(`/api/agents/proposals/${id}/reject`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }
    )
    if (res.ok) {
      fetchData()
      return true
    }
    return false
  }

  const generateDraft = async (
    id: string
  ): Promise<{ subject: string; body: string } | null> => {
    const res = await fetch(
      resolveCommandCenterUrl(`/api/agents/proposals/${id}/generate-draft`),
      { method: 'POST' }
    )
    if (res.ok) {
      const data = await res.json()
      return data.draft
    }
    return null
  }

  const confirmSend = async (
    id: string,
    draft: { subject: string; body: string }
  ): Promise<boolean> => {
    const res = await fetch(
      resolveCommandCenterUrl(`/api/agents/proposals/${id}/confirm-send`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      }
    )
    if (res.ok) {
      fetchData()
      return true
    }
    return false
  }

  return {
    proposals,
    loading,
    error,
    refetch: fetchData,
    approveProposal,
    rejectProposal,
    generateDraft,
    confirmSend,
  }
}

// ============================================
// Tasks
// ============================================

interface UseTasksReturn {
  tasks: Task[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch agent tasks
 */
export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { status, agentId } = options

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (agentId) params.set('agent_id', agentId)

      const res = await fetch(resolveCommandCenterUrl(`/api/tasks?${params}`))

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.tasks) {
          setTasks(data.tasks)
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [status, agentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { tasks, loading, error, refetch: fetchData }
}
