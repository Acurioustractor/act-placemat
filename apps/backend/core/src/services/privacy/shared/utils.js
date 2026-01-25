/**
 * Privacy Module - Shared Utilities
 *
 * Common utility functions used across privacy and cultural modules.
 */

const crypto = require('crypto');

/**
 * Generates a cryptographically secure random UUID
 * @returns {string} UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Creates a SHA-256 hash of the input data
 * @param {string|Object} data - Data to hash
 * @returns {string} Hex-encoded hash
 */
function hashData(data) {
  const stringData = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(stringData).digest('hex');
}

/**
 * Sanitizes data for logging by removing sensitive fields
 * @param {Object} data - Data to sanitize
 * @param {string[]} sensitiveFields - Fields to remove
 * @returns {Object} Sanitized data
 */
function sanitizeForLogging(data, sensitiveFields = ['password', 'token', 'key', 'secret', 'credential']) {
  if (!data || typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = sensitiveFields.some(field => key.toLowerCase().includes(field));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Calculates the size of data in bytes
 * @param {*} data - Data to measure
 * @returns {number} Size in bytes
 */
function calculateDataSize(data) {
  return Buffer.byteLength(JSON.stringify(data), 'utf8');
}

/**
 * Detects if data contains culturally sensitive indicators
 * @param {Object} data - Data to check
 * @param {string[]} indicators - List of sensitivity indicators
 * @returns {boolean} Whether sensitive content is detected
 */
function detectSensitiveContent(data, indicators) {
  const dataString = JSON.stringify(data).toLowerCase();
  return indicators.some(indicator => dataString.includes(indicator.toLowerCase()));
}

/**
 * Validates that a consent record has all required fields
 * @param {Object} consentRecord - Consent record to validate
 * @param {string[]} requiredFields - Required field names
 * @returns {Object} Validation result with valid flag and missing fields
 */
function validateConsentRecord(consentRecord, requiredFields) {
  const missingFields = [];

  for (const field of requiredFields) {
    if (!consentRecord || consentRecord[field] === undefined) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Checks if consent has expired
 * @param {Date|string} consentDate - Date consent was given
 * @param {number} maxAgeDays - Maximum age in days
 * @returns {boolean} Whether consent has expired
 */
function isConsentExpired(consentDate, maxAgeDays) {
  const consentTime = new Date(consentDate).getTime();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  return Date.now() - consentTime > maxAge;
}

/**
 * Deep clones an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Deep clone
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates a timestamp in ISO format
 * @returns {string} ISO timestamp
 */
function createTimestamp() {
  return new Date().toISOString();
}

/**
 * Delays execution for a specified number of milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateUUID,
  hashData,
  sanitizeForLogging,
  calculateDataSize,
  detectSensitiveContent,
  validateConsentRecord,
  isConsentExpired,
  deepClone,
  createTimestamp,
  delay
};
