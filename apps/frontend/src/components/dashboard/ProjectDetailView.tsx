/**
 * ProjectDetailView - Unified Project Knowledge Hub
 *
 * Shows everything about a project in one place:
 * - Header with status, lead, location from Notion
 * - Strategic summary and key decisions
 * - "What's Happening" feed (voice notes, meetings, communications)
 * - Open questions requiring attention
 * - Timeline of all project knowledge
 *
 * Data flows from:
 * - project_knowledge table (unified knowledge)
 * - Notion (project metadata, actions, resources)
 * - voice_notes (transcribed conversations)
 * - communications_history (emails, messages)
 *
 * For ACT Operations (Nic + Ben)
 */

import { useState, useEffect, useCallback } from 'react'
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

interface ProjectMeta {
  notion_id: string | null
  name: string
  code: string
  status: string
  lead: string | null
  location: string | null
  place: string | null  // Indigenous place name
  next_milestone: string | null
  github_url: string | null
  production_url: string | null
}

interface WhatsHappening {
  id: string
  type: 'voice_note' | 'meeting' | 'communication' | 'reflection' | 'event' | 'decision'
  title: string
  summary: string
  source: string  // 'clawdbot', 'discord', 'gmail', 'notion', 'manual'
  timestamp: string
  participants?: string[]
  importance: string
  action_required: boolean
  archived: boolean
}

// Knowledge type icons and colors
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  reflection: { icon: '💭', color: 'bg-purple-500/20 text-purple-300', label: 'Reflection' },
  decision: { icon: '⚖️', color: 'bg-amber-500/20 text-amber-300', label: 'Decision' },
  meeting: { icon: '📅', color: 'bg-blue-500/20 text-blue-300', label: 'Meeting' },
  voice_note: { icon: '🎙️', color: 'bg-pink-500/20 text-pink-300', label: 'Voice Note' },
  document: { icon: '📄', color: 'bg-gray-500/20 text-gray-300', label: 'Document' },
  event: { icon: '📌', color: 'bg-green-500/20 text-green-300', label: 'Event' },
  question: { icon: '❓', color: 'bg-red-500/20 text-red-300', label: 'Question' },
  link: { icon: '🔗', color: 'bg-cyan-500/20 text-cyan-300', label: 'Link' },
  communication: { icon: '💬', color: 'bg-indigo-500/20 text-indigo-300', label: 'Communication' },
  milestone: { icon: '🎯', color: 'bg-yellow-500/20 text-yellow-300', label: 'Milestone' },
}

const IMPORTANCE_COLORS: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-amber-500',
  normal: 'border-l-transparent',
  low: 'border-l-gray-600',
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

// Props
interface ProjectDetailViewProps {
  projectCode: string
  onClose?: () => void
}

