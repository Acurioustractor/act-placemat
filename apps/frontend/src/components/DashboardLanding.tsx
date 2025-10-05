import { useCallback, useEffect, useMemo, useState } from 'react'
import { SectionHeader } from './ui/SectionHeader'
import { Card } from './ui/Card'
import { MetricTile } from './ui/MetricTile'
import { api } from '../services/api'

interface RevenueSummary {
  total_revenue: number
  community_share: number
  community_percentage: number
  net_available_for_communities: number
  operating_expenses: number
  arr_target?: number
  runway_target_months?: number
  runway_trend?: TrendPoint[]
  revenue_trend?: TrendPoint[]
}

interface IntegrationServiceStatus {
  id: string
  name: string
  healthy: boolean
  configured: boolean
  message?: string
}

interface IntegrationSummary {
  overall: string
  healthyCount: number
  totalServices: number
  services: IntegrationServiceStatus[]
}

interface CalendarEventSummary {
  id: string
  title?: string
  date?: string
  location?: string | null
  attendees?: string[]
  project?: { name?: string; id?: string } | null
}

interface GmailCommunityEmail {
  id?: string
  subject?: string
  from?: string
  summary?: string
  receivedAt?: string
  project?: string | null
  sentiment?: string | null
}

interface GmailStatusInfo {
  authenticated?: boolean
  connected?: boolean
  stats?: {
    communityEmails?: number
    totalCommunityEmails?: number
    totalProcessed?: number
    lastSync?: string
  }
  timestamp?: string
}

interface ContactDashboardData {
  total_contacts: number
  high_value_contacts: number
  active_contacts: number
  average_response_rate: number
  relationships_strengthening: number
  relationships_declining: number
  overdue_follow_ups: number
  total_interactions_this_month: number
  average_engagement_score: number
  top_companies: Array<{
    company_name: string
    contact_count: number
    avg_engagement_score: number
  }>
  target_active_projects?: number
  critical_contacts?: Array<{
    name?: string
    company?: string
    last_interaction?: string | null
    strategic_value?: string
    relationship_score?: number
  }>
}

interface OutreachTaskSummaryItem {
  id: string
  status: string
  scheduled_at?: string | null
}

interface IntelligenceDashboardPayload {
  insights?: Array<{
    id?: string
    type?: string
    title?: string
    description?: string
    priority?: string
    projectId?: string
  }>
  metrics?: Record<string, unknown>
  timestamp?: string
}

interface StorySummary {
  id: string
  title: string
  summary?: string
  community?: string
  createdAt?: string
  consentLevel?: string
  tags: string[]
}

type TrendPointPrimitive = number | string | null | undefined

interface TrendPointObject {
  value?: TrendPointPrimitive
  months?: TrendPointPrimitive
  metric?: TrendPointPrimitive
  amount?: TrendPointPrimitive
  total?: TrendPointPrimitive
}

type TrendPoint = number | string | TrendPointObject

interface DashboardProjectRecord {
  project_id?: string
  id?: string
  project_name?: string
  name?: string
  project_status?: string
  status?: string
  nextMilestoneDate?: string
  next_milestone_date?: string
  upcoming_milestone?: string
  milestone?: string
  focusArea?: string
  focus_area?: string
  metadata?: { focusArea?: string } | null
  area?: string
  projectLead?: { name?: string | null } | null
  lead?: string | null
  owner?: string | null
  funding_gap?: number | null
  budget_gap?: number | null
  fundingGap?: number | null
  funding?: string | null
  actualIncoming?: number | string | null
  potentialIncoming?: number | string | null
  revenueActual?: number | string | null
  revenuePotential?: number | string | null
  relationshipPillars?: string[] | null
  relationship_pillars?: string[] | null
  relatedOrganisations?: unknown[] | null
  relatedOpportunities?: unknown[] | null
  relatedFields?: unknown[] | null
  relatedPeople?: unknown[] | null
  themes?: string[] | null
  location?: string | null
  aiSummary?: string | null
}

interface StoryConsentSource {
  level?: string
  approvals?: Partial<Record<'data_usage' | 'community_sharing' | 'ai_analysis' | 'withdrawal_right', unknown>>
  framework?: string
  lastReviewedAt?: string | null
  scope?: unknown
}

interface StorySource {
  id?: string
  story_id?: string
  title?: string
  summary?: string
  content_summary?: string
  content?: string
  community?: string
  community_name?: string
  createdAt?: string
  created_at?: string
  created_date?: string
  consent?: StoryConsentSource | null
  consent_level?: string
  consent_scope?: unknown
  consent_details?: {
    data_usage_approved?: unknown
    sharing_approved?: unknown
    ai_analysis_approved?: unknown
    withdrawal_allowed?: unknown
    last_reviewed_at?: string | null
  }
  tags?: unknown
  themes?: unknown
  aiTags?: unknown
  ai_categories?: unknown
}

interface IntegrationServiceStatusSource {
  healthy?: boolean
  configured?: boolean
  message?: string
}

interface IntegrationSummarySource {
  overall?: string
  services?: Record<string, IntegrationServiceStatusSource | null | undefined>
  status?: Record<string, IntegrationServiceStatusSource | null | undefined>
}

type EnrichedProject = {
  raw: DashboardProjectRecord
  id: string | undefined
  name: string
  status: string
  milestoneDate: Date | null
  milestoneDays: number | null
  fundingGap: number | null
  owner: string
  focusArea: string | null
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return `$${value.toLocaleString('en-AU')}`
}

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return `${Math.round(value)}%`
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return value.toLocaleString('en-AU')
}

