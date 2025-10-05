/**
 * System Resolvers
 * GraphQL resolvers for system administration and monitoring
 */

import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const systemResolvers = {
  Query: {
    // System health check
    systemHealth: async (parent, args, context) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date(),
          services: {},
          performance: {},
        };

        // Check PostgreSQL health
        if (context.dataSources.supabase) {
          try {
            await context.dataSources.supabase.query('users', {
              select: 'id',
              limit: 1,
            });
            health.services.postgresql = { status: 'healthy', connected: true };
          } catch (error) {
            health.services.postgresql = {
              status: 'unhealthy',
              connected: false,
              error: error.message,
            };
            health.status = 'degraded';
          }
        } else {
          health.services.postgresql = { status: 'not_configured', connected: false };
        }

        // Check Redis health
        if (context.dataSources.redis) {
          try {
            const redisHealth = await context.dataSources.redis.healthCheck();
            health.services.redis = redisHealth;
            if (redisHealth.status !== 'healthy') {
              health.status = 'degraded';
            }
          } catch (error) {
            health.services.redis = {
              status: 'unhealthy',
              connected: false,
              error: error.message,
            };
            health.status = 'degraded';
          }
        } else {
          health.services.redis = { status: 'not_configured', connected: false };
        }

        // Check Neo4j health
        if (context.dataSources.neo4j) {
          try {
            const neo4jHealth = await context.dataSources.neo4j.healthCheck();
            health.services.neo4j = neo4jHealth;
            if (neo4jHealth.status !== 'healthy') {
              health.status = 'degraded';
            }
          } catch (error) {
            health.services.neo4j = {
              status: 'unhealthy',
              connected: false,
              error: error.message,
            };
            health.status = 'degraded';
          }
        } else {
          health.services.neo4j = { status: 'not_configured', connected: false };
        }

        // Calculate performance metrics
        const endTime = Date.now();
        const startTime = context.requestStartTime;
        health.performance.responseTime = endTime - startTime;

        // Memory usage
        const memUsage = process.memoryUsage();
        health.performance.memory = {
          used: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
          external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
        };

        // CPU usage (basic approximation)
        health.performance.uptime = process.uptime();

        return health;
      } catch (error) {
        console.error('System health check error:', error);
        return {
          status: 'unhealthy',
          timestamp: new Date(),
          error: error.message,
          services: {},
          performance: {},
        };
      }
    },

    // Database statistics
    databaseStats: async (parent, args, context) => {
      if (!context.user || context.user.role !== 'system_admin') {
        throw new Error('Administrative access required');
      }

      try {
        const stats = {
          postgresql: null,
          redis: null,
          neo4j: null,
        };

        // PostgreSQL stats
        if (context.dataSources.supabase) {
          try {
            const [users, projects, stories, events] = await Promise.all([
              context.dataSources.supabase.query('users', { select: 'COUNT(*)' }),
              context.dataSources.supabase.query('projects', { select: 'COUNT(*)' }),
              context.dataSources.supabase.query('stories', { select: 'COUNT(*)' }),
              context.dataSources.supabase.query('events', { select: 'COUNT(*)' }),
            ]);

            stats.postgresql = {
              tables: {
                users: users?.[0]?.count || 0,
                projects: projects?.[0]?.count || 0,
                stories: stories?.[0]?.count || 0,
                events: events?.[0]?.count || 0,
              },
              status: 'connected',
            };
          } catch (error) {
            stats.postgresql = { status: 'error', error: error.message };
          }
        }

        // Redis stats
        if (context.dataSources.redis) {
          try {
            const redis = context.dataSources.redis.getClient();
            const info = await redis.info('memory');
            const keyspace = await redis.info('keyspace');

            stats.redis = {
              memory: info,
              keyspace: keyspace,
              status: 'connected',
            };
          } catch (error) {
            stats.redis = { status: 'error', error: error.message };
          }
        }

        // Neo4j stats
        if (context.dataSources.neo4j) {
          try {
            const nodeCount = await context.dataSources.neo4j.runQuery(
              'MATCH (n) RETURN count(n) as nodeCount'
            );
            const relCount = await context.dataSources.neo4j.runQuery(
              'MATCH ()-[r]->() RETURN count(r) as relCount'
            );

            stats.neo4j = {
              nodes: nodeCount[0]?.nodeCount?.toNumber() || 0,
              relationships: relCount[0]?.relCount?.toNumber() || 0,
              status: 'connected',
            };
          } catch (error) {
            stats.neo4j = { status: 'error', error: error.message };
          }
        }

        return stats;
      } catch (error) {
        console.error('Database stats error:', error);
        throw new Error('Failed to fetch database statistics');
      }
    },

    // System configuration
    systemConfig: async (parent, args, context) => {
      if (!context.user || context.user.role !== 'system_admin') {
        throw new Error('Administrative access required');
      }

      return {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        features: {
          postgresql: !!process.env.SUPABASE_URL,
          redis: !!process.env.REDIS_URL,
          neo4j: !!(process.env.NEO4J_URI && process.env.NEO4J_USER),
          fileUpload: true,
          subscriptions: true,
          culturalSafety: true,
        },
        limits: {
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
          maxQueryDepth: parseInt(process.env.MAX_QUERY_DEPTH) || 15,
          maxQueryComplexity: parseInt(process.env.MAX_QUERY_COMPLEXITY) || 1000,
        },
      };
    },

    // Cultural safety metrics
    culturalSafetyMetrics: async (parent, args, context) => {
      try {
        const metrics = {
          overallScore: 0,
          totalItems: 0,
          protocolValidations: 0,
          communityConsentChecks: 0,
          sacredKnowledgeProtections: 0,
          indigenousDataSovereignty: 0,
          communityFeedbackScore: 0,
        };

        if (context.dataSources.supabase) {
          // Get cultural safety scores from various entities
          const [stories, projects, events] = await Promise.all([
            context.dataSources.supabase.query('stories', {
              select: 'cultural_safety_score',
            }),
            context.dataSources.supabase.query('projects', {
              select: 'cultural_safety_score',
            }),
            context.dataSources.supabase.query('events', {
              select: 'cultural_safety_score',
            }),
          ]);

          const allScores = [
            ...(stories?.map(s => s.cultural_safety_score) || []),
            ...(projects?.map(p => p.cultural_safety_score) || []),
            ...(events?.map(e => e.cultural_safety_score) || []),
          ].filter(score => score !== null && score !== undefined);

          if (allScores.length > 0) {
            metrics.overallScore =
              allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
            metrics.totalItems = allScores.length;
          }

          // Count protocol validations (items with high cultural safety scores)
          metrics.protocolValidations = allScores.filter(score => score >= 90).length;

          // Placeholder metrics for community features
          metrics.communityConsentChecks = Math.round(metrics.totalItems * 0.85);
          metrics.sacredKnowledgeProtections = Math.round(metrics.totalItems * 0.92);
          metrics.indigenousDataSovereignty = Math.round(metrics.totalItems * 0.88);
          metrics.communityFeedbackScore = 87.5;
        }

        return metrics;
      } catch (error) {
        console.error('Cultural safety metrics error:', error);
        throw new Error('Failed to fetch cultural safety metrics');
      }
    },

    // Cache statistics from Redis
    cacheStats: async (parent, args, context) => {
      if (!context.dataSources.redis) {
        return null;
      }

      try {
        const redis = context.dataSources.redis.getClient();

        // Get Redis info
        const [memoryInfo, statsInfo, keyspaceInfo] = await Promise.all([
          redis.info('memory'),
          redis.info('stats'),
          redis.info('keyspace'),
        ]);

        // Parse Redis info strings
        const parseInfo = infoString => {
          const info = {};
          infoString.split('\r\n').forEach(line => {
            if (line.includes(':')) {
              const [key, value] = line.split(':');
              info[key] = isNaN(value) ? value : Number(value);
            }
          });
          return info;
        };

        const memory = parseInfo(memoryInfo);
        const stats = parseInfo(statsInfo);
        const keyspace = parseInfo(keyspaceInfo);

        return {
          memory: {
            used: memory.used_memory,
            peak: memory.used_memory_peak,
            rss: memory.used_memory_rss,
          },
          operations: {
            totalCommands: stats.total_commands_processed,
            totalConnections: stats.total_connections_received,
            rejectedConnections: stats.rejected_connections,
          },
          keyspace: keyspace,
          hitRate:
            stats.keyspace_hits / (stats.keyspace_hits + stats.keyspace_misses) || 0,
        };
      } catch (error) {
        console.error('Cache stats error:', error);
        return null;
      }
    },
  },

  Mutation: {
    // Clear cache
    clearCache: async (parent, { pattern = '*' }, context) => {
      if (!context.user || context.user.role !== 'system_admin') {
        throw new Error('Administrative access required');
      }

      if (!context.dataSources.redis) {
        throw new Error('Cache not available');
      }

      try {
        const clearedCount = await context.dataSources.redis.flushCache(pattern);

        // Publish cache cleared event
        pubsub.publish('CACHE_CLEARED', {
          cacheCleared: {
            pattern,
            clearedCount,
            timestamp: new Date(),
            clearedBy: context.user.id,
          },
        });

        return {
          success: true,
          message: `Cleared ${clearedCount} cache entries`,
          clearedCount,
        };
      } catch (error) {
        console.error('Cache clear error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // System maintenance mode
    setMaintenanceMode: async (parent, { enabled, message }, context) => {
      if (!context.user || context.user.role !== 'system_admin') {
        throw new Error('Administrative access required');
      }

      try {
        // Store maintenance mode in Redis
        if (context.dataSources.redis) {
          if (enabled) {
            await context.dataSources.redis.set('system:maintenance', {
              enabled: true,
              message: message || 'System maintenance in progress',
              enabledBy: context.user.id,
              enabledAt: new Date().toISOString(),
            });
          } else {
            await context.dataSources.redis.del('system:maintenance');
          }
        }

        // Publish maintenance mode change
        pubsub.publish('MAINTENANCE_MODE_CHANGED', {
          maintenanceModeChanged: {
            enabled,
            message,
            changedBy: context.user.id,
            timestamp: new Date(),
          },
        });

        return {
          success: true,
          message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
        };
      } catch (error) {
        console.error('Maintenance mode error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  Subscription: {
    // System health updates
    systemHealthUpdated: {
      subscribe: () => pubsub.asyncIterator(['SYSTEM_HEALTH_UPDATED']),
    },

    // Cache events
    cacheCleared: {
      subscribe: (parent, args, context) => {
        if (!context.user || context.user.role !== 'system_admin') {
          throw new Error('Administrative access required');
        }
        return pubsub.asyncIterator(['CACHE_CLEARED']);
      },
    },

    // Maintenance mode changes
    maintenanceModeChanged: {
      subscribe: () => pubsub.asyncIterator(['MAINTENANCE_MODE_CHANGED']),
    },
  },
};
