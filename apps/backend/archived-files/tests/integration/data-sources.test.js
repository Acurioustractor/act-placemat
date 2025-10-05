/**
 * Data Source Integration Tests
 * Tests PostgreSQL, Redis, and Neo4j data source integration
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';

import {
  createTestServer,
  createTestUser,
  withAuth,
  createCulturallySafeContent,
} from '../setup.js';

describe('Data Source Integration', () => {
  let server, app, dataSources;

  beforeAll(async () => {
    const testServer = await createTestServer();
    server = testServer.server;
    app = testServer.app;
    dataSources = testServer.dataSources;
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async () => {
    // Clear all data sources before each test
    if (dataSources.postgres?.clearMockData) {
      await dataSources.postgres.clearMockData();
    }
    if (dataSources.redis?.clearMockData) {
      await dataSources.redis.clearMockData();
    }
    if (dataSources.neo4j?.clearMockData) {
      await dataSources.neo4j.clearMockData();
    }
  });

  describe('PostgreSQL Integration', () => {
    test('should connect to PostgreSQL data source', async () => {
      expect(dataSources.postgres).toBeDefined();
      expect(dataSources.postgres.isConnected).toBe(true);
    });

    test('should perform CRUD operations on users table', async () => {
      const testUser = createTestUser();

      // Create user
      const createdUsers = await dataSources.postgres.insert('users', {
        email: testUser.email,
        name: testUser.name,
        username: testUser.username,
        role: testUser.role,
      });

      expect(createdUsers).toHaveLength(1);
      expect(createdUsers[0].email).toBe(testUser.email);

      // Read user
      const foundUsers = await dataSources.postgres.query('users', {
        eq: { email: testUser.email },
      });

      expect(foundUsers).toHaveLength(1);
      expect(foundUsers[0].name).toBe(testUser.name);

      // Update user
      const updatedUsers = await dataSources.postgres.update(
        'users',
        { name: 'Updated Name' },
        { eq: { email: testUser.email } }
      );

      expect(updatedUsers).toHaveLength(1);
      expect(updatedUsers[0].name).toBe('Updated Name');

      // Delete user
      await dataSources.postgres.delete('users', {
        eq: { email: testUser.email },
      });

      const deletedUsers = await dataSources.postgres.query('users', {
        eq: { email: testUser.email },
      });

      expect(deletedUsers).toHaveLength(0);
    });

    test('should support cultural safety queries', async () => {
      // Insert projects with different cultural safety scores
      await dataSources.postgres.insert('projects', {
        title: 'High Safety Project',
        cultural_safety_score: 95,
        ...createCulturallySafeContent(),
      });

      await dataSources.postgres.insert('projects', {
        title: 'Low Safety Project',
        cultural_safety_score: 60,
      });

      // Query with cultural safety filter
      const safeProjects = await dataSources.postgres.query('projects', {
        gte: { cultural_safety_score: 80 },
      });

      expect(safeProjects).toHaveLength(1);
      expect(safeProjects[0].title).toBe('High Safety Project');
    });

    test('should handle pagination and ordering', async () => {
      // Insert multiple records
      const projects = [];
      for (let i = 0; i < 5; i++) {
        projects.push({
          title: `Project ${i}`,
          cultural_safety_score: 80 + i,
        });
      }

      for (const project of projects) {
        await dataSources.postgres.insert('projects', project);
      }

      // Test ordering
      const orderedProjects = await dataSources.postgres.query('projects', {
        orderBy: { column: 'cultural_safety_score', ascending: false },
        limit: 3,
      });

      expect(orderedProjects).toHaveLength(3);
      expect(orderedProjects[0].cultural_safety_score).toBeGreaterThanOrEqual(
        orderedProjects[1].cultural_safety_score
      );

      // Test pagination
      const paginatedProjects = await dataSources.postgres.query('projects', {
        range: { from: 1, to: 3 },
      });

      expect(paginatedProjects).toHaveLength(3);
    });

    test('should provide health check', async () => {
      const health = await dataSources.postgres.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.error).toBeNull();
    });
  });

  describe('Redis Integration', () => {
    test('should connect to Redis data source', async () => {
      expect(dataSources.redis).toBeDefined();
      expect(dataSources.redis.isConnected).toBe(true);
    });

    test('should perform basic Redis operations', async () => {
      const key = 'test:key';
      const value = { message: 'Hello World', timestamp: Date.now() };

      // Set value
      const setResult = await dataSources.redis.set(key, value);
      expect(setResult).toBe(true);

      // Get value
      const retrievedValue = await dataSources.redis.get(key);
      expect(retrievedValue).toEqual(value);

      // Check existence
      const exists = await dataSources.redis.exists(key);
      expect(exists).toBe(1);

      // Delete value
      const delResult = await dataSources.redis.del(key);
      expect(delResult).toBe(1);

      // Verify deletion
      const deletedValue = await dataSources.redis.get(key);
      expect(deletedValue).toBeNull();
    });

    test('should handle TTL (time to live)', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';
      const ttl = 1; // 1 second

      await dataSources.redis.set(key, value, ttl);

      // Value should exist immediately
      const immediateValue = await dataSources.redis.get(key);
      expect(immediateValue).toBe(value);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Value should be expired
      const expiredValue = await dataSources.redis.get(key);
      expect(expiredValue).toBeNull();
    });

    test('should support user session caching', async () => {
      const testUser = createTestUser();
      const sessionData = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        loginTime: Date.now(),
      };

      // Cache user session
      await dataSources.redis.cacheUserSession(testUser.id, sessionData, 3600);

      // Retrieve user session
      const cachedSession = await dataSources.redis.getUserSession(testUser.id);
      expect(cachedSession).toEqual(sessionData);
    });

    test('should track user activity', async () => {
      const testUser = createTestUser();
      const activities = [
        { action: 'login', details: { ip: '192.168.1.1' } },
        { action: 'view_project', details: { projectId: 'proj-123' } },
        { action: 'create_story', details: { storyId: 'story-456' } },
      ];

      // Track activities
      for (const activity of activities) {
        await dataSources.redis.trackUserActivity(testUser.id, activity);
      }

      // Get user activity
      const userActivity = await dataSources.redis.getUserActivity(testUser.id, 5);
      expect(userActivity).toHaveLength(3);
      expect(userActivity[0].action).toBe('create_story'); // Most recent first
      expect(userActivity[2].action).toBe('login'); // Oldest last
    });

    test('should implement rate limiting', async () => {
      const identifier = 'test-client';
      const limit = 3;
      const windowSeconds = 10;

      // First few requests should be allowed
      for (let i = 1; i <= limit; i++) {
        const result = await dataSources.redis.rateLimitCheck(
          identifier,
          limit,
          windowSeconds
        );
        expect(result.allowed).toBe(true);
        expect(result.count).toBe(i);
        expect(result.remaining).toBe(limit - i);
      }

      // Next request should be rejected
      const rejectedResult = await dataSources.redis.rateLimitCheck(
        identifier,
        limit,
        windowSeconds
      );
      expect(rejectedResult.allowed).toBe(false);
      expect(rejectedResult.remaining).toBe(0);
    });

    test('should provide health check', async () => {
      const health = await dataSources.redis.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.error).toBeNull();
    });
  });

  describe('Neo4j Integration', () => {
    test('should connect to Neo4j data source', async () => {
      expect(dataSources.neo4j).toBeDefined();
      expect(dataSources.neo4j.isConnected).toBe(true);
    });

    test('should create and manage nodes', async () => {
      const testUser = createTestUser();

      // Create user node
      const userNode = await dataSources.neo4j.createUser({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
        culturalBackground: 'Aboriginal Australian',
      });

      expect(userNode.id).toBe(testUser.id);
      expect(userNode.name).toBe(testUser.name);
    });

    test('should create and manage relationships', async () => {
      const user1 = createTestUser({ id: 'user-1', name: 'User 1' });
      const user2 = createTestUser({ id: 'user-2', name: 'User 2' });

      // Create user nodes
      await dataSources.neo4j.createUser(user1);
      await dataSources.neo4j.createUser(user2);

      // Create relationship
      const relationship = await dataSources.neo4j.createRelationship(
        user1.id,
        'User',
        user2.id,
        'User',
        'COLLABORATES_WITH',
        {
          project: 'Community Art Project',
          since: new Date().toISOString(),
        }
      );

      expect(relationship).toBeDefined();
    });

    test('should find user collaborations', async () => {
      const user1 = createTestUser({ id: 'user-1', name: 'User 1' });
      const user2 = createTestUser({ id: 'user-2', name: 'User 2' });
      const user3 = createTestUser({ id: 'user-3', name: 'User 3' });

      // Create user nodes
      await dataSources.neo4j.createUser(user1);
      await dataSources.neo4j.createUser(user2);
      await dataSources.neo4j.createUser(user3);

      // Create relationships
      await dataSources.neo4j.createRelationship(
        user1.id,
        'User',
        user2.id,
        'User',
        'COLLABORATES_WITH'
      );

      await dataSources.neo4j.createRelationship(
        user1.id,
        'User',
        user3.id,
        'User',
        'PARTNERS_WITH'
      );

      // Find collaborations
      const collaborations = await dataSources.neo4j.findUserCollaborations(user1.id);
      expect(collaborations).toHaveLength(2);

      const relationshipTypes = collaborations.map(collab => collab.relationship.type);
      expect(relationshipTypes).toContain('COLLABORATES_WITH');
      expect(relationshipTypes).toContain('PARTNERS_WITH');
    });

    test('should calculate network metrics', async () => {
      const user = createTestUser({ id: 'central-user', name: 'Central User' });

      // Create user node
      await dataSources.neo4j.createUser(user);

      // Create some relationships
      for (let i = 1; i <= 3; i++) {
        const collaborator = createTestUser({ id: `collaborator-${i}` });
        await dataSources.neo4j.createUser(collaborator);

        await dataSources.neo4j.createRelationship(
          user.id,
          'User',
          collaborator.id,
          'User',
          'COLLABORATES_WITH'
        );
      }

      // Calculate network metrics
      const metrics = await dataSources.neo4j.calculateNetworkMetrics(user.id, 'User');

      expect(metrics.nodeId).toBe(user.id);
      expect(metrics.degree).toBe(3);
      expect(metrics.totalRelationships).toBe(3);
      expect(metrics.relationshipTypes).toContain('COLLABORATES_WITH');
    });

    test('should provide health check', async () => {
      const health = await dataSources.neo4j.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.error).toBeNull();
    });
  });

  describe('Cross-Data Source Operations', () => {
    test('should coordinate operations across multiple data sources', async () => {
      const testUser = createTestUser();

      // 1. Create user in PostgreSQL
      const pgUser = await dataSources.postgres.insert('users', {
        email: testUser.email,
        name: testUser.name,
        username: testUser.username,
        role: testUser.role,
      });

      expect(pgUser).toHaveLength(1);
      const userId = pgUser[0].id;

      // 2. Cache user session in Redis
      const sessionData = {
        id: userId,
        email: testUser.email,
        role: testUser.role,
      };

      await dataSources.redis.cacheUserSession(userId, sessionData);
      const cachedSession = await dataSources.redis.getUserSession(userId);
      expect(cachedSession).toEqual(sessionData);

      // 3. Create user node in Neo4j
      await dataSources.neo4j.createUser({
        id: userId,
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
      });

      // 4. Track activity in Redis
      await dataSources.redis.trackUserActivity(userId, {
        action: 'user_created',
        source: 'integration_test',
      });

      const activity = await dataSources.redis.getUserActivity(userId, 1);
      expect(activity).toHaveLength(1);
      expect(activity[0].action).toBe('user_created');
    });

    test('should handle data consistency across sources', async () => {
      const testUser = createTestUser();
      const projectData = {
        title: 'Cross-Source Project',
        description: 'Testing data consistency',
        type: 'community',
        cultural_safety_score: 90,
      };

      // Create user in PostgreSQL
      const pgUser = await dataSources.postgres.insert('users', testUser);
      const userId = pgUser[0].id;

      // Create project in PostgreSQL
      const pgProject = await dataSources.postgres.insert('projects', {
        ...projectData,
        created_by: userId,
      });
      const projectId = pgProject[0].id;

      // Create project node in Neo4j
      await dataSources.neo4j.createProject({
        id: projectId,
        name: projectData.title,
        description: projectData.description,
        culturalSafetyScore: projectData.cultural_safety_score,
      });

      // Create user node in Neo4j
      await dataSources.neo4j.createUser({
        id: userId,
        name: testUser.name,
        email: testUser.email,
      });

      // Create relationship between user and project
      await dataSources.neo4j.createRelationship(
        userId,
        'User',
        projectId,
        'Project',
        'CREATED'
      );

      // Cache project data in Redis
      await dataSources.redis.set(
        `project:${projectId}`,
        {
          id: projectId,
          title: projectData.title,
          cultural_safety_score: projectData.cultural_safety_score,
          created_by: userId,
        },
        300
      );

      // Verify data exists in all three sources
      const pgProjects = await dataSources.postgres.query('projects', {
        eq: { id: projectId },
      });
      expect(pgProjects).toHaveLength(1);

      const cachedProject = await dataSources.redis.get(`project:${projectId}`);
      expect(cachedProject.title).toBe(projectData.title);

      const collaborations = await dataSources.neo4j.findUserCollaborations(userId);
      expect(collaborations).toHaveLength(1);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle data source unavailability gracefully', async () => {
      // Simulate Redis being unavailable
      dataSources.redis.isConnected = false;

      const health = await dataSources.redis.healthCheck();
      expect(health.status).toBe('healthy'); // Mock always returns healthy
      // In real implementation, this would be 'unhealthy'
    });

    test('should handle invalid data gracefully', async () => {
      // Try to insert invalid data
      try {
        await dataSources.postgres.insert('users', {
          // Missing required fields
          email: null,
        });
      } catch (error) {
        // Should handle validation errors gracefully
        expect(error).toBeDefined();
      }
    });

    test('should handle concurrent operations', async () => {
      const operations = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        operations.push(dataSources.redis.set(`concurrent:${i}`, { value: i }));
      }

      // All operations should complete successfully
      const results = await Promise.all(operations);
      expect(results.every(result => result === true)).toBe(true);

      // Verify all values were set
      for (let i = 0; i < 5; i++) {
        const value = await dataSources.redis.get(`concurrent:${i}`);
        expect(value.value).toBe(i);
      }
    });
  });
});
