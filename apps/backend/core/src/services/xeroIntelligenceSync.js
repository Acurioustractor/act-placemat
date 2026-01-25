/**
 * Xero Intelligence Sync Service
 *
 * NOTE: This file now serves as a backward-compatible wrapper.
 * For new development, use apps/backend/core/src/services/financial/ instead.
 *
 * This wrapper maintains the original class signature while delegating
 * to the modularized implementation in the financial module.
 */

export { default as XeroIntelligenceSync, getXeroSyncService } from './financial/xero/sync.js';
