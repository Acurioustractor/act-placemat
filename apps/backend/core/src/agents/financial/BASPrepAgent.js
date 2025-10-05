/**
 * BAS Prep & Check Agent
 * 
 * Automatically prepares Business Activity Statement (BAS) data with
 * variance checking, exception detection, and compliance validation.
 * Generates ready-to-review BAS packs but never auto-lodges.
 */

import { BaseAgent } from '../base/BaseAgent.js';
import { getXeroAgentIntegration } from '../../services/xeroAgentIntegration.js';
import { format, startOfQuarter, endOfQuarter, differenceInDays } from 'date-fns';

export class BASPrepAgent extends BaseAgent {
  constructor() {
    super({
      name: 'BASPrepAgent',
      description: 'Prepares and validates BAS data with exception detection',
      version: '1.0.0',
      enabled: true
    });
    
    // Xero integration
    this.xeroIntegration = getXeroAgentIntegration();
    
    // BAS tracking
    this.currentBAS = null;
    this.previousBAS = {};
    
    // Register event handlers
    this.on('daily', this.performDailyCheck.bind(this));
    this.on('month_end', this.generateMonthEndBAS.bind(this));
    this.on('quarter_end', this.generateQuarterlyBAS.bind(this));
    
    this.logger.info('📊 BAS Prep & Check Agent initialized');
  }
  
