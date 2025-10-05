import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { Card } from './ui/Card'

export function DashboardInsights() {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarError, setCalendarError] = useState<string | null>(null)

  useEffect(() => {
    loadInsights()
  }, [])

  const parseCalendarError = (errorObj?: Error) => {
    if (!errorObj) return 'Google Calendar is not connected.'
    const rawMessage = errorObj.message || ''

    try {
      const jsonMatch = rawMessage.match(/\{.*\}/s)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed?.message) return parsed.message
        if (parsed?.error === 'calendar_not_authenticated') {
          return 'Connect Google Calendar to surface upcoming meetings.'
        }
      }
    } catch (parseError) {
      // ignore JSON parse errors
    }

    if (rawMessage.toLowerCase().includes('not authenticated')) {
      return 'Connect Google Calendar to surface upcoming meetings.'
    }

    return rawMessage || 'Google Calendar is not connected.'
  }

  const loadInsights = async () => {
    try {
      setLoading(true)
      setError(null)

      const [calendar, projectData] = (await Promise.allSettled([
        api.getCalendarHighlights(3),
        api.getDashboardProjects(40)
      ])) as PromiseSettledResult<any>[]

      if (calendar.status === 'fulfilled') {
        setCalendarError(null)
        const calendarValue = (calendar.value as any) || {}
        const events = (calendarValue.events || calendarValue.results || []).filter((event: any) => {
          const title = String(event.title || '').trim().toLowerCase()
          return title && title !== 'home'
        })
        setCalendarEvents(events)
      } else {
        setCalendarEvents([])
        const reason = calendar.reason as Error | undefined
        setCalendarError(parseCalendarError(reason))
      }

      const projectResult = projectData

      if (projectResult.status === 'fulfilled') {
        const payload = projectResult.value
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.projects)
          ? payload.projects
          : []
        setProjects(list)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const projectSignals = useMemo(() => {
    if (!Array.isArray(projects) || projects.length === 0) {
      return {
        upcomingMilestones: 0,
        missingLeads: 0,
        recentUpdates: 0,
      }
    }

    const now = Date.now()
    const fourteenDays = 14 * 24 * 60 * 60 * 1000
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    let upcomingMilestones = 0
    let missingLeads = 0
    let recentUpdates = 0

    projects.forEach((project: any) => {
      const milestone = project.nextMilestoneDate || project.next_milestone_date
      if (milestone) {
        const time = new Date(milestone).getTime()
        if (!Number.isNaN(time) && time >= now && time <= now + fourteenDays) {
          upcomingMilestones += 1
        }
      }

      const hasLead = Boolean(project.projectLead?.name || project.lead)
      if (!hasLead) {
        missingLeads += 1
      }

      const lastEdited = project.notionLastEditedAt || project.updatedAt || project.lastUpdated
      if (lastEdited) {
        const time = new Date(lastEdited).getTime()
        if (!Number.isNaN(time) && now - time <= sevenDays) {
          recentUpdates += 1
        }
      }
    })

    return {
      upcomingMilestones,
      missingLeads,
      recentUpdates,
    }
  }, [projects])

  const formatDate = (value?: string | null) => {
    if (!value) return 'TBC'
    const date = new Date(value)
    const includeTime = value.includes('T')
    const datePart = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    if (!includeTime) return datePart
    const timePart = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${datePart} · ${timePart}`
  }

  const calendarMessage = () => {
    if (calendarError) {
      if (calendarError.toLowerCase().includes('calendar_not_authenticated')) {
        return 'Connect Google Calendar to surface upcoming meetings.'
      }
      return calendarError
    }
    return 'No events scheduled.'
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center" padding="md">
        <p className="text-sm text-clay-500">Loading community insights…</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-100 bg-red-50 text-red-700" padding="md">
        <div className="flex items-center justify-between">
          <p className="text-sm">{error}</p>
          <button
            onClick={loadInsights}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card padding="md">
        <h3 className="text-lg font-semibold text-clay-900">Upcoming calendar</h3>
        <p className="mt-1 text-sm text-clay-500">Key meetings and events from Google Calendar.</p>
        {calendarEvents.length === 0 ? (
          <p className="mt-4 text-sm text-clay-500">{calendarMessage()}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {calendarEvents.map((event) => (
              <li key={event.id} className="rounded-lg border border-clay-100 bg-clay-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-clay-900">{event.title || 'Untitled Event'}</span>
                  <span className="text-xs text-clay-500">{formatDate(event.date)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-clay-500">
                  {event.location && <span>{event.location}</span>}
                  {event.project?.name && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 font-medium text-brand-800">
                      {event.project.name}
                    </span>
                  )}
                </div>
                {event.attendees?.length > 0 && (
                  <p className="mt-2 text-xs text-clay-500">
                    With {event.attendees.slice(0, 3).join(', ')}
                    {event.attendees.length > 3 && '…'}
                  </p>
                )}
                {event.description && (
                  <p className="mt-2 text-xs text-clay-500 line-clamp-3">{event.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padding="md">
        <h3 className="text-lg font-semibold text-clay-900">Today’s signals</h3>
        <p className="mt-1 text-sm text-clay-500">Notion project signals highlighting where coordination is needed.</p>
        {projects.length > 0 ? (
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
              <span className="text-clay-500">Milestones next 14 days</span>
              <span className="text-lg font-semibold text-brand-700">{projectSignals.upcomingMilestones}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
              <span className="text-clay-500">Projects missing lead</span>
              <span className="text-lg font-semibold text-ocean-700">{projectSignals.missingLeads}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-clay-100 bg-clay-50 p-3">
              <span className="text-clay-500">Notion updates last 7 days</span>
              <span className="text-lg font-semibold text-clay-900">{projectSignals.recentUpdates}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-4 text-sm text-clay-500">Projects will appear once Notion sync completes.</p>
        )}
      </Card>
    </div>
  )
}
