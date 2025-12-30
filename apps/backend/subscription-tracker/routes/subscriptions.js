/**
 * Subscription Tracker V1 API Routes
 *
 * R&D Component: RESTful Subscription Discovery API
 * Hypothesis: Caching discovered subscriptions for 24h reduces processing time by 90%
 *             (vs real-time scanning on every request) while maintaining 95%+ accuracy
 * Methodology: Cache-first strategy with rescan parameter, parallel signal gathering,
 *              pagination for large result sets
 * Success Metric: <200ms response time (cached), <30s discovery scan (uncached)
 * Findings: TBD after load testing
 */

import { Router } from 'express';
import { z } from 'zod';
import { SubscriptionDetector } from '../services/discovery/subscriptionDetector.js';
import { RDLogger } from '../services/notion/rdLogger.js';
import { createClient } from '@supabase/supabase-js';
import config from '../config/settings.js';

const router = Router();

// Lazy initialize Supabase client (environment variables not loaded at import time)
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
    // Import Gmail service dynamically to ensure env vars are loaded
    const { default: gmailServiceModule } = await import('../../core/src/services/gmailService.js');
    gmailService = gmailServiceModule;
  }
  return gmailService;
}

// Zod validation schemas
const DiscoverQuerySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  rescan: z.coerce.boolean().default(false)
});

const SubscriptionListSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  status: z.enum(['active', 'canceled', 'paused', 'pending_review', 'all']).default('active'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['confidence', 'amount', 'vendor', 'last_scanned']).default('confidence')
});

const UpdateSubscriptionSchema = z.object({
  status: z.enum(['active', 'canceled', 'paused', 'pending_review']).optional(),
  notes: z.string().max(1000).optional(),
  cancelReason: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(['monthly', 'yearly', 'quarterly', 'irregular']).optional()
});

const SavingsQuerySchema = z.object({
  tenantId: z.string().uuid(),
  confidenceThreshold: z.coerce.number().min(0).max(1).default(0.8)
});

/**
 * POST /api/v1/subscriptions/discover
 * Trigger subscription discovery scan
 *
 * R&D Method: Multi-signal fusion with 24h caching
 * Performance Target: <200ms (cached), <30s (uncached)
 */
router.post('/discover', async (req, res) => {
  try {
    // Validate query parameters
    const validation = DiscoverQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors
        }
      });
    }

    const { tenantId, rescan } = validation.data;
    const startTime = Date.now();

    // Check cache unless rescan requested
    if (!rescan) {
      const cached = await getCachedDiscovery(tenantId);
      if (cached && cached.length > 0) {
        const elapsed = Date.now() - startTime;
        console.log(`[R&D] Cache hit: ${elapsed}ms, ${cached.length} subscriptions`);

        return res.json({
          success: true,
          data: {
            subscriptions: cached,
            count: cached.length,
            cached: true,
            cacheAge: getCacheAge(cached[0].last_scanned)
          },
          meta: {
            timestamp: new Date().toISOString(),
            processingTime: elapsed
          }
        });
      }
    }

    // Run discovery
    console.log(`[Discovery] Starting scan for tenant ${tenantId}...`);
    const gmail = await getGmailService();
    const supabaseClient = getSupabase();
    const detector = new SubscriptionDetector(gmail, supabaseClient);
    const subscriptions = await detector.discoverSubscriptions(tenantId);

    // Store in database
    await storeDiscoveredSubscriptions(tenantId, subscriptions);

    const elapsed = Date.now() - startTime;
    console.log(`[R&D] Discovery complete: ${elapsed}ms, ${subscriptions.length} subscriptions`);

    // Log R&D activity
    const rdLogger = new RDLogger();
    await rdLogger.logActivity({
      component: 'Subscription Discovery Scan',
      hypothesis: 'Multi-signal fusion achieves 90%+ accuracy',
      methodology: `Scanned ${subscriptions.length} subscriptions for tenant ${tenantId}`,
      successMetric: 'Processing time <30s, confidence avg >0.7',
      findings: `Found ${subscriptions.length} subscriptions in ${elapsed}ms, avg confidence: ${avgConfidence(subscriptions)}`,
      timeSpent: elapsed / (1000 * 60 * 60)  // Convert ms to hours
    });

    return res.json({
      success: true,
      data: {
        subscriptions,
        count: subscriptions.length,
        cached: false,
        avgConfidence: avgConfidence(subscriptions),
        signalDistribution: detector.signalDistribution(subscriptions)
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: elapsed
      }
    });
  } catch (error) {
    console.error('[Discovery] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DISCOVERY_ERROR',
        message: 'Failed to discover subscriptions',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/subscriptions
 * List discovered subscriptions with pagination
 *
 * R&D Method: Efficient pagination with confidence-based sorting
 */
router.get('/', async (req, res) => {
  try {
    const validation = SubscriptionListSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors
        }
      });
    }

    const { tenantId, status, limit, offset, sortBy } = validation.data;

    let query = getSupabase()
      .from('discovered_subscriptions')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .range(offset, offset + limit - 1)
      .order(sortBy, { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      data: {
        subscriptions: data || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
          hasMore: offset + limit < (count || 0)
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Subscriptions] List error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_FETCH_ERROR',
        message: 'Failed to fetch subscriptions',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/subscriptions/:id
 * Get single subscription detail with related data
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('discovered_subscriptions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: `Subscription ${req.params.id} not found`
        }
      });
    }

    return res.json({
      success: true,
      data: data,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Subscriptions] Get error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_FETCH_ERROR',
        message: 'Failed to fetch subscription',
        details: error.message
      }
    });
  }
});

