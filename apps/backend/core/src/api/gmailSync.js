/**
 * Gmail Sync API Routes
 * Handles authentication, webhooks, and smart email processing
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import SmartGmailSyncService from '../services/smartGmailSyncService.js';

const router = express.Router();
let gmailSync = null;

// Initialize Gmail service lazily when needed
const getGmailSync = async () => {
  if (!gmailSync) {
    gmailSync = new SmartGmailSyncService();
    await gmailSync.initialize();
  }
  return gmailSync;
};

/**
 * Debug environment variables
 */
router.get('/debug-env', asyncHandler(async (req, res) => {
  res.json({
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? 'Set' : 'NOT SET',
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'NOT SET', 
    OAUTH_TYPE: 'Desktop Client (OOB)',
    NODE_ENV: process.env.NODE_ENV
  });
}));

// Health/status
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const service = await getGmailSync();
    const status = service.getStatus();
    let stats = null;

    try {
      stats = await service.getStats();
    } catch (statsError) {
      console.log('Gmail stats unavailable:', statsError?.message || statsError);
    }

    return res.json({
      success: true,
      configured: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET),
      authenticated: status.authenticated,
      initialized: status.initialized,
      hasTokens: status.hasTokens,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'status_failed', message: e?.message || String(e) });
  }
}));

/**
 * Start Gmail authentication flow
 */
router.get('/auth/start', asyncHandler(async (req, res) => {
  try {
    console.log('🔧 Gmail auth start - Environment check:');
    console.log('  GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'Set' : 'NOT SET');
    console.log('  GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'NOT SET');
    console.log('  Using Desktop OAuth client with OOB flow');
    
    const service = await getGmailSync();
    const authUrl = service.getAuthUrl();
    
    res.json({
      success: true,
      authUrl,
      message: 'Visit the auth URL to authorize Gmail access'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate auth URL',
      error: error.message
    });
  }
}));

/**
 * Handle Gmail OAuth callback
 */
router.get('/auth/callback', asyncHandler(async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code required'
    });
  }

  try {
    const service = await getGmailSync();
    const success = await service.handleAuthCallback(code);
    
    if (success) {
      // Set up monitoring after successful auth
      await service.setupSmartMonitoring();
      
      res.json({
        success: true,
        message: 'Gmail authentication successful! Smart monitoring is now active.',
        nextSteps: [
          'Gmail emails will now be intelligently processed',
          'Community-relevant emails will be automatically detected',
          'Contact sync with Notion is now enabled'
        ]
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Gmail authentication failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication callback failed',
      error: error.message
    });
  }
}));

/**
 * Handle Gmail push notifications (webhooks)
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  try {
    // Parse the push notification
    const message = req.body;
    
    if (message.message && message.message.data) {
      // Decode the message data
      const data = JSON.parse(Buffer.from(message.message.data, 'base64').toString());
      
      console.log('📧 Gmail webhook received:', {
        emailId: data.emailAddress,
        historyId: data.historyId
      });

      // Process the email change
      if (data.historyId) {
        const service = await getGmailSync();
        await service.processHistoryChange(data.historyId);
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Gmail webhook processing failed:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ success: false, error: error.message });
  }
}));

/**
 * Manually process a specific email (for testing)
 */
router.post('/process-email/:emailId', asyncHandler(async (req, res) => {
  const { emailId } = req.params;
  
  try {
    const service = await getGmailSync();
    const result = await service.processNewEmail(emailId);
    
    res.json({
      success: true,
      emailId,
      analysis: result,
      message: 'Email processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email processing failed',
      error: error.message
    });
  }
}));

/**
 * Manually sync Gmail contacts with Notion
 */
router.post('/sync-contacts', asyncHandler(async (req, res) => {
  try {
    const service = await getGmailSync();
    const result = await service.syncContactsWithNotion();
    
    res.json({
      success: true,
      message: 'Contact sync completed',
      result: {
        totalContacts: result.total,
        newContacts: result.created,
        updatedContacts: result.updated,
        matchedExisting: result.matched
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Contact sync failed',
      error: error.message
    });
  }
}));

/**
 * Get recent community emails
 */
router.get('/community-emails', asyncHandler(async (req, res) => {
  const { limit = 20, days = 7 } = req.query;
  
  try {
    const service = await getGmailSync();
    const emails = await service.getCommunityEmails({
      limit: parseInt(limit),
      days: parseInt(days)
    });
    
    res.json({
      success: true,
      emails: emails.map(email => ({
        id: email.message_id,
        threadId: email.thread_id,
        from: email.from_email,
        fromName: email.from_name || email.contact?.full_name || null,
        to: email.to_email,
        subject: email.subject,
        summary: email.body_preview,
        receivedAt: email.received_date,
        relevanceScore: email.relevance_score,
        emailType: email.email_type,
        contexts: email.detected_contexts || [],
        urgency: email.urgency,
        contact: email.contact ? {
          id: email.contact.id,
          name: email.contact.full_name,
          email: email.contact.primary_email,
          organization: email.contact.organization_name
        } : null,
        projects: Array.isArray(email.projects) ? email.projects : []
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get community emails',
      error: error.message
    });
  }
}));

/**
 * Update Gmail sync filters and keywords
 */
router.put('/filters', asyncHandler(async (req, res) => {
  const { projectKeywords, organizationDomains, subjectPatterns } = req.body;
  
  try {
    const service = await getGmailSync();
    
    if (projectKeywords) {
      service.communityFilters.projectKeywords = projectKeywords;
    }
    
    if (organizationDomains) {
      service.communityFilters.organizationDomains = organizationDomains;
    }
    
    if (subjectPatterns) {
      service.communityFilters.subjectPatterns = subjectPatterns.map(pattern => new RegExp(pattern, 'i'));
    }
    
    // Save updated filters
    await service.saveFilters();
    
    res.json({
      success: true,
      message: 'Gmail sync filters updated',
      filters: {
        projectKeywords: service.communityFilters.projectKeywords,
        organizationDomains: service.communityFilters.organizationDomains,
        subjectPatterns: service.communityFilters.subjectPatterns.map(p => p.source)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update filters',
      error: error.message
    });
  }
}));

export default router;
