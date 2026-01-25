/**
 * Goals Module Types
 *
 * Type definitions for all goals-related hooks
 */

// ============================================
// Core Goal Types
// ============================================

export interface Goal {
  id: string
  title: string
  description?: string
  status: 'Planning' | 'In progress' | 'Review' | 'Completed' | 'Paused'
  progress_percentage: number
  lane_name?: string
  key_results?: string[]
  due_date?: string
  created_at?: string
  updated_at?: string
}

export interface GoalUpdate {
  field_changed: string
  old_value?: string
  new_value?: string
  created_at: string
  updated_by?: string
  comment?: string
}

export interface GoalMetrics {
  id: string
  metric_name: string
  current_value: number
  target_value: number
  unit: string
  progress_percentage: number
}

export interface GoalDetails extends Goal {
  metrics?: GoalMetrics[]
  updates?: GoalUpdate[]
}

// ============================================
// 2026 Goals Types (from useBrainCenter)
// ============================================

export interface Goal2026 {
  id: string
  notion_id: string
  title: string
  type: 'Yearly Goal' | 'Quarterly Sprint'
  lane: string | null
  status: string
  owner: string[]
  key_results: string | null
  start_date: string | null
  due_date: string | null
  parent_goal_id: string | null
  pillar_id: string | null
  project_id: string | null
  synced_at: string
  created_at: string
  updated_at: string
}

export interface LaneData {
  name: string
  goals: Goal2026[]
  completed: number
  total: number
  progress: number
}

export interface GoalsSummary {
  total: number
  yearly: number
  quarterly: number
  completed: number
  inProgress: number
  overallProgress: number
}

// ============================================
// Options & Return Types
// ============================================

export interface UseGoalsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseGoalUpdateOptions {
  progress_percentage?: number
  status?: string
  comment?: string
}

export interface UseGoalMoveOptions {
  lane: string
  position?: number
}

export interface UseGoalReorderOptions {
  lane: string
  goalIds: string[]
}

// ============================================
// Query Parameters
// ============================================

export interface GoalsQueryParams {
  lane?: 'A' | 'B' | 'C'
  type?: 'Yearly Goal' | 'Quarterly Sprint'
  status?: string
  limit?: number
}
