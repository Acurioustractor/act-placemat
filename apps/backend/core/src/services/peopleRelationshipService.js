/**
 * People & Relationship Management Service
 * Tracks relationships, communication patterns, and engagement strategies
 * 
 * Features:
 * - Relationship health scoring
 * - Communication tracking and reminders
 * - Smart suggestions for who to contact
 * - Integration with email and calendar systems
 * - Storyteller network management
 */

import notionService from './notionService.js';
import { logger } from '../utils/logger.js';

export class PeopleRelationshipService {
  constructor() {
    this.relationshipCache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    
    // Relationship health factors
    this.relationshipFactors = {
      communicationFrequency: 0.4,    // How often you communicate
      responseTime: 0.25,              // How quickly responses happen
      engagementDepth: 0.2,           // Quality of interactions
      mutualBenefit: 0.15            // Value exchange balance
    };

    console.log('👥 People Relationship Service initialized');
  }

  /**
   * Get comprehensive relationship dashboard
   */
  async getRelationshipDashboard() {
    try {
      const [people, recentCommunications, pendingActions] = await Promise.all([
        this.getAllPeopleWithHealth(),
        this.getRecentCommunications(),
        this.getPendingCommunications()
      ]);

      return {
        people,
        recentCommunications,
        pendingActions,
        insights: this.generateRelationshipInsights(people),
        dailyRecommendations: this.getDailyContactRecommendations(people)
      };

    } catch (error) {
      logger.error('Failed to generate relationship dashboard:', error);
      return this.getEmptyDashboard();
    }
  }

  /**
   * Get all people with relationship health scores
   */
  async getAllPeopleWithHealth() {
    try {
      const people = await notionService.getPeople(false); // Fresh data
      const peopleWithHealth = [];

      for (const person of people) {
        const relationshipHealth = await this.calculateRelationshipHealth(person);
        peopleWithHealth.push({
          ...person,
          relationshipHealth,
          communicationUrgency: this.calculateCommunicationUrgency(person, relationshipHealth),
          suggestedActions: this.generatePersonActions(person, relationshipHealth)
        });
      }

      // Sort by urgency (most urgent first)
      return peopleWithHealth.sort((a, b) => 
        this.getUrgencyScore(b.communicationUrgency) - this.getUrgencyScore(a.communicationUrgency)
      );

    } catch (error) {
      logger.error('Failed to get people with health scores:', error);
      return [];
    }
  }

  /**
   * Calculate relationship health score for a person
   */
  async calculateRelationshipHealth(person) {
    const cacheKey = `health_${person.id}_${Date.now()}`;
    
    if (this.relationshipCache.has(cacheKey)) {
      return this.relationshipCache.get(cacheKey);
    }

    const metrics = {
      communicationFrequency: this.calculateCommunicationFrequency(person),
      responseTime: this.calculateResponseTime(person),
      engagementDepth: this.calculateEngagementDepth(person),
      mutualBenefit: this.calculateMutualBenefit(person)
    };

    // Calculate weighted score
    const overallScore = Object.entries(metrics).reduce((score, [factor, value]) => {
      return score + (value.score * this.relationshipFactors[factor]);
    }, 0);

    const healthData = {
      overallScore: Math.round(overallScore),
      healthLevel: this.getRelationshipHealthLevel(overallScore),
      metrics,
      lastInteraction: this.getLastInteraction(person),
      daysSinceContact: this.calculateDaysSinceContact(person),
      relationship: this.categorizeRelationship(person),
      recommendations: this.generateRelationshipRecommendations(metrics, person)
    };

    // Cache the result
    this.relationshipCache.set(cacheKey, healthData);
    setTimeout(() => this.relationshipCache.delete(cacheKey), this.cacheTimeout);

    return healthData;
  }

  /**
   * Calculate communication frequency score
   */
  calculateCommunicationFrequency(person) {
    const daysSinceContact = this.calculateDaysSinceContact(person);
    const expectedFrequency = this.getExpectedContactFrequency(person);
    
    let score = 100;
    let status = 'excellent';
    let recommendation = 'Communication frequency is optimal';

    if (daysSinceContact > expectedFrequency * 3) {
      score = 20;
      status = 'poor';
      recommendation = `Haven't spoken in ${daysSinceContact} days - reach out soon`;
    } else if (daysSinceContact > expectedFrequency * 2) {
      score = 50;
      status = 'low';
      recommendation = `${daysSinceContact} days since contact - consider checking in`;
    } else if (daysSinceContact > expectedFrequency) {
      score = 75;
      status = 'moderate';
      recommendation = 'Due for regular check-in';
    }

    return {
      score,
      status,
      recommendation,
      daysSinceContact,
      expectedFrequency,
      contactRatio: expectedFrequency / Math.max(1, daysSinceContact)
    };
  }

