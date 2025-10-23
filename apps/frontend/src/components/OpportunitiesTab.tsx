import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'
import { EmptyState } from './ui/EmptyState'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { SkeletonList } from './ui/SkeletonCard'

interface Opportunity {
  id: string
  title: string
  source: string
  amount: number
  deadline: string | null
  status: string
  description: string
  requirements: string
  url: string
  matchScore: number
  tags: string[]
  createdTime?: string
  lastEditedTime?: string
  relevanceScore?: number
}

interface OpportunitiesResponse {
  success: boolean
  count: number
  opportunities: Opportunity[]
}

interface DiscoveryResult {
  title: string
  description: string
  url: string
  source: string
  relevanceScore: number
}

interface DiscoveryResponse {
  success: boolean
  query: string
  count: number
  results: DiscoveryResult[]
}

const STATUS_COLOR_MAP: Record<string, string> = {
  open: 'bg-brand-100 text-brand-800',
  active: 'bg-brand-100 text-brand-800',
  'in progress': 'bg-ocean-100 text-ocean-800',
  submitted: 'bg-ocean-100 text-ocean-800',
  awarded: 'bg-green-100 text-green-800',
  closed: 'bg-clay-100 text-clay-600',
  declined: 'bg-clay-100 text-clay-600'
}

const getStatusBadgeClass = (status?: string) =>
  STATUS_COLOR_MAP[(status || '').toLowerCase()] || 'bg-clay-100 text-clay-700'

