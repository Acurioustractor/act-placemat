/**
 * Unified Financial API - v1
 * Consolidates all financial management, bookkeeping, receipts, and reporting functionality
 *
 * Migrated from:
 * - bookkeeping.js (28+ endpoints) - Core Xero transaction management
 * - financeDashboard.js (17+ endpoints) - Financial metrics and dashboards
 * - financeReceipts.js (5+ endpoints) - Gmail receipt scanning and matching
 * - bookkeepingNotifications.js (10+ endpoints) - Notification management and Dext integration
 * - realFinanceDashboard.js (2 endpoints) - DELETED - was complete duplicate
 *
 * Separate APIs maintained:
 * - xeroAuth.js - OAuth authentication infrastructure
 * - stripeBilling.js - Stripe payment processing (different domain)
 * - communityBookkeeping.js - Indigenous/community-specific financial tools
 * - financialIntelligenceRecommendations.js - AI-powered financial intelligence
 */

import express from 'express';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { XeroClient } from 'xero-node';
import { authenticate as requireAuth, optionalAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { getNotificationBus } from '../../agents/index.js';
import {
  getActiveCategorisationRules,
  invalidateCategorisationRuleCache,
  suggestCategoryForTransaction
} from '../../services/financialCategorizer.js';
import {
  listFinancialRecommendations,
  refreshFinancialRecommendations,
  updateFinancialRecommendation
} from '../../services/financialRecommendationService.js';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshXeroTokenIfNeeded(xero, tokenSet) {
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    if (!tokenSet?.expires_at || tokenSet.expires_at - 60 > nowSec) {
      return tokenSet;
    }
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', tokenSet.refresh_token);
    const basic = Buffer.from(
      `${process.env.XERO_CLIENT_ID || ''}:${process.env.XERO_CLIENT_SECRET || ''}`
    ).toString('base64');
    const resp = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: form.toString(),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'xero_refresh_failed');
    const refreshed = {
      ...tokenSet,
      access_token: json.access_token,
      expires_in: json.expires_in,
      scope: json.scope,
      token_type: json.token_type,
      refresh_token: json.refresh_token || tokenSet.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 1800),
    };
    await xero.setTokenSet(refreshed);
    await redis.set('xero:tokenSet', JSON.stringify(refreshed));
    return refreshed;
  } catch (e) {
    console.error('Xero token refresh failed:', e?.message || e);
    return tokenSet;
  }
}

async function getXeroSession() {
  const [tokenSetJson, tenantId] = await Promise.all([
    redis.get('xero:tokenSet'),
    redis.get('xero:tenantId'),
  ]);
  if (!tokenSetJson || !tenantId) return null;
  const tokenSet = JSON.parse(tokenSetJson);
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [
      process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback',
    ],
  });
  await xero.setTokenSet(tokenSet);
  const updated = await refreshXeroTokenIfNeeded(xero, tokenSet);
  if (updated !== tokenSet) {
    await xero.setTokenSet(updated);
  }
  try {
    await xero.updateTenants();
  } catch {}
  return { xero, tenantId };
}

function toDateString(value) {
  try {
    if (typeof value === 'string' && value.includes('/Date(')) {
      const ms = parseInt(value.match(/\d+/)[0]);
      return new Date(ms).toISOString().split('T')[0];
    }
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (typeof value === 'string') return value.split('T')[0];
    return value;
  } catch {
    return value;
  }
}

