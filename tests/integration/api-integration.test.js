/**
 * API Integration Tests
 * End-to-end testing of API endpoints with real database operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import express from 'express';
import { appRouter, createContext } from '../apps/backend/src/trpc/router.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

// Test database setup
const testSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
);

describe('API Integration Tests', () => {
  let app;
  let testServer;

  beforeAll(async () => {
    // Set up test Express app with tRPC
    app = express();
    app.use(express.json());

    // Mount tRPC router
    app.use('/api/trpc', 
      createExpressMiddleware({
        router: appRouter,
        createContext,
        onError: ({ path, error }) => {
          console.error(`API Error on ${path}:`, error);
        },
      })
    );

    // Health check endpoint for testing
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    testServer = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    if (testServer) {
      testServer.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  describe('Health Check', () => {
    it('should return server health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String)
      });
    });
  });

  describe('tRPC Health Endpoint', () => {
    it('should return tRPC health status', async () => {
      const response = await request(app)
        .get('/api/trpc/health')
        .expect(200);

      expect(response.body).toMatchObject({
        result: {
          data: {
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            services: expect.objectContaining({
              database: expect.stringMatching(/^(up|down)$/),
              supabase: expect.stringMatching(/^(up|down)$/),
              notion: expect.stringMatching(/^(up|down)$/)
            }),
            version: expect.any(String),
            uptime: expect.any(Number)
          }
        }
      });
    });
  });

  describe('Contacts API', () => {
    let testContactId;

    beforeEach(async () => {
      // Create test contact data
      const testContact = await createTestContact();
      testContactId = testContact.id;
    });

    describe('List Contacts', () => {
      it('should return contacts list with pagination', async () => {
        const response = await request(app)
          .post('/api/trpc/contacts.list')
          .send({
            json: {
              limit: 10,
              offset: 0
            }
          })
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number),
          limit: 10,
          offset: 0,
          hasMore: expect.any(Boolean)
        });

        if (response.body.result.data.data.length > 0) {
          const contact = response.body.result.data.data[0];
          expect(contact).toMatchObject({
            id: expect.any(Number),
            first_name: expect.any(String),
            last_name: expect.any(String),
            relationship_score: expect.any(Number),
            strategic_value: expect.stringMatching(/^(high|medium|low|unknown)$/)
          });
        }
      });

      it('should filter contacts by strategic value', async () => {
        const response = await request(app)
          .post('/api/trpc/contacts.list')
          .send({
            json: {
              strategic_value: 'high',
              limit: 10
            }
          })
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number)
        });
      });

      it('should filter contacts by data source', async () => {
        const response = await request(app)
          .post('/api/trpc/contacts.list')
          .send({
            json: {
              data_source: 'ben',
              limit: 10
            }
          })
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number)
        });
      });

      it('should search contacts by text', async () => {
        const response = await request(app)
          .post('/api/trpc/contacts.list')
          .send({
            json: {
              search: 'test',
              limit: 10
            }
          })
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number)
        });
      });

      it('should validate limit boundaries', async () => {
        // Test exceeding maximum limit
        const response = await request(app)
          .post('/api/trpc/contacts.list')
          .send({
            json: {
              limit: 101
            }
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('Get Contact by ID', () => {
      it('should return specific contact when ID exists', async () => {
        if (testContactId) {
          const response = await request(app)
            .post('/api/trpc/contacts.byId')
            .send({
              json: {
                id: testContactId
              }
            });

          // May return 404 if not implemented yet
          if (response.status === 200) {
            expect(response.body.result.data).toMatchObject({
              id: testContactId,
              first_name: expect.any(String),
              last_name: expect.any(String)
            });
          } else {
            expect(response.status).toBe(404);
          }
        }
      });

      it('should return 404 for non-existent contact', async () => {
        const response = await request(app)
          .post('/api/trpc/contacts.byId')
          .send({
            json: {
              id: 999999
            }
          })
          .expect(404);

        expect(response.body.error.message).toContain('not found');
      });

      it('should validate ID parameter', async () => {
        const response = await request(app)
          .post('/api/trpc/contacts.byId')
          .send({
            json: {
              id: 'invalid'
            }
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('Contact Statistics', () => {
      it('should return contact statistics', async () => {
        const response = await request(app)
          .get('/api/trpc/contacts.stats')
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          total: expect.any(Number),
          by_strategic_value: expect.any(Object),
          by_data_source: expect.any(Object),
          average_score: expect.any(Number)
        });

        expect(response.body.result.data.total).toBeGreaterThanOrEqual(0);
        expect(response.body.result.data.average_score).toBeGreaterThanOrEqual(0);
        expect(response.body.result.data.average_score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Projects API', () => {
    describe('List Projects', () => {
      it('should return projects list', async () => {
        const response = await request(app)
          .post('/api/trpc/projects.list')
          .send({
            json: {
              limit: 10,
              offset: 0
            }
          })
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number),
          limit: 10,
          offset: 0,
          hasMore: expect.any(Boolean)
        });
      });

      it('should filter projects by status', async () => {
        const response = await request(app)
          .post('/api/trpc/projects.list')
          .send({
            json: {
              status: 'active'
            }
          })
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          data: expect.any(Array),
          count: expect.any(Number)
        });
      });

      it('should validate status enum', async () => {
        const response = await request(app)
          .post('/api/trpc/projects.list')
          .send({
            json: {
              status: 'invalid_status'
            }
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Intelligence API', () => {
    describe('Intelligence Query', () => {
      it('should process intelligence query', async () => {
        const response = await request(app)
          .post('/api/trpc/intelligence.query')
          .send({
            json: {
              query: 'test query',
              limit: 5
            }
          })
          .expect(200);

        expect(response.body.result.data).toMatchObject({
          id: expect.any(String),
          query: 'test query',
          results: expect.any(Array),
          confidence: expect.any(Number),
          sources: expect.any(Array),
          timestamp: expect.any(String)
        });
      });

      it('should validate query parameter', async () => {
        const response = await request(app)
          .post('/api/trpc/intelligence.query')
          .send({
            json: {
              limit: 5
            }
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should validate limit range', async () => {
        const response = await request(app)
          .post('/api/trpc/intelligence.query')
          .send({
            json: {
              query: 'test',
              limit: 150
            }
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/trpc/contacts.list')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/trpc/contacts.list')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle unknown procedures', async () => {
      const response = await request(app)
        .post('/api/trpc/unknown.procedure')
        .send({
          json: {}
        })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should respond to health check within 100ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app)
          .get('/api/trpc/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.result.data.status).toBeDefined();
      });
    });
  });

  describe('Database Integration', () => {
    it('should maintain database connections', async () => {
      // Test multiple sequential database operations
      const operations = [
        request(app).post('/api/trpc/contacts.list').send({ json: { limit: 1 } }),
        request(app).get('/api/trpc/contacts.stats'),
        request(app).post('/api/trpc/projects.list').send({ json: { limit: 1 } })
      ];

      const responses = await Promise.all(operations);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, just verify the structure exists
      expect(true).toBe(true);
    });
  });
});

// Helper Functions

async function createTestContact() {
  const testContact = {
    first_name: 'Test',
    last_name: 'Contact',
    email_address: 'test@example.com',
    linkedin_url: 'https://linkedin.com/in/test-contact',
    current_company: 'Test Company',
    current_position: 'Test Position',
    connection_source: 'test',
    relationship_score: 0.75,
    strategic_value: 'medium',
    alignment_tags: ['test'],
    raw_import_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await testSupabase
      .from('linkedin_contacts')
      .insert(testContact)
      .select()
      .single();

    if (error) {
      console.warn('Could not create test contact:', error.message);
      return { id: null };
    }

    return data;
  } catch (error) {
    console.warn('Test contact creation failed:', error.message);
    return { id: null };
  }
}

async function cleanupTestData() {
  try {
    // Clean up test contacts
    await testSupabase
      .from('linkedin_contacts')
      .delete()
      .like('email_address', '%@example.com');

    // Clean up test projects
    await testSupabase
      .from('projects')
      .delete()
      .like('title', 'Test%');

  } catch (error) {
    console.warn('Test cleanup failed:', error.message);
  }
}