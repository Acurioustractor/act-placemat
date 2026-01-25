/**
 * Enhanced Notion Service v2025 - Advanced Notion API Integration
 * Features:
 * - OAuth 2.0 authentication support
 * - Real-time webhook integration
 * - Advanced query capabilities with filters and aggregations
 * - Multi-database relationship mapping
 * - Performance optimizations and intelligent caching
 * - Enhanced error handling and retry logic
 *
 * Modular Architecture:
 * - client.js: Client initialization, connection, webhooks
 * - schema.js: Database schema definitions
 * - rateLimiter.js: Rate limiting and retry logic
 * - extractors.js: Data extraction utilities
 * - caching.js: Caching logic
 * - queryBuilder.js: Query building and filtering
 * - aggregations.js: Data aggregation functions
 * - dataFetchers.js: Data retrieval methods
 * - metrics.js: Performance metrics and health
 * - fallbacks.js: Fallback data
 * - creators.js: Create operations
 */

import { Client } from '@notionhq/client';
import enhancedIntegrationService from './enhancedIntegrationService.js';
import { cacheService } from './cacheService.js';

// Import all modules
import {
  initializeClientSync,
  testConnection,
  setupWebhookIntegration,
  handleWebhookEvent,
  getDatabaseTypeById as getDbTypeById,
  updateDatabaseTimestamp as updateDbTimestamp,
} from './notion/client.js';

import {
  getPartnersSchema,
  getProjectsSchema,
  getOpportunitiesSchema,
  getOrganizationsSchema,
  getActivitiesSchema,
  getPeopleSchema,
  getArtifactsSchema,
  getActionsSchema,
  getPlacesSchema,
  getAllSchemas,
} from './notion/schema.js';

import {
  createRateLimiter,
  checkRateLimit,
  createRetryConfig,
  withRetry,
} from './notion/rateLimiter.js';

import {
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
} from './notion/extractors.js';

import {
  createCache,
  getCacheKey,
  isCacheValid,
  setCache,
  getCache,
  clearCache,
  getCacheMetrics,
  getCacheMemoryEstimate,
} from './notion/caching.js';

import {
  queryNotion,
  buildEnhancedFilter,
  buildPropertyFilterCondition,
  inferPropertyType,
  getDatabaseProperties,
  buildSorts,
} from './notion/queryBuilder.js';

import {
  getAggregatedData,
  groupByProperty,
  sumProperty,
  averageProperty,
  createAggregationPipeline,
  getSummaryStatistics,
} from './notion/aggregations.js';

import {
  getPartners,
  getProjects,
  getProjectById,
  getOpportunities,
  getOrganizations,
  getRecentActivities,
  getPeople,
  getArtifacts,
  getActions,
  getPlaces,
  getPlace,
  searchAll,
} from './notion/dataFetchers.js';

import {
  createPerformanceMetrics,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  trackQuery,
  trackError,
  healthCheck,
  getCacheMemoryEstimate as getCacheMemEstimate,
  getCacheMetrics as getCacheMet,
  createMetricsReporter,
} from './notion/metrics.js';

import {
  getFallbackPartners,
  getFallbackProjects,
  getFallbackOpportunities,
  getFallbackOrganizations,
  getFallbackActivities,
  getFallbackPeople,
  getFallbackArtifacts,
  getFallbackActions,
  getFallbackPlaces,
} from './notion/fallbacks.js';

import {
  createProject,
  createOrganization,
  createGoodsProject,
  createTestEntities,
} from './notion/creators.js';

class NotionService {
  constructor() {
    // Initialize Notion client with enhanced OAuth support (synchronously for immediate use)
    this.notion = null;
    this.isOAuthAuthenticated = false;

    const clientResult = initializeClientSync();
    this.notion = clientResult.notion;
    this.isOAuthAuthenticated = clientResult.isOAuthAuthenticated;

    // Initialize rate limiter and retry config
    this.rateLimiter = createRateLimiter({
      maxRequestsPerSecond: 3,
      maxRequestsPerMinute: 100,
    });

    this.retryConfig = createRetryConfig({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBase: 2,
    });

    // Initialize performance metrics
    this.performanceMetrics = createPerformanceMetrics();

    // Initialize cache
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0,
    };

