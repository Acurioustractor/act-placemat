/**
 * Privacy Guardian - Minimization Module
 *
 * Data minimization and reduction logic.
 * Part of the Privacy Guardian modular architecture.
 */

/**
 * Creates the data minimization module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Minimization methods
 */
export function createMinimizationModule(dependencies = {}) {
  const { logger = console } = dependencies;

  /**
   * Applies data minimization to remove unnecessary fields
   * @param {Object} data - Data to minimize
   * @param {Object} context - Processing context with purpose
   * @returns {Object} Minimized data
   */
  async function applyDataMinimization(data, context) {
    try {
      const minimizedData = { ...data };

      // Remove unnecessary fields based on purpose
      const necessaryFields = determineNecessaryFields(context.purpose);

      for (const key in minimizedData) {
        if (!necessaryFields.includes(key)) {
          delete minimizedData[key];
        }
      }

      // Apply field-level minimization
      for (const key of necessaryFields) {
        if (minimizedData[key]) {
          minimizedData[key] = await minimizeField(minimizedData[key], key, context);
        }
      }

      return minimizedData;

    } catch (error) {
      logger.error('Data minimization error:', error);
      return data; // Return original data if minimization fails
    }
  }

  /**
   * Determines which fields are necessary for the given purpose
   * @param {string} purpose - The processing purpose
   * @returns {string[]} Array of necessary field names
   */
  function determineNecessaryFields(purpose) {
    const fieldMappings = {
      user_registration: ['name', 'email', 'preferred_name'],
      profile_update: ['name', 'bio', 'avatar'],
      contact_sharing: ['email', 'phone', 'preferred_contact'],
      story_submission: ['title', 'content', 'author_consent'],
      default: ['id', 'created_at', 'updated_at']
    };

    return fieldMappings[purpose] || fieldMappings.default;
  }

  /**
   * Minimizes a single field value based on its type and context
   * @param {*} value - Field value to minimize
   * @param {string} fieldName - Name of the field
   * @param {Object} context - Processing context
   * @returns {*} Minimized field value
   */
  async function minimizeField(value, fieldName, context) {
    // Truncate long text fields
    if (typeof value === 'string' && value.length > 500) {
      return value.substring(0, 500) + '...[truncated]';
    }

    // Generalize dates to year/month for privacy
    if (fieldName.includes('date') && value instanceof Date) {
      return {
        year: value.getFullYear(),
        month: value.getMonth() + 1
      };
    }

    // Generalize precise locations
    if (fieldName.includes('location') || fieldName.includes('address')) {
      if (typeof value === 'object' && value.latitude && value.longitude) {
        return {
          city: value.city || 'unknown',
          region: value.region || 'unknown'
        };
      }
    }

    // Hash or redact identifying numbers
    if (fieldName.includes('ssn') || fieldName.includes('national_id')) {
      return '[REDACTED]';
    }

    // Generalize ages to age ranges
    if (fieldName.includes('age') && typeof value === 'number') {
      if (value < 18) return 'minor';
      if (value < 30) return '18-29';
      if (value < 50) return '30-49';
      if (value < 70) return '50-69';
      return '70+';
    }

    return value;
  }

  /**
   * Generalizes a value based on type and privacy requirements
   * @param {*} value - Value to generalize
   * @param {string} type - Generalization type (range, category, etc.)
   * @returns {*} Generalized value
   */
  function generalizeValue(value, type = 'range') {
    switch (type) {
      case 'range':
        if (typeof value === 'number') {
          if (value < 1000) return '0-999';
          if (value < 10000) return '1000-9999';
          if (value < 100000) return '10000-99999';
          return '100000+';
        }
        return value;

      case 'category':
        return value;

      case 'blur':
        if (typeof value === 'number') {
          return Math.round(value / 100) * 100;
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Calculates data reduction ratio
   * @param {Object} original - Original data object
   * @param {Object} minimized - Minimized data object
   * @returns {Object} Reduction metrics
   */
  function calculateDataReduction(original, minimized) {
    const originalSize = JSON.stringify(original).length;
    const minimizedSize = JSON.stringify(minimized).length;
    const bytesRemoved = originalSize - minimizedSize;
    const percentRemoved = ((bytesRemoved / originalSize) * 100).toFixed(2);

    return {
      original_bytes: originalSize,
      minimized_bytes: minimizedSize,
      bytes_removed: bytesRemoved,
      percent_removed: parseFloat(percentRemoved)
    };
  }

  /**
   * Validates that minimization didn't remove required fields
   * @param {Object} minimizedData - Minimized data
   * @param {string[]} requiredFields - Fields that must be present
   * @returns {Object} Validation result
   */
  function validateMinimization(minimizedData, requiredFields) {
    const missingFields = requiredFields.filter(field => !minimizedData.hasOwnProperty(field));

    return {
      valid: missingFields.length === 0,
      missing_fields: missingFields,
      field_count: Object.keys(minimizedData).length
    };
  }

  /**
   * Applies k-anonymity to a dataset
   * @param {Array} records - Array of record objects
   * @param {string[]} quasiIdentifiers - Fields that quasi-identify individuals
   * @param {number} k - Minimum k-value for anonymity
   * @returns {Object} Anonymized records with group counts
   */
  function applyKAnonymity(records, quasiIdentifiers, k = 5) {
    // Group records by quasi-identifiers
    const groups = {};

    for (const record of records) {
      const key = quasiIdentifiers.map(qi => JSON.stringify(record[qi])).join('|');
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    }

    // Mark below k threshold groups
    const anonymizedRecords = [];
    for (const [key, groupRecords] of Object.entries(groups)) {
      const groupCount = groupRecords.length;
      for (const record of groupRecords) {
        anonymizedRecords.push({
          ...record,
          _anonymity_group: groupCount >= k ? 'safe' : 'suppressed',
          _group_size: groupCount
        });
      }
    }

    return {
      records: anonymizedRecords,
      suppressed_count: anonymizedRecords.filter(r => r._anonymity_group === 'suppressed').length,
      safe_count: anonymizedRecords.filter(r => r._anonymity_group === 'safe').length
    };
  }

  return {
    applyDataMinimization,
    determineNecessaryFields,
    minimizeField,
    generalizeValue,
    calculateDataReduction,
    validateMinimization,
    applyKAnonymity
  };
}

export default {
  createMinimizationModule
};
