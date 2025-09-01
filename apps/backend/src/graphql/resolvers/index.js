/**
 * GraphQL Resolvers - Index
 * Combines all resolver modules for the ACT ecosystem
 */

import { userResolvers } from './user.resolvers.js';
import { projectResolvers } from './project.resolvers.js';
import { storyResolvers } from './story.resolvers.js';
import { eventResolvers } from './event.resolvers.js';
import { financeResolvers } from './finance.resolvers.js';
import { organizationResolvers } from './organization.resolvers.js';
import { opportunityResolvers } from './opportunity.resolvers.js';
import { analyticsResolvers } from './analytics.resolvers.js';
import { systemResolvers } from './system.resolvers.js';

// Base resolvers for scalar types and shared utilities
const baseResolvers = {
  // Custom scalar resolvers
  Date: {
    serialize: date => date.toISOString(),
    parseValue: value => new Date(value),
    parseLiteral: ast => new Date(ast.value),
  },

  DateTime: {
    serialize: date => date.toISOString(),
    parseValue: value => new Date(value),
    parseLiteral: ast => new Date(ast.value),
  },

  JSON: {
    serialize: value => value,
    parseValue: value => value,
    parseLiteral: ast => JSON.parse(ast.value),
  },

  Upload: {
    // File upload scalar will be handled by GraphQL Upload middleware
  },
};

// Merge all resolvers
const resolvers = {
  ...baseResolvers,
  Query: {
    ...userResolvers.Query,
    ...projectResolvers.Query,
    ...storyResolvers.Query,
    ...eventResolvers.Query,
    ...financeResolvers.Query,
    ...organizationResolvers.Query,
    ...opportunityResolvers.Query,
    ...analyticsResolvers.Query,
    ...systemResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...projectResolvers.Mutation,
    ...storyResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...financeResolvers.Mutation,
    ...organizationResolvers.Mutation,
    ...opportunityResolvers.Mutation,
    ...systemResolvers.Mutation,
  },
  Subscription: {
    ...userResolvers.Subscription,
    ...projectResolvers.Subscription,
    ...storyResolvers.Subscription,
    ...eventResolvers.Subscription,
    ...financeResolvers.Subscription,
    ...organizationResolvers.Subscription,
    ...opportunityResolvers.Subscription,
    ...analyticsResolvers.Subscription,
    ...systemResolvers.Subscription,
  },
  // Type resolvers
  User: userResolvers.User,
  Project: projectResolvers.Project,
  Story: storyResolvers.Story,
  Event: eventResolvers.Event,
  Transaction: financeResolvers.Transaction,
  Organisation: organizationResolvers.Organisation,
  Opportunity: opportunityResolvers.Opportunity,
};

export default resolvers;
