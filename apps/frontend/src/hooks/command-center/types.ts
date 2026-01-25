/**
 * Command Center Module Types
 *
 * Type definitions for command center hooks (relationships, agents, proposals, etc.)
 */

// ============================================
// Relationship Types
// ============================================

export interface Relationship {
  id: string
  ghl_contact_id: string
  contact_name: string
  contact_email: string | null
  temperature: number
  temperature_trend: 'rising' | 'stable' | 'falling' | null
  lcaa_stage: string | null
  total_touchpoints: number
  inbound_count: number
  outbound_count: number
  days_since_contact: number | null
  last_contact_at: string | null
  tags: string[] | null
  suggested_actions: string | null
}

export interface RelationshipHealth {
  total_contacts: number
  hot_count: number
  warm_count: number
  cool_count: number
  at_risk_count: number
  avg_temperature: number
}

export interface LCAAStageData {
  stage: string
  contacts: Relationship[]
  count: number
}

// ============================================
// Agent Types
// ============================================

export interface Agent {
  id: string
  name: string
  description: string | null
  enabled: boolean
  autonomy_level: number
  last_heartbeat: string | null
  execution_count: number
  success_rate: number | null
  capabilities: string[] | null
}

export interface Proposal {
  id: string
  agent_id: string
  action_type: string
  target_type: string
  target_id: string | null
  target_name: string | null
  proposed_action: Record<string, unknown>
  reasoning: string | null
  confidence_score: number | null
  risk_level: string
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'draft_ready'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface Task {
  id: string
  agent_id: string
  task_type: string
  payload: Record<string, unknown>
  status: 'queued' | 'running' | 'completed' | 'failed'
  priority: number
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

// ============================================
// Knowledge Types
// ============================================

export interface KnowledgeStats {
  total_entities: number
  total_qa_pairs: number
  embedding_coverage: number
  last_sync: string | null
}

// ============================================
// Options
// ============================================

export interface UseRelationshipsOptions {
  limit?: number
  temperature?: 'hot' | 'warm' | 'cool'
  lcaaStage?: string
  project?: string
}

export interface UseProposalsOptions {
  status?: string
}

export interface UseTasksOptions {
  status?: string
  agentId?: string
}
