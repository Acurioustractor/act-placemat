/**
 * ACT-Notion AI Business Agent Service
 * Bulletproof bidirectional sync between ACT backend and Notion workspace
 * Handles rate limiting, queue management, and intelligent automation
 */

import { Client } from '@notionhq/client';
import { logger } from '../utils/logger.js';
import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import MultiProviderAI from './multiProviderAI.js';
import intelligentInsightsEngine from './intelligentInsightsEngine.js';

export class NotionAIAgent extends EventEmitter {
  constructor() {
    super();
    
    // Initialize Notion client
    this.notion = new Client({
      auth: process.env.NOTION_INTEGRATION_TOKEN || process.env.NOTION_TOKEN,
    });
    
    // Initialize ACT backend connections
    this.ai = new MultiProviderAI();
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Database IDs (to be configured during setup)
    this.databases = {
      ideas: process.env.NOTION_IDEAS_DB_ID,
      tasks: process.env.NOTION_TASKS_DB_ID,
      people: process.env.NOTION_PEOPLE_DB_ID,
      projects: process.env.NOTION_PROJECTS_DB_ID,
      playbooks: process.env.NOTION_PLAYBOOKS_DB_ID,
      memory: process.env.NOTION_MEMORY_DB_ID,
    };
    
    // Rate limiting and queue management
    this.requestQueue = [];
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now() + 60000, // Reset every minute
      maxRequests: 10 * 60, // 10 requests per second * 60 seconds
      processing: false,
    };
    
    // Sync tracking
    this.syncState = {
      last_full_sync: null,
      incremental_sync_enabled: true,
      sync_errors: [],
      active_automations: new Map(),
    };
    
    // Process memory for learning
    this.processMemory = new Map();
    this.automationTriggers = new Map();
    
