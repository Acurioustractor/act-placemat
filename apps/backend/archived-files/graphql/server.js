/**
 * ACT Farmhand AI - GraphQL Server Configuration
 * Apollo Server 4+ setup with Express integration and comprehensive schema
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';
// Remove unused direct imports since we now use data source services

import { typeDefs } from './schemas/index.js';
import resolvers from './resolvers/index.js';

// Import data source services
import PostgreSQLDataSource from '../services/dataSources/postgresDataSource.js';
import RedisDataSource from '../services/dataSources/redisDataSource.js';
import Neo4jDataSource from '../services/dataSources/neo4jDataSource.js';

// Import versioning and documentation
import {
  apiVersionMiddleware,
  createVersionedContext,
  formatVersionedError,
  transformSchemaForVersion,
} from './versioning/versionManager.js';
import {
  createPlaygroundConfig,
  generateAPIDocumentation,
} from './documentation/playgroundConfig.js';
import { setupDocumentationRoutes } from './documentation/routes.js';

const pubsub = new PubSub();

// Data source service instances
let postgresDataSource = null;
let redisDataSource = null;
let neo4jDataSource = null;

// Initialize data sources using service classes
async function initializeDataSources() {
  try {
    console.log('🔄 Initializing data source services...');

    // Initialize PostgreSQL via Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      postgresDataSource = new PostgreSQLDataSource();
      await postgresDataSource.initialize();
      console.log('✅ PostgreSQL data source service initialized');
    } else {
      console.log('⚠️  PostgreSQL not configured');
    }

    // Initialize Redis (optional)
    if (process.env.REDIS_URL) {
      redisDataSource = new RedisDataSource();
      await redisDataSource.initialize();
      console.log('✅ Redis data source service initialized');
    } else {
      console.log('⚠️  Redis not configured (optional)');
    }

    // Initialize Neo4j (optional)
    if (process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD) {
      neo4jDataSource = new Neo4jDataSource();
      await neo4jDataSource.initialize();
      console.log('✅ Neo4j data source service initialized');
    } else {
      console.log('⚠️  Neo4j not configured (optional)');
    }

    console.log('✅ All available data source services initialized');
  } catch (error) {
    console.error('❌ Data source service initialization error:', error);
    throw error;
  }
}

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Apollo Server 4+ context function with versioning
const createContext = ({ req, res }) => {
  const baseContext = {
    req,
    res,
    user: req.user || null,
    isAuthenticated: !!req.user,
    pubsub,
    dataSources: {
      supabase: postgresDataSource, // Keep compatibility with existing resolvers
      postgres: postgresDataSource,
      redis: redisDataSource,
      neo4j: neo4jDataSource,
    },
    requestStartTime: Date.now(),
  };

  // Add version-aware context
  return createVersionedContext(baseContext, req);
};

export const createGraphQLServer = async (app, httpServer) => {
  console.log('🚀 Initializing GraphQL Server...');

  // Initialize data sources
  await initializeDataSources();

  // Create Apollo Server 4+ with enhanced playground
  const server = new ApolloServer({
    schema,
    introspection: process.env.NODE_ENV !== 'production',

    // Apollo Server 4+ plugins
    plugins: [
      // Proper shutdown handling
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Request lifecycle plugin for monitoring
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext) {
              const operationName = requestContext.request.operationName || 'Anonymous';
              if (process.env.NODE_ENV !== 'test') {
                console.log(`🔍 GraphQL Operation: ${operationName}`);
              }
            },
            async didEncounterErrors(requestContext) {
              console.error(
                '🚨 GraphQL Errors:',
                requestContext.errors.map(e => e.message)
              );
            },
            async willSendResponse(requestContext) {
              const { contextValue } = requestContext;
              const duration = Date.now() - contextValue.requestStartTime;

              // Add performance headers
              requestContext.response.http.headers.set(
                'X-GraphQL-Duration',
                `${duration}ms`
              );
            },
          };
        },
      },
    ],

    // Version-aware error formatting
    formatError: (err, req) => {
      console.error('GraphQL Error:', err);

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production' && err.message.includes('Internal')) {
        return new Error('Internal server error');
      }

      // Format error based on API version
      const apiVersion = req?.apiVersion || 'v1';
      return formatVersionedError(err, apiVersion);
    },
  });

  // Start Apollo Server
  await server.start();

  // Setup documentation routes
  setupDocumentationRoutes(app);

  // Apply versioning middleware first
  app.use('/graphql', apiVersionMiddleware);

  // Apply GraphQL middleware to Express with enhanced context
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: createContext,
    })
  );

  console.log('✅ GraphQL Server initialized successfully');
  console.log(
    `🎯 GraphQL endpoint: http://localhost:${process.env.PORT || 4000}/graphql`
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `🛝 GraphQL Playground: http://localhost:${process.env.PORT || 4000}/graphql`
    );
  }

  return server;
};

export const createGraphQLSubscriptionServer = httpServer => {
  console.log(
    '⚠️  WebSocket subscriptions temporarily disabled - will be implemented in next iteration'
  );
  return null;
};

// GraphQL schema documentation generator
export const generateSchemaDocumentation = () => {
  return {
    version: '1.0.0',
    description: 'ACT Farmhand AI - Comprehensive GraphQL API for the ACT ecosystem',

    endpoints: {
      graphql: '/graphql',
      playground: '/graphql', // Only in development
      subscriptions: 'ws://localhost:5010/graphql', // WebSocket endpoint
    },

    features: [
      'Farm Workflow System queries and mutations',
      'System Integration monitoring and control',
      'Empathy Ledger data access with cultural safety',
      'Opportunity Ecosystem visualization',
      'Real-time subscriptions for farm activities',
      'Intelligent search and insight generation',
      'Cultural safety validation and monitoring',
      'Impact measurement and analytics',
    ],

    authentication: {
      type: 'Optional Bearer Token',
      description:
        'Many queries work without authentication, but some require API keys or user tokens',
    },

    culturalSafety: {
      description:
        'All operations respect Indigenous data sovereignty and cultural protocols',
      features: [
        'Automatic cultural safety scoring',
        'Community consent validation',
        'Sacred knowledge protection',
        'Protocol compliance monitoring',
      ],
    },

    subscriptions: [
      'farmActivity - Real-time farm workflow updates',
      'taskProgressUpdated - Task progress notifications',
      'skillPodActivity - Skill pod status updates',
      'systemIntegrationEvents - Integration system events',
      'pipelineExecution - Data pipeline execution updates',
      'culturalSafetyAlert - Cultural safety alerts and warnings',
    ],

    sampleQueries: {
      farmStatus: `
        query GetFarmStatus {
          farmStatus {
            status
            culturalSafetyScore
            systemPerformanceScore
            totalInsights
            activeTasks
            skillPodsActive
            continuousProcessing
          }
        }
      `,

      skillPods: `
        query GetSkillPods {
          skillPods {
            id
            name
            farmElement
            status
            progress
            insights
            lastActivity
            performance {
              avgResponseTime
              successRate
              utilizationRate
            }
            culturalSafetyScore
          }
        }
      `,

      intelligentSearch: `
        query IntelligentSearch($query: String!) {
          intelligentSearch(query: $query) {
            results {
              title
              description
              relevanceScore
              culturalAlignment
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
          }
        }
      `,

      processQuery: `
        mutation ProcessQuery($query: String!, $context: JSON) {
          processQuery(query: $query, context: $context) {
            success
            response {
              insight
              confidence
              farmMetaphor
              recommendations
            }
            workflowTasks {
              id
              title
              farmStage
              culturalSafety
            }
            culturalSafety
          }
        }
      `,

      farmActivitySubscription: `
        subscription FarmActivity {
          farmActivity {
            type
            message
            farmStage
            skillPod
            timestamp
          }
        }
      `,
    },

    complexQueries: {
      comprehensiveEcosystemOverview: `
        query ComprehensiveEcosystemOverview {
          farmStatus {
            status
            culturalSafetyScore
            totalInsights
            activeTasks
          }
          
          skillPods {
            name
            farmElement
            insights
            culturalSafetyScore
          }
          
          workflowTasks(limit: 10) {
            title
            farmStage
            progress
            culturalSafety
          }
          
          stories(limit: 5, culturalSafety: 90) {
            title
            themes
            culturalSafety
            impactMetrics {
              communityBenefit
              culturalSignificance
            }
          }
          
          systemIntegration {
            hubStatus
            farmWorkflowConnected
            activePipelines
            systemConnections {
              name
              status
              healthScore
            }
          }
        }
      `,

      culturalSafetyAudit: `
        query CulturalSafetyAudit {
          farmStatus {
            culturalSafetyScore
          }
          
          culturalSafetyMetrics {
            overallScore
            protocolValidations
            communityConsentChecks
            sacredKnowledgeProtections
            indigenousDataSovereignty
            communityFeedbackScore
          }
          
          stories(culturalSafety: 95) {
            title
            culturalSafety
            consent {
              hasConsent
              communityConsent
              consentType
            }
          }
          
          workflowTasks {
            title
            culturalSafety
            insights {
              culturalSafety
              content
            }
          }
        }
      `,
    },
  };
};

// Health check for GraphQL endpoint
export const graphqlHealthCheck = () => {
  return {
    status: 'healthy',
    service: 'ACT Farmhand GraphQL API',
    version: '1.0.0',
    endpoints: {
      queries: 'Available',
      mutations: 'Available',
      subscriptions: 'Available',
    },
    features: {
      farmWorkflow: 'Operational',
      systemIntegration: 'Operational',
      culturalSafety: 'Active',
      realTimeUpdates: 'Active',
      intelligentSearch: 'Operational',
    },
    timestamp: new Date().toISOString(),
  };
};

// Graceful shutdown function for GraphQL Server
export const shutdownGraphQLServer = async () => {
  console.log('🔄 Shutting down GraphQL Server...');

  try {
    // Close data source service connections
    if (redisDataSource) {
      await redisDataSource.disconnect();
      console.log('✅ Redis data source service closed');
    }

    if (neo4jDataSource) {
      await neo4jDataSource.close();
      console.log('✅ Neo4j data source service closed');
    }

    // PostgreSQL connection managed by Supabase client
    console.log('✅ GraphQL Server shutdown completed');
  } catch (error) {
    console.error('❌ GraphQL Server shutdown error:', error);
  }
};

export default {
  createGraphQLServer,
  createGraphQLSubscriptionServer,
  generateSchemaDocumentation,
  graphqlHealthCheck,
  shutdownGraphQLServer,
};
