import { useState, useEffect, useMemo } from 'react'
import { api } from '../services/api'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'
import { EmptyState } from './ui/EmptyState'
import { USE_MOCK_DATA } from '../config/env'

interface Project {
  id: string
  name: string
  description?: string
  aiSummary?: string
  status?: string
  area?: string
  themes?: string[]
  tags?: string[]
  organization?: string
  location?: string
  coverImage?: string | null
  projectLead?: {
    id?: string
    name?: string
    avatarUrl?: string
    type?: string
  } | null
  lead?: string
  nextMilestoneDate?: string
  startDate?: string | null
  endDate?: string | null
  budget?: number | null
  funding?: string | null
  actualIncoming?: number | null
  potentialIncoming?: number | null
  revenueActual?: number | null
  revenuePotential?: number | null
  partnerCount?: number | null
  supporters?: number | null
  relatedOpportunities?: string[]
  relatedOrganisations?: string[]
  relatedFields?: string[]
  relatedPeople?: string[]
  relatedActions?: string[]
  relatedResources?: string[]
  relatedArtifacts?: string[]
  relatedPlaces?: string[]
  relatedConversations?: string[]
  coreValues?: string[]
  updatedAt?: string
  lastUpdated?: string
  last_updated?: string
  relationshipPillars?: string[]
  notionUrl?: string | null
  notionId?: string | null
  notionIdShort?: string | null
  notionCreatedAt?: string | null
  notionLastEditedAt?: string | null
}

type ProjectListResponse = Project[] | { projects?: Project[] }

const STATUS_COLOR_MAP: Record<string, string> = {
  'active 🔥': 'bg-brand-100 text-brand-800',
  active: 'bg-brand-100 text-brand-800',
  'in progress': 'bg-brand-100 text-brand-800',
  'in-progress': 'bg-brand-100 text-brand-800',
  delivery: 'bg-brand-100 text-brand-800',
  planning: 'bg-ocean-100 text-ocean-800',
  exploring: 'bg-ocean-100 text-ocean-800',
  'preparation 📋': 'bg-ocean-100 text-ocean-800',
  preparation: 'bg-ocean-100 text-ocean-800',
  paused: 'bg-clay-100 text-clay-600',
  completed: 'bg-clay-100 text-clay-700'
}

const getStatusBadgeClass = (status?: string) =>
  STATUS_COLOR_MAP[(status || '').toLowerCase()] || 'bg-clay-100 text-clay-700'

const isActiveStatus = (status?: string) => {
  if (!status) return false
  const normalized = status.toLowerCase()
  return (
    normalized.includes('active') ||
    normalized.includes('progress') ||
    normalized.includes('delivery') ||
    normalized.includes('🔥')
  )
}

interface CalendarHighlight {
  id: string
  title?: string
  date?: string
  location?: string | null
  attendees?: string[]
  project?: { name?: string; id?: string } | null
}

interface CalendarResponse {
  events?: CalendarHighlight[]
  results?: CalendarHighlight[]
}

type IntelligenceMetrics = Record<string, unknown> & {
  activeProjects?: number
  consentedStorytellers?: number
  openOpportunities?: number
}

interface IntelligenceResponse {
  metrics?: IntelligenceMetrics | null
}

