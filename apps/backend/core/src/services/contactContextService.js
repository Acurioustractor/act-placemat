import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const OVERDUE_THRESHOLD_DAYS = 21
const UPCOMING_WINDOW_DAYS = 14

function daysBetween(a, b) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return ms / (24 * 60 * 60 * 1000)
}

export class ContactContextService {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️  Supabase credentials missing for ContactContextService')
      this.supabase = null
    } else {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    }
  }

  async getContactByEmail(email) {
    if (!this.supabase) return null
    const normalised = email.trim().toLowerCase()
    const { data, error } = await this.supabase
      .from('linkedin_contacts')
      .select('*')
      .ilike('email_address', normalised)
      .limit(1)
    if (error) {
      console.warn('⚠️  Failed to load contact by email:', error.message)
      return null
    }
    return data?.[0] || null
  }

  async getTouchpointsForContact({ contactId, email, limit = 50 }) {
    if (!this.supabase) return []
    let query = this.supabase
      .from('touchpoints')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (contactId) {
      query = query.eq('contact_id', contactId)
    } else if (email) {
      query = query.ilike('contact_email', email.toLowerCase())
    }

    const { data, error } = await query
    if (error) {
      console.warn('⚠️  Failed to load touchpoints for context:', error.message)
      return []
    }
    return data || []
  }

  buildSummary(contact, touchpoints) {
    const now = new Date()
    const lastTouchpoint = touchpoints.find(tp => new Date(tp.occurred_at) <= now)
    const nextMeeting = touchpoints
      .filter(tp => tp.source === 'calendar' && tp.occurred_at && new Date(tp.occurred_at) >= now)
      .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))[0]

    const keyFacts = []
    if (contact?.strategic_value) {
      keyFacts.push(`Strategic value: ${contact.strategic_value}`)
    }
    if (contact?.current_company) {
      keyFacts.push(`Company: ${contact.current_company}`)
    }
    if (typeof contact?.relationship_score === 'number') {
      keyFacts.push(`Relationship score: ${(contact.relationship_score * 100).toFixed(0)}%`)
    }

    let lastInteraction = contact?.last_interaction || null
    if (lastTouchpoint?.occurred_at) {
      const tpTime = new Date(lastTouchpoint.occurred_at).getTime()
      const contactTime = lastInteraction ? new Date(lastInteraction).getTime() : 0
      if (tpTime > contactTime) {
        lastInteraction = lastTouchpoint.occurred_at
      }
    }

    let recommendedAction = 'Introduce yourself and align on current needs.'
    if (lastInteraction) {
      const delta = daysBetween(now, lastInteraction)
      if (delta >= OVERDUE_THRESHOLD_DAYS) {
        recommendedAction = `It has been ${Math.round(delta)} days since the last interaction — send a personal check-in.`
      } else {
        recommendedAction = `Last interaction ${Math.round(delta)} days ago; reference that touchpoint and propose next steps.`
      }
    }
    if (nextMeeting?.occurred_at) {
      recommendedAction = `Upcoming meeting on ${new Date(nextMeeting.occurred_at).toLocaleString()} — confirm agenda and attendees.`
    }

    const upcomingMeetings = touchpoints
      .filter(tp => tp.source === 'calendar' && tp.occurred_at && new Date(tp.occurred_at) >= now)
      .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
      .slice(0, 5)
      .map(tp => ({
        summary: tp.summary || 'Calendar event',
        occursAt: tp.occurred_at,
        projectId: tp.project_id,
        projectName: tp.project_name,
        attendees: tp.metadata?.attendees || [],
      }))

    const recentTouchpoints = touchpoints
      .filter(tp => !tp.occurred_at || new Date(tp.occurred_at) <= now)
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
      .slice(0, 5)
      .map(tp => ({
        summary: tp.summary,
        occurredAt: tp.occurred_at,
        source: tp.source,
        projectName: tp.project_name,
      }))

    const projectPillars = new Set()
    touchpoints.forEach(tp => {
      if (tp.metadata?.contexts && Array.isArray(tp.metadata.contexts)) {
        tp.metadata.contexts.forEach(ctx => {
          if (typeof ctx === 'string') {
            projectPillars.add(ctx)
          }
        })
      }
      if (tp.project_name) {
        projectPillars.add(tp.project_name)
      }
    })

    return {
      contact: contact
        ? {
            id: contact.id,
            name: contact.full_name,
            email: contact.email_address,
            company: contact.current_company,
            strategicValue: contact.strategic_value,
            relationshipScore: contact.relationship_score,
            lastInteraction,
          }
        : null,
      keyFacts,
      recommendedAction,
      upcomingMeetings,
      recentTouchpoints,
      relatedProjects: Array.from(projectPillars).slice(0, 5),
    }
  }

  async getContext(email) {
    if (!this.supabase) {
      return { success: false, reason: 'missing_supabase_credentials' }
    }

    if (!email || !email.trim()) {
      return { success: false, reason: 'missing_email' }
    }

    const contact = await this.getContactByEmail(email)
    const touchpoints = await this.getTouchpointsForContact({
      contactId: contact?.id,
      email,
    })

    const summary = this.buildSummary(contact, touchpoints)

    return {
      success: true,
      context: {
        ...summary,
        source: {
          contactsAnalysed: contact ? 1 : 0,
          touchpointsAnalysed: touchpoints.length,
        },
      },
    }
  }
}

const contactContextService = new ContactContextService()
export default contactContextService
