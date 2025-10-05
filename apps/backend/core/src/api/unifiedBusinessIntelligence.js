/**
 * Unified Business Intelligence API
 *
 * First Principles: Answer the 3 core business questions
 * 1. "Do I have money?" → /cash-position
 * 2. "Am I making money?" → /profitability
 * 3. "What should I do?" → /actions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Lazy-load Supabase client
let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

export default function unifiedBusinessIntelligenceRoutes(app) {

  // ============================================
  // OVERVIEW: Answer all 3 questions at once
  // ============================================
  app.get('/api/v2/business/overview', async (req, res) => {
    try {
      const [cashPosition, profitability, actions] = await Promise.all([
        getCashPosition(),
        getProfitability('current_quarter'),
        getActions()
      ]);

      const healthScore = calculateOverallHealth(cashPosition, profitability, actions);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        healthScore,
        cashPosition,
        profitability,
        actions
      });
    } catch (error) {
      console.error('Error fetching business overview:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // QUESTION 1: "Do I have money?"
  // ============================================
  app.get('/api/v2/business/cash-position', async (req, res) => {
    try {
      const result = await getCashPosition();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error fetching cash position:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // QUESTION 2: "Am I making money?"
  // ============================================
  app.get('/api/v2/business/profitability', async (req, res) => {
    try {
      const { period = 'current_quarter' } = req.query;
      const result = await getProfitability(period);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error fetching profitability:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // QUESTION 3: "What should I do next?"
  // ============================================
  app.get('/api/v2/business/actions', async (req, res) => {
    try {
      const result = await getActions();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error fetching actions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ============================================
// Helper Functions
// ============================================

async function getCashPosition() {
  const supabase = getSupabase();
  // Get all receivables (money owed to you)
  const { data: receivables } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCREC')
    .gt('amount_due', 0);

  // Get all payables (money you owe)
  const { data: payables } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCPAY')
    .gt('amount_due', 0);

  const totalReceivable = receivables?.reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0) || 0;
  const totalPayable = payables?.reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0) || 0;
  const netPosition = totalReceivable - totalPayable;

  // Calculate forecast
  const forecast = await generateForecast(receivables || [], payables || []);

  // Calculate health metrics
  const healthScore = calculateHealthScore(totalReceivable, totalPayable, netPosition);
  const runwayMonths = calculateRunway(netPosition);

  return {
    current: {
      receivable: totalReceivable,
      payable: totalPayable,
      netPosition,
      receivableCount: receivables?.length || 0,
      payableCount: payables?.length || 0
    },
    forecast,
    healthScore,
    runwayMonths,
    status: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'needs_attention' : 'critical'
  };
}

async function getProfitability(period) {
  const supabase = getSupabase();
  const { start, end } = getPeriodDates(period);

  // Get sales invoices in period
  const { data: sales } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCREC')
    .gte('date', start)
    .lte('date', end);

  // Get expense invoices in period
  const { data: expenses } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCPAY')
    .gte('date', start)
    .lte('date', end);

  const revenue = sales?.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0) || 0;
  const expenseTotal = expenses?.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0) || 0;
  const grossProfit = revenue - expenseTotal;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Get BAS status
  const { data: basRecords } = await supabase
    .from('xero_bas_tracking')
    .select('*')
    .order('period_end', { ascending: false })
    .limit(1);

  const currentBAS = basRecords?.[0] || null;

  // Group sales by customer
  const customerBreakdown = groupByCustomer(sales || []);

  return {
    period: { start, end, name: period },
    revenue: {
      total: revenue,
      invoiceCount: sales?.length || 0,
      breakdown: customerBreakdown.slice(0, 5) // Top 5 customers
    },
    expenses: {
      total: expenseTotal,
      invoiceCount: expenses?.length || 0
    },
    profitability: {
      grossProfit,
      margin: parseFloat(margin.toFixed(2)),
      status: margin >= 70 ? 'excellent' : margin >= 40 ? 'good' : margin >= 20 ? 'fair' : 'poor'
    },
    taxCompliance: currentBAS ? {
      gstCollected: parseFloat(currentBAS.gst_on_sales),
      gstPaid: parseFloat(currentBAS.gst_on_purchases),
      netGst: parseFloat(currentBAS.net_gst),
      status: currentBAS.status,
      dueDate: '2025-10-28' // Fixed for Q3 2025
    } : null
  };
}

async function getActions() {
  const supabase = getSupabase();
  const actions = {
    urgent: [],
    important: [],
    opportunities: []
  };

  // Check BAS status
  const { data: basRecords } = await supabase
    .from('xero_bas_tracking')
    .select('*')
    .eq('status', 'ready_to_lodge')
    .order('period_end', { ascending: false })
    .limit(1);

  if (basRecords && basRecords.length > 0) {
    const bas = basRecords[0];
    actions.urgent.push({
      id: 'bas-lodge-q3',
      type: 'compliance',
      category: 'bookkeeping',
      title: '🇦🇺 Lodge BAS for Q3 2025',
      description: `$${parseFloat(bas.net_gst).toLocaleString()} GST ready to lodge with ATO`,
      dueDate: '2025-10-28',
      effort: 'quick',
      automatable: true,
      impact: 'Avoid late penalties, stay compliant',
      data: { gst: parseFloat(bas.net_gst), quarter: 'Q3 2025' }
    });
  }

  // Check overdue invoices
  const today = new Date().toISOString().split('T')[0];
  const { data: overdue } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCREC')
    .lt('due_date', today)
    .gt('amount_due', 0)
    .order('due_date', { ascending: true })
    .limit(10);

  if (overdue && overdue.length > 0) {
    const totalOverdue = overdue.reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);
    actions.urgent.push({
      id: 'chase-overdue',
      type: 'cash_collection',
      category: 'invoicing',
      title: `💸 Chase ${overdue.length} Overdue Invoices`,
      description: `$${totalOverdue.toLocaleString()} overdue`,
      effort: 'quick',
      automatable: true,
      impact: 'Improve cash flow, strengthen client relationships',
      data: { invoices: overdue, totalAmount: totalOverdue }
    });
  }

  // Check invoices due this week
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekFromNowStr = weekFromNow.toISOString().split('T')[0];

  const { data: dueThisWeek } = await supabase
    .from('xero_invoices')
    .select('*')
    .eq('type', 'ACCREC')
    .gte('due_date', today)
    .lte('due_date', weekFromNowStr)
    .gt('amount_due', 0);

  if (dueThisWeek && dueThisWeek.length > 0) {
    const totalDue = dueThisWeek.reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);
    actions.important.push({
      id: 'invoices-due-week',
      type: 'monitoring',
      category: 'invoicing',
      title: `📅 ${dueThisWeek.length} Invoices Due This Week`,
      description: `$${totalDue.toLocaleString()} expected`,
      effort: 'quick',
      automatable: false,
      impact: 'Monitor payment timing',
      data: { invoices: dueThisWeek }
    });
  }

  // Bank reconciliation reminder (always show)
  actions.important.push({
    id: 'bank-reconcile',
    type: 'bookkeeping',
    category: 'bookkeeping',
    title: '🏦 Reconcile Bank Transactions',
    description: 'Match Xero invoices with bank deposits',
    effort: 'medium',
    automatable: true,
    impact: 'Accurate financial records, tax readiness'
  });

  // Growth opportunity (example)
  actions.opportunities.push({
    id: 'grant-regional-arts',
    type: 'funding',
    category: 'growth',
    title: '💡 Apply for Regional Arts Fund Grant',
    description: 'Deadline Nov 15 • $10K-$50K funding available',
    dueDate: '2025-11-15',
    effort: 'involved',
    automatable: false,
    impact: 'Secure growth funding, expand impact'
  });

  return actions;
}

// ============================================
// Utility Functions
// ============================================

function getPeriodDates(period) {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'current_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'current_quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      break;
    case 'current_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      end = new Date(now.getFullYear(), (Math.floor(now.getMonth() / 3) + 1) * 3, 0);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

function generateForecast(receivables, payables) {
  const now = new Date();

  // 7-day forecast
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const receivable7d = receivables.filter(inv =>
    new Date(inv.due_date) <= sevenDaysOut
  ).reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);

  const payable7d = payables.filter(inv =>
    new Date(inv.due_date) <= sevenDaysOut
  ).reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);

  // 30-day forecast
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const receivable30d = receivables.filter(inv =>
    new Date(inv.due_date) <= thirtyDaysOut
  ).reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);

  const payable30d = payables.filter(inv =>
    new Date(inv.due_date) <= thirtyDaysOut
  ).reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0);

  return {
    next7days: {
      expected: receivable7d,
      scheduled: payable7d,
      net: receivable7d - payable7d
    },
    next30days: {
      expected: receivable30d,
      scheduled: payable30d,
      net: receivable30d - payable30d
    }
  };
}

function calculateHealthScore(receivable, payable, netPosition) {
  // Simple health score based on net position and ratio
  let score = 50; // Base score

  // Positive net position is good
  if (netPosition > 0) {
    score += 30;
  }

  // High receivable:payable ratio is good
  const ratio = payable > 0 ? receivable / payable : 10;
  if (ratio >= 10) score += 20;
  else if (ratio >= 5) score += 15;
  else if (ratio >= 2) score += 10;

  return Math.min(100, Math.max(0, score));
}

function calculateRunway(netPosition) {
  // Simple runway calculation
  // Assuming monthly burn rate of $10K (example)
  const monthlyBurn = 10000;
  return netPosition > 0 ? Math.floor(netPosition / monthlyBurn) : 0;
}

function groupByCustomer(invoices) {
  const grouped = {};
  invoices.forEach(inv => {
    const customer = inv.contact_name || 'Unknown';
    if (!grouped[customer]) {
      grouped[customer] = { customer, amount: 0, count: 0 };
    }
    grouped[customer].amount += parseFloat(inv.total || 0);
    grouped[customer].count++;
  });

  return Object.values(grouped)
    .sort((a, b) => b.amount - a.amount)
    .map(g => ({
      customer: g.customer,
      amount: g.amount,
      invoiceCount: g.count,
      percentage: 0 // Calculate if needed
    }));
}

function calculateOverallHealth(cashPosition, profitability, actions) {
  const cashScore = cashPosition.healthScore || 50;
  const profitScore = profitability.profitability?.margin || 0;
  const urgentCount = actions.urgent?.length || 0;

  // Weight: 40% cash, 40% profitability, 20% urgency penalty
  const urgencyPenalty = Math.min(urgentCount * 5, 20);

  return Math.round(
    (cashScore * 0.4) +
    (profitScore * 0.4) +
    (20 - urgencyPenalty)
  );
}