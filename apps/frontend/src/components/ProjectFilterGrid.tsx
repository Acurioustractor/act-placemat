import { useEffect, useMemo, useState } from 'react'
import { resolveApiUrl } from '../config/env'
import type { Project, RocketBoosterStage } from '../types/project'
import { getProjectStage, stageLabels } from '../utils/projectStage'
import { Card } from './ui/Card'
import { DEMO_PROJECTS } from '../data/demoProjects'

interface FilterState {
  stage: 'all' | RocketBoosterStage
  area: 'all' | string
  theme: 'all' | string
  search: string
}

const stageOptions: { value: 'all' | RocketBoosterStage; label: string }[] = [
  { value: 'all', label: 'All stages' },
  ...Object.entries(stageLabels).map(([value, label]) => ({
    value: value as RocketBoosterStage,
    label,
  })),
]

interface ProjectFilterGridProps {
  onProjectSelect?: (project: Project) => void
}

export function ProjectFilterGrid({ onProjectSelect }: ProjectFilterGridProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [usingDemo, setUsingDemo] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    stage: 'all',
    area: 'all',
    theme: 'all',
    search: '',
  })

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/real/projects'))
        if (!response.ok) throw new Error('Failed to load projects')
        const data = await response.json()
        const fetched = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : []
        if (fetched.length) {
          setProjects(fetched)
          setUsingDemo(false)
        } else {
          setProjects(DEMO_PROJECTS)
          setUsingDemo(true)
        }
      } catch (error) {
        console.error('Project filter grid failed to load', error)
        setProjects(DEMO_PROJECTS)
        setUsingDemo(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const areas = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((project) => {
      if (project.area) set.add(project.area)
    })
    return Array.from(set).sort()
  }, [projects])

  const themes = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((project) => (project.themes || []).forEach((theme) => set.add(theme)))
    return Array.from(set).sort()
  }, [projects])

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const projectStage = getProjectStage(project)
      const matchesStage = filters.stage === 'all' || projectStage === filters.stage
      const matchesArea = filters.area === 'all' || project.area === filters.area
      const matchesTheme =
        filters.theme === 'all' ||
        (project.themes || []).map((theme) => theme.toLowerCase()).includes(filters.theme.toLowerCase())
      const matchesSearch =
        filters.search.length === 0 ||
        project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (project.aiSummary || '').toLowerCase().includes(filters.search.toLowerCase())
      return matchesStage && matchesArea && matchesTheme && matchesSearch
    })
  }, [projects, filters])

  if (loading) {
    return (
      <Card padding="lg" className="bg-white border border-clay-200">
        <p>Loading projects…</p>
      </Card>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Pattern Finder</p>
          <h3 className="text-2xl font-bold text-clay-900">Project Explorer</h3>
          <p className="text-sm text-clay-600">Filter by stage, area, or theme to see emerging clusters.</p>
        </div>
        <div className="text-sm text-clay-600 flex items-center gap-3">
          <span>{filtered.length} of {projects.length} shown</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              usingDemo
                ? 'border border-amber-200 bg-amber-50 text-amber-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {usingDemo ? 'Demo snapshot' : 'Live Notion data'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 text-sm">
          <input
            type="text"
            placeholder="Search projects or summaries"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="flex-1 min-w-[240px] bg-white border border-clay-200 rounded-full px-4 py-2 focus:ring-2 ring-brand-200 outline-none"
          />
          <select
            value={filters.stage}
            onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value as FilterState['stage'] }))}
            className="bg-white border border-clay-200 rounded-full px-4 py-2 focus:ring-2 ring-brand-200 outline-none"
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.area}
            onChange={(e) => setFilters((prev) => ({ ...prev, area: e.target.value as FilterState['area'] }))}
            className="bg-white border border-clay-200 rounded-full px-4 py-2 focus:ring-2 ring-brand-200 outline-none"
          >
            <option value="all">All areas</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          <select
            value={filters.theme}
            onChange={(e) => setFilters((prev) => ({ ...prev, theme: e.target.value as FilterState['theme'] }))}
            className="bg-white border border-clay-200 rounded-full px-4 py-2 focus:ring-2 ring-brand-200 outline-none"
          >
            <option value="all">All themes</option>
            {themes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
      </div>

      <div className="overflow-x-auto border border-clay-200 rounded-2xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-clay-50 text-clay-600 uppercase text-xs tracking-[0.2em]">
            <tr>
              <th className="text-left px-4 py-3">Project</th>
              <th className="text-left px-4 py-3">Stage</th>
              <th className="text-left px-4 py-3">Area</th>
              <th className="text-left px-4 py-3">Themes</th>
              <th className="text-left px-4 py-3">Autonomy</th>
              <th className="text-left px-4 py-3">Next milestone</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((project) => (
              <tr key={project.id} className="border-t border-clay-100 hover:bg-clay-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-clay-900">{project.name}</p>
                  <p className="text-xs text-clay-500">{project.aiSummary || project.description}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-3 py-1 rounded-full bg-clay-100 text-xs font-semibold text-clay-700">
                    {stageLabels[getProjectStage(project)]}
                  </span>
                </td>
                <td className="px-4 py-3">{project.area || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(project.themes || []).map((theme) => (
                      <span key={theme} className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs">
                        {theme}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-ocean-700">
                  {project.autonomyScore !== undefined ? `${project.autonomyScore}/100` : 'Not set'}
                </td>
                <td className="px-4 py-3 text-amber-700">
                  {project.nextMilestoneDate ? new Date(project.nextMilestoneDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onProjectSelect?.(project)}
                    className="rounded-full border border-clay-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    View detail
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-clay-500">
                  No projects match this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
