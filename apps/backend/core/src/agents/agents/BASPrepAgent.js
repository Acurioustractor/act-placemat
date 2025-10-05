/**
 * BAS Preparation Agent
 * Generates daily BAS reports and variance detection
 */

import BaseFinancialAgent from './BaseFinancialAgent.js';

class BASPrepAgent extends BaseFinancialAgent {
  constructor(orchestrator) {
    super('BASPrepAgent', orchestrator);
  }

  async generateDailyReport() {
    try {
      const entity = this.policy.entities[0]; // ACT_PTY_LTD
      const currentQuarter = this.getCurrentQuarter();

      // Generate BAS draft for current quarter
      const basDraft = await this.generateBASDraft(entity.code, currentQuarter);

      // Check for variances against previous periods
      const variances = await this.detectVariances(basDraft);

      // Identify risky transactions
      const riskyTransactions = await this.identifyRiskyTransactions(currentQuarter);

      // Update BAS preparation record
      await this.updateBASPreparation({
        entity_code: entity.code,
        quarter: currentQuarter.quarter,
        basDraft,
        variances,
        riskyTransactions
      });

      // Send notifications if variances exceed threshold
      if (variances.some(v => Math.abs(v.percentageChange) > this.policy.bas.variance_threshold_pct)) {
        await this.sendVarianceAlert(variances, currentQuarter);
      }

      await this.logAgentAction({
        action: 'daily_bas_prep',
        quarter: currentQuarter.quarter,
        gst_collected: basDraft.gstCollected,
        gst_paid: basDraft.gstPaid,
        variance_count: variances.length
      });

      return {
        status: 'completed',
        quarter: currentQuarter.quarter,
        basDraft,
        variances,
        riskyTransactionCount: riskyTransactions.length
      };

    } catch (error) {
      console.error('BAS daily report generation error:', error);
      await this.handleProcessingError('bas_daily_report', error);
      throw error;
    }
  }

  getCurrentQuarter() {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const year = now.getFullYear();

    let quarter, startMonth, endMonth;

    if (month <= 3) {
      quarter = 'Q1';
      startMonth = 1;
      endMonth = 3;
    } else if (month <= 6) {
      quarter = 'Q2';
      startMonth = 4;
      endMonth = 6;
    } else if (month <= 9) {
      quarter = 'Q3';
      startMonth = 7;
      endMonth = 9;
    } else {
      quarter = 'Q4';
      startMonth = 10;
      endMonth = 12;
    }

    return {
      quarter: `${year}${quarter}`,
      year,
      startDate: new Date(year, startMonth - 1, 1).toISOString().split('T')[0],
      endDate: new Date(year, endMonth, 0).toISOString().split('T')[0]
    };
  }

  async generateBASDraft(entityCode, quarterInfo) {
    // Get transactions for the quarter
    const { data: transactions } = await this.supabase
      .from('xero_transactions')
      .select('*')
      .gte('date', quarterInfo.startDate)
      .lte('date', quarterInfo.endDate)
      .eq('status', 'AUTHORISED');

    // Calculate GST collected (from sales)
    const gstCollected = this.calculateGSTCollected(transactions);

    // Calculate GST paid (from purchases)
    const gstPaid = this.calculateGSTPaid(transactions);

    // Calculate net GST position
    const netGST = gstCollected - gstPaid;

    // Calculate PAYG withholding (if applicable)
    const paygWithholding = this.calculatePAYGWithholding(quarterInfo);

    return {
      entityCode,
      quarter: quarterInfo.quarter,
      periodStart: quarterInfo.startDate,
      periodEnd: quarterInfo.endDate,
      gstCollected: Math.round(gstCollected * 100) / 100,
      gstPaid: Math.round(gstPaid * 100) / 100,
      netGST: Math.round(netGST * 100) / 100,
      paygWithholding: Math.round(paygWithholding * 100) / 100,
      transactionCount: transactions?.length || 0,
      generatedAt: new Date().toISOString()
    };
  }

  calculateGSTCollected(transactions) {
    // GST collected from sales (invoices with GST)
    const salesTransactions = transactions?.filter(tx =>
      tx.type === 'RECEIVE' && tx.tax_amount > 0
    ) || [];

    return salesTransactions.reduce((sum, tx) => sum + (tx.tax_amount || 0), 0);
  }

  calculateGSTPaid(transactions) {
    // GST paid on purchases (bills with GST)
    const purchaseTransactions = transactions?.filter(tx =>
      tx.type === 'SPEND' && tx.tax_amount > 0
    ) || [];

    return purchaseTransactions.reduce((sum, tx) => sum + Math.abs(tx.tax_amount || 0), 0);
  }

  calculatePAYGWithholding(quarterInfo) {
    // For now, return 0 - would integrate with payroll system
    // In a real implementation, this would calculate PAYG withholding from payroll
    return 0;
  }

