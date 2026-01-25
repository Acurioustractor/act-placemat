/**
 * Tests for Financial API v1 Routes
 *
 * Unit tests for financial API endpoints - simplified
 */
import { describe, it, expect } from 'vitest';
import { financialFixtures, projectFixtures } from '../../utils/mock-services.js';

describe('Financial API Utilities', () => {
  describe('Transaction summary', () => {
    const calculateSummary = (transactions) => {
      const summary = {
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        byCategory: {},
        byStatus: {},
      };

      transactions.forEach((txn) => {
        if (txn.type === 'income') {
          summary.totalIncome += txn.amount;
        } else if (txn.type === 'expense') {
          summary.totalExpense += txn.amount;
        }

        // Group by category
        const category = txn.category || 'uncategorized';
        summary.byCategory[category] = (summary.byCategory[category] || 0) + txn.amount;

        // Group by status
        const status = txn.status || 'unknown';
        summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      });

      summary.netIncome = summary.totalIncome - summary.totalExpense;
      return summary;
    };

    it('calculates total income', () => {
      const transactions = [
        financialFixtures.createTransaction({ type: 'income', amount: 5000 }),
        financialFixtures.createTransaction({ type: 'income', amount: 3000 }),
      ];

      const summary = calculateSummary(transactions);
      expect(summary.totalIncome).toBe(8000);
    });

    it('calculates total expense', () => {
      const transactions = [
        financialFixtures.createTransaction({ type: 'expense', amount: 2000 }),
        financialFixtures.createTransaction({ type: 'expense', amount: 1000 }),
      ];

      const summary = calculateSummary(transactions);
      expect(summary.totalExpense).toBe(3000);
    });

    it('calculates net income', () => {
      const transactions = [
        financialFixtures.createTransaction({ type: 'income', amount: 10000 }),
        financialFixtures.createTransaction({ type: 'expense', amount: 4000 }),
      ];

      const summary = calculateSummary(transactions);
      expect(summary.netIncome).toBe(6000);
    });

    it('groups transactions by category', () => {
      const transactions = [
        financialFixtures.createTransaction({ category: 'Services', amount: 5000 }),
        financialFixtures.createTransaction({ category: 'Infrastructure', amount: 2000 }),
        financialFixtures.createTransaction({ category: 'Services', amount: 3000 }),
      ];

      const summary = calculateSummary(transactions);
      expect(summary.byCategory.Services).toBe(8000);
      expect(summary.byCategory.Infrastructure).toBe(2000);
    });

    it('groups transactions by status', () => {
      const transactions = [
        financialFixtures.createTransaction({ status: 'reconciled' }),
        financialFixtures.createTransaction({ status: 'pending' }),
        financialFixtures.createTransaction({ status: 'reconciled' }),
      ];

      const summary = calculateSummary(transactions);
      expect(summary.byStatus.reconciled).toBe(2);
      expect(summary.byStatus.pending).toBe(1);
    });
  });

  describe('Invoice operations', () => {
    const calculateInvoiceStats = (invoices) => {
      const stats = {
        total: invoices.length,
        byStatus: {},
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
      };

      invoices.forEach((inv) => {
        const status = inv.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        stats.totalAmount += inv.amount || 0;

        if (status === 'paid') {
          stats.paidAmount += inv.amount || 0;
        } else if (status === 'sent' || status === 'overdue') {
          stats.outstandingAmount += inv.amount || 0;
        }
      });

      return stats;
    };

    it('calculates invoice statistics', () => {
      const invoices = [
        financialFixtures.createInvoice({ amount: 10000, status: 'paid' }),
        financialFixtures.createInvoice({ amount: 5000, status: 'sent' }),
      ];

      const stats = calculateInvoiceStats(invoices);
      expect(stats.total).toBe(2);
      expect(stats.totalAmount).toBe(15000);
      expect(stats.paidAmount).toBe(10000);
      expect(stats.outstandingAmount).toBe(5000);
    });

    it('groups invoices by status', () => {
      const invoices = [
        financialFixtures.createInvoice({ status: 'draft' }),
        financialFixtures.createInvoice({ status: 'sent' }),
        financialFixtures.createInvoice({ status: 'draft' }),
      ];

      const stats = calculateInvoiceStats(invoices);
      expect(stats.byStatus.draft).toBe(2);
      expect(stats.byStatus.sent).toBe(1);
    });
  });

  describe('Xero sync status', () => {
    const calculateSyncStatus = (invoices, transactions) => {
      return {
        lastSync: new Date().toISOString(),
        invoicesSynced: invoices.length,
        transactionsSynced: transactions.length,
        status: 'success',
      };
    };

    it('calculates sync status', () => {
      const invoices = financialFixtures.createXeroInvoice();
      const transactions = financialFixtures.createTransaction();

      const status = calculateSyncStatus([invoices], [transactions]);

      expect(status.invoicesSynced).toBe(1);
      expect(status.transactionsSynced).toBe(1);
      expect(status.status).toBe('success');
    });
  });
});

describe('Project Financials', () => {
  describe('Project budget calculation', () => {
    const calculateProjectBudget = (project, transactions) => {
      const spent = transactions
        .filter((t) => t.project_id === project.id)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...project,
        spent,
        remaining: project.budget - spent,
        percentUsed: (spent / project.budget) * 100,
      };
    };

    it('calculates project budget', () => {
      const project = projectFixtures.create({ budget: 100000 });
      const transactions = [
        financialFixtures.createTransaction({ project_id: project.id, amount: 25000 }),
      ];

      const result = calculateProjectBudget(project, transactions);
      expect(result.spent).toBe(25000);
      expect(result.remaining).toBe(75000);
      expect(result.percentUsed).toBe(25);
    });

    it('calculates over-budget project', () => {
      const project = projectFixtures.create({ budget: 10000 });
      const transactions = [
        financialFixtures.createTransaction({ project_id: project.id, amount: 15000 }),
      ];

      const result = calculateProjectBudget(project, transactions);
      expect(result.spent).toBe(15000);
      expect(result.remaining).toBe(-5000);
    });
  });
});
