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

import { useState, useCallback, useMemo, useEffect } from 'react'
import { GoalCard } from './GoalCard'
import { GoalsCalendarView } from './GoalsCalendarView'

interface Goal {
  id: string
  title: string
  description?: string
  status: 'Planning' | 'In progress' | 'Review' | 'Completed' | 'Paused'
  progress_percentage: number
  lane_name?: string
  key_results?: string[]
  due_date?: string
  project_id?: string
  related_contact_ids?: string[]
  metrics?: Metric[]
  updates?: Update[]
}

interface Metric {
  id: string
  metric_name: string
  current_value: number
  target_value: number
  unit: string
  progress_percentage: number
}

interface Update {
  id: string
  field_changed: string
  old_value?: string
  new_value?: string
  created_at: string
  updated_by?: string
  comment?: string
}

interface GoalsDashboardProps {
  goals: Goal[]
  onUpdateGoal: (id: string, updates: GoalUpdates) => Promise<void>
  onAddGoal: (goal: Partial<Goal>) => Promise<void>
  onAddMetric: (goalId: string, metric: Partial<Metric>) => Promise<void>
  onViewHistory: (goalId: string) => void
  onMoveGoal?: (goalId: string, lane: string) => Promise<void>
  onReorderLane?: (lane: string, goalIds: string[]) => Promise<void>
  loading?: boolean
  updating?: boolean
  error?: string | null
}

interface GoalUpdates {
  progress_percentage?: number
  status?: string
  comment?: string
}

type FilterStatus = 'all' | 'Planning' | 'In progress' | 'Review' | 'Completed' | 'Paused'
type ViewMode = 'lanes' | 'calendar' | 'list'

const LANES = [
  { id: 'listen', name: 'Listen', color: '#3b82f6', icon: '👂', backendName: 'A — Core Ops' },
  { id: 'curiosity', name: 'Curiosity', color: '#8b5cf6', icon: '🔍', backendName: 'B — Platforms' },
  { id: 'action', name: 'Action', color: '#f59e0b', icon: '⚡', backendName: 'C — Place/Seasonal' },
  { id: 'art', name: 'Art', color: '#ec4899', icon: '🎨', backendName: 'D — Art' },
]

// Map backend lane names to frontend lane IDs
const BACKEND_TO_FRONTEND: Record<string, string> = {
  'A — Core Ops': 'listen',
  'B — Platforms': 'curiosity',
  'C — Place/Seasonal': 'action',
}

// Map frontend lane IDs to backend names
const FRONTEND_TO_BACKEND: Record<string, string> = {
  'listen': 'A — Core Ops',
  'curiosity': 'B — Platforms',
  'action': 'C — Place/Seasonal',
}

