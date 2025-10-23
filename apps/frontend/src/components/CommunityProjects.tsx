import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'
import { EmptyState } from './ui/EmptyState'
import { USE_MOCK_DATA } from '../config/env'
import { ProjectDetail } from './ProjectDetail'
import ProjectsMap from './ProjectsMap'
import { ImpactFlow } from './ImpactFlow'

interface Storyteller {
  id: string | number
  project_id?: string | number | null
  full_name: string
  bio?: string | null
  expertise_areas?: string[] | null
  profile_image_url?: string | null
  media_type?: string | null
  created_at?: string | null
  consent_given?: boolean
}

interface Project {
  id: string
  name: string
  title?: string
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
  storytellers?: Storyteller[]
  storytellerCount?: number
  supabaseProjectId?: string | null
  supabaseProject?: Record<string, unknown> | null
  source?: string
}

type ProjectListResponse = Project[] | { projects?: Project[] }

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
    relatedPlaces: [{
      indigenousName: 'Bwgcolman',
      westernName: 'Palm Island',
      displayName: 'Bwgcolman (Palm Island)',
      map: '-18.7544,146.5811',
      state: 'Qld'
    }],
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
    relatedPlaces: [{
      indigenousName: 'Gubbi Gubbi',
      westernName: 'Witta',
      displayName: 'Gubbi Gubbi (Witta)',
      map: '-26.5833,152.7833',
      state: 'Qld'
    }],
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
    relatedPlaces: [{
      indigenousName: 'Kalkadoon',
      westernName: 'Mount Isa',
      displayName: 'Kalkadoon (Mount Isa)',
      map: '-20.7256,139.4927',
      state: 'Qld'
    }],
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

  const handleStorytellerAdded = (projectId: string, storyteller: Storyteller) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project
        const existing = project.storytellers || []
        const updatedStorytellers = [...existing, storyteller]
        return {
          ...project,
          storytellers: updatedStorytellers,
          storytellerCount: (project.storytellerCount ?? existing.length) + 1,
        }
      })
    )
  }

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarHighlights, setCalendarHighlights] = useState<CalendarHighlight[]>([])
  const [intelligenceMetrics, setIntelligenceMetrics] = useState<IntelligenceMetrics | null>(null)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [useMocks, setUseMocks] = useState<boolean>(initialMock)

  // Filter and view state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTheme, setSelectedTheme] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'funding'>('date')

  // Project detail navigation
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
    loadInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Extract unique statuses and themes for filter dropdowns
  const { uniqueStatuses, uniqueThemes } = useMemo(() => {
    const statuses = new Set<string>()
    const themes = new Set<string>()

    projects.forEach((project) => {
      if (project.status) statuses.add(project.status)
      const projectThemes = project.themes || project.tags || []
      projectThemes.forEach((theme) => themes.add(theme))
    })

    return {
      uniqueStatuses: Array.from(statuses).sort(),
      uniqueThemes: Array.from(themes).sort(),
    }
  }, [projects])

  const { activeProjects, otherProjects, filteredActiveProjects, filteredOtherProjects } = useMemo(() => {
    const active: Project[] = []
    const other: Project[] = []

    const getMilestoneValue = (value?: string | null) => {
      if (!value) return Number.POSITIVE_INFINITY
      const timestamp = new Date(value).getTime()
      return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
    }

    const getFundingValue = (project: Project) => {
      return (project.actualIncoming || 0) + (project.potentialIncoming || 0)
    }

    // First, split into active and other
    projects.forEach((project) => {
      if (isActiveStatus(project.status)) {
        active.push(project)
      } else {
        other.push(project)
      }
    })

    // Apply filters
    const applyFilters = (projectList: Project[]) => {
      return projectList.filter((project) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const matchesSearch =
            project.name?.toLowerCase().includes(query) ||
            project.description?.toLowerCase().includes(query) ||
            project.aiSummary?.toLowerCase().includes(query) ||
            project.organization?.toLowerCase().includes(query)
          if (!matchesSearch) return false
        }

        // Status filter
        if (selectedStatus !== 'all' && project.status !== selectedStatus) {
          return false
        }

        // Theme filter
        if (selectedTheme !== 'all') {
          const projectThemes = project.themes || project.tags || []
          if (!projectThemes.includes(selectedTheme)) return false
        }

        return true
      })
    }

    // Apply sorting
    const applySorting = (projectList: Project[]) => {
      const sorted = [...projectList]

      if (sortBy === 'date') {
        sorted.sort((a, b) => getMilestoneValue(a.nextMilestoneDate) - getMilestoneValue(b.nextMilestoneDate))
      } else if (sortBy === 'name') {
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      } else if (sortBy === 'funding') {
        sorted.sort((a, b) => getFundingValue(b) - getFundingValue(a))
      }

      return sorted
    }

    const filteredActive = applySorting(applyFilters(active))
    const filteredOther = applySorting(applyFilters(other))

    return {
      activeProjects: active,
      otherProjects: other,
      filteredActiveProjects: filteredActive,
      filteredOtherProjects: filteredOther,
    }
  }, [projects, searchQuery, selectedStatus, selectedTheme, sortBy])

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
      // Using real dashboard projects API that connects to your 64 Notion projects
      const payload = (await api.getDashboardProjects()) as ProjectListResponse
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

  // Show project detail page if a project is selected
  if (selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
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

      {/* Filter and View Controls */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="Search projects by name, description, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-clay-200 bg-white px-4 py-2 text-sm text-clay-900 placeholder-clay-400 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Filters and View Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-xs font-medium text-clay-600">
                Status:
              </label>
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-clay-200 bg-white px-3 py-1.5 text-sm text-clay-900 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="theme-filter" className="text-xs font-medium text-clay-600">
                Theme:
              </label>
              <select
                id="theme-filter"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="rounded-lg border border-clay-200 bg-white px-3 py-1.5 text-sm text-clay-900 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All</option>
                {uniqueThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-xs font-medium text-clay-600">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'funding')}
                className="rounded-lg border border-clay-200 bg-white px-3 py-1.5 text-sm text-clay-900 transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="date">Next Milestone</option>
                <option value="name">Name</option>
                <option value="funding">Funding</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-medium text-clay-600">View:</span>
              <div className="flex rounded-lg border border-clay-200 bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === 'grid'
                      ? 'bg-brand-100 text-brand-800'
                      : 'text-clay-600 hover:bg-clay-50'
                  } rounded-l-lg`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === 'list'
                      ? 'bg-brand-100 text-brand-800'
                      : 'text-clay-600 hover:bg-clay-50'
                  } rounded-r-lg`}
                >
                  List
                </button>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedStatus !== 'all' || selectedTheme !== 'all' || sortBy !== 'date') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedStatus('all')
                  setSelectedTheme('all')
                  setSortBy('date')
                }}
                className="text-xs font-medium text-brand-700 transition hover:text-brand-800 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="text-xs text-clay-500">
            Showing {filteredActiveProjects.length + filteredOtherProjects.length} of {projects.length} projects
          </div>
        </div>
      </Card>

      {/* Projects Map */}
      {projects.length > 0 && (
        <div className="mb-8">
          <ProjectsMap
            projects={projects}
            onProjectClick={(projectId) => setSelectedProjectId(projectId)}
          />
        </div>
      )}

      {/* Impact Flow Visualization */}
      {projects.length > 0 && (
        <div className="mb-8">
          <ImpactFlow projects={projects} />
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Community projects will appear here as soon as they're synced from Supabase."
        />
      ) : filteredActiveProjects.length === 0 && filteredOtherProjects.length === 0 ? (
        <EmptyState
          title="No matching projects"
          description="Try adjusting your filters or search terms to find projects."
        />
      ) : (
        <div className="space-y-10">
          {filteredActiveProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Active projects</h3>
                <span className="text-xs font-medium text-brand-500">Showing {filteredActiveProjects.length} in delivery</span>
              </div>
              <div className={viewMode === 'list' ? 'space-y-6' : 'grid grid-cols-1 gap-6 lg:grid-cols-3'}>
                {filteredActiveProjects.map((project) =>
                  viewMode === 'list' ? (
                    <ActiveProjectCard
                      key={project.id}
                      project={project}
                      onClick={setSelectedProjectId}
                    />
                  ) : (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={setSelectedProjectId}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {filteredOtherProjects.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-clay-500">Also in motion</h3>
              <div className={viewMode === 'list' ? 'space-y-6' : 'grid grid-cols-1 gap-6 lg:grid-cols-3'}>
                {filteredOtherProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={setSelectedProjectId}
                  />
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
                    {event.attendees && event.attendees.length > 0 && (
                      <p className="text-xs text-clay-500 mt-1">
                        Participants: {event.attendees.slice(0, 3).join(', ')}{event.attendees.length > 3 ? '…' : ''}
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
    </div>
  )
}

function ActiveProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick?: (projectId: string) => void
}) {
  const coverImage = project.coverImage || null
  const lastUpdated = project.notionLastEditedAt || project.updatedAt || project.lastUpdated || project.last_updated || null

  const relationshipPillars = Array.isArray(project.relationshipPillars)
    ? project.relationshipPillars.slice(0, 4)
    : []

  const coreValues = Array.isArray(project.coreValues)
    ? project.coreValues
    : project.coreValues
    ? [project.coreValues]
    : []

  const themes = project.themes || project.tags || []

  // Partners and places for context - filter out any invalid values
  const partners = (project.relatedOrganisations || []).filter(p => p && p !== '0' && p !== 0)
  const rawPlaces = (project.relatedPlaces || []).filter(p => p && p !== '0' && p !== 0)
  const people = (project.relatedPeople || []).filter(p => p && p !== '0' && p !== 0)

  // Handle places - they can be objects or strings (for backwards compatibility)
  const places = rawPlaces.map(p => {
    if (typeof p === 'string') {
      return { indigenousName: p, westernName: null, displayName: p }
    }
    return p
  })

  // Use location as fallback for places if we don't have place names
  const displayPlaces = places.length > 0 ? places : (project.location ? [{ indigenousName: project.location, westernName: null, displayName: project.location }] : [])

  return (
    <div
      className="flex flex-col gap-6 border border-brand-100 bg-white shadow-sm md:flex-row cursor-pointer hover:shadow-lg transition-shadow rounded-lg p-6"
      onClick={() => onClick?.(project.id)}
    >
      <div className="md:w-80 flex-shrink-0">
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-ocean-100 shadow-md">
          {coverImage ? (
            <img src={coverImage} alt={project.name} className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-brand-600 bg-gradient-to-br from-brand-50 to-ocean-50">
              <div className="text-center space-y-2 p-4">
                <div className="text-5xl">📍</div>
                <div className="text-xs text-clay-500">Sense of place</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        {/* Header with location and partners */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-clay-500">
            {displayPlaces.length > 0 && (
              <>
                <span>📍</span>
                <span className="font-medium">{displayPlaces.slice(0, 2).map(p => p.displayName).join(', ')}</span>
              </>
            )}
            {displayPlaces.length > 0 && partners.length > 0 && <span>•</span>}
            {partners.length > 0 && (
              <span>{partners.length} {partners.length === 1 ? 'partner' : 'partners'}</span>
            )}
          </div>

          <h3 className="text-2xl font-semibold text-clay-900 leading-tight">{project.name}</h3>
        </div>

        {/* What it is */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">What it is</h4>
          <p className="text-base text-clay-700 leading-relaxed">
            {project.aiSummary || project.description || 'Community-defined initiative'}
          </p>
        </div>

        {/* Why it matters - derive from themes and values */}
        {(coreValues.length > 0 || themes.length > 0) && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">Why it matters</h4>
            <div className="flex flex-wrap gap-2">
              {coreValues.map((value) => (
                <span
                  key={`value-${value}`}
                  className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800"
                >
                  {value}
                </span>
              ))}
              {themes.slice(0, 3).map((theme) => (
                <span key={`theme-${theme}`} className="rounded-full bg-ocean-100 px-3 py-1 text-sm text-ocean-800">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* How it's happening - relationship pillars */}
        {relationshipPillars.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">How it's happening</h4>
            <div className="flex flex-wrap gap-2">
              {relationshipPillars.map((pillar) => (
                <span
                  key={`pillar-${pillar}`}
                  className="rounded-full border border-brand-200 bg-white px-3 py-1 text-sm text-brand-700"
                >
                  {pillar}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* People involved */}
        {people.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-clay-500 mb-2">People involved</h4>
            <p className="text-sm text-clay-600">
              {people.slice(0, 5).join(', ')}
              {people.length > 5 && ` and ${people.length - 5} others`}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-clay-400 pt-3 border-t border-clay-100">
          {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleDateString()}</span>}
          {project.notionUrl && (
            <a
              href={project.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 transition hover:text-brand-800"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View full story</span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick?: (projectId: string) => void
}) {
  const themes = project.themes || project.tags || []
  const lastUpdated =
    project.notionLastEditedAt ||
    project.updatedAt ||
    project.lastUpdated ||
    project.last_updated

  const coverImage = project.coverImage || (project as any).cover_photo || (project as any).image

  const coreValues = Array.isArray(project.coreValues)
    ? project.coreValues
    : project.coreValues
    ? [project.coreValues]
    : []

  const partners = (project.relatedOrganisations || []).filter(p => p && p !== '0' && p !== 0)
  const rawPlaces = (project.relatedPlaces || []).filter(p => p && p !== '0' && p !== 0)
  const people = (project.relatedPeople || []).filter(p => p && p !== '0' && p !== 0)
  const relationshipPillars = Array.isArray(project.relationshipPillars)
    ? project.relationshipPillars.slice(0, 3)
    : []

  // Handle places - they can be objects or strings (for backwards compatibility)
  const places = rawPlaces.map(p => {
    if (typeof p === 'string') {
      return { indigenousName: p, westernName: null, displayName: p }
    }
    return p
  })

  // Use location as fallback for places if we don't have place names
  const displayPlaces = places.length > 0 ? places : (project.location ? [{ indigenousName: project.location, westernName: null, displayName: project.location }] : [])

  return (
    <div
      className="flex h-full flex-col justify-between overflow-hidden cursor-pointer hover:shadow-lg transition-shadow bg-white rounded-lg border border-clay-200"
      onClick={() => onClick?.(project.id)}
    >
      {coverImage && (
        <div className="relative h-48 w-full overflow-hidden bg-clay-100">
          <img
            src={coverImage}
            alt={`${project.name} cover`}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      <div className="p-6 flex flex-col flex-1 gap-4">
        {/* Location and partners context */}
        <div className="flex items-center gap-2 text-xs text-clay-500">
          {displayPlaces.length > 0 && (
            <>
              <span>📍</span>
              <span className="font-medium">{displayPlaces[0].displayName}</span>
            </>
          )}
          {displayPlaces.length > 0 && partners.length > 0 && <span>•</span>}
          {partners.length > 0 && (
            <span>{partners.length} {partners.length === 1 ? 'partner' : 'partners'}</span>
          )}
        </div>

        {/* Project name */}
        <h3 className="text-lg font-semibold text-clay-900 leading-tight">{project.name}</h3>

        {/* What it is */}
        <div className="flex-1 space-y-3">
          <p className="text-sm text-clay-600 line-clamp-3">
            {project.aiSummary || project.description || 'Community-defined initiative'}
          </p>

          {/* Why it matters */}
          {(coreValues.length > 0 || themes.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {coreValues.slice(0, 2).map((value) => (
                <span
                  key={`value-${value}`}
                  className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800"
                >
                  {value}
                </span>
              ))}
              {themes.slice(0, 3).map((theme) => (
                <span key={`theme-${theme}`} className="rounded-full bg-ocean-100 px-2.5 py-0.5 text-xs text-ocean-800">
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* How it's happening */}
          {relationshipPillars.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {relationshipPillars.map((pillar) => (
                <span
                  key={`pillar-${pillar}`}
                  className="rounded-full border border-brand-200 bg-white px-2.5 py-0.5 text-xs text-brand-700"
                >
                  {pillar}
                </span>
              ))}
            </div>
          )}

          {/* People involved */}
          {people.length > 0 && (
            <p className="text-xs text-clay-500">
              With {people.slice(0, 3).join(', ')}
              {people.length > 3 && ` and ${people.length - 3} others`}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-clay-400 pt-3 border-t border-clay-100">
          <span>
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleDateString()}` : ''}
          </span>
          {project.notionUrl && (
            <a
              href={project.notionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 transition hover:text-brand-800"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View story</span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function StorytellerPanel({
  project,
  canAddStorytellers,
  onStorytellerAdded,
  compact = false,
}: {
  project: Project
  canAddStorytellers: boolean
  onStorytellerAdded: (projectId: string, storyteller: Storyteller) => void
  compact?: boolean
}) {
  const storytellers = project.storytellers || []
  const [isAdding, setIsAdding] = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [expertise, setExpertise] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [consentGranted, setConsentGranted] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!canAddStorytellers && storytellers.length === 0) {
    return null
  }

  const panelClasses = compact
    ? 'rounded-lg border border-clay-100 bg-clay-50/70 p-3 space-y-3'
    : 'rounded-xl border border-clay-100 bg-clay-50/70 p-4 space-y-4'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!fullName.trim()) {
      setError('Please enter a storyteller name.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        fullName: fullName.trim(),
        bio: bio.trim() ? bio.trim() : null,
        consentGranted,
        expertiseAreas: expertise
          ? expertise.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
        profileImageUrl: profileImageUrl.trim() || null,
        mediaType: null,
      }

      const response = await api.addProjectStoryteller(project.id, payload)
      const storytellerData: any = (response as any).storyteller ?? response

      const normalizedStoryteller: Storyteller = {
        id: storytellerData.id ?? `${project.id}-storyteller-${Date.now()}`,
        project_id: storytellerData.project_id ?? project.supabaseProjectId ?? project.id,
        full_name: storytellerData.full_name ?? payload.fullName,
        bio: storytellerData.bio ?? payload.bio ?? null,
        expertise_areas: storytellerData.expertise_areas ?? payload.expertiseAreas ?? [],
        profile_image_url: storytellerData.profile_image_url ?? payload.profileImageUrl ?? null,
        media_type: storytellerData.media_type ?? null,
        created_at: storytellerData.created_at ?? new Date().toISOString(),
        consent_given: storytellerData.consent_given ?? payload.consentGranted ?? true,
      }

      onStorytellerAdded(project.id, normalizedStoryteller)
      setSuccess('Storyteller added')
      setIsAdding(false)
      setFullName('')
      setBio('')
      setExpertise('')
      setProfileImageUrl('')
      setConsentGranted(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add storyteller. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={panelClasses}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-clay-900`}>
            Community storytellers
          </h4>
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-clay-500`}>
            {storytellers.length > 0
              ? `${storytellers.length} trusted voices linked to this project.`
              : 'Invite storytellers to keep this project alive.'}
          </p>
        </div>
        {canAddStorytellers && (
          <button
            type="button"
            onClick={() => {
              setIsAdding((prev) => !prev)
              setError(null)
              setSuccess(null)
            }}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
          >
            {isAdding ? 'Cancel' : 'Add storyteller'}
          </button>
        )}
      </div>

      {storytellers.length > 0 && (
        <ul className="space-y-2">
          {storytellers.map((storyteller) => (
            <li
              key={storyteller.id ?? storyteller.full_name}
              className="rounded-lg border border-white/60 bg-white/80 p-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {storyteller.profile_image_url ? (
                  <img
                    src={storyteller.profile_image_url}
                    alt={storyteller.full_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm">
                    🎙️
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-clay-900">{storyteller.full_name}</p>
                  {storyteller.bio && (
                    <p className="text-xs text-clay-600 line-clamp-3">{storyteller.bio}</p>
                  )}
                  {Array.isArray(storyteller.expertise_areas) && storyteller.expertise_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {storyteller.expertise_areas.slice(0, 4).map((area) => (
                        <span
                          key={`${storyteller.id}-${area}`}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                        >
                          {area}
                        </span>
                      ))}
                      {storyteller.expertise_areas.length > 4 && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
                          +{storyteller.expertise_areas.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdding && canAddStorytellers && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-brand-100 bg-white/95 p-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-xs font-medium text-clay-600">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="Storyteller name"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-clay-600">
              Expertise areas
              <input
                value={expertise}
                onChange={(event) => setExpertise(event.target.value)}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="Culture, youth, justice…"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-clay-600 md:col-span-2">
              Profile image URL (optional)
              <input
                value={profileImageUrl}
                onChange={(event) => setProfileImageUrl(event.target.value)}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="https://"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-clay-600 md:col-span-2">
              Bio / introduction
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={compact ? 3 : 4}
                className="mt-1 rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm text-clay-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                placeholder="Share why this voice matters for the project..."
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-clay-600">
            <input
              type="checkbox"
              checked={consentGranted}
              onChange={(event) => setConsentGranted(event.target.checked)}
            />
            Consent confirmed to share story updates publicly
          </label>
          <div className="flex items-center justify-between">
            <div className="text-xs text-clay-400">
              {error && <span className="text-red-600">{error}</span>}
              {success && <span className="text-brand-700">{success}</span>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save storyteller'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