    logger.info('🤖 ACT-Notion AI Business Agent initialized');
    this.startQueueProcessor();
  }

  /**
   * 🎯 Core AI Business Agent Functions
   */

  /**
   * Process voice note or text input from user
   */
  async processCapture(input) {
    logger.info(`📝 Processing capture: ${input.content.substring(0, 50)}...`);
    
    try {
      // Step 1: Create initial entry in Notion Ideas database
      const ideaPage = await this.queueRequest('pages', 'create', {
        parent: { database_id: this.databases.ideas },
        properties: {
          Title: {
            title: [{
              text: { content: input.content.substring(0, 100) + '...' }
            }]
          },
          Content: {
            rich_text: [{
              text: { content: input.content }
            }]
          },
          Type: {
            select: { name: input.type || 'Voice Note' }
          },
          Status: {
            select: { name: 'Processing' }
          },
          Source: {
            select: { name: input.source || 'Phone Voice' }
          }
        }
      });

      // Step 2: Process with ACT Farmhand AI
      const aiAnalysis = await this.ai.generateResponse(
        `Analyze this business input and extract actionable intelligence:
        
        Input: "${input.content}"
        
        Identify:
        1. Primary intent (task, project, person, idea, question)
        2. Urgency level (immediate, days, weeks, future)
        3. People mentioned or needed
        4. Required actions
        5. Automation opportunities
        
        Format as structured JSON for easy processing.`,
        {
          systemPrompt: 'You are ACT\'s business intelligence assistant. Focus on actionable insights.',
          preferSpeed: true,
          temperature: 0.3
        }
      );

      // Step 3: Extract structured data from AI analysis
      const analysis = this.parseAIAnalysis(aiAnalysis.response);
      
      // Step 4: Update Notion page with AI analysis
      await this.queueRequest('pages', 'update', {
        page_id: ideaPage.id,
        properties: {
          'AI Intent': {
            rich_text: [{
              text: { content: JSON.stringify(analysis, null, 2) }
            }]
          },
          Priority: {
            select: { name: analysis.urgency || 'Medium' }
          },
          Status: {
            select: { name: 'Processed' }
          },
          'Processed At': {
            date: { start: new Date().toISOString() }
          }
        }
      });

      // Step 5: Generate follow-up actions
      const actions = await this.generateFollowUpActions(analysis, ideaPage.id);
      
      // Step 6: Learn from this interaction
      await this.learnFromCapture(input, analysis, actions);
      
      this.emit('capture-processed', {
        input,
        analysis,
        actions,
        notion_page: ideaPage.id
      });
      
      return {
        success: true,
        notion_page: ideaPage.id,
        ai_analysis: analysis,
        generated_actions: actions.length,
        processing_time: Date.now() - Date.parse(ideaPage.created_time)
      };
      
    } catch (error) {
      logger.error('Capture processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate and execute follow-up actions from AI analysis
   */
  async generateFollowUpActions(analysis, sourcePageId) {
    const actions = [];
    
    try {
      // Create tasks from identified actions
      if (analysis.required_actions && Array.isArray(analysis.required_actions)) {
        for (const action of analysis.required_actions) {
          const taskPage = await this.queueRequest('pages', 'create', {
            parent: { database_id: this.databases.tasks },
            properties: {
              Task: {
                title: [{
                  text: { content: action.description || action }
                }]
              },
              Status: {
                select: { name: 'New' }
              },
              Type: {
                select: { name: action.type || 'Manual Task' }
              },
              Priority: {
                select: { name: action.urgency || analysis.urgency || 'Medium' }
              },
              'Due Date': action.due_date ? {
                date: { start: action.due_date }
              } : undefined
            }
          });
          
          actions.push({ type: 'task', notion_id: taskPage.id, action });
        }
      }

      // Create or link to people mentioned
      if (analysis.people_mentioned && Array.isArray(analysis.people_mentioned)) {
        for (const person of analysis.people_mentioned) {
          const personPage = await this.findOrCreatePerson(person);
          actions.push({ type: 'person', notion_id: personPage.id, person });
        }
      }

      // Create projects if new project detected
      if (analysis.primary_intent === 'project' && analysis.project_details) {
        const projectPage = await this.queueRequest('pages', 'create', {
          parent: { database_id: this.databases.projects },
          properties: {
            Project: {
              title: [{
                text: { content: analysis.project_details.name || 'New Project' }
              }]
            },
            Status: {
              select: { name: 'Discovery' }
            },
            Type: {
              select: { name: analysis.project_details.type || 'Internal Project' }
            },
            Priority: {
              select: { name: analysis.urgency || 'Medium' }
            }
          }
        });
        
        actions.push({ type: 'project', notion_id: projectPage.id, project: analysis.project_details });
      }

      // Check for automation opportunities
      if (analysis.automation_opportunities) {
        await this.evaluateAutomationOpportunity(analysis, sourcePageId);
      }

    } catch (error) {
      logger.error('Follow-up action generation failed:', error);
    }
    
    return actions;
  }

  /**
   * Find existing person or create new one
   */
  async findOrCreatePerson(personData) {
    try {
      // Search for existing person
      const existingPeople = await this.queueRequest('databases', 'query', {
        database_id: this.databases.people,
        filter: {
          property: 'Name',
          rich_text: {
            contains: personData.name || personData
          }
        }
      });

      if (existingPeople.results.length > 0) {
        return existingPeople.results[0];
      }

      // Create new person
      return await this.queueRequest('pages', 'create', {
        parent: { database_id: this.databases.people },
        properties: {
          Name: {
            title: [{
              text: { content: personData.name || personData }
            }]
          },
          Role: {
            select: { name: personData.role || 'Community Member' }
          },
          'Relationship Strength': {
            select: { name: 'New' }
          },
          Organization: personData.organization ? {
            rich_text: [{
              text: { content: personData.organization }
            }]
          } : undefined
        }
      });

    } catch (error) {
      logger.error('Person find/create failed:', error);
      throw error;
    }
  }

  /**
   * 🔄 Bidirectional Sync Functions
   */

  /**
   * Sync from ACT backend to Notion
   */
  async syncToNotion(dataType, actData) {
    logger.info(`📤 Syncing ${dataType} to Notion`);
    
    try {
      switch (dataType) {
        case 'tasks':
          return await this.syncTasksToNotion(actData);
        case 'people':
          return await this.syncPeopleToNotion(actData);
        case 'projects':
          return await this.syncProjectsToNotion(actData);
        case 'insights':
          return await this.syncInsightsToNotion(actData);
        default:
          throw new Error(`Unsupported sync data type: ${dataType}`);
      }
    } catch (error) {
      logger.error(`Sync to Notion failed for ${dataType}:`, error);
      this.syncState.sync_errors.push({
        type: dataType,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Sync from Notion back to ACT backend
   */
  async syncFromNotion(databaseId, notionData) {
    logger.info(`📥 Syncing from Notion database: ${databaseId}`);
    
    try {
      // Determine which ACT backend service to update based on database
      const databaseType = this.identifyDatabaseType(databaseId);
      
      switch (databaseType) {
        case 'tasks':
          return await this.syncNotionToTasks(notionData);
        case 'people':
          return await this.syncNotionToPeople(notionData);
        case 'projects':
          return await this.syncNotionToProjects(notionData);
        default:
          logger.warn(`No sync handler for database type: ${databaseType}`);
      }
    } catch (error) {
      logger.error('Sync from Notion failed:', error);
      throw error;
    }
  }

  /**
   * 🎛️ Rate Limiting & Queue Management
   */

  /**
   * Add request to queue with rate limiting
   */
  async queueRequest(resource, method, params) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resource,
        method,
        params,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: params.priority || 'normal'
      });
      
      // Sort queue by priority (high priority first)
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    });
  }

  /**
   * Process request queue with rate limiting
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (this.rateLimiter.processing || this.requestQueue.length === 0) {
        return;
      }

      // Reset rate limiter if needed
      if (Date.now() > this.rateLimiter.resetTime) {
        this.rateLimiter.requests = 0;
        this.rateLimiter.resetTime = Date.now() + 60000;
      }

      // Check if we can make more requests
      if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
        logger.warn('Rate limit reached, waiting...');
        return;
      }

      this.rateLimiter.processing = true;
      
      // Process batch of requests (up to 5 at once)
      const batch = this.requestQueue.splice(0, 5);
      
      for (const request of batch) {
        try {
          this.rateLimiter.requests++;
          
          let result;
          if (request.method === 'create') {
            result = await this.notion[request.resource].create(request.params);
          } else if (request.method === 'update') {
            result = await this.notion[request.resource].update(request.params);
          } else if (request.method === 'query') {
            result = await this.notion[request.resource].query(request.params);
          } else {
            throw new Error(`Unsupported method: ${request.method}`);
          }
          
          request.resolve(result);
          
        } catch (error) {
          logger.error('Notion API request failed:', error);
          request.reject(error);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.rateLimiter.processing = false;
      
    }, 200); // Process every 200ms
  }

  /**
   * 🧠 Learning & Automation Functions
   */

  /**
   * Learn from capture interactions to improve automation
   */
  async learnFromCapture(input, analysis, actions) {
    const pattern = {
      input_type: input.type,
      intent: analysis.primary_intent,
      actions_generated: actions.length,
      processing_time: Date.now(),
      success_indicators: analysis.urgency
    };
    
    // Store pattern in memory
    const patternKey = this.generatePatternKey(input.content);
    this.processMemory.set(patternKey, pattern);
    
    // Check if this creates an automation opportunity
    await this.evaluateAutomationPattern(pattern, patternKey);
  }

  /**
   * Evaluate if a pattern can be automated
   */
  async evaluateAutomationPattern(pattern, patternKey) {
    const similarPatterns = this.findSimilarPatterns(patternKey);
    
    if (similarPatterns.length >= 3) {
      logger.info(`🤖 Automation opportunity detected: ${patternKey}`);
      
      // Create automation playbook
      await this.queueRequest('pages', 'create', {
        parent: { database_id: this.databases.playbooks },
        properties: {
          'Playbook Name': {
            title: [{
              text: { content: `Auto-${patternKey}` }
            }]
          },
          Trigger: {
            rich_text: [{
              text: { content: `Pattern: ${pattern.intent} with ${pattern.input_type}` }
            }]
          },
          Steps: {
            rich_text: [{
              text: { content: this.generateAutomationSteps(pattern) }
            }]
          },
          Active: {
            checkbox: false // Requires manual approval
          },
          'Success Rate': {
            number: 0
          }
        }
      });
    }
  }

  /**
   * 🔧 Helper Functions
   */

  parseAIAnalysis(aiResponse) {
    try {
      // Try to parse as JSON first
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to simple parsing
      return {
        primary_intent: this.extractIntent(aiResponse),
        urgency: this.extractUrgency(aiResponse),
        required_actions: this.extractActions(aiResponse),
        people_mentioned: this.extractPeople(aiResponse),
        automation_opportunities: aiResponse.toLowerCase().includes('automat')
      };
    } catch (error) {
      logger.warn('AI analysis parsing failed, using fallback');
      return {
        primary_intent: 'general',
        urgency: 'Medium',
        required_actions: ['Review and categorize'],
        raw_analysis: aiResponse
      };
    }
  }

  extractIntent(text) {
    if (text.includes('task') || text.includes('todo')) return 'task';
    if (text.includes('project') || text.includes('initiative')) return 'project';
    if (text.includes('person') || text.includes('contact')) return 'person';
    if (text.includes('question') || text.includes('research')) return 'question';
    return 'idea';
  }

  extractUrgency(text) {
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediate')) return 'High';
    if (text.includes('someday') || text.includes('future') || text.includes('later')) return 'Low';
    return 'Medium';
  }

  extractActions(text) {
    // Simple action extraction - could be enhanced with NLP
    const actionWords = ['create', 'build', 'design', 'implement', 'contact', 'schedule', 'research'];
    const actions = [];
    
    actionWords.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        actions.push(`${word.charAt(0).toUpperCase() + word.slice(1)} related to captured idea`);
      }
    });
    
    return actions.length > 0 ? actions : ['Review and determine next steps'];
  }

  extractPeople(text) {
    // Enhanced people extraction using name patterns
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const matches = text.match(namePattern) || [];
    return matches.map(name => ({ name }));
  }

  generatePatternKey(content) {
    return content.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 5)
      .join('_');
  }

  findSimilarPatterns(patternKey) {
    const similar = [];
    this.processMemory.forEach((pattern, key) => {
      const similarity = this.calculateSimilarity(patternKey, key);
      if (similarity > 0.6) {
        similar.push({ key, pattern, similarity });
      }
    });
    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  calculateSimilarity(str1, str2) {
    const words1 = str1.split('_');
    const words2 = str2.split('_');
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
  }

  generateAutomationSteps(pattern) {
    return `1. Detect ${pattern.input_type} input with ${pattern.intent} intent
2. Generate ${pattern.actions_generated} follow-up actions
3. Create appropriate Notion entries
4. Notify relevant stakeholders`;
  }

  identifyDatabaseType(databaseId) {
    const dbTypes = Object.entries(this.databases);
    const match = dbTypes.find(([_, id]) => id === databaseId);
    return match ? match[0] : 'unknown';
  }

  // Placeholder sync functions - to be implemented based on specific needs
  async syncTasksToNotion(tasks) { /* Implementation */ }
  async syncPeopleToNotion(people) { /* Implementation */ }
  async syncProjectsToNotion(projects) { /* Implementation */ }
  async syncInsightsToNotion(insights) { /* Implementation */ }
  async syncNotionToTasks(data) { /* Implementation */ }
  async syncNotionToPeople(data) { /* Implementation */ }
  async syncNotionToProjects(data) { /* Implementation */ }
}

// Export singleton instance
export default new NotionAIAgent();
