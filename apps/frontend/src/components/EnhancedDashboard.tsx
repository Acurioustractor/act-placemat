/**
 * Enhanced Dashboard - Phase 2 Intelligent Connections
 * Aggregates data from all tabs with quick actions and activity timeline
 */

import { useCallback, useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { MetricTile } from './ui/MetricTile'

interface CashPosition {
  net: number
  receivable: number
  payable: number
}

interface OverdueInvoice {
  invoice_number: string
  amount_due: number
  contact_name: string
  due_date: string
}

interface OverdueInvoices {
  count: number
  total: number
  invoices: OverdueInvoice[]
}

interface PendingReceipts {
  count: number
}

interface ChecklistProgress {
  completed: number
  total: number
  percentage: number
}

interface Activity {
  type: string
  timestamp: string
  description: string
  status: string
}

interface QuickAction {
  id: string
  label: string
  description: string
  tab: string
  enabled: boolean
  badge?: number
}

interface ProjectsSummary {
  total: number
  active: number
}

interface DashboardSummary {
  success: boolean
  timestamp: string
  cashPosition: CashPosition
  overdueInvoices: OverdueInvoices
  pendingReceipts: PendingReceipts
  checklistProgress: ChecklistProgress
  recentActivity: Activity[]
  projectsSummary: ProjectsSummary
  quickActions: QuickAction[]
}

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

export function EnhancedDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleQuickAction = useCallback((tab: string, params: Record<string, string> = {}) => {
    if (typeof window === 'undefined') return
    const navigationEvent = new CustomEvent('dashboard:navigate', {
      detail: { tab, params },
      cancelable: true,
    })
    window.dispatchEvent(navigationEvent)
    if (!navigationEvent.defaultPrevented) {
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('tab', tab)
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.set(key, value)
      })
      window.location.href = `${window.location.pathname}?${searchParams.toString()}`
    }
  }, [])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:4000/api/v2/dashboard/summary')

        if (!response.ok) {
          throw new Error(`Dashboard API failed: ${response.status}`)
        }

        const data = await response.json()
        setSummary(data)
        setError(null)
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()

    // Refresh every 5 minutes
    const interval = setInterval(loadDashboard, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
          <p className="text-sm text-clay-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <Card padding="lg">
        <div className="text-center">
          <p className="text-sm text-red-600">⚠️ {error || 'Failed to load dashboard'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-clay-200 bg-white px-4 py-2 text-sm font-medium text-clay-700 hover:bg-clay-50"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Intelligent Dashboard</p>
        <h1 className="mt-1 text-3xl font-semibold text-clay-900">Business Command Center</h1>
        <p className="mt-2 text-sm text-clay-600">
          Real-time metrics from all your business tools • Last updated {formatTimeAgo(summary?.timestamp ?? new Date().toISOString())}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card padding="lg" className="border-l-4 border-l-brand-500">
          <p className="text-sm font-medium text-clay-500">Cash Position</p>
          <p className="mt-2 text-3xl font-bold text-clay-900">{formatCurrency(summary?.cashPosition?.net)}</p>
          <div className="mt-4 space-y-1 text-xs text-clay-600">
            <div className="flex justify-between">
              <span>Receivable</span>
              <span className="font-medium text-emerald-600">{formatCurrency(summary?.cashPosition?.receivable)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payable</span>
              <span className="font-medium text-red-600">{formatCurrency(summary?.cashPosition?.payable)}</span>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="border-l-4 border-l-red-500">
          <p className="text-sm font-medium text-clay-500">Overdue Invoices</p>
          <p className="mt-2 text-3xl font-bold text-clay-900">{formatNumber(summary?.overdueInvoices?.count)}</p>
          <div className="mt-4 text-xs text-clay-600">
            <p>Total outstanding: {formatCurrency(summary?.overdueInvoices?.total)}</p>
          </div>
        </Card>

        <Card padding="lg" className="border-l-4 border-l-ocean-500">
          <p className="text-sm font-medium text-clay-500">Bookkeeping Progress</p>
          <p className="mt-2 text-3xl font-bold text-clay-900">{summary?.checklistProgress?.percentage ?? 0}%</p>
          <div className="mt-4 text-xs text-clay-600">
            <p>{summary?.checklistProgress?.completed ?? 0} of {summary?.checklistProgress?.total ?? 14} tasks complete</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-clay-100">
              <div
                className="h-full bg-ocean-500 transition-all"
                style={{ width: `${summary?.checklistProgress?.percentage ?? 0}%` }}
              />
            </div>
          </div>
        </Card>

        <Card padding="lg" className="border-l-4 border-l-amber-500">
          <p className="text-sm font-medium text-clay-500">Active Projects</p>
          <p className="mt-2 text-3xl font-bold text-clay-900">{formatNumber(summary?.projectsSummary?.active)}</p>
          <div className="mt-4 text-xs text-clay-600">
            <p>{formatNumber(summary?.projectsSummary?.total)} total projects</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <h2 className="text-xl font-semibold text-clay-900">Quick Actions</h2>
        <p className="mt-1 text-sm text-clay-500">Jump to relevant tabs to take action</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary?.quickActions?.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.tab)}
              disabled={!action.enabled}
              className={`relative rounded-xl border p-4 text-left transition ${
                action.enabled
                  ? 'border-clay-200 bg-white hover:border-brand-300 hover:shadow-md'
                  : 'border-clay-100 bg-clay-50 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-clay-900">{action.label}</p>
                  <p className="mt-1 text-xs text-clay-600">{action.description}</p>
                </div>
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {action.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Timeline */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-clay-900">Recent Activity</h2>
          <p className="mt-1 text-sm text-clay-500">Latest actions across all tabs</p>

          <div className="mt-6 space-y-3">
            {summary?.recentActivity?.length > 0 ? (
              summary?.recentActivity?.map((activity, index) => (
                <div key={`${activity.type}-${index}`} className="flex gap-4 rounded-lg border border-clay-100 bg-clay-50 p-3">
                  <div className="flex-shrink-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                      activity.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                      activity.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-ocean-100 text-ocean-700'
                    }`}>
                      {activity.status === 'success' ? '✓' : activity.status === 'error' ? '✗' : '•'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-clay-900">{activity.description}</p>
                    <p className="mt-1 text-xs text-clay-500">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-clay-500">No recent activity to display</p>
            )}
          </div>
        </Card>

        {/* Overdue Invoices Detail */}
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-clay-900">Overdue Invoices</h2>
              <p className="mt-1 text-sm text-clay-500">Invoices requiring follow-up</p>
            </div>
            <button
              onClick={() => handleQuickAction('autopilot')}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Chase All
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {summary?.overdueInvoices?.invoices?.length > 0 ? (
              summary?.overdueInvoices?.invoices?.map((invoice) => (
                <div key={invoice.invoice_number} className="rounded-lg border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-clay-900">{invoice.contact_name}</p>
                      <p className="mt-1 text-xs text-clay-600">Invoice #{invoice.invoice_number}</p>
                    </div>
                    <p className="text-sm font-bold text-red-700">{formatCurrency(invoice.amount_due)}</p>
                  </div>
                  <p className="mt-2 text-xs text-red-600">
                    Due {new Date(invoice.due_date).toLocaleDateString('en-AU')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-clay-500">No overdue invoices - great job! 🎉</p>
            )}
          </div>
        </Card>
      </div>

      {/* Cross-Tab Status Indicators */}
      <Card padding="lg" className="bg-gradient-to-br from-brand-50 to-ocean-50">
        <h2 className="text-xl font-semibold text-clay-900">System Status</h2>
        <p className="mt-1 text-sm text-clay-600">Real-time health across all integrations</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-clay-500">Receipts</span>
              <span className={`flex h-2 w-2 rounded-full ${
                (summary?.pendingReceipts?.count ?? 0) === 0 ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-clay-900">{formatNumber(summary?.pendingReceipts?.count ?? 0)}</p>
            <p className="mt-1 text-xs text-clay-600">Pending processing</p>
          </div>

          <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-clay-500">Money Flow</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-clay-900">{formatCurrency(summary?.cashPosition?.net ?? 0)}</p>
            <p className="mt-1 text-xs text-clay-600">Current position</p>
          </div>

          <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-clay-500">Bookkeeping</span>
              <span className={`flex h-2 w-2 rounded-full ${
                (summary?.checklistProgress?.percentage ?? 0) === 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-clay-900">{summary?.checklistProgress?.percentage ?? 0}%</p>
            <p className="mt-1 text-xs text-clay-600">Tasks complete</p>
          </div>
        </div>
      </Card>

      {/* Integration Guide */}
      <Card padding="lg" className="border-l-4 border-l-brand-500 bg-brand-50/30">
        <div className="flex items-start gap-4">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="text-lg font-semibold text-clay-900">How This Dashboard Works</h3>
            <div className="mt-3 space-y-2 text-sm text-clay-700">
              <p>
                <strong>Intelligent Connections:</strong> This dashboard aggregates real-time data from all your tabs:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1 text-clay-600">
                <li><strong>Cash Position</strong> from Money Flow (Xero data)</li>
                <li><strong>Overdue Invoices</strong> from Autopilot automation</li>
                <li><strong>Bookkeeping Progress</strong> from your checklist</li>
                <li><strong>Receipts</strong> pending OCR processing</li>
                <li><strong>Projects</strong> from Notion database</li>
                <li><strong>Activity Timeline</strong> from all automated actions</li>
              </ul>
              <p className="mt-3 text-xs text-clay-500">
                Data refreshes every 5 minutes • Click Quick Actions to navigate to specific tabs
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
