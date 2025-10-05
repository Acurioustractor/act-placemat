/**
 * Production Gmail Service
 * Proper OAuth token management without constant re-authentication
 */

import { google } from 'googleapis';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

class ProductionGmailService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
    this.tokenFile = path.join(process.cwd(), '.gmail_tokens.json');
    this.isAuthenticated = false;
  }

  /**
   * Initialize Gmail service with persistent token management
   * NO FRONTEND AUTH BULLSHIT - just load tokens and work
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Production Gmail Service...');
      
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'urn:ietf:wg:oauth:2.0:oob' // Desktop OAuth client uses OOB flow
      );

      // Load existing tokens - REQUIRED to work
      const tokens = await this.loadTokens();
      if (!tokens) {
        console.log('❌ No Gmail tokens found!');
        console.log('🔧 Run "node setup-gmail-once.js" to set up Gmail authentication');
        this.isAuthenticated = false;
        return false;
      }

      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;
      
      // Set up automatic token refresh
      this.oauth2Client.on('tokens', async (newTokens) => {
        console.log('🔄 Auto-refreshing Gmail tokens...');
        const updatedTokens = { ...tokens, ...newTokens };
        await this.saveTokens(updatedTokens);
      });
      
      console.log('✅ Gmail tokens loaded successfully');

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Test connection - MUST work or we fail
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        console.log('❌ Gmail connection failed!');
        console.log('🔧 Run "node setup-gmail-once.js" to re-authenticate Gmail');
        this.isAuthenticated = false;
        return false;
      }
      
      console.log('🎯 Gmail service ready for intelligence gathering!');
      return true;
    } catch (error) {
      console.error('❌ Gmail service initialization failed:', error);
      console.log('🔧 Run "node setup-gmail-once.js" to set up Gmail authentication');
      return false;
    }
  }

  /**
   * Test Gmail connection and refresh tokens if needed
   */
  async testConnection() {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      console.log('✅ Gmail connection verified:', response.data.emailAddress);
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      if (error.code === 401) {
        console.log('⚠️ Gmail tokens expired, need re-authentication');
        this.isAuthenticated = false;
        await this.clearTokens();
      } else {
        console.error('❌ Gmail connection test failed:', error);
      }
      return false;
    }
  }

  /**
   * Load tokens from secure file storage
   */
  async loadTokens() {
    try {
      const data = await fs.readFile(this.tokenFile, 'utf8');
      const tokens = JSON.parse(data);
      
      // Verify tokens have required fields
      if (tokens.access_token || tokens.refresh_token) {
        return tokens;
      }
      
      return null;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error loading tokens:', error);
      }
      return null;
    }
  }

  /**
   * Save tokens to secure file storage
   */
  async saveTokens(tokens) {
    try {
      await fs.writeFile(this.tokenFile, JSON.stringify(tokens, null, 2));
      console.log('💾 Gmail tokens saved securely');
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
    }
  }

  /**
   * Clear stored tokens
   */
  async clearTokens() {
    try {
      await fs.unlink(this.tokenFile);
      console.log('🗑️ Gmail tokens cleared');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error clearing tokens:', error);
      }
    }
    this.isAuthenticated = false;
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
      scope: scopes,
      prompt: 'consent' // Forces refresh token generation
    });
  }

  /**
   * Handle OAuth callback and store tokens permanently
   */
  async handleAuthCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Save tokens immediately
      await this.saveTokens(tokens);
      
      // Set credentials
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;
      
      // Set up auto-refresh
      this.oauth2Client.on('tokens', async (newTokens) => {
        const updatedTokens = { ...tokens, ...newTokens };
        await this.saveTokens(updatedTokens);
      });
      
      console.log('✅ Gmail authentication completed and tokens saved');
      
      // Test the connection
      await this.testConnection();
      
      return true;
    } catch (error) {
      console.error('❌ Gmail authentication failed:', error);
      return false;
    }
  }

  /**
   * Make Gmail API request with automatic retry and token refresh
   */
  async makeRequest(operation, maxRetries = 2) {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        if (!this.isAuthenticated) {
          throw new Error('Gmail not authenticated');
        }
        
        return await operation(this.gmail);
        
      } catch (error) {
        if (error.code === 401 && retryCount < maxRetries - 1) {
          console.log('🔄 Access token expired, attempting refresh...');
          
          // Try to test connection (will trigger refresh if possible)
          const connectionOk = await this.testConnection();
          if (!connectionOk) {
            throw new Error('REAUTH_REQUIRED');
          }
          
          retryCount++;
          continue;
        }
        
        throw error;
      }
    }
  }

  /**
   * Get Gmail messages with intelligent batching
   */
  async getMessages(options = {}) {
    const { 
      maxResults = 100, 
      query = '', 
      includeSpamTrash = false 
    } = options;

    return this.makeRequest(async (gmail) => {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query,
        includeSpamTrash
      });

      return response.data.messages || [];
    });
  }

  /**
   * Get detailed message data
   */
  async getMessage(messageId) {
    return this.makeRequest(async (gmail) => {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      return response.data;
    });
  }

  /**
   * Search emails with smart queries
   */
  async searchEmails(searchOptions = {}) {
    const {
      keywords = [],
      fromEmail = null,
      toEmail = null,
      hasAttachment = false,
      dateAfter = null,
      dateBefore = null,
      maxResults = 50
    } = searchOptions;

    // Build Gmail search query
    let query = '';
    
    if (keywords.length > 0) {
      query += keywords.map(k => `"${k}"`).join(' OR ');
    }
    
    if (fromEmail) query += ` from:${fromEmail}`;
    if (toEmail) query += ` to:${toEmail}`;
    if (hasAttachment) query += ' has:attachment';
    if (dateAfter) query += ` after:${dateAfter}`;
    if (dateBefore) query += ` before:${dateBefore}`;

    console.log('🔍 Gmail search query:', query);

    const messages = await this.getMessages({
      maxResults,
      query: query.trim()
    });

    // Get detailed data for each message
    const detailedMessages = [];
    for (const message of messages.slice(0, Math.min(maxResults, 20))) {
      try {
        const detailed = await this.getMessage(message.id);
        detailedMessages.push(detailed);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`❌ Failed to get message ${message.id}:`, error);
      }
    }

    return detailedMessages;
  }

  /**
   * Extract contacts from Gmail data
   */
  extractContactsFromMessages(messages) {
    const contacts = new Map();
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

    messages.forEach(message => {
      const headers = message.payload?.headers || [];
      
      // Extract from headers
      headers.forEach(header => {
        if (['From', 'To', 'Cc', 'Reply-To'].includes(header.name)) {
          const matches = header.value.match(emailRegex);
          if (matches) {
            matches.forEach(email => {
              const cleanEmail = email.toLowerCase().trim();
              
              if (!contacts.has(cleanEmail)) {
                // Parse name from header if available
                const nameMatch = header.value.match(/^([^<]+)<[^>]+>$/);
                const name = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : null;
                
                contacts.set(cleanEmail, {
                  email: cleanEmail,
                  name: name || cleanEmail.split('@')[0],
                  frequency: 1,
                  sources: [header.name.toLowerCase()],
                  lastSeen: new Date(parseInt(message.internalDate)),
                  messageIds: [message.id]
                });
              } else {
                const contact = contacts.get(cleanEmail);
                contact.frequency++;
                contact.messageIds.push(message.id);
                contact.lastSeen = new Date(Math.max(
                  contact.lastSeen.getTime(),
                  parseInt(message.internalDate)
                ));
              }
            });
          }
        }
      });
    });

    return Array.from(contacts.values())
      .filter(contact => contact.frequency >= 2) // Only frequent contacts
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze email patterns for projects and opportunities
   */
  analyzeEmailPatterns(messages) {
    const patterns = {
      projects: new Map(),
      organizations: new Map(),
      opportunities: []
    };

    const projectKeywords = [
      'ANAT SPECTRA', 'Barkly Backbone', 'BG Fit', 'Black Cockatoo Valley',
      'Climate Justice Innovation Lab', 'Dad.Lab', 'Designing for Obsolescence',
      'Contained', 'PICC', 'Justice Hub', 'Empathy Ledger'
    ];

    const opportunityKeywords = [
      'funding', 'grant', 'partnership', 'collaboration', 'opportunity',
      'investment', 'support', 'sponsor', 'proposal'
    ];

    messages.forEach(message => {
      const subject = this.getHeader(message, 'Subject') || '';
      const snippet = message.snippet || '';
      const content = (subject + ' ' + snippet).toLowerCase();

      // Project detection
      projectKeywords.forEach(project => {
        if (content.includes(project.toLowerCase())) {
          if (!patterns.projects.has(project)) {
            patterns.projects.set(project, {
              name: project,
              mentions: 0,
              emails: [],
              contacts: new Set()
            });
          }
          
          const projectData = patterns.projects.get(project);
          projectData.mentions++;
          projectData.emails.push(message.id);
          
          const fromEmail = this.getHeader(message, 'From');
          if (fromEmail) {
            const emailMatch = fromEmail.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
              projectData.contacts.add(emailMatch[1].toLowerCase());
            }
          }
        }
      });

      // Opportunity detection
      const hasOpportunityKeyword = opportunityKeywords.some(keyword => 
        content.includes(keyword)
      );
      
      if (hasOpportunityKeyword) {
        patterns.opportunities.push({
          messageId: message.id,
          subject,
          snippet,
          from: this.getHeader(message, 'From'),
          date: new Date(parseInt(message.internalDate)),
          relevanceScore: this.calculateOpportunityRelevance(content)
        });
      }
    });

    // Convert projects Map to Array
    const projectsArray = Array.from(patterns.projects.values()).map(project => ({
      ...project,
      contacts: Array.from(project.contacts)
    }));

    return {
      projects: projectsArray,
      organizations: Array.from(patterns.organizations.values()),
      opportunities: patterns.opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore)
    };
  }

  /**
   * Helper method to get email header value
   */
  getHeader(message, headerName) {
    const headers = message.payload?.headers || [];
    const header = headers.find(h => h.name === headerName);
    return header ? header.value : null;
  }

  /**
   * Calculate opportunity relevance score
   */
  calculateOpportunityRelevance(content) {
    const highValueTerms = ['funding', 'grant', '$', 'million', 'thousand', 'investment'];
    const mediumValueTerms = ['partnership', 'collaboration', 'opportunity', 'proposal'];
    
    let score = 0;
    highValueTerms.forEach(term => {
      if (content.includes(term)) score += 3;
    });
    mediumValueTerms.forEach(term => {
      if (content.includes(term)) score += 1;
    });
    
    return score;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      authenticated: this.isAuthenticated,
      hasTokens: this.oauth2Client && this.oauth2Client.credentials && 
                 (this.oauth2Client.credentials.access_token || this.oauth2Client.credentials.refresh_token)
    };
  }
}

export default ProductionGmailService;