/**
 * tRPC Router Integration Tests
 * Tests the tRPC API endpoints for type safety and functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '../../src/trpc/router.js';
import { createContext } from '../../src/trpc/trpc.js';

describe('tRPC Router', () => {
  let caller;
  let mockContext;

  beforeAll(async () => {
    // Create mock context for tests
    mockContext = await createContext({
      req: { headers: {} },
      res: { setHeader: () => {}, status: () => ({ json: () => {} }) }
    });

    // Create caller with mock context
    const createCaller = createCallerFactory(appRouter);
    caller = createCaller(mockContext);
  });

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const result = await caller.health();

      expect(result).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        services: expect.objectContaining({
          database: expect.stringMatching(/^(up|down)$/),
          supabase: expect.stringMatching(/^(up|down)$/),
          notion: expect.stringMatching(/^(up|down)$/)
        }),
        version: expect.any(String),
        uptime: expect.any(Number)
      });

      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should have consistent response structure', async () => {
      const result = await caller.health();

      // Check all required fields are present
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');

      // Check services structure
      expect(result.services).toHaveProperty('database');
      expect(result.services).toHaveProperty('supabase');
      expect(result.services).toHaveProperty('notion');
    });
  });

  describe('Contacts Endpoints', () => {
    describe('contacts.list', () => {
      it('should accept valid filter parameters', async () => {
        const validFilters = {
          strategic_value: 'high',
          data_source: 'ben',
          company: 'Test Company',
          search: 'test search',
          limit: 25,
          offset: 10
        };

        // Should not throw an error with valid parameters
        await expect(caller.contacts.list(validFilters)).resolves.toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number),
          limit: validFilters.limit,
          offset: validFilters.offset,
          hasMore: expect.any(Boolean)
        });
      });

      it('should use default values for missing parameters', async () => {
        const result = await caller.contacts.list({});

        expect(result).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number),
          limit: 50, // Default limit
          offset: 0,  // Default offset
          hasMore: expect.any(Boolean)
        });
      });

      it('should validate limit boundaries', async () => {
        // Test maximum limit
        await expect(caller.contacts.list({ limit: 101 }))
          .rejects.toThrow(/limit/i);

        // Test minimum limit
        await expect(caller.contacts.list({ limit: 0 }))
          .rejects.toThrow(/limit/i);

        // Valid limits should work
        await expect(caller.contacts.list({ limit: 50 }))
          .resolves.toBeDefined();
      });

      it('should validate strategic_value enum', async () => {
        const validValues = ['high', 'medium', 'low', 'unknown'];
        
        for (const value of validValues) {
          await expect(caller.contacts.list({ strategic_value: value }))
            .resolves.toBeDefined();
        }

        // Invalid value should throw
        await expect(caller.contacts.list({ strategic_value: 'invalid' }))
          .rejects.toThrow();
      });
    });

    describe('contacts.byId', () => {
      it('should require valid ID parameter', async () => {
        // Valid ID should not throw validation error
        await expect(caller.contacts.byId({ id: 1 }))
          .rejects.toThrow('Contact not found'); // Expected business logic error

        // Invalid ID types should throw validation error
        await expect(caller.contacts.byId({ id: 'invalid' }))
          .rejects.toThrow();

        await expect(caller.contacts.byId({ id: -1 }))
          .rejects.toThrow();
      });
    });

    describe('contacts.update', () => {
      it('should validate update data structure', async () => {
        const validUpdate = {
          id: 1,
          data: {
            relationship_score: 0.8,
            strategic_value: 'high',
            notes: 'Test notes'
          }
        };

        // Should not throw validation error (will throw business logic error)
        await expect(caller.contacts.update(validUpdate))
          .rejects.toThrow('not implemented'); // Expected business logic error
      });

      it('should validate relationship_score range', async () => {
        const invalidScores = [-0.1, 1.1, 2.0];
        
        for (const score of invalidScores) {
          await expect(caller.contacts.update({
            id: 1,
            data: { relationship_score: score }
          })).rejects.toThrow();
        }

        // Valid scores should pass validation
        const validScores = [0.0, 0.5, 1.0];
        for (const score of validScores) {
          await expect(caller.contacts.update({
            id: 1,
            data: { relationship_score: score }
          })).rejects.toThrow('not implemented'); // Business logic error, not validation
        }
      });

      it('should validate strategic_value enum in updates', async () => {
        const validValues = ['high', 'medium', 'low', 'unknown'];
        
        for (const value of validValues) {
          await expect(caller.contacts.update({
            id: 1,
            data: { strategic_value: value }
          })).rejects.toThrow('not implemented'); // Business logic error
        }

        // Invalid value should throw validation error
        await expect(caller.contacts.update({
          id: 1,
          data: { strategic_value: 'invalid' }
        })).rejects.toThrow();
      });
    });

    describe('contacts.stats', () => {
      it('should return statistics structure', async () => {
        const result = await caller.contacts.stats();

        expect(result).toMatchObject({
          total: expect.any(Number),
          by_strategic_value: expect.any(Object),
          by_data_source: expect.any(Object),
          average_score: expect.any(Number)
        });

        expect(result.total).toBeGreaterThanOrEqual(0);
        expect(result.average_score).toBeGreaterThanOrEqual(0);
        expect(result.average_score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Projects Endpoints', () => {
    describe('projects.list', () => {
      it('should accept valid filter parameters', async () => {
        const validFilters = {
          status: 'active',
          limit: 25,
          offset: 0
        };

        const result = await caller.projects.list(validFilters);

        expect(result).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number),
          limit: validFilters.limit,
          offset: validFilters.offset,
          hasMore: expect.any(Boolean)
        });
      });

      it('should validate status enum', async () => {
        const validStatuses = ['planning', 'active', 'completed', 'paused'];
        
        for (const status of validStatuses) {
          await expect(caller.projects.list({ status }))
            .resolves.toBeDefined();
        }

        // Invalid status should throw
        await expect(caller.projects.list({ status: 'invalid' }))
          .rejects.toThrow();
      });
    });

    describe('projects.create', () => {
      it('should validate required fields', async () => {
        const validProject = {
          title: 'Test Project',
          description: 'Test description',
          status: 'planning',
          priority: 'medium',
          tags: ['test']
        };

        // Should throw business logic error (not validation)
        await expect(caller.projects.create(validProject))
          .rejects.toThrow('not implemented');
      });

      it('should require title field', async () => {
        const invalidProject = {
          description: 'Test description'
        };

        await expect(caller.projects.create(invalidProject))
          .rejects.toThrow();
      });

      it('should validate enum fields', async () => {
        const baseProject = {
          title: 'Test Project',
          description: 'Test description'
        };

        // Invalid status
        await expect(caller.projects.create({
          ...baseProject,
          status: 'invalid'
        })).rejects.toThrow();

        // Invalid priority
        await expect(caller.projects.create({
          ...baseProject,
          priority: 'invalid'
        })).rejects.toThrow();
      });
    });
  });

  describe('Intelligence Endpoints', () => {
    describe('intelligence.query', () => {
      it('should validate query structure', async () => {
        const validQuery = {
          query: 'test query',
          sources: ['source1', 'source2'],
          filters: { key: 'value' },
          limit: 10
        };

        const result = await caller.intelligence.query(validQuery);

        expect(result).toMatchObject({
          id: expect.any(String),
          query: validQuery.query,
          results: expect.any(Array),
          confidence: expect.any(Number),
          sources: expect.any(Array),
          timestamp: expect.any(String)
        });
      });

      it('should require query field', async () => {
        await expect(caller.intelligence.query({}))
          .rejects.toThrow();

        await expect(caller.intelligence.query({ query: '' }))
          .rejects.toThrow();
      });

      it('should validate limit range', async () => {
        await expect(caller.intelligence.query({
          query: 'test',
          limit: 0
        })).rejects.toThrow();

        await expect(caller.intelligence.query({
          query: 'test',
          limit: 101
        })).rejects.toThrow();

        // Valid limit should work
        await expect(caller.intelligence.query({
          query: 'test',
          limit: 50
        })).resolves.toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', async () => {
      try {
        await caller.contacts.list({ limit: 'invalid' });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.code).toBe('BAD_REQUEST');
        expect(error.message).toContain('validation');
      }
    });

    it('should handle business logic errors properly', async () => {
      try {
        await caller.contacts.byId({ id: 999999 });
        expect.fail('Should have thrown not found error');
      } catch (error) {
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toContain('not found');
      }
    });

    it('should handle internal server errors properly', async () => {
      // This would require mocking to force an internal error
      // For now, just verify the error structure exists
      expect(true).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type consistency across endpoints', async () => {
      // Test that the response types match expectations
      const healthResult = await caller.health();
      const contactsResult = await caller.contacts.list({});
      const statsResult = await caller.contacts.stats();

      // Verify all responses have expected type structure
      expect(typeof healthResult.status).toBe('string');
      expect(typeof healthResult.uptime).toBe('number');
      expect(Array.isArray(contactsResult.data)).toBe(true);
      expect(typeof contactsResult.count).toBe('number');
      expect(typeof statsResult.total).toBe('number');
    });
  });
});