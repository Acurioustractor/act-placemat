import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveApiUrl } from '../config/env'

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

export default function CuriousTractorResearch() {
  const [savedTopics, setSavedTopics] = useState<ResearchTopic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [thread, setThread] = useState<ResearchThread | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customQuery, setCustomQuery] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedTopic = useMemo(
    () => savedTopics.find((topic) => topic.id === selectedTopicId) || savedTopics[0],
    [selectedTopicId, savedTopics]
  )

  // Load saved topics from API
  const loadTopics = useCallback(async () => {
    setLoadingTopics(true)
    try {
      const response = await fetch(resolveApiUrl('/api/curious-tractor/topics'))
      if (!response.ok) throw new Error('Failed to load topics')

      const data = await response.json()
      if (data.success && data.topics) {
        setSavedTopics(data.topics)
        if (data.topics.length > 0 && !selectedTopicId) {
          setSelectedTopicId(data.topics[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load research topics:', err)
      setSavedTopics([])
    } finally {
      setLoadingTopics(false)
    }
  }, [selectedTopicId])

  // Load saved topics on mount
  useEffect(() => {
    loadTopics()
  }, [])

  const loadTopic = useCallback(
    async (topic: ResearchTopic) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(resolveApiUrl(`/api/curious-tractor/topics/${topic.id}`))
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`)
        }
        const payload = await response.json()

        // Handle both API response formats
        const threadData = payload.thread || payload

        setThread({
          summary: threadData.summary || '',
          keyInsights: threadData.keyInsights || [],
          recommendedActions: threadData.recommendedActions || [],
          sources: threadData.sources || [],
          lastUpdated: threadData.lastUpdated || new Date().toISOString()
        })
      } catch (err) {
        console.error('Research topic load failed:', err)
        // Don't use stub data - show empty state
        setThread(null)
        setError('Research API not connected yet. Save research results from the Opportunities tab to see them here.')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (selectedTopic) {
      loadTopic(selectedTopic)
    }
  }, [selectedTopic, loadTopic])

  const runCustomQuery = async () => {
    if (!customQuery.trim()) return

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

      // Handle both API response formats
      const result = payload.result || payload
      const threadData = result.thread || result

      // Parse the markdown-formatted answer into structured data
      const answer = result.answer || threadData.summary || ''
      const sections = answer.split('**Section').filter(Boolean)

      // Extract key insights from sections
      const insights: ResearchInsight[] = []
      const actions: string[] = []

      // Look for recommendations section
      const recsMatch = answer.match(/\*\*Section.*?Actionable Recommendations\*\*(.*?)(?=\*\*Section|\*\*Conclusion|$)/s)
      if (recsMatch) {
        const recsText = recsMatch[1]
        const actionMatches = recsText.match(/\d+\.\s+\*\*(.+?)\*\*:?\s*(.+?)(?=\d+\.|$)/gs)
        if (actionMatches) {
          actionMatches.forEach((match, idx) => {
            const cleanMatch = match.replace(/^\d+\.\s+\*\*/, '').replace(/\*\*:?\s*/, ': ').trim()
            actions.push(cleanMatch)
          })
        }
      }

      setThread({
        summary: answer,
        keyInsights: threadData.keyInsights || insights,
        recommendedActions: threadData.recommendedActions || actions,
        sources: threadData.sources || [],
        lastUpdated: threadData.lastUpdated || new Date().toISOString()
      })
    } catch (err) {
      console.error('Custom research failed:', err)
      // Don't use stub data - show error
      setThread(null)
      setError('Research API not connected yet. Try the Opportunities tab for AI-powered grant discovery instead.')
    } finally {
      setLoading(false)
    }
  }

  const saveCurrentResearch = async () => {
    if (!thread || !customQuery.trim() || !saveTitle.trim()) {
      return
    }

    setSaving(true)
    try {
      // Note: The backend API automatically runs research when saving
      // We just need to provide the query, title, and description
      const response = await fetch(resolveApiUrl('/api/curious-tractor/topics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveTitle,
          description: saveDescription || `Research on: ${customQuery}`,
          query: customQuery
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`)
      }

      const data = await response.json()
      console.log('📊 Save response:', data)

      // Reload topics to show the new saved topic
      await loadTopics()

      // Select the newly saved topic
      if (data.topic?.id) {
        setSelectedTopicId(data.topic.id)

        // Also update the current thread with the saved data
        if (data.thread) {
          setThread({
            summary: data.thread.summary || '',
            keyInsights: data.thread.keyInsights || [],
            recommendedActions: data.thread.recommendedActions || [],
            sources: data.thread.sources || [],
            lastUpdated: data.thread.lastUpdated || new Date().toISOString()
          })
        }
      }

      // Close dialog and reset form
      setShowSaveDialog(false)
      setSaveTitle('')
      setSaveDescription('')

      console.log('✅ Research saved successfully')
    } catch (err) {
      console.error('Failed to save research:', err)
      setError('Failed to save research. Please try again.')
    } finally {
      setSaving(false)
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
          </div>

          {/* Custom Query Input */}
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runCustomQuery()}
              placeholder="e.g., regenerative agriculture grants Queensland 2025..."
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              disabled={loading}
            />
            <button
              onClick={runCustomQuery}
              disabled={loading || !customQuery.trim()}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Researching...' : '🔍 Research'}
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="rounded-2xl bg-white border border-slate-200">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Saved research topics</h2>
              <p className="mt-1 text-xs text-slate-500">Switch threads to load cached intelligence without rerunning full AI jobs.</p>
            </div>
            <nav className="flex flex-col divide-y divide-slate-100">
              {loadingTopics && (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  Loading saved topics...
                </div>
              )}
              {!loadingTopics && savedTopics.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-slate-500">
                  No saved topics yet. Run a custom research query to save your first topic.
                </div>
              )}
              {savedTopics.map((topic) => {
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
            {/* Welcome State - Show when no topics */}
            {!loading && !loadingTopics && savedTopics.length === 0 && !thread && (
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🌱</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Deep AI Research Hub</h3>
                  <p className="text-slate-600 max-w-xl mx-auto">
                    Ask any question about ACT, grants, entity structures, or innovation economics.
                    Powered by Perplexity AI and Tavily.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                  <p className="text-sm text-emerald-900 font-semibold mb-3">💡 Try asking:</p>
                  <ul className="text-sm text-emerald-800 space-y-2">
                    <li>• "What Australian grants are available for Indigenous-led storytelling projects?"</li>
                    <li>• "Compare R&D tax credits vs innovation grants for community-owned entities"</li>
                    <li>• "Best legal structures for community-controlled social enterprises in Australia"</li>
                    <li>• "Regenerative agriculture grants Queensland 2025"</li>
                  </ul>
                </div>

                <div className="text-center text-sm text-slate-500">
                  Type your question in the search bar above and click "🔍 Research" to get started
                </div>
              </div>
            )}

            {/* Show error if API failed */}
            {error && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                {error}
              </div>
            )}

            {/* Show thread data if we have it */}
            {thread && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">Research summary</p>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedTopic?.title || customQuery}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {!selectedTopic && thread && (
                        <button
                          onClick={() => setShowSaveDialog(true)}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                          💾 Save Research
                        </button>
                      )}
                      <div className="text-xs text-slate-500">
                        {loading ? 'Refreshing insights…' : `Last updated ${new Date(thread.lastUpdated).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}`}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-5">
                    {loading ? (
                      <p className="text-sm text-slate-600">Loading research synthesis…</p>
                    ) : !thread.summary ? (
                      <p className="text-sm text-slate-500 italic">No research summary available yet. Run a new query to generate results.</p>
                    ) : (
                      <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
                        {thread.summary.split('\n\n').map((paragraph, idx) => {
                          // Skip empty paragraphs
                          if (!paragraph.trim()) return null

                          // Check if it's a table (contains | separators)
                          if (paragraph.includes('|') && paragraph.split('\n').length > 2) {
                            const lines = paragraph.split('\n').filter(l => l.trim())
                            // Skip separator line (--- | --- | ---)
                            const tableRows = lines.filter(line => !line.match(/^\|[\s\-:|]+\|$/))

                            if (tableRows.length > 1) {
                              const headers = tableRows[0].split('|').map(h => h.trim()).filter(Boolean)
                              const bodyRows = tableRows.slice(1).map(row =>
                                row.split('|').map(cell => cell.trim()).filter(Boolean)
                              )

                              return (
                                <div key={idx} className="overflow-x-auto my-6">
                                  <table className="min-w-full border-collapse border border-slate-300 text-sm">
                                    <thead className="bg-emerald-50">
                                      <tr>
                                        {headers.map((header, hi) => (
                                          <th key={hi} className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-900">
                                            {header}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {bodyRows.map((row, ri) => (
                                        <tr key={ri} className="hover:bg-slate-50">
                                          {row.map((cell, ci) => (
                                            <td key={ci} className="border border-slate-300 px-4 py-2 text-slate-700">
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            }
                          }

                          // Check if it's a section heading (e.g., **Section 1: Title:** or **Key Points:**)
                          if (paragraph.startsWith('**') && paragraph.includes(':**')) {
                            const [title, ...content] = paragraph.split(':**')
                            return (
                              <div key={idx} className="mt-8 first:mt-0">
                                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                                  {title.replace(/\*\*/g, '').trim()}
                                </h3>
                                {content.length > 0 && content.join(':**').trim() && (
                                  <p className="text-sm leading-relaxed text-slate-700">
                                    {content.join(':**').trim()}
                                  </p>
                                )}
                              </div>
                            )
                          }

                          // Check if it's a list (contains line breaks with list markers)
                          if (paragraph.includes('\n-') || paragraph.includes('\n*') || paragraph.includes('\n1.')) {
                            const lines = paragraph.split('\n').filter(l => l.trim())
                            // Determine if it's ordered or unordered
                            const isOrdered = /^\d+\./.test(lines[0]?.trim())
                            const ListTag = isOrdered ? 'ol' : 'ul'
                            const listClass = isOrdered ? 'list-decimal pl-5 space-y-2' : 'list-disc pl-5 space-y-2'

                            return (
                              <ListTag key={idx} className={listClass}>
                                {lines.map((line, li) => {
                                  const cleaned = line
                                    .replace(/^[-*]\s*/, '') // Remove unordered list markers
                                    .replace(/^\d+\.\s*/, '') // Remove ordered list markers
                                    .trim()

                                  if (cleaned) {
                                    // Parse bold text within list items
                                    const parts = cleaned.split(/(\*\*.+?\*\*)/)
                                    return (
                                      <li key={li} className="text-sm text-slate-700">
                                        {parts.map((part, pi) =>
                                          part.startsWith('**') && part.endsWith('**') ? (
                                            <strong key={pi} className="text-slate-900">
                                              {part.replace(/\*\*/g, '')}
                                            </strong>
                                          ) : part
                                        )}
                                      </li>
                                    )
                                  }
                                  return null
                                })}
                              </ListTag>
                            )
                          }

                          // Check if it's a references/links section
                          if (paragraph.toLowerCase().includes('references:') || paragraph.toLowerCase().includes('sources:')) {
                            const lines = paragraph.split('\n')
                            const title = lines[0]
                            const references = lines.slice(1).filter(l => l.trim())

                            return (
                              <div key={idx} className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="text-base font-bold text-slate-900 mb-3">
                                  {title.replace(/\*\*/g, '').trim()}
                                </h3>
                                <ul className="space-y-2">
                                  {references.map((ref, ri) => {
                                    // Try to extract URL if present
                                    const urlMatch = ref.match(/(https?:\/\/[^\s)]+)/)
                                    const url = urlMatch ? urlMatch[1] : null

                                    return (
                                      <li key={ri} className="text-sm text-slate-700 flex items-start gap-2">
                                        <span className="text-emerald-600 mt-0.5">📎</span>
                                        <div>
                                          <div>{ref.replace(/https?:\/\/[^\s)]+/, '').trim()}</div>
                                          {url && (
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline text-xs"
                                            >
                                              {url} →
                                            </a>
                                          )}
                                        </div>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            )
                          }

                          // Regular paragraph - handle bold text and inline links
                          const urlRegex = /(https?:\/\/[^\s]+)/g
                          const parts = paragraph.split(/(\*\*.+?\*\*|https?:\/\/[^\s]+)/)

                          return (
                            <p key={idx} className="text-sm leading-relaxed text-slate-700">
                              {parts.map((part, pi) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={pi} className="text-slate-900">
                                      {part.replace(/\*\*/g, '')}
                                    </strong>
                                  )
                                } else if (part.match(urlRegex)) {
                                  return (
                                    <a
                                      key={pi}
                                      href={part}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      {part}
                                    </a>
                                  )
                                }
                                return part
                              })}
                            </p>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>

                {thread.keyInsights.length > 0 && (
                  <section className="grid gap-4 lg:grid-cols-2">
                    {thread.keyInsights.map((insight) => (
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
                )}

                {thread.recommendedActions.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">Recommended actions</h3>
                      <p className="text-xs text-slate-500">Auto-generated from AI assistant. Validate with community partners before executing.</p>
                    </div>
                    <ol className="space-y-3 px-6 py-5 text-sm text-slate-700">
                      {thread.recommendedActions.map((action, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="mt-1 h-6 w-6 rounded-full bg-emerald-600 text-center text-xs font-bold leading-6 text-white">
                            {idx + 1}
                          </span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {thread.sources.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-4">
                      <h3 className="text-sm font-semibold text-slate-900">Sources & evidence</h3>
                      <p className="text-xs text-slate-500">Traceability to Notion, Supabase, and external research for wiki transparency.</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {thread.sources.map((source) => (
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
                )}
              </>
            )}

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

      {/* Save Research Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Save Research</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Give this research a memorable title so you can find it later in your saved topics.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Research Title *
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="e.g., Indigenous Grants 2025 Research"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Add notes about what this research covers..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                  rows={3}
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-900">
                  <strong>Query:</strong> {customQuery}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrentResearch}
                  disabled={saving || !saveTitle.trim()}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {saving ? '💾 Saving...' : '💾 Save Research'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
