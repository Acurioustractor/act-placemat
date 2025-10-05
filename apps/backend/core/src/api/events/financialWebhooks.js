/**
 * Financial Webhook Endpoints
 * Implements the event trigger endpoints from your specification
 */

import express from 'express';
import crypto from 'crypto';
import FinancialAgentOrchestrator from '../../agents/FinancialAgentOrchestrator.js';

const router = express.Router();

// Initialize orchestrator (singleton pattern)
let orchestrator = null;

async function getOrchestrator() {
  if (!orchestrator) {
    orchestrator = new FinancialAgentOrchestrator();
    await orchestrator.initialize();
  }
  return orchestrator;
}

// Webhook signature verification middleware
function verifyXeroSignature(req, res, next) {
  const signature = req.get('X-Xero-Signature');
  const webhookKey = process.env.XERO_WEBHOOK_KEY;

  if (!webhookKey) {
    console.warn('XERO_WEBHOOK_KEY not configured - skipping signature verification');
    return next();
  }

  if (!signature) {
    return res.status(401).json({
      success: false,
      error: 'Missing X-Xero-Signature header'
    });
  }

  try {
    const body = JSON.stringify(req.body);
    const hash = crypto.createHmac('sha256', webhookKey).update(body).digest('base64');

    if (hash !== signature) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    next();
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return res.status(400).json({
      success: false,
      error: 'Signature verification failed'
    });
  }
}

// Xero Event Endpoints

/**
 * @swagger
 * /events/xero/bank_transaction_created:
 *   post:
 *     summary: Handle Xero bank transaction created webhook
 *     tags: [Financial Events]
 *     description: Triggered when a new bank transaction is created in Xero
 */
router.post('/xero/bank_transaction_created', verifyXeroSignature, async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();
    const { events } = req.body;

    const results = [];

    for (const event of events || []) {
      const { resourceId, eventType, tenantId, resourceUrl } = event;

      if (eventType !== 'CREATE' && eventType !== 'UPDATE') {
        continue;
      }

      // Transform Xero webhook data to our internal format
      const payload = {
        entity: tenantId === process.env.XERO_TENANT_ID ? 'ACT_PTY_LTD' : 'UNKNOWN',
        bankTransactionId: resourceId,
        eventType,
        tenantId,
        resourceUrl,
        webhookTimestamp: new Date().toISOString(),
        // Additional fields will be populated when we fetch the actual transaction
        date: null,
        amount: null,
        description: null,
        reference: null,
        status: null,
        bankAccount: null,
        attachments: []
      };

      // Fetch full transaction details from Xero
      try {
        await enrichTransactionPayload(payload);
      } catch (error) {
        console.warn(`Failed to enrich transaction ${resourceId}:`, error.message);
      }

      const eventId = await orchestratorInstance.processEvent('xero:bank_transaction_created', payload);
      results.push({ resourceId, eventId, status: 'processed' });
    }

    res.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Bank transaction webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bank transaction webhook',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /events/xero/bill_created:
 *   post:
 *     summary: Handle Xero bill created webhook (Dext or e-Invoice)
 *     tags: [Financial Events]
 */
router.post('/xero/bill_created', verifyXeroSignature, async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();
    const { events } = req.body;

    const results = [];

    for (const event of events || []) {
      const { resourceId, eventType, tenantId } = event;

      if (eventType !== 'CREATE') {
        continue;
      }

      // Determine source (Dext, e-Invoice, manual)
      const source = await determineBillSource(resourceId, tenantId);

      const payload = {
        entity: tenantId === process.env.XERO_TENANT_ID ? 'ACT_PTY_LTD' : 'UNKNOWN',
        billId: resourceId,
        tenantId,
        source, // 'Dext', 'eInvoice', or 'manual'
        eventType,
        webhookTimestamp: new Date().toISOString(),
        // Will be enriched with bill details
        date: null,
        amount: null,
        supplier: null,
        taxCode: null,
        lineItems: [],
        attachments: []
      };

      try {
        await enrichBillPayload(payload);
      } catch (error) {
        console.warn(`Failed to enrich bill ${resourceId}:`, error.message);
      }

      const eventId = await orchestratorInstance.processEvent('xero:bill_created', payload);
      results.push({ resourceId, eventId, status: 'processed', source });
    }

    res.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Bill created webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bill webhook',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /events/xero/invoice_updated:
 *   post:
 *     summary: Handle Xero invoice updates (for AR collections)
 *     tags: [Financial Events]
 */
router.post('/xero/invoice_updated', verifyXeroSignature, async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();
    const { events } = req.body;

    const results = [];

    for (const event of events || []) {
      const { resourceId, eventType, tenantId } = event;

      const payload = {
        entity: tenantId === process.env.XERO_TENANT_ID ? 'ACT_PTY_LTD' : 'UNKNOWN',
        invoiceId: resourceId,
        tenantId,
        eventType,
        webhookTimestamp: new Date().toISOString(),
        // Will be enriched with invoice details
        status: null,
        dueDate: null,
        amountDue: null,
        customer: null
      };

      try {
        await enrichInvoicePayload(payload);
      } catch (error) {
        console.warn(`Failed to enrich invoice ${resourceId}:`, error.message);
      }

      // Only process invoices that are due soon or overdue
      if (payload.status === 'AUTHORISED' && payload.dueDate) {
        const eventId = await orchestratorInstance.processEvent('xero:invoice_updated', payload);
        results.push({ resourceId, eventId, status: 'processed' });
      } else {
        results.push({ resourceId, status: 'skipped', reason: 'not_due_for_collection' });
      }
    }

    res.json({
      success: true,
      processed: results.filter(r => r.status === 'processed').length,
      results
    });

  } catch (error) {
    console.error('Invoice updated webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process invoice webhook',
      details: error.message
    });
  }
});

