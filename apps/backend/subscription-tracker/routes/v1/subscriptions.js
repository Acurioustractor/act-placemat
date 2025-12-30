/**
 * Subscription Tracker V1 API Routes
 *
 * Follows ACT Platform V1 API standards:
 * - Zod validation schemas
 * - Standardized response format (apiResponse/apiError)
 * - Pagination support
 * - Performance tracking
 */

import express from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionDetector } from '../../services/discovery/subscriptionDetector.js';
import { CostEstimator } from '../../services/analytics/costEstimator.js';
import { ReconciliationEngine } from '../../services/reconciliation/reconciliationEngine.js';

const router = express.Router();

// Lazy initialize Supabase client
let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

// Lazy initialize Gmail service
let gmailService = null;
async function getGmailService() {
  if (!gmailService) {
    const { default: gmailServiceModule } = await import('../../../core/src/services/gmailService.js');
    gmailService = gmailServiceModule;
  }
  return gmailService;
}

// ========================================
// Validation Middleware (ACT Platform Standard)
// ========================================

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      return apiError(res, error, {
        status: 400,
        code: 'VALIDATION_ERROR'
      });
    }
  };
}

function apiResponse(res, data, options = {}) {
  const { status = 200, meta = {} } = options;
  return res.status(status).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

function apiError(res, error, options = {}) {
  const { status = 500, code = 'INTERNAL_ERROR' } = options;

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      meta: { timestamp: new Date().toISOString() }
    });
  }

  return res.status(status).json({
    success: false,
    error: {
      code,
      message: error.message || 'An error occurred',
      details: error.details || null
    },
    meta: { timestamp: new Date().toISOString() }
  });
}

// ========================================
// Validation Schemas (Zod)
// ========================================

const DiscoverQuerySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  maxResults: z.coerce.number().int().positive().max(1000).default(100),
  timeframe: z.string().regex(/^\d+[mdy]$/, 'Timeframe must be in format: 1y, 6m, 30d').default('1y'),
  force: z.coerce.boolean().default(false)
});

const SubscriptionListQuerySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  sortBy: z.enum(['confidence', 'vendor', 'amount', 'created_at']).default('confidence'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const ReconcileQuerySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  force: z.coerce.boolean().default(false)
});

const AnalyticsQuerySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required')
});

// ========================================
// Routes
// ========================================

/**
 * POST /api/v1/subscriptions/discover
 * Discover subscriptions from Gmail, Xero, and AI sources
 *
 * Query params:
 * - tenantId (required): Tenant identifier
 * - maxResults (optional): Max results per source (default: 100, max: 1000)
 * - timeframe (optional): Lookback period (default: '1y', format: 1y, 6m, 30d)
 * - force (optional): Skip cache (default: false)
 */
router.post('/discover', validateQuery(DiscoverQuerySchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId, maxResults, timeframe, force } = req.query;

    console.log('[Subscriptions API] Starting discovery:', { tenantId, maxResults, timeframe, force });

    // Initialize services
    const gmail = await getGmailService();
    const supabaseClient = getSupabase();
    const detector = new SubscriptionDetector(gmail, supabaseClient);

    // Run discovery
    const subscriptions = await detector.discoverSubscriptions(tenantId);

    // Store subscriptions to database with Xero amounts
    await detector.storeSubscriptions(tenantId, subscriptions);

    const processingTime = Date.now() - startTime;

    console.log('[Subscriptions API] Discovery complete:', {
      count: subscriptions.length,
      processingTime: `${processingTime}ms`
    });

    return apiResponse(res, {
      subscriptions,
      summary: {
        total: subscriptions.length,
        sources: {
          gmail: subscriptions.filter(s => s.signals.gmail > 0).length,
          xero: subscriptions.filter(s => s.signals.xero > 0).length,
          both: subscriptions.filter(s => s.signals.gmail > 0 && s.signals.xero > 0).length
        },
        avgConfidence: subscriptions.length > 0
          ? (subscriptions.reduce((sum, s) => sum + s.confidence, 0) / subscriptions.length).toFixed(3)
          : 0
      }
    }, {
      status: 200,
      meta: {
        processingTime
      }
    });

  } catch (error) {
    console.error('[Subscriptions API] Discovery failed:', error);
    return apiError(res, error, {
      status: 500,
      code: 'DISCOVERY_FAILED'
    });
  }
});

/**
 * GET /api/v1/subscriptions
 * List discovered subscriptions with pagination
 *
 * Query params:
 * - tenantId (required): Tenant identifier
 * - limit (optional): Results per page (default: 20, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 * - minConfidence (optional): Filter by minimum confidence (0-1)
 * - sortBy (optional): Sort field (default: 'confidence')
 * - sortOrder (optional): Sort direction (default: 'desc')
 */
