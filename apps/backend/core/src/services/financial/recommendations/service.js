/**
 * Financial Recommendation Service
 * Generates and manages financial recommendations based on metrics
 */

import { randomUUID } from 'crypto';
import { createSupabaseClient } from '../../config/supabase.js';
import MultiProviderAI from '../multiProviderAI.js';
import {
  mapPriorityLevel,
  mapImplementationComplexity,
  normalizeRecommendationRow,
  fetchRecentTransactions,
  computeFinancialMetrics,
  formatCurrency
} from './engine.js';
import { buildBaseRecommendations } from './rules.js';

const supabase = createSupabaseClient();

/**
 * Gather analysis context for recommendations
 * @returns {Promise<Object>} Analysis context
 */
async function gatherAnalysisContext() {
  const transactions = await fetchRecentTransactions();
  const metrics = computeFinancialMetrics(transactions);

  const communityCounts = await Promise.all([
    supabase.from('storytellers').select('id', { count: 'exact', head: true }),
    supabase.from('stories').select('id', { count: 'exact', head: true })
  ]);

  const storytellersCount = communityCounts[0].count || 0;
  const storiesCount = communityCounts[1].count || 0;

  const context = {
    metrics,
    analysisContext: {
      financialMetrics: {
        cashBalance: metrics.cashBalance,
        monthlyRevenue: metrics.income,
        monthlyExpenses: metrics.expenses,
        runwayDays: metrics.runwayDays || 0,
        receivables: metrics.receivablesTotal,
        payables: metrics.payablesTotal,
      },
      systemPerformance: {
        policyEvaluationLatency: 0.2,
        cacheHitRate: 0.9,
        errorRate: 0.03,
        throughput: 1200,
        auditLogVolume: 150,
      },
      communityMetrics: {
        activeConsents: storiesCount,
        indigenousDataRecords: storiesCount,
        complianceAlerts: 0,
        userSatisfaction: 0.9,
        engagementRate: 0.35,
      },
      complianceStatus: {
        privacyActCompliant: true,
        austracCompliant: true,
        acncCompliant: true,
        careCompliant: true,
        lastAuditDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      historicalTrends: {
        revenueGrowth: metrics.revenueGrowth,
        expenseGrowth: metrics.expenseGrowth,
        consentGrowth: 0.1,
        complianceScore: 0.95,
      },
    }
  };

  return context;
}

/**
 * Enrich recommendation with AI
 * @param {Object} base - Base recommendation
 * @param {Object} context - Analysis context
 * @param {Object} aiService - AI service
 * @returns {Promise<Object>} Enriched recommendation
 */
async function enrichRecommendationWithAI(base, context, aiService) {
  if (!aiService) return base;

  const prompt = `You are an expert financial strategist for an Australian impact organisation. ` +
    `You are analysing current metrics: ${JSON.stringify(context.metrics)}. ` +
    `Refine the following recommendation so it is actionable and empathetic for founders.\n` +
    `Recommendation: ${JSON.stringify(base)}\n` +
    `Return JSON with properties title, description, reason, actionableSteps (array of max 5 items).`;

  try {
    const { response } = await aiService.generateResponse(prompt, {
      systemPrompt: 'Return valid JSON. Be specific, concise, and practical.',
      temperature: 0.3,
      maxTokens: 600,
      preferQuality: true
    });

    const parsed = JSON.parse(response);
    return {
      ...base,
      title: parsed.title || base.title,
      description: parsed.description || base.description,
      reason: parsed.reason || base.description,
      actionableSteps: Array.isArray(parsed.actionableSteps) && parsed.actionableSteps.length > 0
        ? parsed.actionableSteps.slice(0, 5)
        : base.actionableSteps
    };
  } catch (error) {
    console.warn('AI enrichment failed:', error.message);
    return base;
  }
}

/**
 * Refresh and generate financial recommendations
 * @returns {Promise<Object[]>} Generated recommendations
 */
export async function refreshFinancialRecommendations() {
  const context = await gatherAnalysisContext();
  const baseRecommendations = buildBaseRecommendations(context.metrics);

  let aiService = null;
  try {
    aiService = new MultiProviderAI();
  } catch {
    aiService = null;
  }

  const enriched = [];
  for (const rec of baseRecommendations) {
    const enhanced = await enrichRecommendationWithAI(rec, context, aiService);
    enriched.push({ ...rec, ...enhanced });
  }

  const { data: existing } = await supabase
    .from('automated_insights')
    .select('id, detailed_analysis, status, implementation_notes')
    .eq('generated_by', 'financial_intelligence_service');

  const existingByKey = new Map();
  (existing || []).forEach(item => {
    const key = item.detailed_analysis?.key;
    if (key) {
      existingByKey.set(key, item);
    }
  });

  const recordsToUpsert = enriched.map(rec => {
    const existingRecord = existingByKey.get(rec.key);
    const feedback = existingRecord?.detailed_analysis?.feedback || {
      implementedCount: 0,
      dismissedCount: 0,
      history: []
    };

    return {
      id: existingRecord?.id || randomUUID(),
      insight_type: 'recommendation',
      insight_category: rec.category,
      priority_level: mapPriorityLevel(rec.priority),
      title: rec.title,
      description: rec.description,
      detailed_analysis: {
        key: rec.key,
        reason: rec.reason || rec.description,
        feedback
      },
      data_sources: ['xero_transactions'],
      evidence_data: {
        cashBalance: context.metrics.cashBalance,
        netMovement: context.metrics.net,
        receivables: context.metrics.receivablesTotal,
        uncategorised: context.metrics.uncategorisedCount
      },
      confidence_score: rec.confidence || 0.8,
      recommended_actions: rec.actionableSteps,
      expected_impact: rec.estimatedROI || {},
      implementation_complexity: mapImplementationComplexity(rec.effort || 5),
      status: existingRecord?.status && existingRecord.status !== 'expired' ? existingRecord.status : 'active',
      generated_by: 'financial_intelligence_service',
      model_version: aiService ? 'ai_enriched_v1' : 'heuristic_v1',
      generation_timestamp: new Date().toISOString()
    };
  });

  if (recordsToUpsert.length > 0) {
    await supabase
      .from('automated_insights')
      .upsert(recordsToUpsert, { onConflict: 'id' });
  }

  const currentKeys = new Set(enriched.map(rec => rec.key));
  const staleIds = (existing || [])
    .filter(item => !currentKeys.has(item.detailed_analysis?.key))
    .map(item => item.id);

  if (staleIds.length > 0) {
    await supabase
      .from('automated_insights')
      .update({ status: 'expired' })
      .in('id', staleIds);
  }

  return recordsToUpsert;
}

/**
 * List financial recommendations
 * @param {Object} options - Query options
 * @returns {Promise<Object[]>} Recommendations
 */
export async function listFinancialRecommendations({ status = 'active' } = {}) {
  const query = supabase
    .from('automated_insights')
    .select('*')
    .eq('generated_by', 'financial_intelligence_service')
    .order('priority_level', { ascending: false });

  if (status !== 'all') {
    query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeRecommendationRow);
}

/**
 * Update financial recommendation status
 * @param {string} id - Recommendation ID
 * @param {Object} updates - Status updates
 * @returns {Promise<Object>} Updated recommendation
 */
export async function updateFinancialRecommendation(id, { status, notes }) {
  const { data, error } = await supabase
    .from('automated_insights')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  const feedback = data.detailed_analysis?.feedback || {
    implementedCount: 0,
    dismissedCount: 0,
    history: []
  };

  const timestamp = new Date().toISOString();
  if (status === 'implemented') {
    feedback.implementedCount = (feedback.implementedCount || 0) + 1;
  } else if (status === 'dismissed') {
    feedback.dismissedCount = (feedback.dismissedCount || 0) + 1;
  }
  feedback.history = [
    {
      status,
      notes: notes || null,
      timestamp
    },
    ...(feedback.history || []).slice(0, 19)
  ];

  const updatePayload = {
    status,
    implementation_notes: notes || data.implementation_notes,
    implemented_at: status === 'implemented' ? timestamp : data.implemented_at,
    detailed_analysis: {
      ...(data.detailed_analysis || {}),
      feedback
    },
    updated_at: timestamp
  };

  const { data: updated, error: updateError } = await supabase
    .from('automated_insights')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return normalizeRecommendationRow(updated);
}

export default {
  refreshFinancialRecommendations,
  listFinancialRecommendations,
  updateFinancialRecommendation
};
