/**
 * useEmails - Data fetching hook for emails (Gmail)
 *
 * Fetches emails from multiple Gmail accounts via the workspace API.
 *
 * USAGE:
 *   const { emails, stats, connectedAccounts, loading, error } = useEmails({ limit: 10 })
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveApiUrl } from '../../config/env'
import type { Email, EmailAccount, EmailStats } from './types'

interface UseEmailsReturn {
  emails: Email[]
  stats: EmailStats | null
  connectedAccounts: string[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch emails from all connected Gmail accounts
 */
export function useEmails(options: { limit?: number } = {}): UseEmailsReturn {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])

  const { limit = 10 } = options

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true)

      const [emailsRes, statsRes] = await Promise.allSettled([
        fetch(resolveApiUrl(`/api/workspace-gmail/emails?limit=${limit}`)).then((r) => r.json()),
        fetch(resolveApiUrl('/api/workspace-gmail/stats?days=7')).then((r) => r.json()),
      ])

      if (emailsRes.status === 'fulfilled' && emailsRes.value.success) {
        const mappedEmails: Email[] = (emailsRes.value.emails || []).map((e: any) => ({
          id: e.id,
          subject: e.subject || '(No Subject)',
          from: e.from || 'Unknown',
          to: e.to,
          snippet: e.snippet,
          sent_date: e.date,
          is_read: !e.isUnread,
          is_starred: e.labels?.includes('STARRED') ?? false,
          labels: e.labels || [],
          thread_id: e.threadId,
          account: e.account,
        }))
        setEmails(mappedEmails)
        setConnectedAccounts(emailsRes.value.accounts || [])
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setStats({
          accounts: statsRes.value.stats.accounts || [],
          totals: statsRes.value.stats.totals || { received: 0, sent: 0, unread: 0 },
        })
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching workspace emails:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  return { emails, stats, connectedAccounts, loading, error, refetch: fetchEmails }
}

// ============================================
// Dashboard Stats (Combined)
// ============================================

import type { DashboardStats } from './types'

/**
 * Fetch combined dashboard statistics
 */
export function useDashboardStats(): {
  stats: DashboardStats | null
  loading: boolean
} {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)

        const [projectsRes, elStoriesRes, contactsRes, gmailRes] = await Promise.allSettled([
          api.getDashboardProjects(100),
          fetch(resolveEmpathyLedgerUrl('/api/stories?limit=1')).then((r) => r.json()),
          fetch(resolveApiUrl('/api/v1/contacts/all/stats')).then((r) => r.json()),
          fetch(resolveApiUrl('/api/workspace-gmail/stats?days=7')).then((r) => r.json()),
        ])

        setStats({
          projects:
            projectsRes.status === 'fulfilled' ? projectsRes.value.projects?.length || 0 : 0,
          stories:
            elStoriesRes.status === 'fulfilled' ? elStoriesRes.value.stats?.total || 0 : 0,
          contacts:
            contactsRes.status === 'fulfilled' ? contactsRes.value.data?.total || 0 : 0,
          events: 0,
          emails:
            gmailRes.status === 'fulfilled' ? gmailRes.value.stats?.totals?.received || 0 : 0,
        })
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, loading }
}
