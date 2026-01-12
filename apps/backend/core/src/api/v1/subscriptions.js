/**
 * Subscriptions API V1
 * RESTful endpoints for subscription discovery and email migration
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionDetector } from '../../../../subscription-tracker/services/discovery/subscriptionDetector.js';
import { ReconciliationEngine } from '../../../../subscription-tracker/services/reconciliation/reconciliationEngine.js';
import MigrationWorkflow from '../../../../subscription-tracker/services/migration/migrationWorkflow.js';
import { loadEnv } from '../../utils/loadEnv.js';

loadEnv();

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// Subscription CRUD Endpoints
// =====================================================

/**
 * GET /api/v1/subscriptions
 * List subscriptions with filters and pagination
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      tenantId,
      limit = 20,
      offset = 0,
      minConfidence,
      sortBy = 'confidence',
      sortOrder = 'desc',
      status,
      migrationStatus
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    // Build query - filter for quality subscriptions only
    let query = supabase
      .from('email_financial_documents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .gte('data_quality_score', 6)  // Only show quality score >= 6 (filters out forwarded emails, person names, etc)
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply filters
    if (minConfidence !== undefined) {
      query = query.gte('confidence', parseFloat(minConfidence));
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (migrationStatus) {
      query = query.eq('migration_status', migrationStatus);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        subscriptions: data || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: count || 0,
          hasMore: (parseInt(offset) + parseInt(limit)) < (count || 0)
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Subscriptions API] List error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/subscriptions/:id
 * Get single subscription by ID
 */
