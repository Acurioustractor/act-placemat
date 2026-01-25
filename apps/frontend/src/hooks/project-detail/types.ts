/**
 * Project Detail Module Types
 *
 * Type definitions for project detail hooks
 */

import type { Relationship } from '../command-center/types'

// ============================================
// Project Contact Types
// ============================================

export interface ProjectContact {
  id: string
  ghl_contact_id: string
  contact_name: string
  contact_email: string | null
  temperature: number
  temperature_trend: 'rising' | 'stable' | 'falling' | null
  lcaa_stage: string | null
  total_touchpoints: number
  days_since_contact: number | null
  last_contact_at: string | null
  tags: string[] | null
}

// ============================================
// Project Story Types
// ============================================

export interface ProjectStory {
  id: string
  title: string
  content?: string
  excerpt?: string
  storyteller_name?: string
  lcaa_stage?: string
  status: string
  created_at: string
  media_count?: number
}

// ============================================
// Project Communication Types
// ============================================

export interface ProjectCommunication {
  id: string
  type: 'email' | 'meeting' | 'call' | 'note'
  subject: string
  summary?: string
  date: string
  participants: string[]
  importance?: 'high' | 'medium' | 'low'
}

// ============================================
// Project Update Types
// ============================================

export interface ProjectUpdate {
  id: string
  title: string
  content: string
  update_type: 'milestone' | 'note' | 'status_change' | 'meeting'
  created_at: string
  created_by?: string
}

// ============================================
// Project Notion Page Types
// ============================================

export interface ProjectNotionPage {
  id: string
  title: string
  url: string
  lastEdited?: string
}

// ============================================
// Project Intelligence Types
// ============================================

export interface ProjectIntelligence {
  healthScore: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
  nextActions: string[]
}

// ============================================
// Complete Project Detail
// ============================================

export interface ProjectDetailData {
  // Base project data
  project: import('../../data/allProjects').ACTFullProject

  // Related contacts
  contacts: ProjectContact[]
  contactStats: {
    total: number
    hot: number
    warm: number
    cool: number
    avgTemperature: number
  }

  // Stories from Empathy Ledger
  stories: ProjectStory[]
  storiesCount: number

  // Communications
  communications: ProjectCommunication[]
  communicationsStats: {
    last7Days: number
    last30Days: number
    totalEmails: number
    totalMeetings: number
  }

  // Project updates
  updates: ProjectUpdate[]

  // Notion documentation
  notionPages: ProjectNotionPage[]

  // Enrichment data
  intelligence?: ProjectIntelligence
}
