import { useState, useEffect } from 'react'
import type { MorningBrief, TasksResponse, CommandCenterOverview, RelationshipsResponse } from './types'
import { Icons, priorityColors } from './types'
import { SkeletonBrief, SkeletonTask, SkeletonCard } from './Skeletons'

export function DailyView() {
  const [morningBrief, setMorningBrief] = useState<MorningBrief | null>(null)
  const [tasks, setTasks] = useState<TasksResponse | null>(null)
  const [overview, setOverview] = useState<CommandCenterOverview | null>(null)
  const [relationships, setRelationships] = useState<RelationshipsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/command-center/morning-brief')
        .then(res => res.json())
        .then(data => data.success ? data.data : null)
        .catch(() => null),
      fetch('/api/v1/command-center/tasks')
        .then(res => res.json())
        .then(data => data.success ? data.data : null)
        .catch(() => null),
      fetch('/api/v1/command-center/overview')
        .then(res => res.json())
        .then(data => data.success ? data.data : null)
        .catch(() => null),
      fetch('/api/v1/command-center/relationships')
        .then(res => res.json())
        .then(data => data.success ? data.data : null)
        .catch(() => null),
    ]).then(([brief, tasksData, overviewData, relationshipsData]) => {
      setMorningBrief(brief)
      setTasks(tasksData)
      setOverview(overviewData)
      setRelationships(relationshipsData)
      setLoading(false)
    })
  }, [])

  const today = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-6">
      {/* Morning Brief - Hero Section */}
      {loading ? (
        <SkeletonBrief />
      ) : morningBrief ? (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 rounded-xl p-6 border border-emerald-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{morningBrief.greeting}</h1>
              <p className="text-sm text-slate-500">{today}</p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed mt-4 max-w-3xl"
            dangerouslySetInnerHTML={{ __html: morningBrief.summary.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') }}
          />

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-5">
            {morningBrief.quickActions.map((action, idx) => (
              <button
                key={idx}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <span className="text-lg">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Tasks and Story Opportunities */}
        <div className="col-span-2 space-y-6">
          {/* What Needs Your Attention */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                What Needs Your Attention
                {tasks && tasks.urgentCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    {tasks.urgentCount} urgent
                  </span>
                )}
              </h2>
              {tasks && (
                <span className="text-sm text-slate-500">{tasks.totalTasks} items</span>
              )}
            </div>

            <div className="space-y-3">
              {loading ? (
                <>
                  <SkeletonTask />
                  <SkeletonTask />
                  <SkeletonTask />
                </>
              ) : tasks?.tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      task.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                      task.priority === 'high' ? 'bg-orange-50 text-orange-600' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {Icons.stories}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-900">{task.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
                      {task.dueDate && (
                        <p className="text-xs text-slate-400 mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      Start
                    </button>
                  </div>
                </div>
              ))}

              {!loading && (!tasks || tasks.tasks.length === 0) && (
                <div className="p-8 bg-white border border-slate-100 rounded-xl text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                    {Icons.check}
                  </div>
                  <p className="text-slate-600">All caught up! No urgent tasks right now.</p>
                </div>
              )}
            </div>
          </section>

          {/* Story Opportunities */}
          {overview?.storyGaps && overview.storyGaps.urgentCount > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  Story Opportunities
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                    {overview.storyGaps.urgentCount} urgent
                  </span>
                </h2>
                <span className="text-sm text-slate-500">{overview.storyGaps.totalGaps} total gaps</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {overview.storyGaps.urgent.slice(0, 4).map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-slate-100 rounded-xl hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                        {Icons.stories}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900">{gap.project}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{gap.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {overview.storyGaps.totalGaps > 4 && (
                <button className="w-full mt-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 hover:border-slate-300">
                  View All {overview.storyGaps.totalGaps} Story Gaps
                </button>
              )}
            </section>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Art Ready (ALMA > 4.0) */}
          {loading ? (
            <SkeletonCard />
          ) : overview?.artOpportunities && overview.artOpportunities.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  {Icons.art}
                </div>
                <h3 className="font-semibold text-slate-900">Art Ready</h3>
                <span className="text-xs text-slate-500 ml-auto">ALMA &gt; 4.0</span>
              </div>
              <div className="space-y-2">
                {overview.artOpportunities.slice(0, 5).map((opp, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{opp.title}</p>
                      <p className="text-xs text-slate-500">{opp.type}</p>
                    </div>
                    <span className="text-sm font-semibold text-purple-600 tabular-nums">
                      {opp.score.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200 hover:border-purple-300">
                View Art Queue
              </button>
            </div>
          )}

          {/* Elder Review Pending */}
          {loading ? (
            <SkeletonCard />
          ) : overview?.elderReview && overview.elderReview.pending > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  {Icons.elder}
                </div>
                <h3 className="font-semibold text-slate-900">Elder Review</h3>
                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  {overview.elderReview.pending} pending
                </span>
              </div>
              <div className="space-y-2">
                {overview.elderReview.items.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200">
                Review Queue
              </button>
            </div>
          )}

          {/* Relationships */}
          {loading ? (
            <SkeletonCard />
          ) : relationships && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  {Icons.community}
                </div>
                <h3 className="font-semibold text-slate-900">Relationships</h3>
              </div>

              {relationships.needsAttention && relationships.needsAttention.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Needs attention</p>
                  <div className="space-y-2">
                    {relationships.needsAttention.slice(0, 3).map((contact, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                          {contact.name.charAt(0)}
                        </div>
                        <span className="flex-1 truncate text-slate-700">{contact.name}</span>
                        {contact.daysSince && (
                          <span className="text-xs text-slate-400">{contact.daysSince}d</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relationships.topContacts && relationships.topContacts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Strong this week</p>
                  <div className="space-y-2">
                    {relationships.topContacts.slice(0, 3).map((contact, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700">
                          {contact.name.charAt(0)}
                        </div>
                        <span className="flex-1 truncate text-slate-700">{contact.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Community Signals */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                {Icons.calendar}
              </div>
              <h3 className="font-semibold text-slate-900">Community Signals</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Monthly Dinner</span>
                <span className="text-slate-900 font-medium">12 RSVPs</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Harvest Markets</span>
                <span className="text-slate-900 font-medium">3 new vendors</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Workshop Interest</span>
                <span className="text-slate-900 font-medium">5 inquiries</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
