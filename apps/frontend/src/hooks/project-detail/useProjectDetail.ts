/**
 * useProjectDetail - Hook for fetching comprehensive project data
 *
 * Fetches project data from multiple sources:
 * - Base data from ALL_PROJECTS (local)
 * - Contacts from Supabase (via Command Center API)
 * - Stories from Empathy Ledger v2 API
 * - Communications from Supabase
 * - Project intelligence from Command Center API
 *
 * USAGE:
 *   const { data, loading, error } = useProjectDetail('ACT-JH')
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl, resolveEmpathyLedgerUrl } from '../../config/env'
import {
  ALL_PROJECTS,
  type ACTFullProject,
  getProjectByCode,
} from '../../data/allProjects'
import type { Relationship } from '../command-center/types'
import type { ProjectDetailData, ProjectContact, ProjectStory, ProjectCommunication, ProjectUpdate } from './types'

interface UseProjectDetailReturn {
  data: ProjectDetailData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch comprehensive project detail
 */
export function useProjectDetail(
  projectCode: string | null,
  projectFromApi?: ACTFullProject | null
): UseProjectDetailReturn {
  const [data, setData] = useState<ProjectDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjectDetail = useCallback(async () => {
    if (!projectCode) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Use API-loaded project if provided, otherwise fallback to local lookup
      let baseProject = projectFromApi
      if (!baseProject) {
        baseProject = getProjectByCode(projectCode)
      }

      if (!baseProject) {
        setError(`Project not found: ${projectCode}`)
        setLoading(false)
        return
      }

      // Fetch data from multiple sources in parallel
      const [contactsResult, storiesResult, communicationsResult, updatesResult] =
        await Promise.allSettled([
          fetchProjectContacts(projectCode, baseProject),
          fetchProjectStories(baseProject.name),
          fetchProjectCommunications(projectCode, !!projectFromApi),
          fetchProjectUpdates(projectCode),
        ])

      // Process contacts
      let contacts: ProjectContact[] = []
      let contactStats = { total: 0, hot: 0, warm: 0, cool: 0, avgTemperature: 0 }

      if (contactsResult.status === 'fulfilled') {
        contacts = contactsResult.value.contacts
        contactStats = contactsResult.value.stats
      }

      // Process stories
      let stories: ProjectStory[] = []
      let storiesCount = 0

      if (storiesResult.status === 'fulfilled') {
        stories = storiesResult.value.stories
        storiesCount = storiesResult.value.count
      }

      // Process communications
      let communications: ProjectCommunication[] = []
      let communicationsStats = {
        last7Days: 0,
        last30Days: 0,
        totalEmails: 0,
        totalMeetings: 0,
      }

      if (communicationsResult.status === 'fulfilled') {
        communications = communicationsResult.value.communications
        communicationsStats = communicationsResult.value.stats
      }

      // Process updates
      let updates: ProjectUpdate[] = []
      if (updatesResult.status === 'fulfilled') {
        updates = updatesResult.value
      }

      // Build Notion pages
      const notionPages = (baseProject.notionPages || []).map((page, idx) => ({
        id: `notion-${idx}`,
        title: page,
        url: `https://notion.so/${page.replace(/\s+/g, '-')}`,
      }))

      // Assemble complete data
      const detailData: ProjectDetailData = {
        project: {
          ...baseProject,
          opportunities: baseProject.opportunities || [],
        },
        contacts,
        contactStats,
        stories,
        storiesCount,
        communications,
        communicationsStats,
        updates,
        notionPages,
      }

      setData(detailData)
    } catch (err) {
      console.error('Error fetching project detail:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project details')
    } finally {
      setLoading(false)
    }
  }, [projectCode, projectFromApi])

  useEffect(() => {
    fetchProjectDetail()
  }, [fetchProjectDetail])

  return { data, loading, error, refetch: fetchProjectDetail }
}

// ============================================
// Data Fetching Helpers
// ============================================

