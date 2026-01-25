/**
 * ProjectsList - Project list view with LCAA wheel and filtering
 *
 * Features:
 * - LCAA phase visualization
 * - Category filtering
 * - Project selection
 * - Relationship intelligence display
 */

import { useMemo } from 'react'
import type {
  ProjectWithRelationships,
  ProjectStats,
  ProjectCategory,
  LCAAPhase,
  CATEGORY_META,
  LCAA_PHASE_COLORS,
} from '../types'
import { CATEGORY_META, LCAA_FRAMEWORK, LCAA_PHASE_COLORS } from '../types'
import { EmptyState } from '../../shared/EmptyState'
import { StatCard, CompactStatCard } from '../../shared/StatCard'
import { FilterChips } from '../../shared/FilterBar'

interface ProjectsListProps {
  projects: ProjectWithRelationships[]
  stats: ProjectStats | null
  selectedProject: ProjectWithRelationships | null
  onSelectProject: (project: ProjectWithRelationships | null) => void
  onViewProject: (project: ProjectWithRelationships) => void
  loading?: boolean
}

const PHASES: Array<{ id: LCAAPhase; label: string; color: string }> = [
  { id: 'listen', label: 'Listen', color: 'emerald' },
  { id: 'curiosity', label: 'Curiosity', color: 'amber' },
  { id: 'action', label: 'Action', color: 'orange' },
  { id: 'art', label: 'Art', color: 'violet' },
]

