/**
 * GraphQL Schema Integration Tests
 * Tests schema validation, introspection, and type definitions
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { buildSchema, validateSchema, introspectionFromSchema } from 'graphql';

import { createTestServer, createTestUser, withAuth } from '../setup.js';

describe('GraphQL Schema Integration', () => {
  let server, app;

  beforeAll(async () => {
    const testServer = await createTestServer();
    server = testServer.server;
    app = testServer.app;
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Schema Validation', () => {
    test('should have valid GraphQL schema', async () => {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            subscriptionType { name }
            types {
              name
              kind
              description
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: introspectionQuery })
        .set('API-Version', 'v1')
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.__schema).toBeDefined();
      expect(response.body.data.__schema.queryType.name).toBe('Query');
      expect(response.body.data.__schema.mutationType.name).toBe('Mutation');
      expect(response.body.data.__schema.subscriptionType.name).toBe('Subscription');
    });

    test('should include core entity types', async () => {
      const typesQuery = `
        query GetTypes {
          __schema {
            types {
              name
              kind
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: typesQuery })
        .expect(200);

      const types = response.body.data.__schema.types;
      const typeNames = types.map(type => type.name);

      // Check for core entity types
      expect(typeNames).toContain('User');
      expect(typeNames).toContain('Project');
      expect(typeNames).toContain('Story');
      expect(typeNames).toContain('Event');
      expect(typeNames).toContain('Organisation');
      expect(typeNames).toContain('Opportunity');
      expect(typeNames).toContain('SystemHealth');
      expect(typeNames).toContain('CulturalSafetyMetrics');
    });

    test('should include custom scalars', async () => {
      const scalarsQuery = `
        query GetScalars {
          __schema {
            types {
              name
              kind
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: scalarsQuery })
        .expect(200);

      const types = response.body.data.__schema.types;
      const scalarTypes = types.filter(type => type.kind === 'SCALAR');
      const scalarNames = scalarTypes.map(type => type.name);

      expect(scalarNames).toContain('Date');
      expect(scalarNames).toContain('DateTime');
      expect(scalarNames).toContain('JSON');
    });
  });

  describe('Query Type Validation', () => {
    test('should expose system health query', async () => {
      const query = `
        query GetSystemHealth {
          systemHealth {
            status
            timestamp
            services {
              postgresql { status connected }
              redis { status connected }
              neo4j { status connected }
            }
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.systemHealth).toBeDefined();
      expect(response.body.data.systemHealth.status).toBeDefined();
      expect(response.body.data.systemHealth.services).toBeDefined();
    });

    test('should expose cultural safety metrics', async () => {
      const query = `
        query GetCulturalSafetyMetrics {
          culturalSafetyMetrics {
            overallScore
            totalItems
            protocolValidations
            communityConsentChecks
            sacredKnowledgeProtections
            indigenousDataSovereignty
            communityFeedbackScore
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.culturalSafetyMetrics).toBeDefined();
      expect(typeof response.body.data.culturalSafetyMetrics.overallScore).toBe(
        'number'
      );
    });

    test('should require authentication for protected queries', async () => {
      const query = `
        query GetMyProfile {
          me {
            id
            name
            email
            role
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Authentication required');
    });

    test('should allow authenticated access to protected queries', async () => {
      const testUser = createTestUser();
      const query = `
        query GetMyProfile {
          me {
            id
            name
            email
            role
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .set(withAuth(testUser))
        .expect(200);

      // Since we're using mocks, we expect the query to process without auth errors
      // The actual data might be null but there should be no authentication errors
      if (response.body.errors) {
        expect(response.body.errors[0].message).not.toContain(
          'Authentication required'
        );
      }
    });
  });

  describe('Mutation Type Validation', () => {
    test('should expose user registration mutation', async () => {
      const mutation = `
        mutation RegisterUser($input: UserRegistrationInput!) {
          registerUser(input: $input) {
            success
            message
            user {
              id
              name
              email
              role
            }
          }
        }
      `;

      const variables = {
        input: {
          email: 'test@example.com',
          password: 'securePassword123',
          name: 'Test User',
          username: 'testuser',
          culturalBackground: 'Australian',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.registerUser).toBeDefined();
      expect(response.body.data.registerUser.success).toBe(true);
    });

    test('should expose project creation mutation', async () => {
      const testUser = createTestUser();
      const mutation = `
        mutation CreateProject($input: ProjectInput!) {
          createProject(input: $input) {
            success
            message
            project {
              id
              title
              description
              status
            }
          }
        }
      `;

      const variables = {
        input: {
          title: 'Test Project',
          description: 'A test project for cultural safety',
          type: 'community',
          location: 'Sydney, NSW',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables })
        .set(withAuth(testUser))
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createProject).toBeDefined();
      expect(response.body.data.createProject.success).toBe(true);
    });
  });

  describe('Subscription Type Validation', () => {
    test('should expose user activity subscription', async () => {
      const subscription = `
        subscription UserActivity($userId: ID!) {
          userActivity(userId: $userId) {
            action
            timestamp
            details
          }
        }
      `;

      // Test schema validation for subscription (actual subscription testing would need WebSocket)
      const introspectionQuery = `
        query GetSubscriptionFields {
          __schema {
            subscriptionType {
              fields {
                name
                type {
                  name
                }
              }
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: introspectionQuery })
        .expect(200);

      expect(response.body.errors).toBeUndefined();

      const subscriptionFields = response.body.data.__schema.subscriptionType.fields;
      const fieldNames = subscriptionFields.map(field => field.name);

      expect(fieldNames).toContain('userActivity');
      expect(fieldNames).toContain('projectUpdated');
      expect(fieldNames).toContain('systemHealthUpdated');
    });
  });

  describe('API Versioning Schema Support', () => {
    test('should handle version headers in schema introspection', async () => {
      const query = `
        query GetVersion {
          __schema {
            queryType { name }
          }
        }
      `;

      const v1Response = await request(app)
        .post('/graphql')
        .send({ query })
        .set('API-Version', 'v1')
        .expect(200);

      const v2Response = await request(app)
        .post('/graphql')
        .send({ query })
        .set('API-Version', 'v2')
        .expect(200);

      // Both versions should work (v2 falls back to v1 schema for now)
      expect(v1Response.body.errors).toBeUndefined();
      expect(v2Response.body.errors).toBeUndefined();

      // Check version headers in response
      expect(v1Response.headers['api-version']).toBe('v1');
      expect(v2Response.headers['api-version']).toBe('v2');
    });

    test('should include cultural safety fields in all entity types', async () => {
      const query = `
        query CheckCulturalSafetyFields {
          __type(name: "Project") {
            fields {
              name
              type {
                name
              }
            }
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      expect(response.body.errors).toBeUndefined();

      const fields = response.body.data.__type.fields;
      const fieldNames = fields.map(field => field.name);

      expect(fieldNames).toContain('culturalSafetyScore');
    });
  });

  describe('Error Handling Schema', () => {
    test('should handle invalid query gracefully', async () => {
      const invalidQuery = `
        query InvalidQuery {
          nonExistentField {
            invalidSubfield
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: invalidQuery })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('nonExistentField');
    });

    test('should validate required arguments', async () => {
      const queryWithMissingArgs = `
        mutation RegisterUserMissingArgs {
          registerUser {
            success
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: queryWithMissingArgs })
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('input');
    });

    test('should return structured error format', async () => {
      const query = `
        query TestError {
          me {
            id
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      if (response.body.errors) {
        const error = response.body.errors[0];
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('path');
        expect(error).toHaveProperty('code');
      }
    });
  });
});
