/**
 * TodayWidget - Daily Overview Dashboard Widget
 *
 * Shows:
 * - Today's events timeline with times
 * - Free time blocks highlighted
 * - Moon phase and energy context
 * - Quick actions for meetings
 *
 * For ACT Operations morning briefing
 * Connected to Command Center API via /api/calendar/today
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import { getMoonPhase, getMoonEnergySuggestion } from '../../utils/moonPhase'

interface TodayEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  type: string
  location?: string
  project_code?: string
  attendees?: Array<{ email: string; name?: string }>
  html_link?: string
  is_all_day?: boolean
}

interface FreeTimeBlock {
  start: string
  end: string
  duration_minutes: number
}

interface TodayData {
  date: string
  events: TodayEvent[]
  free_time_blocks: FreeTimeBlock[]
  total_meetings: number
  total_meeting_hours: number
  free_hours: number
}

export function TodayWidget() {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const moonPhase = getMoonPhase(new Date())
  const moonEnergy = getMoonEnergySuggestion(moonPhase)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.getCalendarToday()
      setData(result as TodayData)
      setError(null)
    } catch (err) {
      console.error('Error fetching today data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load today\'s schedule')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          <span className="text-sm text-slate-500">Loading today's schedule...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-sm text-red-600">{error}</div>
        <button
          onClick={fetchData}
          className="mt-2 text-xs text-emerald-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const today = new Date()
  const dayOfWeek = today.toLocaleDateString('en-AU', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const currentHour = today.getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'

  // Get next upcoming event
  const now = new Date()
  const upcomingEvents = data?.events.filter(e => new Date(e.start_time) > now) || []
  const nextEvent = upcomingEvents[0]

  // Get current/ongoing event
  const currentEvent = data?.events.find(e => {
    const start = new Date(e.start_time)
    const end = new Date(e.end_time)
    return now >= start && now <= end
  })

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header with greeting and moon */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-6 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-amber-600 font-medium">{dayOfWeek}</div>
            <h3 className="text-lg font-semibold text-slate-900">{greeting}</h3>
            <p className="text-sm text-slate-500">{dateStr}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl mb-1">{moonPhase.emoji}</div>
            <div className="text-xs text-violet-600">{moonPhase.name}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{data.total_meetings}</div>
            <div className="text-xs text-slate-500">meetings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{data.free_hours.toFixed(1)}h</div>
            <div className="text-xs text-slate-500">free time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.total_meeting_hours.toFixed(1)}h</div>
            <div className="text-xs text-slate-500">in meetings</div>
          </div>
        </div>
      )}

      {/* Current/Next Event Highlight */}
      {(currentEvent || nextEvent) && (
        <div className="px-6 py-4 border-b border-slate-100">
          {currentEvent ? (
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Now</span>
              </div>
              <div className="font-medium text-slate-900">{currentEvent.title}</div>
              <div className="text-sm text-slate-500 mt-1">
                {formatTime(currentEvent.start_time)} - {formatTime(currentEvent.end_time)}
                {currentEvent.location && ` • ${currentEvent.location}`}
              </div>
              {currentEvent.html_link && (
                <a
                  href={currentEvent.html_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:text-emerald-700"
                >
                  Open in Calendar →
                </a>
              )}
            </div>
          ) : nextEvent && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Up Next</span>
              </div>
              <div className="font-medium text-slate-900">{nextEvent.title}</div>
              <div className="text-sm text-slate-500 mt-1">
                {formatTime(nextEvent.start_time)}
                {nextEvent.location && ` • ${nextEvent.location}`}
              </div>
              {nextEvent.project_code && (
                <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {nextEvent.project_code}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {data && data.events.length > 0 && (
        <div className="px-6 py-4">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Today's Schedule</h4>
          <div className="space-y-2">
            {data.events.map((event, index) => {
              const isPast = new Date(event.end_time) < now
              const isCurrent = currentEvent?.id === event.id

              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-emerald-50 border border-emerald-200'
                      : isPast
                        ? 'opacity-50'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Time */}
                  <div className="flex-shrink-0 w-16 text-right">
                    <div className={`text-sm font-medium ${isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                      {formatTime(event.start_time)}
                    </div>
                  </div>

                  {/* Timeline dot */}
                  <div className="flex-shrink-0 mt-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      isCurrent ? 'bg-emerald-500' : isPast ? 'bg-slate-300' : 'bg-blue-400'
                    }`}></div>
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>
                      {event.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.project_code && (
                        <span className="text-xs text-violet-600">{event.project_code}</span>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Free Time Blocks */}
      {data && data.free_time_blocks.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <span className="text-emerald-500">✦</span>
            Focus Time Available
          </h4>
          <div className="space-y-2">
            {data.free_time_blocks.slice(0, 3).map((block, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100"
              >
                <div className="text-sm text-emerald-700">
                  {formatTime(block.start)} - {formatTime(block.end)}
                </div>
                <div className="text-xs font-medium text-emerald-600">
                  {block.duration_minutes >= 60
                    ? `${Math.floor(block.duration_minutes / 60)}h ${block.duration_minutes % 60}m`
                    : `${block.duration_minutes}m`
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moon Energy Suggestion */}
      <div className="px-6 py-4 bg-violet-50 border-t border-violet-100">
        <div className="flex items-start gap-3">
          <span className="text-xl">{moonPhase.emoji}</span>
          <div>
            <div className="text-xs font-medium text-violet-700 uppercase tracking-wider mb-1">
              Moon Energy
            </div>
            <div className="text-sm text-violet-800">{moonEnergy.activity}</div>
            <div className="text-xs text-violet-600 mt-1">
              <span className="bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded">LCAA</span>
              {' '}{moonEnergy.lcaaAlignment}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {data && data.events.length === 0 && (
        <div className="px-6 py-8 text-center">
          <div className="text-4xl mb-2">📆</div>
          <p className="text-sm text-slate-500">No meetings scheduled</p>
          <p className="text-xs text-slate-400 mt-1">
            Perfect day for deep work
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            via Command Center
          </span>
          <button
            onClick={fetchData}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

export default TodayWidget
