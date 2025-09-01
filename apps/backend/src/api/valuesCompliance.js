/**
 * Values Compliance API - Real-Time Values Enforcement Endpoints
 * 
 * Provides API endpoints for monitoring and enforcing ACT's locked values framework
 * ensuring every system interaction aligns with community empowerment and
 * beautiful obsolescence by 2027.
 * 
 * Based on: /Docs/Strategy/ACT_LOCKED_VALUES_AND_ACCOUNTABILITY_FRAMEWORK.md
 */

import express from 'express';
import { createSupabaseClient } from '../config/supabase.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { valuesComplianceService, checkValuesCompliance } from '../services/valuesComplianceService.js';

const router = express.Router();

/**
 * Get current values compliance status for the platform
 * GET /api/values-compliance/status
 */
router.get('/status', optionalAuth, asyncHandler(async (req, res) => {
  const supabase = createSupabaseClient();

  // Get overall compliance metrics
  const { data: complianceSummary, error: summaryError } = await supabase
    .from('values_compliance_summary')
    .select('*')
    .order('date', { ascending: false })
    .limit(7); // Last 7 days

  if (summaryError) {
    console.error('Error fetching compliance summary:', summaryError);
  }

  // Get current community control status
  const { data: communityControl, error: controlError } = await supabase
    .from('current_community_control')
    .select('*');

  if (controlError) {
    console.error('Error fetching community control:', controlError);
  }

  // Get recent violations
  const { data: recentViolations, error: violationsError } = await supabase
    .from('values_compliance_log')
    .select('timestamp, violations, severity_level')
    .eq('compliant', false)
    .order('timestamp', { ascending: false })
    .limit(5);

  if (violationsError) {
    console.error('Error fetching recent violations:', violationsError);
  }

  // Get system halt status
  const { data: systemHalts, error: haltError } = await supabase
    .from('system_halts')
    .select('id, reason, timestamp, resolved')
    .eq('resolved', false);

  if (haltError) {
    console.error('Error fetching system halts:', haltError);
  }

  // Calculate beautiful obsolescence progress
  const averageObsolescenceProgress = communityControl?.length > 0 
    ? communityControl.reduce((sum, project) => sum + (project.beautiful_obsolescence_progress || 0), 0) / communityControl.length
    : 0;

  const currentMonth = valuesComplianceService.calculateMonthsSinceLaunch();
  const monthsToObsolescence = Math.max(0, 36 - currentMonth);

  res.json({
    success: true,
    message: '🔒 Values compliance status - enforcing community empowerment',
    timestamp: new Date().toISOString(),
    
    // Overall Health
    platform: {
      status: systemHalts?.length > 0 ? 'SYSTEM_HALT_ACTIVE' : 'OPERATIONAL',
      activeSystemHalts: systemHalts?.length || 0,
      beautifulObsolescenceProgress: Math.round(averageObsolescenceProgress * 100) / 100,
      monthsToObsolescence: monthsToObsolescence,
      onTrackForObsolescence: monthsToObsolescence <= 36 && averageObsolescenceProgress >= (currentMonth / 36) * 100
    },

    // Compliance Metrics (last 7 days)
    compliance: {
      summary: complianceSummary || [],
      averageComplianceRate: complianceSummary?.length > 0 
        ? Math.round((complianceSummary.reduce((sum, day) => sum + parseFloat(day.compliance_rate), 0) / complianceSummary.length) * 100) / 100
        : 100,
      recentViolations: recentViolations || [],
      totalViolationsLast7Days: complianceSummary?.reduce((sum, day) => sum + day.non_compliant_checks, 0) || 0
    },

    // Community Control Progress
    communityControl: {
      projects: communityControl || [],
      averageControlPercentage: communityControl?.length > 0 
        ? Math.round((communityControl.reduce((sum, project) => sum + project.community_control_percentage, 0) / communityControl.length) * 100) / 100
        : 0,
      projectsOnTrack: communityControl?.filter(project => project.status === 'ON_TRACK' || project.status === 'ON_TRACK_FOR_OBSOLESCENCE').length || 0,
      projectsNeedingAttention: communityControl?.filter(project => project.status === 'NEEDS_ATTENTION').length || 0
    },

    // Values Framework Status
    valuesFramework: {
      locked: true,
      lastUpdated: '2025-08-26T06:40:00Z',
      communityConsensusRequired: '75% + Indigenous Advisory Board Unanimous',
      technicalEnforcement: 'ACTIVE',
      realTimeMonitoring: 'ENABLED'
    },

    // Next Actions
    nextActions: systemHalts?.length > 0 
      ? ['RESOLVE_SYSTEM_HALTS', 'COMMUNITY_CONSULTATION', 'INDIGENOUS_ADVISORY_REVIEW']
      : communityControl?.some(project => project.status === 'NEEDS_ATTENTION')
      ? ['INCREASE_COMMUNITY_CONTROL', 'REVIEW_POWER_TRANSFER_TIMELINE']
      : ['CONTINUE_BEAUTIFUL_OBSOLESCENCE_PROGRESS']
  });
}));

