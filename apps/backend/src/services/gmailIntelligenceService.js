/**
 * Gmail Intelligence Service - Deep Gmail Mining for ACT Community
 * Scans entire Gmail history to extract project data, contacts, and organizations
 */

import { google } from 'googleapis';
import empathyLedgerService from './empathyLedgerService.js';

export class GmailIntelligenceService {
  constructor(gmailSyncService) {
    this.gmailSync = gmailSyncService;
    this.gmail = null;
    this.intelligenceCache = new Map();
    
    // Enhanced intelligence patterns for deep analysis
    this.deepPatterns = {
      // Project identification patterns
      projectMentions: [
        /project\s+([A-Z][a-zA-Z\s]{2,30})/gi,
        /initiative\s+([A-Z][a-zA-Z\s]{2,30})/gi,
        /program\s+([A-Z][a-zA-Z\s]{2,30})/gi,
        /(ANAT SPECTRA|Barkly Backbone|BG Fit|Black Cockatoo Valley|Climate Justice Innovation Lab|Dad\.Lab|Designing for Obsolescence|Contained|PICC|Justice Hub|Empathy Ledger)/gi
      ],
      
      // Contact extraction patterns
      contactPatterns: [
        // Name with email
        /([A-Z][a-z]+ [A-Z][a-z]+)\s*<([^>]+@[^>]+)>/g,
        // Email signatures
        /(?:Best regards?|Cheers|Thanks),?\s*\n([A-Z][a-z]+ [A-Z][a-z]+)/g,
        // Meeting attendees
        /attendees?:?\s*([A-Z][a-z]+ [A-Z][a-z]+(?:,\s*[A-Z][a-z]+ [A-Z][a-z]+)*)/gi
      ],
      
      // Organization detection patterns
      organizationPatterns: [
        // Company domains
        /@([a-zA-Z0-9.-]+\.(org|com|edu|gov|net|au))/g,
        // Organization mentions
        /(?:at|from|with)\s+([A-Z][a-zA-Z\s&]{3,40}(?:Ltd|Inc|Pty|Foundation|Institute|University|College|Organization))/g,
        // Funding bodies
        /(Australian Research Council|ARC|NHMRC|Department of|Ministry of|Council for)/gi
      ],
      
      // Partnership/collaboration patterns
      partnershipPatterns: [
        /partnership with ([A-Z][a-zA-Z\s]{3,30})/gi,
        /collaboration between ([A-Z][a-zA-Z\s]{3,30}) and ([A-Z][a-zA-Z\s]{3,30})/gi,
        /working with ([A-Z][a-zA-Z\s]{3,30})/gi,
        /joint (?:venture|project) with ([A-Z][a-zA-Z\s]{3,30})/gi
      ],
      
      // Funding/financial patterns
      fundingPatterns: [
        /\$([0-9,]+(?:\.[0-9]{2})?)[km]?/g,
        /([0-9,]+) dollars?/gi,
        /grant of ([0-9,]+)/gi,
        /funding of ([0-9,]+)/gi,
        /budget of ([0-9,]+)/gi
      ],
      
      // Timeline patterns
      timelinePatterns: [
        /deadline:?\s*([A-Z][a-z]+ \d{1,2},? \d{4})/gi,
        /due:?\s*([A-Z][a-z]+ \d{1,2},? \d{4})/gi,
        /launch:?\s*([A-Z][a-z]+ \d{4})/gi,
        /starts?:?\s*([A-Z][a-z]+ \d{1,2},? \d{4})/gi
      ]
    };
  }

  /**
   * Initialize Gmail Intelligence with authenticated Gmail service
   */
  async initialize() {
    if (!this.gmailSync.isAuthenticated) {
      throw new Error('Gmail must be authenticated before running intelligence');
    }
    
    this.gmail = this.gmailSync.gmail;
    console.log('🧠 Gmail Intelligence Service initialized');
    return true;
  }

  /**
   * DEEP SEARCH: Comprehensive Gmail history analysis
   */
  async performDeepSearch(options = {}) {
    const {
      maxEmails = 1000,
      startDate = null,
      endDate = null,
      specificProjects = [],
      includeArchived = true
    } = options;

    console.log(`🔍 Starting DEEP GMAIL SEARCH - analyzing up to ${maxEmails} emails...`);
    
    const intelligence = {
      searchMetadata: {
        startTime: new Date(),
        maxEmails,
        actualEmailsProcessed: 0,
        dateRange: { startDate, endDate }
      },
      discoveries: {
        projects: [],
        contacts: [],
        organizations: [],
        partnerships: [],
        fundingOpportunities: [],
        timelines: []
      },
      insights: {
        topContacts: [],
        topOrganizations: [],
        projectActivity: [],
        relationshipMap: new Map()
      }
    };

    try {
      // Get email list with advanced search query
      const searchQuery = this.buildSearchQuery(specificProjects, startDate, endDate);
      console.log('📧 Search query:', searchQuery);

      const emailList = await this.gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: maxEmails,
        includeSpamTrash: false
      });

