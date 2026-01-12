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

    // Query email_financial_documents table (contains Gmail-discovered subscriptions)
    let query = getSupabase()
      .from('email_financial_documents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .range(offset, offset + limit - 1);

    // Sort by appropriate field
    if (sortBy === 'confidence') {
      query = query.order('confidence', { ascending: false });
    } else if (sortBy === 'amount') {
      query = query.order('amount', { ascending: false });
    } else if (sortBy === 'vendor') {
      query = query.order('vendor', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

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
    const { data, error} = await getSupabase()
      .from('email_financial_documents')
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
      .from('email_financial_documents')
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
      .from('email_financial_documents')
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
 * GET /api/v1/subscriptions/payment-calendar
 * Get payment timeline with upcoming due dates
 *
 * Returns subscriptions grouped by urgency (overdue, due_today, due_soon, upcoming)
 */
router.get('/payment-calendar', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'tenantId is required' }
      });
    }

    const { data, error } = await getSupabase()
      .from('subscription_payment_calendar')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('next_payment_date', { ascending: true });

    if (error) throw error;

    // Group by urgency for easier frontend rendering
    const groupedByUrgency = {
      overdue: [],
      due_today: [],
      due_soon: [],
      upcoming: []
    };

    (data || []).forEach(payment => {
      if (groupedByUrgency[payment.urgency]) {
        groupedByUrgency[payment.urgency].push(payment);
      }
    });

    return res.json({
      success: true,
      data: {
        all: data || [],
        byUrgency: groupedByUrgency,
        counts: {
          overdue: groupedByUrgency.overdue.length,
          due_today: groupedByUrgency.due_today.length,
          due_soon: groupedByUrgency.due_soon.length,
          upcoming: groupedByUrgency.upcoming.length,
          total: data?.length || 0
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Payment Calendar] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_CALENDAR_ERROR',
        message: 'Failed to fetch payment calendar',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/subscriptions/cost-by-account
 * Get subscription costs aggregated by email account
 */
router.get('/cost-by-account', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'tenantId is required' }
      });
    }

    const { data, error } = await getSupabase()
      .from('subscription_cost_by_account')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('annual_cost', { ascending: false });

    if (error) throw error;

    // Calculate totals
    const totals = (data || []).reduce((acc, account) => {
      acc.totalSubscriptions += account.subscription_count || 0;
      acc.totalAnnualCost += account.annual_cost || 0;
      return acc;
    }, { totalSubscriptions: 0, totalAnnualCost: 0 });

    return res.json({
      success: true,
      data: {
        accounts: data || [],
        totals,
        avgCostPerAccount: data?.length > 0 ? totals.totalAnnualCost / data.length : 0
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Cost by Account] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'COST_BY_ACCOUNT_ERROR',
        message: 'Failed to fetch cost by account',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/subscriptions/cost-by-vendor
 * Get subscription costs aggregated by vendor
 */
router.get('/cost-by-vendor', async (req, res) => {
  try {
    const { tenantId, limit } = req.query;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'tenantId is required' }
      });
    }

    const { data, error } = await getSupabase()
      .from('email_financial_documents')
      .select('vendor, amount, subscription_frequency')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true);

    if (error) throw error;

    // Calculate annual cost and group by vendor
    const byVendor = (data || []).reduce((acc, sub) => {
      const annual = sub.subscription_frequency === 'monthly'
        ? (sub.amount || 0) * 12
        : sub.subscription_frequency === 'quarterly'
        ? (sub.amount || 0) * 4
        : sub.subscription_frequency === 'weekly'
        ? (sub.amount || 0) * 52
        : (sub.amount || 0);  // yearly or unknown

      if (!acc[sub.vendor]) {
        acc[sub.vendor] = { name: sub.vendor, cost: 0, subscriptionCount: 0 };
      }
      acc[sub.vendor].cost += annual;
      acc[sub.vendor].subscriptionCount++;
      return acc;
    }, {});

    const vendors = Object.values(byVendor)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit ? parseInt(limit) : undefined);

    const totalCost = vendors.reduce((sum, v) => sum + v.cost, 0);

    return res.json({
      success: true,
      data: {
        vendors,
        totalCost,
        topVendor: vendors[0] || null
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Cost by Vendor] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'COST_BY_VENDOR_ERROR',
        message: 'Failed to fetch cost by vendor',
        details: error.message
      }
    });
  }
});

