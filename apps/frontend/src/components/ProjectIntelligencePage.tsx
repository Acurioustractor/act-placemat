import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { SectionHeader } from './ui/SectionHeader'
import { Card } from './ui/Card'

interface SupporterInsights {
  headline?: string | null
  currentCompany?: string | null
  currentRole?: string | null
  lastPostTitle?: string | null
  lastPostUrl?: string | null
  lastPostPublishedAt?: string | null
  highlights?: string[]
  enrichedAt?: string | null
}

interface SupporterTouchpoint {
  id?: string
  source?: string | null
  occurredAt?: string | null
  summary?: string | null
  contactName?: string | null
  projectId?: string | null
}

interface SupporterRecommendation {
  id?: number | string | null
  name?: string | null
  company?: string | null
  position?: string | null
  linkedinUrl?: string | null
  matchReasons?: string[]
  alignmentScore?: number | null
  strategicValue?: string | null
  relationshipScore?: number | null
  cadence?: {
    activeSources?: string[]
    totalTouchpoints?: number
    lastInteractionDate?: string | null
    interactionsLast30Days?: number
    interactionsLast90Days?: number
    daysSinceLastInteraction?: number | null
  } | null
  insights?: SupporterInsights | null
  touchpoints?: SupporterTouchpoint[]
}

interface ProjectSupportOpportunity {
  project_id: string
  notion_project_id?: string
  project_name: string
  project_status?: string | null
  urgency_score?: number | null
  supporters?: SupporterRecommendation[]
  keyword_highlights?: string[]
  metadata?: {
    focusArea?: string | null
    stats?: unknown
  }
}

interface ProjectIntelligenceResponse {
  project: {
    id: string
    name: string
    status?: string | null
    urgencyScore?: number | null
    keywordHighlights: string[]
    upcomingMilestone?: string | null
    fundingGap?: number | null
    metadata?: Record<string, unknown>
    summary?: string | null
    goal?: string | null
    nextSteps?: string | null
    recentUpdate?: string | null
    impactHighlights?: string[]
    lastSyncedAt?: string | null
  }
  supporters: SupporterRecommendation[]
  stories: {
    id: string
    title: string
    publishedAt?: string | null
    summary?: string | null
    url?: string | null
  }[]
  touchpoints: {
    id?: string
    source?: string | null
    occurredAt?: string | null
    summary?: string | null
    contactName?: string | null
  }[]
  recommendations?: {
    linkedinTags: string[]
    actions: string[]
  }
  aiBrief: string
}

interface ProjectIntelligencePageProps {
  initialProjectId?: string | null
  onRequestCreateTask?: (options: {
    projectId: string
    projectName: string
    contactId?: string
    contactName?: string
  }) => void
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  } catch {
    return value
  }
}

function formatDateShort(value?: string | null) {
  if (!value) return null
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat('en-AU', {
      month: 'short',
      day: 'numeric'
    }).format(date)
  } catch {
    return null
  }
}

