/**
 * Xero Agent Integration Service
 * 
 * Bridges the existing comprehensive Xero integration with the new AI Agent system.
 * Provides interfaces for agents to interact with Xero data and APIs.
 */

import { XeroClient } from 'xero-node';
import Redis from 'ioredis';
import crypto from 'crypto';
import { getEventIngestor } from '../agents/events/EventIngestor.js';
import { Logger } from '../utils/logger.js';
import { createSupabaseClient } from '../config/supabase.js';

const logger = new Logger('XeroAgentIntegration');

export class XeroAgentIntegration {
  constructor() {
    this.xero = null;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.supabase = createSupabaseClient();
    this.eventIngestor = getEventIngestor();
    this.isConnected = false;
    
    // Initialize from existing integration
    this.initializeFromExisting();
  }
  
  /**
   * Initialize from existing Xero integration
   */
  async initializeFromExisting() {
    try {
      // Get existing token from Redis (used by existing integration)
      const [tokenSetJson, tenantId] = await Promise.all([
        this.redis.get('xero:tokenSet'),
        this.redis.get('xero:tenantId')
      ]);
      
      if (tokenSetJson && tenantId) {
        const tokenSet = JSON.parse(tokenSetJson);
        
        // Initialize Xero client with existing token
        this.xero = new XeroClient({
          clientId: process.env.XERO_CLIENT_ID,
          clientSecret: process.env.XERO_CLIENT_SECRET,
          redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback'],
          scopes: [
            'offline_access',
            'accounting.transactions.read',
            'accounting.transactions.write', // Need write for agent actions
            'accounting.reports.read',
            'accounting.contacts.read',
            'accounting.contacts.write',
            'accounting.settings.read',
            'accounting.budgets.read'
          ]
        });
        
        await this.xero.setTokenSet(tokenSet);
        this.tenantId = tenantId;
        this.isConnected = true;
        
        logger.info('Xero Agent Integration initialized with existing connection');
      } else {
        logger.warn('No existing Xero connection found - agents will operate in limited mode');
      }
    } catch (error) {
      logger.error('Failed to initialize from existing Xero integration:', error);
    }
  }
  
  /**
   * Check if Xero is connected
   */
  isXeroConnected() {
    return this.isConnected && this.xero && this.tenantId;
  }
  
  /**
   * Get Xero client for agents
   */
  getXeroClient() {
    if (!this.isXeroConnected()) {
      throw new Error('Xero not connected - cannot perform agent operations');
    }
    return this.xero;
  }
  
  /**
   * Update bill in Xero (for Receipt Coding Agent)
   */
  async updateBill(billId, updates) {
    try {
      const client = this.getXeroClient();
      
      // Prepare Xero bill update
      const billUpdate = {
        BillID: billId,
        ...updates
      };
      
      // Update in Xero
      const response = await client.accountingApi.updateBill(this.tenantId, billId, {
        Bills: [billUpdate]
      });
      
      // Sync to existing bookkeeping system
      await this.syncBillToDatabase(response.body.Bills[0]);
      
      logger.info(`Bill updated in Xero: ${billId}`, updates);
      
      return response.body.Bills[0];
      
    } catch (error) {
      logger.error(`Failed to update bill ${billId}:`, error);
      throw error;
    }
  }
  
