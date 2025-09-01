/**
 * ACT Placemat Data Integration Layer
 * 
 * Provides unified data access for mobile and web applications with:
 * - Australian data compliance
 * - Mobile-optimized performance  
 * - Secure storage and communication
 * - Real-time synchronization
 */

// Re-export from data-services for convenience
export {
  createDataManager,
  type DataManager,
  type DataManagerConfig,
  SupabaseConnector,
  NotionConnector,
  BaseConnector,
  DATA_SERVICES_VERSION,
  SUPPORTED_PLATFORMS,
  DEFAULT_CACHE_TTL,
  DEFAULT_SYNC_INTERVAL,
  AUSTRALIAN_DATA_RESIDENCY
} from '@act-placemat/data-services';

// Export types
export * from './types';

// Export core integration classes
export { DataIntegrationManager } from './DataIntegrationManager';
export { MobileDataProvider } from './MobileDataProvider';
export { SyncCoordinator } from './SyncCoordinator';
export { ComplianceManager } from './ComplianceManager';

// Export utilities
export * from './utils';

// Export constants
export const DATA_INTEGRATION_VERSION = '1.0.0';
export const MOBILE_CACHE_LIMIT = 50 * 1024 * 1024; // 50MB
export const SYNC_TIMEOUT = 30 * 1000; // 30 seconds
export const AUSTRALIAN_TIMEZONE = 'Australia/Sydney';