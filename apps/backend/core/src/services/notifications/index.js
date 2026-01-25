/**
 * Notifications Services Module
 *
 * Unified exports for all notification and dashboard services:
 * - WhatsApp Brief: Morning briefs via Twilio WhatsApp
 * - Daily Brief: Cross-system daily digest
 * - Unified Dashboard: Comprehensive data aggregation
 * - GHL Action Sync: Push AI actions to GoHighLevel CRM
 * - Actionable Brief: Generate specific recommendations with links
 */

// Service imports
import whatsappBriefService, { WhatsAppBriefService } from './whatsappBriefService.js';
import dailyBriefService, { DailyBriefService } from './dailyBriefService.js';
import unifiedDashboardService, { UnifiedDashboardService } from './unifiedDashboardService.js';
import ghlActionSyncService, { GhlActionSyncService } from './ghlActionSyncService.js';
import actionableBriefService, { ActionableBriefService } from './actionableBriefService.js';

// Default exports (singleton instances)
export {
  whatsappBriefService,
  dailyBriefService,
  unifiedDashboardService,
  ghlActionSyncService,
  actionableBriefService
};

// Class exports (for custom instantiation)
export {
  WhatsAppBriefService,
  DailyBriefService,
  UnifiedDashboardService,
  GhlActionSyncService,
  ActionableBriefService
};

// Default export with all services
export default {
  whatsapp: whatsappBriefService,
  daily: dailyBriefService,
  dashboard: unifiedDashboardService,
  ghlSync: ghlActionSyncService,
  actionable: actionableBriefService
};
