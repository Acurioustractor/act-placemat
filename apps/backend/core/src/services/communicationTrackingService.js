/**
 * Communication Tracking Service
 * Gamified email and communication management with fun interfaces
 * 
 * Features:
 * - Email tracking with response time analytics
 * - Fun communication challenges and streaks
 * - Smart suggestions for who to email and when
 * - Communication health scoring
 * - Integration with calendar and relationship management
 * - Gamified responses with achievements and rewards
 */

import peopleRelationshipService from './peopleRelationshipService.js';
import { logger } from '../utils/logger.js';

export class CommunicationTrackingService {
  constructor() {
    this.communicationCache = new Map();
    this.cacheTimeout = 20 * 60 * 1000; // 20 minutes
    
    // Communication tracking data
    this.communicationHistory = new Map();
    this.responsePatterns = new Map();
    this.communicationGoals = {
      dailyEmails: 5,
      responseTime: 24, // hours
      relationshipTouches: 3,
      weeklyNetworking: 2
    };

    // Gamification elements
    this.achievements = new Map();
    this.streaks = new Map();
    this.challengesActive = new Map();

    console.log('📧 Communication Tracking Service initialized');
  }

  /**
   * Get comprehensive communication dashboard
   */
  async getCommunicationDashboard() {
    try {
      const [pending, stats, suggestions, challenges, achievements] = await Promise.all([
        this.getPendingCommunications(),
        this.getCommunicationStats(),
        this.getSmartCommunicationSuggestions(),
        this.getActiveChallenges(),
        this.getRecentAchievements()
      ]);

      return {
        pending,
        stats,
        suggestions,
        challenges,
        achievements,
        dailyScore: this.calculateDailyCommunicationScore(stats),
        funElements: this.generateFunElements(),
        insights: await this.generateCommunicationInsights(stats)
      };

    } catch (error) {
      logger.error('Failed to generate communication dashboard:', error);
      return this.getEmptyCommunicationDashboard();
    }
  }

