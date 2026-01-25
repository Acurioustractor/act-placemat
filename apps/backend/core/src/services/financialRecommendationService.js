/**
 * Financial Recommendation Service
 *
 * NOTE: This file now serves as a backward-compatible wrapper.
 * For new development, use apps/backend/core/src/services/financial/ instead.
 *
 * This wrapper maintains the original function signatures while delegating
 * to the modularized implementation in the financial module.
 */

export {
  refreshFinancialRecommendations,
  listFinancialRecommendations,
  updateFinancialRecommendation
} from './financial/recommendations/service.js';

// Re-export for convenience
export { default as RecommendationEngine } from './financial/recommendations/engine.js';
export { default as RecommendationRules } from './financial/recommendations/rules.js';
