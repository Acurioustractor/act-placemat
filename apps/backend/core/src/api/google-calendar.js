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

export default router
