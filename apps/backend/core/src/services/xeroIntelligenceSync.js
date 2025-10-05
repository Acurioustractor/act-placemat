/**
 * Xero Intelligence Sync Service
 * Syncs financial data from Xero with Australian business compliance focus
 */

import { EventEmitter } from 'events';
import { XeroClient } from 'xero-node';
import { createSupabaseClient } from '../config/supabase.js';

class XeroIntelligenceSync extends EventEmitter {
  constructor() {
    super();
    this.supabase = null;
    this.xeroClient = null;
    this.tenantId = null;
    this.isSyncing = false;
  }

  /**
   * Initialize Xero client and Supabase
   */
  async initialize() {
    console.log('🔧 Initializing Xero Intelligence Sync...');

    // Initialize Supabase
    this.supabase = createSupabaseClient();
    console.log('✅ Supabase client initialized for Xero sync');

    // Initialize Xero client
    this.xeroClient = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [process.env.XERO_REDIRECT_URI],
      scopes: [
        'offline_access',
        'accounting.contacts.read',
        'accounting.transactions.read',
        'accounting.settings.read',
        'accounting.reports.read'
      ]
    });

    // Set tokens from environment
    await this.xeroClient.setTokenSet({
      access_token: process.env.XERO_ACCESS_TOKEN,
      refresh_token: process.env.XERO_REFRESH_TOKEN
    });

    this.tenantId = process.env.XERO_TENANT_ID;

    console.log(`✅ Xero API initialized for tenant: ${this.tenantId}`);
  }

  /**
   * Perform full sync of Xero data
   */
  async performFullSync() {
    if (this.isSyncing) {
      console.log('⏸️  Sync already in progress, skipping...');
      return { success: false, message: 'Sync already in progress' };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      await this.updateSyncStatus('syncing', {
        last_sync: new Date().toISOString()
      });

      console.log('🔄 Starting Xero full sync...');

      // Sync in order: contacts, invoices, bank transactions, BAS
      const contactsCount = await this.syncContacts();
      console.log(`   ✅ Synced ${contactsCount} contacts`);

      const invoicesCount = await this.syncInvoices();
      console.log(`   ✅ Synced ${invoicesCount} invoices`);

      const transactionsCount = await this.syncBankTransactions();
      console.log(`   ✅ Synced ${transactionsCount} bank transactions`);

      await this.calculateBAS();
      console.log(`   ✅ BAS calculations updated`);

      const duration = Date.now() - startTime;

      await this.updateSyncStatus('completed', {
        last_sync: new Date().toISOString(),
        total_contacts: contactsCount,
        total_invoices: invoicesCount,
        synced_items: contactsCount + invoicesCount + transactionsCount,
        error_count: 0,
        sync_duration_ms: duration,
        next_sync: new Date(Date.now() + 60 * 60 * 1000).toISOString() // Next sync in 1 hour
      });

      console.log(`\n✅ Xero sync completed in ${(duration / 1000).toFixed(2)}s`);

      this.emit('sync:complete', {
        contacts: contactsCount,
        invoices: invoicesCount,
        transactions: transactionsCount,
        duration
      });

      return {
        success: true,
        contacts: contactsCount,
        invoices: invoicesCount,
        transactions: transactionsCount,
        duration
      };

    } catch (error) {
      console.error('❌ Xero sync failed:', error.message);

      await this.updateSyncStatus('error', {
        error_message: error.message,
        error_count: 1,
        last_error: new Date().toISOString()
      });

      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync contacts from Xero
   */
  async syncContacts() {
    const response = await this.xeroClient.accountingApi.getContacts(this.tenantId);
    const contacts = response.body.contacts || [];

    let syncedCount = 0;

    for (const contact of contacts) {
      try {
        const contactData = {
          xero_id: contact.contactID,
          tenant_id: this.tenantId,
          name: contact.name,
          email: contact.emailAddress,
          first_name: contact.firstName,
          last_name: contact.lastName,
          is_customer: contact.isCustomer || false,
          is_supplier: contact.isSupplier || false,
          abn: contact.taxNumber, // In Australia, this is often the ABN
          balance: parseFloat(contact.balances?.accountsReceivable?.outstanding || 0),
          outstanding_receivable: parseFloat(contact.balances?.accountsReceivable?.outstanding || 0),
          outstanding_payable: parseFloat(contact.balances?.accountsPayable?.outstanding || 0),
          addresses: contact.addresses || [],
          phones: contact.phones || [],
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await this.supabase
          .from('xero_contacts')
          .upsert(contactData, { onConflict: 'xero_id' });

        if (error) {
          console.error(`   Error syncing contact ${contact.name}:`, error.message);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error(`   Error processing contact ${contact.name}:`, error.message);
      }
    }

    return syncedCount;
  }

  /**
   * Sync invoices from Xero
   */
  async syncInvoices() {
    // Get both sales invoices (ACCREC) and bills (ACCPAY)
    const response = await this.xeroClient.accountingApi.getInvoices(this.tenantId);
    const invoices = response.body.invoices || [];

    let syncedCount = 0;

    for (const invoice of invoices) {
      try {
        const invoiceData = {
          xero_id: invoice.invoiceID,
          tenant_id: this.tenantId,
          invoice_number: invoice.invoiceNumber,
          type: invoice.type, // ACCREC or ACCPAY
          status: invoice.status,
          contact_id: invoice.contact?.contactID,
          contact_name: invoice.contact?.name,
          date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : null,
          due_date: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : null,
          total: parseFloat(invoice.total || 0),
          subtotal: parseFloat(invoice.subTotal || 0),
          total_tax: parseFloat(invoice.totalTax || 0), // GST amount
          amount_due: parseFloat(invoice.amountDue || 0),
          amount_paid: parseFloat(invoice.amountPaid || 0),
          currency_code: invoice.currencyCode || 'AUD',
          line_items: invoice.lineItems || [],
          has_attachments: invoice.hasAttachments || false,
          reference: invoice.reference,
          url: `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoice.invoiceID}`,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await this.supabase
          .from('xero_invoices')
          .upsert(invoiceData, { onConflict: 'xero_id' });

        if (error) {
          console.error(`   Error syncing invoice ${invoice.invoiceNumber}:`, error.message);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error(`   Error processing invoice ${invoice.invoiceNumber}:`, error.message);
      }
    }

    return syncedCount;
  }

  /**
   * Sync bank transactions from Xero
   */
  async syncBankTransactions() {
    const response = await this.xeroClient.accountingApi.getBankTransactions(this.tenantId);
    const transactions = response.body.bankTransactions || [];

    let syncedCount = 0;

    for (const transaction of transactions) {
      try {
        const transactionData = {
          xero_id: transaction.bankTransactionID,
          tenant_id: this.tenantId,
          type: transaction.type, // SPEND or RECEIVE
          status: transaction.status,
          contact_id: transaction.contact?.contactID,
          contact_name: transaction.contact?.name,
          date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : null,
          total: parseFloat(transaction.total || 0),
          subtotal: parseFloat(transaction.subTotal || 0),
          total_tax: parseFloat(transaction.totalTax || 0),
          bank_account_id: transaction.bankAccount?.accountID,
          bank_account_name: transaction.bankAccount?.name,
          reference: transaction.reference,
          line_items: transaction.lineItems || [],
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await this.supabase
          .from('xero_bank_transactions')
          .upsert(transactionData, { onConflict: 'xero_id' });

        if (error) {
          console.error(`   Error syncing transaction:`, error.message);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error(`   Error processing transaction:`, error.message);
      }
    }

    return syncedCount;
  }

  /**
   * Calculate BAS (Business Activity Statement) figures
   * Australian tax reporting requirements
   */
  async calculateBAS() {
    // Get current quarter dates
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);

    // Get all invoices for the quarter
    const { data: salesInvoices } = await this.supabase
      .from('xero_invoices')
      .select('total_tax')
      .eq('tenant_id', this.tenantId)
      .eq('type', 'ACCREC') // Sales invoices
      .gte('date', quarterStart.toISOString().split('T')[0])
      .lte('date', quarterEnd.toISOString().split('T')[0]);

    const { data: billsInvoices } = await this.supabase
      .from('xero_invoices')
      .select('total_tax')
      .eq('tenant_id', this.tenantId)
      .eq('type', 'ACCPAY') // Bills
      .gte('date', quarterStart.toISOString().split('T')[0])
      .lte('date', quarterEnd.toISOString().split('T')[0]);

    // Calculate GST amounts
    const gstOnSales = (salesInvoices || []).reduce((sum, inv) => sum + parseFloat(inv.total_tax || 0), 0);
    const gstOnPurchases = (billsInvoices || []).reduce((sum, inv) => sum + parseFloat(inv.total_tax || 0), 0);
    const netGst = gstOnSales - gstOnPurchases;

    // Upsert BAS tracking
    await this.supabase
      .from('xero_bas_tracking')
      .upsert({
        tenant_id: this.tenantId,
        period_start: quarterStart.toISOString().split('T')[0],
        period_end: quarterEnd.toISOString().split('T')[0],
        gst_on_sales: gstOnSales,
        gst_on_purchases: gstOnPurchases,
        net_gst: netGst,
        status: netGst === 0 ? 'draft' : 'ready_to_lodge',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id,period_start,period_end'
      });

    return { gstOnSales, gstOnPurchases, netGst };
  }

  /**
   * Update sync status in database
   */
  async updateSyncStatus(status, updates = {}) {
    const { error } = await this.supabase
      .from('xero_sync_status')
      .upsert({
        tenant_id: this.tenantId,
        sync_status: status,
        updated_at: new Date().toISOString(),
        ...updates
      }, {
        onConflict: 'tenant_id'
      });

    if (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Get sync statistics
   */
  async getStats() {
    const { data: syncStatus } = await this.supabase
      .from('xero_sync_status')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .single();

    const { count: contactsCount } = await this.supabase
      .from('xero_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId);

    const { count: invoicesCount } = await this.supabase
      .from('xero_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.tenantId);

    const { data: basData } = await this.supabase
      .from('xero_bas_tracking')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    return {
      syncStatus: syncStatus?.sync_status || 'unknown',
      lastSync: syncStatus?.last_sync,
      nextSync: syncStatus?.next_sync,
      totalContacts: contactsCount || 0,
      totalInvoices: invoicesCount || 0,
      syncDuration: syncStatus?.sync_duration_ms,
      currentBAS: basData || null
    };
  }
}

// Singleton instance
let syncServiceInstance = null;

export async function getXeroSyncService() {
  if (!syncServiceInstance) {
    syncServiceInstance = new XeroIntelligenceSync();
    await syncServiceInstance.initialize();
  }
  return syncServiceInstance;
}

export default XeroIntelligenceSync;