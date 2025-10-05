/**
 * Dashboard Aggregation API
 * Aggregates data from all tabs into a single dashboard view
 */

import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client to ensure env vars are loaded
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_KEY) {
    console.error('❌ No Supabase key found in environment variables');
    return null;
  }

  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Dashboard Supabase client initialized:', {
    url: SUPABASE_URL,
    keySource: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : process.env.SUPABASE_KEY ? 'KEY' : 'ANON'
  });

  return _supabase;
}

export default function dashboardAggregationRoutes(app) {

  /**
   * GET /api/v2/dashboard/summary
   * Aggregates metrics from all tabs
   */
  app.get('/api/v2/dashboard/summary', async (req, res) => {
    try {
      console.log('📊 Fetching dashboard summary...');

      const supabase = getSupabase();
      if (!supabase) {
        return res.json({
          success: false,
          error: 'Supabase not configured. Check SUPABASE_SERVICE_ROLE_KEY in environment variables.'
        });
      }

      // 1. Cash Position (from Money Flow tab)
      // Get ALL invoices and calculate based on amount_due > 0
      const { data: xeroData, error: xeroError } = await supabase
        .from('xero_invoices')
        .select('amount_due, status, type')
        .gt('amount_due', 0);

      // Receivable = invoices WHERE we're owed money (positive amount_due)
      // In Xero, ACCREC = Accounts Receivable (money coming in)
      const receivable = xeroData
        ?.filter(inv => inv.type === 'ACCREC' && inv.amount_due > 0)
        .reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;

      // Payable = bills WHERE we owe money
      // In Xero, ACCPAY = Accounts Payable (money going out)
      const payable = xeroData
        ?.filter(inv => inv.type === 'ACCPAY' && inv.amount_due > 0)
        .reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;

      const cashPosition = {
        net: receivable - payable,
        receivable,
        payable
      };

      // 2. Overdue Invoices (from Autopilot tab)
      const { data: overdueData } = await supabase
        .from('xero_invoices')
        .select('invoice_number, amount_due, contact_name, due_date, type')
        .eq('type', 'ACCREC') // Only receivable invoices (money we're owed)
        .gt('amount_due', 0) // Must have outstanding balance
        .lt('due_date', new Date().toISOString());

      const overdueInvoices = {
        count: overdueData?.length || 0,
        total: overdueData?.reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0,
        invoices: overdueData?.slice(0, 5) || [] // Top 5 for preview
      };

      // 3. Pending Receipts (from Receipt Processor tab)
      const { data: receiptsData } = await supabase
        .from('receipts')
        .select('id, status, created_at')
        .in('status', ['pending', 'processing']);

      const pendingReceipts = {
        count: receiptsData?.length || 0,
        receipts: receiptsData || []
      };

      // 4. Bookkeeping Checklist Progress
      const { data: checklistData } = await supabase
        .from('bookkeeping_checklist_status')
        .select('task_id, status');

      const total = 14; // Total tasks in checklist
      const completed = checklistData?.filter(item => item.status === 'completed').length || 0;

      const checklistProgress = {
        completed,
        total,
        percentage: Math.round((completed / total) * 100)
      };

      // 5. Recent Activity Timeline
      const { data: activityData } = await supabase
        .from('automation_log')
        .select('action_type, timestamp, details, status')
        .order('timestamp', { ascending: false })
        .limit(10);

      const recentActivity = activityData?.map(activity => ({
        type: activity.action_type,
        timestamp: activity.timestamp,
        description: formatActivityDescription(activity),
        status: activity.status
      })) || [];

      // 6. Projects Summary (from Projects tab)
      const { data: projectsData } = await supabase
        .from('notion_projects')
        .select('id, title, status');

      const projectsSummary = {
        total: projectsData?.length || 0,
        active: projectsData?.filter(p => p.status?.includes('Active')).length || 0
      };

      const summary = {
        success: true,
        timestamp: new Date().toISOString(),
        cashPosition,
        overdueInvoices,
        pendingReceipts,
        checklistProgress,
        recentActivity,
        projectsSummary,
        quickActions: [
          {
            id: 'upload-receipt',
            label: '📤 Upload Receipt',
            description: 'Process a new receipt',
            tab: 'receipts',
            enabled: true
          },
          {
            id: 'chase-invoices',
            label: '📧 Chase Overdue',
            description: `Send reminders for ${overdueInvoices.count} overdue invoices`,
            tab: 'autopilot',
            enabled: overdueInvoices.count > 0,
            badge: overdueInvoices.count
          },
          {
            id: 'bank-rec',
            label: '🏦 Reconcile Bank',
            description: 'Match bank transactions',
            tab: 'autopilot',
            enabled: true
          },
          {
            id: 'review-checklist',
            label: '📚 Review Tasks',
            description: `${checklistProgress.completed}/${checklistProgress.total} completed`,
            tab: 'bookkeeping',
            enabled: true,
            badge: total - completed
          }
        ]
      };

      console.log(`✅ Dashboard summary compiled (${recentActivity.length} activities)`);
      res.json(summary);

    } catch (error) {
      console.error('❌ Dashboard summary error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/dashboard/activity
   * Recent activity timeline with more details
   */
  app.get('/api/v2/dashboard/activity', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Supabase not configured' });
      }

      const { data: activityData } = await supabase
        .from('automation_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      const activities = activityData?.map(activity => ({
        id: activity.id,
        type: activity.action_type,
        timestamp: activity.timestamp,
        description: formatActivityDescription(activity),
        status: activity.status,
        details: activity.details,
        user: activity.user || 'system'
      })) || [];

      res.json({
        success: true,
        activities,
        count: activities.length
      });

    } catch (error) {
      console.error('❌ Activity timeline error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/bookkeeping/progress
   * Bookkeeping checklist progress by category
   */
  app.get('/api/v2/bookkeeping/progress', async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'Supabase not configured' });
      }

      const { data: statusData } = await supabase
        .from('bookkeeping_checklist_status')
        .select('task_id, status, category');

      const categories = {
        daily: { completed: 0, total: 3 },
        weekly: { completed: 0, total: 3 },
        monthly: { completed: 0, total: 3 },
        quarterly: { completed: 0, total: 2 },
        annual: { completed: 0, total: 3 }
      };

      statusData?.forEach(item => {
        if (item.category && categories[item.category]) {
          if (item.status === 'completed') {
            categories[item.category].completed++;
          }
        }
      });

      // Calculate percentages
      Object.keys(categories).forEach(cat => {
        categories[cat].percentage = Math.round(
          (categories[cat].completed / categories[cat].total) * 100
        );
      });

      const totalCompleted = Object.values(categories).reduce((sum, cat) => sum + cat.completed, 0);
      const totalTasks = Object.values(categories).reduce((sum, cat) => sum + cat.total, 0);

      res.json({
        success: true,
        categories,
        overall: {
          completed: totalCompleted,
          total: totalTasks,
          percentage: Math.round((totalCompleted / totalTasks) * 100)
        }
      });

    } catch (error) {
      console.error('❌ Bookkeeping progress error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Format activity description for timeline
 */
function formatActivityDescription(activity) {
  const type = activity.action_type;
  const details = activity.details || {};

  switch (type) {
    case 'invoice_reminder_sent':
      return `Sent payment reminder to ${details.contact_name || 'customer'}`;

    case 'receipt_uploaded':
      return `Uploaded receipt: ${details.filename || 'document'}`;

    case 'receipt_processed':
      return `Processed receipt from ${details.vendor || 'vendor'} - $${details.amount || '0.00'}`;

    case 'bank_reconciled':
      return `Reconciled ${details.matched_count || 0} transactions`;

    case 'bas_calculated':
      return `Calculated BAS: Net GST $${details.net_gst || '0.00'}`;

    case 'checklist_completed':
      return `Completed: ${details.task_title || 'task'}`;

    default:
      return `${type.replace(/_/g, ' ')}`;
  }
}
