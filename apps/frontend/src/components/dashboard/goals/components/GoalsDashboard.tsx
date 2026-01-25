/**
 * GoalsDashboard - Complete goal management interface
 *
 * Features:
 * - Lane-based goal organization (Listen, Curiosity, Action, Art)
 * - Drag-and-drop between lanes
 * - Multiple views: Lanes, Calendar, List
 * - Inline goal editing with progress updates
 * - Cross-system links (projects, calendar, relationships)
 */

import { useState, useCallback } from 'react'
import { GoalCard } from './GoalCard'
import { GoalCalendar } from './GoalCalendar'
import { GoalProgress } from './GoalProgress'
import { useGoals } from '../hooks/useGoals'
import type { Goal, GoalUpdates, Metric, ViewMode, FilterStatus, LANES } from '../types'
import { LANES as GLOBAL_LANES } from '../types'

interface GoalsDashboardProps {
  goals: Goal[]
  onUpdateGoal: (id: string, updates: GoalUpdates) => Promise<void>
  onAddGoal?: (goal: Partial<Goal>) => Promise<void>
  onAddMetric?: (goalId: string, metric: Partial<Metric>) => Promise<void>
  onViewHistory?: (goalId: string) => void
  onMoveGoal?: (goalId: string, lane: string) => Promise<void>
  onReorderLane?: (lane: string, goalIds: string[]) => Promise<void>
  loading?: boolean
  error?: string | null
}

const LANES = GLOBAL_LANES

export function GoalsDashboard({
  goals,
  onUpdateGoal,
  onAddGoal,
  onAddMetric,
  onViewHistory,
  onMoveGoal,
  onReorderLane,
  loading = false,
  error = null,
}: GoalsDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

  const {
    searchQuery,
    statusFilter,
    laneFilter,
    viewMode,
    calendarLaneFilter,
    laneAssignments,
    laneOrder,
    setSearchQuery,
    setStatusFilter,
    setLaneFilter,
    setViewMode,
    setCalendarLaneFilter,
    getGoalsForLane,
    filteredGoals,
    stats,
    laneProgress,
    handleUpdateGoal,
    handleMoveGoal,
    handleReorderGoal,
  } = useGoals({
    goals,
    onUpdateGoal,
    onMoveGoal,
    onReorderLane,
  })

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, goalId: string) => {
    e.dataTransfer.setData('goalId', goalId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  // Handle drag over (allow drop)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle drop on a lane - moves goal to new lane and puts at top
  const handleDrop = useCallback(async (e: React.DragEvent, toLaneId: string) => {
    e.preventDefault()
    const goalId = e.dataTransfer.getData('goalId')
    if (!goalId || !toLaneId) return

    await handleMoveGoal(goalId, toLaneId)
  }, [handleMoveGoal])

  // Handle add goal
  const handleAddGoal = useCallback(
    async (goalData: Partial<Goal>) => {
      if (onAddGoal) {
        await onAddGoal(goalData)
      }
      setShowAddModal(false)
    },
    [onAddGoal]
  )

  // Error state
  if (error) {
    return (
      <div style={loadingStyle}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ color: '#ef4444', marginBottom: '8px' }}>{error}</p>
        <button onClick={() => window.location.reload()} style={retryButtonStyle}>
          Retry
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <p>Loading goals...</p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>2026 Goals</h1>
          <p style={subtitleStyle}>
            {stats.completed} of {stats.total} completed • {stats.avgProgress}% avg
          </p>
        </div>

        {/* View Toggle */}
        <div style={viewToggleStyle}>
          <button
            onClick={() => setViewMode('lanes')}
            style={{
              ...viewToggleButtonStyle,
              ...(viewMode === 'lanes' ? activeViewStyle : {}),
            }}
          >
            Lanes
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              ...viewToggleButtonStyle,
              ...(viewMode === 'calendar' ? activeViewStyle : {}),
            }}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              ...viewToggleButtonStyle,
              ...(viewMode === 'list' ? activeViewStyle : {}),
            }}
          >
            List
          </button>
        </div>

        {onAddGoal && (
          <button onClick={() => setShowAddModal(true)} style={addButtonStyle}>
            + Add Goal
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <input
          type="text"
          placeholder="Search goals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          style={selectStyle}
        >
          <option value="all">All Status</option>
          <option value="Planning">Planning</option>
          <option value="In progress">In Progress</option>
          <option value="Review">Review</option>
          <option value="Completed">Completed</option>
          <option value="Paused">Paused</option>
        </select>
        <select
          value={laneFilter || ''}
          onChange={(e) => setLaneFilter(e.target.value || null)}
          style={selectStyle}
        >
          <option value="">All Lanes</option>
          {LANES.map(lane => (
            <option key={lane.id} value={lane.id}>{lane.name}</option>
          ))}
        </select>
      </div>

      {/* Stats Row */}
      <div style={statsRowStyle}>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#6366f1' }}>{stats.total}</div>
          <div style={statLabelStyle}>Total Goals</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#22c55e' }}>{stats.completed}</div>
          <div style={statLabelStyle}>Completed</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#3b82f6' }}>{stats.inProgress}</div>
          <div style={statLabelStyle}>In Progress</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#f59e0b' }}>{stats.avgProgress}%</div>
          <div style={statLabelStyle}>Average Progress</div>
        </div>
      </div>

      {/* Lane View with Drag-and-Drop */}
      {viewMode === 'lanes' && (
        <div style={lanesContainerStyle}>
          {LANES.map((lane) => {
            const laneGoalsList = getGoalsForLane(lane.id)
            const laneData = laneProgress.find(lp => lp.laneId === lane.id)

            return (
              <div
                key={lane.id}
                style={laneColumnStyle}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, lane.id)}
              >
                <div style={laneHeaderStyle(lane.color)}>
                  <span style={laneIconStyle}>{lane.icon}</span>
                  <div>
                    <div style={laneNameStyle}>{lane.name}</div>
                    <div style={laneMetaStyle}>
                      {laneGoalsList.length} goals • {laneData?.progress || 0}%
                    </div>
                  </div>
                </div>
                <div style={laneProgressStyle}>
                  <div
                    style={{
                      ...laneProgressFillStyle,
                      width: `${laneData?.progress || 0}%`,
                      backgroundColor: lane.color,
                    }}
                  />
                </div>
                <div style={laneGoalsStyle}>
                  {laneGoalsList.map((goal) => (
                    <div
                      key={goal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, goal.id)}
                      style={{ marginBottom: '12px', cursor: 'grab' }}
                    >
                      <GoalCard
                        goal={goal}
                        onUpdate={handleUpdateGoal}
                        onAddMetric={onAddMetric ? (id) => onAddMetric(id, {}) : undefined}
                        onViewHistory={onViewHistory}
                        onMove={onReorderLane ? (id, dir) => handleReorderGoal(id, dir, lane.id) : undefined}
                      />
                    </div>
                  ))}
                  {laneGoalsList.length === 0 && (
                    <div style={emptyLaneStyle}>
                      Drop goals here
                      <br />
                      <small>Drag from other lanes</small>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <GoalCalendar
          goals={filteredGoals}
          onGoalClick={setSelectedGoal}
          onLaneFilterChange={setCalendarLaneFilter}
          currentLaneFilter={calendarLaneFilter}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div style={listViewStyle}>
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={handleUpdateGoal}
              onAddMetric={onAddMetric ? (id) => onAddMetric(id, {}) : undefined}
              onViewHistory={onViewHistory}
              compact={true}
            />
          ))}
          {filteredGoals.length === 0 && (
            <div style={emptyListStyle}>No goals match your filters</div>
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={modalTitleStyle}>Add New Goal</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              Goals are managed in Notion. This is a placeholder for future functionality.
            </p>
            <button onClick={() => setShowAddModal(false)} style={closeButtonStyle}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Styles
const containerStyle: React.CSSProperties = {
  padding: '24px',
  maxWidth: '1600px',
  margin: '0 auto',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px',
  flexWrap: 'wrap',
  gap: '16px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1e293b',
  margin: 0,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  marginTop: '4px',
}

const addButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  background: '#6366f1',
  color: 'white',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
}

const filtersStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  flexWrap: 'wrap',
}

const searchInputStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  minWidth: '250px',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  cursor: 'pointer',
  outline: 'none',
}

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginBottom: '24px',
  flexWrap: 'wrap',
}

const statCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  padding: '16px 24px',
  textAlign: 'center',
  border: '1px solid #e2e8f0',
  flex: '1 1 150px',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  marginTop: '4px',
}

const viewToggleStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  background: '#f1f5f9',
  padding: '4px',
  borderRadius: '8px',
}

const viewToggleButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

const activeViewStyle: React.CSSProperties = {
  background: 'white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  fontWeight: '500',
}

const lanesContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '16px',
  alignItems: 'flex-start',
}

const laneColumnStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: '12px',
  overflow: 'hidden',
  minHeight: '200px',
}

const laneHeaderStyle: (color: string) => React.CSSProperties = (color) => ({
  padding: '16px',
  background: 'white',
  borderBottom: '3px solid',
  borderColor: color,
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const laneIconStyle: React.CSSProperties = {
  fontSize: '24px',
}

const laneNameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
}

const laneMetaStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '2px',
}

const laneProgressStyle: React.CSSProperties = {
  height: '4px',
  background: '#e2e8f0',
}

const laneProgressFillStyle: React.CSSProperties = {
  height: '100%',
  transition: 'width 0.3s ease',
}

const laneGoalsStyle: React.CSSProperties = {
  padding: '12px',
  minHeight: '100px',
}

const emptyLaneStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '20px',
  color: '#94a3b8',
  fontSize: '13px',
}

const listViewStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  maxWidth: '800px',
  margin: '0 auto',
}

const emptyListStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: '#94a3b8',
  fontSize: '14px',
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalContentStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '24px',
  maxWidth: '500px',
  width: '90%',
}

const modalTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  marginBottom: '8px',
}

const closeButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  background: 'white',
  cursor: 'pointer',
  marginTop: '16px',
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
}

const retryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  background: '#6366f1',
  color: 'white',
  cursor: 'pointer',
}
