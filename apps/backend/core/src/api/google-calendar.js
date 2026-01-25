import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { optionalAuth } from '../middleware/auth.js'
import googleCalendarService from '../services/googleCalendarService.js'

const router = express.Router()

const calendarNotReadyResponse = () => ({
  success: false,
  error: 'calendar_not_authenticated',
  message: 'Google Calendar is not connected. Complete the OAuth flow to enable calendar insights.',
  timestamp: new Date().toISOString()
})

router.get(
  '/events',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      limit = '5',
      days = '14',
      calendarId = 'primary'
    } = req.query || {}

    try {
      const maxResults = Math.min(parseInt(String(limit), 10) || 5, 50)
      const windowDays = Math.max(parseInt(String(days), 10) || 14, 1)

      const timeMin = new Date()
      const timeMax = new Date(timeMin.getTime() + windowDays * 24 * 60 * 60 * 1000)

      const calendarData = await googleCalendarService.getEventsWithProjectOverlay({
        calendarId: String(calendarId),
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults
      })

      const events = (calendarData.events || []).map((event) => {
        const attendees = event.attendees || []
        const start = event.start?.dateTime || event.start?.date || null
        const end = event.end?.dateTime || event.end?.date || null

        return {
          id: event.id,
          title: event.summary || event.enhancedTitle || 'Untitled event',
          date: start,
          endDate: end,
          allDay: Boolean(event.start?.date && !event.start?.dateTime),
          location: event.location || null,
          attendees: attendees.map((person) => person.displayName || person.email).filter(Boolean),
          status: event.status,
          project: event.projectInfo || null,
          isProjectBlock: Boolean(event.isProjectBlock),
          description: event.description || null
        }
      })

      res.json({
        success: true,
        events,
        metadata: {
          calendarId,
          fetchedAt: new Date().toISOString(),
          suggestions: calendarData.aiSuggestions || [],
          freeTimeSlots: calendarData.freeTimeSlots || []
        }
      })
    } catch (error) {
      if (String(error.message || '').includes('not authenticated')) {
        return res.status(503).json(calendarNotReadyResponse())
      }

      console.error('Failed to load Google Calendar events:', error)
      res.status(500).json({
        success: false,
        error: 'calendar_fetch_failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
)

// List all available calendars
router.get(
  '/calendars',
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      const calendars = await googleCalendarService.getCalendars()

      res.json({
        success: true,
        count: calendars.length,
        calendars: calendars.map(cal => ({
          id: cal.id,
          summary: cal.summary,
          description: cal.description,
          primary: cal.primary || false,
          accessRole: cal.accessRole,
          backgroundColor: cal.backgroundColor,
          foregroundColor: cal.foregroundColor
        }))
      })
    } catch (error) {
      if (String(error.message || '').includes('not authenticated')) {
        return res.status(503).json(calendarNotReadyResponse())
      }

      console.error('Failed to list calendars:', error)
      res.status(500).json({
        success: false,
        error: 'calendar_list_failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
)

// Get events from multiple calendars
router.get(
  '/events/all',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { days = '30', limit = '100' } = req.query || {}

    try {
      const windowDays = Math.max(parseInt(String(days), 10) || 30, 1)
      const maxResults = Math.min(parseInt(String(limit), 10) || 100, 250)

      const timeMin = new Date()
      const timeMax = new Date(timeMin.getTime() + windowDays * 24 * 60 * 60 * 1000)

      // Get all calendars
      const calendars = await googleCalendarService.getCalendars()

      // Fetch events from each calendar
      const allEvents = []
      for (const cal of calendars) {
        try {
          const calendarData = await googleCalendarService.getEventsWithProjectOverlay({
            calendarId: cal.id,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: Math.floor(maxResults / calendars.length)
          })

          const events = (calendarData.events || []).map((event) => ({
            id: event.id,
            title: event.summary || 'Untitled event',
            date: event.start?.dateTime || event.start?.date || null,
            endDate: event.end?.dateTime || event.end?.date || null,
            allDay: Boolean(event.start?.date && !event.start?.dateTime),
            location: event.location || null,
            calendar: {
              id: cal.id,
              name: cal.summary,
              color: cal.backgroundColor
            },
            attendees: (event.attendees || []).map((person) => person.displayName || person.email).filter(Boolean),
            description: event.description || null
          }))

          allEvents.push(...events)
        } catch (calError) {
          console.warn(`Failed to fetch events from calendar ${cal.summary}:`, calError.message)
        }
      }

      // Sort by date
      allEvents.sort((a, b) => new Date(a.date) - new Date(b.date))

      res.json({
        success: true,
        count: allEvents.length,
        calendarsQueried: calendars.length,
        timeRange: {
          from: timeMin.toISOString(),
          to: timeMax.toISOString()
        },
        events: allEvents
      })
    } catch (error) {
      if (String(error.message || '').includes('not authenticated')) {
        return res.status(503).json(calendarNotReadyResponse())
      }

      console.error('Failed to fetch all calendar events:', error)
      res.status(500).json({
        success: false,
        error: 'calendar_fetch_failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
)

export default router
