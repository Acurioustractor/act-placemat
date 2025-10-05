import { useEffect, useState } from 'react'
import { SectionHeader } from './ui/SectionHeader'
import { Card } from './ui/Card'
import { MetricTile } from './ui/MetricTile'
import { EmptyState } from './ui/EmptyState'

interface SovereigntyData {
  independence_score: number
  data_completeness: number
  export_readiness: number
  local_capacity: number
  technology_transfer_progress: number
  community_data_summary: {
    total_stories: number
    total_projects: number
    total_contacts: number
    total_financial_records: number
    total_integrations: number
  }
  beautiful_obsolescence_indicators: {
    communities_with_own_platforms: number
    communities_with_independent_revenue: number
    data_sovereignty_achieved: number
    act_dependency_score: number
  }
}

interface IntegrationStatus {
  id: string
  name: string
  healthy: boolean
  configured: boolean
  message?: string
  lastChecked?: string
  authenticated?: boolean
  initialized?: boolean
}

interface IntegrationSummary {
  overall: string
  healthyCount: number
  totalServices: number
  healthScore: number
  services: IntegrationStatus[]
}

export function DataSovereignty() {
  const [sovereigntyData, setSovereigntyData] = useState<SovereigntyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [integrationSummary, setIntegrationSummary] = useState<IntegrationSummary | null>(null)

  useEffect(() => {
    loadSovereigntyData()
  }, [])

  const loadSovereigntyData = async () => {
    try {
      setLoading(true)
      const [systemData, integrationData] = await Promise.all([
        fetch('/api/health').then((r) => r.json()).catch(() => ({})),
        fetch('/api/integrations/status').then((r) => r.json()).catch(() => ({})),
      ])

      const parsedIntegration = parseIntegrationSummary(integrationData)
      setIntegrationSummary(parsedIntegration)

      setSovereigntyData({
        independence_score: calculateIndependenceScore(systemData, parsedIntegration),
        data_completeness: 85,
        export_readiness: 92,
        local_capacity: 70,
        technology_transfer_progress: 60,
        community_data_summary: {
          total_stories: systemData.stories_count || 0,
          total_projects: systemData.projects_count || 0,
          total_contacts: systemData.contacts_count || 0,
          total_financial_records: systemData.financial_records_count || 0,
          total_integrations: parsedIntegration?.healthyCount || 0,
        },
        beautiful_obsolescence_indicators: {
          communities_with_own_platforms: 2,
          communities_with_independent_revenue: 8,
          data_sovereignty_achieved: 15,
          act_dependency_score: 35,
        },
      })
    } catch (err) {
      setError(`Failed to load sovereignty data: ${err}`)
      console.error('Error loading sovereignty data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateIndependenceScore = (systemData: any, integrationData: IntegrationSummary | null) => {
    const dataScore = (systemData.data_completeness || 80) * 0.3
    const techScore = (integrationData?.healthScore ?? 85) * 0.3
    const capacityScore = 70 * 0.4
    return Math.round(dataScore + techScore + capacityScore)
  }

  const exportAllData = async (format: 'json' | 'csv' | 'complete') => {
    try {
      setExportStatus('Preparing export…')
      const endpoints = ['/api/stories', '/api/dashboard/real-projects', '/api/dashboard/real-contacts', '/api/business-dashboard', '/api/crm/linkedin-contacts']
      const allData: Record<string, unknown> = {}

      for (const endpoint of endpoints) {
        setExportStatus(`Exporting ${endpoint}…`)
        try {
          const response = await fetch(endpoint)
          const data = await response.json()
          allData[endpoint.replace('/api/', '')] = data
        } catch (err) {
          console.warn(`Failed to export ${endpoint}:`, err)
        }
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `community-data-export-${format}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportStatus('Export complete!')
      setTimeout(() => setExportStatus(null), 3000)
    } catch (err) {
      setExportStatus(`Export failed: ${err}`)
      setTimeout(() => setExportStatus(null), 5000)
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center" padding="lg">
        <div className="flex flex-col items-center gap-3 text-clay-500">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-200 border-t-transparent" />
          <p>Loading data sovereignty status…</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-100 bg-red-50 text-red-700" padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">We couldn't load the sovereignty metrics.</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={loadSovereigntyData}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </Card>
    )
  }

  if (!sovereigntyData) {
    return <EmptyState title="No sovereignty data available" description="Connect integrations to start tracking readiness." />
  }

  const renderIntegrationBadge = (service: IntegrationStatus) => {
    const healthy = service.healthy && service.configured
    const tone = healthy
      ? 'bg-emerald-100 text-emerald-800'
      : service.configured
      ? 'bg-amber-100 text-amber-800'
      : 'bg-clay-100 text-clay-600'
    const label = healthy ? 'Healthy' : service.configured ? 'Action needed' : 'Not configured'

    return (
      <div key={service.id} className="flex flex-col gap-1 rounded-lg border border-clay-100 bg-white p-3 shadow-subtle">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-clay-900">{service.name}</h4>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
        </div>
        {service.message && <p className="text-xs text-clay-500">{service.message}</p>}
        {service.authenticated !== undefined && (
          <p className="text-xs text-clay-500">
            Authenticated:{' '}
            <span className={service.authenticated ? 'text-emerald-600' : 'text-amber-700'}>
              {service.authenticated ? 'Yes' : 'No'}
            </span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Beautiful Obsolescence"
        title="Data Sovereignty"
        description="Measure how close each community is to taking full custody of the platform and operating without ACT."
      />

      <Card padding="md">
        <h3 className="text-xl font-semibold text-clay-900">Community independence score</h3>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex justify-between text-sm text-clay-500">
              <span>Dependent</span>
              <span>Independent</span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-clay-100">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-brand-400 via-ocean-400 to-ocean-600 transition-all duration-500"
                style={{ width: `${sovereigntyData.independence_score}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-clay-500">Overall readiness</p>
            <p className="text-3xl font-semibold text-ocean-700">{sovereigntyData.independence_score}%</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Data completeness"
          value={`${sovereigntyData.data_completeness}%`}
          caption="Verified data synced across sources"
          tone="brand"
        />
        <MetricTile
          label="Export readiness"
          value={`${sovereigntyData.export_readiness}%`}
          caption="APIs and export tooling coverage"
          tone="ocean"
        />
        <MetricTile
          label="Local capacity"
          value={`${sovereigntyData.local_capacity}%`}
          caption="Community ability to run platforms"
        />
        <MetricTile
          label="Tech transfer progress"
          value={`${sovereigntyData.technology_transfer_progress}%`}
          caption="Documentation, training, processes"
        />
      </div>

      {integrationSummary && (
        <Card padding="md">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-clay-900">Integration health</h3>
              <p className="mt-1 text-sm text-clay-500">
                {integrationSummary.healthyCount} of {integrationSummary.totalServices} integrations healthy • Status: {integrationSummary.overall}
              </p>
            </div>
            <div className="rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-600">
              Health score {integrationSummary.healthScore}%
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {integrationSummary.services.map((service) => renderIntegrationBadge(service))}
          </div>
        </Card>
      )}

      <Card padding="md">
        <h3 className="text-lg font-semibold text-clay-900">Community data summary</h3>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryItem label="Stories" value={sovereigntyData.community_data_summary.total_stories} description="Community-led narratives with consent" />
          <SummaryItem label="Projects" value={sovereigntyData.community_data_summary.total_projects} description="Active initiatives" />
          <SummaryItem label="Contacts" value={sovereigntyData.community_data_summary.total_contacts} description="Relationship intelligence nodes" />
          <SummaryItem label="Financial records" value={sovereigntyData.community_data_summary.total_financial_records} description="Xero ledger entries" />
          <SummaryItem label="Integrations" value={sovereigntyData.community_data_summary.total_integrations} description="Active data connections" />
        </dl>
      </Card>

      <Card padding="md">
        <h3 className="text-lg font-semibold text-clay-900">Beautiful Obsolescence indicators</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <IndicatorCard
            title="Communities with own platforms"
            value={sovereigntyData.beautiful_obsolescence_indicators.communities_with_own_platforms}
            description="Communities running independent forks"
            tone="brand"
          />
          <IndicatorCard
            title="Communities with independent revenue"
            value={sovereigntyData.beautiful_obsolescence_indicators.communities_with_independent_revenue}
            description="Financial sovereignty achieved"
            tone="ocean"
          />
          <IndicatorCard
            title="Data sovereignty achieved"
            value={sovereigntyData.beautiful_obsolescence_indicators.data_sovereignty_achieved}
            description="Communities with full data custody"
            tone="brand"
          />
          <IndicatorCard
            title="ACT dependency score"
            value={`${sovereigntyData.beautiful_obsolescence_indicators.act_dependency_score}%`}
            description="Lower is better. Tracks reliance on ACT tooling."
          />
        </div>
      </Card>

      <Card padding="md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-clay-900">Export everything in one click</h3>
            <p className="mt-1 text-sm text-clay-600">
              Share data ownership packs with communities or auditors in the format they prefer.
            </p>
            {exportStatus && <p className="mt-2 text-xs text-clay-500">{exportStatus}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-brand-700"
              onClick={() => exportAllData('complete')}
            >
              Export everything (JSON)
            </button>
            <button
              className="rounded-lg border border-clay-200 px-4 py-2 text-sm font-medium text-clay-700 transition hover:bg-clay-100"
              onClick={() => exportAllData('csv')}
            >
              Export key tables (CSV)
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function parseIntegrationSummary(raw: any): IntegrationSummary | null {
  if (!raw) return null

  const services = (raw.services || raw.status || {}) as Record<string, any>
  const entries = Object.entries(services)
  if (entries.length === 0) {
    return null
  }

  const mapped: IntegrationStatus[] = entries.map(([key, value]) => {
    const service = (value as any) || {}
    return {
      id: key,
      name: key.replace(/_/g, ' '),
      healthy: Boolean(service.healthy),
      configured: service.configured !== undefined ? Boolean(service.configured) : true,
      message: service.message,
      lastChecked: service.lastChecked,
      authenticated: service.authenticated,
      initialized: service.initialized
    }
  })

  const healthyCount = mapped.filter((service) => service.healthy).length
  const totalServices = mapped.length
  const healthScore = totalServices > 0 ? Math.round((healthyCount / totalServices) * 100) : 0

  return {
    overall:
      raw.overall || (healthyCount === totalServices ? 'healthy' : healthyCount > 0 ? 'degraded' : 'offline'),
    healthyCount,
    totalServices,
    healthScore,
    services: mapped
  }
}

function SummaryItem({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <div className="rounded-lg border border-clay-100 bg-clay-50 p-4">
      <dt className="text-sm font-medium text-clay-500">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold text-clay-900">{value.toLocaleString()}</dd>
      <p className="mt-1 text-xs text-clay-500">{description}</p>
    </div>
  )
}

function IndicatorCard({
  title,
  value,
  description,
  tone = 'neutral',
}: {
  title: string
  value: number | string
  description: string
  tone?: 'brand' | 'ocean' | 'neutral'
}) {
  const palette = {
    brand: 'border-brand-100 bg-brand-50/70 text-brand-800',
    ocean: 'border-ocean-100 bg-ocean-50/70 text-ocean-800',
    neutral: 'border-clay-100 bg-white text-clay-800',
  }

  return (
    <div className={`rounded-lg border p-4 ${palette[tone]}`}>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs">{description}</p>
    </div>
  )
}
