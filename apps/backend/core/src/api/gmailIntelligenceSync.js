/**
 * Gmail Intelligence Sync API Routes
 * Endpoints for syncing and querying Gmail intelligence data
 */

import GmailIntelligenceSync from '../services/gmailIntelligenceSync.js';

// Singleton instance
let syncService = null;

const getSyncService = async () => {
  if (!syncService) {
    syncService = new GmailIntelligenceSync();
    await syncService.initialize();
  }
  return syncService;
};

export const gmailIntelligenceSyncRoutes = (app) => {

  // GET /api/v2/gmail/sync/status - Get sync status
  app.get('/api/v2/gmail/sync/status', async (req, res) => {
    try {
      const service = await getSyncService();
      const status = await service.getSyncStatus();
      const stats = await service.getStats();

      res.json({
        success: true,
        status,
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Gmail sync status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  // POST /api/v2/gmail/sync/start - Start manual sync
  app.post('/api/v2/gmail/sync/start', async (req, res) => {
    try {
      const { maxMessages = 100 } = req.body;

      console.log(`🔄 Manual Gmail sync requested (max ${maxMessages} messages)`);

      const service = await getSyncService();

      // Start sync in background
      service.performFullSync(maxMessages).catch(error => {
        console.error('Background Gmail sync failed:', error);
      });

      res.json({
        success: true,
        message: 'Gmail sync started',
        maxMessages,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Gmail sync start error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start sync',
        message: error.message
      });
    }
  });

  // GET /api/v2/gmail/messages - Query messages
  app.get('/api/v2/gmail/messages', async (req, res) => {
    try {
      const service = await getSyncService();
      const {
        limit = 50,
        offset = 0,
        unread = false,
        starred = false,
        search
      } = req.query;

      let query = service.supabase
        .from('gmail_messages')
        .select('*')
        .eq('user_email', service.userEmail)
        .order('sent_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unread === 'true') {
        query = query.eq('is_read', false);
      }

      if (starred === 'true') {
        query = query.eq('is_starred', true);
      }

      if (search) {
        query = query.or(`subject.ilike.%${search}%,body_text.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        messages: data,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + data.length) < count
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Gmail messages query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query messages',
        message: error.message
      });
    }
  });

  // GET /api/v2/gmail/contacts - Get discovered contacts
  app.get('/api/v2/gmail/contacts', async (req, res) => {
    try {
      const service = await getSyncService();
      const { limit = 100, search } = req.query;

      let query = service.supabase
        .from('gmail_contacts')
        .select('*')
        .order('last_interaction', { ascending: false })
        .limit(limit);

      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        contacts: data,
        count: data.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Gmail contacts query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query contacts',
        message: error.message
      });
    }
  });

  // GET /api/v2/gmail/stats - Get statistics
  app.get('/api/v2/gmail/stats', async (req, res) => {
    try {
      const service = await getSyncService();
      const stats = await service.getStats();

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Gmail stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        message: error.message
      });
    }
  });

  console.log('✅ Gmail Intelligence Sync API routes registered');
};

export default gmailIntelligenceSyncRoutes;