/**
 * Get detailed community control metrics for a specific project
 * GET /api/values-compliance/community-control/:projectId
 */
router.get('/community-control/:projectId', requireAuth, asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const supabase = createSupabaseClient();

  const { data: governance, error } = await supabase
    .from('community_governance')
    .select(`
      *,
      projects (name, description)
    `)
    .eq('project_id', projectId)
    .single();

  if (error) {
    return res.status(404).json({
      success: false,
      error: 'PROJECT_NOT_FOUND',
      message: 'Community governance data not found for this project'
    });
  }

  // Calculate required metrics for current timeline
  const currentMonth = valuesComplianceService.calculateMonthsSinceLaunch();
  const requiredControl = valuesComplianceService.getRequiredCommunityControl(currentMonth);

  res.json({
    success: true,
    message: '🏛️ Community control metrics for project',
    project: governance.projects,
    
    // Current Status
    currentStatus: {
      communityControlPercentage: governance.community_control_percentage,
      revenueControlPercentage: governance.revenue_control_percentage,
      decisionVotingWeight: governance.decision_voting_weight,
      assetOwnershipPercentage: governance.asset_ownership_percentage
    },

    // Timeline Compliance
    timelineCompliance: {
      currentMonth: governance.months_since_launch,
      requiredControlPercentage: requiredControl,
      actualControlPercentage: governance.community_control_percentage,
      compliantWithTimeline: governance.compliant_with_timeline,
      beautifulObsolescenceProgress: governance.beautiful_obsolescence_progress,
      monthsToObsolescence: Math.max(0, 36 - governance.months_since_launch)
    },

    // Milestone Progress
    milestones: {
      month6: { achieved: governance.milestone_6_months_achieved, target: '51% community control' },
      month12: { achieved: governance.milestone_12_months_achieved, target: '65% community control' },
      month18: { achieved: governance.milestone_18_months_achieved, target: '75% community control' },
      month24: { achieved: governance.milestone_24_months_achieved, target: '85% community control' },
      month30: { achieved: governance.milestone_30_months_achieved, target: '95% community control' },
      month36: { achieved: governance.milestone_36_months_achieved, target: '100% community control - Beautiful Obsolescence' }
    },

    // Compliance History
    compliance: {
      violationCount: governance.violation_count,
      lastViolationDate: governance.last_violation_date,
      communityVerified: governance.community_verified,
      communityVerificationDate: governance.community_verification_date
    },

    // Next Steps
    nextSteps: governance.compliant_with_timeline 
      ? ['Continue power transfer timeline', 'Maintain community engagement', 'Prepare for next milestone']
      : ['URGENT: Increase community control', 'Community consultation required', 'Review power transfer barriers']
  });
}));

/**
 * Update community control percentage (requires community verification)
 * PUT /api/values-compliance/community-control/:projectId
 */
