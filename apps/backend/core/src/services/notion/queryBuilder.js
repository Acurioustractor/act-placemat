/**
 * Notion Query Builder Module
 * Handles query building and filtering for Notion API
 */

/**
 * Query Notion database
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Query results
 */
export async function queryNotion(options = {}) {
  const {
    notion,
    databaseId,
    filter = {},
    sorts = [],
    pageSize = 100,
    getAllPages = true,
    startCursor = null,
    maxPages = null,
  } = options;

  if (!notion || !databaseId) {
    console.warn('Notion client or database ID not provided');
    return [];
  }

  const allResults = [];
  let hasMore = true;
  let currentCursor = startCursor;
  let pagesFetched = 0;

  while (hasMore) {
    if (maxPages && pagesFetched >= maxPages) {
      break;
    }

    try {
      const queryParams = {
        page_size: pageSize,
        sorts: sorts.length > 0 ? sorts : undefined,
      };

      if (currentCursor) {
        queryParams.start_cursor = currentCursor;
      }

      if (Object.keys(filter).length > 0) {
        queryParams.filter = filter;
      }

      const response = await notion.databases.query(queryParams);

      if (response.results) {
        allResults.push(...response.results);
      }

      hasMore = response.has_more && getAllPages;
      currentCursor = response.next_cursor;
      pagesFetched++;

      // Safety limit
      if (allResults.length > 5000) {
        console.warn('⚠️ Reached safety limit of 5000 results');
        break;
      }
    } catch (error) {
      console.error('❌ Notion query error:', error.message);
      throw error;
    }
  }

  return allResults;
}

/**
 * Build enhanced filter for Notion queries
 * @param {Object} filter - Filter configuration
 * @param {Object} propertyTypes - Property type mappings
 * @param {string} dbType - Database type
 * @returns {Object} Notion filter object
 */
export function buildEnhancedFilter(filter, propertyTypes = {}, dbType = null) {
  if (!filter || Object.keys(filter).length === 0) {
    return null;
  }

  const conditions = [];

  for (const [property, value] of Object.entries(filter)) {
    if (value === undefined || value === null) {
      continue;
    }

    const propertyType = propertyTypes[property] || inferPropertyType(property, value);
    const condition = buildPropertyFilterCondition(property, value, propertyTypes);

    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    and: conditions,
  };
}

/**
 * Build property filter condition
 * @param {string} property - Property name
 * @param {any} value - Filter value
 * @param {Object} propertyTypes - Property type mappings
 * @returns {Object} Notion filter condition
 */
export function buildPropertyFilterCondition(property, value, propertyTypes = {}) {
  const propertyType = propertyTypes[property] || inferPropertyType(property, value);

  // Handle empty values
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle array values (for multi-select)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }

    // If it's an array of objects with specific structure, use compound filter
    if (value.length === 1) {
      // Single item in array - treat as direct filter
      return buildPropertyFilterCondition(property, value[0], propertyTypes);
    }

    // Multiple items - use 'and' for multiple conditions
    const conditions = value.map(v =>
      buildPropertyFilterCondition(property, v, propertyTypes)
    ).filter(Boolean);

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      and: conditions,
    };
  }

  // Handle object filters (for advanced filtering)
  if (typeof value === 'object') {
    if (value.operator) {
      // Advanced filter with custom operator
      return buildAdvancedFilter(property, value, propertyType);
    }

    // Object with nested values (e.g., { contains: 'value' })
    const { equals, contains, starts_with, ends_with, gt, gte, lt, lte, ...rest } = value;

    const conditions = [];

    if (equals !== undefined) {
      conditions.push({
        property,
        [propertyType]: { equals },
      });
    }

    if (contains !== undefined) {
      conditions.push({
        property,
        rich_text: { contains },
      });
    }

    if (starts_with !== undefined) {
      conditions.push({
        property,
        rich_text: { starts_with: starts_with },
      });
    }

    if (ends_with !== undefined) {
      conditions.push({
        property,
        rich_text: { ends_with: ends_with },
      });
    }

    if (gt !== undefined) {
      conditions.push({
        property,
        number: { greater_than: gt },
      });
    }

    if (gte !== undefined) {
      conditions.push({
        property,
        number: { greater_than_or_equal_to: gte },
      });
    }

    if (lt !== undefined) {
      conditions.push({
        property,
        number: { less_than: lt },
      });
    }

    if (lte !== undefined) {
      conditions.push({
        property,
        number: { less_than_or_equal_to: lte },
      });
    }

    if (conditions.length === 0) {
      // Check for date filters
      if (rest.on_or_after !== undefined) {
        conditions.push({
          property,
          date: { on_or_after: rest.on_or_after },
        });
      }
      if (rest.on_or_before !== undefined) {
        conditions.push({
          property,
          date: { on_or_before: rest.on_or_before },
        });
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      and: conditions,
    };
  }

  // Handle simple values
  switch (propertyType) {
    case 'select':
    case 'status':
      return {
        property,
        select: { equals: String(value) },
      };

    case 'multi_select':
      // For multi_select, we use 'contains' for single values
      return {
        property,
        multi_select: { contains: String(value) },
      };

    case 'checkbox':
      return {
        property,
        checkbox: { equals: Boolean(value) },
      };

    case 'number':
      const numValue = Number(value);
      return {
        property,
        number: { equals: isNaN(numValue) ? 0 : numValue },
      };

    case 'date':
      return {
        property,
        date: { equals: value },
      };

    case 'relation':
      return {
        property,
        relation: { contains: String(value) },
      };

    case 'people':
      return {
        property,
        people: { contains: String(value) },
      };

    default:
      // Default to rich_text contains for unknown types
      return {
        property,
        rich_text: { contains: String(value) },
      };
  }
}

