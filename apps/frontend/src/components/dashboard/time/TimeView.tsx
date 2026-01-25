/**
 * TimeView - Unified time-based view component
 *
 * Consolidates DailyView, WeeklyView, MonthlyView, YearlyView into a single
 * component with configurable time horizons.
 *
 * Features:
 * - Configurable time horizon (day/week/month/year)
 * - Consistent data fetching pattern
 * - View-specific content rendering
 * - Shared layout and styling
 */

import { useState, useEffect, useMemo } from 'react'
import type {
  TimeHorizon,
  TimeViewConfig,
  CommandCenterOverview,
  MorningBrief,
  TasksResponse,
  RelationshipsResponse,
  ReflectionQuestion,
  TIME_VIEWS,
} from './types'
import { TIME_VIEWS } from './types'

// Import shared components (using inline fallbacks if not available)
import { EmptyState } from '../shared/EmptyState'
import { StatCard, CompactStatCard } from '../shared/StatCard'

interface TimeViewProps {
  horizon: TimeHorizon
  onHorizonChange?: (horizon: TimeHorizon) => void
}

// Map horizon to view configuration
const getViewConfig = (horizon: TimeHorizon): TimeViewConfig => {
  return TIME_VIEWS.find(v => v.horizon === horizon) || TIME_VIEWS[0]
}

