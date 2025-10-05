import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveApiUrl, USE_MOCK_DATA } from '../config/env'

interface ResearchTopic {
  id: string
  title: string
  description: string
  query: string
  lastUpdated?: string
}

interface ResearchInsight {
  id: string
  title: string
  summary: string
  impactArea?: string
}

interface ResearchSource {
  id: string
  label: string
  url?: string
  type?: string
  relevance?: string
}

interface ResearchThread {
  summary: string
  keyInsights: ResearchInsight[]
  recommendedActions: string[]
  sources: ResearchSource[]
  lastUpdated: string
}

const SAVED_TOPICS: ResearchTopic[] = [
  {
    id: 'water-regeneration',
    title: 'Water Regeneration Projects',
    description: 'Community-led waterway restoration, storm mitigation, and Queensland councils.',
    query: 'Map water regeneration projects in ACT portfolio and related grants.'
  },
  {
    id: 'regen-agriculture',
    title: 'Regenerative Agriculture',
    description: 'Soil health, community farms, Seed House Witta partnerships.',
    query: 'Show regenerative agriculture initiatives and potential partners near Witta.'
  },
  {
    id: 'youth-justice',
    title: 'Youth Justice Pathways',
    description: 'BG Fit, MMEIC Justice Projects, on-country camp learnings.',
    query: 'Analyse youth justice programs and contact cadence for Elders and advocates.'
  },
  {
    id: 'story-sovereignty',
    title: 'Story Sovereignty',
    description: 'PICC storytelling suite, Empathy Ledger, transparency exports.',
    query: 'Summarise story sovereignty practices and required media assets.'
  },
  {
    id: 'funding-pipeline',
    title: 'Funding Pipeline',
    description: 'Grants, philanthropics, and land-backed financing opportunities.',
    query: 'List aligned grants and funders for current ACT projects with deadlines.'
  }
]

const STUB_THREAD: ResearchThread = {
  summary:
    'ACT has active water regeneration work through PICC Storm Stories, Witta Harvest HQ, and Seed House Witta. Community ownership is increasing, but funding and technical partners are required to accelerate infrastructure upgrades before the next wet season.',
  keyInsights: [
    {
      id: 'insight-1',
      title: 'Palm Island stormwater remediation is underfunded',
      summary: 'Only 60% of the requested $80k has been secured. Grants from Queensland Reconstruction Authority and local councils remain untapped.',
      impactArea: 'Funding'
    },
    {
      id: 'insight-2',
      title: 'Community training pipeline exists',
      summary: 'Seed House Witta is running on-country workshops. Upskilling local youth as water stewards will speed up maintenance handover.',
      impactArea: 'Community'
    },
    {
      id: 'insight-3',
      title: 'Story & transparency assets missing',
      summary: 'Only two recent media pieces capture water restoration impacts. Transparent story artefacts are required before launch of new funding round.',
      impactArea: 'Story sovereignty'
    }
  ],
  recommendedActions: [
    'Schedule residency session with Sunshine Coast Council water team (Aug).',
    'Publish combined case study of Witta Harvest HQ and Palm storm mitigation with updated metrics.',
    'Prepare grant application for QRA Resilience Program before October 30.'
  ],
  sources: [
    {
      id: 'source-1',
      label: 'PICC Storm Stories – Funding Sheet (Notion)',
      type: 'Notion page',
      relevance: 'financial status'
    },
    {
      id: 'source-2',
      label: 'Queensland Reconstruction Authority – Resilience Grants',
      url: 'https://www.qra.qld.gov.au/grants',
      type: 'Grant portal',
      relevance: 'funding'
    }
  ],
  lastUpdated: new Date().toISOString()
}

