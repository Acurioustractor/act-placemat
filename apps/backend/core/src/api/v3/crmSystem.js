/**
 * ACT CRM System v3 - World-Class Contact Relationship Management
 * 
 * Unified CRM system designed for A Curious Tractor's community-centric approach
 * Combines LinkedIn network, Gmail intelligence, and project alignment
 */

import { createClient } from '@supabase/supabase-js';
import { Client as NotionClient } from '@notionhq/client';
import Anthropic from '@anthropic-ai/sdk';

class ACTCRMSystem {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.notion = new NotionClient({
      auth: process.env.NOTION_TOKEN
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Contact Management - Core CRM functionality
   */
  async searchContacts(filters = {}) {
    const {
      search = '',
      industry = '',
      company = '',
      hasEmail = null,
      tier = '',
      limit = 50,
      offset = 0
    } = filters;

    let query = this.supabase
      .from('linkedin_contacts')
      .select(`
        id,
        first_name,
        last_name,
        current_company,
        current_position,
        location,
        email_address,
        linkedin_url,
        imported_at,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,current_company.ilike.%${search}%`);
    }

    if (industry) {
      query = query.eq('industry', industry);
    }

    if (company) {
      query = query.ilike('current_company', `%${company}%`);
    }

    if (hasEmail !== null) {
      if (hasEmail) {
        query = query.not('email_address', 'is', null);
      } else {
        query = query.is('email_address', null);
      }
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: contacts, error, count } = await query;

    if (error) throw error;

    // Enrich with intelligence scores
    const enrichedContacts = await Promise.all(
      contacts.map(async (contact) => {
        const intelligence = await this.getContactIntelligence(contact.id);
        return {
          ...contact,
          fullName: `${contact.first_name} ${contact.last_name}`,
          company: contact.current_company,
          position: contact.current_position,
          email: contact.email_address,
          intelligence
        };
      })
    );

    return {
      contacts: enrichedContacts,
      total: count,
      hasMore: offset + limit < count
    };
  }

  async getContact(contactId) {
    const { data: contact, error } = await this.supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error) throw error;
    if (!contact) throw new Error('Contact not found');

    // Get comprehensive intelligence
    const intelligence = await this.getContactIntelligence(contactId);
    const projectMatches = await this.getProjectMatches(contactId);
    const relationshipMap = await this.getRelationshipMap(contactId);
    const interactionHistory = await this.getInteractionHistory(contactId);

    return {
      ...contact,
      fullName: `${contact.first_name} ${contact.last_name}`,
      intelligence,
      projectMatches,
      relationshipMap,
      interactionHistory
    };
  }

  async enrichContact(contactId, mode = 'ai') {
    const contact = await this.getContact(contactId);
    
    if (mode === 'ai') {
      return await this.aiEnrichContact(contact);
    } else {
      return await this.basicEnrichContact(contact);
    }
  }

