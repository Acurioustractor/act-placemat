import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { Card } from './ui/Card'
import { SectionHeader } from './ui/SectionHeader'
import { EmptyState } from './ui/EmptyState'

interface OutreachTask {
  id: string
  contact_id: string
  project_id: string
  project_name?: string | null
  contact_name?: string | null
  status: string
  priority?: string | null
  recommended_channel?: string | null
  scheduled_at?: string | null
  completed_at?: string | null
  owner?: string | null
  ai_brief?: unknown
  draft_message?: string | null
  response_status?: string | null
  response_notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface SupporterRecommendation {
  id?: number | string | null
  name?: string | null
  company?: string | null
  position?: string | null
  linkedinUrl?: string | null
  matchReasons?: string[]
  alignmentScore?: number | null
  strategicValue?: string | null
  relationshipScore?: number | null
  cadence?: {
    activeSources?: string[]
    totalTouchpoints?: number
    lastInteractionDate?: string | null
    interactionsLast30Days?: number
    interactionsLast90Days?: number
    daysSinceLastInteraction?: number | null
  } | null
  insights?: {
    highlights?: string[]
    lastPostTitle?: string | null
    lastPostUrl?: string | null
    lastPostPublishedAt?: string | null
  } | null
}

interface ProjectIntelligenceResponse {
  supporters: SupporterRecommendation[]
  aiBrief: string
}

interface ProjectSupportOption {
  project_id: string
  project_name: string
}

interface TaskFormState {
  projectId: string
  projectName: string
  contactId: string
  contactName: string
  priority: string
  recommendedChannel: string
  owner: string
  scheduledAt: string
  draftMessage: string
  aiBrief: string
}

const defaultFormState: TaskFormState = {
  projectId: '',
  projectName: '',
  contactId: '',
  contactName: '',
  priority: 'medium',
  recommendedChannel: 'email',
  owner: '',
  scheduledAt: '',
  draftMessage: '',
  aiBrief: ''
}

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'skipped', label: 'Skipped' }
]

const PRIORITY_OPTIONS = ['urgent', 'high', 'medium', 'low']
const CHANNEL_OPTIONS = ['email', 'call', 'meeting', 'linkedin']

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  } catch {
    return value
  }
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export interface TaskDefaults {
  projectId?: string
  projectName?: string
  contactId?: string
  contactName?: string
}

interface OutreachTasksProps {
  initialCreateDefaults?: TaskDefaults | null
  onClearInitialCreateDefaults?: () => void
}

