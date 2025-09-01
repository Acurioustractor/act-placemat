/**
 * ACT Placemat - Shared Test Utilities
 * 
 * Comprehensive testing utilities for all applications in the monorepo
 * with Australian-specific helpers and configurations
 */

// Core utilities
export * from './australian-data';
export * from './mock-factories';
export * from './test-helpers';
export * from './api-mocks';
export * from './date-helpers';

// Framework-specific utilities
export * from './react-testing-utils';
export * from './playwright-utils';
export * from './detox-utils';

// Setup functions
export * from './setup';

// Types
export * from './types';