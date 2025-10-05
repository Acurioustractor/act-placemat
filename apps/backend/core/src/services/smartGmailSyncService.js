/**
 * Smart Gmail Sync Service for ACT Community Ecosystem
 * Intelligently pulls the RIGHT information and connects to community data
 */

import { google } from 'googleapis';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import empathyLedgerService from './empathyLedgerService.js';

export class SmartGmailSyncService extends EventEmitter {
  constructor() {
    super();
    this.gmail = null;
    this.oauth2Client = null;
    this.isAuthenticated = false;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.supabase = null;
    
    // Smart filters for ACT community emails
    this.communityFilters = {
      // Project-related keywords from your real Notion projects
      projectKeywords: [
        'ANAT SPECTRA', 'Barkly Backbone', 'BG Fit', 'Black Cockatoo Valley',
        'Climate Justice Innovation Lab', 'Dad.Lab', 'Designing for Obsolescence',
        'Contained', 'PICC', 'Justice Hub', 'Empathy Ledger'
      ],
      
      // Community organization indicators
      organizationDomains: [
        '@act.place', '@empathyledger.com', '@picc.org.au', 
        '@climateseed.com', '@justiceseed.com'
      ],
      
      // Subject line patterns that indicate community correspondence
      subjectPatterns: [
        /partnership/i, /collaboration/i, /project/i, /funding/i, /grant/i,
        /community/i, /workshop/i, /event/i, /meeting/i, /proposal/i,
        /opportunity/i, /application/i, /letter of support/i, /introduction/i
      ],
      
      // Email types to prioritize
      priorityTypes: [
        'funding_opportunity', 'partnership_inquiry', 'project_update',
        'community_introduction', 'collaboration_request', 'grant_application'
      ]
    };
    
    // Context enrichment patterns
    this.contextPatterns = {
      funding: /(\$[\d,]+|\$\d+k|\$\d+m|funding|grant|budget)/i,
      partnership: /(partner|collaborate|joint|together|alliance)/i, 
      urgent: /(urgent|asap|deadline|due|expires)/i,
      introduction: /(introduce|connect|meet|networking)/i,
      opportunity: /(opportunity|offer|invitation|proposal)/i
    };

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
    } else {
      console.warn('⚠️  Supabase credentials missing for SmartGmailSyncService – community email queries disabled');
    }
  }

  /**
   * Initialize Gmail API connection
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Gmail OAuth with:');
      console.log('  GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'Set' : 'NOT SET');
      console.log('  GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'NOT SET');
      console.log('  Using Desktop OAuth client with OOB flow');

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'urn:ietf:wg:oauth:2.0:oob' // Desktop OAuth client uses OOB flow
      );

      // Persist refreshed tokens automatically
      this.oauth2Client.on('tokens', async (tokens) => {
        try {
          const merged = { ...(this.oauth2Client.credentials || {}), ...(tokens || {}) };
          await this.storeTokens(merged);
          this.isAuthenticated = true;
          console.log('🔁 Gmail tokens refreshed and persisted');
        } catch (e) {
          console.error('❌ Failed to persist refreshed Gmail tokens:', e?.message || e);
        }
      });

      const tokens = await this.loadStoredTokens();
      if (tokens) {
        this.oauth2Client.setCredentials(tokens);
        this.isAuthenticated = true;
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      console.log('✅ Smart Gmail Sync Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Gmail initialization failed:', error);
      return false;
    }
  }

  /**
   * Set up intelligent email monitoring with Push notifications
   */
  async setupSmartMonitoring() {
    if (!this.isAuthenticated) {
      throw new Error('Gmail not authenticated');
    }

    try {
      // Check if Pub/Sub topic is configured for real-time monitoring
      if (process.env.GMAIL_PUBSUB_TOPIC) {
        console.log('🔔 Setting up Gmail push notifications...');
        
        // Set up push notifications for real-time email processing
        const watchResponse = await this.gmail.users.watch({
          userId: 'me',
          requestBody: {
            topicName: process.env.GMAIL_PUBSUB_TOPIC,
            labelIds: ['INBOX'],
            labelFilterAction: 'include'
          }
        });

        console.log('✅ Gmail push notifications enabled:', watchResponse.data);
        
        // Set up intelligent filters
        await this.createCommunityFilters();
        
        return watchResponse.data;
      } else {
        console.log('📧 Gmail authenticated successfully - push notifications skipped (development mode)');
        console.log('💡 To enable real-time monitoring, configure GMAIL_PUBSUB_TOPIC in your environment');
        
        // Set up intelligent filters without push notifications
        await this.createCommunityFilters();
        
        return {
          message: 'Gmail authentication successful - manual email processing available',
          realtimeMonitoring: false,
          developmentMode: true
        };
      }
    } catch (error) {
      console.error('❌ Gmail monitoring setup failed:', error);
      
      // Don't throw error in development mode - just log it
      if (!process.env.GMAIL_PUBSUB_TOPIC) {
        console.log('⚠️  Push notification setup failed (expected in development mode)');
        console.log('✅ Gmail authentication completed successfully');
        
        // Set up basic filters
        await this.createCommunityFilters();
        
        return {
          message: 'Gmail authentication successful - push notifications unavailable in development',
          realtimeMonitoring: false,
          error: error.message
        };
      }
      
      throw error;
    }
  }

  /**
   * Process new email with smart community context detection
   */
  async processNewEmail(emailId) {
    try {
      // Get full email data
      const email = await this.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      });

      const emailData = this.parseEmailData(email.data);
      
      // Apply smart intelligence to determine relevance and context
      const intelligence = await this.analyzeEmailIntelligence(emailData);
      
      if (intelligence.isRelevant) {
        console.log('🎯 Relevant community email detected:', {
          subject: emailData.subject,
          from: emailData.from,
          relevanceScore: intelligence.relevanceScore,
          detectedContext: intelligence.context
        });

        // Enrich with existing community data
        const enrichedData = await this.enrichWithCommunityContext(emailData, intelligence);
        
        // Store and trigger workflows
        await this.processCommunityEmail(enrichedData);
        
        this.emit('communityEmailProcessed', enrichedData);
      }

      return intelligence;
    } catch (error) {
      console.error('❌ Email processing failed:', error);
      throw error;
    }
  }

  /**
   * Analyze email to determine community relevance and context
   */
  async analyzeEmailIntelligence(emailData) {
    let relevanceScore = 0;
    const detectedContexts = [];
    let emailType = 'general';

    // Check sender domain
    const senderDomain = emailData.from.includes('@') ? 
      '@' + emailData.from.split('@')[1] : '';
    
    if (this.communityFilters.organizationDomains.some(domain => 
      senderDomain.toLowerCase().includes(domain.toLowerCase()))) {
      relevanceScore += 30;
      detectedContexts.push('known_organization');
    }

    // Check for project keywords in subject and body
    const textToAnalyze = `${emailData.subject} ${emailData.body}`.toLowerCase();
    
    this.communityFilters.projectKeywords.forEach(keyword => {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        relevanceScore += 25;
        detectedContexts.push(`project_${keyword.replace(/\s+/g, '_')}`);
      }
    });

    // Check subject patterns
    this.communityFilters.subjectPatterns.forEach(pattern => {
      if (pattern.test(emailData.subject)) {
        relevanceScore += 20;
        detectedContexts.push('subject_pattern_match');
      }
    });

    // Detect specific contexts
    Object.entries(this.contextPatterns).forEach(([context, pattern]) => {
      if (pattern.test(textToAnalyze)) {
        detectedContexts.push(context);
        relevanceScore += 15;
        
        if (context === 'funding') emailType = 'funding_opportunity';
        if (context === 'partnership') emailType = 'partnership_inquiry';
        if (context === 'urgent') relevanceScore += 10; // Boost urgent emails
      }
    });

    // Check if sender exists in Notion contacts
    const existingContact = await this.findNotionContact(emailData.from);
    if (existingContact) {
      relevanceScore += 40;
      detectedContexts.push('existing_community_member');
    }

    return {
      isRelevant: relevanceScore >= 25, // Threshold for community relevance
      relevanceScore,
      context: detectedContexts,
      emailType,
      urgency: detectedContexts.includes('urgent') ? 'high' : 'normal',
      suggestedActions: this.suggestActions(detectedContexts, emailType)
    };
  }

  /**
   * Enrich email data with existing community context from Notion
   */
  async enrichWithCommunityContext(emailData, intelligence) {
    const enrichedData = { ...emailData, intelligence };

    try {
      // Find existing contact in Notion
      const notionContact = await this.findNotionContact(emailData.from);
      if (notionContact) {
        enrichedData.communityContact = notionContact;
        
        // Get related projects
        const relatedProjects = await this.findRelatedProjects(notionContact, emailData);
        enrichedData.relatedProjects = relatedProjects;
        
        // Get relationship history
        const relationshipHistory = await this.getRelationshipHistory(notionContact.id);
        enrichedData.relationshipHistory = relationshipHistory;
      } else {
        // Suggest creating new contact
        enrichedData.suggestedContact = await this.suggestNewContact(emailData);
      }

      // Detect mentioned projects in email content
      const mentionedProjects = await this.detectProjectMentions(emailData);
      enrichedData.mentionedProjects = mentionedProjects;

      // Extract key information
      enrichedData.extractedInfo = this.extractKeyInformation(emailData);

      return enrichedData;
    } catch (error) {
      console.error('❌ Context enrichment failed:', error);
      return enrichedData;
    }
  }

  /**
   * Find existing contact in Notion database
   */
  async findNotionContact(email) {
    try {
      // Query Notion People database
      const query = {
        database_id: process.env.NOTION_PEOPLE_DATABASE_ID,
        filter: {
          property: 'Email',
          email: {
            equals: email
          }
        }
      };

      const response = await empathyLedgerService.queryNotionDatabase(query);
      
      if (response.results && response.results.length > 0) {
        const person = response.results[0];
        return {
          id: person.id,
          name: person.properties.Name?.title?.[0]?.text?.content || email,
          email: person.properties.Email?.email || email,
          organization: person.properties.Organization?.rich_text?.[0]?.text?.content,
          relationshipType: person.properties['Relationship Type']?.select?.name,
          relationshipStrength: person.properties['Relationship Strength']?.select?.name,
          lastContact: person.properties['Last Contact']?.date?.start,
          projects: person.properties.Projects?.relation || []
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Notion contact lookup failed:', error);
      return null;
    }
  }

  /**
   * Detect mentioned projects in email content
   */
  async detectProjectMentions(emailData) {
    const mentionedProjects = [];
    const content = `${emailData.subject} ${emailData.body}`.toLowerCase();

    try {
      // Get all active projects from Notion
      const projectsResponse = await empathyLedgerService.getProjects();
      
      if (projectsResponse && projectsResponse.length > 0) {
        projectsResponse.forEach(project => {
          const projectName = project.name?.toLowerCase();
          if (projectName && content.includes(projectName)) {
            mentionedProjects.push({
              id: project.id,
              name: project.name,
              status: project.status,
              area: project.area,
              matchType: 'exact_name'
            });
          }
        });
      }

      return mentionedProjects;
    } catch (error) {
      console.error('❌ Project mention detection failed:', error);
      return [];
    }
  }

  /**
   * Extract key information from email content
   */
  extractKeyInformation(emailData) {
    const info = {
      amounts: [],
      dates: [],
      organizations: [],
      locations: [],
      keyPhrases: []
    };

    const content = `${emailData.subject} ${emailData.body}`;

    // Extract monetary amounts
    const amountMatches = content.match(/\$[\d,]+|\$\d+[km]|\d+[km]\s*dollars?/gi);
    if (amountMatches) {
      info.amounts = amountMatches;
    }

    // Extract dates
    const dateMatches = content.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b\w+\s+\d{1,2},?\s+\d{4}\b/gi);
    if (dateMatches) {
      info.dates = dateMatches;
    }

    // Extract organization mentions
    const orgMatches = content.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|LLC|Ltd|Foundation|Organization|Institute|University|College)\b/g);
    if (orgMatches) {
      info.organizations = orgMatches;
    }

    // Extract key action phrases
    const actionPhrases = [
      'would like to partner', 'seeking collaboration', 'funding opportunity',
      'grant application', 'letter of support', 'project proposal',
      'partnership agreement', 'would like to meet', 'schedule a call'
    ];

    actionPhrases.forEach(phrase => {
      if (content.toLowerCase().includes(phrase)) {
        info.keyPhrases.push(phrase);
      }
    });

    return info;
  }

  /**
   * Suggest actions based on email analysis
   */
  suggestActions(contexts, emailType) {
    const actions = [];

    if (contexts.includes('funding')) {
      actions.push({
        type: 'create_opportunity',
        priority: 'high',
        description: 'Create funding opportunity in Notion',
        automated: false
      });
    }

    if (contexts.includes('partnership')) {
      actions.push({
        type: 'schedule_meeting',
        priority: 'medium',
        description: 'Schedule partnership discussion',
        automated: false
      });
    }

    if (contexts.includes('urgent')) {
      actions.push({
        type: 'notify_team',
        priority: 'high',
        description: 'Send urgent notification to Slack',
        automated: true
      });
    }

    if (!contexts.includes('existing_community_member')) {
      actions.push({
        type: 'create_contact',
        priority: 'low',
        description: 'Add to community contact database',
        automated: true
      });
    }

    return actions;
  }

  /**
   * Process community email and trigger appropriate workflows
   */
  async processCommunityEmail(enrichedData) {
    try {
      // Store email in community database
      await this.storeCommunityEmail(enrichedData);

      // Execute suggested actions
      for (const action of enrichedData.intelligence.suggestedActions) {
        if (action.automated) {
          await this.executeAutomatedAction(action, enrichedData);
        }
      }

      // Update daily habits tracker
      await this.updateCommunityActivity(enrichedData);

      // Send notifications if needed
      if (enrichedData.intelligence.urgency === 'high') {
        await this.sendUrgentNotifications(enrichedData);
      }

      return true;
    } catch (error) {
      console.error('❌ Community email processing failed:', error);
      throw error;
    }
  }

  /**
   * Store community email in database
   */
  async storeCommunityEmail(enrichedData) {
    const emailRecord = {
      message_id: enrichedData.id,
      thread_id: enrichedData.threadId,
      from_email: enrichedData.from,
      to_email: enrichedData.to,
      subject: enrichedData.subject,
      body_preview: enrichedData.body.substring(0, 500),
      received_date: new Date(enrichedData.date),
      
      // Intelligence data
      relevance_score: enrichedData.intelligence.relevanceScore,
      email_type: enrichedData.intelligence.emailType,
      detected_contexts: enrichedData.intelligence.context,
      urgency: enrichedData.intelligence.urgency,
      
      // Community context
      community_contact_id: enrichedData.communityContact?.id,
      mentioned_projects: enrichedData.mentionedProjects?.map(p => p.id),
      extracted_info: enrichedData.extractedInfo,
      
      processed_at: new Date()
    };

    // Store in your existing database
    return await empathyLedgerService.storeCommunityEmail(emailRecord);
  }

  /**
   * Parse raw Gmail message data
   */
  parseEmailData(message) {
    const headers = message.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    let body = '';
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    } else if (message.payload.parts) {
      // Handle multipart messages
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body,
      labels: message.labelIds || []
    };
  }

  /**
   * Create intelligent Gmail filters for community emails
   */
  async createCommunityFilters() {
    // This would create Gmail filters to automatically label community emails
    // Implementation depends on your specific Gmail setup preferences
    console.log('📋 Community filters configured for intelligent email processing');
  }

  /**
   * Get authentication URL for OAuth flow
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  /**
   * Handle OAuth callback and store tokens
   */
  async handleAuthCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      await this.storeTokens(tokens);
      this.isAuthenticated = true;
      
      console.log('✅ Gmail authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Gmail authentication failed:', error);
      return false;
    }
  }

  /**
   * Store OAuth tokens securely
   */
  async storeTokens(tokens) {
    try {
      await this.redis.set('gmail:tokens', JSON.stringify(tokens));
      console.log('🔐 Gmail tokens stored in Redis');
    } catch (e) {
      // Fallback to in-memory if Redis unavailable
      global.gmailTokens = tokens;
      console.log('🔐 Gmail tokens stored in memory (Redis unavailable)');
    }
  }

  /**
   * Load stored OAuth tokens (File system primary, Redis fallback)
   */
  async loadStoredTokens() {
    // Prefer explicit path when provided
    const candidatePaths = [];
    if (process.env.GMAIL_TOKENS_PATH) {
      candidatePaths.push(process.env.GMAIL_TOKENS_PATH);
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const cwd = process.cwd();

      // Default search locations relative to the current working directory
      candidatePaths.push(
        path.join(cwd, '.gmail_tokens.json'),
        path.join(cwd, '..', '.gmail_tokens.json'),
        path.join(cwd, '..', '..', '.gmail_tokens.json')
      );

      // Remove duplicates while preserving order
      const seen = new Set();
      for (const candidate of candidatePaths) {
        if (!candidate || seen.has(candidate)) continue;
        seen.add(candidate);

        try {
          const tokensJson = await fs.readFile(candidate, 'utf8');
          if (tokensJson) {
            console.log(`🔐 Loaded Gmail tokens from ${candidate}`);
            return JSON.parse(tokensJson);
          }
        } catch (readError) {
          // Continue to next candidate
        }
      }
    } catch (e) {
      // fs/path import failed – continue to Redis fallback
    }

    // Fallback to Redis cache
    try {
      const tokensJson = await this.redis.get('gmail:tokens');
      if (tokensJson) {
        console.log('🔐 Loaded Gmail tokens from Redis cache');
        return JSON.parse(tokensJson);
      }
    } catch (e) {
      // Ignore and try next fallback
    }

    // Final fallback to environment-provided tokens or process memory
    const refreshToken =
      process.env.GMAIL_REFRESH_TOKEN ||
      process.env.GOOGLE_REFRESH_TOKEN ||
      process.env.GOOGLE_CALENDAR_REFRESH_TOKEN ||
      null;

    if (refreshToken) {
      const accessToken =
        process.env.GMAIL_ACCESS_TOKEN ||
        process.env.GOOGLE_ACCESS_TOKEN ||
        process.env.GOOGLE_CALENDAR_ACCESS_TOKEN ||
        null;

      console.log('🔐 Loaded Gmail tokens from environment variables');
      return {
        refresh_token: refreshToken,
        access_token: accessToken
      };
    }

    return global.gmailTokens || null;
  }

  /**
   * Get Gmail sync statistics
   */
  async getStats() {
    try {
      // Get stats from database or service state
      return {
        totalProcessed: 0,
        communityEmails: 0,
        contactsSync: 0,
        lastSync: null
      };
    } catch (error) {
      console.error('❌ Failed to get Gmail sync stats:', error);
      return {
        totalProcessed: 0,
        communityEmails: 0,
        contactsSync: 0,
        lastSync: null
      };
    }
  }

  /**
   * Get service status for API endpoints
   */
  getStatus() {
    return {
      authenticated: this.isAuthenticated,
      hasTokens: this.oauth2Client && this.oauth2Client.credentials ? true : false,
      initialized: this.gmail !== null,
      connectedEmail: this.oauth2Client?.credentials?.email || null
    };
  }

  /**
   * Check if monitoring is active
   */
  get isMonitoring() {
    // In development mode without Pub/Sub, we're "monitoring" via manual processing
    return this.isAuthenticated && this.gmail !== null;
  }

  /**
   * Process Gmail history changes
   */
  async processHistoryChange(historyId) {
    try {
      if (!this.isAuthenticated) {
        console.log('Gmail not authenticated, skipping history processing');
        return;
      }

      console.log('📧 Processing Gmail history change:', historyId);
      // Implementation would process specific history changes
      return true;
    } catch (error) {
      console.error('❌ History processing failed:', error);
      return false;
    }
  }

  /**
   * Sync Gmail contacts with Notion
   */
  async syncContactsWithNotion() {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Gmail not authenticated');
      }

      console.log('📇 Starting Gmail contact sync with Notion...');
      
      // This would implement the actual contact sync logic
      return {
        total: 0,
        created: 0,
        updated: 0,
        matched: 0
      };
    } catch (error) {
      console.error('❌ Contact sync failed:', error);
      throw error;
    }
  }

  /**
   * Get recent community emails
   */
  async getCommunityEmails(options = {}) {
    try {
      const { limit = 20, days = 7 } = options;
      
      if (!this.supabase) {
        console.warn('⚠️  Supabase client unavailable – returning empty community email list');
        return [];
      }

      const since = new Date();
      if (Number.isFinite(days) && days > 0) {
        since.setDate(since.getDate() - Number(days));
      }

      const query = this.supabase
        .from('community_emails')
        .select(`
          id,
          message_id,
          thread_id,
          from_email,
          from_name,
          to_email,
          subject,
          body_preview,
          received_date,
          relevance_score,
          email_type,
          detected_contexts,
          urgency,
          community_contact_id,
          mentioned_projects,
          extracted_info
        `)
        .order('received_date', { ascending: false })
        .limit(Number(limit) || 20);

      if (Number.isFinite(days) && days > 0) {
        query.gte('received_date', since.toISOString());
      }

      const { data: emails, error } = await query;
      if (error) {
        throw error;
      }

      if (!emails || emails.length === 0) {
        return [];
      }

      // Build lookups for related contacts and projects
      const contactIds = [...new Set(emails.map((email) => email.community_contact_id).filter(Boolean))];
      const projectIds = [...new Set(
        emails
          .flatMap((email) => Array.isArray(email.mentioned_projects) ? email.mentioned_projects : [])
          .filter(Boolean)
      )];

      const contactLookup = {};
      if (contactIds.length > 0) {
        const { data: contacts, error: contactError } = await this.supabase
          .from('notion_people')
          .select('id, full_name, primary_email, organization_name')
          .in('id', contactIds);

        if (contactError) {
          console.warn('⚠️  Failed to load contact details for community emails:', contactError.message);
        } else if (contacts) {
          for (const contact of contacts) {
            contactLookup[contact.id] = contact;
          }
        }
      }

      const projectLookup = {};
      if (projectIds.length > 0) {
        const { data: projects, error: projectError } = await this.supabase
          .from('notion_projects')
          .select('id, project_name, status')
          .in('id', projectIds);

        if (projectError) {
          console.warn('⚠️  Failed to load project details for community emails:', projectError.message);
        } else if (projects) {
          for (const project of projects) {
            projectLookup[project.id] = {
              id: project.id,
              name: project.project_name,
              status: project.status
            };
          }
        }
      }

      return emails.map((email) => ({
        ...email,
        received_date: email.received_date ? new Date(email.received_date).toISOString() : null,
        detected_contexts: email.detected_contexts || [],
        contact: email.community_contact_id ? contactLookup[email.community_contact_id] || null : null,
        projects: Array.isArray(email.mentioned_projects)
          ? email.mentioned_projects.map((id) => projectLookup[id] || { id, name: null })
          : []
      }));
    } catch (error) {
      console.error('❌ Failed to get community emails:', error);
      return [];
    }
  }

  /**
   * Save current filters configuration
   */
  async saveFilters() {
    try {
      console.log('💾 Saving Gmail sync filters configuration');
      // This would save filters to database or config file
      return true;
    } catch (error) {
      console.error('❌ Failed to save filters:', error);
      return false;
    }
  }

  /**
   * Update community activity tracker
   */
  async updateCommunityActivity(enrichedData) {
    try {
      console.log('📊 Updating community activity with email data');
      // This would update the daily habits tracker
      return true;
    } catch (error) {
      console.error('❌ Failed to update community activity:', error);
      return false;
    }
  }

  /**
   * Send urgent notifications
   */
  async sendUrgentNotifications(enrichedData) {
    try {
      console.log('🚨 Sending urgent notifications for email:', enrichedData.subject);
      // This would send Slack/WhatsApp notifications
      return true;
    } catch (error) {
      console.error('❌ Failed to send urgent notifications:', error);
      return false;
    }
  }

  /**
   * Execute automated actions
   */
  async executeAutomatedAction(action, enrichedData) {
    try {
      console.log('🤖 Executing automated action:', action.type);
      
      switch (action.type) {
        case 'create_contact':
          // Auto-create contact in Notion
          break;
        case 'notify_team':
          // Send team notification
          break;
        default:
          console.log('Unknown automated action:', action.type);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Automated action failed:', error);
      return false;
    }
  }

  /**
   * Find related projects for a contact
   */
  async findRelatedProjects(contact, emailData) {
    try {
      // This would find projects related to the contact
      return [];
    } catch (error) {
      console.error('❌ Failed to find related projects:', error);
      return [];
    }
  }

  /**
   * Get relationship history for a contact
   */
  async getRelationshipHistory(contactId) {
    try {
      // This would get interaction history from database
      return [];
    } catch (error) {
      console.error('❌ Failed to get relationship history:', error);
      return [];
    }
  }

  /**
   * Suggest new contact based on email data
   */
  async suggestNewContact(emailData) {
    try {
      return {
        email: emailData.from,
        name: emailData.from.split('@')[0],
        suggested: true
      };
    } catch (error) {
      console.error('❌ Failed to suggest new contact:', error);
      return null;
    }
  }
}

export default SmartGmailSyncService;
