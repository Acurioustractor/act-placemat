/**
 * GoalCalendar - Calendar view for goals with due dates
 *
 * Features:
 * - Month navigation
 * - Goals displayed on their due dates
 * - Lane color coding
 * - Click to view goal details
 * - Upcoming/overdue sections
 */

import { useState, useMemo } from 'react'
import type { Goal, LANE_COLORS } from '../types'
import { LANE_COLORS as GLOBAL_LANE_COLORS, LANES } from '../types'

interface GoalCalendarProps {
  goals: Goal[]
  onGoalClick: (goalId: string) => void
  onLaneFilterChange?: (lane: string | null) => void
  currentLaneFilter?: string | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const LANE_COLORS = GLOBAL_LANE_COLORS

export function GoalCalendar({
  goals,
  onGoalClick,
  onLaneFilterChange,
  currentLaneFilter,
}: GoalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get days in current month
  const daysInMonth = useMemo(() => {
    const year = currentYear
    const month = currentMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []

    // Add padding for days before the 1st
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }

    // Add actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }

    // Add padding for remaining cells (6 rows of 7 = 42 cells)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }, [currentYear, currentMonth])

  // Get goals for a specific date
  const getGoalsForDate = (date: Date): Goal[] => {
    const dateStr = date.toISOString().split('T')[0]
    return goals.filter(goal => {
      if (!goal.due_date) return false
      return goal.due_date.startsWith(dateStr)
    })
  }

  // Check if date is in current month
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth
  }

  // Get lane color for a goal
  const getLaneColor = (laneName?: string): string => {
    if (!laneName) return '#64748b'
    return LANE_COLORS[laneName] || LANE_COLORS[laneName.split(' — ')[0]] || '#64748b'
  }

  // Filtered goals based on lane filter
  const filteredGoals = useMemo(() => {
    if (!currentLaneFilter) return goals
    return goals.filter(g =>
      g.lane_name === currentLaneFilter ||
      g.lane === currentLaneFilter
    )
  }, [goals, currentLaneFilter])

  // Group goals by date for stats
  const goalsWithDueDates = useMemo(() =>
    filteredGoals.filter(g => g.due_date), [filteredGoals]
  )

  const upcomingGoals = useMemo(() =>
    goalsWithDueDates
      .filter(g => new Date(g.due_date!) >= new Date())
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5), [goalsWithDueDates]
  )

