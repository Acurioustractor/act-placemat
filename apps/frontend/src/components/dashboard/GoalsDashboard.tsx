/**
 * GoalsDashboard - Complete goal management interface
 *
 * Features:
 * - Lane-based goal organization (Listen, Curiosity, Action, Art)
 * - Drag-and-drop reordering within/between lanes
 * - Multiple views: Lanes, Calendar, List
 * - Inline goal editing with progress updates
 * - Goal history and metrics tracking
 * - Search and filter
 * - Cross-system links (projects, calendar, relationships)
 */

import { useState, useCallback, useMemo } from 'react'
import { Reorder, AnimatePresence, motion } from 'framer-motion'
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
  lane_position?: number
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
  onMoveGoal?: (goalId: string, lane: string, position: number) => Promise<void>
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
  { id: 'listen', name: 'Listen', color: '#3b82f6', icon: '👂' },
  { id: 'curiosity', name: 'Curiosity', color: '#8b5cf6', icon: '🔍' },
  { id: 'action', name: 'Action', color: '#f59e0b', icon: '⚡' },
  { id: 'art', name: 'Art', color: '#ec4899', icon: '🎨' },
]

// Map backend lane names to frontend lane IDs
const LANE_NAME_TO_ID: Record<string, string> = {
  'Listen': 'listen',
  'Curiosity': 'curiosity',
  'Action': 'action',
  'Art': 'art',
  'A — Core Ops': 'listen',
  'B — Platforms': 'curiosity',
  'C — Place/Seasonal': 'action',
}