const STUB_PROJECTS: Project[] = [
  {
    id: 'stub-picc-storm-stories',
    name: 'PICC – Storm Stories',
    status: 'Active 🔥',
    themes: ['Storytelling', 'Health and wellbeing'],
    coreValues: ['Decentralised Power'],
    nextMilestoneDate: new Date().toISOString(),
    relatedPlaces: ['Palm Island'],
    aiSummary:
      'Community-owned storytelling and resilience documentation following the Palm Island storms. Needs additional funding for infrastructure upgrades before the next wet season.',
    relatedOrganisations: ['Palm Island Community Company'],
    relatedOpportunities: ['Queensland Reconstruction Authority Resilience Grant'],
    coverImage: null,
    notionUrl: null,
    notionId: null,
    relatedPeople: [],
    relatedActions: [],
    relatedResources: [],
    relatedArtifacts: [],
    relatedConversations: [],
    partnerCount: 4,
    supporters: 12,
    revenueActual: 50000,
    revenuePotential: 80000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stub-witta-harvest',
    name: 'Witta Harvest HQ',
    status: 'Active 🔥',
    themes: ['Operations', 'Health and wellbeing'],
    coreValues: ['Decentralised Power'],
    nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    relatedPlaces: ['Witta, QLD'],
    aiSummary:
      'Regenerative community production site building food security and cultural exchange. Planning residency for Sunshine Coast council water team.',
    relatedOrganisations: ['Seed House Witta'],
    relatedOpportunities: ['Sunshine Coast Community Fund'],
    coverImage: null,
    notionUrl: null,
    notionId: null,
    relatedPeople: [],
    relatedActions: [],
    relatedResources: [],
    relatedArtifacts: [],
    relatedConversations: [],
    partnerCount: 5,
    supporters: 18,
    revenueActual: null,
    revenuePotential: 100000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stub-bg-fit',
    name: 'BG Fit',
    status: 'Active 🔥',
    themes: ['Youth Justice', 'Health and wellbeing'],
    coreValues: ['Decentralised Power'],
    nextMilestoneDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    relatedPlaces: ['Mount Isa'],
    aiSummary:
      'On-country fitness and cultural healing camps disrupting the youth justice pipeline. Preparing new funding proposals and story artefacts.',
    relatedOrganisations: ['BG Collective'],
    relatedOpportunities: ['Queensland Youth Justice Innovation Fund'],
    coverImage: null,
    notionUrl: null,
    notionId: null,
    relatedPeople: [],
    relatedActions: [],
    relatedResources: [],
    relatedArtifacts: [],
    relatedConversations: [],
    partnerCount: 6,
    supporters: 25,
    revenueActual: 20000,
    revenuePotential: 50000,
    updatedAt: new Date().toISOString(),
  },
]

