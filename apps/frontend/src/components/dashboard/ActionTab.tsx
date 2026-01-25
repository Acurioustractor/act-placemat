/**
 * ActionTab - Operational Dashboard
 *
 * Displays:
 * - LCAA Wheel (where are projects in the spiral?)
 * - Handover Readiness (Beautiful Obsolescence tracking)
 * - Story Queue (with consent status)
 *
 * Design: "Evidence is story, not surveillance"
 */

import { useState } from 'react'
import { coreProjects, type CoreProject } from '../../data/coreProjects'

// Extend core projects with LCAA phase for demo
interface ProjectWithPhase extends CoreProject {
  lcaaPhase: 'listen' | 'curiosity' | 'action' | 'art'
  handoverReadiness: {
    documentation: number
    training: number
    ownership: number
    exitStrategy: number
  }
}

// Demo data - in production, this comes from API
const projectsWithPhase: ProjectWithPhase[] = [
  {
    ...coreProjects[0], // ACT Studio
    lcaaPhase: 'action',
    handoverReadiness: { documentation: 80, training: 60, ownership: 40, exitStrategy: 20 },
  },
  {
    ...coreProjects[1], // Empathy Ledger
    lcaaPhase: 'action',
    handoverReadiness: { documentation: 95, training: 80, ownership: 60, exitStrategy: 30 },
  },
  {
    ...coreProjects[2], // JusticeHub
    lcaaPhase: 'curiosity',
    handoverReadiness: { documentation: 70, training: 50, ownership: 30, exitStrategy: 10 },
  },
  {
    ...coreProjects[3], // The Harvest
    lcaaPhase: 'action',
    handoverReadiness: { documentation: 60, training: 40, ownership: 80, exitStrategy: 50 },
  },
  {
    ...coreProjects[4], // Goods
    lcaaPhase: 'action',
    handoverReadiness: { documentation: 50, training: 30, ownership: 70, exitStrategy: 20 },
  },
  {
    ...coreProjects[5], // ACT Farm
    lcaaPhase: 'listen',
    handoverReadiness: { documentation: 30, training: 20, ownership: 90, exitStrategy: 60 },
  },
  {
    ...coreProjects[6], // ACT Intelligence
    lcaaPhase: 'curiosity',
    handoverReadiness: { documentation: 40, training: 20, ownership: 20, exitStrategy: 0 },
  },
]

