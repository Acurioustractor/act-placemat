import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { googleCalendarService } from './googleCalendarService.js'
import { SmartGmailSyncService } from './smartGmailSyncService.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export class TouchpointService {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️  Supabase credentials missing for TouchpointService')
      this.supabase = null
    } else {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    }
    this.gmailService = null
  }

  async getGmailService() {
    if (!this.gmailService) {
      this.gmailService = new SmartGmailSyncService()
      await this.gmailService.initialize()
    }
    return this.gmailService
  }

  async ensureTable() {
    if (!this.supabase) return { ok: false, reason: 'missing_supabase_credentials' }
    const { error } = await this.supabase.from('touchpoints').select('id').limit(1)
    if (error && error.code === '42P01') {
      return { ok: false, reason: 'table_missing' }
    }
    if (error) {
      console.warn('⚠️  Touchpoint table check failed:', error.message)
    }
    return { ok: true }
  }

  buildId(parts = []) {
    return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex')
  }

  async backfillFromEmails(limit = 200) {
    const service = await this.getGmailService()
    if (!service.supabase) {
      console.warn('⚠️  Gmail service lacks Supabase instance for community emails')
      return []
    }

    const { data: emails, error } = await service.supabase
      .from('community_emails')
      .select('*')
      .order('received_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('⚠️  Failed to fetch community emails for touchpoints:', error.message)
      return []
    }

    if (!emails || emails.length === 0) return []

    const notionIds = emails
      .map((email) => email.community_contact_id)
      .filter(Boolean)

    const uniqueNotionIds = [...new Set(notionIds)]
    let contactLookup = {}

    if (uniqueNotionIds.length > 0 && this.supabase) {
      const { data: contacts, error: contactError } = await this.supabase
        .from('linkedin_contacts')
        .select('id, full_name, email_address, notion_person_id')
        .in('notion_person_id', uniqueNotionIds)
      if (!contactError && contacts) {
        contactLookup = contacts.reduce((acc, contact) => {
          if (contact.notion_person_id) {
            acc[contact.notion_person_id] = contact
          }
          return acc
        }, {})
      }
    }

    return emails.map((email) => {
      const contact = contactLookup[email.community_contact_id] || null
      const projectId = Array.isArray(email.mentioned_projects) && email.mentioned_projects.length > 0
        ? email.mentioned_projects[0]
        : null

      return {
        id: this.buildId(['gmail', email.message_id, contact?.id || email.community_contact_id || email.from_email]),
        source: 'gmail',
        source_id: email.message_id,
        contact_id: contact?.id || null,
        contact_email: contact?.email_address || email.from_email || null,
        contact_name: contact?.full_name || email.contact_name || email.from_name || null,
        project_id: projectId,
        project_name: null,
        occurred_at: email.received_date,
        summary: email.subject || null,
        metadata: {
          email_type: email.email_type,
          relevance_score: email.relevance_score,
          contexts: email.detected_contexts,
          urgency: email.urgency,
        },
      }
    })
  }

  async backfillFromCalendar({ limit = 50, days = 21 } = {}) {
    const eventsResponse = await googleCalendarService.getEventsWithProjectOverlay({
      maxResults: limit,
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    }).catch((error) => {
      console.warn('⚠️  Failed to fetch calendar events for touchpoints:', error?.message || error)
      return null
    })

    if (!eventsResponse || !Array.isArray(eventsResponse.events) || eventsResponse.events.length === 0) {
      return []
    }

    const events = eventsResponse.events
    const attendees = events.flatMap((event) => event.attendees || [])
    const emails = attendees
      .map((attendee) => attendee.email || attendee.address)
      .filter(Boolean)

    const uniqueEmails = [...new Set(emails)]
    let crmLookup = {}

    if (uniqueEmails.length > 0 && this.supabase) {
      const { data: contacts, error } = await this.supabase
        .from('linkedin_contacts')
        .select('id, full_name, email_address')
        .in('email_address', uniqueEmails)

      if (!error && contacts) {
        crmLookup = contacts.reduce((acc, contact) => {
          if (contact.email_address) acc[contact.email_address.toLowerCase()] = contact
          return acc
        }, {})
      }
    }

    return events.flatMap((event) => {
      if (!Array.isArray(event.attendees) || event.attendees.length === 0) return []

      const project = event.project || null
      return event.attendees.map((attendee) => {
        const email = (attendee.email || attendee.address || '').toLowerCase()
        const contact = email ? crmLookup[email] : null

        return {
          id: this.buildId(['calendar', event.id, email || attendee.displayName || 'unknown']),
          source: 'calendar',
          source_id: event.id,
          contact_id: contact?.id || null,
          contact_email: email || null,
          contact_name: contact?.full_name || attendee.displayName || null,
          project_id: project?.id || null,
          project_name: project?.name || null,
          occurred_at: event.date || event.startDate || event.start?.dateTime || event.start?.date || null,
          summary: event.title || event.summary || null,
          metadata: {
            location: event.location || null,
            attendees: (event.attendees || []).map((a) => a.email || a.displayName).filter(Boolean),
            is_project_block: Boolean(event.isProjectBlock),
          },
        }
      })
    })
  }

  async upsertTouchpoints(records = []) {
    if (!this.supabase || records.length === 0) return { inserted: 0, updated: 0 }

    const { data, error } = await this.supabase
      .from('touchpoints')
      .upsert(records, { onConflict: 'id' })
      .select('id')

    if (error) {
      if (error.code === '42P01') {
        return { error: 'table_missing' }
      }
      console.warn('⚠️  Failed to upsert touchpoints:', error.message)
      return { error: error.message }
    }

    return {
      inserted: data?.length || 0,
      updated: 0,
    }
  }

  async backfill({ emailLimit = 200, eventLimit = 50, eventHorizonDays = 21 } = {}) {
    const tableStatus = await this.ensureTable()
    if (!tableStatus.ok) {
      return { success: false, reason: tableStatus.reason }
    }

    const [emailTouchpoints, calendarTouchpoints] = await Promise.all([
      this.backfillFromEmails(emailLimit),
      this.backfillFromCalendar({ limit: eventLimit, days: eventHorizonDays }),
    ])

    const combined = [...emailTouchpoints, ...calendarTouchpoints].filter(Boolean)
    if (combined.length === 0) {
      return { success: true, inserted: 0, total: 0 }
    }

    const upsertResult = await this.upsertTouchpoints(combined)
    if (upsertResult.error === 'table_missing') {
      return { success: false, reason: 'table_missing' }
    }

    if (upsertResult.error) {
      return { success: false, reason: 'upsert_failed', detail: upsertResult.error }
    }

    return {
      success: true,
      inserted: upsertResult.inserted,
      total: combined.length,
    }
  }

  async list({ limit = 100, contactId, projectId, source } = {}) {
    if (!this.supabase) {
      return { success: false, reason: 'missing_supabase_credentials' }
    }

    const status = await this.ensureTable()
    if (!status.ok) {
      return { success: false, reason: status.reason }
    }

    let query = this.supabase
      .from('touchpoints')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (source) {
      query = query.eq('source', source)
    }

    const { data, error } = await query

    if (error && error.code === '42P01') {
      return { success: false, reason: 'table_missing' }
    }
    if (error) {
      return { success: false, reason: 'query_failed', detail: error.message }
    }

    return { success: true, data: data || [] }
  }
}

const touchpointService = new TouchpointService()
export default touchpointService
