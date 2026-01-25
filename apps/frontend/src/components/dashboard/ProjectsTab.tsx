/**
 * ProjectsTab - Track Project Progress with Relationship Intelligence
 *
 * Displays:
 * - LCAA Wheel (where are projects in the spiral?)
 * - Handover Readiness (Beautiful Obsolescence tracking)
 * - Project details with relationship context
 * - Key contacts per project with temperature/engagement data
 * - Full Project Pages (click project for comprehensive view)
 *
 * For ACT Operations (Nic + Ben)
 * Connected to real data via useProjects hook + Command Center API
 */

import { useState, useMemo, useEffect } from 'react'
import { useProjects, type Project } from '../../hooks/useOperationsData'
import { useRelationships, type Relationship } from '../../hooks/useCommandCenter'
import { CATEGORY_META, type ProjectCategory } from '../../data/allProjects'
import { FullProjectPage } from './FullProjectPage'

// Extended project with required fields for display
interface ProjectWithPhase extends Project {
  lcaaPhase: 'listen' | 'curiosity' | 'action' | 'art'
  handoverReadiness: {
    documentation: number
    training: number
    ownership: number
    exitStrategy: number
  }
  // All knowledge fields
  category?: ProjectCategory
  priority?: 'high' | 'medium' | 'low'
  leads?: Array<{ name: string; role?: string }>
  lcaaThemes?: string[]
  almaProgram?: string
  culturalProtocols?: boolean
  icon?: string
  color?: string
  ghlTags?: string[]
  notionPages?: string[]
}

// Project relationship stats
interface ProjectRelationshipStats {
  contactCount: number
  hotCount: number
  warmCount: number
  coolCount: number
  avgTemperature: number
  daysSinceLastContact: number | null
  topContacts: Relationship[]
}

