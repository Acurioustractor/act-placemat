import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { CommunityLaborValueCard } from './CommunityLaborValueCard'
import { StorytellingScaleCard } from './StorytellingScaleCard'
import { GrantDependencyIndicator } from './GrantDependencyIndicator'
import { ProjectTypeBadge } from './ProjectTypeBadge'
import { Card } from './ui/Card'
import type { Project as FullProject } from '../types/project'
import { getProjectStage, stageLabels } from '../utils/projectStage'

interface ProjectDetailProps {
  projectId: string
  onBack: () => void
}

// Use the full Project type from types/project.ts
type Project = FullProject

const STAGE_QUESTIONS: Record<string, string> = {
  launch: 'What would make ACT unnecessary in the next 6 months?',
  orbit: 'Who is taking full control this quarter and what do they need?',
  cruising: 'What blockers remain before complete handover?',
  landed: 'How are we resourcing this community to teach others?',
  obsolete: 'Which new communities can reuse this blueprint?',
}

interface ResearchEntry {
  id: string
  source: string
  summary?: string
  url?: string
  created_at: string
}

interface PairingEntry {
  id: string
  project_id: string
  partner_project_id: string
  reason?: string
  similarity?: number
}

interface GeoAlertEntry {
  id: string
  region: string
  severity: string
  stage?: string
  recommendation?: string
  projects?: Array<{ name?: string; stage?: string }>
  triggered_at: string
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [researchEntries, setResearchEntries] = useState<ResearchEntry[]>([])
  const [pairings, setPairings] = useState<PairingEntry[]>([])
  const [geoAlerts, setGeoAlerts] = useState<GeoAlertEntry[]>([])
  const [intelligenceLoading, setIntelligenceLoading] = useState(true)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  useEffect(() => {
    if (project) {
      fetchIntelligence(project)
    }
  }, [project])

