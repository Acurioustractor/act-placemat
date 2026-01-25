/**
 * FullProjectPage - Comprehensive Project Detail Page
 *
 * Displays all available information for a single project:
 * - Header with project identity and stats
 * - Tabbed content: LCAA, Handover, Contacts, Stories, Communications, Documentation
 *
 * Connected to data via useProjectDetail hook
 */

import { useState } from 'react'
import { useProjectDetail, type ProjectDetailData } from '../../hooks/useProjectDetail'
import { CATEGORY_META, LCAA_FRAMEWORK, type LCAAPhase, type ACTFullProject } from '../../data/allProjects'
import { ProjectKnowledgeTab } from './ProjectKnowledgeTab'

// ============================================
// Types
// ============================================

type TabId = 'overview' | 'knowledge' | 'lcaa' | 'handover' | 'contacts' | 'stories' | 'communications' | 'opportunities' | 'documentation'

interface TabConfig {
  id: TabId
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'knowledge', label: "What's Happening", icon: '🔔' },
  { id: 'lcaa', label: 'LCAA', icon: '🌀' },
  { id: 'handover', label: 'Handover', icon: '🤝' },
  { id: 'contacts', label: 'Contacts', icon: '👥' },
  { id: 'stories', label: 'Stories', icon: '📖' },
  { id: 'communications', label: 'Comms', icon: '💬' },
  { id: 'opportunities', label: 'Opportunities', icon: '🎯' },
  { id: 'documentation', label: 'Docs', icon: '📄' },
]

// ============================================
// Main Component
// ============================================

interface FullProjectPageProps {
  projectCode: string
  apiProject?: ACTFullProject | null
  onBack: () => void
}

