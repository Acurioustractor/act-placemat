/**
 * Unified LinkedIn API - v1
 * Consolidates all LinkedIn intelligence, analytics, import, and relationship functionality
 *
 * Migrated from:
 * - linkedinIntelligence.js
 * - linkedinLocalImport.js
 * - linkedinLocalAnalytics.js
 * - linkedinRealData.js
 * - linkedinRelationshipIntelligence.js
 * - linkedinDebug.js
 * - linkedinMassive.js
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import LinkedInIntelligenceService from '../../services/linkedinIntelligenceService.js';
import RealIntelligenceService from '../../services/realIntelligenceService.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticate as requireAuth, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize services
const linkedinService = new LinkedInIntelligenceService();
const realIntelligenceService = new RealIntelligenceService();

// =============================================================================
// STATUS & HEALTH ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/status:
 *   get:
 *     summary: Get LinkedIn service status and capabilities
 *     tags: [LinkedIn Status]
 *     responses:
 *       200:
 *         description: LinkedIn service status
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const status = linkedinService.getStatus();

    // Check Supabase LinkedIn data availability
    const { count: contactCount, error: countError } = await supabase
      .from('linkedin_contacts')
      .select('id', { count: 'exact', head: true });

    const { count: highValueContacts, error: highValueError } = await supabase
      .from('vw_high_value_contacts')
      .select('id', { count: 'exact', head: true });

    res.json({
      success: true,
      linkedin: {
        ...status,
        supabaseIntegration: true,
        contactsAvailable: contactCount || 0,
        highValueContacts: highValueContacts || 0,
        dataSource: 'Supabase + CSV imports',
      },
      capabilities: [
        'Supabase-driven contact intelligence',
        'Strategic contact analysis and scoring',
        'Cross-platform Gmail matching',
        'High-value contact identification',
        'Network analysis and opportunities',
        'Automated data import and sync',
        'Project-contact relationship mapping',
        'Mass data extraction (debug mode)',
      ],
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/health:
 *   get:
 *     summary: Get LinkedIn service health (alias for status)
 *     tags: [LinkedIn Status]
 *     responses:
 *       200:
 *         description: LinkedIn service status
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const status = linkedinService.getStatus();

    // Check Supabase LinkedIn data availability
    const { count: contactCount, error: countError } = await supabase
      .from('linkedin_contacts')
      .select('id', { count: 'exact', head: true });

    const { count: highValueContacts, error: highValueError } = await supabase
      .from('vw_high_value_contacts')
      .select('id', { count: 'exact', head: true });

    res.json({
      success: true,
      linkedin: {
        ...status,
        supabaseIntegration: true,
        contactsAvailable: contactCount || 0,
        highValueContacts: highValueContacts || 0,
        dataSource: 'Supabase + CSV imports',
      },
      capabilities: [
        'Supabase-driven contact intelligence',
        'Strategic contact analysis and scoring',
        'Cross-platform Gmail matching',
        'High-value contact identification',
        'Network analysis and opportunities',
        'Automated data import and sync',
        'Project-contact relationship mapping',
        'Mass data extraction (debug mode)',
      ],
    });
  })
);

// =============================================================================
// INTELLIGENCE & ANALYSIS ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/intelligence/initialize:
 *   post:
 *     summary: Initialize LinkedIn intelligence system
 *     tags: [LinkedIn Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/intelligence/initialize',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await linkedinService.initialize();

    res.json({
      success: true,
      message: 'LinkedIn intelligence system initialized',
      ...result,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/intelligence/network/scrape:
 *   post:
 *     summary: Scrape LinkedIn network data
 *     tags: [LinkedIn Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/intelligence/network/scrape',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { extractType = 'strategic' } = req.body;

    const result = await linkedinService.scrapeNetwork({
      extractType,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Network scraping completed',
      ...result,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/intelligence/content/analyze:
 *   post:
 *     summary: Analyze LinkedIn content for insights
 *     tags: [LinkedIn Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/intelligence/content/analyze',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { contentUrl, analysisType = 'engagement' } = req.body;

    const analysis = await linkedinService.analyzeContent({
      contentUrl,
      analysisType,
      userId: req.user.id,
    });

    res.json({
      success: true,
      analysis,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/intelligence/gather:
 *   post:
 *     summary: Gather comprehensive LinkedIn intelligence
 *     tags: [LinkedIn Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/intelligence/gather',
  requireAuth,
  asyncHandler(async (req, res) => {
    const intelligence = await linkedinService.gatherIntelligence({
      userId: req.user.id,
      includeRelationships: true,
      includeContent: true,
    });

    res.json({
      success: true,
      intelligence,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/intelligence/recommendations:
 *   post:
 *     summary: Get AI-powered LinkedIn recommendations
 *     tags: [LinkedIn Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/intelligence/recommendations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { context = 'networking' } = req.body;

    const recommendations = await realIntelligenceService.getRecommendations({
      platform: 'linkedin',
      context,
      userId: req.user.id,
    });

    res.json({
      success: true,
      recommendations,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/intelligence/summary:
 *   get:
 *     summary: Get intelligence summary and insights
 *     tags: [LinkedIn Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/intelligence/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: highValueContacts } = await supabase
      .from('vw_high_value_contacts')
      .select('*')
      .limit(10);

    const { data: recentInteractions } = await supabase
      .from('linkedin_interactions')
      .select('*')
      .order('interaction_date', { ascending: false })
      .limit(20);

    const { data: projectRecommendations } = await supabase
      .from('vw_project_contact_recommendations')
      .select('*')
      .limit(10);

    res.json({
      success: true,
      summary: {
        highValueContacts: highValueContacts || [],
        recentInteractions: recentInteractions || [],
        projectRecommendations: projectRecommendations || [],
        lastUpdated: new Date().toISOString(),
      },
    });
  })
);

// =============================================================================
// DATA IMPORT & SYNC ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/import/csv:
 *   post:
 *     summary: Import LinkedIn data from CSV file
 *     tags: [LinkedIn Import]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/import/csv',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { csvData, importType = 'contacts' } = req.body;

    if (!csvData) {
      return res.status(400).json({
        success: false,
        error: 'CSV data is required',
      });
    }

    // Process CSV import (implementation depends on importType)
    const result = await linkedinService.importCsvData({
      csvData,
      importType,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'CSV import completed',
      ...result,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/import/summary:
 *   get:
 *     summary: Get import status and summary
 *     tags: [LinkedIn Import]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/import/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { count: totalContacts } = await supabase
      .from('linkedin_contacts')
      .select('id', { count: 'exact', head: true });

    const { data: recentImports } = await supabase
      .from('linkedin_imports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      success: true,
      summary: {
        totalContacts: totalContacts || 0,
        recentImports: recentImports || [],
        status: 'active',
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/sync/supabase:
 *   post:
 *     summary: Sync LinkedIn data to Supabase
 *     tags: [LinkedIn Sync]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/sync/supabase',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { syncType = 'full' } = req.body;

    const syncResult = await linkedinService.syncToSupabase({
      syncType,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Supabase sync completed',
      ...syncResult,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/sync/gmail:
 *   post:
 *     summary: Sync and match LinkedIn contacts with Gmail
 *     tags: [LinkedIn Sync]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/sync/gmail',
  requireAuth,
  asyncHandler(async (req, res) => {
    const matchResult = await linkedinService.syncGmailMatches({
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Gmail sync completed',
      ...matchResult,
    });
  })
);

// =============================================================================
// ANALYTICS & REPORTING ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/analytics/summary:
 *   get:
 *     summary: Get LinkedIn analytics summary
 *     tags: [LinkedIn Analytics]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/analytics/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { count: totalContacts } = await supabase
      .from('linkedin_contacts')
      .select('id', { count: 'exact', head: true });

    const { data: topCompanies } = await supabase
      .from('linkedin_contacts')
      .select('company')
      .not('company', 'is', null)
      .limit(10);

    res.json({
      success: true,
      analytics: {
        totalContacts: totalContacts || 0,
        topCompanies: topCompanies || [],
        lastUpdated: new Date().toISOString(),
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/analytics/companies:
 *   get:
 *     summary: Get top companies from LinkedIn network
 *     tags: [LinkedIn Analytics]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/analytics/companies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: companies } = await supabase
      .from('linkedin_contacts')
      .select('company')
      .not('company', 'is', null);

    // Group and count companies
    const companyCounts = companies.reduce((acc, { company }) => {
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {});

    const topCompanies = Object.entries(companyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([company, count]) => ({ company, count }));

    res.json({
      success: true,
      companies: topCompanies,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/analytics/network-stats:
 *   get:
 *     summary: Get comprehensive network statistics
 *     tags: [LinkedIn Analytics]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/analytics/network-stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { count: totalContacts } = await supabase
      .from('linkedin_contacts')
      .select('id', { count: 'exact', head: true });

    const { count: highValueContacts } = await supabase
      .from('vw_high_value_contacts')
      .select('id', { count: 'exact', head: true });

    const { data: recentConnections } = await supabase
      .from('linkedin_contacts')
      .select('connected_on')
      .not('connected_on', 'is', null)
      .gte(
        'connected_on',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    res.json({
      success: true,
      stats: {
        totalContacts: totalContacts || 0,
        highValueContacts: highValueContacts || 0,
        recentConnections: recentConnections?.length || 0,
        lastUpdated: new Date().toISOString(),
      },
    });
  })
);

// =============================================================================
// RELATIONSHIP & PROJECT ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/relationships/high-value:
 *   get:
 *     summary: Get high-value LinkedIn contacts
 *     tags: [LinkedIn Relationships]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/relationships/high-value',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { category = 'all' } = req.query;

    let query = supabase.from('vw_high_value_contacts').select('*');

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: contacts } = await query.limit(50);

    res.json({
      success: true,
      contacts: contacts || [],
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/relationships/opportunities:
 *   get:
 *     summary: Get networking opportunities
 *     tags: [LinkedIn Relationships]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/relationships/opportunities',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: opportunities } = await supabase
      .from('vw_networking_opportunities')
      .select('*')
      .limit(30);

    res.json({
      success: true,
      opportunities: opportunities || [],
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/relationships/link-project:
 *   post:
 *     summary: Link LinkedIn contact to project
 *     tags: [LinkedIn Relationships]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/relationships/link-project',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { contactId, projectId, relationship = 'stakeholder' } = req.body;

    const { data: link } = await supabase
      .from('project_contacts')
      .insert({
        project_id: projectId,
        contact_id: contactId,
        relationship_type: relationship,
        created_by: req.user.id,
      })
      .select()
      .single();

    res.json({
      success: true,
      message: 'Contact linked to project',
      link,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/relationships/track-interaction:
 *   post:
 *     summary: Track interaction with LinkedIn contact
 *     tags: [LinkedIn Relationships]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/relationships/track-interaction',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { contactId, interactionType, notes, projectId } = req.body;

    const { data: interaction } = await supabase
      .from('linkedin_interactions')
      .insert({
        contact_id: contactId,
        interaction_type: interactionType,
        notes,
        project_id: projectId,
        interaction_date: new Date().toISOString(),
        created_by: req.user.id,
      })
      .select()
      .single();

    res.json({
      success: true,
      message: 'Interaction tracked',
      interaction,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/relationships/project-recommendations/{projectId}:
 *   get:
 *     summary: Get contact recommendations for project
 *     tags: [LinkedIn Relationships]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/relationships/project-recommendations/:projectId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const { data: recommendations } = await supabase
      .from('vw_project_contact_recommendations')
      .select('*')
      .eq('project_id', projectId)
      .limit(20);

    res.json({
      success: true,
      recommendations: recommendations || [],
    });
  })
);

// =============================================================================
// SEARCH & DISCOVERY ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/search:
 *   get:
 *     summary: Search LinkedIn contacts and data
 *     tags: [LinkedIn Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { q, type = 'contacts', limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    let query;
    if (type === 'contacts') {
      query = supabase
        .from('linkedin_contacts')
        .select('*')
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company.ilike.%${q}%,title.ilike.%${q}%`
        )
        .limit(parseInt(limit));
    }

    const { data: results } = await query;

    res.json({
      success: true,
      results: results || [],
      query: q,
      type,
    });
  })
);

// =============================================================================
// DEBUG & DEVELOPMENT ENDPOINTS (Admin Only)
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/debug/extract-all:
 *   post:
 *     summary: Mass extract all LinkedIn data (Debug mode)
 *     tags: [LinkedIn Debug]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/debug/extract-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Only allow for admin users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const result = await linkedinService.massExtractData({
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Mass extraction completed',
      ...result,
    });
  })
);

/**
 * @swagger
 * /api/v1/linkedin/debug/cleanup:
 *   post:
 *     summary: Clean up LinkedIn data and cache
 *     tags: [LinkedIn Debug]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/debug/cleanup',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const cleanup = await linkedinService.cleanup();

    res.json({
      success: true,
      message: 'LinkedIn data cleanup completed',
      ...cleanup,
    });
  })
);

// =============================================================================
// DATA REFRESH & MAINTENANCE
// =============================================================================

/**
 * @swagger
 * /api/v1/linkedin/refresh:
 *   post:
 *     summary: Refresh LinkedIn data and analytics
 *     tags: [LinkedIn Maintenance]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/refresh',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { refreshType = 'incremental' } = req.body;

    const refreshResult = await linkedinService.refreshData({
      refreshType,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: 'LinkedIn data refresh completed',
      ...refreshResult,
    });
  })
);

export default router;
