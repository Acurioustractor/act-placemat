/**
 * CoreProjectsGrid - Display the 7 core ACT codebases
 *
 * Research-backed patterns:
 * - 5-Second Rule: Key info visible immediately
 * - Progressive disclosure: Click to expand
 * - Shape + Color + Text for status (Carbon Design)
 * - Clean cards with focused information
 * - No decorative elements
 */

import { useState } from 'react'
import { coreProjects, type CoreProject } from '../../data/coreProjects'
import { StatusBadge } from '../ui/StatusBadge'

interface ProjectCardProps {
  project: CoreProject
  isExpanded: boolean
  onToggle: () => void
}

function ProjectCard({ project, isExpanded, onToggle }: ProjectCardProps) {
  return (
    <div
      className={`
        bg-white rounded-lg border border-slate-200
        transition-shadow duration-150
        hover:shadow-md
        ${isExpanded ? 'ring-2 ring-violet-200' : ''}
      `}
    >
      {/* Main Card Content */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset rounded-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Project Name */}
            <h3 className="font-semibold text-slate-900 truncate">
              {project.name}
            </h3>

            {/* Role Tag */}
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-violet-700 bg-violet-50 rounded">
              {project.role}
            </span>

            {/* Description */}
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">
              {project.description}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            <StatusBadge status={project.status} size="sm" />
          </div>
        </div>

        {/* Stack (always visible) */}
        <div className="mt-3 text-xs text-slate-500">
          {project.stack}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
          {/* Links */}
          <div className="flex items-center gap-3">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>

            <span className="text-slate-300">|</span>

            <span className="text-sm text-slate-500">
              Deploy: {project.deployment}
            </span>
          </div>

          {/* Path (for developers) */}
          <div className="text-xs font-mono text-slate-400 bg-slate-50 rounded px-2 py-1 truncate">
            {project.path}
          </div>
        </div>
      )}
    </div>
  )
}

export function CoreProjectsGrid() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Core Codebases
          </h2>
          <p className="text-sm text-slate-500">
            {coreProjects.length} projects with active development
          </p>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600">
              {coreProjects.filter(p => p.status === 'active').length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coreProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isExpanded={expandedId === project.id}
            onToggle={() => toggleExpanded(project.id)}
          />
        ))}
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-slate-400 text-center mt-4">
        Click a card to expand details
      </p>
    </div>
  )
}
