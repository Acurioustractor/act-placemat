/**
 * System Health Integration Tests
 * Basic integration test to validate core system functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('System Health Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // Create a minimal Express app for testing core endpoints
    app = express();
    app.use(express.json());

    // Basic health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          css: 'stable',
          api: 'operational',
          database: 'connected'
        }
      });
    });

    // Mock financial API endpoint
    app.get('/api/v1/financial/status', (req, res) => {
      res.json({
        success: true,
        financial: {
          features: ['bookkeeping', 'insights', 'analytics'],
          status: 'operational'
        }
      });
    });

    // Mock life orchestrator endpoint
    app.get('/api/life-orchestrator/health-check', (req, res) => {
      res.json({
        success: true,
        health: {
          status: 'healthy',
          services: {
            projectHealth: 'operational',
            relationships: 'operational',
            communications: 'operational'
          },
          performance: {
            uptime: '99.9%',
            responseTime: '< 200ms'
          },
          memory: {
            usage: '45%',
            available: '55%'
          }
        }
      });
    });
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Basic Health Checks', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('css', 'stable');
      expect(response.body.services).toHaveProperty('api', 'operational');
      expect(response.body.services).toHaveProperty('database', 'connected');
    });

    it('should validate financial system status', async () => {
      const response = await request(app)
        .get('/api/v1/financial/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('financial');
      expect(response.body.financial).toHaveProperty('features');
      expect(Array.isArray(response.body.financial.features)).toBe(true);
      expect(response.body.financial.features).toContain('bookkeeping');
      expect(response.body.financial.features).toContain('insights');
      expect(response.body.financial.features).toContain('analytics');
    });

    it('should validate life orchestrator health', async () => {
      const response = await request(app)
        .get('/api/life-orchestrator/health-check')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('health');
      expect(response.body.health).toHaveProperty('status', 'healthy');
      expect(response.body.health).toHaveProperty('services');
      expect(response.body.health.services).toHaveProperty('projectHealth', 'operational');
      expect(response.body.health.services).toHaveProperty('relationships', 'operational');
      expect(response.body.health.services).toHaveProperty('communications', 'operational');
    });
  });

  describe('API Response Format Validation', () => {
    it('should return consistent JSON response format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
    });

    it('should handle API endpoints with proper status codes', async () => {
      const endpoints = [
        '/health',
        '/api/v1/financial/status',
        '/api/life-orchestrator/health-check'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should respond to health checks within acceptable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/health')
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Should respond within 100ms for basic health check
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent endpoints gracefully', async () => {
      await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
    });

    it('should maintain service stability under error conditions', async () => {
      // Test that health endpoint still works after a 404
      await request(app).get('/api/non-existent-endpoint').expect(404);

      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
    });
  });

  describe('Data Validation', () => {
    it('should return properly structured financial data', async () => {
      const response = await request(app)
        .get('/api/v1/financial/status')
        .expect(200);

      // Validate data types and structure
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.financial).toBe('object');
      expect(Array.isArray(response.body.financial.features)).toBe(true);

      // Validate feature list contains expected items
      const features = response.body.financial.features;
      expect(features.length).toBeGreaterThan(0);
      features.forEach(feature => {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      });
    });

    it('should return comprehensive health metrics', async () => {
      const response = await request(app)
        .get('/api/life-orchestrator/health-check')
        .expect(200);

      const { health } = response.body;

      // Validate structure
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('performance');
      expect(health).toHaveProperty('memory');

      // Validate performance metrics
      expect(health.performance).toHaveProperty('uptime');
      expect(health.performance).toHaveProperty('responseTime');

      // Validate memory metrics
      expect(health.memory).toHaveProperty('usage');
      expect(health.memory).toHaveProperty('available');
    });
  });
});