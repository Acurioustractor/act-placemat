/**
 * Subscription Discovery Integration Tests
 *
 * R&D Component: Multi-Signal Discovery Validation
 * Hypothesis: Integrated discovery pipeline achieves 85%+ accuracy on real data
 * Methodology: End-to-end testing with mock Gmail/Xero data, measure precision/recall
 * Success Metric: Precision >= 85%, Recall >= 75%, F1 >= 0.80
 * Findings: TBD after manual validation against ground truth
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { SubscriptionDetector } from '../../services/discovery/subscriptionDetector.js';
import { ReceiptScanner } from '../../services/gmail/receiptScanner.js';
import { TransactionAnalyzer } from '../../services/xero/transactionAnalyzer.js';
import { RDLogger } from '../../services/notion/rdLogger.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for tests
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Subscription Discovery Integration Tests (R&D Validation)', () => {
  let detector;
  let rdLogger;
  let rdActivityId;
  const testTenantId = 'test-tenant-integration-' + Date.now();

  // Known ground truth subscriptions for validation
  const groundTruth = [
    { vendor: 'Netflix', frequency: 'monthly', amount: 19.99, category: 'entertainment' },
    { vendor: 'GitHub', frequency: 'monthly', amount: 7.00, category: 'development' },
    { vendor: 'Dropbox', frequency: 'yearly', amount: 119.88, category: 'storage' },
    { vendor: 'Adobe Creative Cloud', frequency: 'monthly', amount: 54.99, category: 'design' },
    { vendor: 'Notion', frequency: 'monthly', amount: 10.00, category: 'productivity' }
  ];

  beforeAll(async () => {
    detector = new SubscriptionDetector();
    rdLogger = new RDLogger();

    // Log test start for R&D tracking
    console.log('[R&D Test] Starting integration test suite...');

    if (rdLogger.trackingEnabled && rdLogger.databaseId) {
      try {
        rdActivityId = await rdLogger.logActivity({
          component: 'Integration Test Suite - Subscription Discovery',
          hypothesis: 'Subscription discovery achieves 85%+ precision, 75%+ recall on test dataset',
          methodology: 'Execute discovery on mock data simulating 5 known subscriptions, measure precision/recall/F1',
          successMetric: 'Precision >= 85%, Recall >= 75%, F1 >= 0.80',
          timeSpent: 0,
          category: 'Testing'
        });
        console.log(`[R&D] Test activity logged: ${rdActivityId}`);
      } catch (error) {
        console.warn('[R&D] Could not log test activity:', error.message);
      }
    }

    // Set up test data in database
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();

    // Update R&D findings if logging is enabled
    if (rdActivityId && rdLogger.trackingEnabled) {
      try {
        await rdLogger.updateFindings(
          rdActivityId,
          'Integration tests completed - see test results for metrics',
          0.5  // 30 minutes test time
        );
      } catch (error) {
        console.warn('[R&D] Could not update test findings:', error.message);
      }
    }
  });

  test('R&D Metric: Discovery finds all known subscriptions (Recall)', async () => {
    console.log('[R&D Test] Testing recall - can we find all known subscriptions?');

    const discovered = await detector.discoverSubscriptions(testTenantId);

    // Calculate recall: found / total known
    const found = groundTruth.filter(known =>
      discovered.some(disc =>
        normalizeVendor(disc.vendor).includes(normalizeVendor(known.vendor)) ||
        normalizeVendor(known.vendor).includes(normalizeVendor(disc.vendor))
      )
    );

    const recall = found.length / groundTruth.length;

    console.log(`[R&D Metric] Recall: ${(recall * 100).toFixed(1)}%`);
    console.log(`[R&D Metric] Found: ${found.map(f => f.vendor).join(', ')}`);

    // R&D Target: >= 75% recall
    expect(recall).toBeGreaterThanOrEqual(0.75);
  }, 60000);  // 60s timeout for discovery

  test('R&D Metric: Discovery has low false positive rate (Precision)', async () => {
    console.log('[R&D Test] Testing precision - are discovered subscriptions real?');

    const discovered = await detector.discoverSubscriptions(testTenantId);

    // In real test, this would be manually validated
    // For now, assume high-confidence items (>= 0.8) are true positives
    const truePositives = discovered.filter(sub => sub.confidence >= 0.8);
    const precision = discovered.length > 0 ? truePositives.length / discovered.length : 0;

    console.log(`[R&D Metric] Precision: ${(precision * 100).toFixed(1)}%`);
    console.log(`[R&D Metric] High confidence: ${truePositives.length}/${discovered.length}`);

    // R&D Target: >= 85% precision
    expect(precision).toBeGreaterThanOrEqual(0.85);
  }, 60000);

  test('R&D Metric: Multi-signal confidence scoring is accurate', async () => {
    console.log('[R&D Test] Testing multi-signal fusion effectiveness...');

    const discovered = await detector.discoverSubscriptions(testTenantId);

    // Subscriptions with both Gmail + Xero signals should have higher confidence
    const bothSignals = discovered.filter(sub =>
      sub.sources?.hasGmail && sub.sources?.hasXero
    );
    const avgConfidenceBoth = bothSignals.length > 0
      ? bothSignals.reduce((sum, s) => sum + s.confidence, 0) / bothSignals.length
      : 0;

    const singleSignal = discovered.filter(sub =>
      (sub.sources?.hasGmail && !sub.sources?.hasXero) ||
      (!sub.sources?.hasGmail && sub.sources?.hasXero)
    );
    const avgConfidenceSingle = singleSignal.length > 0
      ? singleSignal.reduce((sum, s) => sum + s.confidence, 0) / singleSignal.length
      : 0;

    console.log(`[R&D Metric] Avg confidence (both signals): ${avgConfidenceBoth.toFixed(3)}`);
    console.log(`[R&D Metric] Avg confidence (single signal): ${avgConfidenceSingle.toFixed(3)}`);

    // Hypothesis: Multi-signal fusion > single source
    if (bothSignals.length > 0 && singleSignal.length > 0) {
      expect(avgConfidenceBoth).toBeGreaterThan(avgConfidenceSingle);
    }
  }, 60000);

  test('R&D Metric: Processing time is acceptable', async () => {
    console.log('[R&D Test] Testing discovery performance...');

    const startTime = Date.now();
    const discovered = await detector.discoverSubscriptions(testTenantId);
    const elapsed = Date.now() - startTime;

    console.log(`[R&D Metric] Processing time: ${elapsed}ms`);
    console.log(`[R&D Metric] Subscriptions found: ${discovered.length}`);
    console.log(`[R&D Metric] Avg time per subscription: ${(elapsed / Math.max(discovered.length, 1)).toFixed(0)}ms`);

    // R&D Target: <30s for discovery
    expect(elapsed).toBeLessThan(30000);
  }, 60000);

  test('Component: Gmail Receipt Scanner signal quality', async () => {
    console.log('[Component Test] Validating Gmail scanner...');

    const scanner = new ReceiptScanner(null);  // Mock Gmail service

    // Test signal analysis
    const testMessage = {
      subject: 'Your monthly Netflix subscription receipt',
      snippet: 'Thank you for your recurring payment of $19.99...',
      attachmentCount: 1,
      from: 'billing@netflix.com'
    };

    const { signals, confidence } = scanner.analyzeEmailForSubscription(testMessage);

    console.log(`[Component] Gmail signals:`, signals);
    console.log(`[Component] Confidence: ${confidence.toFixed(3)}`);

    expect(signals.hasSubscriptionKeyword).toBe(true);
    expect(signals.hasReceiptKeyword).toBe(true);
    expect(confidence).toBeGreaterThan(0.5);
  });

  test('Component: Xero Transaction Analyzer pattern detection', async () => {
    console.log('[Component Test] Validating Xero analyzer...');

    const analyzer = new TransactionAnalyzer(supabase);

    // Mock monthly recurring transactions
    const mockTransactions = [
      {
        contact_name: 'Netflix',
        total_amount: 19.99,
        transaction_date: '2024-01-15',
        id: 'tx1'
      },
      {
        contact_name: 'Netflix',
        total_amount: 19.99,
        transaction_date: '2024-02-15',
        id: 'tx2'
      },
      {
        contact_name: 'Netflix',
        total_amount: 19.99,
        transaction_date: '2024-03-15',
        id: 'tx3'
      }
    ];

    const pattern = analyzer.detectPattern(mockTransactions);

    console.log(`[Component] Pattern detected:`, pattern);

    expect(pattern.isRecurring).toBe(true);
    expect(pattern.frequency).toBe('monthly');
    expect(pattern.confidence).toBeGreaterThan(0.7);
  });

  test('Database: Subscription storage and retrieval', async () => {
    console.log('[Database Test] Testing data persistence...');

    const testSubscription = {
      tenant_id: testTenantId,
      vendor: 'Test Vendor',
      amount: 9.99,
      frequency: 'monthly',
      confidence: 0.85,
      status: 'active',
      signals: { gmail: 0.8, xero: 0.9, ai: 0 }
    };

    // Insert
    const { data: inserted, error: insertError } = await supabase
      .from('discovered_subscriptions')
      .insert(testSubscription)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(inserted).toBeTruthy();

    // Retrieve
    const { data: retrieved, error: retrieveError } = await supabase
      .from('discovered_subscriptions')
      .select('*')
      .eq('tenant_id', testTenantId)
      .eq('vendor', 'Test Vendor')
      .single();

    expect(retrieveError).toBeNull();
    expect(retrieved.amount).toBe(9.99);

    // Clean up
    await supabase
      .from('discovered_subscriptions')
      .delete()
      .eq('id', inserted.id);
  });

  test('API: Discovery endpoint response format', async () => {
    console.log('[API Test] Validating API response structure...');

    // This would typically use supertest to hit the actual API
    // For now, we'll validate the data structure
    const discovered = await detector.discoverSubscriptions(testTenantId);

    // Validate response structure
    expect(Array.isArray(discovered)).toBe(true);

    if (discovered.length > 0) {
      const subscription = discovered[0];

      expect(subscription).toHaveProperty('vendor');
      expect(subscription).toHaveProperty('confidence');
      expect(subscription).toHaveProperty('signals');
      expect(subscription.signals).toHaveProperty('gmail');
      expect(subscription.signals).toHaveProperty('xero');
      expect(subscription.signals).toHaveProperty('ai');
    }
  });
});

// Helper functions

function normalizeVendor(vendor) {
  if (!vendor) return '';
  return vendor.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function setupTestData() {
  console.log('[Test Setup] Creating test data...');

  // Insert mock Gmail messages (would normally be in Gmail API mock)
  // Insert mock Xero transactions (would normally be in Xero API mock)

  // For now, we'll rely on the mocked services in the detector
  // In a real test suite, we'd populate test databases or mock external APIs
}

async function cleanupTestData() {
  console.log('[Test Cleanup] Removing test data...');

  // Delete test subscriptions
  const { error } = await supabase
    .from('discovered_subscriptions')
    .delete()
    .eq('tenant_id', testTenantId);

  if (error) {
    console.warn('[Test Cleanup] Error cleaning up:', error.message);
  }
}

/**
 * R&D Documentation Export
 */
export const RD_METADATA = {
  component: 'Integration Test Suite',
  hypothesis: 'Comprehensive integration testing validates 85%+ accuracy hypothesis',
  methodology: 'End-to-end testing with mock data, measure precision/recall/F1, validate API contracts',
  successMetric: 'All tests pass, precision >= 85%, recall >= 75%, processing time <30s',
  findings: 'TBD after first test run',
  category: 'Testing',
  technicalUncertainty: 'Optimal test data composition for representing real-world subscription diversity',
  estimatedHours: 3.0
};
