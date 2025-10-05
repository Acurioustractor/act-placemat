import { useEffect, useState } from 'react'
import { SectionHeader } from './ui/SectionHeader'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'

type ConsentLevel = 'public' | 'community' | 'private'

interface StoryConsentApprovals {
  data_usage: boolean
  community_sharing: boolean
  ai_analysis: boolean
  withdrawal_right: boolean
}

interface StoryConsent {
  level: ConsentLevel
  scope: string[]
  approvals: StoryConsentApprovals
  framework?: string
  lastReviewedAt?: string | null
}

interface Story {
  id: string
  title: string
  summary?: string
  content: string
  community: string
  author: string
  createdAt: string
  updatedAt?: string | null
  consent: StoryConsent
  tags: string[]
  aiTags: string[]
  coverImage?: string | null
}

const ensureArray = (value: any): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((item) => !!item)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => !!item)
      }
    } catch (error) {
      // Ignore parse errors and fallback to CSV split
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const ensureBoolean = (value: any, fallback: boolean): boolean => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y'].includes(value.toLowerCase())
  }
  return Boolean(value)
}

const normalizeStoryFromApi = (raw: any): Story => {
  const consent = raw?.consent || {}
  const approvals = consent.approvals || {}
  const consentDetails = raw?.consent_details || {}

  const level = (consent.level || raw?.consent_level || 'community') as ConsentLevel
  const scope = ensureArray(consent.scope || raw?.consent_scope)
  const resolvedScope = scope.length > 0 ? scope : level === 'public'
    ? ['public_showcase', 'community_archive']
    : level === 'community'
    ? ['community_circle', 'community_archive']
    : ['internal_only']

  return {
    id: raw?.id || Math.random().toString(36).slice(2),
    title: raw?.title || 'Untitled story',
    summary: raw?.summary || raw?.content_summary || '',
    content: raw?.content || '',
    community: raw?.community || raw?.community_name || 'Community',
    author: raw?.author || raw?.storyteller_name || 'Community storyteller',
    createdAt: raw?.createdAt || raw?.created_at || raw?.created_date || new Date().toISOString(),
    updatedAt: raw?.updatedAt || raw?.updated_at || null,
    consent: {
      level,
      scope: resolvedScope,
      framework: consent.framework || raw?.consent_framework,
      approvals: {
        data_usage: ensureBoolean(approvals.data_usage ?? consentDetails.data_usage_approved, true),
        community_sharing: ensureBoolean(
          approvals.community_sharing ?? consentDetails.sharing_approved,
          level !== 'private'
        ),
        ai_analysis: ensureBoolean(approvals.ai_analysis ?? consentDetails.ai_analysis_approved, false),
        withdrawal_right: ensureBoolean(approvals.withdrawal_right ?? consentDetails.withdrawal_allowed, true)
      },
      lastReviewedAt: consent.lastReviewedAt || consentDetails.last_reviewed_at || null
    },
    tags: ensureArray(raw?.tags || raw?.themes),
    aiTags: ensureArray(raw?.aiTags || raw?.ai_categories),
    coverImage: raw?.coverImage || raw?.cover_image || null
  }
}

