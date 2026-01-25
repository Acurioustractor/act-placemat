import { useState, useEffect } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'

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

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(resolveCommandCenterUrl('/api/opportunities'))
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

  const discoverGrants = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setError(null)

    try {
      const response = await fetch(resolveCommandCenterUrl('/api/opportunities/discover'), {
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
    if (!amount) return 'Amount TBD'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const daysUntil = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return { text: 'Expired', color: 'text-slate-400' }
    if (daysUntil === 0) return { text: 'Due today', color: 'text-red-600' }
    if (daysUntil === 1) return { text: 'Due tomorrow', color: 'text-red-600' }
    if (daysUntil <= 7) return { text: `${daysUntil} days left`, color: 'text-orange-600' }
    if (daysUntil <= 30) return { text: `${daysUntil} days left`, color: 'text-amber-600' }

    return {
      text: date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      color: 'text-slate-600'
    }
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-slate-100 text-slate-600'
    if (score >= 70) return 'bg-emerald-100 text-emerald-700'
    if (score >= 50) return 'bg-amber-100 text-amber-700'
    return 'bg-orange-100 text-orange-700'
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-slate-100 text-slate-600'
    switch (status.toLowerCase()) {
      case 'applied': return 'bg-blue-100 text-blue-700'
      case 'approved': return 'bg-emerald-100 text-emerald-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'researching': return 'bg-purple-100 text-purple-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  // Calculate stats
  const totalValue = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0)
  const appliedCount = opportunities.filter(o => o.status?.toLowerCase() === 'applied').length
  const urgentCount = opportunities.filter(o => {
    if (!o.deadline) return false
    const daysUntil = Math.floor((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 0 && daysUntil <= 14
  }).length

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Pipeline Value</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Saved Opportunities</p>
              <p className="text-2xl font-bold text-slate-900">{opportunities.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Applied</p>
              <p className="text-2xl font-bold text-purple-600">{appliedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Urgent (2 weeks)</p>
              <p className="text-2xl font-bold text-orange-600">{urgentCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && discoverGrants()}
              placeholder="Discover grants: indigenous community agriculture, youth programs, regenerative farming..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              disabled={searching}
            />
          </div>
          <button
            onClick={discoverGrants}
            disabled={searching || !searchQuery.trim()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? 'Searching...' : 'Discover Grants'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Powered by Tavily AI - searches Australian government grants, business.gov.au, and indigenous funding programs
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Discovered Grants */}
      {discoveredGrants.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Discovered Opportunities
            </h3>
            <span className="text-xs text-emerald-600 font-medium">{discoveredGrants.length} found</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {discoveredGrants.map((grant, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="font-semibold text-slate-900 line-clamp-2">{grant.title}</h4>
                  {grant.relevanceScore && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getScoreColor(grant.relevanceScore * 100)}`}>
                      {Math.round(grant.relevanceScore * 100)}% match
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {grant.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{grant.source}</span>
                  {grant.url && (
                    <a
                      href={grant.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      View details →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Opportunities */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Saved Opportunities
          </h3>
          <span className="text-xs text-slate-500">{opportunities.length} tracked</span>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Loading opportunities...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-slate-900">No saved opportunities yet</p>
            <p className="text-sm text-slate-500 mt-1">Use the search above to discover grants and funding opportunities</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      Opportunity
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      Deadline
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      Match
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {opportunities.map((opp) => {
                    const deadline = formatDeadline(opp.deadline)
                    return (
                      <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="max-w-md">
                            <p className="font-medium text-slate-900 line-clamp-1">{opp.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{opp.source}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-emerald-600">
                            {formatCurrency(opp.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {deadline ? (
                            <span className={`text-sm font-medium ${deadline.color}`}>
                              {deadline.text}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">No deadline</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {opp.matchScore !== undefined ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(opp.matchScore)}`}>
                              {opp.matchScore}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {opp.status ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(opp.status)}`}>
                              {opp.status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
