/**
 * Accounts Receivable Collections Agent
 * Monitors outstanding invoices and manages collections process
 */

import BaseFinancialAgent from './BaseFinancialAgent.js';

class ARCollectionsAgent extends BaseFinancialAgent {
  constructor(orchestrator) {
    super('ARCollectionsAgent', orchestrator);
  }

  async reviewOverdueInvoices() {
    try {
      console.log('🔄 Reviewing overdue invoices...');

      // Get overdue invoices from Xero
      const overdueInvoices = await this.getOverdueInvoices();

      const collectionsActions = [];

      for (const invoice of overdueInvoices) {
        const action = await this.determineCollectionAction(invoice);
        if (action) {
          collectionsActions.push(action);
          await this.logCollectionAction(invoice, action);
        }
      }

      // Send summary notification
      if (collectionsActions.length > 0) {
        await this.sendCollectionsSummary(collectionsActions);
      }

      await this.logAgentAction({
        action: 'overdue_review_completed',
        overdue_count: overdueInvoices.length,
        actions_required: collectionsActions.length,
        total_overdue_amount: overdueInvoices.reduce((sum, inv) => sum + inv.amount_outstanding, 0)
      });

      return {
        status: 'completed',
        overdueInvoices: overdueInvoices.length,
        actionsRequired: collectionsActions.length,
        totalOverdue: overdueInvoices.reduce((sum, inv) => sum + inv.amount_outstanding, 0)
      };

    } catch (error) {
      console.error('Collections review error:', error);
      await this.handleProcessingError('collections_review', error);
      throw error;
    }
  }

