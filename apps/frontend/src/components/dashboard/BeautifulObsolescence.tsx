import { useState, useEffect } from 'react'
import { ProgressRing, JourneyIndicator, useCelebration, CelebrationToast } from './Celebration'

interface ProjectObsolescence {
  id: string
  name: string
  communityOwnership: number // 0-100
  stage: 'discovery' | 'ignition' | 'thrust' | 'trajectory' | 'orbit'
  lastUpdate: string
  milestones: string[]
}

const stageInfo = {
  discovery: { emoji: '🔍', label: 'Discovery', description: 'Learning the community' },
  ignition: { emoji: '🚀', label: 'Ignition', description: 'Building initial capacity' },
  thrust: { emoji: '🔥', label: 'Thrust', description: 'Active collaboration' },
  trajectory: { emoji: '🌟', label: 'Trajectory', description: 'Community taking lead' },
  orbit: { emoji: '✨', label: 'Orbit', description: 'Self-sustaining' },
}

// Mock data - would come from API
const mockProjects: ProjectObsolescence[] = [
  {
    id: '1',
    name: 'The Harvest CSA',
    communityOwnership: 80,
    stage: 'trajectory',
    lastUpdate: '2024-01-15',
    milestones: ['Community board formed', 'Financial independence reached'],
  },
  {
    id: '2',
    name: 'Goods Marketplace',
    communityOwnership: 65,
    stage: 'thrust',
    lastUpdate: '2024-01-10',
    milestones: ['Local management team trained'],
  },
  {
    id: '3',
    name: 'Mingaminga Rangers',
    communityOwnership: 100,
    stage: 'orbit',
    lastUpdate: '2024-01-01',
    milestones: ['Fully community-owned', 'ACT stepped back'],
  },
]

interface ObsolescenceBarProps {
  project: ProjectObsolescence
  showDetails?: boolean
}

function ObsolescenceBar({ project, showDetails = false }: ObsolescenceBarProps) {
  const stage = stageInfo[project.stage]
  const isComplete = project.communityOwnership >= 100

  return (
    <div className={`p-4 rounded-xl ${isComplete ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{stage.emoji}</span>
          <div>
            <h4 className="font-medium text-slate-900">{project.name}</h4>
            <p className="text-xs text-slate-500">{stage.label}: {stage.description}</p>
          </div>
        </div>
        <span className={`text-lg font-semibold ${isComplete ? 'text-emerald-600' : 'text-slate-700'}`}>
          {project.communityOwnership}%
        </span>
      </div>

      {/* Progress bar showing energy transfer */}
      <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
        {/* Community ownership (green, growing from right) */}
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"
          style={{ width: `${project.communityOwnership}%` }}
        />
        {/* ACT energy (blue, shrinking from left) */}
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-500"
          style={{ width: `${100 - project.communityOwnership}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Community
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          ACT
        </span>
      </div>

      {/* Milestones */}
      {showDetails && project.milestones.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Recent milestones:</p>
          <ul className="space-y-1">
            {project.milestones.map((milestone, idx) => (
              <li key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {milestone}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Celebration for 100% */}
      {isComplete && (
        <div className="mt-3 pt-3 border-t border-emerald-200">
          <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
            <span>🎉</span>
            This project is now community-owned!
          </p>
        </div>
      )}
    </div>
  )
}

interface BeautifulObsolescenceProps {
  compact?: boolean
  limit?: number
}

export function BeautifulObsolescence({ compact = false, limit = 5 }: BeautifulObsolescenceProps) {
  const [projects, setProjects] = useState<ProjectObsolescence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with API call
    const fetchProjects = async () => {
      await new Promise(resolve => setTimeout(resolve, 300))
      setProjects(mockProjects)
      setLoading(false)
    }
    fetchProjects()
  }, [])

  // Sort by community ownership descending
  const sortedProjects = [...projects]
    .sort((a, b) => b.communityOwnership - a.communityOwnership)
    .slice(0, limit)

  const inOrbit = projects.filter(p => p.stage === 'orbit').length
  const approaching = projects.filter(p => p.communityOwnership >= 50 && p.stage !== 'orbit').length

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-100 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (compact) {
    // Find the project closest to orbit (highest ownership not yet at 100%)
    const leadProject = sortedProjects.find(p => p.communityOwnership < 100) || sortedProjects[0]

    return (
      <div className="bg-white rounded-xl p-5 border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span>✨</span>
          Beautiful Obsolescence
        </h3>

        {/* Featured project with progress ring */}
        {leadProject && (
          <div className="flex items-center gap-4 mb-4">
            <ProgressRing progress={leadProject.communityOwnership} size={80} strokeWidth={6} />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{leadProject.name}</p>
              <p className="text-sm text-slate-500">{stageInfo[leadProject.stage].label}</p>
              <JourneyIndicator progress={leadProject.communityOwnership} className="mt-2 scale-75 origin-left" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-700">{inOrbit}</p>
            <p className="text-xs text-emerald-600">In Orbit</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{approaching}</p>
            <p className="text-xs text-blue-600">Approaching</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Success = ACT becoming unnecessary
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100">
      {/* Header with journey indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span>✨</span>
            Beautiful Obsolescence
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            Projects approaching community ownership
          </p>
          <JourneyIndicator progress={Math.max(...projects.map(p => p.communityOwnership))} />
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="font-medium text-emerald-700">{inOrbit} in orbit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="font-medium text-blue-700">{approaching} approaching</span>
          </span>
        </div>
      </div>

      {/* Project List with Progress Rings */}
      <div className="space-y-4">
        {sortedProjects.map(project => (
          <div key={project.id} className="flex items-center gap-4">
            <ProgressRing progress={project.communityOwnership} size={64} strokeWidth={5} />
            <div className="flex-1">
              <ObsolescenceBar project={project} showDetails />
            </div>
          </div>
        ))}
      </div>

      {/* Philosophy Note */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <p className="text-sm text-slate-500 italic">
          "When projects reach 100% community ownership, we celebrate and step back.
          Our success is measured by becoming unnecessary."
        </p>
      </div>
    </div>
  )
}

// Mini widget for dashboard overview
export function ObsolescenceWidget() {
  const approaching = mockProjects.filter(p => p.communityOwnership >= 50 && p.stage !== 'orbit')

  if (approaching.length === 0) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-100">
      <span className="text-2xl">✨</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-emerald-900">
          {approaching.length} {approaching.length === 1 ? 'project' : 'projects'} approaching community ownership
        </p>
        <p className="text-xs text-emerald-600">
          {approaching.map(p => p.name).join(', ')}
        </p>
      </div>
      <button className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors">
        View →
      </button>
    </div>
  )
}
