/**
 * GraphQL Schema Index - Modular Schema Composition
 * Combines all entity schemas into a unified GraphQL schema
 */

import userSchema from './user.js';
import projectSchema from './project.js';
import storySchema from './story.js';
import eventSchema from './event.js';
import financeSchema from './finance.js';
import organizationSchema from './organization.js';
import opportunitySchema from './opportunity.js';
import analyticsSchema from './analytics.js';
import systemSchema from './system.js';

// Common scalars and base types
import { gql } from 'graphql-tag';

export const baseTypeDefs = gql`
  scalar DateTime
  scalar JSON

  # Base query and mutation types that will be extended by each schema
  type Query
  type Mutation
  type Subscription
`;

// Combine all schemas
export const typeDefs = [
  baseTypeDefs,
  userSchema,
  projectSchema,
  storySchema,
  eventSchema,
  financeSchema,
  organizationSchema,
  opportunitySchema,
  analyticsSchema,
  systemSchema,
];

export default typeDefs;
