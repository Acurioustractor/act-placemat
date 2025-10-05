/**
 * Project Resolvers
 * GraphQL resolvers for project management with data source integration
 */

import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const projectResolvers = {
  Query: {
    // Get all projects with cultural safety filtering
    projects: async (
      parent,
      { culturalSafety = 80, limit = 20, offset = 0 },
      context
    ) => {
      try {
        const projects = await context.dataSources.supabase.query('projects', {
          gte: { cultural_safety_score: culturalSafety },
          orderBy: { column: 'created_at', ascending: false },
          range: { from: offset, to: offset + limit - 1 },
          select: `
            id, title, description, status, type, location,
            cultural_safety_score, impact_metrics, budget_allocated,
            created_at, updated_at, created_by
          `,
        });
        return projects || [];
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw new Error('Failed to fetch projects');
      }
    },

    // Get project by ID
    project: async (parent, { id }, context) => {
      try {
        const project = await context.dataSources.supabase.query('projects', {
          eq: { id },
          select: `
            id, title, description, status, type, location,
            cultural_safety_score, impact_metrics, budget_allocated,
            created_at, updated_at, created_by
          `,
        });
        return project?.[0] || null;
      } catch (error) {
        console.error('Error fetching project:', error);
        throw new Error('Failed to fetch project');
      }
    },
  },

  Mutation: {
    // Create new project
    createProject: async (parent, { input }, context) => {
      if (!context.isAuthenticated) {
        throw new Error('Authentication required');
      }

      try {
        const project = await context.dataSources.supabase.insert(
          'projects',
          {
            ...input,
            created_by: context.user.id,
            cultural_safety_score: 85, // Default score
            status: 'planning',
          },
          { returning: '*' }
        );

        // Create project node in Neo4j
        if (context.dataSources.neo4j && project?.[0]) {
          await context.dataSources.neo4j.createProject({
            id: project[0].id,
            name: project[0].title,
            description: project[0].description,
            status: project[0].status,
            culturalSafetyScore: project[0].cultural_safety_score,
            budget: project[0].budget_allocated,
          });
        }

        return {
          success: true,
          project: project?.[0],
          message: 'Project created successfully',
        };
      } catch (error) {
        console.error('Project creation error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  Subscription: {
    projectUpdated: {
      subscribe: () => pubsub.asyncIterator(['PROJECT_UPDATED']),
    },
  },

  // Type resolvers
  Project: {
    // Resolve project creator
    createdBy: async (parent, args, context) => {
      if (!parent.created_by) return null;

      try {
        const user = await context.dataSources.supabase.query('users', {
          eq: { id: parent.created_by },
          select: 'id, name, username, role',
        });
        return user?.[0] || null;
      } catch (error) {
        console.error('Error fetching project creator:', error);
        return null;
      }
    },
  },
};
