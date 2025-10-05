/**
 * Financial Data Discovery API
 * Shows what data sources exist and what data is available
 */

import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_KEY) {
    console.error('❌ No Supabase key found for Financial Discovery');
    return null;
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Financial Discovery Supabase client initialized');
  return _supabase;
}

export default function financialDiscoveryRoutes(app) {

  /**
   * GET /api/v2/financial/discover
   * Discover all financial data sources and their current state
   */
  app.get('/api/v2/financial/discover', async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Supabase not configured'
        });
      }

      const discovery = {
        success: true,
        timestamp: new Date().toISOString(),
        dataSources: {}
      };

      // Tables to check
      const tablesToCheck = [
        'xero_invoices',
        'xero_transactions',
        'xero_contacts',
        'xero_bank_accounts',
        'xero_bank_transactions',
        'xero_payments',
        'dext_receipts',
        'dext_expenses',
        'bank_accounts',
        'bank_transactions',
        'bas_reports'
      ];

      // Check each table
      for (const tableName of tablesToCheck) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (!error) {
            discovery.dataSources[tableName] = {
              exists: true,
              recordCount: count || 0,
              status: count > 0 ? 'has_data' : 'empty'
            };

            // Get sample data if records exist
            if (count > 0) {
              const { data: sample } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

              if (sample && sample[0]) {
                discovery.dataSources[tableName].columns = Object.keys(sample[0]);
                discovery.dataSources[tableName].sampleRecord = sample[0];
              }
            }
          }
        } catch (e) {
          discovery.dataSources[tableName] = {
            exists: false,
            error: e.message
          };
        }
      }

      // === DETAILED ANALYSIS ===

      // Bank Accounts
      if (discovery.dataSources['xero_bank_accounts']?.recordCount > 0) {
        const { data: accounts } = await supabase
          .from('xero_bank_accounts')
          .select('account_id, name, account_type, current_balance, currency_code');

        discovery.bankAccounts = accounts || [];
      }

      // Bank Transactions (last 30 days)
      if (discovery.dataSources['xero_bank_transactions']?.recordCount > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentTransactions, count: recentCount } = await supabase
          .from('xero_bank_transactions')
          .select('*', { count: 'exact' })
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(10);

        discovery.recentBankActivity = {
          last30Days: recentCount || 0,
          sampleTransactions: recentTransactions || []
        };
      }

      // Invoices breakdown
      if (discovery.dataSources['xero_invoices']?.recordCount > 0) {
        const { data: invoices } = await supabase
          .from('xero_invoices')
          .select('type, status, total, amount_due');

        const breakdown = {
          totalInvoices: invoices?.length || 0,
          salesInvoices: invoices?.filter(inv => inv.type === 'ACCREC').length || 0,
          purchaseInvoices: invoices?.filter(inv => inv.type === 'ACCPAY').length || 0,
          paidInvoices: invoices?.filter(inv => (inv.amount_due || 0) === 0).length || 0,
          unpaidInvoices: invoices?.filter(inv => (inv.amount_due || 0) > 0).length || 0
        };

        discovery.invoiceBreakdown = breakdown;
      }

      // Recommendations
      discovery.recommendations = [];

      if (!discovery.bankAccounts || discovery.bankAccounts.length === 0) {
        discovery.recommendations.push({
          type: 'warning',
          message: 'No bank accounts found. Xero sync may not have imported bank accounts yet.'
        });
      }

      if (!discovery.dataSources['xero_bank_transactions'] || discovery.dataSources['xero_bank_transactions'].recordCount === 0) {
        discovery.recommendations.push({
          type: 'warning',
          message: 'No bank transactions found. This is the real money movement data you need for accurate financial reports.'
        });
      }

      if (discovery.dataSources['xero_invoices']?.recordCount === 0) {
        discovery.recommendations.push({
          type: 'info',
          message: 'No invoices found. This could mean: (1) You have no invoices in Xero, or (2) Xero sync failed'
        });
      }

      res.json(discovery);

    } catch (error) {
      console.error('❌ Financial discovery error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
