/**
 * Business Dashboard Service - Real-Time Business Intelligence Dashboard
 *
 * NOTE: This file now serves as a backward-compatible wrapper.
 * For new development, use apps/backend/core/src/services/financial/ instead.
 *
 * This wrapper maintains the original class signature while delegating
 * to the modularized implementation in the financial module.
 */

import BusinessDashboard from './financial/dashboard/service.js';

/**
 * BusinessDashboard - Legacy wrapper
 *
 * This class is now a thin wrapper around the modularized implementation.
 * All business logic has been moved to apps/backend/core/src/services/financial/
 */
class BusinessDashboardService extends BusinessDashboard {
  constructor() {
    super();
    console.log('Business Dashboard Service initialized (legacy wrapper)');
  }
}

// Export the modern implementation as default for backward compatibility
export default BusinessDashboardService;
