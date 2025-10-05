import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEFAULT_MAX_AGE_HOURS = Number(process.env.LINKEDIN_INSIGHTS_MAX_AGE_HOURS || 24)
const DEFAULT_BATCH_LIMIT = Number(process.env.LINKEDIN_INSIGHTS_BATCH_LIMIT || 40)
const DEFAULT_FETCH_MULTIPLIER = Number(process.env.LINKEDIN_INSIGHTS_FETCH_MULTIPLIER || 2)
const HIGHLIGHT_LIMIT = 4

function parseDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatRelativeTime(value) {
  const date = parseDate(value)
  if (!date) return null

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo${months === 1 ? '' : 's'} ago`

  const years = Math.floor(days / 365)
  return `${years} yr${years === 1 ? '' : 's'} ago`
}

function truncate(text, maxLength = 160) {
  if (!text) return null
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trim()}…`
}

class LinkedInInsightsEnrichmentService {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn('LinkedInInsightsEnrichmentService disabled: missing Supabase credentials')
      this.supabase = null
      return
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    this.maxAgeHours = Number.isFinite(DEFAULT_MAX_AGE_HOURS) ? DEFAULT_MAX_AGE_HOURS : 24
    this.defaultLimit = Number.isFinite(DEFAULT_BATCH_LIMIT) ? DEFAULT_BATCH_LIMIT : 40
  }

  isEnabled() {
    return Boolean(this.supabase)
  }

  async runBatch(options = {}) {
    if (!this.isEnabled()) {
      return { success: false, reason: 'service_disabled' }
    }

    const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : this.defaultLimit
    const force = Boolean(options.force)
    const processAll = Boolean(options.processAll)
    const fetchMultiplier = Number.isInteger(options.fetchMultiplier) && options.fetchMultiplier > 0
      ? options.fetchMultiplier
      : DEFAULT_FETCH_MULTIPLIER
    const maxContacts = Number.isFinite(options.maxContacts) && options.maxContacts > 0
      ? options.maxContacts
      : processAll
        ? Number.POSITIVE_INFINITY
        : limit

    let processed = 0
    let skipped = 0
    let failures = 0
    let iterations = 0
    let offset = Number.isInteger(options.offset) && options.offset >= 0 ? options.offset : 0
    const fetchBatchSize = Math.max(limit * fetchMultiplier, limit)
    let pendingCandidates = []

    while (processed < maxContacts) {
      if (!pendingCandidates.length) {
        const contacts = await this.#fetchCandidateContacts(fetchBatchSize, offset)
        iterations += 1

        if (!contacts.length) {
          break
        }

        const validContacts = contacts.filter((contact) => contact?.id)
        if (!validContacts.length) {
          if (!processAll) break
          offset += fetchBatchSize
          continue
        }

        const existingMap = await this.#loadExistingInsights(validContacts.map((contact) => contact.id))

        const chunkCandidates = []
        let chunkSkipped = 0
        for (const contact of validContacts) {
          const existing = existingMap.get(contact.id)
          const isStale = force || !existing || this.#isStale(existing.enriched_at)
          if (isStale) {
            chunkCandidates.push(contact)
          } else {
            chunkSkipped += 1
          }
        }

        skipped += chunkSkipped

        if (!chunkCandidates.length) {
          if (!processAll) break
          offset += fetchBatchSize
          continue
        }

        pendingCandidates = chunkCandidates
      }

      const remainingCapacity = maxContacts - processed
      if (remainingCapacity <= 0) {
        break
      }

      const batchLimit = Math.min(limit, remainingCapacity)
      const batchCandidates = pendingCandidates.splice(0, batchLimit)

      for (const contact of batchCandidates) {
        if (processed >= maxContacts) break
        try {
          const payload = await this.#buildInsightPayload(contact)
          if (!payload) {
            skipped += 1
            continue
          }

          const { error } = await this.supabase
            .from('contact_intelligence_insights')
            .upsert(payload, { onConflict: 'contact_id,source' })

          if (error) {
            failures += 1
            logger.error('LinkedInInsightsEnrichmentService: failed to upsert insight', { contactId: contact.id, error })
            continue
          }

          processed += 1
        } catch (error) {
          failures += 1
          logger.error('LinkedInInsightsEnrichmentService: unexpected error during enrichment', {
            contactId: contact.id,
            error: error?.message || error
          })
        }
      }

      if (!processAll) {
        break
      }

      if (pendingCandidates.length === 0) {
        offset += fetchBatchSize
      }
    }

    if (processed > 0) {
      logger.info(`LinkedInInsightsEnrichmentService: stored insights for ${processed} contacts (skipped ${skipped}, failures ${failures})`)
    }

    return {
      success: failures === 0,
      processed,
      skipped,
      failures,
      iterations,
      remainingCapacity: Math.max(maxContacts - processed, 0)
    }
  }

  async #fetchCandidateContacts(limit, offset = 0) {
    const { data, error } = await this.supabase
      .from('linkedin_contacts')
      .select(`
        id,
        full_name,
        current_company,
        current_position,
        relationship_score,
        strategic_value,
        last_interaction,
        linkedin_url,
        alignment_tags,
        industries,
        skills_extracted,
        raw_data
      `)
      .not('linkedin_url', 'is', null)
      .order('relationship_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('LinkedInInsightsEnrichmentService: failed to load contacts', error)
      return []
    }

    return Array.isArray(data) ? data : []
  }

  async #loadExistingInsights(contactIds = []) {
    const map = new Map()
    if (!contactIds.length) return map

    const { data, error } = await this.supabase
      .from('contact_intelligence_insights')
      .select('*')
      .in('contact_id', contactIds)

    if (error) {
      logger.error('LinkedInInsightsEnrichmentService: failed to load existing insights', error)
      return map
    }

    for (const item of data || []) {
      const existing = map.get(item.contact_id)
      if (!existing || parseDate(item.enriched_at) > parseDate(existing.enriched_at)) {
        map.set(item.contact_id, item)
      }
    }

    return map
  }

  #isStale(enrichedAt) {
    const timestamp = parseDate(enrichedAt)
    if (!timestamp) return true
    const ageHours = (Date.now() - timestamp.getTime()) / (60 * 60 * 1000)
    return ageHours >= this.maxAgeHours
  }

  async #buildInsightPayload(contact) {
    if (!contact?.id) return null

    const latestInteraction = await this.#fetchLatestLinkedInInteraction(contact.id)
    const highlights = this.#buildHighlights(contact, latestInteraction)

    const rawData = contact.raw_data || {}
    const headline = rawData.headline || rawData.public_headline || contact.current_position || null

    return {
      contact_id: contact.id,
      source: 'linkedin',
      headline,
      current_company: contact.current_company || rawData.company || null,
      current_role: contact.current_position || rawData.role || null,
      last_post_title: this.#resolveLastPostTitle(latestInteraction, rawData),
      last_post_url: this.#resolveLastPostUrl(latestInteraction, contact.linkedin_url, rawData),
      last_post_published_at: latestInteraction?.interaction_date || rawData.last_post_published_at || null,
      highlights,
      enriched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  async #fetchLatestLinkedInInteraction(contactId) {
    const { data, error } = await this.supabase
      .from('linkedin_interactions')
      .select('subject, content, interaction_type, interaction_date')
      .eq('contact_id', contactId)
      .order('interaction_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.debug('LinkedInInsightsEnrichmentService: unable to fetch latest interaction', { contactId, error })
      return null
    }

    return data || null
  }

  #buildHighlights(contact, interaction) {
    const highlights = []
    const tags = Array.isArray(contact.alignment_tags) ? contact.alignment_tags.filter(Boolean) : []
    const industries = Array.isArray(contact.industries) ? contact.industries.filter(Boolean) : []
    const skills = Array.isArray(contact.skills_extracted) ? contact.skills_extracted.filter(Boolean) : []

    if (contact.current_position && contact.current_company) {
      highlights.push(`${contact.current_position} at ${contact.current_company}`)
    } else if (contact.current_position) {
      highlights.push(contact.current_position)
    } else if (contact.current_company) {
      highlights.push(`Works at ${contact.current_company}`)
    }

    if (typeof contact.relationship_score === 'number') {
      const percent = Math.round(contact.relationship_score * 100)
      highlights.push(`Relationship score ${percent}`)
    }

    if (contact.strategic_value && contact.strategic_value !== 'unknown') {
      highlights.push(`Strategic value: ${contact.strategic_value}`)
    }

    if (tags.length) {
      highlights.push(`Focus: ${tags.slice(0, 3).join(', ')}`)
    }

    if (!tags.length && industries.length) {
      highlights.push(`Industry: ${industries.slice(0, 2).join(', ')}`)
    }

    if (!tags.length && !industries.length && skills.length) {
      highlights.push(`Skills: ${skills.slice(0, 3).join(', ')}`)
    }

    if (interaction?.interaction_date) {
      const relative = formatRelativeTime(interaction.interaction_date)
      if (relative) highlights.push(`Latest LinkedIn touch ${relative}`)
    } else if (contact.last_interaction) {
      const relative = formatRelativeTime(contact.last_interaction)
      if (relative) highlights.push(`Last interaction ${relative}`)
    }

    const deduped = []
    for (const highlight of highlights) {
      if (!highlight) continue
      if (!deduped.includes(highlight)) deduped.push(highlight)
      if (deduped.length >= HIGHLIGHT_LIMIT) break
    }

    return deduped
  }

  #resolveLastPostTitle(interaction, rawData) {
    if (interaction?.subject) return interaction.subject
    if (interaction?.content) return truncate(interaction.content, 120)
    if (rawData?.last_post_title) return rawData.last_post_title
    if (rawData?.activity_summary) return truncate(rawData.activity_summary, 120)
    return null
  }

  #resolveLastPostUrl(interaction, fallbackUrl, rawData) {
    if (rawData?.last_post_url) return rawData.last_post_url
    if (rawData?.activity_url) return rawData.activity_url
    if (fallbackUrl) return fallbackUrl
    return null
  }
}

const linkedInInsightsEnrichmentService = new LinkedInInsightsEnrichmentService()
export default linkedInInsightsEnrichmentService
