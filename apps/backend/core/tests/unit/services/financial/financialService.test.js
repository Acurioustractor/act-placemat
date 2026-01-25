/**
 * Tests for Financial Service
 *
 * Unit tests for financial data operations - simplified
 */
import { describe, it, expect } from 'vitest';
import { financialFixtures, projectFixtures } from '../../../utils/mock-services.js';

describe('FinancialService Utilities', () => {
  describe('financialFixtures.createTransaction', () => {
    it('creates a transaction', () => {
      const transaction = financialFixtures.createTransaction();

      expect(transaction).toHaveProperty('id');
      expect(transaction.type).toBe('income');
      expect(transaction.amount).toBe(5000);
      expect(transaction.currency).toBe('AUD');
    });

    it('creates transaction with overrides', () => {
      const transaction = financialFixtures.createTransaction({
        type: 'expense',
        amount: 10000,
      });

      expect(transaction.type).toBe('expense');
      expect(transaction.amount).toBe(10000);
    });
  });

  describe('financialFixtures.createInvoice', () => {
    it('creates an invoice', () => {
      const invoice = financialFixtures.createInvoice();

      expect(invoice).toHaveProperty('id');
      expect(invoice.invoice_number).toBeDefined();
      expect(invoice.amount).toBe(10000);
      expect(invoice.currency).toBe('AUD');
      expect(invoice.status).toBe('draft');
      expect(invoice.line_items).toBeInstanceOf(Array);
    });
  });

  describe('financialFixtures.createXeroInvoice', () => {
    it('creates a Xero invoice', () => {
      const invoice = financialFixtures.createXeroInvoice();

      expect(invoice).toHaveProperty('InvoiceID');
      expect(invoice).toHaveProperty('Status');
      expect(invoice).toHaveProperty('Total');
      expect(invoice).toHaveProperty('Contact');
    });
  });
});

describe('Financial Calculations', () => {
  describe('totals calculation', () => {
    const calculateTotals = (transactions) => {
      const totals = {
        income: 0,
        expense: 0,
        net: 0,
      };

      transactions.forEach((txn) => {
        if (txn.type === 'income') {
          totals.income += txn.amount;
        } else if (txn.type === 'expense') {
          totals.expense += txn.amount;
        }
      });

      totals.net = totals.income - totals.expense;
      return totals;
    };

    it('calculates income total', () => {
      const transactions = [
        { amount: 1000, type: 'income' },
        { amount: 2000, type: 'income' },
      ];

      const totals = calculateTotals(transactions);
      expect(totals.income).toBe(3000);
      expect(totals.expense).toBe(0);
    });

    it('calculates expense total', () => {
      const transactions = [
        { amount: 500, type: 'expense' },
        { amount: 300, type: 'expense' },
      ];

      const totals = calculateTotals(transactions);
      expect(totals.expense).toBe(800);
      expect(totals.income).toBe(0);
    });

    it('calculates net income', () => {
      const transactions = [
        { amount: 5000, type: 'income' },
        { amount: 2000, type: 'expense' },
      ];

      const totals = calculateTotals(transactions);
      expect(totals.net).toBe(3000);
    });
  });
});

describe('Project Fixtures', () => {
  it('creates a project', () => {
    const project = projectFixtures.create();

    expect(project).toHaveProperty('id');
    expect(project.name).toBe('Climate Tech Initiative');
    expect(project.status).toBe('active');
    expect(project.priority).toBe('high');
  });

  it('creates project with overrides', () => {
    const project = projectFixtures.create({
      name: 'Custom Project',
      status: 'completed',
    });

    expect(project.name).toBe('Custom Project');
    expect(project.status).toBe('completed');
  });

  it('creates multiple projects', () => {
    const projects = projectFixtures.createMany(3);

    expect(projects).toHaveLength(3);
  });
});