export function GoalsDashboard({
  goals,
  onUpdateGoal,
  onAddGoal,
  onAddMetric,
  onViewHistory,
  onMoveGoal,
  loading = false,
  updating = false,
  error = null,
}: GoalsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [laneFilter, setLaneFilter] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('lanes')
  const [calendarLaneFilter, setCalendarLaneFilter] = useState<string | null>(null)

  // Local state for lane assignments (optimistic updates)
  const [laneAssignments, setLaneAssignments] = useState<Record<string, string>>({})

  // Initialize lane assignments from goals on mount
  useEffect(() => {
    if (goals.length > 0 && Object.keys(laneAssignments).length === 0) {
      const initial: Record<string, string> = {}
      goals.forEach(goal => {
        // Try lane_name first, then lane
        const backendLane = goal.lane_name || (goal as Goal & { lane?: string }).lane
        if (backendLane && BACKEND_TO_FRONTEND[backendLane]) {
          initial[goal.id] = BACKEND_TO_FRONTEND[backendLane]
        } else if (backendLane) {
          // Try to match by prefix
          for (const [backend, frontend] of Object.entries(BACKEND_TO_FRONTEND)) {
            if (backendLane.startsWith(backend.split(' — ')[0])) {
              initial[goal.id] = frontend
              break
            }
          }
        }
        if (!initial[goal.id]) {
          initial[goal.id] = 'unassigned'
        }
      })
      setLaneAssignments(initial)
    }
  }, [goals.length])

  // Get goals for a specific lane
  const getGoalsForLane = useCallback((laneId: string): Goal[] => {
    return goals.filter(goal => {
      const assignedLane = laneAssignments[goal.id] || 'unassigned'
      return assignedLane === laneId
    })
  }, [goals, laneAssignments])

  // Filter goals
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          goal.title.toLowerCase().includes(query) ||
          goal.description?.toLowerCase().includes(query) ||
          goal.key_results?.some((kr) => kr.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      if (statusFilter !== 'all' && goal.status !== statusFilter) return false

      return true
    })
  }, [goals, searchQuery, statusFilter])

  // Calculate stats
  const stats = useMemo(() => {
    const total = goals.length
    const completed = goals.filter((g) => g.status === 'Completed').length
    const inProgress = goals.filter((g) => g.status === 'In progress').length
    const avgProgress =
      total > 0
        ? Math.round(goals.reduce((sum, g) => sum + g.progress_percentage, 0) / total)
        : 0

    return { total, completed, inProgress, avgProgress }
  }, [goals])

  const handleUpdateGoal = useCallback(
    async (id: string, updates: GoalUpdates) => {
      await onUpdateGoal(id, updates)
    },
    [onUpdateGoal]
  )

  const handleAddGoal = useCallback(
    async (goalData: Partial<Goal>) => {
      await onAddGoal(goalData)
      setShowAddModal(false)
    },
    [onAddGoal]
  )

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

  // Handle drop on a lane
  const handleDrop = useCallback(async (e: React.DragEvent, toLaneId: string) => {
    e.preventDefault()
    const goalId = e.dataTransfer.getData('goalId')
    if (!goalId || !toLaneId) return

    const fromLaneId = laneAssignments[goalId] || 'unassigned'
    if (fromLaneId === toLaneId) return

    // Optimistic update
    setLaneAssignments(prev => ({
      ...prev,
      [goalId]: toLaneId
    }))

    // Persist to backend
    if (onMoveGoal) {
      const backendLane = FRONTEND_TO_BACKEND[toLaneId] || toLaneId
      await onMoveGoal(goalId, backendLane)
    }
  }, [laneAssignments, onMoveGoal])

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
            📊 Lanes
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              ...viewToggleButtonStyle,
              ...(viewMode === 'calendar' ? activeViewStyle : {}),
            }}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              ...viewToggleButtonStyle,
              ...(viewMode === 'list' ? activeViewStyle : {}),
            }}
          >
            📋 List
          </button>
        </div>

        <button onClick={() => setShowAddModal(true)} style={addButtonStyle}>
          + Add Goal
        </button>
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
            const laneProgress =
              laneGoalsList.length > 0
                ? Math.round(
                    laneGoalsList.reduce((sum, g) => sum + g.progress_percentage, 0) /
                      laneGoalsList.length
                  )
                : 0

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
                      {laneGoalsList.length} goals • {laneProgress}%
                    </div>
                  </div>
                </div>
                <div style={laneProgressStyle}>
                  <div
                    style={{
                      ...laneProgressFillStyle,
                      width: `${laneProgress}%`,
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
                        onAddMetric={(id) => onAddMetric(id, {})}
                        onViewHistory={onViewHistory}
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
        <GoalsCalendarView
          goals={filteredGoals}
          onGoalClick={(goalId) => setSelectedGoal(goalId)}
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
              onAddMetric={(id) => onAddMetric(id, {})}
              onViewHistory={onViewHistory}
              compact={true}
            />
          ))}
          {filteredGoals.length === 0 && (
            <div style={emptyListStyle}>No goals match your filters</div>
          )}
        </div>
      )}

      {/* Unassigned Goals */}
      {getGoalsForLane('unassigned').length > 0 && viewMode === 'lanes' && (
        <div style={unassignedSectionStyle}>
          <h3 style={unassignedTitleStyle}>Unassigned Goals</h3>
          <div style={unassignedGridStyle}>
            {getGoalsForLane('unassigned').map((goal) => (
              <div
                key={goal.id}
                draggable
                onDragStart={(e) => handleDragStart(e, goal.id)}
                style={{ cursor: 'grab' }}
              >
                <GoalCard
                  goal={goal}
                  onUpdate={handleUpdateGoal}
                  onAddMetric={(id) => onAddMetric(id, {})}
                  onViewHistory={onViewHistory}
                />
              </div>
            ))}
          </div>
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
  gridTemplateColumns: 'repeat(4, 1fr)',
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

const unassignedSectionStyle: React.CSSProperties = {
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '1px solid #e2e8f0',
}

const unassignedTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#64748b',
  marginBottom: '16px',
}

const unassignedGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '16px',
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
