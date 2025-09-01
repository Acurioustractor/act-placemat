import { PubSub } from 'graphql-subscriptions';
const pubsub = new PubSub();

export const financeResolvers = {
  Query: {
    transactions: async () => [],
    financialSummary: async () => ({ totalRevenue: 0, totalExpenses: 0, netIncome: 0 }),
  },
  Mutation: {
    createTransaction: async () => ({ success: true, transaction: null }),
  },
  Subscription: {
    transactionCreated: {
      subscribe: () => pubsub.asyncIterator(['TRANSACTION_CREATED']),
    },
  },
  Transaction: {},
};
