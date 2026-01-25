/**
 * Brain Module Types
 *
 * Type definitions for brain center and 2026 goals hooks
 */

// ============================================
// 2026 Goals Types
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
// Ecosystem Types
// ============================================

export interface EcosystemSite {
  id: string
  name: string
  slug: string
  url: string
  description: string | null
  category: 'core' | 'platform' | 'community'
  status: 'healthy' | 'degraded' | 'offline' | 'unknown'
  last_check_at: string | null
  response_time_ms: number | null
  icon_url: string | null
  display_order: number
}

export interface CategoryData {
  name: string
  sites: EcosystemSite[]
}

export interface EcosystemHealth {
  healthy: number
  total: number
  percentage: number
}

// ============================================
// Moon Cycle Types
// ============================================

export interface MoonPhaseData {
  phase: string
  emoji: string
  illumination: number
  age: number
  act: {
    mode: 'Listen' | 'Connect' | 'Act' | 'Amplify'
    focus: string
  }
  next: {
    newMoon: number
    fullMoon: number
  }
  date: string
  lcaa: {
    listen: string
    connect: string
    act: string
    amplify: string
  }
}

// ============================================
// Options
// ============================================

export interface UseGoals2026Options {
  lane?: 'A' | 'B' | 'C'
  type?: 'Yearly Goal' | 'Quarterly Sprint'
}

export interface UseEcosystemOptions {
  category?: 'core' | 'platform' | 'community'
}
