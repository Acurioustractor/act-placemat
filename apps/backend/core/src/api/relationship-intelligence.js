import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { asyncHandler } from '../middleware/errorHandler.js'
import linkedInInsightsEnrichmentService from '../services/linkedinInsightsEnrichmentService.js'
import notionService from '../services/notionService.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

router.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const MILESTONE_SOON_DAYS = 21
const MILESTONE_URGENT_DAYS = 10

async function loadNotionProject(notionId) {
  if (!notionId) return null
  try {
    const projects = await notionService.getProjects(false, {
      filter: {
        property: 'Notion ID',
        text: { equals: notionId }
      }
    })
    if (Array.isArray(projects) && projects.length > 0) {
      return projects[0]
    }
  } catch (error) {
    console.warn('Failed to load project from Notion service', error?.message || error)
  }
  return null
}

function computeMilestoneDays(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = date.getTime() - Date.now()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

function normalizeSupporters(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch (error) {
      logger.debug('relationship-intelligence: failed to parse supporters JSON', error?.message || error)
    }
  }
  return []
}

async function attachContactInsights(records) {
  if (!Array.isArray(records) || records.length === 0) return []

  const normalizedRecords = records.map((record) => ({
    ...record,
    supporters: normalizeSupporters(record.supporters)
  }))

  const contactIds = new Set()
  normalizedRecords.forEach((record) => {
    record.supporters.forEach((supporter) => {
      const key = supporter?.id ?? supporter?.contactId ?? supporter?.contact_id
      if (!key) return
      contactIds.add(String(key))
    })
  })

  if (contactIds.size === 0) {
    return normalizedRecords
  }

  const { data, error } = await supabase
    .from('contact_intelligence_insights')
    .select('*')
    .in('contact_id', Array.from(contactIds))
    .eq('source', 'linkedin')

  if (error) {
    logger.warn('relationship-intelligence: failed to load contact insights', error)
    return normalizedRecords
  }

  const insightMap = new Map()
  for (const item of data || []) {
    const key = String(item.contact_id)
    const existing = insightMap.get(key)
    const existingTime = existing?.enrichedAt ? new Date(existing.enrichedAt).getTime() : 0
    const incomingTime = item.enriched_at ? new Date(item.enriched_at).getTime() : 0
    if (!existing || incomingTime >= existingTime) {
      insightMap.set(key, {
        headline: item.headline || null,
        currentCompany: item.current_company || null,
        currentRole: item.current_role || null,
        lastPostTitle: item.last_post_title || null,
        lastPostUrl: item.last_post_url || null,
        lastPostPublishedAt: item.last_post_published_at || null,
        highlights: Array.isArray(item.highlights) ? item.highlights : [],
        enrichedAt: item.enriched_at || null
      })
    }
  }

  return normalizedRecords.map((record) => ({
    ...record,
    supporters: record.supporters.map((supporter) => {
      const key = supporter?.id ?? supporter?.contactId ?? supporter?.contact_id
      if (!key) return supporter
      const insight = insightMap.get(String(key))
      if (!insight) return supporter
      return { ...supporter, insights: insight }
    })
  }))
}

function parseNumber(value, fallback = null) {
  if (value === undefined || value === null) return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

function extractNotionTextValue(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const pieces = value
      .map((item) => {
        if (!item) return null
        if (typeof item === 'string') return item
        if (typeof item === 'object') {
          if (item.plain_text) return item.plain_text
          if (item.text) return extractNotionTextValue(item.text)
          if (item.name) return item.name
        }
        return null
      })
      .filter(Boolean)
    return pieces.length ? pieces.join(' ').trim() : null
  }
  if (typeof value === 'object') {
    if (value.rich_text) return extractNotionTextValue(value.rich_text)
    if (value.title) return extractNotionTextValue(value.title)
    if (value.select) return extractNotionTextValue(value.select.name || value.select)
    if (value.multi_select) return extractNotionTextValue(value.multi_select)
    if (value.plain_text) return value.plain_text
    if (value.text) return extractNotionTextValue(value.text)
    if (value.name) return value.name
    if (value.content) return extractNotionTextValue(value.content)
  }
  return null
}

function extractNotionArray(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item) return null
        if (typeof item === 'string') return item
        if (typeof item === 'object') {
          if (item.name) return item.name
          if (item.plain_text) return item.plain_text
          if (item.text) return extractNotionTextValue(item.text)
        }
        return null
      })
      .filter(Boolean)
  }
  if (typeof value === 'object' && value.multi_select) {
    return extractNotionArray(value.multi_select)
  }
  return []
}

function parseNotionProject(row) {
  if (!row) return {}
  const data = row.data || {}
  const properties = data.properties || data

  const summary = extractNotionTextValue(
    properties?.['AI summary'] ||
    properties?.summary ||
    properties?.Summary ||
    data.summary ||
    data.aiSummary
  )

  const goal = extractNotionTextValue(
    properties?.Goal ||
    properties?.Goals ||
    properties?.['Goal / Problem'] ||
    data.goal
  )

  const problemStatement = extractNotionTextValue(
    properties?.['Problem Statement'] ||
    properties?.Problem ||
    data.problemStatement
  )

  const nextSteps = extractNotionTextValue(
    properties?.['Next Step'] ||
    properties?.['Next Steps'] ||
    properties?.Next ||
    data.nextSteps
  )

  const recentUpdate = extractNotionTextValue(
    properties?.['Recent Update'] ||
    properties?.Update ||
    properties?.Updates ||
    data.recentUpdate
  )

  const impactHighlights = extractNotionArray(
    properties?.['Impact Highlights'] ||
    properties?.Impact ||
    data.impactHighlights
  )

  const focusAreas = extractNotionArray(
    properties?.['Focus Area'] ||
    properties?.['Focus Areas'] ||
    data.focusAreas
  )

  return {
    summary,
    goal,
    problemStatement,
    nextSteps,
    recentUpdate,
    impactHighlights,
    focusAreas,
    lastSyncedAt: row.last_synced || row.updated_at || null,
    raw: data
  }
}

function buildAIBrief(project, supporters, narrative = {}, stories = [], projectTouchpoints = []) {
  if (!project) return ''

  const summaryBits = []
  summaryBits.push(`${project.project_name} (${project.project_status || 'status unknown'})`)

  if (narrative.summary) {
    summaryBits.push(narrative.summary)
  }

  if (narrative.goal) {
    summaryBits.push(`Goal: ${narrative.goal}`)
  } else if (narrative.problemStatement) {
    summaryBits.push(`Challenge: ${narrative.problemStatement}`)
  }

  if (project.keyword_highlights?.length) {
    summaryBits.push(`Focus: ${project.keyword_highlights.slice(0, 3).join(', ')}`)
  }

  if (project.metadata?.focusArea) {
    summaryBits.push(`Focus area: ${project.metadata.focusArea}`)
  }

  if (project.upcoming_milestone) {
    summaryBits.push(`Next milestone: ${project.upcoming_milestone}`)
  }

  if (narrative.nextSteps) {
    summaryBits.push(`Next steps: ${narrative.nextSteps}`)
  }

  if (Array.isArray(narrative.impactHighlights) && narrative.impactHighlights.length) {
    summaryBits.push('Impact highlights:')
    narrative.impactHighlights.slice(0, 3).forEach((highlight) => {
      summaryBits.push(`- ${highlight}`)
    })
  }

  const supporterNotes = supporters.slice(0, 4).map((supporter) => {
    const reasons = supporter.matchReasons?.slice(0, 2)?.join('; ') || 'Good strategic fit'
    const highlight = supporter.insights?.highlights?.[0]
    const relationship = typeof supporter.relationshipScore === 'number'
      ? `relationship ${Math.round(supporter.relationshipScore * 100)}%`
      : null
    const details = [supporter.position || supporter.company || null, relationship, highlight]
      .filter(Boolean)
      .join(' • ')

    return `- ${supporter.name || 'Unnamed contact'} (${details || 'key advocate'}) — ${reasons}`
  })

  if (supporterNotes.length) {
    summaryBits.push('Recommended contacts:')
    summaryBits.push(...supporterNotes)
  }

  const cadenceSummary = supporters
    .map((supporter) => {
      const cadence = supporter.cadence
      if (!cadence) return null
      if (typeof cadence.daysSinceLastInteraction === 'number') {
        return cadence.daysSinceLastInteraction <= 14
          ? `${supporter.name || 'Unnamed contact'} spoken to ${cadence.daysSinceLastInteraction} days ago`
          : `${supporter.name || 'Unnamed contact'} last touch ${cadence.daysSinceLastInteraction} days ago`
      }
      return null
    })
    .filter(Boolean)

  if (cadenceSummary.length) {
    summaryBits.push('Cadence highlights:')
    summaryBits.push(...cadenceSummary.map((line) => `- ${line}`))
  }

  if (stories?.length) {
    summaryBits.push('Stories to reference:')
    stories.slice(0, 3).forEach((story) => {
      summaryBits.push(`- ${story.title}${story.publishedAt ? ` (${new Date(story.publishedAt).toLocaleDateString()})` : ''}`)
    })
  }

  if (projectTouchpoints?.length) {
    summaryBits.push('Recent activity across Gmail/Calendar:')
    projectTouchpoints.slice(0, 3).forEach((tp) => {
      const descriptor = tp.contactName ? `${tp.contactName} • ${tp.source || 'touchpoint'}` : (tp.source || 'Touchpoint')
      const when = tp.occurredAt ? new Date(tp.occurredAt).toLocaleDateString() : 'recent'
      const summary = tp.summary || 'Interaction logged'
      summaryBits.push(`- ${descriptor} on ${when}: ${summary}`)
    })
  }

  if (narrative.recentUpdate) {
    summaryBits.push(`Latest internal update: ${narrative.recentUpdate}`)
  }

  return summaryBits.join('\n')
}