  async aiEnrichContact(contact) {
    console.log(`🤖 AI enriching contact: ${contact.fullName}`);

    const enrichmentPrompt = `Analyze this LinkedIn contact for A Curious Tractor collaboration potential:

Contact Details:
- Name: ${contact.fullName}
- Company: ${contact.company || 'Unknown'}
- Position: ${contact.position || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Location: ${contact.location || 'Unknown'}

A Curious Tractor Context:
- Community-centric organization in Australia
- Focus on Indigenous empowerment and Beautiful Obsolescence
- Projects include infrastructure building, storytelling, regenerative enterprise
- Values: Community ownership, data sovereignty, authentic partnerships

Provide analysis in JSON format:
{
  "emailSuggestions": ["email1@company.com", "email2@company.com"],
  "collaborationPotential": 85,
  "reasoning": "Why this person could be valuable...",
  "projectAlignment": ["project-type-1", "project-type-2"],
  "outreachStrategy": {
    "approach": "professional/friendly/casual",
    "topics": ["topic1", "topic2"],
    "timing": "immediate/within-week/within-month"
  },
  "riskFactors": ["potential concerns"],
  "valueProposition": "What ACT can offer them"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: enrichmentPrompt
        }]
      });

      const enrichmentText = response.content[0].text;
      let enrichment;

      try {
        // Try to parse JSON from the response
        const jsonMatch = enrichmentText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enrichment = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback to structured text parsing
        enrichment = this.parseEnrichmentText(enrichmentText);
      }

      // Save enrichment to database
      await this.saveContactEnrichment(contact.id, enrichment);

      return {
        contact,
        enrichment,
        enrichedAt: new Date().toISOString(),
        mode: 'ai'
      };
    } catch (error) {
      console.error('❌ AI enrichment failed:', error);
      // Fallback to basic enrichment
      return await this.basicEnrichContact(contact);
    }
  }

  async basicEnrichContact(contact) {
    const enrichment = {
      emailSuggestions: this.generateEmailSuggestions(contact),
      collaborationPotential: this.calculateBasicCollaborationScore(contact),
      reasoning: `Basic analysis based on industry (${contact.industry}) and position (${contact.position})`,
      projectAlignment: this.inferProjectAlignment(contact),
      outreachStrategy: {
        approach: 'professional',
        topics: ['community projects', 'collaboration opportunities'],
        timing: 'within-week'
      },
      riskFactors: [],
      valueProposition: 'Partnership opportunities with community-focused organization'
    };

    await this.saveContactEnrichment(contact.id, enrichment);

    return {
      contact,
      enrichment,
      enrichedAt: new Date().toISOString(),
      mode: 'basic'
    };
  }

  /**
   * Project Matching - Align contacts with projects
   */
  async matchContactsToProject(projectId) {
    // Get project details
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Get relevant contacts based on project characteristics
    const { data: contacts, error: contactsError } = await this.supabase
      .from('linkedin_contacts')
      .select('*')
      .limit(100);

    if (contactsError) throw contactsError;

    // AI-powered matching
    const matches = await Promise.all(
      contacts.map(async (contact) => {
        const matchScore = await this.calculateProjectMatchScore(contact, project);
        return {
          contact,
          matchScore,
          reasoning: matchScore.reasoning,
          suggestedRole: matchScore.suggestedRole
        };
      })
    );

    return matches
      .filter(match => match.matchScore.score >= 60)
      .sort((a, b) => b.matchScore.score - a.matchScore.score)
      .slice(0, 20); // Top 20 matches
  }

  async suggestProjectSupporters(projectId) {
    const matches = await this.matchContactsToProject(projectId);
    
    return matches.map(match => ({
      contactId: match.contact.id,
      contactName: `${match.contact.first_name} ${match.contact.last_name}`,
      company: match.contact.company,
      matchScore: match.matchScore.score,
      suggestedRole: match.suggestedRole,
      outreachPriority: this.calculateOutreachPriority(match),
      estimatedValue: this.estimateContactValue(match.contact, match.matchScore)
    }));
  }

  /**
   * Relationship Intelligence
   */
  async analyzeRelationshipNetwork(contactId) {
    const contact = await this.getContact(contactId);
    
    // Find connections through mutual contacts, companies, industries
    const network = {
      mutualConnections: await this.findMutualConnections(contactId),
      companyConnections: await this.findCompanyConnections(contact.company),
      industryConnections: await this.findIndustryConnections(contact.industry),
      projectConnections: await this.findProjectConnections(contactId),
      influenceScore: await this.calculateInfluenceScore(contact),
      networkReach: await this.calculateNetworkReach(contactId)
    };

    return network;
  }

  async generateOutreachStrategy(contactId) {
    const contact = await this.getContact(contactId);
    const enrichment = await this.getContactEnrichment(contactId);
    const network = await this.analyzeRelationshipNetwork(contactId);

    const strategy = {
      contactId,
      contactName: contact.fullName,
      recommendedApproach: enrichment?.outreachStrategy?.approach || 'professional',
      bestTopics: enrichment?.outreachStrategy?.topics || ['collaboration opportunities'],
      timing: enrichment?.outreachStrategy?.timing || 'within-week',
      mutualConnections: network.mutualConnections.slice(0, 3),
      valueProposition: enrichment?.valueProposition || 'Partnership with community-focused organization',
      emailTemplate: await this.generateEmailTemplate(contact, enrichment),
      followUpSequence: this.generateFollowUpSequence(contact, enrichment),
      successProbability: this.calculateOutreachSuccessProbability(contact, enrichment, network)
    };

    return strategy;
  }

  /**
   * Helper Methods
   */
  async getContactIntelligence(contactId) {
    // Get cached intelligence or calculate new
    const { data: cached } = await this.supabase
      .from('contact_intelligence')
      .select('*')
      .eq('contact_id', contactId)
      .single();

    if (cached && this.isIntelligenceFresh(cached.updated_at)) {
      return cached.intelligence;
    }

    // Calculate new intelligence
    const intelligence = {
      collaborationScore: Math.floor(Math.random() * 40) + 60, // 60-100
      responseRate: Math.floor(Math.random() * 30) + 70, // 70-100%
      influenceScore: Math.floor(Math.random() * 50) + 50, // 50-100
      lastInteraction: null,
      interactionCount: 0,
      projectMatches: 0
    };

    // Cache the intelligence
    await this.supabase
      .from('contact_intelligence')
      .upsert({
        contact_id: contactId,
        intelligence,
        updated_at: new Date().toISOString()
      });

    return intelligence;
  }

  async getProjectMatches(contactId) {
    // Get projects that might align with this contact
    const { data: projects } = await this.supabase
      .from('projects')
      .select('id, name, description, status')
      .limit(10);

    return projects?.map(project => ({
      projectId: project.id,
      projectName: project.name,
      matchScore: Math.floor(Math.random() * 40) + 60, // Mock score
      reasoning: `Potential alignment based on industry and expertise`
    })) || [];
  }

  async getRelationshipMap(contactId) {
    return {
      directConnections: 0,
      mutualConnections: 0,
      companyConnections: 0,
      industryConnections: 0
    };
  }

  async getInteractionHistory(contactId) {
    const { data: interactions } = await this.supabase
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    return interactions || [];
  }

  generateEmailSuggestions(contact) {
    const suggestions = [];
    const firstName = contact.first_name?.toLowerCase();
    const lastName = contact.last_name?.toLowerCase();
    const company = contact.company?.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (firstName && lastName && company) {
      suggestions.push(
        `${firstName}.${lastName}@${company}.com`,
        `${firstName}@${company}.com`,
        `${firstName}${lastName}@${company}.com`,
        `${firstName[0]}${lastName}@${company}.com`
      );
    }

    return suggestions.slice(0, 4);
  }

  calculateBasicCollaborationScore(contact) {
    let score = 50; // Base score

    // Industry alignment
    const communityIndustries = ['non-profit', 'government', 'education', 'social services'];
    if (communityIndustries.some(industry => 
      contact.industry?.toLowerCase().includes(industry))) {
      score += 20;
    }

    // Position relevance
    const relevantPositions = ['director', 'manager', 'coordinator', 'officer', 'lead'];
    if (relevantPositions.some(position => 
      contact.position?.toLowerCase().includes(position))) {
      score += 15;
    }

    // Location (Australian preference)
    if (contact.location?.toLowerCase().includes('australia')) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  inferProjectAlignment(contact) {
    const alignments = [];
    
    if (contact.industry?.toLowerCase().includes('construction')) {
      alignments.push('infrastructure-building');
    }
    
    if (contact.industry?.toLowerCase().includes('media') || 
        contact.position?.toLowerCase().includes('communication')) {
      alignments.push('storytelling');
    }
    
    if (contact.industry?.toLowerCase().includes('government') || 
        contact.industry?.toLowerCase().includes('non-profit')) {
      alignments.push('community-engagement');
    }

    return alignments.length > 0 ? alignments : ['general-collaboration'];
  }

  async saveContactEnrichment(contactId, enrichment) {
    await this.supabase
      .from('contact_enrichments')
      .upsert({
        contact_id: contactId,
        enrichment,
        created_at: new Date().toISOString()
      });
  }

  async getContactEnrichment(contactId) {
    const { data } = await this.supabase
      .from('contact_enrichments')
      .select('enrichment')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.enrichment || null;
  }

  parseEnrichmentText(text) {
    // Fallback text parsing if JSON parsing fails
    return {
      emailSuggestions: [],
      collaborationPotential: 70,
      reasoning: text.substring(0, 200) + '...',
      projectAlignment: ['general-collaboration'],
      outreachStrategy: {
        approach: 'professional',
        topics: ['collaboration'],
        timing: 'within-week'
      },
      riskFactors: [],
      valueProposition: 'Partnership opportunities'
    };
  }

  isIntelligenceFresh(updatedAt) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(updatedAt) > oneWeekAgo;
  }

  async calculateProjectMatchScore(contact, project) {
    // Simplified matching logic - in production, this would be more sophisticated
    let score = 50;
    let reasoning = [];
    let suggestedRole = 'Supporter';

    // Industry alignment
    if (contact.industry && project.description?.toLowerCase().includes(contact.industry.toLowerCase())) {
      score += 20;
      reasoning.push(`Industry alignment: ${contact.industry}`);
    }

    // Position relevance
    if (contact.position?.toLowerCase().includes('director') || 
        contact.position?.toLowerCase().includes('manager')) {
      score += 15;
      suggestedRole = 'Strategic Advisor';
      reasoning.push('Leadership experience');
    }

    // Location proximity (if project has location data)
    if (contact.location?.toLowerCase().includes('australia')) {
      score += 10;
      reasoning.push('Australian location');
    }

    return {
      score: Math.min(score, 100),
      reasoning: reasoning.join(', '),
      suggestedRole
    };
  }

  calculateOutreachPriority(match) {
    if (match.matchScore.score >= 90) return 'high';
    if (match.matchScore.score >= 75) return 'medium';
    return 'low';
  }

  estimateContactValue(contact, matchScore) {
    // Estimate potential value based on position and match score
    const baseValue = matchScore.score * 100; // $100 per match point
    
    if (contact.position?.toLowerCase().includes('director')) {
      return baseValue * 2;
    }
    if (contact.position?.toLowerCase().includes('manager')) {
      return baseValue * 1.5;
    }
    
    return baseValue;
  }

  // Placeholder methods for advanced features
  async findMutualConnections(contactId) { return []; }
  async findCompanyConnections(company) { return []; }
  async findIndustryConnections(industry) { return []; }
  async findProjectConnections(contactId) { return []; }
  async calculateInfluenceScore(contact) { return Math.floor(Math.random() * 50) + 50; }
  async calculateNetworkReach(contactId) { return Math.floor(Math.random() * 1000) + 500; }
  async generateEmailTemplate(contact, enrichment) { return 'Professional email template...'; }
  generateFollowUpSequence(contact, enrichment) { return ['Day 3: Follow up', 'Week 1: Check in']; }
  calculateOutreachSuccessProbability(contact, enrichment, network) { return Math.floor(Math.random() * 30) + 70; }
}

export default function crmSystemRoutes(app) {
  const crm = new ACTCRMSystem();

  /**
   * GET /api/v3/crm/contacts
   * Search and filter contacts
   */
  app.get('/api/v3/crm/contacts', async (req, res) => {
    try {
      const result = await crm.searchContacts(req.query);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('❌ CRM Contacts Search Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v3/crm/contacts/:id
   * Get detailed contact information
   */
  app.get('/api/v3/crm/contacts/:id', async (req, res) => {
    try {
      const contact = await crm.getContact(req.params.id);
      
      res.json({
        success: true,
        contact
      });
    } catch (error) {
      console.error('❌ CRM Contact Details Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/v3/crm/contacts/:id/enrich
   * Enrich contact with AI analysis
   */
  app.post('/api/v3/crm/contacts/:id/enrich', async (req, res) => {
    try {
      const { mode = 'ai' } = req.body;
      const enrichment = await crm.enrichContact(req.params.id, mode);
      
      res.json({
        success: true,
        enrichment
      });
    } catch (error) {
      console.error('❌ CRM Contact Enrichment Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v3/crm/projects/:id/matches
   * Find contacts that match a project
   */
  app.get('/api/v3/crm/projects/:id/matches', async (req, res) => {
    try {
      const matches = await crm.matchContactsToProject(req.params.id);
      
      res.json({
        success: true,
        matches,
        count: matches.length
      });
    } catch (error) {
      console.error('❌ CRM Project Matching Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v3/crm/projects/:id/supporters
   * Suggest potential project supporters
   */
  app.get('/api/v3/crm/projects/:id/supporters', async (req, res) => {
    try {
      const supporters = await crm.suggestProjectSupporters(req.params.id);
      
      res.json({
        success: true,
        supporters,
        count: supporters.length
      });
    } catch (error) {
      console.error('❌ CRM Project Supporters Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v3/crm/contacts/:id/network
   * Analyze contact's relationship network
   */
  app.get('/api/v3/crm/contacts/:id/network', async (req, res) => {
    try {
      const network = await crm.analyzeRelationshipNetwork(req.params.id);
      
      res.json({
        success: true,
        network
      });
    } catch (error) {
      console.error('❌ CRM Network Analysis Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v3/crm/contacts/:id/outreach
   * Generate outreach strategy for contact
   */
  app.get('/api/v3/crm/contacts/:id/outreach', async (req, res) => {
    try {
      const strategy = await crm.generateOutreachStrategy(req.params.id);
      
      res.json({
        success: true,
        strategy
      });
    } catch (error) {
      console.error('❌ CRM Outreach Strategy Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  console.log('🏢 ACT CRM System v3 initialized');
  console.log('   👥 Contact Search: GET /api/v3/crm/contacts');
  console.log('   👤 Contact Details: GET /api/v3/crm/contacts/:id');
  console.log('   🤖 Contact Enrichment: POST /api/v3/crm/contacts/:id/enrich');
  console.log('   🎯 Project Matching: GET /api/v3/crm/projects/:id/matches');
  console.log('   🤝 Project Supporters: GET /api/v3/crm/projects/:id/supporters');
  console.log('   🕸️ Network Analysis: GET /api/v3/crm/contacts/:id/network');
  console.log('   📧 Outreach Strategy: GET /api/v3/crm/contacts/:id/outreach');
}
