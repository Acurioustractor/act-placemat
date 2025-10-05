/**
 * Financial Agent Orchestrator - Core event routing and agent coordination
 * Implements the specifications from your financial automation document
 */

import EventEmitter from 'events';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

// Import financial agents
import ReceiptCodingAgent from './agents/ReceiptCodingAgent.js';
import BankRecoAgent from './agents/BankRecoAgent.js';
import BASPrepAgent from './agents/BASPrepAgent.js';
import CashflowAgent from './agents/CashflowAgent.js';
import RDTIAgent from './agents/RDTIAgent.js';
import SpendGuardAgent from './agents/SpendGuardAgent.js';
import BoardPackAgent from './agents/BoardPackAgent.js';
import ARCollectionsAgent from './agents/ARCollectionsAgent.js';

class FinancialAgentOrchestrator extends EventEmitter {
  constructor() {
    super();

    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Initialize agents
    this.agents = {
      receiptCoding: new ReceiptCodingAgent(this),
      bankReco: new BankRecoAgent(this),
      basPrepCheck: new BASPrepAgent(this),
      cashflowForecast: new CashflowAgent(this),
      rdtiRegistration: new RDTIAgent(this),
      spendGuard: new SpendGuardAgent(this),
      arCollections: new ARCollectionsAgent(this),
      boardPack: new BoardPackAgent(this),
    };

    this.policy = null;
    this.eventStore = [];

    this.setupEventHandlers();
  }

  async initialize() {
    try {
      // Load policy configuration
      await this.loadPolicy();

      // Initialize each agent
      for (const [name, agent] of Object.entries(this.agents)) {
        await agent.initialize();
        console.log(`✅ ${name} agent initialized`);
      }

      console.log('🚀 Financial Agent Orchestrator initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Financial Agent Orchestrator:', error);
      throw error;
    }
  }

  async loadPolicy() {
    try {
      const policyPath = path.join(process.cwd(), 'config', 'financial-policy.yaml');
      const policyContent = await fs.readFile(policyPath, 'utf8');
      this.policy = yaml.load(policyContent);
      console.log('📋 Financial policy loaded successfully');
    } catch (error) {
      console.warn('⚠️  Using default policy (financial-policy.yaml not found)');
      this.policy = this.getDefaultPolicy();
    }
  }

  getDefaultPolicy() {
    return {
      version: 1,
      entities: [
        {
          code: 'ACT_PTY_LTD',
          xero_tenant_id: process.env.XERO_TENANT_ID,
          bank_accounts: [
            { name: 'Thriday Main' },
            { name: 'Thriday GST' },
            { name: 'Thriday Tax' },
            { name: 'Thriday Profit' },
            { name: 'Thriday Opex' }
          ],
          tracking: {
            project_property: ['Seed House Witta', 'JusticeHub', 'ACT Core', 'Property SPV 1'],
            line_of_business: ['Consulting', 'Grants_Programs', 'Property_Ops', 'Digital_Products']
          }
        }
      ],
      thresholds: {
        auto_post_bill_confidence: 0.85,
        auto_match_bank_confidence: 0.90,
        variance_alert_pct: 0.20,
        payment_duedays_warning: 5
      },
      approvals: {
        auto: [
          { rule: 'bill.amount < 250 and vendor in known' },
          { rule: 'bank.transfer and description contains "Allocation"' }
        ],
        propose_only: [
          { rule: 'bill.amount >= 250' },
          { rule: 'new_bank_rule' },
          { rule: 'payment.amount >= 2000' }
        ],
        human_signoff: ['BAS_lodgement', 'RDTI_registration', 'payroll_finalisation']
      },
      vendor_rules: [
        {
          vendor: 'Telstra',
          account: 'Telephone & Internet',
          tax_code: 'GST on Expenses',
          tracking: { line_of_business: 'ACT Core' }
        }
      ],
      privacy: {
        data_minimisation: true,
        retention_months: 84,
        pii_access_roles: ['FinanceAdmin', 'Director']
      },
      bas: {
        lodgement_path: 'via_registered_agent',
        frequency: 'quarterly'
      },
      rdti: {
        year_end: '2025-06-30',
        registration_deadline: '2026-04-30',
        advisor_required: true
      },
      notifications: {
        slack_channel: '#finance',
        digest_times: ['09:00']
      }
    };
  }

  setupEventHandlers() {
    // Xero webhook events
    this.on('xero:bank_transaction_created', this.handleBankTransactionCreated.bind(this));
    this.on('xero:bill_created', this.handleBillCreated.bind(this));
    this.on('xero:invoice_updated', this.handleInvoiceUpdated.bind(this));

    // Scheduled events
    this.on('scheduler:daily', this.handleDailyJob.bind(this));
    this.on('scheduler:month_end', this.handleMonthEndJob.bind(this));

    // R&D evidence events
    this.on('rd:evidence_added', this.handleRDEvidenceAdded.bind(this));

    // User approval events
    this.on('user:approval_callback', this.handleUserApproval.bind(this));
  }

