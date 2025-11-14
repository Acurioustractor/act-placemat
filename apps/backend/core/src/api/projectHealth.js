/**
 * Project Health Intelligence API
 *
 * Analyzes project health across multiple dimensions:
 * - Funding health (gap analysis, revenue tracking)
 * - People health (cadence, supporter engagement)
 * - Momentum (milestones, recent activity)
 * - Ownership (Beautiful Obsolescence readiness)
 * - Data completeness
 *
 * Part of ACT Intelligence Evolution - Phase 1
 */

import express from 'express';
import projectActivityService from '../services/projectActivityService.js';

const router = express.Router();

/**
 * Calculate days between two dates
 */
function daysSince(dateString) {
  if (!dateString) return null;
  const then = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - then);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if date is within specified days
 */
function isWithinDays(dateString, days) {
  if (!dateString) return false;
  const daysDiff = daysSince(dateString);
  return daysDiff !== null && daysDiff <= days;
}

/**
 * Calculate funding health score and identify gaps
 */
function calculateFundingHealth(project) {
  const actualIncoming = project.actualIncoming || 0;
  const potentialIncoming = project.potentialIncoming || 0;
  const budget = project.budget || 0;

  const fundingGap = Math.max(0, budget - actualIncoming);
  const potentialGap = Math.max(0, potentialIncoming - actualIncoming);

  // Score based on funding adequacy
  let score = 100;
  if (budget > 0) {
    const fundedPercentage = (actualIncoming / budget) * 100;
    score = Math.min(100, fundedPercentage);
  } else if (actualIncoming > 0) {
    score = 100; // Has income but no budget set
  } else if (potentialIncoming > 0) {
    score = 50; // Has potential but no actual
  } else {
    score = 0; // No funding at all
  }

  let status = 'healthy';
  if (fundingGap > 50000) status = 'critical';
  else if (fundingGap > 20000) status = 'gap';

  const recommendations = [];
  if (fundingGap > 0) {
    recommendations.push(`Secure $${fundingGap.toLocaleString()} to meet budget target`);
  }
  if (potentialGap > 10000) {
    recommendations.push(`Convert $${potentialGap.toLocaleString()} potential to actual revenue`);
  }
  if (actualIncoming === 0 && potentialIncoming === 0) {
    recommendations.push('Add funding sources to project (actual or potential)');
  }

  return {
    score: Math.round(score),
    gap: fundingGap,
    potentialGap,
    actualIncoming,
    potentialIncoming,
    budget,
    status,
    recommendations
  };
}

/**
 * Calculate people/relationship health based on cadence
 */
function calculatePeopleHealth(project, touchpoints = []) {
  const supporters = project.supporters || [];
  const relatedOrgs = project.relatedOrganisations || [];
  const relatedPeople = project.relatedPeople || [];

  const totalPeople = supporters.length + relatedOrgs.length + relatedPeople.length;

  // Recent touchpoint analysis
  const touchpointsLast30 = touchpoints.filter(t => isWithinDays(t.occurredAt, 30)).length;
  const touchpointsLast90 = touchpoints.filter(t => isWithinDays(t.occurredAt, 90)).length;

  const atRiskRelationships = [];

  // Score based on engagement
  let score = 50; // Base score

  // People count factor (0-30 points)
  if (totalPeople >= 10) score += 30;
  else if (totalPeople >= 5) score += 20;
  else if (totalPeople >= 2) score += 10;

  // Touchpoint recency factor (0-40 points)
  if (touchpointsLast30 >= 5) score += 40;
  else if (touchpointsLast30 >= 3) score += 30;
  else if (touchpointsLast90 >= 5) score += 20;
  else if (touchpointsLast90 >= 1) score += 10;

  // Lead presence factor (0-30 points)
  if (project.projectLead || project.lead) score += 30;

  score = Math.min(100, score);

  const recommendations = [];
  if (totalPeople < 3) {
    recommendations.push('Grow supporter network (current: ' + totalPeople + ', target: 5+)');
  }
  if (touchpointsLast90 < 3) {
    recommendations.push('Increase engagement - only ' + touchpointsLast90 + ' touchpoints in 90 days');
    atRiskRelationships.push('Low engagement detected');
  }
  if (!project.projectLead && !project.lead) {
    recommendations.push('Assign a project lead');
  }

  return {
    score: Math.round(score),
    activeSupporters: totalPeople,
    touchpointsLast30Days: touchpointsLast30,
    touchpointsLast90Days: touchpointsLast90,
    atRiskRelationships,
    recommendations
  };
}

