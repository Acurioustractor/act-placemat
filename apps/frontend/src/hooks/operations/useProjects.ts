/**
 * useProjects - Data fetching hook for projects
 *
 * Fetches projects from Notion/Supabase with enrichment from static data.
 *
 * USAGE:
 *   const { projects, stats, loading, error } = useProjects()
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../services/api'
import { ALL_PROJECTS, type ACTFullProject, type ProjectCategory, CATEGORY_META } from '../../data/allProjects'
import type { Project, ProjectStats } from './types'

interface UseProjectsReturn {
  projects: Project[]
  stats: ProjectStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  lastSynced: string | null
}

/**
 * Fetch projects with live Notion data
 */
export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)

      console.log('Fetching live projects from Command Center...')
      const notionResult = await api.getNotionProjects({ limit: 100 }).catch((e) => {
        console.error('Failed to fetch live projects:', e)
        return null
      })

      console.log(
        'Result:',
        notionResult?.success
          ? `${notionResult.projects?.length} projects`
          : 'FAILED - using fallback'
      )

      // Create enrichment lookup from static ALL_PROJECTS
      const staticMap = new Map<string, ACTFullProject>()
      ALL_PROJECTS.forEach((p) => {
        staticMap.set(p.name.toLowerCase(), p)
        staticMap.set(p.code.toLowerCase(), p)
      })

      let mappedProjects: Project[]

      if (notionResult?.success && notionResult.projects?.length > 0) {
        setLastSynced(notionResult.last_synced)

        mappedProjects = notionResult.projects.map((np) => {
          const staticProject =
            staticMap.get(np.name.toLowerCase()) ||
            Array.from(staticMap.values()).find(
              (sp) =>
                np.name.toLowerCase().includes(sp.name.toLowerCase()) ||
                sp.name.toLowerCase().includes(np.name.toLowerCase())
            )

          const notionStatus = np.data?.status || np.status || np.metadata?.status
          const mappedStatus =
            typeof notionStatus === 'string'
              ? notionStatus
              : (notionStatus as any)?.name || 'Active'

          return {
            id: np.notion_id || np.id,
            name: np.name,
            code: staticProject?.code || generateCodeFromName(np.name),
            description: (np.data as any)?.description || staticProject?.description,
            status: mappedStatus,
            lcaaPhase: staticProject?.lcaaPhase || inferLCAAPhase(mappedStatus),
            lcaaThemes: staticProject?.lcaaThemes,
            handoverReadiness: staticProject?.handoverReadiness,
            healthScore: staticProject?.healthScore || calculateHealthFromStatus(mappedStatus),
            contacts: staticProject?.contacts,
            opportunities: staticProject?.opportunities,
            leads: staticProject?.leads,
            category: staticProject?.category || inferCategoryFromType(np.type),
            priority: staticProject?.priority || 'medium',
            icon: staticProject?.icon,
            color: staticProject?.color,
            almaProgram: staticProject?.almaProgram,
            culturalProtocols: staticProject?.culturalProtocols,
            parentProject: staticProject?.parentProject,
            subProjects: staticProject?.subProjects,
            frontends: staticProject?.frontends,
            notionPages: staticProject?.notionPages || [np.name],
            ghlTags: staticProject?.ghlTags,
            xeroTracking: staticProject?.xeroTracking,
            dextCategory: staticProject?.dextCategory,
            budget: np.budget,
            progress: np.progress,
            tags: np.tags,
            coverImage: (np.data as any)?.cover_url || null,
            githubUrl: (np.data as any)?.github_url || null,
          }
        })
      } else {
        // Fallback to static data
        mappedProjects = ALL_PROJECTS.map((project) => ({
          id: project.code,
          name: project.name,
          code: project.code,
          description: project.description,
          status: project.status,
          lcaaPhase: project.lcaaPhase,
          lcaaThemes: project.lcaaThemes,
          handoverReadiness: project.handoverReadiness,
          healthScore: project.healthScore,
          contacts: project.contacts,
          opportunities: project.opportunities,
          leads: project.leads,
          category: project.category,
          priority: project.priority,
          icon: project.icon,
          color: project.color,
          almaProgram: project.almaProgram,
          culturalProtocols: project.culturalProtocols,
          parentProject: project.parentProject,
          subProjects: project.subProjects,
          frontends: project.frontends,
          notionPages: project.notionPages,
          ghlTags: project.ghlTags,
          xeroTracking: project.xeroTracking,
          dextCategory: project.dextCategory,
        }))
      }

      setProjects(mappedProjects)
      setError(null)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Calculate stats from projects
  const stats = useMemo((): ProjectStats => {
    const total = projects.length
    const highPriority = projects.filter((p) => p.priority === 'high').length
    const cultural = projects.filter((p) => p.culturalProtocols).length
    const totalContacts = projects.reduce((sum, p) => sum + (p.contacts || 0), 0)
    const avgHealthScore =
      total > 0
        ? Math.round(
            projects.reduce((sum, p) => sum + (p.healthScore || 70), 0) / total
          )
        : 0

    // Count by category
    const categoryCount = new Map<ProjectCategory, number>()
    projects.forEach((p) => {
      const cat = (p.category as ProjectCategory) || 'community'
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1)
    })

    const byCategory = Array.from(categoryCount.entries())
      .map(([category, count]) => ({
        category,
        count,
        icon: CATEGORY_META[category]?.icon || '📁',
        label: CATEGORY_META[category]?.label || category,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      total,
      highPriority,
      cultural,
      totalContacts,
      avgHealthScore,
      byCategory,
    }
  }, [projects])

  return { projects, stats, loading, error, refetch: fetchProjects, lastSynced }
}