router.get('/:id', async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    const { data, error } = await supabase
      .from('email_financial_documents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: { subscription: data },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Subscriptions API] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/v1/subscriptions/:id
 * Update subscription fields
 */
router.patch('/:id', async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { tenantId } = req.query;
    const updates = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    // Whitelist allowed fields
    const allowedFields = [
      'status',
      'notes',
      'vendor_contact_email',
      'migration_status',
      'migration_notes',
      'cancel_reason',
      'account_email'
    ];

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('email_financial_documents')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: { subscription: data },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Subscriptions API] Update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// Discovery Endpoints
// =====================================================

/**
 * POST /api/v1/subscriptions/discover
 * Trigger subscription discovery
 */
router.post('/discover', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId, force = false } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    console.log('[Subscriptions API] Starting discovery...', { tenantId, force });

    // Initialize detector (note: needs Gmail service - will be added)
    const detector = new SubscriptionDetector(null, supabase);

    // Run discovery
    const subscriptions = await detector.discoverSubscriptions(tenantId);

    // Store results
    await detector.storeSubscriptions(tenantId, subscriptions);

    res.json({
      success: true,
      data: {
        subscriptions,
        summary: {
          total: subscriptions.length,
          sources: detector.signalDistribution(subscriptions),
          avgConfidence: detector.avgConfidence(subscriptions)
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Subscriptions API] Discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// Migration Endpoints
// =====================================================

/**
 * POST /api/v1/subscriptions/migration/init
 * Initialize migration workflow
 */
router.post('/migration/init', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId } = req.query;
    const { forceRediscover = false } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    console.log('[Migration API] Initializing migration...', { tenantId });

    const workflow = new MigrationWorkflow(null, supabase);
    const summary = await workflow.initializeMigration(tenantId, { forceRediscover });

    res.json({
      success: true,
      data: summary,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Migration API] Init error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/subscriptions/migration/contact
 * Send vendor contact emails
 */
router.post('/migration/contact', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId, dryRun = 'false' } = req.query;
    const { subscriptionIds, maxBatchSize = 50 } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    const isDryRun = dryRun === 'true' || dryRun === true;

    console.log('[Migration API] Contacting vendors...', {
      tenantId,
      dryRun: isDryRun,
      subscriptionIds: subscriptionIds?.length || 'all'
    });

    const workflow = new MigrationWorkflow(null, supabase);
    const results = await workflow.executeContactWorkflow(tenantId, {
      subscriptionIds,
      dryRun: isDryRun,
      maxBatchSize
    });

    res.json({
      success: true,
      data: results,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Migration API] Contact error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/v1/subscriptions/migration/:id/status
 * Update migration status (confirm/complete/skip)
 */
router.patch('/migration/:id/status', async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'action is required (confirm|complete|skip)'
      });
    }

    console.log('[Migration API] Updating status...', { id, action });

    const workflow = new MigrationWorkflow(null, supabase);
    let result;

    switch (action) {
      case 'confirm':
        result = await workflow.confirmVendorResponse(id, notes);
        break;
      case 'complete':
        result = await workflow.completeMigration(id);
        break;
      case 'skip':
        if (!notes) {
          return res.status(400).json({
            success: false,
            error: 'notes required for skip action'
          });
        }
        result = await workflow.skipMigration(id, notes);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: confirm, complete, or skip'
        });
    }

    res.json({
      success: true,
      data: { subscription: result },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Migration API] Status update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/subscriptions/migration/progress
 * Get migration progress summary
 */
router.get('/migration/progress', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    const workflow = new MigrationWorkflow(null, supabase);
    const progress = await workflow.getProgress(tenantId);

    // Get email send stats
    const today = new Date().toISOString().split('T')[0];
    const { data: rateLimitData } = await supabase
      .from('migration_rate_limits')
      .select('emails_sent, daily_limit')
      .eq('tenant_id', tenantId)
      .eq('date', today)
      .single();

    progress.emailStats = {
      sentToday: rateLimitData?.emails_sent || 0,
      dailyLimit: rateLimitData?.daily_limit || 100,
      remainingToday: (rateLimitData?.daily_limit || 100) - (rateLimitData?.emails_sent || 0)
    };

    res.json({
      success: true,
      data: progress,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Migration API] Progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/subscriptions/migration/next-batch
 * Get next batch of subscriptions to process
 */
router.get('/migration/next-batch', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId, batchSize = 10 } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    const workflow = new MigrationWorkflow(null, supabase);
    const batch = await workflow.getNextBatch(tenantId, parseInt(batchSize));

    res.json({
      success: true,
      data: {
        subscriptions: batch,
        count: batch.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Migration API] Next batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// Analytics & Reconciliation Endpoints
// =====================================================

/**
 * GET /api/v1/subscriptions/analytics/summary
 * Get subscription analytics summary
 */
router.get('/analytics/summary', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    // Get all subscriptions
    const { data: subscriptions, error } = await supabase
      .from('email_financial_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    // Calculate analytics
    const totalAnnualCost = subscriptions.reduce((sum, sub) => {
      if (!sub.amount) return sum;
      const multiplier = {
        monthly: 12,
        quarterly: 4,
        yearly: 1
      }[sub.frequency] || 0;
      return sum + (sub.amount * multiplier);
    }, 0);

    const avgConfidence = subscriptions.length > 0
      ? subscriptions.reduce((sum, s) => sum + (s.confidence || 0), 0) / subscriptions.length
      : 0;

    // Find potential savings (low confidence or irregular)
    const savingsOpportunities = subscriptions
      .filter(s => s.confidence < 0.6 || s.frequency === 'irregular')
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 10)
      .map(s => ({
        vendor: s.vendor,
        amount: s.amount,
        frequency: s.frequency,
        confidence: s.confidence,
        reason: s.confidence < 0.6 ? 'Low confidence' : 'Irregular frequency'
      }));

    res.json({
      success: true,
      data: {
        analytics: {
          totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
          subscriptionCount: subscriptions.length,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          savingsOpportunities
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Subscriptions API] Analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/subscriptions/reconcile
 * Reconcile Gmail receipts with Xero transactions
 */
router.post('/reconcile', async (req, res) => {
  const startTime = Date.now();

  try {
    const { tenantId, force = false } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required'
      });
    }

    console.log('[Subscriptions API] Starting reconciliation...', { tenantId });

    const reconciliation = new ReconciliationEngine(supabase);
    const results = await reconciliation.reconcileSubscriptions(tenantId);

    res.json({
      success: true,
      data: {
        reconciliation: results
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('[Subscriptions API] Reconciliation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
