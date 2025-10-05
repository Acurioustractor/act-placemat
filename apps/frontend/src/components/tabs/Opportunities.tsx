import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { SectionHeader } from '../ui/SectionHeader'
import { EmptyState } from '../ui/EmptyState'

interface Opportunity {
  id?: string
  title: string
  description: string
  source: string
  url?: string
  amount?: number
  deadline?: string
  status?: string
  matchScore?: number
  relevanceScore?: number
  tags?: string[]
}

export function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [discoveredGrants, setDiscoveredGrants] = useState<Opportunity[]>([])

  // Fetch saved opportunities from Notion
  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:4000/api/opportunities')
      const data = await response.json()

      if (data.success) {
        setOpportunities(data.opportunities)
      } else {
        setError(data.error || 'Failed to fetch opportunities')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching opportunities:', err)
    } finally {
      setLoading(false)
    }
  }

  // AI-powered grant discovery using Tavily
  const discoverGrants = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:4000/api/opportunities/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          maxResults: 10
        })
      })

      const data = await response.json()

      if (data.success) {
        setDiscoveredGrants(data.results)
      } else {
        setError(data.error || 'Grant discovery failed')
      }
    } catch (err) {
      setError('Failed to discover grants')
      console.error('Error discovering grants:', err)
    } finally {
      setSearching(false)
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Amount not specified'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return 'No deadline'
    const date = new Date(deadline)
    const daysUntil = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return 'Expired'
    if (daysUntil === 0) return 'Due today!'
    if (daysUntil === 1) return 'Due tomorrow'
    if (daysUntil <= 7) return `Due in ${daysUntil} days`

    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600'
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-orange-600'
  }

  const getDeadlineColor = (deadline?: string) => {
    if (!deadline) return 'text-gray-600'
    const daysUntil = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return 'text-gray-400'
    if (daysUntil <= 7) return 'text-red-600'
    if (daysUntil <= 30) return 'text-orange-600'
    return 'text-green-600'
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <SectionHeader
        title="Grant Opportunities"
        description="AI-powered grant discovery and application tracking for ACT projects"
      />

      {/* Grant Discovery Search */}
      <Card className="mb-8">
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            🔍 Discover New Grants
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && discoverGrants()}
              placeholder="e.g., indigenous community agriculture, youth programs, regenerative farming..."
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={discoverGrants}
              disabled={searching || !searchQuery.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {searching ? 'Searching...' : 'Discover Grants'}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Powered by Tavily AI - searches Australian government grants, business.gov.au, and indigenous funding programs
          </p>
        </div>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* Discovered Grants */}
      {discoveredGrants.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            ✨ Discovered Opportunities ({discoveredGrants.length})
          </h3>
          <div className="grid gap-6">
            {discoveredGrants.map((grant, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-900 mb-1">
                        {grant.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center">
                          🌐 {grant.source}
                        </span>
                        {grant.relevanceScore && (
                          <span className={`font-medium ${getScoreColor(grant.relevanceScore * 100)}`}>
                            {Math.round(grant.relevanceScore * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mb-4 text-sm text-slate-700 line-clamp-3">
                    {grant.description}
                  </p>

                  <div className="flex gap-2">
                    {grant.url && (
                      <a
                        href={grant.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Saved Opportunities from Notion */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          📋 Saved Opportunities ({opportunities.length})
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-slate-600">Loading opportunities...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <EmptyState
            icon="💎"
            title="No saved opportunities yet"
            description="Use the search above to discover grants and funding opportunities. Found opportunities can be saved to your Notion database for tracking."
          />
        ) : (
          <div className="grid gap-6">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-900 mb-1">
                        {opp.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center">
                          🌐 {opp.source}
                        </span>
                        {opp.amount && (
                          <span className="font-medium text-green-600">
                            💰 {formatCurrency(opp.amount)}
                          </span>
                        )}
                        {opp.deadline && (
                          <span className={`font-medium ${getDeadlineColor(opp.deadline)}`}>
                            📅 {formatDeadline(opp.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                    {opp.matchScore !== undefined && (
                      <div className="ml-4 text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(opp.matchScore)}`}>
                          {opp.matchScore}%
                        </div>
                        <div className="text-xs text-slate-600">match</div>
                      </div>
                    )}
                  </div>

                  {opp.description && (
                    <p className="mb-4 text-sm text-slate-700">
                      {opp.description}
                    </p>
                  )}

                  {opp.tags && opp.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {opp.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {opp.status && (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        opp.status === 'Applied' ? 'bg-blue-100 text-blue-800' :
                        opp.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        opp.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {opp.status}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