      if (!emailList.data.messages) {
        console.log('📭 No emails found matching search criteria');
        return intelligence;
      }

      console.log(`📬 Found ${emailList.data.messages.length} emails to analyze`);

      // Process emails in batches for performance
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < emailList.data.messages.length; i += batchSize) {
        batches.push(emailList.data.messages.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}...`);
        
        const batch = batches[batchIndex];
        const batchPromises = batch.map(message => this.analyzeEmail(message.id));
        const batchResults = await Promise.all(batchPromises);
        
        // Aggregate results
        batchResults.forEach(result => {
          if (result) {
            this.aggregateIntelligence(intelligence, result);
            intelligence.searchMetadata.actualEmailsProcessed++;
          }
        });

        // Brief pause to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Generate insights from discoveries
      intelligence.insights = await this.generateIntelligenceInsights(intelligence.discoveries);
      intelligence.searchMetadata.endTime = new Date();
      intelligence.searchMetadata.processingTime = intelligence.searchMetadata.endTime - intelligence.searchMetadata.startTime;

      console.log(`✅ DEEP SEARCH COMPLETE! Processed ${intelligence.searchMetadata.actualEmailsProcessed} emails`);
      console.log(`🎯 Found: ${intelligence.discoveries.projects.length} projects, ${intelligence.discoveries.contacts.length} contacts, ${intelligence.discoveries.organizations.length} organizations`);

      return intelligence;

    } catch (error) {
      console.error('❌ Deep search failed:', error);
      throw error;
    }
  }

  /**
   * Build advanced Gmail search query
   */
  buildSearchQuery(projects, startDate, endDate) {
    const queryParts = [];

    // Project keywords
    if (projects.length > 0) {
      const projectQuery = projects.map(p => `"${p}"`).join(' OR ');
      queryParts.push(`(${projectQuery})`);
    } else {
      // Default project terms
      const defaultTerms = [
        'project', 'partnership', 'collaboration', 'funding', 'grant',
        'research', 'initiative', 'program', 'proposal', 'application',
        'ANAT SPECTRA', 'Barkly Backbone', 'BG Fit', 'Climate Justice',
        'PICC', 'Justice Hub', 'Empathy Ledger'
      ];
      const termsQuery = defaultTerms.map(t => `"${t}"`).join(' OR ');
      queryParts.push(`(${termsQuery})`);
    }

    // Date range
    if (startDate) {
      queryParts.push(`after:${startDate}`);
    }
    if (endDate) {
      queryParts.push(`before:${endDate}`);
    }

    // Exclude spam/trash by default
    queryParts.push('-in:spam -in:trash');

    return queryParts.join(' ');
  }

  /**
   * Analyze individual email for intelligence
   */
  async analyzeEmail(messageId) {
    try {
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const emailData = this.parseEmailData(message.data);
      const intelligence = {
        messageId,
        date: emailData.date,
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        projects: [],
        contacts: [],
        organizations: [],
        partnerships: [],
        funding: [],
        timelines: [],
        relevanceScore: 0
      };

      const fullText = `${emailData.subject} ${emailData.body}`;

      // Extract projects
      intelligence.projects = this.extractProjects(fullText);

      // Extract contacts  
      intelligence.contacts = this.extractContacts(emailData);

      // Extract organizations
      intelligence.organizations = this.extractOrganizations(fullText, emailData.from);

      // Extract partnerships
      intelligence.partnerships = this.extractPartnerships(fullText);

      // Extract funding information
      intelligence.funding = this.extractFunding(fullText);

      // Extract timelines
      intelligence.timelines = this.extractTimelines(fullText);

      // Calculate relevance score
      intelligence.relevanceScore = this.calculateIntelligenceScore(intelligence);

      return intelligence;

    } catch (error) {
      console.error(`❌ Failed to analyze email ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Extract project mentions with context
   */
  extractProjects(text) {
    const projects = [];
    const seen = new Set();

    this.deepPatterns.projectMentions.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const projectName = match[1] || match[0];
        const cleanName = projectName.trim();
        
        if (cleanName.length > 3 && !seen.has(cleanName.toLowerCase())) {
          projects.push({
            name: cleanName,
            context: this.getContext(text, match.index),
            confidence: this.calculateProjectConfidence(cleanName, text)
          });
          seen.add(cleanName.toLowerCase());
        }
      }
    });

    return projects;
  }

  /**
   * Extract contact information with smart parsing
   */
  extractContacts(emailData) {
    const contacts = [];
    const seen = new Set();

    // From header contact
    const fromContact = this.parseContact(emailData.from);
    if (fromContact && !seen.has(fromContact.email)) {
      contacts.push({...fromContact, source: 'from'});
      seen.add(fromContact.email);
    }

    // To header contacts
    if (emailData.to) {
      const toContacts = emailData.to.split(',').map(to => this.parseContact(to.trim()));
      toContacts.forEach(contact => {
        if (contact && !seen.has(contact.email)) {
          contacts.push({...contact, source: 'to'});
          seen.add(contact.email);
        }
      });
    }

    // Body contact patterns
    this.deepPatterns.contactPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(emailData.body)) !== null) {
        const contact = this.parseContactFromMatch(match);
        if (contact && !seen.has(contact.email)) {
          contacts.push({...contact, source: 'body'});
          seen.add(contact.email);
        }
      }
    });

    return contacts;
  }

  /**
   * Extract organizations with domain analysis
   */
  extractOrganizations(text, fromEmail) {
    const organizations = [];
    const seen = new Set();

    // Domain-based organization detection
    const fromDomain = fromEmail.split('@')[1];
    if (fromDomain && !this.isGenericDomain(fromDomain)) {
      organizations.push({
        name: this.domainToOrganization(fromDomain),
        domain: fromDomain,
        source: 'email_domain',
        confidence: 0.8
      });
      seen.add(fromDomain);
    }

    // Pattern-based organization detection
    this.deepPatterns.organizationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const orgName = match[1];
        if (orgName && orgName.length > 3 && !seen.has(orgName.toLowerCase())) {
          organizations.push({
            name: orgName.trim(),
            source: 'text_pattern',
            context: this.getContext(text, match.index),
            confidence: 0.6
          });
          seen.add(orgName.toLowerCase());
        }
      }
    });

    return organizations;
  }

  /**
   * Calculate intelligence relevance score
   */
  calculateIntelligenceScore(intelligence) {
    let score = 0;

    // Project mentions
    score += intelligence.projects.length * 20;

    // High-confidence contacts
    score += intelligence.contacts.filter(c => c.source === 'from' || c.source === 'to').length * 15;

    // Organizations
    score += intelligence.organizations.length * 10;

    // Partnerships
    score += intelligence.partnerships.length * 25;

    // Funding mentions
    score += intelligence.funding.length * 30;

    // Timeline mentions
    score += intelligence.timelines.length * 10;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Generate comprehensive insights from discoveries
   */
  async generateIntelligenceInsights(discoveries) {
    const insights = {
      topContacts: this.generateTopContacts(discoveries.contacts),
      topOrganizations: this.generateTopOrganizations(discoveries.organizations),
      projectActivity: this.generateProjectActivity(discoveries.projects),
      relationshipMap: this.generateRelationshipMap(discoveries),
      fundingInsights: this.generateFundingInsights(discoveries.funding),
      timelineInsights: this.generateTimelineInsights(discoveries.timelines)
    };

    return insights;
  }

  /**
   * Generate top contacts by frequency and relevance
   */
  generateTopContacts(allContacts) {
    const contactMap = new Map();

    allContacts.forEach(contact => {
      const key = contact.email || contact.name;
      if (contactMap.has(key)) {
        contactMap.get(key).frequency++;
        contactMap.get(key).sources.add(contact.source);
      } else {
        contactMap.set(key, {
          ...contact,
          frequency: 1,
          sources: new Set([contact.source])
        });
      }
    });

    return Array.from(contactMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)
      .map(contact => ({
        ...contact,
        sources: Array.from(contact.sources)
      }));
  }

  /**
   * Create new Notion contacts from Gmail intelligence
   */
  async createNotionContacts(contacts, options = {}) {
    const { dryRun = false, minFrequency = 2 } = options;
    
    console.log(`👥 Creating Notion contacts from ${contacts.length} discovered contacts...`);
    
    const results = {
      created: [],
      matched: [],
      skipped: [],
      errors: []
    };

    for (const contact of contacts) {
      try {
        // Skip low-frequency contacts unless explicitly requested
        if (contact.frequency < minFrequency) {
          results.skipped.push({...contact, reason: 'low_frequency'});
          continue;
        }

        // Check if contact already exists in Notion
        const existingContact = await this.gmailSync.findNotionContact(contact.email);
        
        if (existingContact) {
          results.matched.push({
            contact,
            existingContact,
            action: 'already_exists'
          });
          continue;
        }

        if (dryRun) {
          results.created.push({...contact, action: 'would_create'});
          continue;
        }

        // Create new contact in Notion
        const notionContact = await this.createNotionContact(contact);
        results.created.push({
          contact,
          notionContact,
          action: 'created'
        });

        console.log(`✅ Created Notion contact: ${contact.name || contact.email}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to create contact ${contact.email}:`, error);
        results.errors.push({
          contact,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Helper methods
   */
  parseEmailData(message) {
    const headers = message.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    let body = '';
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }

    return {
      id: message.id,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() // Strip HTML and normalize whitespace
    };
  }

  parseContact(contactString) {
    // Parse "Name <email@domain.com>" format
    const match = contactString.match(/^(.*?)\s*<([^>]+)>$/) || contactString.match(/^([^@]+@[^@]+)$/);
    
    if (match) {
      if (match[2]) {
        // Name and email format
        return {
          name: match[1].trim().replace(/"/g, ''),
          email: match[2].trim()
        };
      } else {
        // Email only format
        return {
          name: match[1].split('@')[0],
          email: match[1].trim()
        };
      }
    }
    
    return null;
  }

  getContext(text, index, contextLength = 100) {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + contextLength);
    return text.substring(start, end);
  }

  isGenericDomain(domain) {
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    return genericDomains.includes(domain.toLowerCase());
  }

  domainToOrganization(domain) {
    return domain.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Additional extraction methods would continue here...
  extractPartnerships(text) {
    // Implementation for partnership extraction
    return [];
  }

  extractFunding(text) {
    // Implementation for funding extraction
    return [];
  }

  extractTimelines(text) {
    // Implementation for timeline extraction
    return [];
  }

  calculateProjectConfidence(name, text) {
    // Implementation for project confidence calculation
    return 0.7;
  }

  generateTopOrganizations(organizations) {
    // Implementation for top organizations
    return [];
  }

  generateProjectActivity(projects) {
    // Implementation for project activity
    return [];
  }

  generateRelationshipMap(discoveries) {
    // Implementation for relationship mapping
    return new Map();
  }

  generateFundingInsights(funding) {
    // Implementation for funding insights
    return {};
  }

  generateTimelineInsights(timelines) {
    // Implementation for timeline insights
    return {};
  }

  aggregateIntelligence(mainIntelligence, emailIntelligence) {
    // Aggregate discoveries from individual email into main intelligence
    mainIntelligence.discoveries.projects.push(...emailIntelligence.projects);
    mainIntelligence.discoveries.contacts.push(...emailIntelligence.contacts);
    mainIntelligence.discoveries.organizations.push(...emailIntelligence.organizations);
    mainIntelligence.discoveries.partnerships.push(...emailIntelligence.partnerships);
    mainIntelligence.discoveries.fundingOpportunities.push(...emailIntelligence.funding);
    mainIntelligence.discoveries.timelines.push(...emailIntelligence.timelines);
  }

  parseContactFromMatch(match) {
    // Implementation for parsing contacts from regex matches
    return null;
  }

  async createNotionContact(contact) {
    try {
      console.log(`📝 Creating Notion contact for: ${contact.email}`);
      
      // Use the empathy ledger service to create the contact
      const contactData = {
        name: contact.name || contact.email.split('@')[0],
        email: contact.email,
        organization: contact.organization || this.extractOrganizationFromEmail(contact.email),
        source: 'Gmail Intelligence',
        relationshipType: this.determineRelationshipType(contact),
        relationshipStrength: this.calculateRelationshipStrength(contact),
        frequency: contact.frequency || 1,
        lastContact: contact.lastContact || new Date().toISOString(),
        tags: contact.tags || [],
        notes: `Discovered via Gmail intelligence. Email frequency: ${contact.frequency || 1}. Sources: ${contact.sources?.join(', ') || 'email'}`
      };

      // Create contact in Notion People database
      const result = await empathyLedgerService.createPerson(contactData);
      
      console.log(`✅ Notion contact created with ID: ${result.id}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to create Notion contact for ${contact.email}:`, error);
      throw new Error(`Notion contact creation failed: ${error.message}`);
    }
  }

  // Helper methods for contact creation
  extractOrganizationFromEmail(email) {
    const domain = email.split('@')[1];
    if (!domain) return null;
    
    // Skip common email providers
    const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    if (commonProviders.includes(domain.toLowerCase())) {
      return null;
    }
    
    // Convert domain to organization name
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  }

  determineRelationshipType(contact) {
    // Analyze contact patterns to determine relationship type
    if (contact.frequency > 10) return 'Collaborator';
    if (contact.frequency > 5) return 'Partner';
    if (contact.sources?.includes('partnership')) return 'Partner';
    if (contact.sources?.includes('funding')) return 'Funder';
    return 'Contact';
  }

  calculateRelationshipStrength(contact) {
    if (contact.frequency > 15) return 'Strong';
    if (contact.frequency > 5) return 'Medium';
    return 'Weak';
  }
}

export default GmailIntelligenceService;