  async detectVariances(currentDraft) {
    const variances = [];

    // Get previous quarter for comparison
    const prevQuarter = this.getPreviousQuarter(currentDraft.quarter);
    const { data: prevBAS } = await this.supabase
      .from('bas_preparations')
      .select('*')
      .eq('entity_code', currentDraft.entityCode)
      .eq('bas_quarter', prevQuarter)
      .single();

    if (prevBAS) {
      // Check GST collected variance
      const gstCollectedVariance = this.calculateVariance(
        currentDraft.gstCollected,
        prevBAS.gst_collected,
        'GST Collected'
      );
      if (Math.abs(gstCollectedVariance.percentageChange) > this.policy.bas.variance_threshold_pct) {
        variances.push(gstCollectedVariance);
      }

      // Check GST paid variance
      const gstPaidVariance = this.calculateVariance(
        currentDraft.gstPaid,
        prevBAS.gst_paid,
        'GST Paid'
      );
      if (Math.abs(gstPaidVariance.percentageChange) > this.policy.bas.variance_threshold_pct) {
        variances.push(gstPaidVariance);
      }

      // Check net GST variance
      const netGSTVariance = this.calculateVariance(
        currentDraft.netGST,
        prevBAS.net_gst,
        'Net GST'
      );
      if (Math.abs(netGSTVariance.percentageChange) > this.policy.bas.variance_threshold_pct) {
        variances.push(netGSTVariance);
      }
    }

    return variances;
  }

  calculateVariance(current, previous, metric) {
    const change = current - previous;
    const percentageChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

    return {
      metric,
      current,
      previous,
      change: Math.round(change * 100) / 100,
      percentageChange: Math.round(percentageChange * 100) / 100
    };
  }

  getPreviousQuarter(currentQuarter) {
    const year = parseInt(currentQuarter.substring(0, 4));
    const quarter = currentQuarter.substring(4);

    switch (quarter) {
      case 'Q1':
        return `${year - 1}Q4`;
      case 'Q2':
        return `${year}Q1`;
      case 'Q3':
        return `${year}Q2`;
      case 'Q4':
        return `${year}Q3`;
      default:
        return null;
    }
  }

  async identifyRiskyTransactions(quarterInfo) {
    const { data: transactions } = await this.supabase
      .from('xero_transactions')
      .select('*')
      .gte('date', quarterInfo.startDate)
      .lte('date', quarterInfo.endDate);

    const riskyTransactions = [];

    transactions?.forEach(tx => {
      const risks = [];

      // Check for unusual GST codes
      if (tx.tax_code && !this.isStandardGSTCode(tx.tax_code)) {
        risks.push('unusual_gst_code');
      }

      // Check for missing ABN on large transactions
      if (Math.abs(tx.amount) > 1000 && !tx.supplier_abn) {
        risks.push('missing_abn');
      }

      // Check for large adjustments
      if (Math.abs(tx.amount) > 5000) {
        risks.push('large_amount');
      }

      // Check for transactions without proper categorization
      if (!tx.account_code || tx.account_code === '000') {
        risks.push('uncategorized');
      }

      if (risks.length > 0) {
        riskyTransactions.push({
          transactionId: tx.id,
          amount: tx.amount,
          description: tx.description,
          risks,
          riskScore: risks.length
        });
      }
    });

    // Sort by risk score (highest first)
    return riskyTransactions.sort((a, b) => b.riskScore - a.riskScore);
  }

  isStandardGSTCode(taxCode) {
    const standardCodes = [
      'GST on Expenses',
      'GST on Income',
      'GST Free Expenses',
      'GST Free Income',
      'Input Taxed',
      'No GST'
    ];

    return standardCodes.includes(taxCode);
  }

  async updateBASPreparation(data) {
    const basRecord = {
      entity_code: data.entity_code,
      bas_quarter: data.quarter,
      period_start: data.basDraft.periodStart,
      period_end: data.basDraft.periodEnd,
      gst_collected: data.basDraft.gstCollected,
      gst_paid: data.basDraft.gstPaid,
      net_gst: data.basDraft.netGST,
      payg_withholding: data.basDraft.paygWithholding,
      variance_from_previous: data.variances.length > 0 ?
        Math.max(...data.variances.map(v => Math.abs(v.percentageChange))) : 0,
      risk_transactions: JSON.stringify(data.riskyTransactions),
      status: 'draft',
      prepared_by_agent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('bas_preparations')
      .upsert(basRecord, { onConflict: 'entity_code,bas_quarter' });

    if (error) {
      throw new Error(`Failed to update BAS preparation: ${error.message}`);
    }
  }

  async sendVarianceAlert(variances, quarterInfo) {
    const significantVariances = variances.filter(v =>
      Math.abs(v.percentageChange) > this.policy.bas.variance_threshold_pct
    );

    const message = `🚨 BAS Variance Alert - ${quarterInfo.quarter}\n\n` +
      significantVariances.map(v =>
        `${v.metric}: ${v.percentageChange > 0 ? '+' : ''}${v.percentageChange.toFixed(1)}% ` +
        `(${this.formatCurrency(v.previous)} → ${this.formatCurrency(v.current)})`
      ).join('\n');

    await this.orchestrator.sendNotification(
      this.policy.notifications.slack_channel,
      message,
      [
        { text: 'Review BAS', url: '/finance/bas/review' },
        { text: 'View Details', url: `/finance/bas/${quarterInfo.quarter}` }
      ]
    );
  }

  async getMetrics() {
    const currentQuarter = this.getCurrentQuarter();

    // Get BAS preparation data
    const { data: basData } = await this.supabase
      .from('bas_preparations')
      .select('*')
      .eq('bas_quarter', currentQuarter.quarter)
      .single();

    return {
      current_quarter: currentQuarter.quarter,
      bas_status: basData?.status || 'not_prepared',
      gst_collected: basData?.gst_collected || 0,
      gst_paid: basData?.gst_paid || 0,
      net_gst: basData?.net_gst || 0,
      variance_percentage: basData?.variance_from_previous || 0,
      risk_transaction_count: basData?.risk_transactions ?
        JSON.parse(basData.risk_transactions).length : 0,
      last_updated: basData?.updated_at
    };
  }
}

export default BASPrepAgent;