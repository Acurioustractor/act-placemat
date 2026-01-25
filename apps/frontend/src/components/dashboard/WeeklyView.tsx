import { useState, useEffect } from 'react'
import type { CommandCenterOverview } from './types'
import { Icons } from './types'
import { SkeletonProgress, SkeletonCard, SkeletonReflection } from './Skeletons'
import { ReflectionPrompt } from './ReflectionPrompt'

interface WeeklyStats {
  storiesCaptured: number
  artCreated: number
  artShared: number
  activeRelationships: number
  relationshipsNeedingCare: number
  netIncome: number
}

interface ProjectHealth {
  readyForHandover: number
  buildingCapacity: number
  actDependent: number
}

export function WeeklyView() {
  const [overview, setOverview] = useState<CommandCenterOverview | null>(null)
  const [loading, setLoading] = useState(true)

  // Mock weekly stats - in production these would come from API
  const weeklyStats: WeeklyStats = {
    storiesCaptured: 4,
    artCreated: 2,
    artShared: 1200,
    activeRelationships: 23,
    relationshipsNeedingCare: 8,
    netIncome: 22000,
  }

  const projectHealth: ProjectHealth = {
    readyForHandover: 3,
    buildingCapacity: 12,
    actDependent: 55,
  }

  useEffect(() => {
    fetch('/api/v1/command-center/overview')
      .then(res => res.json())
      .then(data => {
        if (data.success) setOverview(data.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const weekRange = () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() + 1) // Monday
    const end = new Date(start)
    end.setDate(start.getDate() + 6) // Sunday

    return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`
  }

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Week in Review</h1>
          <p className="text-slate-500">{weekRange()}</p>
        </div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center p-4 bg-white rounded-xl border border-slate-100 animate-pulse">
              <div className="h-8 w-16 bg-slate-200 rounded mx-auto mb-2" />
              <div className="h-3 w-20 bg-slate-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-5 bg-white rounded-xl border border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                {Icons.stories}
              </div>
              <p className="text-2xl font-bold text-slate-900">{weeklyStats.storiesCaptured}</p>
            </div>
            <p className="text-sm text-slate-500">Stories Captured</p>
            <p className="text-xs text-slate-400 mt-1">{overview?.storyGaps.totalGaps} gaps remain</p>
          </div>

          <div className="text-center p-5 bg-white rounded-xl border border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                {Icons.art}
              </div>
              <p className="text-2xl font-bold text-slate-900">{weeklyStats.artCreated}</p>
            </div>
            <p className="text-sm text-slate-500">Art Created</p>
            <p className="text-xs text-slate-400 mt-1">{weeklyStats.artShared.toLocaleString()} shared</p>
          </div>

          <div className="text-center p-5 bg-white rounded-xl border border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                {Icons.community}
              </div>
              <p className="text-2xl font-bold text-slate-900">{weeklyStats.activeRelationships}</p>
            </div>
            <p className="text-sm text-slate-500">Active Relationships</p>
            <p className="text-xs text-slate-400 mt-1">{weeklyStats.relationshipsNeedingCare} need care</p>
          </div>

          <div className="text-center p-5 bg-white rounded-xl border border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                {Icons.money}
              </div>
              <p className="text-2xl font-bold text-slate-900">+${(weeklyStats.netIncome / 1000).toFixed(0)}K</p>
            </div>
            <p className="text-sm text-slate-500">Net Income</p>
            <p className="text-xs text-emerald-500 mt-1">Sustainable</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Story Pipeline */}
        <div className="col-span-2 space-y-6">
          {loading ? (
            <SkeletonProgress />
          ) : (
            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Story Pipeline</h2>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-slate-600">Captured</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-orange-500 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min((weeklyStats.storiesCaptured / 10) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-slate-900">
                    {weeklyStats.storiesCaptured} new
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-slate-600">Art-Ready</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-purple-500 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(((overview?.artOpportunities.length || 0) / 10) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-slate-900">
                    {overview?.artOpportunities.length || 0}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-slate-600">Gaps</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-red-400 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(((overview?.storyGaps.totalGaps || 0) / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-slate-900">
                    {overview?.storyGaps.totalGaps || 0}
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-4">
                {overview?.storyGaps.urgentCount || 0} urgent gaps need stories this week
              </p>
            </div>
          )}

          {/* Beautiful Obsolescence */}
          {loading ? (
            <SkeletonProgress />
          ) : (
            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Beautiful Obsolescence</h2>
                <span className="text-xs text-slate-500 ml-auto">Community ownership readiness</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-2xl font-bold text-emerald-700">{projectHealth.readyForHandover}</p>
                  <p className="text-xs text-emerald-600 mt-1">Ready for handover</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <p className="text-2xl font-bold text-yellow-700">{projectHealth.buildingCapacity}</p>
                  <p className="text-xs text-yellow-600 mt-1">Building capacity</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-2xl font-bold text-slate-700">{projectHealth.actDependent}</p>
                  <p className="text-xs text-slate-500 mt-1">ACT-dependent</p>
                </div>
              </div>

              {/* Example projects ready for handover */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Ready for community ownership:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-full">The Harvest CSA</span>
                  <span className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-full">Goods Marketplace</span>
                  <span className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-full">Mingaminga Rangers</span>
                </div>
              </div>
            </div>
          )}

          {/* Community Energy */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Community Energy</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                  {Icons.calendar}
                </div>
                <div>
                  <p className="font-medium text-slate-900">Monthly Dinner</p>
                  <p className="text-sm text-slate-500">15 attended &bull; Theme: "What makes a good life?"</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                  {Icons.community}
                </div>
                <div>
                  <p className="font-medium text-slate-900">Harvest Markets</p>
                  <p className="text-sm text-slate-500">45 visitors &bull; 12 repeat &bull; 3 new vendors</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  {Icons.stories}
                </div>
                <div>
                  <p className="font-medium text-slate-900">New Inquiries</p>
                  <p className="text-sm text-slate-500">6 people wanting to connect</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Weekly Reflection */}
        <div className="space-y-4">
          {loading ? (
            <SkeletonReflection />
          ) : (
            <ReflectionPrompt
              horizon="week"
              questions={[
                { id: 'story-moved', label: 'What story moved people this week?' },
                { id: 'relationship-deepened', label: 'What relationship deepened?' },
              ]}
            />
          )}

          {/* Art Highlights */}
          {loading ? (
            <SkeletonCard />
          ) : overview?.artOpportunities && overview.artOpportunities.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">Art Ready This Week</h3>
              <div className="space-y-2">
                {overview.artOpportunities.slice(0, 4).map((opp, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{opp.title}</p>
                      <p className="text-xs text-slate-500">{opp.type}</p>
                    </div>
                    <span className="text-sm font-semibold text-purple-600">{opp.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Stats */}
          {loading ? (
            <SkeletonCard />
          ) : overview?.stats && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">ACT Intelligence</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Stories</span>
                  <span className="font-medium text-slate-900">{overview.stats.stories}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Storytellers</span>
                  <span className="font-medium text-slate-900">{overview.stats.storytellers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Projects</span>
                  <span className="font-medium text-slate-900">{overview.stats.projects}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Vignettes</span>
                  <span className="font-medium text-slate-900">{overview.stats.vignettes}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
