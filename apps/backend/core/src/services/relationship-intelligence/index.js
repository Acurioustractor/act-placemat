/**
 * Relationship Intelligence Services
 *
 * Core intelligence services for relationship management and communication.
 * These provide unified AI-powered insights for contact engagement.
 *
 * Services:
 * - followupDetector: Detects contacts needing follow-up based on decay
 * - entityResolver: Resolves entities across GHL, LinkedIn, Gmail, Notion
 * - thresholdLearner: Learns adaptive thresholds per contact segment
 * - communicationPlanner: Plans outreach and communication timing
 * - projectIntelligence: Manages project-contact relationships
 *
 * Usage:
 *   const {
 *     followupDetector,
 *     entityResolver,
 *     thresholdLearner,
 *     communicationPlanner,
 *     projectIntelligence,
 *   } = require('./services/relationship-intelligence');
 *
 *   // Detect follow-ups
 *   const { followups, stats } = await followupDetector.detectAll();
 *
 *   // Resolve an entity
 *   const { entity, created } = await entityResolver.resolveEntity('email@example.com');
 *
 *   // Get learned threshold
 *   const threshold = await thresholdLearner.getThreshold('stale_days', 'funder');
 *
 *   // Generate communication plan
 *   const plan = await communicationPlanner.generateWeeklyPlan();
 *
 *   // Get project health
 *   const projects = await projectIntelligence.getProjectsWithHealth();
 *
 * Migrated from: act-personal-ai/services/
 */

// Bridge CommonJS modules to ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Database helper
const { db } = require('./db.cjs');

// Follow-up detection service
const {
  followupDetector,
  FollowupDetector,
  PRIORITY_WEIGHTS,
} = require('./followupDetector.cjs');

// Entity resolution service
const {
  entityResolver,
  EntityResolver,
  SOURCE_SYSTEMS,
  nameSimilarity,
  normalizeEmail,
  normalizeName,
} = require('./entityResolver.cjs');

// Threshold learning service
const {
  thresholdLearner,
  ThresholdLearner,
  DEFAULT_PRIORS,
} = require('./thresholdLearner.cjs');

// Communication planning service
const {
  communicationPlanner,
  CommunicationPlanner,
  CHANNELS,
  RELATIONSHIP_HEALTHY,
  RELATIONSHIP_WARNING,
} = require('./communicationPlanner.cjs');

// Project intelligence service
const {
  projectIntelligence,
  ProjectIntelligence,
  STATUS_WEIGHTS,
} = require('./projectIntelligence.cjs');

// ES module exports
export {
  // Database helper
  db,

  // Follow-up detection
  followupDetector,
  FollowupDetector,
  PRIORITY_WEIGHTS,

  // Entity resolution
  entityResolver,
  EntityResolver,
  SOURCE_SYSTEMS,
  nameSimilarity,
  normalizeEmail,
  normalizeName,

  // Threshold learning
  thresholdLearner,
  ThresholdLearner,
  DEFAULT_PRIORS,

  // Communication planning
  communicationPlanner,
  CommunicationPlanner,
  CHANNELS,
  RELATIONSHIP_HEALTHY,
  RELATIONSHIP_WARNING,

  // Project intelligence
  projectIntelligence,
  ProjectIntelligence,
  STATUS_WEIGHTS,
};
