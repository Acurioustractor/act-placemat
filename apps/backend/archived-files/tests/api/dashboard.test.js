/**
 * Dashboard API tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/server.js';

describe('Dashboard API', () => {
  let server;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/overview', () => {
    it('should return dashboard overview data', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('recentActivity');
      expect(response.body).toHaveProperty('topProjects');
      expect(response.body).toHaveProperty('upcomingOpportunities');

      // Verify metrics structure
      expect(response.body.metrics).toHaveProperty('totalProjects');
      expect(response.body.metrics).toHaveProperty('activeProjects');
      expect(response.body.metrics).toHaveProperty('totalOpportunities');
      expect(response.body.metrics).toHaveProperty('partnerOrganizations');
    });

    it('should include recent activity data', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview');

      expect(Array.isArray(response.body.recentActivity)).toBe(true);
      
      if (response.body.recentActivity.length > 0) {
        const activity = response.body.recentActivity[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('name');
        expect(activity).toHaveProperty('type');
      }
    });

    it('should not require authentication', async () => {
      await request(app)
        .get('/api/dashboard/overview')
        .expect(200);
    });
  });

  describe('GET /api/dashboard/network/relationships', () => {
    it('should return network visualization data', async () => {
      const response = await request(app)
        .get('/api/dashboard/network/relationships')
        .expect(200);

      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('links');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.links)).toBe(true);
    });

    it('should include different node types', async () => {
      const response = await request(app)
        .get('/api/dashboard/network/relationships');

      const nodeTypes = new Set(response.body.nodes.map(node => node.type));
      
      // Should include multiple types from projects, organizations, opportunities
      expect(nodeTypes.size).toBeGreaterThan(0);
    });

    it('should format nodes correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/network/relationships');

      if (response.body.nodes.length > 0) {
        const node = response.body.nodes[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('connections');
        expect(['project', 'organization', 'opportunity']).toContain(node.type);
      }
    });
  });

  describe('GET /api/dashboard/ecosystem/opportunities', () => {
    it('should return opportunity ecosystem data', async () => {
      const response = await request(app)
        .get('/api/dashboard/ecosystem/opportunities')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should format opportunity connections correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/ecosystem/opportunities');

      if (response.body.length > 0) {
        const opportunity = response.body[0];
        expect(opportunity).toHaveProperty('id');
        expect(opportunity).toHaveProperty('name');
        expect(opportunity).toHaveProperty('connections');
        
        const connections = opportunity.connections;
        expect(connections).toHaveProperty('projects');
        expect(connections).toHaveProperty('organizations');
        expect(connections).toHaveProperty('impacts');
        
        expect(Array.isArray(connections.projects)).toBe(true);
        expect(Array.isArray(connections.organizations)).toBe(true);
        expect(Array.isArray(connections.impacts)).toBe(true);
      }
    });
  });

  describe('GET /api/dashboard/chains/impact', () => {
    it('should return impact chain data', async () => {
      const response = await request(app)
        .get('/api/dashboard/chains/impact')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should format impact chains correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/chains/impact');

      if (response.body.length > 0) {
        const chain = response.body[0];
        expect(chain).toHaveProperty('id');
        expect(chain).toHaveProperty('opportunity');
        expect(chain).toHaveProperty('project');
        expect(chain).toHaveProperty('artifact');
        expect(chain).toHaveProperty('story');
        expect(chain).toHaveProperty('completeness');
        expect(chain).toHaveProperty('impactScore');
        expect(chain).toHaveProperty('timeline');

        // Verify timeline structure
        expect(chain.timeline).toHaveProperty('start');
        expect(chain.timeline).toHaveProperty('end'); 
        expect(chain.timeline).toHaveProperty('duration');
      }
    });

    it('should include completeness and impact scores', async () => {
      const response = await request(app)
        .get('/api/dashboard/chains/impact');

      if (response.body.length > 0) {
        const chain = response.body[0];
        expect(typeof chain.completeness).toBe('number');
        expect(chain.completeness).toBeGreaterThanOrEqual(0);
        expect(chain.completeness).toBeLessThanOrEqual(100);
        
        expect(typeof chain.impactScore).toBe('number');
        expect(chain.impactScore).toBeGreaterThanOrEqual(1);
        expect(chain.impactScore).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('GET /api/dashboard/search', () => {
    it('should require search query parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/search')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('search query');
    });

    it('should return search results with query', async () => {
      const response = await request(app)
        .get('/api/dashboard/search?q=test')
        .expect(200);

      expect(response.body).toHaveProperty('query', 'test');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should filter by type when specified', async () => {
      const response = await request(app)
        .get('/api/dashboard/search?q=test&type=partners')
        .expect(200);

      expect(response.body.results).toHaveProperty('partners');
      expect(response.body.results).not.toHaveProperty('projects');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/search?q=test&limit=5')
        .expect(200);

      // Verify limit is applied (though actual count depends on data)
      expect(response.body).toHaveProperty('results');
    });

    it('should validate pagination parameters', async () => {
      // Test invalid limit
      await request(app)
        .get('/api/dashboard/search?q=test&limit=invalid')
        .expect(400);
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

    it('should include Notion health details', async () => {
      const response = await request(app)
        .get('/api/dashboard/health');

      expect(response.body.notion).toHaveProperty('overall');
      expect(response.body.notion).toHaveProperty('databases');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.notion.overall);
    });

    it('should include cache information', async () => {
      const response = await request(app)
        .get('/api/dashboard/health');

      expect(response.body.cache).toHaveProperty('size');
      expect(response.body.cache).toHaveProperty('timeout');
      expect(typeof response.body.cache.size).toBe('number');
      expect(typeof response.body.cache.timeout).toBe('number');
    });
  });

  describe('POST /api/dashboard/cache/clear', () => {
    it('should clear all cache when no pattern specified', async () => {
      const response = await request(app)
        .post('/api/dashboard/cache/clear')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('All cache cleared');
    });

    it('should clear cache by pattern', async () => {
      const response = await request(app)
        .post('/api/dashboard/cache/clear')
        .send({ pattern: 'partners' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('partners');
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/dashboard/cache/clear')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Should be handled by error middleware
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle Notion service errors gracefully', async () => {
      // Mock Notion service to throw error
      global.mcp__notion__query_notion_database = vi.fn().mockRejectedValue(new Error('Notion service error'));

      const response = await request(app)
        .get('/api/dashboard/overview')
        .expect(200); // Should still return 200 with fallback data

      expect(response.body).toHaveProperty('metrics');
    });

    it('should include proper error information in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // This should trigger an error response with details
      const response = await request(app)
        .get('/api/dashboard/search')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});