  /**
   * Calculate response time health
   */
  calculateResponseTime(person) {
    // Mock calculation - would integrate with email/communication logs
    const avgResponseTime = this.getAverageResponseTime(person);
    
    let score = 85; // Default good score
    let status = 'good';
    
    if (avgResponseTime > 5) {
      score = 40;
      status = 'slow';
    } else if (avgResponseTime > 2) {
      score = 70;
      status = 'moderate';
    }

    return {
      score,
      status,
      recommendation: score < 60 ? 'Work on faster response times' : 'Response time is good',
      avgResponseTime,
      communicationStyle: this.inferCommunicationStyle(avgResponseTime)
    };
  }

  /**
   * Calculate engagement depth
   */
  calculateEngagementDepth(person) {
    const relationshipTypes = person.type || [];
    const roles = person.role || [];
    
    // Deeper relationships with collaborators vs casual contacts
    const depthFactors = {
      'Collaborator': 90,
      'Community Member': 70, 
      'Partner': 85,
      'Supporter': 60,
      'Contact': 40
    };

    const baseScore = relationshipTypes.reduce((score, type) => {
      return Math.max(score, depthFactors[type] || 50);
    }, 50);

    // Boost for active project involvement
    const hasActiveProject = roles.some(role => 
      role.includes('Lead') || role.includes('Coordinator') || role.includes('Partner')
    );

    const finalScore = hasActiveProject ? Math.min(100, baseScore + 15) : baseScore;

    return {
      score: finalScore,
      status: finalScore > 80 ? 'deep' : finalScore > 60 ? 'moderate' : 'surface',
      recommendation: finalScore < 60 ? 'Invest in deeper conversations' : 'Strong relationship depth',
      relationshipTypes,
      hasActiveProject,
      engagementIndicators: this.getEngagementIndicators(person)
    };
  }

  /**
   * Calculate mutual benefit score
   */
  calculateMutualBenefit(person) {
    // Mock analysis of value exchange - would integrate with project data
    const projects = person.projects || [];
    const skills = person.skills || [];
    
    const benefitScore = Math.min(100, projects.length * 20 + skills.length * 10);
    
    return {
      score: benefitScore,
      status: benefitScore > 70 ? 'mutual' : benefitScore > 40 ? 'developing' : 'one_sided',
      recommendation: benefitScore < 50 ? 'Explore ways to provide mutual value' : 'Good value exchange',
      sharedProjects: projects.length,
      complementarySkills: skills.length,
      opportunities: this.identifyOpportunities(person)
    };
  }

