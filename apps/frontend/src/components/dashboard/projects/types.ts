/**
 * Projects Module Types
 * Unified project types for project-related components
 */

// Core project types
export interface Project {
  id: string
  name: string
  code?: string
  description?: string
  category?: ProjectCategory
  priority?: 'high' | 'medium' | 'low'
  status?: 'active' | 'planning' | 'paused' | 'completed'
  lcaaPhase?: LCAAPhase
  handoverReadiness?: HandoverReadiness
  leads?: Array<{ name: string; role?: string }>
  lcaaThemes?: string[]
  almaProgram?: string
  culturalProtocols?: boolean
  icon?: string
  color?: string
  ghlTags?: string[]
  notionPages?: string[]
  healthScore?: number
  contacts?: number
  opportunities?: Opportunity[]
  frontends?: Frontend[]
  xeroTracking?: string
  dextCategory?: string
  githubUrl?: string
}

export type ProjectCategory =
  | 'community'
  | 'technology'
  | 'story'
  | 'business'
  | 'cultural'
  | 'infrastructure'

export type LCAAPhase = 'listen' | 'curiosity' | 'action' | 'art'

// Handover readiness metrics
export interface HandoverReadiness {
  documentation: number
  training: number
  ownership: number
  exitStrategy: number
}

// Opportunity types
export interface Opportunity {
  title: string
  description?: string
  type: 'funding' | 'partnership' | 'content' | 'technology' | 'storytelling'
  priority: 'high' | 'medium' | 'low'
  action?: string
}

// Frontend/project site
export interface Frontend {
  id: string
  name: string
  url: string
}

// Project stats
export interface ProjectStats {
  total: number
  highPriority: number
  cultural: number
  totalContacts: number
  avgHealthScore: number
  byCategory: Array<{
    category: ProjectCategory
    label: string
    icon: string
    count: number
  }>
}

// Project with relationship stats
export interface ProjectWithRelationships extends Project {
  relationshipStats?: ProjectRelationshipStats
}

// Relationship intelligence for a project
export interface ProjectRelationshipStats {
  contactCount: number
  hotCount: number
  warmCount: number
  coolCount: number
  avgTemperature: number
  daysSinceLastContact: number | null
  topContacts: Relationship[]
}

// Contact/relationship
export interface Relationship {
  id: string
  contact_name: string
  contact_email?: string
  temperature: number
  days_since_contact?: number | null
  tags?: string[]
  suggested_actions?: string
}

// LCAA phase colors
export const LCAA_PHASE_COLORS: Record<LCAAPhase, { color: string; bg: string; border: string }> = {
  listen: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  curiosity: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  action: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  art: { color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
}

// Category metadata
export const CATEGORY_META: Record<ProjectCategory, { label: string; icon: string; color: string }> = {
  community: { label: 'Community', icon: '👥', color: '#22c55e' },
  technology: { label: 'Technology', icon: '💻', color: '#3b82f6' },
  story: { label: 'Story', icon: '📖', color: '#f59e0b' },
  business: { label: 'Business', icon: '💼', color: '#8b5cf6' },
  cultural: { label: 'Cultural', icon: '🌏', color: '#ec4899' },
  infrastructure: { label: 'Infrastructure', icon: '🏗️', color: '#64748b' },
}

// LCAA framework descriptions
export const LCAA_FRAMEWORK: Record<LCAAPhase, string> = {
  listen: 'Listening and relationship building. Understanding community needs and aspirations.',
  curiosity: 'Exploring possibilities. Researching and prototyping solutions.',
  action: 'Implementing and iterating. Building capacity and demonstrating value.',
  art: 'Creating and sharing. Documenting stories and preparing for handover.',
}