export function CommunityProjects() {
  const initialMock = () => {
    if (USE_MOCK_DATA) return true
    if (typeof window !== 'undefined' && (window as any).__ACT_USE_MOCKS === true) {
      return true
    }
    return false
  }

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([])
  const [intelligenceMetrics, setIntelligenceMetrics] = useState<IntelligenceMetrics | null>(null)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [useMocks, setUseMocks] = useState<boolean>(initialMock)

  useEffect(() => {
    loadProjects()
    loadInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { activeProjects, otherProjects } = useMemo(() => {
    const active: Project[] = []
    const other: Project[] = []

    const getMilestoneValue = (value?: string | null) => {
      if (!value) return Number.POSITIVE_INFINITY
      const timestamp = new Date(value).getTime()
      return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
    }

    projects.forEach((project) => {
      if (isActiveStatus(project.status)) {
        active.push(project)
      } else {
        other.push(project)
      }
    })

    active.sort((a, b) => getMilestoneValue(a.nextMilestoneDate) - getMilestoneValue(b.nextMilestoneDate))

    return { activeProjects: active, otherProjects: other }
  }, [projects])

  const parseCalendarError = (errorObj?: Error) => {
    if (!errorObj) return 'Connect Google Calendar to see shared milestones.'
    const rawMessage = errorObj.message || ''
    if (rawMessage.includes('Cannot GET /api/calendar/events') || rawMessage.includes('404')) {
      return 'Calendar events are unavailable in this environment.'
    }
    try {
      const jsonMatch = rawMessage.match(/\{.*\}/s)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed?.message) return parsed.message
      }
    } catch {
      // ignore parse errors
    }
    if (rawMessage.toLowerCase().includes('not authenticated')) {
      return 'Connect Google Calendar to see shared milestones.'
    }
    return rawMessage || 'Connect Google Calendar to see shared milestones.'
  }

  const loadInsights = async () => {
    if (useMocks) {
      setCalendarHighlights([])
      setIntelligenceMetrics(null)
      setCalendarError('Calendar sync inactive in mock mode.')
      return
    }

    try {
      const [calendar, intelligence] = (await Promise.allSettled([
        api.getCalendarHighlights(2),
        api.getIntelligenceDashboard()
      ])) as [
        PromiseSettledResult<CalendarResponse>,
        PromiseSettledResult<IntelligenceResponse>
      ]

      if (calendar.status === 'fulfilled') {
        setCalendarError(null)
        const calendarValue = calendar.value || {}
        setCalendarHighlights(calendarValue.events || calendarValue.results || [])
      }
      if (calendar.status === 'rejected') {
        const reason = calendar.reason as Error | undefined
        setCalendarError(parseCalendarError(reason))
        setCalendarHighlights([])
      }

      if (intelligence.status === 'fulfilled') {
        const insights = intelligence.value || {}
        setIntelligenceMetrics(insights.metrics || null)
      }
    } catch (err) {
      console.warn('Failed to load project insights', err)
    }
  }

  const loadProjects = async () => {
    if (useMocks) {
      setProjects(STUB_PROJECTS)
      setError((prev) => prev ?? 'Using cached project snapshot.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Using real dashboard projects API that connects to your 55+ Notion projects
      const payload = (await api.getDashboardProjects(30)) as ProjectListResponse
      let normalized: Project[] = []
      if (Array.isArray(payload)) {
        normalized = payload
      } else if (payload && Array.isArray(payload.projects)) {
        normalized = payload.projects
      }
      if (!normalized.length) {
        setUseMocks(true)
        if (typeof window !== 'undefined') {
          ;(window as any).__ACT_USE_MOCKS = true
        }
        setProjects(STUB_PROJECTS)
        setError('Showing cached project snapshot until real data sync completes.')
      } else {
        setProjects(normalized)
        setError(null)
      }
    } catch (err) {
      console.warn('Falling back to stub projects due to API error:', err)
      setUseMocks(true)
      if (typeof window !== 'undefined') {
        ;(window as any).__ACT_USE_MOCKS = true
      }
      setProjects(STUB_PROJECTS)
      setError('Unable to reach /api/real/projects. Displaying cached project snapshot.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center" padding="lg">
        <div className="flex flex-col items-center gap-3 text-clay-500">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-200 border-t-transparent" />
          <p>Loading community projects…</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Project Engine"
        title="Community Projects"
        description="Real initiatives from community partners, synced live from Supabase and Notion so everyone can see progress and impact."
      />

      {error && (
        <Card className="border-red-100 bg-red-50 text-red-700" padding="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Showing cached data</h3>
              <p className="text-xs">{error}</p>
            </div>
            {!useMocks && (
              <button
                onClick={loadProjects}
                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Try again
              </button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand-100 bg-brand-50/70 text-brand-800" padding="sm">
          <p className="text-sm font-medium">Living Projects</p>
          <p className="mt-1 text-2xl font-semibold">{projects.length}</p>
          <p className="mt-2 text-sm">Active community initiatives spanning culture, enterprise, and youth justice.</p>
          <p className="mt-1 text-xs text-brand-600">In delivery right now: {activeProjects.length}</p>
        </Card>
        <Card className="border-ocean-100 bg-ocean-50/70 text-ocean-800" padding="sm">
          <p className="text-sm font-medium">Community Control</p>
          <p className="mt-2 text-sm">Communities own their data. Every project is exportable, editable, and forkable without ACT approval.</p>
        </Card>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Community projects will appear here as soon as they're synced from Supabase."
        />
      ) : (
        <div className="space-y-10">
          {activeProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Active projects</h3>
                <span className="text-xs font-medium text-brand-500">Showing {activeProjects.length} in delivery</span>
              </div>
              <div className="space-y-6">
                {activeProjects.map((project) => (
                  <ActiveProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {otherProjects.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-clay-500">Also in motion</h3>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {otherProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(calendarHighlights.length > 0 || intelligenceMetrics) && (
        <Card className="mt-8 grid gap-4 md:grid-cols-2" padding="md">
          {calendarHighlights.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-clay-900">Upcoming milestones</h3>
              <p className="mt-1 text-sm text-clay-500">Pulled directly from Google Calendar.</p>
              <ul className="mt-4 space-y-3 text-sm">
                {calendarHighlights.map((event) => (
                  <li key={event.id} className="rounded-lg border border-clay-100 bg-clay-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-clay-900">{event.title || 'Untitled event'}</span>
                      <span className="text-xs text-clay-500">
                        {event.date ? new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBC'}
                      </span>
                    </div>
                    {event.location && <p className="text-xs text-clay-500">{event.location}</p>}
                    {event.project?.name && (
                      <p className="text-xs text-brand-700">Project: {event.project.name}</p>
                    )}
                    {event.attendees?.length > 0 && (
                      <p className="text-xs text-clay-500 mt-1">
                        Participants: {event.attendees.slice(0, 3).join(', ')}{event.attendees.length > 3 && '…'}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {calendarHighlights.length === 0 && calendarError && (
            <div className="rounded-lg border border-clay-100 bg-clay-50 p-3 text-sm text-clay-500">
              {calendarError}
            </div>
          )}

          {calendarHighlights.length === 0 && !calendarError && (
            <p className="text-sm text-clay-500">No milestones scheduled.</p>
          )}

          {intelligenceMetrics && (
            <div>
              <h3 className="text-lg font-semibold text-clay-900">Project insights</h3>
              <p className="mt-1 text-sm text-clay-500">Snapshot of project/partner readiness from the intelligence engine.</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
                  <span className="text-clay-500">Active projects</span>
                  <span className="text-lg font-semibold text-brand-700">{intelligenceMetrics.activeProjects ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
                  <span className="text-clay-500">Consented storytellers</span>
                  <span className="text-lg font-semibold text-ocean-700">{intelligenceMetrics.consentedStorytellers ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
                  <span className="text-clay-500">Open opportunities</span>
                  <span className="text-lg font-semibold text-clay-900">{intelligenceMetrics.openOpportunities ?? 0}</span>
                </div>
              </dl>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function ActiveProjectCard({ project }: { project: Project }) {
  const coverImage = project.coverImage || null
  const lastUpdated = project.notionLastEditedAt || project.updatedAt || project.lastUpdated || project.last_updated || null

  const actual = typeof project.actualIncoming === 'number' ? project.actualIncoming : null
  const potential = typeof project.potentialIncoming === 'number' ? project.potentialIncoming : null
  const fundingGap = potential !== null && actual !== null ? Math.max(potential - actual, 0) : null
  const opportunityCount = project.relatedOpportunities?.length ?? 0

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0
    }).format(value)

  const formatCount = (value: number) => value.toLocaleString('en-AU')

  const needs: Array<{ label: string; detail: string }> = []

  if (fundingGap && fundingGap > 0) {
    needs.push({ label: 'Funding gap', detail: formatCurrency(fundingGap) })
  } else if (project.funding && project.funding.toLowerCase().includes('seeking')) {
    needs.push({ label: 'Funding', detail: project.funding })
  }

  if (opportunityCount > 0) {
    needs.push({ label: 'Opportunities', detail: `${opportunityCount} ready for follow-up` })
  }

  if (project.nextMilestoneDate) {
    const milestoneLabel = new Date(project.nextMilestoneDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
    needs.push({ label: 'Next milestone', detail: milestoneLabel })
  }

  if (needs.length === 0) {
    needs.push({ label: 'Momentum', detail: 'Ready for community backing' })
  }

  const available: Array<{ label: string; detail: string }> = []

  if (project.partnerCount !== null && project.partnerCount !== undefined) {
    available.push({ label: 'Partners committed', detail: formatCount(project.partnerCount) })
  }

  if (project.supporters !== null && project.supporters !== undefined) {
    available.push({ label: 'Supporters on board', detail: formatCount(project.supporters) })
  }

  const resourceCount = project.relatedResources?.length ?? 0
  if (resourceCount > 0) {
    available.push({ label: 'Resources linked', detail: formatCount(resourceCount) })
  }

  const artifactCount = project.relatedArtifacts?.length ?? 0
  if (artifactCount > 0) {
    available.push({ label: 'Artifacts', detail: formatCount(artifactCount) })
  }

  const placeCount = project.relatedPlaces?.length ?? 0
  if (placeCount > 0) {
    available.push({ label: 'Communities & places', detail: formatCount(placeCount) })
  }

  const relationshipPillars = Array.isArray(project.relationshipPillars)
    ? project.relationshipPillars.slice(0, 4)
    : []

  const tagOverflow = (project.tags?.length ?? 0) > 4 ? (project.tags?.length ?? 0) - 4 : 0

  return (
    <Card className="flex flex-col gap-6 border border-brand-100 bg-white shadow-sm md:flex-row" padding="lg">
      <div className="md:w-72">
        <div className="aspect-video overflow-hidden rounded-xl bg-brand-50">
          {coverImage ? (
            <img src={coverImage} alt={project.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-brand-600">
              Image coming soon
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(project.status)}`}>
              {project.status || 'Active'}
            </span>
            {(project.organization || project.area) && (
              <span className="text-xs font-medium uppercase tracking-wide text-clay-400">
                {project.organization || project.area}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-clay-900">{project.name}</h3>
            <p className="mt-2 text-sm text-clay-600">
              {project.aiSummary || project.description || 'Community-defined initiative'}
            </p>
          </div>

          {project.projectLead?.name && (
            <p className="text-sm text-clay-500">
              Lead: <span className="font-medium text-clay-900">{project.projectLead.name}</span>
            </p>
          )}

          {project.location && <p className="text-xs text-clay-400">Location: {project.location}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-brand-100 bg-brand-50/70 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-brand-700">What we need</h4>
            <ul className="mt-3 space-y-2 text-sm text-brand-900">
              {needs.map((item) => (
                <li key={`${item.label}-${item.detail}`} className="flex items-center justify-between gap-3">
                  <span className="text-brand-600">{item.label}</span>
                  <span className="font-medium text-brand-900">{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-clay-100 bg-white p-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-clay-600">What we have ready</h4>
            <ul className="mt-3 space-y-2 text-sm text-clay-700">
              {available.length === 0 ? (
                <li className="text-clay-400">Linking real resources now</li>
              ) : (
                available.map((item) => (
                  <li key={`${item.label}-${item.detail}`} className="flex items-center justify-between gap-3">
                    <span>{item.label}</span>
                    <span className="font-medium text-clay-900">{item.detail}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {(relationshipPillars.length > 0 || (project.tags?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-2">
            {relationshipPillars.map((pillar) => (
              <span
                key={`pillar-${pillar}`}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
              >
                {pillar}
              </span>
            ))}
            {(project.tags || []).slice(0, 4).map((tag) => (
              <span key={`tag-${tag}`} className="rounded-full bg-clay-100 px-3 py-1 text-xs text-clay-600">
                {tag}
              </span>
            ))}
            {tagOverflow > 0 && (
              <span className="rounded-full bg-clay-100 px-3 py-1 text-xs text-clay-500">+{tagOverflow}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-clay-400">
          {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleDateString()}</span>}
          {project.notionUrl && (
            <a
              href={project.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 transition hover:text-brand-800"
            >
              <span>Open in Notion</span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const statusBadgeClass = getStatusBadgeClass(project.status)
  const tags = project.tags || project.themes || []
  const lastUpdated =
    project.notionLastEditedAt ||
    project.updatedAt ||
    project.lastUpdated ||
    project.last_updated

  return (
    <Card className="flex h-full flex-col justify-between" padding="md">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass}`}>
          {project.status || 'Active'}
        </span>
        {(project.organization || project.area) && (
          <span className="text-xs font-medium uppercase tracking-wide text-clay-400">
            {project.organization || project.area}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-clay-900">{project.name}</h3>
          <p className="mt-2 text-sm text-clay-600 line-clamp-4">
            {project.aiSummary || project.description || 'Community-defined initiative'}
          </p>
        </div>

        {project.projectLead?.name && (
          <p className="text-sm text-clay-500">Lead: <span className="font-medium text-clay-900">{project.projectLead.name}</span></p>
        )}

        <div className="grid gap-2 text-xs text-clay-500">
          {project.nextMilestoneDate && (
            <div className="flex justify-between">
              <span>Next milestone</span>
              <span className="font-medium text-clay-900">
                {new Date(project.nextMilestoneDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
          {(project.funding || project.actualIncoming || project.potentialIncoming) && (
            <div className="flex justify-between">
              <span>Funding</span>
              <span className="font-medium text-brand-700">
                {project.funding || `Actual $${project.actualIncoming?.toLocaleString()} / Potential $${project.potentialIncoming?.toLocaleString()}`}
              </span>
            </div>
          )}
          {project.partnerCount !== null && project.partnerCount !== undefined && (
            <div className="flex justify-between">
              <span>Partners</span>
              <span className="font-medium text-clay-900">{project.partnerCount}</span>
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 6).map((tag) => (
              <span key={tag} className="rounded-full bg-clay-100 px-2 py-0.5 text-xs text-clay-600">
                {tag}
              </span>
            ))}
            {tags.length > 6 && (
              <span className="rounded-full bg-clay-100 px-2 py-0.5 text-xs text-clay-500">+{tags.length - 6}</span>
            )}
          </div>
        )}

        {Array.isArray(project.relationshipPillars) && project.relationshipPillars.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.relationshipPillars.slice(0, 4).map((pillar) => (
              <span key={pillar} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                {pillar}
              </span>
            ))}
            {project.relationshipPillars.length > 4 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
                +{project.relationshipPillars.length - 4}
              </span>
            )}
          </div>
        )}

        {(project.relatedOpportunities?.length || 0) > 0 && (
          <p className="text-xs text-brand-700">
            {project.relatedOpportunities!.length} linked opportunities ready for follow-up
          </p>
        )}
      </div>

      {(lastUpdated || project.notionUrl) && (
        <div className="mt-5 flex items-center justify-between text-xs text-clay-400">
          <span>
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleDateString()}` : ''}
          </span>
          {project.notionUrl && (
            <a
              href={project.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 transition hover:text-brand-800"
            >
              <span>Open in Notion</span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      )}
    </Card>
  )}
