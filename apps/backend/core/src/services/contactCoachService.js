import { createClient } from '@supabase/supabase-js'
import notionService from './notionService.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEFAULT_CONTACT_LIMIT = 5000
const DEFAULT_TOUCHPOINT_LIMIT = 1000
const OVERDUE_THRESHOLD_DAYS = 21
const UPCOMING_WINDOW_DAYS = 14
const PROJECT_SUPPORT_LIMIT = 60
const SUPPORTER_PER_PROJECT_LIMIT = 12
const DIVERSITY_PENALTY = 12
const MAX_USAGE_TRACK = 6
const UPCOMING_MILESTONE_SOON_DAYS = 21
const UPCOMING_MILESTONE_URGENT_DAYS = 10
const UPCOMING_MILESTONE_BOOST = 12
const MIN_SUPPORTER_SCORE = 70
const RECENT_TOUCH_WINDOW_DAYS = 30
const EXTENDED_TOUCH_WINDOW_DAYS = 90
const STALE_RELATIONSHIP_DAYS = 180
const PREFERENCE_PINNED = 'pinned'
const PREFERENCE_IGNORED = 'ignored'
const PROJECT_EXCLUDE_PATTERNS = [
  /\btest\b/i,
  /migration/i,
  /demo/i,
  /sample/i,
  /placeholder/i
]

const KEYWORD_STOPWORDS = new Set([
  'the', 'and', 'to', 'of', 'in', 'for', 'a', 'an', 'with', 'on', 'at', 'by',
  'from', 'into', 'about', 'project', 'program', 'initiative', 'general',
  'network', 'networking', 'support', 'supporting', 'supporters', 'this', 'that',
  'next', 'milestone', 'week', 'month', 'plan', 'planning', 'status', 'active',
  'api', 'migration', 'verify', 'created', 'update', 'outcome', 'outcomes'
])

const GENERIC_FOCUS_TERMS = new Set([
  'general networking',
  'networking',
  'general',
  'miscellaneous',
  'other'
])

