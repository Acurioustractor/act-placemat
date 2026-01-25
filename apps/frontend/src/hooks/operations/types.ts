/**
 * Operations Module Types
 *
 * Type definitions for operations dashboard hooks (projects, stories, contacts, calendar, emails)
 */

// ============================================
// Project Types
// ============================================

export interface Project {
  id: string
  name: string
  description?: string
  status?: string
  lcaaPhase?: 'listen' | 'curiosity' | 'action' | 'art'
  handoverReadiness?: {
    documentation: number
    training: number
    ownership: number
    exitStrategy: number
  }
  coverImage?: string
  githubUrl?: string
  code?: string
  healthScore?: number
  contacts?: number
  opportunities?: Array<{
    type: string
    priority: string
    title: string
    description?: string
    action?: string
  }>
  focus?: string
  frontends?: Array<{
    id: string
    name: string
    url?: string
  }>
  category?: string
  priority?: 'high' | 'medium' | 'low'
  leads?: Array<{
    name: string
    role?: string
  }>
  lcaaThemes?: string[]
  almaProgram?: string
  culturalProtocols?: boolean
  parentProject?: string
  subProjects?: string[]
  notionPages?: string[]
  ghlTags?: string[]
  xeroTracking?: string
  dextCategory?: string
  icon?: string
  color?: string
  budget?: number | null
  progress?: number | null
  tags?: string[]
}

export interface ProjectStats {
  total: number
  highPriority: number
  cultural: number
  totalContacts: number
  avgHealthScore: number
  byCategory: Array<{
    category: string
    count: number
    icon: string
    label: string
  }>
}

// ============================================
// Story Types
// ============================================

export interface Story {
  id: string
  title: string
  content?: string
  excerpt?: string
  project?: string
  privacy_level: 'public' | 'internal' | 'private'
  consent?: 'internal' | 'external-lite' | 'external'
  authority?: 'elder' | 'community' | 'individual'
  created_at: string
  storyteller_name?: string
  media_count?: number
}

export interface Storyteller {
  id: string
  full_name: string
  bio?: string
  profile_image_url?: string
  media_type?: string
  generated_themes?: string[]
  created_at: string
}

export interface StoryStats {
  stories: number
  storytellers: number
}

// ============================================
// Contact Types
// ============================================

export interface Contact {
  id: string
  full_name: string
  email_address?: string
  current_company?: string
  current_position?: string
  type?: 'elder' | 'storyteller' | 'partner' | 'community'
  project?: string
  last_contact?: string
  stories_count?: number
  data_source?: string
}

export interface ContactStats {
  total: number
}

export interface UnifiedContact {
  person_id: string
  full_name: string
  email: string
  current_company?: string
  current_position?: string
  data_source: 'gmail' | 'linkedin' | 'notion'
  engagement_priority?: 'critical' | 'high' | 'medium' | 'low'
  sector?: string
  exa_enriched: boolean
  created_at: string
  updated_at: string
}

export interface UnifiedContactStats {
  total: number
  bySource: Record<string, number>
  byEngagementPriority: Record<string, number>
  enriched: number
}

// ============================================
// Calendar Types
// ============================================

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_time: string
  end_time?: string
  location?: string
  type?: 'event' | 'deadline' | 'milestone' | 'gathering'
  project?: string
  attendees?: string[]
  calendar?: {
    id: string
    name: string
    color?: string
  }
  google_event_id?: string
  project_code?: string
  detected_project_code?: string
  manual_project_code?: string
  event_type?: string
  is_all_day?: boolean
  organizer_email?: string
  attendee_contact_matches?: string
  html_link?: string
}

export interface CalendarInfo {
  id: string
  name: string
  color?: string
}

export interface CalendarStats {
  total: number
  upcoming: number
  today: number
  periodEvents: number
  periodHours: number
  byType: Record<string, number>
  byProject: Record<string, number>
}

// ============================================
// Email Types
// ============================================

export interface Email {
  id: string
  subject: string
  from: string
  to?: string
  snippet?: string
  sent_date: string
  is_read: boolean
  is_starred?: boolean
  labels?: string[]
  thread_id?: string
  account?: string
}

export interface EmailAccount {
  email: string
  received: number
  sent: number
  unread: number
}

export interface EmailStats {
  accounts: EmailAccount[]
  totals: {
    received: number
    sent: number
    unread: number
  }
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  projects: number
  stories: number
  contacts: number
  events: number
  emails: number
}
