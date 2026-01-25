/**
 * PlaygroundTab - Development Playground
 *
 * Shows all GitHub projects linked to their Vercel deployments
 * with tagging for projects, people, and opportunities.
 *
 * Uses embedded data - no external API required.
 *
 * For ACT Development team experiments and prototypes.
 */

import { useState, useMemo } from 'react'
import {
  ACT_PROJECTS,
  getAllProjectTags,
  getProjectsSummary
} from '../../data/actProjects'
import type { ACTProject } from '../../data/actProjects'
import { PROJECT_ENRICHMENT } from '../../data/projectEnrichment'
import type { EnrichedProject } from '../../data/projectEnrichment'

// Merged project type with enrichment
interface MergedProject extends ACTProject {
  enrichment?: EnrichedProject
}

// Status badge
function StatusBadge({ status }: { status: ACTProject['status'] }) {
  const styles = {
    online: 'bg-emerald-100 text-emerald-700',
    offline: 'bg-red-100 text-red-700',
    local: 'bg-blue-100 text-blue-700',
    unknown: 'bg-slate-100 text-slate-600'
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
      {status === 'online' ? '● Live' : status === 'local' ? '◐ Local' : status === 'offline' ? '○ Offline' : '? Unknown'}
    </span>
  )
}

// Project tag chips
function TagChips({ tags }: { tags: ACTProject['tags'] }) {
  const allTags = [
    ...tags.projects.map(t => ({ label: t, type: 'project' as const })),
    ...tags.people.map(t => ({ label: t, type: 'person' as const })),
    ...tags.opportunities.map(t => ({ label: t, type: 'opportunity' as const }))
  ]

  if (allTags.length === 0) return null

  const colors = {
    project: 'bg-violet-100 text-violet-700',
    person: 'bg-blue-100 text-blue-700',
    opportunity: 'bg-amber-100 text-amber-700'
  }

  return (
    <div className="flex flex-wrap gap-1">
      {allTags.map((tag, i) => (
        <span key={i} className={`px-2 py-0.5 text-xs font-medium rounded ${colors[tag.type]}`}>
          {tag.label}
        </span>
      ))}
    </div>
  )
}

// Project card with enrichment
function ProjectCard({ project }: { project: MergedProject }) {
  const enrichment = project.enrichment
  const healthScore = enrichment?.healthScore || project.healthScore

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{project.name}</h3>
          {/* Show enrichment focus or description */}
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
            {enrichment?.focus || project.description}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Contacts from enrichment */}
      {enrichment?.contacts && (
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {enrichment.contacts} contacts
          </span>
        </div>
      )}

      {/* Opportunities from enrichment */}
      {enrichment?.opportunities && enrichment.opportunities.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {enrichment.opportunities.slice(0, 2).map((opp, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 text-xs rounded font-medium ${
                  opp.priority === 'high'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {opp.type}: {opp.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="mb-3">
        <TagChips tags={project.tags} />
      </div>

      {/* Tech stack */}
      {project.tech.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tech.slice(0, 3).map(tech => (
            <span key={tech} className="px-2 py-0.5 text-xs bg-slate-50 text-slate-600 rounded">
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Health Score */}
      {healthScore && (
        <p className="text-xs text-slate-400 mb-3">
          Health: {healthScore}%
        </p>
      )}

      {/* Links */}
      <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Live
          </a>
        )}
        {project.github && (
          <a
            href={`https://github.com/${project.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </a>
        )}
      </div>
    </div>
  )
}

// Summary stats
function SummaryStats() {
  const summary = getProjectsSummary()
  const playgrounds = ACT_PROJECTS.filter(p => p.isPlayground).length
  const tagged = ACT_PROJECTS.filter(p => p.tags.projects.length > 0).length

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-3xl font-bold text-slate-900">{summary.total}</div>
        <div className="text-sm text-slate-500">Total Projects</div>
      </div>
      <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
        <div className="text-3xl font-bold text-violet-700">{playgrounds}</div>
        <div className="text-sm text-violet-600">Experiments</div>
      </div>
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
        <div className="text-3xl font-bold text-emerald-700">{summary.online}</div>
        <div className="text-sm text-emerald-600">Live</div>
      </div>
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <div className="text-3xl font-bold text-amber-700">{tagged}</div>
        <div className="text-sm text-amber-600">Tagged to Projects</div>
      </div>
    </div>
  )
}

// Main component
export function PlaygroundTab() {
  const [filter, setFilter] = useState<'all' | 'experiments' | 'production'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  // Get unique project tags for filter
  const uniqueTags = useMemo(() => getAllProjectTags(), [])

  // Merge projects with enrichment data
  const mergedProjects: MergedProject[] = useMemo(() => {
    return ACT_PROJECTS.map(project => {
      const projectTag = project.tags.projects[0]
      const enrichment = PROJECT_ENRICHMENT.find(e => e.code === projectTag)
      return { ...project, enrichment }
    })
  }, [])

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = [...mergedProjects]

    if (filter === 'experiments') {
      result = result.filter(p => p.isPlayground)
    } else if (filter === 'production') {
      result = result.filter(p => !p.isPlayground)
    }

    if (tagFilter) {
      result = result.filter(p => p.tags.projects.includes(tagFilter))
    }

    return result
  }, [filter, tagFilter, mergedProjects])

  // Separate into sections
  const experiments = filteredProjects.filter(p => p.isPlayground)
  const production = filteredProjects.filter(p => !p.isPlayground)

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Development Playground</h1>
            <p className="text-slate-500">Experiments, prototypes, and deployments linked to ACT projects</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Project tag filter */}
            {uniqueTags.length > 0 && (
              <select
                value={tagFilter || ''}
                onChange={e => setTagFilter(e.target.value || null)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">All Projects</option>
                {uniqueTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}

            {/* Type filter */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200">
              {(['all', 'experiments', 'production'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filter === f
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <SummaryStats />

      {/* Experiments Section */}
      {experiments.length > 0 && (filter === 'all' || filter === 'experiments') && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Experiments & Prototypes</h2>
          <p className="text-sm text-slate-500 mb-4">Quick deploys, placemats, and testing grounds</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {experiments.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* Production Section */}
      {production.length > 0 && (filter === 'all' || filter === 'production') && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Production Deployments</h2>
          <p className="text-sm text-slate-500 mb-4">Live client and public-facing sites</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {production.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">No projects match your filters</p>
        </div>
      )}
    </div>
  )
}
