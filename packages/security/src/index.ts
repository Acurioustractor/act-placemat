/**
 * ACT Placemat Security Package
 * 
 * Complete security framework with authentication, authorization, encryption,
 * and Australian compliance features including Indigenous sovereignty recognition
 */

// === AUTHENTICATION & AUTHORIZATION ===
export * from './auth';

// === API KEY MANAGEMENT ===
export * from './api-keys';

// === ENCRYPTION & TLS ===
export * from './encryption';

// === RBAC SYSTEM ===
export * from './rbac/roles';
export * from './rbac/permissions-matrix';
export * from './rbac/rbac-schema';

// === AUDIT LOGGING ===
export * from './audit';

// === SECURITY MONITORING ===
export * from './monitoring/SecurityMonitor';

// === SECURITY TESTING ===
export * from './testing';

// === SECURE COMMUNICATION ===
export * from './communication';

// === SECURITY REVIEW & ASSESSMENT ===
export * from './review';

// === MAIN SECURITY SERVICE ===
export { SecurityService } from './SecurityService';

// === TYPES ===
export type { SecurityConfig } from './SecurityService';