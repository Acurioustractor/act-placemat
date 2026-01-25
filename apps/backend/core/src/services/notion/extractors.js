/**
 * Notion Data Extractors Module
 * Utilities for extracting and transforming Notion API response data
 */

/**
 * Extract plain text from rich text array
 * @param {Array} richTextArray - Rich text array from Notion API
 * @returns {string} Extracted plain text
 */
export function extractPlainText(richTextArray) {
  if (!Array.isArray(richTextArray)) return '';
  return richTextArray.map(item => item.plain_text || '').join('');
}

/**
 * Extract data from rollup property
 * @param {Object} rollupProperty - Rollup property from Notion API
 * @returns {string} Extracted rollup data
 */
export function extractRollup(rollupProperty) {
  if (!rollupProperty?.rollup) return '';

  const rollup = rollupProperty.rollup;

  // Handle different rollup types
  if (rollup.type === 'rich_text' && rollup.rich_text) {
    return extractPlainText(rollup.rich_text);
  }

  if (rollup.type === 'title' && rollup.title) {
    return extractTitle(rollup.title);
  }

  if (rollup.type === 'array' && rollup.array && rollup.array.length > 0) {
    // For array rollups, extract the first item based on its type
    const firstItem = rollup.array[0];
    if (firstItem.rich_text) {
      return extractPlainText(firstItem.rich_text);
    }
    if (firstItem.title) {
      return extractTitle(firstItem.title);
    }
    if (firstItem.name) {
      return extractPlainText(firstItem.name);
    }
    // Return empty string for other types
    return '';
  }

  if (rollup.type === 'number' && rollup.number !== null && rollup.number !== undefined) {
    return String(rollup.number);
  }

  return '';
}

/**
 * Extract title from title array
 * @param {Array} titleArray - Title array from Notion API
 * @returns {string} Extracted title
 */
export function extractTitle(titleArray) {
  if (!Array.isArray(titleArray)) return '';
  return titleArray.map(item => item.plain_text || '').join('');
}

/**
 * Extract select value
 * @param {Object} selectObj - Select property from Notion API
 * @returns {string} Select value or empty string
 */
export function extractSelect(selectObj) {
  if (!selectObj) return '';
  return selectObj.name || '';
}

/**
 * Extract multi-select values
 * @param {Array} multiSelectArray - Multi-select array from Notion API
 * @returns {Array} Array of selected values
 */
export function extractMultiSelect(multiSelectArray) {
  if (!Array.isArray(multiSelectArray)) return [];
  return multiSelectArray.map(item => item.name || '').filter(Boolean);
}

/**
 * Extract number value
 * @param {Object} numberObj - Number property from Notion API
 * @returns {number|null} Number value or null
 */
export function extractNumber(numberObj) {
  if (!numberObj) return null;
  return numberObj.number !== null && numberObj.number !== undefined
    ? numberObj.number
    : null;
}

/**
 * Extract email value
 * @param {Object} emailObj - Email property from Notion API
 * @returns {string} Email value or empty string
 */
export function extractEmail(emailObj) {
  if (!emailObj) return '';
  return emailObj.email || '';
}

/**
 * Extract JSON field from rich text
 * @param {Array} richTextArray - Rich text array from Notion API
 * @param {Object} options - Extraction options
 * @returns {Object} Parsed JSON or empty object
 */
export function extractJSONField(richTextArray, options = {}) {
  const text = extractPlainText(richTextArray);
  if (!text) {
    return options.defaultValue || {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Failed to parse JSON field:', error.message);
    return options.defaultValue || {};
  }
}

/**
 * Extract checkbox value
 * @param {Object} checkboxObj - Checkbox property from Notion API
 * @returns {boolean} Checkbox value or false
 */
export function extractCheckbox(checkboxObj) {
  if (!checkboxObj) return false;
  return !!checkboxObj.checkbox;
}

/**
 * Extract relation IDs
 * @param {Array} relationArray - Relation array from Notion API
 * @returns {Array} Array of relation IDs
 */
export function extractRelation(relationArray) {
  if (!Array.isArray(relationArray)) return [];
  return relationArray.map(item => item.id || '').filter(Boolean);
}

/**
 * Get complete relation IDs with filtering
 * @param {Object} options - Options for fetching relation IDs
 * @returns {Promise<Array>} Array of relation IDs
 */
export async function getCompleteRelationIds(options = {}) {
  const { targetDatabaseId, filterProperty, projectId, queryNotion } = options;

  if (!targetDatabaseId || !filterProperty || !projectId || !queryNotion) {
    return [];
  }

  try {
    const relationFilter = {
      property: filterProperty,
      relation: {
        contains: projectId,
      },
    };

    const results = await queryNotion(targetDatabaseId, relationFilter, [], 100, {
      getAllPages: true,
    });

    return results.map(page => page.id);
  } catch (error) {
    console.warn('Error fetching complete relation IDs:', error.message);
    return [];
  }
}

/**
 * Extract file URL from file property
 * @param {Object} fileObj - File property from Notion API
 * @returns {string} File URL or empty string
 */
export function extractFile(fileObj) {
  if (!fileObj) return '';
  return fileObj.file?.url || fileObj.external?.url || '';
}

/**
 * Extract file URLs from files property
 * @param {Array} filesProperty - Files property from Notion API
 * @returns {Array} Array of file URLs
 */
export function extractFileUrl(filesProperty) {
  if (!Array.isArray(filesProperty)) return [];
  return filesProperty.map(file => {
    if (file.type === 'file') {
      return file.file?.url || '';
    } else if (file.type === 'external') {
      return file.external?.url || '';
    }
    return '';
  }).filter(Boolean);
}

/**
 * Extract date value
 * @param {Object} dateObj - Date property from Notion API
 * @returns {string|null} Date string or null
 */
export function extractDate(dateObj) {
  if (!dateObj) return null;
  return dateObj.start || null;
}

/**
 * Extract person information
 * @param {Array} peopleArray - People array from Notion API
 * @returns {Array} Array of person objects
 */
export function extractPerson(peopleArray) {
  if (!Array.isArray(peopleArray)) return [];
  return peopleArray.map(person => ({
    id: person.id || '',
    name: person.name || '',
    person: person.person || {},
  }));
}

/**
 * Extract URL value
 * @param {Object} urlObj - URL property from Notion API
 * @returns {string} URL or empty string
 */
export function extractUrl(urlObj) {
  if (!urlObj) return '';
  return urlObj.url || '';
}

export default {
  extractPlainText,
  extractRollup,
  extractTitle,
  extractSelect,
  extractMultiSelect,
  extractNumber,
  extractEmail,
  extractJSONField,
  extractCheckbox,
  extractRelation,
  getCompleteRelationIds,
  extractFile,
  extractFileUrl,
  extractDate,
  extractPerson,
  extractUrl,
};