export function FullProjectPage({ projectCode, apiProject, onBack }: FullProjectPageProps) {
  const { data, loading, error, refetch } = useProjectDetail(projectCode, apiProject)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 mb-4">{error || 'Project not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
        >
          Go Back
        </button>
      </div>
    )
  }

  const { project } = data
  const categoryMeta = CATEGORY_META[project.category]
  const overallHealth = Math.round(
    (project.handoverReadiness.documentation +
      project.handoverReadiness.training +
      project.handoverReadiness.ownership +
      project.handoverReadiness.exitStrategy) / 4
  )

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <header className="bg-white rounded-lg border border-slate-200 p-6">
        {/* Back button row */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Projects</span>
          </button>

          <div className="flex items-center gap-2">
            {project.priority === 'high' && (
              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                High Priority
              </span>
            )}
            {project.culturalProtocols && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full flex items-center gap-1">
                <span>🌏</span> Cultural Protocols
              </span>
            )}
          </div>
        </div>

        {/* Project header */}
        <div className="flex items-start gap-4">
          <div className="text-4xl">{project.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">
                {project.code}
              </span>
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${categoryMeta.color}20`,
                  color: categoryMeta.color,
                }}
              >
                {categoryMeta.icon} {categoryMeta.label}
              </span>
            </div>
            <p className="text-slate-600 mb-3">{project.description}</p>
            {project.leads.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-medium">Leads:</span>
                {project.leads.map((lead, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1">
                    <span>{lead.name}</span>
                    {lead.role && <span className="text-slate-400">({lead.role})</span>}
                    {idx < project.leads.length - 1 && <span>,</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Health Score"
          value={`${project.healthScore}%`}
          color={project.healthScore >= 70 ? 'emerald' : project.healthScore >= 50 ? 'amber' : 'red'}
          icon="📊"
        />
        <StatCard
          label="Contacts"
          value={data.contactStats.total.toString()}
          subValue={`${data.contactStats.hot} hot`}
          color="blue"
          icon="👥"
        />
        <StatCard
          label="Stories"
          value={data.storiesCount.toString()}
          color="violet"
          icon="📖"
        />
        <StatCard
          label="Opportunities"
          value={(project.opportunities?.length || 0).toString()}
          color="amber"
          icon="🎯"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'contacts' && data.contactStats.total > 0 && (
                  <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded">
                    {data.contactStats.total}
                  </span>
                )}
                {tab.id === 'stories' && data.storiesCount > 0 && (
                  <span className="bg-violet-100 text-violet-600 text-xs px-1.5 py-0.5 rounded">
                    {data.storiesCount}
                  </span>
                )}
                {tab.id === 'opportunities' && project.opportunities.length > 0 && (
                  <span className="bg-amber-100 text-amber-600 text-xs px-1.5 py-0.5 rounded">
                    {project.opportunities.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'knowledge' && <ProjectKnowledgeTab projectCode={projectCode} />}
          {activeTab === 'lcaa' && <LCAATab data={data} />}
          {activeTab === 'handover' && <HandoverTab data={data} />}
          {activeTab === 'contacts' && <ContactsTab data={data} />}
          {activeTab === 'stories' && <StoriesTab data={data} />}
          {activeTab === 'communications' && <CommunicationsTab data={data} />}
          {activeTab === 'opportunities' && <OpportunitiesTab data={data} />}
          {activeTab === 'documentation' && <DocumentationTab data={data} />}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Stat Card Component
// ============================================

function StatCard({
  label,
  value,
  subValue,
  color,
  icon,
}: {
  label: string
  value: string
  subValue?: string
  color: 'emerald' | 'blue' | 'violet' | 'amber' | 'red'
  icon: string
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="text-sm opacity-80">{label}</div>
      {subValue && <div className="text-xs mt-1 opacity-60">{subValue}</div>}
    </div>
  )
}

// ============================================
// Tab: Overview
// ============================================

function OverviewTab({ data }: { data: ProjectDetailData }) {
  const { project } = data
  const categoryMeta = CATEGORY_META[project.category]

  return (
    <div className="space-y-6">
      {/* Project Description - Enhanced */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">About This Project</h3>
        <p className="text-slate-700 leading-relaxed text-lg">{project.description}</p>

        {project.almaProgram && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">ALMA Program:</span>
            <span className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm font-medium">
              {project.almaProgram}
            </span>
          </div>
        )}
      </div>

      {/* Key Information Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status & Priority */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Status</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                project.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Priority</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                project.priority === 'high' ? 'bg-red-100 text-red-700' :
                project.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Category</span>
              <span
                className="px-2 py-1 rounded text-sm font-medium"
                style={{ backgroundColor: `${categoryMeta.color}20`, color: categoryMeta.color }}
              >
                {categoryMeta.icon} {categoryMeta.label}
              </span>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Team</h4>
          {project.leads.length > 0 ? (
            <div className="space-y-2">
              {project.leads.map((lead, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{lead.name}</div>
                    {lead.role && <div className="text-sm text-slate-500">{lead.role}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">No leads assigned</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-700">{project.healthScore}%</div>
          <div className="text-xs text-emerald-600">Health Score</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{data.contactStats.total}</div>
          <div className="text-xs text-blue-600">Contacts</div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-violet-700">{data.storiesCount}</div>
          <div className="text-xs text-violet-600">Stories</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{project.opportunities.length}</div>
          <div className="text-xs text-amber-600">Opportunities</div>
        </div>
      </div>

      {/* LCAA Phase Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">LCAA Journey</h4>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium capitalize">
            {project.lcaaPhase} Phase
          </span>
        </div>
        <p className="text-slate-600">{LCAA_FRAMEWORK[project.lcaaPhase]}</p>
        {project.lcaaThemes && project.lcaaThemes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {project.lcaaThemes.map((theme, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-sm">
                {theme}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cultural Protocols Alert */}
      {project.culturalProtocols && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-800 mb-2">
            <span className="text-xl">🌏</span>
            <h4 className="font-semibold">Cultural Protocols Apply</h4>
          </div>
          <p className="text-sm text-emerald-700">
            This project involves First Nations communities. Elder consultation is required
            for significant decisions and all cultural materials must be handled with respect
            for traditional knowledge protocols.
          </p>
        </div>
      )}

      {/* Frontends */}
      {project.frontends && project.frontends.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Live Sites</h4>
          <div className="flex flex-wrap gap-2">
            {project.frontends.map((frontend) => (
              <a
                key={frontend.id}
                href={frontend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                <span>🌐</span>
                <span className="font-medium">{frontend.name}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Tab: LCAA Journey
// ============================================

function LCAATab({ data }: { data: ProjectDetailData }) {
  const { project } = data
  const phases: LCAAPhase[] = ['listen', 'curiosity', 'action', 'art']
  const currentPhaseIndex = phases.indexOf(project.lcaaPhase)

  return (
    <div className="space-y-6">
      {/* LCAA Phase Progress */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">LCAA Phase Journey</h3>
        <div className="flex items-center gap-2 mb-6">
          {phases.map((phase, index) => (
            <div key={phase} className="flex-1 flex items-center gap-2">
              <div
                className={`
                  flex-1 h-2 rounded-full
                  ${index <= currentPhaseIndex ? 'bg-emerald-500' : 'bg-slate-200'}
                `}
              />
              {index < phases.length - 1 && (
                <div
                  className={`
                    w-2 h-2 rounded-full
                    ${index < currentPhaseIndex ? 'bg-emerald-500' : 'bg-slate-200'}
                  `}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {phases.map((phase, index) => (
            <div
              key={phase}
              className={`text-center ${
                phase === project.lcaaPhase ? 'text-emerald-600 font-semibold' : 'text-slate-400'
              }`}
            >
              <div className="capitalize">{phase}</div>
              {phase === project.lcaaPhase && (
                <div className="text-xs text-emerald-500">Current</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Phase Description */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-medium text-emerald-800 mb-2 capitalize">
          {project.lcaaPhase} Phase
        </h4>
        <p className="text-emerald-700 text-sm">
          {LCAA_FRAMEWORK[project.lcaaPhase]}
        </p>
      </div>

      {/* LCAA Themes */}
      {project.lcaaThemes && project.lcaaThemes.length > 0 && (
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Active Themes</h4>
          <div className="flex flex-wrap gap-2">
            {project.lcaaThemes.map((theme, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ALMA Program */}
      {project.almaProgram && (
        <div>
          <h4 className="font-medium text-slate-900 mb-2">ALMA Program</h4>
          <p className="text-slate-600">{project.almaProgram}</p>
        </div>
      )}

      {/* Cultural Protocols */}
      {project.culturalProtocols && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-800 mb-2">
            <span className="text-xl">🌏</span>
            <h4 className="font-medium">Cultural Protocols Apply</h4>
          </div>
          <p className="text-sm text-emerald-700">
            This project involves First Nations communities. Elder consultation is required
            for significant decisions and all cultural materials must be handled with respect
            for traditional knowledge protocols.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Tab: Handover Readiness
// ============================================

function HandoverTab({ data }: { data: ProjectDetailData }) {
  const { project } = data
  const { handoverReadiness } = project

  const metrics = [
    { label: 'Documentation', value: handoverReadiness.documentation, desc: 'Project docs, SOPs, knowledge base' },
    { label: 'Training', value: handoverReadiness.training, desc: 'Team training, skill transfer' },
    { label: 'Community Ownership', value: handoverReadiness.ownership, desc: 'Local leadership, decision-making' },
    { label: 'Exit Strategy', value: handoverReadiness.exitStrategy, desc: 'Transition plan, sustainability' },
  ]

  const overallScore = Math.round(
    (handoverReadiness.documentation +
      handoverReadiness.training +
      handoverReadiness.ownership +
      handoverReadiness.exitStrategy) / 4
  )

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="text-center py-6">
        <div
          className={`
            inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold
            ${overallScore >= 70
              ? 'bg-emerald-100 text-emerald-700'
              : overallScore >= 40
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
            }
          `}
        >
          {overallScore}%
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mt-4">Beautiful Obsolescence Score</h3>
        <p className="text-sm text-slate-500 mt-1">
          How ready is this project to be handed over to the community?
        </p>
      </div>

      {/* Detailed Metrics */}
      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-900">{metric.label}</span>
              <span
                className={`font-bold ${
                  metric.value >= 70
                    ? 'text-emerald-600'
                    : metric.value >= 40
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}
              >
                {metric.value}%
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  metric.value >= 70
                    ? 'bg-emerald-500'
                    : metric.value >= 40
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`}
                style={{ width: `${metric.value}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">{metric.desc}</p>
          </div>
        ))}
      </div>

      {/* Field Note */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-6">
        <p className="text-sm text-amber-800 italic">
          <span className="font-semibold not-italic">Field note:</span> If we cannot hand it
          over, we are still in Curiosity. True success is our own obsolescence.
        </p>
      </div>
    </div>
  )
}