export function GoalsDashboard({
  goals,
  onUpdateGoal,
  onAddGoal,
  onAddMetric,
  onViewHistory,
  onMoveGoal,
  onReorderLane,
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

  // Goal ordering state for drag-and-drop
  const [laneGoals, setLaneGoals] = useState<Record<string, Goal[]>>(() => {
    const initial: Record<string, Goal[]> = {}
    LANES.forEach(lane => {
      initial[lane.id] = []
    })
    initial['unassigned'] = []
    return initial
  })

  // Initialize lane goals from props
  useMemo(() => {
    const grouped: Record<string, Goal[]> = {} as Record<string, Goal[]>
    LANES.forEach(lane => {
      grouped[lane.id] = []
    })
    grouped['unassigned'] = []

    goals.forEach(goal => {
      const laneId = LANE_NAME_TO_ID[goal.lane_name || ''] || 'unassigned'
      if (grouped[laneId]) {
        grouped[laneId].push(goal)
      } else {
        grouped['unassigned'].push(goal)
      }
    })

    // Sort by position
    Object.keys(grouped).forEach(laneId => {
      grouped[laneId].sort((a, b) => (a.lane_position || 0) - (b.lane_position || 0))
    })

    setLaneGoals(grouped)
  }, [goals])

  // Filter goals
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          goal.title.toLowerCase().includes(query) ||
          goal.description?.toLowerCase().includes(query) ||
          goal.key_results?.some((kr) => kr.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && goal.status !== statusFilter) return false

      // Lane filter
      if (laneFilter && goal.lane_name !== laneFilter) return false

      return true
    })
  }, [goals, searchQuery, statusFilter, laneFilter])

  // Group by lane
  const goalsByLane = useMemo(() => {
    const grouped = LANES.reduce((acc, lane) => {
      acc[lane.id] = filteredGoals.filter((g) => g.lane_name === lane.name)
      return acc
    }, {} as Record<string, Goal[]>)

    // Also include unassigned goals
    grouped['unassigned'] = filteredGoals.filter(
      (g) => !LANES.some((l) => l.name === g.lane_name)
    )

    return grouped
  }, [filteredGoals])

  // Calculate stats
  const stats = useMemo(() => {
    const total = goals.length
    const completed = goals.filter((g) => g.status === 'Completed').length
    const inProgress = goals.filter((g) => g.status === 'In progress').length
    const avgProgress =
      total > 0
        ? Math.round(
            goals.reduce((sum, g) => sum + g.progress_percentage, 0) / total
          )
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

  // Handle goal reorder within a lane
  const handleReorder = useCallback(
    async (laneId: string, newOrder: Goal[]) => {
      setLaneGoals(prev => ({
        ...prev,
        [laneId]: newOrder
      }))

      // Persist to backend
      if (onReorderLane) {
        const goalIds = newOrder.map(g => g.id)
        await onReorderLane(laneId, goalIds)
      }
    },
    [onReorderLane]
  )

  // Handle moving goal between lanes
  const handleMoveBetweenLanes = useCallback(
    async (goalId: string, fromLane: string, toLane: string, newIndex: number) => {
      const goal = laneGoals[fromLane]?.find(g => g.id === goalId)
      if (!goal) return

      // Optimistic update
      setLaneGoals(prev => {
        const updated = { ...prev }
        updated[fromLane] = updated[fromLane]?.filter(g => g.id !== goalId) || []
        updated[toLane] = [...(updated[toLane] || [])]
        updated[toLane].splice(newIndex, 0, { ...goal, lane_name: toLane })
        return updated
      })

      // Persist to backend
      if (onMoveGoal) {
        await onMoveGoal(goalId, toLane, newIndex)
      }
    },
    [laneGoals, onMoveGoal]
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
        <div style={filterGroupStyle}>
          <label style={filterLabelStyle}>Status:</label>
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
        </div>
        <div style={filterGroupStyle}>
          <label style={filterLabelStyle}>Lane:</label>
          <select
            value={laneFilter || ''}
            onChange={(e) => setLaneFilter(e.target.value || null)}
            style={selectStyle}
          >
            <option value="">All Lanes</option>
            {LANES.map((lane) => (
              <option key={lane.id} value={lane.name}>
                {lane.icon} {lane.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Row */}
      <div style={statsRowStyle}>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{stats.total}</div>
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
            const laneGoalsList = laneGoals[lane.id] || []
            const laneProgress =
              laneGoalsList.length > 0
                ? Math.round(
                    laneGoalsList.reduce((sum, g) => sum + g.progress_percentage, 0) /
                      laneGoalsList.length
                  )
                : 0

            return (
              <div key={lane.id} style={laneColumnStyle}>
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
                <Reorder.Group
                  axis="y"
                  values={laneGoalsList}
                  onReorder={(newOrder) => handleReorder(lane.id, newOrder)}
                  style={laneGoalsStyle}
                >
                  <AnimatePresence>
                    {laneGoalsList.map((goal) => (
                      <Reorder.Item
                        key={goal.id}
                        value={goal}
                        layoutId={goal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileDrag={{ scale: 1.02, zIndex: 100 }}
                        style={{
                          listStyle: 'none',
                          marginBottom: '12px',
                        }}
                      >
                        <GoalCard
                          goal={goal}
                          onUpdate={handleUpdateGoal}
                          onAddMetric={(id) => onAddMetric(id, {})}
                          onViewHistory={onViewHistory}
                        />
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
                {laneGoalsList.length === 0 && (
                  <div style={emptyLaneStyle}>
                    No goals in {lane.name}
                    <br />
                    <small>Drag goals here or add new ones</small>
                  </div>
                )}
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
      {goalsByLane['unassigned']?.length > 0 && viewMode === 'lanes' && (
        <div style={unassignedSectionStyle}>
          <h3 style={unassignedTitleStyle}>Unassigned Goals</h3>
          <div style={unassignedGridStyle}>
            {goalsByLane['unassigned'].map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdate={handleUpdateGoal}
                onAddMetric={(id) => onAddMetric(id, {})}
                onViewHistory={onViewHistory}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <AddGoalModal
          onAdd={handleAddGoal}
          onClose={() => setShowAddModal(false)}
          lanes={LANES}
        />
      )}
    </div>
  )
}

// Add Goal Modal Component
interface AddGoalModalProps {
  onAdd: (goal: Partial<Goal>) => Promise<void>
  onClose: () => void
  lanes: typeof LANES
}

function AddGoalModal({ onAdd, onClose, lanes }: AddGoalModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lane, setLane] = useState(lanes[0].name)
  const [status, setStatus] = useState<Goal['status']>('Planning')
  const [progress, setProgress] = useState(0)
  const [keyResults, setKeyResults] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onAdd({
        title,
        description,
        lane_name: lane,
        status,
        progress_percentage: progress,
        key_results: keyResults
          ? keyResults.split('\n').filter((kr) => kr.trim())
          : [],
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={modalTitleStyle}>Add New Goal</h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
              placeholder="Enter goal title..."
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              placeholder="What do you want to achieve?"
            />
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Lane</label>
              <select value={lane} onChange={(e) => setLane(e.target.value)} style={inputStyle}>
                {lanes.map((l) => (
                  <option key={l.id} value={l.name}>
                    {l.icon} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Goal['status'])}
                style={inputStyle}
              >
                <option value="Planning">Planning</option>
                <option value="In progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Initial Progress: {progress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              style={sliderStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Key Results (one per line)</label>
            <textarea
              value={keyResults}
              onChange={(e) => setKeyResults(e.target.value)}
              style={{ ...inputStyle, minHeight: '100px', fontFamily: 'monospace' }}
              placeholder="Key result 1&#10;Key result 2&#10;Key result 3"
            />
          </div>

          <div style={modalActionsStyle}>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={submitButtonStyle}>
              {isSubmitting ? 'Adding...' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
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
  marginBottom: '24px',
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
  background: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
}

const filtersStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginBottom: '24px',
  flexWrap: 'wrap',
}

const searchInputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  width: '250px',
}

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}

const filterLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#64748b',
}

const selectStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  background: 'white',
}

const statsRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  marginBottom: '32px',
}

const statCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center',
  border: '1px solid #e2e8f0',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#1e293b',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  marginTop: '4px',
}

const lanesContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
}

const laneColumnStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: '12px',
  overflow: 'hidden',
}

const laneHeaderStyle: (color: string) => React.CSSProperties = (color) => ({
  padding: '16px',
  background: color,
  color: 'white',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
})

const laneIconStyle: React.CSSProperties = {
  fontSize: '24px',
}

const laneNameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
}

const laneMetaStyle: React.CSSProperties = {
  fontSize: '12px',
  opacity: 0.9,
}

const laneProgressStyle: React.CSSProperties = {
  height: '4px',
  background: 'rgba(255,255,255,0.3)',
}

const laneProgressFillStyle: React.CSSProperties = {
  height: '100%',
  transition: 'width 0.3s ease',
}

const laneGoalsStyle: React.CSSProperties = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const emptyLaneStyle: React.CSSProperties = {
  padding: '20px',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: '13px',
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
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: '16px',
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px',
  color: '#64748b',
}

const spinnerStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '3px solid #e2e8f0',
  borderTopColor: '#6366f1',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  marginBottom: '16px',
}

const retryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '6px',
  border: 'none',
  background: '#6366f1',
  color: 'white',
  fontSize: '14px',
  cursor: 'pointer',
}

// Modal Styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '500px',
  maxHeight: '90vh',
  overflow: 'auto',
}

const modalHeaderStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const modalTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  margin: 0,
}

const closeButtonStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: 'none',
  background: '#f1f5f9',
  borderRadius: '6px',
  fontSize: '20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const formStyle: React.CSSProperties = {
  padding: '24px',
}

const formGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
}

const formRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  color: '#475569',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
}

const modalActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  marginTop: '24px',
  paddingTop: '20px',
  borderTop: '1px solid #e2e8f0',
}

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: 'white',
  fontSize: '14px',
  cursor: 'pointer',
}

const submitButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '6px',
  border: 'none',
  background: '#6366f1',
  color: 'white',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
}

// View toggle styles
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

// List view styles
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
