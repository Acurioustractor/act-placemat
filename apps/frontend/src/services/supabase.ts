/**
 * Supabase Client
 *
 * Direct connection to ACT's Supabase database for:
 * - GHL contacts (ghl_contacts table)
 * - Storytellers (from ghl_contacts with is_storyteller flag)
 * - Projects (from Notion sync)
 * - Agent proposals and tasks
 *
 * No external server required - connects directly to Supabase.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// GHL Contacts
// ============================================

export interface GHLContact {
  id: string
  ghl_id: string
  ghl_location_id?: string
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  phone?: string
  company_name?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
  projects?: string[]
  engagement_status?: string
  first_contact_date?: string
  last_contact_date?: string
  is_storyteller?: boolean
  is_elder?: boolean
  stories_count?: number
  empathy_ledger_id?: string
  created_at: string
  updated_at: string
}

export async function fetchGHLContacts(options: {
  limit?: number
  search?: string
  filterStorytellers?: boolean
} = {}): Promise<GHLContact[]> {
  const { limit = 500, search, filterStorytellers } = options

  let query = supabase
    .from('ghl_contacts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  }

  if (filterStorytellers) {
    query = query.eq('is_storyteller', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching GHL contacts:', error)
    throw error
  }

  return data || []
}

// ============================================
// Storytellers (filtered GHL contacts)
// ============================================

export async function fetchStorytellers(): Promise<GHLContact[]> {
  // Storytellers are GHL contacts with is_storyteller flag OR storytelling tags
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('*')
    .or('is_storyteller.eq.true,tags.cs.{storytelling},tags.cs.{elder},tags.cs.{empathy}')
    .order('stories_count', { ascending: false, nullsFirst: false })
    .limit(500)

  if (error) {
    console.error('Error fetching storytellers:', error)
    throw error
  }

  return data || []
}

// ============================================
// Relationship Health Stats
// ============================================

export interface RelationshipHealthStats {
  total: number
  hot: number
  warm: number
  cool: number
  tier1: number
  tier2: number
  tier3: number
  storytellers: number
}

export async function fetchRelationshipHealth(): Promise<RelationshipHealthStats> {
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('engagement_status, is_storyteller')

  if (error) {
    console.error('Error fetching relationship health:', error)
    throw error
  }

  const stats: RelationshipHealthStats = {
    total: contacts?.length || 0,
    hot: 0,
    warm: 0,
    cool: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    storytellers: 0
  }

  for (const c of contacts || []) {
    const status = c.engagement_status?.toLowerCase() || ''
    if (status === 'hot' || status === 'active' || status === 'tier1' || status === '1') {
      stats.hot++
      stats.tier1++
    } else if (status === 'warm' || status === 'engaged' || status === 'tier2' || status === '2') {
      stats.warm++
      stats.tier2++
    } else {
      stats.cool++
      stats.tier3++
    }
    if (c.is_storyteller) {
      stats.storytellers++
    }
  }

  return stats
}

// ============================================
// Agent Proposals
// ============================================

export interface AgentProposal {
  id: string
  agent_name: string
  action_type: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'approved' | 'rejected' | 'executed'
  created_at: string
  entity_type?: string
  entity_id?: string
}

export async function fetchPendingProposals(): Promise<AgentProposal[]> {
  const { data, error } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching proposals:', error)
    throw error
  }

  return data || []
}

// ============================================
// Dashboard Stats
// ============================================

export async function fetchDashboardStats() {
  const [contacts, proposals, storytellers] = await Promise.all([
    supabase.from('ghl_contacts').select('id', { count: 'exact', head: true }),
    supabase.from('agent_proposals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('ghl_contacts').select('id', { count: 'exact', head: true }).eq('is_storyteller', true)
  ])

  return {
    totalContacts: contacts.count || 0,
    pendingProposals: proposals.count || 0,
    storytellers: storytellers.count || 0
  }
}