const formatDateShort = (value?: string | Date | null) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const coerceArray = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      }
    } catch {
      // ignore parse issues and fallback to CSV
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }
  return []
}

const normalizeStorySummary = (raw: unknown): StorySummary => {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as StorySource
  const consent = (typeof source.consent === 'object' && source.consent !== null ? source.consent : {}) as StoryConsentSource
  const level = consent.level || source.consent_level || 'community'

  return {
    id: source.id || source.story_id || Math.random().toString(36).slice(2),
    title: source.title || 'Untitled story',
    summary: source.summary || source.content_summary || source.content || '',
    community: source.community || source.community_name || 'Community',
    createdAt: source.createdAt || source.created_at || source.created_date,
    consentLevel: level,
    tags: coerceArray(source.tags || source.themes || source.aiTags || source.ai_categories),
  }
}

const parseIntegrationSummary = (raw: unknown): IntegrationSummary | null => {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as IntegrationSummarySource
  const servicesSource = source.services || source.status
  if (!servicesSource) return null

  const entries = Object.entries(servicesSource)
  if (entries.length === 0) return null

  const services: IntegrationServiceStatus[] = entries.map(([key, value]) => {
    const service = (value ?? {}) as IntegrationServiceStatusSource
    return {
      id: key,
      name: key.replace(/_/g, ' '),
      healthy: Boolean(service.healthy),
      configured: service.configured !== undefined ? Boolean(service.configured) : true,
      message: service.message
    }
  })

  const healthyCount = services.filter((service) => service.healthy && service.configured).length
  const totalServices = services.length
  const overall = source.overall || (healthyCount === totalServices ? 'healthy' : healthyCount > 0 ? 'degraded' : 'offline')

  return {
    overall,
    healthyCount,
    totalServices,
    services
  }
}

const parseMilestoneDate = (project: DashboardProjectRecord) => {
  const value =
    project.nextMilestoneDate ||
    project.next_milestone_date ||
    project.upcoming_milestone ||
    project.milestone ||
    null
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const isDashboardProjectRecord = (value: unknown): value is DashboardProjectRecord => {
  return typeof value === 'object' && value !== null
}

const normalizeProjectRecords = (value: unknown): DashboardProjectRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(isDashboardProjectRecord) as DashboardProjectRecord[]
  }
  if (typeof value === 'object' && value !== null) {
    const nested = (value as { projects?: unknown }).projects
    if (Array.isArray(nested)) {
      return nested.filter(isDashboardProjectRecord) as DashboardProjectRecord[]
    }
  }
  return []
}

const extractTrendValue = (point: TrendPoint, preferredFields: Array<keyof TrendPointObject>): number | null => {
  if (typeof point === 'number') return point
  if (typeof point === 'string') {
    const parsed = Number(point)
    return Number.isNaN(parsed) ? null : parsed
  }
  if (point && typeof point === 'object') {
    for (const field of preferredFields) {
      const candidate = point[field]
      if (typeof candidate === 'number') return candidate
      if (typeof candidate === 'string') {
        const parsed = Number(candidate)
        if (!Number.isNaN(parsed)) return parsed
      }
    }
  }
  return null
}