/**
 * PATCH /api/v1/subscriptions/:id/consolidation
 * Update consolidation status for a subscription
 */
router.patch('/:id/consolidation', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, vendorContactEmail } = req.body;

    // Validate status
    const validStatuses = ['not_started', 'vendor_contacted', 'awaiting_confirmation', 'completed', 'skipped'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        }
      });
    }

    const updates = {};
    if (status) updates.consolidation_status = status;
    if (notes !== undefined) updates.consolidation_notes = notes;
    if (vendorContactEmail !== undefined) updates.vendor_contact_email = vendorContactEmail;

    const { data, error } = await getSupabase()
      .from('email_financial_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: `Subscription ${id} not found`
        }
      });
    }

    return res.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Consolidation Update] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONSOLIDATION_UPDATE_ERROR',
        message: 'Failed to update consolidation status',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/subscriptions/consolidation-progress
 * Get consolidation workflow progress
 */
router.get('/consolidation-progress', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'tenantId is required' }
      });
    }

    const { data, error } = await getSupabase()
      .from('consolidation_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('account_email', { ascending: true });

    if (error) throw error;

    // Calculate overall progress
    const totals = (data || []).reduce((acc, item) => {
      acc.totalSubscriptions += item.subscription_count || 0;
      if (item.consolidation_status === 'completed') {
        acc.completedSubscriptions += item.subscription_count || 0;
      }
      return acc;
    }, { totalSubscriptions: 0, completedSubscriptions: 0 });

    const progressPercentage = totals.totalSubscriptions > 0
      ? Math.round((totals.completedSubscriptions / totals.totalSubscriptions) * 100)
      : 0;

    return res.json({
      success: true,
      data: {
        progress: data || [],
        summary: {
          ...totals,
          progressPercentage,
          targetAccount: 'accounts@act.place'
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Consolidation Progress] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONSOLIDATION_PROGRESS_ERROR',
        message: 'Failed to fetch consolidation progress',
        details: error.message
      }
    });
  }
});

/**
 * PATCH /api/v1/subscriptions/:id
 * Update subscription details (status, tags, category, notes, etc.)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate status if provided
    if (updates.status) {
      const validStatuses = ['active', 'canceled', 'paused', 'pending_review'];
      if (!validStatuses.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Status must be one of: ${validStatuses.join(', ')}`
          }
        });
      }
    }

    // Validate category if provided
    if (updates.category) {
      const validCategories = ['saas', 'infrastructure', 'design', 'marketing', 'communication', 'productivity', 'development', 'business', 'entertainment', 'other'];
      if (!validCategories.includes(updates.category)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Category must be one of: ${validCategories.join(', ')}`
          }
        });
      }
    }

    // Validate frequency if provided
    if (updates.subscription_frequency) {
      const validFrequencies = ['monthly', 'quarterly', 'yearly', 'weekly', 'daily'];
      if (!validFrequencies.includes(updates.subscription_frequency)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FREQUENCY',
            message: `Frequency must be one of: ${validFrequencies.join(', ')}`
          }
        });
      }
    }

    // Build update object (only include provided fields)
    const updateFields = {};
    if (updates.vendor !== undefined) updateFields.vendor = updates.vendor;
    if (updates.amount !== undefined) updateFields.amount = updates.amount;
    if (updates.subscription_frequency !== undefined) updateFields.subscription_frequency = updates.subscription_frequency;
    if (updates.status !== undefined) updateFields.status = updates.status;
    if (updates.category !== undefined) updateFields.category = updates.category;
    if (updates.tags !== undefined) updateFields.tags = updates.tags;
    if (updates.notes !== undefined) updateFields.notes = updates.notes;
    if (updates.cancel_reason !== undefined) updateFields.cancel_reason = updates.cancel_reason;

    // Update in database
    const { data, error } = await getSupabase()
      .from('email_financial_documents')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: `Subscription ${id} not found`
        }
      });
    }

    return res.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Subscription Update] Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update subscription',
        details: error.message
      }
    });
  }
});

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
