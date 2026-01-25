/**
 * GoalsProgress - 2026 Goals Dashboard Widget
 *
 * Shows:
 * - Goals grouped by Lane (A, B, C)
 * - Progress bars for each lane
 * - Yearly vs Quarterly breakdown
 * - Status indicators
 *
 * Connected to Command Center API via /api/goals/2026
 */

import { useGoals2026 } from '../../hooks/useBrainCenter'

const LANE_COLORS: Record<string, { bg: string; border: string; text: string; progress: string }> = {
  A: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    progress: 'bg-blue-500'
  },
  B: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    progress: 'bg-violet-500'
  },
  C: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    progress: 'bg-amber-500'
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

export function GoalsProgress() {
  const { lanes, summary, goals, loading, error, refetch } = useGoals2026()

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-500"></div>
          <span className="text-sm text-slate-500">Loading 2026 goals...</span>
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
          className="mt-2 text-xs text-violet-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

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
            <div className="text-3xl font-bold text-violet-600">{summary?.overallProgress || 0}%</div>
            <div className="text-xs text-slate-500">complete</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{summary.total}</div>
            <div className="text-xs text-slate-500">total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-600">{summary.yearly}</div>
            <div className="text-xs text-slate-500">yearly</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.quarterly}</div>
            <div className="text-xs text-slate-500">quarterly</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{summary.completed}</div>
            <div className="text-xs text-slate-500">completed</div>
          </div>
        </div>
      )}

      {/* Lane Progress Cards */}
      <div className="p-4 space-y-3">
        {Object.entries(lanes).map(([key, lane]) => {
          const colors = LANE_COLORS[key] || LANE_COLORS.unassigned
          if (lane.total === 0) return null

          return (
            <div
              key={key}
              className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${colors.text}`}>{lane.name}</span>
                  <span className="text-xs text-slate-500">
                    {lane.completed}/{lane.total} goals
                  </span>
                </div>
                <span className={`text-sm font-bold ${colors.text}`}>
                  {lane.progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.progress} rounded-full transition-all duration-500`}
                  style={{ width: `${lane.progress}%` }}
                />
              </div>

              {/* Lane goals preview */}
              <div className="mt-3 space-y-1">
                {lane.goals.slice(0, 3).map(goal => (
                  <div key={goal.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 truncate flex-1">{goal.title}</span>
                    <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[goal.status] || 'bg-slate-100 text-slate-600'}`}>
                      {goal.status}
                    </span>
                  </div>
                ))}
                {lane.goals.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{lane.goals.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick View - In Progress Goals */}
      {goals && goals.filter(g => g.status === 'In progress').length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            In Progress
          </h4>
          <div className="space-y-2">
            {goals.filter(g => g.status === 'In progress').slice(0, 5).map(goal => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{goal.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{goal.type}</span>
                    {goal.lane && (
                      <span className="text-xs text-blue-600">{goal.lane}</span>
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
          <button
            onClick={refetch}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

export default GoalsProgress