/**
 * Calculate momentum based on milestones and activity
 */
function calculateMomentum(project, activitySummary = null) {
  const lastActivityDates = [
    project.updatedAt,
    activitySummary?.last_gmail_activity,
    activitySummary?.last_calendar_activity,
    activitySummary?.last_notation_activity
  ]
    .filter(Boolean)
    .map(date => new Date(date));

  let mostRecentDate = project.updatedAt;
  if (lastActivityDates.length > 0) {
    const latest = lastActivityDates.reduce((latestSoFar, current) =>
      current > latestSoFar ? current : latestSoFar
    );
    mostRecentDate = latest.toISOString();
  }

  const daysSinceUpdate = daysSince(mostRecentDate) || 0;
  const hasNextMilestone = !!project.nextMilestoneDate;
  const milestoneOverdue = project.nextMilestoneDate && daysSince(project.nextMilestoneDate) > 0;

  let score = 100;

  // Penalize for staleness
  if (daysSinceUpdate > 90) score -= 60;
  else if (daysSinceUpdate > 60) score -= 40;
  else if (daysSinceUpdate > 30) score -= 20;

  // Reward for having milestones
  if (hasNextMilestone && !milestoneOverdue) score += 0; // Neutral
  else if (!hasNextMilestone) score -= 20; // Penalty for no planning
  else if (milestoneOverdue) score -= 30; // Penalty for overdue

  score = Math.max(0, Math.min(100, score));

  let status = 'active';
  if (score < 30) status = 'inactive';
  else if (score < 60) status = 'stalled';

  const recommendations = [];
  if (daysSinceUpdate > 60) {
    recommendations.push('Project needs update - last modified ' + daysSinceUpdate + ' days ago');
  }
  if (!hasNextMilestone) {
    recommendations.push('Set next milestone date to track progress');
  }
  if (milestoneOverdue) {
    const daysOverdue = daysSince(project.nextMilestoneDate);
    recommendations.push('Milestone overdue by ' + daysOverdue + ' days - review timeline');
  }

  return {
    score: Math.round(score),
    overdueMilestones: milestoneOverdue ? 1 : 0,
    daysSinceLastUpdate: daysSinceUpdate,
    hasNextMilestone,
    status,
    recommendations
  };
}

/**
 * Calculate community ownership / Beautiful Obsolescence readiness
 */
function calculateOwnershipHealth(project) {
  // This will be populated from Notion when communityOwnershipPct field is added
  const ownershipPct = project.communityOwnershipPct || 0;
  const targetPct = 100; // Beautiful Obsolescence = 100% community owned

  const score = ownershipPct;

  const readinessForTransition = ownershipPct >= 80;

  const recommendations = [];
  if (ownershipPct < 20) {
    recommendations.push('Begin community ownership transition planning');
  } else if (ownershipPct < 50) {
    recommendations.push('Accelerate community ownership transfer (current: ' + ownershipPct + '%)');
  } else if (ownershipPct < 80) {
    recommendations.push('Near transition readiness - ' + (80 - ownershipPct) + '% remaining');
  } else if (ownershipPct >= 80) {
    recommendations.push('Ready for Beautiful Obsolescence transition! 🌅');
  }

  return {
    score: Math.round(score),
    current: ownershipPct,
    target: targetPct,
    readinessForTransition,
    recommendations
  };
}

