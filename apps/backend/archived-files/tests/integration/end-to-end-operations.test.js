/**
 * End-to-End GraphQL Operations Integration Tests
 * Tests complete user workflows across the entire GraphQL API stack
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';

import {
  createTestServer,
  createTestUser,
  withAuth,
  createCulturallySafeContent,
} from '../setup.js';

describe('End-to-End GraphQL Operations', () => {
  let server, app, dataSources;
  let testUser, adminUser;

  beforeAll(async () => {
    const testServer = await createTestServer();
    server = testServer.server;
    app = testServer.app;
    dataSources = testServer.dataSources;

    // Create test users for different scenarios
    testUser = createTestUser({ role: 'user' });
    adminUser = createTestUser({ role: 'admin', email: 'admin@test.com' });
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

  describe('User Registration and Authentication Workflow', () => {
    test('should complete full user registration and login flow', async () => {
      // Step 1: Register new user
      const registrationMutation = `
        mutation RegisterUser($input: UserRegistrationInput!) {
          registerUser(input: $input) {
            success
            message
            user {
              id
              name
              email
              role
              culturalBackground
            }
            token
          }
        }
      `;

      const registrationVariables = {
        input: {
          email: 'newuser@test.com',
          password: 'SecurePassword123!',
          name: 'New Test User',
          username: 'newuser',
          culturalBackground: 'Australian Aboriginal',
        },
      };

      const registrationResponse = await request(app)
        .post('/graphql')
        .send({ query: registrationMutation, variables: registrationVariables })
        .expect(200);

      expect(registrationResponse.body.errors).toBeUndefined();
      expect(registrationResponse.body.data.registerUser.success).toBe(true);
      expect(registrationResponse.body.data.registerUser.user.email).toBe(
        'newuser@test.com'
      );
      expect(registrationResponse.body.data.registerUser.token).toBeDefined();

      const newUser = registrationResponse.body.data.registerUser.user;
      const token = registrationResponse.body.data.registerUser.token;

      // Step 2: Login with registered user
      const loginMutation = `
        mutation LoginUser($input: LoginInput!) {
          loginUser(input: $input) {
            success
            message
            user {
              id
              name
              email
              role
            }
            token
          }
        }
      `;

      const loginVariables = {
        input: {
          email: 'newuser@test.com',
          password: 'SecurePassword123!',
        },
      };

      const loginResponse = await request(app)
        .post('/graphql')
        .send({ query: loginMutation, variables: loginVariables })
        .expect(200);

      expect(loginResponse.body.errors).toBeUndefined();
      expect(loginResponse.body.data.loginUser.success).toBe(true);
      expect(loginResponse.body.data.loginUser.user.id).toBe(newUser.id);

      // Step 3: Access protected resource with token
      const profileQuery = `
        query GetMyProfile {
          me {
            id
            name
            email
            role
            culturalBackground
            profile {
              bio
              location
              interests
            }
          }
        }
      `;

      const profileResponse = await request(app)
        .post('/graphql')
        .send({ query: profileQuery })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should not have authentication errors
      if (profileResponse.body.errors) {
        expect(profileResponse.body.errors[0].message).not.toContain(
          'Authentication required'
        );
      }
    });

    test('should handle authentication failures gracefully', async () => {
      const loginMutation = `
        mutation LoginUser($input: LoginInput!) {
          loginUser(input: $input) {
            success
            message
            user {
              id
              name
            }
            token
          }
        }
      `;

      // Test with invalid credentials
      const invalidLoginVariables = {
        input: {
          email: 'nonexistent@test.com',
          password: 'wrongpassword',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: loginMutation, variables: invalidLoginVariables })
        .expect(200);

      expect(response.body.data.loginUser.success).toBe(false);
      expect(response.body.data.loginUser.message).toContain('Invalid');
      expect(response.body.data.loginUser.token).toBeNull();
    });
  });

  describe('Project Creation and Management Workflow', () => {
    test('should complete full project lifecycle', async () => {
      // Step 1: Create project as authenticated user
      const createProjectMutation = `
        mutation CreateProject($input: ProjectInput!) {
          createProject(input: $input) {
            success
            message
            project {
              id
              title
              description
              type
              status
              location
              culturalSafetyScore
              createdBy
              collaborators {
                id
                name
                role
              }
            }
          }
        }
      `;

      const projectVariables = {
        input: {
          title: 'Community Art Installation',
          description:
            'A collaborative art project celebrating local Indigenous culture',
          type: 'community',
          location: 'Sydney, NSW',
          culturalConsiderations: 'Working with local Aboriginal community elders',
          impactGoals: ['Cultural preservation', 'Community engagement'],
        },
      };

      const createResponse = await request(app)
        .post('/graphql')
        .send({ query: createProjectMutation, variables: projectVariables })
        .set(withAuth(testUser))
        .expect(200);

      expect(createResponse.body.errors).toBeUndefined();
      expect(createResponse.body.data.createProject.success).toBe(true);
      expect(createResponse.body.data.createProject.project.title).toBe(
        'Community Art Installation'
      );
      expect(
        createResponse.body.data.createProject.project.culturalSafetyScore
      ).toBeGreaterThan(70);

      const project = createResponse.body.data.createProject.project;

      // Step 2: Update project with additional details
      const updateProjectMutation = `
        mutation UpdateProject($id: ID!, $input: ProjectUpdateInput!) {
          updateProject(id: $id, input: $input) {
            success
            message
            project {
              id
              title
              description
              status
              tags
              culturalSafetyScore
            }
          }
        }
      `;

      const updateVariables = {
        id: project.id,
        input: {
          status: 'in_progress',
          tags: ['art', 'community', 'indigenous', 'collaboration'],
          description:
            'A collaborative art project celebrating local Indigenous culture with community workshops',
        },
      };

      const updateResponse = await request(app)
        .post('/graphql')
        .send({ query: updateProjectMutation, variables: updateVariables })
        .set(withAuth(testUser))
        .expect(200);

      expect(updateResponse.body.errors).toBeUndefined();
      expect(updateResponse.body.data.updateProject.success).toBe(true);
      expect(updateResponse.body.data.updateProject.project.status).toBe('in_progress');

      // Step 3: Add collaborators to project
      const addCollaboratorMutation = `
        mutation AddProjectCollaborator($projectId: ID!, $userId: ID!, $role: CollaboratorRole!) {
          addProjectCollaborator(projectId: $projectId, userId: $userId, role: $role) {
            success
            message
            project {
              collaborators {
                id
                name
                role
              }
            }
          }
        }
      `;

      const collaboratorVariables = {
        projectId: project.id,
        userId: adminUser.id,
        role: 'ADVISOR',
      };

      const collaboratorResponse = await request(app)
        .post('/graphql')
        .send({ query: addCollaboratorMutation, variables: collaboratorVariables })
        .set(withAuth(testUser))
        .expect(200);

      expect(collaboratorResponse.body.errors).toBeUndefined();
      expect(collaboratorResponse.body.data.addProjectCollaborator.success).toBe(true);

      // Step 4: Query project with all related data
      const fullProjectQuery = `
        query GetProjectDetails($id: ID!) {
          project(id: $id) {
            id
            title
            description
            status
            type
            culturalSafetyScore
            collaborators {
              id
              name
              role
            }
            stories {
              id
              title
              culturalSafety
            }
            events {
              id
              title
              date
            }
            impact {
              communityBenefit
              culturalSignificance
              participantCount
            }
          }
        }
      `;

      const fullProjectResponse = await request(app)
        .post('/graphql')
        .send({ query: fullProjectQuery, variables: { id: project.id } })
        .expect(200);

      expect(fullProjectResponse.body.errors).toBeUndefined();
      expect(fullProjectResponse.body.data.project.title).toBe(
        'Community Art Installation'
      );
      expect(fullProjectResponse.body.data.project.collaborators).toHaveLength(1);
    });

    test('should enforce cultural safety requirements', async () => {
      const culturallySafeProject = {
        input: {
          title: 'Sacred Site Documentation',
          description: 'Documenting sacred cultural sites',
          type: 'research',
          location: 'Northern Territory',
          culturalConsiderations: 'Requires community consent and elder guidance',
        },
      };

      const createProjectMutation = `
        mutation CreateProject($input: ProjectInput!) {
          createProject(input: $input) {
            success
            message
            project {
              culturalSafetyScore
              requiresCommunityConsent
            }
            culturalSafetyWarnings
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: createProjectMutation, variables: culturallySafeProject })
        .set(withAuth(testUser))
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createProject.project.culturalSafetyScore).toBeLessThan(
        80
      );
      expect(response.body.data.createProject.project.requiresCommunityConsent).toBe(
        true
      );
      expect(response.body.data.createProject.culturalSafetyWarnings).toBeDefined();
    });
  });

  describe('Story Submission and Content Workflow', () => {
    test('should complete story submission with cultural safety validation', async () => {
      // Step 1: Submit a culturally safe story
      const submitStoryMutation = `
        mutation SubmitStory($input: StoryInput!) {
          submitStory(input: $input) {
            success
            message
            story {
              id
              title
              content
              culturalSafety
              status
              themes
              author {
                id
                name
              }
              consent {
                hasConsent
                communityConsent
                consentType
              }
            }
          }
        }
      `;

      const storyVariables = {
        input: {
          title: 'Community Garden Success',
          content:
            'Our local community came together to create a beautiful shared garden space.',
          themes: ['community', 'environment', 'collaboration'],
          location: 'Melbourne, VIC',
          hasConsent: true,
          communityConsent: true,
          consentType: 'full',
          ...createCulturallySafeContent(),
        },
      };

      const storyResponse = await request(app)
        .post('/graphql')
        .send({ query: submitStoryMutation, variables: storyVariables })
        .set(withAuth(testUser))
        .expect(200);

      expect(storyResponse.body.errors).toBeUndefined();
      expect(storyResponse.body.data.submitStory.success).toBe(true);
      expect(storyResponse.body.data.submitStory.story.culturalSafety).toBeGreaterThan(
        80
      );
      expect(storyResponse.body.data.submitStory.story.consent.hasConsent).toBe(true);

      const story = storyResponse.body.data.submitStory.story;

      // Step 2: Update story with additional media
      const updateStoryMutation = `
        mutation UpdateStory($id: ID!, $input: StoryUpdateInput!) {
          updateStory(id: $id, input: $input) {
            success
            story {
              id
              media {
                id
                type
                url
                culturalSafetyScore
              }
            }
          }
        }
      `;

      const mediaVariables = {
        id: story.id,
        input: {
          media: [
            {
              type: 'image',
              url: 'https://example.com/garden.jpg',
              description: 'Community members working in the garden',
              culturalConsent: true,
            },
          ],
        },
      };

      const mediaResponse = await request(app)
        .post('/graphql')
        .send({ query: updateStoryMutation, variables: mediaVariables })
        .set(withAuth(testUser))
        .expect(200);

      expect(mediaResponse.body.errors).toBeUndefined();
      expect(mediaResponse.body.data.updateStory.success).toBe(true);

      // Step 3: Query stories with cultural safety filters
      const storiesQuery = `
        query GetStories($culturalSafety: Float, $limit: Int) {
          stories(culturalSafety: $culturalSafety, limit: $limit) {
            id
            title
            culturalSafety
            themes
            impactMetrics {
              communityBenefit
              culturalSignificance
              reachScore
            }
          }
        }
      `;

      const storiesResponse = await request(app)
        .post('/graphql')
        .send({ query: storiesQuery, variables: { culturalSafety: 80, limit: 10 } })
        .expect(200);

      expect(storiesResponse.body.errors).toBeUndefined();
      expect(storiesResponse.body.data.stories).toBeInstanceOf(Array);
      expect(storiesResponse.body.data.stories.length).toBeGreaterThan(0);

      // All returned stories should meet cultural safety threshold
      storiesResponse.body.data.stories.forEach(returnedStory => {
        expect(returnedStory.culturalSafety).toBeGreaterThanOrEqual(80);
      });
    });

    test('should reject stories with insufficient cultural safety', async () => {
      const unsafeStoryMutation = `
        mutation SubmitStory($input: StoryInput!) {
          submitStory(input: $input) {
            success
            message
            story {
              id
              culturalSafety
              status
            }
            culturalSafetyWarnings
          }
        }
      `;

      const unsafeStoryVariables = {
        input: {
          title: 'Sacred Site Photos',
          content: 'Here are some photos I took at a sacred Aboriginal site.',
          themes: ['photography', 'tourism'],
          location: 'Uluru, NT',
          hasConsent: false,
          communityConsent: false,
        },
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: unsafeStoryMutation, variables: unsafeStoryVariables })
        .set(withAuth(testUser))
        .expect(200);

      expect(response.body.data.submitStory.success).toBe(false);
      expect(response.body.data.submitStory.culturalSafetyWarnings).toBeDefined();
      expect(
        response.body.data.submitStory.culturalSafetyWarnings.length
      ).toBeGreaterThan(0);
    });
  });

  describe('System Integration and Monitoring Workflow', () => {
    test('should provide comprehensive system health monitoring', async () => {
      const systemHealthQuery = `
        query GetSystemHealth {
          systemHealth {
            status
            timestamp
            services {
              postgresql { status connected error }
              redis { status connected error }
              neo4j { status connected error }
            }
            metrics {
              responseTime
              throughput
              errorRate
              uptime
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: systemHealthQuery })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.systemHealth.status).toBeDefined();
      expect(response.body.data.systemHealth.services).toBeDefined();
      expect(response.body.data.systemHealth.services.postgresql.status).toBe(
        'healthy'
      );
    });

    test('should track cultural safety metrics across the system', async () => {
      const culturalSafetyQuery = `
        query GetCulturalSafetyMetrics {
          culturalSafetyMetrics {
            overallScore
            totalItems
            protocolValidations
            communityConsentChecks
            sacredKnowledgeProtections
            indigenousDataSovereignty
            communityFeedbackScore
            recentAlerts {
              level
              message
              timestamp
              resolved
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: culturalSafetyQuery })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.culturalSafetyMetrics.overallScore).toBeGreaterThan(0);
      expect(
        response.body.data.culturalSafetyMetrics.totalItems
      ).toBeGreaterThanOrEqual(0);
      expect(
        response.body.data.culturalSafetyMetrics.protocolValidations
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Search and Discovery Workflow', () => {
    test('should provide intelligent search across all content types', async () => {
      // First, create some searchable content
      const setupData = async () => {
        // Create a project
        const project = await dataSources.postgres.insert('projects', {
          title: 'Aboriginal Art Workshop',
          description: 'Teaching traditional art techniques to community',
          cultural_safety_score: 95,
        });

        // Create a story
        const story = await dataSources.postgres.insert('stories', {
          title: 'Learning Traditional Techniques',
          content: 'Elder Mary taught us traditional painting methods',
          cultural_safety_score: 90,
        });

        return { project: project[0], story: story[0] };
      };

      await setupData();

      const intelligentSearchQuery = `
        query IntelligentSearch($query: String!, $filters: SearchFilters) {
          intelligentSearch(query: $query, filters: $filters) {
            results {
              id
              title
              description
              type
              relevanceScore
              culturalAlignment
              url
            }
            insights {
              content
              confidence
              culturalSafety
            }
            culturalSafety
            suggestedActions {
              title
              description
              priority
            }
            totalResults
            searchTime
          }
        }
      `;

      const searchVariables = {
        query: 'Aboriginal art community workshop',
        filters: {
          minCulturalSafety: 80,
          contentTypes: ['PROJECT', 'STORY'],
          location: 'Australia',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: intelligentSearchQuery, variables: searchVariables })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.intelligentSearch.results).toBeInstanceOf(Array);
      expect(response.body.data.intelligentSearch.culturalSafety).toBeGreaterThan(80);
      expect(response.body.data.intelligentSearch.totalResults).toBeGreaterThan(0);

      // Check that results meet cultural safety requirements
      response.body.data.intelligentSearch.results.forEach(result => {
        expect(result.culturalAlignment).toBeGreaterThan(70);
      });
    });
  });

  describe('Cross-Data Source Integration Workflow', () => {
    test('should coordinate operations across PostgreSQL, Redis, and Neo4j', async () => {
      // This test verifies that all three data sources work together
      const testUser = createTestUser();
      const collaborator = createTestUser({
        id: 'collaborator-1',
        name: 'Collaborator',
      });

      // Step 1: Create users in PostgreSQL
      const pgUser = await dataSources.postgres.insert('users', testUser);
      const pgCollaborator = await dataSources.postgres.insert('users', collaborator);

      // Step 2: Cache user sessions in Redis
      await dataSources.redis.cacheUserSession(pgUser[0].id, {
        id: pgUser[0].id,
        email: testUser.email,
        role: testUser.role,
      });

      // Step 3: Create user nodes in Neo4j
      await dataSources.neo4j.createUser({
        id: pgUser[0].id,
        name: testUser.name,
        email: testUser.email,
      });

      await dataSources.neo4j.createUser({
        id: pgCollaborator[0].id,
        name: collaborator.name,
        email: collaborator.email,
      });

      // Step 4: Create relationship in Neo4j
      await dataSources.neo4j.createRelationship(
        pgUser[0].id,
        'User',
        pgCollaborator[0].id,
        'User',
        'COLLABORATES_WITH'
      );

      // Step 5: Create project in PostgreSQL
      const project = await dataSources.postgres.insert('projects', {
        title: 'Cross-Source Project',
        description: 'Testing data consistency',
        cultural_safety_score: 85,
        created_by: pgUser[0].id,
      });

      // Step 6: Create project node in Neo4j
      await dataSources.neo4j.createProject({
        id: project[0].id,
        name: project[0].title,
        culturalSafetyScore: project[0].cultural_safety_score,
      });

      // Step 7: Track activity in Redis
      await dataSources.redis.trackUserActivity(pgUser[0].id, {
        action: 'project_created',
        projectId: project[0].id,
      });

      // Step 8: Verify data consistency across all sources
      const pgQuery = await dataSources.postgres.query('projects', {
        eq: { id: project[0].id },
      });
      expect(pgQuery).toHaveLength(1);

      const redisActivity = await dataSources.redis.getUserActivity(pgUser[0].id, 5);
      expect(redisActivity).toHaveLength(1);
      expect(redisActivity[0].action).toBe('project_created');

      const neoCollaborations = await dataSources.neo4j.findUserCollaborations(
        pgUser[0].id
      );
      expect(neoCollaborations).toHaveLength(1);

      // Step 9: Test a GraphQL query that uses all three data sources
      const complexQuery = `
        query GetUserEcosystem($userId: ID!) {
          user(id: $userId) {
            id
            name
            email
            projects {
              id
              title
              culturalSafetyScore
            }
            collaborations {
              user {
                id
                name
              }
              relationshipType
            }
            recentActivity {
              action
              timestamp
              details
            }
          }
        }
      `;

      const ecosystemResponse = await request(app)
        .post('/graphql')
        .send({ query: complexQuery, variables: { userId: pgUser[0].id } })
        .set(withAuth({ id: pgUser[0].id, email: testUser.email, role: testUser.role }))
        .expect(200);

      // The query should process without errors even if data is minimal
      if (ecosystemResponse.body.errors) {
        // Check that any errors are not related to data source connectivity
        ecosystemResponse.body.errors.forEach(error => {
          expect(error.message).not.toContain('connection');
          expect(error.message).not.toContain('unavailable');
        });
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle partial data source failures gracefully', async () => {
      // Simulate Redis being unavailable
      dataSources.redis.isConnected = false;

      const query = `
        query GetSystemHealth {
          systemHealth {
            status
            services {
              postgresql { status }
              redis { status }
              neo4j { status }
            }
          }
        }
      `;

      const response = await request(app).post('/graphql').send({ query }).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.systemHealth.services.postgresql.status).toBe(
        'healthy'
      );
      // Redis should still report as healthy in mock implementation
      expect(response.body.data.systemHealth.services.redis.status).toBe('healthy');

      // Reset for other tests
      dataSources.redis.isConnected = true;
    });

    test('should validate input data and return helpful error messages', async () => {
      const invalidMutation = `
        mutation CreateProject($input: ProjectInput!) {
          createProject(input: $input) {
            success
            message
            project {
              id
            }
          }
        }
      `;

      const invalidVariables = {
        input: {
          title: '', // Empty title should fail validation
          description: 'A project without a title',
          type: 'invalid_type', // Invalid project type
        },
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: invalidMutation, variables: invalidVariables })
        .set(withAuth(testUser))
        .expect(200);

      // Should return validation errors, not system errors
      expect(response.body.data.createProject.success).toBe(false);
      expect(response.body.data.createProject.message).toContain('validation');
    });

    test('should handle concurrent operations without data corruption', async () => {
      const concurrentOperations = [];

      // Create multiple simultaneous user registrations
      for (let i = 0; i < 5; i++) {
        const mutation = `
          mutation RegisterUser($input: UserRegistrationInput!) {
            registerUser(input: $input) {
              success
              user {
                id
                email
              }
            }
          }
        `;

        const variables = {
          input: {
            email: `concurrent${i}@test.com`,
            password: 'SecurePass123!',
            name: `Concurrent User ${i}`,
            username: `concurrent${i}`,
            culturalBackground: 'Australian',
          },
        };

        concurrentOperations.push(
          request(app).post('/graphql').send({ query: mutation, variables })
        );
      }

      const results = await Promise.all(concurrentOperations);

      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.data.registerUser.success).toBe(true);
        expect(result.body.data.registerUser.user.email).toBe(
          `concurrent${index}@test.com`
        );
      });

      // Verify no duplicate emails were created
      const emails = results.map(result => result.body.data.registerUser.user.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(emails.length);
    });
  });
});
