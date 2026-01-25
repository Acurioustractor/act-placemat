/**
 * Dashboard Module
 * Consolidates all dashboard services: config, dataSources, alerts, generators, metrics, monitoring
 */

export { default as DashboardConfig } from './config.js';
export { default as DataSources } from './dataSources.js';
export { default as AlertRules } from './alerts.js';
export { default as DashboardGenerators } from './generators.js';
export { default as DashboardMetrics } from './metrics.js';
export { default as DashboardMonitoring } from './monitoring.js';

// Re-export individual functions for convenience
export * from './config.js';
export * from './dataSources.js';
export * from './alerts.js';
export * from './generators.js';
export * from './metrics.js';
export * from './monitoring.js';