function Sparkline({ points, color = '#0F766E' }: { points: number[]; color?: string }) {
  if (!points || points.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-clay-200 text-xs text-clay-400">
        Connect source data for trend
      </div>
    )
  }

  const width = 120
  const height = 48
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((point - min) / range) * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function DashboardLanding() {
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null)
  const [integrationSummary, setIntegrationSummary] = useState<IntegrationSummary | null>(null)
  const [projects, setProjects] = useState<DashboardProjectRecord[]>([])
  const [projectError, setProjectError] = useState<string | null>(null)
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarEventSummary[]>([])
  const [gmailStatus, setGmailStatus] = useState<GmailStatusInfo | null>(null)
  const [communityEmails, setCommunityEmails] = useState<GmailCommunityEmail[]>([])
  const [contactDashboard, setContactDashboard] = useState<ContactDashboardData | null>(null)
  const [outreachTasks, setOutreachTasks] = useState<OutreachTaskSummaryItem[]>([])
  const [intelligenceOverview, setIntelligenceOverview] = useState<IntelligenceDashboardPayload | null>(null)
  const [storyHighlights, setStoryHighlights] = useState<StorySummary[]>([])

  const handleQuickAction = useCallback((tab: string, params: Record<string, string> = {}) => {
    if (typeof window === 'undefined') return
    const navigationEvent = new CustomEvent('dashboard:navigate', {
      detail: { tab, params },
      cancelable: true,
    })
    window.dispatchEvent(navigationEvent)
    if (!navigationEvent.defaultPrevented) {
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('tab', tab)
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.set(key, value)
      })
      window.location.href = `${window.location.pathname}?${searchParams.toString()}`
    }
  }, [])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const storyPromise: Promise<unknown> = fetch('/api/stories?limit=3')
          .then((response) => {
            if (!response.ok) throw new Error(`Story request failed: ${response.status}`)
            return response.json() as Promise<unknown>
          })
          .catch((error) => {
            console.warn('Story load failed', error)
            return null
          })

        const requests: Array<Promise<unknown>> = [
          api.getFinancialDashboard(),
          api.getIntegrationStatus(),
          api.getSimpleContactDashboard(),
          api.getDashboardProjects(24),
          api.getCalendarHighlights(6, 30),
          api.getGmailStatus(),
          api.getGmailCommunityEmails(6),
          api.getOutreachTasks({ limit: 200 }),
          api.getIntelligenceDashboard(),
          storyPromise,
        ]

        const results = (await Promise.allSettled(requests)) as PromiseSettledResult<unknown>[]
        const [
          revenueData,
          integrationData,
          contactData,
          projectData,
          calendarData,
          gmailStatusData,
          gmailEmailsData,
          outreachData,
          intelligenceData,
          storyData
        ] = results

        if (revenueData.status === 'fulfilled') {
          const value = revenueData.value
          if (value && typeof value === 'object') {
            const revenuePayload = value as (Partial<RevenueSummary> & { error?: unknown }) | RevenueSummary
            if (!(revenuePayload as { error?: unknown }).error) {
              setRevenueSummary(revenuePayload as RevenueSummary)
            }
          }
        }

        if (integrationData.status === 'fulfilled') {
          setIntegrationSummary(parseIntegrationSummary(integrationData.value))
        }

        if (contactData.status === 'fulfilled') {
          const raw = contactData.value
          if (raw && typeof raw === 'object') {
            const payloadObject = raw as { data?: unknown; success?: boolean }
            const payload = payloadObject.data ?? raw
            if (payloadObject.success !== false) {
              setContactDashboard(payload as ContactDashboardData)
            } else {
              setContactDashboard(null)
            }
          } else {
            setContactDashboard(null)
          }
        } else {
          setContactDashboard(null)
        }

        if (projectData.status === 'fulfilled') {
          const normalized = normalizeProjectRecords(projectData.value)
          setProjects(normalized)
          setProjectError(null)
        } else {
          setProjects([])
          const reason = projectData.status === 'rejected' ? projectData.reason : null
          setProjectError(reason instanceof Error ? reason.message : 'Failed to load projects')
        }

        if (calendarData.status === 'fulfilled') {
          const raw = calendarData.value
          if (raw && typeof raw === 'object') {
            const calendarPayload = raw as { events?: CalendarEventSummary[]; results?: CalendarEventSummary[] }
            const events = Array.isArray(calendarPayload.events)
              ? calendarPayload.events
              : Array.isArray(calendarPayload.results)
              ? calendarPayload.results
              : []
            setCalendarHighlights(events)
          }
        }

        if (gmailStatusData.status === 'fulfilled') {
          setGmailStatus((gmailStatusData.value as GmailStatusInfo) || null)
        }

        if (gmailEmailsData.status === 'fulfilled') {
          const raw = gmailEmailsData.value
          if (raw && typeof raw === 'object' && Array.isArray((raw as { emails?: GmailCommunityEmail[] }).emails)) {
            setCommunityEmails((raw as { emails?: GmailCommunityEmail[] }).emails ?? [])
          } else if (Array.isArray(raw)) {
            setCommunityEmails(raw as GmailCommunityEmail[])
          } else {
            setCommunityEmails([])
          }
        }

        if (outreachData.status === 'fulfilled') {
          const raw = outreachData.value
          if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: OutreachTaskSummaryItem[] }).data)) {
            setOutreachTasks((raw as { data?: OutreachTaskSummaryItem[] }).data ?? [])
          } else if (Array.isArray(raw)) {
            setOutreachTasks(raw as OutreachTaskSummaryItem[])
          } else {
            setOutreachTasks([])
          }
        }

        if (intelligenceData.status === 'fulfilled') {
          const payload = intelligenceData.value
          if (payload && typeof payload === 'object' && 'data' in payload) {
            const container = payload as { data?: unknown }
            setIntelligenceOverview((container.data as IntelligenceDashboardPayload) ?? (payload as IntelligenceDashboardPayload))
          } else {
            setIntelligenceOverview(payload as IntelligenceDashboardPayload)
          }
        }

        if (storyData.status === 'fulfilled' && storyData.value) {
          const raw = storyData.value
          let storiesSource: unknown = []
          if (raw && typeof raw === 'object') {
            const storyPayload = raw as { stories?: unknown; data?: unknown }
            storiesSource = Array.isArray(storyPayload.stories)
              ? storyPayload.stories
              : Array.isArray(storyPayload.data)
              ? storyPayload.data
              : raw
          } else {
            storiesSource = raw
          }
          const storiesArray = Array.isArray(storiesSource) ? storiesSource : []
          setStoryHighlights(storiesArray.slice(0, 3).map(normalizeStorySummary))
        }
      } catch (error) {
        console.error('Dashboard load error', error)
      }
    }

    loadDashboard()
  }, [])

  const gmailHealth = useMemo(() => {
    if (!gmailStatus) return null
    const authenticated = Boolean(gmailStatus.authenticated ?? gmailStatus.connected)
    const stats = gmailStatus.stats || {}
    return {
      authenticated,
      message: authenticated ? 'Connected to community inbox' : 'Connect Gmail to unlock insights',
      communityEmails: stats.communityEmails ?? stats.totalCommunityEmails ?? stats.totalProcessed,
      lastSync: stats.lastSync || gmailStatus.timestamp,
    }
  }, [gmailStatus])

  const enrichedProjects: EnrichedProject[] = useMemo(() => {
    return projects.map((project) => {
      const milestoneDate = parseMilestoneDate(project)
      const milestoneDays = milestoneDate ? Math.round((milestoneDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
      const focusArea =
        project.focusArea ||
        project.focus_area ||
        project.metadata?.focusArea ||
        project.area ||
        null
      const owner = project.projectLead?.name || project.lead || project.owner || 'Unassigned'
      const fundingGap =
        typeof project.funding_gap === 'number'
          ? project.funding_gap
          : typeof project.budget_gap === 'number'
          ? project.budget_gap
          : typeof project.fundingGap === 'number'
          ? project.fundingGap
          : null
      return {
        raw: project,
        id: project.project_id || project.id,
        name: project.project_name || project.name || 'Untitled project',
        status: project.project_status || project.status || 'Unknown',
        milestoneDate,
        milestoneDays,
        fundingGap,
        owner,
        focusArea
      }
    })
  }, [projects])

  const upcomingProjects = useMemo(() => {
    return enrichedProjects
      .filter((project) => project.milestoneDays !== null && project.milestoneDays >= 0)
      .sort((a, b) => (a.milestoneDays ?? Number.POSITIVE_INFINITY) - (b.milestoneDays ?? Number.POSITIVE_INFINITY))
      .slice(0, 6)
  }, [enrichedProjects])

  const projectDiagnostics = useMemo(() => {
    const groups = {
      active: [] as EnrichedProject[],
      seeking: [] as EnrichedProject[],
      atRisk: [] as EnrichedProject[],
    }

    let missingLeadCount = 0
    let overdueMilestoneCount = 0

    enrichedProjects.forEach((project) => {
      const status = (project.status || '').toLowerCase()
      const hasLead = project.owner && project.owner !== 'Unassigned'
      if (!hasLead) missingLeadCount += 1

      const isOverdue = project.milestoneDays !== null && project.milestoneDays < 0
      if (isOverdue) overdueMilestoneCount += 1

      const seekingSupport = status.includes('seeking') || status.includes('support') || status.includes('funding')
      const explicitRisk = status.includes('risk') || status.includes('blocked') || status.includes('paused')

      if (explicitRisk || isOverdue) {
        groups.atRisk.push(project)
        return
      }

      if (seekingSupport) {
        groups.seeking.push(project)
        return
      }

      groups.active.push(project)
    })

    return { groups, missingLeadCount, overdueMilestoneCount }
  }, [enrichedProjects])

  const openProjectIntelligence = (projectId?: string) => {
    if (!projectId) {
      handleQuickAction('intelligence')
      return
    }
    handleQuickAction('intelligence', { project: projectId })
  }

  const runwayBase = typeof revenueSummary?.net_available_for_communities === 'number' ? revenueSummary.net_available_for_communities : null
  const burnRate = typeof revenueSummary?.operating_expenses === 'number' ? revenueSummary.operating_expenses : null
  const runwayMonths = runwayBase !== null && burnRate && burnRate > 0 ? Number((runwayBase / burnRate).toFixed(1)) : null
  const arrValue = typeof revenueSummary?.total_revenue === 'number' ? revenueSummary.total_revenue : null
  const targetRunway = revenueSummary?.runway_target_months

  const activeProjectsCount = projectDiagnostics.groups.active.length
  const targetActiveProjects = contactDashboard?.target_active_projects ?? 12
  const hotSupporters = contactDashboard?.overdue_follow_ups ?? 0
  const nextMilestone = upcomingProjects[0] || null
  const nextMilestoneOwner = nextMilestone?.owner || nextMilestone?.raw?.projectLead?.name || nextMilestone?.raw?.lead || 'Unassigned'

  const executivePulse = useMemo(() => {
    return [
      {
        key: 'arr',
        label: 'ARR',
        value: arrValue !== null ? formatCurrency(arrValue) : 'Connect Xero',
        detail: burnRate ? `Burn ${formatCurrency(burnRate)}/mo` : 'Burn rate unavailable',
        target: revenueSummary?.arr_target ? `Target ${formatCurrency(revenueSummary.arr_target)}` : undefined,
      },
      {
        key: 'runway',
        label: 'Cash runway',
        value: runwayMonths !== null ? `${runwayMonths} months` : 'Add cash balance',
        detail: runwayBase !== null ? `Reserve ${formatCurrency(runwayBase)}` : 'Reserve unavailable',
        target: targetRunway ? `Goal ${targetRunway} months` : undefined,
      },
      {
        key: 'projects',
        label: 'Active projects',
        value: formatNumber(activeProjectsCount),
        detail: targetActiveProjects ? `Target ${formatNumber(targetActiveProjects)}` : 'Set monthly target',
        target: targetActiveProjects
          ? `${Math.round((activeProjectsCount / Math.max(1, targetActiveProjects)) * 100)}% of goal`
          : undefined,
      },
      {
        key: 'supporters',
        label: 'Hot supporters',
        value: hotSupporters > 0 ? `${hotSupporters} follow-ups` : 'All clear',
        detail: `${formatNumber(contactDashboard?.relationships_declining ?? 0)} relationships at risk`,
        target: hotSupporters > 0 ? 'Triage today' : undefined,
      },
      {
        key: 'milestone',
        label: 'Next milestone',
        value: nextMilestone
          ? `${nextMilestone.name}`
          : 'No milestone scheduled',
        detail: nextMilestone
          ? `${nextMilestoneOwner} • ${nextMilestone.milestoneDays ?? '–'} days`
          : 'Add next major date',
        target: nextMilestone?.focusArea ?? undefined,
      }
    ]
  }, [arrValue, burnRate, runwayMonths, runwayBase, revenueSummary?.arr_target, targetRunway, activeProjectsCount, targetActiveProjects, hotSupporters, contactDashboard?.relationships_declining, nextMilestone, nextMilestoneOwner])

  const outreachSummary = useMemo(() => {
    if (!Array.isArray(outreachTasks) || outreachTasks.length === 0) {
      return {
        total: 0,
        draft: 0,
        scheduled: 0,
        completed: 0,
        overdue: 0,
      }
    }

    const counts = outreachTasks.reduce(
      (acc, task) => {
        const status = (task.status || 'draft').toLowerCase()
        acc.total += 1
        if (status === 'draft') acc.draft += 1
        if (status === 'scheduled' || status === 'in_progress') acc.scheduled += 1
        if (status === 'completed') acc.completed += 1
        if (task.scheduled_at) {
          const due = new Date(task.scheduled_at).getTime()
          if (!Number.isNaN(due) && due < Date.now() && status !== 'completed') {
            acc.overdue += 1
          }
        }
        return acc
      },
      { total: 0, draft: 0, scheduled: 0, completed: 0, overdue: 0 }
    )

    return counts
  }, [outreachTasks])

  const revenuePipeline = useMemo(() => {
    return enrichedProjects.reduce(
      (acc, project) => {
        const actual = Number(project.raw?.actualIncoming ?? project.raw?.revenueActual ?? 0)
        const potential = Number(project.raw?.potentialIncoming ?? project.raw?.revenuePotential ?? 0)
        if (!Number.isNaN(actual)) acc.committed += actual
        if (!Number.isNaN(potential)) acc.pipeline += potential
        return acc
      },
      { committed: 0, pipeline: 0 }
    )
  }, [enrichedProjects])

  const revenueRunwaySeries = useMemo(() => {
    const trendPoints = revenueSummary?.runway_trend
    if (Array.isArray(trendPoints)) {
      const normalized = trendPoints
        .map((point) => extractTrendValue(point, ['value', 'months', 'metric']))
        .filter((value): value is number => value !== null)
      if (normalized.length >= 2) return normalized
    }

    if (runwayMonths !== null) {
      const base = Math.max(runwayMonths - 1, 0)
      return [base, runwayMonths, Math.max(runwayMonths + 0.5, 0.5)]
    }

    return []
  }, [revenueSummary, runwayMonths])

  const committedRevenueSeries = useMemo(() => {
    const trendPoints = revenueSummary?.revenue_trend
    if (Array.isArray(trendPoints)) {
      const values = trendPoints
        .map((point) => extractTrendValue(point, ['value', 'amount', 'total']))
        .filter((value): value is number => value !== null)
      if (values.length >= 2) return values
    }

    if (arrValue !== null) {
      const base = Math.max(arrValue * 0.8, 0)
      return [base, arrValue, arrValue * 1.1]
    }

    return []
  }, [revenueSummary, arrValue])

  const highRiskRelationships = useMemo(() => {
    const critical = Array.isArray(contactDashboard?.critical_contacts) ? contactDashboard?.critical_contacts : []
    if (critical && critical.length > 0) {
      return critical.slice(0, 4).map((contact) => ({
        name: contact.name || 'High-value supporter',
        company: contact.company,
        lastInteraction: contact.last_interaction,
        score: contact.relationship_score,
      }))
    }

    if (!contactDashboard?.top_companies) return []
    return contactDashboard.top_companies
      .filter((company) => company.avg_engagement_score < 0.4)
      .slice(0, 4)
      .map((company) => ({
        name: company.company_name,
        company: company.company_name,
        lastInteraction: null,
        score: company.avg_engagement_score,
      }))
  }, [contactDashboard])

  const topSupporterCompanies = useMemo(() => {
    if (!contactDashboard?.top_companies) return []
    return contactDashboard.top_companies
      .slice(0, 5)
      .map((company) => ({
        name: company.company_name,
        contacts: company.contact_count,
        engagement: company.avg_engagement_score,
      }))
  }, [contactDashboard])

  const partnerMomentum = useMemo(() => {
    const calendarItems = calendarHighlights.slice(0, 4).map((event) => ({
      id: `cal-${event.id}`,
      label: event.title || 'Untitled event',
      context: event.project?.name || event.location || 'Calendar touchpoint',
      date: event.date || null,
      type: 'calendar' as const,
    }))

    const emailItems = communityEmails.slice(0, 4).map((email) => ({
      id: `email-${email.id}`,
      label: email.subject || 'Community email',
      context: email.from || email.project || 'Community inbox',
      date: email.receivedAt || null,
      type: 'email' as const,
    }))

    return [...calendarItems, ...emailItems].slice(0, 4)
  }, [calendarHighlights, communityEmails])

  const quickActions = useMemo(() => {
    return [
      {
        id: 'intelligence',
        label: 'Open project intelligence',
        caption: 'Deep dive on supporter fit and risks',
        icon: '🧠',
        onClick: () => handleQuickAction('intelligence')
      },
      {
        id: 'outreach',
        label: 'Launch outreach queue',
        caption: `${outreachSummary.total} active tasks`,
        icon: '📬',
        onClick: () => handleQuickAction('outreach')
      },
      {
        id: 'financial',
        label: 'View financial snapshot',
        caption: 'Runway, burn, and community share',
        icon: '💰',
        onClick: () => handleQuickAction('revenue')
      },
      {
        id: 'network',
        label: 'Relationship board',
        caption: 'Strategic supporter coverage',
        icon: '🤝',
        onClick: () => handleQuickAction('network')
      }
    ]
  }, [handleQuickAction, outreachSummary.total])

  const operationsAlerts = useMemo(() => {
    const issues: Array<{ id: string; message: string }> = []
    if (integrationSummary) {
      integrationSummary.services.forEach((service) => {
        if (!service.healthy || !service.configured) {
          issues.push({
            id: service.id,
            message: service.message || `${service.name} requires attention`,
          })
        }
      })
    }

    if (hotSupporters > 0) {
      issues.push({ id: 'supporters', message: `${hotSupporters} supporters awaiting follow-up` })
    }

    if (projectDiagnostics.overdueMilestoneCount > 0) {
      issues.push({ id: 'milestones', message: `${projectDiagnostics.overdueMilestoneCount} milestones overdue` })
    }

    return issues
  }, [integrationSummary, hotSupporters, projectDiagnostics.overdueMilestoneCount])

  const latestInsight = intelligenceOverview?.insights?.[0]
  const secondaryInsight = intelligenceOverview?.insights?.[1]

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Executive Command"
        title="Morning control room"
        description="Decision-ready scan of revenue, relationships, and delivery so you know exactly where to lean in today."
      />

      <Card padding="lg" className="space-y-6 border-clay-200 bg-clay-900 text-white">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Executive pulse</p>
            <h2 className="text-2xl font-semibold">What needs your attention right now</h2>
          </div>
          <p className="text-sm text-white/70">
            Updated moments ago • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {executivePulse.map((metric) => (
            <div key={metric.key} className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold">{metric.value}</p>
              </div>
              <div className="mt-4 text-xs text-white/70">
                <p>{metric.detail}</p>
                {metric.target && <p className="mt-1 text-white/60">{metric.target}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card padding="lg" className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-clay-900">Relationship command</h3>
              <p className="text-sm text-clay-500">High-risk relationships, supporter momentum, and pipeline focus in one strip.</p>
            </div>
            <button
              onClick={() => handleQuickAction('intelligence')}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              <span>Open intelligence</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-clay-500">High-risk relationships</p>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  {formatNumber(contactDashboard?.relationships_declining ?? 0)} at risk
                </span>
              </div>
              <ul className="space-y-3 text-sm">
                {highRiskRelationships.length > 0 ? (
                  highRiskRelationships.map((contact, index) => (
                    <li key={`${contact.name}-${index}`} className="rounded-lg border border-clay-100 bg-clay-50 p-3">
                      <p className="font-medium text-clay-900">{contact.name}</p>
                      {contact.company && <p className="text-xs text-clay-500">{contact.company}</p>}
                      <div className="mt-2 flex items-center justify-between text-xs text-clay-500">
                        <span>{contact.lastInteraction ? `Last touch ${formatDateShort(contact.lastInteraction)}` : 'No recent touchpoint'}</span>
                        {typeof contact.score === 'number' && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                            Score {(contact.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-clay-100 bg-clay-50 p-3 text-xs text-clay-500">
                    All strategic relationships are actively engaged. Keep scanning for new risks.
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-clay-500">Top pipeline supporters</p>
              <ul className="space-y-3 text-sm">
                {topSupporterCompanies.length > 0 ? (
                  topSupporterCompanies.map((company) => (
                    <li key={company.name} className="rounded-lg border border-brand-100 bg-brand-50/60 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-brand-800">{company.name}</p>
                        <span className="text-xs text-brand-700">{formatNumber(company.contacts)} contacts</span>
                      </div>
                      <p className="mt-1 text-xs text-brand-700">Engagement {(company.engagement * 100).toFixed(0)}%</p>
                      <button
                        onClick={() => handleQuickAction('intelligence')}
                        className="mt-2 text-xs font-semibold text-brand-700 underline"
                      >
                        View relationship intelligence
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-xs text-brand-700">
                    Connect LinkedIn and CRM data to see priority supporters ready to move.
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-clay-500">Partner momentum</p>
              <ul className="space-y-3 text-sm">
                {partnerMomentum.length > 0 ? (
                  partnerMomentum.map((item) => (
                    <li key={item.id} className="rounded-lg border border-ocean-100 bg-ocean-50/70 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-ocean-800">{item.label}</p>
                        <span className="text-xs text-ocean-700">{formatDateShort(item.date) ?? 'TBC'}</span>
                      </div>
                      <p className="mt-1 text-xs text-ocean-700">{item.context}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-ocean-600">{item.type === 'calendar' ? 'Calendar' : 'Inbox'}</p>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-ocean-100 bg-ocean-50/70 p-3 text-xs text-ocean-700">
                    Connect Google Calendar and Gmail to surface live partner commitments.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="space-y-4">
          <h3 className="text-lg font-semibold text-clay-900">Quick actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className="flex items-start gap-3 rounded-xl border border-clay-100 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow-md"
              >
                <span className="text-xl" aria-hidden="true">{action.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-clay-900">{action.label}</p>
                  <p className="text-xs text-clay-500">{action.caption}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-clay-100 bg-clay-50 p-3 text-xs text-clay-500">
            Tip: Open actions in a new tab with ⌘/Ctrl + Click to keep this dashboard visible during stand-up.
          </div>
        </Card>
      </div>

      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-clay-900">Project execution board</h3>
            <p className="text-sm text-clay-500">Group projects by status and surface gaps before they escalate.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-clay-500">
            <span>Total: <strong className="text-clay-900">{formatNumber(enrichedProjects.length)}</strong></span>
            <span>Active: <strong className="text-brand-700">{formatNumber(projectDiagnostics.groups.active.length)}</strong></span>
            <span>Seeking support: <strong className="text-ocean-700">{formatNumber(projectDiagnostics.groups.seeking.length)}</strong></span>
            <span>At risk: <strong className="text-red-600">{formatNumber(projectDiagnostics.groups.atRisk.length)}</strong></span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <MetricTile
            label="Active projects"
            value={formatNumber(projectDiagnostics.groups.active.length)}
            caption="Live delivery with owners"
            tone="brand"
          />
          <MetricTile
            label="Seeking support"
            value={formatNumber(projectDiagnostics.groups.seeking.length)}
            caption="Need capital or supporters"
            tone="ocean"
          />
          <MetricTile
            label="At risk"
            value={formatNumber(projectDiagnostics.groups.atRisk.length)}
            caption="Escalate in stand-up"
            tone={projectDiagnostics.groups.atRisk.length > 0 ? 'brand' : 'neutral'}
          />
          <MetricTile
            label="Missing lead"
            value={formatNumber(projectDiagnostics.missingLeadCount)}
            caption="Assign owner now"
            tone={projectDiagnostics.missingLeadCount > 0 ? 'brand' : 'neutral'}
          />
          <MetricTile
            label="Overdue milestone"
            value={formatNumber(projectDiagnostics.overdueMilestoneCount)}
            caption="Clear blockers"
            tone={projectDiagnostics.overdueMilestoneCount > 0 ? 'brand' : 'neutral'}
          />
        </div>

        {enrichedProjects.length === 0 ? (
          <div className="rounded-lg border border-clay-100 bg-clay-50 p-4 text-sm text-clay-500">
            {projectError || 'No projects found in Notion. Add projects to the database to see them here.'}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {(['active', 'seeking', 'atRisk'] as const).map((groupKey) => {
              const groupTitle = groupKey === 'active' ? 'Active' : groupKey === 'seeking' ? 'Seeking support' : 'At risk'
              const projectsForGroup = projectDiagnostics.groups[groupKey]
              return (
                <div key={groupKey} className="space-y-4 rounded-2xl border border-clay-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-clay-500">{groupTitle}</p>
                    <span className="text-xs text-clay-400">{formatNumber(projectsForGroup.length)}</span>
                  </div>
                  <div className="space-y-4">
                    {projectsForGroup.length === 0 ? (
                      <p className="text-xs text-clay-400">Nothing in this lane — keep listening for new signals.</p>
                    ) : (
                      projectsForGroup.slice(0, 4).map((project) => (
                        <div key={project.id || project.name} className="rounded-xl border border-clay-100 bg-clay-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-clay-400">{project.status || 'Unknown'}</p>
                              <h4 className="mt-1 text-sm font-semibold text-clay-900">{project.name}</h4>
                            </div>
                            {project.milestoneDays !== null && (
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  project.milestoneDays < 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-brand-50 text-brand-700'
                                }`}
                              >
                                {project.milestoneDays < 0
                                  ? `${Math.abs(project.milestoneDays)} days overdue`
                                  : `${project.milestoneDays} days`
                                }
                              </span>
                            )}
                          </div>
                          <dl className="mt-4 grid gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <dt className="text-clay-400">Owner</dt>
                              <dd className="font-medium text-clay-900">{project.owner}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-clay-400">Next milestone</dt>
                              <dd className="font-medium text-clay-900">{formatDateShort(project.milestoneDate)}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-clay-400">Funding gap</dt>
                              <dd className="font-medium text-clay-900">{project.fundingGap ? formatCurrency(project.fundingGap) : 'No gap logged'}</dd>
                            </div>
                          </dl>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <button
                              onClick={() => openProjectIntelligence(project.id)}
                              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 font-semibold text-brand-700 transition hover:bg-brand-100"
                            >
                              View intelligence
                            </button>
                            <button
                              onClick={() => handleQuickAction('outreach', project.id ? { project: project.id } : {})}
                              className="rounded-lg border border-ocean-200 bg-ocean-50 px-3 py-1 font-semibold text-ocean-700 transition hover:bg-ocean-100"
                            >
                              Launch outreach
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    {projectsForGroup.length > 4 && (
                      <button
                        onClick={() => handleQuickAction('projects')}
                        className="text-xs font-semibold text-brand-700 underline"
                      >
                        View all {groupTitle.toLowerCase()}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg" className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-clay-900">Revenue & capital outlook</h3>
              <p className="text-sm text-clay-500">Cash committed, incoming pipeline, and runway deltas for quick decisions.</p>
            </div>
            <button
              onClick={() => handleQuickAction('revenue')}
              className="rounded-lg border border-clay-200 px-3 py-1.5 text-xs font-semibold text-clay-600 transition hover:bg-clay-100"
            >
              Open financial dashboard
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricTile
              label="Cash committed"
              value={formatCurrency(revenueSummary?.community_share ?? revenuePipeline.committed)}
              caption="Contracts signed + invoiced"
              tone="ocean"
            />
            <MetricTile
              label="Expected inflows"
              value={formatCurrency(revenuePipeline.pipeline)}
              caption="Active pipeline this quarter"
              tone="brand"
            />
            <MetricTile
              label="Community share"
              value={formatCurrency(revenueSummary?.community_share)}
              caption={`${formatPercent(revenueSummary?.community_percentage)} promise to communities`}
            />
            <MetricTile
              label="Burn rate"
              value={burnRate ? formatCurrency(burnRate) : 'Link Xero'}
              caption="Monthly operating expenses"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-clay-100 bg-clay-50 p-4">
              <div className="flex items-center justify-between text-sm text-clay-600">
                <p>Runway trend</p>
                <span>{runwayMonths !== null ? `${runwayMonths} months` : 'Connect ledger'}</span>
              </div>
              <div className="mt-3">
                <Sparkline points={revenueRunwaySeries} color="#0F766E" />
              </div>
            </div>
            <div className="rounded-xl border border-clay-100 bg-clay-50 p-4">
              <div className="flex items-center justify-between text-sm text-clay-600">
                <p>Committed revenue</p>
                <span>{arrValue !== null ? formatCurrency(arrValue) : 'Connect ledger'}</span>
              </div>
              <div className="mt-3">
                <Sparkline points={committedRevenueSeries} color="#2563EB" />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-clay-900">Narrative & product signal</h3>
              <p className="text-sm text-clay-500">Stories, campaigns, and product intelligence ready to amplify.</p>
            </div>
            <button
              onClick={() => handleQuickAction('stories')}
              className="rounded-lg border border-clay-200 px-3 py-1.5 text-xs font-semibold text-clay-600 transition hover:bg-clay-100"
            >
              Open story studio
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-clay-100 bg-clay-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-clay-400">Latest story</p>
              {storyHighlights.length > 0 ? (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-clay-900">{storyHighlights[0].title}</p>
                  <p className="mt-1 text-xs text-clay-500">{storyHighlights[0].community} • {formatDateShort(storyHighlights[0].createdAt)}</p>
                  {storyHighlights[0].summary && (
                    <p className="mt-2 line-clamp-2 text-sm text-clay-600">{storyHighlights[0].summary}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-clay-500">
                    {storyHighlights[0].tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-2 py-0.5">#{tag}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-clay-500">Publish your next story to see narrative momentum here.</p>
              )}
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Suggested LinkedIn campaign</p>
              {latestInsight ? (
                <div className="mt-2 text-sm">
                  <p className="font-semibold text-brand-800">{latestInsight.title || 'Priority update'}</p>
                  <p className="mt-1 text-brand-700">{latestInsight.description || 'Use supporter tags to maximise reach.'}</p>
                  <button
                    onClick={() => handleQuickAction('outreach')}
                    className="mt-3 text-xs font-semibold text-brand-700 underline"
                  >
                    Draft outreach post
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-brand-700">Intelligence queue is warming up. Connect product telemetry to auto-suggest supporter shout-outs.</p>
              )}
            </div>

            <div className="rounded-xl border border-ocean-100 bg-ocean-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean-700">Product intelligence</p>
              {secondaryInsight ? (
                <div className="mt-2 text-sm">
                  <p className="font-semibold text-ocean-800">{secondaryInsight.title}</p>
                  <p className="mt-1 text-ocean-700">{secondaryInsight.description}</p>
                  <p className="mt-2 text-xs text-ocean-600">Queue status: {intelligenceOverview?.metrics?.community_priority_queue ?? 'pending'}</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-ocean-700">Connect AI queue to surface new features in flight and community feedback themes.</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-clay-900">Operations & risk bar</h3>
            <p className="text-sm text-clay-500">Integrations, compliance signals, and live alerts across the platform.</p>
          </div>
          <p className="text-xs text-clay-400">Source: Supabase, Notion, Gmail, Xero</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricTile
            label="Integrations healthy"
            value={integrationSummary ? `${integrationSummary.healthyCount}/${integrationSummary.totalServices}` : '–'}
            caption="Supabase · Notion · Gmail"
            tone={integrationSummary && integrationSummary.healthyCount === integrationSummary.totalServices ? 'ocean' : 'brand'}
          />
          <MetricTile
            label="Consent updates"
            value={storyHighlights.length > 0 ? `${storyHighlights.length}` : '0'}
            caption="Stories reviewed this week"
          />
          <MetricTile
            label="New data ingested"
            value={formatNumber(contactDashboard?.total_interactions_this_month || gmailHealth?.communityEmails || 0)}
            caption="Interactions logged this month"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-clay-500">Integration health</h4>
            {integrationSummary ? (
              <div className="space-y-2">
                {integrationSummary.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between rounded-lg border border-clay-100 bg-white px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-clay-900">{service.name}</p>
                      {service.message && <p className="text-xs text-clay-500">{service.message}</p>}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        service.healthy && service.configured
                          ? 'bg-emerald-100 text-emerald-800'
                          : service.configured
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-clay-100 text-clay-600'
                      }`}
                    >
                      {service.healthy && service.configured ? 'Healthy' : service.configured ? 'Attention' : 'Not configured'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-clay-500">Checking Supabase, Notion, Gmail connections…</p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-clay-500">Alerts</h4>
            {operationsAlerts.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {operationsAlerts.map((alert) => (
                  <li key={alert.id} className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700">
                    <span aria-hidden="true">⚠️</span>
                    <span>{alert.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-clay-500">No active alerts — systems running smoothly.</p>
            )}

            {gmailHealth && (
              <div className="rounded-lg border border-ocean-100 bg-ocean-50/70 p-3 text-xs text-ocean-700">
                <p className="font-semibold text-ocean-800">Community inbox</p>
                <p className="mt-1">{gmailHealth.message}</p>
                {gmailHealth.lastSync && <p className="mt-1 text-[11px] text-ocean-600">Last sync {formatDateShort(gmailHealth.lastSync)} </p>}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