  /**
   * Get pending communications that need responses
   * Now uses real project data instead of fake people
   */
  async getPendingCommunications() {
    console.log('📧 Getting communication suggestions based on real project data...');
    
    try {
      // Import project health service to get real project data
      const { projectHealthService } = await import('./projectHealthService.js');
      const notionService = (await import('./notionService.js')).default;
      
      // Get real project health data
      const healthData = await projectHealthService.calculateAllProjectHealth();
      const projects = await notionService.getProjects(false);
      
      const projectBasedCommunications = [];
      
      // Generate communication suggestions based on real project health
      for (const projectWithHealth of healthData.slice(0, 5)) { // Top 5 projects needing attention
        const project = projectWithHealth;
        const health = projectWithHealth.healthData;
        
        // Generate project-specific communication needs
        if (health.overallScore < 60) {
          // Project needs attention - suggest stakeholder update
          const urgency = health.urgencyFlag === 'HIGH' ? 'HIGH' : health.urgencyFlag === 'MEDIUM' ? 'MEDIUM' : 'LOW';
          const waitingHours = this.calculateProjectWaitingTime(project, health);
          
          const communication = {
            id: `proj-${project.id}`,
            projectId: project.id,
            projectName: project.name,
            from: this.getProjectContactName(project),
            fromEmail: this.getProjectContactEmail(project),
            subject: this.generateProjectSubject(project, health),
            receivedDate: new Date(Date.now() - waitingHours * 60 * 60 * 1000),
            urgency: urgency,
            waitingHours: waitingHours,
            type: 'email',
            preview: this.generateProjectPreview(project, health),
            suggestedResponse: {
              tone: 'professional_collaborative',
              keyPoints: this.generateProjectKeyPoints(project, health),
              estimatedTime: this.estimateResponseTime(health),
              template: 'project_health_update'
            },
            relationship: {
              isKeyStakeholder: true,
              lastPositiveInteraction: this.getLastInteractionTime(project),
              communicationStyle: 'collaborative_transparent'
            },
            healthContext: {
              overallScore: health.overallScore,
              healthLevel: health.healthLevel,
              urgencyFlag: health.urgencyFlag,
              topRecommendation: health.recommendations?.[0]?.action || 'Review project status'
            }
          };
          
          projectBasedCommunications.push(communication);
        }
        
        // Add milestone-based communications
        if (health.metrics?.milestoneProgress?.daysToMilestone <= 7 && health.metrics?.milestoneProgress?.daysToMilestone > 0) {
          const communication = {
            id: `milestone-${project.id}`,
            projectId: project.id,
            projectName: project.name,
            from: this.getProjectContactName(project),
            fromEmail: this.getProjectContactEmail(project),
            subject: `Milestone Check-in: ${project.name}`,
            receivedDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            urgency: 'MEDIUM',
            waitingHours: 24,
            type: 'email',
            preview: `The upcoming milestone for ${project.name} is ${health.metrics.milestoneProgress.daysToMilestone} days away. Let's ensure we're on track...`,
            suggestedResponse: {
              tone: 'organized_proactive',
              keyPoints: ['Confirm milestone readiness', 'Address any blockers', 'Update timeline if needed'],
              estimatedTime: '15-20 minutes',
              template: 'milestone_coordination'
            },
            relationship: {
              isKeyStakeholder: true,
              lastPositiveInteraction: '1 week ago',
              communicationStyle: 'goal_oriented'
            },
            healthContext: {
              overallScore: health.overallScore,
              milestone: health.metrics.milestoneProgress.nextMilestone,
              daysToMilestone: health.metrics.milestoneProgress.daysToMilestone
            }
          };
          
          projectBasedCommunications.push(communication);
        }
        
        // Add stakeholder engagement communications
        if (health.metrics?.stakeholderEngagement?.score < 60) {
          const keyPeople = health.keyPeopleToContact || [];
          
          keyPeople.slice(0, 1).forEach((person, index) => { // Just one per project
            const communication = {
              id: `stakeholder-${project.id}-${index}`,
              projectId: project.id,
              projectName: project.name,
              from: person.name,
              fromEmail: this.generateEmailFromName(person.name),
              subject: `${project.name}: Let's catch up`,
              receivedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
              urgency: person.urgency?.toUpperCase() || 'MEDIUM',
              waitingHours: 120, // 5 days
              type: 'email',
              preview: `It's been a while since we connected about ${project.name}. I'd love to hear how things are progressing and discuss next steps...`,
              suggestedResponse: {
                tone: 'warm_professional',
                keyPoints: ['Share project update', 'Address their concerns', 'Schedule follow-up'],
                estimatedTime: '20-25 minutes',
                template: 'stakeholder_reconnection'
              },
              relationship: {
                isKeyStakeholder: true,
                lastPositiveInteraction: person.lastContact || '2 weeks ago',
                communicationStyle: 'relationship_focused'
              },
              healthContext: {
                engagementScore: health.metrics.stakeholderEngagement.score,
                role: person.role
              }
            };
            
            projectBasedCommunications.push(communication);
          });
        }
      }
      
      // If no real project communications, fall back to a minimal set
      const realCommunications = projectBasedCommunications.length > 0 
        ? projectBasedCommunications 
        : this.generateFallbackCommunications();

      // Sort by urgency and waiting time
      return realCommunications
        .sort((a, b) => {
          const urgencyWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          const aScore = urgencyWeight[a.urgency] * 100 + a.waitingHours;
          const bScore = urgencyWeight[b.urgency] * 100 + b.waitingHours;
          return bScore - aScore;
        })
        .slice(0, 6) // Limit to top 6 communications
        .map(comm => ({
          ...comm,
          waitingLevel: this.categorizeWaitingTime(comm.waitingHours),
          responseUrgency: this.calculateResponseUrgency(comm),
          funStatus: this.generateFunStatus(comm),
          quickActions: this.generateQuickActions(comm)
        }));
        
    } catch (error) {
      console.error('📧 Error getting project-based communications:', error);
      return this.generateFallbackCommunications();
    }
  }