export function OutreachTasks({ initialCreateDefaults = null, onClearInitialCreateDefaults }: OutreachTasksProps = {}) {
  const [tasks, setTasks] = useState<OutreachTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('draft')
  const [ownerDraft, setOwnerDraft] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formState, setFormState] = useState<TaskFormState>(defaultFormState)
  const [editingTask, setEditingTask] = useState<OutreachTask | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [markingTaskId, setMarkingTaskId] = useState<string | null>(null)
  const [supporterOptions, setSupporterOptions] = useState<SupporterRecommendation[]>([])
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelError, setIntelError] = useState<string | null>(null)
  const [aiBriefDirty, setAiBriefDirty] = useState(false)
  const [projectOptions, setProjectOptions] = useState<ProjectSupportOption[]>([])

  useEffect(() => {
    loadTasks()
  }, [statusFilter, ownerFilter])

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = (await api.getProjectSupport(200)) as ProjectSupportOption[]
        setProjectOptions(data || [])
      } catch (error) {
        console.error('Failed to load project options for outreach form', error)
      }
    }
    loadProjects()
  }, [])

  useEffect(() => {
    if (initialCreateDefaults?.projectId) {
      openCreateForm(initialCreateDefaults)
      onClearInitialCreateDefaults?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCreateDefaults?.projectId])

  const overdueTasks = useMemo(() => {
    const now = Date.now()
    return tasks.filter((task) => {
      if (!task.scheduled_at) return false
      if (task.status === 'completed' || task.status === 'skipped') return false
      return new Date(task.scheduled_at).getTime() < now
    })
  }, [tasks])

  const statusCounts = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      const key = task.status || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [tasks])

  async function loadTasks() {
    try {
      setLoading(true)
      setError(null)
      const params: { status?: string; owner?: string } = {}
      if (statusFilter) params.status = statusFilter
      if (ownerFilter) params.owner = ownerFilter
      const response = (await api.getOutreachTasks(params)) as OutreachTask[]
      setTasks(Array.isArray(response) ? response : [])
    } catch (err) {
      setError('Failed to load outreach tasks. Make sure the backend is running on port 4000.')
      console.error('Failed to load outreach tasks', err)
    } finally {
      setLoading(false)
    }
  }

  const loadProjectIntelligence = async (projectId: string, preserveBrief: boolean) => {
    if (!projectId) {
      setSupporterOptions([])
      return
    }

    try {
      setIntelLoading(true)
      setIntelError(null)
      const intel = (await api.getProjectIntelligence(projectId)) as ProjectIntelligenceResponse
      setSupporterOptions(intel.supporters || [])
      if (!preserveBrief) {
        setFormState((prev) => ({ ...prev, aiBrief: intel.aiBrief || '' }))
        setAiBriefDirty(false)
      }
    } catch (err) {
      console.error('Failed to load project intelligence for form', err)
      setIntelError('Failed to load project intelligence for this project')
    } finally {
      setIntelLoading(false)
    }
  }

  const openCreateForm = (defaults?: Partial<TaskFormState>) => {
    setEditingTask(null)
    setFormState({
      ...defaultFormState,
      owner: ownerFilter || ownerDraft || 'ben',
      ...defaults
    })
    setAiBriefDirty(false)
    setIsFormOpen(true)
    if (defaults?.projectId) {
      const project = projectOptions.find((option) => option.project_id === defaults.projectId)
      if (project) {
        setFormState((prev) => ({ ...prev, projectName: project.project_name }))
      }
      void loadProjectIntelligence(defaults.projectId, !!defaults?.aiBrief)
    } else {
      setSupporterOptions([])
    }
  }

  const openEditForm = (task: OutreachTask) => {
    setEditingTask(task)
    setFormState({
      projectId: task.project_id,
      projectName: task.project_name || '',
      contactId: task.contact_id,
      contactName: task.contact_name || '',
      priority: task.priority || 'medium',
      recommendedChannel: task.recommended_channel || 'email',
      owner: task.owner || '',
      scheduledAt: toDateTimeLocal(task.scheduled_at),
      draftMessage: task.draft_message || '',
      aiBrief: typeof task.ai_brief === 'string' ? task.ai_brief : task.ai_brief ? JSON.stringify(task.ai_brief, null, 2) : '',
    })
    setAiBriefDirty(true)
    setIsFormOpen(true)
    void loadProjectIntelligence(task.project_id, true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingTask(null)
    setFormState(defaultFormState)
    setSupporterOptions([])
    setAiBriefDirty(false)
    setIntelError(null)
  }

  const handleFormChange = (field: keyof TaskFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    if (field === 'aiBrief') {
      setAiBriefDirty(true)
    }
  }

  const handleProjectChange = (projectId: string) => {
    const project = projectOptions.find((option) => option.project_id === projectId)
    setFormState((prev) => ({
      ...prev,
      projectId,
      projectName: project?.project_name || ''
    }))
    setAiBriefDirty(false)
    void loadProjectIntelligence(projectId, false)
  }

  const selectSupporter = (contactId: string) => {
    const supporter = supporterOptions.find((support) => String(support.id ?? '') === contactId)
    handleFormChange('contactId', contactId)
    handleFormChange('contactName', supporter?.name || '')
  }

  const regenerateBrief = () => {
    if (!formState.projectId) return
    if (aiBriefDirty && !window.confirm('Replace your edits with a new AI brief generated from the latest intelligence?')) {
      return
    }
    void loadProjectIntelligence(formState.projectId, false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formState.projectId) {
      alert('Select a project to continue')
      return
    }
    if (!formState.contactId && !formState.contactName) {
      alert('Select or enter a contact to continue')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        contactId: formState.contactId || formState.contactName,
        projectId: formState.projectId,
        projectName: formState.projectName,
        contactName: formState.contactName,
        priority: formState.priority,
        recommendedChannel: formState.recommendedChannel,
        owner: formState.owner,
        scheduledAt: formState.scheduledAt ? new Date(formState.scheduledAt).toISOString() : null,
        draftMessage: formState.draftMessage || null,
        aiBrief: formState.aiBrief ? formState.aiBrief : null,
      }

      if (editingTask) {
        await api.updateOutreachTask(editingTask.id, payload)
      } else {
        await api.createOutreachTask(payload as any)
      }

      await loadTasks()
      closeForm()
    } catch (err) {
      console.error('Failed to save outreach task', err)
      alert('Could not save the outreach task. Check the console for details.')
    } finally {
      setSubmitting(false)
    }
  }

  const markCompleted = async (task: OutreachTask) => {
    try {
      setMarkingTaskId(task.id)
      await api.updateOutreachTask(task.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      })
      await loadTasks()
    } catch (err) {
      console.error('Failed to mark task complete', err)
      alert('Could not update the task. Check the console for details.')
    } finally {
      setMarkingTaskId(null)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Relationship Operations"
        title="Outreach Task Pipeline"
        description="Manage outreach actions, track follow-up progress, and close the loop with supporters."
      />

      <Card padding="md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setStatusFilter(option.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  statusFilter === option.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-clay-100 text-clay-600 hover:bg-clay-200'
                }`}
              >
                {option.label}
                {statusCounts[option.id] && statusFilter === option.id ? ` (${statusCounts[option.id]})` : ''}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-clay-500">Owner</label>
              <input
                value={ownerDraft}
                onChange={(event) => setOwnerDraft(event.target.value)}
                placeholder="me"
                className="rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                onClick={() => setOwnerFilter(ownerDraft.trim())}
                className="rounded-lg bg-clay-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-clay-700"
              >
                Apply
              </button>
            </div>
            <button
              onClick={loadTasks}
              className="rounded-lg border border-clay-200 px-3 py-2 text-sm font-medium text-clay-600 transition hover:bg-clay-100"
            >
              Refresh
            </button>
            <button
              onClick={() => openCreateForm()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              New outreach
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-brand-100 bg-brand-50/70 text-brand-800" padding="sm">
          <p className="text-sm font-medium">Active pipeline</p>
          <p className="mt-1 text-2xl font-semibold">{tasks.length}</p>
          <p className="mt-2 text-sm">Total tasks returned with the current filters.</p>
        </Card>
        <Card className="border-sunshine-100 bg-sunshine-50/70 text-sunshine-900" padding="sm">
          <p className="text-sm font-medium">Overdue</p>
          <p className="mt-1 text-2xl font-semibold">{overdueTasks.length}</p>
          <p className="mt-2 text-sm">Scheduled in the past and still incomplete.</p>
        </Card>
        <Card className="border-ocean-100 bg-ocean-50/70 text-ocean-900" padding="sm">
          <p className="text-sm font-medium">Completed</p>
          <p className="mt-1 text-2xl font-semibold">{statusCounts['completed'] || 0}</p>
          <p className="mt-2 text-sm">Tasks finished within the current filter window.</p>
        </Card>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center" padding="lg">
          <div className="flex flex-col items-center gap-3 text-clay-500">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-transparent" />
            <p>Loading outreach tasks…</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="border-red-100 bg-red-50 text-red-700" padding="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Could not load tasks</h3>
              <p className="mt-1 text-sm">{error}</p>
            </div>
            <button
              onClick={loadTasks}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No outreach tasks yet"
          description="Use “New outreach” to link a supporter to a project."
          actionLabel="Create outreach task"
          onAction={() => openCreateForm()}
        />
      ) : (
        <Card padding="0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-clay-200 text-sm">
              <thead className="bg-clay-50 text-xs uppercase tracking-wide text-clay-500">
                <tr>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Supporter</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Scheduled</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-clay-100 bg-white">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-medium text-clay-900">{task.project_name || 'Unnamed project'}</p>
                        <p className="text-xs text-clay-500">{task.status}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-medium text-clay-900">{task.contact_name || task.contact_id}</p>
                        {task.draft_message ? (
                          <p className="text-xs text-clay-500 line-clamp-2">{task.draft_message}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{task.priority || 'medium'}</td>
                    <td className="px-4 py-3 capitalize">{task.recommended_channel || 'email'}</td>
                    <td className="px-4 py-3">{task.owner || '—'}</td>
                    <td className="px-4 py-3 text-sm text-clay-600">{task.scheduled_at ? formatDate(task.scheduled_at) : 'Not scheduled'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditForm(task)}
                          className="rounded-lg border border-clay-200 px-3 py-1.5 text-xs font-medium text-clay-600 transition hover:bg-clay-100"
                        >
                          Edit
                        </button>
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => markCompleted(task)}
                            disabled={markingTaskId === task.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-400"
                          >
                            {markingTaskId === task.id ? 'Saving…' : 'Complete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-clay-900/60 p-4 backdrop-blur-sm">
          <div className="relative h-full w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between border-b border-clay-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-semibold text-clay-900">
                    {editingTask ? 'Edit outreach task' : 'Create outreach task'}
                  </h2>
                  <p className="mt-1 text-sm text-clay-500">Link a supporter to a project and capture how you’ll engage them.</p>
                </div>
                <button
                  onClick={closeForm}
                  className="text-clay-400 transition hover:text-clay-600"
                  aria-label="Close outreach form"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-clay-700">Project</label>
                      <select
                        value={formState.projectId}
                        onChange={(event) => handleProjectChange(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      >
                        <option value="">Select a project…</option>
                        {projectOptions.map((project) => (
                          <option key={project.project_id} value={project.project_id}>
                            {project.project_name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-clay-500">Choose a project to pull the latest supporter intelligence.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-clay-700">Recommended supporter</label>
                        <select
                          value={formState.contactId}
                          onChange={(event) => selectSupporter(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          disabled={!supporterOptions.length}
                        >
                          <option value="">
                            {supporterOptions.length > 0
                              ? 'Select from recommendations…'
                              : intelLoading
                                ? 'Loading supporters…'
                                : 'No supporters loaded yet'}
                          </option>
                          {supporterOptions.map((supporter) => {
                            const optionValue = supporter.id ?? supporter.name ?? ''
                            return (
                              <option key={`${supporter.id ?? supporter.name ?? Math.random()}`} value={String(optionValue)}>
                                {supporter.name || 'Unnamed contact'}
                                {supporter.company ? ` • ${supporter.company}` : ''}
                              </option>
                            )
                          })}
                        </select>
                        {intelError ? (
                          <p className="mt-1 text-xs text-rose-600">{intelError}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-clay-700">Contact name (override)</label>
                        <input
                          value={formState.contactName}
                          onChange={(event) => handleFormChange('contactName', event.target.value)}
                          placeholder="Name or email of the person you'll contact"
                          className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                        <p className="mt-1 text-xs text-clay-500">Use this field if you want to reach someone who isn’t in the recommendation list yet.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-clay-700">Priority</label>
                        <select
                          value={formState.priority}
                          onChange={(event) => handleFormChange('priority', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        >
                          {PRIORITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-clay-700">Channel</label>
                        <select
                          value={formState.recommendedChannel}
                          onChange={(event) => handleFormChange('recommendedChannel', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        >
                          {CHANNEL_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-clay-700">Owner</label>
                        <input
                          value={formState.owner}
                          onChange={(event) => handleFormChange('owner', event.target.value)}
                          placeholder="Who will do the outreach?"
                          className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-clay-700">Scheduled for</label>
                        <input
                          type="datetime-local"
                          value={formState.scheduledAt}
                          onChange={(event) => handleFormChange('scheduledAt', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-clay-700">Draft message / notes</label>
                      <textarea
                        value={formState.draftMessage}
                        onChange={(event) => handleFormChange('draftMessage', event.target.value)}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        placeholder="Key points, links, or framing for this outreach"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-clay-700">AI brief</label>
                        {formState.projectId ? (
                          <button
                            type="button"
                            onClick={regenerateBrief}
                            className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
                          >
                            Regenerate
                          </button>
                        ) : null}
                      </div>
                      <textarea
                        value={formState.aiBrief}
                        onChange={(event) => handleFormChange('aiBrief', event.target.value)}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        placeholder="Auto-generated outreach context"
                      />
                      {aiBriefDirty ? (
                        <p className="mt-1 text-xs text-sunshine-700">You’ve adjusted this brief. Regenerating will overwrite your changes.</p>
                      ) : null}
                    </div>

                    {supporterOptions.length > 0 ? (
                      <Card padding="md" className="bg-brand-50/40">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Recommended supporters</p>
                        <ul className="mt-2 space-y-2 text-xs text-brand-700">
                          {supporterOptions.slice(0, 4).map((supporter, index) => (
                            <li key={`${supporter.id ?? index}-form-supporter`} className="rounded-md border border-brand-100 bg-white px-3 py-2">
                              <p className="font-medium text-brand-800">{supporter.name || 'Unnamed contact'}{supporter.company ? ` • ${supporter.company}` : ''}</p>
                              {supporter.matchReasons?.length ? (
                                <p>{supporter.matchReasons.slice(0, 2).join('; ')}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-clay-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-lg border border-clay-200 px-4 py-2 text-sm font-medium text-clay-600 transition hover:bg-clay-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-400"
                  >
                    {submitting ? 'Saving…' : editingTask ? 'Update task' : 'Create task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
