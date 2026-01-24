import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

export const eventResolvers = {
  Query: {
    events: async (parent, args, context) => {
      try {
        const events = await context.dataSources.supabase.query('events', {
          select: '*',
          limit: 20,
        });
        return events || [];
      } catch (error) {
        throw new Error('Failed to fetch events');
      }
    },
  },
  Mutation: {
    createEvent: async () => ({
      success: true,
      event: null,
      message: 'Event creation placeholder',
    }),
  },
  Subscription: {
    eventUpdated: { subscribe: () => pubsub.asyncIterator(['EVENT_UPDATED']) },
  },
  Event: {},
};