/**
 * PATCH /api/v1/subscriptions/:id
 * Update subscription status or metadata
 */
router.patch('/:id', async (req, res) => {
  try {
    const validation = UpdateSubscriptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors
        }
      });
    }

    const updates = {
      ...validation.data,
      cancel_reason: validation.data.cancelReason,
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key =>
      updates[key] === undefined && delete updates[key]
    );

    const { data, error } = await getSupabase()
      .from('discovered_subscriptions')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: `Subscription ${req.params.id} not found`
        }
      });
    }

    return res.json({
      success: true,
      data: data,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Subscriptions] Update error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_UPDATE_ERROR',
        message: 'Failed to update subscription',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/v1/subscriptions/:id
 * Delete a subscription record
 */
router.delete('/:id', async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('discovered_subscriptions')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: `Subscription ${req.params.id} not found`
        }
      });
    }

    return res.json({
      success: true,
      data: { deleted: true, subscription: data },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Subscriptions] Delete error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_DELETE_ERROR',
        message: 'Failed to delete subscription',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/subscriptions/analytics/savings
 * Calculate potential savings from cancellations
 *
 * R&D Method: Identify low-confidence subscriptions as cancellation candidates
 * Hypothesis: Subscriptions with <80% confidence have 60% unused rate
 */
router.get('/analytics/savings', async (req, res) => {
  try {
    const validation = SavingsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message
        }
      });
    }

    const { tenantId, confidenceThreshold } = validation.data;

    // Get low-confidence active subscriptions
    const { data, error } = await getSupabase()
      .from('discovered_subscriptions')
      .select('amount, frequency, confidence, vendor')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .lt('confidence', confidenceThreshold);

    if (error) throw error;

    // Calculate potential annual savings
    const savings = (data || []).reduce((total, sub) => {
      if (!sub.amount) return total;

      let annualCost = 0;
      switch (sub.frequency) {
        case 'monthly':
          annualCost = sub.amount * 12;
          break;
        case 'quarterly':
          annualCost = sub.amount * 4;
          break;
        case 'yearly':
          annualCost = sub.amount;
          break;
        default:
          annualCost = sub.amount * 12;  // Assume monthly if unknown
      }

      return total + annualCost;
    }, 0);

    const recommendations = (data || [])
      .map(sub => ({
        vendor: sub.vendor,
        annualCost: calculateAnnualCost(sub.amount, sub.frequency),
        confidence: sub.confidence,
        recommendation: sub.confidence < 0.5 ? 'cancel' : 'review'
      }))
      .sort((a, b) => b.annualCost - a.annualCost);

    return res.json({
      success: true,
      data: {
        potentialSavings: Math.round(savings * 100) / 100,
        lowConfidenceCount: data?.length || 0,
        confidenceThreshold,
        recommendations,
        summary: savings > 1000
          ? 'High savings potential - review and cancel unused subscriptions'
          : 'Subscriptions look optimized'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Analytics] Savings error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to calculate savings',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/subscriptions/analytics/summary
 * Get subscription analytics summary
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'tenantId is required' }
      });
    }

    const { data, error } = await getSupabase()
      .from('discovered_subscriptions')
      .select('amount, frequency, confidence, status')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const summary = {
      total: data?.length || 0,
      active: data?.filter(s => s.status === 'active').length || 0,
      canceled: data?.filter(s => s.status === 'canceled').length || 0,
      totalMonthlySpend: calculateTotalMonthlySpend(data || []),
      totalAnnualSpend: calculateTotalAnnualSpend(data || []),
      avgConfidence: avgConfidence(data || []),
      byFrequency: groupByFrequency(data || []),
      byStatus: groupByStatus(data || [])
    };

    return res.json({
      success: true,
      data: summary,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Analytics] Summary error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to generate summary',
        details: error.message
      }
    });
  }
});

