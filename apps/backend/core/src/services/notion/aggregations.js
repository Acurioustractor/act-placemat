/**
 * Notion Aggregations Module
 * Handles data aggregation functions for Notion queries
 */

/**
 * Get aggregated data from a database
 * @param {Object} options - Aggregation options
 * @returns {Promise<Object>} Aggregated data
 */
export async function getAggregatedData(options = {}) {
  const {
    databaseType,
    aggregationType,
    filters = {},
    databaseConfigs,
    queryNotion,
    getCacheKey,
    isCacheValid,
    setCache,
    getCache,
    cacheStats,
    extractors,
  } = options;

  const dbConfig = databaseConfigs[databaseType];
  if (!dbConfig || !dbConfig.id) {
    throw new Error(`Database ${databaseType} not configured`);
  }

  const cacheKey = getCacheKey(
    `aggregation_${databaseType}_${aggregationType}`,
    filters
  );

  if (isCacheValid(cacheKey)) {
    cacheStats.hits++;
    return getCache(cacheKey);
  }

  cacheStats.misses++;

  try {
    const results = await queryNotion({
      databaseId: dbConfig.id,
      filter: filters,
      sorts: [],
      pageSize: 100,
      getAllPages: true,
    });

    let aggregatedData;

    switch (aggregationType) {
      case 'count':
        aggregatedData = { count: results.length };
        break;

      case 'group_by_status':
        aggregatedData = groupByProperty(results, 'Status', extractors);
        break;

      case 'group_by_type':
        aggregatedData = groupByProperty(results, 'Type', extractors);
        break;

      case 'group_by_priority':
        aggregatedData = groupByProperty(results, 'Status', extractors);
        break;

      case 'sum_budget':
        aggregatedData = sumProperty(results, 'Budget', extractors);
        break;

      case 'avg_probability':
        aggregatedData = averageProperty(results, 'Probability', extractors);
        break;

      default:
        throw new Error(`Unsupported aggregation type: ${aggregationType}`);
    }

    setCache(cacheKey, aggregatedData);
    return aggregatedData;
  } catch (error) {
    console.error(
      `Failed to get aggregated data for ${databaseType}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Group results by a property value
 * @param {Array} results - Results to group
 * @param {string} propertyName - Property name to group by
 * @param {Object} extractors - Extractor functions
 * @returns {Object} Grouped results
 */
export function groupByProperty(results, propertyName, extractors = {}) {
  const { extractPlainText, extractSelect, extractMultiSelect } = extractors;
  const groups = {};

  results.forEach(item => {
    const property = item.properties[propertyName];
    let value = 'Unknown';

    if (property?.select?.name) {
      value = property.select.name;
    } else if (property?.multi_select) {
      value = extractMultiSelect(property.multi_select).join(', ') || 'None';
    } else if (property?.rich_text) {
      value = extractPlainText(property.rich_text) || 'None';
    }

    if (!groups[value]) {
      groups[value] = { count: 0, items: [] };
    }

    groups[value].count++;
    groups[value].items.push(item.id);
  });

  return groups;
}

/**
 * Sum a numeric property
 * @param {Array} results - Results to sum
 * @param {string} propertyName - Property name to sum
 * @param {Object} extractors - Extractor functions
 * @returns {Object} Sum result
 */
export function sumProperty(results, propertyName, extractors = {}) {
  let sum = 0;
  let count = 0;

  results.forEach(item => {
    const property = item.properties[propertyName];
    if (property?.number !== null && property?.number !== undefined) {
      sum += property.number;
      count++;
    }
  });

  return { sum, count, average: count > 0 ? sum / count : 0 };
}

/**
 * Calculate average of a numeric property
 * @param {Array} results - Results to average
 * @param {string} propertyName - Property name to average
 * @param {Object} extractors - Extractor functions
 * @returns {Object} Average result
 */
export function averageProperty(results, propertyName, extractors = {}) {
  const values = [];

  results.forEach(item => {
    const property = item.properties[propertyName];
    if (property?.number !== null && property?.number !== undefined) {
      values.push(property.number);
    }
  });

  const sum = values.reduce((acc, val) => acc + val, 0);
  return {
    average: values.length > 0 ? sum / values.length : 0,
    count: values.length,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
  };
}

/**
 * Create aggregation pipeline
 * @param {Array} results - Results to aggregate
 * @param {Object} config - Aggregation configuration
 * @returns {Object} Aggregated results
 */
export function createAggregationPipeline(results, config = {}) {
  const { groupBy, sum, average, count, filters } = config;

  let processedResults = results;

  // Apply filters first
  if (filters && Array.isArray(filters)) {
    processedResults = processedResults.filter(item => {
      return filters.every(filter => {
        const { property, operator, value } = filter;
        const propValue = item.properties[property];

        switch (operator) {
          case 'equals':
            return propValue?.select?.name === value;
          case 'contains':
            return propValue?.rich_text?.some(t => t.plain_text?.includes(value));
          case 'gt':
            return propValue?.number > value;
          case 'lt':
            return propValue?.number < value;
          default:
            return true;
        }
      });
    });
  }

  const aggregationResult = {
    total: processedResults.length,
    groups: null,
    sums: null,
    averages: null,
  };

  // Apply grouping
  if (groupBy) {
    aggregationResult.groups = groupByProperty(processedResults, groupBy);
  }

  // Apply sums
  if (sum && Array.isArray(sum)) {
    aggregationResult.sums = {};
    sum.forEach(prop => {
      aggregationResult.sums[prop] = sumProperty(processedResults, prop);
    });
  }

  // Apply averages
  if (average && Array.isArray(average)) {
    aggregationResult.averages = {};
    average.forEach(prop => {
      aggregationResult.averages[prop] = averageProperty(processedResults, prop);
    });
  }

  return aggregationResult;
}

/**
 * Get summary statistics for results
 * @param {Array} results - Results to analyze
 * @param {Array} numericProperties - Numeric properties to analyze
 * @returns {Object} Summary statistics
 */
export function getSummaryStatistics(results, numericProperties = []) {
  if (!results || results.length === 0) {
    return {
      totalCount: 0,
      numericStats: {},
      statusDistribution: {},
    };
  }

  const stats = {
    totalCount: results.length,
    numericStats: {},
    statusDistribution: {},
  };

  // Calculate numeric statistics
  numericProperties.forEach(prop => {
    stats.numericStats[prop] = averageProperty(results, prop);
  });

  // Get status distribution
  stats.statusDistribution = groupByProperty(results, 'Status');

  return stats;
}

export default {
  getAggregatedData,
  groupByProperty,
  sumProperty,
  averageProperty,
  createAggregationPipeline,
  getSummaryStatistics,
};
