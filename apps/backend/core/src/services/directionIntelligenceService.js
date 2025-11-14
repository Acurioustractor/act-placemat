/**
 * Direction Intelligence Service
 * Builds the organisation direction scorecard and grant pursuit workflow
 */

import { createClient } from '@supabase/supabase-js';
import notionService from './notionService.js';
import { ProjectHealthService } from './projectHealthService.js';

const projectHealthService = new ProjectHealthService();
let financeCache = null;

let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

const SCORECARD_CACHE_TTL = 5 * 60 * 1000;
let cachedScorecard = null;

export async function buildDirectionScorecard({ useCache = true } = {}) {
  if (
    useCache &&
    cachedScorecard &&
    Date.now() - cachedScorecard.timestamp < SCORECARD_CACHE_TTL
  ) {
    return cachedScorecard.data;
  }

  const [financeSummary, projectHealth, relationshipSummary, opportunities] = await Promise.all([
    getFinanceSummary(),
    projectHealthService.calculateAllProjectHealth(),
    getRelationshipSummary(),
    notionService.getOpportunities(true).catch(() => [])
  ]);

  const projectSummary = summarizeProjects(projectHealth);
  const { rawProjects, ...projectPublic } = projectSummary;
  const opportunityHighlights = (opportunities || [])
    .slice(0, 3)
    .map(opportunity => formatOpportunityHighlight(opportunity, rawProjects))
    .filter(Boolean);

  const workflowPlan = await buildGrantPursuitPlan(
    { opportunityId: opportunityHighlights[0]?.id },
    { financeSummary, projectHealth }
  );

  const directionScore = calculateDirectionScore(
    financeSummary.healthScore,
    projectSummary.healthScore,
    relationshipSummary.healthScore
  );

  const scorecard = {
    directionScore,
    updatedAt: new Date().toISOString(),
    finance: financeSummary,
    projects: projectPublic,
    relationships: relationshipSummary,
    opportunities: {
      highlights: opportunityHighlights
    },
    workflow: workflowPlan
  };

  cachedScorecard = {
    timestamp: Date.now(),
    data: scorecard
  };

  return scorecard;
}

export async function getFinanceSummary() {
  const supabase = getSupabase();
  if (!supabase) {
    return withFinanceFallback({
      status: 'unconfigured',
      cashPosition: null,
      runwayMonths: null,
      recommendations: ['Connect Supabase + Xero credentials to unlock finance intelligence'],
      healthScore: 45,
      lastUpdated: null
    });
  }

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [
      receivablesResult,
      payablesResult,
      transactionsResult
    ] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('id, amount_due, total, contact_name, due_date')
        .eq('type', 'ACCREC')
        .gt('amount_due', 0),
      supabase
        .from('xero_invoices')
        .select('id, amount_due, total, contact_name, due_date')
        .eq('type', 'ACCPAY')
        .gt('amount_due', 0),
      supabase
        .from('xero_bank_transactions')
        .select('total, type, date')
        .gte('date', ninetyDaysAgo)
    ]);

    if (receivablesResult.error) throw receivablesResult.error;
    if (payablesResult.error) throw payablesResult.error;
    if (transactionsResult.error) throw transactionsResult.error;

    const receivables = receivablesResult.data || [];
    const payables = payablesResult.data || [];
    const transactions = transactionsResult.data || [];

    const totalReceivable = receivables.reduce(
      (sum, invoice) => sum + parseFloat(invoice.amount_due || 0),
      0
    );
    const totalPayable = payables.reduce(
      (sum, invoice) => sum + parseFloat(invoice.amount_due || 0),
      0
    );
    const netPosition = totalReceivable - totalPayable;

    const spendTotal = transactions
      .filter(tx => tx.type === 'SPEND')
      .reduce((sum, tx) => sum + Math.abs(tx.total || 0), 0);
    const monthsCovered = 3;
    const monthlyBurn = spendTotal / monthsCovered || 0;
    const runwayMonths = monthlyBurn > 0 ? +(netPosition / monthlyBurn).toFixed(1) : null;

    const overdueReceivables = receivables.filter(invoice => {
      if (!invoice.due_date) return false;
      return new Date(invoice.due_date) < new Date();
    }).length;

    const healthScore = Math.max(
      25,
      Math.min(
        100,
        Math.round(
          (netPosition > 0 ? 60 : 35) +
            (runwayMonths ? Math.min(runwayMonths * 5, 25) : 10) -
            Math.min(overdueReceivables * 2, 15)
        )
      )
    );

    const recommendations = [];
    if (overdueReceivables > 0) {
      recommendations.push(`Chase ${overdueReceivables} overdue invoices to unlock cash quickly`);
    }
    if (totalPayable > totalReceivable) {
      recommendations.push('Slow spend or accelerate receivables to rebalance payables');
    }
    if ((runwayMonths || 0) < 2) {
      recommendations.push('Focus on near-term revenue or bridge funding—runway under 2 months');
    }

    const summary = {
      status: 'ok',
      cashPosition: {
        receivable: totalReceivable,
        payable: totalPayable,
        netPosition
      },
      runwayMonths,
      overdueReceivables,
      recommendations,
      healthScore,
      lastUpdated: new Date().toISOString()
    };

    financeCache = summary;
    return summary;
  } catch (error) {
    console.error('Finance summary error:', error);
    if (financeCache) {
      return {
        ...financeCache,
        status: 'cached',
        error: error.message
      };
    }
    return {
      status: 'error',
      cashPosition: null,
      runwayMonths: null,
      recommendations: ['Finance data unavailable - check Supabase and Xero tables'],
      healthScore: 40,
      error: error.message,
      lastUpdated: null
    };
  }
}

