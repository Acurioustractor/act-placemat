/**
 * Financial Intelligence Agent
 * 
 * Ethical financial management for Australian community organisations
 * with consent-based governance and sovereignty recognition
 */

// Export core types
export * from './types/governance';
export * from './types/financial';

// Export data model manager
export { DataModelManager } from './models/DataModelManager';

// Export policy-as-code system
export * from './policy';

// Export OPA integration service
export * from './opa';

// Export tagging pipeline
export * from './tagging';

// Export API middleware
export * from './middleware';

// Export transformation library
export * from './transformation';

// Export governance services
export { ConsentManager } from './services/ConsentManager';
export { PolicyEngine } from './services/PolicyEngine';
export { SovereigntyTracker } from './services/SovereigntyTracker';

// Export financial services
export { CashFlowManager } from './services/CashFlowManager';
export { BudgetManager } from './services/BudgetManager';
export { ForecastingEngine } from './services/ForecastingEngine';
export { AlertManager } from './services/AlertManager';

// Export utilities
export * from './utils';

// Package metadata
export const FINANCIAL_INTELLIGENCE_VERSION = '1.0.0';
export const SUPPORTED_CURRENCIES = ['AUD'] as const;
export const DEFAULT_COMPLIANCE_FRAMEWORK = 'australian' as const;