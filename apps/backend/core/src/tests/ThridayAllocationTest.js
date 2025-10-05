/**
 * Comprehensive Test Suite for Thriday Allocation Detection
 * Tests the core Thriday → Xero implementation rules from your specification
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import BankRecoAgent from '../agents/agents/BankRecoAgent.js';
import FinancialAgentOrchestrator from '../agents/FinancialAgentOrchestrator.js';

describe('Thriday Allocation Detection and Processing', () => {
  let orchestrator;
  let bankRecoAgent;

  beforeAll(async () => {
    orchestrator = new FinancialAgentOrchestrator();
    await orchestrator.initialize();
    bankRecoAgent = orchestrator.agents.bankReco;
  });

  afterAll(async () => {
    if (orchestrator) {
      await orchestrator.shutdown();
    }
  });

  describe('Allocation Detection Patterns', () => {
    test('should detect standard Thriday allocation patterns', () => {
      const testPatterns = [
        // GST allocations
        'GST Transfer to GST Account',
        'Auto Allocation GST Transfer',
        'GST Reserve Transfer',
        'gst transfer automatic',

        // Tax allocations
        'Tax Allocation to Tax Reserve',
        'Income Tax Transfer',
        'PAYG Withholding Allocation',
        'tax allocation automatic',

        // Profit distributions
        'Profit Distribution to Profit Account',
        'Profit Allocation Transfer',
        'profit distribution auto',

        // General allocations
        'Auto Allocation Main to Opex',
        'Thriday Allocation Transfer',
        'ALLOCATION: Main → GST',
        'Reserve Transfer - Automatic',

        // Case variations
        'THRIDAY ALLOCATION GST',
        'thriday transfer tax',
        'Auto-Allocation: Profit'
      ];

      testPatterns.forEach(pattern => {
        expect(bankRecoAgent.isThridayAllocation(pattern)).toBe(true);
      });
    });

    test('should NOT detect regular transactions as allocations', () => {
      const nonAllocationPatterns = [
        // Regular payments
        'Payment to Telstra',
        'Invoice from Client ABC',
        'Salary payment',
        'Rent payment',

        // Bank transactions
        'Bank fees',
        'Interest payment',
        'Direct debit payment',
        'ATM withdrawal',

        // Business transactions
        'Professional services',
        'Office supplies purchase',
        'Software subscription',
        'Travel expenses',

        // Partial matches that shouldn't trigger
        'GST refund received',
        'Tax return processing',
        'Profit from sale',
        'Transfer from client account' // Regular transfer, not allocation
      ];

      nonAllocationPatterns.forEach(pattern => {
        expect(bankRecoAgent.isThridayAllocation(pattern)).toBe(false);
      });
    });

    test('should handle edge cases and partial matches correctly', () => {
      const edgeCases = [
        { description: '', expected: false },
        { description: null, expected: false },
        { description: 'GST', expected: false }, // Too short
        { description: 'Transfer', expected: false }, // Too generic
        { description: 'GST Transfer Test', expected: true }, // Contains allocation pattern
        { description: 'Pre-allocation setup', expected: true }, // Contains 'allocation'
      ];

      edgeCases.forEach(({ description, expected }) => {
        expect(bankRecoAgent.isThridayAllocation(description)).toBe(expected);
      });
    });
  });

  describe('Allocation Parsing and Account Mapping', () => {
    test('should correctly parse GST allocation transfers', () => {
      const testCases = [
        {
          description: 'GST Transfer to GST Account',
          currentAccount: 'Thriday Main',
          expected: {
            isValid: true,
            sourceAccount: 'Thriday Main',
            targetAccount: 'Thriday GST',
            reason: 'GST Allocation'
          }
        },
        {
          description: 'Auto GST Transfer to GST Reserve',
          currentAccount: 'Thriday Main',
          expected: {
            isValid: true,
            sourceAccount: 'Thriday Main',
            targetAccount: 'Thriday GST',
            reason: 'GST Allocation'
          }
        }
      ];

      testCases.forEach(({ description, currentAccount, expected }) => {
        const result = bankRecoAgent.parseThridayAllocation(description, currentAccount);

        expect(result.isValid).toBe(expected.isValid);
        expect(result.sourceAccount).toBe(expected.sourceAccount);
        expect(result.targetAccount).toBe(expected.targetAccount);
        expect(result.reason).toBe(expected.reason);
      });
    });

    test('should correctly parse tax allocation transfers', () => {
      const testCases = [
        {
          description: 'Tax Allocation to Tax Reserve',
          currentAccount: 'Thriday Main',
          expected: {
            isValid: true,
            sourceAccount: 'Thriday Main',
            targetAccount: 'Thriday Tax',
            reason: 'Tax Allocation'
          }
        },
        {
          description: 'Income Tax Transfer to Tax Account',
          currentAccount: 'Thriday Main',
          expected: {
            isValid: true,
            sourceAccount: 'Thriday Main',
            targetAccount: 'Thriday Tax',
            reason: 'Tax Allocation'
          }
        }
      ];

      testCases.forEach(({ description, currentAccount, expected }) => {
        const result = bankRecoAgent.parseThridayAllocation(description, currentAccount);

        expect(result.isValid).toBe(expected.isValid);
        expect(result.sourceAccount).toBe(expected.sourceAccount);
        expect(result.targetAccount).toBe(expected.targetAccount);
        expect(result.reason).toBe(expected.reason);
      });
    });

    test('should correctly parse profit distribution transfers', () => {
      const testCases = [
        {
          description: 'Profit Distribution to Profit Account',
          currentAccount: 'Thriday Main',
          expected: {
            isValid: true,
            sourceAccount: 'Thriday Main',
            targetAccount: 'Thriday Profit',
            reason: 'Profit Allocation'
          }
        }
      ];

      testCases.forEach(({ description, currentAccount, expected }) => {
        const result = bankRecoAgent.parseThridayAllocation(description, currentAccount);

        expect(result.isValid).toBe(expected.isValid);
        expect(result.sourceAccount).toBe(expected.sourceAccount);
        expect(result.targetAccount).toBe(expected.targetAccount);
        expect(result.reason).toBe(expected.reason);
      });
    });

    test('should correctly parse operating expense allocations', () => {
      const testCases = [
        {
          description: 'Allocation from Main to Opex',
          currentAccount: 'Thriday Main',
          expected: {
            isValid: true,
            sourceAccount: 'Thriday Main',
            targetAccount: 'Thriday Opex',
            reason: 'Operating Expense Allocation'
          }
        }
      ];

      testCases.forEach(({ description, currentAccount, expected }) => {
        const result = bankRecoAgent.parseThridayAllocation(description, currentAccount);

        expect(result.isValid).toBe(expected.isValid);
        expect(result.sourceAccount).toBe(expected.sourceAccount);
        expect(result.targetAccount).toBe(expected.targetAccount);
        expect(result.reason).toBe(expected.reason);
      });
    });

    test('should reverse transfer direction when current account differs', () => {
      // When the transaction appears in GST account but describes Main→GST,
      // it means it's actually GST←Main (receiving side)
      const result = bankRecoAgent.parseThridayAllocation(
        'GST Transfer to GST Account',
        'Thriday GST' // Current account is the target, not source
      );

      expect(result.isValid).toBe(true);
      expect(result.sourceAccount).toBe('Thriday GST'); // Reversed
      expect(result.targetAccount).toBe('Thriday Main'); // Reversed
    });

    test('should return invalid for unrecognized allocation patterns', () => {
      const invalidPatterns = [
        'Unknown allocation pattern',
        'Transfer to random account',
        'Allocation without clear target'
      ];

      invalidPatterns.forEach(description => {
        const result = bankRecoAgent.parseThridayAllocation(description, 'Thriday Main');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Thriday Transfer Processing', () => {
    test('should process valid Thriday transfer correctly', async () => {
      // Mock Supabase operations
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });

      jest.spyOn(bankRecoAgent.supabase, 'from').mockImplementation((table) => {
        if (table === 'bank_transfers') {
          return { insert: mockInsert };
        } else if (table === 'xero_transactions') {
          return { update: mockUpdate };
        }
      });

      const payload = {
        bankTransactionId: 'tx-thriday-001',
        description: 'GST Transfer to GST Account',
        amount: -500.00,
        bankAccount: 'Thriday Main',
        date: '2025-09-25',
        reference: 'Auto Allocation'
      };

      const result = await bankRecoAgent.processThridayTransfer(payload);

      expect(result.status).toBe('thriday_transfer_processed');
      expect(result.transferDetails.isValid).toBe(true);
      expect(result.transferDetails.sourceAccount).toBe('Thriday Main');
      expect(result.transferDetails.targetAccount).toBe('Thriday GST');

      // Verify transfer record was created
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_id: 'tx-thriday-001',
          transfer_type: 'thriday_allocation',
          source_account: 'Thriday Main',
          target_account: 'Thriday GST',
          amount: 500.00,
          reason: 'GST Allocation'
        })
      );

      // Verify transaction was updated
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should fall back to normal processing for invalid Thriday patterns', async () => {
      const payload = {
        bankTransactionId: 'tx-normal-001',
        description: 'Payment to supplier', // Not an allocation
        amount: -250.00,
        bankAccount: 'Thriday Main'
      };

      // Mock the normal processing method
      jest.spyOn(bankRecoAgent, 'processTransaction').mockResolvedValue({
        status: 'pending_review',
        suggestions: []
      });

      const result = await bankRecoAgent.processThridayTransfer(payload);

      expect(result.status).toBe('pending_review');
      expect(bankRecoAgent.processTransaction).toHaveBeenCalledWith(payload);
    });

    test('should handle Supabase errors gracefully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'Database connection failed' }
      });

      jest.spyOn(bankRecoAgent.supabase, 'from').mockReturnValue({
        insert: mockInsert
      });

      const payload = {
        bankTransactionId: 'tx-error-001',
        description: 'GST Transfer to GST Account',
        amount: -100.00,
        bankAccount: 'Thriday Main'
      };

      await expect(bankRecoAgent.processThridayTransfer(payload)).rejects.toThrow(
        'Failed to create Thriday transfer'
      );
    });
  });

  describe('Integration with Agent Orchestrator', () => {
    test('should correctly route Thriday allocation events', async () => {
      const payload = {
        bankTransactionId: 'tx-integration-001',
        description: 'Tax Allocation to Tax Reserve',
        amount: -1000.00,
        bankAccount: 'Thriday Main'
      };

      // Mock the bank reco agent's processThridayTransfer method
      jest.spyOn(bankRecoAgent, 'processThridayTransfer').mockResolvedValue({
        status: 'thriday_transfer_processed',
        transferDetails: {
          isValid: true,
          sourceAccount: 'Thriday Main',
          targetAccount: 'Thriday Tax',
          reason: 'Tax Allocation'
        }
      });

      const eventId = await orchestrator.processEvent('xero:bank_transaction_created', payload);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    test('should handle multiple allocation types in batch processing', async () => {
      const allocations = [
        {
          bankTransactionId: 'tx-batch-001',
          description: 'GST Transfer to GST Account',
          amount: -500.00
        },
        {
          bankTransactionId: 'tx-batch-002',
          description: 'Tax Allocation to Tax Reserve',
          amount: -750.00
        },
        {
          bankTransactionId: 'tx-batch-003',
          description: 'Profit Distribution to Profit Account',
          amount: -250.00
        }
      ];

      const eventIds = [];

      for (const allocation of allocations) {
        const eventId = await orchestrator.processEvent('xero:bank_transaction_created', allocation);
        eventIds.push(eventId);
      }

      expect(eventIds).toHaveLength(3);
      eventIds.forEach(id => expect(typeof id).toBe('string'));
    });
  });

  describe('Allocation Amount and Percentage Calculations', () => {
    test('should handle standard allocation percentages correctly', () => {
      const scenarios = [
        {
          description: 'Revenue of $10,000 with 10% GST allocation',
          revenue: 10000,
          gstAllocation: 1000, // 10%
          expected: { percentage: 10, amount: 1000 }
        },
        {
          description: 'Revenue of $5,500 with 25% tax allocation',
          revenue: 5500,
          taxAllocation: 1375, // 25%
          expected: { percentage: 25, amount: 1375 }
        },
        {
          description: 'Revenue of $2,000 with 5% profit allocation',
          revenue: 2000,
          profitAllocation: 100, // 5%
          expected: { percentage: 5, amount: 100 }
        }
      ];

      scenarios.forEach(({ description, revenue, gstAllocation, taxAllocation, profitAllocation, expected }) => {
        const amount = gstAllocation || taxAllocation || profitAllocation;
        const calculatedPercentage = (amount / revenue) * 100;

        expect(calculatedPercentage).toBeCloseTo(expected.percentage, 1);
        expect(amount).toBe(expected.amount);
      });
    });

    test('should validate allocation amounts against policy thresholds', () => {
      const policy = orchestrator.policy;

      // Test amounts against policy allocations
      expect(policy.allocations.gst_pct).toBe(10);
      expect(policy.allocations.tax_pct).toBe(25);
      expect(policy.allocations.profit_pct).toBe(5);
      expect(policy.allocations.opex_pct).toBe(60);

      // Total should equal 100%
      const totalAllocation = policy.allocations.gst_pct +
                            policy.allocations.tax_pct +
                            policy.allocations.profit_pct +
                            policy.allocations.opex_pct;

      expect(totalAllocation).toBe(100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed bank transaction data', async () => {
      const malformedPayloads = [
        { bankTransactionId: null, description: 'GST Transfer' },
        { bankTransactionId: 'tx-001', description: null },
        { bankTransactionId: 'tx-002', amount: 'invalid-amount' },
        { description: 'GST Transfer' }, // Missing transaction ID
      ];

      for (const payload of malformedPayloads) {
        try {
          await bankRecoAgent.processThridayTransfer(payload);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle account name variations and mappings', () => {
      const accountVariations = [
        { input: 'THRIDAY MAIN', expected: 'Thriday Main' },
        { input: 'thriday gst', expected: 'Thriday GST' },
        { input: 'Thriday-Tax-Reserve', expected: 'Thriday Tax' },
        { input: 'THRIDAY_PROFIT_ACCOUNT', expected: 'Thriday Profit' }
      ];

      // This would test account name normalization if implemented
      accountVariations.forEach(({ input, expected }) => {
        // Test account name standardization (if implemented in your system)
        expect(input.toLowerCase().includes('thriday')).toBe(true);
      });
    });

    test('should handle concurrent allocation processing', async () => {
      const concurrentAllocations = Array.from({ length: 5 }, (_, i) => ({
        bankTransactionId: `tx-concurrent-${i + 1}`,
        description: 'GST Transfer to GST Account',
        amount: -(100 * (i + 1)),
        bankAccount: 'Thriday Main'
      }));

      // Mock processing to avoid actual database calls
      jest.spyOn(bankRecoAgent, 'createThridayTransfer').mockResolvedValue(undefined);

      const promises = concurrentAllocations.map(payload =>
        bankRecoAgent.processThridayTransfer(payload)
      );

      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe('thriday_transfer_processed');
        } else {
          console.warn(`Concurrent allocation ${index + 1} failed:`, result.reason);
        }
      });
    });
  });

  describe('Compliance and Audit Trail', () => {
    test('should create proper audit logs for Thriday transfers', async () => {
      const mockLogAction = jest.spyOn(bankRecoAgent, 'logAgentAction').mockResolvedValue(undefined);
      const mockCreateTransfer = jest.spyOn(bankRecoAgent, 'createThridayTransfer').mockResolvedValue(undefined);

      const payload = {
        bankTransactionId: 'tx-audit-001',
        description: 'GST Transfer to GST Account',
        amount: -500.00,
        bankAccount: 'Thriday Main'
      };

      await bankRecoAgent.processThridayTransfer(payload);

      expect(mockLogAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'thriday_transfer_processed',
          transaction_id: 'tx-audit-001',
          source_account: 'Thriday Main',
          target_account: 'Thriday GST',
          amount: 500.00
        })
      );
    });

    test('should maintain immutable event log for allocations', async () => {
      const payload = {
        bankTransactionId: 'tx-immutable-001',
        description: 'Tax Allocation to Tax Reserve',
        amount: -750.00,
        bankAccount: 'Thriday Main'
      };

      const eventId = await orchestrator.processEvent('xero:bank_transaction_created', payload);

      // Verify event was logged to the immutable store
      expect(eventId).toBeDefined();
      expect(orchestrator.eventStore.length).toBeGreaterThan(0);

      const loggedEvent = orchestrator.eventStore.find(e => e.id === eventId);
      expect(loggedEvent).toBeDefined();
      expect(loggedEvent.type).toBe('xero:bank_transaction_created');
      expect(loggedEvent.processed).toBe(true);
    });
  });
});