/**
 * Policy-as-Code Module for Financial Intelligence Agent
 * 
 * Version-controlled repository for policy definitions using Rego, enabling
 * modular and auditable policy management with Australian compliance focus
 */

export { PolicyRepository } from './PolicyRepository';
export { RegoPolicyEngine } from './RegoPolicyEngine';
export { PolicyVersionManager } from './PolicyVersionManager';
export { PolicyValidator } from './PolicyValidator';

export type {
  RegoPolicy,
  PolicyDefinition,
  PolicyVersion,
  PolicyDeployment,
  PolicyValidationResult,
  PolicyRepositoryConfig,
  PolicyEngineConfig
} from './types';

// Rego policy modules
export * from './modules';