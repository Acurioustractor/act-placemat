/**
 * useContacts - Data fetching hook for contacts
 *
 * Fetches contacts from various sources (LinkedIn, Notion, Gmail).
 *
 * USAGE:
 *   const { contacts, stats, loading, error } = useContacts({ limit: 50 })
 */

import { useState, useEffect, useCallback } from 'react'
import { resolveApiUrl } from '../../config/env'
import type { Contact, ContactStats, UnifiedContact, UnifiedContactStats } from './types'

// ============================================
// Standard Contacts
// ============================================

interface UseContactsReturn {
  contacts: Contact[]
  stats: ContactStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch contacts from API
 */
export function useContacts(options: { limit?: number; search?: string; type?: string } = {}): UseContactsReturn {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ContactStats | null>(null)

  const { limit = 50, search = '', type = '' } = options

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)

      const [contactsRes, statsRes] = await Promise.allSettled([
        fetch(
          resolveApiUrl(
            `/api/contacts/search?limit=${limit}${search ? `&query=${encodeURIComponent(search)}` : ''}`
          )
        ).then((r) => r.json()),
        fetch(resolveApiUrl('/api/contacts/stats')).then((r) => r.json()),
      ])

      if (contactsRes.status === 'fulfilled' && contactsRes.value.contacts) {
        const mappedContacts: Contact[] = contactsRes.value.contacts.map((c: any) => ({
          id: c.id,
          full_name: c.full_name || 'Unknown',
          email_address: c.email_address,
          current_company: c.current_company,
          current_position: c.current_position,
          type: inferContactType(c),
          project: c.project || null,
          last_contact: c.last_contact_date || c.imported_at,
          stories_count: c.stories_count || 0,
          data_source: c.data_source || 'linkedin',
        }))

        const filtered = type ? mappedContacts.filter((c) => c.type === type) : mappedContacts
        setContacts(filtered)
      }

      if (statsRes.status === 'fulfilled') {
        setStats({ total: statsRes.value.total_contacts || 0 })
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }, [limit, search, type])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return { contacts, stats, loading, error, refetch: fetchContacts }
}

// ============================================
// Unified Contacts (Gmail + LinkedIn + Notion)
// ============================================

interface UseAllContactsReturn {
  contacts: UnifiedContact[]
  stats: UnifiedContactStats | null
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  } | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch unified contacts from all sources (14,000+ contacts)
 */
export function useAllContacts(options: {
  limit?: number
  offset?: number
  dataSource?: string
  engagementPriority?: string
  search?: string
} = {}): UseAllContactsReturn {
  const [contacts, setContacts] = useState<UnifiedContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<UnifiedContactStats | null>(null)
  const [pagination, setPagination] = useState<{
    total: number
    limit: number
    offset: number
    hasMore: boolean
  } | null>(null)

  const { limit = 50, offset = 0, dataSource, engagementPriority, search } = options

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (dataSource) params.set('data_source', dataSource)
      if (engagementPriority) params.set('engagement_priority', engagementPriority)
      if (search) params.set('search', search)

      const [contactsRes, statsRes] = await Promise.allSettled([
        fetch(resolveApiUrl(`/api/v1/contacts/all?${params}`)).then((r) => r.json()),
        fetch(resolveApiUrl('/api/v1/contacts/all/stats')).then((r) => r.json()),
      ])

      if (contactsRes.status === 'fulfilled' && contactsRes.value.data?.contacts) {
        setContacts(contactsRes.value.data.contacts)
        setPagination(contactsRes.value.data.pagination)
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data)
      }

      setError(null)
    } catch (err) {
      console.error('Error fetching all contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, dataSource, engagementPriority, search])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return { contacts, stats, pagination, loading, error, refetch: fetchContacts }
}

// Helper function
function inferContactType(contact: any): 'elder' | 'storyteller' | 'partner' | 'community' {
  const name = (contact.full_name || '').toLowerCase()
  const company = (contact.current_company || '').toLowerCase()
  const position = (contact.current_position || '').toLowerCase()
  const tags = (contact.tags || []).map((t: string) => t.toLowerCase())

  if (name.includes('uncle') || name.includes('aunty') || name.includes('elder')) return 'elder'
  if (tags.some((t: string) => t.includes('elder') || t.includes('indigenous'))) return 'elder'
  if (tags.some((t: string) => t.includes('storytell') || t.includes('empathy'))) return 'storyteller'
  if (contact.stories_count > 0) return 'storyteller'
  if (contact.is_storyteller) return 'storyteller'
  if (tags.some((t: string) => t.includes('partner') || t.includes('funder'))) return 'partner'
  if (
    position.includes('director') ||
    position.includes('ceo') ||
    position.includes('manager') ||
    position.includes('founder')
  )
    return 'partner'

  return 'community'
}
