/**
 * Reports API Endpoints
 * 
 * Generates various financial reports including BAS packs, board packs,
 * and RDTI registers with proper formatting and data aggregation.
 */

import { Router } from 'express';
import { createSupabaseClient } from '../config/supabase.js';
import { Logger } from '../utils/logger.js';
import archiver from 'archiver';
import { Parser } from 'json2csv';
import { format, startOfQuarter, endOfQuarter, subDays } from 'date-fns';

const router = Router();
const logger = new Logger('ReportsAPI');
const supabase = createSupabaseClient();

/**
 * Generate BAS Pack
 */
router.get('/bas_pack', async (req, res) => {
  try {
    const { entity = 'ACT_PTY_LTD', period } = req.query;
    
    if (!period) {
      return res.status(400).json({ error: 'Period is required (e.g., 2025Q1)' });
    }
    
    logger.info(`Generating BAS pack for ${entity} - ${period}`);
    
    // Parse period (2025Q1 format)
    const year = parseInt(period.substring(0, 4));
    const quarter = parseInt(period.substring(5));
    const startDate = startOfQuarter(new Date(year, (quarter - 1) * 3));
    const endDate = endOfQuarter(startDate);
    
    // Fetch BAS data
    const basData = await fetchBASData(entity, startDate, endDate);
    
    // Generate reports
    const summary = generateBASSummary(basData, period);
    const gstCollected = generateGSTCollectedReport(basData.sales);
    const gstPaid = generateGSTPaidReport(basData.purchases);
    const paygReport = generatePAYGReport(basData.payroll);
    const exceptions = generateExceptionsReport(basData.exceptions);
    
    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Set response headers
    res.attachment(`BAS_Pack_${entity}_${period}.zip`);
    archive.pipe(res);
    
    // Add files to archive
    archive.append(summary, { name: 'summary.json' });
    archive.append(gstCollected, { name: 'gst_collected.csv' });
    archive.append(gstPaid, { name: 'gst_paid.csv' });
    archive.append(paygReport, { name: 'payg_withholding.csv' });
    archive.append(exceptions, { name: 'exceptions.csv' });
    archive.append(generateBASNotes(basData, period), { name: 'notes.md' });
    
    await archive.finalize();
    
  } catch (error) {
    logger.error('BAS pack generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate Board Pack
 */
router.get('/board_pack', async (req, res) => {
  try {
    const { entity = 'ACT_PTY_LTD', month } = req.query;
    
    if (!month) {
      return res.status(400).json({ error: 'Month is required (e.g., 2025-09)' });
    }
    
    logger.info(`Generating board pack for ${entity} - ${month}`);
    
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    // Fetch comprehensive data
    const boardData = await fetchBoardPackData(entity, startDate, endDate);
    
    // Generate one-pager HTML
    const onePager = generateBoardPackHTML(boardData, entity, month);
    
    // Generate supporting documents
    const kpiReport = generateKPIReport(boardData.kpis);
    const cashflowReport = generateCashflowReport(boardData.cashflow);
    const varianceReport = generateVarianceReport(boardData.variance);
    const rdReport = generateRDProgressReport(boardData.rd);
    
    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment(`Board_Pack_${entity}_${month}.zip`);
    archive.pipe(res);
    
    // Add files
    archive.append(onePager, { name: 'board_pack.html' });
    archive.append(kpiReport, { name: 'kpi_metrics.csv' });
    archive.append(cashflowReport, { name: 'cashflow_forecast.csv' });
    archive.append(varianceReport, { name: 'variance_analysis.csv' });
    archive.append(rdReport, { name: 'rd_progress.json' });
    
    await archive.finalize();
    
  } catch (error) {
    logger.error('Board pack generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate RDTI Register
 */
router.get('/rdti_register', async (req, res) => {
  try {
    const { yearEnd = '2025-06-30' } = req.query;
    
    logger.info(`Generating RDTI register for year ending ${yearEnd}`);
    
    // Fetch R&D activities and evidence
    const rdData = await fetchRDTIData(yearEnd);
    
    // Generate registration document
    const registrationDoc = generateRDTIRegistration(rdData);
    
    // Generate cost schedule
    const costSchedule = generateRDTICostSchedule(rdData.costs);
    
    // Generate evidence index
    const evidenceIndex = generateEvidenceIndex(rdData.evidence);
    
    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment(`RDTI_Register_${yearEnd}.zip`);
    archive.pipe(res);
    
    // Add files
    archive.append(registrationDoc, { name: 'rdti_registration.html' });
    archive.append(costSchedule, { name: 'cost_schedule.csv' });
    archive.append(evidenceIndex, { name: 'evidence_index.json' });
    archive.append(generateRDTINotes(rdData), { name: 'preparation_notes.md' });
    
    await archive.finalize();
    
  } catch (error) {
    logger.error('RDTI register generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate financial dashboard data
 */
router.get('/dashboard/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const { entity = 'ACT_PTY_LTD' } = req.query;
    
    const dashboardData = await generateDashboardData(entity, period);
    
    res.status(200).json(dashboardData);
    
  } catch (error) {
    logger.error('Dashboard data error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fetch BAS data from various sources
 */
async function fetchBASData(entity, startDate, endDate) {
  const [sales, purchases, payroll, bankTransactions] = await Promise.all([
    // Fetch sales invoices
    supabase
      .from('invoices')
      .select('*')
      .eq('entity', entity)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString()),
      
    // Fetch bills/purchases
    supabase
      .from('bills')
      .select('*')
      .eq('entity', entity)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString()),
      
    // Fetch payroll data
    supabase
      .from('payroll')
      .select('*')
      .eq('entity', entity)
      .gte('pay_date', startDate.toISOString())
      .lte('pay_date', endDate.toISOString()),
      
    // Fetch bank transactions for exceptions
    supabase
      .from('bank_transactions')
      .select('*')
      .eq('entity', entity)
      .eq('reconciled', false)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
  ]);
  
  return {
    sales: sales.data || [],
    purchases: purchases.data || [],
    payroll: payroll.data || [],
    exceptions: identifyBASExceptions(sales.data, purchases.data, bankTransactions.data)
  };
}

/**
 * Generate BAS summary
 */
function generateBASSummary(data, period) {
  const gstCollected = data.sales.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
  const gstPaid = data.purchases.reduce((sum, bill) => sum + (bill.tax_amount || 0), 0);
  const netGST = gstCollected - gstPaid;
  const paygWithheld = data.payroll.reduce((sum, pay) => sum + (pay.tax_withheld || 0), 0);
  
  return JSON.stringify({
    period,
    generated: new Date().toISOString(),
    summary: {
      gstCollected,
      gstPaid,
      netGST,
      paygWithheld,
      totalPayable: netGST + paygWithheld
    },
    counts: {
      salesInvoices: data.sales.length,
      purchaseBills: data.purchases.length,
      payrollRuns: data.payroll.length,
      exceptions: data.exceptions.length
    },
    warnings: generateBASWarnings(data)
  }, null, 2);
}

/**
 * Generate GST collected report
 */
function generateGSTCollectedReport(sales) {
  const fields = ['invoice_number', 'date', 'customer', 'total_amount', 'tax_amount', 'tax_code'];
  const parser = new Parser({ fields });
  
  const data = sales.map(inv => ({
    invoice_number: inv.invoice_number,
    date: format(new Date(inv.date), 'yyyy-MM-dd'),
    customer: inv.customer_name,
    total_amount: inv.total_amount,
    tax_amount: inv.tax_amount,
    tax_code: inv.tax_code || 'GST on Income'
  }));
  
  return parser.parse(data);
}

/**
 * Generate GST paid report
 */
function generateGSTPaidReport(purchases) {
  const fields = ['bill_number', 'date', 'supplier', 'total_amount', 'tax_amount', 'tax_code', 'account'];
  const parser = new Parser({ fields });
  
  const data = purchases.map(bill => ({
    bill_number: bill.bill_number,
    date: format(new Date(bill.date), 'yyyy-MM-dd'),
    supplier: bill.supplier_name,
    total_amount: bill.total_amount,
    tax_amount: bill.tax_amount,
    tax_code: bill.tax_code || 'GST on Expenses',
    account: bill.account_code
  }));
  
  return parser.parse(data);
}

/**
 * Generate PAYG withholding report
 */
function generatePAYGReport(payroll) {
  const fields = ['pay_date', 'employee', 'gross_pay', 'tax_withheld', 'super_amount'];
  const parser = new Parser({ fields });
  
  const data = payroll.map(pay => ({
    pay_date: format(new Date(pay.pay_date), 'yyyy-MM-dd'),
    employee: pay.employee_name,
    gross_pay: pay.gross_amount,
    tax_withheld: pay.tax_withheld,
    super_amount: pay.super_amount
  }));
  
  return parser.parse(data);
}

/**
 * Identify BAS exceptions
 */
function identifyBASExceptions(sales, purchases, unreconciled) {
  const exceptions = [];
  
  // Check for missing tax codes
  sales.forEach(inv => {
    if (!inv.tax_code && inv.tax_amount > 0) {
      exceptions.push({
        type: 'missing_tax_code',
        document: 'invoice',
        id: inv.id,
        description: `Invoice ${inv.invoice_number} has GST but no tax code`
      });
    }
  });
  
  purchases.forEach(bill => {
    if (!bill.tax_code && bill.tax_amount > 0) {
      exceptions.push({
        type: 'missing_tax_code',
        document: 'bill',
        id: bill.id,
        description: `Bill ${bill.bill_number} has GST but no tax code`
      });
    }
  });
  
  // Check for unusual GST rates
  [...sales, ...purchases].forEach(doc => {
    if (doc.tax_amount && doc.total_amount) {
      const gstRate = (doc.tax_amount / (doc.total_amount - doc.tax_amount)) * 100;
      if (Math.abs(gstRate - 10) > 0.5) {
        exceptions.push({
          type: 'unusual_gst_rate',
          document: doc.invoice_number ? 'invoice' : 'bill',
          id: doc.id,
          description: `GST rate is ${gstRate.toFixed(2)}% instead of 10%`
        });
      }
    }
  });
  
  return exceptions;
}

/**
 * Generate exceptions report
 */
function generateExceptionsReport(exceptions) {
  if (exceptions.length === 0) {
    return 'type,document,id,description\nNo exceptions found';
  }
  
  const fields = ['type', 'document', 'id', 'description'];
  const parser = new Parser({ fields });
  
  return parser.parse(exceptions);
}

/**
 * Generate BAS notes
 */
function generateBASNotes(data, period) {
  const notes = [];
  
  notes.push(`# BAS Notes for ${period}`);
  notes.push(`Generated: ${new Date().toLocaleString('en-AU')}\n`);
  
  notes.push('## Summary');
  notes.push(`- Total sales invoices: ${data.sales.length}`);
  notes.push(`- Total purchase bills: ${data.purchases.length}`);
  notes.push(`- Total payroll runs: ${data.payroll.length}`);
  notes.push(`- Exceptions requiring review: ${data.exceptions.length}\n`);
  
  if (data.exceptions.length > 0) {
    notes.push('## Exceptions Requiring Attention');
    data.exceptions.forEach(exc => {
      notes.push(`- ${exc.description}`);
    });
    notes.push('');
  }
  
  notes.push('## Lodgement Checklist');
  notes.push('- [ ] Review all exception items');
  notes.push('- [ ] Verify GST calculations');
  notes.push('- [ ] Confirm PAYG withholding amounts');
  notes.push('- [ ] Check for any manual adjustments needed');
  notes.push('- [ ] Lodge via registered tax agent');
  
  return notes.join('\n');
}

/**
 * Generate BAS warnings
 */
function generateBASWarnings(data) {
  const warnings = [];
  
  // Check for high variance
  const avgGST = data.sales.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) / data.sales.length;
  data.sales.forEach(inv => {
    if (inv.tax_amount > avgGST * 3) {
      warnings.push(`High GST on invoice ${inv.invoice_number}`);
    }
  });
  
  // Check for missing ABNs
  const missingABN = data.purchases.filter(bill => !bill.supplier_abn);
  if (missingABN.length > 0) {
    warnings.push(`${missingABN.length} suppliers missing ABN`);
  }
  
  return warnings;
}

/**
 * Fetch board pack data
 */
async function fetchBoardPackData(entity, startDate, endDate) {
  // This would fetch comprehensive data for the board pack
  // Including KPIs, cashflow, variance analysis, etc.
  
  const [financial, projects, rd] = await Promise.all([
    fetchFinancialMetrics(entity, startDate, endDate),
    fetchProjectMetrics(entity, startDate, endDate),
    fetchRDProgress(entity, startDate, endDate)
  ]);
  
  return {
    kpis: calculateKPIs(financial),
    cashflow: generateCashflowForecast(financial),
    variance: calculateVariance(financial),
    rd: rd,
    projects: projects
  };
}

/**
 * Generate board pack HTML
 */
function generateBoardPackHTML(data, entity, month) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Board Pack - ${entity} - ${month}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1, h2, h3 { color: #333; }
    .metric { display: inline-block; margin: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #007bff; }
    .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .positive { color: green; }
    .negative { color: red; }
  </style>
</head>
<body>
  <h1>Board Pack - ${month}</h1>
  <p>Generated: ${new Date().toLocaleString('en-AU')}</p>
  
  <h2>Key Metrics</h2>
  <div class="metrics">
    ${generateMetricsHTML(data.kpis)}
  </div>
  
  <h2>Financial Performance</h2>
  ${generateFinancialTable(data.kpis)}
  
  <h2>Cash Runway</h2>
  ${generateCashflowChart(data.cashflow)}
  
  <h2>R&D Progress</h2>
  ${generateRDSummary(data.rd)}
  
  <h2>Decisions & Actions</h2>
  <ul>
    <li>BAS Status: ${data.kpis.basStatus}</li>
    <li>R&D Registration: ${data.rd.registrationStatus}</li>
    <li>Next board meeting: ${getNextBoardMeetingDate()}</li>
  </ul>
</body>
</html>`;
}

/**
 * Helper functions for report generation
 */
function fetchFinancialMetrics(entity, startDate, endDate) {
  // Implementation would fetch actual financial data
  return {
    revenue: 150000,
    expenses: 120000,
    netProfit: 30000,
    cashBalance: 200000,
    debtors: 45000,
    creditors: 30000
  };
}

function fetchProjectMetrics(entity, startDate, endDate) {
  // Implementation would fetch project data
  return {
    activeProjects: 5,
    completedProjects: 2,
    projectRevenue: 80000
  };
}

function fetchRDProgress(entity, startDate, endDate) {
  // Implementation would fetch R&D data
  return {
    activities: 3,
    eligibleCosts: 150000,
    registrationStatus: 'In Progress',
    deadline: '2026-04-30'
  };
}

function calculateKPIs(financial) {
  return {
    revenue: financial.revenue,
    expenses: financial.expenses,
    netProfit: financial.netProfit,
    profitMargin: ((financial.netProfit / financial.revenue) * 100).toFixed(2) + '%',
    cashBalance: financial.cashBalance,
    runway: Math.floor(financial.cashBalance / (financial.expenses / 30)),
    debtorDays: Math.round((financial.debtors / financial.revenue) * 365),
    basStatus: 'Ready for Review'
  };
}

function generateCashflowForecast(financial) {
  // Simple 13-week forecast
  const weeks = [];
  let balance = financial.cashBalance;
  
  for (let i = 0; i < 13; i++) {
    const weeklyRevenue = financial.revenue / 4;
    const weeklyExpenses = financial.expenses / 4;
    balance = balance + weeklyRevenue - weeklyExpenses;
    
    weeks.push({
      week: i + 1,
      revenue: weeklyRevenue,
      expenses: weeklyExpenses,
      balance: balance
    });
  }
  
  return weeks;
}

function calculateVariance(financial) {
  // Would compare to previous period or budget
  return {
    revenue: { actual: financial.revenue, budget: 140000, variance: 10000 },
    expenses: { actual: financial.expenses, budget: 125000, variance: -5000 }
  };
}

function generateMetricsHTML(kpis) {
  return Object.entries(kpis)
    .filter(([key]) => ['revenue', 'netProfit', 'cashBalance', 'runway'].includes(key))
    .map(([key, value]) => `
      <div class="metric">
        <div class="metric-value">${formatMetricValue(key, value)}</div>
        <div class="metric-label">${humanizeKey(key)}</div>
      </div>
    `).join('');
}

function formatMetricValue(key, value) {
  if (key === 'runway') return `${value} days`;
  if (typeof value === 'number') return `$${value.toLocaleString()}`;
  return value;
}

function humanizeKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

function generateFinancialTable(kpis) {
  return `
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
        <th>Status</th>
      </tr>
      ${Object.entries(kpis).map(([key, value]) => `
        <tr>
          <td>${humanizeKey(key)}</td>
          <td>${formatMetricValue(key, value)}</td>
          <td>${getMetricStatus(key, value)}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function getMetricStatus(key, value) {
  // Simple status logic
  if (key === 'profitMargin') {
    const margin = parseFloat(value);
    return margin > 20 ? '<span class="positive">Excellent</span>' : 'Good';
  }
  if (key === 'runway') {
    return value > 180 ? '<span class="positive">Healthy</span>' : 'Monitor';
  }
  return 'OK';
}

function generateCashflowChart(cashflow) {
  // Simple text representation
  return `
    <table>
      <tr>
        <th>Week</th>
        <th>Revenue</th>
        <th>Expenses</th>
        <th>Balance</th>
      </tr>
      ${cashflow.slice(0, 4).map(week => `
        <tr>
          <td>Week ${week.week}</td>
          <td>$${week.revenue.toLocaleString()}</td>
          <td>$${week.expenses.toLocaleString()}</td>
          <td>$${week.balance.toLocaleString()}</td>
        </tr>
      `).join('')}
    </table>
    <p><em>Showing first 4 weeks of 13-week forecast</em></p>
  `;
}

function generateRDSummary(rd) {
  return `
    <ul>
      <li>Active R&D Activities: ${rd.activities}</li>
      <li>Eligible Costs YTD: $${rd.eligibleCosts.toLocaleString()}</li>
      <li>Registration Status: ${rd.registrationStatus}</li>
      <li>Deadline: ${rd.deadline}</li>
    </ul>
  `;
}

function getNextBoardMeetingDate() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return format(nextMonth, 'MMMM d, yyyy');
}

/**
 * Generate KPI report
 */
function generateKPIReport(kpis) {
  const fields = Object.keys(kpis);
  const parser = new Parser({ fields });
  return parser.parse([kpis]);
}

/**
 * Generate cashflow report
 */
function generateCashflowReport(cashflow) {
  const fields = ['week', 'revenue', 'expenses', 'balance'];
  const parser = new Parser({ fields });
  return parser.parse(cashflow);
}

/**
 * Generate variance report
 */
function generateVarianceReport(variance) {
  const data = Object.entries(variance).map(([category, values]) => ({
    category,
    actual: values.actual,
    budget: values.budget,
    variance: values.variance,
    variance_pct: ((values.variance / values.budget) * 100).toFixed(2) + '%'
  }));
  
  const fields = ['category', 'actual', 'budget', 'variance', 'variance_pct'];
  const parser = new Parser({ fields });
  return parser.parse(data);
}

/**
 * Generate R&D progress report
 */
function generateRDProgressReport(rd) {
  return JSON.stringify(rd, null, 2);
}

/**
 * Fetch RDTI data
 */
async function fetchRDTIData(yearEnd) {
  const { data: activities } = await supabase
    .from('rd_activities')
    .select('*')
    .lte('start_date', yearEnd);
    
  const { data: evidence } = await supabase
    .from('rd_evidence')
    .select('*')
    .lte('date', yearEnd);
    
  const { data: costs } = await supabase
    .from('rd_costs')
    .select('*')
    .lte('date', yearEnd);
  
  return {
    activities: activities || [],
    evidence: evidence || [],
    costs: costs || []
  };
}

/**
 * Generate RDTI registration document
 */
function generateRDTIRegistration(rdData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>RDTI Registration - ACT Pty Ltd</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1, h2, h3 { color: #333; }
    .activity { margin: 30px 0; padding: 20px; background: #f9f9f9; border-left: 4px solid #007bff; }
    .evidence-link { color: #007bff; text-decoration: none; }
    .cost-summary { background: #f5f5f5; padding: 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>R&D Tax Incentive Registration</h1>
  <p><strong>Company:</strong> ACT Pty Ltd</p>
  <p><strong>Year End:</strong> ${rdData.yearEnd || '30 June 2025'}</p>
  <p><strong>Prepared:</strong> ${new Date().toLocaleDateString('en-AU')}</p>
  
  <h2>R&D Activities</h2>
  ${rdData.activities.map(activity => generateActivitySection(activity)).join('')}
  
  <h2>Cost Summary</h2>
  <div class="cost-summary">
    <p><strong>Total Eligible R&D Expenditure:</strong> $${calculateTotalCosts(rdData.costs).toLocaleString()}</p>
    <p><strong>Estimated Tax Offset (43.5%):</strong> $${(calculateTotalCosts(rdData.costs) * 0.435).toLocaleString()}</p>
  </div>
  
  <h2>Supporting Evidence</h2>
  <p>See attached evidence index for detailed documentation supporting each activity.</p>
</body>
</html>`;
}

function generateActivitySection(activity) {
  return `
    <div class="activity">
      <h3>${activity.title}</h3>
      <p><strong>Type:</strong> ${activity.type === 'core' ? 'Core R&D Activity' : 'Supporting R&D Activity'}</p>
      <p><strong>Hypothesis:</strong> ${activity.hypothesis}</p>
      <p><strong>Technical Uncertainty:</strong> ${activity.uncertainty}</p>
      <p><strong>Systematic Approach:</strong> ${activity.experiments?.join(', ') || 'See evidence'}</p>
    </div>
  `;
}

function calculateTotalCosts(costs) {
  return costs.reduce((sum, cost) => sum + (cost.amount || 0), 0);
}

/**
 * Generate RDTI cost schedule
 */
function generateRDTICostSchedule(costs) {
  const fields = ['date', 'category', 'description', 'amount', 'activity_id'];
  const parser = new Parser({ fields });
  
  const data = costs.map(cost => ({
    date: format(new Date(cost.date), 'yyyy-MM-dd'),
    category: cost.category,
    description: cost.description,
    amount: cost.amount,
    activity_id: cost.activity_id
  }));
  
  return parser.parse(data);
}

/**
 * Generate evidence index
 */
function generateEvidenceIndex(evidence) {
  const index = evidence.reduce((acc, item) => {
    if (!acc[item.activity_id]) {
      acc[item.activity_id] = [];
    }
    acc[item.activity_id].push({
      type: item.type,
      description: item.description,
      date: item.date,
      link: item.link
    });
    return acc;
  }, {});
  
  return JSON.stringify(index, null, 2);
}

/**
 * Generate RDTI notes
 */
function generateRDTINotes(rdData) {
  const notes = [];
  
  notes.push('# RDTI Registration Notes');
  notes.push(`Generated: ${new Date().toLocaleString('en-AU')}\n`);
  
  notes.push('## Summary');
  notes.push(`- Total R&D activities: ${rdData.activities.length}`);
  notes.push(`- Core activities: ${rdData.activities.filter(a => a.type === 'core').length}`);
  notes.push(`- Supporting activities: ${rdData.activities.filter(a => a.type === 'supporting').length}`);
  notes.push(`- Total evidence items: ${rdData.evidence.length}`);
  notes.push(`- Total eligible costs: $${calculateTotalCosts(rdData.costs).toLocaleString()}\n`);
  
  notes.push('## Registration Checklist');
  notes.push('- [ ] Review all activities for eligibility');
  notes.push('- [ ] Verify technical uncertainties are clearly stated');
  notes.push('- [ ] Ensure systematic experimentation is documented');
  notes.push('- [ ] Confirm cost nexus for all expenditure');
  notes.push('- [ ] Obtain specialist review before submission');
  notes.push('- [ ] Submit via business.gov.au portal before deadline');
  
  notes.push('\n## Important Dates');
  notes.push('- Registration deadline: 10 months after year end');
  notes.push('- ATO review period: Up to 4 years');
  
  return notes.join('\n');
}

/**
 * Generate dashboard data
 */
async function generateDashboardData(entity, period) {
  // This would aggregate data for dashboard display
  return {
    period,
    entity,
    metrics: {
      revenue: 150000,
      expenses: 120000,
      netProfit: 30000,
      cashBalance: 200000
    },
    alerts: [
      'BAS due in 14 days',
      '3 invoices overdue',
      'R&D evidence collection on track'
    ],
    trends: {
      revenue: '+12%',
      expenses: '+8%',
      cashflow: 'stable'
    }
  };
}

export default router;