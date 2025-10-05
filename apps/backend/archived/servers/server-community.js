#!/usr/bin/env node

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import cron from 'node-cron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = process.env.ACT_ENV_FILE || path.resolve(__dirname, '../../../../.env')
dotenv.config({ path: envPath })

if (!process.env.SUPABASE_URL) {
  console.warn(`⚠️  SUPABASE_URL not found after loading env file: ${envPath}`)
}

const { setupRealDashboardData } = await import('./api/real-dashboard-data.js')
const { default: setupSupabaseCRM } = await import('./api/supabase-crm.js')

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const app = express()
const PORT = process.env.PORT || 4000

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const optionalAuth = (_req, _res, next) => next()
const validateStoryQuery = (_req, _res, next) => next()
const validateStorytellerQuery = (_req, _res, next) => next()

const safeImport = async (modulePath) => {
  try {
    return await import(modulePath)
  } catch (error) {
    console.warn(`⚠️  Skipping ${modulePath}: ${error.message}`)
    return null
  }
}

const xeroAuthModule = await safeImport('./api/xeroAuth.js')
if (xeroAuthModule?.default) {
  app.use('/api/xero', xeroAuthModule.default)
}

const communitySharePercent = parseFloat(process.env.COMMUNITY_SHARE_PERCENT ?? '40')
const enableXeroAutosync = process.env.ENABLE_XERO_AUTOSYNC !== 'false'
const enableIntelligenceAutosync = process.env.ENABLE_INTELLIGENCE_AUTOSYNC !== 'false'
const enableLinkedInEnrichment = process.env.ENABLE_LINKEDIN_ENRICHMENT !== 'false'
const linkedInEnrichmentLimit = Number(process.env.LINKEDIN_ENRICHMENT_LIMIT || '150')
const linkedInEnrichmentMax = Number(process.env.LINKEDIN_ENRICHMENT_MAX || '300')
const linkedInEnrichmentFetchMultiplier = Number(process.env.LINKEDIN_ENRICHMENT_FETCH_MULTIPLIER || '3')

const relationshipIntelligenceModule = await safeImport('./services/relationshipIntelligenceOrchestrator.js')
const relationshipIntelligenceOrchestrator = relationshipIntelligenceModule?.default ?? null
const linkedInInsightsModule = await safeImport('./services/linkedinInsightsEnrichmentService.js')
const linkedInInsightsEnrichmentService = linkedInInsightsModule?.default ?? null

async function runRelationshipIntelligenceRefresh(trigger = 'schedule') {
  if (!enableIntelligenceAutosync || !relationshipIntelligenceOrchestrator) {
    return
  }

  try {
    console.log(`🔄 Running relationship intelligence refresh (${trigger})…`)
    await relationshipIntelligenceOrchestrator.refreshAll()
    console.log('✅ Relationship intelligence refresh complete')
  } catch (error) {
    console.error('❌ Relationship intelligence refresh failed:', error?.message || error)
  }
}

async function runLinkedInInsightsRefresh(trigger = 'schedule') {
  if (!enableLinkedInEnrichment || !linkedInInsightsEnrichmentService?.isEnabled?.()) {
    return
  }

  try {
    console.log(`🔄 Running LinkedIn insights enrichment (${trigger})…`)
    const options = {
      limit: Number.isFinite(linkedInEnrichmentLimit) && linkedInEnrichmentLimit > 0 ? linkedInEnrichmentLimit : undefined,
      maxContacts: Number.isFinite(linkedInEnrichmentMax) && linkedInEnrichmentMax > 0 ? linkedInEnrichmentMax : undefined,
      fetchMultiplier: Number.isFinite(linkedInEnrichmentFetchMultiplier) && linkedInEnrichmentFetchMultiplier > 0 ? linkedInEnrichmentFetchMultiplier : undefined,
      processAll: true
    }
    const result = await linkedInInsightsEnrichmentService.runBatch(options)
    const processed = result?.processed ?? 0
    const failures = result?.failures ?? 0
    console.log(`✅ LinkedIn insights enrichment complete (processed ${processed}, failures ${failures})`)
  } catch (error) {
    console.error('❌ LinkedIn insights enrichment failed:', error?.message || error)
  }
}