router.get('/project-support', asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0, minUrgency, status, search } = req.query

  let query = supabase
    .from('project_support_graph')
    .select('*')
    .order('urgency_score', { ascending: true })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (status) {
    query = query.ilike('project_status', `%${status}%`)
  }

  if (search) {
    const term = String(search).trim()
    if (term) {
      query = query.or(
        `project_name.ilike.%${term}%,metadata->>focusArea.ilike.%${term}%`
      )
    }
  }

  if (minUrgency) {
    query = query.gte('urgency_score', parseNumber(minUrgency, 0))
  }

  const { data, error } = await query
  if (error) {
    return res.status(500).json({ error: 'project_support_query_failed', message: error.message })
  }

  const enriched = await attachContactInsights(data || [])

  res.json({ success: true, data: enriched })
}))

router.get('/contact-support', asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0, contactId } = req.query

  let query = supabase
    .from('contact_support_recommendations')
    .select('*')
    .order('last_generated', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (contactId) {
    const contactIdFilter = String(contactId).trim()
    if (contactIdFilter) {
      query = query.eq('contact_id', contactIdFilter)
    }
  }

  const { data, error } = await query
  if (error) {
    return res.status(500).json({ error: 'contact_support_query_failed', message: error.message })
  }

  res.json({ success: true, data })
}))

router.get('/overview', asyncHandler(async (_req, res) => {
  const { data, error } = await supabase
    .from('project_support_overview')
    .select('*')
    .order('urgency_score', { ascending: true })

  if (error) {
    return res.status(500).json({ error: 'overview_query_failed', message: error.message })
  }

  res.json({ success: true, data })
}))

router.get('/outreach-tasks', asyncHandler(async (req, res) => {
  const { status, contactId, projectId, limit = 100, offset = 0 } = req.query

  let query = supabase
    .from('outreach_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)

  if (status) query = query.eq('status', status)
  if (contactId) {
    const contactIdFilter = String(contactId).trim()
    if (contactIdFilter) {
      query = query.eq('contact_id', contactIdFilter)
    }
  }
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) {
    return res.status(500).json({ error: 'outreach_tasks_query_failed', message: error.message })
  }

  res.json({ success: true, data })
}))

router.post('/linkedin-insights/refresh', asyncHandler(async (req, res) => {
  if (!linkedInInsightsEnrichmentService?.isEnabled?.()) {
    return res.status(503).json({ success: false, error: 'service_unavailable' })
  }

  const {
    limit,
    fetchMultiplier,
    max,
    offset,
    force,
    processAll
  } = req.body || {}

  const options = {
    processAll: processAll !== false,
    limit: Number.isFinite(Number(limit)) ? Number(limit) : undefined,
    fetchMultiplier: Number.isFinite(Number(fetchMultiplier)) ? Number(fetchMultiplier) : undefined,
    maxContacts: Number.isFinite(Number(max)) ? Number(max) : undefined,
    offset: Number.isFinite(Number(offset)) ? Number(offset) : undefined,
    force: Boolean(force)
  }

  const result = await linkedInInsightsEnrichmentService.runBatch(options)

  res.json({ success: result?.success ?? false, data: result })
}))