/**
 * Calculate Beautiful Obsolescence readiness (AUTOMATED)
 * Auto-calculates from existing Notion data - no manual fields needed
 */
function calculateBeautifulObsolescence(project, healthMetrics) {
  // 1. Revenue Independence (from existing budget data)
  const revenueIndependence = project.actualIncoming && project.budget > 0
    ? Math.min(100, (project.actualIncoming / project.budget) * 100)
    : project.actualIncoming > 0 ? 80 : 0; // If has income but no budget, assume 80%

  // 2. Relationship Density (from existing relationship data)
  const connections =
    (project.supporters?.length || 0) +
    (project.relatedOrganisations?.length || 0) +
    (project.relatedPeople?.length || 0) +
    (project.relatedProjects?.length || 0);

  const densityPoints = connections >= 31 ? 20 :
                        connections >= 16 ? 15 :
                        connections >= 6 ? 10 : 0;

  const densityLabel = connections >= 31 ? 'Antifragile' :
                       connections >= 16 ? 'Resilient' :
                       connections >= 6 ? 'Developing' : 'Isolated';

  // 3. Decision Autonomy (inferred from ACT involvement)
  const touchpointsLast90 = healthMetrics?.people?.touchpointsLast90Days || 0;
  const hasACTLead = project.lead?.toLowerCase?.()?.includes?.('act') ||
                     project.projectLead?.toLowerCase?.()?.includes?.('act');

  // If low touchpoints + high revenue = probably autonomous
  // If ACT in lead name = ACT-led
  const autonomyPoints =
    !hasACTLead && touchpointsLast90 < 3 && revenueIndependence > 80 ? 20 : // Fully autonomous
    !hasACTLead && revenueIndependence > 60 && connections > 10 ? 15 :  // Community-led
    revenueIndependence > 30 || connections > 5 ? 10 :  // Co-designed
    0;  // ACT-led

  const autonomyLabel = autonomyPoints === 20 ? 'Fully Autonomous' :
                        autonomyPoints === 15 ? 'Community-led (ACT advisor)' :
                        autonomyPoints === 10 ? 'Co-designed' : 'ACT-led';

  // 4. Community Ownership % (manual field OR auto-calculate)
  // Prefer manual value if exists, otherwise calculate
  const communityOwnership = project.communityOwnership !== undefined && project.communityOwnership !== null
    ? project.communityOwnership
    : Math.min(100, (revenueIndependence * 0.6) + (autonomyPoints * 2));

  // 5. Beautiful Obsolescence Score
  const boScore = Math.round(
    (communityOwnership * 0.3) +
    (revenueIndependence * 0.3) +
    (autonomyPoints * 0.2) +
    (densityPoints * 0.2)
  );

  // 6. Infer Rocket Booster Stage (prefer manual, fallback to auto)
  const inferredStage = project.rocketBoosterStage || (
    project.status?.includes('Transferred') || boScore >= 85 ? '🌅 Obsolete' :
    project.status?.includes('Sunsetting') || boScore >= 75 ? '🏠 Landed' :
    boScore >= 60 ? '✈️ Cruising' :
    boScore >= 40 ? '🛸 Orbit' : '🚀 Launch'
  );

  const readyForTransition = boScore >= 80;

  const recommendations = [];
  if (readyForTransition) {
    recommendations.push('🌅 Ready for Beautiful Obsolescence celebration!');
    recommendations.push(`${connections} active relationships - ${densityLabel.toLowerCase()} network`);
    recommendations.push(`${Math.round(revenueIndependence)}% revenue independent - ${communityOwnership >= 80 ? 'community sustainable' : 'nearly sustainable'}`);
  } else {
    const gap = 80 - boScore;
    recommendations.push(`${gap} points from Beautiful Obsolescence readiness (target: 80)`);

    if (communityOwnership < 70) {
      recommendations.push(`Increase community ownership (currently ${Math.round(communityOwnership)}%)`);
    }
    if (revenueIndependence < 70) {
      recommendations.push(`Increase revenue independence (currently ${Math.round(revenueIndependence)}%)`);
    }
    if (connections < 16) {
      recommendations.push(`Grow network connections (currently ${connections}, target: 16+)`);
    }
    if (autonomyPoints < 15) {
      recommendations.push(`Transition decision-making to community (currently: ${autonomyLabel})`);
    }
  }

  return {
    score: boScore,
    readyForTransition,
    metrics: {
      communityOwnership: Math.round(communityOwnership),
      revenueIndependence: Math.round(revenueIndependence),
      relationshipDensity: {
        count: connections,
        label: densityLabel,
        points: densityPoints
      },
      decisionAutonomy: {
        label: autonomyLabel,
        points: autonomyPoints
      },
      inferredStage,
      isAutoCalculated: !project.communityOwnership && !project.rocketBoosterStage
    },
    recommendations
  };
}

