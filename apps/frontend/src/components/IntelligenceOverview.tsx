/**
 * Intelligence Overview Dashboard
 *
 * Aggregates data from port 3456 (Command Center API):
 * - Moon cycle with LCAA alignment
 * - 2026 Goals by lane (A, B, C, D)
 * - Ecosystem health
 * - Active agents status
 * - Recent communications
 */

import { useState, useEffect } from 'react'
import { useBrainCenter } from '../hooks/brain'
import { resolveCommandCenterUrl } from '../config/env'

// ============================================
// Types
// ============================================

interface Agent {
  id: string
  name: string
  domain: string
  autonomy_level: number
  enabled: boolean
  last_heartbeat: string
  status: 'online' | 'offline' | 'error'
  current_task_id: string | null
  current_task_title: string | null
  completed_today: number
  pending_review: number
}

interface Communication {
  id: string
  subject: string
  channel: string
  contact_name: string | null
  occurred_at: string
}

interface OverviewData {
  agents: Agent[]
  communications: Communication[]
  todayCount: number
}

// ============================================
// Formatters
// ============================================

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return `$${value.toLocaleString('en-AU')}`
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return value.toLocaleString('en-AU')
}

const formatTimeAgo = (timestamp: string) => {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMinutes = Math.floor((now - then) / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const getLaneColor = (lane: string) => {
  if (lane.startsWith('A')) return 'border-l-emerald-500 bg-emerald-50/50'
  if (lane.startsWith('B')) return 'border-l-blue-500 bg-blue-50/50'
  if (lane.startsWith('C')) return 'border-l-amber-500 bg-amber-50/50'
  return 'border-l-violet-500 bg-violet-50/50'
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'online':
      return 'bg-emerald-100 text-emerald-700'
    case 'degraded':
      return 'bg-amber-100 text-amber-700'
    case 'critical':
    case 'offline':
    case 'error':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

// ============================================
// Components
// ============================================

function MetricCard({
  label,
  value,
  subvalue,
  icon,
  trend
}: {
  label: string
  value: string | number
  subvalue?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {subvalue && <p className="mt-1 text-sm text-slate-600">{subvalue}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs ${
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
        }`}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span className="capitalize">{trend} from last week</span>
        </div>
      )}
    </div>
  )
}

function MoonPhaseCard({ moon }: { moon: any }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm text-4xl">
          {moon.emoji}
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-600">Current Phase</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{moon.phase}</p>
          <p className="mt-1 text-sm text-slate-600">{moon.illumination}% illuminated</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-white/60 p-3">
        <p className="text-xs font-medium text-violet-700">LCAA Mode: <span className="font-semibold">{moon.act?.mode}</span></p>
        <p className="mt-1 text-sm text-slate-700">{moon.act?.focus}</p>
      </div>
    </div>
  )
}

function GoalsProgressCard({ goalsSummary, lanes }: { goalsSummary: any; lanes: any }) {
  const laneKeys = Object.keys(lanes || {})
  const totalGoals = goalsSummary?.total || 0
  const completedGoals = goalsSummary?.completed || 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">2026 Goals</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {completedGoals} / {totalGoals}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-violet-600">{goalsSummary?.overallProgress || 0}%</p>
          <p className="text-xs text-slate-500">complete</p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
          style={{ width: `${goalsSummary?.overallProgress || 0}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {laneKeys.slice(0, 4).map((key) => {
          const lane = lanes[key]
          return (
            <div key={key} className={`rounded-lg border-l-4 p-2 ${getLaneColor(key)}`}>
              <p className="text-xs font-medium text-slate-700">{key.split('—')[0].trim()}</p>
              <p className="text-sm font-semibold text-slate-900">
                {lane.completed}/{lane.total}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EcosystemHealthCard({ health, sites }: { health: any; sites: any[] }) {
  const criticalSites = sites?.filter((s: any) => s.status === 'critical' || s.status === 'degraded') || []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Ecosystem</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{health?.healthy || 0}/{health?.total || 0}</p>
          <p className="text-xs text-slate-500">sites healthy</p>
        </div>
        <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
          (health?.percentage || 0) >= 80 ? 'bg-emerald-100' :
          (health?.percentage || 0) >= 50 ? 'bg-amber-100' : 'bg-red-100'
        }`}>
          <span className={`text-lg font-bold ${
            (health?.percentage || 0) >= 80 ? 'text-emerald-700' :
            (health?.percentage || 0) >= 50 ? 'text-amber-700' : 'text-red-700'
          }`}>
            {health?.percentage || 0}%
          </span>
        </div>
      </div>

      {criticalSites.length > 0 && (
        <div className="mt-4 space-y-2">
          {criticalSites.slice(0, 3).map((site: any) => (
            <div key={site.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">{site.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(site.status)}`}>
                {site.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentsCard({ agents }: { agents: Agent[] }) {
  const activeAgents = agents?.filter((a: Agent) => a.status === 'online') || []
  const totalCompleted = agents?.reduce((sum: number, a: Agent) => sum + (a.completed_today || 0), 0) || 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Agents</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{activeAgents.length}</p>
          <p className="text-xs text-slate-500">of {agents?.length || 0} online</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-emerald-600">{totalCompleted}</p>
          <p className="text-xs text-slate-500">tasks today</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {agents?.slice(0, 6).map((agent: Agent) => (
          <div key={agent.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <div className={`h-2 w-2 rounded-full ${agent.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{agent.name}</p>
              <p className="text-xs text-slate-500">{agent.completed_today} today</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommunicationsCard({ communications, todayCount }: { communications: Communication[]; todayCount: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Communications</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{todayCount}</p>
          <p className="text-xs text-slate-500">today</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {communications?.slice(0, 5).map((comm: Communication) => (
          <div key={comm.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className={`h-2 w-2 rounded-full ${
              comm.channel === 'email' ? 'bg-blue-500' :
              comm.channel === 'calendar' ? 'bg-violet-500' :
              comm.channel === 'slack' ? 'bg-purple-500' : 'bg-slate-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{comm.subject}</p>
              <p className="text-xs text-slate-500">{comm.channel} • {formatTimeAgo(comm.occurred_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function CommandCenterOverview() {
  const { goals, lanes, goalsSummary, sites, categories, ecosystemHealth, moon, loading, refetch } = useBrainCenter()
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [agentsRes, commsRes] = await Promise.all([
          fetch(resolveCommandCenterUrl('/api/agents')),
          fetch(resolveCommandCenterUrl('/api/communications/recent'))
        ])

        if (agentsRes.ok) {
          const agents = await agentsRes.json()
          setOverviewData(prev => prev ? { ...prev, agents } : { agents, communications: [], todayCount: 0 })
        }

        if (commsRes.ok) {
          const comms = await commsRes.json()
          setOverviewData(prev => prev ? { ...prev, communications: comms.recent || [], todayCount: comms.today || 0 } : { agents: [], communications: comms.recent || [], todayCount: comms.today || 0 })
        }
      } catch (err) {
        console.error('Error fetching overview data:', err)
      }
    }

    fetchOverview()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"></div>
          <p className="text-sm text-slate-500">Loading command center data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">ACT Intelligence Platform</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Command Center</h1>
          <p className="mt-2 text-sm text-slate-600">
            Real-time intelligence from your ACT ecosystem • Port 3456
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Moon Phase */}
      {moon && <MoonPhaseCard moon={moon} />}

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Goals Progress"
          value={`${goalsSummary?.overallProgress || 0}%`}
          subvalue={`${goalsSummary?.completed || 0} of ${goalsSummary?.total || 0} complete`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend="stable"
        />
        <MetricCard
          label="Ecosystem"
          value={`${ecosystemHealth?.healthy || 0}/${ecosystemHealth?.total || 0}`}
          subvalue="sites healthy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Agents"
          value={overviewData?.agents?.filter((a: Agent) => a.status === 'online').length || 0}
          subvalue={`${overviewData?.agents?.length || 0} total`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          }
        />
        <MetricCard
          label="Comms Today"
          value={overviewData?.todayCount || 0}
          subvalue="communications"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Goals Progress */}
        {goalsSummary && lanes && <GoalsProgressCard goalsSummary={goalsSummary} lanes={lanes} />}

        {/* Ecosystem */}
        {ecosystemHealth && sites && <EcosystemHealthCard health={ecosystemHealth} sites={sites} />}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agents */}
        {overviewData?.agents && <AgentsCard agents={overviewData.agents} />}

        {/* Communications */}
        {overviewData && <CommunicationsCard communications={overviewData.communications} todayCount={overviewData.todayCount} />}
      </div>

      {/* Quick Navigation */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Quick Navigation</h3>
        <p className="mt-1 text-sm text-slate-600">Jump to specific intelligence modules</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a href="?tab=intelligence" className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Intelligence</p>
              <p className="text-xs text-slate-500">Goals & Agents</p>
            </div>
          </a>

          <a href="?tab=stories" className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Stories</p>
              <p className="text-xs text-slate-500">Content & Updates</p>
            </div>
          </a>

          <a href="?tab=impact" className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Impact</p>
              <p className="text-xs text-slate-500">Finance & Metrics</p>
            </div>
          </a>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Connected to Command Center API</p>
            <p className="text-xs text-slate-500">Port 3456 • {resolveCommandCenterUrl('/')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntelligenceOverview
