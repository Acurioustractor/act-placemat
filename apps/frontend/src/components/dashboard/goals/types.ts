/**
 * Goals Module Types
 * Consolidated type definitions for all goals functionality
 */

// Core Goal Types
export interface Goal {
  id: string
  title: string
  description?: string
  status: GoalStatus
  progress_percentage: number
  lane?: string           // Backend returns 'lane' column (A, B, C, etc.)
  lane_name?: string      // Frontend expects this for mapping
  key_results?: string[]
  due_date?: string
  project_id?: string
  related_contact_ids?: string[]
  metrics?: Metric[]
  updates?: Update[]
  type?: 'yearly' | 'quarterly'
}

export type GoalStatus = 'Planning' | 'In progress' | 'Review' | 'Completed' | 'Paused'

// Metric types
export interface Metric {
  id: string
  metric_name: string
  current_value: number
  target_value: number
  unit: string
  progress_percentage: number
}

// Update/History types
export interface Update {
  id: string
  field_changed: string
  old_value?: string
  new_value?: string
  created_at: string
  updated_by?: string
  comment?: string
}

// Goal updates (for mutations)
export interface GoalUpdates {
  progress_percentage?: number
  status?: string
  comment?: string
}

// Lane configuration
export interface Lane {
  id: string
  name: string
  color: string
  icon: string
  backendName: string
}

export const LANES: Lane[] = [
  { id: 'listen', name: 'Listen', color: '#3b82f6', icon: '👂', backendName: 'A — Core Ops' },
  { id: 'curiosity', name: 'Curiosity', color: '#8b5cf6', icon: '🔍', backendName: 'B — Platforms' },
  { id: 'action', name: 'Action', color: '#f59e0b', icon: '⚡', backendName: 'C — Place/Seasonal' },
  { id: 'art', name: 'Art', color: '#ec4899', icon: '🎨', backendName: 'D — Art' },
  { id: 'unassigned', name: 'Unassigned', color: '#94a3b8', icon: '📋', backendName: '' },
]

// Backend to frontend lane mapping
export const BACKEND_TO_FRONTEND: Record<string, string> = {
  'A — Core Ops': 'listen',
  'A': 'listen',
  'B — Platforms': 'curiosity',
  'B': 'curiosity',
  'C — Place/Seasonal': 'action',
  'C': 'action',
  'D — Art': 'art',
  'D': 'art',
  'art': 'art',
  'Art': 'art',
}

// Frontend to backend lane mapping
export const FRONTEND_TO_BACKEND: Record<string, string> = {
  'listen': 'A — Core Ops',
  'curiosity': 'B — Platforms',
  'action': 'C — Place/Seasonal',
}

// Filter types
export type FilterStatus = 'all' | GoalStatus
export type ViewMode = 'lanes' | 'calendar' | 'list'

// Lane colors for UI
export const LANE_COLORS: Record<string, string> = {
  'Listen': '#3b82f6',
  'Curiosity': '#8b5cf6',
  'Action': '#f59e0b',
  'Art': '#ec4899',
  'A — Core Ops': '#3b82f6',
  'A': '#3b82f6',
  'B — Platforms': '#8b5cf6',
  'B': '#8b5cf6',
  'C — Place/Seasonal': '#f59e0b',
  'C': '#f59e0b',
  'D — Art': '#ec4899',
  'D': '#ec4899',
}

// Status options with display info
export const STATUS_OPTIONS: Array<{ value: GoalStatus; label: string; color: string }> = [
  { value: 'Planning', label: 'Planning', color: '#6366f1' },
  { value: 'In progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'Review', label: 'Review', color: '#f59e0b' },
  { value: 'Completed', label: 'Completed', color: '#22c55e' },
  { value: 'Paused', label: 'Paused', color: '#71717a' },
]

// Status icons
export const STATUS_ICONS: Record<string, string> = {
  'Planning': '📋',
  'In progress': '🔄',
  'Review': '👀',
  'Completed': '✅',
  'Paused': '⏸️',
}

// Goals stats summary
export interface GoalsStats {
  total: number
  completed: number
  inProgress: number
  avgProgress: number
}

// Lane progress
export interface LaneProgress {
  laneId: string
  goals: Goal[]
  progress: number
  count: number
}
