import type { GrantDependencyMetrics } from '../types/project'

interface GrantDependencyIndicatorProps {
  metrics: GrantDependencyMetrics
  compact?: boolean
}

export function GrantDependencyIndicator({ metrics, compact = false }: GrantDependencyIndicatorProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const marketPercentage = 100 - metrics.grantDependencyPercentage

  // Determine status based on grant dependency
  const getStatus = () => {
    if (metrics.grantDependencyPercentage >= 80) return {
      label: 'GRANT-DEPENDENT',
      color: 'clay',
      message: 'Heavy reliance on philanthropic funding'
    }
    if (metrics.grantDependencyPercentage >= 60) return {
      label: 'TRANSITIONING',
      color: 'ocean',
      message: 'Moving toward market economics'
    }
    if (metrics.grantDependencyPercentage >= 30) return {
      label: 'MARKET-EMERGING',
      color: 'brand',
      message: 'Strong market revenue foundation'
    }
    return {
      label: 'MARKET-VIABLE',
      color: 'brand',
      message: 'Majority market-based economics'
    }
  }

  const status = getStatus()

  if (compact) {
    return (
      <div className="rounded-lg border border-clay-200 bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-clay-600">Grant Dependency</span>
          <span className={`rounded-full bg-${status.color}-100 px-2 py-0.5 text-xs font-semibold text-${status.color}-800`}>
            {Math.round(metrics.grantDependencyPercentage)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-clay-100">
          <div
            className={`h-full rounded-full bg-${status.color}-500 transition-all`}
            style={{ width: `${marketPercentage}%` }}
          />
        </div>
        <p className="text-xs text-clay-500 mt-1">
          {Math.round(marketPercentage)}% market revenue
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-clay-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-clay-900">Path to Market Viability</h3>
          <p className="text-sm text-clay-600 mt-1">
            Moving from grant dependency to sustainable market economics
          </p>
        </div>
        <span className={`rounded-full bg-${status.color}-600 px-3 py-1 text-xs font-semibold text-white`}>
          {status.label}
        </span>
      </div>

      {/* Current State */}
      <div className="mb-6 rounded-lg border-2 border-clay-200 bg-clay-50 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">
              Grant Funding
            </p>
            <p className="text-2xl font-bold text-clay-700 mt-1">
              {formatCurrency(metrics.grantFunding)}
            </p>
            <p className="text-xs text-clay-600 mt-1">
              {Math.round(metrics.grantDependencyPercentage)}% of revenue
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-brand-600 uppercase tracking-wider">
              Market Revenue
            </p>
            <p className="text-2xl font-bold text-brand-700 mt-1">
              {formatCurrency(metrics.marketRevenue)}
            </p>
            <p className="text-xs text-brand-700 mt-1">
              {Math.round(marketPercentage)}% of revenue
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-clay-900 mt-1">
              {formatCurrency(metrics.totalRevenue)}
            </p>
            <p className="text-xs text-clay-600 mt-1">Combined income</p>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-clay-700">Current Revenue Mix</span>
          <span className="text-sm text-clay-600">{status.message}</span>
        </div>
        <div className="relative h-8 w-full overflow-hidden rounded-full bg-clay-100">
          <div
            className="absolute left-0 top-0 h-full bg-clay-400 transition-all"
            style={{ width: `${metrics.grantDependencyPercentage}%` }}
          >
            <div className="flex h-full items-center justify-center text-xs font-semibold text-white">
              {Math.round(metrics.grantDependencyPercentage) > 15 && (
                <span>{Math.round(metrics.grantDependencyPercentage)}% Grants</span>
              )}
            </div>
          </div>
          <div
            className="absolute right-0 top-0 h-full bg-brand-500 transition-all"
            style={{ width: `${marketPercentage}%` }}
          >
            <div className="flex h-full items-center justify-center text-xs font-semibold text-white">
              {Math.round(marketPercentage) > 15 && (
                <span>{Math.round(marketPercentage)}% Market</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Trend */}
      {metrics.historicalData && metrics.historicalData.length > 0 && (
        <div className="mb-6 rounded-lg border border-ocean-100 bg-ocean-50/30 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-clay-700 mb-3">
            Historical Trend
          </h4>
          <div className="space-y-2">
            {metrics.historicalData.map((year) => (
              <div key={year.year} className="flex items-center gap-3">
                <span className="text-sm font-medium text-clay-700 w-12">{year.year}</span>
                <div className="flex-1">
                  <div className="relative h-6 w-full overflow-hidden rounded-full bg-clay-100">
                    <div
                      className="absolute left-0 top-0 h-full bg-clay-400 transition-all"
                      style={{ width: `${year.grantPercentage}%` }}
                    />
                    <div
                      className="absolute right-0 top-0 h-full bg-brand-400 transition-all"
                      style={{ width: `${year.marketPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right text-xs text-clay-600 w-24">
                  <span className="font-medium">{Math.round(year.marketPercentage)}%</span> market
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-clay-400" />
              <span className="text-clay-700">Grants</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-brand-400" />
              <span className="text-brand-700">Market</span>
            </div>
          </div>
        </div>
      )}

      {/* Future Target */}
      {metrics.targetGrantIndependenceDate && (
        <div className="mb-6 rounded-lg border-2 border-brand-200 bg-brand-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🎯</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-brand-900 uppercase tracking-wider">
                Target State
              </h4>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-clay-600">Target Date</p>
                  <p className="text-lg font-bold text-brand-700 mt-1">
                    {new Date(metrics.targetGrantIndependenceDate).toLocaleDateString('en-AU', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-clay-600">Target Grant Dependency</p>
                  <p className="text-lg font-bold text-brand-700 mt-1">
                    {metrics.targetGrantPercentage}% or less
                  </p>
                </div>
              </div>
              <p className="text-sm text-clay-700 mt-3 leading-relaxed">
                By this date, the project aims to operate primarily on market revenue with minimal grant dependency,
                demonstrating sustainable economics while maintaining social impact.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Social Impact Comparison */}
      {metrics.socialImpactPerGrantDollar && metrics.socialImpactPerMarketDollar && (
        <div className="rounded-lg border border-ocean-100 bg-white p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-clay-700 mb-3">
            Social Impact per Dollar
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-clay-50 p-3">
              <p className="text-xs text-clay-600">Per Grant Dollar</p>
              <p className="text-2xl font-bold text-clay-700 mt-1">
                {metrics.socialImpactPerGrantDollar.toFixed(2)}x
              </p>
              <p className="text-xs text-clay-600 mt-1">impact multiplier</p>
            </div>
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-700">Per Market Dollar</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">
                {metrics.socialImpactPerMarketDollar.toFixed(2)}x
              </p>
              <p className="text-xs text-brand-700 mt-1">impact multiplier</p>
            </div>
          </div>
          <p className="text-xs text-clay-600 mt-3 leading-relaxed">
            Market-based revenue often creates even greater social impact per dollar because it's tied to
            genuine value exchange and community ownership, not external philanthropic priorities.
          </p>
        </div>
      )}
    </div>
  )
}
