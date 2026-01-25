/**
 * useProjects - Projects state management hook
 *
 * Features:
 * - Project data fetching
 * - Category filtering
 * - Relationship stats computation
 * - Project selection management
 */

import { useState, useMemo, useEffect } from 'react'
import type {
  Project,
  ProjectCategory,
  ProjectWithRelationships,
  ProjectStats,
  ProjectRelationshipStats,
  Relationship,
} from '../types'

interface UseProjectsOptions {
  initialCategory?: ProjectCategory | 'all'
}

interface UseProjectsReturn {
  projects: ProjectWithRelationships[]
  loading: boolean
  error: string | null
  stats: ProjectStats | null
  categoryFilter: ProjectCategory | 'all'
  selectedProject: ProjectWithRelationships | null
  setCategoryFilter: (filter: ProjectCategory | 'all') => void
  setSelectedProject: (project: ProjectWithRelationships | null) => void
  getProjectById: (id: string) => ProjectWithRelationships | undefined
  getRelationshipStats: (projectId: string) => ProjectRelationshipStats | undefined
  refetch: () => Promise<void>
}

// Mock data for development
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'JusticeHub',
    code: 'JH',
    description: 'Indigenous justice technology platform',
    category: 'technology',
    priority: 'high',
    status: 'active',
    lcaaPhase: 'action',
    handoverReadiness: { documentation: 60, training: 40, ownership: 30, exitStrategy: 20 },
    leads: [{ name: 'Nic Kuper', role: 'Technical Lead' }],
    lcaaThemes: ['digital sovereignty', 'community ownership'],
    culturalProtocols: true,
    icon: '⚖️',
    healthScore: 72,
    contacts: 15,
    opportunities: [
      { title: 'Legal Aid Funding', type: 'funding', priority: 'high', action: 'Apply for government grant' }
    ],
  },
  {
    id: '2',
    name: 'The Harvest CSA',
    code: 'TH',
    description: 'Community Supported Agriculture initiative',
    category: 'community',
    priority: 'medium',
    status: 'active',
    lcaaPhase: 'art',
    handoverReadiness: { documentation: 85, training: 80, ownership: 90, exitStrategy: 85 },
    leads: [{ name: 'Local Coordinator', role: 'Community Lead' }],
    culturalProtocols: false,
    icon: '🌱',
    healthScore: 95,
    contacts: 45,
  },
  {
    id: '3',
    name: 'Goods Marketplace',
    code: 'GM',
    description: 'First Nations marketplace platform',
    category: 'business',
    priority: 'high',
    status: 'active',
    lcaaPhase: 'action',
    handoverReadiness: { documentation: 70, training: 60, ownership: 50, exitStrategy: 40 },
    leads: [{ name: 'Market Lead' }],
    culturalProtocols: true,
    icon: '🛒',
    healthScore: 68,
    contacts: 28,
  },
]

const MOCK_RELATIONSHIPS: Relationship[] = [
  { id: 'r1', contact_name: 'Elder Johnson', temperature: 85, days_since_contact: 3, tags: ['justicehub'] },
  { id: 'r2', contact_name: 'Farmer Sarah', temperature: 72, days_since_contact: 7, tags: ['harvest'] },
  { id: 'r3', contact_name: 'Artisan Mike', temperature: 45, days_since_contact: 14, tags: ['goods'] },
  { id: 'r4', contact_name: 'Community Leader', temperature: 91, days_since_contact: 1, tags: ['justicehub', 'goods'] },
  { id: 'r5', contact_name: 'New Vendor', temperature: 35, days_since_contact: 21, tags: ['goods'] },
]

export function useProjects({ initialCategory = 'all' }: UseProjectsOptions = {}): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | 'all'>(initialCategory)
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelationships | null>(null)

  // Fetch projects
  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      // In production, this would be an API call
      // const response = await fetch('/api/v1/projects')
      // const data = await response.json()

      // Mock data for development
      await new Promise(resolve => setTimeout(resolve, 500))
      setProjects(MOCK_PROJECTS)
      setRelationships(MOCK_RELATIONSHIPS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Filter projects by category
  const filteredProjects = useMemo(() => {
    if (categoryFilter === 'all') return projects
    return projects.filter(p => p.category === categoryFilter)
  }, [projects, categoryFilter])

  // Compute project relationship stats
  const projectRelationships = useMemo(() => {
    const stats = new Map<string, ProjectRelationshipStats>()

    filteredProjects.forEach(project => {
      const projectName = project.name.toLowerCase()

      const projectContacts = relationships.filter(r => {
        if (r.tags?.some(t => t.toLowerCase().includes(projectName))) return true
        if (r.tags?.some(t =>
          projectName.includes(t.toLowerCase()) ||
          t.toLowerCase().includes(projectName.split(' ')[0])
        )) return true
        return false
      })

      const hotCount = projectContacts.filter(c => c.temperature >= 70).length
      const warmCount = projectContacts.filter(c => c.temperature >= 40 && c.temperature < 70).length
      const coolCount = projectContacts.filter(c => c.temperature < 40).length
      const avgTemp = projectContacts.length > 0
        ? projectContacts.reduce((sum, c) => sum + c.temperature, 0) / projectContacts.length
        : 0

      const lastContactDays = projectContacts.length > 0
        ? Math.min(...projectContacts.map(c => c.days_since_contact ?? 999))
        : null

      const topContacts = [...projectContacts]
        .sort((a, b) => b.temperature - a.temperature)
        .slice(0, 3)

      stats.set(project.id, {
        contactCount: projectContacts.length,
        hotCount,
        warmCount,
        coolCount,
        avgTemperature: Math.round(avgTemp),
        daysSinceLastContact: lastContactDays === 999 ? null : lastContactDays,
        topContacts,
      })
    })

    return stats
  }, [filteredProjects, relationships])

  // Projects with relationship stats
  const projectsWithRelationships: ProjectWithRelationships[] = useMemo(() => {
    return filteredProjects.map(project => ({
      ...project,
      relationshipStats: projectRelationships.get(project.id),
    }))
  }, [filteredProjects, projectRelationships])

  // Compute stats
  const stats: ProjectStats | null = useMemo(() => {
    if (projects.length === 0) return null

    const byCategory = Object.keys(CATEGORY_META).map(category => {
      const cat = category as ProjectCategory
      const count = projects.filter(p => p.category === cat).length
      return {
        category: cat,
        label: CATEGORY_META[cat].label,
        icon: CATEGORY_META[cat].icon,
        count,
      }
    }).filter(c => c.count > 0)

    return {
      total: projects.length,
      highPriority: projects.filter(p => p.priority === 'high').length,
      cultural: projects.filter(p => p.culturalProtocols).length,
      totalContacts: relationships.length,
      avgHealthScore: Math.round(
        projects.reduce((sum, p) => sum + (p.healthScore || 0), 0) / projects.length
      ),
      byCategory,
    }
  }, [projects, relationships])

  // Helper to get project by ID
  const getProjectById = (id: string) => {
    return projectsWithRelationships.find(p => p.id === id)
  }

  // Helper to get relationship stats
  const getRelationshipStats = (projectId: string) => {
    return projectRelationships.get(projectId)
  }

  return {
    projects: projectsWithRelationships,
    loading,
    error,
    stats,
    categoryFilter,
    selectedProject,
    setCategoryFilter,
    setSelectedProject,
    getProjectById,
    getRelationshipStats,
    refetch: fetchProjects,
  }
}

// Import CATEGORY_META for use in stats computation
import { CATEGORY_META } from '../types'
