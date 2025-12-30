import { useEffect, useMemo, useState } from 'react'
import { resolveApiUrl } from '../config/env'
import type { Project, RocketBoosterStage } from '../types/project'
import { getDefaultAutonomy, getProjectStage, stageBrightness, stageColors, stageLabels } from '../utils/projectStage'
import { DEMO_PROJECTS } from '../data/demoProjects'
import { Card } from './ui/Card'

interface StarProject {
  project: Project
  x: number
  y: number
  brightness: number
  size: number
  autonomy: number
  pulseDuration: number
  stage: RocketBoosterStage | 'unknown'
}

function hashToPosition(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  const x = ((Math.sin(hash) + 1) / 2) * 90 + 5
  const y = ((Math.cos(hash * 1.3) + 1) / 2) * 80 + 10
  return { x, y }
}

function getPulseDuration(project: Project) {
  const milestone = project.nextMilestoneDate ? new Date(project.nextMilestoneDate) : null
  if (!milestone) return 6
  const diff = (milestone.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff <= 7) return 2
  if (diff <= 14) return 3
  if (diff <= 30) return 4
  return 6
}

interface ProjectConstellationProps {
  onProjectSelect?: (project: Project) => void
}

export function ProjectConstellation({ onProjectSelect }: ProjectConstellationProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<'all' | RocketBoosterStage>('all')
  const [themeFilter, setThemeFilter] = useState<string>('all')
  const [showLabels, setShowLabels] = useState(false)
  const [usingDemo, setUsingDemo] = useState(false)

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
        console.error('Unable to load constellation projects', error)
        setProjects(DEMO_PROJECTS)
        setUsingDemo(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const themeOptions = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((project) => (project.themes || []).forEach((theme) => set.add(theme)))
    return Array.from(set).sort()
  }, [projects])

  const stars: StarProject[] = useMemo(() => {
    return projects.map((project) => {
      const stage = getProjectStage(project)
      const { x, y } = hashToPosition(project.id)
      const autonomy = project.autonomyScore ?? getDefaultAutonomy(stage)
      const size = 6 + autonomy / 25
      const brightness = stageBrightness[stage] ?? 0.5
      const pulseDuration = getPulseDuration(project)
      return {
        project,
        x,
        y,
        brightness,
        size,
        autonomy,
        pulseDuration,
        stage,
      }
    })
  }, [projects])

  const filteredStars = useMemo(() => {
    return stars.filter((star) => {
      const matchesStage = stageFilter === 'all' || star.stage === stageFilter
      const matchesTheme =
        themeFilter === 'all' || (star.project.themes || []).map((t) => t.toLowerCase()).includes(themeFilter.toLowerCase())
      return matchesStage && matchesTheme
    })
  }, [stars, stageFilter, themeFilter])

  const orbitingProjects = useMemo(() => stars.filter((s) => s.autonomy >= 70).length, [stars])

  if (loading) {
    return (
      <section>
        <Card padding="xl" className="bg-slate-950 text-white border border-slate-800">
          <p className="text-center">Loading constellation…</p>
        </Card>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Ecosystem Signals</p>
          <h2 className="text-3xl font-bold text-clay-900 mt-2">Project Constellation Map</h2>
          <p className="text-sm text-clay-600 mt-2">
            Brightness shows closeness to Beautiful Obsolescence. Pulse speed shows urgency. Tap a star for the story.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div
            className={`rounded-full border px-3 py-1 font-semibold ${
              usingDemo
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {usingDemo ? 'Demo constellation (Notion offline)' : 'Live Notion data'}
          </div>
          <label className="flex items-center gap-2 bg-white border border-clay-200 rounded-full px-3 py-1 text-clay-700">
            <span>Stage</span>
            <select
              className="bg-transparent text-clay-900 font-semibold focus:outline-none"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as 'all' | RocketBoosterStage)}
            >
              <option value="all">All</option>
              {Object.keys(stageLabels).map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabels[stage as RocketBoosterStage]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 bg-white border border-clay-200 rounded-full px-3 py-1 text-clay-700">
            <span>Theme</span>
            <select
              className="bg-transparent text-clay-900 font-semibold focus:outline-none"
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
            >
              <option value="all">All themes</option>
              {themeOptions.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 bg-white border border-clay-200 rounded-full px-3 py-1 text-clay-700">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded text-brand-600"
            />
            <span>Show labels</span>
          </label>
          <div className="text-xs font-semibold text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-full px-4 py-2">
            {orbitingProjects} projects approaching orbit
          </div>
        </div>
      </div>

      <div className="rounded-[32px] bg-slate-950 border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.15),_transparent_55%)] opacity-70 pointer-events-none" />
        <div className="absolute inset-0">
          {filteredStars.map((star) => (
            <div key={star.project.id} className="absolute" style={{ left: `${star.x}%`, top: `${star.y}%` }}>
              <button
                className="constellation-star"
                style={
                  {
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    animationDuration: `${star.pulseDuration}s`,
                    '--star-opacity': star.brightness,
                    boxShadow: `0 0 ${8 + star.size}px rgba(56, 189, 248, ${star.brightness})`,
                    background: stageColors[star.stage],
                  } as React.CSSProperties
                }
                onClick={() => setSelected(star.project)}
                onMouseEnter={() => setSelected(star.project)}
                aria-label={`View ${star.project.name}`}
              />
              {showLabels && (
                <div className="absolute left-3 top-1 text-xs font-semibold text-white pointer-events-none whitespace-nowrap">
                  {star.project.name}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="relative z-10 pointer-events-none h-[420px]" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-clay-500">
        {Object.entries(stageLabels).map(([stage, label]) => (
          <div key={stage} className="flex items-center gap-2">
            <span
              className="inline-flex h-3 w-3 rounded-full"
              style={{ opacity: stageBrightness[stage as RocketBoosterStage], background: stageColors[stage as RocketBoosterStage] }}
            ></span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {selected && (
        <Card padding="lg" className="mt-6 bg-white border border-clay-200">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Selected Project</p>
              <h3 className="text-2xl font-bold text-clay-900 mt-1">{selected.name}</h3>
              <p className="text-sm text-clay-600 mt-1">{selected.aiSummary || selected.description || 'Story still being written.'}</p>
            </div>
            <div className="text-sm text-clay-600 space-y-1">
              <p className="font-semibold text-clay-900">
                Stage:{' '}
                <span className="text-brand-700">
                  {selected.rocketBoosterStage ? stageLabels[selected.rocketBoosterStage] : 'Learning in orbit'}
                </span>
              </p>
              <p>
                Autonomy score:{' '}
                <span className="font-semibold text-ocean-700">
                  {selected.autonomyScore !== undefined ? `${selected.autonomyScore}/100` : 'Not yet measured'}
                </span>
              </p>
              {selected.nextMilestoneDate && (
                <p>
                  Next handover moment:{' '}
                  <span className="font-semibold text-amber-700">
                    {new Date(selected.nextMilestoneDate).toLocaleDateString()}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onProjectSelect?.(selected)}
              className="rounded-full border border-clay-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              Open detail view
            </button>
            {selected.notionUrl && (
              <a
                href={selected.notionUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-clay-200 px-4 py-2 text-sm font-semibold text-clay-700 hover:bg-clay-50"
              >
                Open in Notion
              </a>
            )}
          </div>
        </Card>
      )}
    </section>
  )
}
