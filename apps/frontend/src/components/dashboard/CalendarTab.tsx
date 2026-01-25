/**
 * Calendar Tab - Event Management Dashboard
 *
 * Displays calendar events from port 3456:
 * - Today's events
 * - Upcoming events
 * - Event summary by type
 * - Deadlines and tasks
 */

import { useState, useEffect } from 'react'
import { resolveCommandCenterUrl } from '../../config/env'

interface CalendarEvent {
  id: string
  title: string
  description: string
  start: string
  end: string
  type: 'meeting' | 'deadline' | 'task' | 'other'
  attendees: string[]
  location: string
  status: 'confirmed' | 'tentative' | 'cancelled'
}

interface CalendarSummary {
  today: number
  this_week: number
  this_month: number
  meetings: number
  deadlines: number
  tasks: number
}

interface CalendarData {
  events: CalendarEvent[]
  summary: CalendarSummary
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

const getTypeColor = (type: string) => {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    'meeting': { bg: '#dbeafe', text: '#2563eb', icon: '👥' },
    'deadline': { bg: '#fee2e2', text: '#dc2626', icon: '🚨' },
    'task': { bg: '#fef3c7', text: '#d97706', icon: '✅' },
    'other': { bg: '#f3f4f6', text: '#6b7280', icon: '📅' }
  }
  return colors[type] || colors.other
}

const getDuration = (start: string, end: string) => {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  const durationMinutes = Math.round((endTime - startTime) / 60000)

  if (durationMinutes < 60) {
    return `${durationMinutes}m`
  } else {
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
}

export function CalendarTab() {
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'meeting' | 'deadline' | 'task'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(resolveCommandCenterUrl('/api/calendar/events'))
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (err) {
        console.error('Error fetching calendar:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '20px' }}>Calendar</h1>
        <p style={{ color: '#666' }}>Loading events...</p>
      </div>
    )
  }

  const filteredEvents = data?.events?.filter(e => {
    if (filter === 'all') return true
    return e.type === filter
  }) || []

  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  // Group events by date
  const eventsByDate = sortedEvents.reduce((acc, event) => {
    const date = formatDate(event.start)
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>📅</span> Calendar
          </h1>
          <p style={{ color: '#666' }}>Manage your schedule and deadlines</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'meeting', 'deadline', 'task'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: filter === f ? '#2563eb' : '#f3f4f6',
                color: filter === f ? 'white' : '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb' }}>{data?.summary?.today || 0}</p>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Today</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>{data?.summary?.this_week || 0}</p>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>This Week</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#059669' }}>{data?.summary?.this_month || 0}</p>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>This Month</p>
        </div>
        <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '16px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb' }}>{data?.summary?.meetings || 0}</p>
          <p style={{ fontSize: '12px', color: '#1e40af' }}>Meetings</p>
        </div>
        <div style={{ background: '#fee2e2', borderRadius: '12px', padding: '16px', border: '1px solid '#fecaca', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{data?.summary?.deadlines || 0}</p>
          <p style={{ fontSize: '12px', color: '#991b1b' }}>Deadlines</p>
        </div>
        <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '16px', border: '1px solid #fde68a', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#d97706' }}>{data?.summary?.tasks || 0}</p>
          <p style={{ fontSize: '12px', color: '#92400e' }}>Tasks</p>
        </div>
      </div>

      {/* Events by Date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {Object.entries(eventsByDate).map(([date, events]) => (
          <div key={date}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#f3f4f6',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {date}
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events.map(event => {
                const typeColors = getTypeColor(event.type)
                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '16px',
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      borderLeft: `4px solid ${typeColors.text}`
                    }}
                  >
                    {/* Time */}
                    <div style={{ minWidth: '80px', textAlign: 'right' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{formatTime(event.start)}</p>
                      <p style={{ fontSize: '12px', color: '#9ca3af' }}>{getDuration(event.start, event.end)}</p>
                    </div>

                    {/* Event Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>{typeColors.icon}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          background: typeColors.bg,
                          color: typeColors.text
                        }}>
                          {event.type}
                        </span>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>{event.title}</h3>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{event.description}</p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                        {event.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📍 {event.location}
                          </span>
                        )}
                        {event.attendees.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            👥 {event.attendees.slice(0, 2).join(', ')}{event.attendees.length > 2 && ` +${event.attendees.length - 2}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: event.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                        color: event.status === 'confirmed' ? '#16a34a' : '#d97706',
                        textTransform: 'capitalize'
                      }}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {sortedEvents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
          <p>No events found</p>
        </div>
      )}
    </div>
  )
}

export default CalendarTab