router.get('/linkedin-insights/stats', asyncHandler(async (_req, res) => {
  const baseQuery = supabase
    .from('contact_intelligence_insights')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'linkedin')

  const totalResult = await baseQuery
  if (totalResult.error) {
    return res.status(500).json({ success: false, error: totalResult.error.message })
  }

  const total = totalResult.count ?? 0

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const recentResult = await supabase
    .from('contact_intelligence_insights')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'linkedin')
    .gte('enriched_at', sevenDaysAgo)

  const monthOldResult = await supabase
    .from('contact_intelligence_insights')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'linkedin')
    .lt('enriched_at', thirtyDaysAgo)

  const recent = recentResult.count ?? 0
  const stale = monthOldResult.count ?? 0

  res.json({
    success: true,
    data: {
      total,
      refreshedLast7Days: recent,
      staleOver30Days: stale,
      freshnessRate: total > 0 ? Number(((total - stale) / total).toFixed(3)) : 0
    }
  })
}))

router.get('/project-support/:id/intelligence', asyncHandler(async (req, res) => {
  const { id } = req.params
  const projectId = String(id).trim()
  if (!projectId) {
    return res.status(400).json({ success: false, error: 'invalid_project_id' })
  }

  const { data: project, error } = await supabase
    .from('project_support_graph')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116' || error.code === 'PGRST102') {
      return res.status(404).json({ success: false, error: 'project_not_found' })
    }
    return res.status(500).json({ success: false, error: error.message })
  }

  const [enrichedProject] = await attachContactInsights([project])
  const supporters = Array.isArray(enrichedProject?.supporters) ? enrichedProject.supporters : []

  const contactIds = supporters
    .map((supporter) => supporter?.id)
    .filter(Boolean)

  const notionProjectId = enrichedProject?.notion_project_id || enrichedProject?.project_id || null

  const [cadenceRows, projectTouchpointsResult, contactTouchpointsResult, storiesResult, notionRowResult, notionProjectRowResult, notionServiceProject] = await Promise.all([
    contactIds.length
      ? supabase
          .from('contact_cadence_metrics')
          .select('*')
          .in('contact_id', contactIds)
      : Promise.resolve({ data: [] }),
    notionProjectId
      ? supabase
          .from('touchpoints')
          .select('id, source, contact_id, contact_name, occurred_at, summary, project_id')
          .eq('project_id', notionProjectId)
          .order('occurred_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    contactIds.length
      ? supabase
          .from('touchpoints')
          .select('id, source, contact_id, contact_name, occurred_at, summary, project_id')
          .in('contact_id', contactIds)
          .order('occurred_at', { ascending: false })
          .limit(contactIds.length * 5)
      : Promise.resolve({ data: [] }),
    notionProjectId
      ? supabase
          .from('stories')
          .select('id, title, published_at, summary, ai_summary, content_summary, related_projects, published_url')
          .contains('related_projects', [notionProjectId])
          .order('published_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    notionProjectId
      ? supabase
          .from('notion_projects')
          .select('name, data, last_synced, updated_at')
          .eq('notion_id', notionProjectId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    notionProjectId
      ? supabase
          .from('projects')
          .select('id, name, summary, ai_summary, description, goal, problem_statement, next_steps, recent_update, impact_highlights, focus_areas, updated_at, notion_id')
          .eq('notion_id', notionProjectId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    notionProjectId
      ? loadNotionProject(notionProjectId)
      : Promise.resolve(null)
  ])

  const cadenceMap = new Map((cadenceRows.data || []).map((row) => [row.contact_id, row]))

  const contactTouchpointsMap = new Map()
  ;(contactTouchpointsResult.data || []).forEach((tp) => {
    const key = tp.contact_id ? String(tp.contact_id) : null
    if (!key) return
    if (!contactTouchpointsMap.has(key)) contactTouchpointsMap.set(key, [])
    const list = contactTouchpointsMap.get(key)
    if (list.length >= 3) return
    list.push({
      id: tp.id,
      source: tp.source,
      occurredAt: tp.occurred_at,
      summary: tp.summary,
      projectId: tp.project_id,
      contactName: tp.contact_name || null
    })
  })

  const supportersWithCadence = supporters.map((supporter) => {
    const cadence = cadenceMap.get(String(supporter.id))
    const touchpoints = contactTouchpointsMap.get(String(supporter.id)) || []
    return {
      ...supporter,
      cadence: supporter.cadence || cadence || null,
      touchpoints
    }
  })

  const projectTouchpoints = (projectTouchpointsResult.data || []).map((tp) => ({
    id: tp.id,
    source: tp.source,
    occurredAt: tp.occurred_at,
    summary: tp.summary,
    contactName: tp.contact_name || null
  }))

  const stories = (storiesResult.data || []).map((story) => ({
    id: story.id,
    title: story.title,
    publishedAt: story.published_at,
    summary: story.ai_summary || story.summary || story.content_summary || null,
    url: story.published_url || null
  }))

  const notionRow = notionRowResult?.data || null
  const notionProjectRow = notionProjectRowResult?.data || null

  const notionMetadata = (() => {
    const parsedNotion = parseNotionProject(notionRow)
    const projectRow = notionProjectRow
    const notionServiceData = notionServiceProject || {}

    const fallbackSummary =
      parsedNotion.summary ||
      projectRow?.ai_summary ||
      projectRow?.summary ||
      projectRow?.description ||
      notionServiceData.aiSummary ||
      notionServiceData.description ||
      null

    const fallbackGoal =
      parsedNotion.goal ||
      parsedNotion.problemStatement ||
      projectRow?.goal ||
      projectRow?.problem_statement ||
      notionServiceData.goal ||
      notionServiceData.problemStatement ||
      null

    const fallbackNextSteps =
      parsedNotion.nextSteps ||
      projectRow?.next_steps ||
      notionServiceData.nextSteps ||
      null

    const fallbackUpdates =
      parsedNotion.recentUpdate ||
      projectRow?.recent_update ||
      notionServiceData.recentUpdate ||
      null

    const fallbackImpacts = (() => {
      if (parsedNotion.impactHighlights?.length) return parsedNotion.impactHighlights
      if (Array.isArray(projectRow?.impact_highlights) && projectRow.impact_highlights.length) return projectRow.impact_highlights
      if (Array.isArray(notionServiceData.impactHighlights)) return notionServiceData.impactHighlights
      return []
    })()

    const focusAreas = (() => {
      if (parsedNotion.focusAreas?.length) return parsedNotion.focusAreas
      if (Array.isArray(projectRow?.focus_areas) && projectRow.focus_areas.length) return projectRow.focus_areas
      if (Array.isArray(notionServiceData.focusAreas)) return notionServiceData.focusAreas
      return []
    })()

    const lastSyncedAt = parsedNotion.lastSyncedAt || notionRow?.updated_at || projectRow?.updated_at || notionServiceData.lastSyncedAt || notionServiceData.updatedAt || null

    return {
      summary: fallbackSummary,
      goal: fallbackGoal,
      nextSteps: fallbackNextSteps,
      recentUpdate: fallbackUpdates,
      impactHighlights: fallbackImpacts,
      focusAreas,
      lastSyncedAt,
      raw: parsedNotion.raw || projectRow || notionServiceData
    }
  })()

  const milestoneDays = computeMilestoneDays(
    enrichedProject.upcoming_milestone ||
    enrichedProject.nextMilestoneDate ||
    notionMetadata.raw?.nextMilestoneDate ||
    notionMetadata.raw?.next_milestone_date ||
    notionMetadata.raw?.nextMilestone
  )

  const normaliseTag = (value) => {
    if (!value || typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24)
    if (!slug) return null
    return `#${slug}`
  }

  const linkedinTagsSet = new Set()
  ;(notionMetadata.focusAreas || []).forEach((tag) => {
    const normalised = normaliseTag(tag)
    if (normalised) linkedinTagsSet.add(normalised)
  })
  ;(enrichedProject.keyword_highlights || []).forEach((tag) => {
    const normalised = normaliseTag(tag)
    if (normalised) linkedinTagsSet.add(normalised)
  })
  supportersWithCadence.slice(0, 5).forEach((supporter) => {
    const companyTag = normaliseTag(supporter.company)
    if (companyTag) linkedinTagsSet.add(companyTag)
    if (supporter.name) {
      const nameTag = normaliseTag(supporter.name.split(' ')[0])
      if (nameTag) linkedinTagsSet.add(nameTag)
    }
  })

  const recommendedActions = []
  if (notionMetadata.nextSteps) {
    recommendedActions.push(`Next step: ${notionMetadata.nextSteps}`)
  }
  if (typeof milestoneDays === 'number') {
    if (milestoneDays <= MILESTONE_URGENT_DAYS) {
      recommendedActions.push(`Milestone in ${milestoneDays} days – secure supporter alignment now.`)
    } else if (milestoneDays <= MILESTONE_SOON_DAYS) {
      recommendedActions.push(`Milestone in ${milestoneDays} days – schedule prep conversation.`)
    }
  }
  if (!projectTouchpoints.length) {
    recommendedActions.push('No recent Gmail/Calendar activity – queue a check-in this week.')
  }
  const staleSupporters = supportersWithCadence
    .filter((supporter) => (supporter.cadence?.daysSinceLastInteraction || 0) >= 60)
    .slice(0, 3)
  if (staleSupporters.length) {
    recommendedActions.push(`Re-engage dormant supporters: ${staleSupporters.map((s) => s.name || 'Key contact').join(', ')}`)
  }
  if (stories.length) {
    recommendedActions.push(`Share latest story: “${stories[0].title}”`)
  }

  const recommendations = {
    linkedinTags: Array.from(linkedinTagsSet).slice(0, 6),
    actions: recommendedActions.slice(0, 5)
  }

  const aiBrief = buildAIBrief(
    enrichedProject,
    supportersWithCadence,
    notionMetadata,
    stories,
    projectTouchpoints
  )

  res.json({
    success: true,
    data: {
      project: {
        id: enrichedProject.project_id,
        name: enrichedProject.project_name,
        status: enrichedProject.project_status,
        urgencyScore: enrichedProject.urgency_score,
        keywordHighlights: enrichedProject.keyword_highlights || [],
        upcomingMilestone: enrichedProject.upcoming_milestone,
        fundingGap: enrichedProject.funding_gap,
        metadata: {
          ...enrichedProject.metadata,
          focusArea:
            notionMetadata.focusAreas?.[0] ||
            enrichedProject.metadata?.focusArea ||
            null
        },
        summary: notionMetadata.summary || null,
        goal: notionMetadata.goal || null,
        nextSteps: notionMetadata.nextSteps || null,
        recentUpdate: notionMetadata.recentUpdate || null,
        impactHighlights: notionMetadata.impactHighlights || [],
        lastSyncedAt: notionMetadata.lastSyncedAt || null
      },
      supporters: supportersWithCadence,
      stories,
      touchpoints: projectTouchpoints,
      recommendations,
      aiBrief
    }
  })
}))

router.post('/outreach-tasks', asyncHandler(async (req, res) => {
  const {
    contactId,
    projectId,
    projectName,
    contactName,
    priority = 'normal',
    recommendedChannel = 'email',
    draftMessage = null,
    aiBrief = null,
    owner = null,
    scheduledAt = null
  } = req.body || {}

  if (process.env.NODE_ENV !== 'production') {
    console.log('📨 outreach task request body:', req.body)
  }

  if (!contactId || !projectId) {
    return res.status(400).json({ error: 'missing_required_fields', message: 'contactId and projectId are required' })
  }

  const normalizedContactId = contactId ? String(contactId).trim() : null

  const { data, error } = await supabase
    .from('outreach_tasks')
    .insert({
      contact_id: normalizedContactId,
      project_id: projectId,
      project_name: projectName,
      contact_name: contactName,
      priority,
      recommended_channel: recommendedChannel,
      draft_message: draftMessage,
      ai_brief: aiBrief,
      owner,
      scheduled_at: scheduledAt
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'outreach_task_create_failed', message: error.message })
  }

  res.status(201).json({ success: true, data })
}))

router.patch('/outreach-tasks/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const {
    status,
    responseStatus,
    responseNotes,
    owner,
    scheduledAt,
    completedAt,
    draftMessage,
    aiBrief
  } = req.body || {}

  const updates = {}
  if (status) updates.status = status
  if (responseStatus) updates.response_status = responseStatus
  if (responseNotes !== undefined) updates.response_notes = responseNotes
  if (owner !== undefined) updates.owner = owner
  if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt
  if (completedAt !== undefined) updates.completed_at = completedAt
  if (draftMessage !== undefined) updates.draft_message = draftMessage
  if (aiBrief !== undefined) updates.ai_brief = aiBrief

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no_updates_provided' })
  }

  const { data, error } = await supabase
    .from('outreach_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'outreach_task_update_failed', message: error.message })
  }

  res.json({ success: true, data })
}))

export default router