async function runFinancialSync(trigger = 'schedule') {
  if (!enableXeroAutosync) {
    return
  }

  try {
    console.log(`🔄 Running Xero financial sync (${trigger})…`)

    const statusResponse = await fetch(`http://localhost:${PORT}/api/v1/financial/status`)
    const statusJson = await statusResponse.json().catch(() => null)
    if (statusJson?.financial?.xeroStatus !== 'connected') {
      console.warn('⚠️  Skipping Xero sync: status indicates disconnected')
      return
    }

    const syncResponse = await fetch(`http://localhost:${PORT}/api/v1/financial/transactions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!syncResponse.ok) {
      const text = await syncResponse.text().catch(() => syncResponse.statusText)
      throw new Error(`transactions_sync_failed: ${text}`)
    }

    const summaryResponse = await fetch(`http://localhost:${PORT}/api/v1/financial/reports/summary`)
    if (!summaryResponse.ok) {
      const text = await summaryResponse.text().catch(() => summaryResponse.statusText)
      throw new Error(`summary_failed: ${text}`)
    }

    const summaryJson = await summaryResponse.json()
    const summary = summaryJson?.summary || {}

    const totalRevenue = Number(summary.income ?? 0)
    const expenses = Number(summary.expenses ?? 0)
    const netIncome = Number(summary.netIncome ?? totalRevenue - expenses)
    const netAvailable = Number(summary.netIncome ?? netIncome)
    const communityShare = totalRevenue * (communitySharePercent / 100)

    const insert = await supabase.from('financial_summary').insert([
      {
        reported_at: new Date().toISOString(),
        total_revenue: totalRevenue,
        community_share: communityShare,
        community_percentage: communitySharePercent,
        operating_expenses: expenses,
        net_available_for_communities: netAvailable,
        income: totalRevenue,
        expenses,
        net_income: netIncome,
        transaction_count: summary.transactionCount ?? 0
      }
    ])

    if (insert.error) {
      throw insert.error
    }

    console.log('✅ Financial summary updated from Xero sync')
  } catch (error) {
    console.error('❌ Financial sync failed:', error?.message || error)
  }
}

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

const relationshipIntelligenceApi = await safeImport('./api/relationship-intelligence.js')
if (relationshipIntelligenceApi?.default) {
  app.use('/api/intelligence', relationshipIntelligenceApi.default)
}

app.get('/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('projects').select('id', { head: true, count: 'exact' })
    if (error) throw error
    res.json({ status: 'healthy', timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(500).json({ status: 'degraded', error: error.message, timestamp: new Date().toISOString() })
  }
})

app.get('/api/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('projects').select('id', { head: true, count: 'exact' })
    if (error) throw error
    res.json({ status: 'healthy', integrations: ['supabase'], timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(500).json({ status: 'degraded', error: error.message, timestamp: new Date().toISOString() })
  }
})

app.get('/api/admin/system-status', async (_req, res) => {
  const components = {}
  let overall = 'healthy'

  try {
    await supabase.from('projects').select('id', { head: true, count: 'exact' })
    components.databases = { healthy: true }
  } catch (error) {
    components.databases = { healthy: false, error: error.message }
    overall = 'degraded'
  }

  const integrationsResponse = await fetchLocal('/api/integrations/status')
  const integrationServices = integrationsResponse?.services || integrationsResponse?.status || {}
  components.integrations = integrationServices

  const hasFailure = Object.values(integrationServices).some((service) => service && service.healthy === false)
  if (hasFailure) {
    overall = 'degraded'
  }

  res.json({ success: true, system: { overall, components, timestamp: new Date().toISOString() } })
})

function fetchLocal(pathname) {
  return new Promise((resolve) => {
    const url = new URL(pathname, `http://localhost:${PORT}`)
    fetch(url)
      .then((resp) => resp.json().then((json) => resolve(json)))
      .catch(() => resolve(null))
  })
}

const parseJSONValue = (value) => {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (error) {
      console.warn('⚠️  Failed to parse JSON value:', error.message)
      return null
    }
  }
  return value
}

const normalizeArrayField = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined)
  const parsed = parseJSONValue(value)
  if (Array.isArray(parsed)) return parsed
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const defaultConsentScopes = {
  public: ['public_showcase', 'community_archive'],
  community: ['community_circle', 'community_archive'],
  private: ['internal_only']
}

const resolveConsentScope = (level, scope) => {
  const cleaned = normalizeArrayField(scope)
  if (cleaned.length > 0) {
    return cleaned
  }
  return defaultConsentScopes[level] || defaultConsentScopes.community
}

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y'].includes(value.toLowerCase())
  }
  return Boolean(value)
}

const resolveConsentPayload = (consent = {}) => {
  const level = String(consent.level || 'community').toLowerCase()
  const scope = resolveConsentScope(level, consent.scope)
  const approvalsRaw = consent.approvals || {}

  return {
    level,
    scope,
    framework: consent.framework || 'act.community.v1',
    approvals: {
      data_usage: toBoolean(approvalsRaw.data_usage, true),
      community_sharing: toBoolean(approvalsRaw.community_sharing, level !== 'private'),
      ai_analysis: toBoolean(approvalsRaw.ai_analysis, false),
      withdrawal_right: toBoolean(approvalsRaw.withdrawal_right, true)
    },
    lastReviewedAt: consent.lastReviewedAt || consent.last_reviewed_at || null
  }
}

