/**
 * Privacy Module - Shared Constants
 *
 * Common constants used across privacy and cultural modules.
 */

/** Default Kafka brokers if not configured */
const DEFAULT_KAFKA_BROKERS = 'localhost:9092';

/** Redis key prefixes for privacy-related data */
const REDIS_KEYS = {
  ENFORCEMENT_LOG: 'privacy:enforcement:log:',
  ENFORCEMENT_TIMELINE: 'privacy:enforcement:timeline',
  PROTOCOL_LOG: 'cultural:protocol:log:',
  PROTOCOL_TIMELINE: 'cultural:protocol:timeline'
};

/** Default retention period for logs (30 days in seconds) */
const LOG_RETENTION_SECONDS = 30 * 24 * 60 * 60;

/** Consent expiry defaults */
const CONSENT_DEFAULTS = {
  INDIVIDUAL_EXPIRY_DAYS: 365,
  COMMUNITY_EXPIRY_DAYS: 365,
  RENEWAL_REMINDER_DAYS: 30
};

/** Protection levels */
const PROTECTION_LEVELS = {
  ABSOLUTE: 'absolute',
  HIGH: 'high',
  STANDARD: 'standard',
  MINIMAL: 'minimal'
};

/** Compliance statuses */
const COMPLIANCE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ERROR: 'error'
};

/** Encryption standards */
const ENCRYPTION = {
  ALGORITHM: 'AES-256-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 16,
  TAG_LENGTH: 16
};

/** Data sovereignty levels */
const SOVEREIGNTY_LEVELS = {
  INDIVIDUAL: 'individual',
  COMMUNITY: 'community',
  INDIGENOUS: 'indigenous_community'
};

module.exports = {
  DEFAULT_KAFKA_BROKERS,
  REDIS_KEYS,
  LOG_RETENTION_SECONDS,
  CONSENT_DEFAULTS,
  PROTECTION_LEVELS,
  COMPLIANCE_STATUS,
  ENCRYPTION,
  SOVEREIGNTY_LEVELS
};
