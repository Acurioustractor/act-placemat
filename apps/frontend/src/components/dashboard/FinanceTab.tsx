/**
 * Finance Tab - Financial Overview Dashboard
 *
 * Displays financial data from port 3456:
 * - Cash position (net, receivable, payable)
 * - Recent transactions
 * - Monthly summary (revenue, expenses, net)
 * - Bookkeeping progress (checklist, overdue invoices)
 */

import { useState, useEffect } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'

interface CashPosition {
  net: number
  receivable: number
  payable: number
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
}

interface MonthlySummary {
  revenue: number
  expenses: number
  net: number
}

interface BookkeepingProgress {
  completed: number
  total: number
  percentage: number
}

interface OverdueInvoice {
  invoice_number: string
  contact_name: string
  amount_due: number
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

interface FinancialData {
  cashPosition: CashPosition
  recentTransactions: Transaction[]
  monthlySummary: MonthlySummary
  lastUpdated: string
}

interface BookkeepingData {
  checklistProgress: BookkeepingProgress
  overdueInvoices: OverdueInvoices
  pendingReceipts: PendingReceipts
  nextBASDue: string
  gstOwed: number
}

const formatCurrency = (value: number | null | undefined, currency = 'AUD') => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric'
  })
}

export default function FinanceTab() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [bookkeepingData, setBookkeepingData] = useState<BookkeepingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chasing, setChasing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [financialRes, bookkeepingRes] = await Promise.all([
          fetch(resolveCommandCenterUrl('/api/financial/summary')),
          fetch(resolveCommandCenterUrl('/api/bookkeeping/progress'))
        ])

        if (financialRes.ok) {
          const data = await financialRes.json()
          setFinancialData(data)
        }

        if (bookkeepingRes.ok) {
          const data = await bookkeepingRes.json()
          setBookkeepingData(data)
        }
      } catch (err) {
        console.error('Error fetching financial data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const chaseAllInvoices = async () => {
    if (!confirm('Send chase emails for all overdue invoices?')) return

    setChasing(true)
    try {
      const response = await fetch(resolveCommandCenterUrl('/api/bookkeeping/chase-all'), {
        method: 'POST'
      })
      if (response.ok) {
        alert('Chase emails sent!')
        // Refresh data
        window.location.reload()
      }
    } catch (err) {
      console.error('Error chasing invoices:', err)
    } finally {
      setChasing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '20px' }}>Finance</div>
        <p style={{ color: '#666' }}>Loading financial data...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Finance</h1>
        <p style={{ color: '#666' }}>
          Financial overview from Xero • Last updated {financialData?.lastUpdated ? formatDate(financialData.lastUpdated) : '–'}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {/* Cash Position */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cash Position</p>
              <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>{formatCurrency(financialData?.cashPosition?.net)}</p>
            </div>
            <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '8px' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#6b7280">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Receivable</span>
              <span style={{ color: '#10b981', fontWeight: '500' }}>{formatCurrency(financialData?.cashPosition?.receivable)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payable</span>
              <span style={{ color: '#ef4444', fontWeight: '500' }}>{formatCurrency(financialData?.cashPosition?.payable)}</span>
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Month</p>
              <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>{formatCurrency(financialData?.monthlySummary?.net)}</p>
            </div>
            <div style={{ background: '#dbeafe', padding: '8px', borderRadius: '8px' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#3b82f6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Revenue</span>
              <span style={{ color: '#10b981', fontWeight: '500' }}>{formatCurrency(financialData?.monthlySummary?.revenue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Expenses</span>
              <span style={{ color: '#ef4444', fontWeight: '500' }}>{formatCurrency(financialData?.monthlySummary?.expenses)}</span>
            </div>
          </div>
        </div>

        {/* Bookkeeping Progress */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bookkeeping</p>
              <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>{bookkeepingData?.checklistProgress?.percentage}%</p>
            </div>
            <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
            <p>{bookkeepingData?.checklistProgress?.completed} of {bookkeepingData?.checklistProgress?.total} tasks complete</p>
            <div style={{ marginTop: '8px', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${bookkeepingData?.checklistProgress?.percentage || 0}%`, background: '#f59e0b', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Pending Receipts */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Receipts</p>
              <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>{bookkeepingData?.pendingReceipts?.count || 0}</p>
            </div>
            <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
            <p>Receipts awaiting processing</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        {/* Recent Transactions */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Recent Transactions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {financialData?.recentTransactions?.map((tx) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>{tx.description}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>{tx.category} • {formatDate(tx.date)}</p>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: tx.amount >= 0 ? '#10b981' : '#ef4444' }}>
                  {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Invoices */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Overdue Invoices</h2>
            <button
              onClick={chaseAllInvoices}
              disabled={chasing || (bookkeepingData?.overdueInvoices?.count || 0) === 0}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                opacity: chasing ? 0.5 : 1
              }}
            >
              {chasing ? 'Sending...' : 'Chase All'}
            </button>
          </div>
          {(bookkeepingData?.overdueInvoices?.count || 0) > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bookkeepingData?.overdueInvoices?.invoices?.map((inv) => (
                <div key={inv.invoice_number} style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500' }}>{inv.contact_name}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>{inv.invoice_number}</p>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>{formatCurrency(inv.amount_due)}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px' }}>
                    Due {formatDate(inv.due_date)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#10b981' }}>
              <p style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</p>
              <p>No overdue invoices!</p>
            </div>
          )}
        </div>
      </div>

      {/* GST & BAS Info */}
      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '20px', color: 'white' }}>
          <p style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next BAS Due</p>
          <p style={{ fontSize: '24px', fontWeight: '700', marginTop: '8px' }}>{bookkeepingData?.nextBASDue ? formatDate(bookkeepingData.nextBASDue) : '–'}</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '12px', padding: '20px', color: 'white' }}>
          <p style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GST Owed</p>
          <p style={{ fontSize: '24px', fontWeight: '700', marginTop: '8px' }}>{formatCurrency(bookkeepingData?.gstOwed)}</p>
        </div>
      </div>
    </div>
  )
}
