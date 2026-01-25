/**
 * Time Module Types
 * Unified time view types for Daily, Weekly, Monthly, Yearly views
 */

export type TimeHorizon = 'day' | 'week' | 'month' | 'year'

export interface TimeViewConfig {
  horizon: TimeHorizon
  label: string
  icon: string
  shortLabel: string
}

export const TIME_VIEWS: TimeViewConfig[] = [
  { horizon: 'day', label: 'Daily', icon: '☀️', shortLabel: 'Today' },
  { horizon: 'week', label: 'Weekly', icon: '📅', shortLabel: 'This Week' },
  { horizon: 'month', label: 'Monthly', icon: '🗓️', shortLabel: 'This Month' },
  { horizon: 'year', label: 'Yearly', icon: '📆', shortLabel: 'This Year' },
]

// Time-based stats
export interface TimeStats {
  stories: number
  storiesChange: number
  vignettes: number
  vignettesChange: number
  relationships: number
  relationshipsChange: number
  income?: number
  incomeChange?: number
}

// Command center overview data
export interface CommandCenterOverview {
  stats: {
    stories: number
    storytellers: number
    projects: number
    vignettes: number
  }
  storyGaps: {
    totalGaps: number
    urgentCount: number
    urgent: Array<{ project: string; reason: string }>
  }
  artOpportunities: Array<{
    title: string
    type: string
    score: number
  }>
  elderReview: {
    pending: number
    items: string[]
  }
}

// Morning brief data
export interface MorningBrief {
  greeting: string
  summary: string
  quickActions: Array<{
    label: string
    icon: string
    action?: string
  }>
}

// Tasks data
export interface Task {
  id: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  dueDate?: string
}

export interface TasksResponse {
  tasks: Task[]
  totalTasks: number
  urgentCount: number
}

// Relationships data
export interface RelationshipContact {
  id: string
  name: string
  temperature: number
  days_since_contact?: number | null
}

export interface RelationshipsResponse {
  needsAttention?: RelationshipContact[]
  topContacts?: RelationshipContact[]
}

// Reflection prompt
export interface ReflectionQuestion {
  id: string
  label: string
}

export interface ReflectionPromptProps {
  horizon: TimeHorizon
  questions: ReflectionQuestion[]
}

// Legacy view exports for backward compatibility
export type DailyViewProps = Record<string, never>
export type WeeklyViewProps = Record<string, never>
export type MonthlyViewProps = Record<string, never>
export type YearlyViewProps = Record<string, never>
