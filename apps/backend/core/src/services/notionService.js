/**
 * Enhanced Notion Service v2025 - Advanced Notion API Integration
 * Features:
 * - OAuth 2.0 authentication support
 * - Real-time webhook integration
 * - Advanced query capabilities with filters and aggregations
 * - Multi-database relationship mapping
 * - Performance optimizations and intelligent caching
 * - Enhanced error handling and retry logic
 */

import { Client } from '@notionhq/client';
import enhancedIntegrationService from './enhancedIntegrationService.js';
import { cacheService } from './cacheService.js';

class NotionService {
  constructor() {
    // Initialize Notion client with enhanced OAuth support (synchronously for immediate use)
    this.notion = null;
    this.isOAuthAuthenticated = false;
    this._initializeClientSync();

    // Enhanced database configuration with metadata
    this.databaseConfigs = {
      partners: {
        id: process.env.NOTION_PARTNERS_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getPartnersSchema(),
        lastUpdated: null,
      },
      projects: {
        id: process.env.NOTION_PROJECTS_DATABASE_ID || '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getProjectsSchema(),
        lastUpdated: null,
      },
      opportunities: {
        id: process.env.NOTION_OPPORTUNITIES_DATABASE_ID || '234ebcf9-81cf-804e-873f-f352f03c36da',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getOpportunitiesSchema(),
        lastUpdated: null,
      },
      organizations: {
        id: process.env.NOTION_ORGANIZATIONS_DATABASE_ID || '948f3946-7d1c-42f2-bd7e-1317a755e67b',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getOrganizationsSchema(),
        lastUpdated: null,
      },
      activities: {
        id: process.env.NOTION_ACTIVITIES_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getActivitiesSchema(),
        lastUpdated: null,
      },
      people: {
        id: process.env.NOTION_PEOPLE_DATABASE_ID || '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getPeopleSchema(),
        lastUpdated: null,
      },
      artifacts: {
        id: process.env.NOTION_ARTIFACTS_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getArtifactsSchema(),
        lastUpdated: null,
      },
      actions: {
        id: process.env.NOTION_ACTIONS_DATABASE_ID,
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getActionsSchema(),
        lastUpdated: null,
      },
      places: {
        id: process.env.NOTION_PLACES_DATABASE_ID || '25debcf9-81cf-808e-a632-cbc6ae78d582',
        dataSourceId: null, // Will be populated when first accessed
        version: '2025.1',
        schema: this.getPlacesSchema(),
        lastUpdated: null,
      },
    };

    // Enhanced caching with TTL and performance metrics
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0,
    };

    // Query performance tracking
    this.performanceMetrics = {
      averageQueryTime: 0,
      queryCount: 0,
      slowQueries: [],
      errorCount: 0,
    };

