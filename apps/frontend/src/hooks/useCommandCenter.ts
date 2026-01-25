/**
 * useCommandCenter - Command Center Data Hooks
 *
 * @deprecated Use hooks from './command-center' instead
 * This file re-exports from the command-center/ module for backward compatibility.
 *
 * Connects dashboard components to the Command Center API (port 3456):
 * - Relationship intelligence (temperature, LCAA stages, touchpoints)
 * - Agent management (status, proposals, tasks)
 * - Knowledge layer metrics
 *
 * USAGE:
 *   const { relationships, health, loading } = useRelationships({ limit: 100 })
 *   const { agents, proposals } = useAgents()
 *   const { lcaaContacts } = useLCAAStages()
 */

// Re-export from the new command-center/ module
export * from './command-center'

// Also re-export types for convenience
export type {
  Relationship,
  RelationshipHealth,
  Agent,
  Proposal,
  Task,
  KnowledgeStats,
  LCAAStageData,
  UseRelationshipsOptions,
  UseProposalsOptions,
  UseTasksOptions,
} from './command-center/types'
