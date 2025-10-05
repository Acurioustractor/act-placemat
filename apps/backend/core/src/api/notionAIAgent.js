/**
 * Notion AI Business Agent API Endpoints
 * Handles all interactions between ACT backend and Notion workspace
 * Includes voice capture, bidirectional sync, and automation management
 */

import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import notionAIAgent from '../services/notionAIAgent.js';
import MultiProviderAI from '../services/multiProviderAI.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Configure multer for voice file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  },
});

/**
 * 🎙️ VOICE CAPTURE ENDPOINTS
 */

// Voice note capture and processing
router.post('/capture/voice', 
  optionalAuth,
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    logger.info('🎙️ Voice capture received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    try {
      // Step 1: Transcribe audio using Whisper
      const ai = new MultiProviderAI();
      const transcription = await ai.transcribeAudio(req.file.buffer, {
        language: 'en',
        prompt: 'This is a business note or task from an Australian community platform user.'
      });
      
      if (!transcription.success) {
        throw new Error('Audio transcription failed');
      }
      
      // Step 2: Process with Notion AI Agent
      const result = await notionAIAgent.processCapture({
        content: transcription.text,
        type: 'Voice Note',
        source: 'Phone Voice',
        metadata: {
          duration: req.body.duration || null,
          quality: req.body.quality || 'standard',
          user_id: req.user?.id,
        }
      });
      
      res.json({
        success: true,
        transcription: transcription.text,
        processing_result: result,
        notion_page_url: result.notion_page ? `https://notion.so/${result.notion_page.replace(/-/g, '')}` : null,
        generated_actions: result.generated_actions || 0,
        processing_time: result.processing_time || 0
      });
      
    } catch (error) {
      logger.error('Voice capture processing failed:', error);
      res.status(500).json({ 
        error: 'Voice processing failed', 
        message: error.message 
      });
    }
  })
);

// Text input capture
router.post('/capture/text',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { content, type = 'Text Input', source = 'Desktop' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    try {
      const result = await notionAIAgent.processCapture({
        content,
        type,
        source,
        metadata: {
          user_id: req.user?.id,
          ip_address: req.ip,
        }
      });
      
      res.json({
        success: true,
        processing_result: result,
        notion_page_url: result.notion_page ? `https://notion.so/${result.notion_page.replace(/-/g, '')}` : null
      });
      
    } catch (error) {
      logger.error('Text capture processing failed:', error);
      res.status(500).json({ 
        error: 'Text processing failed', 
        message: error.message 
      });
    }
  })
);

/**
 * 🔄 BIDIRECTIONAL SYNC ENDPOINTS
 */

// Sync ACT data to Notion
router.post('/sync/to-notion',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { data_type, data } = req.body;
    
    if (!data_type || !data) {
      return res.status(400).json({ error: 'data_type and data are required' });
    }
    
    try {
      const result = await notionAIAgent.syncToNotion(data_type, data);
      
      res.json({
        success: true,
        synced_items: result.length || 1,
        data_type,
        sync_timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Sync to Notion failed:', error);
      res.status(500).json({
        error: 'Sync failed',
        message: error.message,
        data_type
      });
    }
  })
);

// Sync Notion data back to ACT
router.post('/sync/from-notion',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { database_id, page_data } = req.body;
    
    if (!database_id || !page_data) {
      return res.status(400).json({ error: 'database_id and page_data are required' });
    }
    
    try {
      const result = await notionAIAgent.syncFromNotion(database_id, page_data);
      
      res.json({
        success: true,
        updated_records: result.length || 1,
        database_type: notionAIAgent.identifyDatabaseType(database_id),
        sync_timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Sync from Notion failed:', error);
      res.status(500).json({
        error: 'Sync failed',
        message: error.message,
        database_id
      });
    }
  })
);

