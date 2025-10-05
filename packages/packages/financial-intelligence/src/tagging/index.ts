/**
 * Data Tagging Pipeline
 * 
 * Complete system for syncing data catalog metadata to PostgreSQL
 * with Australian compliance, consent management, and sovereignty tracking
 */

// Export main orchestrator
export { TaggingPipelineOrchestrator, TaggingPipelineFactory } from './TaggingPipelineOrchestrator';

// Export individual components
export { DataCatalogInterface, DataCatalogFactory, ApacheAtlasInterface, DataHubInterface, AmundsenInterface, CustomDataCatalogInterface } from './DataCatalogInterface';
export { PostgreSQLSyncPipeline } from './PostgreSQLSyncPipeline';
export { AutoTaggingEngine } from './AutoTaggingEngine';

// Export all types
export * from './types';

// Export utilities and helpers
export { createDefaultTaggingConfig, createDevelopmentConfig, validateTaggingConfig } from './utils';

// Package metadata
export const TAGGING_PIPELINE_VERSION = '1.0.0';
export const SUPPORTED_CATALOGS = ['apache_atlas', 'datahub', 'amundsen', 'custom'] as const;
export const DEFAULT_BATCH_SIZE = 100;
export const DEFAULT_SYNC_FREQUENCY = '0 * * * *'; // Hourly