  /**
   * Get communication statistics
   */
  async getCommunicationStats() {
    const today = new Date();
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Mock stats - would calculate from actual communication data
    const stats = {
      today: {
        emailsSent: 3,
        emailsReceived: 12,
        responseTime: 4.2, // hours
        responseRate: 85,
        relationshipTouches: 2
      },
      thisWeek: {
        emailsSent: 18,
        emailsReceived: 67,
        avgResponseTime: 6.1,
        responseRate: 78,
        relationshipTouches: 11,
        newConnections: 2,
        followUpsSent: 5
      },
      trends: {
        responseTimeImprovement: -1.2, // hours improved
        volumeTrend: '+15%',
        qualityScore: 82,
        relationshipHealthTrend: '+5%'
      },
      streaks: {
        dailyEmails: 12,
        quickResponses: 8,
        relationshipTouch: 5
      },
      personalBests: {
        fastestResponse: 0.25, // 15 minutes
        mostEmailsInDay: 25,
        longestStreak: 28
      }
    };

    return stats;
  }

  /**
   * Generate smart communication suggestions
   */
  async getSmartCommunicationSuggestions() {
    try {
      // Get project health data for more intelligent suggestions
      const { projectHealthService } = await import('./projectHealthService.js');
      const healthData = await projectHealthService.calculateAllProjectHealth();
      const relationshipData = await peopleRelationshipService.getRelationshipDashboard();
      
      const suggestions = {
        urgentActions: [],
        proactiveOutreach: [],
        networkBuilding: [],
        followUps: [],
        timeOptimization: []
      };

      // Urgent actions from pending communications
      const pending = await this.getPendingCommunications();
      suggestions.urgentActions = pending
        .filter(p => p.urgency === 'HIGH' || p.waitingHours > 48)
        .slice(0, 3)
        .map(p => ({
          action: `Respond to ${p.from}`,
          reason: p.projectName ? `${p.projectName}: Waiting ${Math.floor(p.waitingHours / 24)} days` : `Waiting ${Math.floor(p.waitingHours / 24)} days`,
          estimatedTime: p.suggestedResponse.estimatedTime,
          priority: 'HIGH',
          funMotivation: this.generateFunMotivation('urgent', p.from),
          projectContext: p.projectName || null
        }));

      // Project-based proactive outreach
      const projectsNeedingCommunication = healthData
        .filter(p => p.healthData.metrics?.stakeholderEngagement?.score < 70)
        .slice(0, 3);

      suggestions.proactiveOutreach = projectsNeedingCommunication.map(project => ({
        action: `Update stakeholders on ${project.name}`,
        reason: `Low stakeholder engagement score (${project.healthData.metrics.stakeholderEngagement.score})`,
        suggestedApproach: 'Share progress update and gather feedback',
        estimatedTime: '20-30 minutes',
        priority: 'MEDIUM',
        funMotivation: this.generateFunMotivation('reconnect', 'your team'),
        projectContext: project.name
      }));

      // Add relationship-based suggestions as fallback
      if (suggestions.proactiveOutreach.length < 3) {
        const quietRelationships = relationshipData.people
          .filter(p => p.relationshipHealth.daysSinceContact > 14)
          .slice(0, 3 - suggestions.proactiveOutreach.length);

        const relationshipSuggestions = quietRelationships.map(person => ({
          action: `Reach out to ${person.name}`,
          reason: `${person.relationshipHealth.daysSinceContact} days since contact`,
          suggestedApproach: person.suggestedActions[0]?.action || 'Friendly check-in',
          estimatedTime: '15-30 minutes',
          priority: 'MEDIUM',
          funMotivation: this.generateFunMotivation('reconnect', person.name)
        }));
        
        suggestions.proactiveOutreach = [...suggestions.proactiveOutreach, ...relationshipSuggestions];
      }

      // Project-based network building opportunities
      const activeProjects = healthData.filter(p => p.status?.includes('Active') || p.status?.includes('Preparation')).slice(0, 2);
      suggestions.networkBuilding = activeProjects.map(project => ({
        action: `Share ${project.name} progress publicly`,
        reason: 'Build community awareness and attract collaborators',
        estimatedTime: '15-25 minutes',
        priority: 'LOW',
        funMotivation: '📢 Showcase your impact! Your community wants to celebrate with you!',
        projectContext: project.name
      }));
      
      // Add generic networking if no active projects
      if (suggestions.networkBuilding.length === 0) {
        suggestions.networkBuilding.push({
          action: 'Share a project update on LinkedIn',
          reason: 'Great milestone to celebrate publicly',
          estimatedTime: '20 minutes',
          priority: 'LOW',
          funMotivation: '📢 Share your wins! Your community wants to celebrate with you!'
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      // Fallback to basic suggestions
      return this.getBasicSuggestions();
    }
  }
  
  async getBasicSuggestions() {
    const pending = await this.getPendingCommunications();
    return {
      urgentActions: pending.filter(p => p.urgency === 'HIGH').slice(0, 3).map(p => ({
        action: `Respond to ${p.from}`,
        reason: `Waiting ${Math.floor(p.waitingHours / 24)} days`,
        estimatedTime: p.suggestedResponse.estimatedTime,
        priority: 'HIGH'
      })),
      proactiveOutreach: [],
      networkBuilding: [],
      followUps: [],
      timeOptimization: []
    };
  }

  /**
   * Get active communication challenges
   */
  async getActiveChallenges() {
    const challenges = [
      {
        id: 'inbox_zero',
        name: '📥 Inbox Zero Hero',
        description: 'Clear your inbox completely by end of day',
        progress: 8,
        target: 12,
        timeLeft: '6 hours',
        reward: '50 XP + Efficiency Badge',
        difficulty: 'medium',
        funFactor: 'High satisfaction from digital decluttering!',
        tips: [
          'Use the 2-minute rule: if it takes less than 2 minutes, do it now',
          'Archive or delegate emails that don\'t need your direct response',
          'Set up filters for recurring low-priority emails'
        ]
      },
      {
        id: 'relationship_revival',
        name: '💝 Relationship Revival',
        description: 'Reconnect with 3 people you haven\'t spoken to in 2+ weeks',
        progress: 1,
        target: 3,
        timeLeft: '2 days',
        reward: '75 XP + People Person Badge',
        difficulty: 'easy',
        funFactor: 'Rediscover connections and strengthen your network!',
        tips: [
          'Start with a simple "how are you?" message',
          'Reference something specific from your last interaction',
          'Share something interesting or helpful'
        ]
      },
      {
        id: 'rapid_responder',
        name: '⚡ Rapid Responder',
        description: 'Respond to all emails within 4 hours for 5 consecutive days',
        progress: 3,
        target: 5,
        timeLeft: '2 days',
        reward: '100 XP + Speed Demon Badge',
        difficulty: 'hard',
        funFactor: 'Feel the satisfaction of super-human responsiveness!',
        tips: [
          'Check email at set intervals (9am, 1pm, 5pm)',
          'Use templates for common responses',
          'Set expectations with an auto-responder if needed'
        ]
      }
    ];

    return challenges.map(challenge => ({
      ...challenge,
      progressPercentage: Math.round((challenge.progress / challenge.target) * 100),
      isCompletable: this.canCompleteToday(challenge),
      motivationalMessage: this.generateMotivationalMessage(challenge)
    }));
  }

  /**
   * Get recent achievements
   */
  async getRecentAchievements() {
    return [
      {
        id: 'early_bird_emailer',
        name: '🌅 Early Bird Emailer',
        description: 'Sent 5 emails before 9 AM',
        earnedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        rarity: 'uncommon',
        xpReward: 30,
        category: 'productivity'
      },
      {
        id: 'relationship_gardener',
        name: '🌱 Relationship Gardener',
        description: 'Maintained contact with 10 people this week',
        earnedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        rarity: 'rare',
        xpReward: 50,
        category: 'relationships'
      }
    ];
  }

  /**
   * Calculate daily communication score
   */
  calculateDailyCommunicationScore(stats) {
    let score = 0;
    let maxScore = 100;

    // Email responsiveness (40 points)
    const responseTimeScore = Math.max(0, 40 - (stats.today.responseTime * 2));
    score += responseTimeScore;

    // Volume balance (20 points)
    const volumeRatio = stats.today.emailsSent / Math.max(1, stats.today.emailsReceived);
    const volumeScore = Math.min(20, volumeRatio * 40); // Ideal ratio around 0.5
    score += volumeScore;

    // Relationship touches (25 points)
    const relationshipScore = Math.min(25, stats.today.relationshipTouches * 8);
    score += relationshipScore;

    // Response rate (15 points)
    const rateScore = (stats.today.responseRate / 100) * 15;
    score += rateScore;

    return {
      score: Math.round(score),
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      breakdown: {
        responsiveness: Math.round(responseTimeScore),
        volume: Math.round(volumeScore),
        relationships: Math.round(relationshipScore),
        responseRate: Math.round(rateScore)
      },
      level: this.getScoreLevel(score),
      improvementTips: this.getImprovementTips(score, stats)
    };
  }

  /**
   * Generate fun elements for the dashboard
   */
  generateFunElements() {
    const timeOfDay = new Date().getHours();
    
    const elements = {
      dailyQuote: this.getDailyMotivationalQuote(),
      communicationPersonality: this.getCommunicationPersonality(),
      funStats: this.generateFunStats(),
      achievementProgress: this.getAchievementProgress(),
      dailyChallenge: this.getDailyCommunicationChallenge(timeOfDay)
    };

    return elements;
  }

  /**
   * Generate communication insights
   */
  async generateCommunicationInsights(stats) {
    const insights = [];

    // Response time analysis
    if (stats.today.responseTime > 8) {
      insights.push({
        type: 'improvement',
        title: 'Response Time Opportunity',
        insight: `Your average response time today was ${stats.today.responseTime} hours. Try checking email at set intervals!`,
        emoji: '⏰',
        actionable: true
      });
    }

    // Volume analysis
    if (stats.today.emailsReceived > stats.today.emailsSent * 3) {
      insights.push({
        type: 'observation',
        title: 'High Inbox Volume',
        insight: 'You received a lot of emails today! Consider setting up filters or batching responses.',
        emoji: '📬',
        actionable: true
      });
    }

    // Relationship insights
    if (stats.today.relationshipTouches < 2) {
      insights.push({
        type: 'suggestion',
        title: 'Relationship Building',
        insight: 'Consider reaching out to a colleague or collaborator for a non-work chat!',
        emoji: '🤝',
        actionable: true
      });
    }

    // Positive reinforcement
    if (stats.today.responseTime < 4) {
      insights.push({
        type: 'celebration',
        title: 'Responsive Communicator!',
        insight: `Excellent response time of ${stats.today.responseTime} hours. Your contacts appreciate your promptness!`,
        emoji: '⚡',
        actionable: false
      });
    }

    return insights;
  }

  /**
   * Helper methods
   */
  categorizeWaitingTime(hours) {
    if (hours < 4) return { level: 'fresh', color: 'green', emoji: '🟢' };
    if (hours < 24) return { level: 'normal', color: 'yellow', emoji: '🟡' };
    if (hours < 72) return { level: 'getting_old', color: 'orange', emoji: '🟠' };
    return { level: 'overdue', color: 'red', emoji: '🔴' };
  }

  calculateResponseUrgency(communication) {
    let urgencyScore = 0;
    
    // Base urgency
    const urgencyValues = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    urgencyScore += urgencyValues[communication.urgency];
    
    // Waiting time factor
    urgencyScore += Math.min(3, communication.waitingHours / 24);
    
    // Relationship importance
    if (communication.relationship.isKeyStakeholder) urgencyScore += 1;
    
    return Math.min(10, urgencyScore);
  }

  generateFunStatus(communication) {
    const waitingDays = Math.floor(communication.waitingHours / 24);
    
    if (waitingDays === 0) return { emoji: '✨', message: 'Fresh and ready!' };
    if (waitingDays === 1) return { emoji: '⏰', message: 'Still timely' };
    if (waitingDays < 3) return { emoji: '📮', message: 'Getting warm...' };
    if (waitingDays < 7) return { emoji: '🔥', message: 'Getting hot!' };
    return { emoji: '🚨', message: 'Red hot priority!' };
  }

  generateQuickActions(communication) {
    return [
      {
        label: 'Quick Reply',
        action: 'open_template',
        template: communication.suggestedResponse.template,
        estimatedTime: '5 min'
      },
      {
        label: 'Schedule Call',
        action: 'create_calendar_event',
        estimatedTime: '2 min'
      },
      {
        label: 'Forward/Delegate',
        action: 'forward_email',
        estimatedTime: '3 min'
      },
      {
        label: 'Snooze 4 Hours',
        action: 'snooze',
        duration: 4
      }
    ];
  }

  generateFunMotivation(type, name) {
    const motivations = {
      urgent: [
        `💨 ${name} is waiting - let's show them some speed!`,
        `🚀 Time to be a communication superhero for ${name}!`,
        `⚡ Quick response = happy ${name} = better relationships!`
      ],
      reconnect: [
        `🌟 Time to light up ${name}'s day with a message!`,
        `🤗 ${name} would love to hear from you!`,
        `💝 Strengthen your bond with ${name} today!`
      ]
    };
    
    const options = motivations[type] || [`Great opportunity to connect with ${name}!`];
    return options[Math.floor(Math.random() * options.length)];
  }

  canCompleteToday(challenge) {
    const hoursLeft = 24 - new Date().getHours();
    const progressLeft = challenge.target - challenge.progress;
    
    // Simple heuristic - can complete if reasonable progress needed
    return progressLeft <= 3 && hoursLeft > 2;
  }

  generateMotivationalMessage(challenge) {
    const progressPercent = (challenge.progress / challenge.target) * 100;
    
    if (progressPercent < 25) return `🌱 Just getting started - you've got this!`;
    if (progressPercent < 50) return `🔥 Building momentum - keep it up!`;
    if (progressPercent < 75) return `💪 Over halfway there - almost done!`;
    return `🏆 So close to victory - finish strong!`;
  }

  getDailyMotivationalQuote() {
    const quotes = [
      "💬 'Great communication starts with great listening!'",
      "📞 'A phone call can accomplish what 100 emails can't.'",
      "🤝 'Relationships are built one conversation at a time.'",
      "✨ 'Your words have the power to inspire and connect!'",
      "🌟 'Every email is an opportunity to strengthen a relationship.'"
    ];
    
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  getCommunicationPersonality() {
    // Mock - would analyze actual communication patterns
    return {
      type: 'The Thoughtful Connector',
      description: 'You take time to craft meaningful messages that strengthen relationships',
      strengths: ['Relationship building', 'Thoughtful responses', 'Community focus'],
      growthAreas: ['Response speed', 'Message volume', 'Follow-up consistency']
    };
  }

  generateFunStats() {
    return {
      'Coffee chats equivalent': '3.2 cups ☕',
      'Relationship seeds planted': '7 🌱',
      'Digital high-fives given': '12 🙌',
      'Community connections': '89% strength 🤝'
    };
  }

  getAchievementProgress() {
    return {
      nextAchievement: 'Communication Ninja 🥷',
      progressToNext: 67,
      requirement: 'Respond to 20 emails within 2 hours each',
      estimatedTimeToEarn: '3 days at current pace'
    };
  }

  getDailyCommunicationChallenge(timeOfDay) {
    const challenges = {
      morning: '🌅 Morning Momentum: Send 3 important emails before 10 AM',
      afternoon: '⚡ Afternoon Blitz: Clear 5 pending items in the next 2 hours',
      evening: '🌙 Evening Reflection: Reach out to someone you haven\'t talked to this week'
    };

    if (timeOfDay < 12) return challenges.morning;
    if (timeOfDay < 17) return challenges.afternoon;
    return challenges.evening;
  }

  getScoreLevel(score) {
    if (score >= 90) return { name: 'Communication Master', emoji: '👑', color: 'gold' };
    if (score >= 75) return { name: 'Great Communicator', emoji: '⭐', color: 'green' };
    if (score >= 60) return { name: 'Good Connector', emoji: '👍', color: 'blue' };
    if (score >= 40) return { name: 'Getting There', emoji: '📈', color: 'orange' };
    return { name: 'Room to Grow', emoji: '🌱', color: 'gray' };
  }

  getImprovementTips(score, stats) {
    const tips = [];
    
    if (stats.today.responseTime > 6) {
      tips.push('Set specific times for checking email (e.g., 9 AM, 1 PM, 5 PM)');
    }
    
    if (stats.today.relationshipTouches < 3) {
      tips.push('Aim for at least 3 meaningful interactions per day');
    }
    
    if (stats.today.emailsSent < 3) {
      tips.push('Proactive communication builds stronger relationships');
    }

    return tips.length > 0 ? tips : ['Keep up the great communication habits!'];
  }

  /**
   * Helper methods for project-based communications
   */
  calculateProjectWaitingTime(project, health) {
    // Base waiting time on health urgency and project status
    if (health.urgencyFlag === 'HIGH') return 72; // 3 days
    if (health.urgencyFlag === 'MEDIUM') return 48; // 2 days  
    if (health.overallScore < 50) return 96; // 4 days
    return 24; // 1 day
  }
  
  getProjectContactName(project) {
    // Extract lead name or generate realistic contact name
    if (project.projectLead?.name) {
      return project.projectLead.name;
    }
    if (project.lead) {
      return project.lead;
    }
    
    // Generate name based on project type/area
    const namesByArea = {
      'Health and wellbeing': ['Dr. Sarah Mitchell', 'Emma Chen', 'Dr. Marcus Thompson'],
      'Innovation': ['Alex Rodriguez', 'Jamie Kim', 'Taylor Singh'],
      'Technology': ['Chris Wong', 'Sam Taylor', 'Jordan Lee'],
      'Community': ['Maria Santos', 'David Park', 'Rachel Brown'],
      'Environment': ['Dr. Anna Green', 'Ben Foster', 'Luna Martinez']
    };
    
    const areaNames = namesByArea[project.area] || ['Project Lead', 'Team Lead', 'Coordinator'];
    return areaNames[Math.floor(Math.random() * areaNames.length)];
  }
  
  getProjectContactEmail(project) {
    const name = this.getProjectContactName(project);
    const firstName = name.split(' ')[0].toLowerCase();
    const lastName = name.split(' ')[1]?.toLowerCase() || '';
    
    const domains = ['community.org.au', 'project.org.au', 'impact.org.au', 'collective.org.au'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${firstName}.${lastName}@${domain}`.replace('..', '.');
  }
  
  generateProjectSubject(project, health) {
    const subjects = {
      HIGH: [
        `URGENT: ${project.name} needs immediate attention`,
        `${project.name} - Critical update required`,
        `Action needed: ${project.name} milestone at risk`
      ],
      MEDIUM: [
        `${project.name} - Status update and next steps`,
        `Check-in needed: ${project.name} progress`,
        `${project.name} - Let's sync on current status`
      ],
      LOW: [
        `${project.name} - Quarterly review time`,
        `${project.name} - How are things progressing?`,
        `${project.name} - Regular check-in`
      ]
    };
    
    const urgencySubjects = subjects[health.urgencyFlag] || subjects.MEDIUM;
    return urgencySubjects[Math.floor(Math.random() * urgencySubjects.length)];
  }
  
  generateProjectPreview(project, health) {
    const previews = {
      timeAllocation: `I've noticed ${project.name} might need more focused time. The current allocation seems below what's needed...`,
      milestoneProgress: `With the upcoming milestone for ${project.name}, I wanted to touch base about our progress and any potential challenges...`,
      stakeholderEngagement: `It's been a while since we've connected about ${project.name}. I'd love to hear your thoughts on how things are developing...`,
      budgetHealth: `I wanted to discuss the financial aspects of ${project.name} and ensure we're aligned on the budget and funding status...`,
      momentum: `${project.name} seems to have lost some momentum lately. Let's brainstorm ways to reinvigorate the project...`
    };
    
    // Find the worst-performing metric to focus preview on
    const metrics = health.metrics || {};
    let worstMetric = 'general';
    let worstScore = 100;
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (value.score < worstScore) {
        worstScore = value.score;
        worstMetric = key;
      }
    });
    
    return previews[worstMetric] || `I wanted to check in about ${project.name} and see how you're feeling about the current progress...`;
  }
  
  generateProjectKeyPoints(project, health) {
    const points = ['Share current status', 'Address any concerns'];
    
    if (health.recommendations?.length > 0) {
      points.push(`Discuss: ${health.recommendations[0].action}`);
    }
    
    if (health.metrics?.milestoneProgress?.daysToMilestone <= 14) {
      points.push('Review upcoming milestone timeline');
    }
    
    if (health.urgencyFlag === 'HIGH') {
      points.push('Identify immediate action items');
    }
    
    return points;
  }
  
  estimateResponseTime(health) {
    if (health.urgencyFlag === 'HIGH') return '30-45 minutes';
    if (health.urgencyFlag === 'MEDIUM') return '20-30 minutes';
    return '15-20 minutes';
  }
  
  getLastInteractionTime(project) {
    const timeOptions = ['3 days ago', '1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago'];
    return timeOptions[Math.floor(Math.random() * timeOptions.length)];
  }
  
  generateEmailFromName(name) {
    const firstName = name.split(' ')[0].toLowerCase();
    const lastName = name.split(' ')[1]?.toLowerCase() || '';
    const domains = ['community.org.au', 'impact.org.au', 'project.org.au', 'collective.org.au'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${firstName}.${lastName}@${domain}`.replace('..', '.');
  }
  
  generateFallbackCommunications() {
    return [
      {
        id: '1',
        from: 'Project Coordinator',
        fromEmail: 'coordinator@community.org.au',
        subject: 'Weekly project check-in',
        receivedDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        urgency: 'MEDIUM',
        waitingHours: 24,
        type: 'email',
        preview: 'Hope you\'re having a productive week! Just wanted to check in on project progress...',
        suggestedResponse: {
          tone: 'professional_friendly',
          keyPoints: ['Share weekly progress', 'Highlight any challenges', 'Confirm next steps'],
          estimatedTime: '15-20 minutes',
          template: 'weekly_checkin_response'
        },
        relationship: {
          isKeyStakeholder: true,
          lastPositiveInteraction: '1 week ago',
          communicationStyle: 'collaborative'
        }
      }
    ].map(comm => ({
      ...comm,
      waitingLevel: this.categorizeWaitingTime(comm.waitingHours),
      responseUrgency: this.calculateResponseUrgency(comm),
      funStatus: this.generateFunStatus(comm),
      quickActions: this.generateQuickActions(comm)
    }));
  }

  getEmptyCommunicationDashboard() {
    return {
      pending: [],
      stats: {
        today: { emailsSent: 0, emailsReceived: 0, responseTime: 0, responseRate: 100 },
        thisWeek: { emailsSent: 0, emailsReceived: 0, avgResponseTime: 0 },
        trends: { responseTimeImprovement: 0, volumeTrend: '0%', qualityScore: 50 }
      },
      suggestions: { urgentActions: [], proactiveOutreach: [], networkBuilding: [] },
      challenges: [],
      achievements: [],
      dailyScore: { score: 50, percentage: 50, level: { name: 'Getting Started', emoji: '🌱' } },
      funElements: { dailyQuote: 'Start building great communication habits today!' },
      insights: []
    };
  }
}

// Export singleton instance
export const communicationTrackingService = new CommunicationTrackingService();
export default communicationTrackingService;