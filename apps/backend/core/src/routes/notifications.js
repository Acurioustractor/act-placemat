/**
 * Notifications Routes
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import {
  whatsappBriefService,
  dailyBriefService,
  unifiedDashboardService,
  ghlActionSyncService,
  actionableBriefService
} from '../services/notifications/index.js';

const router = express.Router();

router.post('/whatsapp', async (req, res) => {
  try {
    const result = await whatsappBriefService.sendMorningBrief();
    res.json(result);
  } catch (error) {
    logger.error('WhatsApp send failed', { error: error.message });
    res.status(500).json({ error: 'whatsapp_send_failed', message: error.message });
  }
});

router.get('/whatsapp/preview', async (req, res) => {
  try {
    const message = await whatsappBriefService.generateMorningBrief();
    res.json({ preview: true, message, length: message.length });
  } catch (error) {
    logger.error('WhatsApp preview failed', { error: error.message });
    res.status(500).json({ error: 'preview_failed', message: error.message });
  }
});

router.post('/email', async (req, res) => {
  try {
    const { format = 'markdown' } = req.body;
    const brief = await dailyBriefService.generateBrief(format);
    res.json({ success: true, format, brief });
  } catch (error) {
    logger.error('Email brief generation failed', { error: error.message });
    res.status(500).json({ error: 'email_brief_failed', message: error.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const { view = 'daily' } = req.query;
    const data = await unifiedDashboardService.getDashboard(view);
    res.json(data);
  } catch (error) {
    logger.error('Dashboard fetch failed', { error: error.message });
    res.status(500).json({ error: 'dashboard_failed', message: error.message });
  }
});

router.get('/dashboard/:view', async (req, res) => {
  try {
    const { view } = req.params;
    const validViews = ['daily', 'moon', 'phase', 'year'];
    if (!validViews.includes(view)) {
      return res.status(400).json({ error: 'invalid_view', message: 'View must be one of: ' + validViews.join(', ') });
    }
    const data = await unifiedDashboardService.getDashboard(view);
    res.json(data);
  } catch (error) {
    logger.error('Dashboard view fetch failed', { error: error.message, view: req.params.view });
    res.status(500).json({ error: 'dashboard_failed', message: error.message });
  }
});

router.post('/ghl/sync', async (req, res) => {
  try {
    const result = await ghlActionSyncService.syncAllActions();
    res.json(result);
  } catch (error) {
    logger.error('GHL sync failed', { error: error.message });
    res.status(500).json({ error: 'ghl_sync_failed', message: error.message });
  }
});

router.get('/ghl/status', async (req, res) => {
  try {
    const status = await ghlActionSyncService.getSyncStatus();
    res.json(status);
  } catch (error) {
    logger.error('GHL status fetch failed', { error: error.message });
    res.status(500).json({ error: 'ghl_status_failed', message: error.message });
  }
});

router.get('/ghl/contacts-needing-action', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const contacts = await ghlActionSyncService.getContactsNeedingAction(parseInt(limit, 10));
    res.json({ count: contacts.length, contacts });
  } catch (error) {
    logger.error('GHL contacts fetch failed', { error: error.message });
    res.status(500).json({ error: 'ghl_contacts_failed', message: error.message });
  }
});

router.get('/brief', async (req, res) => {
  try {
    const brief = await actionableBriefService.generateBrief();
    res.json(brief);
  } catch (error) {
    logger.error('Actionable brief failed', { error: error.message });
    res.status(500).json({ error: 'brief_failed', message: error.message });
  }
});

router.get('/brief/preview', async (req, res) => {
  try {
    await actionableBriefService.generateBrief();
    const markdown = actionableBriefService.toMarkdown();
    res.type('text/markdown').send(markdown);
  } catch (error) {
    logger.error('Brief preview failed', { error: error.message });
    res.status(500).json({ error: 'preview_failed', message: error.message });
  }
});

router.get('/daily', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const brief = await dailyBriefService.generateBrief(format);
    if (format === 'markdown') {
      res.type('text/markdown').send(brief);
    } else if (format === 'text') {
      res.type('text/plain').send(brief);
    } else {
      res.json(brief);
    }
  } catch (error) {
    logger.error('Daily brief failed', { error: error.message });
    res.status(500).json({ error: 'daily_brief_failed', message: error.message });
  }
});

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      whatsapp: { configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN), hasRecipient: !!process.env.WHATSAPP_TO },
      notion: { configured: !!process.env.NOTION_TOKEN },
      ghl: { configured: !!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID) },
      supabase: { main: !!process.env.SUPABASE_URL, shared: !!process.env.SUPABASE_SHARED_URL }
    }
  };
  const anyConfigured = Object.values(health.services).some(s => typeof s === 'object' ? Object.values(s).some(v => v === true) : s === true);
  health.status = anyConfigured ? 'ok' : 'degraded';
  res.json(health);
});

export default router;