  /**
   * Generate relationship recommendations
   */
  generateRelationshipRecommendations(metrics, person) {
    const recommendations = [];

    // Communication frequency recommendations
    if (metrics.communicationFrequency.score < 60) {
      recommendations.push({
        type: 'communication',
        priority: 'high',
        action: `Reach out to ${person.name} - ${metrics.communicationFrequency.daysSinceContact} days since contact`,
        emoji: '📞',
        suggestedApproach: this.suggestCommunicationApproach(person)
      });
    }

    // Engagement depth recommendations
    if (metrics.engagementDepth.score < 70) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        action: 'Schedule deeper conversation or collaboration',
        emoji: '🤝',
        suggestedTopics: this.suggestConversationTopics(person)
      });
    }

    // Mutual benefit recommendations
    if (metrics.mutualBenefit.score < 50) {
      recommendations.push({
        type: 'value',
        priority: 'medium',
        action: 'Explore ways to provide mutual value',
        emoji: '💡',
        opportunities: metrics.mutualBenefit.opportunities
      });
    }

    return recommendations.slice(0, 2); // Top 2 recommendations
  }

  /**
   * Get daily contact recommendations
   */
  getDailyContactRecommendations(people) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Different strategies for different days
    const strategies = {
      1: 'fresh_start', // Monday - fresh connections
      2: 'follow_up',   // Tuesday - follow ups
      3: 'deep_dive',   // Wednesday - deeper conversations
      4: 'check_in',    // Thursday - quick check-ins
      5: 'wrap_up'      // Friday - week wrap-ups
    };

    const todayStrategy = strategies[dayOfWeek] || 'check_in';
    
    return {
      strategy: todayStrategy,
      recommendedContacts: this.filterByStrategy(people, todayStrategy).slice(0, 3),
      totalHighPriority: people.filter(p => p.communicationUrgency === 'HIGH').length,
      weeklyGoal: this.getWeeklyContactGoal(),
      funChallenge: this.getDailyRelationshipChallenge()
    };
  }

  /**
   * Get people waiting for responses
   */
  async getPendingCommunications() {
    // Mock data - would integrate with email/message APIs
    return [
      {
        personId: '1',
        name: 'Sarah Chen',
        type: 'email',
        subject: 'Project update needed',
        waitingDays: 3,
        urgency: 'HIGH',
        lastMessage: 'Hey, can you send me the latest progress report?',
        suggestedResponse: 'Send project status update with key metrics'
      },
      {
        personId: '2', 
        name: 'Marcus Wong',
        type: 'message',
        subject: 'Meeting follow-up',
        waitingDays: 7,
        urgency: 'MEDIUM',
        lastMessage: 'Thanks for the great meeting! What are our next steps?',
        suggestedResponse: 'Outline action items and timeline'
      }
    ];
  }

  /**
   * Get recent communications
   */
  async getRecentCommunications() {
    // Mock data - would integrate with email/calendar APIs
    return [
      {
        personId: '3',
        name: 'Emily Watson',
        type: 'video_call',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        duration: 60,
        topic: 'Technical architecture review',
        outcome: 'positive'
      },
      {
        personId: '4',
        name: 'Ben Knight',
        type: 'email',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        subject: 'Story collaboration opportunity',
        outcome: 'follow_up_needed'
      }
    ];
  }

  /**
   * Generate relationship insights
   */
  generateRelationshipInsights(people) {
    const totalPeople = people.length;
    const healthyRelationships = people.filter(p => p.relationshipHealth.overallScore > 70).length;
    const needsAttention = people.filter(p => p.relationshipHealth.overallScore < 50).length;
    
    return {
      totalRelationships: totalPeople,
      healthyPercentage: Math.round((healthyRelationships / totalPeople) * 100),
      needsAttention,
      averageHealthScore: Math.round(people.reduce((sum, p) => sum + p.relationshipHealth.overallScore, 0) / totalPeople),
      topInsight: this.getTopRelationshipInsight(people),
      networkStrength: this.calculateNetworkStrength(people)
    };
  }

  /**
   * Helper methods
   */
  calculateDaysSinceContact(person) {
    // Mock calculation - would use actual communication data
    return Math.floor(Math.random() * 14) + 1; // 1-14 days
  }

  getExpectedContactFrequency(person) {
    const relationshipTypes = person.type || [];
    
    if (relationshipTypes.includes('Collaborator')) return 7; // Weekly
    if (relationshipTypes.includes('Partner')) return 14; // Bi-weekly
    if (relationshipTypes.includes('Community Member')) return 30; // Monthly
    
    return 21; // Default 3 weeks
  }

  getAverageResponseTime(person) {
    // Mock - would calculate from actual communication data
    return Math.random() * 3 + 0.5; // 0.5 to 3.5 days
  }

  categorizeRelationship(person) {
    const types = person.type || [];
    
    if (types.includes('Collaborator')) return 'core_team';
    if (types.includes('Partner')) return 'strategic_partner';
    if (types.includes('Community Member')) return 'community';
    if (types.includes('Supporter')) return 'supporter';
    
    return 'contact';
  }

  getRelationshipHealthLevel(score) {
    if (score >= 85) return { level: 'excellent', color: '🟢', description: 'Thriving relationship' };
    if (score >= 70) return { level: 'good', color: '🟡', description: 'Healthy connection' };
    if (score >= 50) return { level: 'moderate', color: '🟠', description: 'Needs attention' };
    return { level: 'poor', color: '🔴', description: 'At risk' };
  }

  calculateCommunicationUrgency(person, healthData) {
    if (healthData.daysSinceContact > 7 || healthData.overallScore < 50) return 'HIGH';
    if (healthData.daysSinceContact > 3 || healthData.overallScore < 70) return 'MEDIUM';
    return 'LOW';
  }

  getUrgencyScore(urgency) {
    return { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }[urgency] || 1;
  }

  filterByStrategy(people, strategy) {
    switch (strategy) {
      case 'fresh_start':
        return people.filter(p => p.relationshipHealth.daysSinceContact > 7);
      case 'follow_up':
        return people.filter(p => p.communicationUrgency === 'HIGH');
      case 'deep_dive':
        return people.filter(p => p.relationshipHealth.metrics.engagementDepth.score < 70);
      case 'check_in':
        return people.filter(p => p.relationshipHealth.daysSinceContact > 3);
      case 'wrap_up':
        return people.filter(p => p.relationshipHealth.relationship === 'core_team');
      default:
        return people;
    }
  }

  suggestCommunicationApproach(person) {
    const types = person.type || [];
    
    if (types.includes('Collaborator')) return 'Quick project check-in or coffee chat';
    if (types.includes('Partner')) return 'Strategic update and future planning';
    if (types.includes('Community Member')) return 'Casual check-in about interests';
    
    return 'Friendly hello and life update';
  }

  suggestConversationTopics(person) {
    return [
      'Current projects and interests',
      'Shared connections and opportunities', 
      'Skills and collaboration potential',
      'Community involvement and passions'
    ];
  }

  identifyOpportunities(person) {
    return [
      'Skill sharing and knowledge exchange',
      'Project collaboration potential',
      'Network introduction opportunities',
      'Mutual support and mentoring'
    ];
  }

  getEngagementIndicators(person) {
    return {
      sharedProjects: (person.projects || []).length,
      commonInterests: (person.interests || []).length,
      mutualConnections: Math.floor(Math.random() * 5), // Mock
      communicationStyle: 'collaborative' // Mock
    };
  }

  getTopRelationshipInsight(people) {
    const insights = [
      'Your community network is growing stronger!',
      'Focus on deepening 2-3 key relationships this week',
      'Great job maintaining regular communication!',
      'Consider reaching out to quiet connections'
    ];
    
    return insights[Math.floor(Math.random() * insights.length)];
  }

  calculateNetworkStrength(people) {
    const avgScore = people.reduce((sum, p) => sum + p.relationshipHealth.overallScore, 0) / people.length;
    
    if (avgScore >= 80) return { strength: 'strong', description: 'Excellent network health' };
    if (avgScore >= 65) return { strength: 'good', description: 'Solid relationships' };
    if (avgScore >= 50) return { strength: 'moderate', description: 'Room for improvement' };
    return { strength: 'weak', description: 'Needs attention' };
  }

  getWeeklyContactGoal() {
    return {
      target: 12,
      current: 8,
      percentage: 67
    };
  }

  getDailyRelationshipChallenge() {
    const challenges = [
      '🎯 Send one meaningful message today',
      '☕ Schedule coffee with someone new',
      '💌 Write a gratitude note to a collaborator',
      '🤝 Make one valuable introduction',
      '🎨 Share something creative with your network'
    ];
    
    return challenges[Math.floor(Math.random() * challenges.length)];
  }

  getLastInteraction(person) {
    // Mock - would get from actual communication data
    const types = ['email', 'video_call', 'message', 'meeting'];
    return {
      type: types[Math.floor(Math.random() * types.length)],
      date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      topic: 'Project collaboration'
    };
  }

  getEmptyDashboard() {
    return {
      people: [],
      recentCommunications: [],
      pendingActions: [],
      insights: {
        totalRelationships: 0,
        healthyPercentage: 0,
        needsAttention: 0,
        averageHealthScore: 0,
        topInsight: 'Start building your network!',
        networkStrength: { strength: 'getting_started', description: 'Building connections' }
      },
      dailyRecommendations: {
        strategy: 'explore',
        recommendedContacts: [],
        totalHighPriority: 0,
        weeklyGoal: { target: 5, current: 0, percentage: 0 },
        funChallenge: '🚀 Make one new connection today!'
      }
    };
  }
}

// Export singleton instance
export const peopleRelationshipService = new PeopleRelationshipService();
export default peopleRelationshipService;