// Helper functions
function generateCodeFromName(name: string): string {
  const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) return 'ACT-UNK'
  if (words.length === 1) return `ACT-${words[0].substring(0, 3).toUpperCase()}`
  const initials = words.slice(0, 3).map((w) => w[0].toUpperCase()).join('')
  return `ACT-${initials}`
}

function calculateHealthFromStatus(status: string): number {
  const s = status.toLowerCase()
  if (s.includes('active') || s.includes('🔥')) return 85
  if (s.includes('planning') || s.includes('ideation') || s.includes('🌀')) return 70
  if (s.includes('paused') || s.includes('hold')) return 50
  if (s.includes('sunset') || s.includes('🌅')) return 40
  if (s.includes('complete') || s.includes('✅')) return 95
  return 75
}

function inferCategoryFromType(type: string | null): ProjectCategory {
  if (!type) return 'community'
  const t = type.toLowerCase()
  if (t.includes('justice') || t.includes('legal')) return 'justice'
  if (t.includes('indigenous') || t.includes('first nation')) return 'indigenous'
  if (t.includes('story') || t.includes('empathy')) return 'stories'
  if (t.includes('enterprise') || t.includes('business') || t.includes('client'))
    return 'enterprise'
  if (t.includes('regen') || t.includes('farm') || t.includes('land')) return 'regenerative'
  if (t.includes('health') || t.includes('wellbeing')) return 'health'
  if (t.includes('art') || t.includes('creative')) return 'arts'
  if (t.includes('event') || t.includes('gathering')) return 'events'
  if (t.includes('fund') || t.includes('grant')) return 'funding'
  if (t.includes('tech') || t.includes('digital') || t.includes('core')) return 'tech'
  return 'community'
}

function inferLCAAPhase(status?: string): 'listen' | 'curiosity' | 'action' | 'art' {
  const s = (status || '').toLowerCase()
  if (s.includes('research') || s.includes('discovery') || s.includes('planning'))
    return 'listen'
  if (s.includes('design') || s.includes('prototype') || s.includes('pilot'))
    return 'curiosity'
  if (s.includes('active') || s.includes('building') || s.includes('implement'))
    return 'action'
  if (s.includes('complete') || s.includes('handover') || s.includes('art')) return 'art'
  return 'action'
}
