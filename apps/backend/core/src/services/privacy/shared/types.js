/**
 * Privacy Module - Shared Types
 *
 * Common type definitions used across privacy and cultural modules.
 */

/**
 * @typedef {Object} PrivacyContext
 * @property {string} [purpose] - The purpose of data processing
 * @property {boolean} [involves_community_data] - Whether community data is involved
 * @property {string} [operation] - The operation being performed
 * @property {boolean} [requires_community_notification] - Whether community notification is required
 */

/**
 * @typedef {Object} ProtectionResult
 * @property {string} operation - The operation that was protected
 * @property {string} timestamp - ISO timestamp of the protection
 * @property {string[]} protections_applied - List of applied protections
 * @property {boolean} consent_verified - Whether consent was verified
 * @property {Object} encryption_status - Encryption status details
 * @property {Object} access_controls - Access control details
 * @property {Object} retention_policy - Retention policy details
 * @property {boolean} monitoring_enabled - Whether monitoring is enabled
 * @property {string} compliance_status - Compliance status (pending, approved, rejected, error)
 */

/**
 * @typedef {Object} ConsentVerification
 * @property {boolean} valid - Whether consent is valid
 * @property {string} consent_type - Type of consent (individual, community, cultural)
 * @property {string[]} issues - List of consent issues
 * @property {string[]} requirements_met - List of requirements that are met
 * @property {Date|null} expiry_date - Consent expiry date
 * @property {boolean} withdrawal_available - Whether consent can be withdrawn
 */

/**
 * @typedef {Object} AccessControls
 * @property {string} access_level - Level of access granted
 * @property {string[]} permitted_users - List of permitted users
 * @property {string[]} permitted_roles - List of permitted roles
 * @property {Object} time_restrictions - Time-based restrictions
 * @property {string[]} purpose_restrictions - Purpose-based restrictions
 * @property {string} monitoring_level - Level of monitoring
 */

module.exports = {
  PrivacyContext: null,
  ProtectionResult: null,
  ConsentVerification: null,
  AccessControls: null
};
