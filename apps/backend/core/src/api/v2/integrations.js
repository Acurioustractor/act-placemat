/**
 * UnifiedIntegrationService API v2
 * RESTful endpoints that leverage the new enterprise-grade UnifiedIntegrationService
 * Consolidates contacts, projects, and finance data from multiple sources
 *
 * Replaces scattered API endpoints with unified /api/v2/integrations structure
 */

import express from 'express';
import { z } from 'zod';
import {
  authenticate as requireAuth,
  optionalAuth,
  apiKeyOrAuth,
} from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { IntegrationLogger } from '../../services/unifiedIntegration/utils/Logger.js';

// Enhanced security middleware for integrations
import {
  integrationSecurityBundle,
  validateOAuthTokens,
  validateCrossServiceAuth,
  logSecurityAudit
} from '../../middleware/integrationSecurity.js';

// Secure credential storage
import secureCredentialStorage from '../../services/secureCredentialStorage.js';

// Import service adapters
import { LinkedInServiceAdapter } from '../../services/unifiedIntegration/adapters/LinkedInServiceAdapter.js';
import { GmailServiceAdapter } from '../../services/unifiedIntegration/adapters/GmailServiceAdapter.js';
import { SupabaseServiceAdapter } from '../../services/unifiedIntegration/adapters/SupabaseServiceAdapter.js';
import { NotionServiceAdapter } from '../../services/unifiedIntegration/adapters/NotionServiceAdapter.js';
import { XeroFinanceServiceAdapter } from '../../services/unifiedIntegration/adapters/XeroFinanceServiceAdapter.js';

// Import main service
import { UnifiedIntegrationService } from '../../services/unifiedIntegration/UnifiedIntegrationService.js';
import { RedisCacheService } from '../../services/unifiedIntegration/cache/RedisCacheService.js';

const router = express.Router();
const logger = IntegrationLogger.getInstance();

// Initialize service adapters
const linkedInAdapter = new LinkedInServiceAdapter();
const gmailAdapter = new GmailServiceAdapter();
const supabaseAdapter = new SupabaseServiceAdapter();
const notionAdapter = new NotionServiceAdapter();
const xeroAdapter = new XeroFinanceServiceAdapter();

// Initialize Redis cache service
let cacheService = null;
try {
  cacheService = new RedisCacheService();
  logger.info('Redis cache service initialized for v2 integrations API');
} catch (error) {
  logger.warn('Failed to initialize Redis cache service for v2 integrations API', { error: error.message });
}