    // Enhanced database configuration with metadata
    this.databaseConfigs = {
      partners: {
        id: process.env.NOTION_PARTNERS_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getPartnersSchema(),
        lastUpdated: null,
      },
      projects: {
        id: process.env.NOTION_PROJECTS_DATABASE_ID || '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getProjectsSchema(),
        lastUpdated: null,
      },
      opportunities: {
        id: process.env.NOTION_OPPORTUNITIES_DATABASE_ID || '234ebcf9-81cf-804e-873f-f352f03c36da',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getOpportunitiesSchema(),
        lastUpdated: null,
      },
      organizations: {
        id: process.env.NOTION_ORGANIZATIONS_DATABASE_ID || '948f3946-7d1c-42f2-bd7e-1317a755e67b',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getOrganizationsSchema(),
        lastUpdated: null,
      },
      activities: {
        id: process.env.NOTION_ACTIVITIES_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getActivitiesSchema(),
        lastUpdated: null,
      },
      people: {
        id: process.env.NOTION_PEOPLE_DATABASE_ID || '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getPeopleSchema(),
        lastUpdated: null,
      },
      artifacts: {
        id: process.env.NOTION_ARTIFACTS_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getArtifactsSchema(),
        lastUpdated: null,
      },
      actions: {
        id: process.env.NOTION_ACTIONS_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getActionsSchema(),
        lastUpdated: null,
      },
      places: {
        id: process.env.NOTION_PLACES_DATABASE_ID || '25debcf9-81cf-808e-a632-cbc6ae78d582',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: getPlacesSchema(),
        lastUpdated: null,
      },
    };

    // Cache for database property metadata fetched from Notion
    this.databaseProperties = {};

    // Test connection and setup webhooks asynchronously (don't block constructor)
    this._asyncInit();

