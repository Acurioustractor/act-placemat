/**
 * Email Intelligence Service - Advanced Email Parsing and Smart Suggestions
 * AI-powered email analysis, content extraction, and intelligent response generation
 * 
 * Features:
 * - Advanced email content parsing and extraction
 * - Intent recognition and classification
 * - Smart reply generation with context awareness
 * - Action item extraction from emails
 * - Relationship context integration
 * - Priority scoring and urgency detection
 * - Email thread analysis and summarization
 * - Smart scheduling suggestions from email content
 * 
 * Usage: emailIntelligenceService.parseEmail(emailContent)
 */

import { logger } from '../utils/logger.js';
import freeResearchAI from './freeResearchAI.js';
import gmailService from './gmailService.js';
import googleCalendarService from './googleCalendarService.js';
import peopleRelationshipService from './peopleRelationshipService.js';

class EmailIntelligenceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    
    // Email patterns and configurations
    this.urgentPatterns = [
      /urgent/gi, /asap/gi, /emergency/gi, /critical/gi, 
      /deadline/gi, /immediately/gi, /time.{0,10}sensitive/gi,
      /by (today|tomorrow|end of day|eod)/gi
    ];

    this.actionPatterns = [
      /please (review|approve|sign|confirm|check)/gi,
      /need (you to|your)/gi,
      /can you/gi,
      /would you/gi,
      /(action|task|todo|follow.{0,5}up) required/gi
    ];

    this.meetingPatterns = [
      /meeting/gi, /call/gi, /zoom/gi, /teams/gi,
      /schedule/gi, /book/gi, /calendar/gi,
      /available/gi, /free/gi, /time/gi
    ];

    this.projectPatterns = [
      /project/gi, /initiative/gi, /proposal/gi,
      /deliverable/gi, /milestone/gi, /sprint/gi,
      /task/gi, /assignment/gi
    ];
  }

  /**
   * Parse email content and extract intelligent insights
   */
  async parseEmail(emailData, options = {}) {
    try {
      const {
        includeRelationshipContext = true,
        generateSmartReplies = true,
        extractActionItems = true,
        analyzeThreadContext = true
      } = options;

      const cacheKey = `email-parse-${emailData.id}-${JSON.stringify(options)}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const parseResult = {
        emailId: emailData.id,
        metadata: {
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          date: emailData.date,
          threadId: emailData.threadId
        },
        
        // Core analysis
        sentiment: await this.analyzeSentiment(emailData.body),
        intent: await this.classifyIntent(emailData.subject, emailData.body),
        urgency: this.calculateUrgency(emailData),
        priority: await this.calculatePriority(emailData),
        
        // Content extraction
        keyTopics: await this.extractKeyTopics(emailData.body),
        actionItems: extractActionItems ? await this.extractActionItems(emailData.body) : [],
        timeReferences: this.extractTimeReferences(emailData.body),
        peopleReferences: this.extractPeopleReferences(emailData.body),
        projectReferences: await this.identifyProjectReferences(emailData.body),
        
        // Context and suggestions
        relationshipContext: includeRelationshipContext 
          ? await this.getRelationshipContext(emailData.from) : null,
        smartReplies: generateSmartReplies 
          ? await this.generateContextualSmartReplies(emailData) : null,
        suggestedActions: await this.generateSuggestedActions(emailData),
        
        // Thread analysis
        threadContext: analyzeThreadContext && emailData.threadId 
          ? await this.analyzeThreadContext(emailData.threadId) : null,
        
        // Intelligence insights
        aiInsights: await this.generateAIInsights(emailData),
        
        timestamp: new Date()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: parseResult,
        timestamp: Date.now()
      });

      return parseResult;

    } catch (error) {
      logger.error('Failed to parse email:', error);
      throw error;
    }
  }

  /**
   * Analyze email sentiment and emotional tone
   */
  async analyzeSentiment(emailBody) {
    try {
      const prompt = `
        Analyze the sentiment and emotional tone of this email content.
        
        Email content: "${emailBody.substring(0, 500)}"
        
        Provide analysis in JSON format:
        {
          "sentiment": "positive|negative|neutral",
          "confidence": 0.0-1.0,
          "emotion": "excited|frustrated|professional|urgent|friendly|etc",
          "tone": "formal|casual|urgent|friendly|concerned|appreciative|etc",
          "intensity": "low|medium|high"
        }
      `;

      const response = await freeResearchAI.analyzeWithGroq(prompt, {
        maxTokens: 150,
        temperature: 0.3
      });

      return JSON.parse(response);

    } catch (error) {
      logger.warn('Failed to analyze email sentiment:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        emotion: 'professional',
        tone: 'formal',
        intensity: 'medium'
      };
    }
  }

  /**
   * Classify email intent and purpose
   */
  async classifyIntent(subject, body) {
    try {
      const prompt = `
        Classify the intent and purpose of this email based on subject and content.
        
        Subject: "${subject}"
        Body: "${body.substring(0, 400)}"
        
        Classify into these categories and provide JSON response:
        {
          "primary_intent": "request|information|meeting|update|approval|complaint|appreciation|other",
          "secondary_intents": ["list", "of", "other", "intents"],
          "action_required": true|false,
          "response_expected": true|false,
          "urgency_level": "low|medium|high",
          "business_context": "project|sales|support|internal|external|personal"
        }
      `;

      const response = await freeResearchAI.analyzeWithGroq(prompt, {
        maxTokens: 200,
        temperature: 0.2
      });

      return JSON.parse(response);

    } catch (error) {
      logger.warn('Failed to classify email intent:', error);
      return {
        primary_intent: 'other',
        secondary_intents: [],
        action_required: false,
        response_expected: true,
        urgency_level: 'medium',
        business_context: 'external'
      };
    }
  }

  /**
   * Calculate email urgency score
   */
  calculateUrgency(emailData) {
    let urgencyScore = 0;
    const text = `${emailData.subject} ${emailData.body}`.toLowerCase();

    // Check for urgent keywords
    this.urgentPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) urgencyScore += matches.length * 20;
    });

    // Check time sensitivity
    const hoursOld = (Date.now() - emailData.date.getTime()) / (1000 * 60 * 60);
    if (hoursOld > 48) urgencyScore += 15;
    else if (hoursOld > 24) urgencyScore += 10;

    // Check sender domain importance (mock)
    if (emailData.from.includes('@company.com')) urgencyScore += 10;
    if (emailData.from.includes('ceo') || emailData.from.includes('director')) urgencyScore += 15;

    // Check for action patterns
    this.actionPatterns.forEach(pattern => {
      if (pattern.test(text)) urgencyScore += 10;
    });

    return {
      score: Math.min(100, urgencyScore),
      level: urgencyScore >= 40 ? 'HIGH' : urgencyScore >= 20 ? 'MEDIUM' : 'LOW',
      factors: this.identifyUrgencyFactors(emailData, urgencyScore)
    };
  }

  /**
   * Calculate email priority based on multiple factors
   */
  async calculatePriority(emailData) {
    try {
      let priorityScore = 0;

      // Relationship importance
      const relationshipContext = await this.getRelationshipContext(emailData.from);
      if (relationshipContext?.importance === 'HIGH') priorityScore += 25;
      else if (relationshipContext?.importance === 'MEDIUM') priorityScore += 15;

      // Content importance
      const hasProjectKeywords = this.projectPatterns.some(pattern => 
        pattern.test(`${emailData.subject} ${emailData.body}`)
      );
      if (hasProjectKeywords) priorityScore += 20;

      // Time sensitivity
      const urgency = this.calculateUrgency(emailData);
      priorityScore += urgency.score * 0.3;

      // Response requirement
      const actionRequired = this.actionPatterns.some(pattern => 
        pattern.test(`${emailData.subject} ${emailData.body}`)
      );
      if (actionRequired) priorityScore += 15;

      return {
        score: Math.min(100, Math.round(priorityScore)),
        level: priorityScore >= 60 ? 'HIGH' : priorityScore >= 30 ? 'MEDIUM' : 'LOW',
        factors: {
          relationship: relationshipContext?.importance || 'UNKNOWN',
          content: hasProjectKeywords ? 'project-related' : 'general',
          urgency: urgency.level,
          actionRequired
        }
      };

    } catch (error) {
      logger.warn('Failed to calculate email priority:', error);
      return { score: 50, level: 'MEDIUM', factors: {} };
    }
  }

  /**
   * Extract key topics and themes from email
   */
  async extractKeyTopics(emailBody) {
    try {
      const prompt = `
        Extract the key topics and themes from this email content.
        Focus on the main subjects, projects, decisions, or areas of discussion.
        
        Email content: "${emailBody.substring(0, 600)}"
        
        Return JSON array of topics:
        {
          "topics": [
            {"topic": "topic name", "relevance": "high|medium|low", "category": "project|meeting|decision|update|other"},
            ...
          ]
        }
        
        Maximum 5 topics, ordered by relevance.
      `;

      const response = await freeResearchAI.analyzeWithGroq(prompt, {
        maxTokens: 200,
        temperature: 0.4
      });

      const parsed = JSON.parse(response);
      return parsed.topics || [];

    } catch (error) {
      logger.warn('Failed to extract key topics:', error);
      return [];
    }
  }

  /**
   * Extract action items and tasks from email
   */
  async extractActionItems(emailBody) {
    try {
      const prompt = `
        Extract specific action items, tasks, and requests from this email content.
        Look for things that need to be done, decisions to be made, or follow-ups required.
        
        Email content: "${emailBody.substring(0, 600)}"
        
        Return JSON with action items:
        {
          "action_items": [
            {
              "action": "brief description of what needs to be done",
              "owner": "who should do it (me|sender|other|unclear)",
              "deadline": "any mentioned deadline or null",
              "priority": "high|medium|low",
              "type": "task|decision|follow_up|meeting|approval|other"
            },
            ...
          ]
        }
        
        Only include clear, actionable items.
      `;

      const response = await freeResearchAI.analyzeWithGroq(prompt, {
        maxTokens: 300,
        temperature: 0.3
      });

      const parsed = JSON.parse(response);
      return parsed.action_items || [];

    } catch (error) {
      logger.warn('Failed to extract action items:', error);
      return [];
    }
  }

  /**
   * Extract time references (dates, deadlines, meetings)
   */
  extractTimeReferences(emailBody) {
    const timeReferences = [];
    
    // Common time patterns
    const patterns = [
      /\b(today|tomorrow|yesterday)\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{2,4})\b/g,
      /\b(\d{1,2}:\d{2}\s*(am|pm)?)\b/gi,
      /\b(next|this)\s+(week|month|quarter|year)/gi,
      /\b(deadline|due|by|before)\s+([^.!?]+)/gi
    ];

    patterns.forEach(pattern => {
      const matches = emailBody.match(pattern);
      if (matches) {
        matches.forEach(match => {
          timeReferences.push({
            text: match.trim(),
            type: this.classifyTimeReference(match),
            context: this.getTimeReferenceContext(emailBody, match)
          });
        });
      }
    });

    return timeReferences;
  }

  /**
   * Extract people references and mentions
   */
  extractPeopleReferences(emailBody) {
    const peopleReferences = [];
    
    // Name patterns (simplified)
    const namePatterns = [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last
      /\b@[a-zA-Z0-9._-]+/g, // @mentions
      /\b[A-Z][a-z]+\b(?=\s+(said|wrote|mentioned|noted|suggested))/g // John said...
    ];

    namePatterns.forEach(pattern => {
      const matches = emailBody.match(pattern);
      if (matches) {
        matches.forEach(match => {
          peopleReferences.push({
            name: match.trim(),
            type: match.startsWith('@') ? 'mention' : 'reference',
            context: this.getPeopleReferenceContext(emailBody, match)
          });
        });
      }
    });

    return peopleReferences;
  }

  /**
   * Identify project references in email content
   */
  async identifyProjectReferences(emailBody) {
    try {
      // Get current projects for matching
      const projectHealth = await projectHealthService.calculateAllProjectHealth();
      const projectNames = projectHealth.map(p => p.name.toLowerCase());

      const references = [];
      const emailLower = emailBody.toLowerCase();

      projectNames.forEach(projectName => {
        if (emailLower.includes(projectName)) {
          const project = projectHealth.find(p => p.name.toLowerCase() === projectName);
          references.push({
            projectId: project.id,
            projectName: project.name,
            context: this.getProjectReferenceContext(emailBody, projectName),
            relevance: this.calculateProjectRelevance(emailBody, projectName)
          });
        }
      });

      return references;

    } catch (error) {
      logger.warn('Failed to identify project references:', error);
      return [];
    }
  }

  /**
   * Get relationship context for email sender
   */
  async getRelationshipContext(senderEmail) {
    try {
      // Get relationship data for this person
      const relationshipData = await peopleRelationshipService.getPersonRelationshipData(senderEmail);
      
      if (!relationshipData) {
        return {
          importance: 'UNKNOWN',
          lastContact: null,
          relationshipHealth: 'unknown',
          communicationPattern: 'unknown',
          suggestedResponse: 'standard'
        };
      }

      return {
        importance: relationshipData.importance,
        lastContact: relationshipData.relationshipHealth.lastContactDate,
        relationshipHealth: relationshipData.relationshipHealth.overallHealth,
        communicationPattern: relationshipData.communicationPattern.frequency,
        suggestedResponse: this.suggestResponseApproach(relationshipData)
      };

    } catch (error) {
      logger.warn('Failed to get relationship context:', error);
      return { importance: 'UNKNOWN', suggestedResponse: 'standard' };
    }
  }

  /**
   * Generate contextual smart replies
   */
  async generateContextualSmartReplies(emailData) {
    try {
      const relationshipContext = await this.getRelationshipContext(emailData.from);
      const intent = await this.classifyIntent(emailData.subject, emailData.body);

      const prompt = `
        Generate 3 contextual email replies for this email.
        Consider the relationship context, email intent, and appropriate tone.
        
        Email Details:
        From: ${emailData.from}
        Subject: ${emailData.subject}
        Body: ${emailData.body.substring(0, 400)}
        
        Relationship Context: ${relationshipContext?.importance || 'UNKNOWN'} importance
        Intent: ${intent?.primary_intent || 'unknown'}
        
        Generate replies:
        1. Quick acknowledgment (1-2 sentences)
        2. Detailed response (3-4 sentences) 
        3. Follow-up question (2-3 sentences with a question)
        
        Each reply should match the appropriate tone and business context.
        
        Return as JSON:
        {
          "quick": "reply text",
          "detailed": "reply text", 
          "followup": "reply text"
        }
      `;

      const response = await freeResearchAI.analyzeWithGroq(prompt, {
        maxTokens: 400,
        temperature: 0.7
      });

      return JSON.parse(response);

    } catch (error) {
      logger.warn('Failed to generate smart replies:', error);
      return {
        quick: 'Thank you for your email. I will review and respond shortly.',
        detailed: 'I have received your email and will provide a detailed response within 24 hours.',
        followup: 'Could you provide additional context on this matter?'
      };
    }
  }

  /**
   * Generate suggested actions for email
   */
  async generateSuggestedActions(emailData) {
    try {
      const intent = await this.classifyIntent(emailData.subject, emailData.body);
      const urgency = this.calculateUrgency(emailData);
      const actionItems = await this.extractActionItems(emailData.body);

      const suggestions = [];

      // Response suggestions
      if (intent?.response_expected) {
        suggestions.push({
          type: 'respond',
          priority: urgency.level,
          description: 'Send reply to this email',
          deadline: this.calculateResponseDeadline(urgency.level),
          automated: false
        });
      }

      // Action item suggestions
      actionItems.forEach(item => {
        if (item.owner === 'me') {
          suggestions.push({
            type: 'task',
            priority: item.priority.toUpperCase(),
            description: item.action,
            deadline: item.deadline,
            automated: false
          });
        }
      });

      // Meeting suggestions
      const hasMeetingKeywords = this.meetingPatterns.some(pattern => 
        pattern.test(`${emailData.subject} ${emailData.body}`)
      );

      if (hasMeetingKeywords && intent?.primary_intent === 'meeting') {
        suggestions.push({
          type: 'schedule_meeting',
          priority: 'MEDIUM',
          description: 'Schedule meeting mentioned in email',
          automated: true,
          calendarIntegration: true
        });
      }

      // Calendar suggestions
      const timeReferences = this.extractTimeReferences(emailData.body);
      if (timeReferences.length > 0) {
        suggestions.push({
          type: 'add_to_calendar',
          priority: 'LOW',
          description: 'Add mentioned dates/times to calendar',
          automated: true,
          calendarIntegration: true
        });
      }

      return suggestions.sort((a, b) => {
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    } catch (error) {
      logger.warn('Failed to generate suggested actions:', error);
      return [];
    }
  }

  /**
   * Analyze email thread context
   */
  async analyzeThreadContext(threadId) {
    try {
      // This would get thread history from Gmail service
      // For now, return mock analysis
      return {
        threadLength: 5,
        participants: ['user1@example.com', 'user2@example.com'],
        mainTopic: 'Project discussion',
        sentiment_trend: 'positive',
        resolution_status: 'ongoing',
        last_action_by: 'other',
        needs_response: true
      };

    } catch (error) {
      logger.warn('Failed to analyze thread context:', error);
      return null;
    }
  }

  /**
   * Generate AI insights for email
   */
  async generateAIInsights(emailData) {
    try {
      const prompt = `
        Provide intelligent insights about this email that would help with productivity and relationship management.
        
        Email Details:
        From: ${emailData.from}
        Subject: ${emailData.subject}
        Body: ${emailData.body.substring(0, 400)}
        
        Provide insights about:
        1. What this email reveals about the sender's current priorities
        2. Optimal response strategy and timing
        3. Any hidden opportunities or risks
        4. Relationship health indicators
        5. Productivity impact assessment
        
        Keep insights actionable and concise.
      `;

      const insights = await freeResearchAI.analyzeWithGroq(prompt, {
        maxTokens: 250,
        temperature: 0.6
      });

      return {
        content: insights,
        confidence: 0.75,
        generated_at: new Date()
      };

    } catch (error) {
      logger.warn('Failed to generate AI insights:', error);
      return {
        content: 'Unable to generate AI insights at this time.',
        confidence: 0,
        generated_at: new Date()
      };
    }
  }

  /**
   * Helper: Identify urgency factors
   */
  identifyUrgencyFactors(emailData, urgencyScore) {
    const factors = [];
    const text = `${emailData.subject} ${emailData.body}`.toLowerCase();

    if (this.urgentPatterns.some(pattern => pattern.test(text))) {
      factors.push('urgent_keywords');
    }

    const hoursOld = (Date.now() - emailData.date.getTime()) / (1000 * 60 * 60);
    if (hoursOld > 24) factors.push('time_sensitive');

    if (this.actionPatterns.some(pattern => pattern.test(text))) {
      factors.push('action_required');
    }

    if (emailData.from.includes('ceo') || emailData.from.includes('director')) {
      factors.push('important_sender');
    }

    return factors;
  }

  /**
   * Helper: Classify time reference type
   */
  classifyTimeReference(timeRef) {
    const ref = timeRef.toLowerCase();
    
    if (ref.includes('deadline') || ref.includes('due') || ref.includes('by')) {
      return 'deadline';
    }
    if (ref.includes('meeting') || ref.includes('call') || ref.includes(':')) {
      return 'meeting';
    }
    if (ref.includes('today') || ref.includes('tomorrow')) {
      return 'immediate';
    }
    
    return 'general';
  }

  /**
   * Helper: Get context around time reference
   */
  getTimeReferenceContext(emailBody, timeRef) {
    const index = emailBody.indexOf(timeRef);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(emailBody.length, index + timeRef.length + 50);
    
    return emailBody.substring(start, end).trim();
  }

  /**
   * Helper: Get context around people reference
   */
  getPeopleReferenceContext(emailBody, peopleRef) {
    const index = emailBody.indexOf(peopleRef);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 30);
    const end = Math.min(emailBody.length, index + peopleRef.length + 30);
    
    return emailBody.substring(start, end).trim();
  }

  /**
   * Helper: Get context around project reference
   */
  getProjectReferenceContext(emailBody, projectName) {
    const index = emailBody.toLowerCase().indexOf(projectName.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - 40);
    const end = Math.min(emailBody.length, index + projectName.length + 40);
    
    return emailBody.substring(start, end).trim();
  }

  /**
   * Helper: Calculate project relevance in email
   */
  calculateProjectRelevance(emailBody, projectName) {
    const occurrences = (emailBody.toLowerCase().match(new RegExp(projectName.toLowerCase(), 'g')) || []).length;
    const emailLength = emailBody.length;
    
    const frequency = occurrences / (emailLength / 1000); // Per 1000 chars
    
    if (frequency > 2) return 'high';
    if (frequency > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Helper: Suggest response approach based on relationship data
   */
  suggestResponseApproach(relationshipData) {
    const health = relationshipData.relationshipHealth?.overallHealth;
    const frequency = relationshipData.communicationPattern?.frequency;

    if (health === 'excellent' && frequency === 'regular') {
      return 'casual_friendly';
    }
    if (health === 'good') {
      return 'professional_warm';
    }
    if (health === 'needs_attention') {
      return 'formal_respectful';
    }
    
    return 'professional_standard';
  }

  /**
   * Helper: Calculate response deadline based on urgency
   */
  calculateResponseDeadline(urgencyLevel) {
    const now = new Date();
    
    switch (urgencyLevel) {
      case 'HIGH':
        return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
      case 'MEDIUM':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      default:
        return new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    }
  }

  /**
   * Bulk parse multiple emails
   */
  async parseEmailBatch(emails, options = {}) {
    try {
      const results = await Promise.all(
        emails.map(email => this.parseEmail(email, options))
      );

      return {
        processed: results.length,
        results,
        summary: this.generateBatchSummary(results)
      };

    } catch (error) {
      logger.error('Failed to parse email batch:', error);
      throw error;
    }
  }

  /**
   * Generate summary for batch processing
   */
  generateBatchSummary(results) {
    const summary = {
      totalEmails: results.length,
      highPriority: results.filter(r => r.priority.level === 'HIGH').length,
      urgentEmails: results.filter(r => r.urgency.level === 'HIGH').length,
      actionItemsCount: results.reduce((sum, r) => sum + r.actionItems.length, 0),
      projectRelatedCount: results.filter(r => r.projectReferences.length > 0).length,
      averageConfidence: results.reduce((sum, r) => sum + (r.aiInsights?.confidence || 0), 0) / results.length
    };

    return summary;
  }

  /**
   * Get intelligence statistics
   */
  getIntelligenceStats() {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: 85, // Mock
      averageProcessingTime: '1.2s', // Mock
      totalEmailsProcessed: 1250, // Mock
      accuracyRate: '89%' // Mock
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Email intelligence cache cleared');
  }
}

// Export singleton instance
const emailIntelligenceService = new EmailIntelligenceService();
export default emailIntelligenceService;