  /**
   * Perform daily BAS check
   */
  async performDailyCheck(event) {
    try {
      const today = new Date();
      const currentQuarter = this.getCurrentQuarter(today);
      
      // Check if we're approaching BAS deadline
      const daysUntilDeadline = this.getDaysUntilBASDeadline(today);
      
      if (daysUntilDeadline <= 14 && daysUntilDeadline > 0) {
        this.logger.info(`BAS deadline approaching: ${daysUntilDeadline} days`);
        
        // Generate draft BAS for review
        const basData = await this.prepareBASData(currentQuarter);
        await this.validateBASData(basData);
        
        // Notify if issues found
        if (basData.exceptions.length > 0) {
          this.emit('approval_required', {
            type: 'bas_exceptions',
            period: currentQuarter,
            exceptions: basData.exceptions,
            daysUntilDeadline
          });
        }
      }
      
      // Update live BAS tracking
      await this.updateLiveBAS();
      
      return {
        status: 'daily_check_complete',
        daysUntilDeadline,
        currentQuarter
      };
      
    } catch (error) {
      this.logger.error('Daily BAS check failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate month-end BAS report
   */
  async generateMonthEndBAS(event) {
    try {
      const period = event.data.period || this.getCurrentMonth();
      
      this.logger.info(`Generating month-end BAS report for ${period}`);
      
      const basData = await this.prepareBASData(period, 'monthly');
      const validation = await this.validateBASData(basData);
      
      // Store month-end snapshot
      await this.storeBASSnapshot(period, basData);
      
      return {
        status: 'month_end_bas_complete',
        period,
        summary: basData.summary,
        validation
      };
      
    } catch (error) {
      this.logger.error('Month-end BAS generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate quarterly BAS
   */
  async generateQuarterlyBAS(event) {
    try {
      const quarter = event.data.period || this.getCurrentQuarter();
      
      this.logger.info(`Generating quarterly BAS for ${quarter}`);
      
      // Prepare comprehensive BAS data
      const basData = await this.prepareBASData(quarter);
      
      // Perform validations
      const validation = await this.validateBASData(basData);
      const variance = await this.checkVariance(basData, quarter);
      const risks = await this.assessRisks(basData);
      
      // Generate BAS pack
      const basPack = {
        period: quarter,
        generated: new Date().toISOString(),
        data: basData,
        validation,
        variance,
        risks,
        status: 'ready_for_review'
      };
      
      // Store BAS data
      await this.storeBASData(quarter, basPack);
      
      // Notify that BAS is ready
      this.emit('bas_ready', {
        period: quarter,
        entity: basData.entity,
        gstCollected: basData.summary.gstCollected,
        gstPaid: basData.summary.gstPaid,
        paygWithheld: basData.summary.paygWithheld,
        exceptionCount: basData.exceptions.length
      });
      
      return basPack;
      
    } catch (error) {
      this.logger.error('Quarterly BAS generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Prepare BAS data from various sources
   */
  async prepareBASData(period, frequency = 'quarterly') {
    const { startDate, endDate } = this.getPeriodDates(period, frequency);
    
    // Fetch BAS data from Xero
    const xeroData = await this.xeroIntegration.getBASData(startDate, endDate);
    
    // Extract data from Xero response
    const sales = xeroData.invoices || [];
    const purchases = xeroData.bills || [];
    const bankTransactions = xeroData.bankTransactions || [];
    const payroll = []; // TODO: Get payroll data from Xero if available
    
    // Calculate GST amounts
    const gstCollected = this.calculateGSTCollected(sales);
    const gstPaid = this.calculateGSTPaid(purchases);
    const netGST = gstCollected - gstPaid;
    
    // Calculate PAYG withholding
    const paygWithheld = this.calculatePAYGWithheld(payroll);
    
    // Identify exceptions
    const exceptions = await this.identifyExceptions({
      sales,
      purchases,
      payroll,
      bankTransactions
    });
    
    return {
      period,
      entity: 'ACT_PTY_LTD',
      dates: { startDate, endDate },
      sales: {
        invoices: sales,
        count: sales.length,
        total: sales.reduce((sum, inv) => sum + inv.total_amount, 0),
        gstCollected
      },
      purchases: {
        bills: purchases,
        count: purchases.length,
        total: purchases.reduce((sum, bill) => sum + bill.total_amount, 0),
        gstPaid
      },
      payroll: {
        runs: payroll,
        count: payroll.length,
        totalWages: payroll.reduce((sum, pay) => sum + pay.gross_amount, 0),
        paygWithheld
      },
      summary: {
        gstCollected,
        gstPaid,
        netGST,
        paygWithheld,
        totalPayable: netGST + paygWithheld
      },
      exceptions,
      unreconciled: bankTransactions.filter(t => !t.reconciled)
    };
  }
  
  /**
   * Validate BAS data
   */
  async validateBASData(basData) {
    const validationResults = [];
    
    // Check for missing tax codes
    const missingTaxCodes = [
      ...basData.sales.invoices.filter(inv => !inv.tax_code && inv.tax_amount > 0),
      ...basData.purchases.bills.filter(bill => !bill.tax_code && bill.tax_amount > 0)
    ];
    
    if (missingTaxCodes.length > 0) {
      validationResults.push({
        type: 'missing_tax_codes',
        severity: 'high',
        count: missingTaxCodes.length,
        message: `${missingTaxCodes.length} transactions missing tax codes`
      });
    }
    
    // Check GST rates
    const invalidGSTRates = this.checkGSTRates(basData);
    if (invalidGSTRates.length > 0) {
      validationResults.push({
        type: 'invalid_gst_rates',
        severity: 'medium',
        count: invalidGSTRates.length,
        items: invalidGSTRates
      });
    }
    
    // Check for missing ABNs on high-value purchases
    const missingABNs = basData.purchases.bills.filter(
      bill => bill.total_amount > 1000 && !bill.supplier_abn
    );
    
    if (missingABNs.length > 0) {
      validationResults.push({
        type: 'missing_supplier_abn',
        severity: 'medium',
        count: missingABNs.length,
        totalAmount: missingABNs.reduce((sum, b) => sum + b.total_amount, 0)
      });
    }
    
    // Check unreconciled transactions
    if (basData.unreconciled.length > 0) {
      validationResults.push({
        type: 'unreconciled_transactions',
        severity: 'low',
        count: basData.unreconciled.length,
        message: 'Bank transactions need reconciliation'
      });
    }
    
    return {
      valid: validationResults.filter(r => r.severity === 'high').length === 0,
      warnings: validationResults.filter(r => r.severity === 'medium'),
      info: validationResults.filter(r => r.severity === 'low'),
      all: validationResults
    };
  }
  
  /**
   * Check variance against previous periods
   */
  async checkVariance(basData, period) {
    try {
      const previousPeriod = this.getPreviousPeriod(period);
      const previousBAS = await this.fetchPreviousBAS(previousPeriod);
      
      if (!previousBAS) {
        return { status: 'no_comparison_available' };
      }
      
      const variances = {
        gstCollected: this.calculateVariance(
          basData.summary.gstCollected,
          previousBAS.summary.gstCollected
        ),
        gstPaid: this.calculateVariance(
          basData.summary.gstPaid,
          previousBAS.summary.gstPaid
        ),
        paygWithheld: this.calculateVariance(
          basData.summary.paygWithheld,
          previousBAS.summary.paygWithheld
        ),
        totalPayable: this.calculateVariance(
          basData.summary.totalPayable,
          previousBAS.summary.totalPayable
        )
      };
      
      // Get threshold from policy
      const thresholds = await this.policy.getThresholds();
      const alertThreshold = thresholds.variance_alert_pct || 0.2;
      
      // Identify significant variances
      const alerts = [];
      for (const [key, variance] of Object.entries(variances)) {
        if (Math.abs(variance.percentage) > alertThreshold) {
          alerts.push({
            metric: key,
            current: variance.current,
            previous: variance.previous,
            change: variance.change,
            percentage: (variance.percentage * 100).toFixed(1) + '%'
          });
        }
      }
      
      return {
        period: previousPeriod,
        variances,
        alerts,
        hasSignificantVariance: alerts.length > 0
      };
      
    } catch (error) {
      this.logger.error('Variance check failed:', error);
      return { status: 'variance_check_failed', error: error.message };
    }
  }
  
  /**
   * Assess risks in BAS data
   */
  async assessRisks(basData) {
    const risks = [];
    
    // Large individual transactions
    const largeTransactions = [
      ...basData.sales.invoices.filter(inv => inv.total_amount > 10000),
      ...basData.purchases.bills.filter(bill => bill.total_amount > 10000)
    ];
    
    if (largeTransactions.length > 0) {
      risks.push({
        type: 'large_transactions',
        level: 'medium',
        count: largeTransactions.length,
        description: 'Large transactions may require additional review'
      });
    }
    
    // Unusual patterns
    const gstRate = basData.summary.gstCollected / (basData.sales.total - basData.summary.gstCollected);
    if (gstRate < 0.09 || gstRate > 0.11) {
      risks.push({
        type: 'unusual_gst_rate',
        level: 'high',
        rate: (gstRate * 100).toFixed(2) + '%',
        description: 'Overall GST rate outside normal range'
      });
    }
    
    // Late lodgement risk
    const daysUntilDeadline = this.getDaysUntilBASDeadline(new Date());
    if (daysUntilDeadline < 7) {
      risks.push({
        type: 'deadline_approaching',
        level: 'high',
        daysRemaining: daysUntilDeadline,
        description: 'BAS deadline approaching'
      });
    }
    
    return risks;
  }
  
  /**
   * Identify exceptions in BAS data
   */
  async identifyExceptions(data) {
    const exceptions = [];
    
    // Check each invoice for issues
    data.sales.forEach(invoice => {
      if (!invoice.tax_code && invoice.tax_amount > 0) {
        exceptions.push({
          type: 'missing_tax_code',
          document: 'invoice',
          id: invoice.id,
          reference: invoice.invoice_number,
          amount: invoice.total_amount,
          description: 'Invoice has GST but no tax code specified'
        });
      }
      
      // Check GST calculation
      const expectedGST = invoice.total_amount * 0.0909; // 10/110
      if (invoice.tax_amount && Math.abs(invoice.tax_amount - expectedGST) > 0.01) {
        const actualRate = (invoice.tax_amount / (invoice.total_amount - invoice.tax_amount)) * 100;
        exceptions.push({
          type: 'gst_calculation_mismatch',
          document: 'invoice',
          id: invoice.id,
          reference: invoice.invoice_number,
          expectedGST: expectedGST.toFixed(2),
          actualGST: invoice.tax_amount,
          actualRate: actualRate.toFixed(2) + '%',
          description: `GST rate is ${actualRate.toFixed(2)}% instead of 10%`
        });
      }
    });
    
    // Check bills
    data.purchases.forEach(bill => {
      if (!bill.supplier_abn && bill.total_amount > 75) {
        exceptions.push({
          type: 'missing_supplier_abn',
          document: 'bill',
          id: bill.id,
          reference: bill.bill_number,
          supplier: bill.supplier_name,
          amount: bill.total_amount,
          description: 'Supplier ABN required for tax invoices over $75'
        });
      }
    });
    
    // Check for duplicate transactions
    const duplicates = this.findDuplicateTransactions(data);
    duplicates.forEach(dup => {
      exceptions.push({
        type: 'potential_duplicate',
        documents: dup.ids,
        amount: dup.amount,
        description: `Potential duplicate transactions with same amount on same date`
      });
    });
    
    return exceptions;
  }
  
  /**
   * Update live BAS tracking
   */
  async updateLiveBAS() {
    const currentQuarter = this.getCurrentQuarter();
    const { startDate } = this.getPeriodDates(currentQuarter);
    
    // Only update if we're in the current quarter
    if (new Date() >= startDate) {
      const basData = await this.prepareBASData(currentQuarter);
      this.currentBAS = {
        updated: new Date().toISOString(),
        data: basData.summary
      };
      
      // Store in database for dashboard access
      await this.supabase
        .from('bas_reconciliation')
        .upsert({
          period: currentQuarter,
          entity: 'ACT_PTY_LTD',
          ...basData.summary,
          status: 'draft',
          generated_at: new Date().toISOString()
        });
    }
  }
  
  /**
   * Fetch sales data (using Xero integration)
   */
  async fetchSalesData(startDate, endDate) {
    const xeroData = await this.xeroIntegration.getBASData(startDate, endDate);
    return xeroData.invoices || [];
  }
  
  /**
   * Fetch purchase data (using Xero integration)
   */
  async fetchPurchaseData(startDate, endDate) {
    const xeroData = await this.xeroIntegration.getBASData(startDate, endDate);
    return xeroData.bills || [];
  }
  
  /**
   * Fetch payroll data (placeholder - would need payroll API integration)
   */
  async fetchPayrollData(startDate, endDate) {
    // TODO: Integrate with Xero Payroll API when available
    return [];
  }
  
  /**
   * Fetch bank transactions
   */
  async fetchBankTransactions(startDate, endDate) {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Calculate GST collected from sales
   */
  calculateGSTCollected(sales) {
    return sales.reduce((sum, invoice) => sum + (invoice.tax_amount || 0), 0);
  }
  
  /**
   * Calculate GST paid on purchases
   */
  calculateGSTPaid(purchases) {
    return purchases.reduce((sum, bill) => sum + (bill.tax_amount || 0), 0);
  }
  
  /**
   * Calculate PAYG withheld
   */
  calculatePAYGWithheld(payroll) {
    return payroll.reduce((sum, pay) => sum + (pay.tax_withheld || 0), 0);
  }
  
  /**
   * Check GST rates
   */
  checkGSTRates(basData) {
    const invalidRates = [];
    
    const checkRate = (items, type) => {
      items.forEach(item => {
        if (item.tax_amount && item.total_amount) {
          const rate = (item.tax_amount / (item.total_amount - item.tax_amount)) * 100;
          if (Math.abs(rate - 10) > 0.5) {
            invalidRates.push({
              type,
              id: item.id,
              reference: item.invoice_number || item.bill_number,
              rate: rate.toFixed(2) + '%'
            });
          }
        }
      });
    };
    
    checkRate(basData.sales.invoices, 'invoice');
    checkRate(basData.purchases.bills, 'bill');
    
    return invalidRates;
  }
  
  /**
   * Find duplicate transactions
   */
  findDuplicateTransactions(data) {
    const duplicates = [];
    const transactions = [
      ...data.sales.map(s => ({ ...s, type: 'sale' })),
      ...data.purchases.map(p => ({ ...p, type: 'purchase' }))
    ];
    
    // Group by amount and date
    const groups = {};
    transactions.forEach(t => {
      const key = `${t.total_amount}-${t.date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    
    // Find groups with multiple transactions
    Object.values(groups).forEach(group => {
      if (group.length > 1) {
        duplicates.push({
          amount: group[0].total_amount,
          date: group[0].date,
          ids: group.map(g => g.id),
          types: group.map(g => g.type)
        });
      }
    });
    
    return duplicates;
  }
  
  /**
   * Calculate variance
   */
  calculateVariance(current, previous) {
    const change = current - previous;
    const percentage = previous !== 0 ? change / previous : 0;
    
    return {
      current,
      previous,
      change,
      percentage
    };
  }
  
  /**
   * Store BAS data
   */
  async storeBASData(period, basPack) {
    try {
      await this.supabase
        .from('bas_reconciliation')
        .upsert({
          period,
          entity: basPack.data.entity,
          ...basPack.data.summary,
          validation_results: basPack.validation,
          variance_results: basPack.variance,
          risk_assessment: basPack.risks,
          status: basPack.status,
          generated_at: basPack.generated
        });
        
      // Also store full data for audit trail
      await this.logAuditEvent('bas_generated', {
        period,
        summary: basPack.data.summary,
        exceptionCount: basPack.data.exceptions.length
      });
      
    } catch (error) {
      this.logger.error('Failed to store BAS data:', error);
      throw error;
    }
  }
  
  /**
   * Store BAS snapshot (for month-end)
   */
  async storeBASSnapshot(period, basData) {
    const key = `bas_snapshot_${period}`;
    this.previousBAS[key] = {
      period,
      timestamp: new Date().toISOString(),
      summary: basData.summary,
      counts: {
        sales: basData.sales.count,
        purchases: basData.purchases.count,
        payroll: basData.payroll.count
      }
    };
  }
  
  /**
   * Fetch previous BAS data
   */
  async fetchPreviousBAS(period) {
    const { data, error } = await this.supabase
      .from('bas_reconciliation')
      .select('*')
      .eq('period', period)
      .single();
    
    if (error || !data) {
      // Try snapshot
      const key = `bas_snapshot_${period}`;
      return this.previousBAS[key];
    }
    
    return {
      summary: {
        gstCollected: data.gst_collected,
        gstPaid: data.gst_paid,
        paygWithheld: data.payg_withheld,
        totalPayable: data.total_payable
      }
    };
  }
  
  /**
   * Get current quarter
   */
  getCurrentQuarter(date = new Date()) {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}Q${quarter}`;
  }
  
  /**
   * Get current month
   */
  getCurrentMonth(date = new Date()) {
    return format(date, 'yyyy-MM');
  }
  
  /**
   * Get previous period
   */
  getPreviousPeriod(period) {
    if (period.includes('Q')) {
      // Quarterly
      const [year, q] = period.split('Q');
      const quarter = parseInt(q);
      if (quarter === 1) {
        return `${parseInt(year) - 1}Q4`;
      }
      return `${year}Q${quarter - 1}`;
    } else {
      // Monthly
      const date = new Date(period + '-01');
      date.setMonth(date.getMonth() - 1);
      return format(date, 'yyyy-MM');
    }
  }
  
  /**
   * Get period dates
   */
  getPeriodDates(period, frequency = 'quarterly') {
    if (frequency === 'quarterly' && period.includes('Q')) {
      const [year, q] = period.split('Q');
      const quarter = parseInt(q) - 1;
      const startDate = startOfQuarter(new Date(year, quarter * 3));
      const endDate = endOfQuarter(startDate);
      return { startDate, endDate };
    } else {
      // Monthly
      const date = new Date(period + '-01');
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return { startDate, endDate };
    }
  }
  
  /**
   * Get days until BAS deadline
   */
  getDaysUntilBASDeadline(date = new Date()) {
    const quarter = Math.floor(date.getMonth() / 3);
    const year = date.getFullYear();
    
    // BAS is due 28 days after quarter end
    const quarterEnd = endOfQuarter(new Date(year, quarter * 3));
    const deadline = new Date(quarterEnd);
    deadline.setDate(deadline.getDate() + 28);
    
    return differenceInDays(deadline, date);
  }
  
  /**
   * Get agent statistics
   */
  getStatistics() {
    return {
      currentQuarter: this.getCurrentQuarter(),
      daysUntilDeadline: this.getDaysUntilBASDeadline(),
      lastBASUpdate: this.currentBAS?.updated,
      currentBASData: this.currentBAS?.data
    };
  }
}

export default BASPrepAgent;