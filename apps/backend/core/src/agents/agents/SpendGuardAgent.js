/**
 * Spend Guard Agent
 * Implements expense control and budget monitoring
 */

import BaseFinancialAgent from './BaseFinancialAgent.js';

class SpendGuardAgent extends BaseFinancialAgent {
  constructor(orchestrator) {
    super('SpendGuardAgent', orchestrator);
  }

  async reviewTransaction(transactionPayload) {
    const { transactionId, amount, supplier, description, accountCode } = transactionPayload;

    try {
      // Check against spending rules and budget limits
      const spendAnalysis = await this.analyzeSpend(amount, supplier, description, accountCode);

      if (spendAnalysis.requiresApproval) {
        // Create approval request
        const approval = await this.requestApproval('large_expense', {
          transactionId,
          amount,
          supplier,
          reason: spendAnalysis.reason,
          budgetImpact: spendAnalysis.budgetImpact
        });

        await this.logAgentAction({
          action: 'spend_approval_requested',
          transaction_id: transactionId,
          amount,
          reason: spendAnalysis.reason,
          approval_id: approval.id
        });

        return {
          status: 'approval_required',
          approvalId: approval.id,
          reason: spendAnalysis.reason
        };
      } else if (spendAnalysis.hasWarnings) {
        // Log warning but allow transaction
        await this.sendSpendWarning(spendAnalysis.warnings, transactionPayload);

        return {
          status: 'approved_with_warnings',
          warnings: spendAnalysis.warnings
        };
      } else {
        // Pre-approved transaction
        return {
          status: 'pre_approved',
          budgetRemaining: spendAnalysis.budgetRemaining
        };
      }

    } catch (error) {
      console.error('Spend guard review error:', error);
      await this.handleProcessingError(transactionId, error);
      throw error;
    }
  }

  async analyzeSpend(amount, supplier, description, accountCode) {
    const analysis = {
      requiresApproval: false,
      hasWarnings: false,
      warnings: [],
      reason: null,
      budgetImpact: null,
      budgetRemaining: null
    };

    const absAmount = Math.abs(amount);

    // Check individual transaction limits
    if (absAmount > this.policy.spending.auto_approve_limit) {
      analysis.requiresApproval = true;
      analysis.reason = `Amount ${this.formatCurrency(absAmount)} exceeds auto-approval limit of ${this.formatCurrency(this.policy.spending.auto_approve_limit)}`;
    }

    // Check monthly budget limits
    const monthlySpend = await this.getMonthlySpend(accountCode);
    const budgetLimit = this.getBudgetLimit(accountCode);

    if (budgetLimit && (monthlySpend + absAmount) > budgetLimit) {
      analysis.requiresApproval = true;
      analysis.reason = `Transaction would exceed monthly budget limit for ${accountCode}`;
      analysis.budgetImpact = {
        current: monthlySpend,
        limit: budgetLimit,
        newTotal: monthlySpend + absAmount,
        overage: (monthlySpend + absAmount) - budgetLimit
      };
    }

    // Check for high-risk suppliers
    const riskAssessment = this.assessSupplierRisk(supplier);
    if (riskAssessment.highRisk) {
      analysis.hasWarnings = true;
      analysis.warnings.push({
        type: 'high_risk_supplier',
        message: riskAssessment.reason,
        severity: 'medium'
      });
    }

    // Check for unusual spending patterns
    const patternAnalysis = await this.analyzeSpendingPattern(supplier, absAmount, accountCode);
    if (patternAnalysis.unusual) {
      analysis.hasWarnings = true;
      analysis.warnings.push({
        type: 'unusual_pattern',
        message: patternAnalysis.reason,
        severity: 'low'
      });
    }

    if (budgetLimit) {
      analysis.budgetRemaining = budgetLimit - (monthlySpend + absAmount);
    }

    return analysis;
  }

