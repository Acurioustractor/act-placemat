/**
 * ACT Brain Center - Main Dashboard for 2026 Goals, Ecosystem, and Alerts
 *
 * Matches the design from brain-center.html (act-dashboard package)
 * Connects to Command Center API (port 3456) for:
 * - 2026 Goals by Lane (A, B, C, D)
 * - Ecosystem health monitoring with alerts
 * - Site health scores and trends
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'
import { Card } from '../ui/Card'

// ============================================
// Types (matching API response)
// ============================================

interface Goal {
  id: string
  notion_id: string
  title: string
  type: 'Yearly Goal' | 'Quarterly Sprint'
  lane: string | null
  status: string
  progress_percentage: number
  key_results: string | null
}

interface Lane {
  name: string
  goals: Goal[]
  completed: number
  total: number
  progress: number
}

interface GoalsData {
  lanes: Record<string, Lane>
  summary: {
    total: number
    yearly: number
    quarterly: number
    completed: number
    inProgress: number
    overallProgress: number
  }
}

interface Site {
  id: string
  name: string
  slug: string
  url: string
  status: 'healthy' | 'degraded' | 'offline' | 'unknown'
  health_score: number
  health_trend: 'up' | 'down' | 'stable'
  last_check_at: string | null
  category: string
}

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  created_at: string
}

interface EcosystemSummary {
  summary: {
    avgScore: number
    healthy: number
    total: number
    alertCount: number
  }
  sites: Site[]
  alerts: Alert[]
}

// ============================================
// Sub-components
// ============================================

function SummaryStats({ goals, ecosystem }: { goals: GoalsData | null; ecosystem: EcosystemSummary | null }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-indigo-600">
          {ecosystem?.summary?.avgScore || '--'}
        </div>
        <div className="text-xs text-slate-500 mt-1">Avg Health Score</div>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-emerald-600">
          {goals?.summary?.overallProgress || 0}%
        </div>
        <div className="text-xs text-slate-500 mt-1">Goals Progress</div>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-slate-700">
          {ecosystem?.summary?.healthy || 0}/{ecosystem?.summary?.total || 0}
        </div>
        <div className="text-xs text-slate-500 mt-1">Healthy Sites</div>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-amber-600">
          {ecosystem?.summary?.alertCount || 0}
        </div>
        <div className="text-xs text-slate-500 mt-1">Active Alerts</div>
      </div>
    </div>
  )
}

function GoalsPanel({ data, loading }: { data: GoalsData | null; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <div className="card-header">
          <span className="text-sm font-semibold text-slate-700">2026 Goals Progress</span>
        </div>
        <div className="animate-pulse space-y-4 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
              <div className="h-2 bg-slate-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (!data || !data.lanes) {
    return (
      <Card>
        <div className="card-header">
          <span className="text-sm font-semibold text-slate-700">2026 Goals Progress</span>
        </div>
        <div className="text-center py-8 text-slate-400">No goals found</div>
      </Card>
    )
  }

  const getStatusIcon = (status: string) => {
    if (status === 'Completed') return '✓'
    if (status === 'In progress' || status.includes('progress')) return '▶'
    if (status === 'Planning' || status === 'Not started') return '○'
    return '□'
  }

  const truncate = (str: string, len: number) => {
    if (!str) return ''
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-700">2026 Goals Progress</span>
      </div>

      <div className="space-y-4">
        {Object.entries(data.lanes).map(([key, lane]) => {
          if (lane.goals.length === 0) return null

          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{lane.name} ({lane.goals.length})</span>
                <span>{lane.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${lane.progress}%` }}
                />
              </div>

              {lane.goals.slice(0, 5).map(goal => (
                <div
                  key={goal.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded bg-slate-50 hover:bg-slate-100 text-xs mb-1"
                >
                  <span className="text-slate-400 w-4">{getStatusIcon(goal.status)}</span>
                  <span className="flex-1 text-slate-700 truncate">{truncate(goal.title, 35)}</span>
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${goal.progress_percentage}%` }}
                    />
                  </div>
                  <span className="text-slate-400 w-8 text-right">{goal.progress_percentage}%</span>
                </div>
              ))}

              {lane.goals.length > 5 && (
                <div className="text-center py-1 text-xs text-slate-400">
                  +{lane.goals.length - 5} more
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function AlertsPanel({ alerts, loading }: { alerts: Alert[] | null; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <div className="card-header">
          <span className="text-sm font-semibold text-slate-700">Health Alerts</span>
        </div>
        <div className="animate-pulse space-y-3 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-slate-100 rounded"></div>
          ))}
        </div>
      </Card>
    )
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-700">Health Alerts</span>
        </div>
        <div className="text-center py-8">
          <div className="text-2xl mb-2">✓</div>
          <div className="text-sm text-slate-400">No active alerts</div>
        </div>
      </Card>
    )
  }

  const getAlertIcon = (severity: string) => {
    if (severity === 'critical') return '⚠'
    if (severity === 'warning') return '⚠'
    return 'ℹ'
  }

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-700">Health Alerts</span>
      </div>

      <div className="space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`flex items-start gap-2 p-2.5 rounded text-xs ${
              alert.severity === 'critical'
                ? 'bg-red-50 border-l-2 border-red-400'
                : alert.severity === 'warning'
                ? 'bg-amber-50 border-l-2 border-amber-400'
                : 'bg-blue-50 border-l-2 border-blue-400'
            }`}
          >
            <span className="text-base">{getAlertIcon(alert.severity)}</span>
            <div className="flex-1">
              <div className="text-slate-700">{alert.message}</div>
              <div className="text-slate-400 mt-0.5">{formatTimeAgo(alert.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function EcosystemHealthMap({ sites, loading }: { sites: Site[] | null; loading: boolean }) {
  if (loading) {
    return (
      <Card className="md:col-span-2">
        <div className="card-header">
          <span className="text-sm font-semibold text-slate-700">Ecosystem Health Map</span>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!sites || sites.length === 0) {
    return (
      <Card className="md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-700">Ecosystem Health Map</span>
        </div>
        <div className="text-center py-8 text-slate-400">No sites found</div>
      </Card>
    )
  }

  const getScoreClass = (score: number, status: string) => {
    if (status === 'healthy') return 'text-emerald-600'
    if (status === 'degraded') return 'text-amber-600'
    if (status === 'offline') return 'text-slate-400'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑ up'
    if (trend === 'down') return '↓ down'
    return '→ stable'
  }

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <Card className="md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-700">Ecosystem Health Map</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sites.map(site => (
          <a
            key={site.id}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-3 rounded-lg border transition-colors ${
              site.status === 'healthy'
                ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
                : site.status === 'degraded'
                ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-slate-700 truncate mb-1.5">
              {site.name}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${getScoreClass(site.health_score, site.status)}`}>
                {site.health_score}
              </span>
              <span className="text-xs text-slate-400">
                {getTrendIcon(site.health_trend)}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatTimeAgo(site.last_check_at)}
            </div>
          </a>
        ))}
      </div>
    </Card>
  )
}

// ============================================
// Main Component
// ============================================

export function ACTBrainCenter() {
  const [goalsData, setGoalsData] = useState<GoalsData | null>(null)
  const [ecosystemData, setEcosystemData] = useState<EcosystemSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch(resolveCommandCenterUrl('/api/goals/2026'))
      if (res.ok) {
        const data = await res.json()
        setGoalsData(data)
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err)
    }
  }, [])

  const fetchEcosystem = useCallback(async () => {
    try {
      // Try health-summary endpoint first
      let res = await fetch(resolveCommandCenterUrl('/api/ecosystem/health-summary'))
      if (res.ok) {
        const data = await res.json()
        setEcosystemData(data)
        return
      }

      // Fall back to basic ecosystem endpoint
      res = await fetch(resolveCommandCenterUrl('/api/ecosystem'))
      if (res.ok) {
        const data = await res.json()
        setEcosystemData({
          summary: {
            avgScore: data.sites?.reduce((sum: number, s: Site) => sum + (s.health_score || 0), 0) / (data.sites?.length || 1) || 0,
            healthy: data.sites?.filter((s: Site) => s.status === 'healthy').length || 0,
            total: data.sites?.length || 0,
            alertCount: 0
          },
          sites: data.sites || [],
          alerts: []
        })
      }
    } catch (err) {
      console.error('Failed to fetch ecosystem:', err)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchGoals(), fetchEcosystem()])
    setLastRefresh(new Date())
    setLoading(false)
  }, [fetchGoals, fetchEcosystem])

  useEffect(() => {
    refreshAll()
    // Auto-refresh every 60 seconds
    const interval = setInterval(refreshAll, 60000)
    return () => clearInterval(interval)
  }, [refreshAll])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ACT Brain Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Goals, ecosystem health, and alerts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Updated {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={refreshAll}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh All
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats goals={goalsData} ecosystem={ecosystemData} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalsPanel data={goalsData} loading={loading} />
        <AlertsPanel alerts={ecosystemData?.alerts || null} loading={loading} />
      </div>

      {/* Ecosystem Health Map */}
      <div className="grid grid-cols-1">
        <EcosystemHealthMap sites={ecosystemData?.sites || null} loading={loading} />
      </div>
    </div>
  )
}

export default ACTBrainCenter
