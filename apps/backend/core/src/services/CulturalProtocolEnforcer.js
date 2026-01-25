/**
 * Cultural Protocol Enforcer - Sacred Guardianship of Indigenous Knowledge & Community Sovereignty
 *
 * Philosophy: "First Law - Cultural protocols are not suggestions, they are sacred obligations"
 *
 * This sacred guardian ensures:
 * - Absolute protection of Indigenous knowledge and cultural protocols
 * - Community data sovereignty and self-determination rights
 * - Trauma-informed data handling with healing-centered approaches
 * - Intergenerational wisdom protection and knowledge transfer protocols
 * - Sacred knowledge safeguarding with ceremony-level respect
 * - Community consent management with ongoing relationship accountability
 *
 * @deprecated Use the modular structure at ./privacy/cultural/ for new code.
 *            This file is maintained for backward compatibility.
 */

import CulturalProtocolEnforcerModular from './privacy/cultural/index.js';

// Create backward-compatible instance that uses the modular implementation
const modularEnforcer = new CulturalProtocolEnforcerModular();

// Create a wrapper class that maintains the original interface
class CulturalProtocolEnforcer {
  constructor() {
    // Delegate to modular implementation
    Object.assign(this, modularEnforcer);
    console.log('🛡️ Cultural Protocol Enforcer initialized (legacy wrapper) - Sacred guardianship activated');
  }

  get redis() {
    return modularEnforcer.redis;
  }

  async enforceProtocols(data, context, operation) {
    return modularEnforcer.enforceProtocols(data, context, operation);
  }

  async checkSacredKnowledgeProtection(data, context) {
    return modularEnforcer.checkSacredKnowledgeProtection(data, context);
  }

  async validateDataSovereignty(data, context) {
    return modularEnforcer.validateDataSovereignty(data, context);
  }

  async assessTraumaSensitivity(data, context) {
    return modularEnforcer.assessTraumaSensitivity(data, context);
  }

  async validateConsent(data, context, operation) {
    return modularEnforcer.validateConsent(data, context, operation);
  }

  async reviewCulturalAppropriateness(data, context) {
    return modularEnforcer.reviewCulturalAppropriateness(data, context);
  }

  generateEnforcementDecision(enforcement) {
    return modularEnforcer.generateEnforcementDecision(enforcement);
  }

  async triggerEscalations(escalations, data, context) {
    return modularEnforcer.triggerEscalations(escalations, data, context);
  }

  async requestCulturalAdvisorReview(data, context, enforcement) {
    return modularEnforcer.requestCulturalAdvisorReview(data, context, enforcement);
  }

  async logProtocolEnforcement(enforcement, decision) {
    return modularEnforcer.logProtocolEnforcement(enforcement, decision);
  }

  detectIndigenousContent(data) {
    return modularEnforcer.detectIndigenousContent(data);
  }

  detectCommunityScope(data) {
    return modularEnforcer.detectCommunityScope(data);
  }

  async analyzeWithCulturalAI(content) {
    return modularEnforcer.analyzeWithCulturalAI(content);
  }

  async encryptSacredKnowledge(content, context) {
    return modularEnforcer.encryptSacredKnowledge(content, context);
  }

  async decryptWithPermission(encryptedContent, requester) {
    return modularEnforcer.decryptWithPermission(encryptedContent, requester);
  }

  async notifyCulturalAuthorities(notification) {
    return modularEnforcer.notifyCulturalAuthorities(notification);
  }

  trackViolationPatterns(patternId, violationData) {
    return modularEnforcer.trackViolationPattern(patternId, violationData);
  }

  async generateCulturalSensitivityReport(data) {
    return modularEnforcer.generateCulturalSensitivityReport(data);
  }

  async trainCulturalSensitivityModels(trainingData) {
    return modularEnforcer.trainCulturalSensitivityModels(trainingData);
  }

  async connect() {
    return modularEnforcer.connect();
  }

  async disconnect() {
    return modularEnforcer.disconnect();
  }

  async healthCheck() {
    return modularEnforcer.healthCheck();
  }

  async readinessCheck() {
    return modularEnforcer.readinessCheck();
  }

  async getStats() {
    return modularEnforcer.getStats();
  }

  setupGracefulShutdown(signalHandler) {
    return modularEnforcer.setupGracefulShutdown(signalHandler);
  }
}

export default CulturalProtocolEnforcer;
