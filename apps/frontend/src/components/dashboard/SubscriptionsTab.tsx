/**
 * Subscriptions Tab - Subscription Management Dashboard
 *
 * Displays subscription data from port 3456:
 * - All active subscriptions with costs
 * - Monthly and yearly totals
 * - Categorized by type (AI, Development, Database, etc.)
 */

import { useState, useEffect } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'

interface Subscription {
  id: string
  name: string
  provider: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  status: 'active' | 'cancelled' | 'paused'
  next_billing: string
  category: string
}

interface SubscriptionsData {
  subscriptions: Subscription[]
  monthlyTotal: {
    USD: number
    AUD: number
  }
  yearlyProjection: {
    USD: number
    AUD: number
  }
}

const formatCurrency = (value: number | null | undefined, currency = 'USD') => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    'AI': { bg: '#ede9fe', text: '#7c3aed' },
    'Development': { bg: '#dbeafe', text: '#2563eb' },
    'Database': { bg: '#dcfce7', text: '#16a34a' },
    'Hosting': { bg: '#fef3c7', text: '#d97706' },
    'Accounting': { bg: '#fce7f3', text: '#db2777' },
    'Communication': { bg: '#e0e7ff', text: '#4f46e5' },
  }
  return colors[category] || { bg: '#f3f4f6', text: '#6b7280' }
}

export default function SubscriptionsTab() {
  const [data, setData] = useState<SubscriptionsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(resolveCommandCenterUrl('/api/subscriptions'))
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (err) {
        console.error('Error fetching subscriptions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '20px' }}>Subscriptions</h1>
        <p style={{ color: '#666' }}>Loading subscriptions...</p>
      </div>
    )
  }

  const categories = [...new Set(data?.subscriptions?.map(s => s.category) || [])]

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Subscriptions</h1>
        <p style={{ color: '#666' }}>Manage your SaaS subscriptions and recurring costs</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly (USD)</p>
          <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px', color: '#2563eb' }}>{formatCurrency(data?.monthlyTotal?.USD)}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly (AUD)</p>
          <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px', color: '#7c3aed' }}>{formatCurrency(data?.monthlyTotal?.AUD, 'AUD')}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yearly (USD)</p>
          <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>{formatCurrency(data?.yearlyProjection?.USD)}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</p>
          <p style={{ fontSize: '28px', fontWeight: '700', marginTop: '8px' }}>{data?.subscriptions?.length || 0}</p>
        </div>
      </div>

      {/* Subscriptions by Category */}
      {categories.map(category => {
        const categorySubs = data?.subscriptions?.filter(s => s.category === category) || []
        const categoryTotal = categorySubs.reduce((sum, s) => sum + s.amount, 0)
        const colors = getCategoryColor(category)

        return (
          <div key={category} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '600',
                background: colors.bg,
                color: colors.text
              }}>
                {category}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                {formatCurrency(categoryTotal)}/month
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categorySubs.map(sub => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>{sub.name}</p>
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>{sub.provider}</p>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '16px' }}>
                    <p style={{ fontSize: '18px', fontWeight: '700' }}>{formatCurrency(sub.amount, sub.currency)}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>/{sub.interval}</p>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: sub.status === 'active' ? '#dcfce7' : '#fef3c7',
                    color: sub.status === 'active' ? '#16a34a' : '#d97706',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {sub.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Category Summary */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '12px', padding: '24px', color: 'white', marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Spending by Category</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {categories.map(category => {
            const categorySubs = data?.subscriptions?.filter(s => s.category === category) || []
            const categoryTotal = categorySubs.reduce((sum, s) => sum + s.amount, 0)
            const colors = getCategoryColor(category)
            const percentage = Math.round((categoryTotal / (data?.monthlyTotal?.USD || 1)) * 100)

            return (
              <div key={category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>{category}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{percentage}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${percentage}%`, background: colors.text, borderRadius: '3px' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
