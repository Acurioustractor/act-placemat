/**
 * Story Resolvers
 * GraphQL resolvers for story management with cultural safety
 */

import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

export const storyResolvers = {
  Query: {
    stories: async (parent, { culturalSafety = 80, limit = 20 }, context) => {
      try {
        const stories = await context.dataSources.supabase.query('stories', {
          gte: { cultural_safety_score: culturalSafety },
          limit,
          select: `id, title, content_preview, cultural_safety_score, created_at, author_id`,
        });
        return stories || [];
      } catch (error) {
        throw new Error('Failed to fetch stories');
      }
    },
  },
  Mutation: {
    createStory: async (parent, { input }, context) => {
      if (!context.isAuthenticated) throw new Error('Authentication required');
      return { success: true, story: null, message: 'Story creation placeholder' };
    },
  },
  Subscription: {
    storyUpdated: { subscribe: () => pubsub.asyncIterator(['STORY_UPDATED']) },
  },
  Story: {},
};