  async getMonthlySpend(accountCode) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: transactions } = await this.supabase
      .from('xero_transactions')
      .select('amount')
      .eq('account_code', accountCode)
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0])
      .eq('type', 'SPEND');

    return transactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
  }

  getBudgetLimit(accountCode) {
    // Get budget from policy configuration
    const budgets = this.policy.spending.monthly_budgets || {};
    return budgets[accountCode] || null;
  }

  assessSupplierRisk(supplier) {
    // Check against high-risk supplier patterns
    const riskPatterns = [
      { pattern: 'cash', risk: 'Cash payments are higher risk', level: 'high' },
      { pattern: 'unknown', risk: 'Unknown supplier', level: 'medium' },
      { pattern: 'new', risk: 'New supplier', level: 'low' }
    ];

    const supplierLower = supplier.toLowerCase();

    for (const riskPattern of riskPatterns) {
      if (supplierLower.includes(riskPattern.pattern)) {
        return {
          highRisk: riskPattern.level === 'high',
          reason: riskPattern.risk,
          level: riskPattern.level
        };
      }
    }

    return { highRisk: false };
  }

  async analyzeSpendingPattern(supplier, amount, accountCode) {
    // Get historical spending for this supplier
    const { data: history } = await this.supabase
      .from('xero_transactions')
      .select('amount')
      .ilike('supplier', `%${supplier}%`)
      .eq('account_code', accountCode)
      .order('date', { ascending: false })
      .limit(10);

    if (!history || history.length < 3) {
      return { unusual: false };
    }

    // Calculate average and detect outliers
    const amounts = history.map(tx => Math.abs(tx.amount));
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length);

    // If current amount is more than 2 standard deviations from average, flag as unusual
    if (Math.abs(amount - avgAmount) > (2 * stdDev)) {
      return {
        unusual: true,
        reason: `Amount ${this.formatCurrency(amount)} is unusual compared to historical average of ${this.formatCurrency(avgAmount)} for ${supplier}`
      };
    }

    return { unusual: false };
  }

  async sendSpendWarning(warnings, transaction) {
    const message = `⚠️ Spend Guard Warning\\n\\n` +
      `Transaction: ${this.formatCurrency(transaction.amount)} to ${transaction.supplier}\\n\\n` +
      `Warnings:\\n${warnings.map(w => `• ${w.message}`).join('\\n')}`;

    await this.orchestrator.sendNotification(
      this.policy.notifications.slack_channel,
      message,
      [
        { text: 'Review Transaction', url: `/finance/transactions/${transaction.transactionId}` }
      ]
    );
  }

  async generateMonthlyReport() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all transactions for the month
    const { data: transactions } = await this.supabase
      .from('xero_transactions')
      .select('*')
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0])
      .eq('type', 'SPEND');

    // Calculate budget utilization
    const budgetAnalysis = await this.calculateBudgetUtilization(transactions);

    const report = {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      total_spend: transactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0,
      transaction_count: transactions?.length || 0,
      budget_utilization: budgetAnalysis,
      approval_requests: await this.getApprovalRequestCount('large_expense', monthStart),
      generated_at: new Date().toISOString()
    };

    await this.logAgentAction({
      action: 'monthly_spend_report',
      month: report.month,
      total_spend: report.total_spend,
      approval_requests: report.approval_requests
    });

    return report;
  }

  async calculateBudgetUtilization(transactions) {
    const budgets = this.policy.spending.monthly_budgets || {};
    const utilization = {};

    for (const [accountCode, budgetLimit] of Object.entries(budgets)) {
      const accountSpend = transactions
        ?.filter(tx => tx.account_code === accountCode)
        ?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;

      utilization[accountCode] = {
        budget: budgetLimit,
        spent: accountSpend,
        remaining: budgetLimit - accountSpend,
        utilization_pct: Math.round((accountSpend / budgetLimit) * 100 * 100) / 100
      };
    }

    return utilization;
  }

  async getMetrics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      approvals_required: await this.getApprovalRequestCount('large_expense', thirtyDaysAgo),
      warnings_issued: await this.getWarningCount(thirtyDaysAgo),
      avg_processing_time: '0.3s', // Would be calculated from actual processing times
      budget_alerts: await this.getBudgetAlertCount(thirtyDaysAgo)
    };
  }

  async getWarningCount(since) {
    const { count } = await this.supabase
      .from('agent_actions')
      .select('*', { count: 'exact' })
      .eq('agent_name', 'SpendGuardAgent')
      .eq('action', 'spend_warning_issued')
      .gte('created_at', since.toISOString());

    return count || 0;
  }

  async getBudgetAlertCount(since) {
    const { count } = await this.supabase
      .from('agent_actions')
      .select('*', { count: 'exact' })
      .eq('agent_name', 'SpendGuardAgent')
      .eq('action', 'budget_alert')
      .gte('created_at', since.toISOString());

    return count || 0;
  }
}

export default SpendGuardAgent;