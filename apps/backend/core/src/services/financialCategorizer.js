/**
 * Financial Categorizer Service
 *
 * NOTE: This file now serves as a backward-compatible wrapper.
 * For new development, use apps/backend/core/src/services/financial/ instead.
 *
 * This wrapper maintains the original function signatures while delegating
 * to the modularized implementation in the financial module.
 */

export {
  suggestCategoryForTransaction,
  getActiveCategorisationRules,
  invalidateCategorisationRuleCache,
  normaliseText,
  matchesRule,
  safeJsonParse,
  applyHeuristics,
  getDefaultHeuristics,
  getAvailableCategories
} from './financial/categorizer/categorizer.js';
