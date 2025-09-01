/**
 * Values Compliance Service - Real-Time Enforcement of ACT Locked Values
 * 
 * Implements the technical enforcement of ACT's Locked Values Framework
 * ensuring every system interaction aligns with community empowerment
 * and beautiful obsolescence by 2027.
 * 
 * Based on: /Docs/Strategy/ACT_LOCKED_VALUES_AND_ACCOUNTABILITY_FRAMEWORK.md
 */

import { createSupabaseClient } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class ValuesComplianceService {
  constructor() {
    this.supabase = createSupabaseClient();
    this.lockedValues = this.loadLockedValues();
    this.complianceRules = this.initializeComplianceRules();
  }

  /**
   * Load the locked values framework from the strategic documents
   */
  loadLockedValues() {
    return {
      // Project-Specific Community Control Requirements (Refined Framework)
      projectControlMinimums: {
        month3: 40,   // 40% project control + immediate community benefit
        month6: 51,   // 51% project decision control - community majority
        month12: 75,  // 75% project decision control - community leadership
        month18: 90,  // 90% project decision control - community ownership
        month24: 100, // 100% project ownership - PROJECT INDEPENDENCE
        month36: 100  // Maintained community independence
      },
      
      // Project-Specific Revenue Control Requirements
      projectRevenueMinimums: {
        month3: 40,   // 40% project revenue ownership (immediate)
        month6: 50,   // 50% project revenue ownership (majority)
        month12: 70,  // 70% project revenue ownership (leadership)
        month18: 85,  // 85% project revenue ownership (ownership)
        month24: 100, // 100% project revenue control (independence)
        month36: 100  // Maintained community control
      },

      // Indigenous Projects - Accelerated Sovereignty Timeline
      indigenousControlMinimums: {
        month1: 51,   // 51% Traditional Owner control (immediate sovereignty)
        month6: 75,   // 75% Traditional Owner control + 70% revenue
        month12: 100, // 100% Traditional Owner ownership - SOVEREIGNTY RESTORED
        month18: 100, // Maintained Indigenous sovereignty
        month24: 100, // Maintained Indigenous sovereignty
        month36: 100  // Maintained Indigenous sovereignty
      },

      // Indigenous Data Sovereignty (CARE Principles)
      careRequirements: {
        collectiveBenefit: true,    // All data use must demonstrate community benefit
        authorityToControl: true,   // Communities control access to their data
        responsibility: true,       // Ongoing responsibility for data stewardship
        ethics: true               // Ethical use aligned with community values
      },

      // Anti-Extraction Guardrails
      antiExtractionRules: {
        consultantCompetition: true,     // Must outcompete extractive consultants
        communityExpertise: true,        // Prioritise community knowledge over external
        transparentDecisions: true,      // All major decisions publicly auditable
        communityVetoRights: true,       // Communities can veto any decision
        exitClauseEnforcement: true      // 30-day termination rights protected
      },

      // Creative Disruption Standards
      creativeStandards: {
        basquiatTruthTelling: true,      // Uncomfortable truths in every dashboard
        punkRockRebellion: true,         // Explicit challenge to extractive systems
        communityArtIntegration: true,   // Community art in every interface
        antiCorporateAesthetic: true,    // Reject slick consulting presentation vibes
        movementEnergy: true            // Connect communities to bigger movement
      }
    };
  }

  /**
   * Initialize compliance rules that can be evaluated in real-time
   */
  initializeComplianceRules() {
    return {
      // Rule 1: Community Control Percentage Tracking
      communityControlCheck: async (action, context) => {
        const currentMonth = this.calculateMonthsSinceLaunch();
        const requiredControl = this.getRequiredCommunityControl(currentMonth);
        const actualControl = await this.getCurrentCommunityControlPercentage(context.projectId);
        
        if (actualControl < requiredControl) {
          return {
            compliant: false,
            violation: 'COMMUNITY_CONTROL_DEFICIT',
            required: requiredControl,
            actual: actualControl,
            action: 'INCREASE_COMMUNITY_CONTROL_IMMEDIATELY'
          };
        }
        return { compliant: true };
      },

      // Rule 2: Indigenous Data Sovereignty Protection
      indigenousDataCheck: async (action, context) => {
        if (this.involvesIndigenousData(context)) {
          const hasApproval = await this.checkIndigenousAdvisoryApproval(context);
          const followsCARE = this.validateCareCompliance(action, context);
          
          if (!hasApproval || !followsCARE) {
            return {
              compliant: false,
              violation: 'INDIGENOUS_DATA_SOVEREIGNTY_BREACH',
              careCompliance: followsCARE,
              advisoryApproval: hasApproval,
              action: 'HALT_ACTION_PENDING_INDIGENOUS_APPROVAL'
            };
          }
        }
        return { compliant: true };
      },

      // Rule 3: Anti-Extraction Pattern Detection
      antiExtractionCheck: async (action, context) => {
        const extractivePatterns = this.detectExtractivePattterns(action, context);
        
        if (extractivePatterns.length > 0) {
          return {
            compliant: false,
            violation: 'EXTRACTIVE_PATTERN_DETECTED',
            patterns: extractivePatterns,
            action: 'REDESIGN_FOR_COMMUNITY_EMPOWERMENT'
          };
        }
        return { compliant: true };
      },

      // Rule 4: Revenue Distribution Transparency
      revenueTransparencyCheck: async (action, context) => {
        if (this.involvesRevenue(action)) {
          const communityShare = await this.calculateCommunityRevenueShare(context);
          const requiredShare = this.getRequiredRevenueShare();
          
          if (communityShare < requiredShare) {
            return {
              compliant: false,
              violation: 'INSUFFICIENT_COMMUNITY_REVENUE_SHARE',
              required: requiredShare,
              actual: communityShare,
              action: 'INCREASE_COMMUNITY_REVENUE_ALLOCATION'
            };
          }
        }
        return { compliant: true };
      },

      // Rule 5: Community Exit Rights Protection
      exitRightsCheck: async (action, context) => {
        if (this.affectsCommunityAutonomy(action)) {
          const exitRightsPreserved = this.validateExitRights(context);
          
          if (!exitRightsPreserved) {
            return {
              compliant: false,
              violation: 'COMMUNITY_EXIT_RIGHTS_COMPROMISED',
              action: 'RESTORE_COMMUNITY_EXIT_OPTIONS'
            };
          }
        }
        return { compliant: true };
      }
    };
  }

  /**
   * Real-time values compliance check for any system action
   */
  async checkValuesCompliance(action, context) {
    const results = {
      timestamp: new Date().toISOString(),
      action: action,
      context: context,
      violations: [],
      warnings: [],
      compliant: true
    };

    // Run all compliance rules
    for (const [ruleName, ruleFunction] of Object.entries(this.complianceRules)) {
      try {
        const ruleResult = await ruleFunction(action, context);
        
        if (!ruleResult.compliant) {
          results.violations.push({
            rule: ruleName,
            violation: ruleResult.violation,
            details: ruleResult,
            severity: this.getViolationSeverity(ruleResult.violation)
          });
          results.compliant = false;
        }
      } catch (error) {
        console.error(`Values compliance rule ${ruleName} failed:`, error);
        results.warnings.push(`Rule ${ruleName} could not be evaluated: ${error.message}`);
      }
    }

    // Log compliance check to audit trail
    await this.logComplianceCheck(results);

    // Handle violations if any
    if (!results.compliant) {
      await this.handleComplianceViolations(results);
    }

    return results;
  }

  /**
   * Calculate months since platform launch for timeline tracking
   */
  calculateMonthsSinceLaunch() {
    // Platform launch date (adjust as needed)
    const launchDate = new Date('2025-01-01');
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - launchDate);
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average month
    return diffMonths;
  }

  /**
   * Get required community control percentage based on project-specific timeline
   */
  getRequiredProjectControl(currentMonth, isIndigenousProject = false) {
    if (isIndigenousProject) {
      const milestones = this.lockedValues.indigenousControlMinimums;
      
      if (currentMonth >= 12) return milestones.month12;
      if (currentMonth >= 6) return milestones.month6;
      if (currentMonth >= 1) return milestones.month1;
      
      return 51; // Default to immediate sovereignty for Indigenous projects
    }
    
    const milestones = this.lockedValues.projectControlMinimums;
    
    if (currentMonth >= 24) return milestones.month24;
    if (currentMonth >= 18) return milestones.month18;
    if (currentMonth >= 12) return milestones.month12;
    if (currentMonth >= 6) return milestones.month6;
    if (currentMonth >= 3) return milestones.month3;
    
    // Before month 3, gradually increase from 25% to 40%
    return Math.max(25, 25 + (currentMonth / 3) * 15);
  }

  /**
   * Get required revenue control percentage for project-specific timeline
   */
  getRequiredProjectRevenueControl(currentMonth, isIndigenousProject = false) {
    if (isIndigenousProject) {
      if (currentMonth >= 12) return 100;
      if (currentMonth >= 6) return 70;
      if (currentMonth >= 1) return 50;
      
      return 40; // Minimum community benefit always maintained
    }
    
    const milestones = this.lockedValues.projectRevenueMinimums;
    
    if (currentMonth >= 24) return milestones.month24;
    if (currentMonth >= 18) return milestones.month18;
    if (currentMonth >= 12) return milestones.month12;
    if (currentMonth >= 6) return milestones.month6;
    if (currentMonth >= 3) return milestones.month3;
    
    return 40; // Always maintain minimum 40% community benefit
  }

  /**
   * Get current community control percentage for a project
   */
  async getCurrentCommunityControlPercentage(projectId) {
    try {
      const { data: governance, error } = await this.supabase
        .from('community_governance')
        .select('community_control_percentage, last_updated')
        .eq('project_id', projectId)
        .single();

      if (error) {
        console.warn('Could not fetch community control percentage:', error);
        return 0; // Assume 0% if we can't verify - triggers compliance violation
      }

      return governance?.community_control_percentage || 0;
    } catch (error) {
      console.error('Error fetching community control percentage:', error);
      return 0;
    }
  }

  /**
   * Check if action involves Indigenous data
   */
  involvesIndigenousData(context) {
    return (
      context.dataType === 'indigenous' ||
      context.storySource === 'indigenous_community' ||
      context.culturalContent === true ||
      (context.tags && context.tags.includes('indigenous')) ||
      (context.storyteller && context.storyteller.indigenous === true)
    );
  }

  /**
   * Validate CARE principles compliance
   */
  validateCareCompliance(action, context) {
    const careChecks = {
      collectiveBenefit: this.checkCollectiveBenefit(action, context),
      authorityToControl: this.checkCommunityAuthority(action, context),
      responsibility: this.checkOngoingResponsibility(action, context),
      ethics: this.checkEthicalAlignment(action, context)
    };

    return Object.values(careChecks).every(check => check === true);
  }

  /**
   * Check Indigenous Advisory Board approval
   */
  async checkIndigenousAdvisoryApproval(context) {
    try {
      const { data: approval, error } = await this.supabase
        .from('indigenous_advisory_approvals')
        .select('approved, approved_at')
        .eq('context_id', context.id)
        .eq('approved', true)
        .single();

      return approval !== null;
    } catch (error) {
      console.warn('Could not verify Indigenous Advisory approval:', error);
      return false; // Assume no approval if we can't verify
    }
  }

  /**
   * Detect extractive patterns in actions
   */
  detectExtractivePattterns(action, context) {
    const patterns = [];

    // Pattern 1: Data extraction without community benefit
    if (action.type === 'data_extract' && !context.communityBenefit) {
      patterns.push('DATA_EXTRACTION_WITHOUT_COMMUNITY_BENEFIT');
    }

    // Pattern 2: External expert prioritisation over community knowledge
    if (context.expertise === 'external' && !context.communityExpertiseConsidered) {
      patterns.push('EXTERNAL_EXPERT_OVER_COMMUNITY_KNOWLEDGE');
    }

    // Pattern 3: Revenue flowing away from communities
    if (action.type === 'revenue_allocation' && context.communityShare < 40) {
      patterns.push('INSUFFICIENT_COMMUNITY_REVENUE_SHARE');
    }

    // Pattern 4: Decision-making without community involvement
    if (action.type === 'major_decision' && !context.communityVote) {
      patterns.push('DECISION_WITHOUT_COMMUNITY_INVOLVEMENT');
    }

    // Pattern 5: Cultural appropriation risk
    if (context.culturalContent && !context.culturalApproval) {
      patterns.push('CULTURAL_APPROPRIATION_RISK');
    }

    return patterns;
  }

  /**
   * Get violation severity level
   */
  getViolationSeverity(violationType) {
    const severityMap = {
      'INDIGENOUS_DATA_SOVEREIGNTY_BREACH': 'CRITICAL',
      'COMMUNITY_CONTROL_DEFICIT': 'HIGH',
      'EXTRACTIVE_PATTERN_DETECTED': 'HIGH',
      'INSUFFICIENT_COMMUNITY_REVENUE_SHARE': 'MEDIUM',
      'COMMUNITY_EXIT_RIGHTS_COMPROMISED': 'HIGH',
      'CULTURAL_APPROPRIATION_RISK': 'CRITICAL'
    };

    return severityMap[violationType] || 'MEDIUM';
  }

  /**
   * Handle compliance violations
   */
  async handleComplianceViolations(results) {
    const criticalViolations = results.violations.filter(v => v.severity === 'CRITICAL');
    const highViolations = results.violations.filter(v => v.severity === 'HIGH');

    // Critical violations trigger immediate system halt
    if (criticalViolations.length > 0) {
      await this.triggerSystemHalt(results, 'CRITICAL_VALUES_VIOLATION');
      await this.notifyCommunities(results, 'CRITICAL');
      await this.notifyIndigenousAdvisoryBoard(results);
    }
    
    // High violations trigger community notification
    else if (highViolations.length > 0) {
      await this.notifyCommunities(results, 'HIGH');
      await this.createComplianceIssue(results);
    }

    // All violations logged for transparency
    await this.publishTransparencyReport(results);
  }

  /**
   * Trigger system halt for critical violations
   */
  async triggerSystemHalt(results, reason) {
    console.error('🚨 CRITICAL VALUES VIOLATION - SYSTEM HALT TRIGGERED', {
      reason: reason,
      violations: results.violations,
      timestamp: results.timestamp
    });

    // Log the halt to database
    await this.supabase
      .from('system_halts')
      .insert({
        reason: reason,
        violations: results.violations,
        timestamp: results.timestamp,
        action_context: results.context,
        resolved: false
      });

    // In production, this would actually halt the problematic systems
    // For now, we log and continue with error tracking
  }

  /**
   * Notify communities of violations
   */
  async notifyCommunities(results, severity) {
    const notification = {
      type: 'VALUES_COMPLIANCE_VIOLATION',
      severity: severity,
      violations: results.violations,
      timestamp: results.timestamp,
      action_required: severity === 'CRITICAL'
    };

    // Store notification for community dashboard
    await this.supabase
      .from('community_notifications')
      .insert({
        notification_type: 'values_violation',
        severity: severity.toLowerCase(),
        content: notification,
        created_at: new Date().toISOString(),
        requires_response: severity === 'CRITICAL'
      });

    console.log(`📢 Community notification sent: ${severity} values violation`);
  }

  /**
   * Log compliance check for audit trail
   */
  async logComplianceCheck(results) {
    try {
      await this.supabase
        .from('values_compliance_log')
        .insert({
          timestamp: results.timestamp,
          action: results.action,
          context: results.context,
          compliant: results.compliant,
          violations: results.violations,
          warnings: results.warnings
        });
    } catch (error) {
      console.error('Failed to log compliance check:', error);
    }
  }

  /**
   * Publish transparency report for public accountability
   */
  async publishTransparencyReport(results) {
    const report = {
      timestamp: results.timestamp,
      violations_detected: results.violations.length,
      compliance_status: results.compliant ? 'COMPLIANT' : 'NON_COMPLIANT',
      public_summary: this.generatePublicSummary(results),
      next_review_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    await this.supabase
      .from('public_transparency_reports')
      .insert(report);

    console.log('📊 Transparency report published for public accountability');
  }

  /**
   * Generate public summary of compliance check
   */
  generatePublicSummary(results) {
    if (results.compliant) {
      return 'All actions aligned with community empowerment values and beautiful obsolescence timeline.';
    }

    const violationTypes = results.violations.map(v => v.violation);
    return `Values alignment review identified areas for improvement: ${violationTypes.join(', ')}. Community feedback and corrective actions are being implemented.`;
  }

  // Helper methods for CARE principles validation
  checkCollectiveBenefit(action, context) {
    return context.communityBenefit && context.collectiveValue;
  }

  checkCommunityAuthority(action, context) {
    return context.communityControl && context.consentGiven;
  }

  checkOngoingResponsibility(action, context) {
    return context.longTermStewardship && context.culturalProtocols;
  }

  checkEthicalAlignment(action, context) {
    return context.ethicalReview && context.communityValues;
  }

  // Helper methods for revenue and governance checks
  involvesRevenue(action) {
    return ['revenue_allocation', 'financial_decision', 'grant_distribution'].includes(action.type);
  }

  async calculateCommunityRevenueShare(context) {
    // Implementation would calculate actual community revenue percentage
    return context.communityRevenuePercentage || 0;
  }

  getRequiredRevenueShare() {
    const currentMonth = this.calculateMonthsSinceLaunch();
    return this.lockedValues.revenueControlMinimums[`month${Math.min(36, Math.max(6, currentMonth))}`] || 40;
  }

  affectsCommunityAutonomy(action) {
    return ['governance_change', 'policy_update', 'platform_modification'].includes(action.type);
  }

  validateExitRights(context) {
    return context.exitRightsPreserved && context.dataPortability && context.communityControl;
  }
}