/**
 * Build advanced filter with custom operators
 * @param {string} property - Property name
 * @param {Object} filter - Advanced filter config
 * @param {string} propertyType - Property type
 * @returns {Object} Notion filter condition
 */
function buildAdvancedFilter(property, filter, propertyType) {
  const { operator, value } = filter;

  switch (operator) {
    case 'equals':
      return { property, [propertyType]: { equals: value } };
    case 'contains':
      return { property, rich_text: { contains: value } };
    case 'starts_with':
      return { property, rich_text: { starts_with: value } };
    case 'ends_with':
      return { property, rich_text: { ends_with: value } };
    case 'gt':
      return { property, number: { greater_than: value } };
    case 'gte':
      return { property, number: { greater_than_or_equal_to: value } };
    case 'lt':
      return { property, number: { less_than: value } };
    case 'lte':
      return { property, number: { less_than_or_equal_to: value } };
    case 'empty':
      return { property, [propertyType]: { is_empty: true } };
    case 'not_empty':
      return { property, [propertyType]: { is_not_empty: true } };
    case 'before':
      return { property, date: { before: value } };
    case 'after':
      return { property, date: { after: value } };
    case 'on_or_before':
      return { property, date: { on_or_before: value } };
    case 'on_or_after':
      return { property, date: { on_or_after: value } };
    case 'past_week':
      return { property, date: { past_week: {} } };
    case 'past_month':
      return { property, date: { past_month: {} } };
    case 'past_year':
      return { property, date: { past_year: {} } };
    default:
      return null;
  }
}

/**
 * Infer property type from property name and value
 * @param {string} property - Property name
 * @param {any} value - Property value
 * @returns {string} Inferred property type
 */
export function inferPropertyType(property, value) {
  const normalized = property.toLowerCase().replace(/[\s-]/g, '');

  if (normalized.includes('name') || normalized.includes('title')) {
    return 'title';
  }

  if (
    normalized.includes('description') ||
    normalized.includes('notes') ||
    normalized.includes('summary') ||
    normalized.includes('content') ||
    normalized.includes('story')
  ) {
    return 'rich_text';
  }

  if (normalized.includes('email')) {
    return 'email';
  }

  if (
    normalized.includes('url') ||
    normalized.includes('website') ||
    normalized.includes('link')
  ) {
    return 'url';
  }

  if (normalized.includes('phone')) {
    return 'phone_number';
  }

  if (
    normalized.includes('multi') ||
    normalized.includes('tags') ||
    normalized.includes('themes') ||
    normalized.includes('focus') ||
    normalized.includes('pillars')
  ) {
    return 'multi_select';
  }

  if (
    normalized.includes('category') ||
    normalized.includes('type') ||
    normalized.includes('priority') ||
    normalized.includes('stage') ||
    normalized.includes('status')
  ) {
    return 'select';
  }

  if (normalized.includes('date') || normalized.includes('deadline')) {
    return 'date';
  }

  if (
    normalized.includes('amount') ||
    normalized.includes('budget') ||
    normalized.includes('number') ||
    normalized.includes('count') ||
    normalized.includes('revenue') ||
    normalized.includes('probability')
  ) {
    return 'number';
  }

  if (
    normalized.includes('active') ||
    normalized.includes('featured') ||
    normalized.includes('checkbox') ||
    normalized.includes('indigenous') ||
    normalized.includes('community')
  ) {
    return 'checkbox';
  }

  if (
    normalized.includes('related') ||
    normalized.includes('relation') ||
    normalized.includes('projects') ||
    normalized.includes('people') ||
    normalized.includes('organisations') ||
    normalized.includes('organizations')
  ) {
    return 'relation';
  }

  if (normalized.includes('lead')) {
    return 'people';
  }

  return 'rich_text';
}

/**
 * Get database properties
 * @param {Object} options - Options for fetching properties
 * @returns {Promise<Object>} Database properties
 */
export async function getDatabaseProperties(options = {}) {
  const { notion, dbType, databaseId } = options;

  if (!notion) {
    return {};
  }

  try {
    const id = databaseId;
    const response = await notion.databases.retrieve({ database_id: id });

    const properties = {};
    for (const [key, value] of Object.entries(response.properties || {})) {
      properties[key] = {
        id: value.id,
        type: value.type,
        name: key,
      };
    }

    return properties;
  } catch (error) {
    console.error('Failed to get database properties:', error.message);
    return {};
  }
}

/**
 * Build sort objects for Notion queries
 * @param {Array} sorts - Sort configuration
 * @returns {Array} Notion sort objects
 */
export function buildSorts(sorts = []) {
  if (!Array.isArray(sorts) || sorts.length === 0) {
    return [];
  }

  return sorts.map(sort => {
    if (typeof sort === 'string') {
      return {
        property: sort,
        direction: 'ascending',
      };
    }

    return {
      property: sort.property || sort.propertyName,
      timestamp: sort.timestamp,
      direction: sort.direction || 'ascending',
    };
  });
}

export default {
  queryNotion,
  buildEnhancedFilter,
  buildPropertyFilterCondition,
  inferPropertyType,
  getDatabaseProperties,
  buildSorts,
};
