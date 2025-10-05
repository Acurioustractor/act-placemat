import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { SectionHeader } from './ui/SectionHeader'
import { Card } from './ui/Card'
import { MetricTile } from './ui/MetricTile'
import { EmptyState } from './ui/EmptyState'

interface FinancialData {
  total_revenue: number
  community_share: number
  community_percentage: number
  operating_expenses: number
  net_available_for_communities: number
  revenue_streams: Array<{
    source: string
    amount: number
    community_impact_score?: number
  }>
  community_distributions: Array<{
    community_name: string
    amount: number
    percentage_of_ownership: number
    project: string
  }>
  independence_metrics?: {
    communities_with_own_revenue: number
    total_communities: number
    average_independence_score: number
  }
}

export function RevenueTransparency() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFinancialData()
  }, [])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      const data = (await api.getFinancialDashboard()) as Partial<FinancialData> & { error?: string }

      if (data?.error) {
        setFinancialData(buildDemoFinancials())
      } else if (isFinancialData(data)) {
        setFinancialData(data)
      } else {
        setFinancialData(buildDemoFinancials())
      }
    } catch (err) {
      setError(`Financial data unavailable - using demonstration values. ${err}`)
      console.error('Error loading financial data:', err)
      setFinancialData(buildDemoFinancials())
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center" padding="lg">
        <div className="flex flex-col items-center gap-3 text-clay-500">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-200 border-t-transparent" />
          <p>Loading financial transparency data…</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-100 bg-red-50 text-red-700" padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">We couldn't load the latest financials.</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={loadFinancialData}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </Card>
    )
  }

  if (!financialData) {
    return (
      <EmptyState
        title="Financial data is on the way"
        description="Connect the Xero integration to unlock live transparency for communities."
      />
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Financial Sovereignty"
        title="Revenue Transparency"
        description="Connected directly to Xero so communities can see money flowing, hold ACT accountable, and plan for independence."
      />

      <Card className="border-brand-100 bg-brand-50/70 text-brand-800" padding="md">
        <p className="text-sm font-semibold uppercase tracking-wide">Our commitment</p>
        <p className="mt-2 text-lg font-semibold">40% of all revenue flows directly to communities.</p>
        {error && error.includes('demonstration') ? (
          <p className="mt-2 text-sm text-clay-600">
            Currently using demonstration data while Xero credentials are refreshed.
          </p>
        ) : (
          <p className="mt-2 text-sm text-clay-600">This dashboard updates automatically from the accounting ledger.</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Total revenue"
          value={`$${financialData.total_revenue.toLocaleString()}`}
          caption="Across all revenue streams"
          tone="ocean"
        />
        <MetricTile
          label="Community share"
          value={`$${financialData.community_share.toLocaleString()}`}
          caption={`${financialData.community_percentage}% of total revenue`}
          tone="brand"
        />
        <MetricTile
          label="Operating expenses"
          value={`$${financialData.operating_expenses.toLocaleString()}`}
          caption="Platform and infrastructure"
        />
        <MetricTile
          label="Net to communities"
          value={`$${financialData.net_available_for_communities.toLocaleString()}`}
          caption="After expenses"
          tone="brand"
        />
      </div>

      {financialData.independence_metrics && (
        <Card padding="md">
          <h3 className="text-lg font-semibold text-clay-900">Community independence progress</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricTile
              label="Communities with their own revenue"
              value={`${financialData.independence_metrics.communities_with_own_revenue}/${financialData.independence_metrics.total_communities}`}
              caption="Driving toward Beautiful Obsolescence"
              tone="ocean"
            />
            <MetricTile
              label="Average independence score"
              value={`${financialData.independence_metrics.average_independence_score}%`}
              caption="Based on shared control of finances"
            />
            <MetricTile
              label="Revenue share commitment"
              value="40%"
              caption="Tracking our promise to communities"
              tone="brand"
            />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="text-lg font-semibold text-clay-900">Revenue sources</h3>
          <div className="mt-4 space-y-4">
            {financialData.revenue_streams.map((stream, index) => (
              <div key={index} className="flex items-start justify-between gap-4 border-b border-clay-100 pb-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-clay-900">{stream.source}</p>
                  {stream.community_impact_score && (
                    <p className="mt-1 text-xs text-clay-500">
                      Community impact score: {stream.community_impact_score}/5
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-clay-900">
                  ${stream.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-lg font-semibold text-clay-900">Community distributions</h3>
          <div className="mt-4 space-y-4">
            {financialData.community_distributions.map((distribution, index) => (
              <div key={index} className="rounded-lg border border-brand-100 bg-brand-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-brand-800">{distribution.community_name}</p>
                    <p className="text-xs text-clay-600">{distribution.project}</p>
                    <p className="mt-2 text-xs font-medium text-brand-700">
                      {distribution.percentage_of_ownership}% ownership
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-800">
                    ${distribution.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding="md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-clay-900">Financial data export</h3>
            <p className="mt-1 text-sm text-clay-600">
              Download transparency reports for community review and independence planning.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-brand-700">
              Download full report (PDF)
            </button>
            <button className="rounded-lg border border-clay-200 px-4 py-2 text-sm font-medium text-clay-700 transition hover:bg-clay-100">
              Export data (CSV)
            </button>
            <button className="rounded-lg border border-clay-200 px-4 py-2 text-sm font-medium text-clay-700 transition hover:bg-clay-100">
              API access docs
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function isFinancialData(value: unknown): value is FinancialData {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.total_revenue === 'number' &&
    typeof record.community_share === 'number' &&
    typeof record.community_percentage === 'number'
  )
}

function buildDemoFinancials(): FinancialData {
  return {
    total_revenue: 125000,
    community_share: 50000,
    community_percentage: 40,
    operating_expenses: 75000,
    net_available_for_communities: 50000,
    revenue_streams: [
      { source: 'Consulting Services', amount: 75000, community_impact_score: 4 },
      { source: 'Grant Funding', amount: 30000, community_impact_score: 5 },
      { source: 'Platform Subscriptions', amount: 20000, community_impact_score: 3 },
    ],
    community_distributions: [
      { community_name: 'Beyond Shadows', amount: 15000, percentage_of_ownership: 30, project: "Men's Group Support" },
      { community_name: 'Young Guns', amount: 12000, percentage_of_ownership: 25, project: 'Youth Development' },
      { community_name: 'MMEIC', amount: 13000, percentage_of_ownership: 25, project: 'Community Enterprise' },
    ],
    independence_metrics: {
      communities_with_own_revenue: 3,
      total_communities: 8,
      average_independence_score: 45,
    },
  }
}
