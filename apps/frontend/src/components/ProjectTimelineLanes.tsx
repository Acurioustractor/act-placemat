import { useEffect, useMemo, useState } from 'react'
import { resolveApiUrl } from '../config/env'
import type { Project } from '../types/project'
import { getProjectStage, stageLabels } from '../utils/projectStage'
import { Card } from './ui/Card'

type LaneGrouping = 'theme' | 'area' | 'stage'

export function ProjectTimelineLanes() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [grouping, setGrouping] = useState<LaneGrouping>('area')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/real/projects'))
        if (!response.ok) throw new Error('Failed to load projects')
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Timeline lanes failed to load', error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, Project[]>()
    const fallback = grouping === 'theme' ? 'Uncategorised' : 'Unassigned'

    projects.forEach((project) => {
      if (grouping === 'theme') {
        const themes = project.themes && project.themes.length ? project.themes : [fallback]
        themes.forEach((theme) => {
          map.set(theme, [...(map.get(theme) || []), project])
        })
      } else if (grouping === 'area') {
        const area = project.area || fallback
        map.set(area, [...(map.get(area) || []), project])
      } else {
        const stage = stageLabels[getProjectStage(project)]
        map.set(stage, [...(map.get(stage) || []), project])
      }
    })

    const ordered = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    return ordered
  }, [projects, grouping])

  const getPosition = (project: Project) => {
    if (!project.nextMilestoneDate) return 0
    const date = new Date(project.nextMilestoneDate).getTime()
    const now = Date.now()
    const horizon = now + 1000 * 60 * 60 * 24 * 120 // 120 days
    const position = Math.min(Math.max((date - now) / (horizon - now), 0), 1)
    return position * 100
  }

  if (loading) {
    return (
      <Card padding="lg">
        <p className="text-center text-clay-500">Loading project timelines…</p>
      </Card>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-clay-600">Group by</span>
          <select
            value={grouping}
            onChange={(e) => setGrouping(e.target.value as LaneGrouping)}
            className="rounded-full border border-clay-200 px-3 py-1"
          >
            <option value="area">Area</option>
            <option value="theme">Theme</option>
            <option value="stage">Stage</option>
          </select>
        </label>
        <span className="text-xs text-clay-500">{projects.length} projects • horizon 120 days</span>
      </div>

      <div className="space-y-6">
        {grouped.map(([lane, laneProjects]) => (
          <div key={lane} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-clay-900">{lane}</h3>
              <span className="text-xs text-clay-500">{laneProjects.length} projects</span>
            </div>
            <div className="relative h-28 rounded-2xl border border-clay-100 bg-white overflow-hidden">
              <div className="absolute inset-y-0 left-1/2 w-px bg-clay-100" />
              <div className="absolute inset-3 flex flex-col gap-2">
                {laneProjects
                  .sort((a, b) => {
                    const aDate = a.nextMilestoneDate ? new Date(a.nextMilestoneDate).getTime() : Infinity
                    const bDate = b.nextMilestoneDate ? new Date(b.nextMilestoneDate).getTime() : Infinity
                    return aDate - bDate
                  })
                  .map((project) => (
                    <button
                      key={project.id}
                      className="group absolute top-1/2 -translate-y-1/2 w-52"
                      style={{ left: `${getPosition(project)}%`, transform: 'translate(-50%, -50%)' }}
                      onClick={() => {
                        const event = new CustomEvent('tab-change', {
                          detail: `tab=projects&project=${project.id}`,
                        })
                        window.dispatchEvent(event)
                      }}
                    >
                      <div className="rounded-xl border border-clay-200 bg-white px-3 py-2 shadow-sm group-hover:border-brand-200">
                        <p className="text-sm font-semibold text-clay-900 line-clamp-1">{project.name}</p>
                        <p className="text-xs text-clay-500">
                          {stageLabels[getProjectStage(project)]} •{' '}
                          {project.nextMilestoneDate
                            ? new Date(project.nextMilestoneDate).toLocaleDateString()
                            : 'No milestone'}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