export function ProjectsList({
  projects,
  stats,
  selectedProject,
  onSelectProject,
  onViewProject,
  loading = false,
}: ProjectsListProps) {
  // Group projects by LCAA phase
  const projectsByPhase = useMemo(() => {
    const grouped: Record<LCAAPhase, ProjectWithRelationships[]> = {
      listen: [],
      curiosity: [],
      action: [],
      art: [],
    }
    projects.forEach(project => {
      const phase = project.lcaaPhase || 'action'
      grouped[phase].push(project)
    })
    return grouped
  }, [projects])

  // Get category filter options
  const categoryOptions = useMemo(() => {
    if (!stats) return []
    return stats.byCategory.map(cat => ({
      value: cat.category,
      label: `${cat.icon} ${cat.label}`,
      count: cat.count,
    }))
  }, [stats])

  const handleCategoryChange = (value: string) => {
    // This would update the parent filter
    console.log('Category filter:', value)
  }

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <p>Loading projects...</p>
      </div>
    )
  }

  if (stats === null) {
    return (
      <EmptyState
        icon="📋"
        title="No projects"
        description="Projects will appear here when data is loaded."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">ACT Project Portfolio</h2>
            <p className="text-slate-300 text-sm">{projects.length} active projects</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-slate-300 text-sm">Total Projects</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.highPriority}</div>
            <div className="text-xs text-slate-300">High Priority</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.cultural}</div>
            <div className="text-xs text-slate-300">Cultural Protocols</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.totalContacts}</div>
            <div className="text-xs text-slate-300">Total Contacts</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-violet-400">{stats.avgHealthScore}%</div>
            <div className="text-xs text-slate-300">Avg Health</div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <FilterChips
          options={[
            { value: 'all', label: 'All', count: stats.total },
            ...categoryOptions,
          ]}
          selectedValue="all"
          onChange={handleCategoryChange}
        />
      </div>

      {/* LCAA Wheel */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">LCAA Wheel</h2>
        <p className="text-sm text-slate-500 mb-4">Where are projects in the spiral?</p>

        <div className="grid grid-cols-4 gap-4">
          {PHASES.map(phase => {
            const phaseProjects = projectsByPhase[phase.id] || []
            const colors = LCAA_PHASE_COLORS[phase.id]

            return (
              <div key={phase.id} className="text-center">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${colors.bg} ${colors.color}`}>
                  {phase.label}
                </div>
                <div className="space-y-2">
                  {phaseProjects.map(project => (
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
                      <div className="flex items-center gap-1 font-medium text-slate-900 truncate">
                        {project.icon && <span>{project.icon}</span>}
                        <span className="truncate">{project.name}</span>
                        {project.culturalProtocols && <span>🌏</span>}
                      </div>
                      {project.relationshipStats && project.relationshipStats.contactCount > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-slate-400">{project.relationshipStats.contactCount}</span>
                          {project.relationshipStats.hotCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                          {project.relationshipStats.warmCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                      )}
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

        <div className="mt-4 text-xs text-slate-400 flex items-center justify-end gap-1">
          <span>Art → Listen</span>
          <span>🔄</span>
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Handover Readiness */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Handover Readiness</h2>
          <p className="text-sm text-slate-500 mb-4">Beautiful Obsolescence tracking</p>

          <div className="space-y-3">
            {projects.map(project => (
              <HandoverCard
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                onClick={() => onSelectProject(project)}
              />
            ))}
          </div>
        </section>

        {/* Project Detail */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          {selectedProject ? (
            <ProjectDetailPanel
              project={selectedProject}
              onViewFull={() => onViewProject(selectedProject)}
            />
          ) : (
            <EmptyState
              icon="👆"
              title="Select a project"
              description="Click on a project in the LCAA Wheel or Handover list"
            />
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

// ============================================
// Helper Components
// ============================================

function HandoverCard({
  project,
  isSelected,
  onClick,
}: {
  project: ProjectWithRelationships
  isSelected: boolean
  onClick: () => void
}) {
  const { handoverReadiness } = project
  const overall = handoverReadiness
    ? Math.round(
        (handoverReadiness.documentation +
          handoverReadiness.training +
          handoverReadiness.ownership +
          handoverReadiness.exitStrategy) / 4
      )
    : 0

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 bg-slate-50 rounded-lg transition-all ${
        isSelected ? 'ring-2 ring-emerald-200' : 'hover:bg-slate-100'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {project.icon && <span>{project.icon}</span>}
          <span className="font-medium text-slate-900">{project.name}</span>
          {project.culturalProtocols && <span title="Cultural Protocols">🌏</span>}
        </div>
        <div className="flex items-center gap-2">
          {project.relationshipStats && project.relationshipStats.contactCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span>{project.relationshipStats.contactCount}</span>
              <div
                className={`w-2 h-2 rounded-full ${
                  project.relationshipStats.avgTemperature >= 70 ? 'bg-red-500' :
                  project.relationshipStats.avgTemperature >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
              />
            </span>
          )}
          <span
            className={`text-sm font-semibold ${
              overall >= 70 ? 'text-emerald-600' : overall >= 40 ? 'text-amber-600' : 'text-slate-500'
            }`}
          >
            {overall}%
          </span>
        </div>
      </div>

      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${
            overall >= 70 ? 'bg-emerald-500' : overall >= 40 ? 'bg-amber-500' : 'bg-slate-400'
          }`}
          style={{ width: `${overall}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <MetricPill label="Docs" value={handoverReadiness?.documentation || 0} />
        <MetricPill label="Train" value={handoverReadiness?.training || 0} />
        <MetricPill label="Own" value={handoverReadiness?.ownership || 0} />
        <MetricPill label="Exit" value={handoverReadiness?.exitStrategy || 0} />
      </div>
    </button>
  )
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div
        className={`inline-flex w-6 h-6 rounded-full text-xs font-medium leading-6 ${
          value >= 70 ? 'bg-emerald-100 text-emerald-700' :
          value >= 40 ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-500'
        }`}
      >
        {value >= 70 ? '✓' : value >= 40 ? '⚠' : '○'}
      </div>
      <div className="text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function ProjectDetailPanel({
  project,
  onViewFull,
}: {
  project: ProjectWithRelationships
  onViewFull: () => void
}) {
  const categoryMeta = project.category ? CATEGORY_META[project.category] : null

  return (
    <div className="max-h-[600px] overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {project.icon && <span className="text-3xl">{project.icon}</span>}
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {project.code && (
                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{project.code}</span>
              )}
              {categoryMeta && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${categoryMeta.color}20`, color: categoryMeta.color }}
                >
                  {categoryMeta.icon} {categoryMeta.label}
                </span>
              )}
              {project.priority === 'high' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  High Priority
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {project.description && (
        <p className="text-slate-600 mb-4">{project.description}</p>
      )}

      {/* Health Score */}
      {project.healthScore && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Health Score</span>
            <span className="font-medium">{project.healthScore}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                project.healthScore >= 70 ? 'bg-emerald-500' :
                project.healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${project.healthScore}%` }}
            />
          </div>
        </div>
      )}

      {/* LCAA Phase */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 uppercase tracking-wider">LCAA Phase</label>
        <div className="mt-1 inline-block px-3 py-1 rounded-full text-sm font-medium capitalize bg-amber-100 text-amber-800">
          {project.lcaaPhase}
        </div>
        <p className="text-xs text-slate-500 mt-1">{LCAA_FRAMEWORK[project.lcaaPhase || 'action']}</p>
      </div>

      {/* Leads */}
      {project.leads && project.leads.length > 0 && (
        <div className="mb-4">
          <label className="text-xs text-slate-500 uppercase tracking-wider">Project Leads</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {project.leads.map((lead, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-sm">
                <span className="font-medium">{lead.name}</span>
                {lead.role && <span className="text-slate-500">({lead.role})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relationship Intelligence */}
      {project.relationshipStats && project.relationshipStats.contactCount > 0 && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Relationship Intelligence</label>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <div className="text-lg font-semibold text-slate-900">{project.relationshipStats.contactCount}</div>
              <div className="text-slate-500">Contacts</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">{project.relationshipStats.hotCount}</div>
              <div className="text-slate-500">Hot</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-amber-600">{project.relationshipStats.warmCount}</div>
              <div className="text-slate-500">Warm</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">{project.relationshipStats.coolCount}</div>
              <div className="text-slate-500">Cool</div>
            </div>
          </div>
        </div>
      )}

      {/* View Full Page Button */}
      <button
        onClick={onViewFull}
        className="w-full px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition flex items-center justify-center gap-2"
      >
        <span>View Full Project Page</span>
        <span>→</span>
      </button>
    </div>
  )
}

// ============================================
// Styles
// ============================================

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px',
}

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid #e2e8f0',
  borderTopColor: '#6366f1',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  marginBottom: '16px',
}
