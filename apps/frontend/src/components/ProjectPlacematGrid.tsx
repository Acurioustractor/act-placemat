import { useEffect, useMemo, useState } from 'react'
import { resolveApiUrl } from '../config/env'
import type { Project } from '../types/project'
import { getProjectStage, stageLabels } from '../utils/projectStage'
import { Card } from './ui/Card'

interface ProjectPlacematGridProps {
  onProjectSelect?: (project: Project) => void
}

type FilterValue = 'all' | string

const statusLabel = (status?: string) => status?.trim() || 'Not set'

const shortText = (text?: string, length = 140) => {
  if (!text) return 'No overview captured yet.'
  if (text.length <= length) return text
  return `${text.slice(0, length).trim()}…`
}

export function ProjectPlacematGrid({ onProjectSelect }: ProjectPlacematGridProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all')
  const [themeFilter, setThemeFilter] = useState<FilterValue>('all')
  const [areaFilter, setAreaFilter] = useState<FilterValue>('all')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/real/projects'))
        if (!response.ok) throw new Error('Failed to load projects')
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Placemat grid failed to load', error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const filterOptions = useMemo(() => {
    const statuses = new Set<string>()
    const themes = new Set<string>()
    const areas = new Set<string>()
    projects.forEach((p) => {
      if (p.status) statuses.add(statusLabel(p.status))
      ;(p.themes || []).forEach((t) => themes.add(t))
      if (p.area) areas.add(p.area)
    })
    return {
      statuses: Array.from(statuses),
      themes: Array.from(themes),
      areas: Array.from(areas),
    }
  }, [projects])

  const filteredProjects = useMemo(() => {
    const trimmed = search.trim().toLowerCase()
    return projects
      .filter((project) => {
        if (statusFilter !== 'all' && statusLabel(project.status) !== statusFilter) return false
        if (themeFilter !== 'all' && !(project.themes || []).includes(themeFilter)) return false
        if (areaFilter !== 'all' && project.area !== areaFilter) return false
        if (!trimmed) return true
        return (
          project.name?.toLowerCase().includes(trimmed) ||
          project.aiSummary?.toLowerCase().includes(trimmed) ||
          project.description?.toLowerCase().includes(trimmed) ||
          (project.themes || []).some((theme) => theme.toLowerCase().includes(trimmed))
        )
      })
      .sort((a, b) => {
        const aDate = a.notionLastEditedAt || a.updatedAt || a.notionCreatedAt || ''
        const bDate = b.notionLastEditedAt || b.updatedAt || b.notionCreatedAt || ''
        return bDate.localeCompare(aDate)
      })
  }, [projects, statusFilter, themeFilter, areaFilter, search])

  const stageTag = (project: Project) => stageLabels[getProjectStage(project)]

  if (loading) {
    return (
      <Card padding="lg">
        <p className="text-center text-clay-500">Loading placemat…</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Placemat</p>
          <h2 className="text-xl font-bold text-clay-900">Grid view — themes, tags, and snapshots</h2>
          <p className="text-sm text-clay-500">Browse every project like a photo wall; click for a thoughtful story view.</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-clay-500 bg-white border border-clay-200 rounded-full px-3 py-1">
            {projects.length} projects
          </span>
          <span className="text-xs text-clay-500 bg-white border border-clay-200 rounded-full px-3 py-1">
            {filteredProjects.length} shown
          </span>
        </div>
      </div>

      <Card padding="lg" className="bg-white border border-clay-200">
        <div className="grid gap-3 md:grid-cols-[1fr,1fr,1fr,2fr] items-center">
          <label className="text-sm text-clay-700 flex flex-col gap-1">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterValue)}
              className="rounded-xl border border-clay-200 px-3 py-2 bg-clay-50 focus:border-brand-300 focus:outline-none"
            >
              <option value="all">All</option>
              {filterOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-clay-700 flex flex-col gap-1">
            Theme
            <select
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value as FilterValue)}
              className="rounded-xl border border-clay-200 px-3 py-2 bg-clay-50 focus:border-brand-300 focus:outline-none"
            >
              <option value="all">All</option>
              {filterOptions.themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-clay-700 flex flex-col gap-1">
            Area
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value as FilterValue)}
              className="rounded-xl border border-clay-200 px-3 py-2 bg-clay-50 focus:border-brand-300 focus:outline-none"
            >
              <option value="all">All</option>
              {filterOptions.areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-clay-700 flex flex-col gap-1">
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, summary, theme…"
              className="rounded-xl border border-clay-200 px-3 py-2 bg-white focus:border-brand-300 focus:outline-none"
            />
          </label>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filteredProjects.map((project) => {
          const themes = project.themes || []
          const coverTone = themes[0] ? 'bg-gradient-to-br from-brand-50 to-ocean-50' : 'bg-clay-50'
          return (
            <button
              key={project.id}
              className={`group text-left rounded-2xl border border-clay-200 shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition overflow-hidden ${coverTone}`}
              onClick={() => setSelectedProject(project)}
            >
              <div className="p-4 space-y-3 bg-white/80 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-brand-600">{stageTag(project)}</p>
                    <h3 className="text-lg font-bold text-clay-900 leading-tight line-clamp-2">{project.name}</h3>
                    <p className="text-xs text-clay-500">
                      {project.area || 'Area not set'} • {statusLabel(project.status)}
                    </p>
                  </div>
                  <span className="rounded-full border border-clay-200 px-3 py-1 text-xs font-semibold text-clay-700">
                    {(project.notionLastEditedAt || project.updatedAt || '').slice(0, 10) || 'Fresh'}
                  </span>
                </div>
                <p className="text-sm text-clay-700 line-clamp-3">{shortText(project.aiSummary || project.description)}</p>
                <div className="flex flex-wrap gap-2">
                  {themes.slice(0, 3).map((theme) => (
                    <span
                      key={theme}
                      className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-800 border border-brand-100"
                    >
                      {theme}
                    </span>
                  ))}
                  {themes.length === 0 && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-clay-50 text-clay-500 border border-clay-100">
                      Theme not set
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card padding="lg">
          <p className="text-center text-clay-500">No projects match that filter set.</p>
        </Card>
      )}

      {selectedProject && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-end z-50">
          <div className="h-full w-full max-w-2xl bg-white shadow-2xl border-l border-clay-200 overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-600">Project</p>
                  <h3 className="text-2xl font-bold text-clay-900 leading-tight">{selectedProject.name}</h3>
                  <div className="flex flex-wrap gap-2 text-sm text-clay-600">
                    <span className="rounded-full bg-brand-50 text-brand-800 border border-brand-100 px-3 py-1 font-semibold">
                      {stageTag(selectedProject)}
                    </span>
                    <span className="rounded-full bg-clay-50 text-clay-700 border border-clay-200 px-3 py-1 font-semibold">
                      {statusLabel(selectedProject.status)}
                    </span>
                    {(selectedProject.themes || []).map((theme) => (
                      <span
                        key={theme}
                        className="rounded-full bg-ocean-50 text-ocean-800 border border-ocean-100 px-3 py-1 font-semibold"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-clay-500">
                    {selectedProject.area || 'Area not set'} •{' '}
                    {selectedProject.relatedPlaces?.[0]?.displayName || 'Place not set'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="rounded-full border border-clay-200 px-4 py-2 text-sm font-semibold text-clay-700 hover:bg-clay-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => onProjectSelect?.(selectedProject)}
                    className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Open in Projects tab
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card padding="md" className="bg-clay-50 border-clay-100 h-full">
                  <h4 className="text-sm font-semibold text-clay-900 mb-2">Overview</h4>
                  <p className="text-sm text-clay-700 leading-relaxed">
                    {selectedProject.aiSummary || selectedProject.description || 'No overview documented yet.'}
                  </p>
                </Card>
                <Card padding="md" className="bg-white border-clay-100 h-full">
                  <h4 className="text-sm font-semibold text-clay-900 mb-2">Impact focus</h4>
                  <ul className="text-sm text-clay-700 space-y-1">
                    <li>
                      <span className="font-semibold text-clay-900">Area:</span> {selectedProject.area || 'Not set'}
                    </li>
                    <li>
                      <span className="font-semibold text-clay-900">Themes:</span>{' '}
                      {(selectedProject.themes || []).join(', ') || 'Not set'}
                    </li>
                    <li>
                      <span className="font-semibold text-clay-900">Core values:</span>{' '}
                      {(selectedProject.coreValues || []).join(', ') || 'Not set'}
                    </li>
                    <li>
                      <span className="font-semibold text-clay-900">Relationship pillars:</span>{' '}
                      {(selectedProject.relationshipPillars || []).join(', ') || 'Not set'}
                    </li>
                  </ul>
                </Card>
              </div>

              <Card padding="md" className="bg-white border-clay-100">
                <h4 className="text-sm font-semibold text-clay-900 mb-2">What we're working toward</h4>
                <div className="text-sm text-clay-700 space-y-1">
                  <p>
                    <span className="font-semibold text-clay-900">Status:</span> {statusLabel(selectedProject.status)}
                  </p>
                  <p>
                    <span className="font-semibold text-clay-900">Next milestone:</span>{' '}
                    {selectedProject.nextMilestoneDate
                      ? new Date(selectedProject.nextMilestoneDate).toLocaleDateString()
                      : 'Not set'}
                  </p>
                  <p>
                    <span className="font-semibold text-clay-900">Last edited:</span>{' '}
                    {(selectedProject.notionLastEditedAt || selectedProject.updatedAt || '').slice(0, 16) || 'Unknown'}
                  </p>
                  <p>
                    <span className="font-semibold text-clay-900">Lead:</span> {selectedProject.lead || 'Not set'}
                  </p>
                </div>
              </Card>

              <Card padding="md" className="bg-clay-50 border-clay-100">
                <h4 className="text-sm font-semibold text-clay-900 mb-2">How it works</h4>
                <p className="text-sm text-clay-700 leading-relaxed">
                  {selectedProject.description ||
                    selectedProject.aiSummary ||
                    'Operational detail not captured yet — add delivery steps, rhythms, and collaborators to this project page to make it actionable.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-3 text-xs text-clay-600">
                  {selectedProject.relatedOrganisations?.slice(0, 5).map((org) => (
                    <span key={org} className="px-3 py-1 rounded-full bg-white border border-clay-200">
                      {org}
                    </span>
                  ))}
                  {selectedProject.relatedPeople?.slice(0, 5).map((person) => (
                    <span key={person} className="px-3 py-1 rounded-full bg-white border border-clay-200">
                      {person}
                    </span>
                  ))}
                  {selectedProject.relatedPlaces?.slice(0, 3).map((place) => (
                    <span key={place.displayName} className="px-3 py-1 rounded-full bg-white border border-clay-200">
                      {place.displayName}
                    </span>
                  ))}
                </div>
              </Card>

              {selectedProject.notionUrl && (
                <Card padding="md" className="bg-white border-brand-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-clay-900">Notion source</h4>
                      <p className="text-xs text-clay-600">Open the original page for full context and editing.</p>
                    </div>
                    <a
                      href={selectedProject.notionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700"
                    >
                      Open Notion
                    </a>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