// Helper functions

async function getCachedDiscovery(tenantId) {
  const cacheWindow = new Date(Date.now() - config.cache.discoveryTTL * 1000);

  const { data } = await getSupabase()
    .from('discovered_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('last_scanned', cacheWindow.toISOString());

  return data && data.length > 0 ? data : null;
}

function getCacheAge(lastScanned) {
  const age = Date.now() - new Date(lastScanned).getTime();
  const hours = Math.floor(age / (1000 * 60 * 60));
  return `${hours}h ago`;
}

async function storeDiscoveredSubscriptions(tenantId, subscriptions) {
  const records = subscriptions.map(sub => ({
    tenant_id: tenantId,
    vendor: sub.vendor,
    amount: sub.xeroSignal?.amount || null,
    currency: 'AUD',
    frequency: sub.xeroSignal?.frequency || 'unknown',
    confidence: sub.confidence,
    status: 'active',
    signals: sub.signals,
    gmail_message_id: sub.gmailSignal?.raw?.id || null,
    xero_contact_id: sub.xeroSignal?.raw?.contact_id || null,
    last_scanned: new Date().toISOString(),
    first_detected: new Date().toISOString()
  }));

  // Upsert (insert or update if vendor already exists for tenant)
  const { error } = await getSupabase()
    .from('discovered_subscriptions')
    .upsert(records, {
      onConflict: 'tenant_id,vendor',
      ignoreDuplicates: false
    });

  if (error) throw error;
}

function avgConfidence(subscriptions) {
  if (!subscriptions || subscriptions.length === 0) return '0.000';
  const sum = subscriptions.reduce((acc, s) => acc + (s.confidence || 0), 0);
  return (sum / subscriptions.length).toFixed(3);
}

function calculateAnnualCost(amount, frequency) {
  if (!amount) return 0;

  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'yearly':
      return amount;
    default:
      return amount * 12;  // Assume monthly
  }
}

function calculateTotalMonthlySpend(subscriptions) {
  return subscriptions.reduce((total, sub) => {
    if (!sub.amount || sub.status !== 'active') return total;

    let monthlyAmount = 0;
    switch (sub.frequency) {
      case 'monthly':
        monthlyAmount = sub.amount;
        break;
      case 'quarterly':
        monthlyAmount = sub.amount / 3;
        break;
      case 'yearly':
        monthlyAmount = sub.amount / 12;
        break;
      default:
        monthlyAmount = sub.amount;
    }

    return total + monthlyAmount;
  }, 0);
}

function calculateTotalAnnualSpend(subscriptions) {
  return subscriptions.reduce((total, sub) => {
    if (!sub.amount || sub.status !== 'active') return total;
    return total + calculateAnnualCost(sub.amount, sub.frequency);
  }, 0);
}

function groupByFrequency(subscriptions) {
  return subscriptions.reduce((acc, sub) => {
    const freq = sub.frequency || 'unknown';
    if (!acc[freq]) acc[freq] = { count: 0, totalCost: 0 };
    acc[freq].count++;
    acc[freq].totalCost += calculateAnnualCost(sub.amount, sub.frequency);
    return acc;
  }, {});
}

function groupByStatus(subscriptions) {
  return subscriptions.reduce((acc, sub) => {
    const status = sub.status || 'unknown';
    if (!acc[status]) acc[status] = 0;
    acc[status]++;
    return acc;
  }, {});
}

/**
 * R&D Documentation Export
 */
export const RD_METADATA = {
  component: 'Subscription Tracker API',
  hypothesis: '24h caching reduces processing time by 90% while maintaining 95%+ accuracy',
  methodology: 'Cache-first strategy with rescan option, parallel signal gathering, confidence-based pagination',
  successMetric: '<200ms response (cached), <30s discovery (uncached), 95%+ cache hit rate',
  findings: 'TBD after load testing with 1000+ requests',
  category: 'Software Development',
  technicalUncertainty: 'Optimal cache TTL for balancing performance vs data freshness',
  estimatedHours: 4.0
};

export default router;