function ProjectOverview({ project, loading, error }: {
  project?: ProjectIntelligenceResponse['project']
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-brand-100 bg-brand-50/70 p-4 text-sm text-brand-700">
        Loading project intelligence…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  if (!project) {
    return (
      <div className="rounded-lg border border-dashed border-clay-200 bg-clay-50/60 p-6 text-sm text-clay-600">
        Select a project to see intelligence.
      </div>
    )
  }

  return (
    <Card padding="md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-brand-800">{project.name}</p>
          <p className="text-xs uppercase tracking-wide text-brand-600">{project.status || 'Status unknown'}</p>
        </div>
        {typeof project.urgencyScore === 'number' ? (
          <span className="rounded-md bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            Urgency score {project.urgencyScore}
          </span>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 text-xs text-brand-700 sm:grid-cols-2">
        {project.metadata?.focusArea ? (
          <div>
            <dt className="font-medium text-brand-800">Focus area</dt>
            <dd>{String(project.metadata.focusArea)}</dd>
          </div>
        ) : null}
        {project.keywordHighlights?.length ? (
          <div>
            <dt className="font-medium text-brand-800">Highlights</dt>
            <dd>{project.keywordHighlights.slice(0, 4).join(', ')}</dd>
          </div>
        ) : null}
        {project.upcomingMilestone ? (
          <div>
            <dt className="font-medium text-brand-800">Next milestone</dt>
            <dd>{formatDateShort(project.upcomingMilestone) || formatDate(project.upcomingMilestone)}</dd>
          </div>
        ) : null}
        {typeof project.fundingGap === 'number' ? (
          <div>
            <dt className="font-medium text-brand-800">Funding gap</dt>
            <dd>${project.fundingGap.toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>
      {(project.summary || project.goal || project.nextSteps || project.recentUpdate || (project.impactHighlights?.length ?? 0) > 0) ? (
        <div className="mt-4 space-y-3 text-sm text-brand-800">
          {project.summary ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Summary</p>
              <p className="mt-1 text-brand-700">{project.summary}</p>
            </div>
          ) : null}
          {project.goal ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Goal / problem</p>
              <p className="mt-1 text-brand-700">{project.goal}</p>
            </div>
          ) : null}
          {project.nextSteps ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Next steps</p>
              <p className="mt-1 text-brand-700">{project.nextSteps}</p>
            </div>
          ) : null}
          {project.recentUpdate ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Latest update</p>
              <p className="mt-1 text-brand-700">{project.recentUpdate}</p>
            </div>
          ) : null}
          {project.impactHighlights?.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Impact highlights</p>
              <ul className="mt-1 space-y-1 text-brand-700">
                {project.impactHighlights.slice(0, 4).map((highlight, index) => (
                  <li key={`${project.id}-impact-${index}`}>• {highlight}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {project.lastSyncedAt ? (
        <p className="mt-4 text-[11px] text-brand-500">Intelligence refreshed {formatDate(project.lastSyncedAt)}</p>
      ) : null}
    </Card>
  )
}

function ProjectStoriesPanel({ stories }: { stories: ProjectIntelligenceResponse['stories'] }) {
  if (!stories || stories.length === 0) return null

  return (
    <Card padding="md">
      <p className="text-sm font-semibold text-brand-800">Stories to reference</p>
      <ul className="mt-3 space-y-2 text-sm text-brand-700">
        {stories.map((story) => (
          <li key={story.id} className="rounded-md border border-brand-100 bg-brand-50/60 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-brand-500">
              <span>{story.publishedAt ? formatDateShort(story.publishedAt) || formatDate(story.publishedAt) : 'Unpublished'}</span>
              {story.url ? (
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-700 hover:text-brand-900"
                >
                  Open ↗
                </a>
              ) : null}
            </div>
            <p className="mt-1 font-medium text-brand-800">{story.title}</p>
            {story.summary ? (
              <p className="mt-1 text-sm text-brand-700">{story.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ProjectTouchpointsPanel({ touchpoints }: { touchpoints: ProjectIntelligenceResponse['touchpoints'] }) {
  if (!touchpoints || touchpoints.length === 0) return null

  return (
    <Card padding="md">
      <p className="text-sm font-semibold text-brand-800">Recent activity (Gmail & Calendar)</p>
      <ul className="mt-3 space-y-2 text-sm text-brand-700">
        {touchpoints.map((tp) => (
          <li key={tp.id || `${tp.source}-${tp.occurredAt}`} className="rounded-md border border-brand-100 bg-brand-50/60 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-brand-500">
              <span>{tp.occurredAt ? formatDateShort(tp.occurredAt) || formatDate(tp.occurredAt) : 'Recent'}</span>
              <span>{tp.source ? tp.source.toUpperCase() : 'Touchpoint'}</span>
            </div>
            <p className="mt-1 font-medium text-brand-800">{tp.contactName || 'Stakeholder'}</p>
            {tp.summary ? (
              <p className="mt-1 text-sm text-brand-700">{tp.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function ProjectIntelligencePage({ initialProjectId, onRequestCreateTask }: ProjectIntelligencePageProps) {
  const [projects, setProjects] = useState<ProjectSupportOpportunity[]>([])
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectSupportOpportunity | null>(null)
  const [intelligence, setIntelligence] = useState<ProjectIntelligenceResponse | null>(null)
  const [loadingIntel, setLoadingIntel] = useState(false)
  const [intelError, setIntelError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = (await api.getProjectSupport(200)) as ProjectSupportOpportunity[]
        setProjects(data || [])
      } catch (error) {
        console.error('Failed to load project opportunities', error)
      }
    }
    loadProjects()
  }, [])

  useEffect(() => {
    if (!projects.length) return
    const params = new URLSearchParams(window.location.search)
    const projectParam = params.get('project') || initialProjectId || null
    const project = projectParam ? projects.find((p) => p.project_id === projectParam) : projects[0]
    if (project) {
      handleSelectProject(project)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects])

  useEffect(() => {
    if (!projects.length || !initialProjectId) return
    const project = projects.find((p) => p.project_id === initialProjectId)
    if (project && project.project_id !== selectedProject?.project_id) {
      handleSelectProject(project)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId, projects])

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return projects
    return projects.filter((project) => {
      const name = project.project_name?.toLowerCase() || ''
      const status = project.project_status?.toLowerCase() || ''
      const focus = project.metadata?.focusArea?.toString()?.toLowerCase() || ''
      return name.includes(term) || status.includes(term) || focus.includes(term)
    })
  }, [projects, search])

  const handleSelectProject = async (project: ProjectSupportOpportunity) => {
    setSelectedProject(project)
    setIntelligence(null)
    setIntelError(null)
    setLoadingIntel(true)
    try {
      const data = (await api.getProjectIntelligence(project.project_id)) as ProjectIntelligenceResponse
      setIntelligence(data)
      const params = new URLSearchParams(window.location.search)
      params.set('project', project.project_id)
      params.set('tab', 'intelligence')
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    } catch (error) {
      console.error('Failed to load project intelligence', error)
      setIntelError('Failed to load project intelligence. Try again later.')
    } finally {
      setLoadingIntel(false)
    }
  }

  const handleCreateTask = () => {
    if (!selectedProject || !intelligence) return
    const topSupporter = intelligence.supporters?.[0]
    onRequestCreateTask?.({
      projectId: selectedProject.project_id,
      projectName: selectedProject.project_name,
      contactId: topSupporter?.id ? String(topSupporter.id) : undefined,
      contactName: topSupporter?.name || undefined
    })
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Intelligence"
        title="Project Intelligence Workspace"
        description="Explore active projects, see live supporter signals, and launch high-context outreach."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-brand-700">
          <span className="rounded-full bg-brand-50 px-2 py-1 font-medium text-brand-800">{projects.length}</span>
          <span>projects synced from Notion</span>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, focus area, or status"
          className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-80"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              const isActive = selectedProject?.project_id === project.project_id
              return (
                <button
                  key={project.project_id}
                  type="button"
                  onClick={() => handleSelectProject(project)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? 'border-brand-400 bg-white shadow-sm'
                      : 'border-clay-200 bg-white hover:border-brand-200 hover:shadow-sm'
                  }`}
                >
                  <p className="text-sm font-semibold text-brand-800">{project.project_name}</p>
                  <p className="mt-1 text-xs text-brand-600">{project.metadata?.focusArea || 'Focus area pending'}</p>
                  <p className="mt-2 text-[11px] text-brand-500">
                    {project.project_status || 'Status unknown'} • {project.urgency_score !== null && project.urgency_score !== undefined ? `Urgency ${project.urgency_score}` : 'Urgency pending'}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {selectedProject ? (
                <p className="text-sm font-medium text-brand-700">
                  {selectedProject.project_name}
                </p>
              ) : (
                <p className="text-sm text-brand-500">Select a project to view intelligence.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCreateTask}
                disabled={!selectedProject || !intelligence}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-400"
              >
                Create outreach task
              </button>
              {intelligence?.aiBrief ? (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(intelligence.aiBrief || '')}
                  className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  Copy AI brief
                </button>
              ) : null}
            </div>
          </div>

          <ProjectOverview project={intelligence?.project} loading={loadingIntel} error={intelError} />

          {!loadingIntel && !intelError && intelligence ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <ProjectStoriesPanel stories={intelligence.stories} />
              <ProjectTouchpointsPanel touchpoints={intelligence.touchpoints} />
            </div>
          ) : null}

          {!loadingIntel && intelligence?.recommendations ? (
            <Card padding="md" className="space-y-2">
              {intelligence.recommendations.linkedinTags?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Tags & mentions</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-brand-700">
                    {intelligence.recommendations.linkedinTags.map((tag, index) => (
                      <span key={`tag-${index}`} className="rounded-full bg-brand-50 px-2 py-1 font-medium text-brand-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {intelligence.recommendations.actions?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Recommended actions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-700">
                    {intelligence.recommendations.actions.map((action, index) => (
                      <li key={`action-${index}`}>{action}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ) : null}

          {!loadingIntel && intelligence?.supporters?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {intelligence.supporters.map((supporter) => {
                const highlights = supporter.insights?.highlights?.filter(Boolean) ?? []
                const linkedinHighlights = highlights.slice(0, 3)
                const lastPostTitle = supporter.insights?.lastPostTitle || null
                const lastPostUrl = supporter.insights?.lastPostUrl || null
                const lastPostDate = formatDateShort(supporter.insights?.lastPostPublishedAt)
                const rawHeadline = supporter.insights?.headline || null
                const supporterPosition = supporter.position || ''
                const showHeadline = Boolean(
                  rawHeadline && rawHeadline.toLowerCase() !== supporterPosition.toLowerCase()
                )
                const topTouchpoint = supporter.touchpoints?.[0]

                return (
                  <Card key={`${supporter.id ?? supporter.name ?? supporter.company}`} padding="md" className="flex h-full flex-col justify-between">
                    <div>
                      <div className="font-semibold text-brand-900">
                        {supporter.name || 'Unnamed contact'}
                        {supporter.company ? <span className="text-xs text-clay-500"> • {supporter.company}</span> : null}
                      </div>
                      {showHeadline ? (
                        <p className="mt-0.5 text-xs text-brand-700">{rawHeadline}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-brand-700">
                        Alignment {supporter.alignmentScore ?? '—'} • Relationship {supporter.relationshipScore !== undefined ? Math.round((supporter.relationshipScore ?? 0) * 100) : '—'}
                      </p>
                      {supporter.matchReasons?.length ? (
                        <ul className="mt-1 space-y-1 text-xs text-clay-500">
                          {supporter.matchReasons.slice(0, 3).map((reason, idx) => (
                            <li key={`${supporter.id ?? idx}-reason-${idx}`}>• {reason}</li>
                          ))}
                        </ul>
                      ) : null}
                      {topTouchpoint ? (
                        <div className="mt-2 rounded-md border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-brand-700">
                          <p className="font-medium text-brand-800">Recent interaction</p>
                          <p className="mt-1">{topTouchpoint.summary || 'Touchpoint logged'} ({topTouchpoint.source || 'activity'})</p>
                          <p className="mt-1 text-[11px] text-brand-500">{topTouchpoint.occurredAt ? formatDateShort(topTouchpoint.occurredAt) || formatDate(topTouchpoint.occurredAt) : 'recent'}</p>
                        </div>
                      ) : null}
                      {(linkedinHighlights.length > 0 || lastPostTitle) ? (
                        <div className="mt-2 rounded-md border border-brand-100 bg-brand-50/60 px-3 py-2">
                          {linkedinHighlights.length ? (
                            <ul className="space-y-1 text-xs text-brand-800">
                              {linkedinHighlights.map((highlight, idx) => (
                                <li key={`${supporter.id ?? idx}-highlight-${idx}`}>• {highlight}</li>
                              ))}
                            </ul>
                          ) : null}
                          {lastPostTitle ? (
                            <div className="mt-2 border-t border-brand-100 pt-2 text-xs text-brand-700">
                              <p className="font-medium text-brand-800">Latest activity</p>
                              <p className="mt-1 text-brand-700">{lastPostTitle}</p>
                              <div className="mt-1 flex items-center justify-between text-[11px] text-brand-600">
                                {lastPostDate ? <span>{lastPostDate}</span> : <span className="italic text-brand-500">recent</span>}
                                {lastPostUrl ? (
                                  <a
                                    href={lastPostUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-brand-700 hover:text-brand-900"
                                  >
                                    Open update ↗
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {supporter.linkedinUrl ? (
                      <a
                        href={supporter.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
                      >
                        Visit profile ↗
                      </a>
                    ) : null}
                  </Card>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
