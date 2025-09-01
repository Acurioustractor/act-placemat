/**
 * ACT Placemat Data Services
 * Mobile-optimized cross-platform data integration for Australian communities
 */

// Export types
export * from './types';

// Export core classes
export { BaseConnector } from './core/BaseConnector';

// Export connectors
export { SupabaseConnector } from './connectors/SupabaseConnector';
export { NotionConnector } from './connectors/NotionConnector';

// Export utility functions
export {
  createDataManager,
  type DataManagerConfig,
  type DataManager
} from './utils/DataManager';

export {
  createSyncManager,
  type SyncManagerConfig,
  type SyncManager
} from './utils/SyncManager';

export {
  validateAustralianCompliance,
  type ComplianceValidation,
  generateComplianceReport
} from './utils/ComplianceValidator';

// Export constants
export const DATA_SERVICES_VERSION = '1.0.0';
export const SUPPORTED_PLATFORMS = ['ios', 'android', 'web'] as const;
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_SYNC_INTERVAL = 30 * 1000; // 30 seconds
export const AUSTRALIAN_DATA_RESIDENCY = 'australia' as const;