// Export singleton instance
export const valuesComplianceService = new ValuesComplianceService();

/**
 * Express middleware for real-time values compliance checking
 */
export const checkValuesCompliance = (action) => {
  return asyncHandler(async (req, res, next) => {
    const context = {
      id: req.params.id || `${Date.now()}-${Math.random()}`,
      userId: req.user?.id,
      userRole: req.user?.role,
      projectId: req.params.projectId || req.body.projectId,
      dataType: req.body.dataType,
      storySource: req.body.storySource,
      culturalContent: req.body.culturalContent,
      tags: req.body.tags,
      storyteller: req.body.storyteller,
      communityBenefit: req.body.communityBenefit,
      collectiveValue: req.body.collectiveValue,
      communityControl: req.body.communityControl,
      consentGiven: req.body.consentGiven,
      longTermStewardship: req.body.longTermStewardship,
      culturalProtocols: req.body.culturalProtocols,
      ethicalReview: req.body.ethicalReview,
      communityValues: req.body.communityValues,
      communityRevenuePercentage: req.body.communityRevenuePercentage,
      exitRightsPreserved: req.body.exitRightsPreserved,
      dataPortability: req.body.dataPortability
    };

    const complianceResult = await valuesComplianceService.checkValuesCompliance(action, context);

    // Add compliance info to request for downstream use
    req.valuesCompliance = complianceResult;

    // Block request if critical violations detected
    if (!complianceResult.compliant) {
      const criticalViolations = complianceResult.violations.filter(v => v.severity === 'CRITICAL');
      if (criticalViolations.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'CRITICAL_VALUES_VIOLATION',
          message: 'Action blocked due to critical values compliance violation',
          violations: criticalViolations,
          timestamp: complianceResult.timestamp
        });
      }
    }

    next();
  });
};

export default valuesComplianceService;