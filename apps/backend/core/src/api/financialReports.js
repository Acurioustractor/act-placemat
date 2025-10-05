/**
 * Financial Reports API
 * Provides P&L, Balance Sheet, Cash Flow, and Aged Reports
 */

import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_KEY) {
    console.error('❌ No Supabase key found for Financial Reports');
    return null;
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Financial Reports Supabase client initialized');
  return _supabase;
}

export default function financialReportsRoutes(app) {

  /**
   * GET /api/v2/reports/financial-summary
   * Complete financial summary: P&L, Balance Sheet, Cash Flow, Aged Reports
   */
  app.get('/api/v2/reports/financial-summary', async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Supabase not configured'
        });
      }

      // Get all invoices
      const { data: invoices } = await supabase
        .from('xero_invoices')
        .select('*');

      console.log(`📊 Financial Reports: Found ${invoices?.length || 0} total invoices in database`);
      if (invoices?.length > 0) {
        const incomeInvoices = invoices.filter(inv => inv.type === 'ACCREC');
        const expenseInvoices = invoices.filter(inv => inv.type === 'ACCPAY');

        console.log(`   💚 ACCREC (Income): ${incomeInvoices.length} invoices, Total: $${incomeInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}`);
        console.log(`   ❤️ ACCPAY (Expenses): ${expenseInvoices.length} invoices, Total: $${expenseInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}`);

        // Show sample invoices
        console.log(`   Sample Income:`);
        incomeInvoices.slice(0, 3).forEach(inv => {
          console.log(`      ${inv.invoice_number}: $${inv.total} (unpaid: $${inv.amount_due || 0}) - ${inv.contact_name}`);
        });

        console.log(`   Sample Expenses:`);
        expenseInvoices.slice(0, 3).forEach(inv => {
          console.log(`      ${inv.invoice_number}: $${inv.total} (unpaid: $${inv.amount_due || 0}) - ${inv.contact_name}`);
        });
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // === PROFIT & LOSS ===
      // Income (money coming in)
      const income = invoices
        ?.filter(inv => inv.type === 'ACCREC')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      const incomeLastMonth = invoices
        ?.filter(inv =>
          inv.type === 'ACCREC' &&
          new Date(inv.date) >= thirtyDaysAgo
        )
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      // Expenses (money going out)
      const expenses = invoices
        ?.filter(inv => inv.type === 'ACCPAY')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      const expensesLastMonth = invoices
        ?.filter(inv =>
          inv.type === 'ACCPAY' &&
          new Date(inv.date) >= thirtyDaysAgo
        )
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      const profitLoss = {
        totalIncome: income,
        totalExpenses: expenses,
        netProfit: income - expenses,
        lastMonthIncome: incomeLastMonth,
        lastMonthExpenses: expensesLastMonth,
        lastMonthProfit: incomeLastMonth - expensesLastMonth
      };

      // === BALANCE SHEET ===
      // Assets = What you own (Receivables)
      const assets = invoices
        ?.filter(inv => inv.type === 'ACCREC' && inv.amount_due > 0)
        .reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;

      // Liabilities = What you owe (Payables)
      const liabilities = invoices
        ?.filter(inv => inv.type === 'ACCPAY' && inv.amount_due > 0)
        .reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;

      const balanceSheet = {
        assets,
        liabilities,
        equity: assets - liabilities
      };

      // === CASH FLOW ===
      const cashFlow = {
        inflowReceivable: assets,
        outflowPayable: liabilities,
        netCashFlow: assets - liabilities
      };

      // === AGED RECEIVABLES (Who owes YOU money) ===
      const receivableInvoices = invoices
        ?.filter(inv => inv.type === 'ACCREC' && inv.amount_due > 0) || [];

      const agedReceivables = {
        current: 0,      // 0-30 days
        days31to60: 0,   // 31-60 days
        days61to90: 0,   // 61-90 days
        over90: 0,       // 90+ days
        invoices: []
      };

      receivableInvoices.forEach(inv => {
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

        const invoiceData = {
          invoice_number: inv.invoice_number,
          contact_name: inv.contact_name,
          amount_due: inv.amount_due,
          due_date: inv.due_date,
          days_overdue: daysOverdue,
          aging_bucket: daysOverdue <= 0 ? 'current' :
                        daysOverdue <= 30 ? 'current' :
                        daysOverdue <= 60 ? '31-60' :
                        daysOverdue <= 90 ? '61-90' : '90+'
        };

        if (daysOverdue <= 30) {
          agedReceivables.current += inv.amount_due;
        } else if (daysOverdue <= 60) {
          agedReceivables.days31to60 += inv.amount_due;
        } else if (daysOverdue <= 90) {
          agedReceivables.days61to90 += inv.amount_due;
        } else {
          agedReceivables.over90 += inv.amount_due;
        }

        agedReceivables.invoices.push(invoiceData);
      });

      // Sort by days overdue (worst first)
      agedReceivables.invoices.sort((a, b) => b.days_overdue - a.days_overdue);

      // === AGED PAYABLES (Who YOU owe money) ===
      const payableInvoices = invoices
        ?.filter(inv => inv.type === 'ACCPAY' && inv.amount_due > 0) || [];

      const agedPayables = {
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        invoices: []
      };

      payableInvoices.forEach(inv => {
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

        const invoiceData = {
          invoice_number: inv.invoice_number,
          contact_name: inv.contact_name,
          amount_due: inv.amount_due,
          due_date: inv.due_date,
          days_overdue: daysOverdue,
          aging_bucket: daysOverdue <= 0 ? 'current' :
                        daysOverdue <= 30 ? 'current' :
                        daysOverdue <= 60 ? '31-60' :
                        daysOverdue <= 90 ? '61-90' : '90+'
        };

        if (daysOverdue <= 30) {
          agedPayables.current += inv.amount_due;
        } else if (daysOverdue <= 60) {
          agedPayables.days31to60 += inv.amount_due;
        } else if (daysOverdue <= 90) {
          agedPayables.days61to90 += inv.amount_due;
        } else {
          agedPayables.over90 += inv.amount_due;
        }

        agedPayables.invoices.push(invoiceData);
      });

      // Sort by days overdue
      agedPayables.invoices.sort((a, b) => b.days_overdue - a.days_overdue);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        profitLoss,
        balanceSheet,
        cashFlow,
        agedReceivables,
        agedPayables
      });

    } catch (error) {
      console.error('❌ Financial reports error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
