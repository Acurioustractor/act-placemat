/**
 * Gmail Intelligence API Routes
 * Deep Gmail mining and analysis for ACT Community ecosystem
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import GmailIntelligenceService from '../services/gmailIntelligenceService.js';
import SmartGmailSyncService from '../services/smartGmailSyncService.js';

const router = express.Router();
let intelligenceService = null;

// Store reference to the authenticated gmail sync service
const authenticatedGmailSync = null;

// Initialize Intelligence service lazily with shared authentication
const getIntelligenceService = async () => {
  if (!intelligenceService) {
    // Check if we can reuse the authenticated Gmail service from the main Gmail sync
    // For now, create new instance but check authentication status first
    const gmailSync = new SmartGmailSyncService();
    await gmailSync.initialize();
    
    if (!gmailSync.isAuthenticated) {
      throw new Error('Gmail must be authenticated first. Please complete Gmail authentication at /gmail-sync');
    }
    
    intelligenceService = new GmailIntelligenceService(gmailSync);
    await intelligenceService.initialize();
  }
  return intelligenceService;
};

/**
 * Start deep Gmail search and analysis
 */
router.post('/deep-search', asyncHandler(async (req, res) => {
  const {
    maxEmails = 500,
    startDate = null,
    endDate = null,
    specificProjects = [],
    includeArchived = true
  } = req.body;

  try {
    console.log('🔍 Starting Gmail deep search with options:', {
      maxEmails,
      startDate,
      endDate,
      specificProjects,
      includeArchived
    });

    const service = await getIntelligenceService();
    const intelligence = await service.performDeepSearch({
      maxEmails,
      startDate,
      endDate,
      specificProjects,
      includeArchived
    });

    res.json({
      success: true,
      message: 'Deep Gmail search completed successfully',
      intelligence,
      summary: {
        emailsProcessed: intelligence.searchMetadata.actualEmailsProcessed,
        processingTime: intelligence.searchMetadata.processingTime,
        discoveries: {
          projects: intelligence.discoveries.projects.length,
          contacts: intelligence.discoveries.contacts.length,
          organizations: intelligence.discoveries.organizations.length,
          partnerships: intelligence.discoveries.partnerships.length,
          funding: intelligence.discoveries.fundingOpportunities.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Deep search failed:', error);
    res.status(500).json({
      success: false,
      message: 'Deep Gmail search failed',
      error: error.message
    });
  }
}));

/**
 * Get intelligence insights summary
 */
router.get('/insights', asyncHandler(async (req, res) => {
  try {
    const service = await getIntelligenceService();
    
    // Get cached intelligence or return empty state
    const insights = {
      topContacts: [],
      topOrganizations: [],
      projectActivity: [],
      relationshipMap: {},
      fundingInsights: {},
      recentSearches: []
    };

    res.json({
      success: true,
      insights,
      message: 'Run a deep search to generate intelligence insights'
    });

  } catch (error) {
    console.error('❌ Failed to get insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get intelligence insights',
      error: error.message
    });
  }
}));

/**
 * Search for specific projects in Gmail
 */
router.post('/search-projects', asyncHandler(async (req, res) => {
  const { projects, timeframe = '1y' } = req.body;

  if (!projects || !Array.isArray(projects)) {
    return res.status(400).json({
      success: false,
      message: 'Projects array is required'
    });
  }

  try {
    console.log(`🔍 Searching Gmail for projects: ${projects.join(', ')}`);

    const service = await getIntelligenceService();
    
    // Calculate date range based on timeframe
    let startDate = null;
    if (timeframe !== 'all') {
      const now = new Date();
      const timeMap = {
        '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, '2y': 730
      };
      const days = timeMap[timeframe] || 365;
      startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    }

    const intelligence = await service.performDeepSearch({
      maxEmails: 200,
      startDate,
      specificProjects: projects
    });

    res.json({
      success: true,
      message: `Found project mentions for: ${projects.join(', ')}`,
      results: {
        projectMentions: intelligence.discoveries.projects,
        relatedContacts: intelligence.discoveries.contacts,
        relatedOrganizations: intelligence.discoveries.organizations,
        partnerships: intelligence.discoveries.partnerships,
        emailsAnalyzed: intelligence.searchMetadata.actualEmailsProcessed
      }
    });

  } catch (error) {
    console.error('❌ Project search failed:', error);
    res.status(500).json({
      success: false,
      message: 'Project search failed',
      error: error.message
    });
  }
}));

/**
 * Extract and create contacts from Gmail intelligence
 */
router.post('/extract-contacts', asyncHandler(async (req, res) => {
  const { 
    dryRun = true, 
    minFrequency = 2,
    maxContacts = 50,
    intelligenceData = null 
  } = req.body;

  try {
    console.log(`👥 Extracting contacts with options:`, {
      dryRun, minFrequency, maxContacts
    });

    const service = await getIntelligenceService();
    
    // Use provided intelligence data or run a fresh search
    let intelligence = intelligenceData;
    if (!intelligence) {
      console.log('📧 Running fresh Gmail search for contact extraction...');
      intelligence = await service.performDeepSearch({ maxEmails: 300 });
    }

    // Get top contacts from insights
    const topContacts = intelligence.insights?.topContacts || 
      service.generateTopContacts(intelligence.discoveries.contacts);

    // Filter and limit contacts
    const contactsToProcess = topContacts
      .filter(contact => contact.frequency >= minFrequency)
      .slice(0, maxContacts);

    const results = await service.createNotionContacts(contactsToProcess, {
      dryRun,
      minFrequency
    });

    res.json({
      success: true,
      message: dryRun ? 'Contact extraction preview completed' : 'Contacts created successfully',
      results: {
        ...results,
        totalContactsFound: topContacts.length,
        contactsProcessed: contactsToProcess.length,
        dryRun
      }
    });

  } catch (error) {
    console.error('❌ Contact extraction failed:', error);
    res.status(500).json({
      success: false,
      message: 'Contact extraction failed',
      error: error.message
    });
  }
}));

/**
 * Analyze email relationships and connections
 */
router.post('/analyze-relationships', asyncHandler(async (req, res) => {
  const { focusContact = null, maxDepth = 2 } = req.body;

  try {
    console.log('🕸️ Analyzing email relationships...', { focusContact, maxDepth });

    const service = await getIntelligenceService();
    
    // Run targeted search for relationship analysis
    const intelligence = await service.performDeepSearch({ 
      maxEmails: 400,
      includeArchived: true 
    });

    // Generate relationship insights
    const relationships = {
      networkMap: {},
      strongConnections: [],
      projectCollaborators: [],
      organizationConnections: [],
      communicationPatterns: {}
    };

    // Build relationship map
    intelligence.discoveries.contacts.forEach(contact => {
      // Analysis logic would go here
      relationships.networkMap[contact.email] = {
        name: contact.name,
        frequency: contact.frequency || 1,
        connections: [],
        projects: [],
        organizations: []
      };
    });

    res.json({
      success: true,
      message: 'Relationship analysis completed',
      relationships,
      metadata: {
        contactsAnalyzed: intelligence.discoveries.contacts.length,
        emailsProcessed: intelligence.searchMetadata.actualEmailsProcessed
      }
    });

  } catch (error) {
    console.error('❌ Relationship analysis failed:', error);
    res.status(500).json({
      success: false,
      message: 'Relationship analysis failed',
      error: error.message
    });
  }
}));

/**
 * Find funding and partnership opportunities in emails
 */
router.post('/find-opportunities', asyncHandler(async (req, res) => {
  const { 
    timeframe = '1y',
    minAmount = 0,
    includePastOpportunities = false 
  } = req.body;

  try {
    console.log('💰 Searching for funding and partnership opportunities...');

    const service = await getIntelligenceService();
    
    // Calculate date range
    let startDate = null;
    if (timeframe !== 'all') {
      const now = new Date();
      const timeMap = { '3m': 90, '6m': 180, '1y': 365, '2y': 730 };
      const days = timeMap[timeframe] || 365;
      startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    }

    const intelligence = await service.performDeepSearch({
      maxEmails: 300,
      startDate,
      includeArchived: includePastOpportunities
    });

    // Filter and analyze opportunities
    const opportunities = {
      funding: intelligence.discoveries.fundingOpportunities
        .filter(fund => !minAmount || fund.amount >= minAmount),
      partnerships: intelligence.discoveries.partnerships,
      grants: [],
      collaborations: []
    };

    // Categorize opportunities
    intelligence.discoveries.fundingOpportunities.forEach(fund => {
      if (fund.type === 'grant' || fund.source?.toLowerCase().includes('grant')) {
        opportunities.grants.push(fund);
      }
    });

    intelligence.discoveries.partnerships.forEach(partnership => {
      if (partnership.type === 'collaboration') {
        opportunities.collaborations.push(partnership);
      }
    });

    res.json({
      success: true,
      message: 'Opportunity search completed',
      opportunities,
      summary: {
        totalFunding: opportunities.funding.length,
        totalPartnerships: opportunities.partnerships.length,
        totalGrants: opportunities.grants.length,
        totalCollaborations: opportunities.collaborations.length,
        searchTimeframe: timeframe,
          emailsAnalyzed: intelligence.searchMetadata.actualEmailsProcessed
      }
    });

  } catch (error) {
    console.error('❌ Opportunity search failed:', error);
    res.status(500).json({
      success: false,
      message: 'Opportunity search failed',
      error: error.message
    });
  }
}));

/**
 * Get Gmail intelligence service status
 */
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const service = await getIntelligenceService();
    
    res.json({
      success: true,
      status: {
        initialized: !!service,
        gmailAuthenticated: service.gmailSync?.isAuthenticated || false,
        cacheSize: service.intelligenceCache?.size || 0,
        capabilities: [
          'Deep Gmail Search',
          'Contact Extraction',
          'Organization Detection',
          'Project Discovery',
          'Relationship Analysis',
          'Opportunity Finding'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Failed to get intelligence status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get intelligence status',
      error: error.message
    });
  }
}));

export default router;