const normalizeStoryRecord = (story) => {
  if (!story) return null

  const consentDetailsRaw = story.consent_details || story.consent || null
  const consentDetails = parseJSONValue(consentDetailsRaw) || {}
  const approvalsRaw = consentDetails.approvals || {}

  const consentPayload = resolveConsentPayload({
    level: story.consent_level || consentDetails.level,
    scope: story.consent_scope || consentDetails.scope,
    approvals: {
      data_usage: approvalsRaw.data_usage ?? consentDetails.data_usage_approved,
      community_sharing: approvalsRaw.community_sharing ?? consentDetails.sharing_approved,
      ai_analysis: approvalsRaw.ai_analysis ?? consentDetails.ai_analysis_approved,
      withdrawal_right: approvalsRaw.withdrawal_right ?? consentDetails.withdrawal_allowed
    },
    framework: consentDetails.framework || story.consent_framework,
    lastReviewedAt: consentDetails.last_reviewed_at || story.consent_reviewed_at
  })

  const aiTags = normalizeArrayField(story.ai_categories || story.ai_tags)
  const tags = normalizeArrayField(story.themes || story.tags || story.labels)
  const media = normalizeArrayField(story.media)

  return {
    id: story.id,
    title: story.title,
    summary: story.content_summary || story.summary || story.excerpt || '',
    content: story.content || story.body || '',
    community: story.community || story.community_name || story.community_id || 'Community',
    author: story.author || story.storyteller_name || story.storyteller || 'Community storyteller',
    createdAt: story.created_at || story.created_date || story.published_at || new Date().toISOString(),
    updatedAt: story.updated_at || story.last_edited_time || null,
    consent: consentPayload,
    tags,
    aiTags,
    coverImage: story.cover_image || story.hero_image || media[0] || null
  }
}

setupRealDashboardData(app)
setupSupabaseCRM(app)

const notionProxyModule = await safeImport('./api/notion-proxy.js')
if (notionProxyModule?.default) {
  app.use('/api/notion', notionProxyModule.default)
}

const googleCalendarModule = await safeImport('./api/google-calendar.js')
if (googleCalendarModule?.default) {
  app.use('/api/calendar', googleCalendarModule.default)
}

const projectContactAlignmentModule = await safeImport('./api/project-contact-alignment.js')
if (projectContactAlignmentModule?.default) {
  projectContactAlignmentModule.default(app)
}

const touchpointsModule = await safeImport('./api/touchpoints.js')
if (touchpointsModule?.default) {
  app.use('/api/touchpoints', touchpointsModule.default)
}

const contactCoachModule = await safeImport('./api/contact-coach.js')
if (contactCoachModule?.default) {
  app.use('/api/contact-coach', contactCoachModule.default)
}

const contactContextModule = await safeImport('./api/contact-context.js')
if (contactContextModule?.default) {
  app.use('/api/contact-context', contactContextModule.default)
}

const financialRouter = await safeImport('./api/v1/financial.js')
if (financialRouter?.default) {
  app.use('/api/v1/financial', financialRouter.default)
}

const dashboardRouter = await safeImport('./api/dashboard.js')
if (dashboardRouter?.default) {
  app.use('/api/dashboard', dashboardRouter.default)
}

const gmailSyncModule = await safeImport('./api/gmailSync.js')
if (gmailSyncModule?.default) {
  app.use('/api/gmail-sync', gmailSyncModule.default)

  // Maintain compatibility with clients still calling /api/gmail/status
  app.get('/api/gmail/status', (req, res) => {
    res.redirect(307, '/api/gmail-sync/status')
  })
}

const simpleContactModule = await safeImport('./api/simpleContactDashboard.js')
if (simpleContactModule?.default) {
  app.use('/api/simple-contact-dashboard', simpleContactModule.default)
}

const unifiedIntelligenceLite = await safeImport('./api/unified-intelligence-lite.js')
if (unifiedIntelligenceLite?.setupUnifiedIntelligenceLite) {
  unifiedIntelligenceLite.setupUnifiedIntelligenceLite(app)
}

const migrationModule = await safeImport('./api/migration-management.js')
if (migrationModule?.setupMigrationManagement) {
  migrationModule.setupMigrationManagement(app)
}

