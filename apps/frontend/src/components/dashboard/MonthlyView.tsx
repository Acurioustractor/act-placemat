import { useState, useEffect } from 'react'
import type { CommandCenterOverview } from './types'
import { Icons } from './types'
import { SkeletonProgress, SkeletonCard, SkeletonReflection } from './Skeletons'
import { ReflectionPrompt } from './ReflectionPrompt'
import { TheShift } from './TheShift'

interface MonthlyStats {
  totalStories: number
  storiesThisMonth: number
  totalVignettes: number
  vignettesThisMonth: number
  totalProjects: number
  storytellers: number
}

interface ArtHighlight {
  title: string
  views: number
  shares: number
  description: string
}

interface ObsolescenceProject {
  name: string
  status: 'ready' | 'building' | 'dependent'
}

export function MonthlyView() {
  const [overview, setOverview] = useState<CommandCenterOverview | null>(null)
  const [loading, setLoading] = useState(true)

  // Mock monthly data - in production these would come from API
  const monthlyStats: MonthlyStats = {
    totalStories: 328,
    storiesThisMonth: 12,
    totalVignettes: 31,
    vignettesThisMonth: 5,
    totalProjects: 70,
    storytellers: 239,
  }

  const artHighlights: ArtHighlight[] = [
    { title: 'Orange Sky Origins', views: 2400, shares: 47, description: 'Shared widely on social media' },
    { title: 'Uncle Allan Palm Island', views: 890, shares: 23, description: 'Shared by Elders council' },
    { title: 'Community Innovation', views: 450, shares: 12, description: 'Cited in grant application' },
  ]

  const obsolescenceProjects: ObsolescenceProject[] = [
    { name: 'The Harvest CSA', status: 'ready' },
    { name: 'Goods Marketplace', status: 'ready' },
    { name: 'Mingaminga Rangers', status: 'ready' },
    { name: 'June\'s Patch', status: 'building' },
    { name: 'DadLab25', status: 'building' },
    { name: 'Black Cockatoo Valley', status: 'building' },
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

  const currentMonth = new Date().toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{currentMonth}</h1>
          <p className="text-slate-500">Movement Progress</p>
        </div>
      </div>

      {/* The Shift Progress */}
      {loading ? (
        <SkeletonProgress />
      ) : (
        <TheShift progress={40} />
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              {Icons.stories}
            </div>
            <div>
              <p className="text-sm text-slate-500">Stories</p>
              <p className="text-2xl font-bold text-slate-900">{monthlyStats.totalStories}</p>
            </div>
          </div>
          <p className="text-sm text-emerald-600">+{monthlyStats.storiesThisMonth} this month</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              {Icons.art}
            </div>
            <div>
              <p className="text-sm text-slate-500">Vignettes</p>
              <p className="text-2xl font-bold text-slate-900">{monthlyStats.totalVignettes}</p>
            </div>
          </div>
          <p className="text-sm text-emerald-600">+{monthlyStats.vignettesThisMonth} this month</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              {Icons.community}
            </div>
            <div>
              <p className="text-sm text-slate-500">Storytellers</p>
              <p className="text-2xl font-bold text-slate-900">{monthlyStats.storytellers}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">{monthlyStats.totalProjects} projects</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Art and Obsolescence */}
        <div className="col-span-2 space-y-6">
          {/* Art That Moved People */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Art That Moved People This Month</h2>

            <div className="space-y-4">
              {artHighlights.map((art, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 text-lg font-bold">
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{art.title}</h3>
                    <p className="text-sm text-slate-500">{art.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>{art.views.toLocaleString()} views</span>
                      <span>{art.shares} shares</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Beautiful Obsolescence Progress */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Beautiful Obsolescence Progress</h2>
              <span className="text-xs text-slate-500 ml-auto">Projects approaching community ownership</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-3xl font-bold text-emerald-700">
                  {obsolescenceProjects.filter(p => p.status === 'ready').length}
                </p>
                <p className="text-sm text-emerald-600 mt-1">Ready for community ownership</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                <p className="text-3xl font-bold text-yellow-700">
                  {obsolescenceProjects.filter(p => p.status === 'building').length}
                </p>
                <p className="text-sm text-yellow-600 mt-1">Building capacity</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-3xl font-bold text-slate-700">55</p>
                <p className="text-sm text-slate-500 mt-1">Still ACT-dependent</p>
              </div>
            </div>

            {/* Project Lists */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-emerald-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ready for handover
                </p>
                <div className="space-y-2">
                  {obsolescenceProjects.filter(p => p.status === 'ready').map((proj, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {proj.name}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Building capacity
                </p>
                <div className="space-y-2">
                  {obsolescenceProjects.filter(p => p.status === 'building').map((proj, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {proj.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Reflection and Stats */}
        <div className="space-y-4">
          {loading ? (
            <SkeletonReflection />
          ) : (
            <ReflectionPrompt
              horizon="month"
              questions={[
                { id: 'truth-told', label: 'What truth did we tell that no one else was telling?' },
                { id: 'community-found', label: 'What community found itself through our work?' },
              ]}
            />
          )}

          {/* Cultural Protocol Status */}
          {loading ? (
            <SkeletonCard />
          ) : overview?.elderReview && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
              <h3 className="font-semibold text-slate-900 mb-4">Cultural Protocol Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Elder reviews pending</span>
                  <span className="font-medium text-amber-700">{overview.elderReview.pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Reviews completed (month)</span>
                  <span className="font-medium text-emerald-600">12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Protocol compliance</span>
                  <span className="font-medium text-emerald-600">100%</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-amber-100">
                <p className="text-xs text-slate-500">
                  All sacred content properly reviewed. No violations this month.
                </p>
              </div>
            </div>
          )}

          {/* Story Coverage */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-4">Story Coverage</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Projects with stories</span>
                  <span className="font-medium text-slate-900">14 / {monthlyStats.totalProjects}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${(14 / monthlyStats.totalProjects) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Projects with vignettes</span>
                  <span className="font-medium text-slate-900">8 / {monthlyStats.totalProjects}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(8 / monthlyStats.totalProjects) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
