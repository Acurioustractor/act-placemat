/**
 * Event API Endpoints
 * 
 * Handles incoming events from various sources (Xero webhooks, scheduled jobs, etc.)
 * and routes them to the Event Ingestor for processing.
 */

import { Router } from 'express';
import { getEventIngestor } from '../agents/events/EventIngestor.js';
import { Logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = Router();
const logger = new Logger('EventAPI');
const eventIngestor = getEventIngestor();

/**
 * Xero webhook endpoint
 */
router.post('/xero/webhook', async (req, res) => {
  try {
    // Verify Xero webhook signature
    const signature = req.headers['x-xero-signature'];
    const payload = req.rawBody || JSON.stringify(req.body);
    
    if (process.env.XERO_WEBHOOK_KEY) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.XERO_WEBHOOK_KEY)
        .update(payload)
        .digest('base64');
      
      if (signature !== expectedSignature) {
        logger.warn('Invalid Xero webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    // Handle the webhook
    await eventIngestor.handleXeroWebhook(req.body);
    
    res.status(200).json({ status: 'received' });
    
  } catch (error) {
    logger.error('Xero webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generic event ingestion endpoint
 */
router.post('/ingest', async (req, res) => {
  try {
    const event = req.body;
    
    // Basic validation
    if (!event.type || !event.source || !event.entity) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, source, entity' 
      });
    }
    
    const result = await eventIngestor.ingest(event);
    
    res.status(202).json(result);
    
  } catch (error) {
    logger.error('Event ingestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Scheduled job trigger endpoints
 */
router.post('/scheduled/:jobType', async (req, res) => {
  try {
    const { jobType } = req.params;
    
    // Validate job type
    const validJobTypes = ['daily', 'weekly', 'monthly', 'month_end', 'quarter_end', 'year_end'];
    if (!validJobTypes.includes(jobType)) {
      return res.status(400).json({ error: 'Invalid job type' });
    }
    
    await eventIngestor.handleScheduledJob(jobType);
    
    res.status(200).json({ 
      status: 'triggered',
      jobType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Scheduled job error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Document upload event
 */
router.post('/document', async (req, res) => {
  try {
    const document = req.body;
    
    // Basic validation
    if (!document.id || !document.type) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, type' 
      });
    }
    
    await eventIngestor.handleDocumentUpload(document);
    
    res.status(202).json({ status: 'received' });
    
  } catch (error) {
    logger.error('Document event error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * R&D evidence event
 */
router.post('/rd/evidence', async (req, res) => {
  try {
    const evidence = req.body;
    
    await eventIngestor.ingest({
      type: 'rd_evidence_added',
      source: 'documents',
      entity: evidence.entity || 'ACT_PTY_LTD',
      data: {
        documentId: evidence.id,
        documentType: 'rd_evidence',
        activityId: evidence.activityId,
        evidenceType: evidence.type,
        metadata: evidence.metadata
      }
    });
    
    res.status(202).json({ status: 'received' });
    
  } catch (error) {
    logger.error('R&D evidence event error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Policy update event
 */
router.post('/policy/updated', async (req, res) => {
  try {
    const update = req.body;
    
    await eventIngestor.ingest({
      type: 'policy_updated',
      source: 'system',
      entity: 'system',
      data: update
    });
    
    res.status(200).json({ status: 'received' });
    
  } catch (error) {
    logger.error('Policy update event error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * User approval callback
 */
router.post('/user/approval/:approvalId/:action', async (req, res) => {
  try {
    const { approvalId, action } = req.params;
    const { userId, notes } = req.body;
    
    // Validate action
    if (!['approve', 'reject', 'defer'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    await eventIngestor.ingest({
      type: 'approval_callback',
      source: 'user',
      entity: 'system',
      data: {
        approvalId,
        action,
        userId,
        notes,
        timestamp: new Date().toISOString()
      }
    });
    
    res.status(200).json({ 
      status: 'processed',
      action,
      approvalId 
    });
    
  } catch (error) {
    logger.error('Approval callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get event ingestion statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = eventIngestor.getStats();
    res.status(200).json(stats);
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = eventIngestor.getHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

export default router;