    console.log('🚀 Enhanced Notion Service v2025 initialized (modular)');
  }

  /**
   * Async initialization tasks (connection test, webhooks)
   */
  async _asyncInit() {
    try {
      // Test the connection
      await this.testConnection();

      // Set up webhook integration if OAuth is available
      if (this.isOAuthAuthenticated) {
        this.setupWebhookIntegration();
      }
    } catch (error) {
      console.error('❌ Async initialization failed:', error.message);
    }
  }

  /**
   * Initialize Notion client with OAuth support (legacy async method)
   */
  async initializeClient() {
    const clientResult = initializeClientSync();
    this.notion = clientResult.notion;
    this.isOAuthAuthenticated = clientResult.isOAuthAuthenticated;
    await this._asyncInit();
  }

  /**
   * Test Notion connection
   */
  async testConnection() {
    return testConnection(this.notion);
  }

  /**
   * Setup webhook integration for real-time updates
   */
  setupWebhookIntegration() {
    setupWebhookIntegration({
      onWebhook: (event) => this.handleWebhookEvent(event),
    });
  }

  /**
   * Handle webhook events from Notion
   */
  async handleWebhookEvent(event) {
    return handleWebhookEvent(event, {
      databaseConfigs: this.databaseConfigs,
      clearCache: (pattern) => clearCache(this.cache, pattern),
      getDatabaseTypeById: (id) => getDbTypeById(id, this.databaseConfigs),
      updateDatabaseTimestamp: (id) => updateDbTimestamp(id, {
        databaseConfigs: this.databaseConfigs,
        getDatabaseTypeById: (dbId) => getDbTypeById(dbId, this.databaseConfigs),
      }),
    });
  }

  /**
   * Get database type by ID
   */
  getDatabaseTypeById(databaseId) {
    return getDbTypeById(databaseId, this.databaseConfigs);
  }

  /**
   * Update database timestamp
   */
  updateDatabaseTimestamp(databaseId) {
    return updateDbTimestamp(databaseId, {
      databaseConfigs: this.databaseConfigs,
      getDatabaseTypeById: (id) => getDbTypeById(id, this.databaseConfigs),
    });
  }

  // ============================================================================
  // DATA FETCHERS - Delegated to dataFetchers module
  // ============================================================================

  async getPartners(useCache = true, filter = {}) {
    return getPartners({
      useCache,
      filter,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getProjects(optionsOrUseCache = {}, maybeFilter = {}) {
    return getProjects(optionsOrUseCache, maybeFilter, {
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getProjectById(projectId) {
    return getProjectById(projectId, {
      notion: this.notion,
      databaseConfigs: this.databaseConfigs,
    });
  }

  async getOpportunities(useCache = true, filter = {}) {
    return getOpportunities({
      useCache,
      filter,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getOrganizations(useCache = true, filter = {}) {
    return getOrganizations({
      useCache,
      filter,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getRecentActivities(useCache = true, limit = 10) {
    return getRecentActivities({
      useCache,
      limit,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getPeople(useCache = true) {
    return getPeople({
      useCache,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getArtifacts(useCache = true) {
    return getArtifacts({
      useCache,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getActions(useCache = true) {
    return getActions({
      useCache,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getPlaces(useCache = true) {
    return getPlaces({
      useCache,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      cacheStats: this.cacheStats,
      notion: this.notion,
    });
  }

  async getPlace(placeId) {
    const places = await this.getPlaces();
    return places.find(place => place.id === placeId) || null;
  }

  async searchAll(query, useCache = true) {
    return searchAll(query, {
      useCache,
      databaseConfigs: this.databaseConfigs,
      cache: this.cache,
      notion: this.notion,
    });
  }

  // ============================================================================
  // CREATORS - Delegated to creators module
  // ============================================================================

  async createProject(projectData) {
    return createProject(projectData, {
      notion: this.notion,
      databaseConfigs: this.databaseConfigs,
      clearCache: (pattern) => clearCache(this.cache, pattern),
    });
  }

  async createOrganization(orgData) {
    return createOrganization(orgData, {
      notion: this.notion,
      databaseConfigs: this.databaseConfigs,
      clearCache: (pattern) => clearCache(this.cache, pattern),
    });
  }

  async createGoodsProject() {
    return createGoodsProject({
      notion: this.notion,
      databaseConfigs: this.databaseConfigs,
      clearCache: (pattern) => clearCache(this.cache, pattern),
    });
  }

  async createTestEntities() {
    return createTestEntities({
      notion: this.notion,
      databaseConfigs: this.databaseConfigs,
      clearCache: (pattern) => clearCache(this.cache, pattern),
    });
  }

  // ============================================================================
  // FALLBACKS - Delegated to fallbacks module
  // ============================================================================

  getFallbackPartners() {
    return getFallbackPartners();
  }

  getFallbackProjects() {
    return getFallbackProjects();
  }

  getFallbackOpportunities() {
    return getFallbackOpportunities();
  }

  getFallbackOrganizations() {
    return getFallbackOrganizations();
  }

  getFallbackActivities() {
    return getFallbackActivities();
  }

  getFallbackPeople() {
    return getFallbackPeople();
  }

  getFallbackArtifacts() {
    return getFallbackArtifacts();
  }

  getFallbackActions() {
    return getFallbackActions();
  }

  getFallbackPlaces() {
    return getFallbackPlaces();
  }

  // ============================================================================
  // METRICS - Delegated to metrics module
  // ============================================================================

  async healthCheck() {
    return healthCheck({
      notion: this.notion,
      isOAuthAuthenticated: this.isOAuthAuthenticated,
      databaseConfigs: this.databaseConfigs,
      performanceMetrics: this.performanceMetrics,
      cacheStats: this.cacheStats,
      getCacheMetrics: () => getCacheMet(this.cacheStats, this.cache),
      queryNotion: async (options) => {
        const { databaseId, filter, sorts, pageSize, getAllPages } = options;
        return queryNotion({
          notion: this.notion,
          databaseId,
          filter,
          sorts,
          pageSize,
          getAllPages,
        });
      },
    });
  }

  getPerformanceMetrics() {
    return getPerformanceMetrics(this.performanceMetrics);
  }

  getCacheMetrics() {
    return getCacheMet(this.cacheStats, this.cache);
  }

  getCacheMemoryEstimate() {
    return getCacheMemEstimate(this.cache);
  }

  resetPerformanceMetrics() {
    resetPerformanceMetrics(this.performanceMetrics);
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0,
    };
    console.log('📊 Notion service performance metrics reset');
  }

  // ============================================================================
  // CACHING - Delegated to caching module
  // ============================================================================

  getCacheKey(type, filter = {}, sorts = []) {
    return getCacheKey(type, filter, sorts);
  }

  isCacheValid(cacheKey) {
    return isCacheValid(this.cache, cacheKey);
  }

  setCache(cacheKey, data) {
    return setCache(this.cache, cacheKey, data);
  }

  getCache(cacheKey) {
    return getCache(this.cache, cacheKey);
  }

  clearCache(pattern = null) {
    return clearCache(this.cache, pattern);
  }

  // ============================================================================
  // QUERY BUILDER - Delegated to queryBuilder module
  // ============================================================================

  async queryNotion(databaseId, filter = {}, sorts = [], pageSize = 100, options = {}) {
    return queryNotion({
      notion: this.notion,
      databaseId,
      filter,
      sorts,
      pageSize,
      ...options,
    });
  }

  async getDatabaseProperties(dbType, databaseId) {
    if (!this.databaseConfigs[dbType]?.id && !databaseId) {
      return {};
    }
    return getDatabaseProperties({
      notion: this.notion,
      dbType,
      databaseId: databaseId || this.databaseConfigs[dbType]?.id,
    });
  }

  buildEnhancedFilter(filter, propertyTypes = {}, dbType = null) {
    return buildEnhancedFilter(filter, propertyTypes, dbType);
  }

  buildPropertyFilterCondition(property, value, propertyTypes = {}) {
    return buildPropertyFilterCondition(property, value, propertyTypes);
  }

  inferPropertyType(property, value) {
    return inferPropertyType(property, value);
  }

  // ============================================================================
  // AGGREGATIONS - Delegated to aggregations module
  // ============================================================================

  async getAggregatedData(databaseType, aggregationType, filters = {}) {
    return getAggregatedData({
      databaseType,
      aggregationType,
      filters,
      databaseConfigs: this.databaseConfigs,
      queryNotion: async (options) => this.queryNotion(
        options.databaseId,
        options.filter,
        options.sorts,
        options.pageSize,
        options
      ),
      getCacheKey: (type, filter) => this.getCacheKey(type, filter),
      isCacheValid: (key) => this.isCacheValid(key),
      setCache: (key, data) => this.setCache(key, data),
      getCache: (key) => this.getCache(key),
      cacheStats: this.cacheStats,
      extractors: {
        extractPlainText,
        extractSelect,
        extractMultiSelect,
      },
    });
  }

  groupByProperty(results, propertyName) {
    return groupByProperty(results, propertyName, {
      extractPlainText,
      extractSelect,
      extractMultiSelect,
    });
  }

  sumProperty(results, propertyName) {
    return sumProperty(results, propertyName);
  }

  averageProperty(results, propertyName) {
    return averageProperty(results, propertyName);
  }

  // ============================================================================
  // RATE LIMITER - Delegated to rateLimiter module
  // ============================================================================

  async checkRateLimit() {
    return checkRateLimit(this.rateLimiter);
  }

  async withRetry(operation, context = '') {
    return withRetry(operation, {
      retryConfig: this.retryConfig,
      rateLimiter: this.rateLimiter,
      performanceMetrics: this.performanceMetrics,
      context,
    });
  }

  // ============================================================================
  // EXTRACTORS - Delegated to extractors module
  // ============================================================================

  extractPlainText(richTextArray) {
    return extractPlainText(richTextArray);
  }

  extractRollup(rollupProperty) {
    return extractRollup(rollupProperty);
  }

  extractTitle(titleArray) {
    return extractTitle(titleArray);
  }

  extractSelect(selectObj) {
    return extractSelect(selectObj);
  }

  extractMultiSelect(multiSelectArray) {
    return extractMultiSelect(multiSelectArray);
  }

  extractNumber(numberObj) {
    return extractNumber(numberObj);
  }

  extractEmail(emailObj) {
    return extractEmail(emailObj);
  }

  extractJSONField(richTextArray, options = {}) {
    return extractJSONField(richTextArray, options);
  }

  extractCheckbox(checkboxObj) {
    return extractCheckbox(checkboxObj);
  }

  extractRelation(relationArray) {
    return extractRelation(relationArray);
  }

  async getCompleteRelationIds(targetDatabaseId, filterProperty, projectId) {
    return getCompleteRelationIds({
      targetDatabaseId,
      filterProperty,
      projectId,
      queryNotion: (dbId, filter, sorts, size, opts) =>
        this.queryNotion(dbId, filter, sorts, size, opts),
    });
  }

  extractFile(fileObj) {
    return extractFile(fileObj);
  }

  extractFileUrl(filesProperty) {
    return extractFileUrl(filesProperty);
  }

  extractDate(dateObj) {
    return extractDate(dateObj);
  }

  extractPerson(peopleArray) {
    return extractPerson(peopleArray);
  }

  extractUrl(urlObj) {
    return extractUrl(urlObj);
  }

  // ============================================================================
  // SCHEMAS - Delegated to schema module
  // ============================================================================

  getPartnersSchema() {
    return getPartnersSchema();
  }

  getProjectsSchema() {
    return getProjectsSchema();
  }

  getOpportunitiesSchema() {
    return getOpportunitiesSchema();
  }

  getOrganizationsSchema() {
    return getOrganizationsSchema();
  }

  getActivitiesSchema() {
    return getActivitiesSchema();
  }

  getPeopleSchema() {
    return getPeopleSchema();
  }

  getArtifactsSchema() {
    return getArtifactsSchema();
  }

  getActionsSchema() {
    return getActionsSchema();
  }

  getPlacesSchema() {
    return getPlacesSchema();
  }
}

// Export singleton instance
export const notionService = new NotionService();
export default notionService;