export async function getRelationshipSummary() {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      status: 'unconfigured',
      tierStats: [],
      recentContacts: [],
      gmailHighlights: [],
      recommendations: ['Connect Supabase to load contact intelligence'],
      healthScore: 50
    };
  }

  try {
    const [tierStatsResult, gmailContactsResult] = await Promise.all([
      supabase.from('vw_engagement_tier_stats').select('*'),
      supabase
        .from('gmail_contacts')
        .select('id, email, name, domain, last_interaction, total_emails, interaction_frequency, is_vip')
        .order('last_interaction', { ascending: false })
        .limit(8)
    ]);

    if (tierStatsResult.error) throw tierStatsResult.error;
    if (gmailContactsResult.error) throw gmailContactsResult.error;

    const tierStats = tierStatsResult.data || [];
    const gmailContacts = gmailContactsResult.data || [];

    const totalContacts = tierStats.reduce(
      (sum, tier) => sum + (tier.total_contacts || 0),
      0
    );

    const weightedScore = tierStats.reduce((score, tier) => {
      const weight =
        tier.tier === 'critical'
          ? 1
          : tier.tier === 'high'
          ? 0.8
          : tier.tier === 'medium'
          ? 0.5
          : 0.2;
      return score + (tier.total_contacts || 0) * weight;
    }, 0);

    const healthScore = totalContacts
      ? Math.round((weightedScore / totalContacts) * 100)
      : 55;

    const recommendations = [];
    const criticalTier = tierStats.find(t => t.tier === 'critical');
    if (!criticalTier || criticalTier.total_contacts < 5) {
      recommendations.push('Promote more strategic contacts into Critical engagement tier');
    }
    if (gmailContacts.length === 0) {
      recommendations.push('Sync Gmail to surface warm relationships to activate');
    }

    return {
      status: 'ok',
      tierStats,
      recentContacts: gmailContacts.map(contact => ({
        id: contact.id,
        name: contact.name || contact.email,
        email: contact.email,
        domain: contact.domain,
        lastInteraction: contact.last_interaction,
        totalEmails: contact.total_emails,
        interactionFrequency: contact.interaction_frequency,
        isVip: contact.is_vip
      })),
      recommendations,
      healthScore
    };
  } catch (error) {
    console.error('Relationship summary error:', error);
    return {
      status: 'error',
      tierStats: [],
      recentContacts: [],
      recommendations: ['Contact intelligence temporarily unavailable'],
      healthScore: 45,
      error: error.message
    };
  }
}

