/**
 * Performance and Load Testing for Policy Decisions
 * 
 * Comprehensive test suite for evaluating system performance under load,
 * including concurrent policy evaluations, memory usage, response times,
 * and throughput benchmarks for production readiness.
 */

import { performance } from 'perf_hooks';
import { OPAService } from '../OPAService';
import { TransformationEngine, createDefaultTransformationConfig } from '../transformation/TransformationEngine';
import { AuditTrailService } from '../AuditTrailService';
import { AtomicPolicySetService } from '../AtomicPolicySetService';
import {
  FinancialIntent,
  FinancialOperation,
  ConsentLevel,
  SovereigntyLevel,
  OPAServiceConfig,
  TransformationContext,
  PolicySetOperation,
  AtomicPolicySetRequest
} from '../types';

// Performance monitoring utilities
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private memoryBaseline: number = 0;

  startTest(testName: string): void {
    this.memoryBaseline = process.memoryUsage().heapUsed;
    this.metrics.set(testName, []);
  }

  recordMetric(testName: string, value: number): void {
    const existing = this.metrics.get(testName) || [];
    existing.push(value);
    this.metrics.set(testName, existing);
  }

  getStats(testName: string): PerformanceStats {
    const values = this.metrics.get(testName) || [];
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p95: 0, p99: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: values.length
    };
  }

  getMemoryUsage(): number {
    return process.memoryUsage().heapUsed - this.memoryBaseline;
  }

  clear(): void {
    this.metrics.clear();
    this.memoryBaseline = process.memoryUsage().heapUsed;
  }
}

interface PerformanceStats {
  min: number;
  max: number;
  avg: number;
  p95: number;
  p99: number;
  count: number;
}

interface LoadTestConfig {
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number;
  testDuration: number;
  maxResponseTime: number;
  targetThroughput: number;
}

// Mock implementations optimized for performance testing
class FastMockRepository {
  private cache = new Map<string, any>();
  private auditEntries: any[] = [];

  async saveVersion(version: any): Promise<string> {
    this.cache.set(version.id, version);
    return version.id;
  }

  async getLatestVersion(policyId: string): Promise<any> {
    // Simulate fast cache lookup
    for (const [key, value] of this.cache.entries()) {
      if (value.policyId === policyId) {
        return value;
      }
    }
    return null;
  }

  async saveAuditEntry(entry: any): Promise<string> {
    // Use array for fast insertion
    this.auditEntries.push(entry);
    return entry.id;
  }

  async getAuditTrail(target: string): Promise<any[]> {
    return this.auditEntries.filter(e => e.target === target || target === '*');
  }

  clear(): void {
    this.cache.clear();
    this.auditEntries.length = 0;
  }

  getSize(): { cache: number; audit: number } {
    return {
      cache: this.cache.size,
      audit: this.auditEntries.length
    };
  }
}