// Initialize unified service with all adapters
const unifiedService = new UnifiedIntegrationService(
  linkedInAdapter,
  gmailAdapter,
  notionAdapter,
  supabaseAdapter,
  xeroAdapter,
  cacheService  // Redis cache service
);

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const ContactFiltersSchema = z.object({
  search: z.string().optional(),
  company: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(50).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
  sortBy: z.enum(['name', 'company', 'lastInteraction', 'relationshipScore']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
  dataSource: z.enum(['linkedin', 'gmail', 'notion', 'supabase']).optional(),
  strategicValue: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
}).optional();

const ProjectFiltersSchema = z.object({
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  assignee: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
  sortBy: z.enum(['title', 'startDate', 'status', 'progress', 'budget']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
}).optional();

const FinanceFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(500).default(50).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
  sortBy: z.enum(['date', 'amount', 'category', 'vendor', 'type']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  type: z.enum(['income', 'expense']).optional(),
}).optional();

// =============================================================================
// HEALTH & STATUS ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v2/integrations/health:
 *   get:
 *     summary: Get health status of unified integration services
 *     tags: [Integrations v2]
 *     responses:
 *       200:
 *         description: Health status of all integration services
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'health');

    try {
      timedLogger.info('Checking unified integration service health');

      const healthStatus = await unifiedService.getHealthStatus();

      timedLogger.finish(true, {
        overallStatus: healthStatus.status,
        serviceCount: Object.keys(healthStatus.services).length
      });

      res.json({
        success: true,
        status: healthStatus.status,
        services: healthStatus.services,
        uptime: healthStatus.uptime,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      timedLogger.error('Health check failed', error);
      timedLogger.finish(false);

      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// =============================================================================
// CONTACTS ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v2/integrations/contacts:
 *   get:
 *     summary: Get unified contacts from all integrated sources
 *     tags: [Integrations v2 Contacts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or company
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Filter by company name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *         description: Number of contacts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of contacts to skip for pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, company, lastInteraction, relationshipScore]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: dataSource
 *         schema:
 *           type: string
 *           enum: [linkedin, gmail, notion, supabase]
 *         description: Filter by data source
 *       - in: query
 *         name: strategicValue
 *         schema:
 *           type: string
 *           enum: [high, medium, low, unknown]
 *         description: Filter by strategic value
 *     responses:
 *       200:
 *         description: Successfully retrieved contacts
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get(
  '/contacts',
  apiKeyOrAuth,
  ...integrationSecurityBundle.contacts,
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'getContacts');

    try {
      // Validate query parameters
      const filters = ContactFiltersSchema.parse(req.query);

      timedLogger.info('Fetching unified contacts', { filters, userId: req.user?.id });

      const result = await unifiedService.getContacts(filters || {});

      timedLogger.finish(true, {
        contactCount: result.data.length,
        sources: result.metadata.sources,
        cacheHit: result.metadata.cacheHit,
        processingTime: result.metadata.processingTimeMs
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        metadata: {
          ...result.metadata,
          endpoint: '/api/v2/integrations/contacts',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      timedLogger.error('Failed to fetch contacts', error);
      timedLogger.finish(false);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
          correlationId,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch contacts',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v2/integrations/contacts/search:
 *   post:
 *     summary: Advanced contact search with custom criteria
 *     tags: [Integrations v2 Contacts]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *               filters:
 *                 type: object
 *                 description: Advanced filter criteria
 *               includeEnrichment:
 *                 type: boolean
 *                 default: true
 *                 description: Include enrichment data in results
 *     responses:
 *       200:
 *         description: Search results
 */
router.post(
  '/contacts/search',
  requireAuth,
  ...integrationSecurityBundle.contacts,
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'searchContacts');

    try {
      const { query, filters = {}, includeEnrichment = true } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
          correlationId,
        });
      }

      timedLogger.info('Advanced contact search', { query, filters, includeEnrichment });

      // Convert search query to contact filters
      const searchFilters = {
        ...filters,
        search: query,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      const result = await unifiedService.getContacts(searchFilters);

      timedLogger.finish(true, {
        contactCount: result.data.length,
        searchQuery: query
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        metadata: {
          ...result.metadata,
          searchQuery: query,
          includeEnrichment,
          endpoint: '/api/v2/integrations/contacts/search',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      timedLogger.error('Contact search failed', error);
      timedLogger.finish(false);

      res.status(500).json({
        success: false,
        error: 'Contact search failed',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// =============================================================================
// PROJECTS ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v2/integrations/projects:
 *   get:
 *     summary: Get unified projects from all integrated sources
 *     tags: [Integrations v2 Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, paused, cancelled]
 *         description: Filter by project status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [high, medium, low]
 *         description: Filter by project priority
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *         description: Filter by assignee
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *         description: Number of projects to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of projects to skip for pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, startDate, status, progress, budget]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successfully retrieved projects
 */
router.get(
  '/projects',
  apiKeyOrAuth,
  ...integrationSecurityBundle.projects,
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'getProjects');

    try {
      // Validate query parameters
      const filters = ProjectFiltersSchema.parse(req.query);

      timedLogger.info('Fetching unified projects', { filters, userId: req.user?.id });

      const result = await unifiedService.getProjects(filters || {});

      timedLogger.finish(true, {
        projectCount: result.data.length,
        sources: result.metadata.sources,
        cacheHit: result.metadata.cacheHit,
        processingTime: result.metadata.processingTimeMs
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        metadata: {
          ...result.metadata,
          endpoint: '/api/v2/integrations/projects',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      timedLogger.error('Failed to fetch projects', error);
      timedLogger.finish(false);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
          correlationId,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch projects',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v2/integrations/projects/statistics:
 *   get:
 *     summary: Get comprehensive project statistics and analytics
 *     tags: [Integrations v2 Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Project statistics and analytics
 */
router.get(
  '/projects/statistics',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'getProjectStatistics');

    try {
      timedLogger.info('Fetching project statistics');

      // Get statistics from Notion adapter (primary project source)
      const statistics = await notionAdapter.getProjectStatistics();

      timedLogger.finish(true, {
        totalProjects: statistics.totalProjects,
        activeProjects: statistics.activeProjects
      });

      res.json({
        success: true,
        data: statistics,
        metadata: {
          endpoint: '/api/v2/integrations/projects/statistics',
          correlationId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      timedLogger.error('Failed to fetch project statistics', error);
      timedLogger.finish(false);

      res.status(500).json({
        success: false,
        error: 'Failed to fetch project statistics',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// =============================================================================
// FINANCE ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v2/integrations/finance:
 *   get:
 *     summary: Get unified financial data from all integrated sources
 *     tags: [Integrations v2 Finance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for financial data (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for financial data (YYYY-MM-DD)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by transaction category
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum transaction amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum transaction amount
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by transaction type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of transactions to skip for pagination
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, amount, category, vendor, type]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successfully retrieved financial data
 */
router.get(
  '/finance',
  apiKeyOrAuth,
  ...integrationSecurityBundle.finance,
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'getFinanceData');

    try {
      // Validate query parameters
      const filters = FinanceFiltersSchema.parse(req.query);

      timedLogger.info('Fetching unified financial data', { filters, userId: req.user?.id });

      const result = await unifiedService.getFinanceData(filters || {});

      timedLogger.finish(true, {
        transactionCount: result.data.length,
        totalAmount: result.data.reduce((sum, item) => sum + item.amount, 0),
        sources: result.metadata.sources,
        cacheHit: result.metadata.cacheHit,
        processingTime: result.metadata.processingTimeMs
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        metadata: {
          ...result.metadata,
          endpoint: '/api/v2/integrations/finance',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      timedLogger.error('Failed to fetch financial data', error);
      timedLogger.finish(false);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
          correlationId,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch financial data',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * @swagger
 * /api/v2/integrations/finance/summary:
 *   get:
 *     summary: Get comprehensive financial summary and analytics
 *     tags: [Integrations v2 Finance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for summary (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for summary (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Financial summary and analytics
 */
router.get(
  '/finance/summary',
  apiKeyOrAuth,
  ...integrationSecurityBundle.finance,
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'getFinancialSummary');

    try {
      const { dateFrom, dateTo } = req.query;

      timedLogger.info('Fetching financial summary', { dateFrom, dateTo });

      // Get financial summary from Xero adapter (primary financial source)
      const summary = await xeroAdapter.getFinancialSummary(dateFrom, dateTo);

      timedLogger.finish(true, {
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netIncome: summary.netIncome,
        transactionCount: summary.transactionCount
      });

      res.json({
        success: true,
        data: summary,
        metadata: {
          endpoint: '/api/v2/integrations/finance/summary',
          correlationId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      timedLogger.error('Failed to fetch financial summary', error);
      timedLogger.finish(false);

      res.status(500).json({
        success: false,
        error: 'Failed to fetch financial summary',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

// =============================================================================
// ANALYTICS & INSIGHTS ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v2/integrations/analytics/overview:
 *   get:
 *     summary: Get comprehensive analytics overview across all integrations
 *     tags: [Integrations v2 Analytics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Comprehensive analytics overview
 */
router.get(
  '/analytics/overview',
  apiKeyOrAuth,
  ...integrationSecurityBundle.analytics,
  asyncHandler(async (req, res) => {
    const correlationId = logger.generateCorrelationId();
    const timedLogger = logger.createTimedLogger(correlationId, 'IntegrationsAPI', 'getAnalyticsOverview');

    try {
      timedLogger.info('Fetching analytics overview');

      // Fetch data from all sources for comprehensive overview
      const [contacts, projects, health] = await Promise.allSettled([
        unifiedService.getContacts({ limit: 1 }), // Just for count
        unifiedService.getProjects({ limit: 1 }), // Just for count
        unifiedService.getHealthStatus()
      ]);

      const overview = {
        integrationHealth: health.status === 'fulfilled' ? health.value : { status: 'unknown' },
        contactCount: contacts.status === 'fulfilled' ? contacts.value.pagination?.total || 0 : 0,
        projectCount: projects.status === 'fulfilled' ? projects.value.pagination?.total || 0 : 0,
        activeDataSources: health.status === 'fulfilled'
          ? Object.keys(health.value.services).filter(key =>
              health.value.services[key].status === 'healthy'
            ).length
          : 0,
        lastUpdated: new Date().toISOString(),
      };

      timedLogger.finish(true, overview);

      res.json({
        success: true,
        data: overview,
        metadata: {
          endpoint: '/api/v2/integrations/analytics/overview',
          correlationId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      timedLogger.error('Failed to fetch analytics overview', error);
      timedLogger.finish(false);

      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics overview',
        details: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;
