import { useState, useEffect } from 'react'

interface MetricItem {
  id: string
  label: string
  value: string | number
  change?: number // percentage change
  icon?: React.ReactNode
}

// Mock data - would come from API
const mockMetrics: MetricItem[] = [
  { id: 'stories', label: 'Stories', value: 328, change: 3.2 },
  { id: 'vignettes', label: 'Vignettes', value: 31, change: 5.0 },
  { id: 'projects', label: 'Projects', value: 70, change: 1.4 },
  { id: 'storytellers', label: 'Storytellers', value: 239, change: 2.1 },
  { id: 'community', label: 'Community %', value: '42%', change: 8.5 },
]

interface MetricsTickerProps {
  metrics?: MetricItem[]
}

export function MetricsTicker({ metrics = mockMetrics }: MetricsTickerProps) {
  return (
    <div className="flex items-center gap-6 px-6 py-4 bg-white border-b border-slate-100 overflow-x-auto">
      {metrics.map((metric, idx) => (
        <div key={metric.id} className="flex items-center gap-4">
          {/* Metric */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">{metric.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-slate-900">{metric.value}</span>
                {metric.change !== undefined && (
                  <span className={`text-xs font-medium ${metric.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {metric.change >= 0 ? '+' : ''}{metric.change}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Divider (not after last item) */}
          {idx < metrics.length - 1 && (
            <div className="h-10 w-px bg-slate-200" />
          )}
        </div>
      ))}
    </div>
  )
}

// Compact version for smaller spaces
export function MetricsCompact({ metrics = mockMetrics.slice(0, 3) }: MetricsTickerProps) {
  return (
    <div className="flex items-center gap-4">
      {metrics.map((metric) => (
        <div key={metric.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
          <span className="text-sm font-medium text-slate-900">{metric.value}</span>
          <span className="text-xs text-slate-500">{metric.label}</span>
          {metric.change !== undefined && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              metric.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {metric.change >= 0 ? '+' : ''}{metric.change}%
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
