/**
 * Automated Bookkeeping Bot - Real-time Financial Tracking with Xero
 * Handles transaction categorization, invoice generation, expense management,
 * cash flow prediction, and financial anomaly detection
 */

import { BaseBot } from './baseBot.js';
import XeroClient from 'xero-node';

export class BookkeepingBot extends BaseBot {
  constructor() {
    super({
      id: 'bookkeeping-bot',
      name: 'Automated Bookkeeping Bot',
      description: 'Intelligent bookkeeping with Xero integration and ML categorization',
      capabilities: [
        'transaction-categorization',
        'invoice-generation',
        'expense-management',
        'cash-flow-prediction',
        'anomaly-detection',
        'financial-reporting',
        'receipt-scanning',
        'bank-reconciliation'
      ],
      requiredPermissions: [
        'access:financial-data',
        'modify:transactions',
        'create:invoices',
        'read:bank-feeds'
      ]
    });
    
    // Xero client initialization
    this.xeroClient = null;
    this.initializeXero();
    
    // ML models for categorization
    this.categorizationModel = null;
    this.anomalyDetector = null;
    this.cashFlowPredictor = null;
    
    // Transaction processing state
    this.processingQueue = [];
    this.reconciliationCache = new Map();
    
    // Category mappings (can be customized per tenant)
    this.categoryMappings = this.loadDefaultCategories();
    
    // Financial thresholds
    this.thresholds = {
      highValueTransaction: 10000,
      unusualVariance: 0.3, // 30% variance from normal
      cashFlowWarning: 5000, // Warn if cash drops below this
      anomalyConfidence: 0.85
    };
  }

  /**
   * Initialize Xero client
   */
  async initializeXero() {
    if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET) {
      console.warn('⚠️ Xero credentials not configured');
      return;
    }
    
