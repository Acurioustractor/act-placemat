/**
 * Financial Reports Dashboard
 * Shows P&L, Balance Sheet, Cash Flow, and Aged Reports
 * Green = Money IN (income/receivables)
 * Red = Money OUT (expenses/payables)
 */

import { useEffect, useState } from 'react'
import { Card } from './ui/Card'

interface ProfitLoss {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  lastMonthIncome: number
  lastMonthExpenses: number
  lastMonthProfit: number
}

interface BalanceSheet {
  assets: number
  liabilities: number
  equity: number
}

interface CashFlow {
  inflowReceivable: number
  outflowPayable: number
  netCashFlow: number
}

interface AgedInvoice {
  invoice_number: string
  contact_name: string
  amount_due: number
  due_date: string
  days_overdue: number
  aging_bucket: string
}

interface AgedReport {
  current: number
  days31to60: number
  days61to90: number
  over90: number
  invoices: AgedInvoice[]
}

interface FinancialData {
  success: boolean
  timestamp: string
  profitLoss: ProfitLoss
  balanceSheet: BalanceSheet
  cashFlow: CashFlow
  agedReceivables: AgedReport
  agedPayables: AgedReport
}

export function FinancialReports() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:4000/api/v2/reports/financial-summary')

        if (!response.ok) {
          throw new Error(`API failed: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch financial reports:', err)
        setError(err instanceof Error ? err.message : 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => {
    return `$${Math.abs(value).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU')
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
          <p className="text-sm text-clay-500">Loading financial reports...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card padding="lg">
        <div className="text-center">
          <p className="text-sm text-red-600">⚠️ {error || 'Failed to load reports'}</p>
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

  const { profitLoss, balanceSheet, cashFlow, agedReceivables, agedPayables } = data

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Financial Reports</p>
        <h1 className="mt-1 text-3xl font-semibold text-clay-900">Business Financial Overview</h1>
        <p className="mt-2 text-sm text-clay-600">
          Complete P&L, Balance Sheet, Cash Flow & Aged Reports • Last updated {formatDate(data.timestamp)}
        </p>
      </div>

      {/* === PROFIT & LOSS === */}
      <Card padding="lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-clay-900">📊 Profit & Loss</h2>
            <p className="text-sm text-clay-600">Income vs Expenses (All Time)</p>
          </div>
          <div className={`text-right ${profitLoss.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            <div className="text-xs font-medium uppercase tracking-wide">Net Profit/Loss</div>
            <div className="text-3xl font-bold">
              {profitLoss.netProfit >= 0 ? '+' : '-'}{formatCurrency(profitLoss.netProfit)}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* INCOME - GREEN */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-2xl">
                💵
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                  💚 INCOME (Money IN)
                </div>
                <div className="mt-1 text-3xl font-bold text-emerald-900">
                  +{formatCurrency(profitLoss.totalIncome)}
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-emerald-700">
              Last 30 days: +{formatCurrency(profitLoss.lastMonthIncome)}
            </div>
          </div>

          {/* EXPENSES - RED */}
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-2xl">
                💸
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium uppercase tracking-wide text-red-700">
                  ❤️ EXPENSES (Money OUT)
                </div>
                <div className="mt-1 text-3xl font-bold text-red-900">
                  -{formatCurrency(profitLoss.totalExpenses)}
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-red-700">
              Last 30 days: -{formatCurrency(profitLoss.lastMonthExpenses)}
            </div>
          </div>
        </div>

        {/* Last Month Summary */}
        {profitLoss.lastMonthProfit !== 0 && (
          <div className="mt-6 rounded-lg border border-clay-200 bg-clay-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-clay-700">Last 30 Days Performance</span>
              <span className={`text-lg font-bold ${profitLoss.lastMonthProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {profitLoss.lastMonthProfit >= 0 ? '+' : '-'}{formatCurrency(profitLoss.lastMonthProfit)}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* === BALANCE SHEET & CASH FLOW === */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Balance Sheet */}
        <Card padding="lg">
          <h2 className="mb-6 text-2xl font-bold text-clay-900">🏦 Balance Sheet</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <span className="font-medium text-emerald-700">Assets (What You Own)</span>
              <span className="text-xl font-bold text-emerald-900">{formatCurrency(balanceSheet.assets)}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
              <span className="font-medium text-red-700">Liabilities (What You Owe)</span>
              <span className="text-xl font-bold text-red-900">{formatCurrency(balanceSheet.liabilities)}</span>
            </div>

            <div className={`flex items-center justify-between rounded-lg border p-4 ${balanceSheet.equity >= 0 ? 'border-brand-200 bg-brand-50' : 'border-clay-200 bg-clay-50'}`}>
              <span className={`font-medium ${balanceSheet.equity >= 0 ? 'text-brand-700' : 'text-clay-700'}`}>
                Equity (Net Worth)
              </span>
              <span className={`text-xl font-bold ${balanceSheet.equity >= 0 ? 'text-brand-900' : 'text-clay-900'}`}>
                {formatCurrency(balanceSheet.equity)}
              </span>
            </div>
          </div>
        </Card>

        {/* Cash Flow */}
        <Card padding="lg">
          <h2 className="mb-6 text-2xl font-bold text-clay-900">💰 Cash Flow</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <span className="font-medium text-emerald-700">💚 Inflow (Receivable)</span>
              <span className="text-xl font-bold text-emerald-900">+{formatCurrency(cashFlow.inflowReceivable)}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
              <span className="font-medium text-red-700">❤️ Outflow (Payable)</span>
              <span className="text-xl font-bold text-red-900">-{formatCurrency(cashFlow.outflowPayable)}</span>
            </div>

            <div className={`flex items-center justify-between rounded-lg border p-4 ${cashFlow.netCashFlow >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <span className={`font-medium ${cashFlow.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                Net Cash Flow
              </span>
              <span className={`text-xl font-bold ${cashFlow.netCashFlow >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {cashFlow.netCashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow.netCashFlow)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* === AGED RECEIVABLES (Who owes YOU) === */}
      <Card padding="lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-clay-900">💚 Aged Receivables</h2>
            <p className="text-sm text-clay-600">Who owes YOU money (Income expected)</p>
          </div>
          <div className="text-right text-emerald-700">
            <div className="text-xs font-medium uppercase tracking-wide">Total Outstanding</div>
            <div className="text-2xl font-bold">
              {formatCurrency(agedReceivables.current + agedReceivables.days31to60 + agedReceivables.days61to90 + agedReceivables.over90)}
            </div>
          </div>
        </div>

        {/* Aging Buckets */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-emerald-700">Current (0-30 days)</div>
            <div className="mt-2 text-xl font-bold text-emerald-900">{formatCurrency(agedReceivables.current)}</div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-yellow-700">31-60 days</div>
            <div className="mt-2 text-xl font-bold text-yellow-900">{formatCurrency(agedReceivables.days31to60)}</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-orange-700">61-90 days</div>
            <div className="mt-2 text-xl font-bold text-orange-900">{formatCurrency(agedReceivables.days61to90)}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-red-700">90+ days</div>
            <div className="mt-2 text-xl font-bold text-red-900">{formatCurrency(agedReceivables.over90)}</div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="space-y-2">
          {agedReceivables.invoices.slice(0, 10).map((inv) => (
            <div key={inv.invoice_number} className={`flex items-center justify-between rounded-lg border p-3 ${
              inv.days_overdue > 90 ? 'border-red-200 bg-red-50' :
              inv.days_overdue > 60 ? 'border-orange-200 bg-orange-50' :
              inv.days_overdue > 30 ? 'border-yellow-200 bg-yellow-50' :
              'border-emerald-200 bg-emerald-50'
            }`}>
              <div className="flex-1">
                <div className="font-semibold text-clay-900">{inv.contact_name}</div>
                <div className="text-sm text-clay-600">
                  Invoice #{inv.invoice_number} • Due {formatDate(inv.due_date)}
                  {inv.days_overdue > 0 && (
                    <span className="ml-2 text-red-600 font-medium">
                      {inv.days_overdue} days overdue
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-700">{formatCurrency(inv.amount_due)}</div>
              </div>
            </div>
          ))}
          {agedReceivables.invoices.length === 0 && (
            <p className="py-8 text-center text-sm text-clay-500">No receivable invoices - all clear! 🎉</p>
          )}
        </div>
      </Card>

      {/* === AGED PAYABLES (Who YOU owe) === */}
      <Card padding="lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-clay-900">❤️ Aged Payables</h2>
            <p className="text-sm text-clay-600">Who YOU owe money (Expenses to pay)</p>
          </div>
          <div className="text-right text-red-700">
            <div className="text-xs font-medium uppercase tracking-wide">Total Outstanding</div>
            <div className="text-2xl font-bold">
              {formatCurrency(agedPayables.current + agedPayables.days31to60 + agedPayables.days61to90 + agedPayables.over90)}
            </div>
          </div>
        </div>

        {/* Aging Buckets */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-emerald-700">Current (0-30 days)</div>
            <div className="mt-2 text-xl font-bold text-emerald-900">{formatCurrency(agedPayables.current)}</div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-yellow-700">31-60 days</div>
            <div className="mt-2 text-xl font-bold text-yellow-900">{formatCurrency(agedPayables.days31to60)}</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-orange-700">61-90 days</div>
            <div className="mt-2 text-xl font-bold text-orange-900">{formatCurrency(agedPayables.days61to90)}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4 text-center">
            <div className="text-xs font-medium uppercase text-red-700">90+ days</div>
            <div className="mt-2 text-xl font-bold text-red-900">{formatCurrency(agedPayables.over90)}</div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="space-y-2">
          {agedPayables.invoices.slice(0, 10).map((inv) => (
            <div key={inv.invoice_number} className={`flex items-center justify-between rounded-lg border p-3 ${
              inv.days_overdue > 90 ? 'border-red-200 bg-red-50' :
              inv.days_overdue > 60 ? 'border-orange-200 bg-orange-50' :
              inv.days_overdue > 30 ? 'border-yellow-200 bg-yellow-50' :
              'border-emerald-200 bg-emerald-50'
            }`}>
              <div className="flex-1">
                <div className="font-semibold text-clay-900">{inv.contact_name}</div>
                <div className="text-sm text-clay-600">
                  Invoice #{inv.invoice_number} • Due {formatDate(inv.due_date)}
                  {inv.days_overdue > 0 && (
                    <span className="ml-2 text-red-600 font-medium">
                      {inv.days_overdue} days overdue
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-700">{formatCurrency(inv.amount_due)}</div>
              </div>
            </div>
          ))}
          {agedPayables.invoices.length === 0 && (
            <p className="py-8 text-center text-sm text-clay-500">No payable bills - all clear! 🎉</p>
          )}
        </div>
      </Card>

      {/* Legend */}
      <Card padding="lg" className="bg-gradient-to-br from-brand-50 to-ocean-50">
        <div className="flex items-start gap-4">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="text-lg font-semibold text-clay-900">Understanding Your Financial Reports</h3>
            <div className="mt-3 space-y-2 text-sm text-clay-700">
              <p><strong className="text-emerald-700">💚 GREEN = Money IN</strong> - Income, receivables, customers who owe you</p>
              <p><strong className="text-red-700">❤️ RED = Money OUT</strong> - Expenses, payables, bills you need to pay</p>
              <p className="mt-3"><strong>ACCREC</strong> = Accounts Receivable (invoices you sent to customers)</p>
              <p><strong>ACCPAY</strong> = Accounts Payable (bills from your suppliers)</p>
              <p className="mt-3 text-xs text-clay-500">
                Reports update every 5 minutes from your Xero data in Supabase
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
