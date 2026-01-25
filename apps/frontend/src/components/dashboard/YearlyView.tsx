import { useState, useEffect } from 'react'
import type { CommandCenterOverview } from './types'
import { Icons } from './types'
import { SkeletonProgress, SkeletonCard, SkeletonReflection } from './Skeletons'
import { ReflectionPrompt } from './ReflectionPrompt'

interface YearlyStats {
  storiesTotal: number
  vignettesTotal: number
  projectsDocumented: number
  communityHandovers: number
  culturalProtocol: string
}

interface LineageNode {
  project: string
  spawned: string[]
  year: number
}

export function YearlyView() {
  const [overview, setOverview] = useState<CommandCenterOverview | null>(null)
  const [loading, setLoading] = useState(true)

  // Mock yearly data
  const yearlyStats: YearlyStats = {
    storiesTotal: 328,
    vignettesTotal: 31,
    projectsDocumented: 70,
    communityHandovers: 3,
    culturalProtocol: '100%',
  }

  // Project lineage - how projects influenced each other
  const lineage: LineageNode[] = [
    { project: 'ACT Farm', spawned: ['The Harvest CSA', "June's Patch", 'Black Cockatoo Valley'], year: 2019 },
    { project: 'Empathy Ledger', spawned: ['Story Sovereignty', 'Community Voice Vignettes'], year: 2021 },
    { project: 'JusticeHub', spawned: ['MMEIC Justice', 'Diagrama', 'Youth Voice'], year: 2022 },
    { project: 'The Harvest', spawned: ['Goods Marketplace', 'Custodian Economy'], year: 2023 },
  ]

  useEffect(() => {
    fetch('/api/v1/command-center/overview')
      .then(res => res.json())
      .then(data => {
        if (data.success) setOverview(data.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* Year Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{currentYear}: Movement Progress</h1>
          <p className="text-slate-500">The legacy we're building</p>
        </div>
      </div>

      {/* The Legacy */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-8 text-white">
        <h2 className="text-xl font-semibold mb-6">The Legacy</h2>

        <div className="grid grid-cols-5 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-orange-400">{yearlyStats.storiesTotal}</p>
            <p className="text-sm text-slate-400 mt-1">Stories Captured</p>
            <p className="text-xs text-slate-500 mt-2">→ ?</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-purple-400">{yearlyStats.vignettesTotal}</p>
            <p className="text-sm text-slate-400 mt-1">Vignettes Created</p>
            <p className="text-xs text-slate-500 mt-2">→ ?</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-blue-400">{yearlyStats.projectsDocumented}</p>
            <p className="text-sm text-slate-400 mt-1">Projects Documented</p>
            <p className="text-xs text-slate-500 mt-2">→ ?</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-emerald-400">{yearlyStats.communityHandovers}</p>
            <p className="text-sm text-slate-400 mt-1">Community Handovers</p>
            <p className="text-xs text-slate-500 mt-2">→ ?</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-amber-400">{yearlyStats.culturalProtocol}</p>
            <p className="text-sm text-slate-400 mt-1">Protocol Maintained</p>
            <p className="text-xs text-emerald-500 mt-2">Always 100%</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700">
          <p className="text-slate-400 text-sm italic">
            "ACT is a philosophical movement disguised as a technology ecosystem."
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Lineage and Impact */}
        <div className="col-span-2 space-y-6">
          {/* The Question */}
          {loading ? (
            <SkeletonReflection />
          ) : (
            <ReflectionPrompt
              horizon="year"
              questions={[
                { id: 'ten-year', label: 'In 10 years, what change did ACT seed that\'s now self-sustaining?' },
              ]}
            />
          )}

          {/* Lineage Map */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                {Icons.shift}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Lineage Map</h2>
                <p className="text-sm text-slate-500">How projects influenced each other</p>
              </div>
            </div>

            <div className="space-y-6">
              {lineage.map((node, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline connector */}
                  {idx < lineage.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-slate-200" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Year node */}
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm flex-shrink-0 z-10">
                      {node.year.toString().slice(2)}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{node.project}</h3>
                      <p className="text-xs text-slate-500 mb-3">Established {node.year}</p>

                      <div className="flex flex-wrap gap-2">
                        {node.spawned.map((child, cidx) => (
                          <span
                            key={cidx}
                            className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg flex items-center gap-2"
                          >
                            <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                            </svg>
                            {child}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Movement has genealogy. Each project seeds the next generation.
              </p>
            </div>
          </div>

          {/* Art Archive Summary */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Art Archive</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-700">31</p>
                <p className="text-sm text-purple-600">Vignettes</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <p className="text-2xl font-bold text-orange-700">6</p>
                <p className="text-sm text-orange-600">Categories</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-700">239</p>
                <p className="text-sm text-blue-600">Storytellers</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Community Voice</p>
                <p className="text-xs text-slate-500">31 vignettes</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Origin Stories</p>
                <p className="text-xs text-slate-500">6 vignettes</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Impact Stories</p>
                <p className="text-xs text-slate-500">8 vignettes</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Practice Stories</p>
                <p className="text-xs text-slate-500">4 vignettes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stats and Protocol */}
        <div className="space-y-4">
          {/* Story Sovereignty Status */}
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                {Icons.elder}
              </div>
              <h3 className="font-semibold text-slate-900">Story Sovereignty</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Stories with consent</span>
                <span className="font-medium text-emerald-600">100%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Stories returned to tellers</span>
                <span className="font-medium text-emerald-600">328</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">OCAP violations</span>
                <span className="font-medium text-emerald-600">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Elder reviews honored</span>
                <span className="font-medium text-emerald-600">100%</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-100">
              <p className="text-xs text-amber-700 font-medium">
                Cultural sovereignty is sacred. Always 100%.
              </p>
            </div>
          </div>

          {/* Beautiful Obsolescence Yearly */}
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">Beautiful Obsolescence</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Community ownership</span>
                    <span className="font-medium text-slate-900">3 / 70</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(3 / 70) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-700 font-medium mb-2">Self-sustaining projects:</p>
                  <div className="space-y-1">
                    <p className="text-sm text-emerald-600">✓ The Harvest CSA</p>
                    <p className="text-sm text-emerald-600">✓ Goods Marketplace</p>
                    <p className="text-sm text-emerald-600">✓ Mingaminga Rangers</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-2">
                  Success = ACT becoming unnecessary. These projects now run themselves.
                </p>
              </div>
            </div>
          )}

          {/* ALMA Principles */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-4">ALMA Principles</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span className="text-slate-600">Signals, not scores</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span className="text-slate-600">Observe systems, not people</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span className="text-slate-600">Community Authority highest weight</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span className="text-slate-600">Humans decide, ALMA informs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