export function ActionTab() {
  const [selectedProject, setSelectedProject] = useState<ProjectWithPhase | null>(null)

  return (
    <div className="space-y-6">
      {/* LCAA Wheel */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">LCAA Wheel</h2>
            <p className="text-sm text-slate-500">Where are projects in the spiral?</p>
          </div>
          <div className="text-xs text-slate-400">
            Click a project to see details
          </div>
        </div>

        <LCAAWheel
          projects={projectsWithPhase}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
        />
      </section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Handover Readiness */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Handover Readiness
          </h2>
          <p className="text-sm text-slate-500 mb-4">Beautiful Obsolescence tracking</p>

          <div className="space-y-4">
            {projectsWithPhase.slice(0, 4).map((project) => (
              <HandoverCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* Selected Project Detail or Stories */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          {selectedProject ? (
            <ProjectDetail project={selectedProject} onClose={() => setSelectedProject(null)} />
          ) : (
            <StoryQueue />
          )}
        </section>
      </div>

      {/* Field Note */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
        <p className="text-sm text-amber-800 italic">
          <span className="font-semibold not-italic">Field note:</span> If we cannot hand it over, we are still in Curiosity.
        </p>
      </div>
    </div>
  )
}

// LCAA Wheel Component
function LCAAWheel({ projects, selectedProject, onSelectProject }: {
  projects: ProjectWithPhase[]
  selectedProject: ProjectWithPhase | null
  onSelectProject: (p: ProjectWithPhase) => void
}) {
  const phases = [
    { id: 'listen', label: 'Listen', color: 'emerald', position: 'top-1/2 left-4' },
    { id: 'curiosity', label: 'Curiosity', color: 'amber', position: 'top-4 left-1/2' },
    { id: 'action', label: 'Action', color: 'orange', position: 'top-1/2 right-4' },
    { id: 'art', label: 'Art', color: 'violet', position: 'bottom-4 left-1/2' },
  ]

  const getProjectsByPhase = (phase: string) =>
    projects.filter(p => p.lcaaPhase === phase)

  const colorClasses = {
    emerald: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    amber: 'bg-amber-100 border-amber-300 text-amber-800',
    orange: 'bg-orange-100 border-orange-300 text-orange-800',
    violet: 'bg-violet-100 border-violet-300 text-violet-800',
  }

  return (
    <div className="relative bg-slate-50 rounded-xl p-8">
      {/* Phase Labels and Projects */}
      <div className="grid grid-cols-4 gap-4">
        {phases.map((phase) => {
          const phaseProjects = getProjectsByPhase(phase.id)
          return (
            <div key={phase.id} className="text-center">
              <div className={`
                inline-block px-3 py-1 rounded-full text-sm font-medium mb-3
                ${colorClasses[phase.color as keyof typeof colorClasses]}
              `}>
                {phase.label}
              </div>
              <div className="space-y-2">
                {phaseProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className={`
                      w-full px-3 py-2 text-xs text-left rounded-lg border transition-all
                      ${selectedProject?.id === project.id
                        ? 'bg-white border-slate-300 shadow-sm ring-2 ring-emerald-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="font-medium text-slate-900 truncate">{project.name}</div>
                    <div className="text-slate-500 truncate">{project.role}</div>
                  </button>
                ))}
                {phaseProjects.length === 0 && (
                  <div className="text-xs text-slate-400 py-2">No projects</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Loop Arrow */}
      <div className="absolute bottom-2 right-2 text-xs text-slate-400 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Art → Listen
      </div>
    </div>
  )
}

// Handover Card Component
function HandoverCard({ project }: { project: ProjectWithPhase }) {
  const { handoverReadiness } = project
  const overall = Math.round(
    (handoverReadiness.documentation +
      handoverReadiness.training +
      handoverReadiness.ownership +
      handoverReadiness.exitStrategy) / 4
  )

  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-900">{project.name}</span>
        <span className={`
          text-sm font-semibold
          ${overall >= 70 ? 'text-emerald-600' : overall >= 40 ? 'text-amber-600' : 'text-slate-500'}
        `}>
          {overall}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${
            overall >= 70 ? 'bg-emerald-500' : overall >= 40 ? 'bg-amber-500' : 'bg-slate-400'
          }`}
          style={{ width: `${overall}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <MetricPill label="Docs" value={handoverReadiness.documentation} />
        <MetricPill label="Train" value={handoverReadiness.training} />
        <MetricPill label="Own" value={handoverReadiness.ownership} />
        <MetricPill label="Exit" value={handoverReadiness.exitStrategy} />
      </div>
    </div>
  )
}

// Metric Pill
function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className={`
        inline-block w-6 h-6 rounded-full text-xs font-medium leading-6
        ${value >= 70 ? 'bg-emerald-100 text-emerald-700'
          : value >= 40 ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-500'}
      `}>
        {value >= 70 ? '✓' : value >= 40 ? '⚠' : '○'}
      </div>
      <div className="text-slate-500 mt-1">{label}</div>
    </div>
  )
}

// Project Detail Panel
function ProjectDetail({ project, onClose }: { project: ProjectWithPhase; onClose: () => void }) {
  const { handoverReadiness } = project

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Phase */}
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">LCAA Phase</label>
          <div className="mt-1 inline-block px-3 py-1 rounded-full text-sm font-medium capitalize bg-amber-100 text-amber-800">
            {project.lcaaPhase}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Role</label>
          <p className="mt-1 text-slate-900">{project.description}</p>
        </div>

        {/* Handover Details */}
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Handover Progress</label>
          <div className="mt-2 space-y-2">
            <ProgressRow label="Documentation" value={handoverReadiness.documentation} />
            <ProgressRow label="Training" value={handoverReadiness.training} />
            <ProgressRow label="Community Ownership" value={handoverReadiness.ownership} />
            <ProgressRow label="Exit Strategy" value={handoverReadiness.exitStrategy} />
          </div>
        </div>

        {/* GitHub Link */}
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          View on GitHub
        </a>
      </div>
    </div>
  )
}

// Progress Row
function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-sm text-slate-600">{label}</div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-slate-300'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="w-10 text-right text-sm text-slate-500">{value}%</div>
    </div>
  )
}

// Story Queue (placeholder)
function StoryQueue() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Story Queue</h2>
      <p className="text-sm text-slate-500 mb-4">Stories awaiting review</p>

      {/* Demo Stories */}
      <div className="space-y-3">
        <StoryCard
          title="Uncle Alan Palm Island"
          project="The Harvest"
          consent="external-lite"
          authority="elder"
        />
        <StoryCard
          title="Youth Justice Journey"
          project="JusticeHub"
          consent="internal"
          authority="community"
        />
        <StoryCard
          title="First Bed Built"
          project="Goods"
          consent="external"
          authority="community"
        />
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Evidence is story, not surveillance
      </p>
    </div>
  )
}

// Story Card
function StoryCard({ title, project, consent, authority }: {
  title: string
  project: string
  consent: 'internal' | 'external-lite' | 'external'
  authority: 'elder' | 'community'
}) {
  const consentColors = {
    internal: 'bg-red-100 text-red-700',
    'external-lite': 'bg-amber-100 text-amber-700',
    external: 'bg-emerald-100 text-emerald-700',
  }

  const consentLabels = {
    internal: 'Internal Only',
    'external-lite': 'External-Lite',
    external: 'External',
  }

  return (
    <div className="p-3 bg-slate-50 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{project}</div>
        </div>
        <div className="flex items-center gap-2">
          {authority === 'elder' && (
            <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700">
              Elder
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded ${consentColors[consent]}`}>
            {consentLabels[consent]}
          </span>
        </div>
      </div>
    </div>
  )
}