router.put('/community-control/:projectId', requireAuth, checkValuesCompliance({
  type: 'governance_change',
  description: 'Update community control percentage'
}), asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { 
    communityControlPercentage,
    revenueControlPercentage,
    decisionVotingWeight,
    assetOwnershipPercentage,
    communityVerification,
    verificationNotes
  } = req.body;

  const supabase = createSupabaseClient();

  // Validate community control increase (should never decrease)
  const { data: currentGovernance } = await supabase
    .from('community_governance')
    .select('community_control_percentage, revenue_control_percentage')
    .eq('project_id', projectId)
    .single();

  if (currentGovernance) {
    if (communityControlPercentage < currentGovernance.community_control_percentage) {
      return res.status(400).json({
        success: false,
        error: 'COMMUNITY_CONTROL_DECREASE_FORBIDDEN',
        message: 'Community control percentage cannot decrease - this violates locked values framework',
        currentPercentage: currentGovernance.community_control_percentage,
        attemptedPercentage: communityControlPercentage
      });
    }
  }

  const { data: updatedGovernance, error } = await supabase
    .from('community_governance')
    .update({
      community_control_percentage: communityControlPercentage,
      revenue_control_percentage: revenueControlPercentage,
      decision_voting_weight: decisionVotingWeight,
      asset_ownership_percentage: assetOwnershipPercentage,
      community_verified: communityVerification || false,
      community_verification_date: communityVerification ? new Date().toISOString() : null,
      compliance_notes: verificationNotes,
      updated_by: req.user.id
    })
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'UPDATE_FAILED',
      message: 'Failed to update community control metrics',
      details: error.message
    });
  }

  // Check if this update achieves a new milestone
  const milestoneAchieved = checkMilestoneAchievement(updatedGovernance);
  if (milestoneAchieved) {
    await celebrateMilestone(milestoneAchieved, projectId, req.user.id);
  }

  res.json({
    success: true,
    message: '🎯 Community control metrics updated - power transfer progress recorded',
    governance: updatedGovernance,
    valuesCompliance: req.valuesCompliance,
    milestoneAchieved: milestoneAchieved,
    beautifulObsolescenceProgress: `${updatedGovernance.beautiful_obsolescence_progress}% complete`
  });
}));

/**
 * Get Indigenous Advisory Board approvals status
 * GET /api/values-compliance/indigenous-approvals
 */
router.get('/indigenous-approvals', requireAuth, asyncHandler(async (req, res) => {
  const supabase = createSupabaseClient();

  const { data: approvals, error } = await supabase
    .from('indigenous_advisory_approvals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: 'Could not fetch Indigenous Advisory approvals'
    });
  }

  // Calculate CARE principles compliance stats
  const careStats = approvals.reduce((stats, approval) => {
    if (approval.collective_benefit_validated) stats.collectiveBenefit++;
    if (approval.authority_to_control_confirmed) stats.authorityToControl++;
    if (approval.responsibility_acknowledged) stats.responsibility++;
    if (approval.ethics_reviewed) stats.ethics++;
    return stats;
  }, { collectiveBenefit: 0, authorityToControl: 0, responsibility: 0, ethics: 0 });

  res.json({
    success: true,
    message: '🪃 Indigenous Advisory Board approvals - protecting data sovereignty',
    approvals: approvals,
    
    // CARE Principles Compliance
    careCompliance: {
      total: approvals.length,
      collectiveBenefit: {
        validated: careStats.collectiveBenefit,
        percentage: approvals.length > 0 ? Math.round((careStats.collectiveBenefit / approvals.length) * 100) : 0
      },
      authorityToControl: {
        confirmed: careStats.authorityToControl,
        percentage: approvals.length > 0 ? Math.round((careStats.authorityToControl / approvals.length) * 100) : 0
      },
      responsibility: {
        acknowledged: careStats.responsibility,
        percentage: approvals.length > 0 ? Math.round((careStats.responsibility / approvals.length) * 100) : 0
      },
      ethics: {
        reviewed: careStats.ethics,
        percentage: approvals.length > 0 ? Math.round((careStats.ethics / approvals.length) * 100) : 0
      }
    },

    // Approval Status
    approvalStats: {
      pendingApproval: approvals.filter(a => !a.approved).length,
      approved: approvals.filter(a => a.approved).length,
      unanimousApprovals: approvals.filter(a => a.unanimous_approval).length,
      requiresOngoingConsultation: approvals.filter(a => a.requires_ongoing_consultation).length
    }
  });
}));