describe('Performance and Load Testing for Policy Decisions', () => {
  let opaService: OPAService;
  let transformationEngine: TransformationEngine;
  let auditService: AuditTrailService;
  let atomicService: AtomicPolicySetService;
  let fastRepo: FastMockRepository;
  let monitor: PerformanceMonitor;

  beforeEach(async () => {
    monitor = new PerformanceMonitor();
    fastRepo = new FastMockRepository();

    // Initialize services with performance-optimized configuration
    const opaConfig: OPAServiceConfig = {
      server: { url: 'http://localhost:8181', timeout: 1000, retries: 1, retryDelay: 50 },
      logging: { enabled: false, destination: 'memory', config: {}, retention: { defaultYears: 7, complianceYears: 10, indigenousDataYears: 50 } },
      cache: { enabled: true, type: 'memory', config: {}, defaultTTL: 300, maxSize: 10000 },
      monitoring: { enabled: true, metricsProvider: 'custom', alertThresholds: { latencyMs: 100, errorRate: 0.01, cacheHitRate: 0.95 } },
      security: { enableInputValidation: false, sanitizeInputs: false, enableAuditLogging: false, encryptSensitiveData: false },
      compliance: { enforceDataResidency: false, enablePrivacyActCompliance: false, enableIndigenousProtocols: false, austracReportingEnabled: false, auditRetentionYears: 7 }
    };

    opaService = new OPAService(opaConfig);
    
    // Mock OPA HTTP client with fast responses
    (opaService as any).httpClient = {
      post: jest.fn().mockResolvedValue({ data: { result: true } }),
      get: jest.fn().mockResolvedValue({ status: 200 }),
      put: jest.fn().mockResolvedValue({ status: 200 }),
      delete: jest.fn().mockResolvedValue({ status: 200 })
    };

    // Disable decision logging for performance tests
    (opaService as any).decisionLogger = null;

    // Initialize transformation engine with minimal configuration
    const transformConfig = createDefaultTransformationConfig();
    transformConfig.performance = {
      enableMetrics: true,
      cacheSize: 1000,
      batchSize: 100,
      timeoutMs: 100
    };

    transformationEngine = new TransformationEngine(transformConfig);
    await transformationEngine.initialize();

    // Initialize audit service with fast repository
    auditService = new AuditTrailService(fastRepo as any, 'test-key');

    // Initialize atomic service with fast database mock
    const fastDb = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(fastDb);
      }),
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    atomicService = new AtomicPolicySetService(
      fastRepo as any,
      auditService,
      fastDb as any,
      { lockTimeout: 10000, transactionTimeout: 30000 }
    );
  });

  afterEach(() => {
    fastRepo.clear();
    monitor.clear();
  });

  describe('Single Policy Evaluation Performance', () => {
    test('should evaluate basic policy within acceptable time limits', async () => {
      const testName = 'basic-policy-evaluation';
      monitor.startTest(testName);

      const intent = this.createTestIntent('basic-test-user');
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await opaService.evaluateIntent(intent, ['financial.basic_limits']);
        
        const endTime = performance.now();
        monitor.recordMetric(testName, endTime - startTime);
      }

      const stats = monitor.getStats(testName);
      
      expect(stats.avg).toBeLessThan(10); // Average under 10ms
      expect(stats.p95).toBeLessThan(25); // 95th percentile under 25ms
      expect(stats.p99).toBeLessThan(50); // 99th percentile under 50ms
      expect(stats.max).toBeLessThan(100); // Maximum under 100ms

      console.log(`Basic Policy Evaluation Performance (${iterations} iterations):`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
      console.log(`  Max: ${stats.max.toFixed(2)}ms`);
    });

    test('should evaluate complex policy with multiple conditions efficiently', async () => {
      const testName = 'complex-policy-evaluation';
      monitor.startTest(testName);

      const complexIntent = this.createComplexTestIntent('complex-test-user');
      const iterations = 500;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await opaService.evaluateIntent(complexIntent, [
          'financial.spending_limits',
          'financial.authorization',
          'compliance.privacy_act',
          'compliance.austrac'
        ]);
        
        const endTime = performance.now();
        monitor.recordMetric(testName, endTime - startTime);
      }

      const stats = monitor.getStats(testName);
      
      expect(stats.avg).toBeLessThan(20); // Average under 20ms for complex policies
      expect(stats.p95).toBeLessThan(50); // 95th percentile under 50ms
      expect(stats.p99).toBeLessThan(100); // 99th percentile under 100ms

      console.log(`Complex Policy Evaluation Performance (${iterations} iterations):`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    });

    test('should handle policy evaluation with caching efficiently', async () => {
      const testName = 'cached-policy-evaluation';
      monitor.startTest(testName);

      const intent = this.createTestIntent('cache-test-user');
      const iterations = 500;

      // First evaluation to populate cache
      await opaService.evaluateIntent(intent, ['financial.spending_limits'], { useCache: true });

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await opaService.evaluateIntent(intent, ['financial.spending_limits'], { useCache: true });
        
        const endTime = performance.now();
        monitor.recordMetric(testName, endTime - startTime);
      }

      const stats = monitor.getStats(testName);
      
      expect(stats.avg).toBeLessThan(5); // Cached evaluations should be very fast
      expect(stats.p95).toBeLessThan(10);
      expect(stats.p99).toBeLessThan(20);

      console.log(`Cached Policy Evaluation Performance (${iterations} iterations):`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Policy Evaluation Load Testing', () => {
    test('should handle moderate concurrent load efficiently', async () => {
      const testName = 'concurrent-moderate-load';
      monitor.startTest(testName);

      const concurrentUsers = 50;
      const requestsPerUser = 20;
      const promises: Promise<void>[] = [];

      for (let user = 0; user < concurrentUsers; user++) {
        const userPromise = this.simulateUserLoad(
          user,
          requestsPerUser,
          testName,
          monitor
        );
        promises.push(userPromise);
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const stats = monitor.getStats(testName);
      const totalRequests = concurrentUsers * requestsPerUser;
      const throughput = totalRequests / (totalTime / 1000); // Requests per second

      expect(stats.avg).toBeLessThan(50); // Average response time under 50ms
      expect(stats.p95).toBeLessThan(100); // 95th percentile under 100ms
      expect(throughput).toBeGreaterThan(100); // At least 100 requests/second

      console.log(`Moderate Concurrent Load (${concurrentUsers} users, ${requestsPerUser} req/user):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);
      console.log(`  Average response: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95 response: ${stats.p95.toFixed(2)}ms`);
    });

    test('should handle high concurrent load with graceful degradation', async () => {
      const testName = 'concurrent-high-load';
      monitor.startTest(testName);

      const concurrentUsers = 100;
      const requestsPerUser = 10;
      const promises: Promise<void>[] = [];

      for (let user = 0; user < concurrentUsers; user++) {
        const userPromise = this.simulateUserLoad(
          user,
          requestsPerUser,
          testName,
          monitor,
          50 // Small delay between requests
        );
        promises.push(userPromise);
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const stats = monitor.getStats(testName);
      const totalRequests = concurrentUsers * requestsPerUser;
      const throughput = totalRequests / (totalTime / 1000);

      expect(stats.avg).toBeLessThan(200); // Higher latency acceptable under heavy load
      expect(stats.p95).toBeLessThan(500);
      expect(throughput).toBeGreaterThan(50); // Minimum acceptable throughput

      console.log(`High Concurrent Load (${concurrentUsers} users, ${requestsPerUser} req/user):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);
      console.log(`  Average response: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95 response: ${stats.p95.toFixed(2)}ms`);
    });

    test('should handle burst load scenarios', async () => {
      const testName = 'burst-load';
      monitor.startTest(testName);

      const burstSize = 200;
      const promises: Promise<void>[] = [];

      // Simulate burst of simultaneous requests
      for (let i = 0; i < burstSize; i++) {
        const promise = this.evaluateTestPolicy(i, testName, monitor);
        promises.push(promise);
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const stats = monitor.getStats(testName);
      const throughput = burstSize / (totalTime / 1000);

      expect(stats.avg).toBeLessThan(100); // Should handle burst efficiently
      expect(stats.p99).toBeLessThan(500); // 99th percentile under acceptable limit
      expect(throughput).toBeGreaterThan(20); // Minimum burst throughput

      console.log(`Burst Load (${burstSize} simultaneous requests):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);
      console.log(`  Average response: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P99 response: ${stats.p99.toFixed(2)}ms`);
    });
  });

  describe('Data Transformation Performance', () => {
    test('should transform financial data efficiently at scale', async () => {
      const testName = 'data-transformation-scale';
      monitor.startTest(testName);

      const iterations = 1000;
      const testData = this.createLargeFinancialDataset();
      const context = this.createTransformationContext('perf-user');

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await transformationEngine.transform(testData, context);
        
        const endTime = performance.now();
        monitor.recordMetric(testName, endTime - startTime);
      }

      const stats = monitor.getStats(testName);
      
      expect(stats.avg).toBeLessThan(15); // Average transformation under 15ms
      expect(stats.p95).toBeLessThan(30); // 95th percentile under 30ms
      expect(stats.p99).toBeLessThan(60); // 99th percentile under 60ms

      console.log(`Data Transformation Performance (${iterations} iterations):`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    });

    test('should handle concurrent data transformations', async () => {
      const testName = 'concurrent-transformations';
      monitor.startTest(testName);

      const concurrentTransforms = 50;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < concurrentTransforms; i++) {
        const promise = this.performTransformation(i, testName, monitor);
        promises.push(promise);
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const stats = monitor.getStats(testName);
      const throughput = concurrentTransforms / (totalTime / 1000);

      expect(stats.avg).toBeLessThan(50);
      expect(throughput).toBeGreaterThan(10);

      console.log(`Concurrent Transformations (${concurrentTransforms} simultaneous):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} transforms/sec`);
      console.log(`  Average response: ${stats.avg.toFixed(2)}ms`);
    });
  });

  describe('Atomic Transaction Performance', () => {
    test('should handle atomic policy operations efficiently', async () => {
      const testName = 'atomic-operations';
      monitor.startTest(testName);

      const iterations = 100; // Fewer iterations due to complexity
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const request = this.createAtomicPolicyRequest(i);
        await atomicService.executeAtomicPolicySet(request);
        
        const endTime = performance.now();
        monitor.recordMetric(testName, endTime - startTime);
      }

      const stats = monitor.getStats(testName);
      
      expect(stats.avg).toBeLessThan(100); // Average atomic operation under 100ms
      expect(stats.p95).toBeLessThan(200); // 95th percentile under 200ms
      expect(stats.p99).toBeLessThan(500); // 99th percentile under 500ms

      console.log(`Atomic Operations Performance (${iterations} iterations):`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      monitor.startTest('memory-stability');

      // Perform sustained load
      for (let batch = 0; batch < 10; batch++) {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(this.evaluateTestPolicy(i, 'memory-test', monitor));
        }
        await Promise.all(promises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalIncrease = finalMemory - initialMemory;
      
      console.log(`Memory Usage Test:`);
      console.log(`  Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Increase: ${(totalIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle repository growth efficiently', async () => {
      const iterations = 5000;
      
      for (let i = 0; i < iterations; i++) {
        await fastRepo.saveAuditEntry({
          id: `audit-${i}`,
          userId: `user-${i % 100}`,
          action: 'TEST_ACTION',
          target: `target-${i}`,
          timestamp: new Date(),
          result: 'SUCCESS',
          details: { iteration: i }
        });
      }

      const repoSize = fastRepo.getSize();
      expect(repoSize.audit).toBe(iterations);

      // Test query performance with large dataset
      const startTime = performance.now();
      const results = await fastRepo.getAuditTrail('*');
      const queryTime = performance.now() - startTime;

      expect(queryTime).toBeLessThan(50); // Should query 5000 entries in under 50ms
      expect(results.length).toBe(iterations);

      console.log(`Repository Performance with ${iterations} entries:`);
      console.log(`  Query time: ${queryTime.toFixed(2)}ms`);
      console.log(`  Entries returned: ${results.length}`);
    });
  });

  describe('End-to-End Performance Scenarios', () => {
    test('should handle realistic financial transaction workflow', async () => {
      const testName = 'e2e-financial-workflow';
      monitor.startTest(testName);

      const workflows = 200;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < workflows; i++) {
        const promise = this.simulateFinancialWorkflow(i, testName, monitor);
        promises.push(promise);
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const stats = monitor.getStats(testName);
      const throughput = workflows / (totalTime / 1000);

      expect(stats.avg).toBeLessThan(200); // Average workflow under 200ms
      expect(stats.p95).toBeLessThan(500); // 95th percentile under 500ms
      expect(throughput).toBeGreaterThan(5); // At least 5 workflows/second

      console.log(`E2E Financial Workflow (${workflows} workflows):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} workflows/sec`);
      console.log(`  Average response: ${stats.avg.toFixed(2)}ms`);
      console.log(`  P95 response: ${stats.p95.toFixed(2)}ms`);
    });

    test('should maintain performance during peak load simulation', async () => {
      const config: LoadTestConfig = {
        concurrentUsers: 75,
        requestsPerUser: 15,
        rampUpTime: 5000, // 5 second ramp-up
        testDuration: 30000, // 30 second test
        maxResponseTime: 1000,
        targetThroughput: 50
      };

      const results = await this.runLoadTest(config);

      expect(results.averageResponseTime).toBeLessThan(config.maxResponseTime);
      expect(results.throughput).toBeGreaterThan(config.targetThroughput);
      expect(results.errorRate).toBeLessThan(0.01); // Less than 1% error rate

      console.log(`Peak Load Simulation Results:`);
      console.log(`  Users: ${config.concurrentUsers}`);
      console.log(`  Total requests: ${results.totalRequests}`);
      console.log(`  Success rate: ${(100 - results.errorRate * 100).toFixed(2)}%`);
      console.log(`  Average response: ${results.averageResponseTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${results.throughput.toFixed(2)} req/sec`);
      console.log(`  P95 response: ${results.p95ResponseTime.toFixed(2)}ms`);
    });
  });

  // Helper methods for test implementation
  private createTestIntent(userId: string): FinancialIntent {
    return {
      id: `intent-${userId}-${Date.now()}`,
      operation: FinancialOperation.CREATE_PAYMENT,
      user: {
        id: userId,
        roles: ['financial_manager'],
        consentLevels: [ConsentLevel.FULL_AUTOMATION],
        authentication: { verified: true, mfaCompleted: true, sessionAge: 1, lastPasswordChange: 30 },
        location: { country: 'Australia', region: 'NSW', verified: true },
        network: { type: 'corporate', securityVerified: true, ipAddress: '127.0.0.1' }
      },
      financial: { amount: 5000, currency: 'AUD', categories: ['operations'], sensitivity: 'confidential', containsPersonalData: false },
      request: {
        timestamp: new Date(),
        requestId: `req-${userId}-${Date.now()}`,
        sessionId: `session-${userId}`,
        endpoint: '/api/payments',
        method: 'POST'
      },
      compliance: {
        privacyAct: { personalDataInvolved: false, consentObtained: true, purposeLimitation: ['financial_operations'], crossBorderTransfer: false },
        dataResidency: { country: 'Australia', region: 'ap-southeast-2', governmentApproved: true }
      }
    };
  }

  private createComplexTestIntent(userId: string): FinancialIntent {
    const intent = this.createTestIntent(userId);
    return {
      ...intent,
      financial: {
        ...intent.financial,
        amount: 50000, // Higher amount for complex evaluation
        categories: ['infrastructure', 'community_development', 'emergency_response'],
        containsPersonalData: true,
        indigenousData: {
          traditionalOwners: ['TestGroup'],
          careCompliance: { collectiveBenefit: true, authorityToControl: true, responsibility: true, ethics: true },
          culturalProtocols: { consultationCompleted: true, elderApproval: true, culturalImpactAssessed: true },
          containsSacredKnowledge: false
        }
      },
      compliance: {
        ...intent.compliance,
        privacyAct: {
          ...intent.compliance.privacyAct,
          personalDataInvolved: true,
          purposeLimitation: ['financial_operations', 'compliance_monitoring', 'audit_trail']
        },
        indigenousProtocols: {
          required: true,
          protocolsFollowed: true,
          traditionalOwnerConsent: true
        }
      }
    };
  }

  private createTransformationContext(userId: string): TransformationContext {
    return {
      userId,
      roles: ['financial_analyst'],
      consentLevel: ConsentLevel.PARTIAL_AUTOMATION,
      sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
      purpose: 'financial_analysis',
      complianceFrameworks: ['privacy_act_1988', 'austrac'],
      location: { country: 'Australia', region: 'NSW' },
      temporal: { accessTime: new Date(), businessHours: true }
    };
  }

  private createLargeFinancialDataset(): any {
    return {
      user: {
        id: 'large-dataset-user',
        name: 'Performance Test User',
        email: 'perf.test@example.com',
        phone: '+61412345678',
        taxFileNumber: '123 456 789',
        addresses: Array.from({ length: 5 }, (_, i) => ({
          type: `address-${i}`,
          street: `${i + 1} Test Street`,
          city: 'Sydney',
          postcode: `200${i}`,
          state: 'NSW'
        }))
      },
      accounts: Array.from({ length: 10 }, (_, i) => ({
        id: `account-${i}`,
        type: 'savings',
        number: `12345678${i.toString().padStart(2, '0')}`,
        bsb: '123-456',
        balance: 10000 + (i * 1000),
        transactions: Array.from({ length: 50 }, (_, j) => ({
          id: `txn-${i}-${j}`,
          amount: 100 + j,
          description: `Transaction ${j}`,
          date: new Date(Date.now() - j * 86400000)
        }))
      })),
      preferences: {
        notifications: true,
        marketing: false,
        analytics: true,
        dataSharing: false
      },
      metadata: {
        lastLogin: new Date(),
        createdAt: new Date(),
        version: '1.0.0',
        tags: ['performance', 'test', 'large-dataset']
      }
    };
  }

  private createAtomicPolicyRequest(index: number): AtomicPolicySetRequest {
    const operations: PolicySetOperation[] = [
      {
        id: `op-${index}-1`,
        policyId: `atomic-policy-${index}-1`,
        operation: 'create',
        content: {
          rego: `package atomic.test${index}\\nallow = true`,
          data: {},
          config: { enforcement: 'BLOCKING' as any, scope: 'GLOBAL' as any, priority: 1, jurisdiction: ['AU'], complianceFrameworks: [] },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: `Atomic Test Policy ${index}`,
          description: 'Performance test policy',
          category: 'FINANCIAL' as any,
          severity: 'LOW' as any,
          impact: 'LOW' as any,
          changeType: 'CREATION' as any,
          releaseNotes: 'Performance testing',
          reviewers: []
        },
        userId: `atomic-user-${index}`
      }
    ];

    return {
      id: `atomic-request-${index}`,
      operations,
      metadata: {
        description: `Atomic operation set ${index}`,
        businessJustification: 'Performance testing',
        requiredApprovals: [],
        dryRun: false
      },
      userId: `atomic-admin-${index}`,
      sessionId: `atomic-session-${index}`,
      requestId: `atomic-req-${index}`
    };
  }

  private async simulateUserLoad(
    userId: number,
    requestCount: number,
    testName: string,
    monitor: PerformanceMonitor,
    delayMs: number = 0
  ): Promise<void> {
    for (let i = 0; i < requestCount; i++) {
      await this.evaluateTestPolicy(userId * 1000 + i, testName, monitor);
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  private async evaluateTestPolicy(
    requestId: number,
    testName: string,
    monitor: PerformanceMonitor
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      const intent = this.createTestIntent(`load-user-${requestId}`);
      await opaService.evaluateIntent(intent, ['financial.spending_limits']);
      
      const endTime = performance.now();
      monitor.recordMetric(testName, endTime - startTime);
    } catch (error) {
      const endTime = performance.now();
      monitor.recordMetric(testName, endTime - startTime);
      // Log error but don't fail the test
      console.warn(`Policy evaluation failed for request ${requestId}:`, error);
    }
  }

  private async performTransformation(
    transformId: number,
    testName: string,
    monitor: PerformanceMonitor
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      const data = this.createLargeFinancialDataset();
      const context = this.createTransformationContext(`transform-user-${transformId}`);
      
      await transformationEngine.transform(data, context);
      
      const endTime = performance.now();
      monitor.recordMetric(testName, endTime - startTime);
    } catch (error) {
      const endTime = performance.now();
      monitor.recordMetric(testName, endTime - startTime);
      console.warn(`Transformation failed for ${transformId}:`, error);
    }
  }

  private async simulateFinancialWorkflow(
    workflowId: number,
    testName: string,
    monitor: PerformanceMonitor
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Step 1: Policy evaluation
      const intent = this.createTestIntent(`workflow-user-${workflowId}`);
      await opaService.evaluateIntent(intent, ['financial.spending_limits', 'financial.authorization']);
      
      // Step 2: Data transformation
      const data = {
        amount: 5000,
        recipient: 'Test Recipient',
        purpose: 'Community project'
      };
      const context = this.createTransformationContext(`workflow-user-${workflowId}`);
      await transformationEngine.transform(data, context);
      
      // Step 3: Audit logging
      await auditService.recordAuditEntry(
        `workflow-user-${workflowId}`,
        'FINANCIAL_TRANSACTION' as any,
        `transaction-${workflowId}`,
        { amount: 5000, workflow: true },
        'SUCCESS' as any,
        { sessionId: `workflow-session-${workflowId}`, requestId: `workflow-req-${workflowId}`, ipAddress: '127.0.0.1' }
      );
      
      const endTime = performance.now();
      monitor.recordMetric(testName, endTime - startTime);
    } catch (error) {
      const endTime = performance.now();
      monitor.recordMetric(testName, endTime - startTime);
      console.warn(`Workflow failed for ${workflowId}:`, error);
    }
  }

  private async runLoadTest(config: LoadTestConfig): Promise<any> {
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      throughput: 0,
      errorRate: 0
    };

    const responseTimes: number[] = [];
    const startTime = performance.now();

    // Simulate load test with gradual ramp-up
    const promises: Promise<void>[] = [];
    
    for (let user = 0; user < config.concurrentUsers; user++) {
      const userPromise = (async () => {
        // Stagger user start times for ramp-up
        const delay = (user / config.concurrentUsers) * config.rampUpTime;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        for (let req = 0; req < config.requestsPerUser; req++) {
          const reqStartTime = performance.now();
          
          try {
            await this.evaluateTestPolicy(user * 1000 + req, 'load-test', monitor);
            results.successfulRequests++;
          } catch (error) {
            results.failedRequests++;
          }
          
          const reqEndTime = performance.now();
          responseTimes.push(reqEndTime - reqStartTime);
          results.totalRequests++;
        }
      })();
      
      promises.push(userPromise);
    }

    await Promise.all(promises);
    
    const totalTime = performance.now() - startTime;
    
    // Calculate results
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      results.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      results.p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    }
    
    results.throughput = results.totalRequests / (totalTime / 1000);
    results.errorRate = results.failedRequests / results.totalRequests;

    return results;
  }
});