export class ContactCoachService {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️  Supabase credentials missing for ContactCoachService')
      this.supabase = null
    } else {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      })
    }
  }

  async setSupportPreference({ contactId, projectId, status, notes, pinnedRank }) {
    if (!this.supabase) {
      throw new Error('missing_supabase_credentials')
    }

    const normalizedContactId = this._normaliseContactId(contactId)
    if (!normalizedContactId || !projectId) {
      throw new Error('contact_id_and_project_id_required')
    }

    if (status && ![PREFERENCE_PINNED, PREFERENCE_IGNORED].includes(status)) {
      throw new Error('invalid_preference_status')
    }

    if (!status) {
      return this.removeSupportPreference({ contactId, projectId })
    }

    const payload = {
      contact_id: normalizedContactId,
      project_id: projectId,
      status,
      notes: notes || null,
      pinned_rank: Number.isInteger(Number(pinnedRank)) ? Number(pinnedRank) : null
    }

    const { data, error } = await this.supabase
      .from('contact_support_preferences')
      .upsert(payload, { onConflict: 'contact_id,project_id' })
      .select()

    if (error) {
      console.error('Failed to set support preference:', error)
      throw new Error('support_preference_upsert_failed')
    }

    return data?.[0] || payload
  }

  async removeSupportPreference({ contactId, projectId }) {
    if (!this.supabase) {
      throw new Error('missing_supabase_credentials')
    }

    const normalizedContactId = this._normaliseContactId(contactId)
    if (!normalizedContactId || !projectId) {
      throw new Error('contact_id_and_project_id_required')
    }

    const { error } = await this.supabase
      .from('contact_support_preferences')
      .delete()
      .eq('contact_id', normalizedContactId)
      .eq('project_id', projectId)

    if (error) {
      console.error('Failed to remove support preference:', error)
      throw new Error('support_preference_delete_failed')
    }

    return { success: true }
  }

  async _fetchContacts(limit = DEFAULT_CONTACT_LIMIT) {
    if (!this.supabase) return []

    const { data, error } = await this.supabase
      .from('linkedin_contacts')
      .select(`
        id,
        full_name,
        email_address,
        strategic_value,
        relationship_score,
        last_interaction,
        current_company,
        current_position,
        industries,
        alignment_tags,
        skills_extracted,
        linkedin_url
      `)
      .limit(limit)

    if (error) {
      console.warn('⚠️  ContactCoachService failed to load contacts:', error.message)
      return []
    }

    return data || []
  }

  async _fetchTouchpoints(limit = DEFAULT_TOUCHPOINT_LIMIT) {
    if (!this.supabase) return []

    const { data, error } = await this.supabase
      .from('touchpoints')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('⚠️  ContactCoachService failed to load touchpoints:', error.message)
      return []
    }

    return data || []
  }

  _getContactKey(contact) {
    if (!contact) return null
    if (contact.id) return `id:${contact.id}`
    if (contact.contact_id) return `id:${contact.contact_id}`
    const email = contact.email_address || contact.contact_email
    if (email) return `email:${String(email).toLowerCase()}`
    return null
  }

  _normaliseContactId(value) {
    if (value === undefined || value === null) return null
    const stringValue = typeof value === 'string' ? value.trim() : String(value).trim()
    return stringValue || null
  }

  _buildContactKey(contact) {
    if (!contact) return null
    if (contact.contact_id) return `id:${contact.contact_id}`
    if (contact.contact_email) return `email:${contact.contact_email.toLowerCase()}`
    return null
  }

  _computeTouchpointMetrics(touchpoints) {
    const metrics = new Map()
    if (!Array.isArray(touchpoints)) return metrics

    const now = Date.now()
    const recentWindowMs = RECENT_TOUCH_WINDOW_DAYS * 24 * 60 * 60 * 1000
    const extendedWindowMs = EXTENDED_TOUCH_WINDOW_DAYS * 24 * 60 * 60 * 1000

    touchpoints.forEach((tp) => {
      const key = this._buildContactKey(tp)
      if (!key || !tp.occurred_at) return
      const occurredTs = new Date(tp.occurred_at).getTime()
      if (Number.isNaN(occurredTs)) return

      const existing = metrics.get(key) || {
        lastInteractionTs: null,
        totalTouchpoints: 0,
        touchpointsLast30Days: 0,
        touchpointsLast90Days: 0,
        sources: new Set()
      }

      existing.totalTouchpoints += 1
      existing.sources.add(tp.source || 'unknown')

      const ageMs = now - occurredTs
      if (ageMs <= recentWindowMs) existing.touchpointsLast30Days += 1
      if (ageMs <= extendedWindowMs) existing.touchpointsLast90Days += 1

      if (!existing.lastInteractionTs || occurredTs > existing.lastInteractionTs) {
        existing.lastInteractionTs = occurredTs
      }

      metrics.set(key, existing)
    })

    return metrics
  }

  _mapLastInteractions(touchpoints) {
    const map = new Map()
    touchpoints.forEach((tp) => {
      const key = this._buildContactKey(tp)
      if (!key) return
      const existing = map.get(key)
      if (!existing || new Date(tp.occurred_at).getTime() > new Date(existing.occurred_at).getTime()) {
        map.set(key, tp)
      }
    })
    return map
  }

  _computeOverdue(contacts, lastInteractions) {
    const now = new Date()
    return contacts
      .filter((contact) => {
        if (!['high', 'medium'].includes((contact.strategic_value || '').toLowerCase())) return false
        const key = this._getContactKey(contact)
        if (!key) return false
        const touchpoint = lastInteractions.get(key)
        const lastInteraction = touchpoint?.occurred_at || contact.last_interaction
        if (!lastInteraction) return true
        const msDiff = now.getTime() - new Date(lastInteraction).getTime()
        const days = msDiff / (24 * 60 * 60 * 1000)
        return days >= OVERDUE_THRESHOLD_DAYS
      })
      .slice(0, 10)
      .map((contact) => {
        const key = this._getContactKey(contact)
        const touchpoint = key ? lastInteractions.get(key) : null
        return {
          id: contact.id,
          name: contact.full_name,
          email: contact.email_address,
          company: contact.current_company,
          strategicValue: contact.strategic_value,
          lastInteraction: touchpoint?.occurred_at || contact.last_interaction || null,
          relationshipScore: contact.relationship_score,
        }
      })
  }

  _computeUpcomingMeetings(touchpoints) {
    const now = Date.now()
    const windowMs = UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000

    return touchpoints
      .filter((tp) => tp.source === 'calendar' && tp.occurred_at)
      .filter((tp) => {
        const time = new Date(tp.occurred_at).getTime()
        return time >= now && time <= now + windowMs
      })
      .slice(0, 10)
      .map((tp) => ({
        contactName: tp.contact_name,
        contactEmail: tp.contact_email,
        projectId: tp.project_id,
        projectName: tp.project_name,
        occursAt: tp.occurred_at,
        summary: tp.summary,
        attendees: (tp.metadata?.attendees || []).slice(0, 5)
      }))
  }

  _computeRecentTouchpoints(touchpoints) {
    return touchpoints
      .slice(0, 10)
      .map((tp) => ({
        contactName: tp.contact_name,
        contactEmail: tp.contact_email,
        projectName: tp.project_name,
        source: tp.source,
        occurredAt: tp.occurred_at,
        summary: tp.summary
      }))
  }

  async _fetchActiveProjects(limit = PROJECT_SUPPORT_LIMIT) {
    if (!notionService?.getProjects) return []

    try {
      const projects = await notionService.getProjects(true)
      if (!Array.isArray(projects) || projects.length === 0) return []

      const activeProjects = projects
        .filter((project) => {
          const status = (project.status || '').toLowerCase()
          return ['active', 'in progress', 'seeking partners', 'planning'].some((value) => status.includes(value))
        })

      const prioritised = this._prioritiseProjects(activeProjects)

      return prioritised.slice(0, limit)
    } catch (error) {
      console.warn('⚠️  ContactCoachService failed to load projects from Notion:', error.message)
      return []
    }
  }

  async _fetchSupportPreferences() {
    if (!this.supabase) return { byPair: new Map(), byContact: new Map() }

    const { data, error } = await this.supabase
      .from('contact_support_preferences')
      .select('contact_id, project_id, status, notes, pinned_rank')

    if (error) {
      console.warn('⚠️  ContactCoachService failed to load support preferences:', error.message)
      return { byPair: new Map(), byContact: new Map() }
    }

    const byPair = new Map()
    const byContact = new Map()

    for (const pref of data || []) {
      const contactId = this._normaliseContactId(pref.contact_id)
      if (!contactId || !pref.project_id) continue
      const pairKey = `${pref.project_id}::${contactId}`
      byPair.set(pairKey, pref)

      if (!byContact.has(contactId)) byContact.set(contactId, [])
      byContact.get(contactId).push(pref)
    }

    return { byPair, byContact }
  }

  _prioritiseProjects(projects) {
    return projects
      .filter((project) => this._isMeaningfulProject(project))
      .map((project) => ({
        ...project,
        __nextMilestone: this._parseDate(project.nextMilestoneDate),
        __supporterCount: typeof project.supporters === 'number' ? project.supporters : 0,
        __potentialIncoming: typeof project.potentialIncoming === 'number' ? project.potentialIncoming : 0
      }))
      .sort((a, b) => {
        const aDate = a.__nextMilestone
        const bDate = b.__nextMilestone

        if (aDate && bDate) {
          if (aDate.getTime() !== bDate.getTime()) return aDate - bDate
        } else if (aDate || bDate) {
          return aDate ? -1 : 1
        }

        if (a.__supporterCount !== b.__supporterCount) {
          return a.__supporterCount - b.__supporterCount
        }

        if (a.__potentialIncoming !== b.__potentialIncoming) {
          return b.__potentialIncoming - a.__potentialIncoming
        }

        return (a.updatedAt || '').localeCompare(b.updatedAt || '')
      })
  }

  _parseDate(value) {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  _isMeaningfulProject(project) {
    if (!project?.name) return false
    if (PROJECT_EXCLUDE_PATTERNS.some((pattern) => pattern.test(project.name))) return false

    const hasContext = Boolean(
      (project.description && project.description.trim().length > 15) ||
      (Array.isArray(project.tags) && project.tags.length > 0) ||
      (Array.isArray(project.themes) && project.themes.length > 0) ||
      (project.coreValues && project.coreValues.trim().length > 0)
    )

    return hasContext
  }

  _normaliseKeyword(value) {
    if (!value) return []
    if (Array.isArray(value)) {
      return value.flatMap((entry) => this._normaliseKeyword(entry))
    }
    if (typeof value === 'object') {
      return Object.values(value).flatMap((entry) => this._normaliseKeyword(entry))
    }
    if (typeof value !== 'string') return []

    const tokens = new Set()
    const pushToken = (token) => {
      const normalised = token.trim().toLowerCase()
      if (!normalised) return
      if (normalised.length <= 2 && normalised !== 'ai' && normalised !== 'it') return
      if (KEYWORD_STOPWORDS.has(normalised)) return
      if (/^\d+$/.test(normalised)) return
      if (normalised.includes(' ')) {
        const parts = normalised.split(/\s+/)
        if (parts.every((part) => KEYWORD_STOPWORDS.has(part) || part.length <= 2)) {
          return
        }
      }
      tokens.add(normalised)
    }

    pushToken(value)
    value.split(/[\s,;/|]+/).forEach(pushToken)

    return [...tokens]
  }

  _extractProjectKeywords(project) {
    const keywordSources = [
      project.name,
      project.summary,
      project.description,
      project.aiSummary,
      project.goal,
      project.problemStatement,
      project.problem_statement,
      project.nextSteps,
      project.next_steps,
      project.recentUpdate,
      project.recent_update,
      project.impactHighlights,
      project.focusAreas,
      project.area,
      project.coreValues,
      project.tags,
      project.themes,
      project.relationshipPillars,
      project.projectLead?.name,
      project.collaboration_opportunities,
      project.target_outcomes,
      project.required_skills
    ]

    const keywords = new Set(this._normaliseKeyword(keywordSources))

    // Boost known high-value categories
    const domainMappings = {
      youth: ['youth', 'young', 'teen', 'adolescent'],
      justice: ['justice', 'legal', 'law', 'court'],
      indigenous: ['indigenous', 'aboriginal', 'first nations', 'torres'],
      health: ['health', 'wellbeing', 'medical', 'clinic'],
      education: ['education', 'school', 'university', 'training'],
      environment: ['environment', 'sustainability', 'climate', 'conservation'],
      funding: ['funding', 'grant', 'philanthropy', 'investment']
    }

    Object.entries(domainMappings).forEach(([canonical, variations]) => {
      if (variations.some((term) => keywords.has(term))) {
        keywords.add(canonical)
        variations.forEach((term) => keywords.add(term))
      }
    })

    return keywords
  }

  _extractProjectNarrativeKeywords(project) {
    if (!project) return new Set()

    const narrativeSources = [
      project.summary,
      project.description,
      project.aiSummary,
      project.goal,
      project.problemStatement,
      project.problem_statement,
      project.nextSteps,
      project.next_steps,
      project.recentUpdate,
      project.recent_update,
      project.impactHighlights,
      project.focusAreas,
      project.storyHooks,
      project.priorityThemes,
      project.keyMessages,
      project.linkedinAngle
    ]

    return new Set(this._normaliseKeyword(narrativeSources))
  }

  _computeProjectMilestoneDays(project) {
    if (!project) return null
    const milestoneValue = project.upcoming_milestone || project.nextMilestoneDate || project.next_milestone_date || project.milestoneDate
    if (!milestoneValue) return null
    const milestoneDate = new Date(milestoneValue)
    if (Number.isNaN(milestoneDate.getTime())) return null
    const diffMs = milestoneDate.getTime() - Date.now()
    return Math.round(diffMs / (24 * 60 * 60 * 1000))
  }

  _extractContactKeywords(contact) {
    const keywordSources = [
      contact.current_company,
      contact.current_position,
      contact.industries,
      contact.alignment_tags,
      contact.skills_extracted
    ]

    return new Set(this._normaliseKeyword(keywordSources))
  }

  _calculateCadence(contact, touchpointMetrics) {
    const key = this._getContactKey(contact)
    const metric = key ? touchpointMetrics.get(key) : null
    const fallbackTs = contact?.last_interaction ? new Date(contact.last_interaction).getTime() : null
    const lastInteractionTs = metric?.lastInteractionTs || fallbackTs || null

    const now = Date.now()
    const daysSince = lastInteractionTs ? Math.round((now - lastInteractionTs) / (24 * 60 * 60 * 1000)) : null

    return {
      daysSinceLastInteraction: daysSince,
      lastInteractionDate: lastInteractionTs ? new Date(lastInteractionTs).toISOString() : null,
      interactionsLast30Days: metric?.touchpointsLast30Days || 0,
      interactionsLast90Days: metric?.touchpointsLast90Days || 0,
      totalTouchpoints: metric?.totalTouchpoints || 0,
      activeSources: metric ? Array.from(metric.sources || []) : []
    }
  }

  _scoreContactForProject(contact, project, projectKeywords, narrativeKeywords, touchpointMetrics, options = {}) {
    if (!contact) return { score: 0, reasons: [], matchedKeywords: [], narrativeMatches: [], cadence: null }

    const { usageCount = 0, milestoneDays = null, focusArea = null } = options

    const contactKeywords = this._extractContactKeywords(contact)
    const matchedKeywords = [...projectKeywords].filter((keyword) => contactKeywords.has(keyword))
    const narrativeMatches = [...narrativeKeywords].filter((keyword) => contactKeywords.has(keyword))

    let score = Math.round((contact.relationship_score || 0) * 100)
    const reasons = []

    if (matchedKeywords.length > 0) {
      score += matchedKeywords.length * 10
      reasons.push(`Shared focus: ${matchedKeywords.slice(0, 3).map((term) => term.replace(/\b\w/g, (c) => c.toUpperCase())).join(', ')}`)
    }

    if (narrativeMatches.length > 0) {
      score += narrativeMatches.length * 6
      reasons.push(`Aligned with project goals (${narrativeMatches.slice(0, 3).join(', ')})`)
    }

    if (focusArea && contactKeywords.has(String(focusArea).toLowerCase())) {
      score += 12
      reasons.push(`Focus area match: ${focusArea}`)
    }

    const strategicValue = (contact.strategic_value || '').toLowerCase()
    if (strategicValue === 'high') {
      score += 20
      reasons.push('High strategic value contact')
    } else if (strategicValue === 'medium') {
      score += 10
      reasons.push('Medium strategic value contact')
    }

    if ((contact.relationship_score || 0) >= 0.7) {
      reasons.push(`Strong relationship (${Math.round((contact.relationship_score || 0) * 100)})`)
    }

    if (contact.current_company && projectKeywords.has(contact.current_company.toLowerCase())) {
      score += 15
      reasons.push(`Direct organisational match: ${contact.current_company}`)
    }

    const cadence = this._calculateCadence(contact, touchpointMetrics)

    if (cadence.daysSinceLastInteraction === null) {
      score -= 5
      reasons.push('No meetings logged yet')
    } else if (cadence.daysSinceLastInteraction <= 14) {
      score += 15
      reasons.push('Spoken within the last two weeks')
    } else if (cadence.daysSinceLastInteraction <= 45) {
      score += 8
      reasons.push(`Recent contact (${cadence.daysSinceLastInteraction} days ago)`)
    } else if (cadence.daysSinceLastInteraction >= STALE_RELATIONSHIP_DAYS) {
      score -= 15
      reasons.push(`Dormant relationship (${cadence.daysSinceLastInteraction} days since last touch)`)      
    } else if (cadence.daysSinceLastInteraction >= EXTENDED_TOUCH_WINDOW_DAYS) {
      score -= 8
      reasons.push(`Needs re-engagement (${cadence.daysSinceLastInteraction} days since last touch)`)
    }

    if (cadence.interactionsLast30Days >= 3) {
      score += 6
      reasons.push('High cadence: 3+ interactions in last 30 days')
    } else if (cadence.interactionsLast30Days === 0 && cadence.interactionsLast90Days === 0) {
      score -= 6
      reasons.push('No recent meetings recorded')
    }

    if (typeof milestoneDays === 'number') {
      if (milestoneDays <= UPCOMING_MILESTONE_URGENT_DAYS) {
        score += UPCOMING_MILESTONE_BOOST
        reasons.push(`Milestone imminent (${milestoneDays} days) – priority contact`)
      } else if (milestoneDays <= UPCOMING_MILESTONE_SOON_DAYS) {
        score += Math.round(UPCOMING_MILESTONE_BOOST / 2)
        reasons.push(`Milestone approaching (${milestoneDays} days)`)
      }
    }

    if (usageCount > 0) {
      const penalty = Math.min(usageCount, MAX_USAGE_TRACK) * DIVERSITY_PENALTY
      score -= penalty
      reasons.push(`Already surfaced for ${usageCount} other project${usageCount === 1 ? '' : 's'} – consider new connections`)
    }

    score = Math.max(score, 0)

    return { score, reasons, matchedKeywords, narrativeMatches, cadence }
  }

  _formatSupporter(contact, scoreDetails, preference) {
    return {
      id: contact.id,
      name: contact.full_name?.trim() || null,
      company: contact.current_company,
      position: contact.current_position,
      strategicValue: contact.strategic_value,
      relationshipScore: contact.relationship_score,
      alignmentScore: scoreDetails.score,
      matchReasons: scoreDetails.reasons,
      linkedinUrl: contact.linkedin_url || null,
      cadence: scoreDetails.cadence || null,
      preference: preference || null
    }
  }

  _computeProjectSupportOpportunities(projects, contacts, touchpointMetrics, preferenceByPair) {
    if (!projects.length || !contacts.length) return []

    const supporterUsage = new Map()

    return projects.map((project) => {
      const projectKeywords = this._extractProjectKeywords(project)
      const narrativeKeywords = this._extractProjectNarrativeKeywords(project)
      const milestoneDays = this._computeProjectMilestoneDays(project)
      const focusArea = this._computeProjectFocus(project)

      const pinned = []
      const regular = []

      const supporters = contacts
        .map((contact) => {
          const usageCount = contact?.id ? supporterUsage.get(String(contact.id)) || 0 : 0
          const scoreDetails = this._scoreContactForProject(
            contact,
            project,
            projectKeywords,
            narrativeKeywords,
            touchpointMetrics,
            {
              usageCount,
              milestoneDays,
              focusArea
            }
          )
          const preference = contact.id ? preferenceByPair?.get(`${project.id}::${contact.id}`) : null

          if (preference?.status === PREFERENCE_IGNORED) {
            return null
          }

          const isPinned = preference?.status === PREFERENCE_PINNED
          if (!isPinned && scoreDetails.score < MIN_SUPPORTER_SCORE) {
            return null
          }

          const supporter = this._formatSupporter(contact, scoreDetails, preference)
          if (isPinned) {
            pinned.push({ supporter, preference })
          } else {
            regular.push(supporter)
          }

          return null
        })

      const pinnedOrdered = pinned
        .sort((a, b) => {
          const rankA = Number.isInteger(a.preference?.pinned_rank) ? a.preference.pinned_rank : Number.POSITIVE_INFINITY
          const rankB = Number.isInteger(b.preference?.pinned_rank) ? b.preference.pinned_rank : Number.POSITIVE_INFINITY
          if (rankA !== rankB) return rankA - rankB
          return (b.supporter.alignmentScore || 0) - (a.supporter.alignmentScore || 0)
        })
        .map((entry) => ({ ...entry.supporter, alignmentScore: Math.max(entry.supporter.alignmentScore, MIN_SUPPORTER_SCORE) }))

      const regularOrdered = regular
        .sort((a, b) => (b.alignmentScore || 0) - (a.alignmentScore || 0))
        .slice(0, Math.max(SUPPORTER_PER_PROJECT_LIMIT - pinnedOrdered.length, 0))

      const combined = [...pinnedOrdered, ...regularOrdered]

      combined.forEach((supporter) => {
        if (!supporter?.id) return
        const key = String(supporter.id)
        supporterUsage.set(key, (supporterUsage.get(key) || 0) + 1)
      })

      const keywordHighlights = [...projectKeywords]
        .map((keyword) => keyword.replace(/\b\w/g, (char) => char.toUpperCase()))
        .slice(0, 8)

      return {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        focusArea,
        potentialSupporters: combined,
        keywordHighlights
      }
    }).filter((entry) => entry.potentialSupporters.length > 0)
  }

  _computeContactSupportRecommendations(projectSupportOpportunities, contacts, preferenceByContact) {
    if (!projectSupportOpportunities?.length) return []

    const contactsById = new Map()
    contacts.forEach((contact) => {
      if (contact?.id) contactsById.set(contact.id, contact)
    })

    const aggregation = new Map()

    projectSupportOpportunities.forEach((project) => {
      project.potentialSupporters.forEach((supporter) => {
        const contactId = supporter.id
        if (!contactId) return

        if (!aggregation.has(contactId)) {
          aggregation.set(contactId, [])
        }

        aggregation.get(contactId).push({
          projectId: project.projectId,
          projectName: project.projectName,
          focusArea: project.focusArea,
          alignmentScore: supporter.alignmentScore,
          matchReasons: supporter.matchReasons,
          cadence: supporter.cadence,
          preference: supporter.preference || null
        })
      })
    })

    const results = []

    aggregation.forEach((recommendations, contactId) => {
      const contact = contactsById.get(contactId) || {}
      const preferenceEntries = preferenceByContact?.get(contactId) || []

      const pinned = recommendations.filter((rec) => rec.preference?.status === PREFERENCE_PINNED)
      const others = recommendations.filter((rec) => rec.preference?.status !== PREFERENCE_PINNED)

      pinned.sort((a, b) => {
        const prefA = preferenceEntries.find((pref) => pref.project_id === a.projectId)
        const prefB = preferenceEntries.find((pref) => pref.project_id === b.projectId)
        const rankA = Number.isInteger(prefA?.pinned_rank) ? prefA.pinned_rank : Number.POSITIVE_INFINITY
        const rankB = Number.isInteger(prefB?.pinned_rank) ? prefB.pinned_rank : Number.POSITIVE_INFINITY
        if (rankA !== rankB) return rankA - rankB
        return (b.alignmentScore || 0) - (a.alignmentScore || 0)
      })

      others.sort((a, b) => (b.alignmentScore || 0) - (a.alignmentScore || 0))

      results.push({
        contactId,
        name: contact.full_name?.trim() || null,
        company: contact.current_company || null,
        position: contact.current_position || null,
        strategicValue: contact.strategic_value,
        relationshipScore: contact.relationship_score,
        linkedinUrl: contact.linkedin_url || null,
        pinnedCount: pinned.length,
        totalRecommendations: recommendations.length,
        recommendations: [...pinned, ...others]
      })
    })

    return results
      .sort((a, b) => {
        if (a.pinnedCount !== b.pinnedCount) return b.pinnedCount - a.pinnedCount
        if (a.totalRecommendations !== b.totalRecommendations) return b.totalRecommendations - a.totalRecommendations
        return (b.relationshipScore || 0) - (a.relationshipScore || 0)
      })
      .slice(0, 50)
  }

  _computeProjectFocus(project) {
    const candidateFields = [
      typeof project.area === 'string' ? project.area : null,
      typeof project.coreValues === 'string' ? project.coreValues : null,
      Array.isArray(project.themes) ? project.themes[0] : null,
      Array.isArray(project.tags) ? project.tags[0] : null
    ]

    for (const candidate of candidateFields) {
      if (!candidate || typeof candidate !== 'string') continue
      const trimmed = candidate.trim()
      if (!trimmed) continue
      if (GENERIC_FOCUS_TERMS.has(trimmed.toLowerCase())) continue
      return trimmed
    }

    return null
  }

  async generateSummary() {
    if (!this.supabase) {
      return {
        success: false,
        reason: 'missing_supabase_credentials'
      }
    }

    const [contacts, touchpoints, projects, preferences] = await Promise.all([
      this._fetchContacts(),
      this._fetchTouchpoints(),
      this._fetchActiveProjects(),
      this._fetchSupportPreferences()
    ])

    const lastInteractions = this._mapLastInteractions(touchpoints)
    const touchpointMetrics = this._computeTouchpointMetrics(touchpoints)

    const { byPair: preferenceByPair, byContact: preferenceByContact } = preferences || { byPair: new Map(), byContact: new Map() }

    const overdueFollowUps = this._computeOverdue(contacts, lastInteractions)
    const upcomingMeetings = this._computeUpcomingMeetings(touchpoints)
    const recentTouchpoints = this._computeRecentTouchpoints(touchpoints)
    const projectSupportOpportunities = this._computeProjectSupportOpportunities(projects, contacts, touchpointMetrics, preferenceByPair)
    const contactSupportRecommendations = this._computeContactSupportRecommendations(projectSupportOpportunities, contacts, preferenceByContact)

    const stats = {
      contactsAnalysed: contacts.length,
      touchpointsAnalysed: touchpoints.length,
      overdueCount: overdueFollowUps.length,
      upcomingCount: upcomingMeetings.length,
      activeProjectsAnalysed: projects.length,
      projectSupportMatches: projectSupportOpportunities.reduce((total, project) => total + project.potentialSupporters.length, 0),
      contactsWithSupportMatches: contactSupportRecommendations.length
    }

    return {
      success: true,
      stats,
      overdueFollowUps,
      upcomingMeetings,
      recentTouchpoints,
      projectSupportOpportunities,
      contactSupportRecommendations
    }
  }
}

const contactCoachService = new ContactCoachService()
export default contactCoachService
