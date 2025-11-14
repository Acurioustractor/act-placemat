/**
 * Project Health Rating Service
 * Advanced algorithms to determine project health and time allocation
 * 
 * Features:
 * - Multi-factor health scoring
 * - Time allocation suggestions  
 * - People interaction tracking
 * - AI-powered recommendations
 */

import notionService from './notionService.js';
import projectActivityService from './projectActivityService.js';
import { logger } from '../utils/logger.js';

export class ProjectHealthService {
  constructor() {
    this.healthFactors = {
      timeAllocation: 0.22,      // How much time being spent vs needed
      milestoneProgress: 0.20,   // Progress against milestones  
      stakeholderEngagement: 0.15, // Communication with key people
      budgetHealth: 0.12,        // Financial health
      momentum: 0.08,            // Recent activity and energy
      communitySupport: 0.10,    // Partner count and supporters
      fundingStability: 0.08,    // Ratio of actual vs potential funding
      projectMaturity: 0.05     // How well-developed the project is
    };

    this.healthCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes

    logger.info('🎯 Project Health Service initialized');
  }

  /**
   * Calculate comprehensive health score for all projects
   */
  async calculateAllProjectHealth() {
    logger.info('🏥 Starting calculateAllProjectHealth - fresh calculation!');
    try {
      const projects = await notionService.getProjects(false); // Get fresh data
      logger.info(`📋 Found ${projects.length} projects for health calculation`);
      const healthScores = [];

      for (const project of projects) {
        const healthData = await this.calculateProjectHealth(project);
        healthScores.push({
          ...project,
          healthData
        });
      }

      // Sort by health score (worst first - need attention!)
      return healthScores.sort((a, b) => a.healthData.overallScore - b.healthData.overallScore);

    } catch (error) {
      logger.error('Failed to calculate project health:', error);
      return [];
    }
  }

  /**
   * Calculate detailed health metrics for a single project
   */
  async calculateProjectHealth(project) {
    logger.debug(`💊 Calculating health for project: ${project.name}`);
    
    // Skip cache for debugging - always recalculate
    // const cacheKey = `health_${project.id}_${Date.now()}`;
    // if (this.healthCache.has(cacheKey)) {
    //   return this.healthCache.get(cacheKey);
    // }

    const activitySummary = await projectActivityService.getActivitySummary(
      project.supabaseProjectId || project.id
    );

    const healthMetrics = {
      timeAllocation: await this.calculateTimeAllocationHealth(project),
      milestoneProgress: this.calculateMilestoneHealth(project),
      stakeholderEngagement: await this.calculateStakeholderHealth(project),
      budgetHealth: this.calculateBudgetHealth(project),
      momentum: this.calculateMomentumHealth(project),
      communitySupport: this.calculateCommunitySupport(project),
      fundingStability: this.calculateFundingStability(project),
      projectMaturity: this.calculateProjectMaturity(project)
    };

    // Calculate weighted overall score
    const rawOverallScore = Object.entries(healthMetrics).reduce((score, [factor, value]) => {
      return score + (value.score * this.healthFactors[factor]);
    }, 0);
    const roundedOverallScore = Math.round(rawOverallScore);

    const healthData = {
      overallScore: roundedOverallScore,
      healthLevel: this.getHealthLevel(roundedOverallScore),
      metrics: healthMetrics,
      recommendations: this.generateRecommendations(healthMetrics, project),
      suggestedTimeToday: this.calculateSuggestedTime(healthMetrics, project),
      keyPeopleToContact: await this.getKeyPeopleToContact(project),
      urgencyFlag: this.calculateIntelligentUrgency(healthMetrics, project, roundedOverallScore, rawOverallScore),
      activity: activitySummary || null
    };

    // Skip caching for debugging
    // this.healthCache.set(cacheKey, healthData);
    // setTimeout(() => this.healthCache.delete(cacheKey), this.cacheTimeout);

    return healthData;
  }

