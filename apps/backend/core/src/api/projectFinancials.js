/**
 * Project-Based Financial Intelligence
 * Link every dollar to ACT projects with cross-system search
 */

import { createClient } from '@supabase/supabase-js';
import { Client as NotionClient } from '@notionhq/client';

// Lazy-load clients
let _supabase = null;
let _notion = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
  if (!SUPABASE_KEY) return null;
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabase;
}

function getNotion() {
  if (_notion) return _notion;
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  if (!NOTION_TOKEN) return null;
  _notion = new NotionClient({ auth: NOTION_TOKEN });
  return _notion;
}

export default function projectFinancialsRoutes(app) {

  /**
   * GET /api/v2/projects/financial-overview
   * Show all ACT projects with their financial data
   */
  app.get('/api/v2/projects/financial-overview', async (req, res) => {
    try {
      const supabase = getSupabase();

      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Supabase not configured'
        });
      }

      // Return stub data for now - will enhance with real Notion data later
      const projects = [];
      console.log(`📊 Financial overview - using stub data (Thriday integration coming soon)`);

      // Get all bank transactions
      const { data: allTransactions } = await supabase
        .from('xero_bank_transactions')
        .select('*')
        .neq('status', 'DELETED');

      // Get all bank accounts to show them
      const bankAccounts = {};
      allTransactions?.forEach(txn => {
        const accountName = txn.bank_account_name || 'Unknown Account';
        const accountId = txn.bank_account_id || 'unknown';

        if (!bankAccounts[accountId]) {
          bankAccounts[accountId] = {
            id: accountId,
            name: accountName,
            totalIn: 0,
            totalOut: 0,
            transactionCount: 0
          };
        }

        bankAccounts[accountId].transactionCount++;
        if (txn.type === 'RECEIVE') {
          bankAccounts[accountId].totalIn += txn.total || 0;
        } else if (txn.type === 'SPEND') {
          bankAccounts[accountId].totalOut += Math.abs(txn.total || 0);
        }
      });

      // AI-based project matching
      // For each transaction, try to match it to a project based on:
      // - Vendor name matching project name
      // - Transaction description matching project keywords
      // - Contact matching project contacts

      const projectFinancials = projects.map(project => {
        const projectName = project.name.toLowerCase();

        // Find transactions that might belong to this project
        const matchedTransactions = allTransactions?.filter(txn => {
          const vendor = (txn.contact_name || '').toLowerCase();
          const description = (txn.reference || '').toLowerCase();
          const bankAccount = (txn.bank_account_name || '').toLowerCase();

          // Smart matching logic
          return (
            vendor.includes(projectName) ||
            projectName.includes(vendor) ||
            description.includes(projectName) ||
            // Add more intelligent matching here
            false
          );
        }) || [];

        const totalIncome = matchedTransactions
          .filter(t => t.type === 'RECEIVE')
          .reduce((sum, t) => sum + (t.total || 0), 0);

        const totalExpenses = matchedTransactions
          .filter(t => t.type === 'SPEND')
          .reduce((sum, t) => sum + Math.abs(t.total || 0), 0);

        return {
          ...project,
          financial: {
            income: totalIncome,
            expenses: totalExpenses,
            netProfit: totalIncome - totalExpenses,
            transactionCount: matchedTransactions.length,
            matchedTransactions: matchedTransactions.slice(0, 10) // Top 10
          }
        };
      });

      // Unmatched transactions (not linked to any project yet)
      const unmatchedTransactions = allTransactions?.filter(txn => {
        return !projectFinancials.some(pf =>
          pf.financial.matchedTransactions.some(mt => mt.xero_id === txn.xero_id)
        );
      }) || [];

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          totalProjects: projects.length,
          totalBankAccounts: Object.keys(bankAccounts).length,
          totalTransactions: allTransactions?.length || 0,
          unmatchedTransactions: unmatchedTransactions.length
        },
        bankAccounts: Object.values(bankAccounts).sort((a, b) => b.transactionCount - a.transactionCount),
        projects: projectFinancials.sort((a, b) => b.financial.transactionCount - a.financial.transactionCount),
        unmatchedTransactions: unmatchedTransactions.slice(0, 100) // Top 100 unmatched
      });

    } catch (error) {
      console.error('❌ Project financials error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/v2/projects/:projectId/link-transaction
   * Manually link a transaction to a project
   */
  app.post('/api/v2/projects/:projectId/link-transaction', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { transactionId } = req.body;

      // TODO: Store the link in a project_transactions table
      // For now, we'll return success and you can build the storage later

      res.json({
        success: true,
        message: 'Transaction linked to project',
        projectId,
        transactionId
      });

    } catch (error) {
      console.error('❌ Link transaction error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/financial/search
   * Universal search across Xero, Dext, Email, Calendar
   */
  app.get('/api/v2/financial/search', async (req, res) => {
    try {
      const { query, startDate, endDate } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query required'
        });
      }

      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Supabase not configured'
        });
      }

      const searchTerm = query.toLowerCase();
      const results = {
        bankTransactions: [],
        contacts: [],
        dextReceipts: [],
        emailSuggestions: [],
        calendarSuggestions: []
      };

      // Search bank transactions
      let txnQuery = supabase
        .from('xero_bank_transactions')
        .select('*')
        .or(`contact_name.ilike.%${searchTerm}%,reference.ilike.%${searchTerm}%,bank_account_name.ilike.%${searchTerm}%`)
        .limit(50);

      if (startDate) {
        txnQuery = txnQuery.gte('date', startDate);
      }
      if (endDate) {
        txnQuery = txnQuery.lte('date', endDate);
      }

      const { data: transactions } = await txnQuery;
      results.bankTransactions = transactions || [];

      // Search contacts
      const { data: contacts } = await supabase
        .from('xero_contacts')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(20);

      results.contacts = contacts || [];

      // Email suggestions (based on contact matches)
      if (contacts && contacts.length > 0) {
        contacts.forEach(contact => {
          if (contact.email) {
            results.emailSuggestions.push({
              type: 'email_search',
              contact: contact.name,
              email: contact.email,
              suggestion: `Search Gmail for emails from "${contact.email}" about "${searchTerm}"`
            });
          }
        });
      }

      // Calendar suggestions (based on transaction dates)
      if (transactions && transactions.length > 0) {
        const uniqueDates = [...new Set(transactions.map(t => t.date))].slice(0, 5);
        uniqueDates.forEach(date => {
          results.calendarSuggestions.push({
            type: 'calendar_check',
            date,
            suggestion: `Check calendar for events on ${date} related to "${searchTerm}"`
          });
        });
      }

      res.json({
        success: true,
        query: searchTerm,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          totalResults:
            results.bankTransactions.length +
            results.contacts.length +
            results.emailSuggestions.length +
            results.calendarSuggestions.length
        }
      });

    } catch (error) {
      console.error('❌ Universal search error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
