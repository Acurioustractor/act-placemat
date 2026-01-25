/**
 * Recommendations Module
 * Consolidates recommendation engine and rules
 */

export { default as RecommendationEngine } from './engine.js';
export { default as RecommendationRules } from './rules.js';

// Re-export individual functions
export * from './engine.js';
export * from './rules.js';
