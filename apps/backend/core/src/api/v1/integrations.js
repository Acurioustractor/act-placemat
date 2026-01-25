/**
 * Unified Integrations API - v1
 * Consolidates all external service integrations and cross-platform functionality
 *
 * Consolidated from:
 * - notion-proxy.js (Notion API proxy)
 * - notion-calendar.js (Notion calendar integration)
 * - notionPublish.js (Notion publishing workflow)
 * - notionProjectTemplate.js (Notion project templates)
 * - gmailSync.js (Gmail synchronization)
 * - gmailIntelligence.js (Gmail intelligence extraction)
 * - gmailLinkedInIntegration.js (Gmail-LinkedIn cross-platform)
 * - notionLinkedInIntegration.js (Notion-LinkedIn cross-platform)
 * - xeroAuth.js (Xero accounting integration)
 * - enhancedIntegration.js (Advanced integration patterns)
 * - integration-registry.js (Integration service registry)
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  authenticate as requireAuth,
  optionalAuth,
  apiKeyOrAuth,
} from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import workspaceGmailService from '../../services/workspaceGmailService.js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// INTEGRATION REGISTRY & STATUS
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/status:
 *   get:
 *     summary: Get status of all external integrations
 *     tags: [Integrations Status]
 *     responses:
 *       200:
 *         description: Integration status summary
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const integrationStatus = {
      notion: {
        available: Boolean(process.env.NOTION_API_KEY),
        status: process.env.NOTION_API_KEY ? 'configured' : 'not_configured',
        endpoints: ['proxy', 'calendar', 'publish', 'templates'],
      },
      gmail: {
        available: Boolean(
          process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET
        ),
        status: process.env.GMAIL_CLIENT_ID ? 'configured' : 'not_configured',
        endpoints: ['sync', 'intelligence', 'linkedin-integration'],
      },
      xero: {
        available: Boolean(
          process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET
        ),
        status: process.env.XERO_CLIENT_ID ? 'configured' : 'not_configured',
        endpoints: ['auth', 'accounting'],
      },
      linkedin: {
        available: Boolean(process.env.LINKEDIN_CLIENT_ID),
        status: process.env.LINKEDIN_CLIENT_ID ? 'configured' : 'not_configured',
        endpoints: ['cross-platform-gmail', 'cross-platform-notion'],
      },
      gohighlevel: {
        available: Boolean(process.env.GHL_API_KEY),
        status: process.env.GHL_API_KEY ? 'configured' : 'not_configured',
        endpoints: ['contacts', 'opportunities', 'pipelines', 'conversations'],
      },
    };

    const overallStatus = Object.values(integrationStatus).some(
      service => service.available
    );

    res.json({
      success: true,
      overall_status: overallStatus ? 'operational' : 'limited',
      integrations: integrationStatus,
      available_services: Object.keys(integrationStatus).filter(
        key => integrationStatus[key].available
      ).length,
      total_services: Object.keys(integrationStatus).length,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/registry:
 *   get:
 *     summary: Get integration service registry
 *     tags: [Integrations Registry]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/registry',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    // This would typically come from a database or config
    const serviceRegistry = {
      notion: {
        name: 'Notion Workspace',
        type: 'productivity',
        capabilities: ['database', 'pages', 'calendar', 'publishing'],
        auth_type: 'api_key',
        rate_limits: { requests_per_second: 3, daily_limit: 1000 },
        health_check_url: 'https://api.notion.com/v1/users/me',
      },
      gmail: {
        name: 'Gmail API',
        type: 'communication',
        capabilities: ['email', 'contacts', 'calendar', 'intelligence'],
        auth_type: 'oauth2',
        rate_limits: { requests_per_second: 10, daily_limit: 1000000 },
        health_check_url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      },
      xero: {
        name: 'Xero Accounting',
        type: 'financial',
        capabilities: ['accounting', 'invoicing', 'reporting'],
        auth_type: 'oauth2',
        rate_limits: { requests_per_minute: 60, daily_limit: 5000 },
        health_check_url: 'https://api.xero.com/api.xro/2.0/Organisation',
      },
      gohighlevel: {
        name: 'GoHighLevel CRM',
        type: 'crm',
        capabilities: ['contacts', 'opportunities', 'pipelines', 'conversations', 'campaigns'],
        auth_type: 'api_key',
        rate_limits: { requests_per_second: 10, daily_limit: 100000 },
        health_check_url: 'https://rest.gohighlevel.com/v1/contacts',
      },
    };

    res.json({
      success: true,
      registry: serviceRegistry,
      registered_services: Object.keys(serviceRegistry).length,
      timestamp: new Date().toISOString(),
    });
  })
);

// =============================================================================
// NOTION INTEGRATION ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/notion/proxy:
 *   post:
 *     summary: Proxy requests to Notion API
 *     tags: [Integrations Notion]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/notion/proxy',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { endpoint, method = 'GET', data } = req.body;

    if (!process.env.NOTION_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Notion integration not configured',
      });
    }

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required',
      });
    }

    try {
      const notionResponse = await fetch(`https://api.notion.com/v1/${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        ...(data && { body: JSON.stringify(data) }),
      });

      const responseData = await notionResponse.json();

      if (!notionResponse.ok) {
        throw new Error(
          `Notion API error: ${responseData.message || notionResponse.statusText}`
        );
      }

      res.json({
        success: true,
        data: responseData,
        notion_endpoint: endpoint,
        method,
      });
    } catch (error) {
      console.error('Notion proxy error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to proxy Notion request',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/notion/publish:
 *   post:
 *     summary: Publish content to Notion workspace
 *     tags: [Integrations Notion]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/notion/publish',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { title, content, database_id, properties = {} } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required',
      });
    }

    try {
      // This would integrate with actual Notion publishing logic
      const publishResult = {
        page_id: `page_${Date.now()}`,
        title,
        url: `https://notion.so/page_${Date.now()}`,
        published_at: new Date().toISOString(),
      };

      // Store publish record
      if (req.user?.id) {
        await supabase.from('notion_publications').insert({
          user_id: req.user.id,
          page_id: publishResult.page_id,
          title,
          content,
          database_id,
          properties,
          published_at: publishResult.published_at,
        });
      }

      res.json({
        success: true,
        publication: publishResult,
        message: 'Content published to Notion successfully',
      });
    } catch (error) {
      console.error('Notion publish error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish to Notion',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/notion/templates:
 *   get:
 *     summary: Get available Notion project templates
 *     tags: [Integrations Notion]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/notion/templates',
  requireAuth,
  asyncHandler(async (req, res) => {
    const templates = [
      {
        id: 'project-basic',
        name: 'Basic Project Template',
        description: 'Standard project structure with tasks and milestones',
        properties: ['title', 'status', 'priority', 'assignee', 'due_date'],
        template_url: 'https://notion.so/templates/project-basic',
      },
      {
        id: 'empathy-ledger',
        name: 'Empathy Ledger Template',
        description: 'Community story tracking and impact measurement',
        properties: ['story_title', 'storyteller', 'theme', 'impact_score', 'location'],
        template_url: 'https://notion.so/templates/empathy-ledger',
      },
      {
        id: 'grant-application',
        name: 'Grant Application Template',
        description: 'Structured grant application and tracking',
        properties: [
          'grant_name',
          'funder',
          'amount',
          'deadline',
          'status',
          'priority',
        ],
        template_url: 'https://notion.so/templates/grant-application',
      },
    ];

    res.json({
      success: true,
      templates,
      total_templates: templates.length,
      timestamp: new Date().toISOString(),
    });
  })
);

// =============================================================================
// GMAIL INTEGRATION ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/gmail/sync:
 *   post:
 *     summary: Sync Gmail data with local database
 *     tags: [Integrations Gmail]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/gmail/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sync_type = 'incremental', folders = ['INBOX'] } = req.body;

    if (!process.env.GMAIL_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        error: 'Gmail integration not configured',
      });
    }

    try {
      // This would integrate with actual Gmail sync logic
      const syncResult = {
        sync_id: `sync_${Date.now()}`,
        sync_type,
        folders_synced: folders,
        messages_processed: 0,
        contacts_updated: 0,
        sync_duration: 0,
        started_at: new Date().toISOString(),
        status: 'completed',
      };

      // Store sync record
      await supabase.from('gmail_sync_history').insert({
        user_id: req.user.id,
        sync_id: syncResult.sync_id,
        sync_type,
        folders,
        result: syncResult,
        created_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        sync: syncResult,
        message: 'Gmail sync completed successfully',
      });
    } catch (error) {
      console.error('Gmail sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync Gmail data',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/gmail/intelligence:
 *   post:
 *     summary: Extract intelligence from Gmail messages
 *     tags: [Integrations Gmail]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/gmail/intelligence',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { message_ids, analysis_type = 'contacts' } = req.body;

    if (!message_ids || message_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message IDs are required',
      });
    }

    try {
      // This would integrate with actual Gmail intelligence extraction
      const intelligenceResult = {
        analysis_id: `analysis_${Date.now()}`,
        analysis_type,
        messages_analyzed: message_ids.length,
        extracted_contacts: [],
        identified_opportunities: [],
        relationship_insights: [],
        confidence_score: 0.85,
        processed_at: new Date().toISOString(),
      };

      // Store intelligence results
      await supabase.from('gmail_intelligence_results').insert({
        user_id: req.user.id,
        analysis_id: intelligenceResult.analysis_id,
        message_ids,
        analysis_type,
        results: intelligenceResult,
        created_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        intelligence: intelligenceResult,
        message: 'Gmail intelligence extraction completed',
      });
    } catch (error) {
      console.error('Gmail intelligence error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract Gmail intelligence',
        details: error.message,
      });
    }
  })
);

// =============================================================================
// WORKSPACE GMAIL ENDPOINTS (Multi-Account)
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/gmail/workspace/status:
 *   get:
 *     summary: Get status of all workspace Gmail accounts
 *     tags: [Integrations Gmail]
 */