export function ProjectDetailView({ projectCode, onClose }: ProjectDetailViewProps) {
  const [knowledge, setKnowledge] = useState<ProjectKnowledge[]>([])
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'happening' | 'decisions' | 'questions' | 'timeline'>('happening')
  const [showArchived, setShowArchived] = useState(false)

  // Fetch project knowledge
  const fetchKnowledge = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('project_knowledge')
        .select('*')
        .eq('project_code', projectCode)
        .order('recorded_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setKnowledge(data || [])

      // Extract project name from first item
      if (data && data.length > 0 && data[0].project_name) {
        setProjectMeta(prev => prev ? { ...prev, name: data[0].project_name! } : null)
      }
    } catch (err) {
      console.error('Failed to fetch knowledge:', err)
    } finally {
      setLoading(false)
    }
  }, [projectCode])

  // Fetch project metadata (would come from Notion/config in real implementation)
  const fetchProjectMeta = useCallback(async () => {
    // For now, use static config - in production this would fetch from Notion
    const staticMeta: Record<string, Partial<ProjectMeta>> = {
      'ACT-HV': {
        name: 'The Harvest Witta',
        code: 'ACT-HV',
        status: 'Active 🔥',
        lead: 'Nicholas Marchesi',
        location: '601 Maleny Kenilworth Rd, Witta QLD 4552',
        place: 'Gubbi Gubbi Country',
        notion_id: '11debcf9-81cf-8082-8fd0-d6031a9709f2',
        github_url: 'https://github.com/Acurioustractor/harvest-community-hub',
        production_url: 'https://harvest-community.vercel.app',
      },
      'ACT-JH': {
        name: 'JusticeHub',
        code: 'ACT-JH',
        status: 'Active 🔥',
        lead: 'Benjamin Knight',
        place: 'Meanjin',
      },
      'ACT-EL': {
        name: 'Empathy Ledger',
        code: 'ACT-EL',
        status: 'Active 🔥',
        lead: 'Benjamin Knight',
      },
    }

    const meta = staticMeta[projectCode] || { name: projectCode, code: projectCode, status: 'Unknown' }
    setProjectMeta(meta as ProjectMeta)
  }, [projectCode])

  useEffect(() => {
    fetchProjectMeta()
    fetchKnowledge()
  }, [fetchProjectMeta, fetchKnowledge])

  // Filter knowledge by tab
  const filteredKnowledge = knowledge.filter(k => {
    switch (activeTab) {
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🌱</span>
              <h2 className="text-2xl font-bold text-white">{projectMeta?.name || projectCode}</h2>
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-sm">
                {projectMeta?.status}
              </span>
            </div>
            {projectMeta?.place && (
              <p className="text-amber-300/70 text-sm mb-1">📍 {projectMeta.place}</p>
            )}
            {projectMeta?.location && (
              <p className="text-white/50 text-sm">{projectMeta.location}</p>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/50 hover:text-white">
              ✕
            </button>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
            <div className="text-xs text-white/50">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-300">{stats.decisions}</div>
            <div className="text-xs text-white/50">Decisions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-300">{stats.openQuestions}</div>
            <div className="text-xs text-white/50">Open Questions</div>
          </div>
          {stats.critical > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
              <div className="text-xs text-white/50">Critical</div>
            </div>
          )}
        </div>

        {/* Project lead */}
        {projectMeta?.lead && (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
            <span>👤</span>
            <span>Lead: {projectMeta.lead}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'happening', label: "What's Happening", icon: '🔔' },
          { id: 'decisions', label: 'Decisions', icon: '⚖️' },
          { id: 'questions', label: 'Questions', icon: '❓', badge: stats.openQuestions },
          { id: 'timeline', label: 'Timeline', icon: '📅' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white bg-white/10 border-b-2 border-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300 text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {filteredKnowledge.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            <p className="text-lg mb-2">No {activeTab} yet</p>
            <p className="text-sm">
              Capture knowledge with: <code className="bg-white/10 px-2 py-1 rounded">
                node scripts/capture-knowledge.mjs -p {projectCode}
              </code>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredKnowledge.map(item => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Links */}
      <div className="p-4 border-t border-white/10 flex gap-4">
        {projectMeta?.notion_id && (
          <a
            href={`https://notion.so/${projectMeta.notion_id.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 hover:text-white flex items-center gap-1"
          >
            📓 Notion
          </a>
        )}
        {projectMeta?.github_url && (
          <a
            href={projectMeta.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 hover:text-white flex items-center gap-1"
          >
            💻 GitHub
          </a>
        )}
        {projectMeta?.production_url && (
          <a
            href={projectMeta.production_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 hover:text-white flex items-center gap-1"
          >
            🌐 Live Site
          </a>
        )}
      </div>
    </div>
  )
}

// Knowledge Card Component
function KnowledgeCard({ item }: { item: ProjectKnowledge }) {
  const [expanded, setExpanded] = useState(false)
  const config = TYPE_CONFIG[item.knowledge_type] || TYPE_CONFIG.reflection

  return (
    <div
      className={`p-4 rounded-lg bg-white/5 border-l-4 ${IMPORTANCE_COLORS[item.importance]} cursor-pointer hover:bg-white/10 transition-colors`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-xl">{config.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs ${config.color}`}>
              {config.label}
            </span>
            <span className="text-white/40 text-xs">{formatRelativeTime(item.recorded_at)}</span>
            {item.importance === 'critical' && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 text-xs">
                ⚠️ Critical
              </span>
            )}
            {item.action_required && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-xs">
                Action Required
              </span>
            )}
          </div>

          {/* Title */}
          {item.title && (
            <h4 className="text-white font-medium mb-1">{item.title}</h4>
          )}

          {/* Content preview or full */}
          {item.content && (
            <p className={`text-white/70 text-sm ${expanded ? '' : 'line-clamp-2'}`}>
              {item.content}
            </p>
          )}

          {/* Decision status */}
          {item.knowledge_type === 'decision' && item.decision_status && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-white/50">Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                item.decision_status === 'decided' ? 'bg-green-500/20 text-green-300' :
                item.decision_status === 'proposed' ? 'bg-amber-500/20 text-amber-300' :
                item.decision_status === 'implemented' ? 'bg-blue-500/20 text-blue-300' :
                'bg-gray-500/20 text-gray-300'
              }`}>
                {item.decision_status}
              </span>
            </div>
          )}

          {/* Expanded view */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              {item.decision_rationale && (
                <div>
                  <span className="text-xs text-white/50">Rationale:</span>
                  <p className="text-white/70 text-sm">{item.decision_rationale}</p>
                </div>
              )}
              {item.participants && item.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">👥</span>
                  <span className="text-white/60 text-sm">{item.participants.join(', ')}</span>
                </div>
              )}
              {item.topics && item.topics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.topics.map(topic => (
                    <span key={topic} className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
              {item.follow_up_date && (
                <div className="flex items-center gap-2 text-amber-300 text-sm">
                  <span>📆</span>
                  <span>Follow up: {new Date(item.follow_up_date).toLocaleDateString('en-AU')}</span>
                </div>
              )}
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 text-sm hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  🔗 View source
                </a>
              )}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <span className="text-white/30 text-xs">{expanded ? '▼' : '▶'}</span>
      </div>
    </div>
  )
}

export default ProjectDetailView