export function StoryManagement() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddStory, setShowAddStory] = useState(false)

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stories')
      if (!response.ok) {
        throw new Error(`Failed to load stories: ${response.status}`)
      }
      const data = await response.json()

      let storiesPayload: any[] = []
      if (Array.isArray(data?.stories)) {
        storiesPayload = data.stories
      } else if (Array.isArray(data)) {
        storiesPayload = data
      }

      setStories(storiesPayload.map(normalizeStoryFromApi))
    } catch (err) {
      setError(`Failed to load community stories: ${err}`)
      console.error('Error loading stories:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center" padding="lg">
        <div className="flex flex-col items-center gap-3 text-clay-500">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-200 border-t-transparent" />
          <p>Loading community stories…</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-100 bg-red-50 text-red-700" padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">We couldn't load the stories.</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={loadStories}
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
        eyebrow="Story Studio"
        title="Community Stories"
        description="Communities control how their stories are recorded, shared, and repurposed."
        actions={
          <button
            onClick={() => setShowAddStory(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-brand-700"
          >
            Share your story
          </button>
        }
      />

      <Card className="border-brand-100 bg-brand-50/70 text-brand-800" padding="md">
        <p className="text-sm font-medium uppercase tracking-wide">Your stories, your control</p>
        <p className="mt-2 text-sm">
          You maintain complete ownership and control. Adjust consent levels, export narratives, or remove stories anytime.
        </p>
      </Card>

      <Card padding="md">
        <h3 className="text-lg font-semibold text-clay-900">Consent dashboard</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ConsentMetric title="Stories shared" value={stories.length} />
          <ConsentMetric title="Public" value={stories.filter((s) => s.consent.level === 'public').length} />
          <ConsentMetric title="Community only" value={stories.filter((s) => s.consent.level === 'community').length} />
          <ConsentMetric title="Private" value={stories.filter((s) => s.consent.level === 'private').length} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="text-sm font-medium text-ocean-700 underline">Export all my stories</button>
          <button className="text-sm font-medium text-ocean-700 underline">Manage consent settings</button>
          <button className="text-sm font-medium text-ocean-700 underline">View data usage log</button>
        </div>
      </Card>

      {stories.length === 0 ? (
        <EmptyState
          title="No stories yet"
          description="Community stories will appear here once they are shared with approved consent levels."
          action={
            <button
              onClick={() => setShowAddStory(true)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-brand-700"
            >
              Share the first story
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}

      {showAddStory && <AddStoryModal onClose={() => setShowAddStory(false)} onSave={loadStories} />}
    </div>
  )
}

function ConsentMetric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border border-clay-100 bg-clay-50 p-4 text-center">
      <p className="text-2xl font-semibold text-brand-700">{value}</p>
      <p className="mt-1 text-sm text-clay-500">{title}</p>
    </div>
  )
}

function StoryCard({ story }: { story: Story }) {
  const consentPalette = {
    public: 'bg-brand-100 text-brand-800',
    community: 'bg-ocean-100 text-ocean-800',
    private: 'bg-clay-100 text-clay-700',
  } as const

  const [expanded, setExpanded] = useState(false)

  const approvalBadges = [
    { label: 'Data usage', value: story.consent.approvals.data_usage },
    { label: 'Community sharing', value: story.consent.approvals.community_sharing },
    { label: 'AI analysis', value: story.consent.approvals.ai_analysis },
    { label: 'Withdrawal rights', value: story.consent.approvals.withdrawal_right },
  ]

  const formattedDate = story.createdAt ? new Date(story.createdAt).toLocaleDateString() : 'Unknown'

  return (
    <Card padding="md" className="hover:shadow-card transition-shadow">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              consentPalette[story.consent.level]
            }`}
          >
            {story.consent.level}
          </span>
          <span className="text-sm text-clay-500">{story.community}</span>
          {story.consent.scope.map((scope) => (
            <span key={scope} className="rounded-full bg-clay-100 px-2 py-1 text-xs font-medium text-clay-600">
              {scope.replace(/_/g, ' ')}
            </span>
          ))}
          {story.aiTags.length > 0 && (
            <span className="rounded-full bg-ocean-50 px-2 py-1 text-xs font-medium text-ocean-700">
              AI tags: {story.aiTags.slice(0, 2).join(', ')}
              {story.aiTags.length > 2 && '…'}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-clay-900">{story.title}</h3>
          <p className="mt-1 text-sm text-clay-500">
            By {story.author} • {formattedDate}
          </p>
        </div>

        {story.summary && !expanded && (
          <p className="text-sm text-clay-600">{story.summary}</p>
        )}

        <div className="text-sm text-clay-700">
          {expanded ? (
            <div className="space-y-3">
              <p>{story.content}</p>
              <button className="text-sm font-medium text-ocean-700 underline" onClick={() => setExpanded(false)}>
                Show less
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="line-clamp-3">{story.content}</p>
              <button className="text-sm font-medium text-ocean-700 underline" onClick={() => setExpanded(true)}>
                Continue reading
              </button>
            </div>
          )}
        </div>

        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-clay-500">
            {story.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-clay-100 px-2 py-0.5 text-xs font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-clay-100 bg-clay-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-500">Consent approvals</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {approvalBadges.map((approval) => (
              <div key={approval.label} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-medium text-clay-600">
                <span>{approval.label}</span>
                <span className={approval.value ? 'text-emerald-600' : 'text-amber-700'}>
                  {approval.value ? 'Approved' : 'Restricted'}
                </span>
              </div>
            ))}
          </div>
          {story.consent.lastReviewedAt && (
            <p className="mt-2 text-xs text-clay-400">
              Last reviewed {new Date(story.consent.lastReviewedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="text-xs font-medium text-ocean-700 underline">Update consent</button>
          <button className="text-xs font-medium text-ocean-700 underline">Export story</button>
          <button className="text-xs font-medium text-ocean-700 underline">Remove</button>
        </div>
      </div>
    </Card>
  )
}

interface AddStoryModalProps {
  onClose: () => void
  onSave: () => void
}

function AddStoryModal({ onClose, onSave }: AddStoryModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [consentLevel, setConsentLevel] = useState<ConsentLevel>('community')
  const [community, setCommunity] = useState('')
  const [dataUsageApproved, setDataUsageApproved] = useState(true)
  const [communitySharingApproved, setCommunitySharingApproved] = useState(true)
  const [aiAnalysisApproved, setAiAnalysisApproved] = useState(false)
  const [withdrawalAllowed, setWithdrawalAllowed] = useState(true)
  const [tagsInput, setTagsInput] = useState('')

  const deriveScope = (level: ConsentLevel) => {
    switch (level) {
      case 'public':
        return ['public_showcase', 'community_archive']
      case 'community':
        return ['community_circle', 'community_archive']
      default:
        return ['internal_only']
    }
  }

  const handleConsentLevelChange = (level: ConsentLevel) => {
    setConsentLevel(level)
    if (level === 'private') {
      setCommunitySharingApproved(false)
    } else {
      setCommunitySharingApproved(true)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          summary: content.slice(0, 240),
          community,
          author: 'Community Contributor',
          tags: tagsInput
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          aiTags: [],
          consent: {
            level: consentLevel,
            scope: deriveScope(consentLevel),
            approvals: {
              data_usage: dataUsageApproved,
              community_sharing: communitySharingApproved,
              ai_analysis: aiAnalysisApproved,
              withdrawal_right: withdrawalAllowed,
            },
            framework: 'act.community.v1',
            lastReviewedAt: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save story')
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to create story:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-clay-200 bg-white p-6 shadow-card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-clay-900">Share your community story</h2>
            <p className="mt-1 text-sm text-clay-500">Stories stay under your community’s control. Set consent now and update anytime.</p>
          </div>
          <button className="text-sm font-medium text-clay-400 hover:text-clay-600" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="story-title" className="block text-sm font-medium text-clay-600">
              Story title
            </label>
            <input
              id="story-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-subtle focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              required
            />
          </div>

          <div>
            <label htmlFor="story-content" className="block text-sm font-medium text-clay-600">
              Story details
            </label>
            <textarea
              id="story-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-2 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-subtle focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="story-community" className="block text-sm font-medium text-clay-600">
                Community
              </label>
              <input
                id="story-community"
                type="text"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                className="mt-2 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-subtle focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-clay-600">Consent level</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['public', 'community', 'private'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleConsentLevelChange(level)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      consentLevel === level
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-clay-200 text-clay-600 hover:border-brand-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-clay-500">Consent scope preview</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {deriveScope(consentLevel).map((scope) => (
                <span key={scope} className="rounded-full bg-clay-100 px-2 py-1 text-xs font-medium text-clay-600">
                  {scope.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-clay-600">Consent approvals</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-clay-200 bg-white px-3 py-2 text-xs font-medium text-clay-600">
                <input
                  type="checkbox"
                  checked={dataUsageApproved}
                  onChange={(event) => setDataUsageApproved(event.target.checked)}
                  className="rounded border-clay-300 text-brand-600 focus:ring-brand-500"
                />
                Data usage (analytics & reporting)
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-clay-200 bg-white px-3 py-2 text-xs font-medium text-clay-600">
                <input
                  type="checkbox"
                  checked={communitySharingApproved}
                  onChange={(event) => setCommunitySharingApproved(event.target.checked)}
                  className="rounded border-clay-300 text-brand-600 focus:ring-brand-500"
                />
                Community sharing (Beautiful Obsolescence showcase)
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-clay-200 bg-white px-3 py-2 text-xs font-medium text-clay-600">
                <input
                  type="checkbox"
                  checked={aiAnalysisApproved}
                  onChange={(event) => setAiAnalysisApproved(event.target.checked)}
                  className="rounded border-clay-300 text-brand-600 focus:ring-brand-500"
                />
                AI analysis & tagging
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-clay-200 bg-white px-3 py-2 text-xs font-medium text-clay-600">
                <input
                  type="checkbox"
                  checked={withdrawalAllowed}
                  onChange={(event) => setWithdrawalAllowed(event.target.checked)}
                  className="rounded border-clay-300 text-brand-600 focus:ring-brand-500"
                />
                Withdrawal rights honoured anytime
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="story-tags" className="block text-sm font-medium text-clay-600">
              Tags (comma separated)
            </label>
            <input
              id="story-tags"
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="culture, youth justice, co-design"
              className="mt-2 w-full rounded-lg border border-clay-200 px-3 py-2 text-sm shadow-subtle focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-clay-200 px-4 py-2 text-sm font-medium text-clay-600 transition hover:bg-clay-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-subtle transition hover:bg-brand-700"
            >
              Save story
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