async function fetchProjectContacts(
  projectCode: string,
  project: ACTFullProject
): Promise<{
  contacts: ProjectContact[]
  stats: { total: number; hot: number; warm: number; cool: number; avgTemperature: number }
}> {
  try {
    const searchTags = [
      ...project.ghlTags,
      project.name.toLowerCase(),
      projectCode.toLowerCase(),
    ]

    const url = resolveCommandCenterUrl('/api/relationships/list?limit=500')
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Failed to fetch contacts: ${res.status}`)
    }

    const data = await res.json()
    const allContacts = (data.relationships || data.contacts || []) as Relationship[]

    const projectContacts = allContacts.filter((contact) => {
      const contactTags = (contact.tags || []).map((t: string) => t.toLowerCase())
      const contactName = contact.contact_name?.toLowerCase() || ''

      return searchTags.some(
        (searchTag) =>
          contactTags.some((t: string) => t.includes(searchTag) || searchTag.includes(t)) ||
          contactName.includes(searchTag)
      )
    })

    const hot = projectContacts.filter((c) => c.temperature >= 70).length
    const warm = projectContacts.filter((c) => c.temperature >= 40 && c.temperature < 70).length
    const cool = projectContacts.filter((c) => c.temperature < 40).length
    const avgTemperature =
      projectContacts.length > 0
        ? Math.round(projectContacts.reduce((sum, c) => sum + c.temperature, 0) / projectContacts.length)
        : 0

    return {
      contacts: projectContacts.map((c) => ({
        id: c.id,
        ghl_contact_id: c.ghl_contact_id,
        contact_name: c.contact_name,
        contact_email: c.contact_email,
        temperature: c.temperature,
        temperature_trend: c.temperature_trend,
        lcaa_stage: c.lcaa_stage,
        total_touchpoints: c.total_touchpoints,
        days_since_contact: c.days_since_contact,
        last_contact_at: c.last_contact_at,
        tags: c.tags,
      })),
      stats: { total: projectContacts.length, hot, warm, cool, avgTemperature },
    }
  } catch (err) {
    console.error('Error fetching project contacts:', err)
    return {
      contacts: [],
      stats: { total: 0, hot: 0, warm: 0, cool: 0, avgTemperature: 0 },
    }
  }
}

async function fetchProjectStories(
  projectName: string
): Promise<{ stories: ProjectStory[]; count: number }> {
  try {
    const res = await fetch(
      resolveEmpathyLedgerUrl(`/api/stories?limit=50&search=${encodeURIComponent(projectName)}`)
    )

    if (!res.ok) {
      throw new Error(`Failed to fetch stories: ${res.status}`)
    }

    const data = await res.json()

    if (data.success && data.content) {
      const stories: ProjectStory[] = data.content.map((s: any) => ({
        id: s.id,
        title: s.title || 'Untitled Story',
        content: s.content,
        excerpt: s.content?.substring(0, 200) + '...',
        storyteller_name: s.author?.display_name || s.author?.full_name || 'Anonymous',
        lcaa_stage: s.lcaa_stage || 'Listen',
        status: s.status || 'draft',
        created_at: s.created_at,
        media_count: s.media_count || 0,
      }))

      return { stories, count: data.stats?.total || stories.length }
    }

    return { stories: [], count: 0 }
  } catch (err) {
    console.error('Error fetching project stories:', err)
    return { stories: [], count: 0 }
  }
}

async function fetchProjectCommunications(
  projectCode: string,
  isApiProject: boolean = false
): Promise<{
  communications: ProjectCommunication[]
  stats: { last7Days: number; last30Days: number; totalEmails: number; totalMeetings: number }
}> {
  try {
    const endpoint = isApiProject && projectCode.length <= 10
      ? `/api/projects/by-id/${encodeURIComponent(projectCode)}/communications`
      : `/api/projects/${encodeURIComponent(projectCode)}/communications`

    const res = await fetch(resolveCommandCenterUrl(endpoint))

    if (!res.ok) {
      return {
        communications: [],
        stats: { last7Days: 0, last30Days: 0, totalEmails: 0, totalMeetings: 0 },
      }
    }

    const data = await res.json()

    if (data.success && data.communications) {
      const communications: ProjectCommunication[] = data.communications.map((c: any) => ({
        id: c.id,
        type: c.type || 'email',
        subject: c.subject || c.title || 'No subject',
        summary: c.summary || c.snippet,
        date: c.date || c.sent_date || c.created_at,
        participants: c.participants || [],
        importance: c.importance,
      }))

      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const last7Days = communications.filter((c) => new Date(c.date) >= sevenDaysAgo).length
      const last30Days = communications.filter((c) => new Date(c.date) >= thirtyDaysAgo).length
      const totalEmails = communications.filter((c) => c.type === 'email').length
      const totalMeetings = communications.filter((c) => c.type === 'meeting').length

      return { communications, stats: { last7Days, last30Days, totalEmails, totalMeetings } }
    }

    return {
      communications: [],
      stats: { last7Days: 0, last30Days: 0, totalEmails: 0, totalMeetings: 0 },
    }
  } catch (err) {
    console.error('Error fetching project communications:', err)
    return {
      communications: [],
      stats: { last7Days: 0, last30Days: 0, totalEmails: 0, totalMeetings: 0 },
    }
  }
}

async function fetchProjectUpdates(projectCode: string): Promise<ProjectUpdate[]> {
  try {
    const res = await fetch(
      resolveCommandCenterUrl(`/api/projects/${encodeURIComponent(projectCode)}/updates`)
    )

    if (!res.ok) {
      return []
    }

    const data = await res.json()

    if (data.success && data.updates) {
      return data.updates.map((u: any) => ({
        id: u.id,
        title: u.title || 'Update',
        content: u.content || u.description || '',
        update_type: u.update_type || 'note',
        created_at: u.created_at,
        created_by: u.created_by,
      }))
    }

    return []
  } catch (err) {
    console.error('Error fetching project updates:', err)
    return []
  }
}

// Re-export helper
export { getProjectByCode }