// Webhook endpoint for Notion updates
router.post('/webhook/notion-update',
  asyncHandler(async (req, res) => {
    logger.info('📥 Notion webhook received');
    
    try {
      // Validate webhook signature if configured
      if (process.env.NOTION_WEBHOOK_SECRET) {
        const signature = req.headers['notion-signature'];
        if (!signature || !validateWebhookSignature(req.body, signature)) {
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      }
      
      // Process the update
      const { object, event_type, page, database } = req.body;
      
      if (event_type === 'page.property_values_changed' && page) {
        await notionAIAgent.syncFromNotion(page.parent.database_id, page);
      }
      
      res.json({ success: true, processed: true });
      
    } catch (error) {
      logger.error('Notion webhook processing failed:', error);
      res.status(500).json({
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  })
);

/**
 * 🤖 AUTOMATION MANAGEMENT ENDPOINTS
 */

// Get automation opportunities
router.get('/automations/opportunities',
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      // Get patterns that could be automated
      const patterns = Array.from(notionAIAgent.processMemory.entries())
        .filter(([_, pattern]) => pattern.actions_generated > 0)
        .map(([key, pattern]) => {
          const similarCount = notionAIAgent.findSimilarPatterns(key).length;
          return {
            pattern_key: key,
            automation_potential: similarCount >= 3 ? 'High' : similarCount >= 2 ? 'Medium' : 'Low',
            frequency: similarCount,
            last_seen: new Date(pattern.processing_time).toISOString(),
            actions_generated: pattern.actions_generated,
            input_type: pattern.input_type
          };
        })
        .sort((a, b) => b.frequency - a.frequency);
      
      res.json({
        opportunities: patterns,
        total_patterns: patterns.length,
        high_potential: patterns.filter(p => p.automation_potential === 'High').length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Automation opportunities fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch automation opportunities',
        message: error.message
      });
    }
  })
);

// Get active automations status
router.get('/automations/status',
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      const activeAutomations = Array.from(notionAIAgent.syncState.active_automations.entries())
        .map(([id, automation]) => ({
          id,
          ...automation,
          uptime: Date.now() - automation.started_at,
          health_status: automation.errors > 5 ? 'Degraded' : automation.errors > 0 ? 'Warning' : 'Healthy'
        }));
      
      res.json({
        active_automations: activeAutomations,
        total_active: activeAutomations.length,
        healthy: activeAutomations.filter(a => a.health_status === 'Healthy').length,
        degraded: activeAutomations.filter(a => a.health_status === 'Degraded').length,
        queue_length: notionAIAgent.requestQueue.length,
        rate_limit_status: {
          requests_used: notionAIAgent.rateLimiter.requests,
          max_requests: notionAIAgent.rateLimiter.maxRequests,
          reset_time: new Date(notionAIAgent.rateLimiter.resetTime).toISOString()
        },
        sync_state: notionAIAgent.syncState
      });
      
    } catch (error) {
      logger.error('Automation status fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch automation status',
        message: error.message
      });
    }
  })
);

/**
 * 📊 ANALYTICS AND MONITORING ENDPOINTS
 */

// Get processing analytics
router.get('/analytics/processing',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { timeframe = '24h' } = req.query;
    
    try {
      // Calculate processing statistics
      const patterns = Array.from(notionAIAgent.processMemory.values());
      const now = Date.now();
      const timeframMs = timeframe === '24h' ? 24 * 60 * 60 * 1000 
        : timeframe === '7d' ? 7 * 24 * 60 * 60 * 1000 
        : 24 * 60 * 60 * 1000;
      
      const recentPatterns = patterns.filter(p => 
        (now - p.processing_time) <= timeframMs
      );
      
      const stats = {
        total_captures: recentPatterns.length,
        voice_captures: recentPatterns.filter(p => p.input_type === 'Voice Note').length,
        text_captures: recentPatterns.filter(p => p.input_type === 'Text Input').length,
        average_actions_per_capture: recentPatterns.length > 0 
          ? recentPatterns.reduce((sum, p) => sum + p.actions_generated, 0) / recentPatterns.length 
          : 0,
        intent_breakdown: this.calculateIntentBreakdown(recentPatterns),
        processing_performance: {
          average_processing_time: this.calculateAverageProcessingTime(recentPatterns),
          success_rate: this.calculateSuccessRate(recentPatterns)
        }
      };
      
      res.json({
        timeframe,
        analytics: stats,
        generated_at: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Analytics fetch failed:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: error.message
      });
    }
  })
);

// Health check for Notion AI Agent
router.get('/health',
  asyncHandler(async (req, res) => {
    try {
      // Check Notion API connectivity
      const notionHealth = await checkNotionHealth();
      
      // Check queue health
      const queueHealth = {
        queue_length: notionAIAgent.requestQueue.length,
        processing_status: notionAIAgent.rateLimiter.processing ? 'Processing' : 'Idle',
        rate_limit_healthy: notionAIAgent.rateLimiter.requests < notionAIAgent.rateLimiter.maxRequests * 0.8
      };
      
      // Check memory patterns health
      const memoryHealth = {
        patterns_stored: notionAIAgent.processMemory.size,
        automation_opportunities: Array.from(notionAIAgent.processMemory.keys())
          .filter(key => notionAIAgent.findSimilarPatterns(key).length >= 3).length
      };
      
      const overallHealth = notionHealth.connected && 
        queueHealth.rate_limit_healthy && 
        queueHealth.queue_length < 100 ? 'Healthy' : 'Degraded';
      
      res.json({
        status: overallHealth,
        notion_api: notionHealth,
        queue: queueHealth,
        memory: memoryHealth,
        databases_configured: Object.keys(notionAIAgent.databases).length,
        last_sync: notionAIAgent.syncState.last_full_sync,
        sync_errors: notionAIAgent.syncState.sync_errors.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        status: 'Unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * 🔧 Helper Functions
 */

async function checkNotionHealth() {
  try {
    // Simple test query to verify Notion API access
    await notionAIAgent.notion.users.me();
    return { connected: true, last_check: new Date().toISOString() };
  } catch (error) {
    return { connected: false, error: error.message, last_check: new Date().toISOString() };
  }
}

function validateWebhookSignature(payload, signature) {
  // Implement webhook signature validation
  // This is a placeholder - implement proper HMAC validation
  return process.env.NODE_ENV === 'development' || signature?.length > 0;
}

export default router;