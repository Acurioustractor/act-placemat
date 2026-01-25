/**
 * Privacy Guardian - Helper Methods Module
 *
 * Utility helper methods used across the Privacy Guardian.
 * Part of the Privacy Guardian modular architecture.
 */

import crypto from 'crypto';

/**
 * Creates the helper methods module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Helper methods
 */
export function createHelpersModule(dependencies = {}) {
  const { logger = console } = dependencies;

  /**
   * Calculates the data reduction percentage between original and minimized data
   * @param {Object} original - Original data object
   * @param {Object} minimized - Minimized data object
   * @returns {string} Reduction percentage as string
   */
  function calculateDataReduction(original, minimized) {
    const originalSize = JSON.stringify(original).length;
    const minimizedSize = JSON.stringify(minimized).length;
    return ((originalSize - minimizedSize) / originalSize * 100).toFixed(2);
  }

  /**
   * Determines what consent is required for an operation
   * @param {Object} data - Data being processed
   * @param {Object} context - Processing context
   * @param {string} operation - Operation type
   * @returns {Object} Consent requirements
   */
  function determineRequiredConsent(data, context, operation) {
    const requirements = {
      type: 'individual',
      individual_required: true,
      community_required: false,
      cultural_authority_required: false,
      minimum_required: 1
    };

    // Check for community data
    if (context.involves_community_data) {
      requirements.community_required = true;
      requirements.minimum_required++;
      requirements.type = 'community';
    }

    // Check for cultural data
    if (detectCulturalData(data)) {
      requirements.cultural_authority_required = true;
      requirements.minimum_required++;
      requirements.type = 'cultural';
    }

    // Check for sensitive operations
    if (['public_sharing', 'research_use', 'commercial_use'].includes(operation)) {
      requirements.community_required = true;
      requirements.minimum_required = Math.max(requirements.minimum_required, 2);
    }

    return requirements;
  }

  /**
   * Detects if data contains cultural content indicators
   * @param {Object} data - Data to check
   * @returns {boolean} Whether cultural data is detected
   */
  function detectCulturalData(data) {
    const dataString = JSON.stringify(data).toLowerCase();
    const culturalIndicators = [
      'traditional', 'cultural', 'indigenous', 'aboriginal',
      'ceremony', 'sacred', 'elder', 'community'
    ];

    return culturalIndicators.some(indicator => dataString.includes(indicator));
  }

  /**
   * Sanitizes data by removing or masking sensitive fields
   * @param {Object} data - Data to sanitize
   * @param {string[]} fieldsToMask - Fields to mask
   * @returns {Object} Sanitized data
   */
  function sanitizeData(data, fieldsToMask = ['password', 'token', 'secret', 'key']) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = fieldsToMask.some(field => key.toLowerCase().includes(field));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitizeData(value, fieldsToMask);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generates a unique ID for tracking
   * @returns {string} UUID
   */
  function generateUniqueId() {
    return crypto.randomUUID();
  }

  /**
   * Creates a timestamp in ISO format
   * @returns {string} ISO timestamp
   */
  function createTimestamp() {
    return new Date().toISOString();
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
   * Merges objects deeply, with later objects taking precedence
   * @param {...Object} objects - Objects to merge
   * @returns {Object} Merged object
   */
  function deepMerge(...objects) {
    const result = {};

    for (const obj of objects) {
      if (obj) {
        for (const [key, value] of Object.entries(obj)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = deepMerge(result[key], value);
          } else {
            result[key] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Validates that an object has all required fields
   * @param {Object} obj - Object to validate
   * @param {string[]} requiredFields - Required field names
   * @returns {Object} Validation result
   */
  function validateRequiredFields(obj, requiredFields) {
    const missing = [];

    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null) {
        missing.push(field);
      }
    }

    return {
      valid: missing.length === 0,
      missing_fields: missing
    };
  }

  /**
   * Formats a duration in human-readable form
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Safely parses JSON with fallback
   * @param {string} jsonString - JSON string to parse
   * @param {*} fallback - Fallback value if parsing fails
   * @returns {*} Parsed value or fallback
   */
  function safeJsonParse(jsonString, fallback = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn('JSON parse error:', error.message);
      return fallback;
    }
  }

  /**
   * Truncates a string to a maximum length
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add (default: '...')
   * @returns {string} Truncated string
   */
  function truncateString(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Converts a value to a consistent type
   * @param {*} value - Value to convert
   * @param {string} targetType - Target type (string, number, boolean)
   * @returns {*} Converted value
   */
  function convertType(value, targetType) {
    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }

  /**
   * Creates a slug from a string
   * @param {string} str - String to slugify
   * @returns {string} Slugified string
   */
  function createSlug(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Groups an array by a key function
   * @param {Array} array - Array to group
   * @param {Function} keyFn - Function to extract group key
   * @returns {Object} Grouped object
   */
  function groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  return {
    calculateDataReduction,
    determineRequiredConsent,
    detectCulturalData,
    sanitizeData,
    generateUniqueId,
    createTimestamp,
    calculateDataSize,
    deepMerge,
    validateRequiredFields,
    formatDuration,
    safeJsonParse,
    truncateString,
    convertType,
    createSlug,
    groupBy
  };
}

export default {
  createHelpersModule
};
