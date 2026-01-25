/**
 * Tax Compliance Module
 * Handles BAS calculations and tax deadline notifications
 */

import { TAX_DEADLINES } from '../shared/constants.js';

/**
 * Check upcoming tax requirements and deadlines
 * @param {Object} options - Options for tax check
 * @returns {Object[]} Array of tax-related notifications
 */
export async function checkTaxRequirements(supabase, notificationRules) {
  const notifications = [];

  // Check for upcoming BAS deadline
  const nextBASDeadline = getNextBASDeadline();
  const daysUntilBAS = Math.floor((nextBASDeadline - new Date()) / (24 * 60 * 60 * 1000));

  if (daysUntilBAS <= notificationRules.taxDeadlineWarning) {
    // Check which receipts are missing for tax purposes
    const { data: taxableExpenses } = await supabase
      .from('bookkeeping_transactions')
      .select('*')
      .eq('tax_deductible', true)
      .is('receipt_url', null)
      .gte('txn_date', getQuarterStart());

    if (taxableExpenses && taxableExpenses.length > 0) {
      notifications.push({
        type: 'tax_receipts_needed',
        priority: 'high',
        message: `BAS deadline in ${daysUntilBAS} days - ${taxableExpenses.length} receipts needed`,
        expenses: taxableExpenses,
        totalAmount: taxableExpenses.reduce((sum, e) => sum + e.amount, 0),
        action: 'Upload receipts for tax deductible expenses'
      });
    }

    // Prepare BAS summary
    notifications.push({
      type: 'bas_preparation',
      priority: 'high',
      message: `BAS due in ${daysUntilBAS} days - summary prepared`,
      action: 'Review BAS summary',
      automatedAction: 'BAS worksheet has been generated and saved'
    });
  }

  return notifications;
}

/**
 * Get next BAS deadline
 * @returns {Date} Next BAS deadline
 */
export function getNextBASDeadline() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const year = today.getFullYear();

  // Find the next deadline
  const deadlines = TAX_DEADLINES.quarters.map(q => {
    const month = q.deadlineMonth;
    const deadlineYear = month < 2 && currentMonth > month ? year + 1 : year;
    return new Date(deadlineYear, month, 28);
  });

  return deadlines.find(d => d > today) || deadlines[0];
}

/**
 * Get current quarter start date
 * @returns {string} ISO date string for quarter start
 */
export function getQuarterStart() {
  const today = new Date();
  const quarter = Math.floor(today.getMonth() / 3);
  return new Date(today.getFullYear(), quarter * 3, 1).toISOString();
}

/**
 * Get quarter end date
 * @returns {Date} Quarter end date
 */
export function getQuarterEnd() {
  const today = new Date();
  const quarter = Math.floor(today.getMonth() / 3);
  return new Date(today.getFullYear(), quarter * 3 + 3, 0);
}

/**
 * Calculate GST summary for the quarter
 * @param {Object} options - Calculation options
 * @returns {Object} GST summary
 */
export async function calculateGSTSummary(supabase, tenantId) {
  const quarterStart = getQuarterStart();
  const quarterEnd = getQuarterEnd();

  // Get sales invoices (GST collected)
  const { data: salesInvoices } = await supabase
    .from('xero_invoices')
    .select('total_tax')
    .eq('tenant_id', tenantId)
    .eq('type', 'ACCREC')
    .gte('date', quarterStart)
    .lte('date', quarterEnd.toISOString().split('T')[0]);

  // Get purchases (GST paid)
  const { data: billsInvoices } = await supabase
    .from('xero_invoices')
    .select('total_tax')
    .eq('tenant_id', tenantId)
    .eq('type', 'ACCPAY')
    .gte('date', quarterStart)
    .lte('date', quarterEnd.toISOString().split('T')[0]);

  const gstOnSales = (salesInvoices || []).reduce((sum, inv) => sum + parseFloat(inv.total_tax || 0), 0);
  const gstOnPurchases = (billsInvoices || []).reduce((sum, inv) => sum + parseFloat(inv.total_tax || 0), 0);

  return {
    gstOnSales,
    gstOnPurchases,
    netGST: gstOnSales - gstOnPurchases,
    periodStart: quarterStart,
    periodEnd: quarterEnd.toISOString().split('T')[0]
  };
}

/**
 * Get tax deadline info
 * @returns {Object} Deadline information
 */
export function getTaxDeadlineInfo() {
  const nextDeadline = getNextBASDeadline();
  const today = new Date();
  const daysUntil = Math.floor((nextDeadline - today) / (24 * 60 * 60 * 1000));

  const quarter = TAX_DEADLINES.quarters.find(q => {
    const d = new Date(today.getFullYear(), q.deadlineMonth, 28);
    return d >= nextDeadline || Math.abs(d - nextDeadline) < 1000;
  });

  return {
    deadline: nextDeadline,
    daysUntil,
    quarterName: quarter?.name || 'Q2',
    isUrgent: daysUntil <= 14,
    isOverdue: daysUntil < 0
  };
}

export default {
  checkTaxRequirements,
  getNextBASDeadline,
  getQuarterStart,
  getQuarterEnd,
  calculateGSTSummary,
  getTaxDeadlineInfo
};
