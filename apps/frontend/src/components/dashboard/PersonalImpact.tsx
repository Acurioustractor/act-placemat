import { useState, useEffect } from 'react'

interface ImpactMetric {
  id: string
  value: number
  label: string
  icon: string
  change?: number // positive = increase
  period: string
}

interface ImpactData {
  metrics: ImpactMetric[]
  quote: string
  yearlyHighlights: string[]
}

// Mock data - would come from API based on user
const mockImpact: ImpactData = {
  metrics: [
    {
      id: 'storytellers',
      value: 12,
      label: 'Storytellers you helped share their voice',
      icon: '🎤',
      change: 3,
      period: 'this year',
    },
    {
      id: 'projects',
      value: 3,
      label: 'Projects moved toward community ownership',
      icon: '🌱',
      change: 1,
      period: 'this year',
    },
    {
      id: 'hours',
      value: 45,
      label: 'Hours of community connection facilitated',
      icon: '🤝',
      change: 12,
      period: 'this year',
    },
    {
      id: 'stories',
      value: 28,
      label: 'Stories captured and preserved',
      icon: '📖',
      change: 7,
      period: 'this year',
    },
  ],
  quote: 'Your work matters. Communities are changing because you showed up.',
  yearlyHighlights: [
    'Helped The Harvest CSA reach 80% community ownership',
    'Captured Uncle Allan\'s story before his passing',
    'Facilitated 3 Elder review sessions',
  ],
}

interface PersonalImpactProps {
  compact?: boolean
}

export function PersonalImpact({ compact = false }: PersonalImpactProps) {
  const [impact, setImpact] = useState<ImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with API call
    const fetchImpact = async () => {
      await new Promise(resolve => setTimeout(resolve, 400))
      setImpact(mockImpact)
      setLoading(false)
    }
    fetchImpact()
  }, [])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!impact) return null

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span>💫</span>
          Your Impact
        </h3>

        <div className="space-y-3">
          {impact.metrics.slice(0, 3).map(metric => (
            <div key={metric.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{metric.icon}</span>
                <span className="text-sm text-slate-600">{metric.label.split(' ').slice(0, 2).join(' ')}</span>
              </div>
              <span className="font-semibold text-slate-900">{metric.value}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 pt-3 border-t border-emerald-100 text-xs text-slate-500 italic">
          "{impact.quote}"
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <span className="text-xl">💫</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Impact</h2>
            <p className="text-sm text-slate-500">The difference you've made this year</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {impact.metrics.map(metric => (
            <div
              key={metric.id}
              className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{metric.icon}</span>
                {metric.change && metric.change > 0 && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    +{metric.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</p>
              <p className="text-xs text-slate-500 leading-tight">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights */}
      <div className="px-6 pb-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Highlights this year:</h4>
        <ul className="space-y-1.5">
          {impact.yearlyHighlights.map((highlight, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-emerald-500 mt-0.5">•</span>
              {highlight}
            </li>
          ))}
        </ul>
      </div>

      {/* Quote */}
      <div className="px-6 py-4 bg-white/50 border-t border-white/50">
        <p className="text-sm text-slate-600 italic text-center">
          "{impact.quote}"
        </p>
      </div>
    </div>
  )
}

// Minimal inline version for headers
export function ImpactBadge() {
  const total = mockImpact.metrics.reduce((sum, m) => sum + (m.change || 0), 0)

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
      <span className="text-sm">💫</span>
      <span className="text-xs font-medium text-emerald-700">
        +{total} impact this year
      </span>
    </div>
  )
}
