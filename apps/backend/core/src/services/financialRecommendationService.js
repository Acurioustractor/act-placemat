import { randomUUID } from 'crypto';
import { createSupabaseClient } from '../config/supabase.js';
import MultiProviderAI from './multiProviderAI.js';

const supabase = createSupabaseClient();

function mapPriorityLevel(priority) {
  switch (priority) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
}

function mapImplementationComplexity(effort) {
  if (effort >= 7) return 'high';
  if (effort >= 4) return 'medium';
  return 'low';
}

function normalizeRecommendationRow(item) {
  const feedback = item.detailed_analysis?.feedback || {};
  const modifier = mapFeedbackScore(feedback);
  const baseImpact = item.expected_impact?.financial ? Number(item.expected_impact.financial) : 8;
  const adjustedImpact = Math.max(1, Math.min(10, baseImpact * modifier));

  const priorityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
  const basePriority = priorityWeights[item.priority_level] || 1;
  const adjustedPriority = basePriority * modifier;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.insight_category,
    priority: item.priority_level,
    adjustedPriority,
    impact: baseImpact,
    adjustedImpact,
    confidence: item.confidence_score,
    status: item.status,
    recommendedActions: item.recommended_actions || [],
    implementationComplexity: item.implementation_complexity,
    feedback,
    lastUpdated: item.updated_at,
    reason: item.detailed_analysis?.reason,
  };
}

function mapFeedbackScore(feedback = {}) {
  const implemented = feedback.implementedCount || 0;
  const dismissed = feedback.dismissedCount || 0;
  return 1 + implemented * 0.1 - dismissed * 0.05;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

async function fetchRecentTransactions(days = 60) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('xero_transactions')
    .select('amount,type,date,suggested_category,contact,status')
    .gte('date', start);

  if (error) {
    throw error;
  }

  return data || [];
}

function computeFinancialMetrics(transactions, windowDays = 30) {
  const now = new Date();
  const windowStart = new Date();
  windowStart.setDate(now.getDate() - windowDays);

  let income = 0;
  let expenses = 0;
  let priorIncome = 0;
  let priorExpenses = 0;
  let receivablesTotal = 0;
  let payablesTotal = 0;
  let uncategorisedCount = 0;
  const vendorTotals = new Map();

  transactions.forEach(tx => {
    const amount = Math.abs(Number(tx.amount || 0));
    const type = String(tx.type || '').toLowerCase();
    const txDate = tx.date ? new Date(tx.date) : null;
    const inWindow = txDate ? txDate >= windowStart : true;

    if (type === 'income' || type === 'receive') {
      if (inWindow) income += amount; else priorIncome += amount;
      receivablesTotal += tx.status && tx.status.toLowerCase() === 'paid' ? 0 : amount;
    } else if (type === 'expense' || type === 'spend') {
      if (inWindow) expenses += amount; else priorExpenses += amount;
      payablesTotal += amount;
    }

    if (!tx.suggested_category) {
      uncategorisedCount += 1;
    }

    if (tx.contact) {
      vendorTotals.set(tx.contact, (vendorTotals.get(tx.contact) || 0) + amount);
    }
  });

  const burnRate = expenses / windowDays * 30;
  const cashBalance = income - expenses;
  const runwayMonths = burnRate > 0 ? Math.max(0, +(cashBalance / burnRate).toFixed(1)) : null;
  const topVendor = Array.from(vendorTotals.entries()).sort((a, b) => b[1] - a[1])[0] || null;

  const revenueGrowth = priorIncome > 0 ? (income - priorIncome) / priorIncome : income > 0 ? 1 : 0;
  const expenseGrowth = priorExpenses > 0 ? (expenses - priorExpenses) / priorExpenses : expenses > 0 ? 1 : 0;

  return {
    income,
    expenses,
    net: income - expenses,
    burnRate,
    cashBalance,
    runwayDays: runwayMonths !== null ? Math.round(runwayMonths * 30) : null,
    runwayMonths,
    receivablesTotal,
    payablesTotal,
    uncategorisedCount,
    topVendor,
    revenueGrowth,
    expenseGrowth,
    windowDays
  };
}

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

function buildBaseRecommendations(metrics) {
  const recommendations = [];

  if (metrics.net < 0) {
    recommendations.push({
      key: 'cash_flow',
      title: 'Stabilise Cash Flow',
      description: `Net cash outflow of ${formatCurrency(Math.abs(metrics.net))} detected this month.`,
      category: 'cash_flow_optimization',
      priority: metrics.runwayMonths !== null && metrics.runwayMonths < 3 ? 'critical' : 'high',
      impact: 9,
      effort: 6,
      actionableSteps: [
        'Accelerate collection on outstanding receivables',
        'Review discretionary spending for immediate reductions',
        'Model 90-day cash flow scenarios with updated expense forecasts'
      ]
    });
  }

  if (metrics.uncategorisedCount > 5) {
    recommendations.push({
      key: 'categorisation',
      title: 'Resolve Uncategorised Transactions',
      description: `${metrics.uncategorisedCount} uncategorised transactions require attention.`,
      category: 'operational_efficiency',
      priority: 'high',
      impact: 7,
      effort: 4,
      actionableSteps: [
        'Review recent uncategorised entries and confirm categories',
        'Extend adaptive categoriser with new vendor rules',
        'Schedule weekly categorisation review in the founders rhythm'
      ]
    });
  }

  if (metrics.topVendor && metrics.topVendor[1] > metrics.expenses * 0.3) {
    recommendations.push({
      key: 'vendor_concentration',
      title: 'Reduce Vendor Concentration Risk',
      description: `${metrics.topVendor[0]} represents ${formatCurrency(metrics.topVendor[1])} of spend this month.`,
      category: 'risk_mitigation',
      priority: 'medium',
      impact: 6,
      effort: 5,
      actionableSteps: [
        'Negotiate revised terms with the top vendor',
        'Identify alternative suppliers to diversify spend',
        'Create monitoring alert for vendor spend thresholds'
      ]
    });
  }

  if (metrics.revenueGrowth < 0) {
    recommendations.push({
      key: 'revenue_growth',
      title: 'Rebuild Revenue Momentum',
      description: `Revenue declined ${(metrics.revenueGrowth * 100).toFixed(1)}% versus the prior period.`,
      category: 'revenue_growth',
      priority: 'medium',
      impact: 8,
      effort: 7,
      actionableSteps: [
        'Activate partnership outreach for dormant opportunities',
        'Bundle high-margin services for existing community partners',
        'Launch 4-week campaign targeting recurring revenue expansion'
      ]
    });
  }

  return recommendations;
}

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
    console.warn('⚠️  AI enrichment failed:', error.message);
    return base;
  }
}

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