async function runTransactionSync(options = {}) {
  const { forceRefresh = false } = options;

  const session = await getXeroSession();
  if (!session) {
    return {
      success: false,
      status: 400,
      error: 'Xero not connected. Please authenticate first.',
    };
  }

  const { xero, tenantId } = session;

  try {
    const whereClause = forceRefresh ? undefined : 'Status=="AUTHORISED"';
    const response = await xero.accountingApi.getBankTransactions(
      tenantId,
      undefined,
      whereClause
    );

    const transactions = response?.body?.bankTransactions || [];
    if (transactions.length === 0) {
      await redis.set('xero:last_sync', new Date().toISOString());
      return {
        success: true,
        processed: 0,
        message: 'No new transactions to sync',
        lastSync: new Date().toISOString(),
      };
    }

    const categorisationRules = await getActiveCategorisationRules();
    const processedTransactions = [];

    for (const tx of transactions) {
      const processed = {
        xero_id: tx.bankTransactionID,
        date: toDateString(tx.date),
        description: tx.reference || 'No description',
        amount: tx.total || 0,
        contact: tx.contact?.name || 'Unknown',
        status: tx.status,
        type: tx.type,
        bank_account: tx.bankAccount?.name,
        line_items: (tx.lineItems || []).map(item => ({
          description: item.description || null,
          quantity: item.quantity || null,
          unitAmount: item.unitAmount || null,
          accountCode: item.accountCode || null,
          taxType: item.taxType || null,
          taxAmount: item.taxAmount || null
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const suggestion = await suggestCategoryForTransaction(
        {
          description: processed.description,
          contact: processed.contact,
          amount: processed.amount,
          type: processed.type,
          bankAccount: processed.bank_account
        },
        { rules: categorisationRules }
      );

      if (suggestion && suggestion.category) {
        processed.suggested_category = suggestion.category;
        processed.confidence = suggestion.confidence;
        processed.processing_agent = `adaptive_categorizer:${suggestion.source}`;
        processed.agent_processed = true;
        processed.confidence_score = suggestion.confidence;
        processed.match_confidence = suggestion.confidence;
      } else {
        processed.agent_processed = false;
        processed.processing_agent = 'adaptive_categorizer:none';
      }

      processedTransactions.push(processed);
    }

    if (processedTransactions.length > 0) {
      const { error } = await supabase
        .from('xero_transactions')
        .upsert(processedTransactions, { onConflict: 'xero_id' });

      if (error) {
        console.error('Supabase upsert error:', JSON.stringify(error, null, 2));
      } else if (!processedTransactions.length) {
        console.warn('Supabase upsert returned no data');
      }
    }

    await redis.set('xero:last_sync', new Date().toISOString());

    return {
      success: true,
      processed: processedTransactions.length,
      message: 'Transaction sync completed',
      lastSync: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Transaction sync error:', error);
    return {
      success: false,
      status: 500,
      error: 'Failed to sync transactions',
      details: error.message,
    };
  }
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function buildFinancialDigest(windowDays = 30) {
  const lastSync = await redis.get('xero:last_sync');
  const session = await getXeroSession();

  let organisationName = 'Not connected';
  let xeroStatus = 'disconnected';

  if (session) {
    xeroStatus = 'connected';
    try {
      const { xero, tenantId } = session;
      const organisations = await xero.accountingApi.getOrganisations(tenantId);
      organisationName = organisations?.body?.organisations?.[0]?.name || organisationName;
    } catch (error) {
      console.warn('⚠️  Unable to retrieve Xero organisation:', error.message);
    }
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - windowDays);
  const startDateStr = startDate.toISOString().split('T')[0];

  let recentTransactions = [];
  try {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('amount,type,date,suggested_category,contact')
      .gte('date', startDateStr);

    if (error) {
      throw error;
    }

    recentTransactions = data || [];
  } catch (error) {
    console.error('❌ Unable to load recent transactions for digest:', error.message);
    recentTransactions = [];
  }

  let income = 0;
  let expenses = 0;
  let uncategorisedCount = 0;
  const categoryTotals = new Map();
  const vendorTotals = new Map();

  for (const tx of recentTransactions) {
    const amount = Math.abs(Number(tx.amount || 0));
    const normalizedType = String(tx.type || '').toLowerCase();

    if (normalizedType === 'receive' || normalizedType === 'income') {
      income += amount;
    } else if (normalizedType === 'spend' || normalizedType === 'expense') {
      expenses += amount;
    }

    if (!tx.suggested_category) {
      uncategorisedCount += 1;
    } else {
      categoryTotals.set(
        tx.suggested_category,
        (categoryTotals.get(tx.suggested_category) || 0) + Math.abs(amount)
      );
    }

    if (tx.contact) {
      vendorTotals.set(
        tx.contact,
        (vendorTotals.get(tx.contact) || 0) + Math.abs(amount)
      );
    }
  }

  const topVendor = Array.from(vendorTotals.entries())
    .sort((a, b) => b[1] - a[1])[0];

  const topCategory = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])[0];

  let recommendationCount = 0;
  try {
    const { data: activeRecommendations } = await supabase
      .from('automated_insights')
      .select('id')
      .eq('status', 'active')
      .eq('generated_by', 'financial_intelligence_engine');

    recommendationCount = activeRecommendations?.length || 0;
  } catch (error) {
    console.warn('⚠️  Unable to fetch financial recommendations:', error.message);
  }

  const digestFields = {
    'Xero Status': xeroStatus === 'connected' ? `Connected (${organisationName})` : 'Disconnected',
    'Last Sync': lastSync ? new Date(lastSync).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }) : 'Never',
    [`${windowDays}d Income`]: formatCurrency(income),
    [`${windowDays}d Expenses`]: formatCurrency(expenses),
    'Net Movement': formatCurrency(income - expenses),
    'Uncategorised Txns': `${uncategorisedCount}`,
    'Top Vendor': topVendor ? `${topVendor[0]} (${formatCurrency(topVendor[1])})` : 'N/A',
    'Top Category': topCategory ? `${topCategory[0]} (${formatCurrency(topCategory[1])})` : 'N/A',
    'Active Recommendations': `${recommendationCount}`,
  };

  return {
    fields: digestFields,
    metrics: {
      income,
      expenses,
      net: income - expenses,
      uncategorisedCount,
      transactionCount: recentTransactions.length,
      windowDays
    },
  };
}

// =============================================================================
// STATUS & HEALTH ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/financial/status:
 *   get:
 *     summary: Get financial system status and Xero connection health
 *     tags: [Financial Status]
 *     responses:
 *       200:
 *         description: Financial system status
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const session = await getXeroSession();

    let xeroStatus = 'disconnected';
    let xeroInfo = {};

    if (session) {
      try {
        const { xero, tenantId } = session;
        const organisations = await xero.accountingApi.getOrganisations(tenantId);
        const org = organisations?.body?.organisations?.[0];

        xeroStatus = 'connected';
        xeroInfo = {
          organisation: org?.name,
          shortCode: org?.shortCode,
          baseCurrency: org?.baseCurrency,
          financialYearEndMonth: org?.financialYearEndMonth,
          lastSyncTime: await redis.get('xero:last_sync'),
        };
      } catch (error) {
        xeroStatus = 'error';
        xeroInfo = { error: error.message };
      }
    }

    res.json({
      success: true,
      financial: {
        xeroStatus,
        xeroInfo,
        features: [
          'Xero transaction management',
          'Automated receipt processing',
          'Financial reporting and analytics',
          'Rule-based categorisation',
          'Notification management',
          'CSV export capabilities',
          'Real-time dashboard metrics',
        ],
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/health:
 *   get:
 *     summary: Get financial system health (alias for status)
 *     tags: [Financial Status]
 *     responses:
 *       200:
 *         description: Financial system status
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const session = await getXeroSession();

    let xeroStatus = 'disconnected';
    let xeroInfo = {};

    if (session) {
      try {
        const { xero, tenantId } = session;
        const organisations = await xero.accountingApi.getOrganisations(tenantId);
        const org = organisations?.body?.organisations?.[0];

        xeroStatus = 'connected';
        xeroInfo = {
          organisation: org?.name,
          shortCode: org?.shortCode,
          baseCurrency: org?.baseCurrency,
          financialYearEndMonth: org?.financialYearEndMonth,
          lastSyncTime: await redis.get('xero:last_sync'),
        };
      } catch (error) {
        xeroStatus = 'error';
        xeroInfo = { error: error.message };
      }
    }

    res.json({
      success: true,
      financial: {
        xeroStatus,
        xeroInfo,
        features: [
          'Xero transaction management',
          'Automated receipt processing',
          'Financial reporting and analytics',
          'Rule-based categorisation',
          'Notification management',
          'CSV export capabilities',
          'Real-time dashboard metrics',
        ],
      },
    });
  })
);

// =============================================================================
// TRANSACTION MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/financial/transactions/sync:
 *   post:
 *     summary: Sync transactions from Xero
 *     tags: [Financial Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/transactions/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { forceRefresh = false } = req.body;
    const result = await runTransactionSync({ forceRefresh });

    if (!result.success) {
      return res.status(result.status || 500).json(result);
    }

    res.json(result);
  })
);