    // Cache for database property metadata fetched from Notion
    this.databaseProperties = {};

    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBase: 2,
    };

    // Rate limiting
    this.rateLimiter = {
      requests: [],
      maxRequestsPerSecond: 3,
      maxRequestsPerMinute: 100,
    };

    console.log('🚀 Enhanced Notion Service v2025 initialized');
  }

  /**
   * Initialize Notion client synchronously (for immediate use in constructor)
   */
  _initializeClientSync() {
    try {
      // Try OAuth token first
      const oauthToken = process.env.NOTION_OAUTH_TOKEN;
      const regularToken = process.env.NOTION_TOKEN;

      if (oauthToken) {
        this.notion = new Client({
          auth: oauthToken,
          // NOTE: Not specifying notionVersion to use the default API which includes databases.query
          // The 2025-09-03 version deprecates databases.query in favor of dataSources.query
          timeoutMs: 60000,
          logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
        });
        this.isOAuthAuthenticated = true;
        console.log('✅ Notion OAuth client initialized (SDK v2)');
      } else if (regularToken) {
        this.notion = new Client({
          auth: regularToken,
          // NOTE: Not specifying notionVersion to use the default API which includes databases.query
          // The 2025-09-03 version deprecates databases.query in favor of dataSources.query
          timeoutMs: 60000,
          logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
        });
        console.log('✅ Notion regular token client initialized (SDK v2)');
      } else {
        console.warn('⚠️ No Notion authentication token found');
        return;
      }

      // Test connection and setup webhooks asynchronously (don't block constructor)
      this._asyncInit();
    } catch (error) {
      console.error('❌ Failed to initialize Notion client:', error.message);
    }
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
    this._initializeClientSync();
    await this._asyncInit();
  }

  /**
   * Test Notion connection
   */
  async testConnection() {
    if (!this.notion) return false;

    try {
      const user = await this.notion.users.me();
      console.log('✅ Notion connection test successful, user:', user.name);
      return true;
    } catch (error) {
      console.error('❌ Notion connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Setup webhook integration for real-time updates
   */
  setupWebhookIntegration() {
    try {
      // Listen for enhanced integration events
      enhancedIntegrationService.addEventListener('notion_webhook', event => {
        this.handleWebhookEvent(event);
      });

      console.log('🔗 Notion webhook integration setup complete');
    } catch (error) {
      console.warn('⚠️ Failed to setup webhook integration:', error.message);
    }
  }

  /**
   * Handle webhook events from Notion
   */
  async handleWebhookEvent(event) {
    try {
      const { data } = event;

      // Clear relevant caches - handle both database_id events or fall back to global clear
      const relevantId = data.data_source_id || data.database_id;
      if (relevantId) {
        // For data_source_id, we need to reverse-lookup the database type
        let dbType;
        if (data.database_id) {
          dbType = this.getDatabaseTypeById(data.database_id);
        }

        if (dbType) {
          this.clearCache(dbType);
          console.log(`🔄 Cleared cache for ${dbType} due to webhook event`);
        } else if (data.data_source_id) {
          // Fallback: we do not currently map data_source_ids, so clear everything
          this.clearCache();
          console.log('🔄 Cleared all Notion caches due to webhook event (no database_id provided)');
        }
      }

      // Update last modified timestamps (maintain backward compatibility)
      if (data.database_id) {
        this.updateDatabaseTimestamp(data.database_id);
      }
    } catch (error) {
      console.warn('⚠️ Error handling webhook event:', error.message);
    }
  }

  /**
   * Get database type by ID
   */
  getDatabaseTypeById(databaseId) {
    for (const [type, config] of Object.entries(this.databaseConfigs)) {
      if (config.id === databaseId) {
        return type;
      }
    }
    return null;
  }

  /**
   * Update database timestamp
   */
  updateDatabaseTimestamp(databaseId) {
    const dbType = this.getDatabaseTypeById(databaseId);
    if (dbType && this.databaseConfigs[dbType]) {
      this.databaseConfigs[dbType].lastUpdated = new Date().toISOString();
    }
  }

  /**
   * Enhanced database schema methods for v2025
   */
  getPartnersSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Type: {
          type: 'select',
          options: ['Community', 'Corporate', 'Government', 'Academic', 'NGO'],
        },
        Category: {
          type: 'select',
          options: [
            'Indigenous-led',
            'Regional',
            'Metropolitan',
            'National',
            'International',
          ],
        },
        Description: { type: 'rich_text' },
        'Contribution Type': { type: 'rich_text' },
        'Relationship Strength': {
          type: 'select',
          options: ['Cornerstone', 'Strong', 'Active', 'Developing', 'Dormant'],
        },
        'Collaboration Focus': { type: 'multi_select' },
        'Impact Story': { type: 'rich_text' },
        Featured: { type: 'checkbox' },
        'Logo URL': { type: 'url' },
        Location: { type: 'rich_text' },
        'Established Date': { type: 'date' },
        Status: { type: 'select', options: ['Active', 'Inactive', 'Pending'] },
      },
      aggregations: ['count', 'group_by_type', 'group_by_relationship_strength'],
      relationships: ['projects', 'people', 'opportunities'],
    };
  }

  getProjectsSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Description: { type: 'rich_text' },
        Status: {
          type: 'select',
          options: [
            'Active 🔥',
            'Preparation 📋',
            'Ideation 🌀',
            'Completed ✅',
            'On Hold ⏸️',
          ],
        },
        Area: {
          type: 'select',
          options: [
            'Technology',
            'Justice Reform',
            'Indigenous Rights',
            'Economic Freedom',
            'Art',
            'Global community',
          ],
        },
        Lead: { type: 'rich_text' },
        Funding: {
          type: 'select',
          options: ['Funded', 'Seeking', 'Unfunded', 'Partial'],
        },
        'Start Date': { type: 'date' },
        'End Date': { type: 'date' },
        Budget: { type: 'number' },
        Tags: { type: 'multi_select' },
        Featured: { type: 'checkbox' },
      },
      aggregations: ['count', 'sum_budget', 'group_by_status', 'group_by_area'],
      relationships: ['partners', 'people', 'opportunities', 'artifacts'],
    };
  }

  getOpportunitiesSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Description: { type: 'rich_text' },
        Type: {
          type: 'select',
          options: ['Grant', 'Partnership', 'Collaboration', 'Government Grant'],
        },
        Stage: {
          type: 'select',
          options: [
            'Proposal 📄',
            'Initial Contact 📞',
            'Application Submitted 📋',
            'Negotiation 🤝',
            'Won ✅',
            'Lost ❌',
          ],
        },
        Amount: { type: 'number' },
        Probability: { type: 'number' },
        Deadline: { type: 'date' },
        Contact: { type: 'rich_text' },
        Requirements: { type: 'rich_text' },
        Tags: { type: 'multi_select' },
      },
      aggregations: ['count', 'sum_amount', 'avg_probability', 'group_by_stage'],
      relationships: ['projects', 'partners', 'people'],
    };
  }

  getOrganizationsSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Type: { type: 'select', options: ['Partner', 'Network', 'Funder', 'Supplier'] },
        Description: { type: 'rich_text' },
        Website: { type: 'url' },
        Contact: { type: 'rich_text' },
        Location: { type: 'rich_text' },
        'Relationship Type': {
          type: 'select',
          options: [
            'Strategic Partner',
            'Community Partner',
            'Network Member',
            'Funding Partner',
          ],
        },
        Active: { type: 'checkbox' },
      },
      aggregations: ['count', 'group_by_type', 'group_by_relationship_type'],
      relationships: ['projects', 'people', 'opportunities'],
    };
  }

  getActivitiesSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Type: {
          type: 'select',
          options: ['Event', 'Meeting', 'Workshop', 'Presentation'],
        },
        Description: { type: 'rich_text' },
        Date: { type: 'date' },
        Status: {
          type: 'select',
          options: ['Planned', 'In Progress', 'Completed', 'Cancelled'],
        },
        Impact: { type: 'select', options: ['High', 'Medium', 'Low'] },
      },
      aggregations: ['count', 'group_by_type', 'group_by_status'],
      relationships: ['projects', 'people', 'organizations'],
    };
  }

  getPeopleSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Email: { type: 'email' },
        Role: { type: 'select' },
        Department: { type: 'select' },
        'Relationship Type': {
          type: 'select',
          options: ['Staff', 'Partner', 'Community', 'Stakeholder'],
        },
        'Influence Level': {
          type: 'select',
          options: ['Decision Maker', 'Influencer', 'User', 'Observer'],
        },
        'Communication Preference': {
          type: 'select',
          options: ['Email', 'Phone', 'In-person', 'Slack'],
        },
        'Contact Frequency': {
          type: 'select',
          options: ['Daily', 'Weekly', 'Monthly', 'Quarterly'],
        },
        'Relationship Strength': {
          type: 'select',
          options: ['Strong', 'Moderate', 'Weak'],
        },
        Skills: { type: 'multi_select' },
        Location: { type: 'rich_text' },
        Active: { type: 'checkbox' },
        'Start Date': { type: 'date' },
        Tags: { type: 'multi_select' },
        'Related Projects': { type: 'relation' },
      },
      aggregations: ['count', 'group_by_role', 'group_by_relationship_type'],
      relationships: ['projects', 'organizations', 'artifacts', 'actions'],
    };
  }

  getArtifactsSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Description: { type: 'rich_text' },
        Type: {
          type: 'select',
          options: ['Document', 'Image', 'Video', 'Audio', 'Archive'],
        },
        Format: { type: 'select', options: ['PDF', 'JPG', 'PNG', 'MP4', 'MP3', 'ZIP'] },
        Status: {
          type: 'select',
          options: ['Draft', 'Review', 'Published', 'Archived'],
        },
        Purpose: {
          type: 'select',
          options: ['Internal Use', 'Public', 'Partner', 'Archive'],
        },
        'Access Level': {
          type: 'select',
          options: ['Public', 'Internal', 'Restricted'],
        },
        'File Size': { type: 'number' },
        'Created By': { type: 'rich_text' },
        'Created Date': { type: 'date' },
        Tags: { type: 'multi_select' },
        'Related Projects': { type: 'relation' },
      },
      aggregations: ['count', 'group_by_type', 'group_by_status'],
      relationships: ['projects', 'people', 'actions'],
    };
  }

  getActionsSchema() {
    return {
      properties: {
        Name: { type: 'title' },
        Description: { type: 'rich_text' },
        Status: {
          type: 'select',
          options: ['Planning', 'In Progress', 'Done', 'Blocked', 'Cancelled'],
        },
        Priority: { type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
        Category: {
          type: 'select',
          options: [
            'Community Development',
            'Partnership',
            'Program Development',
            'Funding',
            'Community Events',
          ],
        },
        'Assigned To': { type: 'rich_text' },
        'Due Date': { type: 'date' },
        'Start Date': { type: 'date' },
        'Completed Date': { type: 'date' },
        Tags: { type: 'multi_select' },
        'Related Projects': { type: 'relation' },
        'Related People': { type: 'relation' },
        Impact: { type: 'select', options: ['Very High', 'High', 'Medium', 'Low'] },
        Effort: { type: 'select', options: ['High', 'Medium', 'Low'] },
        Outcome: { type: 'rich_text' },
        Lessons: { type: 'rich_text' },
      },
      aggregations: [
        'count',
        'group_by_status',
        'group_by_priority',
        'group_by_category',
      ],
      relationships: ['projects', 'people', 'artifacts'],
    };
  }

  getPlacesSchema() {
    return {
      properties: {
        Place: { type: 'title' },
        'Western Name': { type: 'rich_text' },
        State: {
          type: 'select',
          options: ['ACT', 'SA', 'WA', 'Vic', 'Tas', 'NT', 'NSW', 'Qld'],
        },
        Map: { type: 'rich_text' }, // Place property with coordinates and address
        Protocols: { type: 'rich_text' },
        Organisations: { type: 'relation' },
        People: { type: 'relation' },
        Projects: { type: 'relation' },
      },
      aggregations: ['count', 'group_by_state'],
      relationships: ['projects', 'organisations', 'people'],
    };
  }

  /**
   * Enhanced rate limiting for API requests
   */
  async checkRateLimit() {
    const now = Date.now();

    // Clean old requests
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < 60000 // Keep requests from last minute
    );

    // Check per-second limit
    const recentRequests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < 1000
    );

    if (recentRequests.length >= this.rateLimiter.maxRequestsPerSecond) {
      const waitTime = 1000 - (now - recentRequests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check per-minute limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.rateLimiter.requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.rateLimiter.requests.push(now);
  }

  /**
   * Enhanced retry logic with exponential backoff
   */
  async withRetry(operation, context = '') {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        await this.checkRateLimit();
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Track performance metrics
        this.performanceMetrics.queryCount++;
        this.performanceMetrics.averageQueryTime =
          (this.performanceMetrics.averageQueryTime *
            (this.performanceMetrics.queryCount - 1) +
            duration) /
          this.performanceMetrics.queryCount;

        if (duration > 5000) {
          // Track slow queries (>5s)
          this.performanceMetrics.slowQueries.push({
            context,
            duration,
            timestamp: new Date().toISOString(),
          });

          // Keep only last 10 slow queries
          if (this.performanceMetrics.slowQueries.length > 10) {
            this.performanceMetrics.slowQueries =
              this.performanceMetrics.slowQueries.slice(-10);
          }
        }

        return result;
      } catch (error) {
        lastError = error;
        this.performanceMetrics.errorCount++;

        // Don't retry on authentication errors
        if (error.code === 'unauthorized' || error.status === 401) {
          throw error;
        }

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay *
              Math.pow(this.retryConfig.exponentialBase, attempt),
            this.retryConfig.maxDelay
          );

          console.warn(
            `⚠️ Notion API attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
            error.message
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(
      `❌ Notion API operation failed after ${this.retryConfig.maxRetries + 1} attempts:`,
      lastError.message
    );
    throw lastError;
  }

  // Helper methods for data extraction
  extractPlainText(richTextArray) {
    if (!Array.isArray(richTextArray)) return '';
    return richTextArray.map(item => item.plain_text || '').join('');
  }

  extractRollup(rollupProperty) {
    if (!rollupProperty?.rollup) return '';
    
    const rollup = rollupProperty.rollup;
    
    // Handle different rollup types
    if (rollup.type === 'rich_text' && rollup.rich_text) {
      return this.extractPlainText(rollup.rich_text);
    }
    
    if (rollup.type === 'title' && rollup.title) {
      return this.extractTitle(rollup.title);
    }
    
    if (rollup.type === 'array' && rollup.array && rollup.array.length > 0) {
      // For array rollups, extract the first item based on its type
      const firstItem = rollup.array[0];
      if (firstItem.rich_text) {
        return this.extractPlainText(firstItem.rich_text);
      }
      if (firstItem.title) {
        return this.extractTitle(firstItem.title);
      }
    }
    
    // For simple text rollups
    if (rollup.type === 'text' && rollup.text) {
      return rollup.text;
    }
    
    return '';
  }

  extractTitle(titleArray) {
    if (!Array.isArray(titleArray)) return '';
    return titleArray.map(item => item.plain_text || '').join('');
  }

  extractSelect(selectObj) {
    return selectObj?.name || '';
  }

  extractMultiSelect(multiSelectArray) {
    if (!Array.isArray(multiSelectArray)) return [];
    return multiSelectArray.map(item => item.name || '').filter(name => name);
  }

  extractNumber(numberObj) {
    return numberObj || 0;
  }

  extractEmail(emailObj) {
    return emailObj?.email || '';
  }

  extractJSONField(richTextArray) {
    const plainText = this.extractPlainText(richTextArray);
    if (!plainText) return null;
    try {
      return JSON.parse(plainText);
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON field:', error.message);
      return null;
    }
  }

  extractCheckbox(checkboxObj) {
    return checkboxObj?.checkbox === true;
  }

  extractRelation(relationArray) {
    if (!Array.isArray(relationArray)) return [];
    return relationArray.map(item => item.id).filter(id => id);
  }

  /**
   * Get complete relation count by querying the target database
   * This bypasses the 25-item limit in relation properties
   */
  async getCompleteRelationIds(targetDatabaseId, filterProperty, projectId) {
    if (!targetDatabaseId || !filterProperty || !projectId) {
      return [];
    }

    try {
      // Build proper Notion API relation filter
      const filter = {
        property: filterProperty,
        relation: {
          contains: projectId
        }
      };

      const results = await this.queryNotion(targetDatabaseId, filter, [], 100, {
        getAllPages: true // This will fetch ALL pages, not just first 100
      });

      return results.map(item => item.id);
    } catch (error) {
      console.warn(`Failed to get complete relations from ${targetDatabaseId}:`, error.message);
      return [];
    }
  }

  extractFile(fileObj) {
    if (!fileObj) return null;
    if (fileObj.type === 'external') {
      return fileObj.external?.url || null;
    } else if (fileObj.type === 'file') {
      return fileObj.file?.url || null;
    }
    return null;
  }

  extractFileUrl(filesProperty) {
    if (!filesProperty || !filesProperty.files) return null;
    const files = filesProperty.files;
    if (!Array.isArray(files) || files.length === 0) return null;
    return this.extractFile(files[0]);
  }

  extractDate(dateObj) {
    return dateObj?.start || null;
  }

  extractPerson(peopleArray) {
    if (!Array.isArray(peopleArray) || peopleArray.length === 0) return null;
    const person = peopleArray[0];
    return {
      id: person.id,
      name: person.name || 'Unknown',
      avatarUrl: person.avatar_url,
      type: person.type
    };
  }

  extractUrl(urlObj) {
    return urlObj || null;
  }

  extractCheckbox(checkboxObj) {
    return Boolean(checkboxObj);
  }

  // Cache management
  getCacheKey(type, filter = {}, sorts = []) {
    return `${type}_${JSON.stringify(filter)}_${JSON.stringify(sorts)}`;
  }

  isCacheValid(cacheKey) {
    if (!this.cache.has(cacheKey)) return false;
    const cached = this.cache.get(cacheKey);
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  setCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  getCache(cacheKey) {
    return this.cache.get(cacheKey)?.data;
  }

  clearCache(pattern = null) {
    if (pattern) {
      Array.from(this.cache.keys())
        .filter(key => key.includes(pattern))
        .forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Enhanced Notion query method that uses official databases.query with automatic pagination.
   */
  async queryNotion(databaseId, filter = {}, sorts = [], pageSize = 100, options = {}) {
    // Support both old format (string ID) and new format (config object)
    const actualDatabaseId =
      typeof databaseId === 'string' ? databaseId : databaseId?.id;

    if (!actualDatabaseId) {
      throw new Error('Database ID not configured');
    }

    if (!this.notion) {
      throw new Error(
        'Notion client not initialized - check NOTION_TOKEN environment variable'
      );
    }

    // Notion SDK v5 doesn't expose databases.query - we use notion.request() instead

    const dbType = this.getDatabaseTypeById(actualDatabaseId);
    let propertyTypes = {};

    // Fetch and cache property metadata when we need to build filters
    if (filter && Object.keys(filter).length > 0) {
      propertyTypes = await this.getDatabaseProperties(dbType, actualDatabaseId);
    }

    return await this.withRetry(async () => {
      let allResults = [];
      let hasMore = true;
      let nextCursor = options.startCursor || null;

      while (
        hasMore &&
        (!options.maxPages || allResults.length < options.maxPages * pageSize)
      ) {
        const queryPayload = {
          page_size: Math.min(pageSize, 100),
        };

        if (nextCursor) {
          queryPayload.start_cursor = nextCursor;
        }

        if (filter && Object.keys(filter).length > 0) {
          queryPayload.filter = this.buildEnhancedFilter(
            filter,
            propertyTypes,
            dbType
          );
        }

        if (sorts && sorts.length > 0) {
          queryPayload.sorts = sorts;
        }

        // Using databases.query() which is available in SDK v2
        console.log(`📤 Querying database ${actualDatabaseId}`);
        const result = await this.notion.databases.query({
          database_id: actualDatabaseId,
          ...queryPayload
        });
        console.log(`📥 Got ${result?.results?.length || 0} results`);

        if (result?.results) {
          allResults = allResults.concat(result.results);
        }

        hasMore = result?.has_more || false;
        nextCursor = result?.next_cursor || null;

        if (!options.getAllPages) {
          break;
        }
      }

      return allResults;
    }, `queryNotion(${actualDatabaseId})`);
  }

  /**
   * Retrieve and cache database property metadata from Notion.
   */
  async getDatabaseProperties(dbType, databaseId) {
    const cacheKey = databaseId || dbType;

    if (!cacheKey) {
      return {};
    }

    if (!this.databaseProperties[cacheKey]) {
      try {
        // Using databases.retrieve() which is available in SDK v2
        const response = await this.notion.databases.retrieve({
          database_id: databaseId
        });

        const propertyTypes = {};
        if (response && response.properties) {
          Object.entries(response.properties).forEach(([name, info]) => {
            propertyTypes[name] = info.type;
          });
        }

        this.databaseProperties[cacheKey] = propertyTypes;
      } catch (error) {
        console.warn(
          `⚠️ Failed to retrieve Notion database metadata for ${databaseId}:`,
          error.message
        );
        this.databaseProperties[cacheKey] = {};
      }
    }

    return this.databaseProperties[cacheKey];
  }

  /**
   * Build enhanced filter with v2025 capabilities
   */
  buildEnhancedFilter(filter, propertyTypes = {}, dbType = null) {
    // If it's already a valid Notion filter, return as-is
    if (filter.and || filter.or || filter.property) {
      return filter;
    }

    // Build filter from simple object format
    const conditions = [];

    for (const [property, value] of Object.entries(filter)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          const orConditions = value
            .map(item =>
              this.buildPropertyFilterCondition(
                property,
                item,
                propertyTypes
              )
            )
            .filter(Boolean);

          if (orConditions.length === 1) {
            conditions.push(orConditions[0]);
          } else if (orConditions.length > 1) {
            conditions.push({ or: orConditions });
          }
        } else if (typeof value === 'string') {
          const condition = this.buildPropertyFilterCondition(
            property,
            value,
            propertyTypes
          );
          if (condition) {
            conditions.push(condition);
          }
        } else if (typeof value === 'boolean') {
          const condition = this.buildPropertyFilterCondition(
            property,
            value,
            propertyTypes
          );
          if (condition) {
            conditions.push(condition);
          }
        } else if (typeof value === 'number') {
          const condition = this.buildPropertyFilterCondition(
            property,
            value,
            propertyTypes
          );
          if (condition) {
            conditions.push(condition);
          }
        } else if (value.type) {
          // Advanced filter condition
          conditions.push({
            property,
            [value.type]: value.condition,
          });
        }
      }
    }

    if (conditions.length === 0) {
      return {};
    } else if (conditions.length === 1) {
      return conditions[0];
    } else {
      return { and: conditions };
    }
  }

  buildPropertyFilterCondition(property, value, propertyTypes = {}) {
    if (value === null || value === undefined) {
      return null;
    }

    if (
      typeof value === 'object' &&
      (value.and || value.or || value.property || value.timestamp)
    ) {
      // Assume caller provided a raw Notion filter
      return value;
    }

    if (typeof value === 'object' && value.type && value.condition) {
      return {
        property,
        [value.type]: value.condition,
      };
    }

    const propertyType =
      propertyTypes[property] ||
      this.inferPropertyType(property, value) ||
      null;

    if (propertyType === 'status') {
      return {
        property,
        status: { equals: value },
      };
    }

    if (propertyType === 'select') {
      return {
        property,
        select: { equals: value },
      };
    }

    if (propertyType === 'multi_select') {
      return {
        property,
        multi_select: { contains: value },
      };
    }

    if (propertyType === 'relation') {
      return {
        property,
        relation: { contains: value },
      };
    }

    if (propertyType === 'people' || propertyType === 'person') {
      return {
        property,
        people: { contains: value },
      };
    }

    if (propertyType === 'title') {
      return {
        property,
        title: { contains: value },
      };
    }

    if (propertyType === 'rich_text' || propertyType === 'text') {
      return {
        property,
        rich_text: { contains: value },
      };
    }

    if (propertyType === 'number') {
      return {
        property,
        number: { equals: value },
      };
    }

    if (propertyType === 'checkbox') {
      return {
        property,
        checkbox: { equals: Boolean(value) },
      };
    }

    if (propertyType === 'date') {
      if (typeof value === 'string') {
        return {
          property,
          date: { on_or_after: value },
        };
      }

      if (typeof value === 'object') {
        return {
          property,
          date: value,
        };
      }
    }

    // Fallback heuristics if property type is unknown
    if (typeof value === 'boolean') {
      return {
        property,
        checkbox: { equals: value },
      };
    }

    if (typeof value === 'number') {
      return {
        property,
        number: { equals: value },
      };
    }

    if (Array.isArray(value)) {
      return {
        property,
        multi_select: { contains: value[0] },
      };
    }

    if (typeof value === 'string') {
      return {
        property,
        rich_text: { contains: value },
      };
    }

    return null;
  }

  inferPropertyType(property, value) {
    const normalized = property.toLowerCase();

    if (normalized.includes('status')) {
      return 'status';
    }

    if (normalized.includes('tag') || normalized.includes('theme') || normalized.includes('focus')) {
      return 'multi_select';
    }

    if (normalized.includes('pillar')) {
      return 'multi_select';
    }

    if (
      normalized.includes('category') ||
      normalized.includes('type') ||
      normalized.includes('priority') ||
      normalized.includes('stage')
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
      normalized.includes('revenue')
    ) {
      return 'number';
    }

    if (
      normalized.includes('active') ||
      normalized.includes('featured') ||
      normalized.includes('checkbox')
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

    return null;
  }

  /**
   * Enhanced aggregation queries for analytics
   */
  async getAggregatedData(databaseType, aggregationType, filters = {}) {
    const dbConfig = this.databaseConfigs[databaseType];
    if (!dbConfig || !dbConfig.id) {
      throw new Error(`Database ${databaseType} not configured`);
    }

    const cacheKey = this.getCacheKey(
      `aggregation_${databaseType}_${aggregationType}`,
      filters
    );

    if (this.isCacheValid(cacheKey)) {
      this.cacheStats.hits++;
      return this.getCache(cacheKey);
    }

    this.cacheStats.misses++;

    try {
      const results = await this.queryNotion(dbConfig.id, filters, [], 100, {
        getAllPages: true,
      });
      let aggregatedData;

      switch (aggregationType) {
        case 'count':
          aggregatedData = { count: results.length };
          break;

        case 'group_by_status':
          aggregatedData = this.groupByProperty(results, 'Status');
          break;

        case 'group_by_type':
          aggregatedData = this.groupByProperty(results, 'Type');
          break;

        case 'group_by_priority':
          // Priority field disabled due to schema mismatch - using Status instead
          aggregatedData = this.groupByProperty(results, 'Status');
          break;

        case 'sum_budget':
          aggregatedData = this.sumProperty(results, 'Budget');
          break;

        case 'avg_probability':
          aggregatedData = this.averageProperty(results, 'Probability');
          break;

        default:
          throw new Error(`Unsupported aggregation type: ${aggregationType}`);
      }

      this.setCache(cacheKey, aggregatedData);
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
   */
  groupByProperty(results, propertyName) {
    const groups = {};

    results.forEach(item => {
      const property = item.properties[propertyName];
      let value = 'Unknown';

      if (property?.select?.name) {
        value = property.select.name;
      } else if (property?.multi_select) {
        value = property.multi_select.map(s => s.name).join(', ') || 'None';
      } else if (property?.rich_text) {
        value = this.extractPlainText(property.rich_text) || 'None';
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
   */
  sumProperty(results, propertyName) {
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
   */
  averageProperty(results, propertyName) {
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

  // Partners data service
  async getPartners(useCache = true, filter = {}) {
    const cacheKey = this.getCacheKey('partners', filter);

    if (useCache && this.isCacheValid(cacheKey)) {
      this.cacheStats.hits++;
      return this.getCache(cacheKey);
    }

    this.cacheStats.misses++;
    this.cacheStats.totalQueries++;

    try {
      if (!this.databaseConfigs.partners?.id) {
        console.warn('⚠️ Notion partners database ID not configured – partner list disabled');
        return [];
      }

      const notionFilter = {
        property: 'Status',
        select: { equals: 'Active' },
        ...filter,
      };

      // Remove sorts for partners database due to schema validation errors
      const sorts = [];

      const results = await this.queryNotion(
        this.databaseConfigs.partners.id,
        notionFilter,
        sorts
      );

      const formattedPartners = results.map(page => ({
        id: page.id,
        name: this.extractTitle(page.properties.Name?.title || []),
        type: this.extractSelect(page.properties.Type?.select),
        category: this.extractSelect(page.properties.Category?.select),
        description: this.extractPlainText(
          page.properties.Description?.rich_text || []
        ),
        contributionType: this.extractPlainText(
          page.properties['Contribution Type']?.rich_text || []
        ),
        relationshipStrength: this.extractSelect(
          page.properties['Relationship Strength']?.select
        ),
        collaborationFocus: this.extractMultiSelect(
          page.properties['Collaboration Focus']?.multi_select || []
        ),
        impactStory: this.extractPlainText(
          page.properties['Impact Story']?.rich_text || []
        ),
        featured: this.extractCheckbox(page.properties.Featured?.checkbox),
        logoUrl: this.extractUrl(page.properties['Logo URL']?.url),
        location: this.extractPlainText(page.properties.Location?.rich_text || []),
        establishedDate: this.extractDate(page.properties['Established Date']?.date),
      }));

      this.setCache(cacheKey, formattedPartners);
      return formattedPartners;
    } catch (error) {
      console.warn('Failed to fetch partners from Notion:', error.message);
      return [];
    }
  }

  // Projects data service
  async getProjects(optionsOrUseCache = {}, maybeFilter = {}) {
    let options = {};

    if (typeof optionsOrUseCache === 'boolean') {
      options = {
        useCache: optionsOrUseCache,
        filter: maybeFilter,
      };
    } else if (optionsOrUseCache && typeof optionsOrUseCache === 'object') {
      options = { ...optionsOrUseCache };
      if (
        maybeFilter &&
        typeof maybeFilter === 'object' &&
        Object.keys(maybeFilter).length > 0
      ) {
        options.filter = maybeFilter;
      }
    }

    const {
      useCache = true,
      filter = {},
      sorts: customSorts,
      pageSize = 100,
      getAllPages = true,
      startCursor = null,
      maxPages = null,
    } = options;

    const sorts = Array.isArray(customSorts) && customSorts.length > 0
      ? customSorts
      : [
          {
            property: 'Name',
            direction: 'ascending',
          },
        ];

    console.log(
      `🚜 Fetching projects from Notion (useCache: ${useCache}, getAllPages: ${getAllPages}, pageSize: ${pageSize})`
    );

    // Use Life OS cache system first
    if (false && useCache) {
      const cached = await cacheService.getCachedLifeOSEntity(
        'projects',
        null,
        filter,
        'read'
      );
      if (cached.fromCache) {
        console.log(`🌿 Projects cache hit (${cached.source})`);
        return cached.data;
      }
    }

    try {
      console.log(`🔍 Querying projects`);
      console.log(`  - database ID: ${this.databaseConfigs.projects?.id}`);
      console.log(`  - filter:`, JSON.stringify(filter));
      console.log(`  - sorts:`, JSON.stringify(sorts));

      const results = await this.queryNotion(
        this.databaseConfigs.projects.id,
        filter,
        sorts,
        pageSize,
        {
          getAllPages,
          startCursor,
          maxPages,
        }
      );
      console.log(`✅ Query succeeded, got ${results?.length || 0} results`);

      console.log(`✅ Total projects fetched: ${results.length}`);

      const formattedProjects = results.map((page, index) => {
        const coverImage = (() => {
          const projectName = page.properties?.Name?.title[0]?.plain_text || 'Unknown';

          // Check the Cover Photo property FIRST
          const coverPhotoProp = page.properties?.['Cover Photo'];
          if (coverPhotoProp?.type === 'files' && coverPhotoProp.files && coverPhotoProp.files.length > 0) {
            const fileUrl = this.extractFile(coverPhotoProp.files[0]);
            if (fileUrl) {
              console.log(`✅ ${projectName}: Using Cover Photo property`);
              return fileUrl;
            }
          }

          // Fallback to page's native cover
          const cover = page.cover;
          if (cover?.external?.url) {
            console.log(`⚠️  ${projectName}: Using page.cover (fallback) - Cover Photo property is empty`);
            return cover.external.url;
          }
          if (cover?.file?.url) {
            console.log(`⚠️  ${projectName}: Using page.cover (fallback) - Cover Photo property is empty`);
            return cover.file.url;
          }

          console.log(`❌ ${projectName}: No cover image found`);
          return null;
        })();

        return {
          id: page.id,
          name: this.extractTitle(page.properties.Name?.title || []),

          // AI Summary - EXACT field name from your Notion
          aiSummary: this.extractPlainText(page.properties['AI summary']?.rich_text || []),
          description: this.extractPlainText(page.properties['AI summary']?.rich_text || []),

          status: this.extractSelect(page.properties.Status?.select),

          // Project Lead - EXACT field name from your Notion
          projectLead: this.extractPerson(page.properties['Project Lead']?.people || []),
          lead: this.extractPerson(page.properties['Project Lead']?.people || [])?.name || '',

          // Financial data - EXACT field names from your Notion
          actualIncoming: this.extractNumber(page.properties['Actual Incoming']?.number),
          potentialIncoming: this.extractNumber(page.properties['Potential Incoming']?.number),
          revenueActual: this.extractNumber(page.properties['Revenue Actual']?.number),
          revenuePotential: this.extractNumber(page.properties['Revenue Potential']?.number),
          totalFunding: this.extractNumber(page.properties['Total Funding']?.rollup?.number),
          partnerCount: this.extractNumber(page.properties['Partner Count']?.rollup?.number),
          supporters: this.extractNumber(page.properties['Supporters']?.rollup?.number),

          // Categorization - EXACT field names from your Notion
          coreValues: this.extractSelect(page.properties['Core Values']?.select),
          theme: this.extractMultiSelect(page.properties.Theme?.multi_select || []),
          themes: this.extractMultiSelect(page.properties.Theme?.multi_select || []), // Alias for compatibility
          tags: this.extractMultiSelect(page.properties.Tags?.multi_select || []),
          relationshipPillars: this.extractMultiSelect(page.properties['Relationship Pillars']?.multi_select || []),

          // Infrastructure tracking fields - NEW
          projectType: this.extractSelect(page.properties['Project Type']?.select),
          communityLaborMetrics: this.extractJSONField(page.properties['Community Labor Metrics']?.rich_text || []),
          storytellingMetrics: this.extractJSONField(page.properties['Storytelling Metrics']?.rich_text || []),
          grantDependencyMetrics: this.extractJSONField(page.properties['Grant Dependency Metrics']?.rich_text || []),

          // Timeline & Location - EXACT field names from your Notion
          nextMilestoneDate: this.extractDate(page.properties['Next Milestone Date']?.date),
          location: this.extractRollup(page.properties['Western Name Location']),

          // Relations - EXACT field names from your Notion
          relatedFields: this.extractRelation(page.properties['🪆 Fields']?.relation || []),
          relatedActions: this.extractRelation(page.properties['Actions']?.relation || []),
          relatedResources: this.extractRelation(page.properties['Resources']?.relation || []),
          relatedArtifacts: this.extractRelation(page.properties['Artifacts']?.relation || []),
          relatedConversations: this.extractRelation(page.properties['Conversations']?.relation || []),
          relatedOpportunities: this.extractRelation(page.properties['Opportunities']?.relation || []),
          relatedOrganisations: this.extractRelation(page.properties['Organisations']?.relation || []),
          // Places relation - now with enhanced database access
          relatedPlaces: (() => {
            const placesData = this.extractRelation(page.properties['Places']?.relation || []);
            if (page.properties.Name?.title[0]?.plain_text === 'Goods.' && placesData.length === 0) {
              console.log('🏡 Places relation empty for Goods - testing direct database access...');
              console.log('🏡 Places property details:', JSON.stringify(page.properties['Places'], null, 2));
            }
            return placesData;
          })(),

          // Field Inbox - check if available
          fieldInboxToBeSorted:
            this.extractNumber(page.properties['Field Inbox To Be Sorted']?.number) ||
            this.extractRelation(page.properties['Field Inbox To Be Sorted']?.relation || []).length ||
            null,

          // Legacy fields for compatibility with existing frontend
          area: this.extractSelect(page.properties['Core Values']?.select),
          featured: false,
          startDate: null,
          endDate: this.extractDate(page.properties['Next Milestone Date']?.date),
          budget:
            this.extractNumber(page.properties['Actual Incoming']?.number) ||
            this.extractNumber(page.properties['Total Funding']?.rollup?.number) ||
            0,
          funding: `$${this.extractNumber(page.properties['Actual Incoming']?.number) || 0}K actual, ${
            this.extractNumber(page.properties['Potential Incoming']?.number) || 0
          }K potential`,
          updatedAt: page.last_edited_time,
          notionUrl: page.url,
          notionId: page.id,
          notionIdShort: page.id ? page.id.replace(/-/g, '') : null,
          notionCreatedAt: page.created_time,
          notionLastEditedAt: page.last_edited_time,
          coverImage,
        };
      });

      const projectsToReturn = formattedProjects.length > 0 ? formattedProjects : (() => {
        console.warn('⚠️ No projects returned from Notion query, falling back to seeded projects');
        return this.getFallbackProjects();
      })();

      // Store in Life OS cache system
      await cacheService.setCachedLifeOSEntity(
        'projects',
        null,
        projectsToReturn,
        filter,
        'read'
      );
      return projectsToReturn;
    } catch (error) {
      console.error('❌ Failed to fetch projects from Notion:', error.message);
      console.error('❌ Stack trace:', error.stack);
      return this.getFallbackProjects();
    }
  }

  // Get single project by ID
  async getProjectById(projectId) {
    try {
      console.log(`🔍 Fetching project by ID: ${projectId}`);

      // First try to get from cache by filtering all projects
      const allProjects = await this.getProjects({ useCache: true });
      const project = allProjects.find(p => p.id === projectId || p.notionId === projectId);

      if (project) {
        console.log(`✅ Found project: ${project.name}`);
        return project;
      }

      console.warn(`⚠️ Project not found with ID: ${projectId}`);
      return null;
    } catch (error) {
      console.error('❌ Failed to fetch project by ID:', error.message);
      return null;
    }
  }

  // Opportunities data service
  async getOpportunities(useCache = true, filter = {}) {
    // Use Life OS cache system first
    if (useCache) {
      const cached = await cacheService.getCachedLifeOSEntity(
        'opportunities',
        null,
        filter,
        'read'
      );
      if (cached.fromCache) {
        console.log(`🌿 Opportunities cache hit (${cached.source})`);
        return cached.data;
      }
    }

    try {
      const sorts = [
        {
          property: 'Name',
          direction: 'ascending',
        },
      ];

      const results = await this.queryNotion(
        this.databaseConfigs.opportunities.id,
        filter,
        sorts
      );

      const formattedOpportunities = results.map(page => ({
        id: page.id,
        name: this.extractTitle(page.properties.Name?.title || []),
        description: this.extractPlainText(
          page.properties.Description?.rich_text || []
        ),
        type: this.extractSelect(page.properties.Type?.select),
        stage: this.extractSelect(page.properties.Stage?.select),
        amount: this.extractNumber(page.properties.Amount?.number),
        probability: this.extractNumber(page.properties.Probability?.number),
        deadline: this.extractDate(page.properties.Deadline?.date),
        contact: this.extractPlainText(page.properties.Contact?.rich_text || []),
        requirements: this.extractPlainText(
          page.properties.Requirements?.rich_text || []
        ),
        tags: this.extractMultiSelect(page.properties.Tags?.multi_select || []),
      }));

      // Store in Life OS cache system
      await cacheService.setCachedLifeOSEntity(
        'opportunities',
        null,
        formattedOpportunities,
        filter,
        'read'
      );
      return formattedOpportunities;
    } catch (error) {
      console.warn('Failed to fetch opportunities from Notion:', error.message);
      return this.getFallbackOpportunities();
    }
  }

  // Organizations data service
  async getOrganizations(useCache = true, filter = {}) {
    const cacheKey = this.getCacheKey('organizations', filter);

    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const sorts = [
        {
          property: 'Name',
          direction: 'ascending',
        },
      ];

      const results = await this.queryNotion(
        this.databaseConfigs.organizations.id,
        filter,
        sorts
      );

      const formattedOrganizations = results.map(page => ({
        id: page.id,
        name: this.extractTitle(page.properties.Name?.title || []),
        type: this.extractSelect(page.properties.Type?.select),
        description: this.extractPlainText(
          page.properties.Description?.rich_text || []
        ),
        website: this.extractUrl(page.properties.Website?.url),
        contact: this.extractPlainText(page.properties.Contact?.rich_text || []),
        location: this.extractPlainText(page.properties.Location?.rich_text || []),
        relationshipType: this.extractSelect(
          page.properties['Relationship Type']?.select
        ),
        active: this.extractCheckbox(page.properties.Active?.checkbox) || true, // Default to active
      }));

      this.setCache(cacheKey, formattedOrganizations);
      return formattedOrganizations;
    } catch (error) {
      console.warn('Failed to fetch organizations from Notion:', error.message);
      return this.getFallbackOrganizations();
    }
  }

  // Recent activities service
  async getRecentActivities(useCache = true, limit = 10) {
    const cacheKey = this.getCacheKey('activities', { limit });

    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      const sorts = [
        {
          property: 'Date',
          direction: 'descending',
        },
      ];

      const results = await this.queryNotion(
        this.databaseConfigs.activities.id,
        {},
        sorts,
        limit
      );

      const formattedActivities = results.map(page => ({
        id: page.id,
        name: this.extractTitle(page.properties.Name?.title || []),
        type: this.extractSelect(page.properties.Type?.select),
        description: this.extractPlainText(
          page.properties.Description?.rich_text || []
        ),
        date: this.extractDate(page.properties.Date?.date),
        status: this.extractSelect(page.properties.Status?.select),
        impact: this.extractSelect(page.properties.Impact?.select),
      }));

      this.setCache(cacheKey, formattedActivities);
      return formattedActivities;
    } catch (error) {
      console.warn('Failed to fetch activities from Notion:', error.message);
      return this.getFallbackActivities();
    }
  }

  // Get all people from Notion
  async getPeople(useCache = true) {
    // Use Life OS cache system first
    if (useCache) {
      const cached = await cacheService.getCachedLifeOSEntity(
        'people',
        null,
        {},
        'read'
      );
      if (cached.fromCache) {
        console.log(`🌿 People cache hit (${cached.source})`);
        return cached.data;
      }
    }

    if (!this.notion || !this.databaseConfigs.people.id) {
      console.warn('Notion client or people database not configured');
      return this.getFallbackPeople();
    }

    try {
      const results = await this.queryNotion(this.databaseConfigs.people.id);

      const formattedPeople = results.map(page => ({
        id: page.id,
        name: this.extractTitle(page.properties.Name?.title || []),
        email: this.extractEmail(page.properties.Email?.email),
        role: this.extractSelect(page.properties.Role?.select),
        department: this.extractSelect(page.properties.Department?.select),
        relationshipType: this.extractSelect(
          page.properties['Relationship Type']?.select
        ),
        influenceLevel: this.extractSelect(page.properties['Influence Level']?.select),
        communicationPreference: this.extractSelect(
          page.properties['Communication Preference']?.select
        ),
        contactFrequency: this.extractSelect(
          page.properties['Contact Frequency']?.select
        ),
        relationshipStrength: this.extractSelect(
          page.properties['Relationship Strength']?.select
        ),
        skills: this.extractMultiSelect(page.properties.Skills?.multi_select || []),
        location: this.extractPlainText(page.properties.Location?.rich_text || []),
        active: this.extractCheckbox(page.properties.Active?.checkbox) || true, // Default to active
        startDate: this.extractDate(page.properties['Start Date']?.date),
        tags: this.extractMultiSelect(page.properties.Tags?.multi_select || []),
        relatedProjects: this.extractRelation(
          page.properties['Related Projects']?.relation || []
        ),
        updatedAt: page.last_edited_time,
      }));

      // Store in Life OS cache system
      await cacheService.setCachedLifeOSEntity(
        'people',
        null,
        formattedPeople,
        {},
        'read'
      );
      return formattedPeople;
    } catch (error) {
      console.warn('Failed to fetch people from Notion:', error.message);
      return this.getFallbackPeople();
    }
  }

  // Get all artifacts from Notion
  async getArtifacts(useCache = true) {
    const cacheKey = this.getCacheKey('artifacts');

    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    if (!this.notion || !this.databaseConfigs.artifacts.id) {
      console.warn('Notion client or artifacts database not configured');
      return this.getFallbackArtifacts();
    }

    try {
      const results = await this.queryNotion(this.databaseConfigs.artifacts.id);

      const formattedArtifacts = results.map(page => ({
        id: page.id,
        name: this.extractTitle(page.properties.Name?.title || []),
        description: this.extractPlainText(
          page.properties.Description?.rich_text || []
        ),
        type: this.extractSelect(page.properties.Type?.select),
        format: this.extractSelect(page.properties.Format?.select),
        status: this.extractSelect(page.properties.Status?.select),
        purpose: this.extractSelect(page.properties.Purpose?.select),
        accessLevel: this.extractSelect(page.properties['Access Level']?.select),
        fileSize: this.extractNumber(page.properties['File Size']?.number),
        createdBy: this.extractPlainText(
          page.properties['Created By']?.rich_text || []
        ),
        createdAt:
          this.extractDate(page.properties['Created Date']?.date) || page.created_time,
        tags: this.extractMultiSelect(page.properties.Tags?.multi_select || []),
        relatedProjects: this.extractRelation(
          page.properties['Related Projects']?.relation || []
        ),
        thumbnailUrl:
          this.extractFileUrl(page.properties['Thumbnail Image']) ||
          this.extractFileUrl(page.properties.Thumbnail) ||
          this.extractFileUrl(page.properties.Image) ||
          this.extractFileUrl(page.properties.Photo),
        fileUrl: this.extractFile(page.properties.File?.files?.[0]),
        updatedAt: page.last_edited_time,
      }));

      this.setCache(cacheKey, formattedArtifacts);
      return formattedArtifacts;
    } catch (error) {
      console.warn('Failed to fetch artifacts from Notion:', error.message);
      return this.getFallbackArtifacts();
    }
  }

  // Get all actions from Notion
  async getActions(useCache = true) {
    const cacheKey = this.getCacheKey('actions');

    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    if (!this.notion || !this.databaseConfigs.actions.id) {
      console.warn('Notion client or actions database not configured');
      return this.getFallbackActions();
    }

    try {
      console.log(
        '🎯 Fetching actions from Notion database:',
        this.databaseConfigs.actions.id
      );
      
      // Smart prioritization: get most recent actions first (Priority field removed as it doesn't exist in database)
      const smartSorts = [
        {
          timestamp: 'last_edited_time',
          direction: 'descending' // Most recently updated first
        }
        // Note: Due Date and Priority sorts disabled due to schema mismatch
        // Re-enable when these fields exist in the actual Notion database
      ];
      
      const results = await this.queryNotion(this.databaseConfigs.actions.id, {}, smartSorts);

      const formattedActions = results.map(page => ({
        id: page.id,
        name:
          this.extractTitle(page.properties.Name?.title || []) ||
          this.extractTitle(page.properties.Title?.title || []) ||
          this.extractTitle(page.properties.Action?.title || []),
        description:
          this.extractPlainText(page.properties.Description?.rich_text || []) ||
          this.extractPlainText(page.properties.Notes?.rich_text || []),
        status: this.extractSelect(page.properties.Status?.select),
        priority: this.extractSelect(page.properties.Priority?.select) || 'medium', // Default priority if field doesn't exist
        category:
          this.extractSelect(page.properties.Category?.select) ||
          this.extractSelect(page.properties.Type?.select),
        assignedTo:
          this.extractPlainText(page.properties['Assigned To']?.rich_text || []) ||
          this.extractSelect(page.properties.Owner?.select),
        dueDate:
          this.extractDate(page.properties['Due Date']?.date) ||
          this.extractDate(page.properties.Deadline?.date),
        startDate: this.extractDate(page.properties['Start Date']?.date),
        completedDate: this.extractDate(page.properties['Completed Date']?.date),
        tags: this.extractMultiSelect(page.properties.Tags?.multi_select || []),
        relatedProjects:
          this.extractRelation(page.properties['Related Projects']?.relation || []) ||
          this.extractRelation(page.properties.Projects?.relation || []),
        relatedPeople:
          this.extractRelation(page.properties['Related People']?.relation || []) ||
          this.extractRelation(page.properties.People?.relation || []),
        impact: this.extractSelect(page.properties.Impact?.select),
        effort: this.extractSelect(page.properties.Effort?.select),
        outcome: this.extractPlainText(page.properties.Outcome?.rich_text || []),
        lessons:
          this.extractPlainText(page.properties.Lessons?.rich_text || []) ||
          this.extractPlainText(page.properties['Lessons Learned']?.rich_text || []),
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
      }));

      console.log(`🎯 Fetched ${formattedActions.length} actions from Notion with smart prioritization (Priority → Recent Updates → Due Dates)`);
      this.setCache(cacheKey, formattedActions);
      return formattedActions;
    } catch (error) {
      console.warn('Failed to fetch actions from Notion:', error.message);
      return this.getFallbackActions();
    }
  }

  // Get all places from Notion
  async getPlaces(useCache = true) {
    const cacheKey = this.getCacheKey('places');

    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    if (!this.notion || !this.databaseConfigs.places.id) {
      console.warn('Notion client or places database not configured');
      return this.getFallbackPlaces();
    }

    try {
      console.log(
        '🏡 Fetching places from Notion database:',
        this.databaseConfigs.places.id
      );
      
      const sorts = [
        {
          property: 'Place',
          direction: 'ascending',
        },
      ];
      
      const results = await this.queryNotion(this.databaseConfigs.places.id, {}, sorts);

      const formattedPlaces = results.map(page => ({
        id: page.id,
        name: this.extractTitle(page.properties.Place?.title || []),
        place: this.extractTitle(page.properties.Place?.title || []),
        westernName: this.extractPlainText(
          page.properties['Western Name']?.rich_text || []
        ),
        state: this.extractSelect(page.properties.State?.select),
        // Try Coordinates property first (rich text), fallback to Map property
        // Note: Map property type "place" returns null via API, so we need a text alternative
        map: this.extractPlainText(page.properties.Coordinates?.rich_text || []) ||
             this.extractPlainText(page.properties.Map?.rich_text || []),
        protocols: this.extractPlainText(
          page.properties.Protocols?.rich_text || []
        ),
        relatedOrganisations: this.extractRelation(
          page.properties.Organisations?.relation || []
        ),
        relatedPeople: this.extractRelation(
          page.properties.People?.relation || []
        ),
        relatedProjects: this.extractRelation(
          page.properties.Projects?.relation || []
        ),
        // For frontend compatibility - create combined display name
        indigenousName: this.extractTitle(page.properties.Place?.title || []), // Place name is often the Indigenous name
        displayName: this.extractTitle(page.properties.Place?.title || []),
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
      }));

      console.log(`🏡 Fetched ${formattedPlaces.length} places from Notion`);
      this.setCache(cacheKey, formattedPlaces);
      return formattedPlaces;
    } catch (error) {
      console.warn('Failed to fetch places from Notion:', error.message);
      return this.getFallbackPlaces();
    }
  }

  // Get a specific place by ID
  async getPlace(placeId) {
    const places = await this.getPlaces();
    return places.find(place => place.id === placeId) || null;
  }

  // Search across multiple databases
  async searchAll(query, useCache = true) {
    const cacheKey = this.getCacheKey('search', { query });

    if (useCache && this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    if (!this.notion) {
      return {
        partners: [],
        projects: [],
        opportunities: [],
        organizations: [],
        total: 0,
        error: 'Notion client not initialized',
      };
    }

    try {
      const results = await this.notion.search({
        query: query,
        filter: {
          property: 'object',
          value: 'page',
        },
      });

      const searchResults = {
        partners: [],
        projects: [],
        opportunities: [],
        organizations: [],
        total: results?.results?.length || 0,
      };

      if (results?.results) {
        results.results.forEach(page => {
          const parentId = page.parent?.database_id || page.parent?.data_source_id;

          if (parentId === this.databaseConfigs.partners?.id) {
            searchResults.partners.push({
              id: page.id,
              name: this.extractTitle(page.properties.Name?.title || []),
              type: 'partner',
            });
          } else if (parentId === this.databaseConfigs.projects?.id) {
            searchResults.projects.push({
              id: page.id,
              name: this.extractTitle(page.properties.Name?.title || []),
              type: 'project',
            });
          }
          // Add more categories as needed
        });
      }

      this.setCache(cacheKey, searchResults);
      return searchResults;
    } catch (error) {
      console.warn('Failed to search Notion:', error.message);
      return {
        partners: [],
        projects: [],
        opportunities: [],
        organizations: [],
        total: 0,
        error: error.message,
      };
    }
  }

  /**
   * Enhanced health check with v2025 features
   */
  async healthCheck() {
    const health = {
      overall: 'healthy',
      version: '2025.1',
      authentication: {
        type: this.isOAuthAuthenticated ? 'oauth' : 'token',
        status: this.notion ? 'connected' : 'disconnected',
      },
      databases: {},
      configured: 0,
      accessible: 0,
      performance: this.getPerformanceMetrics(),
      cache: this.getCacheMetrics(),
    };

    for (const [name, dbConfig] of Object.entries(this.databaseConfigs)) {
      if (dbConfig.id) {
        health.configured++;
        try {
          const result = await this.queryNotion(
            dbConfig.id,
            {},
            [],
            1,
            { getAllPages: false }
          );
          health.databases[name] = {
            status: 'healthy',
            configured: true,
            accessible: true,
            records: result.length,
            version: dbConfig.version,
            lastUpdated: dbConfig.lastUpdated,
            databaseId: dbConfig.id,
            apiVersion: '2022-06-28',
            schema: dbConfig.schema
              ? Object.keys(dbConfig.schema.properties).length
              : 0,
          };
          health.accessible++;
        } catch (error) {
          health.databases[name] = {
            status: 'error',
            configured: true,
            accessible: false,
            error: error.message,
            version: dbConfig.version,
            databaseId: dbConfig.id,
            apiVersion: '2022-06-28',
          };
          health.overall = 'degraded';
        }
      } else {
        health.databases[name] = {
          status: 'not_configured',
          configured: false,
          accessible: false,
        };
      }
    }

    if (health.accessible === 0) {
      health.overall = 'unhealthy';
    }

    return health;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      slowQueriesCount: this.performanceMetrics.slowQueries.length,
      errorRate:
        this.performanceMetrics.queryCount > 0
          ? this.performanceMetrics.errorCount / this.performanceMetrics.queryCount
          : 0,
    };
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics() {
    const hitRate =
      this.cacheStats.totalQueries > 0
        ? this.cacheStats.hits / this.cacheStats.totalQueries
        : 0;

    return {
      ...this.cacheStats,
      hitRate,
      cacheSize: this.cache.size,
      memoryUsage: this.getCacheMemoryEstimate(),
    };
  }

  /**
   * Estimate cache memory usage
   */
  getCacheMemoryEstimate() {
    let estimatedBytes = 0;

    for (const [key, value] of this.cache.entries()) {
      // Rough estimate: key + data JSON size
      estimatedBytes += key.length * 2; // Unicode characters
      estimatedBytes += JSON.stringify(value.data).length * 2;
    }

    return {
      bytes: estimatedBytes,
      kilobytes: Math.round(estimatedBytes / 1024),
      megabytes: Math.round((estimatedBytes / (1024 * 1024)) * 100) / 100,
    };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      averageQueryTime: 0,
      queryCount: 0,
      slowQueries: [],
      errorCount: 0,
    };

    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0,
    };

    console.log('📊 Notion service performance metrics reset');
  }

  // Fallback data methods (simplified versions of mock data)
  getFallbackPartners() {
    return [];
  }

  getFallbackProjects() {
    return [
      {
        id: 'fallback-1',
        name: 'Empathy Ledger Platform',
        description: 'Digital platform for community voice capture and storytelling',
        status: 'Active 🔥',
        area: 'Technology',
        lead: 'Ben Knight',
        funding: 'Funded',
        startDate: '2024-01-15',
        budget: 250000,
        tags: ['Digital Platform', 'Community Voice'],
        themes: ['Technology'],
        relationshipPillars: ['Digital Infrastructure'],
        projectLead: null,
        notionUrl: null,
        coverImage: null,
        notionId: 'fallback-1',
        notionIdShort: 'fallback1',
        notionCreatedAt: null,
        notionLastEditedAt: null,
        updatedAt: new Date().toISOString(),
        featured: true,
      },
      {
        id: 'fallback-2',
        name: 'Justice Hub Network',
        description:
          'Connecting justice stakeholders across Queensland for systemic reform',
        status: 'Active 🔥',
        area: 'Justice Reform',
        lead: 'Community Alliance',
        funding: 'Seeking',
        startDate: '2024-03-01',
        budget: 180000,
        tags: ['Justice', 'Network', 'Reform'],
        themes: ['Justice Reform'],
        relationshipPillars: ['Justice Reform Partnerships'],
        projectLead: null,
        notionUrl: null,
        coverImage: null,
        notionId: 'fallback-2',
        notionIdShort: 'fallback2',
        notionCreatedAt: null,
        notionLastEditedAt: null,
        updatedAt: new Date().toISOString(),
        featured: true,
      },
      {
        id: 'fallback-3',
        name: 'First Nations Youth Advocacy',
        description:
          'Supporting Indigenous youth through culturally responsive advocacy programs',
        status: 'Preparation 📋',
        area: 'Indigenous Rights',
        lead: 'First Nations Alliance',
        funding: 'Funded',
        startDate: '2024-06-01',
        budget: 320000,
        tags: ['Indigenous', 'Youth', 'Advocacy'],
        themes: ['Youth Justice'],
        relationshipPillars: ['First Nations Leadership'],
        projectLead: null,
        notionUrl: null,
        coverImage: null,
        notionId: 'fallback-3',
        notionIdShort: 'fallback3',
        notionCreatedAt: null,
        notionLastEditedAt: null,
        updatedAt: new Date().toISOString(),
        featured: true,
      },
      {
        id: 'fallback-4',
        name: 'Economic Freedom Initiative',
        description:
          'Creating pathways for economic empowerment in regional communities',
        status: 'Active 🔥',
        area: 'Economic Freedom',
        lead: 'Regional Development Team',
        funding: 'Funded',
        startDate: '2024-02-15',
        budget: 150000,
        tags: ['Economic', 'Regional', 'Empowerment'],
        themes: ['Economic Development'],
        relationshipPillars: ['Economic Freedom'],
        projectLead: null,
        notionUrl: null,
        coverImage: null,
        notionId: 'fallback-4',
        notionIdShort: 'fallback4',
        notionCreatedAt: null,
        notionLastEditedAt: null,
        updatedAt: new Date().toISOString(),
        featured: false,
      },
      {
        id: 'fallback-5',
        name: 'Art for Social Change',
        description:
          'Using creative expression to drive community engagement and healing',
        status: 'Ideation 🌀',
        area: 'Art',
        lead: 'Creative Collective',
        funding: 'Seeking',
        startDate: '2024-08-01',
        budget: 75000,
        tags: ['Art', 'Community', 'Healing'],
        themes: ['Culture'],
        relationshipPillars: ['Creative Expression'],
        projectLead: null,
        notionUrl: null,
        coverImage: null,
        notionId: 'fallback-5',
        notionIdShort: 'fallback5',
        notionCreatedAt: null,
        notionLastEditedAt: null,
        updatedAt: new Date().toISOString(),
        featured: false,
      },
      {
        id: 'fallback-6',
        name: 'Global Community Connections',
        description: 'Building bridges between local and international communities',
        status: 'Active 🔥',
        area: 'Global community',
        lead: 'International Team',
        funding: 'Funded',
        startDate: '2024-04-01',
        budget: 200000,
        tags: ['Global', 'Connections', 'International'],
        themes: ['International Partnerships'],
        relationshipPillars: ['Global Relationships'],
        projectLead: null,
        notionUrl: null,
        coverImage: null,
        notionId: 'fallback-6',
        notionIdShort: 'fallback6',
        notionCreatedAt: null,
        notionLastEditedAt: null,
        updatedAt: new Date().toISOString(),
        featured: true,
      },
    ];
  }

  getFallbackOpportunities() {
    return [
      {
        id: 'fallback-opp-1',
        name: 'Community Storytelling Grant',
        type: 'Grant',
        stage: 'Proposal 📄',
        amount: 45000,
        probability: 75,
        deadline: '2024-09-30',
        description: 'Funding for community storytelling initiatives',
      },
      {
        id: 'fallback-opp-2',
        name: 'Social Innovation Partnership',
        type: 'Partnership',
        stage: 'Initial Contact 📞',
        amount: 125000,
        probability: 60,
        deadline: '2024-10-15',
        description: 'Partnership with major foundation for social impact',
      },
      {
        id: 'fallback-opp-3',
        name: 'Justice Reform Funding',
        type: 'Government Grant',
        stage: 'Application Submitted 📋',
        amount: 200000,
        probability: 85,
        deadline: '2024-08-31',
        description: 'Government funding for justice system reform initiatives',
      },
      {
        id: 'fallback-opp-4',
        name: 'Indigenous Rights Collaboration',
        type: 'Collaboration',
        stage: 'Negotiation 🤝',
        amount: 175000,
        probability: 70,
        deadline: '2024-11-01',
        description: 'Multi-year collaboration for Indigenous rights advocacy',
      },
    ];
  }

  getFallbackOrganizations() {
    return [
      {
        id: 'fallback-org-1',
        name: 'ACT Foundation',
        type: 'Partner',
        category: 'Community',
        description:
          'Community-focused foundation supporting social impact initiatives',
        relationshipType: 'Strategic Partner',
        relationshipStrength: 'Strong',
        active: true,
      },
      {
        id: 'fallback-org-2',
        name: 'First Nations Justice Alliance',
        type: 'Partner',
        category: 'Indigenous-led',
        description: 'Indigenous-led organization advancing justice reform',
        relationshipType: 'Community Partner',
        relationshipStrength: 'Cornerstone',
        active: true,
      },
      {
        id: 'fallback-org-3',
        name: 'Queensland Community Network',
        type: 'Network',
        category: 'Regional',
        description: 'Statewide network of community organizations',
        relationshipType: 'Network Member',
        relationshipStrength: 'Active',
        active: true,
      },
      {
        id: 'fallback-org-4',
        name: 'Innovation for Good',
        type: 'Funder',
        category: 'Foundation',
        description: 'Foundation focused on technology for social impact',
        relationshipType: 'Funding Partner',
        relationshipStrength: 'Strong',
        active: true,
      },
    ];
  }

  getFallbackActivities() {
    return [
      {
        id: 'fallback-1',
        name: 'Community Workshop',
        type: 'Event',
        description: 'Weekly community engagement session',
        date: new Date().toISOString(),
        status: 'Completed',
      },
    ];
  }

  getFallbackPeople() {
    return [
      {
        id: 'fallback-person-1',
        name: 'Sarah Thompson',
        email: 'sarah.thompson@example.com',
        role: 'Project Manager',
        department: 'Community Engagement',
        relationshipType: 'Staff',
        influenceLevel: 'Decision Maker',
        communicationPreference: 'Email',
        contactFrequency: 'Weekly',
        relationshipStrength: 'Strong',
        skills: ['Project Management', 'Community Engagement'],
        location: 'Brisbane, QLD',
        active: true,
        startDate: '2023-02-15',
        tags: ['Leadership', 'Community'],
        relatedProjects: [],
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  getFallbackArtifacts() {
    return [
      {
        id: 'fallback-artifact-1',
        name: 'ACT Platform Overview',
        description: 'Comprehensive overview of the ACT platform and its capabilities',
        type: 'Document',
        format: 'PDF',
        status: 'Published',
        purpose: 'Internal Use',
        accessLevel: 'Internal',
        fileSize: 1234567,
        createdBy: 'ACT Team',
        createdAt: '2024-01-15T10:00:00Z',
        tags: ['Platform', 'Overview'],
        relatedProjects: [],
        thumbnailUrl: null,
        fileUrl: null,
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  getFallbackActions() {
    return [
      {
        id: 'fallback-action-1',
        name: 'Launch Community Engagement Initiative',
        description:
          'Develop and implement comprehensive community engagement strategy for Q3 2024',
        status: 'In Progress',
        priority: 'High',
        category: 'Community Development',
        assignedTo: 'Sarah Thompson',
        dueDate: '2024-09-30',
        startDate: '2024-07-01',
        completedDate: null,
        tags: ['Community', 'Engagement', 'Strategic'],
        relatedProjects: [],
        relatedPeople: [],
        impact: 'High',
        effort: 'Medium',
        outcome: 'Expected to increase community participation by 40%',
        lessons: 'Focus on grassroots approach and cultural sensitivity',
        createdAt: '2024-06-15T09:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-action-2',
        name: 'Justice Hub Partnership Development',
        description:
          'Establish strategic partnerships with 5 justice-focused organizations across Queensland',
        status: 'Planning',
        priority: 'High',
        category: 'Partnership',
        assignedTo: 'Marcus Chen',
        dueDate: '2024-12-15',
        startDate: '2024-08-01',
        completedDate: null,
        tags: ['Justice', 'Partnership', 'Network'],
        relatedProjects: [],
        relatedPeople: [],
        impact: 'Very High',
        effort: 'High',
        outcome:
          'Anticipated 5 new strategic partnerships and expanded justice reform network',
        lessons: 'Early stakeholder engagement is crucial for partnership success',
        createdAt: '2024-07-01T10:30:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-action-3',
        name: 'Indigenous Youth Advocacy Program Launch',
        description:
          'Design and launch culturally responsive advocacy program for Indigenous youth',
        status: 'Done',
        priority: 'High',
        category: 'Program Development',
        assignedTo: 'James Aboriginal',
        dueDate: '2024-06-30',
        startDate: '2024-03-01',
        completedDate: '2024-06-25',
        tags: ['Indigenous', 'Youth', 'Advocacy'],
        relatedProjects: [],
        relatedPeople: [],
        impact: 'Very High',
        effort: 'High',
        outcome:
          'Successfully launched program with 25 youth participants and strong community support',
        lessons:
          'Community-led design and elder guidance were essential for authentic program development',
        createdAt: '2024-02-15T14:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-action-4',
        name: 'Grant Application for Economic Freedom Initiative',
        description:
          'Prepare and submit comprehensive grant application for regional economic development funding',
        status: 'Done',
        priority: 'Medium',
        category: 'Funding',
        assignedTo: 'Dr. Emily Watson',
        dueDate: '2024-05-15',
        startDate: '2024-04-01',
        completedDate: '2024-05-10',
        tags: ['Funding', 'Economic Development', 'Grant'],
        relatedProjects: [],
        relatedPeople: [],
        impact: 'High',
        effort: 'Medium',
        outcome: 'Successfully submitted $150,000 grant application, awaiting response',
        lessons:
          'Strong community letters of support significantly strengthened application',
        createdAt: '2024-03-20T11:15:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-action-5',
        name: 'Art for Social Change Workshop Series',
        description:
          'Organize monthly community art workshops focused on healing and social transformation',
        status: 'In Progress',
        priority: 'Medium',
        category: 'Community Events',
        assignedTo: 'Creative Collective',
        dueDate: '2024-12-31',
        startDate: '2024-08-01',
        completedDate: null,
        tags: ['Art', 'Community', 'Healing', 'Workshop'],
        relatedProjects: [],
        relatedPeople: [],
        impact: 'Medium',
        effort: 'Low',
        outcome:
          'Expected to engage 100+ community members in creative healing processes',
        lessons: 'Art provides powerful medium for community connection and expression',
        createdAt: '2024-07-10T16:45:00Z',
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  getFallbackPlaces() {
    return [
      {
        id: 'fallback-place-1',
        name: 'Naarm',
        place: 'Naarm',
        westernName: 'Melbourne',
        state: 'Vic',
        map: '-37.8136,144.9631 Melbourne, Victoria, Australia',
        protocols: 'Acknowledge Kulin Nations, respect cultural protocols',
        relatedOrganisations: [],
        relatedPeople: [],
        relatedProjects: [],
        // For frontend compatibility
        indigenousName: 'Naarm',
        displayName: 'Naarm',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-place-2',
        name: 'Mparntwe',
        place: 'Mparntwe',
        westernName: 'Alice Springs',
        state: 'NT',
        map: '-23.6980,133.8807 Alice Springs, Northern Territory, Australia',
        protocols: 'Acknowledge Arrernte people, observe sacred site protocols',
        relatedOrganisations: [],
        relatedPeople: [],
        relatedProjects: [],
        // For frontend compatibility
        indigenousName: 'Mparntwe',
        displayName: 'Mparntwe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-place-3',
        name: 'Larrakia Country',
        place: 'Larrakia Country',
        westernName: 'Darwin',
        state: 'NT',
        map: '-12.4634,130.8456 Darwin, Northern Territory, Australia',
        protocols: 'Acknowledge Larrakia people, respect coastal country',
        relatedOrganisations: [],
        relatedPeople: [],
        relatedProjects: [],
        // For frontend compatibility
        indigenousName: 'Larrakia Country',
        displayName: 'Larrakia Country',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-place-4',
        name: 'Remote Communities',
        place: 'Remote Communities',
        westernName: 'Various Remote Locations',
        state: 'NT',
        map: 'Various locations across Australia',
        protocols: 'Respect traditional owners, follow community protocols',
        relatedOrganisations: [],
        relatedPeople: [],
        relatedProjects: [],
        // For frontend compatibility
        indigenousName: 'Various Traditional Names',
        displayName: 'Remote Communities',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Create a new project in Notion
   */
  async createProject(projectData) {
    if (!this.notion) {
      throw new Error('Notion client not initialized');
    }

    if (!this.databaseConfigs.projects?.id) {
      throw new Error('Projects database ID not configured');
    }

    const projectProps = {
      Name: {
        title: [
          {
            text: {
              content: projectData.name || 'New Project'
            }
          }
        ]
      }
    };

    // Add optional properties if provided
    if (projectData.status) {
      projectProps.Status = {
        select: {
          name: projectData.status
        }
      };
    }

    if (projectData.aiSummary) {
      projectProps['AI summary'] = {
        rich_text: [
          {
            text: {
              content: projectData.aiSummary
            }
          }
        ]
      };
    }

    if (projectData.location) {
      projectProps['Western Name Location'] = {
        rich_text: [
          {
            text: {
              content: projectData.location
            }
          }
        ]
      };
    }

    if (projectData.coreValues) {
      projectProps['Core Values'] = {
        select: {
          name: projectData.coreValues
        }
      };
    }

    if (projectData.actualIncoming) {
      projectProps['Actual Incoming'] = {
        number: projectData.actualIncoming
      };
    }

    if (projectData.potentialIncoming) {
      projectProps['Potential Incoming'] = {
        number: projectData.potentialIncoming
      };
    }

    if (projectData.nextMilestoneDate) {
      projectProps['Next Milestone Date'] = {
        date: {
          start: projectData.nextMilestoneDate
        }
      };
    }

    if (projectData.theme && Array.isArray(projectData.theme)) {
      projectProps['Theme'] = {
        multi_select: projectData.theme.map(theme => ({
          name: theme
        }))
      };
    }

    if (projectData.tags && Array.isArray(projectData.tags)) {
      projectProps['Tags'] = {
        multi_select: projectData.tags.map(tag => ({
          name: tag
        }))
      };
    }

    try {
      console.log('🛍️ Creating project in Notion with properties:', JSON.stringify(projectProps, null, 2));
      
      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseConfigs.projects.id },
        properties: projectProps
      });

      console.log('✅ Project created successfully:', response.id);
      
      // Clear projects cache to force refresh
      this.clearCache('projects');
      
      return {
        success: true,
        id: response.id,
        url: response.url,
        message: 'Project created successfully'
      };
      
    } catch (error) {
      console.error('❌ Error creating project:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create project'
      };
    }
  }

  /**
   * Create a new organization in Notion
   */
  async createOrganization(orgData) {
    if (!this.notion) {
      throw new Error('Notion client not initialized');
    }

    if (!this.databaseConfigs.organizations?.id) {
      throw new Error('Organizations database ID not configured');
    }

    const orgProps = {
      Name: {
        title: [
          {
            text: {
              content: orgData.name || 'New Organization'
            }
          }
        ]
      }
    };

    // Add optional properties if provided
    if (orgData.type) {
      orgProps.Type = {
        select: {
          name: orgData.type
        }
      };
    }

    if (orgData.location) {
      orgProps.Location = {
        rich_text: [
          {
            text: {
              content: orgData.location
            }
          }
        ]
      };
    }

    if (orgData.website) {
      orgProps.Website = {
        url: orgData.website
      };
    }

    if (orgData.description) {
      orgProps.Description = {
        rich_text: [
          {
            text: {
              content: orgData.description
            }
          }
        ]
      };
    }

    if (orgData.status) {
      orgProps.Status = {
        select: {
          name: orgData.status
        }
      };
    }

    try {
      console.log('🏢 Creating organization in Notion with properties:', JSON.stringify(orgProps, null, 2));
      
      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseConfigs.organizations.id },
        properties: orgProps
      });

      console.log('✅ Organization created successfully:', response.id);
      
      // Clear organizations cache to force refresh
      this.clearCache('organizations');
      
      return {
        success: true,
        id: response.id,
        url: response.url,
        message: 'Organization created successfully'
      };
      
    } catch (error) {
      console.error('❌ Error creating organization:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create organization'
      };
    }
  }

  /**
   * Create the Goods project specifically
   */
  async createGoodsProject() {
    console.log('🛍️ Creating the Goods project...');
    
    const goodsProject = {
      name: 'Goods.',
      status: 'Active 🔥',
      aiSummary: 'Community-led initiative delivering essential goods through local production, addressing cost-of-living gaps. Aims to manufacture 300 beds and 40 washing machines, supporting over 800 people, while promoting self-determination and sustainability among First Nations communities.',
      location: 'Remote Communities, NT',
      coreValues: 'Decentralised Power',
      actualIncoming: 150000,
      potentialIncoming: 400000,
      nextMilestoneDate: '2025-09-02',
      theme: ['Health and wellbeing', 'Indigenous'],
      tags: ['Health', 'Product', 'Community']
    };

    try {
      const result = await this.createProject(goodsProject);
      return {
        success: true,
        project: result,
        message: 'Goods project created successfully'
      };
    } catch (error) {
      console.error('❌ Error creating Goods project:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create Goods project'
      };
    }
  }

  /**
   * Test method to create a demo project and organization
   */
  async createTestEntities() {
    console.log('🧪 Creating test project and organization...');
    
    // Create test project
    const testProject = {
      name: 'Claude Code Test Project',
      status: 'Active 🔥',
      aiSummary: 'A test project created by Claude Code to demonstrate the Notion API integration and project creation functionality.',
      location: 'Darwin, NT',
      coreValues: 'Decentralised Power',
      actualIncoming: 25000,
      potentialIncoming: 75000,
      nextMilestoneDate: '2025-10-01',
      theme: ['Technology', 'Innovation'],
      tags: ['Test', 'Demo', 'API']
    };

    // Create test organization
    const testOrg = {
      name: 'Claude Code Demo Organization',
      type: 'Technology Partner',
      location: 'Remote/Digital',
      website: 'https://claude.ai/code',
      description: 'A demonstration organization created to test the Notion API integration capabilities.',
      status: 'Active'
    };

    try {
      const projectResult = await this.createProject(testProject);
      const orgResult = await this.createOrganization(testOrg);

      return {
        success: true,
        project: projectResult,
        organization: orgResult,
        message: 'Test entities created successfully'
      };
    } catch (error) {
      console.error('❌ Error creating test entities:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create test entities'
      };
    }
  }
}

// Export singleton instance
export const notionService = new NotionService();
export default notionService;