  /**
   * Time Allocation Health - Are we spending enough time?
   */
  async calculateTimeAllocationHealth(project) {
    // Mock calculation - in real system would integrate with calendar/time tracking
    const estimatedHoursNeeded = this.estimateHoursNeeded(project);
    const actualHoursSpent = this.getRecentTimeSpent(project); // Would integrate with calendar
    const allocationRatio = actualHoursSpent / estimatedHoursNeeded;

    let score = 100;
    let status = 'optimal';
    let recommendation = '';

    if (allocationRatio < 0.5) {
      score = 20;
      status = 'critically_low';
      recommendation = `Needs ${estimatedHoursNeeded - actualHoursSpent} more hours this week`;
    } else if (allocationRatio < 0.8) {
      score = 50;
      status = 'below_target';
      recommendation = `Could use ${Math.ceil((estimatedHoursNeeded - actualHoursSpent) * 0.7)} more hours`;
    } else if (allocationRatio > 1.3) {
      score = 70;
      status = 'over_allocated';
      recommendation = 'Consider reducing time or increasing scope';
    }

    return {
      score,
      status,
      recommendation,
      hoursNeeded: estimatedHoursNeeded,
      hoursSpent: actualHoursSpent,
      allocationRatio
    };
  }

  /**
   * Milestone Progress Health - Are we hitting our targets?
   */
  calculateMilestoneHealth(project) {
    const nextMilestone = project.nextMilestoneDate;
    const now = new Date();
    
    let score = 75; // Default if no milestone data
    let status = 'on_track';
    let recommendation = 'Continue current pace';
    let daysToMilestone = null;
    let daysOverdue = null;

    if (nextMilestone) {
      daysToMilestone = Math.ceil((new Date(nextMilestone) - now) / (1000 * 60 * 60 * 24));
      
      if (daysToMilestone < 0) {
        score = 10;
        status = 'overdue';
        daysOverdue = Math.abs(daysToMilestone);
        recommendation = `Milestone ${daysOverdue} days overdue - urgent action needed`;
      } else if (daysToMilestone < 7) {
        score = 40;
        status = 'at_risk';
        recommendation = `Milestone due in ${daysToMilestone} days - prioritize this project`;
      } else if (daysToMilestone < 30) {
        score = 80;
        status = 'on_track';
        recommendation = `${daysToMilestone} days to milestone - maintain focus`;
      }
    }

    return {
      score,
      status,
      recommendation,
      nextMilestone,
      daysToMilestone,
      daysOverdue
    };
  }

  /**
   * Stakeholder Engagement Health - Are we communicating enough?
   */
  async calculateStakeholderHealth(project) {
    // Mock calculation - would integrate with email/communication tracking
    const keyPeople = await this.getProjectStakeholders(project);
    const recentCommunications = await this.getRecentCommunications(project);
    
    const communicationScore = Math.min(100, recentCommunications.length * 20);
    let status = 'good';
    let recommendation = 'Keep up the communication';

    if (communicationScore < 40) {
      status = 'poor';
      recommendation = `Reach out to ${keyPeople.slice(0, 2).map(p => p.name).join(', ')}`;
    } else if (communicationScore < 70) {
      status = 'moderate';
      recommendation = 'Schedule check-ins with key stakeholders';
    }

    return {
      score: communicationScore,
      status,
      recommendation,
      keyPeople: keyPeople.slice(0, 3), // Top 3 people to contact
      lastCommunication: recentCommunications[0] || null
    };
  }