router.get('/', validateQuery(SubscriptionListQuerySchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId, limit, offset, minConfidence, sortBy, sortOrder } = req.query;

    const gmail = await getGmailService();
    const supabaseClient = getSupabase();
    const detector = new SubscriptionDetector(gmail, supabaseClient);

    const results = await detector.listSubscriptions({
      tenantId,
      limit,
      offset,
      minConfidence,
      sortBy,
      sortOrder
    });

    const processingTime = Date.now() - startTime;

    return apiResponse(res, {
      subscriptions: results.items || [],
      pagination: {
        limit,
        offset,
        total: results.total || 0,
        hasMore: offset + limit < (results.total || 0)
      }
    }, {
      meta: { processingTime }
    });

  } catch (error) {
    console.error('[Subscriptions API] List failed:', error);
    return apiError(res, error, {
      status: 500,
      code: 'LIST_FAILED'
    });
  }
});

/**
 * GET /api/v1/subscriptions/:id
 * Get single subscription with full details
 *
 * Path params:
 * - id: Subscription ID (UUID)
 *
 * Query params:
 * - tenantId (required): Tenant identifier
 */
router.get('/:id', async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return apiError(res, new Error('tenantId query parameter is required'), {
        status: 400,
        code: 'MISSING_TENANT_ID'
      });
    }

    const gmail = await getGmailService();
    const supabaseClient = getSupabase();
    const detector = new SubscriptionDetector(gmail, supabaseClient);

    const subscription = await detector.getSubscription(id, tenantId);

    if (!subscription) {
      return apiError(res, new Error('Subscription not found'), {
        status: 404,
        code: 'NOT_FOUND'
      });
    }

    const processingTime = Date.now() - startTime;

    return apiResponse(res, {
      subscription
    }, {
      meta: { processingTime }
    });

  } catch (error) {
    console.error('[Subscriptions API] Get failed:', error);
    return apiError(res, error, {
      status: 500,
      code: 'GET_FAILED'
    });
  }
});

/**
 * POST /api/v1/subscriptions/reconcile
 * Reconcile Gmail receipts with Xero transactions
 *
 * Query params:
 * - tenantId (required): Tenant identifier
 * - force (optional): Skip cache and re-reconcile (default: false)
 */
router.post('/reconcile', validateQuery(ReconcileQuerySchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId, force } = req.query;

    console.log('[Subscriptions API] Starting reconciliation:', { tenantId, force });

    const engine = new ReconciliationEngine();
    const results = await engine.reconcileAll(tenantId, { force });

    const processingTime = Date.now() - startTime;

    console.log('[Subscriptions API] Reconciliation complete:', {
      matched: results.matched,
      unmatched: results.unmatched,
      processingTime: `${processingTime}ms`
    });

    return apiResponse(res, {
      reconciliation: {
        matched: results.matched || 0,
        unmatched: results.unmatched || 0,
        lowConfidence: results.lowConfidence || 0,
        avgConfidence: results.avgConfidence || 0
      }
    }, {
      status: 200,
      meta: { processingTime }
    });

  } catch (error) {
    console.error('[Subscriptions API] Reconciliation failed:', error);
    return apiError(res, error, {
      status: 500,
      code: 'RECONCILIATION_FAILED'
    });
  }
});

/**
 * GET /api/v1/subscriptions/analytics/summary
 * Get analytics summary (cost totals, savings opportunities)
 *
 * Query params:
 * - tenantId (required): Tenant identifier
 */
router.get('/analytics/summary', validateQuery(AnalyticsQuerySchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId } = req.query;

    const detector = new SubscriptionDetector();
    const subscriptions = await detector.listSubscriptions({ tenantId, limit: 1000 });

    const estimator = new CostEstimator();
    const analytics = await estimator.calculateAnalyticsSummary(subscriptions.items || []);

    const processingTime = Date.now() - startTime;

    return apiResponse(res, {
      analytics
    }, {
      meta: { processingTime }
    });

  } catch (error) {
    console.error('[Subscriptions API] Analytics failed:', error);
    return apiError(res, error, {
      status: 500,
      code: 'ANALYTICS_FAILED'
    });
  }
});

/**
 * GET /api/v1/subscriptions/outstanding
 * Get outstanding/unpaid invoices
 *
 * Query params:
 * - tenantId (required): Tenant identifier
 */
router.get('/outstanding', validateQuery(AnalyticsQuerySchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId } = req.query;

    const engine = new ReconciliationEngine();
    const invoices = await engine.getOutstandingInvoices(tenantId);

    const processingTime = Date.now() - startTime;

    return apiResponse(res, {
      invoices: invoices || [],
      summary: {
        total: invoices?.length || 0,
        critical: invoices?.filter(i => i.priorityStatus === 'critical').length || 0,
        high: invoices?.filter(i => i.priorityStatus === 'high').length || 0
      }
    }, {
      meta: { processingTime }
    });

  } catch (error) {
    console.error('[Subscriptions API] Outstanding invoices failed:', error);
    return apiError(res, error, {
      status: 500,
      code: 'OUTSTANDING_FAILED'
    });
  }
});

export default router;