export function OpportunitiesTab() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'active'>('all')

  useEffect(() => {
    loadOpportunities()
  }, [])

  const loadOpportunities = async () => {
    try {
      setLoading(true)
      const response = await api.getOpportunities() as OpportunitiesResponse

      if (response.success && response.opportunities) {
        setOpportunities(response.opportunities)
        setError(null)
      } else {
        setOpportunities([])
        setError('No opportunities found')
      }
    } catch (err) {
      console.error('Failed to load opportunities:', err)
      setError('Unable to load opportunities. Please try again.')
      setOpportunities([])
    } finally {
      setLoading(false)
    }
  }

  const handleDiscoverGrants = async () => {
    if (!searchQuery.trim()) return

    try {
      setDiscovering(true)
      const response = await api.discoverOpportunities(searchQuery) as DiscoveryResponse

      if (response.success && response.results) {
        setDiscoveryResults(response.results)
      } else {
        setDiscoveryResults([])
      }
    } catch (err) {
      console.error('Grant discovery failed:', err)
      alert('Grant discovery failed. Please try again.')
    } finally {
      setDiscovering(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0
    }).format(value)

  const filteredOpportunities = opportunities.filter(opp => {
    if (filter === 'all') return true
    return opp.status.toLowerCase() === filter
  })

  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + opp.amount, 0)
  const openCount = opportunities.filter(opp => opp.status.toLowerCase() === 'open').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <SectionHeader
            eyebrow="Grant Discovery"
            title="Funding Opportunities"
            description="AI-powered grant discovery for Australian community projects"
          />
          <LoadingSpinner size="lg" message="Discovering opportunities…" className="py-12" />
          <SkeletonList count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <SectionHeader
          eyebrow="Grant Discovery"
          title="Funding Opportunities"
          description="AI-powered grant discovery for Australian community projects, synced live from Notion and real government sources."
        />

        {error && (
          <Card className="border-amber-100 bg-amber-50 text-amber-700" padding="sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Limited data</h3>
                <p className="text-xs">{error}</p>
              </div>
              <button
                onClick={loadOpportunities}
                className="rounded-lg border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
              >
                Retry
              </button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-brand-100 bg-brand-50/70 text-brand-800" padding="sm">
            <p className="text-sm font-medium">Open Opportunities</p>
            <p className="mt-1 text-3xl font-semibold">{openCount}</p>
            <p className="mt-2 text-sm">Active grants ready for application</p>
          </Card>
          <Card className="border-ocean-100 bg-ocean-50/70 text-ocean-800" padding="sm">
            <p className="text-sm font-medium">Total Value</p>
            <p className="mt-1 text-3xl font-semibold">{formatCurrency(totalValue)}</p>
            <p className="mt-2 text-sm">Combined funding available</p>
          </Card>
          <Card className="border-green-100 bg-green-50/70 text-green-800" padding="sm">
            <p className="text-sm font-medium">AI Discovery</p>
            <p className="mt-1 text-3xl font-semibold">Tavily</p>
            <p className="mt-2 text-sm">Real-time Australian grant search</p>
          </Card>
        </div>

        {/* AI Discovery */}
        <Card className="border-brand-100 bg-white" padding="md">
          <h3 className="text-lg font-semibold text-clay-900 mb-4">Discover New Grants</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDiscoverGrants()}
              placeholder="e.g. Indigenous youth programs, community storytelling, regenerative agriculture..."
              className="flex-1 rounded-lg border border-clay-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              disabled={discovering}
            />
            <button
              onClick={handleDiscoverGrants}
              disabled={discovering || !searchQuery.trim()}
              className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:bg-clay-300 disabled:cursor-not-allowed"
            >
              {discovering ? 'Searching…' : 'Discover'}
            </button>
          </div>

          {discoveryResults.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-clay-700">Discovery Results</h4>
              {discoveryResults.map((result, idx) => (
                <div key={idx} className="rounded-lg border border-brand-100 bg-brand-50/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h5 className="font-semibold text-clay-900">{result.title}</h5>
                      <p className="mt-1 text-sm text-clay-600 line-clamp-2">{result.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="text-brand-700 font-medium">{result.source}</span>
                        <span className="text-clay-400">•</span>
                        <span className="text-clay-500">Relevance: {Math.round(result.relevanceScore * 100)}%</span>
                      </div>
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-700"
                    >
                      View ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'open', 'active'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === filterOption
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-clay-600 hover:bg-clay-50'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              {filterOption !== 'all' && (
                <span className="ml-2 text-xs opacity-75">
                  ({opportunities.filter(o => o.status.toLowerCase() === filterOption).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Opportunities List */}
        {filteredOpportunities.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            description={filter === 'all'
              ? "Use the AI discovery tool above to find Australian grants that match your projects."
              : `No ${filter} opportunities. Try a different filter.`}
          />
        ) : (
          <div className="space-y-4">
            {filteredOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0
    }).format(value)

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return { text: 'No deadline', urgent: false }

    const date = new Date(deadline)
    const now = new Date()
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return { text: 'Closed', urgent: false }
    if (daysUntil === 0) return { text: 'Today!', urgent: true }
    if (daysUntil === 1) return { text: 'Tomorrow', urgent: true }
    if (daysUntil <= 7) return { text: `${daysUntil} days`, urgent: true }
    if (daysUntil <= 30) return { text: `${Math.ceil(daysUntil / 7)} weeks`, urgent: false }

    return {
      text: date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
      urgent: false
    }
  }

  const deadline = formatDeadline(opportunity.deadline)
  const statusBadgeClass = getStatusBadgeClass(opportunity.status)

  return (
    <Card className="border border-clay-200 bg-white hover:shadow-lg hover:scale-[1.01] transition-all duration-200" padding="lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-start gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass}`}>
              {opportunity.status}
            </span>
            {opportunity.matchScore > 0 && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {opportunity.matchScore}% match
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-clay-900">{opportunity.title}</h3>
            {opportunity.source && (
              <p className="mt-1 text-sm text-clay-500">Source: {opportunity.source}</p>
            )}
          </div>

          {opportunity.description && (
            <p className="text-sm text-clay-600 line-clamp-3">{opportunity.description}</p>
          )}

          {opportunity.requirements && (
            <div className="rounded-lg bg-clay-50 p-3">
              <p className="text-xs font-semibold text-clay-700 mb-1">Requirements</p>
              <p className="text-xs text-clay-600 line-clamp-2">{opportunity.requirements}</p>
            </div>
          )}

          {opportunity.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {opportunity.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="md:w-64 flex-shrink-0 space-y-3">
          <div className="rounded-lg bg-brand-50 p-4 text-center">
            <p className="text-xs font-medium text-brand-600">Funding Amount</p>
            <p className="mt-1 text-2xl font-bold text-brand-900">
              {opportunity.amount > 0 ? formatCurrency(opportunity.amount) : 'TBA'}
            </p>
          </div>

          <div className={`rounded-lg p-4 text-center ${deadline.urgent ? 'bg-red-50' : 'bg-ocean-50'}`}>
            <p className="text-xs font-medium text-clay-600">Deadline</p>
            <p className={`mt-1 text-lg font-semibold ${deadline.urgent ? 'text-red-700' : 'text-ocean-900'}`}>
              {deadline.text}
            </p>
          </div>

          {opportunity.url && (
            <a
              href={opportunity.url}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-brand-700"
            >
              View Details ↗
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}
