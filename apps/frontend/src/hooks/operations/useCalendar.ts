/**
 * useCalendar - Data fetching hook for calendar events
 *
 * Fetches calendar events from Google Calendar via backend.
 *
 * USAGE:
 *   const { events, calendars, stats, loading, error } = useCalendar({ days: 30 })
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import type { CalendarEvent, CalendarInfo, CalendarStats } from './types'

interface UseCalendarReturn {
  events: CalendarEvent[]
  calendars: CalendarInfo[]
  stats: CalendarStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch calendar events
 */
export function useCalendar(options: { limit?: number; days?: number } = {}): UseCalendarReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [stats, setStats] = useState<CalendarStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { limit = 100, days = 30 } = options

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)

      const [eventsResult, statsResult] = await Promise.allSettled([
        api.getCalendarEventsAll(days, limit),
        api.getCalendarStats(),
      ])

      if (eventsResult.status === 'fulfilled') {
        const result = eventsResult.value as any
        if (result?.success && result.events) {
          const mappedEvents: CalendarEvent[] = result.events.map((e: any) => ({
            id: e.id || e.google_event_id,
            title: e.title || 'Untitled Event',
            description: e.description,
            start_time: e.start_time,
            end_time: e.end_time,
            location: e.location,
            type: e.event_type || inferEventType(e),
            project: e.project_code || inferProjectFromEvent(e),
            attendees: e.attendees || [],
            calendar: {
              id: e.google_calendar_id,
              name: e.calendar_name,
              color: e.calendar_color,
            },
            google_event_id: e.google_event_id,
            project_code: e.project_code,
            detected_project_code: e.detected_project_code,
            manual_project_code: e.manual_project_code,
            event_type: e.event_type,
            is_all_day: e.is_all_day,
            organizer_email: e.organizer_email,
            attendee_contact_matches: e.attendee_contact_matches,
            html_link: e.html_link,
          }))
          setEvents(mappedEvents)

          // Extract unique calendars
          const uniqueCalendars = new Map<string, CalendarInfo>()
          result.events.forEach((e: any) => {
            if (e.google_calendar_id) {
              uniqueCalendars.set(e.google_calendar_id, {
                id: e.google_calendar_id,
                name: e.calendar_name || 'Primary',
                color: e.calendar_color,
              })
            }
          })
          setCalendars(Array.from(uniqueCalendars.values()))
        }
      }

      if (statsResult.status === 'fulfilled') {
        const result = statsResult.value as any
        if (result?.success) {
          setStats({
            total: result.total || 0,
            upcoming: result.upcoming || 0,
            today: result.today || 0,
            periodEvents: result.periodEvents || 0,
            periodHours: result.periodHours || 0,
            byType: result.byType || {},
            byProject: result.byProject || {},
          })
        }
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching calendar:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch calendar'
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('authentication')) {
        setError('Google Calendar needs re-authentication. Visit /api/google/auth')
      } else {
        setError(errorMessage)
      }
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [limit, days])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, calendars, stats, loading, error, refetch: fetchEvents }
}

// ============================================
// Today's Events
// ============================================

interface UseCalendarTodayReturn {
  events: CalendarEvent[]
  freeBlocks: Array<{ start: string; end: string; minutes: number }>
  totalFreeMinutes: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch today's events with free time blocks
 */
export function useCalendarToday(): UseCalendarTodayReturn {
  const [data, setData] = useState<{
    events: CalendarEvent[]
    freeBlocks: Array<{ start: string; end: string; minutes: number }>
    totalFreeMinutes: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.getCalendarToday() as any
      if (result?.success) {
        setData({
          events:
            result.events?.map((e: any) => ({
              id: e.id,
              title: e.title,
              description: e.description,
              start_time: e.start_time,
              end_time: e.end_time,
              location: e.location,
              type: e.event_type || 'event',
              project: e.project_code,
              attendees: e.attendees || [],
              is_all_day: e.is_all_day,
            })) || [],
          freeBlocks: result.freeBlocks || [],
          totalFreeMinutes: result.totalFreeMinutes || 0,
        })
      }
      setError(null)
    } catch (err) {
      console.error('Error fetching today events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch today events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  return {
    ...data,
    loading,
    error,
    refetch: fetchToday,
  } as UseCalendarTodayReturn
}

// Helper functions
function inferEventType(event: any): 'event' | 'deadline' | 'milestone' | 'gathering' {
  const title = (event.title || event.summary || '').toLowerCase()

  if (title.includes('deadline') || title.includes('due')) return 'deadline'
  if (title.includes('launch') || title.includes('release') || title.includes('milestone'))
    return 'milestone'
  if (
    title.includes('dinner') ||
    title.includes('gathering') ||
    title.includes('workshop') ||
    title.includes('community')
  )
    return 'gathering'
  return 'event'
}

function inferProjectFromEvent(event: any): string | undefined {
  const title = (event.title || event.summary || '').toLowerCase()

  if (title.includes('harvest')) return 'ACT-HV'
  if (title.includes('justice') || title.includes('justicehub')) return 'ACT-JH'
  if (title.includes('goods')) return 'ACT-GD'
  if (title.includes('empathy') || title.includes('el ')) return 'ACT-EL'
  if (title.includes('picc') || title.includes('palm island')) return 'ACT-PI'
  return undefined
}
