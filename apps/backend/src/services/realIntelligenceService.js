/**
 * Real Intelligence Service
 * Actually processes Gmail data and provides actionable insights
 * No fake numbers, no vanity metrics - real intelligence
 */

import SimpleGmailService from './simpleGmailService.js';
import empathyLedgerService from './empathyLedgerService.js';

class RealIntelligenceService {
  constructor() {
    this.gmailService = new SimpleGmailService();
    this.cache = new Map();
    this.lastUpdate = null;
  }

  /**
   * Initialize the intelligence service - IMAP JUST WORKS
   */
  async initialize() {
    console.log('🧠 Initializing Real Intelligence Service (IMAP)...');
    const gmailReady = await this.gmailService.initialize();
    
    if (!gmailReady) {
      console.log('❌ Gmail IMAP connection failed');
      return false;
    }
    
    console.log('✅ Gmail intelligence service ready!');
    return gmailReady;
  }

  /**
   * Gather real intelligence from Gmail - NOW EXTRACTS THOUSANDS
   */
  async gatherIntelligence(options = {}) {
    const {
      maxEmails = 5000,  // MASSIVELY INCREASED DEFAULT
      forceRefresh = false,
      dateRange = 365 * 5 // 5 YEARS of emails by default
    } = options;

    // Check cache first (unless forced refresh)
    const cacheKey = `intelligence_${maxEmails}_${dateRange}`;
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        console.log('📋 Using cached intelligence data');
        return cached.data;
      }
    }

    try {
      console.log(`🔍 Gathering real intelligence from ${maxEmails} emails...`);
      
      // IMAP is always ready - no auth checking needed
      console.log('📧 Using Gmail IMAP connection');

      // For maximum extraction - NO DATE FILTERING, GET EVERYTHING!
      console.log('🔍 Searching for ALL emails (no date filter)');

      // Search for ALL emails via IMAP - removed keywords and date filter
      const messages = await this.gmailService.searchEmails({
        keywords: [], // No keyword filtering - get EVERYTHING
        dateAfter: null, // No date filtering - get ALL HISTORY
        maxResults: maxEmails
      });

      console.log(`📧 Retrieved ${messages.length} relevant emails`);

      if (messages.length === 0) {
        return this.createEmptyIntelligence('No relevant emails found in the specified time range');
      }

      // Extract contacts
      const contacts = this.gmailService.extractContactsFromMessages(messages);
      console.log(`👥 Extracted ${contacts.length} contacts`);

      // Analyze patterns
      const patterns = this.gmailService.analyzeEmailPatterns(messages);
      console.log(`🎯 Found ${patterns.projects.length} project mentions, ${patterns.opportunities.length} opportunities`);

      // Generate insights
      const insights = this.generateRealInsights(contacts, patterns, messages);

      // Build comprehensive intelligence report
      const intelligence = {
        metadata: {
          timestamp: new Date().toISOString(),
          emailsAnalyzed: messages.length,
          dateRange: dateRange,
          maxEmails: maxEmails,
          processingTime: Date.now() - Date.now() // Will be calculated properly
        },
        contacts: {
          total: contacts.length,
          highValue: contacts.filter(c => c.frequency >= 5).length,
          data: contacts.slice(0, 50) // Top 50 contacts
        },
        projects: {
          total: patterns.projects.length,
          active: patterns.projects.filter(p => p.mentions >= 2).length,
          data: patterns.projects
        },
        opportunities: {
          total: patterns.opportunities.length,
          highPriority: patterns.opportunities.filter(o => o.relevanceScore >= 5).length,
          data: patterns.opportunities.slice(0, 20) // Top 20 opportunities
        },
        insights: insights,
        actionableItems: this.generateActionableItems(contacts, patterns.opportunities)
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: intelligence,
        timestamp: Date.now()
      });

      this.lastUpdate = new Date();
      console.log('✅ Real intelligence gathering completed');

      return intelligence;

    } catch (error) {
      console.error('❌ Intelligence gathering failed:', error);
      
      // IMAP connection issues
      if (error.message.includes('IMAP') || error.message.includes('connection')) {
        return this.createEmptyIntelligence('Gmail IMAP connection failed - check app password', false);
      }
      
      throw error;
    }
  }

  /**
   * Generate real, actionable insights from the data
   */
  generateRealInsights(contacts, patterns, messages) {
    const insights = [];

    // Contact insights
    if (contacts.length > 20) {
      const topContacts = contacts.slice(0, 10);
      insights.push({
        type: 'contacts',
        title: `${contacts.length} Active Community Contacts Identified`,
        description: `Found ${contacts.length} people you regularly communicate with. Top contacts include ${topContacts.slice(0, 3).map(c => c.name).join(', ')}.`,
        action: 'Review and add high-value contacts to your Notion People database',
        priority: 'high',
        data: topContacts
      });
    }

    // Project insights
    if (patterns.projects.length > 0) {
      const activeProjects = patterns.projects.filter(p => p.mentions >= 2);
      insights.push({
        type: 'projects',
        title: `${patterns.projects.length} Project Discussions Found`,
        description: `Active email discussions about ${activeProjects.length} projects. Most mentioned: ${patterns.projects[0]?.name}.`,
        action: 'Analyze project networks for collaboration opportunities',
        priority: 'high',
        data: activeProjects
      });
    }

    // Opportunity insights
    if (patterns.opportunities.length > 0) {
      const highValueOpps = patterns.opportunities.filter(o => o.relevanceScore >= 3);
      insights.push({
        type: 'opportunities',
        title: `${patterns.opportunities.length} Potential Opportunities Detected`,
        description: `Found ${highValueOpps.length} high-value opportunities in recent emails including funding and partnership discussions.`,
        action: 'Review opportunity emails and follow up on promising leads',
        priority: 'medium',
        data: highValueOpps
      });
    }

    // Network insights
    const domainAnalysis = this.analyzeDomains(contacts);
    if (domainAnalysis.organizations.length > 5) {
      insights.push({
        type: 'network',
        title: `Connected to ${domainAnalysis.organizations.length} Organizations`,
        description: `Your network spans ${domainAnalysis.organizations.length} different organizations. Strongest connections: ${domainAnalysis.organizations.slice(0, 3).map(o => o.name).join(', ')}.`,
        action: 'Map organization relationships for strategic partnerships',
        priority: 'medium',
        data: domainAnalysis.organizations.slice(0, 10)
      });
    }

    // Communication patterns
    const communicationInsights = this.analyzeCommunicationPatterns(messages);
    if (communicationInsights.peakDays.length > 0) {
      insights.push({
        type: 'communication',
        title: 'Communication Pattern Analysis',
        description: `Most active communication days: ${communicationInsights.peakDays.join(', ')}. ${communicationInsights.totalThreads} active conversation threads.`,
        action: 'Optimize outreach timing based on communication patterns',
        priority: 'low',
        data: communicationInsights
      });
    }

    return insights;
  }

  /**
   * Generate actionable items from intelligence
   */
  generateActionableItems(contacts, opportunities) {
    const actions = [];

    // High-value contacts to add
    const highValueContacts = contacts.filter(c => c.frequency >= 5);
    if (highValueContacts.length > 0) {
      actions.push({
        type: 'contact_extraction',
        title: `Add ${highValueContacts.length} High-Value Contacts to Notion`,
        description: 'These contacts have frequent communication and should be in your CRM',
        action: () => this.extractContactsToNotion(highValueContacts),
        priority: 'high',
        data: highValueContacts.slice(0, 10)
      });
    }

    // Follow-up opportunities
    const recentOpportunities = opportunities.filter(o => {
      const daysSince = (Date.now() - o.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30 && o.relevanceScore >= 3;
    });

    if (recentOpportunities.length > 0) {
      actions.push({
        type: 'opportunity_followup',
        title: `Follow Up on ${recentOpportunities.length} Recent Opportunities`,
        description: 'Recent funding/partnership discussions that may need follow-up',
        priority: 'high',
        data: recentOpportunities
      });
    }

    // Stale connections to rekindle
    const staleConnections = contacts.filter(c => {
      const daysSince = (Date.now() - c.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 60 && c.frequency >= 3;
    });

    if (staleConnections.length > 0) {
      actions.push({
        type: 'rekindle_connections',
        title: `Reconnect with ${staleConnections.length} Past Collaborators`,
        description: 'Valuable contacts you haven\'t spoken to recently',
        priority: 'medium',
        data: staleConnections.slice(0, 10)
      });
    }

    return actions;
  }

  /**
   * Extract ALL contacts efficiently (header extraction only)
   */
  async extractAllContactsEfficiently(options = {}) {
    const {
      maxContacts = 5000,
      forceRefresh = false
    } = options;

    const cacheKey = `all_contacts_${maxContacts}`;
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 600000) { // 10 minutes
        console.log('📋 Using cached contacts data');
        return cached.data;
      }
    }

    try {
      console.log(`📇 Efficiently extracting ALL Gmail contacts (limit: ${maxContacts})...`);
      
      // Use IMAP to get message headers only (no body processing)
      const headers = await this.gmailService.getMessageHeadersOnly({
        maxResults: maxContacts * 2, // Get more headers since many won't have unique contacts
        folders: ['INBOX', 'Sent Mail', '[Gmail]/All Mail'] // Cover all folders
      });

      console.log(`📧 Retrieved ${headers.length} email headers`);

      // Extract unique contacts from headers only
      const contactsMap = new Map();
      
      headers.forEach(header => {
        // Extract from "From" field
        if (header.from) {
          this.extractContactFromHeader(header.from, contactsMap, 'received');
        }
        
        // Extract from "To" field
        if (header.to) {
          header.to.split(',').forEach(email => {
            this.extractContactFromHeader(email.trim(), contactsMap, 'sent');
          });
        }
        
        // Extract from "CC" field
        if (header.cc) {
          header.cc.split(',').forEach(email => {
            this.extractContactFromHeader(email.trim(), contactsMap, 'cc');
          });
        }
      });

      // Convert to array and sort by frequency
      const allContacts = Array.from(contactsMap.values())
        .filter(contact => contact.email && contact.email.includes('@'))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, maxContacts);

      console.log(`👥 Extracted ${allContacts.length} unique contacts from ${headers.length} email headers`);

      // Cache results
      this.cache.set(cacheKey, {
        data: allContacts,
        timestamp: Date.now()
      });

      return allContacts;

    } catch (error) {
      console.error('❌ Efficient contact extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract contact from email header field
   */
  extractContactFromHeader(emailField, contactsMap, direction) {
    try {
      // Parse email field that might be "Name <email@domain.com>" or just "email@domain.com"
      const emailMatch = emailField.match(/<([^>]+)>/) || [null, emailField];
      const email = emailMatch[1] ? emailMatch[1].trim() : emailField.trim();
      const name = emailField.includes('<') ? emailField.split('<')[0].trim().replace(/"/g, '') : email.split('@')[0];

      // Skip invalid emails
      if (!email || !email.includes('@') || email.includes('noreply') || email.includes('no-reply')) {
        return;
      }

      // Skip our own emails
      if (email.includes('act.place') || email.includes('benjamin@')) {
        return;
      }

      if (contactsMap.has(email)) {
        const contact = contactsMap.get(email);
        contact.frequency += 1;
        contact.lastSeen = new Date();
        if (direction === 'received') contact.inboundCount += 1;
        if (direction === 'sent') contact.outboundCount += 1;
      } else {
        contactsMap.set(email, {
          name: name || email.split('@')[0],
          email: email,
          frequency: 1,
          inboundCount: direction === 'received' ? 1 : 0,
          outboundCount: direction === 'sent' ? 1 : 0,
          lastSeen: new Date(),
          source: 'Gmail Headers',
          organization: this.extractOrganization(email)
        });
      }
    } catch (error) {
      // Skip invalid header parsing
    }
  }

  /**
   * Actually extract contacts to Notion (not fake)
   */
  async extractContactsToNotion(contacts) {
    try {
      console.log(`📇 Extracting ${contacts.length} contacts to Notion...`);
      
      const results = {
        created: [],
        updated: [],
        errors: []
      };

      for (const contact of contacts) {
        try {
          const contactData = {
            name: contact.name,
            email: contact.email,
            organization: this.extractOrganization(contact.email),
            source: 'Gmail Intelligence',
            relationshipType: this.determineRelationshipType(contact),
            relationshipStrength: contact.frequency >= 10 ? 'Strong' : contact.frequency >= 5 ? 'Medium' : 'Weak',
            frequency: contact.frequency,
            lastContact: contact.lastSeen.toISOString(),
            notes: `Gmail Intelligence: ${contact.frequency} email exchanges. Last contact: ${contact.lastSeen.toDateString()}`
          };

          const result = await empathyLedgerService.createPerson(contactData);
          results.created.push(result);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Failed to create contact ${contact.email}:`, error);
          results.errors.push({ contact, error: error.message });
        }
      }

      console.log(`✅ Contact extraction completed: ${results.created.length} created, ${results.errors.length} errors`);
      return results;

    } catch (error) {
      console.error('❌ Contact extraction failed:', error);
      throw error;
    }
  }

  /**
   * Analyze domains to identify organizations
   */
  analyzeDomains(contacts) {
    const domainMap = new Map();
    
    contacts.forEach(contact => {
      const domain = contact.email.split('@')[1];
      if (!domain || ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
        return;
      }
      
      if (!domainMap.has(domain)) {
        domainMap.set(domain, {
          name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
          domain: domain,
          contacts: [],
          totalFrequency: 0
        });
      }
      
      const org = domainMap.get(domain);
      org.contacts.push(contact);
      org.totalFrequency += contact.frequency;
    });

    return {
      organizations: Array.from(domainMap.values())
        .sort((a, b) => b.totalFrequency - a.totalFrequency)
    };
  }

  /**
   * Analyze communication patterns
   */
  analyzeCommunicationPatterns(messages) {
    const dayOfWeek = {};
    const threadMap = new Map();

    messages.forEach(message => {
      const date = new Date(parseInt(message.internalDate));
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
      
      const threadId = message.threadId;
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, 1);
      } else {
        threadMap.set(threadId, threadMap.get(threadId) + 1);
      }
    });

    const sortedDays = Object.entries(dayOfWeek)
      .sort((a, b) => b[1] - a[1])
      .map(([day]) => day);

    return {
      peakDays: sortedDays.slice(0, 3),
      totalThreads: threadMap.size,
      avgMessagesPerThread: messages.length / threadMap.size,
      dayBreakdown: dayOfWeek
    };
  }

  /**
   * Helper methods
   */
  extractOrganization(email) {
    const domain = email.split('@')[1];
    if (!domain || ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
      return null;
    }
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  }

  determineRelationshipType(contact) {
    if (contact.frequency >= 10) return 'Collaborator';
    if (contact.frequency >= 5) return 'Partner';
    return 'Contact';
  }

  createEmptyIntelligence(reason, authRequired = false) {
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        emailsAnalyzed: 0,
        processingTime: 0,
        error: reason,
        authRequired
      },
      contacts: { total: 0, highValue: 0, data: [] },
      projects: { total: 0, active: 0, data: [] },
      opportunities: { total: 0, highPriority: 0, data: [] },
      insights: [{
        type: 'setup',
        title: authRequired ? 'Gmail Authentication Required' : 'No Data Available',
        description: reason,
        action: authRequired ? 'Complete Gmail authentication to unlock intelligence features' : 'Try adjusting search parameters',
        priority: 'high'
      }],
      actionableItems: []
    };
  }

  /**
   * Get authentication URL
   */
  getAuthUrl() {
    return this.gmailService.getAuthUrl();
  }

  /**
   * Handle authentication callback
   */
  async handleAuthCallback(code) {
    return this.gmailService.handleAuthCallback(code);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      ...this.gmailService.getStatus(),
      lastUpdate: this.lastUpdate,
      cacheSize: this.cache.size
    };
  }
}

export default RealIntelligenceService;