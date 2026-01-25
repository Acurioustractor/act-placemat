/**
 * EcosystemMap - ACT Ecosystem Sites Widget
 *
 * Shows:
 * - All ACT ecosystem sites with status
 * - Health indicators (healthy, degraded, offline)
 * - Quick links to each site
 * - Category grouping (Core, Platforms, Community)
 *
 * Connected to Command Center API via /api/ecosystem
 */

import { useEcosystem } from '../../hooks/useBrainCenter'

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  healthy: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700'
  },
  degraded: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700'
  },
  offline: {
    dot: 'bg-red-500',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700'
  },
  unknown: {
    dot: 'bg-slate-400',
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-600'
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  core: '🏛️',
  platform: '🚀',
  community: '🌱'
}

export function EcosystemMap() {
  const { sites, categories, health, loading, error, refetch } = useEcosystem()

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          <span className="text-sm text-slate-500">Loading ecosystem status...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-sm text-red-600">{error}</div>
        <button
          onClick={refetch}
          className="mt-2 text-xs text-emerald-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-6 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-emerald-600 font-medium">ACT Ecosystem</div>
            <h3 className="text-lg font-semibold text-slate-900">Sites & Services</h3>
          </div>
          <div className="text-right">
            {health && (
              <>
                <div className="text-3xl font-bold text-emerald-600">{health.healthy}/{health.total}</div>
                <div className="text-xs text-slate-500">healthy</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Health Status Bar */}
      {health && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              <span className="text-xs text-slate-600">Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              <span className="text-xs text-slate-600">Degraded</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-xs text-slate-600">Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
              <span className="text-xs text-slate-600">Unknown</span>
            </div>
          </div>
        </div>
      )}

      {/* Sites by Category */}
      <div className="p-4 space-y-4">
        {Object.entries(categories).map(([key, category]) => {
          if (!category.sites || category.sites.length === 0) return null

          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <span>{CATEGORY_ICONS[key] || '📦'}</span>
                <span className="text-sm font-medium text-slate-700">{category.name}</span>
                <span className="text-xs text-slate-400">({category.sites.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.sites.map(site => {
                  const statusStyle = STATUS_STYLES[site.status] || STATUS_STYLES.unknown

                  return (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-lg border ${statusStyle.bg} hover:shadow-sm transition-shadow`}
                    >
                      {/* Status dot */}
                      <div className="flex-shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot} inline-block ${site.status === 'healthy' ? '' : 'animate-pulse'}`}></span>
                      </div>

                      {/* Site info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{site.name}</div>
                        <div className="text-xs text-slate-500 truncate">{site.description}</div>
                      </div>

                      {/* Response time */}
                      {site.response_time_ms && (
                        <div className={`text-xs ${statusStyle.text}`}>
                          {site.response_time_ms}ms
                        </div>
                      )}

                      {/* Arrow */}
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Links Grid - All Sites */}
      {sites && sites.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Quick Links</h4>
          <div className="flex flex-wrap gap-2">
            {sites.map(site => {
              const statusStyle = STATUS_STYLES[site.status] || STATUS_STYLES.unknown

              return (
                <a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} hover:shadow-sm transition-shadow`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                  {site.name}
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {health?.total || 0} sites monitored
          </span>
          <button
            onClick={refetch}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

export default EcosystemMap