/**
 * Submit request for Indigenous Advisory Board approval
 * POST /api/values-compliance/indigenous-approval
 */
router.post('/indigenous-approval', requireAuth, checkValuesCompliance({
  type: 'indigenous_data_request',
  description: 'Request Indigenous Advisory Board approval'
}), asyncHandler(async (req, res) => {
  const {
    contextId,
    contextType,
    contextData,
    culturalSensitivityDescription,
    communityBenefitDescription,
    ongoingConsultationRequired = true
  } = req.body;

  if (!contextId || !contextType || !contextData) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_REQUIRED_FIELDS',
      message: 'contextId, contextType, and contextData are required'
    });
  }

  const supabase = createSupabaseClient();

  const { data: approval, error } = await supabase
    .from('indigenous_advisory_approvals')
    .insert({
      context_id: contextId,
      context_type: contextType,
      context_data: contextData,
      cultural_feedback: culturalSensitivityDescription,
      requires_ongoing_consultation: ongoingConsultationRequired,
      next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'APPROVAL_REQUEST_FAILED',
      message: 'Failed to submit Indigenous Advisory approval request',
      details: error.message
    });
  }

  // Notify Indigenous Advisory Board (in production, this would send notifications)
  console.log('📩 Indigenous Advisory Board notification sent for approval request:', approval.id);

  res.status(201).json({
    success: true,
    message: '🪃 Indigenous Advisory Board approval requested - protecting data sovereignty',
    approval: approval,
    nextSteps: [
      'Indigenous Advisory Board will review within 7 days',
      'CARE principles will be validated',
      'Cultural protocols will be assessed',
      'Community benefit will be confirmed'
    ],
    expectedTimeframe: '7-14 days for initial review',
    valuesCompliance: req.valuesCompliance
  });
}));

/**
 * Get public transparency report
 * GET /api/values-compliance/transparency-report
 */
router.get('/transparency-report', asyncHandler(async (req, res) => {
  const supabase = createSupabaseClient();

  const { data: latestReport, error } = await supabase
    .from('public_transparency_reports')
    .select('*')
    .eq('published', true)
    .order('timestamp', { ascending: false })
    .single();

  if (error || !latestReport) {
    return res.status(404).json({
      success: false,
      error: 'NO_REPORT_AVAILABLE',
      message: 'No public transparency report available'
    });
  }

  res.json({
    success: true,
    message: '📊 Public transparency report - community accountability',
    report: {
      timestamp: latestReport.timestamp,
      reportPeriod: {
        start: latestReport.report_period_start,
        end: latestReport.report_period_end
      },
      
      // Compliance Metrics
      compliance: {
        totalChecks: latestReport.total_compliance_checks,
        complianceRate: latestReport.compliance_rate,
        violationBreakdown: {
          critical: latestReport.critical_violations,
          high: latestReport.high_violations,
          medium: latestReport.medium_violations,
          low: latestReport.low_violations
        }
      },

      // Community Metrics
      community: {
        communitiesAffected: latestReport.communities_affected,
        satisfactionScore: latestReport.community_satisfaction_score,
        averageControlPercentage: latestReport.community_control_average,
        averageRevenueShare: latestReport.revenue_share_average
      },

      // Beautiful Obsolescence Progress
      obsolescence: {
        progressPercentage: latestReport.obsolescence_progress_percentage,
        monthsRemaining: latestReport.months_to_beautiful_obsolescence,
        onTrack: latestReport.months_to_beautiful_obsolescence <= 36
      },

      // Public Summary
      summary: latestReport.public_summary,
      detailedReportUrl: latestReport.detailed_report_url,
      
      // Community Engagement
      communityFeedback: {
        enabled: latestReport.community_comments_enabled,
        feedbackCount: latestReport.community_feedback_count
      }
    },
    
    // Next Report
    nextReport: {
      date: latestReport.next_review_date,
      howToProvideInput: 'Contact your community representative or submit feedback through the community portal'
    }
  });
}));

