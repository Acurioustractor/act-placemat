import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

export const organizationResolvers = {
  Query: {
    organisations: async (parent, args, context) => {
      try {
        const orgs = await context.dataSources.supabase.query('organisations', {
          select: '*',
          limit: 20,
        });
        return orgs || [];
      } catch (error) {
        return [];
      }
    },
  },
  Mutation: {
    createOrganisation: async () => ({ success: true, organisation: null }),
  },
  Subscription: {
    organisationUpdated: {
      subscribe: () => pubsub.asyncIterator(['ORGANISATION_UPDATED']),
    },
  },
  Organisation: {},
};
