/**
 * FrontendsTab - ACT Ecosystem Frontends & Codebases Dashboard
 *
 * Tracks all ACT websites, applications, and repositories.
 * Uses embedded data - no external API required.
 *
 * For ACT Operations (Nic + Ben)
 */

import { useState, useMemo } from 'react'
import {
  ACT_PROJECTS,
  getProjectsSummary
} from '../../data/actProjects'
import type { ACTProject } from '../../data/actProjects'
import { PROJECT_ENRICHMENT, getProjectEnrichment } from '../../data/projectEnrichment'
import type { EnrichedProject } from '../../data/projectEnrichment'

// Merged project type with enrichment
interface MergedProject extends ACTProject {
  enrichment?: EnrichedProject
}

// Status badge component
function StatusBadge({ status }: { status: ACTProject['status'] }) {
  const styles = {
    online: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    offline: 'bg-red-100 text-red-700 border-red-200',
    local: 'bg-blue-100 text-blue-700 border-blue-200',
    unknown: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  const icons = {
    online: '●',
    offline: '○',
    local: '◐',
    unknown: '?',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
      <span className="text-[10px]">{icons[status]}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Type badge component
function TypeBadge({ type }: { type: ACTProject['type'] }) {
  const styles = {
    website: 'bg-violet-50 text-violet-600',
    platform: 'bg-orange-50 text-orange-600',
    infrastructure: 'bg-slate-100 text-slate-600',
    codebase: 'bg-cyan-50 text-cyan-600',
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[type]}`}>
      {type}
    </span>
  )
}

// Health score ring
function HealthRing({ score }: { score: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="#e2e8f0"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
        {score}
      </span>
    </div>
  )
}

// Frontend card component with enrichment
function FrontendCard({ frontend, onClick }: { frontend: MergedProject; onClick: () => void }) {
  const enrichment = frontend.enrichment

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-300 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Health Score */}
        {(enrichment?.healthScore || frontend.healthScore) && (
          <HealthRing score={enrichment?.healthScore || frontend.healthScore || 0} />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 group-hover:text-violet-700 transition-colors truncate">
              {frontend.name}
            </h3>
            <StatusBadge status={frontend.status} />
          </div>

          {/* Focus/Description - prefer enrichment focus */}
          <p className="text-sm text-slate-500 mb-2 line-clamp-2">
            {enrichment?.focus || frontend.description}
          </p>

          {/* Contacts count from enrichment */}
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

          {/* Tech stack */}
          <div className="flex flex-wrap gap-1 mb-3">
            {frontend.tech.slice(0, 3).map(tech => (
              <span
                key={tech}
                className="px-2 py-0.5 text-xs bg-slate-50 text-slate-600 rounded"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Links */}
          <div className="flex items-center gap-3 text-xs">
            {frontend.url && (
              <a
                href={frontend.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit
              </a>
            )}
            {frontend.github && (
              <a
                href={`https://github.com/${frontend.github}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            )}
            <TypeBadge type={frontend.type} />
          </div>
        </div>
      </div>
    </button>
  )
}

// Category section
function CategorySection({
  title,
  description,
  frontends,
  onSelect,
}: {
  title: string
  description: string
  frontends: MergedProject[]
  onSelect: (frontend: MergedProject) => void
}) {
  if (frontends.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {frontends.map(frontend => (
          <FrontendCard
            key={frontend.id}
            frontend={frontend}
            onClick={() => onSelect(frontend)}
          />
        ))}
      </div>
    </section>
  )
}

// Summary stats
function SummaryStats() {
  const summary = getProjectsSummary()

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-3xl font-bold text-slate-900">{summary.total}</div>
        <div className="text-sm text-slate-500">Total Frontends</div>
      </div>
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
        <div className="text-3xl font-bold text-emerald-700">{summary.online}</div>
        <div className="text-sm text-emerald-600">Online</div>
      </div>
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="text-3xl font-bold text-blue-700">{summary.local}</div>
        <div className="text-sm text-blue-600">Local Dev</div>
      </div>
      <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
        <div className="text-3xl font-bold text-violet-700">{summary.avgHealth}%</div>
        <div className="text-sm text-violet-600">Avg Health</div>
      </div>
    </div>
  )
}

// Detail panel with enrichment
function DetailPanel({ frontend, onClose }: { frontend: MergedProject; onClose: () => void }) {
  const enrichment = frontend.enrichment
  const healthScore = enrichment?.healthScore || frontend.healthScore

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-slate-200 shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {healthScore && <HealthRing score={healthScore} />}
          <div>
            <h2 className="font-semibold text-lg text-slate-900">{frontend.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={frontend.status} />
              <TypeBadge type={frontend.type} />
              {enrichment?.contacts && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {enrichment.contacts} contacts
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        {/* Focus/Mission from enrichment */}
        {enrichment?.focus && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Mission</h3>
            <p className="text-slate-700 font-medium">{enrichment.focus}</p>
          </section>
        )}

        {/* Description */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
          <p className="text-slate-700">{frontend.description}</p>
        </section>

        {/* Opportunities from enrichment - FULL DISPLAY */}
        {enrichment?.opportunities && enrichment.opportunities.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">
              Opportunities ({enrichment.opportunities.length})
            </h3>
            <div className="space-y-3">
              {enrichment.opportunities.map((opp, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    opp.priority === 'high'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                      opp.priority === 'high'
                        ? 'bg-orange-200 text-orange-800'
                        : 'bg-amber-200 text-amber-800'
                    }`}>
                      {opp.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">{opp.type}</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{opp.title}</h4>
                  <p className="text-sm text-slate-600 mb-2">{opp.description}</p>
                  <div className="text-xs text-slate-500">
                    <strong>Action:</strong> {opp.action}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Frontends from enrichment */}
        {enrichment?.frontends && enrichment.frontends.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Related Frontends</h3>
            <div className="space-y-2">
              {enrichment.frontends.map(fe => (
                <a
                  key={fe.id}
                  href={fe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">{fe.name}</span>
                  <span className="text-xs text-violet-600">{fe.url}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {frontend.tags.projects.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Project Tags</h3>
            <div className="flex flex-wrap gap-2">
              {frontend.tags.projects.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Links */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Links</h3>
          <div className="space-y-2">
            {frontend.url && (
              <a
                href={frontend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-violet-600 hover:text-violet-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {frontend.url}
              </a>
            )}
            {frontend.github && (
              <a
                href={`https://github.com/${frontend.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                {frontend.github}
              </a>
            )}
            {frontend.localPath && (
              <div className="flex items-center gap-2 text-slate-500 text-sm font-mono">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {frontend.localPath}
              </div>
            )}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {frontend.tech.map(tech => (
              <span
                key={tech}
                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section>
          <h3 className="text-sm font-medium text-slate-500 mb-2">Quick Actions</h3>
          <div className="space-y-2">
            {frontend.url && (
              <a
                href={frontend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Open in Browser
              </a>
            )}
            {frontend.github && (
              <a
                href={`https://github.com/${frontend.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
              >
                View on GitHub
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// Main component
export function FrontendsTab() {
  const [selectedFrontend, setSelectedFrontend] = useState<MergedProject | null>(null)
  const [filter, setFilter] = useState<'all' | 'core' | 'client' | 'internal'>('all')

  // Merge projects with enrichment data
  const mergedProjects: MergedProject[] = useMemo(() => {
    return ACT_PROJECTS.filter(p => !p.isPlayground).map(project => {
      // Find enrichment by matching project tag codes
      const projectTag = project.tags.projects[0] // e.g., 'ACT-EL'
      const enrichment = PROJECT_ENRICHMENT.find(e => e.code === projectTag)
      return { ...project, enrichment }
    })
  }, [])

  // Group by category
  const groupedFrontends = useMemo(() => {
    const filtered = filter === 'all'
      ? mergedProjects
      : mergedProjects.filter(f => f.category === filter)

    return {
      core: filtered.filter(f => f.category === 'core'),
      client: filtered.filter(f => f.category === 'client'),
      internal: filtered.filter(f => f.category === 'internal'),
    }
  }, [filter, mergedProjects])

  const summary = getProjectsSummary()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ACT Development</h1>
            <p className="text-slate-500">
              Codebases, deployments, and development infrastructure
              <span className="text-xs ml-2 text-slate-400">({summary.total} projects)</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200">
              {(['all', 'core', 'client', 'internal'] as const).map(f => (
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

      {/* Summary Stats */}
      <SummaryStats />

      {/* Core Platforms */}
      <CategorySection
        title="Core Platforms"
        description="Primary ACT websites and applications"
        frontends={groupedFrontends.core}
        onSelect={setSelectedFrontend}
      />

      {/* Client Projects */}
      <CategorySection
        title="Client Projects"
        description="Partner and client-facing platforms"
        frontends={groupedFrontends.client}
        onSelect={setSelectedFrontend}
      />

      {/* Internal Infrastructure */}
      <CategorySection
        title="Internal Infrastructure"
        description="Operations, agents, and dev tools"
        frontends={groupedFrontends.internal}
        onSelect={setSelectedFrontend}
      />

      {/* Empty state */}
      {mergedProjects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">No frontends found.</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedFrontend && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedFrontend(null)}
          />
          <DetailPanel
            frontend={selectedFrontend}
            onClose={() => setSelectedFrontend(null)}
          />
        </>
      )}
    </div>
  )
}