  const loadProjectData = async () => {
    try {
      setLoading(true)

      // Load project details
      const projectsResponse = await api.getProjects()
      const list = projectsResponse.projects || []
      const foundProject = list.find((p: Project) => p.id === projectId)
      setAllProjects(list)
      setProject(foundProject || null)

    } catch (error) {
      console.error('Failed to load project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchIntelligence = async (project: Project) => {
    try {
      setIntelligenceLoading(true)
      const [researchRes, pairingsRes, alertsRes] = await Promise.all([
        fetch(`/api/intelligence/project-research/${project.id}`),
        fetch(`/api/intelligence/project-pairings?project_id=${project.id}`),
        fetch('/api/intelligence/geo-alerts'),
      ])

      if (researchRes.ok) {
        const data = await researchRes.json()
        setResearchEntries(data?.items || [])
      } else {
        setResearchEntries([])
      }

      if (pairingsRes.ok) {
        const data = await pairingsRes.json()
        setPairings(data?.items || [])
      } else {
        setPairings([])
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json()
        const entries: GeoAlertEntry[] = data?.items || []
        const filtered = entries.filter((alert) =>
          (alert.projects || []).some((p) => p?.name?.toLowerCase().includes(project.name.toLowerCase())),
        )
        setGeoAlerts(filtered)
      } else {
        setGeoAlerts([])
      }
    } catch (error) {
      console.error('Failed to load intelligence data', error)
      setResearchEntries([])
      setPairings([])
      setGeoAlerts([])
    } finally {
      setIntelligenceLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-lg text-slate-600 mb-4">Project not found</p>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (value?: number) => {
    if (!value) return '$0'
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Handle places - they can be objects or strings (for backwards compatibility)
  const rawPlaces = ((project.relatedPlaces as unknown as any[]) || []).filter((p) => p)
  const places = rawPlaces
    .map((p) => {
      if (typeof p === 'string') {
        return { indigenousName: p, westernName: null, displayName: p }
      }
      return p
    })
    .filter((p) => p && (p.displayName || p.indigenousName))

  const partners = (project.relatedOrganisations || []).filter((p) => p && p !== '0')
  const people = (project.relatedPeople || []).filter((p) => p && p !== '0')
  const themes = project.themes || project.tags || []
  const coreValues = Array.isArray(project.coreValues) ? project.coreValues : project.coreValues ? [project.coreValues] : []

  // Use location as fallback for places if we don't have place names
  const displayPlaces = places.length > 0 ? places : (project.location ? [{ indigenousName: project.location, westernName: null, displayName: project.location }] : [])
  const projectStage = getProjectStage(project)
  const stageQuestion = STAGE_QUESTIONS[projectStage]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header with Cover Image */}
      <div className="relative h-80 bg-gradient-to-br from-brand-600 to-ocean-600">
        {project.coverImage && (
          <img
            src={project.coverImage}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={onBack}
              className="mb-6 text-white/90 hover:text-white font-medium flex items-center gap-2 transition-colors"
            >
              ← Back to Projects
            </button>

            {/* Location and partners */}
            <div className="flex items-center gap-3 text-white/80 text-sm mb-3 flex-wrap">
              {project.projectType && (
                <>
                  <ProjectTypeBadge type={project.projectType} size="md" />
                  <span>•</span>
                </>
              )}
              {displayPlaces.length > 0 && (
                <>
                  <span>📍</span>
                  <span>{displayPlaces.slice(0, 2).map(p => p.displayName).join(', ')}</span>
                </>
              )}
              {displayPlaces.length > 0 && partners.length > 0 && <span>•</span>}
              {partners.length > 0 && (
                <span>{partners.length} {partners.length === 1 ? 'partner' : 'partners'}</span>
              )}
            </div>

            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">{project.name}</h1>
            {project.status && (
              <div className="text-white/90 text-lg font-medium">{project.status}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Story Flow */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-10">
          {/* The Story */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-clay-900 mb-6">The Story</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-clay-700 leading-relaxed whitespace-pre-wrap">
                {project.aiSummary || project.description || 'This project is taking shape. More context coming soon.'}
              </p>
            </div>
          </section>

          {/* Alignment */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-clay-900 mb-6">Alignment &amp; Focus</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card padding="lg" className="bg-gradient-to-br from-brand-50 to-ocean-50">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Stage</p>
                <p className="text-2xl font-bold text-clay-900 mt-2">{stageLabels[projectStage]}</p>
                {stageQuestion && <p className="text-sm text-clay-700 mt-3">{stageQuestion}</p>}
              </Card>
              <Card padding="lg">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay-500">Autonomy &amp; Handover</p>
                <p className="text-2xl font-bold text-ocean-700 mt-2">
                  {project.autonomyScore !== undefined ? `${project.autonomyScore}/100` : 'Not set'}
                </p>
                <p className="text-sm text-clay-600 mt-2">
                  Handover timeline: {project.handoverTimeline || 'Not documented'}
                </p>
              </Card>
              <Card padding="lg">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-clay-500">Themes &amp; Area</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {themes.length ? (
                    themes.map((theme) => (
                      <span key={theme} className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-800">
                        {theme}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-clay-400">No themes tagged</span>
                  )}
                </div>
                {project.area && <p className="text-sm text-clay-600 mt-3">Area: {project.area}</p>}
              </Card>
            </div>
          </section>

          {/* Intelligence signals */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <h2 className="text-2xl font-bold text-clay-900">Intelligence Signals</h2>
              {intelligenceLoading && <p className="text-sm text-clay-500">Refreshing...</p>}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-clay-900 mb-3">Research references</p>
                <div className="space-y-3">
                  {researchEntries.length ? (
                    researchEntries.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-clay-100 p-3">
                        <p className="text-sm font-semibold text-clay-900">{entry.source}</p>
                        <p className="text-xs text-clay-500 mb-2">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-clay-700">{entry.summary || 'Research summary pending.'}</p>
                        {entry.url && (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-brand-700 hover:underline"
                          >
                            View source
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-clay-500">No research annotations yet. Run the Research Agent to add some.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-clay-900 mb-3">Mentor &amp; pairing suggestions</p>
                <div className="space-y-3">
                  {pairings.length ? (
                    pairings.map((pair) => {
                      const counterpartId = pair.project_id === project.id ? pair.partner_project_id : pair.project_id
                      const counterpartName = allProjects.find((p) => p.id === counterpartId)?.name || counterpartId
                      return (
                        <div key={pair.id} className="rounded-xl border border-clay-100 p-3">
                          <p className="text-sm font-semibold text-clay-900">{counterpartName}</p>
                          <p className="text-xs text-clay-500">
                            {pair.reason || 'Suggested collaboration opportunity'}
                          </p>
                          {typeof pair.similarity === 'number' && (
                            <p className="text-xs text-clay-400">Similarity {Math.round(pair.similarity * 100)}%</p>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-clay-500">No mentor matches yet. Run Pattern Hunter to generate suggestions.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-clay-900">Geo Sentinel alerts</p>
              {geoAlerts.length ? (
                geoAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-clay-100 p-3">
                    <p className="text-sm font-semibold text-clay-900">{alert.region}</p>
                    <p className="text-xs text-clay-500">
                      {alert.stage || 'Any stage'} • {alert.severity} severity
                    </p>
                    <p className="text-sm text-clay-700 mt-1">{alert.recommendation || 'Review Geo view for more context.'}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-clay-500">No active geo alerts for this project.</p>
              )}
            </div>
          </section>

          {/* THE IMPACT - Infrastructure Metrics */}
          {(project.communityLaborMetrics || project.storytellingMetrics || project.grantDependencyMetrics) && (
            <section className="space-y-6">
              <h2 className="text-3xl font-bold text-clay-900">The Impact</h2>

              <div className="space-y-6">
                {/* Community Labor Value */}
                {project.communityLaborMetrics && (
                  <CommunityLaborValueCard
                    metrics={project.communityLaborMetrics}
                    projectName={project.name}
                  />
                )}

                {/* Storytelling Scale */}
                {project.storytellingMetrics && (
                  <StorytellingScaleCard
                    metrics={project.storytellingMetrics}
                    projectName={project.name}
                  />
                )}

                {/* Grant Dependency */}
                {project.grantDependencyMetrics && (
                  <GrantDependencyIndicator
                    metrics={project.grantDependencyMetrics}
                    projectName={project.name}
                  />
                )}
              </div>
            </section>
          )}

          {/* The Relationships */}
          {(partners.length > 0 || people.length > 0) && (
            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-clay-900 mb-6">The Relationships</h2>
              <div className="space-y-5">
                {partners.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-clay-500 mb-2">Partners</h3>
                    <div className="flex flex-wrap gap-2">
                      {partners.map((partner, idx) => (
                        <span key={idx} className="px-4 py-2 bg-brand-50 text-brand-800 rounded-lg text-sm font-medium">
                          {partner}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {people.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-clay-500 mb-2">People Involved</h3>
                    <p className="text-clay-700">
                      {people.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* The Place */}
          {displayPlaces.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-clay-900 mb-6">The Place</h2>
              <div className="space-y-4">
                {displayPlaces.map((place, idx) => (
                  <div key={idx} className="border-l-4 border-brand-500 pl-4">
                    <div className="text-lg font-semibold text-clay-900">
                      {place.indigenousName}
                    </div>
                    {place.westernName && (
                      <div className="text-sm text-clay-600 mt-1">
                        Also known as: {place.westernName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* The Approach */}
          {(coreValues.length > 0 || themes.length > 0) && (
            <section className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-clay-900 mb-6">The Approach</h2>
              <div className="space-y-5">
                {coreValues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-clay-500 mb-3">What Guides This Work</h3>
                    <div className="flex flex-wrap gap-3">
                      {coreValues.map((value, idx) => (
                        <span key={idx} className="px-4 py-2 bg-brand-100 text-brand-900 rounded-full text-base font-medium">
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {themes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-clay-500 mb-3">What It Touches</h3>
                    <div className="flex flex-wrap gap-2">
                      {themes.map((theme, idx) => (
                        <span key={idx} className="px-3 py-2 bg-ocean-50 text-ocean-800 rounded-lg text-sm">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Living Notes - placeholder for future implementation */}
          <section className="bg-gradient-to-br from-clay-50 to-ocean-50 rounded-xl shadow-sm p-8 border border-clay-200">
            <h2 className="text-2xl font-bold text-clay-900 mb-3">Living Notes</h2>
            <p className="text-clay-600 text-sm mb-4">Running context and recent developments</p>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📝</div>
                <div className="flex-1">
                  <p className="text-sm text-clay-500 mb-1">Notes feature coming soon</p>
                  <p className="text-clay-600 text-sm">
                    This space will show timestamped updates, observations, and context that matters as the project evolves.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
