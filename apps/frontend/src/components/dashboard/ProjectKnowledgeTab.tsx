/**
 * ProjectKnowledgeTab - "What's Happening" Knowledge Feed
 *
 * Shows unified project knowledge from project_knowledge table:
 * - Recent activity feed (voice notes, meetings, reflections, events)
 * - Decisions with status tracking
 * - Open questions requiring attention
 * - Full timeline view
 *
 * Plugs into FullProjectPage as an additional tab.
 *
 * Data source: project_knowledge table in Supabase
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// Types
interface ProjectKnowledge {
  id: string
  project_code: string
  project_name: string | null
  knowledge_type: string
  title: string | null
  content: string | null
  source_type: string | null
  source_url: string | null
  recorded_by: string | null
  recorded_at: string
  participants: string[] | null
  topics: string[] | null
  importance: string
  action_required: boolean
  decision_status: string | null
  decision_rationale: string | null
  follow_up_date: string | null
}

// Knowledge type config
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  reflection: { icon: '💭', color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Reflection' },
  decision: { icon: '⚖️', color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Decision' },
  meeting: { icon: '📅', color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Meeting' },
  voice_note: { icon: '🎙️', color: 'bg-pink-100 text-pink-700 border-pink-200', label: 'Voice Note' },
  document: { icon: '📄', color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Document' },
  event: { icon: '📌', color: 'bg-green-100 text-green-700 border-green-200', label: 'Event' },
  question: { icon: '❓', color: 'bg-red-100 text-red-700 border-red-200', label: 'Question' },
  link: { icon: '🔗', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'Link' },
  communication: { icon: '💬', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Communication' },
  milestone: { icon: '🎯', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Milestone' },
}

const DECISION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  proposed: { label: 'Proposed', color: 'bg-amber-100 text-amber-700' },
  decided: { label: 'Decided', color: 'bg-green-100 text-green-700' },
  implemented: { label: 'Implemented', color: 'bg-blue-100 text-blue-700' },
  revisited: { label: 'Revisited', color: 'bg-purple-100 text-purple-700' },
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// View types
type ViewType = 'happening' | 'decisions' | 'questions' | 'timeline'

interface ProjectKnowledgeTabProps {
  projectCode: string
}

export function ProjectKnowledgeTab({ projectCode }: ProjectKnowledgeTabProps) {
  const [knowledge, setKnowledge] = useState<ProjectKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewType>('happening')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCapture, setShowCapture] = useState(false)

  // Fetch knowledge
  const fetchKnowledge = useCallback(async () => {
    if (!supabase) {
      setError('Database connection not available')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('project_knowledge')
        .select('*')
        .eq('project_code', projectCode)
        .order('recorded_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError
      setKnowledge(data || [])
    } catch (err: any) {
      console.error('Failed to fetch knowledge:', err)
      setError(err.message || 'Failed to load knowledge')
    } finally {
      setLoading(false)
    }
  }, [projectCode])

  useEffect(() => {
    fetchKnowledge()
  }, [fetchKnowledge])

  // Filter by view
  const filteredKnowledge = knowledge.filter(k => {
    switch (view) {
      case 'happening':
        return ['voice_note', 'meeting', 'communication', 'event', 'reflection'].includes(k.knowledge_type)
      case 'decisions':
        return k.knowledge_type === 'decision'
      case 'questions':
        return k.knowledge_type === 'question' && k.action_required
      case 'timeline':
        return true
      default:
        return true
    }
  })

  // Stats
  const stats = {
    total: knowledge.length,
    decisions: knowledge.filter(k => k.knowledge_type === 'decision').length,
    openQuestions: knowledge.filter(k => k.knowledge_type === 'question' && k.action_required).length,
    critical: knowledge.filter(k => k.importance === 'critical').length,
    thisWeek: knowledge.filter(k => {
      const date = new Date(k.recorded_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return date > weekAgo
    }).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <span className="ml-3 text-slate-600">Loading knowledge...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700 mb-2">{error}</p>
        <button
          onClick={fetchKnowledge}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="text-center px-4 border-r border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className="text-center px-4 border-r border-slate-200">
          <div className="text-2xl font-bold text-emerald-600">{stats.thisWeek}</div>
          <div className="text-xs text-slate-500">This Week</div>
        </div>
        <div className="text-center px-4 border-r border-slate-200">
          <div className="text-2xl font-bold text-amber-600">{stats.decisions}</div>
          <div className="text-xs text-slate-500">Decisions</div>
        </div>
        <div className="text-center px-4">
          <div className="text-2xl font-bold text-red-600">{stats.openQuestions}</div>
          <div className="text-xs text-slate-500">Open Questions</div>
        </div>
        {stats.critical > 0 && (
          <div className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            ⚠️ {stats.critical} Critical
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'happening' as ViewType, label: "What's Happening", icon: '🔔', badge: 0 },
          { id: 'decisions' as ViewType, label: 'Decisions', icon: '⚖️', badge: 0 },
          { id: 'questions' as ViewType, label: 'Questions', icon: '❓', badge: stats.openQuestions },
          { id: 'timeline' as ViewType, label: 'Timeline', icon: '📅', badge: 0 },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              view === tab.id
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {filteredKnowledge.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <div className="text-4xl mb-2">
            {view === 'happening' ? '🔔' : view === 'decisions' ? '⚖️' : view === 'questions' ? '❓' : '📅'}
          </div>
          <p className="text-slate-600 mb-2">No {view} recorded yet</p>
          <p className="text-sm text-slate-500">
            Add knowledge with the CLI:
          </p>
          <code className="mt-2 inline-block px-3 py-1 bg-slate-200 rounded text-xs">
            node scripts/capture-knowledge.mjs -p {projectCode} -r "Your reflection"
          </code>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKnowledge.map(item => (
            <KnowledgeCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </div>
      )}

      {/* Capture Form */}
      <CaptureForm
        projectCode={projectCode}
        isOpen={showCapture}
        onToggle={() => setShowCapture(!showCapture)}
        onSaved={() => {
          fetchKnowledge()
          setShowCapture(false)
        }}
      />
    </div>
  )
}