  /**
   * Budget Health - Financial status
   */
  calculateBudgetHealth(project) {
    const actualIncoming = project.actualIncoming || 0;
    const potentialIncoming = project.potentialIncoming || 0;
    const totalBudget = actualIncoming + potentialIncoming;

    let score = 50; // Default
    let status = 'unknown';
    let recommendation = 'Review budget allocation';

    if (actualIncoming > 0) {
      const fundingRatio = actualIncoming / (actualIncoming + potentialIncoming);
      
      if (fundingRatio > 0.8) {
        score = 95;
        status = 'excellent';
        recommendation = 'Strong financial position';
      } else if (fundingRatio > 0.5) {
        score = 75;
        status = 'good';
        recommendation = 'Secure funding is solid';
      } else {
        score = 45;
        status = 'at_risk';
        recommendation = 'Focus on securing additional funding';
      }
    } else if (potentialIncoming > 0) {
      score = 30;
      status = 'potential_only';
      recommendation = 'Convert potential funding to actual';
    }

    return {
      score,
      status,
      recommendation,
      actualIncoming,
      potentialIncoming,
      totalBudget
    };
  }

  /**
   * Momentum Health - Recent activity and energy
   */
  calculateMomentumHealth(project) {
    // Mock calculation based on status and themes
    const statusMomentum = {
      'Active 🔥': 90,
      'Preparation 📋': 70,
      'Ideation 🌀': 60,
      'On Hold ⏸️': 20,
      'Completed ✅': 100
    };

    const baseScore = statusMomentum[project.status] || 50;
    
    // Boost for certain themes that indicate high energy
    const highEnergyThemes = ['Technology', 'Innovation', 'Health and wellbeing'];
    const hasHighEnergyTheme = project.themes?.some(theme => 
      highEnergyThemes.includes(theme)
    );

    const score = hasHighEnergyTheme ? Math.min(100, baseScore + 10) : baseScore;

    return {
      score,
      status: score > 80 ? 'high' : score > 50 ? 'moderate' : 'low',
      recommendation: score < 50 ? 'Consider reinvigorating this project' : 'Good momentum',
      factors: {
        projectStatus: project.status,
        hasHighEnergyTheme,
        themes: project.themes || []
      }
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(metrics, project) {
    const recommendations = [];

    // Time allocation recommendations
    if (metrics.timeAllocation.score < 60) {
      recommendations.push({
        type: 'time',
        priority: 'high',
        action: metrics.timeAllocation.recommendation,
        emoji: '⏰'
      });
    }

    // Milestone recommendations
    if (metrics.milestoneProgress.score < 50) {
      recommendations.push({
        type: 'milestone',
        priority: 'high',
        action: metrics.milestoneProgress.recommendation,
        emoji: '🎯'
      });
    }

    // Stakeholder recommendations
    if (metrics.stakeholderEngagement.score < 60) {
      recommendations.push({
        type: 'communication',
        priority: 'medium',
        action: metrics.stakeholderEngagement.recommendation,
        emoji: '💬'
      });
    }

    // Budget recommendations
    if (metrics.budgetHealth.score < 50) {
      recommendations.push({
        type: 'budget',
        priority: 'medium',
        action: metrics.budgetHealth.recommendation,
        emoji: '💰'
      });
    }

    return recommendations.slice(0, 3); // Top 3 recommendations
  }

  /**
   * Calculate suggested time to spend today
   */
  calculateSuggestedTime(metrics, project) {
    const baseTime = 2; // Default 2 hours
    
    // Adjust based on health factors
    let suggestedTime = baseTime;
    
    if (metrics.timeAllocation.score < 50) {
      suggestedTime += 2; // Add extra time for struggling projects
    }
    
    const daysToMilestone = metrics.milestoneProgress?.daysToMilestone;
    if (typeof daysToMilestone === 'number' && daysToMilestone >= 0 && daysToMilestone < 7) {
      suggestedTime += 1; // Extra hour for approaching milestones
    }

    if (metrics.momentum.score > 80) {
      suggestedTime += 0.5; // Ride the momentum
    }

    return {
      hours: Math.min(8, suggestedTime), // Cap at 8 hours
      priority: metrics.timeAllocation.score < 50 ? 'high' : 'medium',
      reason: this.getTimeAllocationReason(metrics)
    };
  }

  /**
   * Get key people to contact for this project
   */
  async getKeyPeopleToContact(project) {
    // Mock implementation - would integrate with actual people data
    const mockPeople = [
      { name: 'Sarah Thompson', role: 'Project Lead', lastContact: '2 days ago', urgency: 'high' },
      { name: 'Marcus Chen', role: 'Community Partner', lastContact: '1 week ago', urgency: 'medium' },
      { name: 'Emily Watson', role: 'Technical Lead', lastContact: '3 days ago', urgency: 'medium' }
    ];

    return mockPeople.filter(() => Math.random() > 0.5).slice(0, 2);
  }

  /**
   * Community Support Health - Partner count and supporter engagement
   */
  calculateCommunitySupport(project) {
    let score = 50; // Default if no data
    let status = 'moderate';
    let recommendation = 'Build community connections';
    
    const partnerCount = project.partnerCount || 0;
    const supporters = project.supporters || 0;
    const totalCommunity = partnerCount + supporters;
    
    // Score based on community size and engagement
    if (totalCommunity >= 20) {
      score = 95;
      status = 'excellent';
      recommendation = 'Strong community engagement - leverage for growth';
    } else if (totalCommunity >= 10) {
      score = 80;
      status = 'good'; 
      recommendation = 'Good community base - consider expansion strategies';
    } else if (totalCommunity >= 5) {
      score = 60;
      status = 'moderate';
      recommendation = 'Growing community - focus on engagement quality';
    } else if (totalCommunity >= 2) {
      score = 40;
      status = 'building';
      recommendation = 'Early stage community - invest in relationship building';
    } else {
      score = 20;
      status = 'minimal';
      recommendation = 'Focus on identifying and engaging key partners';
    }
    
    return {
      score,
      status,
      recommendation,
      partnerCount,
      supporters,
      totalCommunity,
      communityStrength: this.categorizeCommunityStrength(totalCommunity)
    };
  }
  
  /**
   * Funding Stability Health - Ratio of actual vs potential funding
   */
  calculateFundingStability(project) {
    const actualIncoming = project.actualIncoming || 0;
    const potentialIncoming = project.potentialIncoming || 0;
    const totalPossible = actualIncoming + potentialIncoming;
    
    let score = 50;
    let status = 'uncertain';
    let recommendation = 'Secure funding sources';
    
    if (totalPossible === 0) {
      score = 30;
      status = 'unfunded';
      recommendation = 'Identify and pursue funding opportunities';
    } else {
      const stabilityRatio = actualIncoming / totalPossible;
      
      if (stabilityRatio >= 0.8) {
        score = 95;
        status = 'highly_stable';
        recommendation = 'Excellent funding stability - plan for growth';
      } else if (stabilityRatio >= 0.6) {
        score = 80;
        status = 'stable';
        recommendation = 'Good funding base - secure remaining commitments';
      } else if (stabilityRatio >= 0.4) {
        score = 65;
        status = 'moderate';
        recommendation = 'Mixed funding - focus on converting potential to actual';
      } else if (stabilityRatio >= 0.2) {
        score = 45;
        status = 'at_risk';
        recommendation = 'High funding uncertainty - prioritize fundraising';
      } else if (stabilityRatio > 0) {
        score = 25;
        status = 'unstable';
        recommendation = 'Mostly potential funding - urgent fundraising needed';
      }
    }
    
    return {
      score,
      status,
      recommendation,
      actualIncoming,
      potentialIncoming,
      totalPossible,
      stabilityRatio: totalPossible > 0 ? actualIncoming / totalPossible : 0,
      fundingGap: Math.max(0, potentialIncoming - actualIncoming)
    };
  }
  
  /**
   * Project Maturity Health - How well-developed and defined the project is
   */
  calculateProjectMaturity(project) {
    let score = 50;
    let status = 'developing';
    let recommendation = 'Continue project development';
    
    // Factors that indicate project maturity
    const maturityIndicators = {
      hasDescription: !!(project.description && project.description.length > 100),
      hasAISummary: !!(project.aiSummary && project.aiSummary.length > 50),
      hasProjectLead: !!(project.projectLead?.name || project.lead),
      hasThemes: !!(project.themes && project.themes.length > 0),
      hasBudget: !!(project.budget && project.budget > 0),
      hasStartDate: !!project.startDate,
      hasLocation: !!project.location,
      hasRelatedConnections: !!(
        (project.relatedFields && project.relatedFields.length > 0) ||
        (project.relatedActions && project.relatedActions.length > 0) ||
        (project.relatedResources && project.relatedResources.length > 0)
      )
    };
    
    const maturityScore = Object.values(maturityIndicators).filter(Boolean).length;
    const maxMaturityScore = Object.keys(maturityIndicators).length;
    const maturityPercentage = (maturityScore / maxMaturityScore) * 100;
    
    if (maturityPercentage >= 90) {
      score = 95;
      status = 'highly_mature';
      recommendation = 'Excellent project definition - ready for execution';
    } else if (maturityPercentage >= 75) {
      score = 85;
      status = 'mature';
      recommendation = 'Well-defined project - focus on remaining gaps';
    } else if (maturityPercentage >= 60) {
      score = 70;
      status = 'developing';
      recommendation = 'Good foundation - enhance project documentation';
    } else if (maturityPercentage >= 40) {
      score = 55;
      status = 'early_stage';
      recommendation = 'Basic structure in place - add more detail and connections';
    } else if (maturityPercentage >= 25) {
      score = 35;
      status = 'conceptual';
      recommendation = 'Early concept - focus on fundamental project elements';
    } else {
      score = 20;
      status = 'minimal';
      recommendation = 'Limited project definition - substantial development needed';
    }
    
    return {
      score,
      status,
      recommendation,
      maturityIndicators,
      maturityScore,
      maxMaturityScore,
      maturityPercentage: Math.round(maturityPercentage),
      completedElements: Object.keys(maturityIndicators).filter(key => maturityIndicators[key]),
      missingElements: Object.keys(maturityIndicators).filter(key => !maturityIndicators[key])
    };
  }
  
  /**
   * Helper method for categorizing community strength
   */
  categorizeCommunityStrength(totalCommunity) {
    if (totalCommunity >= 20) return { level: 'strong', emoji: '🌟', description: 'Vibrant community' };
    if (totalCommunity >= 10) return { level: 'growing', emoji: '📈', description: 'Growing network' };
    if (totalCommunity >= 5) return { level: 'emerging', emoji: '🌱', description: 'Emerging community' };
    if (totalCommunity >= 2) return { level: 'starting', emoji: '🔍', description: 'Building connections' };
    return { level: 'individual', emoji: '👤', description: 'Solo or minimal team' };
  }

  /**
   * Helper methods for calculations
   */
  estimateHoursNeeded(project) {
    const statusHours = {
      'Active 🔥': 15,
      'Preparation 📋': 10,
      'Ideation 🌀': 5,
      'On Hold ⏸️': 2
    };
    
    return statusHours[project.status] || 8;
  }

  getRecentTimeSpent(project) {
    // Mock - would integrate with calendar data
    return Math.floor(Math.random() * 20) + 2;
  }

  async getProjectStakeholders(project) {
    // Would integrate with actual people/stakeholder data
    return [
      { name: 'Sarah Chen', role: 'Lead' },
      { name: 'Marcus Wong', role: 'Partner' }
    ];
  }

  async getRecentCommunications(project) {
    // Mock - would integrate with email/communication data
    return [
      { type: 'email', date: new Date(), subject: 'Project update' }
    ];
  }

  getHealthLevel(score) {
    if (score >= 80) return { level: 'excellent', color: '🟢', emoji: '💪' };
    if (score >= 70) return { level: 'good', color: '🟡', emoji: '👍' };
    if (score >= 50) return { level: 'moderate', color: '🟠', emoji: '⚠️' };
    return { level: 'poor', color: '🔴', emoji: '🚨' };
  }

  getTimeAllocationReason(metrics) {
    if (metrics.timeAllocation.score < 30) return 'Critical attention needed';
    const milestoneDays = metrics.milestoneProgress?.daysToMilestone;
    if (typeof milestoneDays === 'number' && milestoneDays >= 0 && milestoneDays < 7) {
      return 'Milestone approaching';
    }
    if (metrics.momentum.score > 80) return 'High momentum - capitalize now';
    return 'Regular maintenance and progress';
  }

  /**
   * Calculate intelligent urgency based on real factors, not just health score
   */
  calculateIntelligentUrgency(healthMetrics, project, roundedScore, rawScore = roundedScore) {
    // Enhanced debug logging
    logger.debug(`🔍 URGENCY CALCULATION for ${project.name}:`);
    logger.debug(`  📊 Overall Score: ${rawScore}`);
    logger.debug(`  🎯 Rounded Score: ${roundedScore}`);
    logger.debug(`  📅 Project Status: ${project.status}`);
    logger.debug(`  💰 Project Budget: ${project.budget || 'unknown'}`);
    logger.debug(`  📋 Project fields:`, Object.keys(project));
    logger.debug(`  🔧 Health metrics:`, Object.keys(healthMetrics));

    // Only mark as HIGH urgency if multiple factors are truly critical
    const criticalFactors = [];

    if (roundedScore <= 35) {
      criticalFactors.push('low_health_score');
    }

    // Check for real deadline urgency
    if (healthMetrics.milestoneProgress?.daysToMilestone <= 7 && healthMetrics.milestoneProgress?.daysToMilestone > 0) {
      criticalFactors.push('approaching_deadline');
    }
    
    // Check for severely overdue milestones (actual urgent issue)
    if (healthMetrics.milestoneProgress?.daysOverdue > 30) {
      criticalFactors.push('severely_overdue');
    }
    
    // Check for budget issues that need immediate attention
    if (project.budget > 50000 && healthMetrics.budgetHealth?.score < 30) {
      criticalFactors.push('budget_crisis');
    }
    
    // Check for momentum loss on important projects
    if (project.importance === 'high' && healthMetrics.momentum?.score < 20) {
      criticalFactors.push('momentum_loss');
    }
    
    // Check for stakeholder issues on customer-facing projects
    if (project.hasExternalStakeholders && healthMetrics.stakeholderEngagement?.score < 30) {
      criticalFactors.push('stakeholder_risk');
    }
    
    // Intelligent urgency assignment
    let urgency;
    if (criticalFactors.length >= 2) {
      urgency = 'HIGH';
    } else if (criticalFactors.length === 1 || roundedScore < 40) {
      urgency = 'MEDIUM';
    } else {
      urgency = 'LOW';
    }
    
    logger.debug(`  - Critical factors: [${criticalFactors.join(', ')}]`);
    logger.debug(`  - Final urgency: ${urgency}`);
    
    return urgency;
  }

  /**
   * Get daily project recommendations
   */
  async getDailyProjectFocus() {
    const projectHealth = await this.calculateAllProjectHealth();
    
    return {
      focusProjects: projectHealth.slice(0, 3), // Top 3 projects needing attention
      totalProjects: projectHealth.length,
      avgHealthScore: Math.round(projectHealth.reduce((sum, p) => sum + p.healthData.overallScore, 0) / projectHealth.length),
      criticalProjects: projectHealth.filter(p => p.healthData.urgencyFlag === 'HIGH').length
    };
  }
}

// Export singleton instance
export const projectHealthService = new ProjectHealthService();
export default projectHealthService;