/**
 * Calculate data completeness
 */
function calculateDataCompleteness(project) {
  const requiredFields = [
    'status',
    'themes',
    'projectLead',
    'nextMilestoneDate',
    'relatedPlaces',
    'description',
    'actualIncoming',
    'potentialIncoming'
  ];

  const missing = [];
  let filledCount = 0;

  requiredFields.forEach(field => {
    const value = project[field];
    const isFilled = value !== null &&
                     value !== undefined &&
                     value !== '' &&
                     !(Array.isArray(value) && value.length === 0);

    if (isFilled) {
      filledCount++;
    } else {
      missing.push(field);
    }
  });

  const score = (filledCount / requiredFields.length) * 100;

  const recommendations = [];
  if (missing.length > 0) {
    recommendations.push('Complete missing fields: ' + missing.join(', '));
  }

  return {
    score: Math.round(score),
    missing,
    completeness: filledCount + '/' + requiredFields.length,
    recommendations
  };
}

/**
 * Generate AI brief summarizing project health
 */
function generateHealthBrief(project, health) {
  const issues = [];
  const strengths = [];

  // Analyze each dimension
  if (health.dimensions.funding.status === 'critical') {
    issues.push(`Critical funding gap of $${health.dimensions.funding.gap.toLocaleString()}`);
  } else if (health.dimensions.funding.status === 'gap') {
    issues.push(`Funding gap of $${health.dimensions.funding.gap.toLocaleString()}`);
  } else {
    strengths.push('Funding is healthy');
  }

  if (health.dimensions.people.score < 50) {
    issues.push(`Low engagement: only ${health.dimensions.people.touchpointsLast90Days} touchpoints in 90 days`);
  } else {
    strengths.push(`Active network with ${health.dimensions.people.activeSupporters} supporters`);
  }

  if (health.dimensions.momentum.status === 'inactive') {
    issues.push('Project appears inactive - no recent updates');
  } else if (health.dimensions.momentum.status === 'stalled') {
    issues.push('Project momentum stalled');
  } else {
    strengths.push('Good momentum with recent activity');
  }

  if (health.dimensions.ownership.readinessForTransition) {
    strengths.push('Ready for Beautiful Obsolescence transition! 🌅');
  }

  if (health.dimensions.data.score < 70) {
    issues.push('Incomplete project data (' + health.dimensions.data.completeness + ')');
  }

  let brief = `**${project.name}** (Overall Health: ${health.overallScore}/100)\n\n`;

  if (strengths.length > 0) {
    brief += `✅ Strengths: ${strengths.join('; ')}\n\n`;
  }

  if (issues.length > 0) {
    brief += `⚠️ Issues: ${issues.join('; ')}\n\n`;
  }

  if (health.urgentNeeds.length > 0) {
    brief += `🚨 Urgent Needs:\n`;
    health.urgentNeeds.forEach(need => {
      brief += `- ${need.description}\n`;
    });
  }

  return brief;
}

/**
 * Identify urgent needs based on health scores
 */