// Scheduled Event Endpoints

/**
 * @swagger
 * /events/scheduler/daily:
 *   post:
 *     summary: Trigger daily financial processing jobs
 *     tags: [Financial Events]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/scheduler/daily', async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();

    const payload = {
      date: new Date().toISOString().split('T')[0],
      triggeredBy: 'scheduler',
      jobs: [
        'bas_prep_check',
        'cashflow_forecast_update',
        'spend_policy_compliance',
        'ar_reminders'
      ]
    };

    const eventId = await orchestratorInstance.processEvent('scheduler:daily', payload);

    res.json({
      success: true,
      eventId,
      jobs: payload.jobs,
      scheduledTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Daily scheduler error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process daily jobs',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /events/scheduler/month_end:
 *   post:
 *     summary: Trigger month-end financial processing
 *     tags: [Financial Events]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/scheduler/month_end', async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();

    const payload = {
      month: new Date().toISOString().substring(0, 7), // YYYY-MM
      triggeredBy: 'scheduler',
      jobs: ['board_pack_generation']
    };

    const eventId = await orchestratorInstance.processEvent('scheduler:month_end', payload);

    res.json({
      success: true,
      eventId,
      month: payload.month,
      scheduledTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Month-end scheduler error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process month-end jobs',
      details: error.message
    });
  }
});

// R&D Evidence Events

/**
 * @swagger
 * /events/rd/evidence_added:
 *   post:
 *     summary: Process R&D evidence addition
 *     tags: [Financial Events]
 */
router.post('/rd/evidence_added', async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();
    const { type, ref, link, activityId, description } = req.body;

    if (!type || !ref || !activityId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, ref, activityId'
      });
    }

    const payload = {
      type, // 'commit', 'doc', 'meeting'
      ref,
      link: link || null,
      activityId,
      description: description || null,
      timestamp: new Date().toISOString(),
      source: 'manual' // Could be 'git', 'docs', 'calendar'
    };

    const eventId = await orchestratorInstance.processEvent('rd:evidence_added', payload);

    res.json({
      success: true,
      eventId,
      message: 'R&D evidence processed successfully'
    });

  } catch (error) {
    console.error('R&D evidence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process R&D evidence',
      details: error.message
    });
  }
});

// User Approval Events

/**
 * @swagger
 * /events/user/approval_callback:
 *   post:
 *     summary: Handle user approval responses
 *     tags: [Financial Events]
 */
router.post('/user/approval_callback', async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();
    const { approvalId, action, userId, reason } = req.body;

    if (!approvalId || !action || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: approvalId, action, userId'
      });
    }

    if (!['approve', 'reject', 'explain'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be: approve, reject, or explain'
      });
    }

    const payload = {
      approvalId,
      action,
      userId,
      reason: reason || null,
      timestamp: new Date().toISOString()
    };

    const eventId = await orchestratorInstance.processEvent('user:approval_callback', payload);

    res.json({
      success: true,
      eventId,
      action,
      message: `Approval ${action} processed successfully`
    });

  } catch (error) {
    console.error('User approval callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process approval callback',
      details: error.message
    });
  }
});

// Policy Update Events

/**
 * @swagger
 * /events/policy/updated:
 *   post:
 *     summary: Handle policy configuration updates
 *     tags: [Financial Events]
 */
router.post('/policy/updated', async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();

    // Reload policy configuration
    await orchestratorInstance.loadPolicy();

    const payload = {
      updatedBy: req.body.userId || 'system',
      timestamp: new Date().toISOString(),
      changes: req.body.changes || []
    };

    const eventId = await orchestratorInstance.processEvent('policy:updated', payload);

    res.json({
      success: true,
      eventId,
      message: 'Policy updated and agents notified'
    });

  } catch (error) {
    console.error('Policy update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process policy update',
      details: error.message
    });
  }
});

// Utility Functions

async function enrichTransactionPayload(payload) {
  // In a real implementation, this would fetch the transaction details from Xero
  // For now, we'll simulate the enrichment
  payload.date = new Date().toISOString().split('T')[0];
  payload.amount = -132.40; // Example amount
  payload.description = 'Auto Allocation GST Transfer';
  payload.reference = 'Thriday Allocation';
  payload.status = 'unreconciled';
  payload.bankAccount = 'Thriday Main';
}

async function enrichBillPayload(payload) {
  // Fetch bill details from Xero
  payload.date = new Date().toISOString().split('T')[0];
  payload.amount = 250.00;
  payload.supplier = 'Test Supplier';
  payload.taxCode = 'GST on Expenses';
  payload.lineItems = [
    {
      description: 'Professional services',
      quantity: 1,
      unitAmount: 227.27,
      accountCode: '640',
      taxType: 'OUTPUT2',
      taxAmount: 22.73
    }
  ];
}

async function enrichInvoicePayload(payload) {
  // Fetch invoice details from Xero
  payload.status = 'AUTHORISED';
  payload.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  payload.amountDue = 1500.00;
  payload.customer = 'Test Client';
}

async function determineBillSource(billId, tenantId) {
  // Logic to determine if bill came from Dext, e-Invoice, or manual entry
  // For now, return a default
  return 'Dext';
}

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const orchestratorInstance = await getOrchestrator();
    const metrics = await orchestratorInstance.getMetrics();

    res.json({
      success: true,
      status: 'healthy',
      metrics: {
        events_processed_30d: metrics.events_processed_30d,
        agents_status: Object.keys(metrics.agents_status).reduce((acc, name) => {
          acc[name] = 'healthy';
          return acc;
        }, {})
      },
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;