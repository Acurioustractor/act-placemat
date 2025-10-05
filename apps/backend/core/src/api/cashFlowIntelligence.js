/**
 * Cash Flow Intelligence API
 * Real bank transactions + receipt reconciliation tracking
 */

import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_KEY) {
    console.error('❌ No Supabase key found for Cash Flow Intelligence');
    return null;
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Cash Flow Intelligence Supabase client initialized');
  return _supabase;
}

export default function cashFlowIntelligenceRoutes(app) {

  /**
   * GET /api/v2/cashflow/dashboard
   * Real bank transaction dashboard with receipt reconciliation
   */
  app.get('/api/v2/cashflow/dashboard', async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Supabase not configured'
        });
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);

      // Get all bank transactions
      const { data: allTransactions } = await supabase
        .from('xero_bank_transactions')
        .select('*')
        .order('date', { ascending: false });

      console.log(`💰 Cash Flow: Processing ${allTransactions?.length || 0} bank transactions`);

      // Get Dext receipts (if any)
      const { data: dextReceipts } = await supabase
        .from('dext_receipts')
        .select('*');

      // === CATEGORIZE TRANSACTIONS ===
      const moneyIn = allTransactions?.filter(txn =>
        txn.type === 'RECEIVE' && txn.status !== 'DELETED'
      ) || [];

      const moneyOut = allTransactions?.filter(txn =>
        txn.type === 'SPEND' && txn.status !== 'DELETED'
      ) || [];

      // Recent activity (last 30 days)
      const recentMoneyIn = moneyIn.filter(txn =>
        new Date(txn.date) >= thirtyDaysAgo
      );

      const recentMoneyOut = moneyOut.filter(txn =>
        new Date(txn.date) >= thirtyDaysAgo
      );

      // === CALCULATE TOTALS ===
      const totalMoneyIn = moneyIn.reduce((sum, txn) => sum + (txn.total || 0), 0);
      const totalMoneyOut = moneyOut.reduce((sum, txn) => sum + Math.abs(txn.total || 0), 0);
      const netCashFlow = totalMoneyIn - totalMoneyOut;

      const last30DaysIn = recentMoneyIn.reduce((sum, txn) => sum + (txn.total || 0), 0);
      const last30DaysOut = recentMoneyOut.reduce((sum, txn) => sum + Math.abs(txn.total || 0), 0);
      const last30DaysNet = last30DaysIn - last30DaysOut;

      // === RECEIPT RECONCILIATION ===
      // Transactions that need receipts (expenses over certain threshold)
      const needsReceiptThreshold = 50; // $50 or more needs a receipt

      const expensesNeedingReceipts = moneyOut.filter(txn => {
        const amount = Math.abs(txn.total || 0);
        return amount >= needsReceiptThreshold;
      });

      // Group by reconciliation status
      const reconciledExpenses = expensesNeedingReceipts.filter(txn => {
        // TODO: Check if this transaction has a matching Dext receipt
        // For now, we'll mark as unreconciled
        return false;
      });

      const unreconciledExpenses = expensesNeedingReceipts.filter(txn => {
        return !reconciledExpenses.includes(txn);
      });

      // === BY CONTACT/VENDOR ===
      const topVendors = {};
      moneyOut.forEach(txn => {
        const vendor = txn.contact_name || 'Unknown';
        if (!topVendors[vendor]) {
          topVendors[vendor] = {
            name: vendor,
            totalSpent: 0,
            transactionCount: 0,
            transactions: []
          };
        }
        topVendors[vendor].totalSpent += Math.abs(txn.total || 0);
        topVendors[vendor].transactionCount += 1;
        topVendors[vendor].transactions.push(txn);
      });

      const topVendorsList = Object.values(topVendors)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 20);

      // === BY MONTH ===
      const monthlyBreakdown = {};
      allTransactions?.forEach(txn => {
        if (txn.status === 'DELETED') return;

        const date = new Date(txn.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = {
            month: monthKey,
            moneyIn: 0,
            moneyOut: 0,
            net: 0,
            transactionCount: 0
          };
        }

        if (txn.type === 'RECEIVE') {
          monthlyBreakdown[monthKey].moneyIn += txn.total || 0;
        } else if (txn.type === 'SPEND') {
          monthlyBreakdown[monthKey].moneyOut += Math.abs(txn.total || 0);
        }

        monthlyBreakdown[monthKey].net =
          monthlyBreakdown[monthKey].moneyIn - monthlyBreakdown[monthKey].moneyOut;
        monthlyBreakdown[monthKey].transactionCount += 1;
      });

      const monthlyData = Object.values(monthlyBreakdown)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12); // Last 12 months

      res.json({
        success: true,
        timestamp: new Date().toISOString(),

        // Summary
        summary: {
          totalTransactions: allTransactions?.length || 0,
          totalMoneyIn,
          totalMoneyOut,
          netCashFlow,
          last30Days: {
            moneyIn: last30DaysIn,
            moneyOut: last30DaysOut,
            netCashFlow: last30DaysNet,
            transactionCount: recentMoneyIn.length + recentMoneyOut.length
          }
        },

        // Receipt Reconciliation
        reconciliation: {
          totalExpensesNeedingReceipts: expensesNeedingReceipts.length,
          totalAmountNeedingReceipts: expensesNeedingReceipts.reduce((sum, txn) =>
            sum + Math.abs(txn.total || 0), 0
          ),
          reconciled: reconciledExpenses.length,
          unreconciled: unreconciledExpenses.length,
          unreconciledTransactions: unreconciledExpenses
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50) // Top 50 most recent unreconciled
        },

        // Recent Activity
        recentActivity: {
          moneyIn: recentMoneyIn.slice(0, 20),
          moneyOut: recentMoneyOut.slice(0, 20)
        },

        // Top Vendors
        topVendors: topVendorsList,

        // Monthly Trends
        monthlyTrends: monthlyData
      });

    } catch (error) {
      console.error('❌ Cash flow intelligence error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/cashflow/missing-receipts
   * Find transactions that likely need receipts but don't have them
   */
  app.get('/api/v2/cashflow/missing-receipts', async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Supabase not configured'
        });
      }

      // Get expense transactions
      const { data: expenses } = await supabase
        .from('xero_bank_transactions')
        .select('*')
        .eq('type', 'SPEND')
        .neq('status', 'DELETED')
        .gte('total', -1000) // Expenses under $1000
        .order('date', { ascending: false })
        .limit(100);

      // Categorize by likely receipt source
      const missingReceipts = expenses?.map(txn => {
        const amount = Math.abs(txn.total || 0);
        const vendor = txn.contact_name || 'Unknown';
        const description = txn.reference || '';

        // AI hints for where to find receipt
        const hints = [];

        // Email receipt likely
        if (vendor.toLowerCase().includes('stripe') ||
            vendor.toLowerCase().includes('paypal') ||
            vendor.toLowerCase().includes('xero') ||
            description.toLowerCase().includes('subscription')) {
          hints.push({
            source: 'email',
            confidence: 'high',
            suggestion: `Search email for "${vendor}" around ${txn.date}`
          });
        }

        // Physical receipt likely
        if (vendor.toLowerCase().includes('cafe') ||
            vendor.toLowerCase().includes('restaurant') ||
            vendor.toLowerCase().includes('uber') ||
            vendor.toLowerCase().includes('supplies')) {
          hints.push({
            source: 'dext',
            confidence: 'medium',
            suggestion: `Upload receipt from ${vendor} dated ${txn.date} to Dext`
          });
        }

        // Calendar event might have details
        if (amount > 100) {
          hints.push({
            source: 'calendar',
            confidence: 'low',
            suggestion: `Check calendar for events around ${txn.date} that might relate to this expense`
          });
        }

        return {
          ...txn,
          amount: Math.abs(txn.total || 0),
          vendor,
          receiptHints: hints
        };
      }) || [];

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        missingReceipts: missingReceipts.slice(0, 50),
        summary: {
          totalMissingReceipts: missingReceipts.length,
          totalAmount: missingReceipts.reduce((sum, txn) => sum + txn.amount, 0),
          withEmailHints: missingReceipts.filter(txn =>
            txn.receiptHints.some(h => h.source === 'email')
          ).length,
          withDextHints: missingReceipts.filter(txn =>
            txn.receiptHints.some(h => h.source === 'dext')
          ).length
        }
      });

    } catch (error) {
      console.error('❌ Missing receipts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
