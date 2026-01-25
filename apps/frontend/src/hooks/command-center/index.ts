/**
 * Command Center Module Index
 *
 * Unified exports for all command center hooks.
 * Provides backward compatibility with the original useCommandCenter.ts.
 */

// Types
export * from './types'

// Data fetching hooks
export {
  useRelationships,
  useLCAAStages,
  useAttentionRequired,
} from './useRelationships'

export { useAgents, useProposals, useTasks } from './useAgents'

export { useKnowledgeStats } from './useKnowledge'

// ============================================
// Backward Compatibility
// ============================================

/**
 * @deprecated Use individual hooks instead
 * Combined command center hook (original useCommandCenter pattern)
 */
export function useCommandCenter() {
  const relationships = useRelationships()
  const agents = useAgents()
  const proposals = useProposals()
  const tasks = useTasks()
  const knowledge = useKnowledgeStats()

  const loading =
    relationships.loading ||
    agents.loading ||
    proposals.loading ||
    tasks.loading ||
    knowledge.loading

  return {
    relationships: relationships.relationships,
    relationshipHealth: relationships.health,
    agents: agents.agents,
    proposals: proposals.proposals,
    tasks: tasks.tasks,
    knowledgeStats: knowledge.stats,
    loading,
    refetch: () => {
      relationships.refetch()
      agents.refetch()
      proposals.refetch()
      tasks.refetch()
      knowledge.refetch()
    },
  }
}

// Re-export types for convenience
export type { Relationship, RelationshipHealth } from './types'
export type { Agent, Proposal, Task } from './types'
export type { KnowledgeStats } from './types'