export async function buildGrantPursuitPlan(options = {}, context = {}) {
  const { opportunityId, projectId } = options;
  const financeSummary = context.financeSummary || (await getFinanceSummary());
  const projectHealth = context.projectHealth || (await projectHealthService.calculateAllProjectHealth());
  const opportunities = await notionService.getOpportunities(true).catch(() => []);

  const opportunity = pickOpportunity(opportunities, opportunityId);
  const project = pickProject(projectHealth, projectId, opportunity);

  const supabase = getSupabase();
  const contact = supabase ? await pickStrategicContact(supabase, project) : null;

  const readinessScore = computeReadinessScore(financeSummary, project, contact);
  const automationActions = buildAutomationActions(project);

  return {
    opportunity,
    project: project
      ? {
          id: project.id,
          name: project.title || project.name,
          funding: project.healthData?.metrics?.budgetHealth,
          overallScore: project.healthData?.overallScore
        }
      : null,
    recommendedContact: contact,
    readinessScore,
    nextSteps: buildNextSteps(opportunity, project, contact),
    automationActions,
    aiAgentPrompt: buildAgentPrompt(opportunity, project, contact),
    projectJustification: project ? buildProjectJustification(project, opportunity) : null,
    contactJustification: contact ? buildContactJustification(contact) : null
  };
}

function summarizeProjects(projects) {
  if (!projects || projects.length === 0) {
    return {
      healthScore: 50,
      totalProjects: 0,
      focusProjects: [],
      needsByCategory: {},
      rawProjects: [],
      highNeedProjects: []
    };
  }

  const totalProjects = projects.length;
  const averageScore =
    projects.reduce((sum, project) => sum + (project.healthData?.overallScore || 0), 0) /
    totalProjects;

  const focusProjects = [...projects]
    .sort((a, b) => (a.healthData?.overallScore || 0) - (b.healthData?.overallScore || 0))
    .slice(0, 5)
    .map(project => ({
      id: project.id,
      name: project.title || project.name,
      healthScore: project.healthData?.overallScore,
      topRecommendation: formatProjectRecommendation(project.healthData?.recommendations?.[0])
    }));

  const { highNeedProjects, needsBreakdown } = analyzeProjectNeeds(projects);

  return {
    healthScore: Math.round(averageScore),
    totalProjects,
    focusProjects,
    needsByCategory: needsBreakdown,
    rawProjects: projects,
    highNeedProjects
  };
}

function formatProjectRecommendation(recommendation) {
  if (!recommendation) {
    return 'Review project plan';
  }
  const emoji = recommendation.emoji ? `${recommendation.emoji} ` : '';
  const action = recommendation.action || recommendation.type || 'Review project plan';
  return `${emoji}${action}`.trim();
}

function withFinanceFallback(summary) {
  if (financeCache) {
    return {
      ...financeCache,
      status: summary.status,
      fallback: true
    };
  }
  return summary;
}

function formatOpportunityHighlight(opportunity, projects = []) {
  if (!opportunity) return null;

  const highlight = {
    id: opportunity.id,
    name: opportunity.name,
    amount: opportunity.amount,
    deadline: opportunity.deadline,
    stage: opportunity.stage,
    tags: opportunity.tags,
    probability: opportunity.probability,
    description: opportunity.description
  };

  if (projects.length > 0) {
    const candidate = pickProject(projects, null, opportunity);
    if (candidate) {
      const budgetHealth = candidate.healthData?.metrics?.budgetHealth;
      const gap = budgetHealth?.gap || 0;
      const amount = opportunity.amount || 0;
      const matchedTags = (opportunity.tags || []).filter(tag =>
        candidate.themes?.includes(tag)
      );

      const matchScore = Math.min(
        100,
        Math.max(10, 100 - (budgetHealth?.score || 50) + matchedTags.length * 5)
      );

      const fundingGapClosed =
        gap > 0 && amount > 0 ? Math.min(100, Math.round((amount / gap) * 100)) : null;

      highlight.matchingProject = {
        id: candidate.id,
        name: candidate.title || candidate.name,
        fundingScore: budgetHealth?.score,
        sharedTags: matchedTags
      };
      highlight.matchScore = matchScore;
      highlight.fundingGapClosed = fundingGapClosed;
    }
  }

  return highlight;
}

function calculateDirectionScore(financeScore = 50, projectScore = 50, relationshipScore = 50) {
  const weights = {
    finance: 0.4,
    projects: 0.35,
    relationships: 0.25
  };

  return Math.round(
    financeScore * weights.finance +
      projectScore * weights.projects +
      relationshipScore * weights.relationships
  );
}