/**
 * Report a potential values violation
 * POST /api/values-compliance/report-violation
 */
router.post('/report-violation', requireAuth, asyncHandler(async (req, res) => {
  const {
    violationType,
    description,
    evidence,
    affectedCommunities,
    urgency = 'medium',
    anonymous = false
  } = req.body;

  if (!violationType || !description) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_REQUIRED_FIELDS',
      message: 'violationType and description are required'
    });
  }

  // Perform immediate compliance check on the reported violation
  const context = {
    id: `violation-report-${Date.now()}`,
    violationType: violationType,
    description: description,
    evidence: evidence,
    reporter: anonymous ? 'anonymous' : req.user.id,
    affectedCommunities: affectedCommunities
  };

  const complianceResult = await valuesComplianceService.checkValuesCompliance({
    type: 'violation_report',
    urgency: urgency
  }, context);

  res.json({
    success: true,
    message: '🚨 Values violation reported - community protection activated',
    reportId: context.id,
    complianceCheck: complianceResult,
    
    // Response Actions
    immediateActions: complianceResult.compliant 
      ? ['Report logged for review', 'Community notifications sent', 'Transparency report updated']
      : ['URGENT: Compliance violation confirmed', 'System halt triggered if critical', 'Indigenous Advisory Board notified if relevant', 'Community emergency response activated'],
    
    // Timeline
    responseTimeline: {
      acknowledgment: 'Immediate',
      initialReview: '24 hours',
      communityConsultation: '48-72 hours',
      resolution: urgency === 'critical' ? '24-48 hours' : '5-10 days'
    },

    // Transparency
    publiclyTracked: !anonymous,
    communityNotificationSent: true,
    auditTrailCreated: true
  });
}));

/**
 * Helper function to check milestone achievement
 */
function checkMilestoneAchievement(governance) {
  const currentMonth = governance.months_since_launch;
  const controlPercentage = governance.community_control_percentage;

  if (currentMonth >= 36 && controlPercentage >= 100 && !governance.milestone_36_months_achieved) {
    return { milestone: '36_months', message: '🌟 BEAUTIFUL OBSOLESCENCE ACHIEVED! Communities have full control.' };
  }
  if (currentMonth >= 30 && controlPercentage >= 95 && !governance.milestone_30_months_achieved) {
    return { milestone: '30_months', message: '🎯 95% Community Control Achieved! Approaching beautiful obsolescence.' };
  }
  if (currentMonth >= 24 && controlPercentage >= 85 && !governance.milestone_24_months_achieved) {
    return { milestone: '24_months', message: '🚀 85% Community Control Achieved! Power transfer accelerating.' };
  }
  if (currentMonth >= 18 && controlPercentage >= 75 && !governance.milestone_18_months_achieved) {
    return { milestone: '18_months', message: '💪 75% Community Control Achieved! Communities leading strongly.' };
  }
  if (currentMonth >= 12 && controlPercentage >= 65 && !governance.milestone_12_months_achieved) {
    return { milestone: '12_months', message: '🌱 65% Community Control Achieved! Power transfer progressing well.' };
  }
  if (currentMonth >= 6 && controlPercentage >= 51 && !governance.milestone_6_months_achieved) {
    return { milestone: '6_months', message: '🎉 Majority Community Control Achieved! Communities now lead decisions.' };
  }

  return null;
}

/**
 * Helper function to celebrate milestone achievement
 */
async function celebrateMilestone(milestone, projectId, userId) {
  const supabase = createSupabaseClient();

  // Log the milestone achievement
  await supabase
    .from('community_notifications')
    .insert({
      notification_type: 'milestone_achievement',
      severity: 'high',
      title: milestone.message,
      content: {
        milestone: milestone.milestone,
        projectId: projectId,
        achievementDate: new Date().toISOString(),
        celebrationMessage: milestone.message
      },
      created_by: userId
    });

  console.log(`🎉 MILESTONE ACHIEVED: ${milestone.message} for project ${projectId}`);
}

export default router;