  /**
   * Reconcile bank transaction (for Bank Reconciliation Agent)
   */
  async reconcileBankTransaction(transactionId, matchType, matchId) {
    try {
      const client = this.getXeroClient();
      
      if (matchType === 'invoice') {
        // Create payment to match invoice
        const payment = {
          Invoice: { InvoiceID: matchId },
          Account: { AccountID: await this.getBankAccountId() },
          Date: new Date().toISOString().split('T')[0],
          Amount: await this.getTransactionAmount(transactionId)
        };
        
        await client.accountingApi.createPayments(this.tenantId, {
          Payments: [payment]
        });
        
      } else if (matchType === 'bill') {
        // Create bill payment
        const payment = {
          Invoice: { InvoiceID: matchId },
          Account: { AccountID: await this.getBankAccountId() },
          Date: new Date().toISOString().split('T')[0],
          Amount: await this.getTransactionAmount(transactionId)
        };
        
        await client.accountingApi.createBillPayments(this.tenantId, {
          BillPayments: [payment]
        });
      }
      
      // Update reconciliation status in our database
      await this.updateReconciliationStatus(transactionId, 'reconciled');
      
      logger.info(`Bank transaction reconciled: ${transactionId} -> ${matchType}:${matchId}`);
      
    } catch (error) {
      logger.error(`Failed to reconcile transaction ${transactionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Create bank transfer (for Thriday allocations)
   */
  async createBankTransfer(fromAccountCode, toAccountCode, amount, description) {
    try {
      const client = this.getXeroClient();
      
      // Create transfer as bank transaction
      const transfer = {
        Type: 'SPEND',
        Contact: { Name: 'Thriday Allocation' },
        BankAccount: { Code: fromAccountCode },
        LineItems: [{
          Description: description,
          Quantity: 1,
          UnitAmount: amount,
          AccountCode: toAccountCode,
          TaxType: 'NONE'
        }]
      };
      
      const response = await client.accountingApi.createBankTransactions(this.tenantId, {
        BankTransactions: [transfer]
      });
      
      logger.info(`Bank transfer created: ${amount} from ${fromAccountCode} to ${toAccountCode}`);
      
      return response.body.BankTransactions[0];
      
    } catch (error) {
      logger.error('Failed to create bank transfer:', error);
      throw error;
    }
  }
  
  /**
   * Get BAS data from Xero
   */
  async getBASData(startDate, endDate) {
    try {
      const client = this.getXeroClient();
      
      // Get GST report
      const gstReport = await client.accountingApi.getReportGSTList(
        this.tenantId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      // Get bank transactions for the period
      const bankTransactions = await client.accountingApi.getBankTransactions(
        this.tenantId,
        null,
        `Date >= DateTime(${startDate.getFullYear()}, ${startDate.getMonth() + 1}, ${startDate.getDate()}) && Date <= DateTime(${endDate.getFullYear()}, ${endDate.getMonth() + 1}, ${endDate.getDate()})`
      );
      
      // Get invoices for the period
      const invoices = await client.accountingApi.getInvoices(
        this.tenantId,
        null,
        `Date >= DateTime(${startDate.getFullYear()}, ${startDate.getMonth() + 1}, ${startDate.getDate()}) && Date <= DateTime(${endDate.getFullYear()}, ${endDate.getMonth() + 1}, ${endDate.getDate()})`
      );
      
      // Get bills for the period
      const bills = await client.accountingApi.getBills(
        this.tenantId,
        null,
        `Date >= DateTime(${startDate.getFullYear()}, ${startDate.getMonth() + 1}, ${startDate.getDate()}) && Date <= DateTime(${endDate.getFullYear()}, ${endDate.getMonth() + 1}, ${endDate.getDate()})`
      );
      
      return {
        gstReport: gstReport.body,
        bankTransactions: bankTransactions.body.BankTransactions || [],
        invoices: invoices.body.Invoices || [],
        bills: bills.body.Bills || []
      };
      
    } catch (error) {
      logger.error('Failed to get BAS data from Xero:', error);
      throw error;
    }
  }
  
  /**
   * Get cash flow data
   */
  async getCashFlowData(months = 3) {
    try {
      const client = this.getXeroClient();
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      
      // Get cash flow report
      const cashFlowReport = await client.accountingApi.getReportCashflow(
        this.tenantId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      return cashFlowReport.body;
      
    } catch (error) {
      logger.error('Failed to get cash flow data from Xero:', error);
      throw error;
    }
  }
  
  /**
   * Set up webhook handler for real-time events
   */
  setupWebhookHandler() {
    // This integrates with the existing webhook system
    // Events will be forwarded to the Event Ingestor
    return async (req, res) => {
      try {
        // Verify webhook signature (using existing logic)
        const signature = req.headers['x-xero-signature'];
        const payload = req.body;
        
        if (process.env.XERO_WEBHOOK_KEY) {
          const expectedSignature = crypto
            .createHmac('sha256', process.env.XERO_WEBHOOK_KEY)
            .update(JSON.stringify(payload))
            .digest('base64');
          
          if (signature !== expectedSignature) {
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }
        
        // Forward events to Event Ingestor
        const events = Array.isArray(payload.events) ? payload.events : [payload];
        
        for (const event of events) {
          await this.eventIngestor.ingest({
            type: this.mapXeroEventType(event.eventType),
            source: 'xero',
            entity: event.tenantId,
            data: event
          });
        }
        
        res.status(200).json({ status: 'received' });
        
      } catch (error) {
        logger.error('Webhook handling failed:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }
  
  /**
   * Map Xero event types to our internal types
   */
  mapXeroEventType(xeroType) {
    const mapping = {
      'CREATE_BANKTRANSACTION': 'bank_transaction_created',
      'UPDATE_BANKTRANSACTION': 'bank_transaction_updated',
      'CREATE_INVOICE': 'invoice_created',
      'UPDATE_INVOICE': 'invoice_updated',
      'CREATE_BILL': 'bill_created',
      'UPDATE_BILL': 'bill_updated',
      'CREATE_PAYMENT': 'payment_created',
      'CREATE_CONTACT': 'contact_created',
      'UPDATE_CONTACT': 'contact_updated'
    };
    
    return mapping[xeroType] || xeroType.toLowerCase();
  }
  
  /**
   * Sync bill data to existing database
   */
  async syncBillToDatabase(bill) {
    try {
      await this.supabase
        .from('bills')
        .upsert({
          xero_bill_id: bill.BillID,
          bill_number: bill.BillNumber,
          date: bill.Date,
          due_date: bill.DueDate,
          total_amount: bill.Total,
          tax_amount: bill.TotalTax,
          status: bill.Status,
          supplier_name: bill.Contact?.Name,
          supplier_id: bill.Contact?.ContactID,
          line_items: bill.LineItems,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to sync bill to database:', error);
    }
  }
  
  /**
   * Get bank account ID for reconciliation
   */
  async getBankAccountId() {
    try {
      const client = this.getXeroClient();
      const accounts = await client.accountingApi.getAccounts(this.tenantId, null, 'Type=="BANK"');
      
      // Return first bank account or Thriday Main
      const bankAccount = accounts.body.Accounts.find(acc => 
        acc.Name.includes('Thriday') || acc.Type === 'BANK'
      );
      
      return bankAccount?.AccountID;
    } catch (error) {
      logger.error('Failed to get bank account ID:', error);
      return null;
    }
  }
  
  /**
   * Get transaction amount from database
   */
  async getTransactionAmount(transactionId) {
    try {
      const { data } = await this.supabase
        .from('bank_transactions')
        .select('amount')
        .eq('xero_transaction_id', transactionId)
        .single();
      
      return Math.abs(data?.amount || 0);
    } catch (error) {
      logger.error('Failed to get transaction amount:', error);
      return 0;
    }
  }
  
  /**
   * Update reconciliation status
   */
  async updateReconciliationStatus(transactionId, status) {
    try {
      await this.supabase
        .from('bank_transactions')
        .update({ 
          reconciled: status === 'reconciled',
          reconciled_at: new Date().toISOString()
        })
        .eq('xero_transaction_id', transactionId);
    } catch (error) {
      logger.error('Failed to update reconciliation status:', error);
    }
  }
  
  /**
   * Get health status
   */
  getHealth() {
    return {
      connected: this.isConnected,
      xeroClient: !!this.xero,
      tenantId: !!this.tenantId,
      lastTokenCheck: this.lastTokenCheck || null
    };
  }
}

// Singleton instance
let xeroAgentIntegration = null;

export function getXeroAgentIntegration() {
  if (!xeroAgentIntegration) {
    xeroAgentIntegration = new XeroAgentIntegration();
  }
  return xeroAgentIntegration;
}

export default XeroAgentIntegration;