  const overdueGoals = useMemo(() =>
    goalsWithDueDates
      .filter(g => new Date(g.due_date!) < new Date())
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()), [goalsWithDueDates]
  )

  return (
    <div style={containerStyle}>
      {/* Header with stats */}
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Goals Calendar</h2>
          <p style={subtitleStyle}>
            {goalsWithDueDates.length} goals with due dates
          </p>
        </div>
        <div style={statsRowStyle}>
          <div style={statCardStyle}>
            <div style={{ ...statValueStyle, color: '#f59e0b' }}>{overdueGoals.length}</div>
            <div style={statLabelStyle}>Overdue</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ ...statValueStyle, color: '#22c55e' }}>{upcomingGoals.length}</div>
            <div style={statLabelStyle}>Upcoming</div>
          </div>
        </div>
      </div>

      {/* Lane filter */}
      {onLaneFilterChange && (
        <div style={filterRowStyle}>
          <span style={filterLabelStyle}>Filter by lane:</span>
          <div style={filterButtonsStyle}>
            <button
              onClick={() => onLaneFilterChange(null)}
              style={{
                ...filterButtonStyle,
                ...(currentLaneFilter === null ? activeFilterStyle : {}),
              }}
            >
              All
            </button>
            {LANES.filter(l => l.id !== 'unassigned').map(lane => (
              <button
                key={lane.id}
                onClick={() => onLaneFilterChange(lane.name)}
                style={{
                  ...filterButtonStyle,
                  borderLeftColor: lane.color,
                  ...(currentLaneFilter === lane.name ? activeFilterStyle : {}),
                }}
              >
                {lane.icon} {lane.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar navigation */}
      <div style={calendarNavStyle}>
        <button onClick={prevMonth} style={navButtonStyle}>
          ← Prev
        </button>
        <h3 style={monthTitleStyle}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h3>
        <button onClick={goToToday} style={todayButtonStyle}>
          Today
        </button>
        <button onClick={nextMonth} style={navButtonStyle}>
          Next →
        </button>
      </div>

      {/* Calendar grid */}
      <div style={calendarGridStyle}>
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={dayHeaderStyle}>{day}</div>
        ))}

        {/* Calendar cells */}
        {daysInMonth.map((date, idx) => {
          const dayGoals = getGoalsForDate(date)
          const isToday = date.toDateString() === new Date().toDateString()
          const isPast = date < new Date() && date.getMonth() === currentMonth

          return (
            <div
              key={idx}
              style={{
                ...cellStyle,
                ...(!isCurrentMonth(date) ? otherMonthStyle : {}),
                ...(isToday ? todayStyle : {}),
              }}
            >
              <span style={{
                ...dayNumberStyle,
                ...(isPast ? pastDayStyle : {}),
              }}>
                {date.getDate()}
              </span>
              <div style={cellGoalsStyle}>
                {dayGoals.slice(0, 3).map(goal => (
                  <div
                    key={goal.id}
                    onClick={() => onGoalClick(goal.id)}
                    style={{
                      ...goalPillStyle,
                      backgroundColor: getLaneColor(goal.lane_name),
                    }}
                    title={goal.title}
                  >
                    <span style={goalTitleStyle}>{goal.title}</span>
                  </div>
                ))}
                {dayGoals.length > 3 && (
                  <span style={moreGoalsStyle}>+{dayGoals.length - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Side panel with upcoming/overdue */}
      <div style={sidePanelStyle}>
        {overdueGoals.length > 0 && (
          <div style={sectionStyle}>
            <h4 style={sectionTitleStyle}>Overdue</h4>
            <div style={sectionListStyle}>
              {overdueGoals.map(goal => (
                <div
                  key={goal.id}
                  onClick={() => onGoalClick(goal.id)}
                  style={listItemStyle}
                >
                  <div style={listItemTitleStyle}>{goal.title}</div>
                  <div style={listItemDateStyle}>
                    Due: {new Date(goal.due_date!).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Upcoming</h4>
          <div style={sectionListStyle}>
            {upcomingGoals.map(goal => (
              <div
                key={goal.id}
                onClick={() => onGoalClick(goal.id)}
                style={listItemStyle}
              >
                <div style={listItemTitleStyle}>{goal.title}</div>
                <div style={listItemDateStyle}>
                  {new Date(goal.due_date!).toLocaleDateString()}
                </div>
              </div>
            ))}
            {upcomingGoals.length === 0 && (
              <p style={emptyTextStyle}>No upcoming goals</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Styles
const containerStyle: React.CSSProperties = {
  padding: '24px',
  maxWidth: '1400px',
  margin: '0 auto',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1e293b',
  margin: 0,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  marginTop: '4px',
}

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
}

const statCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  padding: '12px 20px',
  textAlign: 'center',
  border: '1px solid #e2e8f0',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
}

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
}

const filterLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#64748b',
}

const filterButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
}

const filterButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  background: 'white',
  fontSize: '13px',
  cursor: 'pointer',
  borderLeftWidth: '3px',
}

const activeFilterStyle: React.CSSProperties = {
  background: '#f1f5f9',
  borderColor: '#6366f1',
}

const calendarNavStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  marginBottom: '16px',
}

const navButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  background: 'white',
  cursor: 'pointer',
  fontSize: '14px',
}

const todayButtonStyle: React.CSSProperties = {
  ...navButtonStyle,
  background: '#6366f1',
  color: 'white',
  border: 'none',
}

const monthTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  minWidth: '150px',
  textAlign: 'center',
}

const calendarGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '1px',
  background: '#e2e8f0',
  borderRadius: '8px',
  overflow: 'hidden',
}

const dayHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'center',
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  background: '#f8fafc',
}

const cellStyle: React.CSSProperties = {
  minHeight: '100px',
  padding: '8px',
  background: 'white',
}

const otherMonthStyle: React.CSSProperties = {
  background: '#f8fafc',
}

const todayStyle: React.CSSProperties = {
  background: '#eff6ff',
}

const dayNumberStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#1e293b',
  marginBottom: '4px',
}

const pastDayStyle: React.CSSProperties = {
  color: '#94a3b8',
}

const cellGoalsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const goalPillStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '11px',
  color: 'white',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const goalTitleStyle: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const moreGoalsStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  padding: '2px 6px',
}

const sidePanelStyle: React.CSSProperties = {
  marginTop: '24px',
  paddingTop: '24px',
  borderTop: '1px solid #e2e8f0',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '24px',
}

const sectionStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: '8px',
  padding: '16px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '12px',
}

const sectionListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const listItemStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'white',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  cursor: 'pointer',
}

const listItemTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#1e293b',
}

const listItemDateStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '4px',
}

const emptyTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#94a3b8',
  textAlign: 'center',
  padding: '12px',
}