function identifyUrgentNeeds(project, healthDimensions) {
  const urgentNeeds = [];

  // Critical funding gap
  if (healthDimensions.funding.gap > 20000) {
    urgentNeeds.push({
      type: 'funding',
      priority: healthDimensions.funding.gap > 50000 ? 'critical' : 'high',
      description: `Funding gap of $${healthDimensions.funding.gap.toLocaleString()}`,
      suggestedActions: [
        'Review matching grant opportunities',
        'Connect with potential funders from network',
        'Update potential funding sources in Notion'
      ]
    });
  }

  // Low engagement
  if (healthDimensions.people.touchpointsLast90Days < 3) {
    urgentNeeds.push({
      type: 'people',
      priority: healthDimensions.people.touchpointsLast90Days === 0 ? 'critical' : 'high',
      description: `Low engagement: ${healthDimensions.people.touchpointsLast90Days} touchpoints in 90 days`,
      suggestedActions: [
        'Schedule check-in with project lead',
        'Reach out to dormant supporters',
        'Plan community event or update'
      ]
    });
  }

  // Overdue milestone
  if (healthDimensions.momentum.overdueMilestones > 0) {
    urgentNeeds.push({
      type: 'milestone',
      priority: 'high',
      description: 'Milestone overdue - timeline review needed',
      suggestedActions: [
        'Connect with project lead about delays',
        'Reassess timeline and resources',
        'Update milestone date in Notion'
      ]
    });
  }

  // Missing project lead
  if (!project.projectLead && !project.lead) {
    urgentNeeds.push({
      type: 'governance',
      priority: 'medium',
      description: 'No project lead assigned',
      suggestedActions: [
        'Identify community member to lead',
        'Update project lead in Notion',
        'Ensure governance structure exists'
      ]
    });
  }

  // Incomplete data
  if (healthDimensions.data.score < 50) {
    urgentNeeds.push({
      type: 'data',
      priority: 'medium',
      description: `Data only ${healthDimensions.data.completeness} complete`,
      suggestedActions: [
        'Complete missing fields: ' + healthDimensions.data.missing.join(', '),
        'Schedule data hygiene session',
        'Set up regular update cadence'
      ]
    });
  }

  return urgentNeeds;
}

/**
 * GET /api/v2/projects/beautiful-obsolescence-summary
 * Get Beautiful Obsolescence readiness across all projects (AUTOMATED!)
 * IMPORTANT: This must be BEFORE /:projectId routes to avoid being matched as a projectId
 */