function pickOpportunity(opportunities, opportunityId) {
  if (!opportunities || opportunities.length === 0) return null;
  if (opportunityId) {
    return opportunities.find(opportunity => opportunity.id === opportunityId) || opportunities[0];
  }
  return [...opportunities]
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    })[0];
}

function pickProject(projects, projectId, opportunity) {
  if (!projects || projects.length === 0) return null;
  if (projectId) {
    const match = projects.find(project => project.id === projectId || project.supabaseProjectId === projectId);
    if (match) return match;
  }

  const withFundingNeed = projects
    .filter(project => (project.healthData?.metrics?.budgetHealth?.score || 0) < 70)
    .sort((a, b) => (a.healthData?.metrics?.budgetHealth?.score || 0) - (b.healthData?.metrics?.budgetHealth?.score || 0));

  if (withFundingNeed.length > 0) {
    return withFundingNeed[0];
  }

  if (opportunity?.tags?.length) {
    const thematicMatch = projects.find(project =>
      project.themes?.some(theme => opportunity.tags.includes(theme))
    );
    if (thematicMatch) return thematicMatch;
  }

  return projects[0];
}

async function pickStrategicContact(supabase, project) {
  if (!project) return null;
  const { data, error } = await supabase
    .from('person_identity_map')
    .select(`
      person_id,
      full_name,
      email,
      current_position,
      current_company,
      sector,
      engagement_priority,
      contact_intelligence_scores (
        composite_score,
        influence_score,
        strategic_value_score
      ),
      contact_interactions (
        metadata,
        interaction_type
      )
    `)
    .in('engagement_priority', ['critical', 'high'])
    .limit(50);

  if (error) {
    console.warn('Failed to fetch strategic contacts:', error.message);
    return null;
  }

  if (!data || data.length === 0) return null;

  const scoredContacts = data.map(contact => {
    const scores = contact.contact_intelligence_scores?.[0] || {};
    const hasProjectInteraction = contact.contact_interactions?.some(
      interaction => interaction.metadata?.project_id === project.supabaseProjectId
    );

    const planScore =
      (scores.composite_score || 60) +
      (contact.engagement_priority === 'critical' ? 20 : 10) +
      (hasProjectInteraction ? 15 : 0);

    return {
      personId: contact.person_id,
      name: contact.full_name,
      email: contact.email,
      currentRole: contact.current_position,
      currentCompany: contact.current_company,
      sector: contact.sector,
      engagementPriority: contact.engagement_priority,
      compositeScore: scores.composite_score,
      planScore
    };
  });

  scoredContacts.sort((a, b) => (b.planScore || 0) - (a.planScore || 0));
  return scoredContacts[0];
}

function computeReadinessScore(financeSummary, project, contact) {
  const financeScore = financeSummary?.healthScore || 50;
  const projectFundingScore = project?.healthData?.metrics?.budgetHealth?.score || 50;
  const relationshipScore = contact ? Math.min((contact.planScore || 70), 100) : 45;

  return Math.round(financeScore * 0.4 + projectFundingScore * 0.35 + relationshipScore * 0.25);
}

function buildAutomationActions(project) {
  const projectName = project?.title || project?.name || 'the selected project';
  return [
    {
      id: 'process-receipts',
      endpoint: '/api/v2/automate/receipts/process',
      description: `Compile receipts and supporting docs linked to ${projectName} before the grant submission`,
      requiresConfirmation: true
    },
    {
      id: 'bank-reconcile',
      endpoint: '/api/v2/automate/bank/reconcile',
      description: 'Reconcile bank transactions to make the financial snapshot grant-ready',
      requiresConfirmation: true
    }
  ];
}

function buildNextSteps(opportunity, project, contact) {
  const steps = [];

  if (opportunity) {
    steps.push({
      type: 'analysis',
      label: `Confirm eligibility for ${opportunity.name}`,
      detail: opportunity.requirements || 'Review requirements in Notion and confirm ACT alignment'
    });
  }

  if (contact) {
    steps.push({
      type: 'relationship',
      label: `Engage ${contact.name}`,
      detail: `Leverage ${contact.engagementPriority} tier contact to co-design the grant narrative.`,
      recommendedChannel: 'email'
    });
  }

  steps.push({
    type: 'automation',
    label: 'Prepare finances automatically',
    detail: 'Use automation endpoints to produce clean financial packets before uploading to portals.',
    automationEndpoints: ['/api/v2/automate/receipts/process', '/api/v2/automate/bank/reconcile']
  });

  return steps;
}

