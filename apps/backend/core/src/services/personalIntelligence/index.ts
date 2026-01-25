/**
 * Personal Intelligence Services
 *
 * Unified entry point for all personal AI intelligence services.
 * These services coordinate mode detection, work recommendations,
 * relationship intelligence, and actionable insights.
 *
 * Migrated from: act-personal-ai/services/
 *
 * @example
 * ```typescript
 * import {
 *   orchestrator,
 *   modeDetector,
 *   workRecommender,
 *   createActionableBrief
 * } from './services/personalIntelligence';
 *
 * // Get unified insights
 * const insights = await orchestrator.getInsights({ focus: 'morning-brief' });
 *
 * // Detect current work mode
 * const mode = await modeDetector.detectMode();
 *
 * // Get work recommendations
 * const recs = await workRecommender.getRecommendations();
 *
 * // Generate actionable brief
 * const brief = createActionableBrief();
 * await brief.generateActions();
 * console.log(brief.toJSON());
 * ```
 */

// Export types
export * from './types.js';

// Export database helper
export { db } from './databaseHelper.js';

// Export Mode Detector
export {
  ModeDetectorService,
  modeDetector,
  MODES,
} from './modeDetectorService.js';

// Export Work Recommender
export {
  WorkRecommenderService,
  workRecommender,
  DEFAULT_DAY_PATTERNS,
  DEFAULT_HOUR_PATTERNS,
} from './workRecommenderService.js';

// Export Orchestrator
export {
  OrchestratorService,
  orchestrator,
} from './orchestratorService.js';

// Export Actionable Brief
export {
  ActionableBriefService,
  ActionableBriefOptions,
  createActionableBrief,
} from './actionableBriefService.js';

// Export Threshold Learner
export {
  ThresholdLearnerService,
  thresholdLearner,
  DEFAULT_PRIORS,
} from './thresholdLearnerService.js';

// Export Followup Detector
export {
  FollowupDetectorService,
  followupDetector,
} from './followupDetectorService.js';

// Export Relationship Intelligence
export {
  RelationshipIntelligenceService,
  relationshipIntelligence,
} from './relationshipIntelligenceService.js';

// Export Communication Planner
export {
  CommunicationPlannerService,
  communicationPlanner,
  CHANNELS,
} from './communicationPlannerService.js';

// Export WhatsApp Brief Service
export {
  WhatsAppBriefService,
  whatsAppBrief,
  createWhatsAppBrief,
  WhatsAppBriefConfig,
  WhatsAppSendResult,
  WhatsAppPreviewResult,
} from './whatsappBriefService.js';

// Export Email Digest Service
export {
  EmailDigestService,
  emailDigest,
  createEmailDigest,
  EmailDigestConfig,
  EmailSendResult,
  EmailPreviewResult,
} from './emailDigestService.js';

// Export Dashboard Sync Service
export {
  DashboardSyncService,
  dashboardSync,
  createDashboardSync,
  DashboardSyncConfig,
  DashboardData,
  ViewContent,
  SyncResult,
} from './dashboardSyncService.js';

// Default export of main orchestrator
export { orchestrator as default } from './orchestratorService.js';
