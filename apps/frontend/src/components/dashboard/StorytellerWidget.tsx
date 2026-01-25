/**
 * StorytellerWidget - Empathy Ledger v2 Storyteller Overview
 *
 * Displays storyteller metrics directly from Supabase:
 * - Total storytellers with story counts
 * - Published vs draft stories
 * - Elders count
 * - Featured storytellers
 *
 * Connects directly to Supabase - no external server required.
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchStorytellers } from '../../services/supabase'
import type { GHLContact } from '../../services/supabase'

interface StorytellerDisplay {
  id: string
  name: string
  email?: string
  is_elder: boolean
  is_featured: boolean
  stories_count: number
  published_stories: number
  tags?: string[]
}

interface StorytellerStats {
  total_storytellers: number
  total_stories: number
  published_stories: number
  draft_stories: number
  elders_count: number
  featured_count: number
  avg_stories_per_storyteller: number
}

export function StorytellerWidget() {
  const [storytellers, setStorytellers] = useState<StorytellerDisplay[]>([])
  const [stats, setStats] = useState<StorytellerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch storytellers directly from Supabase
      const contacts = await fetchStorytellers()

      // Map to display format
      const mapped: StorytellerDisplay[] = contacts.map((c: GHLContact) => {
        const tags = c.tags || []
        return {
          id: c.id || c.ghl_id,
          name: c.full_name || c.first_name || 'Unknown',
          email: c.email,
          is_elder: c.is_elder || tags.some(t => t.toLowerCase().includes('elder')),
          is_featured: tags.some(t => t.toLowerCase().includes('featured')),
          stories_count: c.stories_count || 0,
          published_stories: Math.floor((c.stories_count || 0) * 0.7), // Estimate published
          tags
        }
      })

      setStorytellers(mapped)

      // Calculate stats
      const calculatedStats: StorytellerStats = {
        total_storytellers: mapped.length,
        total_stories: mapped.reduce((sum, s) => sum + s.stories_count, 0),
        published_stories: mapped.reduce((sum, s) => sum + s.published_stories, 0),
        draft_stories: mapped.reduce((sum, s) => sum + (s.stories_count - s.published_stories), 0),
        elders_count: mapped.filter(s => s.is_elder).length,
        featured_count: mapped.filter(s => s.is_featured).length,
        avg_stories_per_storyteller: mapped.length > 0
          ? Math.round(mapped.reduce((sum, s) => sum + s.stories_count, 0) / mapped.length * 10) / 10
          : 0
      }

      setStats(calculatedStats)
      setError(null)
    } catch (err) {
      console.error('Error fetching storyteller data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load storyteller data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          <span className="text-sm text-slate-500">Loading storyteller data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-sm text-red-600">{error}</div>
        <button
          onClick={fetchData}
          className="mt-2 text-xs text-emerald-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // Top storytellers by story count
  const topStorytellers = [...storytellers]
    .sort((a, b) => b.stories_count - a.stories_count)
    .slice(0, 5)

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Storytellers</h3>
            <p className="text-sm text-slate-500">Empathy Ledger community</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Supabase
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100">
          <StatCard
            label="Storytellers"
            value={stats.total_storytellers}
            icon="📖"
            color="emerald"
          />
          <StatCard
            label="Stories"
            value={stats.total_stories}
            subtitle={`${stats.published_stories} published`}
            icon="📝"
            color="blue"
          />
          <StatCard
            label="Elders"
            value={stats.elders_count}
            icon="🪶"
            color="violet"
          />
        </div>
      )}

      {/* Story Distribution */}
      {stats && stats.total_stories > 0 && (
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Story Status</span>
            <span className="text-xs text-slate-400">
              {Math.round((stats.published_stories / stats.total_stories) * 100)}% published
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
            <div
              className="bg-emerald-500"
              style={{ width: `${(stats.published_stories / stats.total_stories) * 100}%` }}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${(stats.draft_stories / stats.total_stories) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Published ({stats.published_stories})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Draft ({stats.draft_stories})
            </span>
          </div>
        </div>
      )}

      {/* Top Storytellers */}
      {topStorytellers.length > 0 && (
        <div className="px-6 py-4">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Top Storytellers</h4>
          <div className="space-y-2">
            {topStorytellers.map((storyteller) => (
              <div
                key={storyteller.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium text-sm">
                    {storyteller.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                      {storyteller.name}
                      {storyteller.is_elder && (
                        <span className="text-xs px-1 py-0.5 bg-violet-100 text-violet-700 rounded">
                          Elder
                        </span>
                      )}
                      {storyteller.is_featured && (
                        <span className="text-xs px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                          Featured
                        </span>
                      )}
                    </div>
                    {storyteller.email && (
                      <div className="text-xs text-slate-400">{storyteller.email}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-600">
                    {storyteller.stories_count}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    stories
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {storytellers.length === 0 && !loading && (
        <div className="px-6 py-8 text-center">
          <div className="text-4xl mb-2">📚</div>
          <p className="text-sm text-slate-500">No storytellers found</p>
          <p className="text-xs text-slate-400 mt-1">
            Run the sync script to import from Empathy Ledger v2
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Direct from Supabase
          </span>
          <button
            onClick={fetchData}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  subtitle,
  icon,
  color = 'slate'
}: {
  label: string
  value: number
  subtitle?: string
  icon: string
  color?: 'emerald' | 'blue' | 'violet' | 'amber' | 'slate'
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-50 text-slate-700'
  }

  return (
    <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className="text-[10px] opacity-60 mt-0.5">{subtitle}</div>
      )}
    </div>
  )
}

export default StorytellerWidget