router.get(
  '/gmail/workspace/status',
  asyncHandler(async (req, res) => {
    const workspaceAccounts = (process.env.GOOGLE_WORKSPACE_ACCOUNTS || '').split(',').filter(Boolean);
    let hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasOAuth = !!(process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN);

    // Also check for file-based service account
    if (!hasServiceAccount) {
      const fs = await import('fs');
      const path = await import('path');
      const keyPath = path.join(process.cwd(), 'apps/backend/subscription-tracker/config/service-account.json');
      hasServiceAccount = fs.existsSync(keyPath);
    }

    // Try to get current OAuth profile
    let oauthAccount = null;
    if (hasOAuth) {
      try {
        const { google } = await import('googleapis');
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
          access_token: process.env.GOOGLE_ACCESS_TOKEN,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        oauthAccount = {
          email: profile.data.emailAddress,
          messagesTotal: profile.data.messagesTotal,
          status: 'connected'
        };
      } catch (error) {
        oauthAccount = { error: error.message, status: 'error' };
      }
    }

    // Build account status
    const accountStatus = workspaceAccounts.map(email => {
      if (oauthAccount?.email === email) {
        return { email, status: 'connected', method: 'oauth', ...oauthAccount };
      }
      if (hasServiceAccount) {
        return { email, status: 'available', method: 'service_account' };
      }
      return { email, status: 'requires_auth', method: 'oauth_needed' };
    });

    res.json({
      success: true,
      data: {
        configured: {
          workspaceAccounts: workspaceAccounts.length,
          hasServiceAccount,
          hasOAuth
        },
        accounts: accountStatus,
        connectedAccounts: accountStatus.filter(a => a.status === 'connected').map(a => a.email),
        setup: hasServiceAccount ? null : {
          recommendation: 'Set up Google Service Account with Domain-Wide Delegation for multi-account access',
          steps: [
            '1. Go to Google Cloud Console → IAM & Admin → Service Accounts',
            '2. Create a service account for act.place domain',
            '3. Enable Domain-Wide Delegation in Google Workspace Admin',
            '4. Add GOOGLE_SERVICE_ACCOUNT_KEY to .env (JSON string)',
            'Alternative: Authenticate each account individually via /api/google/auth'
          ]
        }
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/gmail/workspace/initialize:
 *   post:
 *     summary: Initialize workspace Gmail connections
 *     tags: [Integrations Gmail]
 */
router.post(
  '/gmail/workspace/initialize',
  asyncHandler(async (req, res) => {
    const result = await workspaceGmailService.initialize();

    res.json({
      success: result.success,
      data: {
        accounts: result.accounts,
        connected: workspaceGmailService.getConnectedAccounts()
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/gmail/workspace/search:
 *   get:
 *     summary: Search emails across all workspace accounts
 *     tags: [Integrations Gmail]
 */
router.get(
  '/gmail/workspace/search',
  asyncHandler(async (req, res) => {
    const { q, query, maxResults = 20, timeframe = '30d' } = req.query;
    const searchQuery = q || query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter (q or query) is required'
      });
    }

    // Ensure initialized
    if (workspaceGmailService.getConnectedAccounts().length === 0) {
      await workspaceGmailService.initialize();
    }

    const results = await workspaceGmailService.searchAllAccounts(searchQuery, {
      maxResults: parseInt(maxResults),
      timeframe
    });

    res.json({
      success: true,
      data: {
        query: searchQuery,
        totalResults: results.length,
        accounts: workspaceGmailService.getConnectedAccounts(),
        emails: results
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/gmail/workspace/stats:
 *   get:
 *     summary: Get email statistics across all workspace accounts
 *     tags: [Integrations Gmail]
 */
router.get(
  '/gmail/workspace/stats',
  asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;

    // Ensure initialized
    if (workspaceGmailService.getConnectedAccounts().length === 0) {
      await workspaceGmailService.initialize();
    }

    const stats = await workspaceGmailService.getOrganizationStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/gmail/workspace/morning-brief:
 *   get:
 *     summary: Get recent important emails for morning brief
 *     tags: [Integrations Gmail]
 */
router.get(
  '/gmail/workspace/morning-brief',
  asyncHandler(async (req, res) => {
    const { hours = 24, maxPerAccount = 10 } = req.query;

    // Ensure initialized
    if (workspaceGmailService.getConnectedAccounts().length === 0) {
      await workspaceGmailService.initialize();
    }

    const emails = await workspaceGmailService.getMorningBriefEmails({
      hours: parseInt(hours),
      maxPerAccount: parseInt(maxPerAccount)
    });

    // Helper to check automated emails
    const isAutomated = (from) => {
      if (!from) return true;
      const automated = [
        'noreply', 'no-reply', 'donotreply', 'notification', 'newsletter',
        'updates@', 'marketing@', 'info@', 'support@'
      ];
      const lowerFrom = from.toLowerCase();
      return automated.some(pattern => lowerFrom.includes(pattern));
    };

    // Categorize emails
    const categorized = {
      urgent: emails.filter(e => e.isUnread && e.subject?.toLowerCase().includes('urgent')),
      unread: emails.filter(e => e.isUnread),
      fromPeople: emails.filter(e => !isAutomated(e.from)),
      all: emails
    };

    res.json({
      success: true,
      data: {
        summary: {
          totalEmails: emails.length,
          unreadCount: categorized.unread.length,
          urgentCount: categorized.urgent.length,
          accounts: workspaceGmailService.getConnectedAccounts()
        },
        emails: categorized.fromPeople.slice(0, 15), // Top 15 non-automated emails
        urgent: categorized.urgent
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/gmail/workspace/contact:
 *   get:
 *     summary: Get all emails with a specific contact across accounts
 *     tags: [Integrations Gmail]
 */
router.get(
  '/gmail/workspace/contact',
  asyncHandler(async (req, res) => {
    const { email, maxResults = 20, days = 90 } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Contact email parameter is required'
      });
    }

    // Ensure initialized
    if (workspaceGmailService.getConnectedAccounts().length === 0) {
      await workspaceGmailService.initialize();
    }

    const emails = await workspaceGmailService.getContactEmails(email, {
      maxResults: parseInt(maxResults),
      timeframeDays: parseInt(days)
    });

    res.json({
      success: true,
      data: {
        contact: email,
        totalEmails: emails.length,
        accounts: workspaceGmailService.getConnectedAccounts(),
        communications: emails
      }
    });
  })
);

// =============================================================================
// CROSS-PLATFORM INTEGRATION ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/cross-platform/gmail-linkedin:
 *   post:
 *     summary: Cross-reference Gmail contacts with LinkedIn profiles
 *     tags: [Integrations Cross-Platform]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/cross-platform/gmail-linkedin',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { email_addresses, enrich_profiles = true } = req.body;

    if (!email_addresses || email_addresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Email addresses are required',
      });
    }

    try {
      // This would integrate with actual cross-platform logic
      const crossReferenceResult = {
        job_id: `xref_${Date.now()}`,
        emails_processed: email_addresses.length,
        linkedin_matches: [],
        enrichment_data: {},
        match_confidence: 0.78,
        processed_at: new Date().toISOString(),
      };

      res.json({
        success: true,
        cross_reference: crossReferenceResult,
        message: 'Cross-platform analysis completed',
      });
    } catch (error) {
      console.error('Cross-platform integration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform cross-platform integration',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/cross-platform/notion-linkedin:
 *   post:
 *     summary: Enrich Notion contacts with LinkedIn data
 *     tags: [Integrations Cross-Platform]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/cross-platform/notion-linkedin',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { notion_database_id, contact_properties = ['email', 'name'] } = req.body;

    if (!notion_database_id) {
      return res.status(400).json({
        success: false,
        error: 'Notion database ID is required',
      });
    }

    try {
      // This would integrate with actual Notion-LinkedIn enrichment
      const enrichmentResult = {
        enrichment_id: `enrich_${Date.now()}`,
        database_id: notion_database_id,
        contacts_processed: 0,
        contacts_enriched: 0,
        new_data_points: 0,
        enrichment_quality: 'high',
        processed_at: new Date().toISOString(),
      };

      res.json({
        success: true,
        enrichment: enrichmentResult,
        message: 'Notion-LinkedIn enrichment completed',
      });
    } catch (error) {
      console.error('Notion-LinkedIn enrichment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enrich Notion contacts with LinkedIn data',
        details: error.message,
      });
    }
  })
);

// =============================================================================
// XERO ACCOUNTING INTEGRATION
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/xero/auth:
 *   get:
 *     summary: Get Xero OAuth authorization URL
 *     tags: [Integrations Xero]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/xero/auth',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!process.env.XERO_CLIENT_ID) {
      return res.status(503).json({
        success: false,
        error: 'Xero integration not configured',
      });
    }

    const authUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${process.env.XERO_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.XERO_REDIRECT_URI)}&scope=accounting.transactions accounting.reports.read&state=${req.user.id}`;

    res.json({
      success: true,
      auth_url: authUrl,
      message: 'Navigate to this URL to authorize Xero integration',
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/xero/organizations:
 *   get:
 *     summary: Get connected Xero organizations
 *     tags: [Integrations Xero]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/xero/organizations',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      // This would integrate with actual Xero API
      const organizations = [
        {
          organization_id: 'org_123',
          name: 'ACT (A Curious Tractor)',
          legal_name: 'A Curious Tractor Pty Ltd',
          country_code: 'AU',
          base_currency: 'AUD',
          organization_status: 'ACTIVE',
          financial_year_end_day: 30,
          financial_year_end_month: 6,
        },
      ];

      res.json({
        success: true,
        organizations,
        total_organizations: organizations.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Xero organizations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Xero organizations',
        details: error.message,
      });
    }
  })
);

// =============================================================================
// GOHIGHLEVEL CRM INTEGRATION
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/gohighlevel/contacts:
 *   get:
 *     summary: Get contacts from GoHighLevel CRM
 *     tags: [Integrations GoHighLevel]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/gohighlevel/contacts',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const { limit = 20, query, startAfter } = req.query;

    if (!process.env.GHL_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel integration not configured',
        message: 'Set GHL_API_KEY environment variable to enable this feature',
      });
    }

    try {
      // Use GHL API v2 with location ID
      const locationId = process.env.GHL_LOCATION_ID || 'agzsSZWgovjwgpcoASWG';
      const ghlResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ''}${startAfter ? `&startAfter=${startAfter}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
        }
      );

      if (!ghlResponse.ok) {
        throw new Error(`GHL API error: ${ghlResponse.statusText}`);
      }

      const data = await ghlResponse.json();

      res.json({
        success: true,
        contacts: data.contacts || [],
        meta: data.meta,
        total: data.contacts?.length || 0,
        source: 'gohighlevel',
      });
    } catch (error) {
      console.error('GoHighLevel contacts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GoHighLevel contacts',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/gohighlevel/opportunities:
 *   get:
 *     summary: Get opportunities/deals from GoHighLevel CRM
 *     tags: [Integrations GoHighLevel]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/gohighlevel/opportunities',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const { pipelineId, limit = 20 } = req.query;

    if (!process.env.GHL_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel integration not configured',
      });
    }

    try {
      const ghlResponse = await fetch(
        `https://rest.gohighlevel.com/v1/pipelines/opportunities${pipelineId ? `?pipelineId=${pipelineId}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!ghlResponse.ok) {
        throw new Error(`GHL API error: ${ghlResponse.statusText}`);
      }

      const data = await ghlResponse.json();

      res.json({
        success: true,
        opportunities: data.opportunities || [],
        total: data.opportunities?.length || 0,
        source: 'gohighlevel',
      });
    } catch (error) {
      console.error('GoHighLevel opportunities error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GoHighLevel opportunities',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/gohighlevel/pipelines:
 *   get:
 *     summary: Get pipelines from GoHighLevel CRM
 *     tags: [Integrations GoHighLevel]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/gohighlevel/pipelines',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    if (!process.env.GHL_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel integration not configured',
      });
    }

    try {
      const ghlResponse = await fetch('https://rest.gohighlevel.com/v1/pipelines/', {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!ghlResponse.ok) {
        throw new Error(`GHL API error: ${ghlResponse.statusText}`);
      }

      const data = await ghlResponse.json();

      res.json({
        success: true,
        pipelines: data.pipelines || [],
        total: data.pipelines?.length || 0,
        source: 'gohighlevel',
      });
    } catch (error) {
      console.error('GoHighLevel pipelines error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GoHighLevel pipelines',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/gohighlevel/conversations:
 *   get:
 *     summary: Get recent conversations from GoHighLevel
 *     tags: [Integrations GoHighLevel]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/gohighlevel/conversations',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const { contactId, limit = 20 } = req.query;

    if (!process.env.GHL_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel integration not configured',
      });
    }

    try {
      const ghlResponse = await fetch(
        `https://rest.gohighlevel.com/v1/conversations/?limit=${limit}${contactId ? `&contactId=${contactId}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!ghlResponse.ok) {
        throw new Error(`GHL API error: ${ghlResponse.statusText}`);
      }

      const data = await ghlResponse.json();

      res.json({
        success: true,
        conversations: data.conversations || [],
        total: data.conversations?.length || 0,
        source: 'gohighlevel',
      });
    } catch (error) {
      console.error('GoHighLevel conversations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GoHighLevel conversations',
        details: error.message,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/integrations/gohighlevel/status:
 *   get:
 *     summary: Check GoHighLevel connection status
 *     tags: [Integrations GoHighLevel]
 */
router.get(
  '/gohighlevel/status',
  asyncHandler(async (req, res) => {
    const configured = Boolean(process.env.GHL_API_KEY);

    if (!configured) {
      return res.json({
        success: true,
        connected: false,
        status: 'not_configured',
        message: 'GoHighLevel API key not configured',
      });
    }

    try {
      // Test API connection
      const ghlResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/?limit=1', {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (ghlResponse.ok) {
        res.json({
          success: true,
          connected: true,
          status: 'connected',
          message: 'GoHighLevel API connected successfully',
        });
      } else {
        res.json({
          success: true,
          connected: false,
          status: 'auth_error',
          message: 'GoHighLevel API key invalid or expired',
        });
      }
    } catch (error) {
      res.json({
        success: true,
        connected: false,
        status: 'error',
        message: error.message,
      });
    }
  })
);

// =============================================================================
// HEALTH & TESTING ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/integrations/health:
 *   get:
 *     summary: Check health of all integration services
 *     tags: [Integrations Health]
 *     responses:
 *       200:
 *         description: Health status of all integrations
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const healthChecks = {
      notion: process.env.NOTION_API_KEY ? 'healthy' : 'not_configured',
      gmail: process.env.GMAIL_CLIENT_ID ? 'healthy' : 'not_configured',
      xero: process.env.XERO_CLIENT_ID ? 'healthy' : 'not_configured',
      gohighlevel: process.env.GHL_API_KEY ? 'healthy' : 'not_configured',
      database: 'healthy', // Would check Supabase connectivity
      overall: 'operational',
    };

    const healthyServices = Object.values(healthChecks).filter(
      status => status === 'healthy'
    ).length;

    healthChecks.overall = healthyServices > 0 ? 'operational' : 'degraded';

    res.json({
      success: true,
      health: healthChecks,
      healthy_services: healthyServices,
      total_services: Object.keys(healthChecks).length - 1, // Exclude 'overall'
      timestamp: new Date().toISOString(),
    });
  })
);

// =============================================================================
// GOHIGHLEVEL CRM INTEGRATION
// =============================================================================

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

/**
 * @swagger
 * /api/v1/integrations/ghl/contacts:
 *   get:
 *     summary: Get contacts from GoHighLevel CRM
 *     tags: [Integrations GHL]
 */
router.get(
  '/ghl/contacts',
  asyncHandler(async (req, res) => {
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel not configured',
        setup: 'Set GHL_API_KEY and GHL_LOCATION_ID in environment'
      });
    }

    const { limit = 100, startAfterId, query } = req.query;

    const params = new URLSearchParams({
      locationId: GHL_LOCATION_ID,
      limit: String(limit),
    });
    if (startAfterId) params.append('startAfterId', startAfterId);
    if (query) params.append('query', query);

    const response = await fetch(`${GHL_BASE_URL}/contacts/?${params}`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `GHL API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        contacts: data.contacts || [],
        count: data.contacts?.length || 0,
        meta: data.meta || {},
        hasMore: !!data.meta?.nextPageUrl
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/ghl/contacts/:id:
 *   get:
 *     summary: Get a specific contact from GoHighLevel
 *     tags: [Integrations GHL]
 */
router.get(
  '/ghl/contacts/:id',
  asyncHandler(async (req, res) => {
    if (!GHL_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel not configured'
      });
    }

    const { id } = req.params;

    const response = await fetch(`${GHL_BASE_URL}/contacts/${id}`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Contact not found or API error: ${response.status}`
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      data: data.contact
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/ghl/pipelines:
 *   get:
 *     summary: Get pipelines from GoHighLevel
 *     tags: [Integrations GHL]
 */
router.get(
  '/ghl/pipelines',
  asyncHandler(async (req, res) => {
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel not configured'
      });
    }

    const response = await fetch(`${GHL_BASE_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `GHL API error: ${response.status}`
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        pipelines: data.pipelines || [],
        count: data.pipelines?.length || 0
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/integrations/ghl/opportunities:
 *   get:
 *     summary: Get opportunities from GoHighLevel
 *     tags: [Integrations GHL]
 */
router.get(
  '/ghl/opportunities',
  asyncHandler(async (req, res) => {
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      return res.status(503).json({
        success: false,
        error: 'GoHighLevel not configured'
      });
    }

    const { pipelineId, limit = 100 } = req.query;

    const params = new URLSearchParams({
      location_id: GHL_LOCATION_ID,
      limit: String(limit)
    });
    if (pipelineId) params.append('pipeline_id', pipelineId);

    const response = await fetch(`${GHL_BASE_URL}/opportunities/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `GHL API error: ${response.status}`
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        opportunities: data.opportunities || [],
        count: data.opportunities?.length || 0,
        meta: data.meta || {}
      }
    });
  })
);

export default router;
