/**
 * Xero Intelligence Sync API Routes
 * REST endpoints for Xero financial data sync
 */

import { getXeroSyncService } from '../services/xeroIntelligenceSync.js';

export default function xeroIntelligenceSyncRoutes(app) {
  /**
   * GET /api/v2/xero/sync/status
   * Get current sync status
   */
  app.get('/api/v2/xero/sync/status', async (req, res) => {
    try {
      const service = await getXeroSyncService();
      const status = await service.getStats();

      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting Xero sync status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  /**
   * POST /api/v2/xero/sync/start
   * Start manual Xero sync
   */
  app.post('/api/v2/xero/sync/start', async (req, res) => {
    try {
      const service = await getXeroSyncService();

      console.log('🔄 Manual Xero sync requested');

      // Start sync in background
      service.performFullSync().catch(error => {
        console.error('Background Xero sync failed:', error);
      });

      res.json({
        success: true,
        message: 'Xero sync started',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error starting Xero sync:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start sync',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/xero/stats
   * Get Xero financial statistics
   */
  app.get('/api/v2/xero/stats', async (req, res) => {
    try {
      const service = await getXeroSyncService();
      const stats = await service.getStats();

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting Xero stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get stats',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/xero/invoices
   * Query Xero invoices with filters
   */
  app.get('/api/v2/xero/invoices', async (req, res) => {
    try {
      const service = await getXeroSyncService();
      const { limit = 50, offset = 0, status, type, unpaid } = req.query;

      let query = service.supabase
        .from('xero_invoices')
        .select('*')
        .eq('tenant_id', service.tenantId)
        .order('date', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (status) query = query.eq('status', status);
      if (type) query = query.eq('type', type);
      if (unpaid === 'true') query = query.gt('amount_due', 0);

      const { data: invoices, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        invoices,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: invoices?.length || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error querying Xero invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query invoices',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/xero/contacts
   * Query Xero contacts
   */
  app.get('/api/v2/xero/contacts', async (req, res) => {
    try {
      const service = await getXeroSyncService();
      const { limit = 50, offset = 0, customers, suppliers } = req.query;

      let query = service.supabase
        .from('xero_contacts')
        .select('*')
        .eq('tenant_id', service.tenantId)
        .order('name', { ascending: true })
        .range(offset, offset + parseInt(limit) - 1);

      if (customers === 'true') query = query.eq('is_customer', true);
      if (suppliers === 'true') query = query.eq('is_supplier', true);

      const { data: contacts, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        contacts,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: contacts?.length || 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error querying Xero contacts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query contacts',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/xero/bas
   * Get BAS (Business Activity Statement) data
   */
  app.get('/api/v2/xero/bas', async (req, res) => {
    try {
      const service = await getXeroSyncService();
      const { period } = req.query;

      let query = service.supabase
        .from('xero_bas_tracking')
        .select('*')
        .eq('tenant_id', service.tenantId)
        .order('period_start', { ascending: false });

      if (period) {
        // Filter by specific period (e.g., "2025-Q3")
        const [year, quarter] = period.split('-Q');
        const quarterStart = new Date(parseInt(year), (parseInt(quarter) - 1) * 3, 1);
        query = query.eq('period_start', quarterStart.toISOString().split('T')[0]);
      }

      const { data: basRecords, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        bas: basRecords,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error querying BAS data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query BAS data',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/xero/dashboard
   * Get dashboard summary with key financial metrics
   */
  app.get('/api/v2/xero/dashboard', async (req, res) => {
    try {
      const service = await getXeroSyncService();

      // Get unpaid invoices (money owed to you)
      const { data: unpaidInvoices } = await service.supabase
        .from('xero_invoices')
        .select('amount_due')
        .eq('tenant_id', service.tenantId)
        .eq('type', 'ACCREC')
        .gt('amount_due', 0);

      const totalReceivable = (unpaidInvoices || []).reduce((sum, inv) => sum + parseFloat(inv.amount_due), 0);

      // Get unpaid bills (money you owe)
      const { data: unpaidBills } = await service.supabase
        .from('xero_invoices')
        .select('amount_due')
        .eq('tenant_id', service.tenantId)
        .eq('type', 'ACCPAY')
        .gt('amount_due', 0);

      const totalPayable = (unpaidBills || []).reduce((sum, inv) => sum + parseFloat(inv.amount_due), 0);

      // Get current BAS
      const { data: currentBAS } = await service.supabase
        .from('xero_bas_tracking')
        .select('*')
        .eq('tenant_id', service.tenantId)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      // Get recent invoices
      const { data: recentInvoices } = await service.supabase
        .from('xero_invoices')
        .select('*')
        .eq('tenant_id', service.tenantId)
        .order('date', { ascending: false })
        .limit(5);

      res.json({
        success: true,
        dashboard: {
          totalReceivable: totalReceivable.toFixed(2),
          totalPayable: totalPayable.toFixed(2),
          netPosition: (totalReceivable - totalPayable).toFixed(2),
          currentBAS: currentBAS || null,
          recentInvoices: recentInvoices || []
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting Xero dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard',
        message: error.message
      });
    }
  });

  console.log('✅ Xero Intelligence Sync API routes registered');
}