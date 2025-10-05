import { useEffect, useState } from 'react'
import { Card } from './ui/Card'

interface CashFlowData {
  summary: {
    totalTransactions: number
    totalMoneyIn: number
    totalMoneyOut: number
    netCashFlow: number
    last30Days: {
      moneyIn: number
      moneyOut: number
      netCashFlow: number
      transactionCount: number
    }
  }
  reconciliation: {
    totalExpensesNeedingReceipts: number
    totalAmountNeedingReceipts: number
    unreconciled: number
    unreconciledTransactions: Array<{
      xero_id: string
      date: string
      contact_name: string
      total: number
      reference?: string
      bank_account_name?: string
    }>
  }
  recentActivity: {
    moneyIn: Array<any>
    moneyOut: Array<any>
  }
  topVendors: Array<{
    name: string
    totalSpent: number
    transactionCount: number
  }>
  monthlyTrends: Array<{
    month: string
    moneyIn: number
    moneyOut: number
    net: number
    transactionCount: number
  }>
}

export function RealCashFlow() {
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'overview' | 'receipts' | 'vendors' | 'trends'>('overview')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:4000/api/v2/cashflow/dashboard')
        const result = await response.json()
        if (result.success) {
          setData(result)
        }
      } catch (err) {
        console.error('Failed to fetch cash flow data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-clay-600">Loading real cash flow data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
        <p className="font-bold text-red-900">Failed to load cash flow data</p>
        <p className="mt-2 text-sm text-red-700">Check that the backend server is running</p>
      </div>
    )
  }

  const { summary, reconciliation, recentActivity, topVendors, monthlyTrends } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-clay-900">💰 Real Cash Flow</h1>
        <p className="text-clay-600">
          Actual bank transactions from Xero • {summary.totalTransactions.toLocaleString()} total transactions
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-clay-200">
        {[
          { id: 'overview', label: '📊 Overview', count: null },
          { id: 'receipts', label: '🧾 Missing Receipts', count: reconciliation.unreconciled },
          { id: 'vendors', label: '🏪 Top Vendors', count: topVendors.length },
          { id: 'trends', label: '📈 Monthly Trends', count: monthlyTrends.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === tab.id
                ? 'border-b-2 border-rust-600 text-rust-700'
                : 'text-clay-600 hover:text-clay-900'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 rounded-full bg-clay-200 px-2 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card padding="md" className="border-2 border-emerald-200 bg-emerald-50">
              <div className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                💚 Total Money IN
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-900">
                {formatCurrency(summary.totalMoneyIn)}
              </div>
              <div className="mt-1 text-xs text-emerald-600">
                Last 30 days: {formatCurrency(summary.last30Days.moneyIn)}
              </div>
            </Card>

            <Card padding="md" className="border-2 border-red-200 bg-red-50">
              <div className="text-sm font-medium uppercase tracking-wide text-red-700">
                ❤️ Total Money OUT
              </div>
              <div className="mt-2 text-3xl font-bold text-red-900">
                {formatCurrency(summary.totalMoneyOut)}
              </div>
              <div className="mt-1 text-xs text-red-600">
                Last 30 days: {formatCurrency(summary.last30Days.moneyOut)}
              </div>
            </Card>

            <Card padding="md" className={`border-2 ${
              summary.netCashFlow >= 0
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <div className={`text-sm font-medium uppercase tracking-wide ${
                summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                Net Cash Flow
              </div>
              <div className={`mt-2 text-3xl font-bold ${
                summary.netCashFlow >= 0 ? 'text-emerald-900' : 'text-red-900'
              }`}>
                {formatCurrency(summary.netCashFlow)}
              </div>
              <div className={`mt-1 text-xs ${
                summary.last30Days.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                Last 30 days: {formatCurrency(summary.last30Days.netCashFlow)}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Money IN */}
            <Card padding="lg">
              <h3 className="mb-4 text-lg font-bold text-emerald-900">💚 Recent Money IN</h3>
              <div className="space-y-2">
                {recentActivity.moneyIn.slice(0, 10).map((txn, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex-1">
                      <div className="font-medium text-emerald-900">{txn.contact_name || 'Unknown'}</div>
                      <div className="text-xs text-emerald-600">{formatDate(txn.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-900">+{formatCurrency(txn.total)}</div>
                      {txn.bank_account_name && (
                        <div className="text-xs text-emerald-600">{txn.bank_account_name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Money OUT */}
            <Card padding="lg">
              <h3 className="mb-4 text-lg font-bold text-red-900">❤️ Recent Money OUT</h3>
              <div className="space-y-2">
                {recentActivity.moneyOut.slice(0, 10).map((txn, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex-1">
                      <div className="font-medium text-red-900">{txn.contact_name || 'Unknown'}</div>
                      <div className="text-xs text-red-600">{formatDate(txn.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-900">-{formatCurrency(Math.abs(txn.total))}</div>
                      {txn.bank_account_name && (
                        <div className="text-xs text-red-600">{txn.bank_account_name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Missing Receipts Section */}
      {activeSection === 'receipts' && (
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-clay-900">🧾 Missing Receipts</h2>
            <p className="mt-2 text-clay-600">
              {reconciliation.unreconciled} expenses need receipts • Total: {formatCurrency(reconciliation.totalAmountNeedingReceipts)}
            </p>
          </div>

          <div className="space-y-3">
            {reconciliation.unreconciledTransactions.map((txn, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between rounded-lg border-2 border-orange-200 bg-orange-50 p-4"
              >
                <div className="flex-1">
                  <div className="font-bold text-orange-900">{txn.contact_name || 'Unknown Vendor'}</div>
                  <div className="mt-1 text-sm text-orange-700">
                    {formatDate(txn.date)}
                    {txn.reference && ` • ${txn.reference}`}
                  </div>
                  <div className="mt-2 text-xs text-orange-600">
                    💡 AI Suggestion: Check emails from "{txn.contact_name}" around {formatDate(txn.date)}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-2xl font-bold text-orange-900">
                    {formatCurrency(Math.abs(txn.total))}
                  </div>
                  <button className="mt-2 rounded bg-orange-600 px-3 py-1 text-sm font-medium text-white hover:bg-orange-700">
                    Upload Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Vendors Section */}
      {activeSection === 'vendors' && (
        <Card padding="lg">
          <h2 className="mb-6 text-2xl font-bold text-clay-900">🏪 Top Vendors by Spend</h2>
          <div className="space-y-3">
            {topVendors.map((vendor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-clay-200 bg-white p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clay-100 text-lg font-bold text-clay-700">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-clay-900">{vendor.name}</div>
                    <div className="text-sm text-clay-600">{vendor.transactionCount} transactions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-900">
                    {formatCurrency(vendor.totalSpent)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly Trends Section */}
      {activeSection === 'trends' && (
        <Card padding="lg">
          <h2 className="mb-6 text-2xl font-bold text-clay-900">📈 Monthly Cash Flow Trends</h2>
          <div className="space-y-4">
            {monthlyTrends.map((month, idx) => (
              <div key={idx} className="rounded-lg border border-clay-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-bold text-clay-900">{month.month}</div>
                  <div className="text-sm text-clay-600">{month.transactionCount} transactions</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xs font-medium text-emerald-700">Money IN</div>
                    <div className="mt-1 text-lg font-bold text-emerald-900">
                      {formatCurrency(month.moneyIn)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-red-700">Money OUT</div>
                    <div className="mt-1 text-lg font-bold text-red-900">
                      {formatCurrency(month.moneyOut)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-clay-700">Net</div>
                    <div className={`mt-1 text-lg font-bold ${
                      month.net >= 0 ? 'text-emerald-900' : 'text-red-900'
                    }`}>
                      {formatCurrency(month.net)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legend */}
      <Card padding="md" className="border-2 border-clay-200 bg-clay-50">
        <div className="text-sm text-clay-700">
          <p><strong className="text-emerald-700">💚 Money IN (RECEIVE)</strong> = Deposits to your bank accounts</p>
          <p><strong className="text-red-700">❤️ Money OUT (SPEND)</strong> = Payments from your bank accounts</p>
          <p><strong>Source:</strong> Real bank transactions synced from Xero</p>
        </div>
      </Card>
    </div>
  )
}
