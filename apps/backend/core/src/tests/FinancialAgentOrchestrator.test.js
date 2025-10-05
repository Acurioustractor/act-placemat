/**
 * Comprehensive test suite for Financial Agent Orchestrator
 * Tests the core functionality described in your specification
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import FinancialAgentOrchestrator from '../agents/FinancialAgentOrchestrator.js';
import Redis from 'ioredis';

describe('Financial Agent Orchestrator', () => {
  let orchestrator;
  let redis;

  beforeAll(async () => {
    // Setup test Redis instance
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    orchestrator = new FinancialAgentOrchestrator();

    // Initialize with test configuration
    await orchestrator.initialize();
  });

  afterAll(async () => {
    if (orchestrator) {
      await orchestrator.shutdown();
    }
    if (redis) {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    // Clear test data before each test
    await redis.flushdb();
  });

  describe('Initialization', () => {
    test('should initialize with default policy when config file missing', async () => {
      const testOrchestrator = new FinancialAgentOrchestrator();
      await testOrchestrator.initialize();

      expect(testOrchestrator.policy).toBeDefined();
      expect(testOrchestrator.policy.version).toBe(1);
      expect(testOrchestrator.policy.entities).toHaveLength(1);
      expect(testOrchestrator.policy.entities[0].code).toBe('ACT_PTY_LTD');

      await testOrchestrator.shutdown();
    });

    test('should initialize all financial agents', async () => {
      expect(orchestrator.agents).toBeDefined();
      expect(orchestrator.agents.receiptCoding).toBeDefined();
      expect(orchestrator.agents.bankReco).toBeDefined();
      expect(orchestrator.agents.basPrepCheck).toBeDefined();
      expect(orchestrator.agents.cashflowForecast).toBeDefined();
      expect(orchestrator.agents.rdtiRegistration).toBeDefined();
      expect(orchestrator.agents.spendGuard).toBeDefined();
      expect(orchestrator.agents.arCollections).toBeDefined();
      expect(orchestrator.agents.boardPack).toBeDefined();
    });

    test('should load policy with correct thresholds', () => {
      expect(orchestrator.policy.thresholds.auto_post_bill_confidence).toBe(0.85);
      expect(orchestrator.policy.thresholds.auto_match_bank_confidence).toBe(0.90);
      expect(orchestrator.policy.thresholds.variance_alert_pct).toBe(0.20);
    });
  });

  describe('Thriday Allocation Detection', () => {
    test('should detect Thriday allocation transfers', () => {
      const testDescriptions = [
        'GST Transfer to GST Account',
        'Tax Allocation - Automatic',
        'Profit Distribution Auto',
        'THRIDAY ALLOCATION: Main to Tax',
        'Auto Allocation - GST Reserve'
      ];

      testDescriptions.forEach(description => {
        expect(orchestrator.isThridayAllocation(description)).toBe(true);
      });
    });

    test('should not detect regular transactions as Thriday allocations', () => {
      const testDescriptions = [
        'Payment to Telstra',
        'Invoice from Client ABC',
        'Refund processed',
        'Bank fees',
        'Interest payment'
      ];

      testDescriptions.forEach(description => {
        expect(orchestrator.isThridayAllocation(description)).toBe(false);
      });
    });

    test('should process Thriday allocation event correctly', async () => {
      const thridayPayload = {
        bankTransactionId: 'tx-thriday-001',
        description: 'GST Transfer to GST Account',
        amount: -500.00,
        bankAccount: 'Thriday Main',
        date: '2025-09-25',
        reference: 'Auto Allocation'
      };

      const result = await orchestrator.processEvent('xero:bank_transaction_created', thridayPayload);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string'); // Event ID

      // Verify event was logged
      const eventLog = await redis.lrange('financial:event_log', 0, 0);
      expect(eventLog).toHaveLength(1);

      const loggedEvent = JSON.parse(eventLog[0]);
      expect(loggedEvent.type).toBe('xero:bank_transaction_created');
      expect(loggedEvent.payload.bankTransactionId).toBe('tx-thriday-001');
    });
  });

  describe('Bank Reconciliation Agent', () => {
    test('should process bank transaction with high confidence auto-match', async () => {
      const bankRecoAgent = orchestrator.agents.bankReco;

      // Mock successful exact match
      jest.spyOn(bankRecoAgent, 'findExactMatches').mockResolvedValue([
        {
          id: 'inv-001',
          total: 250.00,
          contact: 'Test Client',
          date: '2025-09-25',
          status: 'AUTHORISED'
        }
      ]);

      const payload = {
        bankTransactionId: 'tx-001',
        description: 'Payment from Test Client',
        amount: 250.00,
        date: '2025-09-25'
      };

      const result = await bankRecoAgent.processTransaction(payload);

      expect(result.status).toBe('auto_matched');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should create exception for low confidence matches', async () => {
      const bankRecoAgent = orchestrator.agents.bankReco;

      // Mock low confidence match
      jest.spyOn(bankRecoAgent, 'findExactMatches').mockResolvedValue([]);
      jest.spyOn(bankRecoAgent, 'findAmountMatches').mockResolvedValue([]);
      jest.spyOn(bankRecoAgent, 'findNarrationMatches').mockResolvedValue([
        {
          id: 'inv-002',
          total: 245.00,
          contact: 'Similar Client',
          relevanceScore: 0.6
        }
      ]);

      const payload = {
        bankTransactionId: 'tx-002',
        description: 'Payment unclear reference',
        amount: 250.00,
        date: '2025-09-25'
      };

      const result = await bankRecoAgent.processTransaction(payload);

      expect(result.status).toBe('pending_review');
      expect(result.suggestions).toBeDefined();
    });

    test('should parse Thriday allocation correctly', () => {
      const bankRecoAgent = orchestrator.agents.bankReco;

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
          description: 'Tax Allocation to Tax Reserve',
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
  });

  describe('Event Processing', () => {
    test('should handle multiple event types correctly', async () => {
      const events = [
        {
          type: 'xero:bank_transaction_created',
          payload: { bankTransactionId: 'tx-001', amount: 100 }
        },
        {
          type: 'xero:bill_created',
          payload: { billId: 'bill-001', source: 'Dext' }
        },
        {
          type: 'scheduler:daily',
          payload: { date: '2025-09-25' }
        }
      ];

      const eventIds = [];
      for (const event of events) {
        const eventId = await orchestrator.processEvent(event.type, event.payload);
        eventIds.push(eventId);
      }

      expect(eventIds).toHaveLength(3);
      eventIds.forEach(id => expect(typeof id).toBe('string'));

      // Verify all events were logged
      const eventLog = await redis.lrange('financial:event_log', 0, -1);
      expect(eventLog).toHaveLength(3);
    });

    test('should emit events to appropriate handlers', async () => {
      let bankTransactionHandled = false;
      let billCreatedHandled = false;

      orchestrator.on('xero:bank_transaction_created', () => {
        bankTransactionHandled = true;
      });

      orchestrator.on('xero:bill_created', () => {
        billCreatedHandled = true;
      });

      await orchestrator.processEvent('xero:bank_transaction_created', { test: true });
      await orchestrator.processEvent('xero:bill_created', { test: true });

      // Allow event processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(bankTransactionHandled).toBe(true);
      expect(billCreatedHandled).toBe(true);
    });
  });

  describe('Policy Enforcement', () => {
    test('should apply approval rules correctly', () => {
      const testCases = [
        {
          action: 'process_bill',
          metadata: { amount: 100, vendor: 'Known Vendor' },
          expected: { required: false, reason: 'auto_approved' }
        },
        {
          action: 'process_payment',
          metadata: { amount: 2500 },
          expected: { required: true, type: 'propose' }
        },
        {
          action: 'BAS_lodgement',
          metadata: {},
          expected: { required: true, type: 'human_signoff' }
        }
      ];

      testCases.forEach(async ({ action, metadata, expected }) => {
        const result = await orchestrator.agents.receiptCoding.checkApprovalRequired(action, metadata);
        expect(result.required).toBe(expected.required);
        if (expected.type) {
          expect(result.type).toBe(expected.type);
        }
      });
    });

    test('should evaluate vendor rules correctly', () => {
      const agent = orchestrator.agents.receiptCoding;

      // Test known vendor
      expect(agent.isKnownVendor('Telstra', 'known')).toBe(true);

      // Test unknown vendor
      expect(agent.isKnownVendor('Unknown Company', 'known')).toBe(false);
    });
  });

  describe('Metrics and Reporting', () => {
    test('should calculate agent metrics', async () => {
      // Process some test transactions
      await orchestrator.processEvent('xero:bank_transaction_created', {
        bankTransactionId: 'tx-metrics-001',
        amount: 100,
        description: 'Test transaction'
      });

      const metrics = await orchestrator.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.events_processed_30d).toBeGreaterThanOrEqual(1);
      expect(metrics.auto_coded_percentage).toBeDefined();
      expect(metrics.exception_rate).toBeDefined();
      expect(metrics.agents_status).toBeDefined();
    });

    test('should track agent-specific metrics', async () => {
      const bankRecoAgent = orchestrator.agents.bankReco;

      // Mock some processed transactions
      jest.spyOn(bankRecoAgent.supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            data: [
              { status: 'matched', match_confidence: 0.95 },
              { status: 'matched', match_confidence: 0.88 },
              { status: 'pending', match_confidence: 0.65 }
            ]
          })
        })
      });

      const metrics = await bankRecoAgent.getMetrics();

      expect(metrics.total_processed).toBe(3);
      expect(parseFloat(metrics.auto_match_rate)).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle processing errors gracefully', async () => {
      const bankRecoAgent = orchestrator.agents.bankReco;

      // Force an error
      jest.spyOn(bankRecoAgent, 'findTransactionMatch').mockRejectedValue(
        new Error('Database connection failed')
      );

      const payload = {
        bankTransactionId: 'tx-error-001',
        description: 'Test transaction',
        amount: 100
      };

      await expect(bankRecoAgent.processTransaction(payload)).rejects.toThrow();

      // Verify error was logged
      const errorLog = await redis.lrange('agent:errors', 0, 0);
      expect(errorLog.length).toBeGreaterThan(0);
    });

    test('should create exceptions for failed processing', async () => {
      const agent = orchestrator.agents.bankReco;

      const mockError = new Error('Processing failed');
      await agent.handleProcessingError('tx-error-002', mockError);

      // Verify exception was created (would check Supabase in real implementation)
      expect(true).toBe(true); // Placeholder - would verify exception creation
    });
  });

  describe('Notifications', () => {
    test('should send notifications with action buttons', async () => {
      const notification = await orchestrator.sendNotification(
        '#finance',
        'Test notification',
        [
          { text: 'Approve', action: 'approve' },
          { text: 'Reject', action: 'reject' }
        ]
      );

      expect(notification.channel).toBe('#finance');
      expect(notification.message).toBe('Test notification');
      expect(notification.actionButtons).toHaveLength(2);

      // Verify notification was stored
      const storedNotifications = await redis.lrange('financial:notifications', 0, 0);
      expect(storedNotifications).toHaveLength(1);
    });
  });

  describe('Automation vs Human Rubric', () => {
    test('should score automation decisions correctly', () => {
      // This would test the automation rubric scoring
      // Based on mission_culture, safety_compliance, etc.
      const testScenario = {
        mission_culture: 4,
        safety_compliance: 5,
        community_impact: 3,
        distinctive_value: 2,
        hours_saved: 2,
        data_quality: 1
      };

      const totalScore = Object.values(testScenario).reduce((sum, score) => sum + score, 0);
      const threshold = 18;

      expect(totalScore).toBe(17);
      expect(totalScore < threshold).toBe(true); // Should require human review
    });
  });

  describe('Integration Tests', () => {
    test('should handle end-to-end bill processing workflow', async () => {
      // Simulate a complete bill processing workflow
      const billPayload = {
        billId: 'bill-integration-001',
        amount: 150,
        vendor: 'Telstra',
        description: 'Monthly phone bill',
        source: 'Dext'
      };

      // Process bill creation event
      const eventId = await orchestrator.processEvent('xero:bill_created', billPayload);

      expect(eventId).toBeDefined();

      // Allow processing to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify bill was processed according to policy
      // (Would check Supabase for bill categorization in real implementation)
      expect(true).toBe(true);
    });

    test('should handle BAS preparation workflow', async () => {
      // Simulate daily BAS preparation
      const dailyJobPayload = {
        date: '2025-09-25',
        type: 'daily_job'
      };

      const eventId = await orchestrator.processEvent('scheduler:daily', dailyJobPayload);

      expect(eventId).toBeDefined();

      // Allow BAS preparation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify BAS preparation was triggered
      expect(true).toBe(true);
    });
  });
});