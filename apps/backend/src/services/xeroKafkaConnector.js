/**
 * ACT Xero-Kafka Financial Data Connector
 * Real-time financial data processing for ACT Farmhand AI Agent Finance Copilot
 */

import XeroNode from 'xero-node';
const { XeroClient } = XeroNode;
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';

class XeroKafkaConnector {
  constructor() {
    const brokerList = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').filter(Boolean);
    this.kafkaDisabled = process.env.DISABLE_KAFKA === 'true' || brokerList.length === 0 || brokerList[0] === 'none';

    if (!this.kafkaDisabled) {
      this.kafka = new Kafka({
        clientId: 'act-xero-connector',
        brokers: brokerList
      });
      this.producer = this.kafka.producer();
    } else {
      this.kafka = null;
      this.producer = null;
    }
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize Xero API client
    this.xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:4000/api/xero/callback'],
      scopes: [
        'offline_access',
        'accounting.transactions.read',
        'accounting.reports.read',
        'accounting.settings.read',
        'accounting.contacts.read',
        'accounting.budgets.read'
      ]
    });
    
    this.isConnected = false;
    this.tenantId = null;
    this.accessToken = null;
    this.lastSyncTimestamps = new Map();
    
    // Financial categories relevant to ACT
    this.actCategories = new Map([
      ['4-1000', 'Community Program Revenue'],
      ['4-1100', 'Grant Revenue'],
      ['4-1200', 'Donation Revenue'],
      ['4-1300', 'Partnership Revenue'],
      ['5-2000', 'Community Program Expenses'],
      ['5-2100', 'Staff Costs'],
      ['5-2200', 'Operations Expenses'],
      ['5-2300', 'Technology Expenses']
    ]);
    
    console.log('💰 Xero-Kafka Connector initialized');
  }

  async connect(accessToken, tenantId) {
    try {
      this.accessToken = accessToken;
      this.tenantId = tenantId;

      // Set access token for Xero API
      this.xero.setTokenSet({
        access_token: accessToken,
        token_type: 'Bearer'
      });

      // Best-effort Kafka connect (non-fatal)
      if (!this.kafkaDisabled && this.producer) {
        try {
          await this.producer.connect();
        } catch (kafkaError) {
          this.kafkaDisabled = true;
          console.error('Kafka unavailable, continuing without streaming:', kafkaError?.message || kafkaError);
        }
      }

      // Verify Xero connection
      await this.verifyXeroConnection();

      // Load last sync timestamps
      await this.loadLastSyncTimestamps();

      this.isConnected = true;
      console.log('✅ Xero Connector ready', this.kafkaDisabled ? '(Kafka disabled)' : '(Kafka enabled)');

      // Start continuous sync
      this.startContinuousSync();

    } catch (error) {
      console.error('🚨 Failed to initialize Xero Connector:', error);
      throw error;
    }
  }

  async verifyXeroConnection() {
    try {
      const response = await this.xero.accountingApi.getOrganisations(this.tenantId);
      const org = response.body.organisations[0];
      
      console.log(`🏢 Connected to Xero organisation: ${org.name}`);
      
      // Cache organisation info
      await this.redis.setex('xero:organisation', 3600, JSON.stringify({
        id: org.organisationID,
        name: org.name,
        country: org.countryCode,
        timezone: org.timezone,
        baseCurrency: org.baseCurrency,
        financialYearEndMonth: org.financialYearEndMonth
      }));
      
    } catch (error) {
      console.error('Failed to verify Xero connection:', error);
      throw error;
    }
  }

  startContinuousSync() {
    // Sync transactions every 15 minutes
    this.transactionSyncInterval = setInterval(() => {
      this.syncTransactions().catch(error => {
        console.error('Transaction sync failed:', error);
      });
    }, 15 * 60 * 1000);
    
    // Sync reports every hour
    this.reportSyncInterval = setInterval(() => {
      this.syncFinancialReports().catch(error => {
        console.error('Report sync failed:', error);
      });
    }, 60 * 60 * 1000);
    
    // Sync budget data every 6 hours
    this.budgetSyncInterval = setInterval(() => {
      this.syncBudgets().catch(error => {
        console.error('Budget sync failed:', error);
      });
    }, 6 * 60 * 60 * 1000);
    
    // Initial sync
    setTimeout(() => {
      this.performFullSync();
    }, 5000); // Start after 5 seconds
  }

  async performFullSync() {
    console.log('🔄 Performing full Xero financial data sync...');
    
    try {
      await Promise.all([
        this.syncTransactions(),
        this.syncContacts(),
        this.syncAccounts(),
        this.syncFinancialReports()
      ]);
      
      console.log('✅ Full Xero sync completed');
    } catch (error) {
      console.error('🚨 Full sync failed:', error);
    }
  }

  async syncTransactions() {
    try {
      const lastSync = this.getLastSyncTimestamp('transactions');
      const modifiedSince = lastSync ? new Date(lastSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      console.log(`💳 Syncing transactions since ${modifiedSince.toISOString()}`);
      
      // Get bank transactions
      const bankTransactions = await this.xero.accountingApi.getBankTransactions(
        this.tenantId, 
        modifiedSince,
        undefined, // where
        undefined, // order
        undefined, // page
        undefined, // unitdp
        true, // includeArchived
        true  // summaryOnly
      );
      
      for (const transaction of bankTransactions.body.bankTransactions || []) {
        await this.processTransaction(transaction, 'bank');
      }
      
      // Get manual journals
      const manualJournals = await this.xero.accountingApi.getManualJournals(
        this.tenantId,
        modifiedSince
      );
      
      for (const journal of manualJournals.body.manualJournals || []) {
        await this.processManualJournal(journal);
      }
      
      // Get invoices
      const invoices = await this.xero.accountingApi.getInvoices(
        this.tenantId,
        modifiedSince
      );
      
      for (const invoice of invoices.body.invoices || []) {
        await this.processInvoice(invoice);
      }
      
      // Update last sync timestamp
      await this.updateLastSyncTimestamp('transactions', Date.now());
      
    } catch (error) {
      console.error('Failed to sync transactions:', error);
      throw error;
    }
  }

  async processTransaction(transaction, type) {
    try {
      const transactionData = {
        id: transaction.bankTransactionID,
        type: type,
        date: transaction.date,
        amount: transaction.total,
        description: transaction.reference || transaction.particulars,
        status: transaction.status,
        account: {
          id: transaction.bankAccount?.accountID,
          name: transaction.bankAccount?.name,
          code: transaction.bankAccount?.code
        },
        contact: transaction.contact ? {
          id: transaction.contact.contactID,
          name: transaction.contact.name
        } : null,
        lineItems: transaction.lineItems?.map(item => ({
          description: item.description,
          amount: item.lineAmount,
          account: {
            id: item.accountID,
            code: item.accountCode,
            name: item.accountName
          },
          taxAmount: item.taxAmount
        })) || [],
        timestamp: new Date().toISOString(),
        xero_updated_at: transaction.updatedDateUTC
      };
      
      // Categorize transaction for ACT relevance
      const actRelevance = this.categorizeForACT(transactionData);
      transactionData.act_relevance = actRelevance;
      
       await this.sendToKafka('act.finance.transactions', transaction.bankTransactionID, transactionData);
      
      // Cache transaction for quick lookup
      await this.cacheFinancialData('transaction', transaction.bankTransactionID, transactionData);
      
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  }

  async processManualJournal(journal) {
    try {
      const journalData = {
        id: journal.manualJournalID,
        type: 'manual_journal',
        date: journal.date,
        narration: journal.narration,
        status: journal.status,
        journalLines: journal.journalLines?.map(line => ({
          description: line.description,
          netAmount: line.netAmount,
          grossAmount: line.grossAmount,
          account: {
            id: line.accountID,
            code: line.accountCode,
            name: line.accountName
          }
        })) || [],
        timestamp: new Date().toISOString(),
        xero_updated_at: journal.updatedDateUTC
      };
      
      const actRelevance = this.categorizeForACT(journalData);
      journalData.act_relevance = actRelevance;
      
       await this.sendToKafka('act.finance.journals', journal.manualJournalID, journalData);
      await this.cacheFinancialData('journal', journal.manualJournalID, journalData);
      
    } catch (error) {
      console.error('Error processing manual journal:', error);
    }
  }

  async processInvoice(invoice) {
    try {
      const invoiceData = {
        id: invoice.invoiceID,
        type: 'invoice',
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        dueDate: invoice.dueDate,
        status: invoice.status,
        invoiceType: invoice.type,
        total: invoice.total,
        totalTax: invoice.totalTax,
        amountDue: invoice.amountDue,
        amountPaid: invoice.amountPaid,
        contact: invoice.contact ? {
          id: invoice.contact.contactID,
          name: invoice.contact.name
        } : null,
        lineItems: invoice.lineItems?.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
          lineAmount: item.lineAmount,
          account: {
            id: item.accountID,
            code: item.accountCode
          }
        })) || [],
        timestamp: new Date().toISOString(),
        xero_updated_at: invoice.updatedDateUTC
      };
      
      const actRelevance = this.categorizeForACT(invoiceData);
      invoiceData.act_relevance = actRelevance;
      
       await this.sendToKafka('act.finance.invoices', invoice.invoiceID, invoiceData);
      await this.cacheFinancialData('invoice', invoice.invoiceID, invoiceData);
      
    } catch (error) {
      console.error('Error processing invoice:', error);
    }
  }

  async syncFinancialReports() {
    try {
      console.log('📊 Syncing financial reports...');
      
      // Get P&L report
      const profitAndLoss = await this.xero.accountingApi.getReportProfitAndLoss(
        this.tenantId,
        undefined, // fromDate
        undefined, // toDate
        undefined, // periods
        'MONTH',   // timeframe
        undefined, // trackingCategoryID
        undefined, // trackingCategoryID2
        undefined, // trackingOptionID
        undefined, // trackingOptionID2
        true,      // standardLayout
        undefined  // paymentsOnly
      );
      
      await this.processFinancialReport(profitAndLoss.body, 'profit_and_loss');
      
      // Get Balance Sheet
      const balanceSheet = await this.xero.accountingApi.getReportBalanceSheet(
        this.tenantId,
        undefined, // date
        undefined, // periods
        'MONTH',   // timeframe
        undefined, // trackingOptionID
        true       // standardLayout
      );
      
      await this.processFinancialReport(balanceSheet.body, 'balance_sheet');
      
      // Get Cash Flow report (SDK compatibility: method may not exist in some versions)
      if (this.xero?.accountingApi?.getReportCashFlow) {
        const cashFlow = await this.xero.accountingApi.getReportCashFlow(
          this.tenantId,
          undefined, // fromDate
          undefined, // toDate
          undefined, // periods
          'MONTH'    // timeframe
        );
        await this.processFinancialReport(cashFlow.body, 'cash_flow');
      } else {
        console.warn('Xero SDK: getReportCashFlow not available; skipping cash flow report sync.');
      }
      
    } catch (error) {
      console.error('Failed to sync financial reports:', error);
    }
  }

  async processFinancialReport(report, reportType) {
    try {
      const reportData = {
        id: `${reportType}_${Date.now()}`,
        type: reportType,
        report_name: report.reportName,
        report_titles: report.reportTitles || [],
        report_date: report.reportDate,
        updated_date: report.updatedDateUTC,
        rows: this.processReportRows(report.reports?.[0]?.rows || []),
        act_insights: this.extractACTInsights(report, reportType),
        timestamp: new Date().toISOString()
      };
      
      await this.sendToKafka('act.finance.reports', reportData.id, reportData);
      await this.cacheFinancialData('report', reportData.id, reportData);
      
      // Generate financial insights
      const insights = this.generateFinancialInsights(reportData);
      if (insights.length > 0) {
        await this.sendToKafka('act.finance.insights', `insights_${Date.now()}`, {
          report_type: reportType,
          insights: insights,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error processing financial report:', error);
    }
  }

  processReportRows(rows) {
    return rows.map(row => ({
      row_type: row.rowType,
      title: row.title,
      cells: row.cells?.map(cell => ({
        value: cell.value,
        attributes: cell.attributes || []
      })) || [],
      rows: row.rows ? this.processReportRows(row.rows) : []
    }));
  }

  categorizeForACT(transactionData) {
    const relevance = {
      category: 'other',
      confidence: 0,
      tags: [],
      program_allocation: null
    };
    
    const description = (transactionData.description || '').toLowerCase();
    
    // Check for ACT-specific keywords
    const actKeywords = {
      'community': { category: 'community_programs', confidence: 0.8 },
      'justice': { category: 'justice_programs', confidence: 0.9 },
      'grant': { category: 'grant_revenue', confidence: 0.9 },
      'donation': { category: 'donation_revenue', confidence: 0.8 },
      'goods': { category: 'goods_program', confidence: 0.8 },
      'justicehub': { category: 'justice_program', confidence: 0.9 },
      'picc': { category: 'picc_program', confidence: 0.8 },
      'empathy ledger': { category: 'empathy_ledger', confidence: 0.9 },
      'story': { category: 'story_programs', confidence: 0.7 },
      'staff': { category: 'operational_expense', confidence: 0.6 },
      'technology': { category: 'technology_expense', confidence: 0.7 }
    };
    
    for (const [keyword, details] of Object.entries(actKeywords)) {
      if (description.includes(keyword)) {
        relevance.category = details.category;
        relevance.confidence = Math.max(relevance.confidence, details.confidence);
        relevance.tags.push(keyword);
      }
    }
    
    // Check account codes
    if (transactionData.account?.code) {
      const accountCode = transactionData.account.code;
      for (const [code, category] of this.actCategories.entries()) {
        if (accountCode.startsWith(code.split('-')[0])) {
          relevance.program_allocation = category;
          relevance.confidence = Math.max(relevance.confidence, 0.9);
          break;
        }
      }
    }
    
    return relevance;
  }

  extractACTInsights(report, reportType) {
    const insights = [];
    
    // Basic financial health checks
    if (reportType === 'profit_and_loss') {
      // Check revenue diversity
      insights.push({
        type: 'revenue_diversity',
        message: 'Monitor revenue source diversification for sustainability',
        priority: 'medium'
      });
    }
    
    if (reportType === 'cash_flow') {
      insights.push({
        type: 'cash_flow_health',
        message: 'Cash flow monitoring for community program continuity',
        priority: 'high'
      });
    }
    
    return insights;
  }

  generateFinancialInsights(reportData) {
    const insights = [];
    
    // Budget variance analysis
    insights.push({
      type: 'budget_variance',
      description: 'Automated budget variance analysis for ACT programs',
      risk_level: 'low',
      recommended_action: 'Review program allocations quarterly'
    });
    
    // Cash flow predictions
    insights.push({
      type: 'cash_flow_forecast',
      description: 'Cash flow forecasting for program sustainability',
      risk_level: 'medium',
      recommended_action: 'Maintain 3-month operating reserve'
    });
    
    return insights;
  }

  async syncContacts() {
    try {
      console.log('👥 Syncing Xero contacts...');
      
      const contacts = await this.xero.accountingApi.getContacts(
        this.tenantId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      );
      
      for (const contact of contacts.body.contacts || []) {
        const contactData = {
          id: contact.contactID,
          name: contact.name,
          email: contact.emailAddress,
          contactStatus: contact.contactStatus,
          isSupplier: contact.isSupplier,
          isCustomer: contact.isCustomer,
          addresses: contact.addresses || [],
          phones: contact.phones || [],
          updatedDate: contact.updatedDateUTC,
          timestamp: new Date().toISOString()
        };
        
         await this.sendToKafka('act.finance.contacts', contact.contactID, contactData);
        await this.cacheFinancialData('contact', contact.contactID, contactData);
      }
      
    } catch (error) {
      console.error('Failed to sync contacts:', error);
    }
  }

  async syncAccounts() {
    try {
      console.log('🏦 Syncing chart of accounts...');
      
      const accounts = await this.xero.accountingApi.getAccounts(this.tenantId);
      
      for (const account of accounts.body.accounts || []) {
        const accountData = {
          id: account.accountID,
          code: account.code,
          name: account.name,
          type: account.type,
          class: account.class,
          status: account.status,
          description: account.description,
          taxType: account.taxType,
          enablePaymentsToAccount: account.enablePaymentsToAccount,
          updatedDate: account.updatedDateUTC,
          timestamp: new Date().toISOString()
        };
        
        await this.sendToKafka('act.finance.accounts', account.accountID, accountData);
        await this.cacheFinancialData('account', account.accountID, accountData);
      }
      
    } catch (error) {
      console.error('Failed to sync accounts:', error);
    }
  }

  async syncBudgets() {
    try {
      console.log('💹 Syncing budget data...');
      
      const budgets = await this.xero.accountingApi.getBudgets(this.tenantId);
      
      for (const budget of budgets.body.budgets || []) {
        const budgetData = {
          id: budget.budgetID,
          type: budget.type,
          description: budget.description,
          updatedDate: budget.updatedDateUTC,
          budgetLines: budget.budgetLines?.map(line => ({
            accountID: line.accountID,
            accountCode: line.accountCode,
            budgetBalance: line.budgetBalance
          })) || [],
          timestamp: new Date().toISOString()
        };
        
        await this.sendToKafka('act.finance.budgets', budget.budgetID, budgetData);
        await this.cacheFinancialData('budget', budget.budgetID, budgetData);
      }
      
    } catch (error) {
      console.error('Failed to sync budgets:', error);
    }
  }

  async sendToKafka(topic, key, data) {
    if (this.kafkaDisabled || !this.producer) {
      return; // No-op when Kafka is disabled/unavailable
    }
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: key,
          value: JSON.stringify(data),
          timestamp: Date.now().toString()
        }]
      });
      console.log(`💰 Sent Xero data to Kafka topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to send to Kafka topic ${topic}:`, error?.message || error);
      // Do not throw; continue operating without Kafka
      this.kafkaDisabled = true;
    }
  }

  async cacheFinancialData(type, id, data) {
    const cacheKey = `xero:${type}:${id}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(data)); // 1 hour
  }

  async loadLastSyncTimestamps() {
    const keys = await this.redis.keys('xero:last_sync:*');
    
    for (const key of keys) {
      const syncType = key.split(':').pop();
      const timestamp = await this.redis.get(key);
      this.lastSyncTimestamps.set(syncType, parseInt(timestamp));
    }
  }

  getLastSyncTimestamp(syncType) {
    return this.lastSyncTimestamps.get(syncType) || null;
  }

  async updateLastSyncTimestamp(syncType, timestamp) {
    this.lastSyncTimestamps.set(syncType, timestamp);
    await this.redis.set(`xero:last_sync:${syncType}`, timestamp.toString());
  }

  async disconnect() {
    this.isConnected = false;
    
    // Clear intervals
    if (this.transactionSyncInterval) clearInterval(this.transactionSyncInterval);
    if (this.reportSyncInterval) clearInterval(this.reportSyncInterval);
    if (this.budgetSyncInterval) clearInterval(this.budgetSyncInterval);
    
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      await this.redis.quit();
      console.log('✅ Xero Connector disconnected');
    } catch (error) {
      console.error('🚨 Error disconnecting Xero-Kafka Connector:', error);
    }
  }

  async healthCheck() {
    return {
      connected: this.isConnected,
      tenant_id: this.tenantId ? 'configured' : 'missing',
      last_sync_timestamps: Object.fromEntries(this.lastSyncTimestamps),
      api_token_valid: Boolean(this.accessToken)
    };
  }
}

export default XeroKafkaConnector;