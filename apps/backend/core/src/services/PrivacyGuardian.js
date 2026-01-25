/**
 * Privacy Guardian - Sovereign Data Protection & Community Privacy Rights
 *
 * Philosophy: "Privacy is not about hiding, it's about dignity and self-determination"
 *
 * This guardian ensures:
 * - Community data sovereignty and ownership rights
 * - Granular consent management with ongoing relationship accountability
 * - Zero-trust privacy architecture with encryption-by-default
 * - Right to be forgotten with complete data erasure capabilities
 * - Transparent privacy governance with community oversight
 * - Cultural privacy protocols integrated with technical safeguards
 *
 * @deprecated Use the modular structure at ./privacy/guardian/ for new code.
 *            This file is maintained for backward compatibility.
 */

import PrivacyGuardianModular from './privacy/guardian/index.js';

// Create backward-compatible instance that uses the modular implementation
const modularGuardian = new PrivacyGuardianModular();

// Create a wrapper class that maintains the original interface
class PrivacyGuardian {
  constructor() {
    // Delegate to modular implementation
    Object.assign(this, modularGuardian);
    console.log('🔒 Privacy Guardian initialized (legacy wrapper) - Protecting community data sovereignty');
  }

  get redis() {
    return modularGuardian.redis;
  }

  async enforcePrivacyProtections(data, context, operation) {
    return modularGuardian.enforcePrivacyProtections(data, context, operation);
  }

  async verifyConsent(data, context, operation) {
    return modularGuardian.verifyConsent(data, context, operation);
  }

  async checkIndividualConsent(context, operation) {
    return modularGuardian.checkIndividualConsent(context, operation);
  }

  async checkCommunityConsent(context, operation) {
    return modularGuardian.checkCommunityConsent(context, operation);
  }

  async checkCulturalAuthorityConsent(context, operation) {
    return modularGuardian.checkCulturalAuthorityConsent(context, operation);
  }

  determineRequiredConsent(data, context, operation) {
    return modularGuardian.determineRequiredConsent(data, context, operation);
  }

  detectCulturalData(data) {
    return modularGuardian.detectCulturalData(data);
  }

  async applyDataMinimization(data, context) {
    return modularGuardian.applyDataMinimization(data, context);
  }

  determineNecessaryFields(purpose) {
    return modularGuardian.determineNecessaryFields(purpose);
  }

  async minimizeField(value, fieldName, context) {
    return modularGuardian.minimizeField(value, fieldName, context);
  }

  calculateDataReduction(original, minimized) {
    return modularGuardian.calculateDataReduction(original, minimized);
  }

  async applyEncryption(data, context) {
    return modularGuardian.applyEncryption(data, context);
  }

  determineEncryptionRequirements(data, context) {
    return modularGuardian.determineEncryptionRequirements(data, context);
  }

  async encryptField(value, fieldName, context) {
    return modularGuardian.encryptField(value, fieldName, context);
  }

  async decryptField(encryptedValue, fieldName, context) {
    return modularGuardian.decryptField(encryptedValue, fieldName, context);
  }

  async enforceAccessControls(context, operation) {
    return modularGuardian.enforceAccessControls(context, operation);
  }

  determineAccessLevel(context) {
    return modularGuardian.determineAccessLevel(context);
  }

  determinePermittedUsers(context, operation) {
    return modularGuardian.determinePermittedUsers(context, operation);
  }

  determinePermittedRoles(context, operation) {
    return modularGuardian.determinePermittedRoles(context, operation);
  }

  applyTimeRestrictions(context) {
    return modularGuardian.applyTimeRestrictions(context);
  }

  setPurposeRestrictions(context, operation) {
    return modularGuardian.setPurposeRestrictions(context, operation);
  }

  determineMonitoringLevel(context) {
    return modularGuardian.determineMonitoringLevel(context);
  }

  async applyRetentionPolicy(data, context) {
    return modularGuardian.applyRetentionPolicy(data, context);
  }

  async setupPrivacyMonitoring(data, context, operation) {
    return modularGuardian.setupPrivacyMonitoring(data, context, operation);
  }

  async validateCompliance(protection, context) {
    return modularGuardian.validateCompliance(protection, context);
  }

  async notifyCommunity(protection, context) {
    return modularGuardian.notifyCommunity(protection, context);
  }

  async logPrivacyEnforcement(protection) {
    return modularGuardian.logPrivacyEnforcement(protection);
  }

  async logPrivacyError(protection, error) {
    return modularGuardian.logPrivacyError(protection, error);
  }

  async processConsentWithdrawal(consentId) {
    return modularGuardian.processConsentWithdrawal(consentId);
  }

  async generatePrivacyReport(options) {
    return modularGuardian.generatePrivacyReport(options);
  }

  async conductPrivacyAudit(options) {
    return modularGuardian.conductPrivacyAudit(options);
  }

  async connect() {
    return modularGuardian.connect();
  }

  async disconnect() {
    return modularGuardian.disconnect();
  }

  async healthCheck() {
    return modularGuardian.healthCheck();
  }

  async readinessCheck() {
    return modularGuardian.readinessCheck();
  }

  async getStats() {
    return modularGuardian.getStats();
  }

  setupGracefulShutdown(signalHandler) {
    return modularGuardian.setupGracefulShutdown(signalHandler);
  }
}

export default PrivacyGuardian;
