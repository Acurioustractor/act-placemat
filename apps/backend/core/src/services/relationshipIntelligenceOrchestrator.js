import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5, validate as uuidValidate } from 'uuid'
import contactCoachService from './contactCoachService.js'
import { ProjectHealthService } from './projectHealthService.js'
import linkedInInsightsEnrichmentService from './linkedinInsightsEnrichmentService.js'
import { logger } from '../utils/logger.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PROJECT_NAMESPACE = '9c9f70f3-2b4d-433f-8e5f-6dc5fdc2210f'
const CONTACT_NAMESPACE = 'fdbac9cd-8f7a-4cee-b04f-7a2dc6e140eb'

function ensureUuid(value, namespace) {
  if (!value) return null
  try {
    if (uuidValidate(value)) return value
    return uuidv5(String(value), namespace)
  } catch {
    return null
  }
}

export class RelationshipIntelligenceOrchestrator {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials missing for RelationshipIntelligenceOrchestrator')
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
    this.projectHealthService = new ProjectHealthService()
  }

  async refreshAll() {
    logger.info('🔄 Refreshing relationship intelligence datasets')

    const [summary, healthData] = await Promise.all([
      contactCoachService.generateSummary(),
      this.projectHealthService.calculateAllProjectHealth()
    ])

    if (!summary?.success) {
      throw new Error(`Contact coach summary failed: ${summary?.reason || 'unknown_error'}`)
    }

    const healthMap = new Map()
    for (const item of healthData || []) {
      const notionId = item?.id
      if (!notionId) continue
      const projectUuid = ensureUuid(notionId, PROJECT_NAMESPACE)
      healthMap.set(projectUuid, {
        overallScore: item.healthData?.overallScore ?? null,
        healthLevel: item.healthData?.healthLevel ?? null,
        urgency: item.healthData?.urgencyFlag ?? null,
        metrics: item.healthData?.metrics ?? null,
        recordedAt: new Date().toISOString(),
        raw: item.healthData ?? null
      })
    }

    await Promise.all([
      this.upsertProjectSupportGraph(summary.projectSupportOpportunities || [], healthMap),
      this.upsertContactRecommendations(summary.contactSupportRecommendations || []),
      this.recordProjectHealthHistory(healthMap)
    ])

    if (linkedInInsightsEnrichmentService?.isEnabled?.()) {
      try {
        const enrichmentResult = await linkedInInsightsEnrichmentService.runBatch()
        logger.debug?.('relationshipIntelligence.refreshAll: linkedin insights result', enrichmentResult)
      } catch (error) {
        logger.warn('LinkedIn insights enrichment failed during relationship intelligence refresh', error)
      }
    } else {
      logger.debug?.('LinkedIn insights enrichment service unavailable; skipping during refresh')
    }

    logger.info('✅ Relationship intelligence refresh complete')
    return { success: true }
  }

  async upsertProjectSupportGraph(projects, healthMap) {
    if (!Array.isArray(projects) || projects.length === 0) return

    const rows = projects.map(project => {
      const projectUuid = ensureUuid(project.projectId, PROJECT_NAMESPACE)
      const health = healthMap.get(projectUuid) || null
     return {
        project_id: projectUuid,
        notion_project_id: project.projectId,
        project_name: project.projectName,
        project_status: project.status || null,
        urgency_score: health?.overallScore ?? null,
        funding_gap: project.fundingGap ?? null,
        upcoming_milestone: project.nextMilestoneDate || null,
        supporters: project.potentialSupporters || [],
        keyword_highlights: project.keywordHighlights || null,
        last_calculated: new Date().toISOString(),
        metadata: {
          focusArea: project.focusArea || null,
          stats: project.stats || null
        }
      }
    }).filter(row => row.project_id)

    if (rows.length === 0) return

    const { error } = await this.supabase
      .from('project_support_graph')
      .upsert(rows, { onConflict: 'project_id' })

    if (error) {
      logger.error('Failed to upsert project_support_graph', error)
      throw error
    }
  }

  async upsertContactRecommendations(contacts) {
    if (!Array.isArray(contacts) || contacts.length === 0) return

    const recommendationRows = []
    const cadenceRows = []

  contacts.forEach(contact => {
      if (!contact?.contactId) return

      recommendationRows.push({
        contact_id: contact.contactId,
        recommendations: contact.recommendations || [],
        pinned_count: contact.pinnedCount ?? 0,
        total_recommendations: contact.totalRecommendations ?? (contact.recommendations?.length || 0),
        last_generated: new Date().toISOString()
      })

     const cadence = contact.recommendations?.[0]?.cadence
     if (cadence) {
       cadenceRows.push({
         contact_id: contact.contactId,
         last_interaction: cadence.lastInteractionDate || null,
         days_since_last: cadence.daysSinceLastInteraction ?? null,
          touchpoints_last_7: cadence.touchpointsLast7Days ?? null,
          touchpoints_last_30: cadence.interactionsLast30Days ?? null,
          touchpoints_last_90: cadence.interactionsLast90Days ?? null,
          total_touchpoints: cadence.totalTouchpoints ?? null,
          active_sources: cadence.activeSources || []
        })
      }
    })

    if (recommendationRows.length > 0) {
      const { error } = await this.supabase
        .from('contact_support_recommendations')
        .upsert(recommendationRows, { onConflict: 'contact_id' })

      if (error) {
        logger.error('Failed to upsert contact_support_recommendations', error)
        throw error
      }
    }

    if (cadenceRows.length > 0) {
      const { error } = await this.supabase
        .from('contact_cadence_metrics')
        .upsert(cadenceRows, { onConflict: 'contact_id' })

      if (error) {
        logger.error('Failed to upsert contact_cadence_metrics', error)
        throw error
      }
    }
  }

  async recordProjectHealthHistory(healthMap) {
    if (!healthMap || healthMap.size === 0) return

    const rows = []
    for (const [projectId, health] of healthMap.entries()) {
      if (!projectId) continue
      rows.push({
        project_id: projectId,
        notion_project_id: projectId,
        recorded_at: health.recordedAt,
        health_score: health.overallScore,
        urgency_score: health.overallScore,
        critical_factors: health.metrics ? Object.entries(health.metrics)
          .filter(([, metric]) => metric?.status && metric.status.includes('critical'))
          .map(([key]) => key) : [],
        status: health.healthLevel,
        notes: health.urgency,
        raw_payload: health.raw || {}
      })
    }

    if (rows.length === 0) return

    const { error } = await this.supabase
      .from('project_health_history')
      .insert(rows)

    if (error) {
      logger.error('Failed to insert project_health_history', error)
    }
  }
}

const relationshipIntelligenceOrchestrator = (() => {
  try {
    return new RelationshipIntelligenceOrchestrator()
  } catch (error) {
    logger.error('RelationshipIntelligenceOrchestrator initialization failed', error)
    return null
  }
})()

export default relationshipIntelligenceOrchestrator
