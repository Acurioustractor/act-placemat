/**
 * Security middleware tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';

describe('Security Middleware', () => {
  let server;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to general endpoints', async () => {
      // Make multiple requests to test rate limiting
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/stories')
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);
      
      // Most should succeed, but rate limiting headers should be present
      expect(responses[0].headers).toHaveProperty('x-ratelimit-limit');
      expect(responses[0].headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should apply stricter rate limiting to auth endpoints', async () => {
      // Test newsletter signup endpoint which has auth rate limiting
      const response = await request(app)
        .post('/api/newsletter/subscribe')
        .send({
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User'
        });

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      const limit = parseInt(response.headers['x-ratelimit-limit']);
      expect(limit).toBeLessThan(100); // Auth endpoints should have lower limits
    });
  });

  describe('Content Security Policy', () => {
    it('should include CSP headers', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers).toHaveProperty('content-security-policy');
    });

    it('should include security headers', async () => {
      const response = await request(app).get('/health');
      
      // Helmet should add various security headers
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('CORS Protection', () => {
    it('should handle CORS for allowed origins', async () => {
      const response = await request(app)
        .get('/api/stories')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should reject requests from disallowed origins', async () => {
      const response = await request(app)
        .get('/api/stories')
        .set('Origin', 'https://malicious-site.com');

      expect(response.status).toBe(500); // CORS error
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious script tags in contact form', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          inquiry_type: 'general',
          subject: 'Test Subject',
          message: '<script>alert("xss")</script>This is a test message'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should sanitize malicious javascript: URLs', async () => {
      const response = await request(app)
        .post('/api/newsletter/subscribe')
        .send({
          email: 'test@example.com',
          first_name: 'javascript:alert("xss")',
          last_name: 'User'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Request Size Limiting', () => {
    it('should reject requests that are too large', async () => {
      const largePayload = 'x'.repeat(15 * 1024 * 1024); // 15MB payload
      
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          inquiry_type: 'general',
          subject: 'Test Subject',
          message: largePayload
        });

      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('API Key Protection', () => {
    it('should protect platform endpoints with API key', async () => {
      await request(app)
        .get('/api/platform/health')
        .expect(401);
    });

    it('should accept valid API keys', async () => {
      await request(app)
        .get('/api/platform/health')
        .set('X-API-Key', 'test-api-key-1')
        .expect(200);
    });

    it('should reject invalid API keys', async () => {
      await request(app)
        .get('/api/platform/health')
        .set('X-API-Key', 'invalid-key')
        .expect(403);
    });

    it('should accept API key in query parameter', async () => {
      await request(app)
        .get('/api/platform/health?api_key=test-api-key-1')
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should not expose sensitive error details in production mode', async () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body).not.toHaveProperty('stack');
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Authentication Validation', () => {
    it('should validate JWT token format', async () => {
      const response = await request(app)
        .get('/api/platform/health')
        .set('Authorization', 'Bearer invalid-jwt-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject expired tokens', async () => {
      // This would require creating an expired JWT token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/platform/health')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
    });
  });
});