router.get('/beautiful-obsolescence-summary', async (req, res) => {
  try {
    const projects = await req.app.locals.notionService.getProjects();

    const boScores = [];
    let readyForTransitionCount = 0;

    for (const project of projects) {
      const funding = calculateFundingHealth(project);
      const people = calculatePeopleHealth(project, []);
      const momentum = calculateMomentum(project);
      const ownership = calculateOwnershipHealth(project);
      const data = calculateDataCompleteness(project);

      const healthMetrics = { funding, people, momentum, ownership, data };
      const bo = calculateBeautifulObsolescence(project, healthMetrics);

      if (bo.readyForTransition) {
        readyForTransitionCount++;
      }

      boScores.push({
        projectId: project.id,
        projectName: project.name,
        score: bo.score,
        readyForTransition: bo.readyForTransition,
        stage: bo.metrics.inferredStage,
        communityOwnership: bo.metrics.communityOwnership,
        revenueIndependence: bo.metrics.revenueIndependence,
        relationshipDensity: bo.metrics.relationshipDensity.label,
        decisionAutonomy: bo.metrics.decisionAutonomy.label,
        isAutoCalculated: bo.metrics.isAutoCalculated,
        status: project.status,
        themes: project.themes
      });
    }

    // Sort by Beautiful Obsolescence score
    boScores.sort((a, b) => b.score - a.score);

    // Group by stage
    const byStage = {
      obsolete: boScores.filter(p => p.stage === '🌅 Obsolete'),
      landed: boScores.filter(p => p.stage === '🏠 Landed'),
      cruising: boScores.filter(p => p.stage === '✈️ Cruising'),
      orbit: boScores.filter(p => p.stage === '🛸 Orbit'),
      launch: boScores.filter(p => p.stage === '🚀 Launch')
    };

    res.json({
      summary: {
        totalProjects: projects.length,
        readyForTransition: readyForTransitionCount,
        averageScore: Math.round(boScores.reduce((sum, p) => sum + p.score, 0) / boScores.length),
        byStage: {
          obsolete: byStage.obsolete.length,
          landed: byStage.landed.length,
          cruising: byStage.cruising.length,
          orbit: byStage.orbit.length,
          launch: byStage.launch.length
        },
        autoCalculated: boScores.filter(p => p.isAutoCalculated).length
      },
      projects: boScores,
      readyForTransition: boScores.filter(p => p.readyForTransition),
      byStage,
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating Beautiful Obsolescence summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/projects/:id/health
 * Calculate comprehensive health score for a project
 */
router.get('/:projectId/health', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project data from Notion
    const project = await req.app.locals.notionService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get related data (touchpoints would come from Supabase)
    // For now, mock touchpoints - later integrate with Supabase
    const touchpoints = []; // TODO: Get from Supabase contact_cadence_metrics

    // Calculate each dimension
    const funding = calculateFundingHealth(project);
    const people = calculatePeopleHealth(project, touchpoints);
    const momentum = calculateMomentum(project);
    const ownership = calculateOwnershipHealth(project);
    const data = calculateDataCompleteness(project);

    const dimensions = { funding, people, momentum, ownership, data };

    // Calculate overall score (weighted average)
    const overallScore = (
      funding.score * 0.25 +
      people.score * 0.25 +
      momentum.score * 0.20 +
      ownership.score * 0.20 +
      data.score * 0.10
    );

    // Identify urgent needs
    const urgentNeeds = identifyUrgentNeeds(project, dimensions);

    const health = {
      projectId: project.id,
      projectName: project.name,
      overallScore: Math.round(overallScore),
      dimensions,
      urgentNeeds,
      aiBrief: '', // Will be generated
      calculatedAt: new Date().toISOString()
    };

    // Generate AI brief
    health.aiBrief = generateHealthBrief(project, health);

    res.json(health);

  } catch (error) {
    console.error('Error calculating project health:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/projects/needs
 * Get all detected needs across all projects
 */
router.get('/needs', async (req, res) => {
  try {
    // Get all projects
    const projects = await req.app.locals.notionService.getProjects();
    const activityMap = new Map();

    await Promise.all(
      projects.map(async project => {
        try {
          const supabaseId = project.supabaseProjectId || project.supabase_project_id || project.id;
          const summary = await projectActivityService.getActivitySummary(supabaseId);
          activityMap.set(project.id, summary || null);
        } catch (err) {
          console.warn(`Failed to load activity for project ${project.id}:`, err.message);
          activityMap.set(project.id, null);
        }
      })
    );

    const allNeeds = [];

    // Calculate health for each project and extract needs
    for (const project of projects) {
      const activitySummary = activityMap.get(project.id) || null;
      const touchpoints = buildTouchpointsFromActivity(activitySummary);
      const funding = calculateFundingHealth(project);
      const people = calculatePeopleHealth(project, touchpoints);
      const momentum = calculateMomentum(project, activitySummary);
      const ownership = calculateOwnershipHealth(project);
      const data = calculateDataCompleteness(project);

      const dimensions = { funding, people, momentum, ownership, data };
      const urgentNeeds = identifyUrgentNeeds(project, dimensions);

      // Add project context to each need
      urgentNeeds.forEach(need => {
        allNeeds.push({
          ...need,
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          projectThemes: project.themes || [],
          activitySnapshot: activitySummary
        });
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allNeeds.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Group by priority
    const grouped = {
      critical: allNeeds.filter(n => n.priority === 'critical'),
      high: allNeeds.filter(n => n.priority === 'high'),
      medium: allNeeds.filter(n => n.priority === 'medium'),
      low: allNeeds.filter(n => n.priority === 'low')
    };

    res.json({
      total: allNeeds.length,
      byPriority: {
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
        low: grouped.low.length
      },
      needs: allNeeds,
      grouped
    });

  } catch (error) {
    console.error('Error fetching project needs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/projects/health-summary
 * Get health summary across all projects
 */
router.get('/health-summary', async (req, res) => {
  try {
    const projects = await req.app.locals.notionService.getProjects();

    const healthScores = [];
    let totalScore = 0;
    let healthyCount = 0;
    let atRiskCount = 0;
    let criticalCount = 0;

    for (const project of projects) {
      const funding = calculateFundingHealth(project);
      const people = calculatePeopleHealth(project, []);
      const momentum = calculateMomentum(project);
      const ownership = calculateOwnershipHealth(project);
      const data = calculateDataCompleteness(project);

      const overallScore = Math.round(
        funding.score * 0.25 +
        people.score * 0.25 +
        momentum.score * 0.20 +
        ownership.score * 0.20 +
        data.score * 0.10
      );

      totalScore += overallScore;

      if (overallScore >= 70) healthyCount++;
      else if (overallScore >= 40) atRiskCount++;
      else criticalCount++;

      healthScores.push({
        projectId: project.id,
        projectName: project.name,
        score: overallScore,
        status: project.status,
        themes: project.themes
      });
    }

    const averageScore = Math.round(totalScore / projects.length);

    // Sort by score
    healthScores.sort((a, b) => a.score - b.score);

    res.json({
      summary: {
        totalProjects: projects.length,
        averageHealth: averageScore,
        healthy: healthyCount,
        atRisk: atRiskCount,
        critical: criticalCount
      },
      projects: healthScores,
      topPerformers: healthScores.slice(-10).reverse(), // Top 10
      needsAttention: healthScores.slice(0, 10) // Bottom 10
    });

  } catch (error) {
    console.error('Error calculating health summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/projects/:id/beautiful-obsolescence
 * Calculate Beautiful Obsolescence readiness (AUTOMATED - no manual fields needed!)
 */
router.get('/:projectId/beautiful-obsolescence', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project data
    const project = await req.app.locals.notionService.getProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate health metrics (needed for Beautiful Obsolescence calculation)
    const funding = calculateFundingHealth(project);
    const people = calculatePeopleHealth(project, []);
    const momentum = calculateMomentum(project);
    const ownership = calculateOwnershipHealth(project);
    const data = calculateDataCompleteness(project);

    const healthMetrics = { funding, people, momentum, ownership, data };

    // Calculate Beautiful Obsolescence (AUTOMATED!)
    const beautifulObsolescence = calculateBeautifulObsolescence(project, healthMetrics);

    const overallHealth = Math.round(
      funding.score * 0.25 +
      people.score * 0.25 +
      momentum.score * 0.20 +
      ownership.score * 0.20 +
      data.score * 0.10
    );

    res.json({
      projectId: project.id,
      projectName: project.name,
      beautifulObsolescence,
      health: {
        overall: overallHealth,
        funding,
        people,
        momentum
      },
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating Beautiful Obsolescence:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

function buildTouchpointsFromActivity(activitySummary) {
  if (!activitySummary) return [];

  const touchpoints = [];
  const recentContacts = Array.isArray(activitySummary.gmail_recent_contacts)
    ? activitySummary.gmail_recent_contacts
    : [];

  recentContacts.forEach(contact => {
    if (contact?.lastInteraction) {
      touchpoints.push({
        occurredAt: contact.lastInteraction,
        type: 'gmail',
        metadata: contact
      });
    }
  });

  if (activitySummary.last_calendar_activity) {
    touchpoints.push({
      occurredAt: activitySummary.last_calendar_activity,
      type: 'calendar'
    });
  }

  if (activitySummary.last_notation_activity) {
    touchpoints.push({
      occurredAt: activitySummary.last_notation_activity,
      type: 'notion'
    });
  }

  return touchpoints;
}