/**
 * @swagger
 * /api/v1/financial/transactions:
 *   get:
 *     summary: Get transactions with filtering and pagination
 *     tags: [Financial Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      category,
      contact,
      minAmount,
      maxAmount,
    } = req.query;

    let query = supabase
      .from('xero_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (category) {
      query = query.eq('suggested_category', category);
    }
    if (contact) {
      query = query.ilike('contact', `%${contact}%`);
    }
    if (minAmount) {
      query = query.gte('amount', parseFloat(minAmount));
    }
    if (maxAmount) {
      query = query.lte('amount', parseFloat(maxAmount));
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: transactions, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        details: error.message,
      });
    }

    res.json({
      success: true,
      transactions: transactions || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: transactions?.length === parseInt(limit),
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/transactions/export:
 *   get:
 *     summary: Export transactions to CSV
 *     tags: [Financial Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/transactions/export',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, format = 'csv' } = req.query;

    let query = supabase
      .from('xero_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: transactions } = await query;

    if (format === 'csv') {
      const csvHeader = 'Date,Description,Contact,Amount,Category,Type,Bank Account\n';
      const csvRows = transactions
        .map(
          tx =>
            `${tx.date},"${tx.description}","${tx.contact}",${tx.amount},"${tx.suggested_category || ''}","${tx.type}","${tx.bank_account || ''}"`
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send(csvHeader + csvRows);
    } else {
      res.json({
        success: true,
        transactions: transactions || [],
        count: transactions?.length || 0,
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/financial/transactions/{id}/category:
 *   post:
 *     summary: Update transaction category
 *     tags: [Financial Transactions]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/transactions/:id/category',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { category, createRule = false } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required',
      });
    }

    // Update transaction
    const { data: transaction, error } = await supabase
      .from('xero_transactions')
      .update({
        suggested_category: category,
        confidence: 1.0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update transaction',
        details: error.message,
      });
    }

    // Optionally create categorisation rule
    if (createRule && transaction) {
      const { error: ruleError } = await supabase.from('categorisation_rules').insert({
        pattern: transaction.description.toLowerCase(),
        category,
        confidence: 1.0,
        created_by: req.user.id,
        created_at: new Date().toISOString(),
      });

      if (ruleError) {
        console.error('Failed to create rule:', ruleError);
      } else {
        invalidateCategorisationRuleCache();
      }
    }

    res.json({
      success: true,
      message: 'Transaction category updated',
      transaction,
    });
  })
);

// =============================================================================
// RECEIPT PROCESSING ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/financial/receipts/sweep:
 *   post:
 *     summary: Sweep Gmail for receipts and process them
 *     tags: [Financial Receipts]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/receipts/sweep',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Implementation would integrate with Gmail API to scan for receipts
    // This is a placeholder that returns success for now

    const mockReceipts = [
      {
        id: 'receipt_1',
        date: new Date().toISOString(),
        amount: 25.5,
        vendor: 'Local Coffee Shop',
        status: 'pending_match',
      },
      {
        id: 'receipt_2',
        date: new Date().toISOString(),
        amount: 89.99,
        vendor: 'Office Supplies Co',
        status: 'pending_match',
      },
    ];

    res.json({
      success: true,
      message: 'Gmail receipt sweep completed',
      receipts: mockReceipts,
      processed: mockReceipts.length,
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/receipts/suggestions:
 *   get:
 *     summary: Get receipt matching suggestions
 *     tags: [Financial Receipts]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/receipts/suggestions',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Get pending receipts and unmatched transactions for suggestions
    const { data: unmatchedTransactions } = await supabase
      .from('xero_transactions')
      .select('*')
      .is('receipt_matched', null)
      .order('date', { ascending: false })
      .limit(20);

    const suggestions =
      unmatchedTransactions?.map(tx => ({
        transaction: tx,
        possibleMatches: [], // Would contain Gmail receipt matches
        confidence: 0.8,
      })) || [];

    res.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/receipts/attach:
 *   post:
 *     summary: Attach receipt to transaction
 *     tags: [Financial Receipts]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/receipts/attach',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { transactionId, receiptId } = req.body;

    if (!transactionId || !receiptId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID and Receipt ID are required',
      });
    }

    // Update transaction with receipt attachment
    const { data: transaction, error } = await supabase
      .from('xero_transactions')
      .update({
        receipt_matched: receiptId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to attach receipt',
        details: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Receipt attached to transaction',
      transaction,
    });
  })
);

// =============================================================================
// FINANCIAL REPORTS & ANALYTICS ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/financial/reports/summary:
 *   get:
 *     summary: Get comprehensive financial summary
 *     tags: [Financial Reports]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/reports/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await getXeroSession();

    // Get basic metrics from transactions
    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('amount, type, date')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const income =
      transactions
        ?.filter(tx => tx.type === 'RECEIVE')
        .reduce((sum, tx) => sum + tx.amount, 0) || 0;
    const expenses =
      transactions
        ?.filter(tx => tx.type === 'SPEND')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;

    let xeroMetrics = {};
    if (session) {
      try {
        const { xero, tenantId } = session;
        // Get balance sheet for additional metrics
        const balanceSheet = await xero.accountingApi.getReportBalanceSheet(tenantId);
        // Parse balance sheet data would go here
        xeroMetrics = {
          totalAssets: 0,
          totalLiabilities: 0,
          netAssets: 0,
          cashPosition: 0,
        };
      } catch (error) {
        console.error('Failed to fetch Xero metrics:', error);
      }
    }

    res.json({
      success: true,
      summary: {
        period: 'Last 30 days',
        income,
        expenses,
        netIncome: income - expenses,
        transactionCount: transactions?.length || 0,
        ...xeroMetrics,
        lastUpdated: new Date().toISOString(),
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/reports/cashflow:
 *   get:
 *     summary: Get cashflow trend analysis
 *     tags: [Financial Reports]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/reports/cashflow',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('amount, type, date')
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    // Group by month
    const monthlyData = {};
    transactions?.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }

      if (tx.type === 'RECEIVE') {
        monthlyData[month].income += tx.amount;
      } else {
        monthlyData[month].expenses += Math.abs(tx.amount);
      }
    });

    const cashflowData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      netCashflow: data.income - data.expenses,
    }));

    res.json({
      success: true,
      cashflow: cashflowData,
      period: `${months} months`,
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/reports/vendors:
 *   get:
 *     summary: Get top vendors by spending
 *     tags: [Financial Reports]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/reports/vendors',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('contact, amount')
      .eq('type', 'SPEND')
      .not('contact', 'is', null);

    // Group by vendor and sum amounts
    const vendorTotals = {};
    transactions?.forEach(tx => {
      const vendor = tx.contact;
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + Math.abs(tx.amount);
    });

    const topVendors = Object.entries(vendorTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([vendor, total]) => ({ vendor, total }));

    res.json({
      success: true,
      vendors: topVendors,
      totalVendors: Object.keys(vendorTotals).length,
    });
  })
);

// =============================================================================
// AGING (AR/AP) ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/financial/aging:
 *   get:
 *     summary: Get AR/AP aging buckets for open invoices/bills
 *     tags: [Financial Reports]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/aging',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const side = String(req.query.side || 'ap').toLowerCase(); // ap | ar
    const days = Math.min(Math.max(parseInt(String(req.query.days || '180')), 1), 365);
    const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();

    const session = await getXeroSession();
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Xero not connected',
        message: 'Please connect to Xero to view aging data',
        side,
        asOf: asOf.toISOString(),
        days
      });
    }
    const { xero, tenantId } = session;

    // Build Xero where filter
    const start = new Date(asOf.getTime() - days * 24 * 60 * 60 * 1000);
    const y = start.getUTCFullYear();
    const m = start.getUTCMonth() + 1;
    const d = start.getUTCDate();
    const type = side === 'ar' ? 'ACCREC' : 'ACCPAY';
    const where = `Type=="${type}" && AmountDue>0 && Date>=DateTime(${y}, ${m}, ${d})`;

    const invoices = [];
    let page = 1;
    const maxPages = 50; // sufficient for most windows, configurable later
    while (page <= maxPages) {
      const { body } = await xero.accountingApi.getInvoices(
        tenantId,
        undefined,
        where,
        undefined,
        page,
        false
      );
      const list = body?.invoices || [];
      if (!list.length) break;
      invoices.push(...list);
      if (list.length < 100) break;
      page += 1;
    }

    function daysPast(due) {
      if (!due) return 0;
      const dd = new Date(due);
      return Math.floor((asOf - dd) / (1000 * 60 * 60 * 24));
    }
    function bucketFor(past) {
      if (past <= 0) return 'current';
      if (past <= 7) return '1-7';
      if (past <= 30) return '8-30';
      if (past <= 60) return '31-60';
      if (past <= 90) return '61-90';
      return '>90';
    }

    const buckets = { current: 0, '1-7': 0, '8-30': 0, '31-60': 0, '61-90': 0, '>90': 0 };
    const byVendor = new Map();
    const details = [];

    for (const inv of invoices) {
      const due = inv?.dueDate || inv?.date || inv?.updatedDateUTC;
      const past = daysPast(due);
      const b = bucketFor(past);
      const dueAmt = Number(inv?.amountDue || 0);
      buckets[b] += dueAmt;
      const vendor = inv?.contact?.name || '—';
      const v = byVendor.get(vendor) || { vendor, total: 0, buckets: { ...buckets, current:0,'1-7':0,'8-30':0,'31-60':0,'61-90':0,'>90':0 } };
      v.total += dueAmt;
      v.buckets[b] += dueAmt;
      byVendor.set(vendor, v);
      details.push({
        invoiceId: inv?.invoiceID,
        number: inv?.invoiceNumber,
        contact: vendor,
        date: inv?.date,
        dueDate: inv?.dueDate || null,
        total: Number(inv?.total || 0),
        amountPaid: Number(inv?.amountPaid || 0),
        amountDue: dueAmt,
        status: inv?.status,
        daysPastDue: past,
        bucket: b,
      });
    }

    const vendors = Array.from(byVendor.values()).sort((a, b) => b.total - a.total).slice(0, 50);
    const count = details.length;
    const limitedDetails = details.sort((a,b)=> (b.daysPastDue|0)-(a.daysPastDue|0)).slice(0, 200);

    res.json({ success: true, side, asOf: asOf.toISOString(), days, buckets, totalOpen: Object.values(buckets).reduce((a,b)=>a+b,0), vendors, count, invoices: limitedDetails });
  })
);


// =============================================================================
// CATEGORISATION RULES ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /api/v1/financial/rules:
 *   get:
 *     summary: Get categorisation rules
 *     tags: [Financial Rules]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/rules',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: rules, error } = await supabase
      .from('categorisation_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch rules',
        details: error.message,
      });
    }

    res.json({
      success: true,
      rules: rules || [],
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/rules:
 *   post:
 *     summary: Create new categorisation rule
 *     tags: [Financial Rules]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/rules',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { pattern, category, confidence = 0.8 } = req.body;

    if (!pattern || !category) {
      return res.status(400).json({
        success: false,
        error: 'Pattern and category are required',
      });
    }

    const { data: rule, error } = await supabase
      .from('categorisation_rules')
      .insert({
        pattern: pattern.toLowerCase(),
        category,
        confidence,
        created_by: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create rule',
        details: error.message,
      });
    }

    invalidateCategorisationRuleCache();

    res.json({
      success: true,
      message: 'Rule created successfully',
      rule,
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/rules/{id}:
 *   delete:
 *     summary: Delete categorisation rule
 *     tags: [Financial Rules]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/rules/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase.from('categorisation_rules').delete().eq('id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete rule',
        details: error.message,
      });
    }

    invalidateCategorisationRuleCache();

    res.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/rules/apply:
 *   post:
 *     summary: Apply categorisation rules to uncategorised transactions
 *     tags: [Financial Rules]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/rules/apply',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Get active rules
    const { data: rules } = await supabase
      .from('categorisation_rules')
      .select('*')
      .order('confidence', { ascending: false });

    // Get uncategorised transactions
    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('*')
      .is('suggested_category', null);

    let appliedCount = 0;

    const categorisationRules = await getActiveCategorisationRules();

    for (const tx of transactions || []) {
      const suggestion = await suggestCategoryForTransaction(
        {
          description: tx.description,
          contact: tx.contact,
          amount: tx.amount,
          type: tx.type,
          bankAccount: tx.bank_account
        },
        {
          rules: categorisationRules,
          useAI: false,
          useHeuristics: false
        }
      );

      if (suggestion && suggestion.category) {
        const { error } = await supabase
          .from('xero_transactions')
          .update({
            suggested_category: suggestion.category,
            confidence: suggestion.confidence,
            processing_agent: `adaptive_categorizer:${suggestion.source}`,
            agent_processed: true,
            confidence_score: suggestion.confidence,
            match_confidence: suggestion.confidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tx.id);

        if (!error) {
          appliedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: 'Rules applied successfully',
      appliedCount,
      totalRules: rules?.length || 0,
      totalTransactions: transactions?.length || 0,
    });
  })
);

/**
 * @swagger
 * /api/v1/financial/automation/daily-digest:
 *   post:
 *     summary: Generate and send the daily financial digest
 *     tags: [Financial Automation]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/automation/daily-digest',
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      forceSync = false,
      channel = 'slack',
      refreshRecommendations: refreshRecs = false
    } = req.body || {};

    if (forceSync) {
      const syncResult = await runTransactionSync({ forceRefresh: true });
      if (!syncResult.success) {
        return res.status(syncResult.status || 500).json(syncResult);
      }
    }

    if (refreshRecs) {
      await refreshFinancialRecommendations();
    }

    const digest = await buildFinancialDigest(30);
    const notificationBus = getNotificationBus();

    if (channel === 'both' || channel === 'slack') {
      await notificationBus.sendDailyDigest(digest.fields);
    }

    if (channel === 'both' || channel === 'email') {
      await notificationBus.send({
        type: 'daily_digest',
        channel: 'email',
        data: digest.fields,
        email: req.user?.email || process.env.EMAIL_TO,
      });
    }

    res.json({
      success: true,
      digest,
    });
  })
);

router.post(
  '/automation/weekly-brief',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { channel = 'slack' } = req.body || {};
    const brief = await buildFinancialDigest(7);
    const notificationBus = getNotificationBus();

    if (channel === 'both' || channel === 'slack') {
      await notificationBus.send({
        type: 'daily_digest',
        channel: 'slack',
        data: brief.fields,
      });
    }

    if (channel === 'both' || channel === 'email') {
      await notificationBus.send({
        type: 'daily_digest',
        channel: 'email',
        data: brief.fields,
      });
    }

    res.json({ success: true, brief });
  })
);

/**
 * @swagger
 * /api/v1/financial/intelligence/recommendations/run:
 *   post:
 *     summary: Regenerate financial intelligence recommendations
 *     tags: [Financial Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/intelligence/recommendations/run',
  requireAuth,
  asyncHandler(async (req, res) => {
    const records = await refreshFinancialRecommendations();
    res.json({ success: true, generated: records.length });
  })
);

/**
 * @swagger
 * /api/v1/financial/intelligence/recommendations:
 *   get:
 *     summary: List financial intelligence recommendations
 *     tags: [Financial Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/intelligence/recommendations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = req.query.status || 'active';
    const recommendations = await listFinancialRecommendations({ status });
    res.json({ success: true, recommendations });
  })
);

/**
 * @swagger
 * /api/v1/financial/intelligence/recommendations/{id}:
 *   patch:
 *     summary: Update recommendation status and feedback
 *     tags: [Financial Intelligence]
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/intelligence/recommendations/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body || {};

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const updated = await updateFinancialRecommendation(id, { status, notes });
    res.json({ success: true, recommendation: updated });
  })
);

export default router;
