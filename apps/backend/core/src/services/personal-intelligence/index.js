/**
 * Personal Intelligence Services
 *
 * Core intelligence services migrated from act-personal-ai.
 * These provide unified AI-powered insights for personal productivity.
 *
 * Services:
 * - modeDetector: Determines optimal work mode (DEEP_WORK, CONNECT, ADMIN, CREATE, PLAN, REST)
 * - workRecommender: Recommends work priorities based on mode, calendar, and patterns
 * - orchestrator: Unified "brain" that coordinates all services for insights
 * - ActionableBrief: Generates specific action items with direct links
 *
 * Usage:
 *   const { orchestrator, modeDetector, workRecommender, ActionableBrief } = require('./services/personal-intelligence');
 *
 *   // Get unified insights
 *   const insights = await orchestrator.getInsights({ focus: 'morning-brief' });
 *
 *   // Detect current mode
 *   const mode = await modeDetector.detectMode();
 *
 *   // Get work recommendations
 *   const recs = await workRecommender.getRecommendations();
 *
 *   // Generate actionable brief
 *   const brief = new ActionableBrief();
 *   await brief.generateActions();
 *   const json = brief.toJSON();
 */

// Bridge CommonJS modules to ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Database helper
const { db } = require('./db.cjs');

// Mode detection service
const { modeDetector, ModeDetector, MODES } = require('./modeDetector.cjs');

// Work recommendation service
const {
  workRecommender,
  WorkRecommenderService,
  DEFAULT_DAY_PATTERNS,
  DEFAULT_HOUR_PATTERNS,
} = require('./workRecommender.cjs');

// Orchestrator service (unified brain)
const { orchestrator, OrchestratorService } = require('./orchestrator.cjs');

// Actionable brief generator
const { ActionableBrief } = require('./actionableBrief.cjs');

// ES module exports
export {
  // Database helper
  db,

  // Mode detection
  modeDetector,
  ModeDetector,
  MODES,

  // Work recommendations
  workRecommender,
  WorkRecommenderService,
  DEFAULT_DAY_PATTERNS,
  DEFAULT_HOUR_PATTERNS,

  // Orchestrator
  orchestrator,
  OrchestratorService,

  // Actionable brief
  ActionableBrief,
};
