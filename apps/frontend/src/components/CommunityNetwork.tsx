import { useEffect, useMemo, useState } from 'react'
import { SectionHeader } from './ui/SectionHeader'
import { Card } from './ui/Card'
import { api } from '../services/api'

interface Contact {
  id: number
  full_name: string
  current_position: string
  current_company: string
  relationship_score: number
  strategic_value?: string
  alignment_tags?: string[]
  linkedin_url?: string
  connected_on?: string
  last_interaction?: string | null
  interaction_count?: number
}

interface NetworkResponse {
  success: boolean
  data: Contact[]
  pagination: {
    total: number
    returned: number
    limit: number
    offset: number
  }
}

const strategicValueLabels: Record<string, string> = {
  high: 'High value',
  medium: 'Medium value',
  low: 'Emerging',
}

type AlignmentProject = {
  id: string
  name: string
  status?: string
  notionUrl?: string | null
  relationshipPillars: string[]
  nextMilestoneDate?: string | null
  recommendedContacts: any[]
  alignment: any
}

interface ContactCoachSummary {
  overdueFollowUps?: Array<{
    id?: number
    name?: string
    email?: string
    company?: string
    strategicValue?: string
    lastInteraction?: string
    relationshipScore?: number
  }>
  upcomingMeetings?: Array<{
    contactName?: string
    contactEmail?: string
    projectName?: string
    occursAt?: string
    summary?: string
  }>
  recentTouchpoints?: Array<{
    contactName?: string
    contactEmail?: string
    source?: string
    occurredAt?: string
    summary?: string
  }>
  stats?: {
    contactsAnalysed?: number
    touchpointsAnalysed?: number
    overdueCount?: number
    upcomingCount?: number
  }
}

export function CommunityNetwork() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [strategicValue, setStrategicValue] = useState('')
  const [minScore, setMinScore] = useState(0.6)

  const [contactInsights, setContactInsights] = useState<any | null>(null)
  const [gmailStatus, setGmailStatus] = useState<any | null>(null)
  const [communityEmails, setCommunityEmails] = useState<any[]>([])
  const [alignmentOverview, setAlignmentOverview] = useState<any | null>(null)
  const [askQuery, setAskQuery] = useState('')
  const [askResponses, setAskResponses] = useState<Array<{ id: string; query: string; answer: string }>>([])
  const [askLoading, setAskLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedPillar, setSelectedPillar] = useState('')
  const [showAlignedOnly, setShowAlignedOnly] = useState(false)
  const [contactCoach, setContactCoach] = useState<ContactCoachSummary | null>(null)

  const resetFilters = () => {
    setSearchQuery('')
    setStrategicValue('')
    setMinScore(0.6)
  }

  useEffect(() => {
    loadNetworkData()
  }, [searchQuery, strategicValue, minScore])

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
    const [dashboard, gmail, emails, alignments, coach] = (await Promise.allSettled([
      api.getSimpleContactDashboard(),
      api.getGmailStatus(),
      api.getGmailCommunityEmails(5),
      api.getProjectAlignmentOverview(3),
      api.getContactCoach()
    ])) as PromiseSettledResult<any>[]

    if (dashboard.status === 'fulfilled') {
      setContactInsights((dashboard.value as any)?.data || null)
    }

    if (gmail.status === 'fulfilled') {
      setGmailStatus(gmail.value || null)
    }

    if (emails.status === 'fulfilled') {
      const value = (emails.value as any) || {}
      const list = Array.isArray(value.emails)
        ? value.emails
        : Array.isArray(value)
        ? value
        : []
      setCommunityEmails(list)
    }

    if (alignments.status === 'fulfilled') {
      setAlignmentOverview(alignments.value)
    }

    if (coach.status === 'fulfilled') {
      if (coach.value?.success) {
        setContactCoach(coach.value)
      } else if (coach.value?.data) {
        setContactCoach(coach.value.data)
      } else {
        setContactCoach(null)
      }
    }
  } catch (err) {
    console.warn('Failed to load contact insights', err)
  }
}

  const loadNetworkData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (strategicValue) params.append('strategic_value', strategicValue)
      if (minScore > 0) params.append('min_score', minScore.toString())

      const response = await fetch(`/api/crm/linkedin-contacts?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Network request failed: ${response.status}`)
      }

      const data = (await response.json()) as NetworkResponse
      if (!data.success) {
        throw new Error('Network data returned unsuccessfully')
      }

      setContacts(data.data)
      setTotalContacts(data.pagination.total)
    } catch (err) {
      console.error('Community network error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load network data')
      setContacts([])
      setTotalContacts(0)
    } finally {
      setLoading(false)
    }
  }

  const submitAsk = async (prompt?: string) => {
    const query = (prompt ?? askQuery).trim()
    if (!query) return

    setAskLoading(true)
    setAskQuery('')
    try {
      const contextParts: string[] = []
      if (contextualPrompt) {
        contextParts.push(contextualPrompt)
      }

      const contextualQuery = contextParts.length
        ? `${query}\n\nContext:\n${contextParts.join('\n')}`
        : query

      const result = await api.queryIntelligence(`Network intelligence: ${contextualQuery}`)
      const answer =
        result?.answer ||
        result?.response ||
        result?.result ||
        result?.message ||
        (typeof result === 'string' ? result : JSON.stringify(result, null, 2))

      setAskResponses((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          query,
          answer
        },
        ...prev
      ])
    } catch (err) {
      setAskResponses((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          query,
          answer: err instanceof Error ? err.message : 'Network assistant unavailable right now. Try again soon.'
        },
        ...prev
      ])
    } finally {
      setAskLoading(false)
    }
  }

  const alignmentProjects = useMemo<AlignmentProject[]>(() => {
    const alignments = Array.isArray(alignmentOverview?.project_alignments)
      ? alignmentOverview.project_alignments
      : []

    return alignments
      .map((alignment: any) => ({
        id: alignment.project?.id,
        name: alignment.project?.name,
        status: alignment.project?.status,
        notionUrl: alignment.project?.notionUrl,
        relationshipPillars: Array.isArray(alignment.project?.relationshipPillars)
          ? alignment.project.relationshipPillars
          : [],
        nextMilestoneDate: alignment.project?.nextMilestoneDate,
        recommendedContacts: Array.isArray(alignment.recommended_contacts)
          ? alignment.recommended_contacts
          : [],
        alignment,
      }))
      .filter((item: AlignmentProject) => Boolean(item.id && item.name))
  }, [alignmentOverview])

  const selectedProjectAlignment = useMemo(
    () => alignmentProjects.find((project) => project.id === selectedProjectId) || null,
    [alignmentProjects, selectedProjectId]
  )

  const availablePillars = useMemo(
    () => selectedProjectAlignment?.relationshipPillars || [],
    [selectedProjectAlignment]
  )

  const alignedContactIds = useMemo(() => {
    if (!selectedProjectAlignment) return null
    return new Set(
      selectedProjectAlignment.recommendedContacts
        .map((contact: any) => contact?.id)
        .filter((id: unknown): id is number | string => typeof id === 'number' || typeof id === 'string')
    )
  }, [selectedProjectAlignment])

  const displayedContacts = useMemo(() => {
    if (showAlignedOnly && alignedContactIds?.size) {
      return contacts.filter((contact) =>
        alignedContactIds.has(contact.id) || alignedContactIds.has(String(contact.id))
      )
    }
    return contacts
  }, [contacts, showAlignedOnly, alignedContactIds])

  const summary = useMemo(() => {
    const highValue = displayedContacts.filter((c) => c.strategic_value === 'high').length
    const averageScore = displayedContacts.length
      ? displayedContacts.reduce((sum, contact) => sum + (contact.relationship_score || 0), 0) /
        displayedContacts.length
      : 0

    return {
      highValue,
      averageScore: averageScore.toFixed(2),
    }
  }, [displayedContacts])

  const contextualPrompt = useMemo(() => {
    if (!selectedProjectAlignment && !selectedPillar) return ''
    const parts: string[] = []
    if (selectedProjectAlignment) {
      parts.push(`Focus project: ${selectedProjectAlignment.name}`)
      if (selectedProjectAlignment.notionUrl) {
        parts.push(`Project Notion URL: ${selectedProjectAlignment.notionUrl}`)
      }
      if (selectedProjectAlignment.relationshipPillars?.length) {
        parts.push(`Project pillars: ${selectedProjectAlignment.relationshipPillars.join(', ')}`)
      }
      const topContacts = selectedProjectAlignment.recommendedContacts
        .slice(0, 5)
        .map((c: any) => c?.full_name)
        .filter(Boolean)
      if (topContacts.length) {
        parts.push(`Recommended contacts: ${topContacts.join(', ')}`)
      }
    }
    if (selectedPillar) {
      parts.push(`Focus pillar: ${selectedPillar}`)
    }
    if (showAlignedOnly && alignedContactIds?.size) {
      parts.push('Only consider aligned contacts for recommendations.')
    }
    return parts.join('\n')
  }, [selectedProjectAlignment, selectedPillar, showAlignedOnly, alignedContactIds])

  const quickPrompts = [
    'Who should we speak with about the next youth justice grant?',
    'Which contacts recently met with Contained?',
    'Suggest follow-ups for Indigenous enterprise projects this week.'
  ]

  if (loading) {
    return (
      <Card className="flex items-center justify-center" padding="lg">
        <div className="flex flex-col items-center gap-3 text-clay-500">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-200 border-t-transparent" />
          <p>Loading community network…</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-100 bg-red-50 text-red-700" padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">We couldn’t load the network.</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={loadNetworkData}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Relationship Intelligence"
        title="Community Network"
        description="Real relationships and strategic connections so communities can coordinate support on their own terms."
      />

      <Card padding="md" className="space-y-4">
        <h3 className="text-sm font-semibold text-clay-900">Filter relationships</h3>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="flex flex-col gap-2 text-xs font-medium text-clay-600">
            Search
            <input
              type="search"
              value={searchQuery}
              placeholder="Name, company, role…"
              onChange={(event) => setSearchQuery(event.target.value)}
              className="rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="flex flex-col gap-2 text-xs font-medium text-clay-600">
            Strategic value
            <select
              value={strategicValue}
              onChange={(event) => setStrategicValue(event.target.value)}
              className="rounded-lg border border-clay-200 px-3 py-2 text-sm text-clay-700 shadow-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All partners</option>
              <option value="high">High value</option>
              <option value="medium">Medium value</option>
              <option value="low">Emerging</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-medium text-clay-600">
            Minimum relationship score
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={minScore}
                onChange={(event) => setMinScore(parseFloat(event.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm font-semibold text-clay-700">{minScore.toFixed(1)}</span>
            </div>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm font-medium text-clay-600 transition hover:bg-clay-100"
            >
              Reset
            </button>
          </div>
        </div>
      </Card>

      <Card className="border-ocean-100 bg-ocean-50/70 text-ocean-800" padding="md">
        <p className="text-sm font-medium uppercase tracking-wide">Network power</p>
        <p className="mt-2 text-lg font-semibold">{totalContacts.toLocaleString()} strategic relationships</p>
        <p className="text-sm text-ocean-700">Powered by Supabase CRM + LinkedIn intelligence</p>
      </Card>

      {(contactInsights || gmailStatus) && (
        <Card className="grid gap-4 p-6 md:grid-cols-2">
          {contactInsights && (
            <div>
              <h3 className="text-lg font-semibold text-clay-900">Contact activity</h3>
              <p className="mt-1 text-sm text-clay-500">
                High-value relationships, engagement scores, and follow-up needs detected by the CRM sync.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-clay-500">High value</dt>
                  <dd className="text-xl font-semibold text-brand-700">{contactInsights.high_value_contacts ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-clay-500">Active contacts</dt>
                  <dd className="text-xl font-semibold text-ocean-700">{contactInsights.active_contacts ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-clay-500">Overdue follow-ups</dt>
                  <dd className="text-xl font-semibold text-clay-900">{contactInsights.overdue_follow_ups ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-clay-500">Avg engagement score</dt>
                  <dd className="text-xl font-semibold text-clay-900">
                    {(contactInsights.average_engagement_score ?? 0).toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {gmailStatus && (
            <div>
              <h3 className="text-lg font-semibold text-clay-900">Gmail intelligence</h3>
              <p className="mt-1 text-sm text-clay-500">
                Connection status for smart email insights that flag grant opportunities and introductions.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-clay-500">Configured</dt>
                  <dd className={`font-medium ${gmailStatus.configured ? 'text-brand-700' : 'text-clay-500'}`}>
                    {gmailStatus.configured ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-clay-500">Authenticated</dt>
                  <dd className={`font-medium ${gmailStatus.authenticated ? 'text-brand-700' : 'text-clay-500'}`}>
                    {gmailStatus.authenticated ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-clay-500">Initialized</dt>
                  <dd className={`font-medium ${gmailStatus.initialized ? 'text-ocean-700' : 'text-clay-500'}`}>
                    {gmailStatus.initialized ? 'Active' : 'Offline'}
                  </dd>
                </div>
                <div>
                  <dt className="text-clay-500">Tokens stored</dt>
                  <dd className={`font-medium ${gmailStatus.hasTokens ? 'text-ocean-700' : 'text-clay-500'}`}>
                    {gmailStatus.hasTokens ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
              {!gmailStatus.authenticated && (
                <p className="mt-3 text-xs text-clay-500">
                  Connect Gmail to automatically surface grant opportunities, introductions, and follow-ups.
                </p>
              )}
              {communityEmails.length > 0 && (
                <div className="mt-4 space-y-2 text-xs text-clay-600">
                  <p className="font-semibold text-clay-900">Newest community threads</p>
                  <ul className="space-y-2">
                    {communityEmails.slice(0, 3).map((email, index) => (
                      <li key={email.id || index} className="rounded-lg border border-clay-100 bg-white p-3">
                        <p className="font-medium text-clay-900 line-clamp-1">{email.subject || 'Community email'}</p>
                        {email.from && <p className="text-clay-500">From {email.from}</p>}
                        {email.receivedAt && (
                          <p className="text-clay-400">{new Date(email.receivedAt).toLocaleDateString()}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card padding="md">
          <p className="text-sm font-medium text-clay-500">High-value relationships</p>
          <p className="mt-2 text-3xl font-semibold text-brand-700">{summary.highValue}</p>
          <p className="mt-1 text-sm text-clay-500">Contacts assigned as priority partners</p>
        </Card>
        <Card padding="md">
          <p className="text-sm font-medium text-clay-500">Average relationship score</p>
          <p className="mt-2 text-3xl font-semibold text-ocean-700">{summary.averageScore}</p>
          <p className="mt-1 text-sm text-clay-500">Higher scores indicate stronger relationships</p>
        </Card>
        <Card padding="md">
          <p className="text-sm font-medium text-clay-500">Results in view</p>
          <p className="mt-2 text-3xl font-semibold text-clay-900">{displayedContacts.length}</p>
          <p className="mt-1 text-sm text-clay-500">Based on current filters</p>
        </Card>
      </div>

      {contactCoach && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-clay-900">Relationship coach</h3>
            {contactCoach.stats && (
              <span className="rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-600">
                {contactCoach.stats.overdueCount ?? 0} follow-ups • {contactCoach.stats.upcomingCount ?? 0} meetings
              </span>
            )}
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-clay-400">Overdue follow-ups</p>
              <ul className="mt-2 space-y-2 text-xs text-clay-600">
                {(contactCoach.overdueFollowUps || []).slice(0, 3).map((item, index) => (
                  <li key={`${item.id || item.email || index}`} className="rounded-lg border border-clay-100 bg-clay-50 p-3">
                    <p className="font-medium text-clay-900">{item.name || item.email || 'Unknown contact'}</p>
                    {item.company && <p>{item.company}</p>}
                    {item.lastInteraction && (
                      <p className="text-clay-400">Last touchpoint {new Date(item.lastInteraction).toLocaleDateString()}</p>
                    )}
                  </li>
                ))}
                {(contactCoach.overdueFollowUps || []).length === 0 && <li>No outstanding follow-ups 🎉</li>}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-clay-400">Upcoming meetings</p>
              <ul className="mt-2 space-y-2 text-xs text-clay-600">
                {(contactCoach.upcomingMeetings || []).slice(0, 3).map((item, index) => (
                  <li key={`${item.contactEmail || item.summary || index}`} className="rounded-lg border border-clay-100 bg-clay-50 p-3">
                    <p className="font-medium text-clay-900">{item.summary || 'Calendar event'}</p>
                    {item.contactName && <p>{item.contactName}</p>}
                    {item.projectName && <p className="text-brand-700">{item.projectName}</p>}
                    {item.occursAt && (
                      <p className="text-clay-400">{new Date(item.occursAt).toLocaleString()}</p>
                    )}
                  </li>
                ))}
                {(contactCoach.upcomingMeetings || []).length === 0 && <li>No meetings scheduled yet.</li>}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-clay-400">Recent touchpoints</p>
              <ul className="mt-2 space-y-2 text-xs text-clay-600">
                {(contactCoach.recentTouchpoints || []).slice(0, 3).map((item, index) => (
                  <li key={`${item.contactEmail || item.summary || index}`} className="rounded-lg border border-clay-100 bg-clay-50 p-3">
                    <p className="font-medium text-clay-900">{item.contactName || item.contactEmail || item.summary || 'Touchpoint'}</p>
                    <p>{item.source === 'gmail' ? 'Email touchpoint' : item.source === 'calendar' ? 'Meeting' : item.source}</p>
                    {item.occurredAt && (
                      <p className="text-clay-400">{new Date(item.occurredAt).toLocaleString()}</p>
                    )}
                  </li>
                ))}
                {(contactCoach.recentTouchpoints || []).length === 0 && <li>No touchpoints recorded yet.</li>}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-clay-900">Smart outreach assistant</h3>
            {askLoading && <span className="text-xs text-clay-500">Thinking…</span>}
          </div>
          <p className="text-sm text-clay-500">
            Ask natural-language questions about who to contact, which opportunities are hot, or how to support a project.
          </p>
          {alignmentProjects.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-medium text-clay-600">
                Focus project
                <select
                  value={selectedProjectId}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value)
                    setSelectedPillar('')
                    setShowAlignedOnly(false)
                  }}
                  className="rounded-lg border border-clay-200 px-3 py-2 text-sm text-clay-700 shadow-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">All projects</option>
                  {alignmentProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-xs font-medium text-clay-600">
                Relationship pillar
                <select
                  value={selectedPillar}
                  onChange={(event) => setSelectedPillar(event.target.value)}
                  disabled={!availablePillars.length}
                  className="rounded-lg border border-clay-200 px-3 py-2 text-sm text-clay-700 shadow-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-clay-50"
                >
                  <option value="">All pillars</option>
                  {availablePillars.map((pillar) => (
                    <option key={pillar} value={pillar}>
                      {pillar}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {selectedProjectAlignment && (
            <label className="flex items-center gap-2 rounded-lg border border-clay-200 bg-clay-50/60 px-3 py-2 text-xs text-clay-600">
              <input
                type="checkbox"
                checked={showAlignedOnly}
                onChange={(event) => setShowAlignedOnly(event.target.checked)}
              />
              Highlight project-aligned contacts only
            </label>
          )}

          {contextualPrompt && (
            <div className="rounded-lg border border-brand-100 bg-brand-50/80 px-3 py-2 text-xs text-brand-700">
              <p className="font-medium">Context applied</p>
              <p className="mt-1 whitespace-pre-line">{contextualPrompt}</p>
            </div>
          )}

          <div className="space-y-3">
            <textarea
              value={askQuery}
              onChange={(event) => setAskQuery(event.target.value)}
              placeholder="Who should we invite to the next BG Fit milestone?"
              className="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              rows={3}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitAsk(prompt)}
                    disabled={askLoading}
                    className="rounded-full border border-clay-200 px-3 py-1 text-xs font-medium text-clay-600 transition hover:bg-clay-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => submitAsk()}
                disabled={askLoading || !askQuery.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ask the network
              </button>
            </div>
          </div>
          {askResponses.length > 0 && (
            <div className="space-y-3 rounded-lg border border-clay-100 bg-white p-3 text-sm text-clay-600">
              {askResponses.slice(0, 2).map((item) => (
                <div key={item.id} className="space-y-1">
                  <p className="font-medium text-clay-900">Q: {item.query}</p>
                  <p className="text-clay-600 whitespace-pre-wrap">{item.answer}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md" className="space-y-4">
          <h3 className="text-lg font-semibold text-clay-900">Project alignment radar</h3>
          <p className="text-sm text-clay-500">
            Top projects and the contacts best positioned to support them this week.
          </p>
          {alignmentOverview?.project_alignments?.length ? (
            <ul className="space-y-3 text-sm">
              {alignmentOverview.project_alignments.slice(0, 3).map((alignment: any) => (
                <li key={alignment.project?.id} className="rounded-lg border border-clay-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-clay-900">{alignment.project?.name || 'Unnamed project'}</p>
                      <p className="text-xs text-clay-500">{alignment.alignment_strategy?.focus || alignment.project?.status}</p>
                      {Array.isArray(alignment.project?.relationshipPillars) && alignment.project.relationshipPillars.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-brand-700">
                          {alignment.project.relationshipPillars.slice(0, 3).map((pillar: string) => (
                            <span key={pillar} className="rounded-full bg-brand-50 px-2 py-0.5">
                              {pillar}
                            </span>
                          ))}
                          {alignment.project.relationshipPillars.length > 3 && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-600">
                              +{alignment.project.relationshipPillars.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {alignment.project?.nextMilestoneDate && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-clay-400">
                          Next milestone {new Date(alignment.project.nextMilestoneDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {alignment.recommended_contacts?.length || 0} matches
                    </span>
                  </div>
                  {alignment.recommended_contacts?.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-clay-600">
                      {alignment.recommended_contacts.slice(0, 3).map((contact: any) => (
                        <li key={contact.id}>
                          <span className="font-medium text-clay-900">{contact.full_name}</span>
                          {contact.current_company && ` • ${contact.current_company}`}
                          {typeof contact.alignment_score === 'number' && (
                            <span className="ml-1 text-brand-700">({contact.alignment_score.toFixed(2)})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {alignment.project?.notionUrl && (
                    <a
                      href={alignment.project.notionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition hover:text-brand-800"
                    >
                      Open in Notion <span aria-hidden>↗</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-clay-500">
              Connect project-contact alignment to surface warm introductions automatically.
            </p>
          )}
        </Card>
      </div>

      <Card padding="none">
        <table className="min-w-full divide-y divide-clay-100">
          <thead className="bg-clay-50 text-left text-xs font-semibold uppercase tracking-wide text-clay-500">
            <tr>
              <th className="px-6 py-3">Contact</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Company</th>
              <th className="px-6 py-3">Relationship score</th>
              <th className="px-6 py-3">Strategic value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-clay-100 bg-white text-sm text-clay-700">
            {displayedContacts.map((contact) => {
              const aligned = alignedContactIds?.has(contact.id) || alignedContactIds?.has(String(contact.id))
              return (
                <tr
                  key={contact.id}
                  className={`hover:bg-clay-50 ${aligned ? 'bg-brand-50/30' : ''}`}
                >
                  <td className="px-6 py-4 font-medium text-clay-900">
                    {contact.full_name}
                  </td>
                <td className="px-6 py-4">
                  <p>{contact.current_position || '—'}</p>
                  <p className="text-xs text-clay-500">
                    Connected {contact.connected_on ? new Date(contact.connected_on).toLocaleDateString() : 'n/a'}
                  </p>
                </td>
                <td className="px-6 py-4">{contact.current_company || 'Independent'}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-semibold text-ocean-700">
                    {contact.relationship_score?.toFixed(2) ?? '0.00'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                    {strategicValueLabels[contact.strategic_value ?? ''] ?? 'Unclassified'}
                  </span>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