  async processEvent(eventType, payload) {
    try {
      // Log event to immutable store
      const eventLog = {
        id: crypto.randomUUID(),
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
        processed: false
      };

      this.eventStore.push(eventLog);
      await this.redis.lpush('financial:event_log', JSON.stringify(eventLog));

      // Emit event to trigger agent processing
      this.emit(eventType, payload);

      // Mark as processed
      eventLog.processed = true;

      return eventLog.id;
    } catch (error) {
      console.error(`Failed to process event ${eventType}:`, error);
      throw error;
    }
  }

  // Event Handlers
  async handleBankTransactionCreated(payload) {
    const { bankTransactionId, description, amount } = payload;

    // Check if this is a Thriday allocation transfer
    if (this.isThridayAllocation(description)) {
      await this.agents.bankReco.processThridayTransfer(payload);
    } else {
      await this.agents.bankReco.processTransaction(payload);
    }
  }

  async handleBillCreated(payload) {
    const { billId, source } = payload;

    if (source === 'eInvoice') {
      // Higher confidence threshold for e-invoices
      await this.agents.receiptCoding.processEInvoice(payload);
    } else {
      // Standard bill processing (likely from Dext)
      await this.agents.receiptCoding.processBill(payload);
    }
  }

  async handleInvoiceUpdated(payload) {
    const { invoiceId, status, dueDate } = payload;

    if (status === 'AUTHORISED' && dueDate) {
      await this.agents.arCollections.processInvoice(payload);
    }
  }

  async handleDailyJob(payload) {
    // Run daily financial intelligence checks
    const tasks = [
      this.agents.basPrepCheck.generateDailyReport(),
      this.agents.cashflowForecast.updateForecasts(),
      this.agents.spendGuard.checkPolicyCompliance(),
      this.agents.arCollections.sendReminders()
    ];

    await Promise.allSettled(tasks);
  }

  async handleMonthEndJob(payload) {
    await this.agents.boardPack.generateMonthlyPack();
  }

  async handleRDEvidenceAdded(payload) {
    await this.agents.rdtiRegistration.processEvidence(payload);
  }

  async handleUserApproval(payload) {
    const { eventId, action, userId } = payload;

    // Process approval/rejection and update relevant agents
    if (action === 'approve') {
      await this.processApproval(eventId, userId);
    } else if (action === 'reject') {
      await this.processRejection(eventId, userId);
    }
  }

  // Utility Methods
  isThridayAllocation(description) {
    const allocationKeywords = [
      'allocation',
      'thriday.*transfer',
      'auto.*allocation',
      'gst transfer',
      'tax allocation',
      'profit distribution'
    ];

    const lowerDesc = description.toLowerCase();
    return allocationKeywords.some(keyword => {
      const regex = new RegExp(keyword, 'i');
      return regex.test(lowerDesc);
    });
  }

  async sendNotification(channel, message, actionButtons = null) {
    // Send Slack notification with optional action buttons
    const notification = {
      channel: channel || this.policy.notifications.slack_channel,
      message,
      actionButtons,
      timestamp: new Date().toISOString()
    };

    // Store notification for tracking
    await this.redis.lpush('financial:notifications', JSON.stringify(notification));

    // TODO: Integrate with actual Slack API
    console.log(`📢 Notification: ${message}`);

    return notification;
  }

  async getMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const metrics = {
      events_processed_30d: this.eventStore.filter(e =>
        new Date(e.timestamp) >= thirtyDaysAgo
      ).length,
      auto_coded_percentage: await this.calculateAutoCodingRate(),
      exception_rate: await this.calculateExceptionRate(),
      avg_processing_time: await this.calculateAvgProcessingTime(),
      last_sync: await this.redis.get('xero:last_sync'),
      agents_status: {}
    };

    // Get agent-specific metrics
    for (const [name, agent] of Object.entries(this.agents)) {
      if (agent.getMetrics) {
        metrics.agents_status[name] = await agent.getMetrics();
      }
    }

    return metrics;
  }

  async calculateAutoCodingRate() {
    const { data } = await this.supabase
      .from('xero_transactions')
      .select('confidence')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!data || data.length === 0) return 0;

    const autoCoded = data.filter(tx => tx.confidence >= this.policy.thresholds.auto_post_bill_confidence);
    return (autoCoded.length / data.length) * 100;
  }

  async calculateExceptionRate() {
    const { data } = await this.supabase
      .from('financial_exceptions')
      .select('status')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!data || data.length === 0) return 0;

    const unresolved = data.filter(ex => ex.status === 'pending');
    return (unresolved.length / data.length) * 100;
  }

  async calculateAvgProcessingTime() {
    // Implementation would calculate average processing time from event logs
    return 0; // Placeholder
  }

  async shutdown() {
    console.log('🔄 Shutting down Financial Agent Orchestrator...');

    // Shutdown all agents
    for (const [name, agent] of Object.entries(this.agents)) {
      if (agent.shutdown) {
        await agent.shutdown();
      }
    }

    // Close connections
    await this.redis.quit();

    console.log('✅ Financial Agent Orchestrator shutdown complete');
  }
}

export default FinancialAgentOrchestrator;