// ============================================
// Tab: Contacts
// ============================================

function ContactsTab({ data }: { data: ProjectDetailData }) {
  const { contacts, contactStats } = data

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="No contacts linked"
        description="Contacts tagged with this project's GHL tags will appear here."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Contact Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-700">{contactStats.total}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{contactStats.hot}</div>
          <div className="text-xs text-red-500">Hot</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{contactStats.warm}</div>
          <div className="text-xs text-amber-500">Warm</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{contactStats.cool}</div>
          <div className="text-xs text-blue-500">Cool</div>
        </div>
      </div>

      {/* Contact List */}
      <div className="divide-y divide-slate-200">
        {contacts.slice(0, 20).map((contact) => (
          <div key={contact.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  contact.temperature >= 70
                    ? 'bg-red-500'
                    : contact.temperature >= 40
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />
              <div>
                <div className="font-medium text-slate-900">{contact.contact_name}</div>
                {contact.contact_email && (
                  <div className="text-sm text-slate-500">{contact.contact_email}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700">
                {contact.temperature}
              </div>
              {contact.days_since_contact !== null && (
                <div
                  className={`text-xs ${
                    contact.days_since_contact > 30
                      ? 'text-red-500'
                      : contact.days_since_contact > 14
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {contact.days_since_contact}d ago
                </div>
              )}
            </div>
          </div>
        ))}
        {contacts.length > 20 && (
          <div className="py-3 text-center text-sm text-slate-500">
            + {contacts.length - 20} more contacts
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Tab: Stories
// ============================================

function StoriesTab({ data }: { data: ProjectDetailData }) {
  const { stories, storiesCount } = data

  if (stories.length === 0) {
    return (
      <EmptyState
        icon="📖"
        title="No stories yet"
        description="Stories from Empathy Ledger linked to this project will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">{storiesCount} Stories</h3>
        <span className="text-sm text-slate-500">From Empathy Ledger</span>
      </div>

      <div className="grid gap-4">
        {stories.map((story) => (
          <div
            key={story.id}
            className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-slate-900">{story.title}</h4>
              {story.lcaa_stage && (
                <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded">
                  {story.lcaa_stage}
                </span>
              )}
            </div>
            {story.excerpt && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">{story.excerpt}</p>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>By {story.storyteller_name}</span>
              <span>{new Date(story.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Tab: Communications
// ============================================

function CommunicationsTab({ data }: { data: ProjectDetailData }) {
  const { communications, communicationsStats } = data

  return (
    <div className="space-y-6">
      {/* Communication Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{communicationsStats.last7Days}</div>
          <div className="text-xs text-blue-500">Last 7 days</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-slate-600">{communicationsStats.last30Days}</div>
          <div className="text-xs text-slate-500">Last 30 days</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-indigo-600">{communicationsStats.totalEmails}</div>
          <div className="text-xs text-indigo-500">Emails</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-emerald-600">{communicationsStats.totalMeetings}</div>
          <div className="text-xs text-emerald-500">Meetings</div>
        </div>
      </div>

      {/* Communications List */}
      {communications.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No communications tracked"
          description="Emails and meetings mentioning this project will appear here."
        />
      ) : (
        <div className="space-y-3">
          {communications.slice(0, 10).map((comm) => (
            <div
              key={comm.id}
              className="bg-slate-50 rounded-lg p-3 flex items-start gap-3"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                  comm.type === 'email'
                    ? 'bg-blue-100'
                    : comm.type === 'meeting'
                    ? 'bg-emerald-100'
                    : 'bg-slate-100'
                }`}
              >
                {comm.type === 'email' ? '📧' : comm.type === 'meeting' ? '📅' : '📝'}
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">{comm.subject}</div>
                {comm.summary && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{comm.summary}</p>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(comm.date).toLocaleDateString()}
                  {comm.participants.length > 0 && (
                    <span> - {comm.participants.slice(0, 2).join(', ')}</span>
                  )}
                </div>
              </div>
              {comm.importance === 'high' && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                  High
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Tab: Opportunities
// ============================================

function OpportunitiesTab({ data }: { data: ProjectDetailData }) {
  const { project } = data
  const opportunities = project.opportunities || []

  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon="🎯"
        title="No active opportunities"
        description="Funding, partnership, and growth opportunities for this project will appear here."
      />
    )
  }

  // Group by type
  const byType = {
    funding: opportunities.filter(o => o.type === 'funding'),
    partnership: opportunities.filter(o => o.type === 'partnership'),
    content: opportunities.filter(o => o.type === 'content'),
    technology: opportunities.filter(o => o.type === 'technology'),
    storytelling: opportunities.filter(o => o.type === 'storytelling'),
  }

  const typeIcons: Record<string, string> = {
    funding: '💰',
    partnership: '🤝',
    content: '📝',
    technology: '💻',
    storytelling: '📖',
  }

  const typeLabels: Record<string, string> = {
    funding: 'Funding Opportunities',
    partnership: 'Partnership Opportunities',
    content: 'Content Opportunities',
    technology: 'Technology Opportunities',
    storytelling: 'Storytelling Opportunities',
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {opportunities.filter(o => o.priority === 'high').length}
          </div>
          <div className="text-sm text-red-500">High Priority</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {opportunities.filter(o => o.priority === 'medium').length}
          </div>
          <div className="text-sm text-amber-500">Medium Priority</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-600">
            {opportunities.filter(o => o.priority === 'low').length}
          </div>
          <div className="text-sm text-slate-500">Low Priority</div>
        </div>
      </div>

      {/* Opportunities by Type */}
      {Object.entries(byType).map(([type, items]) => {
        if (items.length === 0) return null
        return (
          <div key={type}>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span>{typeIcons[type]}</span>
              <span>{typeLabels[type]}</span>
              <span className="text-sm font-normal text-slate-500">({items.length})</span>
            </h3>
            <div className="space-y-3">
              {items.map((opp, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-4 border-l-4 ${
                    opp.priority === 'high'
                      ? 'bg-red-50 border-red-500'
                      : opp.priority === 'medium'
                      ? 'bg-amber-50 border-amber-500'
                      : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{opp.title}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        opp.priority === 'high'
                          ? 'bg-red-200 text-red-800'
                          : opp.priority === 'medium'
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {opp.priority}
                    </span>
                  </div>
                  {opp.description && (
                    <p className="text-sm text-slate-600 mb-2">{opp.description}</p>
                  )}
                  {opp.action && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">Action:</span>
                      <span className="text-slate-600">{opp.action}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// Tab: Documentation
// ============================================

function DocumentationTab({ data }: { data: ProjectDetailData }) {
  const { project, notionPages } = data

  return (
    <div className="space-y-6">
      {/* Notion Pages */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Notion Documentation</h3>
        {notionPages.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No Notion pages linked"
            description="Notion pages for this project will appear here."
          />
        ) : (
          <div className="space-y-2">
            {notionPages.map((page) => (
              <a
                key={page.id}
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
              >
                <span className="text-xl">📝</span>
                <span className="flex-1 font-medium text-slate-900">{page.title}</span>
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* System Integrations */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">System Integrations</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* GHL Tags */}
          {project.ghlTags.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>📇</span>
                <span className="font-medium text-slate-700">GHL Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {project.ghlTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Xero Tracking */}
          {project.xeroTracking && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>💰</span>
                <span className="font-medium text-slate-700">Xero Tracking</span>
              </div>
              <span className="text-sm text-slate-600">{project.xeroTracking}</span>
            </div>
          )}

          {/* Dext Category */}
          {project.dextCategory && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🧾</span>
                <span className="font-medium text-slate-700">Dext Category</span>
              </div>
              <span className="text-sm text-slate-600">{project.dextCategory}</span>
            </div>
          )}

          {/* Frontends */}
          {project.frontends && project.frontends.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🌐</span>
                <span className="font-medium text-slate-700">Frontends</span>
              </div>
              <div className="space-y-1">
                {project.frontends.map((frontend) => (
                  <a
                    key={frontend.id}
                    href={frontend.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    {frontend.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ============================================
// Empty State Component
// ============================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="text-center py-12">
      <span className="text-4xl">{icon}</span>
      <h3 className="text-lg font-medium text-slate-900 mt-4">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </div>
  )
}