// Knowledge Card Component
function KnowledgeCard({ item, expanded, onToggle }: {
  item: ProjectKnowledge
  expanded: boolean
  onToggle: () => void
}) {
  const config = TYPE_CONFIG[item.knowledge_type] || TYPE_CONFIG.reflection

  return (
    <div
      className={`bg-white rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
        item.importance === 'critical' ? 'border-l-4 border-l-red-500 border-slate-200' :
        item.importance === 'high' ? 'border-l-4 border-l-amber-500 border-slate-200' :
        'border-slate-200'
      }`}
      onClick={onToggle}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-xl">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
                {config.label}
              </span>
              <span className="text-slate-400 text-xs">{formatRelativeTime(item.recorded_at)}</span>
              {item.importance === 'critical' && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs border border-red-200">
                  ⚠️ Critical
                </span>
              )}
              {item.action_required && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs border border-amber-200">
                  Action Required
                </span>
              )}
            </div>

            {/* Title */}
            {item.title && (
              <h4 className="font-medium text-slate-900 mb-1">{item.title}</h4>
            )}

            {/* Content preview */}
            {item.content && (
              <p className={`text-sm text-slate-600 ${expanded ? '' : 'line-clamp-2'}`}>
                {item.content}
              </p>
            )}

            {/* Decision status */}
            {item.knowledge_type === 'decision' && item.decision_status && (
              <div className="mt-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                  DECISION_STATUS_CONFIG[item.decision_status]?.color || 'bg-slate-100 text-slate-600'
                }`}>
                  {DECISION_STATUS_CONFIG[item.decision_status]?.label || item.decision_status}
                </span>
              </div>
            )}
          </div>
          <span className="text-slate-300 text-xs">{expanded ? '▼' : '▶'}</span>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {item.decision_rationale && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Rationale</div>
                <p className="text-sm text-slate-700">{item.decision_rationale}</p>
              </div>
            )}

            {item.participants && item.participants.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Participants</div>
                <div className="flex flex-wrap gap-1">
                  {item.participants.map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded text-sm">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {item.topics && item.topics.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Topics</div>
                <div className="flex flex-wrap gap-1">
                  {item.topics.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {item.follow_up_date && (
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <span>📆</span>
                <span>Follow up: {new Date(item.follow_up_date).toLocaleDateString('en-AU')}</span>
              </div>
            )}

            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-800"
                onClick={e => e.stopPropagation()}
              >
                🔗 View source
              </a>
            )}

            {item.recorded_by && (
              <div className="text-xs text-slate-400">
                Recorded by {item.recorded_by}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Capture Form Component
type CaptureType = 'reflection' | 'decision' | 'question' | 'link' | 'voice_note' | 'meeting'

function CaptureForm({
  projectCode,
  isOpen,
  onToggle,
  onSaved,
}: {
  projectCode: string
  isOpen: boolean
  onToggle: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<CaptureType>('reflection')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [importance, setImportance] = useState<'normal' | 'high' | 'critical'>('normal')
  const [actionRequired, setActionRequired] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const captureTypes = [
    { id: 'reflection' as CaptureType, icon: '💭', label: 'Note' },
    { id: 'decision' as CaptureType, icon: '⚖️', label: 'Decision' },
    { id: 'question' as CaptureType, icon: '❓', label: 'Question' },
    { id: 'link' as CaptureType, icon: '🔗', label: 'Link' },
    { id: 'voice_note' as CaptureType, icon: '🎙️', label: 'Voice' },
    { id: 'meeting' as CaptureType, icon: '📅', label: 'Meeting' },
  ]

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
    } catch (err) {
      setError('Could not access microphone. Please allow microphone access.')
    }
  }

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Clear recording
  const clearRecording = () => {
    setAudioBlob(null)
    setRecordingTime(0)
  }

  // Save knowledge
  const handleSave = async () => {
    if (!supabase) {
      setError('Database connection not available')
      return
    }

    if (!content.trim() && !audioBlob && !url.trim()) {
      setError('Please add some content')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // For voice notes, we'd typically upload to storage first
      // For now, we'll save a placeholder and note that audio was recorded
      const knowledgeData = {
        project_code: projectCode,
        knowledge_type: type,
        title: title.trim() || null,
        content: audioBlob
          ? `[Voice note recorded - ${formatTime(recordingTime)}]\n\n${content.trim() || 'No transcription yet'}`
          : content.trim() || null,
        source_url: url.trim() || null,
        source_type: type === 'link' ? 'external_link' : type === 'meeting' ? 'notion' : 'manual',
        importance,
        action_required: actionRequired || type === 'question',
        recorded_by: 'Dashboard User',
        recorded_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from('project_knowledge')
        .insert(knowledgeData)

      if (insertError) throw insertError

      // Reset form
      setContent('')
      setTitle('')
      setUrl('')
      setImportance('normal')
      setActionRequired(false)
      setAudioBlob(null)
      setRecordingTime(0)
      setType('reflection')

      onSaved()
    } catch (err: any) {
      console.error('Failed to save knowledge:', err)
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-emerald-100/50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <span className="font-medium text-emerald-800">Add Knowledge</span>
        </div>
        <span className="text-emerald-600">{isOpen ? '▼' : '▶'}</span>
      </button>

      {/* Form - Collapsible */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* Type Selector */}
          <div className="flex flex-wrap gap-2">
            {captureTypes.map(ct => (
              <button
                key={ct.id}
                onClick={() => setType(ct.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                  type === ct.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                <span>{ct.icon}</span>
                {ct.label}
              </button>
            ))}
          </div>

          {/* Title (optional) */}
          <input
            type="text"
            placeholder={type === 'decision' ? 'Decision title...' : type === 'question' ? 'Question...' : 'Title (optional)'}
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-sm"
          />

          {/* Content Area */}
          {type === 'voice_note' ? (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              {!audioBlob ? (
                <div className="flex flex-col items-center gap-3">
                  {isRecording ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                      </div>
                      <button
                        onClick={stopRecording}
                        className="px-6 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition"
                      >
                        Stop Recording
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="px-6 py-3 bg-pink-500 text-white rounded-full font-medium hover:bg-pink-600 transition flex items-center gap-2"
                    >
                      <span className="text-xl">🎙️</span>
                      Start Recording
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-pink-500">🎙️</span>
                      <span className="text-sm text-slate-600">Recording: {formatTime(recordingTime)}</span>
                    </div>
                    <button
                      onClick={clearRecording}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <audio controls className="w-full" src={URL.createObjectURL(audioBlob)} />
                </div>
              )}

              {/* Optional transcription notes */}
              <textarea
                placeholder="Add notes about this recording..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={2}
                className="w-full mt-3 px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-sm resize-none"
              />
            </div>
          ) : type === 'link' || type === 'meeting' ? (
            <div className="space-y-3">
              <input
                type="url"
                placeholder={type === 'meeting' ? 'Notion meeting link...' : 'Paste URL...'}
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-sm"
              />
              <textarea
                placeholder="Notes about this link..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-sm resize-none"
              />
            </div>
          ) : (
            <textarea
              placeholder={
                type === 'reflection' ? "What's on your mind about this project?" :
                type === 'decision' ? "What was decided and why?" :
                type === 'question' ? "What needs to be answered?" :
                "Add your notes..."
              }
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-sm resize-none"
            />
          )}

          {/* Options Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={importance}
              onChange={e => setImportance(e.target.value as 'normal' | 'high' | 'critical')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="normal">Normal</option>
              <option value="high">⚡ High Priority</option>
              <option value="critical">🚨 Critical</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={actionRequired}
                onChange={e => setActionRequired(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Action Required
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onToggle}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectKnowledgeTab
