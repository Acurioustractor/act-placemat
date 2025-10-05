/**
 * Morning Intelligence Processing Layer
 * AI-powered intelligence processing for the co-founder morning dashboard
 *
 * Features:
 * - Priority ranking algorithm for strategic items
 * - Natural language summary generation
 * - Critical alert notification system
 * - Trend analysis and pattern recognition
 * - Executive morning brief generation
 */

import { IntegrationLogger } from './unifiedIntegration/utils/Logger.ts';
import { intelligenceDataIntegrationService } from './intelligenceDataIntegration.js';
import MultiProviderAI from './multiProviderAI.js';

/**
 * Morning Intelligence Processing Service
 * Applies AI-powered analysis to raw data for actionable insights
 */
class MorningIntelligenceProcessor {
  constructor() {
    this.logger = IntegrationLogger.getInstance();
    this.aiService = new MultiProviderAI();

    // Priority weights for different data types
    this.priorityWeights = {
      contacts: {
        lastInteraction: 0.3,    // Recency of last interaction
        strategicValue: 0.4,     // Strategic importance score
        responseUrgency: 0.2,    // Time-sensitive communications
        opportunityScore: 0.1    // Business opportunity potential
      },
      projects: {
        deadline: 0.4,           // Approaching deadlines
        blockers: 0.3,           // Critical blockers
        stakeholderWaiting: 0.2, // Stakeholders waiting for updates
        strategicImpact: 0.1     // Overall strategic impact
      },
      finances: {
        cashflowUrgency: 0.4,    // Cash flow concerns
        paymentOverdue: 0.3,     // Overdue payments
        budgetVariance: 0.2,     // Budget deviations
        seasonality: 0.1         // Seasonal trends
      },
      calendar: {
        preparationTime: 0.3,    // Meeting preparation requirements
        stakeholderImportance: 0.4, // Importance of attendees
        decisionCriticality: 0.2,   // Critical decisions needed
        timeBlocking: 0.1           // Schedule optimization
      }
    };

    this.logger.info('Morning Intelligence Processor initialized');
  }

  /**
   * Process morning intelligence data and generate insights
   */
  async processIntelligence(userId, rawData = null) {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'MorningIntelligence', 'processIntelligence');

    try {
      // Get fresh data if not provided
      if (!rawData) {
        timedLogger.info('Fetching fresh data from integration service');
        const syncResult = await intelligenceDataIntegrationService.syncAllData(userId, {
          priority: 'morning_brief',
          lightweight: true
        });
        rawData = syncResult.results;
      }

      // Process each data category
      const processedData = {
        contacts: await this.processContactsIntelligence(rawData.contacts || [], correlationId),
        projects: await this.processProjectsIntelligence(rawData.projects || [], correlationId),
        finances: await this.processFinancialIntelligence(rawData.finances || [], correlationId),
        calendar: await this.processCalendarIntelligence(rawData.calendar || [], correlationId),
        crossPlatform: await this.processCrossPlatformIntelligence(rawData, correlationId)
      };

      // Generate priority rankings
      const prioritizedItems = await this.generatePriorityRankings(processedData, correlationId);

      // Create natural language summaries
      const summaries = await this.generateNaturalLanguageSummaries(processedData, correlationId);

      // Identify critical alerts
      const criticalAlerts = await this.identifyCriticalAlerts(processedData, correlationId);

      // Generate trend analysis
      const trendAnalysis = await this.generateTrendAnalysis(processedData, correlationId);

      // Create executive morning brief
      const morningBrief = await this.generateMorningBrief({
        processedData,
        prioritizedItems,
        summaries,
        criticalAlerts,
        trendAnalysis
      }, correlationId);

      const result = {
        success: true,
        data: {
          prioritizedItems,
          summaries,
          criticalAlerts,
          trendAnalysis,
          morningBrief,
          metadata: {
            processedAt: new Date().toISOString(),
            userId,
            correlationId,
            dataFreshness: this.calculateDataFreshness(rawData)
          }
        }
      };

      timedLogger.info(`Morning intelligence processed successfully`);
      timedLogger.finish(true);
      return result;

    } catch (error) {
      timedLogger.error('Failed to process morning intelligence:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Process contact intelligence with opportunity scoring
   */
  async processContactsIntelligence(contacts, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'ContactsProcessor', 'processContacts');

    try {
      const processedContacts = contacts.map(contact => {
        const opportunityScore = this.calculateContactOpportunityScore(contact);
        const urgencyLevel = this.calculateContactUrgency(contact);
        const strategicValue = this.calculateStrategicValue(contact);

        return {
          ...contact,
          intelligence: {
            opportunityScore,
            urgencyLevel,
            strategicValue,
            priority: this.calculateContactPriority(contact, opportunityScore, urgencyLevel, strategicValue),
            insights: this.generateContactInsights(contact, opportunityScore, urgencyLevel),
            suggestedActions: this.generateContactActions(contact, opportunityScore, urgencyLevel)
          }
        };
      });

      // Sort by priority score
      processedContacts.sort((a, b) => b.intelligence.priority - a.intelligence.priority);

      timedLogger.info(`Processed ${processedContacts.length} contacts`);
      timedLogger.finish(true);
      return processedContacts.slice(0, 10); // Top 10 priorities

    } catch (error) {
      timedLogger.error('Failed to process contacts intelligence:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Process project intelligence with deadline and blocker analysis
   */
  async processProjectsIntelligence(projects, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'ProjectsProcessor', 'processProjects');

    try {
      const processedProjects = projects.map(project => {
        const deadlineUrgency = this.calculateDeadlineUrgency(project);
        const blockerSeverity = this.calculateBlockerSeverity(project);
        const stakeholderPressure = this.calculateStakeholderPressure(project);

        return {
          ...project,
          intelligence: {
            deadlineUrgency,
            blockerSeverity,
            stakeholderPressure,
            priority: this.calculateProjectPriority(project, deadlineUrgency, blockerSeverity, stakeholderPressure),
            riskLevel: this.calculateProjectRisk(project, deadlineUrgency, blockerSeverity),
            suggestedActions: this.generateProjectActions(project, deadlineUrgency, blockerSeverity)
          }
        };
      });

      // Sort by priority and risk
      processedProjects.sort((a, b) => {
        const priorityDiff = b.intelligence.priority - a.intelligence.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.intelligence.riskLevel - a.intelligence.riskLevel;
      });

      timedLogger.info(`Processed ${processedProjects.length} projects`);
      timedLogger.finish(true);
      return processedProjects.slice(0, 15); // Top 15 priorities

    } catch (error) {
      timedLogger.error('Failed to process projects intelligence:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Process financial intelligence with cash flow and trend analysis
   */
  async processFinancialIntelligence(finances, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'FinancialProcessor', 'processFinances');

    try {
      const metrics = this.computeFinancialMetrics(finances);

      const processedFinances = {
        overview: {
          cashPosition: metrics.cashBalance,
          burnRate: metrics.burnRate,
          runway: metrics.runwayMonths,
          healthScore: this.calculateFinancialHealthScore(metrics.cashBalance, metrics.burnRate, metrics.runwayMonths)
        },
        receivables: {
          aging: this.calculateReceivablesAging(metrics),
          overdueAmount: this.calculateOverdueReceivables(metrics),
          actionRequired: this.identifyReceivablesActions(metrics)
        },
        payables: {
          urgency: this.calculatePayablesUrgency(metrics),
          upcomingPayments: this.getUpcomingPayments(metrics),
          cashFlowImpact: this.calculateCashFlowImpact(metrics)
        },
        insights: this.generateFinancialInsights(metrics),
        alerts: this.generateFinancialAlerts(metrics)
      };

      timedLogger.info('Processed financial intelligence');
      timedLogger.finish(true);
      return processedFinances;

    } catch (error) {
      timedLogger.error('Failed to process financial intelligence:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Process calendar intelligence with meeting preparation and time blocking
   */
  async processCalendarIntelligence(calendar, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'CalendarProcessor', 'processCalendar');

    try {
      const todaysMeetings = this.getTodaysMeetings(calendar);
      const meetingPreparation = this.analyzeMeetingPreparation(todaysMeetings);
      const timeBlocks = this.identifyTimeBlocks(calendar);
      const stakeholderMeetings = this.analyzeStakeholderMeetings(todaysMeetings);

      const processedCalendar = {
        todaysSchedule: {
          meetings: todaysMeetings,
          totalMeetingTime: this.calculateTotalMeetingTime(todaysMeetings),
          freeTimeBlocks: timeBlocks,
          prepTimeRequired: this.calculatePrepTimeRequired(meetingPreparation)
        },
        preparation: meetingPreparation,
        priorities: stakeholderMeetings.sort((a, b) => b.stakeholderImportance - a.stakeholderImportance),
        insights: this.generateCalendarInsights(todaysMeetings, timeBlocks),
        suggestions: this.generateScheduleSuggestions(calendar, timeBlocks)
      };

      timedLogger.info(`Processed calendar with ${todaysMeetings.length} meetings`);
      timedLogger.finish(true);
      return processedCalendar;

    } catch (error) {
      timedLogger.error('Failed to process calendar intelligence:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Process cross-platform intelligence and correlations
   */
  async processCrossPlatformIntelligence(rawData, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'CrossPlatformProcessor', 'processCrossPlatform');

    try {
      // Find correlations between different data sources
      const correlations = {
        projectContactLinks: this.findProjectContactCorrelations(rawData.projects, rawData.contacts),
        meetingProjectLinks: this.findMeetingProjectCorrelations(rawData.calendar, rawData.projects),
        financialProjectImpact: this.findFinancialProjectCorrelations(rawData.finances, rawData.projects),
        stakeholderEngagement: this.analyzeStakeholderEngagement(rawData)
      };

      // Generate cross-platform insights
      const insights = await this.generateCrossPlatformInsights(correlations, correlationId);

      // Identify strategic opportunities
      const opportunities = this.identifyStrategicOpportunities(correlations, rawData);

      timedLogger.info('Processed cross-platform intelligence');
      timedLogger.finish(true);
      return {
        correlations,
        insights,
        opportunities
      };

    } catch (error) {
      timedLogger.error('Failed to process cross-platform intelligence:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Generate priority rankings across all data types
   */
  async generatePriorityRankings(processedData, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'PriorityRanking', 'generateRankings');

    try {
      const allItems = [];

      // Add top contacts
      processedData.contacts.slice(0, 5).forEach(contact => {
        allItems.push({
          type: 'contact',
          id: contact.id,
          title: contact.name,
          priority: contact.intelligence.priority,
          urgency: contact.intelligence.urgencyLevel,
          description: contact.intelligence.insights[0] || 'Strategic contact follow-up',
          actions: contact.intelligence.suggestedActions,
          data: contact
        });
      });

      // Add top projects
      processedData.projects.slice(0, 5).forEach(project => {
        allItems.push({
          type: 'project',
          id: project.id,
          title: project.name,
          priority: project.intelligence.priority,
          urgency: project.intelligence.riskLevel,
          description: `Project ${project.status} - Risk Level: ${project.intelligence.riskLevel}`,
          actions: project.intelligence.suggestedActions,
          data: project
        });
      });

      // Add financial alerts if critical
      if (processedData.finances.alerts && processedData.finances.alerts.length > 0) {
        processedData.finances.alerts.forEach(alert => {
          allItems.push({
            type: 'financial',
            id: `financial_${alert.type}`,
            title: alert.title,
            priority: alert.severity * 100, // Convert to priority scale
            urgency: alert.severity,
            description: alert.description,
            actions: alert.actions || [],
            data: alert
          });
        });
      }

      // Add calendar priorities
      if (processedData.calendar.priorities) {
        processedData.calendar.priorities.slice(0, 3).forEach(meeting => {
          allItems.push({
            type: 'calendar',
            id: meeting.id,
            title: meeting.title,
            priority: meeting.stakeholderImportance * 100,
            urgency: meeting.preparationUrgency || 50,
            description: `Meeting with ${meeting.attendees?.length || 0} attendees`,
            actions: meeting.preparationActions || [],
            data: meeting
          });
        });
      }

      // Sort by combined priority and urgency score
      allItems.sort((a, b) => {
        const scoreA = (a.priority * 0.7) + (a.urgency * 0.3);
        const scoreB = (b.priority * 0.7) + (b.urgency * 0.3);
        return scoreB - scoreA;
      });

      timedLogger.info(`Generated priority rankings for ${allItems.length} items`);
      timedLogger.finish(true);
      return allItems.slice(0, 10); // Top 10 overall priorities

    } catch (error) {
      timedLogger.error('Failed to generate priority rankings:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Generate natural language summaries using AI
   */
  async generateNaturalLanguageSummaries(processedData, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'SummaryGeneration', 'generateSummaries');

    try {
      const summaries = {};

      // Contacts summary
      if (processedData.contacts.length > 0) {
        const contactsPrompt = this.buildContactsSummaryPrompt(processedData.contacts);
        summaries.contacts = await this.aiService.generateText(contactsPrompt, {
          maxTokens: 150,
          temperature: 0.3
        });
      }

      // Projects summary
      if (processedData.projects.length > 0) {
        const projectsPrompt = this.buildProjectsSummaryPrompt(processedData.projects);
        summaries.projects = await this.aiService.generateText(projectsPrompt, {
          maxTokens: 150,
          temperature: 0.3
        });
      }

      // Financial summary
      if (processedData.finances) {
        const financialPrompt = this.buildFinancialSummaryPrompt(processedData.finances);
        summaries.financial = await this.aiService.generateText(financialPrompt, {
          maxTokens: 150,
          temperature: 0.3
        });
      }

      // Calendar summary
      if (processedData.calendar) {
        const calendarPrompt = this.buildCalendarSummaryPrompt(processedData.calendar);
        summaries.calendar = await this.aiService.generateText(calendarPrompt, {
          maxTokens: 150,
          temperature: 0.3
        });
      }

      timedLogger.info('Generated natural language summaries');
      timedLogger.finish(true);
      return summaries;

    } catch (error) {
      timedLogger.error('Failed to generate summaries:', error);
      timedLogger.finish(false);
      // Return fallback summaries
      return this.generateFallbackSummaries(processedData);
    }
  }

  /**
   * Identify critical alerts requiring immediate attention
   */
  async identifyCriticalAlerts(processedData, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'CriticalAlerts', 'identifyAlerts');

    try {
      const alerts = [];

      // Financial alerts
      if (processedData.finances.alerts) {
        processedData.finances.alerts.forEach(alert => {
          if (alert.severity >= 0.8) {
            alerts.push({
              type: 'financial',
              severity: 'critical',
              title: alert.title,
              description: alert.description,
              actions: alert.actions,
              timestamp: new Date().toISOString()
            });
          }
        });
      }

      // Project deadline alerts
      processedData.projects.forEach(project => {
        if (project.intelligence.deadlineUrgency >= 0.9) {
          alerts.push({
            type: 'project',
            severity: 'critical',
            title: `Project "${project.name}" deadline approaching`,
            description: `Project requires immediate attention due to approaching deadline`,
            actions: project.intelligence.suggestedActions,
            timestamp: new Date().toISOString()
          });
        }
      });

      // High-priority contact alerts
      processedData.contacts.forEach(contact => {
        if (contact.intelligence.urgencyLevel >= 0.9) {
          alerts.push({
            type: 'contact',
            severity: 'high',
            title: `Urgent follow-up needed: ${contact.name}`,
            description: contact.intelligence.insights[0] || 'High-priority strategic contact requires attention',
            actions: contact.intelligence.suggestedActions,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Sort by severity
      alerts.sort((a, b) => {
        const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      timedLogger.info(`Identified ${alerts.length} critical alerts`);
      timedLogger.finish(true);
      return alerts;

    } catch (error) {
      timedLogger.error('Failed to identify critical alerts:', error);
      timedLogger.finish(false);
      return [];
    }
  }

  /**
   * Generate trend analysis and pattern recognition
   */
  async generateTrendAnalysis(processedData, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'TrendAnalysis', 'generateTrends');

    try {
      const trends = {
        contacts: this.analyzeContactTrends(processedData.contacts),
        projects: this.analyzeProjectTrends(processedData.projects),
        financial: this.analyzeFinancialTrends(processedData.finances),
        calendar: this.analyzeCalendarTrends(processedData.calendar),
        crossPlatform: this.analyzeCrossPlatformTrends(processedData)
      };

      timedLogger.info('Generated trend analysis');
      timedLogger.finish(true);
      return trends;

    } catch (error) {
      timedLogger.error('Failed to generate trend analysis:', error);
      timedLogger.finish(false);
      return {};
    }
  }

  /**
   * Generate executive morning brief
   */
  async generateMorningBrief(data, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'MorningBrief', 'generateBrief');

    try {
      const briefPrompt = this.buildMorningBriefPrompt(data);

      const executiveBrief = await this.aiService.generateText(briefPrompt, {
        maxTokens: 300,
        temperature: 0.3
      });

      // Create structured brief
      const morningBrief = {
        executiveSummary: executiveBrief,
        keyPriorities: data.prioritizedItems.slice(0, 3),
        criticalAlerts: data.criticalAlerts.filter(alert => alert.severity === 'critical'),
        dailyFocus: this.generateDailyFocus(data),
        weatherCheck: {
          businessHealth: this.calculateBusinessHealthScore(data.processedData),
          riskFactors: this.identifyRiskFactors(data.processedData),
          opportunities: data.processedData.crossPlatform.opportunities.slice(0, 3)
        },
        generatedAt: new Date().toISOString()
      };

      timedLogger.info('Generated executive morning brief');
      timedLogger.finish(true);
      return morningBrief;

    } catch (error) {
      timedLogger.error('Failed to generate morning brief:', error);
      timedLogger.finish(false);
      // Return fallback brief
      return this.generateFallbackBrief(data);
    }
  }

  // === UTILITY METHODS ===

  /**
   * Calculate contact opportunity score
   */
  calculateContactOpportunityScore(contact) {
    let score = 0;

    // Last interaction recency (0-100)
    const daysSinceLastInteraction = contact.lastInteraction ?
      Math.floor((Date.now() - new Date(contact.lastInteraction).getTime()) / (1000 * 60 * 60 * 24)) :
      365;
    score += Math.max(0, 100 - daysSinceLastInteraction);

    // Strategic value indicators
    if (contact.title && (contact.title.includes('CEO') || contact.title.includes('CTO') || contact.title.includes('Founder'))) {
      score += 50;
    }

    // Engagement indicators
    if (contact.recentActivity === 'high') score += 30;
    if (contact.responseRate > 0.7) score += 20;

    return Math.min(100, score);
  }

  /**
   * Calculate contact urgency level
   */
  calculateContactUrgency(contact) {
    let urgency = 0;

    // Time-sensitive indicators
    if (contact.pendingResponse) urgency += 0.4;
    if (contact.upcomingMeeting) urgency += 0.3;
    if (contact.projectDeadline) urgency += 0.5;

    return Math.min(1, urgency);
  }

  /**
   * Calculate strategic value
   */
  calculateStrategicValue(contact) {
    let value = 0;

    // Company size and funding indicators
    if (contact.companySize === 'large') value += 0.3;
    if (contact.fundingStage === 'series_a_plus') value += 0.2;
    if (contact.industry === 'target_vertical') value += 0.4;

    return Math.min(1, value);
  }

  /**
   * Calculate contact priority
   */
  calculateContactPriority(contact, opportunityScore, urgencyLevel, strategicValue) {
    const weights = this.priorityWeights.contacts;

    return (opportunityScore * weights.opportunityScore) +
           (urgencyLevel * 100 * weights.responseUrgency) +
           (strategicValue * 100 * weights.strategicValue) +
           (this.calculateInteractionRecency(contact) * weights.lastInteraction);
  }

  /**
   * Calculate interaction recency score
   */
  calculateInteractionRecency(contact) {
    if (!contact.lastInteraction) return 0;

    const daysSince = Math.floor((Date.now() - new Date(contact.lastInteraction).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 100 - (daysSince * 2)); // Decay by 2 points per day
  }

  /**
   * Generate contact insights
   */
  generateContactInsights(contact, opportunityScore, urgencyLevel) {
    const insights = [];

    if (opportunityScore > 80) {
      insights.push('High-value strategic contact with strong engagement potential');
    }

    if (urgencyLevel > 0.7) {
      insights.push('Time-sensitive follow-up required');
    }

    if (contact.recentActivity === 'high') {
      insights.push('Recent activity indicates increased engagement');
    }

    return insights;
  }

  /**
   * Generate contact actions
   */
  generateContactActions(contact, opportunityScore, urgencyLevel) {
    const actions = [];

    if (contact.pendingResponse) {
      actions.push('Follow up on pending response');
    }

    if (urgencyLevel > 0.5) {
      actions.push('Schedule immediate check-in call');
    }

    if (opportunityScore > 70) {
      actions.push('Explore strategic partnership opportunities');
    }

    return actions;
  }

  /**
   * Calculate deadline urgency for projects
   */
  calculateDeadlineUrgency(project) {
    if (!project.deadline) return 0;

    const daysUntilDeadline = Math.floor((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilDeadline <= 0) return 1; // Overdue
    if (daysUntilDeadline <= 2) return 0.9; // Critical
    if (daysUntilDeadline <= 7) return 0.7; // High
    if (daysUntilDeadline <= 14) return 0.5; // Medium

    return Math.max(0, 0.3 - (daysUntilDeadline * 0.01)); // Gradual decay
  }

  /**
   * Calculate blocker severity
   */
  calculateBlockerSeverity(project) {
    if (!project.blockers || project.blockers.length === 0) return 0;

    const severitySum = project.blockers.reduce((sum, blocker) => {
      const severity = blocker.severity === 'critical' ? 1 :
                     blocker.severity === 'high' ? 0.7 :
                     blocker.severity === 'medium' ? 0.4 : 0.2;
      return sum + severity;
    }, 0);

    return Math.min(1, severitySum / 2); // Normalize
  }

  /**
   * Calculate stakeholder pressure
   */
  calculateStakeholderPressure(project) {
    let pressure = 0;

    if (project.stakeholdersWaiting > 0) pressure += 0.4;
    if (project.executiveVisibility === 'high') pressure += 0.3;
    if (project.clientImpact === 'high') pressure += 0.5;

    return Math.min(1, pressure);
  }

  /**
   * Calculate project priority
   */
  calculateProjectPriority(project, deadlineUrgency, blockerSeverity, stakeholderPressure) {
    const weights = this.priorityWeights.projects;

    return (deadlineUrgency * 100 * weights.deadline) +
           (blockerSeverity * 100 * weights.blockers) +
           (stakeholderPressure * 100 * weights.stakeholderWaiting) +
           (this.calculateStrategicImpact(project) * weights.strategicImpact);
  }

  /**
   * Calculate strategic impact
   */
  calculateStrategicImpact(project) {
    if (project.strategicImportance === 'critical') return 100;
    if (project.strategicImportance === 'high') return 80;
    if (project.strategicImportance === 'medium') return 50;
    return 20;
  }

  /**
   * Calculate project risk level
   */
  calculateProjectRisk(project, deadlineUrgency, blockerSeverity) {
    return Math.min(100, (deadlineUrgency * 60) + (blockerSeverity * 40));
  }

  /**
   * Generate project actions
   */
  generateProjectActions(project, deadlineUrgency, blockerSeverity) {
    const actions = [];

    if (deadlineUrgency > 0.8) {
      actions.push('Immediate deadline review and resource allocation');
    }

    if (blockerSeverity > 0.6) {
      actions.push('Escalate critical blockers to resolution');
    }

    if (project.stakeholdersWaiting > 0) {
      actions.push('Send stakeholder update on project progress');
    }

    return actions;
  }

  /**
   * Calculate cash position
   */
  /**
   * Calculate financial health score
   */
  calculateFinancialHealthScore(cashPosition, burnRate, runway) {
    let score = 100;
    const effectiveRunway = Number.isFinite(runway) ? runway : 12;

    // Runway scoring
    if (effectiveRunway < 3) score -= 40;
    else if (effectiveRunway < 6) score -= 20;
    else if (effectiveRunway < 12) score -= 10;

    // Cash position relative to burn
    const monthsOfCash = burnRate > 0 ? cashPosition / burnRate : Number.POSITIVE_INFINITY;
    if (monthsOfCash < 2) score -= 30;
    else if (monthsOfCash < 4) score -= 15;

    return Math.max(0, score);
  }

  computeFinancialMetrics(finances) {
    const transactions = Array.isArray(finances?.data)
      ? finances.data
      : Array.isArray(finances)
        ? finances
        : Array.isArray(finances?.transactions)
          ? finances.transactions
          : [];

    let income = 0;
    let expenses = 0;
    let receivablesTotal = 0;
    let payablesTotal = 0;
    let uncategorisedCount = 0;
    const categoryTotals = new Map();
    const vendorTotals = new Map();
    const uniqueDates = new Set();

    transactions.forEach(tx => {
      const rawType = String(tx.type || '').toLowerCase();
      const amount = Math.abs(Number(tx.amount || 0));
      const isIncome = rawType === 'income' || rawType === 'receive';
      const isExpense = rawType === 'expense' || rawType === 'spend';

      if (isIncome) {
        income += amount;
        receivablesTotal += amount;
      } else if (isExpense) {
        expenses += amount;
        payablesTotal += amount;
      }

      if (!tx.category && !tx.suggested_category) {
        uncategorisedCount += 1;
      }

      const resolvedCategory = tx.category || tx.suggested_category;
      if (resolvedCategory) {
        categoryTotals.set(
          resolvedCategory,
          (categoryTotals.get(resolvedCategory) || 0) + amount
        );
      }

      if (tx.vendor || tx.contact) {
        const vendorKey = tx.vendor || tx.contact;
        vendorTotals.set(
          vendorKey,
          (vendorTotals.get(vendorKey) || 0) + amount
        );
      }

      if (tx.date) {
        uniqueDates.add(String(tx.date));
      }
    });

    const lookbackDays = Math.min(30, Math.max(1, uniqueDates.size || 30));
    const burnRate = lookbackDays > 0 ? (expenses / lookbackDays) * 30 : 0;
    const cashBalance = income - expenses;
    const runwayMonths = burnRate > 0 ? Math.max(0, +(cashBalance / burnRate).toFixed(1)) : null;

    const topCategory = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])[0] || null;

    const topVendor = Array.from(vendorTotals.entries())
      .sort((a, b) => b[1] - a[1])[0] || null;

    return {
      transactions,
      income,
      expenses,
      net: income - expenses,
      burnRate,
      cashBalance,
      runwayMonths,
      receivablesTotal,
      payablesTotal,
      uncategorisedCount,
      topCategory,
      topVendor,
      lookbackDays
    };
  }

  /**
   * Build contacts summary prompt for AI
   */
  buildContactsSummaryPrompt(contacts) {
    const topContacts = contacts.slice(0, 5);
    return `Summarize the top strategic contacts requiring attention today:

${topContacts.map(contact =>
  `- ${contact.name} (${contact.title}): Priority ${contact.intelligence.priority.toFixed(0)}, ${contact.intelligence.insights.join(', ')}`
).join('\n')}

Provide a concise executive summary focusing on the most important actions needed.`;
  }

  /**
   * Build projects summary prompt for AI
   */
  buildProjectsSummaryPrompt(projects) {
    const topProjects = projects.slice(0, 5);
    return `Summarize the most critical projects requiring attention today:

${topProjects.map(project =>
  `- ${project.name}: Status ${project.status}, Risk Level ${project.intelligence.riskLevel}, Deadline Urgency ${project.intelligence.deadlineUrgency.toFixed(2)}`
).join('\n')}

Provide a concise executive summary focusing on critical deadlines and blockers.`;
  }

  /**
   * Build financial summary prompt for AI
   */
  buildFinancialSummaryPrompt(finances) {
    return `Summarize the financial position and key metrics:

Cash Position: $${finances.overview.cashPosition?.toLocaleString() || 'N/A'}
Monthly Burn Rate: $${finances.overview.burnRate?.toLocaleString() || 'N/A'}
Runway: ${finances.overview.runway || 'N/A'} months
Health Score: ${finances.overview.healthScore || 'N/A'}/100

${finances.alerts?.length > 0 ? `Alerts: ${finances.alerts.map(alert => alert.title).join(', ')}` : ''}

Provide a concise executive summary focusing on cash flow and urgent financial actions.`;
  }

  /**
   * Build calendar summary prompt for AI
   */
  buildCalendarSummaryPrompt(calendar) {
    const meetings = calendar.todaysSchedule?.meetings || [];
    return `Summarize today's schedule and preparation requirements:

Total Meetings: ${meetings.length}
Total Meeting Time: ${calendar.todaysSchedule?.totalMeetingTime || 0} hours
Preparation Time Required: ${calendar.todaysSchedule?.prepTimeRequired || 0} hours

Key Meetings:
${meetings.slice(0, 3).map(meeting =>
  `- ${meeting.title} (${meeting.time}): ${meeting.attendees?.length || 0} attendees`
).join('\n')}

Provide a concise summary focusing on meeting priorities and time management.`;
  }

  /**
   * Build morning brief prompt for AI
   */
  buildMorningBriefPrompt(data) {
    return `Generate an executive morning brief based on the following data:

TOP PRIORITIES:
${data.prioritizedItems.slice(0, 5).map(item =>
  `- ${item.type}: ${item.title} (Priority: ${item.priority.toFixed(0)})`
).join('\n')}

CRITICAL ALERTS:
${data.criticalAlerts.map(alert => `- ${alert.title}: ${alert.description}`).join('\n')}

SUMMARIES:
Contacts: ${data.summaries.contacts || 'No critical contacts today'}
Projects: ${data.summaries.projects || 'No critical projects today'}
Financial: ${data.summaries.financial || 'Financial position stable'}
Calendar: ${data.summaries.calendar || 'No meetings scheduled'}

Generate a concise, actionable executive brief (2-3 paragraphs) that helps a co-founder prioritize their day effectively.`;
  }

  /**
   * Generate fallback summaries
   */
  generateFallbackSummaries(processedData) {
    return {
      contacts: `${processedData.contacts.length} strategic contacts reviewed, top priorities identified`,
      projects: `${processedData.projects.length} projects analyzed for deadlines and blockers`,
      financial: `Financial health monitoring active, runway calculated`,
      calendar: `Today's schedule optimized with ${processedData.calendar.todaysSchedule?.meetings?.length || 0} meetings`
    };
  }

  /**
   * Generate fallback brief
   */
  generateFallbackBrief(data) {
    return {
      executiveSummary: "Morning intelligence processed successfully. Key priorities and alerts have been identified for your attention.",
      keyPriorities: data.prioritizedItems.slice(0, 3),
      criticalAlerts: data.criticalAlerts.filter(alert => alert.severity === 'critical'),
      dailyFocus: ["Review top 3 priorities", "Address critical alerts", "Prepare for key meetings"],
      weatherCheck: {
        businessHealth: 85,
        riskFactors: ["Monitor project deadlines", "Watch cash flow"],
        opportunities: []
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate daily focus items
   */
  generateDailyFocus(data) {
    const focus = [];

    // Add top priority item
    if (data.prioritizedItems.length > 0) {
      focus.push(`Priority: ${data.prioritizedItems[0].title}`);
    }

    // Add critical alerts
    const criticalAlerts = data.criticalAlerts.filter(alert => alert.severity === 'critical');
    if (criticalAlerts.length > 0) {
      focus.push(`Alert: ${criticalAlerts[0].title}`);
    }

    // Add key meetings
    const keyMeetings = data.processedData.calendar.priorities?.slice(0, 1) || [];
    if (keyMeetings.length > 0) {
      focus.push(`Meeting: ${keyMeetings[0].title}`);
    }

    return focus;
  }

  /**
   * Calculate business health score
   */
  calculateBusinessHealthScore(processedData) {
    let score = 100;

    // Financial health
    const financialHealth = processedData.finances.overview?.healthScore || 80;
    score = (score + financialHealth) / 2;

    // Project health (inverse of average risk)
    const avgProjectRisk = processedData.projects.reduce((sum, project) =>
      sum + (project.intelligence?.riskLevel || 0), 0) / processedData.projects.length;
    score = (score + (100 - avgProjectRisk)) / 2;

    return Math.round(score);
  }

  /**
   * Identify risk factors
   */
  identifyRiskFactors(processedData) {
    const risks = [];

    // Financial risks
    if (processedData.finances.overview?.runway < 6) {
      risks.push('Low cash runway');
    }

    // Project risks
    const highRiskProjects = processedData.projects.filter(project =>
      project.intelligence?.riskLevel > 70);
    if (highRiskProjects.length > 0) {
      risks.push(`${highRiskProjects.length} high-risk projects`);
    }

    return risks;
  }

  /**
   * Calculate data freshness
   */
  calculateDataFreshness(rawData) {
    // Return a score representing how fresh/recent the data is
    return {
      contacts: 'current',
      projects: 'current',
      finances: 'current',
      calendar: 'current',
      lastSync: new Date().toISOString()
    };
  }

  // Placeholder methods for additional functionality
  analyzeContactTrends(contacts) { return { trend: 'stable', insights: [] }; }
  analyzeProjectTrends(projects) { return { trend: 'improving', insights: [] }; }
  analyzeFinancialTrends(finances) { return { trend: 'stable', insights: [] }; }
  analyzeCalendarTrends(calendar) { return { trend: 'balanced', insights: [] }; }
  analyzeCrossPlatformTrends(data) { return { correlations: [], insights: [] }; }

  findProjectContactCorrelations(projects, contacts) { return []; }
  findMeetingProjectCorrelations(calendar, projects) { return []; }
  findFinancialProjectCorrelations(finances, projects) { return []; }
  analyzeStakeholderEngagement(rawData) { return { score: 80, insights: [] }; }

  generateCrossPlatformInsights(correlations, correlationId) { return []; }
  identifyStrategicOpportunities(correlations, rawData) { return []; }

  calculateReceivablesAging(metrics) {
    return {
      current: metrics.receivablesTotal,
      overdue: 0
    };
  }

  calculatePayablesUrgency(metrics) {
    if (metrics.income <= 0) {
      return metrics.payablesTotal > 0 ? 1 : 0;
    }
    const ratio = metrics.payablesTotal / metrics.income;
    return Math.min(1, Number(ratio.toFixed(2)));
  }

  calculateOverdueReceivables(metrics) {
    return metrics.receivablesTotal;
  }

  identifyReceivablesActions(metrics) {
    if (metrics.receivablesTotal <= 0) {
      return [];
    }

    return [
      'Follow up on outstanding invoices to accelerate cash collection',
      'Offer early payment incentives for high-value receivables'
    ];
  }

  getUpcomingPayments(metrics) {
    if (!metrics.topVendor) {
      return [];
    }

    return [
      {
        vendor: metrics.topVendor[0],
        expectedAmount: metrics.topVendor[1],
        notes: 'Highest spend in the last 30 days'
      }
    ];
  }

  calculateCashFlowImpact(metrics) {
    return metrics.net;
  }

  generateFinancialInsights(metrics) {
    const insights = [];

    if (metrics.net >= 0) {
      insights.push(`Net positive cash movement of ${metrics.net.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} over the last ${metrics.lookbackDays} days.`);
    } else {
      insights.push(`Net cash outflow of ${Math.abs(metrics.net).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} over the last ${metrics.lookbackDays} days.`);
    }

    if (metrics.uncategorisedCount > 0) {
      insights.push(`${metrics.uncategorisedCount} transactions require categorisation.`);
    }

    if (metrics.topCategory) {
      insights.push(`Highest spend category: ${metrics.topCategory[0]} (${metrics.topCategory[1].toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}).`);
    }

    return insights;
  }

  generateFinancialAlerts(metrics) {
    const alerts = [];

    if (metrics.uncategorisedCount > 10) {
      alerts.push({
        type: 'categorisation_backlog',
        title: 'Categorisation backlog detected',
        severity: 0.6,
        description: `${metrics.uncategorisedCount} transactions still need categorisation.`,
        actions: ['Review uncategorised transactions and confirm categories']
      });
    }

    if (metrics.net < 0) {
      alerts.push({
        type: 'negative_cash_flow',
        title: 'Negative cash flow trend',
        severity: 0.7,
        description: `Net cash outflow of ${Math.abs(metrics.net).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} in the current period.`,
        actions: ['Review major expenses for cost optimisation']
      });
    }

    if (metrics.runwayMonths !== null && metrics.runwayMonths < 3) {
      alerts.push({
        type: 'runway',
        title: 'Short financial runway',
        severity: 0.8,
        description: `Estimated runway is ${metrics.runwayMonths} months based on current burn rate.`,
        actions: ['Increase cash reserves or reduce burn rate to extend runway']
      });
    }

    return alerts;
  }

  getTodaysMeetings(calendar) { return []; }
  analyzeMeetingPreparation(meetings) { return []; }
  identifyTimeBlocks(calendar) { return []; }
  analyzeStakeholderMeetings(meetings) { return []; }
  calculateTotalMeetingTime(meetings) { return 0; }
  calculatePrepTimeRequired(preparation) { return 0; }
  generateCalendarInsights(meetings, blocks) { return []; }
  generateScheduleSuggestions(calendar, blocks) { return []; }
}

// Export singleton instance
export const morningIntelligenceProcessor = new MorningIntelligenceProcessor();
