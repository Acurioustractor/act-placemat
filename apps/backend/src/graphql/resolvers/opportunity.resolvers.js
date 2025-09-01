import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

export const opportunityResolvers = {
  Query: {
    opportunities: async () => [],
    searchOpportunities: async () => ({ results: [], totalCount: 0 }),
  },
  Mutation: {
    createOpportunity: async () => ({ success: true, opportunity: null }),
  },
  Subscription: {
    opportunityCreated: {
      subscribe: () => pubsub.asyncIterator(['OPPORTUNITY_CREATED']),
    },
  },
  Opportunity: {},
};