function buildAgentPrompt(opportunity, project, contact) {
  const opportunityLine = opportunity
    ? `Grant: ${opportunity.name} (${opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : 'amount TBD'}) due ${opportunity.deadline || 'soon'}.`
    : 'Grant: Identify best current opportunity.';

  const projectLine = project
    ? `Project: ${project.title || project.name} (health ${project.healthData?.overallScore}).`
    : '';

  const contactLine = contact
    ? `Contact: ${contact.name} (${contact.engagementPriority})`
    : 'Contact: Suggest who to involve.';

  return `${opportunityLine}\n${projectLine}\n${contactLine}\nHelp me craft next actions and draft the first outreach email.`;
}

function analyzeProjectNeeds(projects) {
  const breakdown = {
    funding: 0,
    engagement: 0,
    momentum: 0
  };
  const highNeedProjects = [];

  projects.forEach(project => {
    const metrics = project.healthData?.metrics || {};
    const budgetScore = metrics.budgetHealth?.score ?? 0;
    const engagementScore = metrics.stakeholderEngagement?.score ?? 0;
    const momentumScore = metrics.momentum?.score ?? 0;

    if (budgetScore < 60) breakdown.funding += 1;
    if (engagementScore < 60) breakdown.engagement += 1;
    if (momentumScore < 60) breakdown.momentum += 1;

    if (budgetScore < 60 || engagementScore < 60) {
      highNeedProjects.push({
        id: project.id,
        name: project.title || project.name,
        fundingScore: budgetScore,
        engagementScore,
        regions: project.relatedPlaces || [],
        tags: project.themes || []
      });
    }
  });

  return {
    needsBreakdown: breakdown,
    highNeedProjects
  };
}

function formatGmailAllies(contacts = []) {
  return contacts.map(contact => {
    const lastInteraction = contact.last_interaction ? new Date(contact.last_interaction) : null;
    const daysSince = lastInteraction
      ? Math.floor((Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const freshness = determineFreshnessBadge(daysSince);

    return {
      id: contact.id,
      name: contact.name || contact.email,
      email: contact.email,
      domain: contact.domain,
      lastInteraction: contact.last_interaction,
      totalEmails: contact.total_emails,
      interactionFrequency: contact.interaction_frequency,
      isVip: contact.is_vip,
      daysSinceInteraction: daysSince,
      freshness
    };
  });
}

function determineFreshnessBadge(days) {
  if (days === null || Number.isNaN(days)) {
    return { label: 'Unknown', emoji: '❔' };
  }
  if (days <= 2) return { label: 'Hot', emoji: '🔥' };
  if (days <= 7) return { label: 'Warm', emoji: '✨' };
  if (days <= 14) return { label: 'Cooling', emoji: '🧊' };
  return { label: 'Cold', emoji: '❄️' };
}

function buildProjectJustification(project, opportunity) {
  const budget = project.healthData?.metrics?.budgetHealth;
  const engagement = project.healthData?.metrics?.stakeholderEngagement;
  const tags = opportunity?.tags || [];
  const sharedTags = tags.length ? (project.themes || []).filter(theme => tags.includes(theme)) : [];

  const parts = [];
  if (budget?.gap) {
    parts.push(`Funding gap $${Number(budget.gap).toLocaleString()}`);
  }
  if (budget?.score !== undefined) {
    parts.push(`Funding score ${budget.score}/100`);
  }
  if (engagement?.score !== undefined) {
    parts.push(`Engagement score ${engagement.score}/100`);
  }
  if (sharedTags.length > 0) {
    parts.push(`Aligned themes: ${sharedTags.slice(0, 3).join(', ')}`);
  }

  return parts.join(' • ') || 'Aligns with opportunity scope';
}

function buildContactJustification(contact) {
  const parts = [];
  if (contact.engagementPriority) {
    parts.push(`Tier ${contact.engagementPriority}`);
  }
  if (contact.compositeScore) {
    parts.push(`Composite score ${contact.compositeScore}`);
  }
  if (contact.currentCompany) {
    parts.push(contact.currentCompany);
  }
  return parts.join(' • ') || 'Strategic ally';
}
