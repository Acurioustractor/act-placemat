/**
 * GoalCard - Interactive goal display with inline editing
 *
 * Features:
 * - Progress slider with live updates
 * - Status dropdown
 * - Expandable details (metrics, history)
 * - Quick actions
 * - Cross-system links (projects, calendar, relationships)
 * - Drag handle for reordering
 */

import { useState, useCallback } from 'react'
import type { Goal, GoalUpdates, Metric, Update, STATUS_OPTIONS, STATUS_ICONS } from '../types'
import {
  STATUS_OPTIONS as GLOBAL_STATUS_OPTIONS,
  STATUS_ICONS as GLOBAL_STATUS_ICONS,
  LANE_COLORS,
} from '../types'

interface GoalCardProps {
  goal: Goal
  onUpdate: (id: string, updates: GoalUpdates) => Promise<void>
  onAddMetric?: (goalId: string) => void
  onViewHistory?: (goalId: string) => void
  onMove?: (goalId: string, direction: 'up' | 'down') => void
  compact?: boolean
  isDragging?: boolean
}

const STATUS_OPTIONS = GLOBAL_STATUS_OPTIONS
const STATUS_ICONS = GLOBAL_STATUS_ICONS

export function GoalCard({
  goal,
  onUpdate,
  onAddMetric,
  onViewHistory,
  onMove,
  compact = false,
  isDragging = false,
}: GoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editProgress, setEditProgress] = useState(goal.progress_percentage)
  const [editStatus, setEditStatus] = useState(goal.status)
  const [comment, setComment] = useState('')

  // Lane colors for border
  const laneValue = goal.lane || goal.lane_name || ''
  const laneColor = LANE_COLORS[laneValue] || LANE_COLORS[laneValue.split(' — ')[0] || ''] || '#6366f1'

  // Dynamic card style based on lane color
  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    borderLeftWidth: '4px',
    borderLeftColor: laneColor,
    overflow: 'hidden',
    opacity: isDragging ? 0.7 : 1,
    transform: isDragging ? 'scale(1.02)' : 'none',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
    transition: 'all 0.2s ease',
  }

  // Project name mapping (simplified - could be expanded)
  const getProjectName = (projectId?: string) => {
    if (!projectId) return null
    const projectNames: Record<string, string> = {
      'justicehub': 'JusticeHub',
      'goods': 'Goods on Country',
      'empathy-ledger': 'Empathy Ledger',
      'farm': 'The Farm',
      'studios': 'ACT Studios',
    }
    return projectNames[projectId.toLowerCase()] || projectId
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onUpdate(goal.id, {
        progress_percentage: editProgress,
        status: editStatus,
        comment: comment || undefined,
      })
      setIsEditing(false)
      setComment('')
    } finally {
      setIsSaving(false)
    }
  }, [goal.id, editProgress, editStatus, comment, onUpdate])

  const handleCancel = () => {
    setEditProgress(goal.progress_percentage)
    setEditStatus(goal.status)
    setIsEditing(false)
    setComment('')
  }

  const statusMeta = STATUS_OPTIONS.find(s => s.value === goal.status) || STATUS_OPTIONS[0]

  if (compact) {
    return (
      <div className="goal-card-compact" style={compactStyle}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{STATUS_ICONS[goal.status]}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{goal.title}</div>
            <div className="text-sm text-slate-500">{goal.progress_percentage}%</div>
          </div>
          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${goal.progress_percentage}%`,
                backgroundColor: statusMeta.color,
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="goal-card" style={cardStyle}>
      {/* Header */}
      <div className="goal-header" style={headerStyle}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{STATUS_ICONS[goal.status]}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-slate-600 mt-1">{goal.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${statusMeta.color}20`,
                  color: statusMeta.color,
                }}
              >
                {goal.status}
              </span>
              {goal.lane_name && (
                <span className="text-xs text-slate-500">{goal.lane_name}</span>
              )}
              {goal.due_date && (
                <span className="text-xs text-slate-500">
                  Due: {new Date(goal.due_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Cross-system links */}
            <div style={linksRowStyle}>
              {goal.project_id && (
                <a
                  href={`?tab=projects&project=${goal.project_id}`}
                  style={projectLinkStyle}
                  title="View in Projects"
                >
                  📁 {getProjectName(goal.project_id)}
                </a>
              )}

              {goal.due_date && (
                <a
                  href={`?tab=calendar&goal=${goal.id}`}
                  style={calendarLinkStyle}
                  title="View in Calendar"
                >
                  📅 {new Date(goal.due_date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                </a>
              )}

              {goal.related_contact_ids && goal.related_contact_ids.length > 0 && (
                <span style={contactsLinkStyle} title={`${goal.related_contact_ids.length} related contact(s)`}>
                  👥 {goal.related_contact_ids.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Circle */}
        <div className="progress-ring" style={progressRingStyle}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="4"
            />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke={statusMeta.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${goal.progress_percentage * 1.63} 163`}
              transform="rotate(-90 30 30)"
            />
            <text
              x="30"
              y="34"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#1e293b"
            >
              {goal.progress_percentage}%
            </text>
          </svg>
        </div>
      </div>

      {/* Inline Editor */}
      {isEditing ? (
        <div className="goal-editor" style={editorStyle}>
          <div className="editor-field">
            <label style={labelStyle}>Progress: {editProgress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={editProgress}
              onChange={(e) => setEditProgress(parseInt(e.target.value))}
              style={sliderStyle}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="editor-field">
            <label style={labelStyle}>Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as typeof goal.status)}
              style={selectStyle}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="editor-field">
            <label style={labelStyle}>Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What changed?"
              style={textareaStyle}
              rows={2}
            />
          </div>

          <div className="editor-actions" style={actionsStyle}>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={saveButtonStyle}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        /* View Mode Actions */
        <div className="goal-actions" style={actionsStyle}>
          <button
            onClick={() => setIsEditing(true)}
            style={editButtonStyle}
          >
            Edit Progress
          </button>
          {onAddMetric && (
            <button
              onClick={() => onAddMetric(goal.id)}
              style={secondaryButtonStyle}
            >
              Add Metric
            </button>
          )}
          {onViewHistory && (
            <button
              onClick={() => onViewHistory(goal.id)}
              style={secondaryButtonStyle}
            >
              View History
            </button>
          )}
          {onMove && (
            <div style={moveButtonsStyle}>
              <button
                onClick={() => onMove(goal.id, 'up')}
                style={moveButtonStyle}
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => onMove(goal.id, 'down')}
                style={moveButtonStyle}
                title="Move down"
              >
                ↓
              </button>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={expandButtonStyle}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="goal-expanded" style={expandedStyle}>
          {goal.key_results && goal.key_results.length > 0 && (
            <div className="section">
              <h4 style={sectionTitleStyle}>Key Results</h4>
              <ul style={listStyle}>
                {goal.key_results.map((kr, i) => (
                  <li key={i} style={listItemStyle}>{kr}</li>
                ))}
              </ul>
            </div>
          )}

          {goal.metrics && goal.metrics.length > 0 && (
            <div className="section">
              <h4 style={sectionTitleStyle}>Metrics</h4>
              <div className="metrics-grid" style={metricsGridStyle}>
                {goal.metrics.map((m) => (
                  <div key={m.id} style={metricCardStyle}>
                    <div style={metricNameStyle}>{m.metric_name}</div>
                    <div style={metricValueStyle}>
                      {m.current_value} / {m.target_value} {m.unit}
                    </div>
                    <div style={metricBarStyle}>
                      <div
                        style={{
                          ...metricBarFillStyle,
                          width: `${Math.min(100, m.progress_percentage)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {goal.updates && goal.updates.length > 0 && (
            <div className="section">
              <h4 style={sectionTitleStyle}>Recent Updates</h4>
              <div style={updatesListStyle}>
                {goal.updates.slice(0, 5).map((u) => (
                  <div key={u.id} style={updateItemStyle}>
                    <div style={updateMetaStyle}>
                      <span style={updateFieldStyle}>{u.field_changed}</span>
                      <span style={updateDateStyle}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {u.old_value !== undefined && u.new_value !== undefined && (
                      <div style={updateChangeStyle}>
                        {u.old_value} → {u.new_value}
                      </div>
                    )}
                    {u.comment && (
                      <div style={updateCommentStyle}>"{u.comment}"</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Styles
const compactStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
}

const headerStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
}

const progressRingStyle: React.CSSProperties = {
  flexShrink: 0,
}

const editorStyle: React.CSSProperties = {
  padding: '20px',
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  marginBottom: '8px',
  color: '#475569',
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  resize: 'vertical',
}

const actionsStyle: React.CSSProperties = {
  padding: '16px 20px',
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  borderTop: '1px solid #f1f5f9',
}

const editButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
}

const saveButtonStyle: React.CSSProperties = {
  ...editButtonStyle,
  background: '#22c55e',
}

const cancelButtonStyle: React.CSSProperties = {
  ...editButtonStyle,
  background: '#e2e8f0',
  color: '#475569',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'white',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '14px',
  cursor: 'pointer',
}

const expandButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  marginLeft: 'auto',
}

const moveButtonsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const moveButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: '#f1f5f9',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
}

const expandedStyle: React.CSSProperties = {
  padding: '20px',
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '12px',
  marginTop: '20px',
}

const listStyle: React.CSSProperties = {
  paddingLeft: '20px',
  margin: 0,
}

const listItemStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  marginBottom: '4px',
}

const metricsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: '12px',
}

const metricCardStyle: React.CSSProperties = {
  background: 'white',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
}

const metricNameStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '500',
  color: '#64748b',
  marginBottom: '4px',
}

const metricValueStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
}

const metricBarStyle: React.CSSProperties = {
  height: '4px',
  background: '#e2e8f0',
  borderRadius: '2px',
  marginTop: '8px',
  overflow: 'hidden',
}

const metricBarFillStyle: React.CSSProperties = {
  height: '100%',
  background: '#6366f1',
  borderRadius: '2px',
  transition: 'width 0.3s ease',
}

const updatesListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const updateItemStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'white',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
}

const updateMetaStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '4px',
}

const updateFieldStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '500',
  color: '#6366f1',
  textTransform: 'capitalize',
}

const updateDateStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
}

const updateChangeStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#475569',
}

const updateCommentStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  fontStyle: 'italic',
  marginTop: '4px',
}

const linksRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '12px',
  flexWrap: 'wrap',
}

const projectLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: '#f0fdf4',
  color: '#16a34a',
  borderRadius: '4px',
  fontSize: '12px',
  textDecoration: 'none',
  fontWeight: '500',
}

const calendarLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: '#fef3c7',
  color: '#d97706',
  borderRadius: '4px',
  fontSize: '12px',
  textDecoration: 'none',
  fontWeight: '500',
}

const contactsLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: '#eff6ff',
  color: '#2563eb',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '500',
}
