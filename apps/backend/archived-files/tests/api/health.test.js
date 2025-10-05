/**
 * Health endpoint tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';

describe('Health Endpoints', () => {
  let server;

  beforeAll(() => {
    // Start server for testing
    server = app.listen(0); // Use random port
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('empathy_ledger', 'accessible');
      expect(response.body).toHaveProperty('version');
    });

    it('should not require authentication', async () => {
      await request(app)
        .get('/health')
        .expect(200);
    });

    it('should include proper headers', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/dashboard/health', () => {
    it('should return dashboard health status', async () => {
      const response = await request(app)
        .get('/api/dashboard/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('notion');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include Notion health information', async () => {
      const response = await request(app)
        .get('/api/dashboard/health');

      expect(response.body.notion).toHaveProperty('overall');
      expect(response.body.notion).toHaveProperty('databases');
      expect(response.body.notion).toHaveProperty('configured');
      expect(response.body.notion).toHaveProperty('accessible');
    });
  });

  describe('GET /api/notion/health', () => {
    it('should return Notion integration health', async () => {
      const response = await request(app)
        .get('/api/notion/health')
        .set('X-API-Key', 'test-api-key-1')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('notion_status');
      expect(response.body).toHaveProperty('fallback_available');
      expect(response.body).toHaveProperty('message');
    });

    it('should require API key authentication', async () => {
      await request(app)
        .get('/api/notion/health')
        .expect(401);
    });

    it('should accept valid API key', async () => {
      await request(app)
        .get('/api/notion/health')
        .set('X-API-Key', 'test-api-key-1')
        .expect(200);
    });

    it('should reject invalid API key', async () => {
      await request(app)
        .get('/api/notion/health')
        .set('X-API-Key', 'invalid-key')
        .expect(403);
    });
  });
});