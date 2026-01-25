/**
 * Privacy Module - Main Export Aggregator
 *
 * Aggregates all privacy and cultural submodules for easy importing.
 * Part of the Privacy Guardian and Cultural Protocol Enforcer modular architecture.
 */

// Guardian exports
export { default as PrivacyGuardian, default as Guardian } from './guardian/index.js';

// Cultural exports
export { default as CulturalProtocolEnforcer, default as CulturalEnforcer } from './cultural/index.js';

// Shared utilities
export * from './shared/types.js';
export * from './shared/constants.js';
export * from './shared/utils.js';

// Re-export commonly used functions
export {
  // Guardian modules
  createGuardianConstructor,
  initializeGuardianInstance,
  getAllInitializationModules,
  createEnforcementModule,
  createMinimizationModule,
  createEncryptionModule,
  createAccessModule,
  createHelpersModule,
  createLifecycleModule
} from './guardian/index.js';

// Cultural modules
export {
  createCulturalConstructor,
  initializeCulturalInstance,
  getAllCulturalInitializationModules,
  createSacredModule,
  createSovereigntyModule,
  createTraumaModule,
  createConsentModule,
  createDecisionsModule,
  createDetectionModule,
  createLoggingModule
} from './cultural/index.js';

export default {
  PrivacyGuardian,
  CulturalProtocolEnforcer
};
