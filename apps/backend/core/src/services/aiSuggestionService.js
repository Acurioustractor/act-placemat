/**
 * AI-Powered Suggestion Service
 * Intelligent recommendations for time allocation, project focus, and communication
 * 
 * Features:
 * - Smart time allocation based on project health and deadlines
 * - Personalized daily schedules with AI optimization
 * - Communication suggestions based on relationship patterns
 * - Adaptive learning from user preferences and outcomes
 * - Context-aware recommendations considering energy levels, calendar, and goals
 */

import projectHealthService from './projectHealthService.js';
import peopleRelationshipService from './peopleRelationshipService.js';
import { freeResearchAI } from './freeResearchAI.js';
import { logger } from '../utils/logger.js';

export class AISuggestionService {
  constructor() {
    this.suggestionCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.userPreferences = {
      workingHours: { start: 9, end: 17 },
      energyPeakHours: [9, 10, 14, 15],
      preferredBreakLength: 15,
      focusBlockMinutes: 90,
      communicationStyle: 'structured', // structured, casual, intensive
      priorities: ['impact', 'relationships', 'growth']
    };

    console.log('🤖 AI Suggestion Service initialized');
  }

  /**
   * Generate comprehensive daily suggestions
   */
  async generateDailyRecommendations(userContext = {}) {
    try {
      const {
        currentTime = new Date(),
        availableHours = 8,
        energyLevel = 'medium',
        existingCalendar = [],
        dailyGoals = []
      } = userContext;

      const [projectHealth, relationshipDashboard, timeAllocation, communications] = await Promise.all([
        projectHealthService.calculateAllProjectHealth(),
        peopleRelationshipService.getRelationshipDashboard(),
        this.calculateOptimalTimeAllocation(projectHealth, availableHours),
        this.generateCommunicationSuggestions(relationshipDashboard.pendingActions)
      ]);

      const suggestions = {
        dailyFocus: this.determineDailyFocus(projectHealth, energyLevel),
        timeAllocation,
        priorityProjects: this.selectPriorityProjects(projectHealth, 3),
        communicationPlan: communications,
        scheduleOptimization: await this.optimizeSchedule(existingCalendar, timeAllocation),
        aiInsights: await this.generateAIInsights(projectHealth, relationshipDashboard),
        energyAlignment: this.alignWithEnergyLevels(timeAllocation, energyLevel),
        adaptiveRecommendations: this.getAdaptiveRecommendations(userContext)
      };

      return suggestions;

    } catch (error) {
      logger.error('Failed to generate daily recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Calculate optimal time allocation across projects
   */
  async calculateOptimalTimeAllocation(projectHealth, availableHours) {
    const allocations = [];
    let remainingHours = availableHours * 0.8; // Reserve 20% for breaks/admin

    // Sort projects by urgency and health score
    const sortedProjects = projectHealth.sort((a, b) => {
      const urgencyWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aScore = (100 - a.healthData.overallScore) * urgencyWeight[a.healthData.urgencyFlag];
      const bScore = (100 - b.healthData.overallScore) * urgencyWeight[b.healthData.urgencyFlag];
      return bScore - aScore;
    });

    for (const project of sortedProjects.slice(0, 4)) { // Top 4 projects
      const baseHours = project.healthData.suggestedTimeToday.hours;
      const urgencyMultiplier = { 'HIGH': 1.5, 'MEDIUM': 1.2, 'LOW': 1.0 };
      const healthMultiplier = project.healthData.overallScore < 50 ? 1.3 : 1.0;
      
      const suggestedHours = Math.min(
        remainingHours,
        baseHours * urgencyMultiplier[project.healthData.urgencyFlag] * healthMultiplier
      );

      if (suggestedHours > 0.5) { // Only allocate if meaningful time
        allocations.push({
          projectId: project.id,
          projectName: project.name,
          suggestedHours: Math.round(suggestedHours * 2) / 2, // Round to nearest 0.5
          priority: project.healthData.urgencyFlag,
          healthScore: project.healthData.overallScore,
          reasoning: this.explainTimeAllocation(project, suggestedHours),
          bestTimeSlots: this.suggestOptimalTimeSlots(project, suggestedHours),
          keyActions: project.healthData.recommendations.slice(0, 2)
        });

        remainingHours -= suggestedHours;
      }
    }

    // Allocate remaining time to admin/growth activities
    if (remainingHours > 0.5) {
      allocations.push({
        projectId: 'admin',
        projectName: 'Admin & Growth',
        suggestedHours: Math.round(remainingHours * 2) / 2,
        priority: 'LOW',
        reasoning: 'Time for administrative tasks, learning, and strategic thinking',
        bestTimeSlots: ['end_of_day'],
        keyActions: ['Review project status', 'Plan next week', 'Learning/skill development']
      });
    }

    return {
      allocations,
      totalAllocated: allocations.reduce((sum, a) => sum + a.suggestedHours, 0),
      allocationStrategy: this.getTimeAllocationStrategy(sortedProjects),
      confidence: this.calculateAllocationConfidence(allocations)
    };
  }

  /**
   * Determine the main daily focus based on project health and energy
   */
  determineDailyFocus(projectHealth, energyLevel) {
    const criticalProjects = projectHealth.filter(p => p.healthData.urgencyFlag === 'HIGH');
    
    if (criticalProjects.length > 0) {
      return {
        type: 'crisis_management',
        title: '🚨 Crisis Management Day',
        description: `${criticalProjects.length} project(s) need urgent attention`,
        primaryProject: criticalProjects[0],
        strategy: 'Focus intensively on critical issues before they become bigger problems',
        energyRequired: 'high'
      };
    }

    const strategies = {
      high: {
        type: 'breakthrough',
        title: '🚀 Breakthrough Day',
        description: 'High energy - tackle challenging projects and make major progress',
        strategy: 'Use peak energy for complex problem-solving and creative work',
        energyRequired: 'high'
      },
      medium: {
        type: 'steady_progress',
        title: '⚡ Steady Progress Day',
        description: 'Balanced energy - maintain momentum across key projects',
        strategy: 'Consistent progress with regular check-ins and relationship building',
        energyRequired: 'medium'
      },
      low: {
        type: 'maintenance',
        title: '🌱 Gentle Maintenance Day',
        description: 'Lower energy - focus on communication and planning',
        strategy: 'Prioritize relationship building, planning, and less intensive tasks',
        energyRequired: 'low'
      }
    };

    const focus = strategies[energyLevel] || strategies.medium;
    focus.primaryProject = projectHealth[0]; // Highest priority project

    return focus;
  }

  /**
   * Generate communication suggestions
   */
  async generateCommunicationSuggestions(pendingActions) {
    const communicationPlan = {
      urgentResponses: [],
      proactiveOutreach: [],
      scheduledCheckins: [],
      networkBuilding: []
    };

    // Process pending actions
    for (const action of pendingActions) {
      if (action.waitingDays > 3) {
        communicationPlan.urgentResponses.push({
          personName: action.name,
          action: `Respond to ${action.type}: ${action.subject}`,
          urgency: 'HIGH',
          suggestedResponse: action.suggestedResponse,
          estimatedTime: '15-30 minutes',
          bestTime: 'morning_start'
        });
      }
    }

    // Generate proactive suggestions based on relationship health
    const relationshipData = await peopleRelationshipService.getRelationshipDashboard();
    const needsAttention = relationshipData.people
      .filter(p => p.relationshipHealth.overallScore < 60)
      .slice(0, 3);

    for (const person of needsAttention) {
      communicationPlan.proactiveOutreach.push({
        personName: person.name,
        action: `Proactive check-in - ${person.relationshipHealth.daysSinceContact} days since contact`,
        urgency: person.communicationUrgency,
        suggestedApproach: person.relationshipHealth.recommendations[0]?.action || 'Casual check-in',
        estimatedTime: '20-45 minutes',
        bestTime: this.suggestBestContactTime(person)
      });
    }

    return communicationPlan;
  }

  /**
   * Optimize schedule based on AI analysis
   */
  async optimizeSchedule(existingCalendar, timeAllocation) {
    const optimizations = [];
    const freeSlots = this.findFreeTimeSlots(existingCalendar);

    // Match project work to optimal time slots
    for (const allocation of timeAllocation.allocations) {
      const bestSlots = this.matchProjectToTimeSlots(allocation, freeSlots);
      
      optimizations.push({
        type: 'time_block',
        project: allocation.projectName,
        suggestedSlot: bestSlots[0],
        duration: allocation.suggestedHours,
        reasoning: `Optimal time for ${allocation.projectName} based on ${allocation.reasoning}`,
        alternatives: bestSlots.slice(1, 3)
      });
    }

    // Suggest communication windows
    optimizations.push({
      type: 'communication_block',
      title: 'Communication & Email',
      suggestedSlot: { start: '09:00', end: '09:30' },
      reasoning: 'Handle communications at day start for clarity and quick responses'
    });

    // Suggest break optimization
    optimizations.push({
      type: 'break_optimization',
      title: 'Strategic Breaks',
      suggestions: this.optimizeBreaks(timeAllocation.totalAllocated),
      reasoning: 'Optimize break timing for sustained focus and energy'
    });

    return optimizations;
  }

  /**
   * Generate AI insights using research AI with enhanced context
   */
  async generateAIInsights(projectHealth, relationshipDashboard) {
    console.log('🤖 Generating contextual AI insights with enhanced project data...');
    
    const context = this.buildEnhancedContext(projectHealth, relationshipDashboard);

    try {
      // Use AI to generate strategic insights with detailed health factor analysis
      const analysisPrompt = `
        Analyze this comprehensive work/project situation and provide strategic insights:
        
        PORTFOLIO OVERVIEW:
        - ${context.projectCount} total projects, ${context.criticalProjects} requiring urgent attention
        - Average project health: ${context.avgHealthScore}% (range: ${context.healthRange.min}%-${context.healthRange.max}%)
        - Network: ${context.totalRelationships} relationships, ${context.networkHealth}% healthy
        
        HEALTH FACTOR ANALYSIS:
        - Time allocation efficiency: ${context.healthFactors.timeAllocation}%
        - Milestone progress: ${context.healthFactors.milestoneProgress}%
        - Stakeholder engagement: ${context.healthFactors.stakeholderEngagement}%
        - Community support: ${context.healthFactors.communitySupport}%
        - Funding stability: ${context.healthFactors.fundingStability}%
        
        KEY PATTERNS:
        - ${context.patterns.strugglingAreas.join(', ')} need attention
        - ${context.patterns.strongAreas.join(', ')} are performing well
        - ${context.patterns.trends}
        
        PROJECT DISTRIBUTION:
        ${context.projectsByTheme.map(theme => `- ${theme.name}: ${theme.count} projects (avg health: ${theme.avgHealth}%)`).join('\n')}
        
        Provide 3-4 contextual insights and actionable recommendations for improving overall effectiveness, focusing on the specific patterns and health factors identified.
      `;

      const aiInsights = await freeResearchAI.analyzeWithGroq(analysisPrompt, {
        maxTokens: 500,
        temperature: 0.6
      });

      return {
        rawInsights: aiInsights,
        processedInsights: this.processAIInsights(aiInsights, context),
        context: context,
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
        enhancementLevel: 'contextual_v2'
      };

    } catch (error) {
      logger.warn('AI insights generation failed, using enhanced fallback insights:', error.message);
      return this.getEnhancedFallbackInsights(context);
    }
  }

  /**
   * Align time allocation with energy levels
   */
  alignWithEnergyLevels(timeAllocation, energyLevel) {
    const energyMap = {
      high: {
        bestFor: ['complex_problem_solving', 'creative_work', 'strategic_planning'],
        avoid: ['administrative_tasks', 'routine_communication'],
        peakHours: [9, 10, 14, 15]
      },
      medium: {
        bestFor: ['project_execution', 'team_collaboration', 'moderate_problem_solving'],
        avoid: ['intensive_creative_work', 'difficult_conversations'],
        peakHours: [10, 11, 13, 14]
      },
      low: {
        bestFor: ['communication', 'planning', 'administrative_tasks', 'research'],
        avoid: ['complex_decision_making', 'intensive_focus_work'],
        peakHours: [11, 13, 16]
      }
    };

    const alignment = energyMap[energyLevel] || energyMap.medium;

    return {
      energyLevel,
      recommendations: alignment,
      adjustedAllocations: timeAllocation.allocations.map(allocation => ({
        ...allocation,
        energyAlignment: this.assessEnergyAlignment(allocation.projectName, alignment),
        adjustedTimeSlots: this.adjustForEnergy(allocation.bestTimeSlots, alignment)
      }))
    };
  }

  /**
   * Get adaptive recommendations based on patterns
   */
  getAdaptiveRecommendations(userContext) {
    const dayOfWeek = new Date().getDay();
    const timeOfDay = new Date().getHours();

    const adaptations = [];

    // Day-of-week adaptations
    if (dayOfWeek === 1) { // Monday
      adaptations.push({
        type: 'weekly_planning',
        recommendation: 'Start week with project health review and priority setting',
        reasoning: 'Monday is optimal for strategic planning and week organization'
      });
    } else if (dayOfWeek === 5) { // Friday
      adaptations.push({
        type: 'weekly_review',
        recommendation: 'Focus on relationship maintenance and week reflection',
        reasoning: 'Friday is ideal for wrapping up and preparing for next week'
      });
    }

    // Time-of-day adaptations
    if (timeOfDay < 10) {
      adaptations.push({
        type: 'morning_optimization',
        recommendation: 'Use morning clarity for most important project work',
        reasoning: 'Research shows peak cognitive performance in morning hours'
      });
    }

    // Context-based adaptations
    if (userContext.stressLevel === 'high') {
      adaptations.push({
        type: 'stress_management',
        recommendation: 'Reduce project count, increase communication and breaks',
        reasoning: 'High stress requires focus reduction and support system activation'
      });
    }

    return adaptations;
  }

  /**
   * Helper methods
   */
  explainTimeAllocation(project, hours) {
    const reasons = [];
    
    if (project.healthData.overallScore < 50) {
      reasons.push('low health score needs attention');
    }
    if (project.healthData.urgencyFlag === 'HIGH') {
      reasons.push('high urgency flagged');
    }
    if (project.healthData.metrics.milestoneProgress.daysToMilestone < 7) {
      reasons.push('milestone approaching');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'maintaining steady progress';
  }

  suggestOptimalTimeSlots(project, hours) {
    const projectType = this.categorizeProjectType(project);
    
    const timeSlotMap = {
      creative: ['morning_peak', 'early_afternoon'],
      analytical: ['mid_morning', 'late_morning'],
      collaborative: ['mid_morning', 'early_afternoon', 'mid_afternoon'],
      administrative: ['late_afternoon', 'end_of_day']
    };

    return timeSlotMap[projectType] || ['mid_morning', 'early_afternoon'];
  }

  categorizeProjectType(project) {
    const themes = project.themes || [];
    
    if (themes.includes('Technology') || themes.includes('Innovation')) return 'analytical';
    if (themes.includes('Community') || themes.includes('Partnership')) return 'collaborative';
    if (themes.includes('Art') || themes.includes('Creative')) return 'creative';
    
    return 'collaborative'; // Default
  }

  selectPriorityProjects(projectHealth, count) {
    return projectHealth
      .slice(0, count)
      .map(project => ({
        id: project.id,
        name: project.name,
        healthScore: project.healthData.overallScore,
        urgency: project.healthData.urgencyFlag,
        keyAction: project.healthData.recommendations[0]?.action || 'Continue current progress',
        suggestedTime: project.healthData.suggestedTimeToday.hours
      }));
  }

  findFreeTimeSlots(calendar) {
    // Mock implementation - would analyze actual calendar
    return [
      { start: '09:00', end: '11:00', duration: 2 },
      { start: '11:30', end: '12:30', duration: 1 },
      { start: '14:00', end: '16:30', duration: 2.5 },
      { start: '16:45', end: '17:30', duration: 0.75 }
    ];
  }

  matchProjectToTimeSlots(allocation, freeSlots) {
    // Simple matching - in real system would consider project type, energy levels, etc.
    return freeSlots
      .filter(slot => slot.duration >= allocation.suggestedHours)
      .sort((a, b) => b.duration - a.duration);
  }

  optimizeBreaks(totalWorkHours) {
    const breakSchedule = [];
    const workBlocks = Math.ceil(totalWorkHours / 2); // 2-hour blocks

    for (let i = 1; i < workBlocks; i++) {
      breakSchedule.push({
        after: `${i * 2} hours of work`,
        duration: i % 2 === 0 ? 30 : 15, // Longer break every 4 hours
        type: i % 2 === 0 ? 'long_break' : 'short_break',
        suggestion: i % 2 === 0 ? 'Walk, stretch, eat something' : 'Deep breathing, quick walk'
      });
    }

    return breakSchedule;
  }

  assessEnergyAlignment(projectName, alignment) {
    const projectComplexity = this.assessProjectComplexity(projectName);
    
    if (alignment.bestFor.includes(projectComplexity)) {
      return { score: 90, status: 'excellent', note: 'Perfect energy alignment' };
    } else if (alignment.avoid.includes(projectComplexity)) {
      return { score: 30, status: 'poor', note: 'Energy mismatch - consider rescheduling' };
    }
    
    return { score: 70, status: 'moderate', note: 'Acceptable energy alignment' };
  }

  assessProjectComplexity(projectName) {
    // Simple categorization - would be more sophisticated in real system
    if (projectName.includes('Technical') || projectName.includes('Architecture')) return 'complex_problem_solving';
    if (projectName.includes('Creative') || projectName.includes('Art')) return 'creative_work';
    if (projectName.includes('Admin') || projectName.includes('Planning')) return 'administrative_tasks';
    
    return 'moderate_problem_solving';
  }

  adjustForEnergy(timeSlots, alignment) {
    return timeSlots.map(slot => ({
      original: slot,
      energyAdjusted: this.mapToEnergyOptimalTime(slot, alignment.peakHours),
      confidence: this.calculateTimeSlotConfidence(slot, alignment)
    }));
  }

  mapToEnergyOptimalTime(timeSlot, peakHours) {
    const timeMapping = {
      'morning_peak': peakHours.includes(9) ? '09:00-10:00' : '10:00-11:00',
      'mid_morning': '10:00-11:30',
      'early_afternoon': peakHours.includes(14) ? '14:00-15:00' : '13:00-14:00',
      'late_afternoon': '15:30-16:30',
      'end_of_day': '16:30-17:30'
    };

    return timeMapping[timeSlot] || '10:00-11:30';
  }

  calculateTimeSlotConfidence(slot, alignment) {
    // Mock calculation
    return Math.random() * 0.3 + 0.7; // 70-100% confidence
  }

  getTimeAllocationStrategy(projects) {
    const criticalCount = projects.filter(p => p.healthData.urgencyFlag === 'HIGH').length;
    
    if (criticalCount > 2) {
      return {
        name: 'Crisis Management',
        description: 'Focus heavily on critical projects, minimal time on others',
        approach: 'intensive_focus'
      };
    } else if (criticalCount === 0) {
      return {
        name: 'Balanced Growth',
        description: 'Distribute time evenly across healthy projects for sustained progress',
        approach: 'balanced_distribution'
      };
    }

    return {
      name: 'Strategic Focus',
      description: 'Prioritize urgent items while maintaining progress on other projects',
      approach: 'weighted_priority'
    };
  }

  calculateAllocationConfidence(allocations) {
    // Simple confidence calculation
    const baseConfidence = 0.8;
    const penaltyPerProject = 0.05;
    
    return Math.max(0.5, baseConfidence - (allocations.length * penaltyPerProject));
  }

  processAIInsights(rawInsights, context) {
    // Process AI response into structured insights with context
    return {
      keyInsights: this.extractKeyPoints(rawInsights),
      actionableRecommendations: this.extractActionItems(rawInsights),
      strategicThoughts: this.extractStrategicElements(rawInsights),
      contextualRecommendations: this.generateContextualRecommendations(context),
      healthFactorActions: this.generateHealthFactorActions(context),
      priorityMatrix: this.buildPriorityMatrix(context)
    };
  }

  extractKeyPoints(text) {
    // Mock extraction - would use NLP in real system
    return [
      'Focus on project health maintenance',
      'Strengthen relationship networks',
      'Balance urgent vs. important work'
    ];
  }

  extractActionItems(text) {
    return [
      'Schedule weekly project health reviews',
      'Implement regular check-ins with key people',
      'Create buffer time for unexpected urgent tasks'
    ];
  }

  extractStrategicElements(text) {
    return [
      'Consider delegation opportunities for low-priority work',
      'Invest in relationship building during low-stress periods',
      'Align project work with personal energy patterns'
    ];
  }

  suggestBestContactTime(person) {
    // Mock - would consider person's preferences, time zones, etc.
    const approaches = ['morning_email', 'afternoon_call', 'casual_message'];
    return approaches[Math.floor(Math.random() * approaches.length)];
  }

  getFallbackInsights(context) {
    return {
      keyInsights: [
        'Project portfolio needs attention and rebalancing',
        'Relationship health is important for long-term success',
        'Time allocation should align with energy levels'
      ],
      actionableRecommendations: [
        'Review and update project priorities weekly',
        'Schedule regular relationship maintenance',
        'Track energy patterns for better planning'
      ],
      confidence: 0.6,
      source: 'fallback_system'
    };
  }

  getFallbackRecommendations() {
    return {
      dailyFocus: {
        type: 'balanced',
        title: '⚖️ Balanced Progress Day',
        description: 'Maintain steady progress across all areas',
        strategy: 'Focus on top priorities with regular communication'
      },
      timeAllocation: {
        allocations: [
          {
            projectName: 'Top Priority Project',
            suggestedHours: 3,
            priority: 'HIGH',
            reasoning: 'Focus on most important project'
          },
          {
            projectName: 'Communication & Admin',
            suggestedHours: 2,
            priority: 'MEDIUM',
            reasoning: 'Maintain relationships and handle logistics'
          }
        ],
        totalAllocated: 5
      },
      priorityProjects: [],
      communicationPlan: { urgentResponses: [], proactiveOutreach: [] }
    };
  }

  /**
   * Build enhanced context for AI analysis
   */
  buildEnhancedContext(projectHealth, relationshipDashboard) {
    const healthScores = projectHealth.map(p => p.healthData.overallScore);
    const avgHealthScore = Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length);
    
    // Analyze health factors across all projects
    const healthFactors = this.analyzeHealthFactors(projectHealth);
    
    // Identify patterns and trends
    const patterns = this.identifyProjectPatterns(projectHealth);
    
    // Group projects by theme/category
    const projectsByTheme = this.groupProjectsByTheme(projectHealth);
    
    return {
      projectCount: projectHealth.length,
      criticalProjects: projectHealth.filter(p => p.healthData.urgencyFlag === 'HIGH').length,
      avgHealthScore,
      healthRange: {
        min: Math.min(...healthScores),
        max: Math.max(...healthScores)
      },
      totalRelationships: relationshipDashboard.insights.totalRelationships,
      networkHealth: relationshipDashboard.insights.healthyPercentage,
      healthFactors,
      patterns,
      projectsByTheme
    };
  }

  /**
   * Analyze health factors across all projects
   */
  analyzeHealthFactors(projectHealth) {
    const factors = {
      timeAllocation: 0,
      milestoneProgress: 0,
      stakeholderEngagement: 0,
      budgetHealth: 0,
      momentum: 0,
      communitySupport: 0,
      fundingStability: 0,
      projectMaturity: 0
    };

    if (projectHealth.length === 0) return factors;

    projectHealth.forEach(project => {
      const metrics = project.healthData.metrics || {};
      factors.timeAllocation += (metrics.timeAllocation?.score || 50);
      factors.milestoneProgress += (metrics.milestoneProgress?.score || 50);
      factors.stakeholderEngagement += (metrics.stakeholderEngagement?.score || 50);
      factors.budgetHealth += (metrics.budgetHealth?.score || 50);
      factors.momentum += (metrics.momentum?.score || 50);
      factors.communitySupport += (metrics.communitySupport?.score || 50);
      factors.fundingStability += (metrics.fundingStability?.score || 50);
      factors.projectMaturity += (metrics.projectMaturity?.score || 50);
    });

    // Average all factors
    Object.keys(factors).forEach(factor => {
      factors[factor] = Math.round(factors[factor] / projectHealth.length);
    });

    return factors;
  }

  /**
   * Identify patterns and trends in project portfolio
   */
  identifyProjectPatterns(projectHealth) {
    const healthFactors = this.analyzeHealthFactors(projectHealth);
    
    // Identify struggling areas (below 60%)
    const strugglingAreas = Object.entries(healthFactors)
      .filter(([_, score]) => score < 60)
      .map(([factor, _]) => factor.replace(/([A-Z])/g, ' $1').toLowerCase())
      .slice(0, 3);
    
    // Identify strong areas (above 80%)
    const strongAreas = Object.entries(healthFactors)
      .filter(([_, score]) => score > 80)
      .map(([factor, _]) => factor.replace(/([A-Z])/g, ' $1').toLowerCase())
      .slice(0, 3);
    
    // Generate trend analysis
    const criticalCount = projectHealth.filter(p => p.healthData.urgencyFlag === 'HIGH').length;
    const avgHealth = Math.round(projectHealth.reduce((sum, p) => sum + p.healthData.overallScore, 0) / projectHealth.length);
    
    let trends = '';
    if (criticalCount > 3) {
      trends = 'Multiple projects showing signs of stress - crisis management mode needed';
    } else if (avgHealth > 75) {
      trends = 'Portfolio performing well overall - good time for strategic investments';
    } else if (avgHealth < 50) {
      trends = 'Portfolio health declining - immediate attention required across multiple areas';
    } else {
      trends = 'Mixed portfolio performance - selective attention needed on underperforming areas';
    }

    return {
      strugglingAreas: strugglingAreas.length > 0 ? strugglingAreas : ['No major areas of concern'],
      strongAreas: strongAreas.length > 0 ? strongAreas : ['All areas need improvement'],
      trends
    };
  }

  /**
   * Group projects by theme/category for analysis
   */
  groupProjectsByTheme(projectHealth) {
    const themeMap = new Map();
    
    projectHealth.forEach(project => {
      const themes = project.themes || ['General'];
      const primaryTheme = Array.isArray(themes) ? themes[0] : 'General';
      
      if (!themeMap.has(primaryTheme)) {
        themeMap.set(primaryTheme, { count: 0, totalHealth: 0 });
      }
      
      const themeData = themeMap.get(primaryTheme);
      themeData.count++;
      themeData.totalHealth += project.healthData.overallScore;
    });
    
    return Array.from(themeMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      avgHealth: Math.round(data.totalHealth / data.count)
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Generate contextual recommendations based on analysis
   */
  generateContextualRecommendations(context) {
    const recommendations = [];
    
    // Health factor specific recommendations
    if (context.healthFactors.timeAllocation < 60) {
      recommendations.push({
        type: 'time_management',
        priority: 'HIGH',
        action: 'Implement time tracking and allocation review for better project resource distribution',
        impact: 'Improved project momentum and deadline adherence'
      });
    }
    
    if (context.healthFactors.stakeholderEngagement < 60) {
      recommendations.push({
        type: 'communication',
        priority: 'HIGH',
        action: 'Schedule regular stakeholder check-ins and establish clear communication protocols',
        impact: 'Stronger project support and reduced misalignment risks'
      });
    }
    
    if (context.healthFactors.communitySupport < 60) {
      recommendations.push({
        type: 'community_building',
        priority: 'MEDIUM',
        action: 'Invest in community building activities and partnership development',
        impact: 'Enhanced project sustainability and resource access'
      });
    }
    
    if (context.healthFactors.fundingStability < 60) {
      recommendations.push({
        type: 'financial_health',
        priority: 'HIGH',
        action: 'Develop diversified funding strategy and strengthen financial planning',
        impact: 'Reduced financial risk and improved project longevity'
      });
    }
    
    // Portfolio level recommendations
    if (context.criticalProjects > 0) {
      recommendations.push({
        type: 'crisis_management',
        priority: 'URGENT',
        action: `Focus immediate attention on ${context.criticalProjects} critical project(s)`,
        impact: 'Prevention of project failures and stakeholder disappointment'
      });
    }
    
    // Theme-based recommendations
    const largestTheme = context.projectsByTheme[0];
    if (largestTheme && largestTheme.avgHealth < 60) {
      recommendations.push({
        type: 'theme_focus',
        priority: 'MEDIUM',
        action: `Develop specialized support strategy for ${largestTheme.name} projects (${largestTheme.count} projects at ${largestTheme.avgHealth}% avg health)`,
        impact: 'Improved outcomes for your largest project category'
      });
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Generate specific actions for health factors
   */
  generateHealthFactorActions(context) {
    const actions = {};
    
    Object.entries(context.healthFactors).forEach(([factor, score]) => {
      if (score < 70) { // Below good threshold
        actions[factor] = {
          currentScore: score,
          targetScore: Math.min(85, score + 20),
          actions: this.getHealthFactorActions(factor, score),
          timeframe: score < 50 ? 'immediate' : 'short_term'
        };
      }
    });
    
    return actions;
  }

  /**
   * Get specific actions for a health factor
   */
  getHealthFactorActions(factor, currentScore) {
    const actionMap = {
      timeAllocation: [
        'Implement daily time tracking',
        'Review and adjust project time budgets',
        'Use time-blocking for focused work sessions'
      ],
      milestoneProgress: [
        'Break down large milestones into smaller tasks',
        'Establish weekly milestone review meetings',
        'Adjust timelines based on actual progress'
      ],
      stakeholderEngagement: [
        'Schedule regular one-on-one stakeholder meetings',
        'Create stakeholder communication calendar',
        'Implement feedback collection system'
      ],
      budgetHealth: [
        'Conduct monthly budget reviews',
        'Identify cost optimization opportunities',
        'Establish budget alert systems'
      ],
      momentum: [
        'Celebrate small wins regularly',
        'Remove project blockers quickly',
        'Maintain consistent project activity'
      ],
      communitySupport: [
        'Engage with relevant communities',
        'Build strategic partnerships',
        'Participate in networking events'
      ],
      fundingStability: [
        'Diversify funding sources',
        'Develop grant writing capabilities',
        'Build relationships with potential funders'
      ],
      projectMaturity: [
        'Establish clear project processes',
        'Document lessons learned',
        'Implement quality assurance practices'
      ]
    };
    
    return actionMap[factor] || ['Review and improve this area'];
  }

  /**
   * Build priority matrix for recommendations
   */
  buildPriorityMatrix(context) {
    const matrix = {
      urgent_important: [], // Do first
      not_urgent_important: [], // Schedule
      urgent_not_important: [], // Delegate
      not_urgent_not_important: [] // Eliminate
    };
    
    // Categorize based on health scores and project count
    if (context.criticalProjects > 0) {
      matrix.urgent_important.push('Address critical projects immediately');
    }
    
    if (context.healthFactors.fundingStability < 50) {
      matrix.urgent_important.push('Stabilize project funding');
    }
    
    if (context.healthFactors.stakeholderEngagement < 60) {
      matrix.not_urgent_important.push('Improve stakeholder communication');
    }
    
    if (context.avgHealthScore > 75) {
      matrix.not_urgent_important.push('Invest in growth and new opportunities');
    }
    
    if (context.healthFactors.projectMaturity < 60) {
      matrix.not_urgent_not_important.push('Enhance project documentation and processes');
    }
    
    return matrix;
  }

  /**
   * Enhanced fallback insights with context
   */
  getEnhancedFallbackInsights(context) {
    const contextualRecommendations = this.generateContextualRecommendations(context);
    const healthFactorActions = this.generateHealthFactorActions(context);
    
    return {
      keyInsights: [
        `Portfolio of ${context.projectCount} projects with ${context.avgHealthScore}% average health`,
        `${context.patterns.strugglingAreas.join(', ')} need immediate attention`,
        `${context.patterns.strongAreas.join(', ')} are performing well and can guide improvements`
      ],
      actionableRecommendations: contextualRecommendations.slice(0, 3),
      contextualRecommendations,
      healthFactorActions,
      priorityMatrix: this.buildPriorityMatrix(context),
      confidence: 0.7,
      source: 'enhanced_fallback_system',
      enhancementLevel: 'contextual_v2'
    };
  }
}

// Export singleton instance
export const aiSuggestionService = new AISuggestionService();
export default aiSuggestionService;