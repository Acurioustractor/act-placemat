import { useEffect, useState, useMemo } from 'react'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'

interface Invoice {
  id: string
  invoice_number: string
  type: 'ACCREC' | 'ACCPAY'
  contact_name: string
  date: string
  due_date: string
  total: number
  amount_due: number
  amount_paid: number
  total_tax: number
  status: string
}

interface XeroDashboard {
  totalReceivable: string
  totalPayable: string
  netPosition: string
  recentInvoices: Invoice[]
}

interface GmailMessage {
  id: string
  subject: string
  from_name: string
  from_email: string
  sent_date: string
  importance: 'low' | 'medium' | 'high'
  keywords: string[]
  snippet: string
}

export function MoneyFlowDashboard() {
  const [xeroData, setXeroData] = useState<XeroDashboard | null>(null)
  const [gmailData, setGmailData] = useState<{ messages: GmailMessage[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month')
  const [expandedSections, setExpandedSections] = useState<{
    overdue: boolean
    dueWeek: boolean
    bills: boolean
    emails: boolean
  }>({ overdue: false, dueWeek: false, bills: false, emails: false })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [xeroRes, gmailRes] = await Promise.all([
          fetch('http://localhost:4000/api/v2/xero/dashboard'),
          fetch('http://localhost:4000/api/v2/gmail/messages?limit=20')
        ])

        const xero = await xeroRes.json()
        const gmail = await gmailRes.json()

        setXeroData(xero.dashboard)
        setGmailData(gmail)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  // Memoize filtered invoices based on timeframe - MUST be before any early returns
  const { overdueInvoices, dueThisWeek, billsToPay, timeframeInvoices, timeframeReceivable, timeframePayable } = useMemo(() => {
    console.log('🔄 Recalculating invoices for timeframe:', timeframe)

    const now = new Date()
    let timeframeBoundary: Date

    if (timeframe === 'week') {
      timeframeBoundary = new Date(now)
      timeframeBoundary.setDate(now.getDate() - 7)
    } else if (timeframe === 'month') {
      timeframeBoundary = new Date(now)
      timeframeBoundary.setMonth(now.getMonth() - 1)
    } else { // quarter
      timeframeBoundary = new Date(now)
      timeframeBoundary.setMonth(now.getMonth() - 3)
    }

    console.log('📅 Date range:', timeframeBoundary.toLocaleDateString(), 'to', now.toLocaleDateString())

    // Filter invoices by timeframe
    const filterByTimeframe = (inv: Invoice) => {
      const invoiceDate = new Date(inv.date)
      return invoiceDate >= timeframeBoundary && invoiceDate <= now
    }

    // Get invoices by status
    const overdue = xeroData?.recentInvoices?.filter(
      inv => inv.type === 'ACCREC' && new Date(inv.due_date) < new Date() && inv.amount_due > 0 && filterByTimeframe(inv)
    ) || []

    const dueWeek = xeroData?.recentInvoices?.filter(
      inv => {
        const dueDate = new Date(inv.due_date)
        const weekFromNow = new Date()
        weekFromNow.setDate(weekFromNow.getDate() + 7)
        return inv.type === 'ACCREC' && dueDate <= weekFromNow && dueDate >= new Date() && inv.amount_due > 0 && filterByTimeframe(inv)
      }
    ) || []

    const bills = xeroData?.recentInvoices?.filter(
      inv => inv.type === 'ACCPAY' && inv.amount_due > 0 && filterByTimeframe(inv)
    ) || []

    // Calculate timeframe-specific metrics
    const invoicesInTimeframe = xeroData?.recentInvoices?.filter(filterByTimeframe) || []
    const receivableInTimeframe = invoicesInTimeframe
      .filter(inv => inv.type === 'ACCREC')
      .reduce((sum, inv) => sum + inv.amount_due, 0)
    const payableInTimeframe = invoicesInTimeframe
      .filter(inv => inv.type === 'ACCPAY')
      .reduce((sum, inv) => sum + inv.amount_due, 0)

    console.log('📊 Filtered results:', {
      overdue: overdue.length,
      dueWeek: dueWeek.length,
      bills: bills.length,
      total: invoicesInTimeframe.length,
      receivable: receivableInTimeframe,
      payable: payableInTimeframe
    })

    return {
      overdueInvoices: overdue,
      dueThisWeek: dueWeek,
      billsToPay: bills,
      timeframeInvoices: invoicesInTimeframe,
      timeframeReceivable: receivableInTimeframe,
      timeframePayable: payableInTimeframe
    }
  }, [timeframe, xeroData?.recentInvoices])

  // Loading check AFTER all hooks
  if (loading && !xeroData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">💰</div>
          <div className="text-lg text-clay-600">Loading Money Flow...</div>
        </div>
      </div>
    )
  }

  const receivable = parseFloat(xeroData?.totalReceivable || '0')
  const payable = parseFloat(xeroData?.totalPayable || '0')
  const netPosition = parseFloat(xeroData?.netPosition || '0')

  return (
    <div className="space-y-6">
      {/* Hero Money Flow Visualization */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-clay-800 p-8 text-white">
        <div className="relative z-10">
          <h2 className="mb-2 text-3xl font-bold">Money Flow Intelligence</h2>
          <p className="text-brand-100">Real-time Australian business financial overview</p>
        </div>

        {/* Flow Animation */}
        <div className="relative z-10 mt-8 grid grid-cols-3 gap-6">
          <div className="group cursor-pointer rounded-xl bg-white/10 p-6 backdrop-blur transition-all hover:bg-white/20">
            <div className="mb-2 text-4xl">💵</div>
            <div className="text-sm font-medium text-brand-100">Money Coming In</div>
            <div className="mt-2 text-3xl font-bold">${receivable.toLocaleString()}</div>
            <div className="mt-1 text-xs text-brand-200">Accounts Receivable</div>
          </div>

          <div className="group cursor-pointer rounded-xl bg-white/10 p-6 backdrop-blur transition-all hover:bg-white/20">
            <div className="mb-2 text-4xl">📊</div>
            <div className="text-sm font-medium text-brand-100">Net Position</div>
            <div className={`mt-2 text-3xl font-bold ${netPosition >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              ${netPosition.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-brand-200">Your Financial Strength</div>
          </div>

          <div className="group cursor-pointer rounded-xl bg-white/10 p-6 backdrop-blur transition-all hover:bg-white/20">
            <div className="mb-2 text-4xl">💸</div>
            <div className="text-sm font-medium text-brand-100">Money Going Out</div>
            <div className="mt-2 text-3xl font-bold">${payable.toLocaleString()}</div>
            <div className="mt-1 text-xs text-brand-200">Accounts Payable</div>
          </div>
        </div>
      </div>

      {/* Time-based filters */}
      <Card padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-clay-900">📅 Timeframe Filter</h3>
            <p className="text-sm text-clay-600">
              Showing {timeframeInvoices.length} invoices from {timeframe === 'week' ? 'the last 7 days' : timeframe === 'month' ? 'the last 30 days' : 'the last 90 days'}
            </p>
            <p className="mt-1 text-xs font-mono text-brand-600">
              Current Filter: <span className="font-bold">{timeframe.toUpperCase()}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                console.log('🔘 Clicking Week button, current timeframe:', timeframe)
                setTimeframe('week')
              }}
              className={`rounded-lg px-4 py-2 font-medium transition-all ${
                timeframe === 'week'
                  ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-300'
                  : 'bg-clay-100 text-clay-700 hover:bg-clay-200'
              }`}
            >
              {timeframe === 'week' && '✓ '}This Week
            </button>
            <button
              onClick={() => {
                console.log('🔘 Clicking Month button, current timeframe:', timeframe)
                setTimeframe('month')
              }}
              className={`rounded-lg px-4 py-2 font-medium transition-all ${
                timeframe === 'month'
                  ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-300'
                  : 'bg-clay-100 text-clay-700 hover:bg-clay-200'
              }`}
            >
              {timeframe === 'month' && '✓ '}This Month
            </button>
            <button
              onClick={() => {
                console.log('🔘 Clicking Quarter button, current timeframe:', timeframe)
                setTimeframe('quarter')
              }}
              className={`rounded-lg px-4 py-2 font-medium transition-all ${
                timeframe === 'quarter'
                  ? 'bg-brand-600 text-white shadow-md ring-2 ring-brand-300'
                  : 'bg-clay-100 text-clay-700 hover:bg-clay-200'
              }`}
            >
              {timeframe === 'quarter' && '✓ '}This Quarter
            </button>
          </div>
        </div>

        {/* Timeframe-specific metrics */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Receivable</div>
            <div className="mt-1 text-2xl font-bold text-emerald-900">${timeframeReceivable.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-red-700">Payable</div>
            <div className="mt-1 text-2xl font-bold text-red-900">${timeframePayable.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-clay-200 bg-clay-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-clay-700">Net</div>
            <div className={`mt-1 text-2xl font-bold ${timeframeReceivable - timeframePayable >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              ${(timeframeReceivable - timeframePayable).toLocaleString()}
            </div>
          </div>
        </div>
      </Card>

      {/* Action-oriented Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Overdue - Red Alert */}
        {overdueInvoices.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-700">🚨 Overdue Invoices</h3>
                <p className="text-sm text-clay-600">{overdueInvoices.length} invoices need attention</p>
              </div>
              <div className="text-2xl font-bold text-red-700">
                ${overdueInvoices.reduce((sum, inv) => sum + inv.amount_due, 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              {(expandedSections.overdue ? overdueInvoices : overdueInvoices.slice(0, 3)).map(inv => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left transition-all hover:border-red-300 hover:bg-red-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-clay-900">{inv.contact_name}</div>
                      <div className="text-sm text-clay-600">{inv.invoice_number}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-700">${inv.amount_due.toLocaleString()}</div>
                      <div className="text-xs text-clay-500">
                        {Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {overdueInvoices.length > 3 && (
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, overdue: !prev.overdue }))}
                className="mt-3 w-full rounded-lg bg-clay-100 px-4 py-2 text-sm font-medium text-clay-700 hover:bg-clay-200"
              >
                {expandedSections.overdue ? '▲ Show Less' : `▼ Show All ${overdueInvoices.length} Invoices`}
              </button>
            )}
          </Card>
        )}

        {/* Due This Week - Yellow Warning */}
        {dueThisWeek.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-yellow-700">⚠️ Due This Week</h3>
                <p className="text-sm text-clay-600">{dueThisWeek.length} invoices coming due</p>
              </div>
              <div className="text-2xl font-bold text-yellow-700">
                ${dueThisWeek.reduce((sum, inv) => sum + inv.amount_due, 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              {(expandedSections.dueWeek ? dueThisWeek : dueThisWeek.slice(0, 3)).map(inv => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-left transition-all hover:border-yellow-300 hover:bg-yellow-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-clay-900">{inv.contact_name}</div>
                      <div className="text-sm text-clay-600">{inv.invoice_number}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-yellow-700">${inv.amount_due.toLocaleString()}</div>
                      <div className="text-xs text-clay-500">Due {new Date(inv.due_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {dueThisWeek.length > 3 && (
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, dueWeek: !prev.dueWeek }))}
                className="mt-3 w-full rounded-lg bg-clay-100 px-4 py-2 text-sm font-medium text-clay-700 hover:bg-clay-200"
              >
                {expandedSections.dueWeek ? '▲ Show Less' : `▼ Show All ${dueThisWeek.length} Invoices`}
              </button>
            )}
          </Card>
        )}

        {/* Bills to Pay */}
        {billsToPay.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-700">💳 Bills to Pay</h3>
                <p className="text-sm text-clay-600">{billsToPay.length} bills outstanding</p>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                ${billsToPay.reduce((sum, inv) => sum + inv.amount_due, 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              {(expandedSections.bills ? billsToPay : billsToPay.slice(0, 3)).map(inv => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-clay-900">{inv.contact_name}</div>
                      <div className="text-sm text-clay-600">{inv.invoice_number}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">${inv.amount_due.toLocaleString()}</div>
                      <div className="text-xs text-clay-500">Due {new Date(inv.due_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {billsToPay.length > 3 && (
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, bills: !prev.bills }))}
                className="mt-3 w-full rounded-lg bg-clay-100 px-4 py-2 text-sm font-medium text-clay-700 hover:bg-clay-200"
              >
                {expandedSections.bills ? '▲ Show Less' : `▼ Show All ${billsToPay.length} Bills`}
              </button>
            )}
          </Card>
        )}

        {/* Recent Email Intelligence */}
        {gmailData?.messages && gmailData.messages.length > 0 && (
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-clay-900">📧 Email Intelligence</h3>
              <p className="text-sm text-clay-600">Recent financial communications</p>
            </div>
            <div className="space-y-2">
              {(expandedSections.emails ? gmailData.messages : gmailData.messages.slice(0, 3)).map(msg => (
                <div key={msg.id} className="rounded-lg border border-clay-200 p-3">
                  <div className="flex items-start gap-3">
                    <div className={`text-xl ${msg.importance === 'high' ? '🔴' : msg.importance === 'medium' ? '🟡' : '🟢'}`}>
                      {msg.importance === 'high' ? '🔴' : msg.importance === 'medium' ? '🟡' : '🟢'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-clay-900">{msg.from_name}</div>
                      <div className="text-sm text-clay-700">{msg.subject}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {msg.keywords?.slice(0, 3).map(kw => (
                          <span key={kw} className="rounded bg-clay-100 px-2 py-0.5 text-xs text-clay-600">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-clay-500">
                      {new Date(msg.sent_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {gmailData.messages.length > 3 && (
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, emails: !prev.emails }))}
                className="mt-3 w-full rounded-lg bg-clay-100 px-4 py-2 text-sm font-medium text-clay-700 hover:bg-clay-200"
              >
                {expandedSections.emails ? '▲ Show Less' : `▼ Show All ${gmailData.messages.length} Emails`}
              </button>
            )}
          </Card>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="max-w-2xl w-full rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-clay-900">{selectedInvoice.invoice_number}</h2>
                <p className="text-clay-600">{selectedInvoice.contact_name}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg bg-clay-100 p-2 hover:bg-clay-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm font-medium text-clay-500">Invoice Date</div>
                <div className="text-lg font-semibold text-clay-900">
                  {new Date(selectedInvoice.date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-clay-500">Due Date</div>
                <div className="text-lg font-semibold text-clay-900">
                  {new Date(selectedInvoice.due_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-clay-500">Total Amount</div>
                <div className="text-2xl font-bold text-clay-900">
                  ${selectedInvoice.total.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-clay-500">Amount Due</div>
                <div className="text-2xl font-bold text-red-600">
                  ${selectedInvoice.amount_due.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-clay-500">GST Amount</div>
                <div className="text-lg font-semibold text-clay-900">
                  ${selectedInvoice.total_tax.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-clay-500">Status</div>
                <div className="text-lg font-semibold text-clay-900">{selectedInvoice.status}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
                Send Reminder
              </button>
              <button className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">
                Mark as Paid
              </button>
              <button className="rounded-lg bg-clay-100 px-6 py-3 font-semibold text-clay-700 hover:bg-clay-200">
                View in Xero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}