export default function CuriousTractorResearch() {
  const initialMock = () => {
    if (USE_MOCK_DATA) return true
    if (typeof window !== 'undefined' && (window as any).__ACT_USE_MOCKS === true) {
      return true
    }
    return false
  }

  const [selectedTopicId, setSelectedTopicId] = useState<string>(SAVED_TOPICS[0]?.id)
  const [thread, setThread] = useState<ResearchThread | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customQuery, setCustomQuery] = useState('')
  const [mockMode, setMockMode] = useState<boolean>(initialMock)

  const selectedTopic = useMemo(
    () => SAVED_TOPICS.find((topic) => topic.id === selectedTopicId) || SAVED_TOPICS[0],
    [selectedTopicId]
  )

  const loadTopic = useCallback(
    async (topic: ResearchTopic) => {
      setLoading(true)
      setError(null)

      if (mockMode) {
        setThread(STUB_THREAD)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(resolveApiUrl(`/api/curious-tractor/topics/${topic.id}`))
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`)
        }
        const payload = await response.json()
        setThread({
          summary: payload.summary ?? STUB_THREAD.summary,
          keyInsights: payload.keyInsights ?? STUB_THREAD.keyInsights,
          recommendedActions: payload.recommendedActions ?? STUB_THREAD.recommendedActions,
          sources: payload.sources ?? STUB_THREAD.sources,
          lastUpdated: payload.lastUpdated ?? new Date().toISOString()
        })
      } catch (err) {
        console.error('Research topic load failed:', err)
        setThread(STUB_THREAD)
        setMockMode(true)
        if (typeof window !== 'undefined') {
          ;(window as any).__ACT_USE_MOCKS = true
        }
        setError('Showing cached research snapshot. Connect backend AI stack for live updates.')
      } finally {
        setLoading(false)
      }
    },
    [mockMode]
  )

  useEffect(() => {
    if (selectedTopic) {
      loadTopic(selectedTopic)
    }
  }, [selectedTopic, loadTopic])

  const runCustomQuery = async () => {
    if (!customQuery.trim()) return
    if (mockMode) {
      setThread(STUB_THREAD)
      setError('Custom research unavailable in mock mode.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(resolveApiUrl('/api/curious-tractor/research/custom'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: customQuery })
      })
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`)
      }
      const payload = await response.json()
      setThread({
        summary: payload.summary ?? STUB_THREAD.summary,
        keyInsights: payload.keyInsights ?? STUB_THREAD.keyInsights,
        recommendedActions: payload.recommendedActions ?? STUB_THREAD.recommendedActions,
        sources: payload.sources ?? STUB_THREAD.sources,
        lastUpdated: payload.lastUpdated ?? new Date().toISOString()
      })
    } catch (err) {
      console.error('Custom research failed:', err)
      setThread(STUB_THREAD)
      setMockMode(true)
      if (typeof window !== 'undefined') {
        ;(window as any).__ACT_USE_MOCKS = true
      }
      setError('Custom research service unavailable. Showing saved snapshot instead.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50 py-6 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white shadow-sm border border-emerald-100 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Curious Tractor Research Studio</p>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Deep intelligence across ACT’s knowledge graph
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Explore saved research threads, AI-assisted insights, and source documentation. Each topic combines Notion, Supabase, Gmail, and story artefacts to power the Knowledge Wiki.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={runCustomQuery}
                className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                🔍 Run custom query
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="rounded-2xl bg-white border border-slate-200">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Saved research topics</h2>
              <p className="mt-1 text-xs text-slate-500">Switch threads to load cached intelligence without rerunning full AI jobs.</p>
            </div>
            <nav className="flex flex-col divide-y divide-slate-100">
              {SAVED_TOPICS.map((topic) => {
                const isActive = topic.id === selectedTopicId
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`flex flex-col items-start px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-emerald-50 border-l-4 border-emerald-400' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-900">{topic.title}</span>
                    <span className="mt-1 text-xs text-slate-500">{topic.description}</span>
                    {topic.lastUpdated && (
                      <span className="mt-2 text-[11px] font-medium text-emerald-600">Updated {topic.lastUpdated}</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          <main className="space-y-6">
            {error && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Research summary</p>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedTopic?.title}</h3>
                </div>
                <div className="text-xs text-slate-500">
                  {loading ? 'Refreshing insights…' : `Last updated ${new Date(thread?.lastUpdated ?? STUB_THREAD.lastUpdated).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}`}
                </div>
              </div>
              <div className="px-6 py-5 text-sm leading-6 text-slate-700">
                {loading ? 'Loading research synthesis…' : thread?.summary}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              {(thread?.keyInsights ?? STUB_THREAD.keyInsights).map((insight) => (
                <div key={insight.id} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Key insight</p>
                  <h4 className="mt-2 text-base font-semibold text-slate-900">{insight.title}</h4>
                  <p className="mt-2 text-sm text-slate-700">{insight.summary}</p>
                  {insight.impactArea && (
                    <span className="mt-3 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                      {insight.impactArea}
                    </span>
                  )}
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Recommended actions</h3>
                <p className="text-xs text-slate-500">Auto-generated from AI assistant. Validate with community partners before executing.</p>
              </div>
              <ol className="space-y-3 px-6 py-5 text-sm text-slate-700">
                {(thread?.recommendedActions ?? STUB_THREAD.recommendedActions).map((action, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="mt-1 h-6 w-6 rounded-full bg-emerald-600 text-center text-xs font-bold leading-6 text-white">
                      {idx + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Sources & evidence</h3>
                <p className="text-xs text-slate-500">Traceability to Notion, Supabase, and external research for wiki transparency.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {(thread?.sources ?? STUB_THREAD.sources).map((source) => (
                  <div key={source.id} className="px-6 py-4 text-sm text-slate-700">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{source.label}</p>
                        {source.type && <p className="text-xs text-slate-500">{source.type}</p>}
                      </div>
                      {source.relevance && (
                        <span className="text-xs font-semibold text-emerald-600">{source.relevance}</span>
                      )}
                    </div>
                    {source.url && (
                      <a
                        className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit source →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Need something new?</p>
              <p className="mt-1">Describe the analysis you want the AI to run. We’ll push it through the research stack and update this thread with fresh outputs.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <textarea
                  value={customQuery}
                  onChange={(event) => setCustomQuery(event.target.value)}
                  placeholder="E.g. Compare water project partners across Sunshine Coast councils and list top 5 new introductions."
                  className="flex-1 resize-none rounded-lg border border-slate-300 bg-white/80 p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  rows={3}
                />
                <button
                  onClick={runCustomQuery}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {loading ? 'Running...' : 'Run query'}
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