  async getOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0];

    // Get outstanding invoices past due date
    const { data: invoices } = await this.supabase
      .from('xero_invoices')
      .select('*')
      .eq('status', 'AUTHORISED')
      .gt('amount_outstanding', 0)
      .lt('due_date', today);

    return invoices || [];
  }

  async determineCollectionAction(invoice) {
    const daysOverdue = this.calculateDaysOverdue(invoice.due_date);
    const amount = invoice.amount_outstanding;

    // Collection escalation rules from policy
    const escalationRules = this.policy.collections?.escalation_rules || [
      { days: 7, amount_threshold: 0, action: 'reminder_email' },
      { days: 30, amount_threshold: 500, action: 'formal_notice' },
      { days: 60, amount_threshold: 1000, action: 'collections_call' },
      { days: 90, amount_threshold: 0, action: 'legal_review' }
    ];

    // Find applicable rule
    const applicableRule = escalationRules
      .filter(rule => daysOverdue >= rule.days && amount >= rule.amount_threshold)
      .sort((a, b) => b.days - a.days)[0]; // Get most recent applicable rule

    if (applicableRule) {
      return {
        invoice_id: invoice.invoice_id,
        contact_name: invoice.contact_name,
        amount: amount,
        days_overdue: daysOverdue,
        action: applicableRule.action,
        priority: this.calculatePriority(amount, daysOverdue)
      };
    }

    return null;
  }

  calculateDaysOverdue(dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today - due;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculatePriority(amount, daysOverdue) {
    if (amount > 5000 || daysOverdue > 60) return 'high';
    if (amount > 1000 || daysOverdue > 30) return 'medium';
    return 'low';
  }

  async logCollectionAction(invoice, action) {
    const { error } = await this.supabase
      .from('collections_actions')
      .insert({
        invoice_id: invoice.invoice_id,
        contact_name: invoice.contact_name,
        amount_outstanding: action.amount,
        days_overdue: action.days_overdue,
        action_type: action.action,
        priority: action.priority,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log collection action:', error);
    }
  }

  async sendCollectionsSummary(actions) {
    const highPriority = actions.filter(a => a.priority === 'high');
    const totalOverdue = actions.reduce((sum, a) => sum + a.amount, 0);

    const message = `📞 Collections Review Summary\\n\\n` +
      `Total Actions Required: ${actions.length}\\n` +
      `High Priority: ${highPriority.length}\\n` +
      `Total Overdue Amount: ${this.formatCurrency(totalOverdue)}\\n\\n` +
      `Action Breakdown:\\n${this.formatActionBreakdown(actions)}`;

    await this.orchestrator.sendNotification(
      this.policy.notifications.slack_channel,
      message,
      [
        { text: 'View Collections Dashboard', url: '/finance/collections' },
        { text: 'Priority Actions', url: '/finance/collections?priority=high' }
      ]
    );
  }

  formatActionBreakdown(actions) {
    const breakdown = {};
    actions.forEach(action => {
      if (!breakdown[action.action]) {
        breakdown[action.action] = { count: 0, amount: 0 };
      }
      breakdown[action.action].count++;
      breakdown[action.action].amount += action.amount;
    });

    return Object.entries(breakdown)
      .map(([actionType, data]) =>
        `• ${actionType}: ${data.count} (${this.formatCurrency(data.amount)})`
      )
      .join('\\n');
  }

  async processPaymentReceived(paymentPayload) {
    const { invoiceId, amount, paymentDate, reference } = paymentPayload;

    try {
      // Update invoice status
      await this.updateInvoicePayment(invoiceId, amount, paymentDate);

      // Close any open collection actions for this invoice
      await this.closeCollectionActions(invoiceId);

      await this.logAgentAction({
        action: 'payment_processed',
        invoice_id: invoiceId,
        amount,
        payment_date: paymentDate
      });

      return {
        status: 'payment_processed',
        invoiceId,
        amount
      };

    } catch (error) {
      console.error('Payment processing error:', error);
      await this.handleProcessingError(invoiceId, error);
      throw error;
    }
  }

  async updateInvoicePayment(invoiceId, amount, paymentDate) {
    const { data: invoice } = await this.supabase
      .from('xero_invoices')
      .select('amount_outstanding')
      .eq('invoice_id', invoiceId)
      .single();

    if (invoice) {
      const newOutstanding = Math.max(0, invoice.amount_outstanding - amount);

      await this.supabase
        .from('xero_invoices')
        .update({
          amount_outstanding: newOutstanding,
          status: newOutstanding === 0 ? 'PAID' : 'AUTHORISED',
          last_payment_date: paymentDate,
          updated_at: new Date().toISOString()
        })
        .eq('invoice_id', invoiceId);
    }
  }

  async closeCollectionActions(invoiceId) {
    await this.supabase
      .from('collections_actions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('invoice_id', invoiceId)
      .eq('status', 'pending');
  }

  async generateAgingReport() {
    const today = new Date().toISOString().split('T')[0];

    // Get all outstanding invoices
    const { data: invoices } = await this.supabase
      .from('xero_invoices')
      .select('*')
      .eq('status', 'AUTHORISED')
      .gt('amount_outstanding', 0);

    // Age buckets
    const aging = {
      current: { count: 0, amount: 0 },
      days_1_30: { count: 0, amount: 0 },
      days_31_60: { count: 0, amount: 0 },
      days_61_90: { count: 0, amount: 0 },
      days_90_plus: { count: 0, amount: 0 }
    };

    invoices?.forEach(invoice => {
      const daysOverdue = this.calculateDaysOverdue(invoice.due_date);
      const amount = invoice.amount_outstanding;

      if (daysOverdue <= 0) {
        aging.current.count++;
        aging.current.amount += amount;
      } else if (daysOverdue <= 30) {
        aging.days_1_30.count++;
        aging.days_1_30.amount += amount;
      } else if (daysOverdue <= 60) {
        aging.days_31_60.count++;
        aging.days_31_60.amount += amount;
      } else if (daysOverdue <= 90) {
        aging.days_61_90.count++;
        aging.days_61_90.amount += amount;
      } else {
        aging.days_90_plus.count++;
        aging.days_90_plus.amount += amount;
      }
    });

    const totalOutstanding = Object.values(aging).reduce((sum, bucket) => sum + bucket.amount, 0);

    return {
      generated_at: new Date().toISOString(),
      total_outstanding: totalOutstanding,
      total_invoices: invoices?.length || 0,
      aging_buckets: aging,
      collection_efficiency: await this.calculateCollectionEfficiency()
    };
  }

  async calculateCollectionEfficiency() {
    // Simple calculation - would be more sophisticated in real implementation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: actions } = await this.supabase
      .from('collections_actions')
      .select('status')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (!actions || actions.length === 0) return 100;

    const completed = actions.filter(a => a.status === 'completed').length;
    return Math.round((completed / actions.length) * 100);
  }

  async getMetrics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get overdue invoices
    const overdueInvoices = await this.getOverdueInvoices();

    // Get recent collection actions
    const { data: recentActions } = await this.supabase
      .from('collections_actions')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.amount_outstanding, 0);

    return {
      total_overdue_invoices: overdueInvoices.length,
      total_overdue_amount: totalOverdue,
      avg_days_overdue: this.calculateAverageDaysOverdue(overdueInvoices),
      collection_actions_30d: recentActions?.length || 0,
      collection_efficiency: await this.calculateCollectionEfficiency()
    };
  }

  calculateAverageDaysOverdue(invoices) {
    if (!invoices || invoices.length === 0) return 0;

    const totalDays = invoices.reduce((sum, inv) => sum + this.calculateDaysOverdue(inv.due_date), 0);
    return Math.round(totalDays / invoices.length);
  }
}

export default ARCollectionsAgent;