    try {
      this.xeroClient = new XeroClient({
        clientId: process.env.XERO_CLIENT_ID,
        clientSecret: process.env.XERO_CLIENT_SECRET,
        redirectUris: [process.env.XERO_REDIRECT_URI],
        scopes: [
          'accounting.transactions',
          'accounting.contacts',
          'accounting.settings',
          'accounting.reports.read',
          'accounting.attachments'
        ]
      });
      
      // Initialize with stored tokens if available
      await this.loadXeroTokens();
      
      console.log('✅ Xero client initialized');
    } catch (error) {
      console.error('Failed to initialize Xero:', error);
    }
  }

  /**
   * Main execution method
   */
  async execute(action, params, context) {
    console.log(`💰 Bookkeeping Bot executing: ${action}`);
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (action) {
        case 'categorizeTransaction':
          result = await this.categorizeTransaction(params, context);
          break;
          
        case 'generateInvoice':
          result = await this.generateInvoice(params, context);
          break;
          
        case 'processExpense':
          result = await this.processExpense(params, context);
          break;
          
        case 'predictCashFlow':
          result = await this.predictCashFlow(params, context);
          break;
          
        case 'detectAnomalies':
          result = await this.detectAnomalies(params, context);
          break;
          
        case 'reconcileBank':
          result = await this.reconcileBank(params, context);
          break;
          
        case 'generateFinancialReport':
          result = await this.generateFinancialReport(params, context);
          break;
          
        case 'processReceipt':
          result = await this.processReceipt(params, context);
          break;
          
        case 'getQuarterlyExpenses':
          result = await this.getQuarterlyExpenses(params, context);
          break;
          
        case 'automateBookkeeping':
          result = await this.automateBookkeeping(params, context);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // Update metrics
      this.updateMetrics({
        action,
        success: true,
        duration: Date.now() - startTime
      });
      
      // Audit the action
      await this.audit(action, { params, result }, context);
      
      return result;
      
    } catch (error) {
      console.error(`Bookkeeping action failed: ${error.message}`);
      
      this.updateMetrics({
        action,
        success: false,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  /**
   * Categorize a transaction using ML
   */
  async categorizeTransaction(params, context) {
    const { transaction } = params;
    
    // Extract features for categorization
    const features = this.extractTransactionFeatures(transaction);
    
    // Use ML model for initial categorization
    const mlPrediction = await this.predictCategory(features);
    
    // Apply rule-based overrides
    const rulesCategory = this.applyCategorizationRules(transaction);
    
    // Combine predictions
    const finalCategory = rulesCategory || 
      (mlPrediction.confidence > 0.8 ? mlPrediction.category : null);
    
    // If low confidence, flag for review
    const requiresReview = !finalCategory || mlPrediction.confidence < 0.8;
    
    // Check for high-value transactions
    if (Math.abs(transaction.amount) > this.thresholds.highValueTransaction) {
      await this.notifyHighValueTransaction(transaction, finalCategory, context);
    }
    
    // Store categorization result
    const result = {
      transactionId: transaction.id,
      category: finalCategory || 'UNCATEGORIZED',
      confidence: mlPrediction.confidence,
      requiresReview,
      mlCategory: mlPrediction.category,
      rulesCategory,
      features,
      timestamp: new Date()
    };
    
    // Update in Xero if connected
    if (this.xeroClient && finalCategory) {
      await this.updateXeroTransaction(transaction.id, {
        accountCode: this.mapCategoryToAccount(finalCategory)
      });
    }
    
    // Learn from this categorization if confirmed
    if (params.confirmed) {
      await this.learn(
        { action: 'categorize', params: features },
        { category: finalCategory },
        { correct: params.confirmed }
      );
    }
    
    return result;
  }

  /**
   * Generate an invoice
   */
  async generateInvoice(params, context) {
    const {
      customer,
      items,
      dueDate = this.calculateDueDate(30),
      reference,
      notes
    } = params;
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const gst = subtotal * 0.1; // 10% GST
    const total = subtotal + gst;
    
    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(context.tenantId);
    
    // Create invoice object
    const invoice = {
      type: 'ACCREC',
      contact: {
        contactID: customer.xeroId || null,
        name: customer.name,
        emailAddress: customer.email
      },
      date: new Date(),
      dueDate: new Date(dueDate),
      lineItems: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unitPrice,
        accountCode: item.accountCode || '200', // Sales account
        taxType: 'OUTPUT2' // GST on Income
      })),
      reference: reference || `ACT-${invoiceNumber}`,
      status: 'DRAFT',
      lineAmountTypes: 'Exclusive',
      invoiceNumber,
      currencyCode: 'AUD'
    };
    
    // Add notes if provided
    if (notes) {
      invoice.brandingThemeID = await this.getBrandingTheme(context.tenantId);
      invoice.notes = notes;
    }
    
    // Create in Xero
    let xeroInvoice;
    if (this.xeroClient) {
      try {
        const response = await this.xeroClient.accountingApi.createInvoices(
          context.tenantId,
          { invoices: [invoice] }
        );
        xeroInvoice = response.body.invoices[0];
      } catch (error) {
        console.error('Failed to create invoice in Xero:', error);
      }
    }
    
    // Store in database
    const stored = await this.storeInvoice({
      ...invoice,
      xeroId: xeroInvoice?.invoiceID,
      tenantId: context.tenantId,
      createdBy: context.userId,
      totals: {
        subtotal,
        gst,
        total
      }
    });
    
    // Generate PDF if requested
    let pdfUrl;
    if (params.generatePDF) {
      pdfUrl = await this.generateInvoicePDF(stored.id);
    }
    
    return {
      invoiceId: stored.id,
      xeroInvoiceId: xeroInvoice?.invoiceID,
      invoiceNumber,
      customer: customer.name,
      total: this.formatCurrency(total),
      dueDate: this.formatDate(dueDate),
      status: 'DRAFT',
      pdfUrl,
      nextSteps: [
        'Review and approve invoice',
        'Send to customer',
        'Track payment status'
      ]
    };
  }

  /**
   * Process an expense
   */
  async processExpense(params, context) {
    const { expense, receipt } = params;
    
    // Extract data from receipt if provided
    let extractedData = {};
    if (receipt) {
      extractedData = await this.extractReceiptData(receipt);
    }
    
    // Merge with provided expense data
    const expenseData = {
      ...extractedData,
      ...expense,
      date: expense.date || extractedData.date || new Date(),
      amount: expense.amount || extractedData.total,
      vendor: expense.vendor || extractedData.vendor,
      category: expense.category || await this.categorizeExpense(extractedData)
    };
    
    // Validate expense
    const validation = this.validateExpense(expenseData);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Check for duplicates
    const duplicate = await this.checkDuplicateExpense(expenseData);
    if (duplicate) {
      return {
        success: false,
        error: 'Duplicate expense detected',
        duplicate: duplicate.id
      };
    }
    
    // Create expense in Xero
    let xeroExpense;
    if (this.xeroClient) {
      xeroExpense = await this.createXeroExpense(expenseData, context);
    }
    
    // Store in database
    const stored = await this.storeExpense({
      ...expenseData,
      xeroId: xeroExpense?.id,
      tenantId: context.tenantId,
      createdBy: context.userId,
      receiptUrl: receipt?.url
    });
    
    // Check expense policies
    const policyCheck = await this.checkExpensePolicies(expenseData, context);
    
    return {
      expenseId: stored.id,
      xeroExpenseId: xeroExpense?.id,
      amount: this.formatCurrency(expenseData.amount),
      vendor: expenseData.vendor,
      category: expenseData.category,
      policyViolations: policyCheck.violations,
      requiresApproval: policyCheck.requiresApproval,
      nextSteps: policyCheck.requiresApproval ? 
        ['Await manager approval', 'Provide additional documentation if requested'] :
        ['Expense recorded successfully', 'Will be included in next expense report']
    };
  }

  /**
   * Predict cash flow
   */
  async predictCashFlow(params, context) {
    const { period = 90, includeScenarios = true } = params;
    
    // Get historical data
    const historicalData = await this.getHistoricalCashFlow(context.tenantId);
    
    // Get upcoming invoices and bills
    const upcomingInvoices = await this.getUpcomingInvoices(context.tenantId);
    const upcomingBills = await this.getUpcomingBills(context.tenantId);
    
    // Get current bank balance
    const currentBalance = await this.getCurrentBalance(context.tenantId);
    
    // Build prediction model inputs
    const modelInputs = {
      historicalData,
      upcomingInvoices,
      upcomingBills,
      currentBalance,
      seasonality: this.detectSeasonality(historicalData),
      growthRate: this.calculateGrowthRate(historicalData)
    };
    
    // Generate base prediction
    const basePrediction = await this.generateCashFlowPrediction(modelInputs, period);
    
    // Generate scenarios if requested
    let scenarios = {};
    if (includeScenarios) {
      scenarios = {
        optimistic: await this.generateCashFlowPrediction(
          { ...modelInputs, growthRate: modelInputs.growthRate * 1.2 },
          period
        ),
        pessimistic: await this.generateCashFlowPrediction(
          { ...modelInputs, growthRate: modelInputs.growthRate * 0.8 },
          period
        ),
        noGrowth: await this.generateCashFlowPrediction(
          { ...modelInputs, growthRate: 0 },
          period
        )
      };
    }
    
    // Identify risks and opportunities
    const analysis = this.analyzeCashFlowPrediction(basePrediction);
    
    // Check for cash flow warnings
    const warnings = [];
    const minCash = Math.min(...basePrediction.daily.map(d => d.balance));
    if (minCash < this.thresholds.cashFlowWarning) {
      warnings.push({
        type: 'LOW_CASH',
        date: basePrediction.daily.find(d => d.balance === minCash).date,
        amount: minCash
      });
    }
    
    return {
      period,
      startDate: new Date(),
      endDate: new Date(Date.now() + period * 24 * 60 * 60 * 1000),
      currentBalance: this.formatCurrency(currentBalance),
      prediction: {
        base: basePrediction,
        scenarios
      },
      analysis,
      warnings,
      recommendations: this.generateCashFlowRecommendations(analysis, warnings),
      visualization: {
        chartData: this.prepareCashFlowChartData(basePrediction, scenarios),
        criticalDates: analysis.criticalDates
      }
    };
  }

  /**
   * Detect financial anomalies
   */
  async detectAnomalies(params, context) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      sensitivity = 'medium'
    } = params;
    
    // Get transactions for period
    const transactions = await this.getTransactions(
      context.tenantId,
      startDate,
      endDate
    );
    
    // Detect various types of anomalies
    const anomalies = [];
    
    // 1. Unusual amounts
    const amountAnomalies = await this.detectAmountAnomalies(transactions, sensitivity);
    anomalies.push(...amountAnomalies);
    
    // 2. Unusual patterns
    const patternAnomalies = await this.detectPatternAnomalies(transactions, sensitivity);
    anomalies.push(...patternAnomalies);
    
    // 3. Duplicate transactions
    const duplicates = await this.detectDuplicates(transactions);
    anomalies.push(...duplicates);
    
    // 4. Missing expected transactions
    const missing = await this.detectMissingTransactions(transactions, context);
    anomalies.push(...missing);
    
    // 5. Category anomalies
    const categoryAnomalies = await this.detectCategoryAnomalies(transactions);
    anomalies.push(...categoryAnomalies);
    
    // Score and rank anomalies
    const scoredAnomalies = anomalies.map(a => ({
      ...a,
      score: this.calculateAnomalyScore(a),
      impact: this.assessAnomalyImpact(a)
    })).sort((a, b) => b.score - a.score);
    
    // Generate summary
    const summary = {
      totalTransactions: transactions.length,
      anomaliesDetected: scoredAnomalies.length,
      highRisk: scoredAnomalies.filter(a => a.score > 0.8).length,
      mediumRisk: scoredAnomalies.filter(a => a.score > 0.5 && a.score <= 0.8).length,
      lowRisk: scoredAnomalies.filter(a => a.score <= 0.5).length,
      totalImpact: scoredAnomalies.reduce((sum, a) => sum + (a.impact.financial || 0), 0)
    };
    
    // Store anomaly detection run
    await this.storeAnomalyDetection({
      tenantId: context.tenantId,
      period: { startDate, endDate },
      anomalies: scoredAnomalies,
      summary,
      timestamp: new Date()
    });
    
    return {
      summary,
      anomalies: scoredAnomalies.slice(0, 20), // Top 20 anomalies
      recommendations: this.generateAnomalyRecommendations(scoredAnomalies),
      requiresReview: summary.highRisk > 0,
      nextSteps: summary.highRisk > 0 ? 
        ['Review high-risk anomalies immediately', 'Investigate potential fraud', 'Update categorization rules'] :
        ['Monitor ongoing transactions', 'Review medium-risk items when convenient']
    };
  }

  /**
   * Reconcile bank transactions
   */
  async reconcileBank(params, context) {
    const { accountId, startDate, endDate, autoMatch = true } = params;
    
    // Get bank statement transactions
    const bankTransactions = await this.getBankTransactions(
      accountId,
      startDate,
      endDate
    );
    
    // Get Xero transactions
    const xeroTransactions = await this.getXeroTransactions(
      context.tenantId,
      accountId,
      startDate,
      endDate
    );
    
    // Perform matching
    const matches = [];
    const unmatched = {
      bank: [],
      xero: []
    };
    
    for (const bankTx of bankTransactions) {
      const match = this.findMatchingTransaction(bankTx, xeroTransactions);
      
      if (match) {
        matches.push({
          bank: bankTx,
          xero: match,
          confidence: this.calculateMatchConfidence(bankTx, match)
        });
      } else {
        unmatched.bank.push(bankTx);
      }
    }
    
    // Find unmatched Xero transactions
    const matchedXeroIds = new Set(matches.map(m => m.xero.id));
    unmatched.xero = xeroTransactions.filter(tx => !matchedXeroIds.has(tx.id));
    
    // Auto-reconcile high confidence matches
    let autoReconciled = 0;
    if (autoMatch) {
      for (const match of matches) {
        if (match.confidence > 0.95) {
          await this.reconcileTransaction(match.bank.id, match.xero.id);
          autoReconciled++;
        }
      }
    }
    
    // Generate reconciliation report
    const report = {
      period: { startDate, endDate },
      account: accountId,
      summary: {
        totalBankTransactions: bankTransactions.length,
        totalXeroTransactions: xeroTransactions.length,
        matched: matches.length,
        autoReconciled,
        unmatchedBank: unmatched.bank.length,
        unmatchedXero: unmatched.xero.length
      },
      matches: matches.map(m => ({
        bankRef: m.bank.reference,
        xeroRef: m.xero.reference,
        amount: m.bank.amount,
        date: m.bank.date,
        confidence: m.confidence,
        reconciled: m.confidence > 0.95 && autoMatch
      })),
      unmatched,
      discrepancies: this.identifyDiscrepancies(matches, unmatched)
    };
    
    // Store reconciliation
    await this.storeReconciliation(report, context);
    
    return {
      ...report,
      nextSteps: unmatched.bank.length > 0 || unmatched.xero.length > 0 ?
        ['Review unmatched transactions', 'Create missing entries', 'Investigate discrepancies'] :
        ['Reconciliation complete', 'Review auto-matched items', 'Close period if appropriate']
    };
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(params, context) {
    const { 
      reportType = 'monthly',
      period,
      includeComparison = true,
      format = 'summary'
    } = params;
    
    // Determine report period
    const reportPeriod = this.determineReportPeriod(reportType, period);
    
    // Gather financial data
    const financialData = await this.gatherFinancialData(
      context.tenantId,
      reportPeriod
    );
    
    // Generate report sections
    const report = {
      metadata: {
        type: reportType,
        period: reportPeriod,
        generatedAt: new Date(),
        tenant: context.tenantId
      },
      summary: await this.generateFinancialSummary(financialData),
      income: await this.generateIncomeStatement(financialData),
      expenses: await this.generateExpenseBreakdown(financialData),
      cashFlow: await this.generateCashFlowStatement(financialData),
      balanceSheet: format === 'detailed' ? 
        await this.generateBalanceSheet(financialData) : null,
      metrics: this.calculateFinancialMetrics(financialData)
    };
    
    // Add comparison if requested
    if (includeComparison) {
      const previousPeriod = this.getPreviousPeriod(reportPeriod);
      const previousData = await this.gatherFinancialData(
        context.tenantId,
        previousPeriod
      );
      
      report.comparison = this.generateComparison(financialData, previousData);
    }
    
    // Add insights and recommendations
    report.insights = this.generateFinancialInsights(report);
    report.recommendations = this.generateFinancialRecommendations(report);
    
    // Generate visualizations
    report.charts = {
      revenue: this.prepareRevenueChart(report),
      expenses: this.prepareExpenseChart(report),
      cashFlow: this.prepareCashFlowChart(report),
      trends: this.prepareTrendChart(report)
    };
    
    // Store report
    const stored = await this.storeFinancialReport(report, context);
    
    // Generate PDF if requested
    let pdfUrl;
    if (params.generatePDF) {
      pdfUrl = await this.generateReportPDF(stored.id);
    }
    
    return {
      reportId: stored.id,
      type: reportType,
      period: reportPeriod,
      summary: report.summary,
      keyMetrics: report.metrics,
      insights: report.insights,
      recommendations: report.recommendations,
      pdfUrl,
      nextSteps: [
        'Review financial performance',
        'Share with stakeholders',
        'Plan based on recommendations'
      ]
    };
  }

  /**
   * Get quarterly expenses for R&D claims
   */
  async getQuarterlyExpenses(params, context) {
    const { category = 'development', quarter = this.getCurrentQuarter() } = params;
    
    // Get date range for quarter
    const { startDate, endDate } = this.getQuarterDates(quarter);
    
    // Fetch expenses
    const expenses = await this.getExpensesByCategory(
      context.tenantId,
      category,
      startDate,
      endDate
    );
    
    // Categorize for R&D eligibility
    const categorized = {
      eligible: [],
      potentially: [],
      ineligible: []
    };
    
    for (const expense of expenses) {
      const eligibility = await this.assessRAndDEligibility(expense);
      
      if (eligibility.score > 0.8) {
        categorized.eligible.push({ ...expense, eligibility });
      } else if (eligibility.score > 0.5) {
        categorized.potentially.push({ ...expense, eligibility });
      } else {
        categorized.ineligible.push({ ...expense, eligibility });
      }
    }
    
    // Calculate totals
    const totals = {
      eligible: categorized.eligible.reduce((sum, e) => sum + e.amount, 0),
      potentially: categorized.potentially.reduce((sum, e) => sum + e.amount, 0),
      ineligible: categorized.ineligible.reduce((sum, e) => sum + e.amount, 0),
      total: expenses.reduce((sum, e) => sum + e.amount, 0)
    };
    
    return {
      quarter,
      period: { startDate, endDate },
      expenses: categorized,
      totals,
      summary: {
        totalExpenses: expenses.length,
        eligibleCount: categorized.eligible.length,
        eligibleAmount: this.formatCurrency(totals.eligible),
        potentiallyEligibleCount: categorized.potentially.length,
        potentiallyEligibleAmount: this.formatCurrency(totals.potentially),
        eligibilityRate: (totals.eligible / totals.total * 100).toFixed(2) + '%'
      },
      recommendations: this.generateRAndDRecommendations(categorized)
    };
  }

  /**
   * Full bookkeeping automation
   */
  async automateBookkeeping(params, context) {
    const { 
      period = 'daily',
      tasks = ['categorize', 'reconcile', 'invoice', 'report']
    } = params;
    
    const results = {
      timestamp: new Date(),
      period,
      tasks: {},
      summary: {
        success: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    // Run categorization
    if (tasks.includes('categorize')) {
      try {
        const uncategorized = await this.getUncategorizedTransactions(context.tenantId);
        const categorized = [];
        
        for (const transaction of uncategorized) {
          const result = await this.categorizeTransaction(
            { transaction },
            context
          );
          categorized.push(result);
        }
        
        results.tasks.categorization = {
          success: true,
          processed: categorized.length,
          requiresReview: categorized.filter(c => c.requiresReview).length
        };
        results.summary.success++;
      } catch (error) {
        results.tasks.categorization = { success: false, error: error.message };
        results.summary.failed++;
      }
    }
    
    // Run reconciliation
    if (tasks.includes('reconcile')) {
      try {
        const accounts = await this.getBankAccounts(context.tenantId);
        const reconciliations = [];
        
        for (const account of accounts) {
          const result = await this.reconcileBank(
            { 
              accountId: account.id,
              startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
              endDate: new Date(),
              autoMatch: true
            },
            context
          );
          reconciliations.push(result);
        }
        
        results.tasks.reconciliation = {
          success: true,
          accounts: reconciliations.length,
          totalMatched: reconciliations.reduce((sum, r) => sum + r.summary.matched, 0)
        };
        results.summary.success++;
      } catch (error) {
        results.tasks.reconciliation = { success: false, error: error.message };
        results.summary.failed++;
      }
    }
    
    // Process pending invoices
    if (tasks.includes('invoice')) {
      try {
        const pending = await this.getPendingInvoices(context.tenantId);
        const processed = [];
        
        for (const invoice of pending) {
          if (invoice.status === 'DRAFT' && invoice.readyToSend) {
            await this.sendInvoice(invoice.id);
            processed.push(invoice.id);
          }
        }
        
        results.tasks.invoicing = {
          success: true,
          processed: processed.length,
          pending: pending.length - processed.length
        };
        results.summary.success++;
      } catch (error) {
        results.tasks.invoicing = { success: false, error: error.message };
        results.summary.failed++;
      }
    }
    
    // Generate reports
    if (tasks.includes('report') && this.shouldGenerateReport(period)) {
      try {
        const report = await this.generateFinancialReport(
          { 
            reportType: this.getReportTypeForPeriod(period),
            includeComparison: true
          },
          context
        );
        
        results.tasks.reporting = {
          success: true,
          reportId: report.reportId,
          insights: report.insights.length
        };
        results.summary.success++;
      } catch (error) {
        results.tasks.reporting = { success: false, error: error.message };
        results.summary.failed++;
      }
    }
    
    // Check for issues
    const issues = await this.checkBookkeepingHealth(context.tenantId);
    if (issues.length > 0) {
      results.warnings = issues;
      results.summary.warnings = issues.length;
    }
    
    // Store automation run
    await this.storeAutomationRun(results, context);
    
    return {
      ...results,
      nextRun: this.calculateNextRun(period),
      recommendations: this.generateAutomationRecommendations(results)
    };
  }

  /**
   * Helper methods
   */
  
  extractTransactionFeatures(transaction) {
    return {
      amount: transaction.amount,
      description: transaction.description,
      vendor: transaction.vendor,
      dayOfWeek: new Date(transaction.date).getDay(),
      dayOfMonth: new Date(transaction.date).getDate(),
      isRecurring: this.checkIfRecurring(transaction),
      keywords: this.extractKeywords(transaction.description)
    };
  }

  async predictCategory(features) {
    // ML prediction logic - simplified for demonstration
    const categories = ['Office Supplies', 'Software', 'Travel', 'Marketing', 'Utilities'];
    const scores = categories.map(cat => ({
      category: cat,
      score: Math.random() // In reality, use trained model
    }));
    
    const best = scores.sort((a, b) => b.score - a.score)[0];
    
    return {
      category: best.category,
      confidence: best.score
    };
  }

  applyCategorizationRules(transaction) {
    const rules = [
      { pattern: /xero|quickbooks|accounting/i, category: 'Software' },
      { pattern: /uber|taxi|flight|hotel/i, category: 'Travel' },
      { pattern: /office|stationery|supplies/i, category: 'Office Supplies' },
      { pattern: /google|facebook|advertising/i, category: 'Marketing' },
      { pattern: /electricity|water|internet|phone/i, category: 'Utilities' }
    ];
    
    for (const rule of rules) {
      if (rule.pattern.test(transaction.description)) {
        return rule.category;
      }
    }
    
    return null;
  }

  mapCategoryToAccount(category) {
    const mapping = {
      'Office Supplies': '400',
      'Software': '420',
      'Travel': '430',
      'Marketing': '450',
      'Utilities': '460'
    };
    
    return mapping[category] || '999';
  }

  async updateXeroTransaction(transactionId, updates) {
    if (!this.xeroClient) return;
    
    try {
      await this.xeroClient.accountingApi.updateTransaction(
        this.tenantId,
        transactionId,
        updates
      );
    } catch (error) {
      console.error('Failed to update Xero transaction:', error);
    }
  }

  calculateDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async generateInvoiceNumber(tenantId) {
    const { data } = await this.supabase
      .from('invoice_sequence')
      .select('next_number')
      .eq('tenant_id', tenantId)
      .single();
    
    const nextNumber = data?.next_number || 1;
    
    await this.supabase
      .from('invoice_sequence')
      .upsert({
        tenant_id: tenantId,
        next_number: nextNumber + 1
      });
    
    return String(nextNumber).padStart(5, '0');
  }

  loadDefaultCategories() {
    return {
      income: ['Sales', 'Services', 'Interest', 'Other Income'],
      expenses: [
        'Office Supplies',
        'Software',
        'Travel',
        'Marketing',
        'Utilities',
        'Rent',
        'Salaries',
        'Professional Fees',
        'Insurance',
        'Other Expenses'
      ]
    };
  }

  async loadXeroTokens() {
    // Load stored Xero tokens
    const { data } = await this.supabase
      .from('xero_tokens')
      .select('*')
      .single();
    
    if (data && this.xeroClient) {
      await this.xeroClient.setTokenSet(data.token_set);
    }
  }

  async storeInvoice(invoice) {
    const { data } = await this.supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single();
    
    return data;
  }

  // Additional helper methods would continue...
}

// Export the bot
export default new BookkeepingBot();