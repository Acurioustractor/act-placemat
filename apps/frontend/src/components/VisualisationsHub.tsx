import { useMemo, useState } from 'react'
import { Card } from './ui/Card'
import type { Project } from '../types/project'
import { ProjectConstellation } from './ProjectConstellation'
import { ProjectFilterGrid } from './ProjectFilterGrid'
import { ProjectGeoExplorer } from './ProjectGeoExplorer'
import { ProjectPlacematGrid } from './ProjectPlacematGrid'
import { useNavigate } from '../hooks/useNavigate'

interface VisualisationConfig {
  id: string
  name: string
  description: string
  render: (actions?: { onProjectSelect: (project: Project) => void }) => JSX.Element
}

const VISUALISATIONS: VisualisationConfig[] = [
  {
    id: 'constellation',
    name: 'Constellation',
    description: 'Network energy map showing project autonomy, urgency pulses, and lineage alignment.',
    render: ({ onProjectSelect }) => <ProjectConstellation onProjectSelect={onProjectSelect} />,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Filterable project explorer for spotting themes, stages, and upcoming milestones.',
    render: ({ onProjectSelect }) => <ProjectFilterGrid onProjectSelect={onProjectSelect} />,
  },
  {
    id: 'geo',
    name: 'Geo Map',
    description: 'Geographic clusters, heat spots, and project lists anchored to Country.',
    render: ({ onProjectSelect }) => <ProjectGeoExplorer onProjectSelect={onProjectSelect} />,
  },
  {
    id: 'placemat',
    name: 'Placemat',
    description: 'Matrix grid for portfolio balance by stage, theme, or area.',
    render: () => <ProjectPlacematGrid />,
  },
]

export function VisualisationsHub() {
  const [activeViz, setActiveViz] = useState<string>(VISUALISATIONS[0].id)
  const [fullScreenViz, setFullScreenViz] = useState<string | null>(null)
  const navigate = useNavigate()

  const currentViz = useMemo(() => VISUALISATIONS.find((viz) => viz.id === activeViz) || VISUALISATIONS[0], [activeViz])
  const fullScreenConfig = useMemo(
    () => (fullScreenViz ? VISUALISATIONS.find((viz) => viz.id === fullScreenViz) || null : null),
    [fullScreenViz],
  )

  return (
    <div className="min-h-screen bg-clay-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-600">Visual Intelligence</p>
          <h1 className="text-4xl font-bold text-clay-900">ACT Visualisations Lab</h1>
          <p className="text-lg text-clay-600 max-w-3xl">
            Switch between constellation, explorer, and geographic layers. Pop any visual full screen to co-design with
            communities.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          {VISUALISATIONS.map((viz) => {
            const isActive = viz.id === activeViz
            return (
              <button
                key={viz.id}
                onClick={() => setActiveViz(viz.id)}
                className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-ocean-600 text-white shadow-medium'
                    : 'bg-white border border-clay-200 text-clay-700 hover:-translate-y-0.5 hover:shadow-soft'
                }`}
              >
                {viz.name}
              </button>
            )
          })}
        </div>

        <Card padding="xl" className="bg-white border border-clay-200 shadow-medium space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">{currentViz.name}</p>
              <p className="text-sm text-clay-600">{currentViz.description}</p>
            </div>
            <button
              onClick={() => setFullScreenViz(currentViz.id)}
              className="inline-flex items-center gap-2 rounded-full border border-clay-200 px-4 py-2 text-xs font-semibold text-clay-700 hover:bg-clay-50"
            >
              <span>Open full screen</span>
            </button>
          </div>

          {!fullScreenViz && (
            <div className="space-y-6">
              {currentViz.render({
                onProjectSelect: (project) => navigate(`?tab=projects&project=${project.id}`),
              })}
            </div>
          )}
        </Card>
      </div>

      {fullScreenConfig && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
          <div className="absolute inset-4 md:inset-8 bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-clay-100 bg-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Full Screen Mode</p>
                <p className="text-lg font-semibold text-clay-900">{fullScreenConfig.name}</p>
              </div>
              <button
                onClick={() => setFullScreenViz(null)}
                className="rounded-full border border-clay-200 px-4 py-2 text-sm font-semibold text-clay-700 hover:bg-clay-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-clay-50">
              {fullScreenConfig.render({
                onProjectSelect: (project) => navigate(`?tab=projects&project=${project.id}`),
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
