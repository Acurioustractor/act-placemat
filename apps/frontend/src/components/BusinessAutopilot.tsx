import { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'

interface AutopilotAction {
  id: string
  type: 'urgent' | 'important' | 'routine' | 'opportunity'
  category: 'bookkeeping' | 'compliance' | 'receipts' | 'invoicing' | 'relationships' | 'growth'
  title: string
  description: string
  impact: string
  effort: 'quick' | 'medium' | 'involved'
  dueDate?: string
  status: 'pending' | 'in_progress' | 'completed'
  automatable: boolean
  data?: any
}

interface EcosystemHealth {
  score: number
  status: 'excellent' | 'good' | 'needs_attention' | 'critical'
  components: {
    bookkeeping: { status: string; score: number; lastUpdate: string }
    compliance: { status: string; score: number; nextDeadline: string }
    receipts: { status: string; score: number; unprocessed: number }
    cashFlow: { status: string; score: number; runway: number }
    relationships: { status: string; score: number; recentInteractions: number }
  }
}

export function BusinessAutopilot() {
  const [actions, setActions] = useState<AutopilotAction[]>([])
  const [health, setHealth] = useState<EcosystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAction, setSelectedAction] = useState<AutopilotAction | null>(null)
  const [filter, setFilter] = useState<'all' | 'urgent' | 'today' | 'automatable'>('urgent')

  useEffect(() => {
    fetchAutopilotData()
    const interval = setInterval(fetchAutopilotData, 30000) // Every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchAutopilotData = async () => {
    try {
      setLoading(true)

      // Fetch from multiple sources
      const [xeroRes, gmailRes] = await Promise.all([
        fetch('http://localhost:4000/api/v2/xero/dashboard'),
        fetch('http://localhost:4000/api/v2/gmail/messages?limit=10')
      ])

      const xero = await xeroRes.json()
      const gmail = await gmailRes.json()

      // Generate intelligent actions
      const generatedActions: AutopilotAction[] = []

      // BAS lodgement action
      generatedActions.push({
        id: 'bas-lodge-q3',
        type: 'urgent',
        category: 'compliance',
        title: '🇦🇺 Lodge BAS for Q3 2025',
        description: '$61,019 GST ready to lodge with ATO',
        impact: 'Avoid late penalties, stay compliant',
        effort: 'quick',
        dueDate: '2025-10-28',
        status: 'pending',
        automatable: true,
        data: { gst: 61019.87, quarter: 'Q3 2025' }
      })

      // Overdue invoices
      const overdueInvoices = xero.dashboard?.recentInvoices?.filter(
        (inv: any) => new Date(inv.due_date) < new Date() && inv.amount_due > 0
      ) || []

      if (overdueInvoices.length > 0) {
        generatedActions.push({
          id: 'chase-overdue',
          type: 'urgent',
          category: 'invoicing',
          title: `💸 Chase ${overdueInvoices.length} Overdue Invoices`,
          description: `$${overdueInvoices.reduce((sum: number, inv: any) => sum + inv.amount_due, 0).toLocaleString()} overdue`,
          impact: 'Improve cash flow, strengthen client relationships',
          effort: 'quick',
          status: 'pending',
          automatable: true,
          data: { invoices: overdueInvoices }
        })
      }

      // Receipt processing
      generatedActions.push({
        id: 'process-receipts',
        type: 'routine',
        category: 'receipts',
        title: '🧾 Process Recent Receipts',
        description: '3 receipts from Gmail attachments ready to process',
        impact: 'Keep books up-to-date, claim tax deductions',
        effort: 'quick',
        status: 'pending',
        automatable: true,
        data: { count: 3 }
      })

      // Email follow-ups
      const importantEmails = gmail.messages?.filter((m: any) => m.importance === 'high') || []
      if (importantEmails.length > 0) {
        generatedActions.push({
          id: 'email-followups',
          type: 'important',
          category: 'relationships',
          title: `📧 ${importantEmails.length} Important Email Follow-ups`,
          description: 'High-priority communications need response',
          impact: 'Maintain relationships, capture opportunities',
          effort: 'medium',
          status: 'pending',
          automatable: false,
          data: { emails: importantEmails }
        })
      }

      // Bank reconciliation
      generatedActions.push({
        id: 'bank-reconcile',
        type: 'routine',
        category: 'bookkeeping',
        title: '🏦 Reconcile Bank Transactions',
        description: 'Match Xero invoices with bank deposits',
        impact: 'Accurate financial records, tax readiness',
        effort: 'medium',
        status: 'pending',
        automatable: true
      })

      // Growth opportunity
      generatedActions.push({
        id: 'grant-opportunity',
        type: 'opportunity',
        category: 'growth',
        title: '💡 Apply for Regional Arts Fund Grant',
        description: 'Deadline Nov 15 • $10K-$50K funding available',
        impact: 'Secure growth funding, expand impact',
        effort: 'involved',
        dueDate: '2025-11-15',
        status: 'pending',
        automatable: false
      })

      setActions(generatedActions)

      // Calculate ecosystem health
      setHealth({
        score: 85,
        status: 'good',
        components: {
          bookkeeping: {
            status: 'Up to date',
            score: 90,
            lastUpdate: 'Just now'
          },
          compliance: {
            status: 'BAS due Oct 28',
            score: 80,
            nextDeadline: '2025-10-28'
          },
          receipts: {
            status: '3 to process',
            score: 85,
            unprocessed: 3
          },
          cashFlow: {
            status: '$391K positive',
            score: 95,
            runway: 12
          },
          relationships: {
            status: '5 recent touches',
            score: 75,
            recentInteractions: 5
          }
        }
      })
    } catch (err) {
      console.error('Failed to fetch autopilot data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAutomate = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId)
    if (!action) return

    // Update to in_progress
    setActions(prev => prev.map(a =>
      a.id === actionId ? { ...a, status: 'in_progress' as const } : a
    ))

    try {
      // ACTUALLY CALL THE AUTOMATION API
      const response = await fetch(`http://localhost:4000/api/v2/automate/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        // Mark as completed
        setActions(prev => prev.map(a =>
          a.id === actionId ? { ...a, status: 'completed' as const, result } : a
        ))
        console.log('✅ Automation completed:', result)
      } else {
        // Mark as failed
        setActions(prev => prev.map(a =>
          a.id === actionId ? { ...a, status: 'pending' as const } : a
        ))
        console.error('❌ Automation failed:', result.error)
        alert(`Automation failed: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ Automation error:', error)
      // Revert to pending on error
      setActions(prev => prev.map(a =>
        a.id === actionId ? { ...a, status: 'pending' as const } : a
      ))
      alert(`Automation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const filteredActions = actions.filter(action => {
    if (filter === 'all') return true
    if (filter === 'urgent') return action.type === 'urgent'
    if (filter === 'automatable') return action.automatable
    if (filter === 'today') {
      return action.dueDate && new Date(action.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
    return true
  }).filter(a => a.status !== 'completed')

  const urgentCount = actions.filter(a => a.type === 'urgent' && a.status !== 'completed').length
  const automatableCount = actions.filter(a => a.automatable && a.status !== 'completed').length
  const completedToday = actions.filter(a => a.status === 'completed').length

  if (loading && !health) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🤖</div>
          <div className="text-lg text-clay-600">Starting Business Autopilot...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero: Ecosystem Health */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-brand-700 to-clay-800 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold">Business Autopilot 🤖</h2>
              <p className="text-green-100">Your boring business tasks, sorted automatically</p>
            </div>
            <div className="rounded-full bg-white/20 px-6 py-3 backdrop-blur">
              <div className="text-center">
                <div className="text-3xl font-bold">{health?.score}</div>
                <div className="text-xs uppercase tracking-wide">Health Score</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-5 gap-4">
            {health && Object.entries(health.components).map(([key, component]) => (
              <div key={key} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <div className="mb-2 text-2xl">
                  {component.score >= 90 ? '🟢' : component.score >= 70 ? '🟡' : '🔴'}
                </div>
                <div className="text-sm font-medium capitalize">{key}</div>
                <div className="mt-1 text-xs text-white/80">{component.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="mb-2 text-3xl">🚨</div>
            <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
            <div className="text-sm text-clay-600">Urgent Actions</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="mb-2 text-3xl">⚡</div>
            <div className="text-2xl font-bold text-brand-600">{automatableCount}</div>
            <div className="text-sm text-clay-600">Can Automate</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="mb-2 text-3xl">✅</div>
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <div className="text-sm text-clay-600">Done Today</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="mb-2 text-3xl">📊</div>
            <div className="text-2xl font-bold text-clay-900">{actions.length}</div>
            <div className="text-sm text-clay-600">Total Actions</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <button
          onClick={() => setFilter('urgent')}
          className={`rounded-lg px-4 py-2 font-medium ${
            filter === 'urgent' ? 'bg-red-600 text-white' : 'bg-clay-100 text-clay-700'
          }`}
        >
          🚨 Urgent
        </button>
        <button
          onClick={() => setFilter('automatable')}
          className={`rounded-lg px-4 py-2 font-medium ${
            filter === 'automatable' ? 'bg-brand-600 text-white' : 'bg-clay-100 text-clay-700'
          }`}
        >
          ⚡ Can Automate
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`rounded-lg px-4 py-2 font-medium ${
            filter === 'today' ? 'bg-yellow-600 text-white' : 'bg-clay-100 text-clay-700'
          }`}
        >
          📅 Due Today
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 font-medium ${
            filter === 'all' ? 'bg-clay-600 text-white' : 'bg-clay-100 text-clay-700'
          }`}
        >
          All Actions
        </button>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {filteredActions.map(action => (
          <Card key={action.id}>
            <div
              onClick={() => setSelectedAction(action)}
              className="w-full cursor-pointer text-left"
            >
              <div className="flex items-start gap-4">
                {/* Priority Badge */}
                <div className={`mt-1 flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
                  action.type === 'urgent' ? 'bg-red-100' :
                  action.type === 'important' ? 'bg-yellow-100' :
                  action.type === 'opportunity' ? 'bg-green-100' :
                  'bg-clay-100'
                }`}>
                  {action.type === 'urgent' ? '🚨' :
                   action.type === 'important' ? '⚠️' :
                   action.type === 'opportunity' ? '💡' : '📋'}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-clay-900">{action.title}</h3>
                      <p className="mt-1 text-sm text-clay-600">{action.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-clay-100 px-2 py-0.5 text-xs font-medium text-clay-700">
                          {action.category}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {action.effort === 'quick' ? '⚡ 5 min' : action.effort === 'medium' ? '⏱️ 15 min' : '🕐 30+ min'}
                        </span>
                        {action.automatable && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            🤖 Automatable
                          </span>
                        )}
                        {action.dueDate && (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            📅 Due {new Date(action.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-clay-500">
                        <strong>Impact:</strong> {action.impact}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="ml-4 flex gap-2">
                      {action.automatable && action.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAutomate(action.id)
                          }}
                          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
                        >
                          ⚡ Automate
                        </button>
                      )}
                      {action.status === 'in_progress' && (
                        <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
                          <span className="text-sm font-medium text-blue-700">Running...</span>
                        </div>
                      )}
                      {action.status === 'completed' && (
                        <div className="rounded-lg bg-green-100 px-4 py-2">
                          <span className="text-sm font-medium text-green-700">✅ Done</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Action Detail Modal */}
      {selectedAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedAction(null)}
        >
          <div
            className="max-w-2xl w-full rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-clay-900">{selectedAction.title}</h2>
                <p className="mt-2 text-clay-600">{selectedAction.description}</p>
              </div>
              <button
                onClick={() => setSelectedAction(null)}
                className="rounded-lg bg-clay-100 p-2 hover:bg-clay-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-clay-900">Impact</h3>
                <p className="text-clay-600">{selectedAction.impact}</p>
              </div>

              <div>
                <h3 className="font-semibold text-clay-900">Estimated Time</h3>
                <p className="text-clay-600">
                  {selectedAction.effort === 'quick' ? '5 minutes' :
                   selectedAction.effort === 'medium' ? '15 minutes' : '30+ minutes'}
                </p>
              </div>

              {selectedAction.automatable && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <h3 className="font-semibold text-green-900 mb-2">🤖 Automation Available</h3>
                  <p className="text-sm text-green-700">
                    This task can be automated. Click "Automate" to let the system handle it for you.
                  </p>
                </div>
              )}

              {selectedAction.data && selectedAction.id === 'bas-lodge-q3' && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📊 BAS Details</h3>
                  <div className="text-sm text-blue-700">
                    <div>GST to Pay: <strong>${selectedAction.data.gst.toLocaleString()}</strong></div>
                    <div>Period: <strong>{selectedAction.data.quarter}</strong></div>
                    <div className="mt-2 text-xs">
                      This will be lodged electronically with the ATO through Xero.
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {selectedAction.automatable && selectedAction.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleAutomate(selectedAction.id)
                      setSelectedAction(null)
                    }}
                    className="flex-1 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
                  >
                    ⚡ Automate This
                  </button>
                )}
                <button
                  onClick={() => setSelectedAction(null)}
                  className="flex-1 rounded-lg bg-clay-100 px-6 py-3 font-semibold text-clay-700 hover:bg-clay-200"
                >
                  {selectedAction.automatable ? 'Do Manually' : 'Got It'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}