export function ProjectsTab() {
  const { projects, loading, error, stats } = useProjects()
  const { relationships, loading: relLoading } = useRelationships({ limit: 500 })
  const [selectedProject, setSelectedProject] = useState<ProjectWithPhase | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | 'all'>('all')
  const [viewFullPage, setViewFullPage] = useState<string | null>(null)

  // Map projects to include required fields and apply category filter
  // NOTE: All hooks must be called before any conditional returns
  const projectsWithPhase: ProjectWithPhase[] = useMemo(() => {
    const mapped = projects.map(p => ({
      ...p,
      lcaaPhase: p.lcaaPhase || 'action',
      handoverReadiness: p.handoverReadiness || {
        documentation: 50,
        training: 30,
        ownership: 40,
        exitStrategy: 20,
      },
    }))
    // Apply category filter
    if (categoryFilter === 'all') return mapped
    return mapped.filter(p => p.category === categoryFilter)
  }, [projects, categoryFilter])

  // Build relationship stats per project
  const projectRelationships = useMemo(() => {
    const stats = new Map<string, ProjectRelationshipStats>()

    // Group relationships by project (based on tags or name matching)
    projectsWithPhase.forEach(project => {
      const projectName = project.name.toLowerCase()

      // Find contacts related to this project
      const projectContacts = relationships.filter(r => {
        // Check tags
        if (r.tags?.some(t => t.toLowerCase().includes(projectName))) return true
        // Check suggested actions mentioning project
        if (r.suggested_actions?.toLowerCase().includes(projectName)) return true
        // Simple name matching in tags
        const tagMatches = r.tags?.some(t =>
          projectName.includes(t.toLowerCase()) ||
          t.toLowerCase().includes(projectName.split(' ')[0])
        )
        return tagMatches
      })

      const hotCount = projectContacts.filter(c => c.temperature >= 70).length
      const warmCount = projectContacts.filter(c => c.temperature >= 40 && c.temperature < 70).length
      const coolCount = projectContacts.filter(c => c.temperature < 40).length
      const avgTemp = projectContacts.length > 0
        ? projectContacts.reduce((sum, c) => sum + c.temperature, 0) / projectContacts.length
        : 0

      // Find most recent contact
      const lastContactDays = projectContacts.length > 0
        ? Math.min(...projectContacts.map(c => c.days_since_contact ?? 999))
        : null

      // Top contacts by temperature
      const topContacts = [...projectContacts]
        .sort((a, b) => b.temperature - a.temperature)
        .slice(0, 3)

      stats.set(project.id, {
        contactCount: projectContacts.length,
        hotCount,
        warmCount,
        coolCount,
        avgTemperature: Math.round(avgTemp),
        daysSinceLastContact: lastContactDays === 999 ? null : lastContactDays,
        topContacts,
      })
    })

    return stats
  }, [projectsWithPhase, relationships])

  // Handle URL params for deep linking to project pages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const projectParam = params.get('project')
    if (projectParam) {
      setViewFullPage(projectParam)
    }
  }, [])

  // Update URL when viewing full project page
  const openFullProjectPage = (projectCode: string) => {
    setViewFullPage(projectCode)
    const params = new URLSearchParams(window.location.search)
    params.set('project', projectCode)
    window.history.pushState({}, '', `?${params.toString()}`)
  }

  const closeFullProjectPage = () => {
    setViewFullPage(null)
    const params = new URLSearchParams(window.location.search)
    params.delete('project')
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.pushState({}, '', newUrl)
  }

  // If viewing full project page, render that instead
  if (viewFullPage) {
    return (
      <FullProjectPage
        projectCode={viewFullPage}
        onBack={closeFullProjectPage}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <span className="ml-3 text-slate-600">Loading projects...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading projects: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Stats Summary */}
      {stats && (
        <section className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">ACT Project Portfolio</h2>
              <p className="text-slate-300 text-sm">{projects.length} live projects from Notion</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-slate-300 text-sm">Total Projects</div>
            </div>
          </div>

          {/* Stats Grid */}
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
              <div className="text-2xl font-bold text-blue-400">{stats.totalContacts.toLocaleString()}</div>
              <div className="text-xs text-slate-300">Total Contacts</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-violet-400">{stats.avgHealthScore}%</div>
              <div className="text-xs text-slate-300">Avg Health</div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                categoryFilter === 'all'
                  ? 'bg-white text-slate-800'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              All ({stats.total})
            </button>
            {stats.byCategory.map(cat => (
              <button
                key={cat.category}
                onClick={() => setCategoryFilter(cat.category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition flex items-center gap-1 ${
                  categoryFilter === cat.category
                    ? 'bg-white text-slate-800'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label} ({cat.count})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* LCAA Wheel */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">LCAA Wheel</h2>
            <p className="text-sm text-slate-500">Where are projects in the spiral?</p>
          </div>
          <div className="flex items-center gap-2">
            {relLoading && (
              <span className="text-xs text-slate-400">Loading relationships...</span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {relationships.length} contacts
            </span>
          </div>
        </div>

        <LCAAWheel
          projects={projectsWithPhase}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          projectRelationships={projectRelationships}
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
            {projectsWithPhase.map((project) => (
              <HandoverCard
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                onClick={() => setSelectedProject(project)}
                relationshipStats={projectRelationships.get(project.id)}
              />
            ))}
          </div>
        </section>

        {/* Selected Project Detail */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          {selectedProject ? (
            <ProjectDetail
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
              relationshipStats={projectRelationships.get(selectedProject.id)}
              onViewFullPage={openFullProjectPage}
            />
          ) : (
            <EmptyState />
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
function LCAAWheel({ projects, selectedProject, onSelectProject, projectRelationships }: {
  projects: ProjectWithPhase[]
  selectedProject: ProjectWithPhase | null
  onSelectProject: (p: ProjectWithPhase) => void
  projectRelationships: Map<string, ProjectRelationshipStats>
}) {
  const phases = [
    { id: 'listen', label: 'Listen', color: 'emerald' },
    { id: 'curiosity', label: 'Curiosity', color: 'amber' },
    { id: 'action', label: 'Action', color: 'orange' },
    { id: 'art', label: 'Art', color: 'violet' },
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
    <div className="relative bg-slate-50 rounded-xl p-6">
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
                {phaseProjects.map((project) => {
                  const stats = projectRelationships.get(project.id)
                  return (
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
                        {project.culturalProtocols && <span className="flex-shrink-0">🌏</span>}
                      </div>
                      {stats && stats.contactCount > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-slate-400">{stats.contactCount}</span>
                          {stats.hotCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-red-500" title={`${stats.hotCount} hot`}></span>
                          )}
                          {stats.warmCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" title={`${stats.warmCount} warm`}></span>
                          )}
                          {stats.coolCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-blue-500" title={`${stats.coolCount} cool`}></span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
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
function HandoverCard({ project, isSelected, onClick, relationshipStats }: {
  project: ProjectWithPhase
  isSelected: boolean
  onClick: () => void
  relationshipStats?: ProjectRelationshipStats
}) {
  const { handoverReadiness } = project
  const overall = Math.round(
    (handoverReadiness.documentation +
      handoverReadiness.training +
      handoverReadiness.ownership +
      handoverReadiness.exitStrategy) / 4
  )

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
          {project.culturalProtocols && (
            <span title="Cultural Protocols Apply">🌏</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Relationship indicator */}
          {relationshipStats && relationshipStats.contactCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className="text-slate-400">{relationshipStats.contactCount}</span>
              <div
                className={`w-2 h-2 rounded-full ${
                  relationshipStats.avgTemperature >= 70 ? 'bg-red-500' :
                  relationshipStats.avgTemperature >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                title={`Avg temp: ${relationshipStats.avgTemperature}`}
              />
            </span>
          )}
          <span className={`
            text-sm font-semibold
            ${overall >= 70 ? 'text-emerald-600' : overall >= 40 ? 'text-amber-600' : 'text-slate-500'}
          `}>
            {overall}%
          </span>
        </div>
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
    </button>
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
function ProjectDetail({ project, onClose, relationshipStats, onViewFullPage }: {
  project: ProjectWithPhase
  onClose: () => void
  relationshipStats?: ProjectRelationshipStats
  onViewFullPage?: (code: string) => void
}) {
  const { handoverReadiness } = project
  const categoryMeta = project.category ? CATEGORY_META[project.category] : null

  return (
    <div className="max-h-[600px] overflow-y-auto">
      {/* Header with Icon and Category */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {project.icon && (
            <span className="text-3xl">{project.icon}</span>
          )}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
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
                  ⚡ High Priority
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* View Full Page Button */}
      {project.code && onViewFullPage && (
        <button
          onClick={() => onViewFullPage(project.code!)}
          className="w-full mb-4 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Full Project Page
        </button>
      )}

      <div className="space-y-4">
        {/* Cultural Protocols Warning */}
        {project.culturalProtocols && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span>🌏</span>
              <span className="font-medium text-sm">Cultural Protocols Apply</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              This project involves First Nations communities. Elder consultation required for decisions.
            </p>
          </div>
        )}

        {/* Leads */}
        {project.leads && project.leads.length > 0 && (
          <div>
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

        {/* LCAA Phase & Themes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">LCAA Phase</label>
            <div className="mt-1 inline-block px-3 py-1 rounded-full text-sm font-medium capitalize bg-amber-100 text-amber-800">
              {project.lcaaPhase}
            </div>
          </div>
          {project.almaProgram && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">ALMA Program</label>
              <div className="mt-1 text-sm text-slate-900">{project.almaProgram}</div>
            </div>
          )}
        </div>

        {/* LCAA Themes */}
        {project.lcaaThemes && project.lcaaThemes.length > 0 && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">LCAA Themes</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {project.lcaaThemes.map((theme, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded text-xs">
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Description</label>
          <p className="mt-1 text-slate-900">{project.description}</p>
        </div>

        {/* Health Score */}
        {project.healthScore && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Health Score</label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    project.healthScore >= 70 ? 'bg-emerald-500' :
                    project.healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${project.healthScore}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{project.healthScore}%</span>
            </div>
          </div>
        )}

        {/* Contacts & Opportunities */}
        <div className="grid grid-cols-2 gap-4">
          {project.contacts !== undefined && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{project.contacts}</div>
              <div className="text-xs text-blue-700">Contacts</div>
            </div>
          )}
          {project.opportunities && project.opportunities.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-600">{project.opportunities.length}</div>
              <div className="text-xs text-amber-700">Opportunities</div>
            </div>
          )}
        </div>

        {/* Opportunities List */}
        {project.opportunities && project.opportunities.length > 0 && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Active Opportunities</label>
            <div className="mt-2 space-y-2">
              {project.opportunities.map((opp, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      opp.priority === 'high' ? 'bg-red-100 text-red-800' :
                      opp.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {opp.priority}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{opp.type}</span>
                  </div>
                  <div className="font-medium text-sm mt-1">{opp.title}</div>
                  {opp.description && <div className="text-xs text-slate-600 mt-1">{opp.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Integrations */}
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">System Integrations</label>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {project.ghlTags && project.ghlTags.length > 0 && (
              <div className="flex items-center gap-1 text-slate-600">
                <span>📇</span> GHL: {project.ghlTags.join(', ')}
              </div>
            )}
            {project.xeroTracking && (
              <div className="flex items-center gap-1 text-slate-600">
                <span>💰</span> Xero: {project.xeroTracking}
              </div>
            )}
            {project.notionPages && project.notionPages.length > 0 && (
              <div className="flex items-center gap-1 text-slate-600 col-span-2">
                <span>📝</span> Notion: {project.notionPages.slice(0, 2).join(', ')}
                {project.notionPages.length > 2 && ` +${project.notionPages.length - 2} more`}
              </div>
            )}
          </div>
        </div>

        {/* Relationship Intelligence */}
        {relationshipStats && relationshipStats.contactCount > 0 && (
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Relationship Intelligence</label>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">{relationshipStats.contactCount}</div>
                <div className="text-xs text-slate-500">Contacts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">{relationshipStats.hotCount}</div>
                <div className="text-xs text-slate-500">Hot</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-amber-600">{relationshipStats.warmCount}</div>
                <div className="text-xs text-slate-500">Warm</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{relationshipStats.coolCount}</div>
                <div className="text-xs text-slate-500">Cool</div>
              </div>
            </div>

            {/* Avg Temperature */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">Avg Temp:</span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    relationshipStats.avgTemperature >= 70 ? 'bg-red-500' :
                    relationshipStats.avgTemperature >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${relationshipStats.avgTemperature}%` }}
                />
              </div>
              <span className="text-xs font-medium">{relationshipStats.avgTemperature}</span>
            </div>

            {/* Last Contact */}
            {relationshipStats.daysSinceLastContact !== null && (
              <div className="mt-2 text-xs">
                <span className="text-slate-500">Last contact:</span>
                <span className={`ml-1 font-medium ${
                  relationshipStats.daysSinceLastContact > 30 ? 'text-red-600' :
                  relationshipStats.daysSinceLastContact > 14 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {relationshipStats.daysSinceLastContact} days ago
                </span>
              </div>
            )}

            {/* Top Contacts */}
            {relationshipStats.topContacts.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-2">Key Contacts</div>
                <div className="space-y-1">
                  {relationshipStats.topContacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-2 text-sm">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          contact.temperature >= 70 ? 'bg-red-500' :
                          contact.temperature >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                      />
                      <span className="flex-1 truncate">{contact.contact_name}</span>
                      <span className="text-xs text-slate-400">{contact.temperature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
        {project.githubUrl && (
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
        )}
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

// Empty State
function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-12">
      <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 className="text-sm font-medium text-slate-900 mb-1">Select a project</h3>
      <p className="text-sm text-slate-500">Click on a project in the LCAA Wheel or Handover list</p>
    </div>
  )
}