export function TimeView({ horizon, onHorizonChange }: TimeViewProps) {
  const viewConfig = getViewConfig(horizon)
  const [data, setData] = useState<{
    morningBrief: MorningBrief | null
    tasks: TasksResponse | null
    overview: CommandCenterOverview | null
    relationships: RelationshipsResponse | null
  }>({
    morningBrief: null,
    tasks: null,
    overview: null,
    relationships: null,
  })
  const [loading, setLoading] = useState(true)

  // Fetch all data
  useEffect(() => {
    setLoading(true)
    Promise.all([
      horizon === 'day'
        ? fetch('/api/v1/command-center/morning-brief')
            .then(res => res.json())
            .then(data => data.success ? data.data : null)
            .catch(() => null)
        : Promise.resolve(null),
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
      setData({
        morningBrief: brief,
        tasks: tasksData,
        overview: overviewData,
        relationships: relationshipsData,
      })
      setLoading(false)
    })
  }, [horizon])

  // Render based on horizon
  const renderContent = () => {
    switch (horizon) {
      case 'day':
        return <DayViewContent data={data} loading={loading} />
      case 'week':
        return <WeekViewContent data={data} loading={loading} />
      case 'month':
        return <MonthViewContent data={data} loading={loading} />
      case 'year':
        return <YearViewContent data={data} loading={loading} />
      default:
        return <DayViewContent data={data} loading={loading} />
    }
  }

  const dateLabel = useMemo(() => {
    const now = new Date()
    switch (horizon) {
      case 'day':
        return now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
      case 'week':
        const start = new Date(now)
        start.setDate(now.getDate() - now.getDay() + 1)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`
      case 'month':
        return now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
      case 'year':
        return `${now.getFullYear()}: Movement Progress`
      default:
        return ''
    }
  }, [horizon])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{viewConfig.label} View</h1>
          <p className="text-slate-500">{dateLabel}</p>
        </div>

        {/* View Switcher */}
        <div style={viewSwitcherStyle}>
          {TIME_VIEWS.map(view => (
            <button
              key={view.horizon}
              onClick={() => onHorizonChange?.(view.horizon)}
              style={{
                ...viewButtonStyle,
                ...(horizon === view.horizon ? activeViewButtonStyle : {}),
              }}
            >
              <span>{view.icon}</span>
              <span>{view.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* View-specific content */}
      {renderContent()}
    </div>
  )
}

// ============================================
// Day View Content
// ============================================

function DayViewContent({
  data,
  loading,
}: {
  data: {
    morningBrief: MorningBrief | null
    tasks: TasksResponse | null
    overview: CommandCenterOverview | null
    relationships: RelationshipsResponse | null
  }
  loading: boolean
}) {
  const { morningBrief, tasks, overview, relationships } = data

  if (loading) {
    return <div style={loadingStyle}><div style={spinnerStyle} /><p>Loading daily briefing...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Morning Brief */}
      {morningBrief && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 rounded-xl p-6 border border-emerald-100">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{morningBrief.greeting}</h1>
          <p
            className="text-slate-600 leading-relaxed mt-4 max-w-3xl"
            dangerouslySetInnerHTML={{
              __html: morningBrief.summary.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="text-slate-900">$1</strong>'
              )
            }}
          />
          <div className="flex flex-wrap gap-2 mt-5">
            {morningBrief.quickActions.map((action, idx) => (
              <button
                key={idx}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="text-lg">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                What Needs Your Attention
                {tasks && tasks.urgentCount > 0 && (
                  <span className="ml-2 px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    {tasks.urgentCount} urgent
                  </span>
                )}
              </h2>
              {tasks && <span className="text-sm text-slate-500">{tasks.totalTasks} items</span>}
            </div>

            <div className="space-y-3">
              {tasks?.tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {!loading && (!tasks || tasks.tasks.length === 0) && (
                <EmptyState
                  icon="✅"
                  title="All caught up!"
                  description="No urgent tasks right now."
                />
              )}
            </div>
          </section>

          {/* Story Opportunities */}
          {overview?.storyGaps && overview.storyGaps.urgentCount > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Story Opportunities
                <span className="ml-2 px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                  {overview.storyGaps.urgentCount} urgent
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {overview.storyGaps.urgent.slice(0, 4).map((gap, idx) => (
                  <div key={idx} className="p-4 bg-white border border-slate-100 rounded-xl">
                    <div className="font-medium text-slate-900">{gap.project}</div>
                    <p className="text-sm text-slate-500 mt-1">{gap.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Art Ready */}
          {overview?.artOpportunities && overview.artOpportunities.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">Art Ready</h3>
              <div className="space-y-2">
                {overview.artOpportunities.slice(0, 5).map((opp, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate flex-1">{opp.title}</span>
                    <span className="text-purple-600 font-medium ml-2">{opp.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {relationships && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">Relationships</h3>
              {relationships.needsAttention?.slice(0, 3).map((contact, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm py-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                    {contact.name.charAt(0)}
                  </div>
                  <span className="flex-1 truncate text-slate-700">{contact.name}</span>
                  {contact.days_since_contact && (
                    <span className="text-xs text-slate-400">{contact.days_since_contact}d</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Week View Content
// ============================================

function WeekViewContent({
  data,
  loading,
}: {
  data: {
    morningBrief: MorningBrief | null
    tasks: TasksResponse | null
    overview: CommandCenterOverview | null
    relationships: RelationshipsResponse | null
  }
  loading: boolean
}) {
  const { overview } = data

  const weeklyStats = {
    stories: 4,
    art: 2,
    relationships: 23,
    income: 22000,
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Stories Captured"
          value={weeklyStats.stories}
          icon="📖"
          color="orange"
          subValue="this week"
        />
        <StatCard
          label="Art Created"
          value={weeklyStats.art}
          icon="🎨"
          color="violet"
          subValue="published"
        />
        <StatCard
          label="Active Relationships"
          value={weeklyStats.relationships}
          icon="👥"
          color="blue"
        />
        <StatCard
          label="Net Income"
          value={`+$${(weeklyStats.income / 1000).toFixed(0)}K`}
          icon="💰"
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Story Pipeline */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Story Pipeline</h2>
            <div className="space-y-4">
              <ProgressRow label="Captured" value={weeklyStats.stories} max={10} color="#f59e0b" />
              <ProgressRow label="Art-Ready" value={overview?.artOpportunities?.length || 0} max={10} color="#8b5cf6" />
              <ProgressRow
                label="Gaps"
                value={overview?.storyGaps?.totalGaps || 0}
                max={100}
                color="#ef4444"
              />
            </div>
          </div>

          {/* Community Energy */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Community Energy</h2>
            <div className="space-y-4">
              <EnergyItem icon="🍽️" title="Monthly Dinner" subtitle="15 attended" />
              <EnergyItem icon="🏪" title="Harvest Markets" subtitle="45 visitors, 3 new vendors" />
              <EnergyItem icon="💬" title="New Inquiries" subtitle="6 people wanting to connect" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ReflectionCard horizon="week" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Month View Content
// ============================================

function MonthViewContent({
  data,
  loading,
}: {
  data: {
    morningBrief: MorningBrief | null
    tasks: TasksResponse | null
    overview: CommandCenterOverview | null
    relationships: RelationshipsResponse | null
  }
  loading: boolean
}) {
  const { overview } = data

  const monthlyStats = {
    stories: 328,
    storiesThisMonth: 12,
    vignettes: 31,
    vignettesThisMonth: 5,
    storytellers: 239,
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Stories"
          value={monthlyStats.stories}
          icon="📖"
          color="orange"
          subValue={`+${monthlyStats.storiesThisMonth} this month`}
        />
        <StatCard
          label="Vignettes"
          value={monthlyStats.vignettes}
          icon="✨"
          color="violet"
          subValue={`+${monthlyStats.vignettesThisMonth} this month`}
        />
        <StatCard
          label="Storytellers"
          value={monthlyStats.storytellers}
          icon="👥"
          color="blue"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Art Highlights */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Art That Moved People</h2>
            <div className="space-y-4">
              <ArtHighlight rank={1} title="Orange Sky Origins" views={2400} shares={47} />
              <ArtHighlight rank={2} title="Uncle Allan Palm Island" views={890} shares={23} />
              <ArtHighlight rank={3} title="Community Innovation" views={450} shares={12} />
            </div>
          </div>

          {/* Beautiful Obsolescence */}
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Beautiful Obsolescence</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <CompactStatCard label="Ready" value={3} color="emerald" />
              <CompactStatCard label="Building" value={3} color="amber" />
              <CompactStatCard label="ACT-Dependent" value={55} color="slate" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ReflectionCard horizon="month" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Year View Content
// ============================================

function YearViewContent({
  data,
  loading,
}: {
  data: {
    morningBrief: MorningBrief | null
    tasks: TasksResponse | null
    overview: CommandCenterOverview | null
    relationships: RelationshipsResponse | null
  }
  loading: boolean
}) {
  const currentYear = new Date().getFullYear()

  const yearlyStats = {
    stories: 328,
    vignettes: 31,
    projects: 70,
    handovers: 3,
    protocol: '100%',
  }

  return (
    <div className="space-y-6">
      {/* The Legacy */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-8 text-white">
        <h2 className="text-xl font-semibold mb-6">The Legacy</h2>
        <div className="grid grid-cols-5 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-orange-400">{yearlyStats.stories}</p>
            <p className="text-sm text-slate-400 mt-1">Stories</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-purple-400">{yearlyStats.vignettes}</p>
            <p className="text-sm text-slate-400 mt-1">Vignettes</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-400">{yearlyStats.projects}</p>
            <p className="text-sm text-slate-400 mt-1">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-emerald-400">{yearlyStats.handovers}</p>
            <p className="text-sm text-slate-400 mt-1">Handovers</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-amber-400">{yearlyStats.protocol}</p>
            <p className="text-sm text-slate-400 mt-1">Protocol</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <ReflectionCard horizon="year" />
        </div>

        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
            <h3 className="font-semibold text-slate-900 mb-4">Story Sovereignty</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Consent</span>
                <span className="text-emerald-600 font-medium">100%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">OCAP violations</span>
                <span className="text-emerald-600 font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Elder reviews</span>
                <span className="text-emerald-600 font-medium">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Helper Components
// ============================================

function TaskCard({ task }: { task: Task }) {
  const priorityColors = {
    urgent: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    high: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    medium: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    low: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
  }

  const colors = priorityColors[task.priority]

  return (
    <div className={`p-4 bg-white border ${colors.border} rounded-xl hover:shadow-sm transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
          📋
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-900">{task.title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
              task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {task.priority}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{task.description}</p>
        </div>
      </div>
    </div>
  )
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm text-slate-600">{label}</div>
      <div className="flex-1 bg-slate-100 rounded-full h-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
      <div className="w-16 text-right text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

function EnergyItem({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl shadow-sm">
        {icon}
      </div>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function ArtHighlight({ rank, title, views, shares }: { rank: number; title: string; views: number; shares: number }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
        #{rank}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-slate-900">{title}</h4>
        <div className="flex gap-4 mt-1 text-xs text-slate-400">
          <span>{views.toLocaleString()} views</span>
          <span>{shares} shares</span>
        </div>
      </div>
    </div>
  )
}

function ReflectionCard({ horizon }: { horizon: TimeHorizon }) {
  const questions: Record<TimeHorizon, ReflectionQuestion[]> = {
    day: [{ id: 'focus', label: 'What is your one priority today?' }],
    week: [
      { id: 'story-moved', label: 'What story moved people this week?' },
      { id: 'relationship-deepened', label: 'What relationship deepened?' },
    ],
    month: [
      { id: 'truth-told', label: 'What truth did we tell that no one else was telling?' },
      { id: 'community-found', label: 'What community found itself through our work?' },
    ],
    year: [
      { id: 'ten-year', label: 'In 10 years, what change did ACT seed that\'s now self-sustaining?' },
    ],
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100">
      <h3 className="font-semibold text-slate-900 mb-4">Reflection</h3>
      <div className="space-y-4">
        {questions[horizon].map(q => (
          <div key={q.id}>
            <label className="block text-sm text-slate-600 mb-2">{q.label}</label>
            <textarea
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none"
              rows={3}
              placeholder="Your reflection..."
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Styles
// ============================================

const viewSwitcherStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  background: '#f1f5f9',
  padding: '4px',
  borderRadius: '8px',
}

const viewButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#64748b',
}

const activeViewButtonStyle: React.CSSProperties = {
  background: 'white',
  color: '#1e293b',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  fontWeight: '500',
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px',
}

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid #e2e8f0',
  borderTopColor: '#6366f1',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  marginBottom: '16px',
}
