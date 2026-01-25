/**
 * useStories - Data fetching hook for stories (Empathy Ledger)
 *
 * Fetches stories and storytellers from the Empathy Ledger v2 API.
 *
 * USAGE:
 *   const { stories, storytellers, stats, loading, error } = useStories({ limit: 20 })
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveEmpathyLedgerUrl } from '../../config/env'
import type { Story, Storyteller, StoryStats } from './types'

interface UseStoriesReturn {
  stories: Story[]
  storytellers: Storyteller[]
  stats: StoryStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch stories from Empathy Ledger v2
 */
export function useStories(options: { limit?: number; search?: string } = {}): UseStoriesReturn {
  const [stories, setStories] = useState<Story[]>([])
  const [storytellers, setStorytellers] = useState<Storyteller[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<StoryStats | null>(null)

  const { limit = 20, search = '' } = options

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true)

      const storiesRes = await fetch(
        resolveEmpathyLedgerUrl(
          `/api/stories?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
        )
      ).then((r) => r.json())

      if (storiesRes.success && storiesRes.content) {
        const mappedStories: Story[] = storiesRes.content.map((s: any) => ({
          id: s.id,
          title: s.title || 'Untitled Story',
          content: s.content,
          excerpt: s.content?.substring(0, 150) + '...',
          project: s.project_name || s.project || 'General',
          privacy_level: s.status === 'published' ? 'public' : 'internal',
          consent: s.status === 'published' ? 'external' : 'internal',
          authority: s.cultural_sensitivity === 'elder_review_required' ? 'elder' : 'community',
          created_at: s.created_at,
          storyteller_name: s.author?.display_name || s.author?.full_name || 'Anonymous',
          media_count: s.media_count || 0,
        }))
        setStories(mappedStories)
      }

      if (storiesRes.stats) {
        setStats({
          stories: storiesRes.stats.total || 0,
          storytellers: storiesRes.stats.locations || 0,
        })
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching stories from EL v2:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch stories')
    } finally {
      setLoading(false)
    }
  }, [limit, search])

  useEffect(() => {
    fetchStories()
  }, [fetchStories])

  return { stories, storytellers, stats, loading, error, refetch: fetchStories }
}
