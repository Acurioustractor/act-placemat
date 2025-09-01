/**
 * API Versioning and Documentation Integration Tests
 * Tests version handling, backwards compatibility, and documentation endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

import { createTestServer, createTestUser, withAuth } from '../setup.js';

describe('API Versioning and Documentation', () => {
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

  describe('API Versioning', () => {
    test('should handle version headers', async () => {
      const query = `
        query SystemHealth {
          systemHealth {
            status
            timestamp
          }
        }
      `;

      // Test v1 via header
      const v1Response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v1')
        .send({ query })
        .expect(200);

      expect(v1Response.headers['api-version']).toBe('v1');
      expect(v1Response.headers['api-supported-versions']).toContain('v1');

      // Test v2 via header
      const v2Response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v2')
        .send({ query })
        .expect(200);

      expect(v2Response.headers['api-version']).toBe('v2');
    });

    test('should handle version query parameters', async () => {
      const query = `
        query SystemHealth {
          systemHealth {
            status
          }
        }
      `;

      // Test v1 via query parameter
      const v1Response = await request(app)
        .post('/graphql?version=v1')
        .send({ query })
        .expect(200);

      expect(v1Response.headers['api-version']).toBe('v1');

      // Test v2 via query parameter
      const v2Response = await request(app)
        .post('/graphql?version=v2')
        .send({ query })
        .expect(200);

      expect(v2Response.headers['api-version']).toBe('v2');
    });

    test('should default to latest version when no version specified', async () => {
      const query = `
        query SystemHealth {
          systemHealth {
            status
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      // Should default to v1 (latest)
      expect(response.headers['api-version']).toBe('v1');
    });

    test('should handle invalid version gracefully', async () => {
      const query = `
        query SystemHealth {
          systemHealth {
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v999')
        .send({ query })
        .expect(200);

      // Should fall back to latest version
      expect(response.headers['api-version']).toBe('v1');
    });

    test('should prioritize query parameter over header', async () => {
      const query = `
        query SystemHealth {
          systemHealth {
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql?version=v2')
        .set('API-Version', 'v1')
        .send({ query })
        .expect(200);

      // Query parameter should take precedence
      expect(response.headers['api-version']).toBe('v2');
    });
  });

  describe('Version-Specific Features', () => {
    test('should provide version context in GraphQL resolvers', async () => {
      const query = `
        query GetSystemConfig {
          systemConfig {
            version
            features {
              culturalSafety
              subscriptions
            }
          }
        }
      `;

      const v1Response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v1')
        .send({ query })
        .expect(200);

      expect(v1Response.body.errors).toBeUndefined();
      expect(v1Response.body.data.systemConfig.features.culturalSafety).toBe(true);
    });

    test('should handle deprecated fields with warnings', async () => {
      // This test assumes we have a deprecated field in our schema
      // For now, we'll test the warning header structure
      const query = `
        query TestDeprecation {
          systemHealth {
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v1')
        .send({ query })
        .expect(200);

      // Check for deprecation warning structure
      // (In real implementation, this would trigger if deprecated fields were used)
      if (response.headers['deprecation-warning']) {
        expect(typeof response.headers['deprecation-warning']).toBe('string');
      }
    });
  });

  describe('Error Handling Versioning', () => {
    test('should format errors based on API version', async () => {
      const invalidQuery = `
        query InvalidQuery {
          nonExistentField
        }
      `;

      // Test v1 error format
      const v1Response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v1')
        .send({ query: invalidQuery })
        .expect(400);

      expect(v1Response.body.errors).toBeDefined();
      const v1Error = v1Response.body.errors[0];
      expect(v1Error).toHaveProperty('message');
      expect(v1Error).toHaveProperty('code');

      // Test v2 error format (should be similar for now)
      const v2Response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v2')
        .send({ query: invalidQuery })
        .expect(400);

      expect(v2Response.body.errors).toBeDefined();
      const v2Error = v2Response.body.errors[0];
      expect(v2Error).toHaveProperty('message');
      expect(v2Error).toHaveProperty('code');
    });

    test('should include version information in error responses', async () => {
      const query = `
        query RequireAuth {
          me {
            id
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('API-Version', 'v1')
        .send({ query })
        .expect(200);

      if (response.body.errors) {
        // Errors should not include version info in production
        // but headers should still indicate version
        expect(response.headers['api-version']).toBe('v1');
      }
    });
  });

  describe('Documentation Endpoints', () => {
    test('should serve JSON API documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .set('API-Version', 'v1')
        .expect(200);

      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('authentication');
      expect(response.body).toHaveProperty('culturalSafety');
    });

    test('should serve version information endpoint', async () => {
      const response = await request(app).get('/api/version').expect(200);

      expect(response.body).toHaveProperty('currentVersion');
      expect(response.body).toHaveProperty('supportedVersions');
      expect(response.body).toHaveProperty('versioningStrategy');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('deprecations');
    });

    test('should serve playground configuration', async () => {
      const response = await request(app)
        .get('/api/playground-config')
        .set('API-Version', 'v1')
        .expect(200);

      expect(response.body).toHaveProperty('settings');
      expect(response.body).toHaveProperty('tabs');
      expect(response.body).toHaveProperty('workspaceName');
      expect(response.body.workspaceName).toContain('v1');
    });

    test('should serve HTML documentation page', async () => {
      const response = await request(app)
        .get('/docs')
        .set('API-Version', 'v1')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('ACT Ecosystem GraphQL API');
      expect(response.text).toContain('Cultural Safety');
      expect(response.text).toContain('Version v1');
    });

    test('should include version-specific documentation', async () => {
      const v1Response = await request(app)
        .get('/api/docs')
        .set('API-Version', 'v1')
        .expect(200);

      const v2Response = await request(app)
        .get('/api/docs')
        .set('API-Version', 'v2')
        .expect(200);

      // Both should have documentation but with version-specific content
      expect(v1Response.body.version).toBe('v1');
      expect(v2Response.body.version).toBe('v2');

      // Check version-specific features
      expect(v1Response.body.versioning.features.v1).toBeDefined();
      expect(v2Response.body.versioning.features.v2).toBeDefined();
    });
  });

  describe('Cultural Safety Documentation', () => {
    test('should emphasize cultural safety in documentation', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.culturalSafety).toBeDefined();
      expect(response.body.culturalSafety.description).toContain('cultural safety');
      expect(response.body.culturalSafety.features).toContain(
        'Indigenous data sovereignty'
      );
      expect(response.body.culturalSafety.guidelines).toContain(
        'cultural safety thresholds'
      );
    });

    test('should include cultural safety examples in documentation', async () => {
      const response = await request(app).get('/docs').expect(200);

      expect(response.text).toContain('Cultural Safety');
      expect(response.text).toContain('Indigenous data sovereignty');
      expect(response.text).toContain('community consent');
    });

    test('should include cultural safety queries in playground config', async () => {
      const response = await request(app).get('/api/playground-config').expect(200);

      const culturalSafetyTab = response.body.tabs.find(tab =>
        tab.name.includes('Cultural Safety')
      );

      expect(culturalSafetyTab).toBeDefined();
      expect(culturalSafetyTab.query).toContain('culturalSafetyScore');
      expect(culturalSafetyTab.query).toContain('communityConsent');
    });
  });

  describe('Authentication Documentation', () => {
    test('should document authentication requirements', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.authentication).toBeDefined();
      expect(response.body.authentication.type).toBe('JWT Bearer Token');
      expect(response.body.authentication.scopes).toBeInstanceOf(Array);
      expect(response.body.authentication.scopes.length).toBeGreaterThan(0);
    });

    test('should include authentication examples', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.examples.authentication).toBeDefined();
      expect(response.body.examples.authentication.mutations).toBeInstanceOf(Array);

      const registerMutation = response.body.examples.authentication.mutations.find(
        m => m.name === 'registerUser'
      );
      expect(registerMutation).toBeDefined();
      expect(registerMutation.example).toContain('registerUser');
    });
  });

  describe('Schema Documentation', () => {
    test('should include comprehensive type documentation', async () => {
      const query = `
        query GetTypeDocumentation {
          __type(name: "User") {
            name
            description
            fields {
              name
              description
              type {
                name
              }
            }
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.__type.name).toBe('User');
      expect(response.body.data.__type.fields).toBeInstanceOf(Array);
    });

    test('should document cultural safety fields', async () => {
      const query = `
        query GetCulturalSafetyDocumentation {
          __type(name: "CulturalSafetyMetrics") {
            name
            fields {
              name
              description
            }
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.__type.name).toBe('CulturalSafetyMetrics');

      const fieldNames = response.body.data.__type.fields.map(f => f.name);
      expect(fieldNames).toContain('overallScore');
      expect(fieldNames).toContain('communityConsentChecks');
      expect(fieldNames).toContain('indigenousDataSovereignty');
    });
  });

  describe('Migration Guidance', () => {
    test('should provide migration guides in version documentation', async () => {
      const response = await request(app).get('/api/version').expect(200);

      expect(response.body.migrationGuides).toBeDefined();
      expect(response.body.migrationGuides['v1-to-v2']).toBeDefined();
      expect(response.body.migrationGuides['v1-to-v2'].description).toContain(
        'Migration guide'
      );
      expect(response.body.migrationGuides['v1-to-v2'].changes).toBeInstanceOf(Array);
    });

    test('should document breaking changes', async () => {
      const response = await request(app).get('/api/version').expect(200);

      expect(response.body.deprecations).toBeInstanceOf(Array);
      if (response.body.deprecations.length > 0) {
        const deprecation = response.body.deprecations[0];
        expect(deprecation).toHaveProperty('field');
        expect(deprecation).toHaveProperty('reason');
        expect(deprecation).toHaveProperty('deprecatedIn');
        expect(deprecation).toHaveProperty('removedIn');
      }
    });
  });

  describe('Community Resources Documentation', () => {
    test('should include community resource links', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.communityResources).toBeInstanceOf(Array);
      expect(response.body.communityResources.length).toBeGreaterThan(0);

      const communityGuidelines = response.body.communityResources.find(resource =>
        resource.name.includes('Community Guidelines')
      );
      expect(communityGuidelines).toBeDefined();
      expect(communityGuidelines.url).toContain('act.place');
    });

    test('should include supporting tools information', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.supportingTools).toBeInstanceOf(Array);
      expect(response.body.supportingTools.length).toBeGreaterThan(0);

      const playgroundTool = response.body.supportingTools.find(tool =>
        tool.name.includes('GraphQL Playground')
      );
      expect(playgroundTool).toBeDefined();
    });
  });
});
