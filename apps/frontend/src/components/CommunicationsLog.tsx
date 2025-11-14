import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import type {
  CalendarMeetingCommunication,
  CommunicationLogResponse,
  CommunicationTimelineEntry,
  GmailCommunicationEntry,
  ProjectCommunicationInfo,
} from '../services/api'

const TIME_WINDOWS = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 },
]

const LIMIT_OPTIONS = [15, 30, 50]

const TYPE_STYLES: Record<CommunicationTimelineEntry['type'], { icon: string; chip: string; accent: string }> = {
  email: {
    icon: '📧',
    chip: 'bg-ocean-50 text-ocean-700 border border-ocean-100',
    accent: 'text-ocean-600',
  },
  meeting: {
    icon: '📅',
    chip: 'bg-brand-50 text-brand-700 border border-brand-100',
    accent: 'text-brand-600',
  },
}

export function CommunicationsLog() {
  const [data, setData] = useState<CommunicationLogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [days, setDays] = useState<number>(60)
  const [limit, setLimit] = useState<number>(30)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadCommunications = async () => {
      try {
        setLoading(true)
        const response = await api.getProjectCommunications({
          projectId: selectedProject === 'all' ? undefined : selectedProject,
          days,
          limit,
        })

        if (!isMounted) return

        if (!response.success) {
          throw new Error('Backend returned an error')
        }

        setData(response)
        setError(null)
        setLastUpdated(new Date().toISOString())
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load communications intelligence', err)
        setError('Failed to load communications intelligence')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadCommunications()

    return () => {
      isMounted = false
    }
  }, [selectedProject, days, limit, refreshNonce])

  const projectOptions = useMemo(() => {
    if (!data?.projects) return []
    return Object.values(data.projects).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [data?.projects])

  const timeline = data?.timeline || []
  const gmailMessages = data?.emails || []
  const meetings = data?.meetings || []
  const stats = data?.stats

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-clay-500">Loading communications intelligence…</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  const windowLabel = stats?.windowStart ? formatExactDate(stats.windowStart) : 'all available history'

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">Communications Intelligence</p>
        <h1 className="text-3xl font-bold text-clay-900">Gmail & Calendar Activity Map</h1>
        <p className="text-clay-600">
          We analyse synced Gmail messages and Google Calendar meetings to surface relationship energy behind each project.
          Filter by project or timeframe to inspect the evidence that powers the business analysis engine.
        </p>
      </header>

      <div className="bg-white border border-clay-200 rounded-3xl p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-clay-500">Current filters</p>
            <p className="text-lg font-semibold text-clay-900">
              {selectedProject === 'all' ? 'All linked projects' : data?.projects?.[selectedProject]?.name || 'Selected project'} · {TIME_WINDOWS.find(t => t.value === days)?.label || `${days} days`} · showing {limit} latest entries
            </p>
            <p className="text-sm text-clay-500">Evidence window starts {windowLabel}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-2xl border border-clay-200 px-4 py-2 text-sm font-medium text-clay-700 bg-clay-50"
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
            >
              <option value="all">All projects</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name || project.id}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-clay-200 px-4 py-2 text-sm font-medium text-clay-700 bg-clay-50"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {TIME_WINDOWS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-clay-200 px-4 py-2 text-sm font-medium text-clay-700 bg-clay-50"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              {LIMIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  Top {value}
                </option>
              ))}
            </select>
            <button
              className="rounded-2xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition"
              onClick={() => setRefreshNonce((prev) => prev + 1)}
            >
              Refresh data
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-clay-500">
          <span>Last refreshed {lastUpdated ? formatRelativeTime(lastUpdated) : 'just now'}</span>
          <span>Gmail messages analysed: {stats?.emailCount ?? 0}</span>
          <span>Calendar meetings analysed: {stats?.meetingCount ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-clay-200 shadow-soft">
            <div className="border-b border-clay-100 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ocean-600">Communications timeline</p>
                <p className="text-sm text-clay-500">Every synced Gmail conversation and calendar meeting mapped to ACT projects</p>
              </div>
              <span className="text-sm font-semibold text-clay-500">{timeline.length} entries</span>
            </div>
            <div className="divide-y divide-clay-100">
              {timeline.length === 0 ? (
                <div className="px-6 py-12 text-center text-clay-500 text-sm">No linked Gmail or Calendar activity in this window.</div>
              ) : (
                timeline.map((entry) => <TimelineRow key={`${entry.type}-${entry.id}`} entry={entry} projects={data?.projects || {}} />)
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <GmailPanel messages={gmailMessages} projects={data?.projects || {}} />
          <CalendarPanel meetings={meetings} projects={data?.projects || {}} />
        </div>
      </div>
    </div>
  )
}

function TimelineRow({ entry, projects }: { entry: CommunicationTimelineEntry; projects: Record<string, ProjectCommunicationInfo> }) {
  const meta = TYPE_STYLES[entry.type]
  return (
    <div className="px-6 py-4 flex gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${meta.chip}`}>{meta.icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-clay-900">{entry.title}</p>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${meta.chip}`}>{entry.type === 'email' ? 'Gmail' : 'Calendar'}</span>
          {entry.followUpRequired && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Follow-up needed</span>
          )}
        </div>
        <p className="text-sm text-clay-500">
          {formatExactDate(entry.occurredAt)} · {entry.participants.slice(0, 3).join(', ') || 'Unknown participants'}
        </p>
        {entry.summary && <p className="text-sm text-clay-700">{entry.summary}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          {entry.projects.length === 0 ? (
            <span className="text-xs text-clay-400">No project linked yet</span>
          ) : (
            entry.projects.map((projectId) => <ProjectChip key={projectId} projectId={projectId} project={projects[projectId]} />)
          )}
        </div>
      </div>
    </div>
  )
}

function GmailPanel({ messages, projects }: { messages: GmailCommunicationEntry[]; projects: Record<string, ProjectCommunicationInfo> }) {
  return (
    <div className="bg-white rounded-3xl border border-clay-200 shadow-soft">
      <div className="border-b border-clay-100 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ocean-600">Gmail evidence</p>
          <p className="text-sm text-clay-500">Recent messages powering the needs + direction engines</p>
        </div>
        <span className="text-sm font-semibold text-clay-500">{messages.length}</span>
      </div>
      <div className="divide-y divide-clay-50">
        {messages.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-clay-500">No Gmail messages linked to projects in this window.</div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="px-6 py-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-clay-900">{message.subject || 'No subject'}</p>
                <span className="text-xs text-clay-500">{formatRelativeTime(message.sent_date || message.received_date)}</span>
              </div>
              <p className="text-sm text-clay-500">From {message.from_name || message.from_email || 'Unknown sender'}</p>
              <p className="text-sm text-clay-700">
                {message.ai_summary || message.snippet || 'AI analysis pending – sync completed but no summary stored yet.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {(message.projects_mentioned || []).map((projectId) => (
                  <ProjectChip key={projectId} projectId={projectId} project={projects[projectId]} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CalendarPanel({ meetings, projects }: { meetings: CalendarMeetingCommunication[]; projects: Record<string, ProjectCommunicationInfo> }) {
  return (
    <div className="bg-white rounded-3xl border border-clay-200 shadow-soft">
      <div className="border-b border-clay-100 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">Calendar evidence</p>
          <p className="text-sm text-clay-500">Upcoming and recent meetings linked to ACT projects</p>
        </div>
        <span className="text-sm font-semibold text-clay-500">{meetings.length}</span>
      </div>
      <div className="divide-y divide-clay-50">
        {meetings.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-clay-500">No meetings linked to projects in this window.</div>
        ) : (
          meetings.map((meeting) => (
            <div key={meeting.id} className="px-6 py-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-clay-900">{meeting.title || 'Untitled meeting'}</p>
                <span className="text-xs text-clay-500">{formatRelativeTime(meeting.start_time)}</span>
              </div>
              <p className="text-sm text-clay-500">
                {meeting.location ? `${meeting.location} · ` : ''}
                {formatExactDate(meeting.start_time)} ({meeting.duration_minutes ? `${meeting.duration_minutes} min` : 'duration unknown'})
              </p>
              <p className="text-sm text-clay-700">
                {meeting.ai_summary || meeting.description || 'Meeting synced – intelligence summary pending.'}
              </p>
              <p className="text-xs text-clay-500">
                Attendees: {formatAttendees(meeting.attendees || [])}
              </p>
              <div className="flex flex-wrap gap-2">
                {(meeting.mentioned_projects || []).map((projectId) => (
                  <ProjectChip key={projectId} projectId={projectId} project={projects[projectId]} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ProjectChip({ projectId, project }: { projectId: string; project?: ProjectCommunicationInfo }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-clay-200 bg-clay-50 px-3 py-1 text-xs font-semibold text-clay-700">
      <span className="text-clay-400">#</span>
      {project?.name || projectId}
    </span>
  )
}

function formatExactDate(value?: string | null) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / (1000 * 60))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function formatAttendees(attendees: CalendarMeetingCommunication['attendees']) {
  if (!attendees || attendees.length === 0) return 'Unknown'
  const names = attendees
    .map((attendee) => attendee?.displayName || attendee?.name || attendee?.email)
    .filter(Boolean) as string[]
  if (names.length === 0) return 'Unknown'
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`
}
