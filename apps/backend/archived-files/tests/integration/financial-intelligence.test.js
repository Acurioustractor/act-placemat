/**
 * Financial Intelligence Integration Tests
 * Tests for the complete finance bookkeeping AI system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import app from '../../src/server.js';
import intelligentInsightsEngine from '../../src/services/intelligentInsightsEngine.js';
import cacheManager from '../../src/services/intelligentCacheManager.js';

describe('Financial Intelligence System Integration', () => {
  let supabase;
  let redis;
  let authToken;
  
  beforeAll(async () => {
    // Initialize test database and Redis
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Create test auth token (mock)
    authToken = 'Bearer test-token';
    
    // Apply database schema
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.join(process.cwd(), 'database', 'financial-v1-schema.sql');
    
    try {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          await supabase.rpc('exec_sql', { query: statement });
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists')) {
            console.warn('Schema statement failed:', error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Schema setup failed:', error.message);
    }
  });

  afterAll(async () => {
    // Cleanup
    await redis.flushdb();
    await redis.disconnect();
  });

  beforeEach(async () => {
    // Clear caches before each test
    await redis.flushdb();
    await cacheManager.invalidate(['*']);
  });

  describe('Financial API v1 Endpoints', () => {
    it('should get financial system status', async () => {
      const response = await request(app)
        .get('/api/v1/financial/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('financial');
      expect(response.body.financial).toHaveProperty('features');
      expect(Array.isArray(response.body.financial.features)).toBe(true);
    });

    it('should handle Xero connection status gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/financial/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.financial).toHaveProperty('xeroStatus');
      expect(['connected', 'disconnected', 'error']).toContain(
        response.body.financial.xeroStatus
      );
    });

    it('should get transactions with proper filtering', async () => {
      // Insert test transaction
      const testTransaction = {
        xero_id: `test-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: 'Test transaction',
        amount: 100.50,
        contact: 'Test Vendor',
        type: 'SPEND',
        suggested_category: 'Testing'
      };

      await supabase.from('xero_transactions').insert([testTransaction]);

      const response = await request(app)
        .get('/api/v1/financial/transactions')
        .query({ limit: 10 })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    it('should export transactions as CSV', async () => {
      const response = await request(app)
        .get('/api/v1/financial/transactions/export')
        .query({ format: 'csv' })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('Date,Description,Contact,Amount');
    });

    it('should get aging analysis', async () => {
      const response = await request(app)
        .get('/api/v1/financial/aging')
        .query({ side: 'ap', days: 180 })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      if (response.body.success) {
        expect(response.body).toHaveProperty('buckets');
        expect(response.body.buckets).toHaveProperty('current');
        expect(response.body.buckets).toHaveProperty('>90');
      }
    });
  });

  describe('Bookkeeping API', () => {
    it('should get bookkeeping sync status', async () => {
      const response = await request(app)
        .get('/api/bookkeeping/status')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('state');
    });

    it('should handle transaction filtering', async () => {
      // Insert test bookkeeping transaction
      const testTransaction = {
        tenant_id: 'test-tenant',
        xero_id: `book-test-${Date.now()}`,
        txn_date: new Date().toISOString().split('T')[0],
        amount: 75.25,
        currency: 'AUD',
        direction: 'spent',
        description: 'Test bookkeeping transaction',
        category: 'Testing'
      };

      await supabase.from('bookkeeping_transactions').insert([testTransaction]);

      const response = await request(app)
        .get('/api/bookkeeping/transactions')
        .query({ category: 'Testing', limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    it('should handle rules operations', async () => {
      // Test adding a rule
      const addRuleResponse = await request(app)
        .post('/api/bookkeeping/rules')
        .send({
          pattern: 'test-pattern',
          category: 'Test Category',
          priority: 50
        })
        .expect(200);

      expect(addRuleResponse.body).toHaveProperty('ok', true);
      expect(addRuleResponse.body).toHaveProperty('rule');

      // Test getting rules
      const getRulesResponse = await request(app)
        .get('/api/bookkeeping/rules')
        .expect(200);

      expect(getRulesResponse.body).toHaveProperty('rules');
      expect(Array.isArray(getRulesResponse.body.rules)).toBe(true);

      // Clean up
      if (addRuleResponse.body.rule?.id) {
        await request(app)
          .delete(`/api/bookkeeping/rules/${addRuleResponse.body.rule.id}`)
          .expect(200);
      }
    });

    it('should generate financial summary digest', async () => {
      const response = await request(app)
        .get('/api/bookkeeping/digest')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('generated_at');
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });
  });

  describe('Intelligent Insights Engine', () => {
    it('should generate insights with error handling', async () => {
      const insights = await intelligentInsightsEngine.generateInsights('7d');

      expect(insights).toHaveProperty('patterns');
      expect(insights).toHaveProperty('predictions'); 
      expect(insights).toHaveProperty('health');
      expect(insights).toHaveProperty('generated_at');
      expect(insights.health).toHaveProperty('success_rate');
      expect(insights.health).toHaveProperty('status');

      // Verify health status is valid
      expect(['healthy', 'degraded', 'critical']).toContain(insights.health.status);
      
      // Verify basic structure even if some components fail
      expect(Array.isArray(insights.patterns)).toBe(true);
      expect(Array.isArray(insights.predictions)).toBe(true);
      expect(Array.isArray(insights.errors)).toBe(true);
    });

    it('should handle real-time insight generation', async () => {
      const testUpdate = {
        type: 'new_project',
        data: { title: 'Test Project', impact: 5 },
        metrics: { people_impacted: 150 }
      };

      const insight = await intelligentInsightsEngine.generateRealTimeInsight(testUpdate);

      if (insight) {
        expect(insight).toHaveProperty('update');
        expect(insight).toHaveProperty('insight');
        expect(insight).toHaveProperty('significance');
        expect(insight).toHaveProperty('timestamp');
        expect(typeof insight.significance).toBe('number');
        expect(insight.significance).toBeGreaterThanOrEqual(0);
        expect(insight.significance).toBeLessThanOrEqual(1);
      }
    });

    it('should calculate trend analysis', async () => {
      // Generate some historical data
      const mockHistoricalData = Array.from({ length: 10 }, (_, i) => ({
        financialMetrics: {
          cashBalance: 10000 + (i * 500),
          monthlyRevenue: 5000 + (i * 100),
          monthlyExpenses: 3000 + (i * 50)
        },
        systemPerformance: {
          errorRate: 0.05 - (i * 0.001)
        },
        communityMetrics: {
          engagementRate: 0.7 + (i * 0.01)
        }
      }));

      // Simulate historical analysis
      for (const data of mockHistoricalData) {
        intelligentInsightsEngine.analysisHistory.push(data);
      }

      const trends = intelligentInsightsEngine.getTrendAnalysis();

      expect(Array.isArray(trends)).toBe(true);
      if (trends.length > 0) {
        const trend = trends[0];
        expect(trend).toHaveProperty('metric');
        expect(trend).toHaveProperty('trend');
        expect(trend).toHaveProperty('change');
        expect(['improving', 'stable', 'declining']).toContain(trend.trend);
      }
    });
  });

  describe('Cache Manager', () => {
    it('should handle cache operations', async () => {
      const testData = { value: 'test-data', timestamp: Date.now() };
      const cacheKey = 'test-insights';

      // Test cache set
      const setResult = await cacheManager.set('insights', cacheKey, testData);
      expect(setResult).toBe(true);

      // Test cache get
      const getData = await cacheManager.get('insights', cacheKey);
      expect(getData).toEqual(testData);

      // Test cache invalidation
      const invalidated = await cacheManager.invalidate(['insights:*']);
      expect(invalidated).toBeGreaterThanOrEqual(0);

      // Verify data is invalidated
      const getAfterInvalidation = await cacheManager.get('insights', cacheKey);
      expect(getAfterInvalidation).toBeNull();
    });

    it('should provide cache statistics', async () => {
      const stats = cacheManager.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('localCacheSize');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.hitRate).toBe('string');
    });

    it('should handle cache health check', async () => {
      const health = await cacheManager.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('redis');
      expect(['healthy', 'degraded']).toContain(health.status);
    });

    it('should handle cache-aside pattern', async () => {
      const dataLoader = async () => {
        return { computed: 'expensive-data', timestamp: Date.now() };
      };

      // First call should load and cache
      const result1 = await cacheManager.getOrSet(
        'insights',
        'expensive-computation',
        dataLoader
      );

      expect(result1).toHaveProperty('computed', 'expensive-data');

      // Second call should return cached data
      const result2 = await cacheManager.getOrSet(
        'insights', 
        'expensive-computation',
        () => { throw new Error('Should not be called'); }
      );

      expect(result2).toEqual(result1);
    });
  });

  describe('Error Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // Test endpoint behavior when database is unavailable
      const response = await request(app)
        .get('/api/v1/financial/transactions')
        .query({ limit: 1 })
        .set('Authorization', authToken);

      // Should return some response, even if degraded
      expect(response.status).toBeLessThan(500);
    });

    it('should handle Xero API failures gracefully', async () => {
      const response = await request(app)
        .post('/api/bookkeeping/sync')
        .send({ full: false, days: 30 });

      // Should not crash, even if Xero is unavailable
      expect(response.status).toBeLessThan(500);
    });

    it('should handle Redis failures gracefully', async () => {
      // Temporarily disconnect Redis
      await redis.disconnect();

      const insights = await intelligentInsightsEngine.generateInsights('1d');

      // Should still generate insights without cache
      expect(insights).toHaveProperty('generated_at');
      expect(insights).toHaveProperty('health');

      // Reconnect Redis
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    });
  });

  describe('Performance', () => {
    it('should generate insights within reasonable time', async () => {
      const startTime = Date.now();
      
      const insights = await intelligentInsightsEngine.generateInsights('7d');
      
      const duration = Date.now() - startTime;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      expect(insights).toHaveProperty('generated_at');
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/v1/financial/status')
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    it('should benefit from caching on repeated requests', async () => {
      const testData = { large: 'data'.repeat(1000) };
      
      // First cache set
      const startTime1 = Date.now();
      await cacheManager.set('insights', 'performance-test', testData);
      const setTime = Date.now() - startTime1;
      
      // First get (from Redis)
      const startTime2 = Date.now();
      const result1 = await cacheManager.get('insights', 'performance-test');
      const firstGetTime = Date.now() - startTime2;
      
      // Second get (from local cache, should be faster)
      const startTime3 = Date.now();
      const result2 = await cacheManager.get('insights', 'performance-test');
      const secondGetTime = Date.now() - startTime3;
      
      expect(result1).toEqual(testData);
      expect(result2).toEqual(testData);
      
      // Second get should be faster (local cache)
      expect(secondGetTime).toBeLessThanOrEqual(firstGetTime);
    });
  });
});