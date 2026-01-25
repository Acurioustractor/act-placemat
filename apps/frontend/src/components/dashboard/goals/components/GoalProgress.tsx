/**
 * GoalProgress - Goals progress widget
 *
 * Features:
 * - Lane-based progress display
 * - Stats summary
 * - In-progress goals list
 */

import type { Goal, LaneProgress, GoalsStats, STATUS_COLORS } from '../types'

interface GoalProgressProps {
  stats: GoalsStats
  laneProgress: LaneProgress[]
  goals?: Goal[]
  onRefresh?: () => void
}

const LANE_COLORS: Record<string, { bg: string; border: string; text: string; progress: string }> = {
  listen: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    progress: 'bg-blue-500'
  },
  curiosity: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    progress: 'bg-violet-500'
  },
  action: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    progress: 'bg-amber-500'
  },
  art: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    progress: 'bg-pink-500'
  },
  unassigned: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    progress: 'bg-slate-400'
  }
}

const STATUS_COLORS: Record<string, string> = {
  'Completed': 'bg-emerald-100 text-emerald-700',
  'In progress': 'bg-blue-100 text-blue-700',
  'Planning': 'bg-amber-100 text-amber-700',
  'Not started': 'bg-slate-100 text-slate-600'
}

export function GoalProgress({ stats, laneProgress, goals = [], onRefresh }: GoalProgressProps) {
  const inProgressGoals = goals.filter(g => g.status === 'In progress')

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 px-6 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-violet-600 font-medium">2026 Goals</div>
            <h3 className="text-lg font-semibold text-slate-900">Lane Progress</h3>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-violet-600">{stats.avgProgress}%</div>
            <div className="text-xs text-slate-500">complete</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-500">total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-violet-600">
            {goals.filter(g => g.type === 'yearly' || !g.type).length}
          </div>
          <div className="text-xs text-slate-500">yearly</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {goals.filter(g => g.type === 'quarterly').length}
          </div>
          <div className="text-xs text-slate-500">quarterly</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
          <div className="text-xs text-slate-500">completed</div>
        </div>
      </div>

      {/* Lane Progress Cards */}
      <div className="p-4 space-y-3">
        {laneProgress.map(({ laneId, goals: laneGoals, progress, count }) => {
          const colors = LANE_COLORS[laneId] || LANE_COLORS.unassigned
          if (count === 0) return null

          return (
            <div
              key={laneId}
              className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {laneGoals[0]?.lane_name || laneId}
                  </span>
                  <span className="text-xs text-slate-500">
                    {count} goals
                  </span>
                </div>
                <span className={`text-sm font-bold ${colors.text}`}>
                  {progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.progress} rounded-full transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Lane goals preview */}
              <div className="mt-3 space-y-1">
                {laneGoals.slice(0, 3).map(goal => (
                  <div key={goal.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 truncate flex-1">{goal.title}</span>
                    <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[goal.status] || 'bg-slate-100 text-slate-600'}`}>
                      {goal.status}
                    </span>
                  </div>
                ))}
                {laneGoals.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{laneGoals.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick View - In Progress Goals */}
      {inProgressGoals.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            In Progress
          </h4>
          <div className="space-y-2">
            {inProgressGoals.slice(0, 5).map(goal => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{goal.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{goal.type || 'yearly'}</span>
                    {goal.lane_name && (
                      <span className="text-xs text-blue-600">{goal.lane_name}</span>
                    )}
                  </div>
                </div>
                {goal.due_date && (
                  <span className="text-xs text-slate-400">
                    Due: {new Date(goal.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            synced from Notion
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