app.get(
  '/api/stories',
  validateStoryQuery,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { limit = 10, featured, tags } = req.query

    let query = supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })

    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    if (tags) {
      const tagArray = String(tags).split(',')
      query = query.overlaps('themes', tagArray)
    }

    query = query.limit(parseInt(limit))

    const { data, error } = await query

    if (error) throw error

    const normalizedStories = (data || [])
      .map((story) => normalizeStoryRecord(story))
      .filter(Boolean)

    const visibleStories = normalizedStories.filter(
      (story) => story.consent.approvals.data_usage && story.consent.level !== 'private'
    )

    res.json({ stories: visibleStories, total: visibleStories.length })
  })
)

app.post(
  '/api/stories',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { title, content, consent, community, author, summary, tags: rawTags, aiTags: rawAiTags } = req.body || {}

    if (!title || !content) {
      return res.status(400).json({ error: 'missing_fields', message: 'title and content are required' })
    }

    if (!consent || !consent.level) {
      return res.status(400).json({ error: 'missing_consent', message: 'consent.level is required' })
    }

    const now = new Date().toISOString()
    const tags = normalizeArrayField(rawTags)
    const aiTags = normalizeArrayField(rawAiTags)

    const resolvedConsent = resolveConsentPayload(consent)

    const insertPayload = {
      title,
      content,
      content_summary: summary || (typeof content === 'string' ? content.substring(0, 280) : null),
      consent_level: resolvedConsent.level,
      consent_scope: resolvedConsent.scope,
      consent_details: {
        framework: resolvedConsent.framework,
        last_reviewed_at: resolvedConsent.lastReviewedAt || now,
        data_usage_approved: resolvedConsent.approvals.data_usage,
        sharing_approved: resolvedConsent.approvals.community_sharing,
        ai_analysis_approved: resolvedConsent.approvals.ai_analysis,
        withdrawal_allowed: resolvedConsent.approvals.withdrawal_right
      },
      community,
      author,
      ai_categories: aiTags,
      themes: tags,
      created_at: now
    }

    const { data, error } = await supabase
      .from('stories')
      .insert([insertPayload])
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, story: normalizeStoryRecord(data) })
  })
)

app.get(
  '/api/themes',
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error) throw error

    res.json(data || [])
  })
)

app.get(
  '/api/organizations',
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name')

    if (error) throw error

    res.json(data || [])
  })
)

app.get(
  '/api/storytellers',
  validateStorytellerQuery,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { active_only, with_stories } = req.query

    let query = supabase.from('storytellers').select('*').order('full_name')

    if (active_only === 'true') {
      query = query.eq('consent_given', true)
    }

    if (with_stories === 'true') {
      query = query.not('story_count', 'is', null).gt('story_count', 0)
    }

    const { data, error } = await query

    if (error) throw error

    res.json(data || [])
  })
)

app.get('/api/business-dashboard', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('financial_summary')
      .select('total_revenue, community_share, operating_expenses, net_available_for_communities, community_percentage')
      .order('reported_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    if (!data) throw new Error('No financial summary found')

    res.json({
      total_revenue: data.total_revenue,
      community_share: data.community_share,
      community_percentage: data.community_percentage,
      operating_expenses: data.operating_expenses,
      net_available_for_communities: data.net_available_for_communities,
      revenue_streams: [],
      community_distributions: [],
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    res.status(503).json({
      error: 'financial_data_unavailable',
      message: error.message,
      fallback: true
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Community API server ready on http://localhost:${PORT}`)
  if (enableXeroAutosync) {
    setTimeout(() => runFinancialSync('startup'), 5000)
    cron.schedule('0 */6 * * *', () => runFinancialSync('schedule'))
  }
  if (enableIntelligenceAutosync && relationshipIntelligenceOrchestrator) {
    setTimeout(() => runRelationshipIntelligenceRefresh('startup'), 10000)
    cron.schedule('0 5 * * *', () => runRelationshipIntelligenceRefresh('schedule'))
  } else if (!relationshipIntelligenceOrchestrator) {
    console.warn('⚠️ Relationship intelligence orchestrator unavailable; skipping autosync')
  }
  if (enableLinkedInEnrichment && linkedInInsightsEnrichmentService?.isEnabled?.()) {
    setTimeout(() => runLinkedInInsightsRefresh('startup'), 15000)
    cron.schedule('15 2 * * *', () => runLinkedInInsightsRefresh('schedule'))
  } else if (!enableLinkedInEnrichment) {
    console.warn('⚠️ LinkedIn insights enrichment disabled via configuration')
  } else {
    console.warn('⚠️ LinkedIn insights enrichment service unavailable; skipping autosync')
  }
})
