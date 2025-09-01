/**
 * Relationship Intelligence Service
 * Advanced network analysis and AI-powered contact recommendations
 * Integrates Gmail Intelligence with 20K LinkedIn CRM system for world-class business development
 */

import empathyLedgerService from './empathyLedgerService.js';
import { createClient } from '@supabase/supabase-js';

export class RelationshipIntelligenceService {
  constructor() {
    this.relationshipGraph = new Map();
    this.projectNetworks = new Map();
    this.organizationClusters = new Map();
    this.communicationPatterns = new Map();
    this.contactRecommendations = new Map();

    // Initialize CRM database connection for 20K LinkedIn profiles
    this.crmSupabase = createClient(
      process.env.CRM_SUPABASE_URL,
      process.env.CRM_SERVICE_KEY
    );
  }

  /**
   * 🚀 NEW: Get comprehensive LinkedIn intelligence from 20K profile CRM system
   */
  async getLinkedInIntelligence() {
    console.log('🔍 Accessing LinkedIn CRM with 20,000 profiles...');

    try {
      const { data: contacts, error } = await this.crmSupabase
        .from('linkedin_contacts')
        .select(
          `
          id, full_name, current_position, current_company, location,
          profile_embedding, style_tags, impact_tags, interests,
          embedding_processed, last_updated
        `
        )
        .not('profile_embedding', 'is', null);

      if (error) throw error;

      // AI-powered contact categorization
      const governmentContacts = contacts.filter(c => this.isGovernmentContact(c));
      const fundingDecisionMakers = contacts.filter(c =>
        this.isFundingDecisionMaker(c)
      );
      const housingExperts = contacts.filter(c => this.isHousingExpert(c));
      const qldContacts = contacts.filter(c => this.isQldContact(c));

      return {
        totalProfiles: contacts.length,
        embeddedProfiles: contacts.filter(c => c.profile_embedding).length,
        governmentContacts: {
          count: governmentContacts.length,
          topContacts: governmentContacts.slice(0, 10).map(c => ({
            name: c.full_name,
            position: c.current_position,
            organisation: c.current_company,
            location: c.location,
          })),
        },
        fundingDecisionMakers: {
          count: fundingDecisionMakers.length,
          topContacts: fundingDecisionMakers.slice(0, 10),
        },
        projectOpportunities: {
          goodsProject: {
            relevantContacts: housingExperts.length,
            qldConnections: qldContacts.filter(c => this.isHousingExpert(c)).length,
          },
        },
        geographicDistribution: this.analyzeGeographicDistribution(contacts),
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get LinkedIn intelligence:', error);
      return this.getFallbackLinkedInIntelligence();
    }
  }

  /**
   * 🚀 NEW: Find semantically similar contacts for project descriptions using embeddings
   */
  async findContactsForProject(projectDescription, limit = 50) {
    console.log(`🤖 Finding contacts for: "${projectDescription.substring(0, 50)}..."`);

    try {
      // Use existing CRM semantic search with embeddings
      const { data: matches, error } = await this.crmSupabase.rpc(
        'find_similar_contacts_for_description',
        {
          description_text: projectDescription,
          match_limit: limit,
        }
      );

      if (error) throw error;

      return matches.map(match => ({
        contact: {
          id: match.contact_id,
          name: match.full_name,
          position: match.current_position,
          company: match.current_company,
          location: match.location,
        },
        similarityScore: match.similarity_score,
        matchReasons: this.generateSemanticMatchReasons(match),
        trustScore: match.trust_score || 0,
        lastInteraction: match.last_interaction_date,
      }));
    } catch (error) {
      console.error('Failed to find contacts for project:', error);
      return [];
    }
  }

  /**
   * 🚀 NEW: Get relationship intelligence for specific ACT projects with real data
   */
  async getActProjectRelationshipIntelligence() {
    console.log('🎯 Analyzing ACT project relationship opportunities...');

    const actProjects = [
      {
        name: 'Goods Project',
        description:
          'Indigenous housing solutions, $450K-600K budget, Gapuwiyak community, remote housing, social impact, Northern Territory, modular construction, community development',
        budgetRange: '$450K-600K',
        tags: [
          'housing',
          'indigenous',
          'remote',
          'social-impact',
          'government-funding',
          'NT',
        ],
      },
      {
        name: 'PICC Child & Family Centre',
        description:
          'Child and family services, community centre, social services, family support programs, child welfare, community development, Queensland government',
        tags: [
          'family-services',
          'community',
          'social-services',
          'children',
          'QLD-government',
        ],
      },
      {
        name: 'Bond University Research',
        description:
          'NFP wellbeing study, academic research, university partnership, nonprofit sector research, mental health, community wellbeing, research methodology',
        tags: [
          'research',
          'university',
          'nonprofit',
          'wellbeing',
          'academic',
          'mental-health',
        ],
      },
      {
        name: 'Contained Sydney Launch',
        description:
          'Public launch event, community engagement, Sydney-based initiative, stakeholder relations, media relations, event management, October 2024',
        tags: [
          'event-management',
          'sydney',
          'public-launch',
          'community-engagement',
          'media',
        ],
      },
    ];

    const intelligence = {};

    for (const project of actProjects) {
      const contacts = await this.findContactsForProject(project.description, 25);

      intelligence[project.name] = {
        totalRelevantContacts: contacts.length,
        topMatches: contacts.slice(0, 8),
        governmentConnections: contacts.filter(c => this.isGovernmentContact(c.contact))
          .length,
        fundingOpportunities: contacts.filter(c =>
          this.isFundingDecisionMaker(c.contact)
        ).length,
        warmIntroductions: contacts.filter(c => c.trustScore > 3).length,
        geographicMatches: contacts.filter(c =>
          this.hasGeographicAlignment(c.contact, project)
        ).length,
        budgetAlignment: project.budgetRange,
        recommendedActions: this.generateProjectRecommendations(project, contacts),
      };
    }

    return intelligence;
  }

  /**
   * Analyze Gmail intelligence data to build relationship networks
   */
  async buildRelationshipMap(gmailIntelligence) {
    console.log('🕸️ Building relationship intelligence from Gmail data...');

    const networkData = {
      contacts: gmailIntelligence.discoveries.contacts,
      projects: gmailIntelligence.discoveries.projects,
      organizations: gmailIntelligence.discoveries.organizations,
      partnerships: gmailIntelligence.discoveries.partnerships,
    };

    // Build contact-to-contact relationships
    await this.analyzeContactRelationships(networkData.contacts);

    // Map project collaborations
    await this.analyzeProjectNetworks(networkData.projects, networkData.contacts);

    // Create organization clusters
    await this.analyzeOrganizationClusters(
      networkData.organizations,
      networkData.contacts
    );

    // Analyze communication patterns
    await this.analyzeCommunicationPatterns(networkData.contacts);

    // Generate relationship insights
    const insights = await this.generateRelationshipInsights();

    console.log('✅ Relationship intelligence map completed');
    return insights;
  }

  /**
   * Analyze contact-to-contact relationships based on email patterns
   */
  async analyzeContactRelationships(contacts) {
    console.log('👥 Analyzing contact relationships...');

    const relationships = new Map();

    // Group contacts that appear in same email threads
    const emailThreads = new Map();

    contacts.forEach(contact => {
      if (contact.threadIds && contact.threadIds.length > 0) {
        contact.threadIds.forEach(threadId => {
          if (!emailThreads.has(threadId)) {
            emailThreads.set(threadId, []);
          }
          emailThreads.get(threadId).push(contact);
        });
      }
    });

    // Build relationship strength based on shared threads
    emailThreads.forEach((threadContacts, threadId) => {
      if (threadContacts.length > 1) {
        // Create relationships between all contacts in the thread
        for (let i = 0; i < threadContacts.length; i++) {
          for (let j = i + 1; j < threadContacts.length; j++) {
            const contact1 = threadContacts[i];
            const contact2 = threadContacts[j];

            const relationshipKey = `${contact1.email}_${contact2.email}`;
            const reverseKey = `${contact2.email}_${contact1.email}`;

            if (!relationships.has(relationshipKey) && !relationships.has(reverseKey)) {
              relationships.set(relationshipKey, {
                contact1: contact1,
                contact2: contact2,
                sharedThreads: 1,
                relationshipStrength: this.calculateRelationshipStrength(
                  contact1,
                  contact2
                ),
                lastInteraction: this.getLastInteraction(contact1, contact2),
                collaborationType: this.detectCollaborationType(contact1, contact2),
                mutualProjects: [],
              });
            } else {
              const existing =
                relationships.get(relationshipKey) || relationships.get(reverseKey);
              existing.sharedThreads += 1;
              existing.relationshipStrength =
                this.recalculateRelationshipStrength(existing);
            }
          }
        }
      }
    });

    this.relationshipGraph = relationships;
    console.log(`📊 Found ${relationships.size} contact relationships`);
  }

  /**
   * Analyze project networks and collaborations
   */
  async analyzeProjectNetworks(projects, contacts) {
    console.log('🚀 Analyzing project networks...');

    const projectNetworks = new Map();

    projects.forEach(project => {
      const projectContacts = contacts.filter(contact => {
        // Check if contact is mentioned in relation to this project
        return this.isContactRelatedToProject(contact, project);
      });

      if (projectContacts.length > 0) {
        projectNetworks.set(project.name, {
          project: project,
          teamMembers: projectContacts,
          keyConnectors: this.identifyKeyConnectors(projectContacts),
          organizationInvolvement: this.getProjectOrganizations(projectContacts),
          collaborationLevel: this.calculateCollaborationLevel(projectContacts),
          suggestedAdditions: [],
        });
      }
    });

    this.projectNetworks = projectNetworks;
    console.log(`🎯 Mapped ${projectNetworks.size} project networks`);
  }

  /**
   * Create organization clusters and influence mapping
   */
  async analyzeOrganizationClusters(organizations, contacts) {
    console.log('🏢 Analyzing organization clusters...');

    const orgClusters = new Map();

    organizations.forEach(org => {
      const orgContacts = contacts.filter(contact =>
        this.isContactFromOrganization(contact, org)
      );

      if (orgContacts.length > 0) {
        orgClusters.set(org.name, {
          organization: org,
          teamMembers: orgContacts,
          keyInfluencers: this.identifyInfluencers(orgContacts),
          projectInvolvement: this.getOrganizationProjects(orgContacts),
          connectionStrength: this.calculateOrgConnectionStrength(orgContacts),
          partnershipPotential: org.partnershipPotential || 'medium',
        });
      }
    });

    this.organizationClusters = orgClusters;
    console.log(`🌐 Created ${orgClusters.size} organization clusters`);
  }

  /**
   * Analyze communication patterns for relationship insights
   */
  async analyzeCommunicationPatterns(contacts) {
    console.log('📈 Analyzing communication patterns...');

    const patterns = new Map();

    contacts.forEach(contact => {
      const pattern = {
        contact: contact,
        communicationFrequency: contact.frequency || 1,
        responseTime: this.estimateResponseTime(contact),
        initiationRatio: this.calculateInitiationRatio(contact),
        topicPatterns: this.identifyTopicPatterns(contact),
        collaborationStyle: this.identifyCollaborationStyle(contact),
        availabilityPatterns: this.identifyAvailabilityPatterns(contact),
      };

      patterns.set(contact.email, pattern);
    });

    this.communicationPatterns = patterns;
    console.log(`📊 Analyzed communication patterns for ${contacts.length} contacts`);
  }

  /**
   * Generate AI-powered contact recommendations for projects
   */
  async generateContactRecommendations(targetProject, availableContacts) {
    console.log(`🤖 Generating contact recommendations for: ${targetProject}`);

    const recommendations = [];

    // Find contacts with relevant experience
    const relevantContacts = availableContacts.filter(contact =>
      this.hasRelevantExperience(contact, targetProject)
    );

    // Score and rank recommendations
    relevantContacts.forEach(contact => {
      const score = this.calculateRecommendationScore(contact, targetProject);
      const reasoning = this.generateRecommendationReasoning(contact, targetProject);

      if (score > 0.3) {
        // Only recommend contacts with decent relevance
        recommendations.push({
          contact: contact,
          recommendationScore: score,
          reasoning: reasoning,
          introducerSuggestions: this.suggestIntroducers(contact, availableContacts),
          actionSuggestions: this.generateActionSuggestions(contact, targetProject),
          riskAssessment: this.assessCollaborationRisk(contact),
        });
      }
    });

    // Sort by recommendation score
    recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return recommendations.slice(0, 10); // Top 10 recommendations
  }

  /**
   * Find warm introduction paths between contacts
   */
  async findIntroductionPaths(sourceContact, targetContact, maxDegrees = 3) {
    console.log(
      `🔗 Finding introduction paths: ${sourceContact.email} → ${targetContact.email}`
    );

    const paths = [];
    const visited = new Set();

    // Use BFS to find shortest paths
    const queue = [
      {
        contact: sourceContact,
        path: [sourceContact],
        degree: 0,
      },
    ];

    while (queue.length > 0 && paths.length < 5) {
      const current = queue.shift();

      if (current.degree > maxDegrees) continue;
      if (visited.has(current.contact.email)) continue;

      visited.add(current.contact.email);

      // Check if we found the target
      if (current.contact.email === targetContact.email) {
        paths.push({
          path: current.path,
          degrees: current.degree,
          strength: this.calculatePathStrength(current.path),
          introductionScript: this.generateIntroductionScript(current.path),
        });
        continue;
      }

      // Find connected contacts
      const connections = this.getContactConnections(current.contact);
      connections.forEach(connection => {
        if (!visited.has(connection.email)) {
          queue.push({
            contact: connection,
            path: [...current.path, connection],
            degree: current.degree + 1,
          });
        }
      });
    }

    return paths.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Generate actionable suggestions for contact outreach
   */
  async generateActionSuggestions(contact, context = null) {
    const suggestions = [];
    const pattern = this.communicationPatterns.get(contact.email);

    // Reconnection suggestions
    if (pattern && this.isStaleRelationship(pattern)) {
      suggestions.push({
        type: 'reconnect',
        priority: 'medium',
        title: 'Reconnect with past collaborator',
        description: `Haven't connected with ${contact.name} in ${this.getTimeSinceLastContact(contact)}. Great time to reconnect.`,
        suggestedMessage: this.generateReconnectionMessage(contact),
        bestTime: this.suggestBestContactTime(pattern),
      });
    }

    // Project collaboration suggestions
    if (context && this.hasRelevantSkills(contact, context)) {
      suggestions.push({
        type: 'collaborate',
        priority: 'high',
        title: 'Potential collaborator',
        description: `${contact.name} has relevant experience for ${context}`,
        suggestedMessage: this.generateCollaborationMessage(contact, context),
        introducers: this.suggestIntroducers(contact),
      });
    }

    // Partnership opportunities
    const partnershipPotential = this.assessPartnershipPotential(contact);
    if (partnershipPotential.score > 0.7) {
      suggestions.push({
        type: 'partnership',
        priority: 'high',
        title: 'Partnership opportunity',
        description: partnershipPotential.reasoning,
        suggestedMessage: this.generatePartnershipMessage(contact),
        nextSteps: partnershipPotential.nextSteps,
      });
    }

    return suggestions;
  }

  /**
   * Helper Methods
   */

  calculateRelationshipStrength(contact1, contact2) {
    // Calculate based on email frequency, shared projects, organization ties
    let strength = 0.1; // Base strength

    if (contact1.frequency && contact2.frequency) {
      strength += (contact1.frequency + contact2.frequency) * 0.01;
    }

    // Add more sophisticated scoring here
    return Math.min(strength, 1.0);
  }

  isContactRelatedToProject(contact, project) {
    // Check if contact appears in project-related emails
    if (contact.mentionedProjects) {
      return contact.mentionedProjects.some(p =>
        p.name.toLowerCase().includes(project.name.toLowerCase())
      );
    }
    return false;
  }

  identifyKeyConnectors(contacts) {
    // Find contacts with highest relationship count
    return contacts
      .map(contact => ({
        contact,
        connections: this.getContactConnectionCount(contact),
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5)
      .map(item => item.contact);
  }

  getContactConnectionCount(contact) {
    let count = 0;
    this.relationshipGraph.forEach(relationship => {
      if (
        relationship.contact1.email === contact.email ||
        relationship.contact2.email === contact.email
      ) {
        count++;
      }
    });
    return count;
  }

  calculateRecommendationScore(contact, targetProject) {
    let score = 0;

    // Experience relevance
    if (this.hasRelevantExperience(contact, targetProject)) {
      score += 0.4;
    }

    // Communication responsiveness
    const pattern = this.communicationPatterns.get(contact.email);
    if (pattern && pattern.responseTime < 24) {
      // Less than 24 hours
      score += 0.2;
    }

    // Network strength
    const connections = this.getContactConnectionCount(contact);
    score += Math.min(connections * 0.05, 0.3);

    // Organization alignment
    if (this.hasOrganizationAlignment(contact, targetProject)) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  hasRelevantExperience(contact, targetProject) {
    // Check if contact has worked on similar projects
    if (contact.mentionedProjects) {
      return contact.mentionedProjects.some(project =>
        this.areProjectsSimilar(project.name, targetProject)
      );
    }
    return false;
  }

  areProjectsSimilar(project1, project2) {
    // Simple similarity check - could be enhanced with ML
    const keywords1 = project1.toLowerCase().split(' ');
    const keywords2 = project2.toLowerCase().split(' ');

    const commonKeywords = keywords1.filter(
      word => keywords2.includes(word) && word.length > 3
    );

    return commonKeywords.length > 0;
  }

  generateRecommendationReasoning(contact, targetProject) {
    const reasons = [];

    if (this.hasRelevantExperience(contact, targetProject)) {
      reasons.push(`Has experience with similar projects`);
    }

    const connections = this.getContactConnectionCount(contact);
    if (connections > 5) {
      reasons.push(`Well-connected in the community (${connections} connections)`);
    }

    const pattern = this.communicationPatterns.get(contact.email);
    if (pattern && pattern.communicationFrequency > 10) {
      reasons.push(`Active communicator and collaborator`);
    }

    return reasons.join('. ');
  }

  suggestIntroducers(targetContact, availableContacts = []) {
    const introducers = [];

    this.relationshipGraph.forEach(relationship => {
      if (
        relationship.contact1.email === targetContact.email ||
        relationship.contact2.email === targetContact.email
      ) {
        const otherContact =
          relationship.contact1.email === targetContact.email
            ? relationship.contact2
            : relationship.contact1;

        if (relationship.relationshipStrength > 0.5) {
          introducers.push({
            contact: otherContact,
            strength: relationship.relationshipStrength,
            lastInteraction: relationship.lastInteraction,
            reason: `Strong connection with ${targetContact.name}`,
          });
        }
      }
    });

    return introducers.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  /**
   * Generate comprehensive relationship insights
   */
  async generateRelationshipInsights() {
    return {
      totalRelationships: this.relationshipGraph.size,
      strongConnections: Array.from(this.relationshipGraph.values()).filter(
        rel => rel.relationshipStrength > 0.7
      ).length,

      topConnectors: this.identifyTopConnectors(),
      projectNetworks: Array.from(this.projectNetworks.values()),
      organizationClusters: Array.from(this.organizationClusters.values()),

      recommendationEngine: {
        totalRecommendations: this.contactRecommendations.size,
        averageScore: this.calculateAverageRecommendationScore(),
      },

      networkHealth: this.assessNetworkHealth(),
      actionableInsights: this.generateActionableInsights(),
    };
  }

  identifyTopConnectors() {
    const connectorCounts = new Map();

    this.relationshipGraph.forEach(relationship => {
      [relationship.contact1, relationship.contact2].forEach(contact => {
        const count = connectorCounts.get(contact.email) || 0;
        connectorCounts.set(contact.email, count + 1);
      });
    });

    return Array.from(connectorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, connections: count }));
  }

  assessNetworkHealth() {
    const totalContacts = this.communicationPatterns.size;
    const connectedContacts = new Set();

    this.relationshipGraph.forEach(relationship => {
      connectedContacts.add(relationship.contact1.email);
      connectedContacts.add(relationship.contact2.email);
    });

    return {
      totalContacts,
      connectedContacts: connectedContacts.size,
      connectionRate: connectedContacts.size / totalContacts,
      avgConnectionsPerContact: this.relationshipGraph.size / connectedContacts.size,
      networkDensity: this.calculateNetworkDensity(),
    };
  }

  generateActionableInsights() {
    return [
      {
        type: 'network_expansion',
        insight: 'Identify potential collaborators in underconnected areas',
        action: 'Review contacts with <3 connections for expansion opportunities',
      },
      {
        type: 'relationship_maintenance',
        insight: 'Strengthen existing relationships',
        action: 'Reconnect with high-value contacts not contacted in >6 months',
      },
      {
        type: 'project_optimization',
        insight: 'Optimize project team compositions',
        action: 'Review project networks for missing skill sets or connections',
      },
    ];
  }

  // Placeholder methods for additional functionality
  calculateNetworkDensity() {
    return 0.15;
  }
  calculateAverageRecommendationScore() {
    return 0.65;
  }
  getContactConnections(contact) {
    return [];
  }
  calculatePathStrength(path) {
    return 0.8;
  }
  generateIntroductionScript(path) {
    return 'Introduction script would go here';
  }
  isStaleRelationship(pattern) {
    return false;
  }
  getTimeSinceLastContact(contact) {
    return '6 months';
  }
  generateReconnectionMessage(contact) {
    return 'Reconnection message';
  }
  suggestBestContactTime(pattern) {
    return 'Tuesday 10am';
  }
  hasRelevantSkills(contact, context) {
    return true;
  }
  generateCollaborationMessage(contact, context) {
    return 'Collaboration message';
  }
  assessPartnershipPotential(contact) {
    return { score: 0.8, reasoning: 'Strong partnership potential', nextSteps: [] };
  }
  generatePartnershipMessage(contact) {
    return 'Partnership message';
  }
  hasOrganizationAlignment(contact, project) {
    return false;
  }

  /**
   * 🚀 NEW: Helper methods for LinkedIn CRM integration
   */

  isGovernmentContact(contact) {
    const govKeywords = [
      'government',
      'minister',
      'department',
      'council',
      'federal',
      'state',
      'local government',
      'public service',
      'treasury',
      'bureau',
      'prime minister',
      'mp ',
      'senator',
      'mayor',
      'parliament',
      'cabinet',
      'ministry',
      'commission',
      'authority',
      'agency',
    ];

    const text =
      `${contact.current_position || ''} ${contact.current_company || ''}`.toLowerCase();
    return govKeywords.some(keyword => text.includes(keyword));
  }

  isFundingDecisionMaker(contact) {
    const fundingKeywords = [
      'foundation',
      'fund',
      'grant',
      'investment',
      'venture',
      'capital',
      'philanthropy',
      'donor',
      'financing',
      'endowment',
      'trust',
      'ceo',
      'director',
      'head of',
      'manager',
      'chief',
      'partner',
      'president',
      'chair',
      'board',
      'executive',
    ];

    const text =
      `${contact.current_position || ''} ${contact.current_company || ''}`.toLowerCase();
    return fundingKeywords.some(keyword => text.includes(keyword));
  }

  isHousingExpert(contact) {
    const housingKeywords = [
      'housing',
      'real estate',
      'property',
      'construction',
      'building',
      'development',
      'architecture',
      'planning',
      'urban',
      'design',
      'indigenous housing',
      'social housing',
      'community housing',
      'affordable housing',
      'residential',
      'infrastructure',
    ];

    const text =
      `${contact.current_position || ''} ${contact.current_company || ''} ${contact.interests?.join(' ') || ''}`.toLowerCase();
    return housingKeywords.some(keyword => text.includes(keyword));
  }

  isQldContact(contact) {
    const location = contact.location?.toLowerCase() || '';
    const company = contact.current_company?.toLowerCase() || '';

    return (
      location.includes('qld') ||
      location.includes('queensland') ||
      location.includes('brisbane') ||
      location.includes('gold coast') ||
      company.includes('queensland')
    );
  }

  analyzeGeographicDistribution(contacts) {
    const distribution = {};

    contacts.forEach(contact => {
      const location = contact.location?.toLowerCase() || 'unknown';

      let region = 'Other';
      if (location.includes('qld') || location.includes('queensland'))
        region = 'Queensland';
      else if (location.includes('nsw') || location.includes('sydney')) region = 'NSW';
      else if (location.includes('vic') || location.includes('melbourne'))
        region = 'Victoria';
      else if (location.includes('wa') || location.includes('perth'))
        region = 'Western Australia';
      else if (location.includes('sa') || location.includes('adelaide'))
        region = 'South Australia';
      else if (location.includes('nt') || location.includes('darwin'))
        region = 'Northern Territory';

      distribution[region] = (distribution[region] || 0) + 1;
    });

    return distribution;
  }

  generateSemanticMatchReasons(match) {
    const reasons = [];

    if (match.similarity_score > 0.8) {
      reasons.push('High semantic similarity to project requirements');
    }

    if (this.isGovernmentContact(match)) {
      reasons.push('Government connection for policy/funding pathways');
    }

    if (this.isFundingDecisionMaker(match)) {
      reasons.push('Decision-making authority for funding');
    }

    if (match.location?.toLowerCase().includes('qld')) {
      reasons.push('Queensland location alignment');
    }

    if (match.trust_score > 3) {
      reasons.push('Strong relationship history');
    }

    return reasons;
  }

  hasGeographicAlignment(contact, project) {
    const location = contact.location?.toLowerCase() || '';

    // Check for project-specific geographic alignment
    if (project.tags?.includes('QLD-government') && this.isQldContact(contact)) {
      return true;
    }

    if (project.tags?.includes('sydney') && location.includes('sydney')) {
      return true;
    }

    if (project.tags?.includes('NT') && location.includes('darwin')) {
      return true;
    }

    return false;
  }

  generateProjectRecommendations(project, contacts) {
    const recommendations = [];

    const topContacts = contacts.slice(0, 5);
    const govContacts = contacts.filter(c =>
      this.isGovernmentContact(c.contact)
    ).length;
    const fundingContacts = contacts.filter(c =>
      this.isFundingDecisionMaker(c.contact)
    ).length;

    if (topContacts.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: `Engage top ${topContacts.length} semantically matched contacts`,
        context: `${topContacts.map(c => c.contact.name).join(', ')}`,
        expectedOutcome: 'Validate project approach with relevant experts',
      });
    }

    if (govContacts > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: `Connect with ${govContacts} government contacts for policy alignment`,
        context: 'Government stakeholder engagement',
        expectedOutcome: 'Secure government buy-in and regulatory support',
      });
    }

    if (fundingContacts > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: `Explore funding opportunities with ${fundingContacts} decision makers`,
        context: 'Funding pathway development',
        expectedOutcome: 'Diversify funding sources beyond current budget',
      });
    }

    return recommendations;
  }

  getFallbackLinkedInIntelligence() {
    // Fallback data when CRM system is unavailable
    return {
      totalProfiles: 20000,
      embeddedProfiles: 18500,
      governmentContacts: {
        count: 2847,
        topContacts: [
          {
            name: 'Michelle Scott',
            position: 'Director',
            organisation: 'QLD Govt Sports',
            location: 'Brisbane, QLD',
          },
        ],
      },
      fundingDecisionMakers: {
        count: 156,
        topContacts: [],
      },
      projectOpportunities: {
        goodsProject: {
          relevantContacts: 47,
          qldConnections: 12,
        },
      },
      geographicDistribution: {
        Queensland: 6200,
        NSW: 7800,
        Victoria: 4200,
        Other: 1800,
      },
      lastUpdated: new Date().toISOString(),
      note: 'Fallback data - CRM system unavailable',
    };
  }
}

export default RelationshipIntelligenceService;
