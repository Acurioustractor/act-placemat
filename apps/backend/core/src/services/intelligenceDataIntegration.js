/**
 * Intelligence Data Integration Service
 * Enhanced data source connectors for morning intelligence dashboard
 *
 * Features:
 * - Real-time data synchronization
 * - Data validation and quality checks
 * - Transformation pipelines
 * - Performance monitoring
 * - Error resilience
 */

import { IntegrationLogger } from './unifiedIntegration/utils/Logger.ts';
import { cacheService } from './cacheService.js';
import { UnifiedIntegrationService } from './unifiedIntegration/UnifiedIntegrationService.js';

// Import adapters
import { LinkedInServiceAdapter } from './unifiedIntegration/adapters/LinkedInServiceAdapter.js';
import { SupabaseServiceAdapter } from './unifiedIntegration/adapters/SupabaseServiceAdapter.js';
import { NotionServiceAdapter } from './unifiedIntegration/adapters/NotionServiceAdapter.js';
import { XeroFinanceServiceAdapter } from './unifiedIntegration/adapters/XeroFinanceServiceAdapter.js';
import { RedisCacheService } from './unifiedIntegration/cache/RedisCacheService.js';

/**
 * Intelligence Data Integration Service
 * Manages enhanced data collection and processing for morning intelligence
 */
class IntelligenceDataIntegrationService {
  constructor() {
    this.dataSourceConnectors = new Map();
    this.transformationPipelines = new Map();
    this.validationRules = new Map();
    this.syncSchedule = new Map();
    this.performanceMetrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      avgSyncTime: 0,
      dataQualityScore: 100
    };

    // Initialize logger
    this.logger = IntegrationLogger.getInstance();

    // Initialize unified integration service
    this.initializeUnifiedService();
    this.initializeConnectors();
    this.initializeValidationRules();
    this.initializeTransformationPipelines();
  }

  /**
   * Initialize unified integration service
   */
  initializeUnifiedService() {
    try {
      // Initialize adapters
      const linkedInAdapter = new LinkedInServiceAdapter();
      const supabaseAdapter = new SupabaseServiceAdapter();
      const notionAdapter = new NotionServiceAdapter();
      const xeroAdapter = new XeroFinanceServiceAdapter();

      // Initialize Redis cache service with graceful fallback
      let redisCacheService = null;
      try {
        redisCacheService = new RedisCacheService();
        this.logger.info('Redis cache service initialized for intelligence data integration');
      } catch (error) {
        this.logger.warn('Redis cache not available for intelligence data integration', { error: error.message });
      }

      // Initialize unified service
      this.unifiedIntegrationService = new UnifiedIntegrationService(
        linkedInAdapter,
        null, // Gmail service (to be implemented later)
        notionAdapter,
        supabaseAdapter,
        xeroAdapter,
        redisCacheService
      );

      this.logger.info('Unified integration service initialized for intelligence data integration');

    } catch (error) {
      this.logger.error('Failed to initialize unified integration service:', error);
      this.unifiedIntegrationService = null;
    }
  }

  /**
   * Initialize data source connectors
   */
  initializeConnectors() {
    // Strategic Contacts Connector
    this.dataSourceConnectors.set('contacts', {
      name: 'Strategic Contacts',
      sync: this.syncContactsData.bind(this),
      transform: this.transformContactsData.bind(this),
      validate: this.validateContactsData.bind(this),
      cacheKey: 'intelligence:contacts',
      syncInterval: 15 * 60 * 1000, // 15 minutes
      lastSync: null,
      status: 'ready'
    });

    // Financial Data Connector
    this.dataSourceConnectors.set('finances', {
      name: 'Financial Intelligence',
      sync: this.syncFinancialData.bind(this),
      transform: this.transformFinancialData.bind(this),
      validate: this.validateFinancialData.bind(this),
      cacheKey: 'intelligence:finances',
      syncInterval: 10 * 60 * 1000, // 10 minutes
      lastSync: null,
      status: 'ready'
    });

    // Projects Data Connector
    this.dataSourceConnectors.set('projects', {
      name: 'Projects Intelligence',
      sync: this.syncProjectsData.bind(this),
      transform: this.transformProjectsData.bind(this),
      validate: this.validateProjectsData.bind(this),
      cacheKey: 'intelligence:projects',
      syncInterval: 20 * 60 * 1000, // 20 minutes
      lastSync: null,
      status: 'ready'
    });

    // Calendar Data Connector
    this.dataSourceConnectors.set('calendar', {
      name: 'Calendar Intelligence',
      sync: this.syncCalendarData.bind(this),
      transform: this.transformCalendarData.bind(this),
      validate: this.validateCalendarData.bind(this),
      cacheKey: 'intelligence:calendar',
      syncInterval: 5 * 60 * 1000, // 5 minutes
      lastSync: null,
      status: 'ready'
    });

    // Insights Connector (Cross-platform analysis)
    this.dataSourceConnectors.set('insights', {
      name: 'Cross-Platform Insights',
      sync: this.syncInsightsData.bind(this),
      transform: this.transformInsightsData.bind(this),
      validate: this.validateInsightsData.bind(this),
      cacheKey: 'intelligence:insights',
      syncInterval: 30 * 60 * 1000, // 30 minutes
      lastSync: null,
      status: 'ready'
    });

    this.logger.info('Initialized 5 data source connectors for intelligence integration');
  }

  /**
   * Initialize validation rules for each data source
   */
  initializeValidationRules() {
    // Contacts validation rules
    this.validationRules.set('contacts', {
      required: ['id', 'name'],
      optional: ['email', 'phone', 'organisation', 'tags', 'lastContact'],
      types: {
        id: 'string',
        name: 'string',
        email: 'string',
        phone: 'string',
        organisation: 'string',
        tags: 'array',
        lastContact: 'date',
        opportunityScore: 'number'
      },
      ranges: {
        opportunityScore: [0, 100]
      }
    });

    // Financial validation rules
    this.validationRules.set('finances', {
      required: ['amount', 'type', 'date'],
      optional: ['description', 'category', 'source'],
      types: {
        amount: 'number',
        type: 'string',
        date: 'date',
        description: 'string',
        category: 'string',
        source: 'string'
      },
      enums: {
        type: ['income', 'expense', 'transfer']
      }
    });

    // Projects validation rules
    this.validationRules.set('projects', {
      required: ['id', 'title', 'status'],
      optional: ['description', 'dueDate', 'priority', 'assignee', 'progress'],
      types: {
        id: 'string',
        title: 'string',
        status: 'string',
        description: 'string',
        dueDate: 'date',
        priority: 'string',
        assignee: 'string',
        progress: 'number'
      },
      enums: {
        status: ['planning', 'active', 'paused', 'completed', 'cancelled'],
        priority: ['low', 'medium', 'high', 'urgent']
      },
      ranges: {
        progress: [0, 100]
      }
    });

    // Calendar validation rules
    this.validationRules.set('calendar', {
      required: ['id', 'title', 'startTime', 'endTime'],
      optional: ['description', 'attendees', 'location', 'type'],
      types: {
        id: 'string',
        title: 'string',
        startTime: 'date',
        endTime: 'date',
        description: 'string',
        attendees: 'array',
        location: 'string',
        type: 'string'
      }
    });

    this.logger.info('Initialized validation rules for 4 data source types');
  }

  /**
   * Initialize transformation pipelines
   */
  initializeTransformationPipelines() {
    // Standardization pipeline
    this.transformationPipelines.set('standardize', {
      name: 'Data Standardization',
      process: this.standardizeData.bind(this),
      order: 1
    });

    // Enrichment pipeline
    this.transformationPipelines.set('enrich', {
      name: 'Data Enrichment',
      process: this.enrichData.bind(this),
      order: 2
    });

    // Scoring pipeline
    this.transformationPipelines.set('scoring', {
      name: 'Intelligence Scoring',
      process: this.scoreData.bind(this),
      order: 3
    });

    // Aggregation pipeline
    this.transformationPipelines.set('aggregate', {
      name: 'Data Aggregation',
      process: this.aggregateData.bind(this),
      order: 4
    });

    this.logger.info('Initialized 4 transformation pipelines');
  }

  /**
   * Sync data from all sources
   */
  async syncAllData(userId, options = {}) {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'IntelligenceDataIntegration', 'syncAllData');

    const syncStartTime = Date.now();
    const results = {
      successful: [],
      failed: [],
      skipped: [],
      totalSyncTime: 0,
      dataQuality: 100
    };

    try {
      // Determine which sources need syncing
      const sourcesToSync = this.determineSyncSources(options.forceFull);

      if (sourcesToSync.length === 0) {
        timedLogger.info('No sources require syncing at this time');
        return { success: true, results: { ...results, skipped: Array.from(this.dataSourceConnectors.keys()) } };
      }

      timedLogger.info(`Syncing ${sourcesToSync.length} data sources: ${sourcesToSync.join(', ')}`);

      // Sync sources in parallel for performance
      const syncPromises = sourcesToSync.map(async (sourceKey) => {
        const connector = this.dataSourceConnectors.get(sourceKey);
        const sourceStartTime = Date.now();

        try {
          connector.status = 'syncing';

          // Execute sync
          const rawData = await connector.sync(userId, correlationId);

          // Validate data
          const validationResult = await connector.validate(rawData, correlationId);
          if (!validationResult.isValid) {
            throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
          }

          // Transform data
          const transformedData = await connector.transform(rawData, correlationId);

          // Cache the processed data
          if (cacheService) {
            await cacheService.set(
              `${connector.cacheKey}:${userId}`,
              JSON.stringify(transformedData),
              { ttl: connector.syncInterval }
            );
          }

          const syncTime = Date.now() - sourceStartTime;
          connector.lastSync = new Date();
          connector.status = 'ready';

          results.successful.push({
            source: sourceKey,
            recordCount: Array.isArray(transformedData) ? transformedData.length : 1,
            syncTime,
            dataQuality: validationResult.qualityScore || 100
          });

          timedLogger.info(`Successfully synced ${sourceKey} in ${syncTime}ms`);

        } catch (error) {
          const syncTime = Date.now() - sourceStartTime;
          connector.status = 'error';

          results.failed.push({
            source: sourceKey,
            error: error.message,
            syncTime
          });

          timedLogger.error(`Failed to sync ${sourceKey}:`, error);
          timedLogger.finish(false);
        }
      });

      // Wait for all syncs to complete
      await Promise.allSettled(syncPromises);

      // Update performance metrics
      results.totalSyncTime = Date.now() - syncStartTime;
      this.updatePerformanceMetrics(results);

      timedLogger.info(`Data sync completed in ${results.totalSyncTime}ms. Success: ${results.successful.length}, Failed: ${results.failed.length}`);
      timedLogger.finish(true);

      return {
        success: true,
        results,
        metadata: {
          correlationId,
          syncTime: results.totalSyncTime,
          totalSources: sourcesToSync.length
        }
      };

    } catch (error) {
      timedLogger.error('Data sync failed:', error);
      timedLogger.finish(false);
      return {
        success: false,
        error: error.message,
        results,
        metadata: { correlationId }
      };
    }
  }

  /**
   * Determine which sources need syncing based on intervals
   */
  determineSyncSources(forceFull = false) {
    const sourcesToSync = [];
    const now = Date.now();

    for (const [sourceKey, connector] of this.dataSourceConnectors) {
      if (forceFull) {
        sourcesToSync.push(sourceKey);
        continue;
      }

      if (!connector.lastSync) {
        sourcesToSync.push(sourceKey);
        continue;
      }

      const timeSinceLastSync = now - connector.lastSync.getTime();
      if (timeSinceLastSync >= connector.syncInterval) {
        sourcesToSync.push(sourceKey);
      }
    }

    return sourcesToSync;
  }

  /**
   * Sync contacts data
   */
  async syncContactsData(userId, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'ContactsSync', 'syncContactsData');

    try {
      if (!this.unifiedIntegrationService) {
        throw new Error('Unified integration service not available');
      }

      // Use existing unified integration service
      const contacts = await this.unifiedIntegrationService.getContacts({
        limit: 100,
        includeOpportunityScore: true,
        includeRecentActivity: true
      });

      timedLogger.info(`Synced ${contacts.length} contacts`);
      timedLogger.finish(true);
      return contacts;

    } catch (error) {
      timedLogger.error('Failed to sync contacts data:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Sync financial data
   */
  async syncFinancialData(userId, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'FinancialSync', 'syncFinancialData');

    try {
      if (!this.unifiedIntegrationService) {
        throw new Error('Unified integration service not available');
      }

      // Use existing unified integration service
      const financialData = await this.unifiedIntegrationService.getFinanceData({
        includeCashFlow: true,
        includeRecentTransactions: true,
        includeAlerts: true
      });

      timedLogger.info('Synced financial data');
      timedLogger.finish(true);
      return financialData;

    } catch (error) {
      timedLogger.error('Failed to sync financial data:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Sync projects data
   */
  async syncProjectsData(userId, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'ProjectsSync', 'syncProjectsData');

    try {
      if (!this.unifiedIntegrationService) {
        throw new Error('Unified integration service not available');
      }

      // Use existing unified integration service
      const projects = await this.unifiedIntegrationService.getProjects({
        includeProgress: true,
        includeUrgencyScore: true,
        includeTeamData: true
      });

      timedLogger.info(`Synced ${projects.length} projects`);
      timedLogger.finish(true);
      return projects;

    } catch (error) {
      timedLogger.error('Failed to sync projects data:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Sync calendar data
   */
  async syncCalendarData(userId, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'CalendarSync', 'syncCalendarData');

    try {
      if (!this.unifiedIntegrationService) {
        throw new Error('Unified integration service not available');
      }

      // Use existing unified integration service (placeholder - calendar integration TBD)
      const calendarData = {
        todaysEvents: [],
        upcomingEvents: [],
        timeBlocking: { availableSlots: 0 },
        meetingIntelligence: { efficiency: 'medium' }
      };

      timedLogger.info('Synced calendar data');
      timedLogger.finish(true);
      return calendarData;

    } catch (error) {
      timedLogger.error('Failed to sync calendar data:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Sync insights data (cross-platform analysis)
   */
  async syncInsightsData(userId, correlationId) {
    const timedLogger = this.logger.createTimedLogger(correlationId, 'InsightsSync', 'syncInsightsData');

    try {
      // Generate insights from existing cached data
      const insights = await this.generateCrossPlatformInsights(userId, correlationId);

      timedLogger.info(`Generated ${insights.length} insights`);
      timedLogger.finish(true);
      return insights;

    } catch (error) {
      timedLogger.error('Failed to sync insights data:', error);
      timedLogger.finish(false);
      throw error;
    }
  }

  /**
   * Generate cross-platform insights
   */
  async generateCrossPlatformInsights(userId, correlationId) {
    const insights = [];

    try {
      // Get cached data from other sources
      const cachedContacts = await this.getCachedData('contacts', userId);
      const cachedFinances = await this.getCachedData('finances', userId);
      const cachedProjects = await this.getCachedData('projects', userId);
      const cachedCalendar = await this.getCachedData('calendar', userId);

      // Generate financial-contact insights
      if (cachedContacts && cachedFinances) {
        insights.push({
          type: 'financial_contact_correlation',
          title: 'High-Value Contact Opportunities',
          description: `${cachedContacts.filter(c => c.opportunityScore > 70).length} high-opportunity contacts could drive revenue growth`,
          priority: 'high',
          actionable: true,
          data: {
            highValueContacts: cachedContacts.filter(c => c.opportunityScore > 70).length,
            cashFlowTrend: cachedFinances.cashPosition?.trend || 'neutral'
          }
        });
      }

      // Generate project-calendar insights
      if (cachedProjects && cachedCalendar) {
        const urgentProjects = cachedProjects.filter(p => p.urgencyScore > 80);
        insights.push({
          type: 'project_time_optimization',
          title: 'Project Time Allocation',
          description: `${urgentProjects.length} urgent projects need more calendar time allocation`,
          priority: urgentProjects.length > 0 ? 'high' : 'medium',
          actionable: true,
          data: {
            urgentProjectsCount: urgentProjects.length,
            availableTimeSlots: cachedCalendar.timeBlocking?.availableSlots || 0
          }
        });
      }

      // Generate contact-project synergy insights
      if (cachedContacts && cachedProjects) {
        insights.push({
          type: 'contact_project_synergy',
          title: 'Strategic Contact Alignment',
          description: 'Identified potential collaborations between high-opportunity contacts and active projects',
          priority: 'medium',
          actionable: true,
          data: {
            potentialSynergies: Math.min(
              cachedContacts.filter(c => c.opportunityScore > 60).length,
              cachedProjects.filter(p => p.status === 'active').length
            )
          }
        });
      }

      return insights;

    } catch (error) {
      this.logger.error('Failed to generate cross-platform insights:', error);
      return [];
    }
  }

  /**
   * Get cached data for a source
   */
  async getCachedData(sourceKey, userId) {
    if (!cacheService) return null;

    try {
      const connector = this.dataSourceConnectors.get(sourceKey);
      if (!connector) return null;

      const cachedData = await cacheService.get(`${connector.cacheKey}:${userId}`);
      return cachedData ? JSON.parse(cachedData) : null;

    } catch (error) {
      this.logger.warn(`Failed to get cached data for ${sourceKey}:`, error);
      return null;
    }
  }

  /**
   * Validate data using configured rules
   */
  async validateContactsData(data, correlationId) {
    return this.validateDataWithRules(data, 'contacts', correlationId);
  }

  async validateFinancialData(data, correlationId) {
    return this.validateDataWithRules(data, 'finances', correlationId);
  }

  async validateProjectsData(data, correlationId) {
    return this.validateDataWithRules(data, 'projects', correlationId);
  }

  async validateCalendarData(data, correlationId) {
    return this.validateDataWithRules(data, 'calendar', correlationId);
  }

  async validateInsightsData(data, correlationId) {
    // Insights have flexible structure, just check basic format
    const errors = [];

    if (!Array.isArray(data)) {
      errors.push('Insights data must be an array');
    } else {
      data.forEach((insight, index) => {
        if (!insight.type) errors.push(`Insight ${index} missing type`);
        if (!insight.title) errors.push(`Insight ${index} missing title`);
        if (!insight.description) errors.push(`Insight ${index} missing description`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      qualityScore: Math.max(0, 100 - (errors.length * 10))
    };
  }

  /**
   * Generic data validation using rules
   */
  async validateDataWithRules(data, sourceKey, correlationId) {
    const rules = this.validationRules.get(sourceKey);
    if (!rules) {
      return { isValid: true, errors: [], qualityScore: 100 };
    }

    const errors = [];
    const dataArray = Array.isArray(data) ? data : [data];

    dataArray.forEach((item, index) => {
      // Check required fields
      rules.required.forEach(field => {
        if (!(field in item) || item[field] === null || item[field] === undefined) {
          errors.push(`Item ${index} missing required field: ${field}`);
        }
      });

      // Check data types
      Object.keys(rules.types || {}).forEach(field => {
        if (field in item && item[field] !== null) {
          const expectedType = rules.types[field];
          const actualType = typeof item[field];

          if (expectedType === 'array' && !Array.isArray(item[field])) {
            errors.push(`Item ${index} field ${field} should be array`);
          } else if (expectedType === 'date' && !(item[field] instanceof Date) && isNaN(Date.parse(item[field]))) {
            errors.push(`Item ${index} field ${field} should be valid date`);
          } else if (expectedType !== 'array' && expectedType !== 'date' && actualType !== expectedType) {
            errors.push(`Item ${index} field ${field} should be ${expectedType}, got ${actualType}`);
          }
        }
      });

      // Check enums
      Object.keys(rules.enums || {}).forEach(field => {
        if (field in item && !rules.enums[field].includes(item[field])) {
          errors.push(`Item ${index} field ${field} has invalid value: ${item[field]}`);
        }
      });

      // Check ranges
      Object.keys(rules.ranges || {}).forEach(field => {
        if (field in item && typeof item[field] === 'number') {
          const [min, max] = rules.ranges[field];
          if (item[field] < min || item[field] > max) {
            errors.push(`Item ${index} field ${field} out of range [${min}, ${max}]: ${item[field]}`);
          }
        }
      });
    });

    const qualityScore = Math.max(0, 100 - (errors.length * 5));

    return {
      isValid: errors.length === 0,
      errors,
      qualityScore
    };
  }

  /**
   * Transform data through pipelines
   */
  async transformContactsData(data, correlationId) {
    return this.runTransformationPipelines(data, 'contacts', correlationId);
  }

  async transformFinancialData(data, correlationId) {
    return this.runTransformationPipelines(data, 'finances', correlationId);
  }

  async transformProjectsData(data, correlationId) {
    return this.runTransformationPipelines(data, 'projects', correlationId);
  }

  async transformCalendarData(data, correlationId) {
    return this.runTransformationPipelines(data, 'calendar', correlationId);
  }

  async transformInsightsData(data, correlationId) {
    return this.runTransformationPipelines(data, 'insights', correlationId);
  }

  /**
   * Run data through transformation pipelines
   */
  async runTransformationPipelines(data, sourceKey, correlationId) {
    let transformedData = data;

    // Get pipelines in order
    const pipelines = Array.from(this.transformationPipelines.values())
      .sort((a, b) => a.order - b.order);

    for (const pipeline of pipelines) {
      try {
        transformedData = await pipeline.process(transformedData, sourceKey, correlationId);
      } catch (error) {
        this.logger.error(`Pipeline ${pipeline.name} failed for ${sourceKey}:`, error);
        // Continue with previous data
      }
    }

    return transformedData;
  }

  /**
   * Standardize data format
   */
  async standardizeData(data, sourceKey, correlationId) {
    // Ensure consistent field naming and formats
    if (Array.isArray(data)) {
      return data.map(item => this.standardizeItem(item, sourceKey));
    } else {
      return this.standardizeItem(data, sourceKey);
    }
  }

  standardizeItem(item, sourceKey) {
    const standardized = { ...item };

    // Common standardizations
    if ('created_at' in standardized) {
      standardized.createdAt = standardized.created_at;
      delete standardized.created_at;
    }

    if ('updated_at' in standardized) {
      standardized.updatedAt = standardized.updated_at;
      delete standardized.updated_at;
    }

    // Source-specific standardizations
    switch (sourceKey) {
      case 'contacts':
        if (standardized.email) standardized.email = standardized.email.toLowerCase();
        if (standardized.name) standardized.name = standardized.name.trim();
        break;

      case 'finances':
        if (standardized.amount) standardized.amount = parseFloat(standardized.amount);
        break;

      case 'projects':
        if (standardized.progress) standardized.progress = Math.max(0, Math.min(100, standardized.progress));
        break;
    }

    return standardized;
  }

  /**
   * Enrich data with additional information
   */
  async enrichData(data, sourceKey, correlationId) {
    // Add computed fields and enrichments
    if (Array.isArray(data)) {
      return data.map(item => this.enrichItem(item, sourceKey));
    } else {
      return this.enrichItem(data, sourceKey);
    }
  }

  enrichItem(item, sourceKey) {
    const enriched = { ...item };

    // Add timestamps
    enriched.processedAt = new Date().toISOString();
    enriched.dataSource = sourceKey;

    // Source-specific enrichments
    switch (sourceKey) {
      case 'contacts':
        enriched.hasRecentActivity = this.checkRecentContactActivity(enriched);
        enriched.communicationFrequency = this.calculateCommunicationFrequency(enriched);
        break;

      case 'finances':
        enriched.impactLevel = this.calculateFinancialImpact(enriched);
        break;

      case 'projects':
        enriched.healthScore = this.calculateProjectHealth(enriched);
        enriched.completionTrend = this.calculateCompletionTrend(enriched);
        break;

      case 'calendar':
        enriched.efficiency = this.calculateMeetingEfficiency(enriched);
        break;
    }

    return enriched;
  }

  /**
   * Score data for intelligence ranking
   */
  async scoreData(data, sourceKey, correlationId) {
    if (Array.isArray(data)) {
      return data.map(item => this.scoreItem(item, sourceKey));
    } else {
      return this.scoreItem(data, sourceKey);
    }
  }

  scoreItem(item, sourceKey) {
    const scored = { ...item };

    switch (sourceKey) {
      case 'contacts':
        scored.opportunityScore = scored.opportunityScore || this.calculateOpportunityScore(scored);
        scored.priorityScore = this.calculateContactPriority(scored);
        break;

      case 'projects':
        scored.urgencyScore = scored.urgencyScore || this.calculateUrgencyScore(scored);
        scored.impactScore = this.calculateProjectImpact(scored);
        break;

      case 'insights':
        scored.relevanceScore = this.calculateInsightRelevance(scored);
        break;
    }

    return scored;
  }

  /**
   * Aggregate data for summary views
   */
  async aggregateData(data, sourceKey, correlationId) {
    // For most sources, return data as-is
    // Aggregation happens at the API level
    return data;
  }

  /**
   * Helper methods for scoring and enrichment
   */
  checkRecentContactActivity(contact) {
    if (!contact.lastContact) return false;
    const daysSinceContact = (Date.now() - new Date(contact.lastContact).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceContact <= 30;
  }

  calculateCommunicationFrequency(contact) {
    // Simplified frequency calculation
    if (contact.interactions && contact.interactions.length > 0) {
      return contact.interactions.length > 10 ? 'high' :
             contact.interactions.length > 5 ? 'medium' : 'low';
    }
    return 'unknown';
  }

  calculateFinancialImpact(transaction) {
    const amount = Math.abs(transaction.amount || 0);
    return amount > 10000 ? 'high' :
           amount > 1000 ? 'medium' : 'low';
  }

  calculateProjectHealth(project) {
    let score = 50; // Base score

    if (project.status === 'active') score += 20;
    if (project.progress > 80) score += 20;
    if (project.dueDate && new Date(project.dueDate) > Date.now()) score += 10;

    return Math.min(100, score);
  }

  calculateCompletionTrend(project) {
    // Simplified trend calculation
    if (project.progress >= 90) return 'completing';
    if (project.progress >= 50) return 'progressing';
    if (project.progress >= 10) return 'starting';
    return 'planning';
  }

  calculateMeetingEfficiency(meeting) {
    const duration = new Date(meeting.endTime) - new Date(meeting.startTime);
    const attendeeCount = meeting.attendees ? meeting.attendees.length : 1;

    // Efficiency based on duration and attendee count
    return duration <= 1800000 && attendeeCount <= 5 ? 'high' : 'medium'; // 30 minutes
  }

  calculateOpportunityScore(contact) {
    let score = 30; // Base score

    if (contact.hasRecentActivity) score += 20;
    if (contact.organisation) score += 15;
    if (contact.email) score += 10;
    if (contact.phone) score += 10;
    if (contact.tags && contact.tags.includes('strategic')) score += 15;

    return Math.min(100, score);
  }

  calculateContactPriority(contact) {
    return contact.opportunityScore > 70 ? 'high' :
           contact.opportunityScore > 40 ? 'medium' : 'low';
  }

  calculateUrgencyScore(project) {
    let score = 30; // Base score

    if (project.priority === 'urgent') score += 30;
    else if (project.priority === 'high') score += 20;
    else if (project.priority === 'medium') score += 10;

    if (project.dueDate) {
      const daysUntilDue = (new Date(project.dueDate) - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilDue <= 1) score += 25;
      else if (daysUntilDue <= 7) score += 15;
      else if (daysUntilDue <= 30) score += 5;
    }

    if (project.status === 'active') score += 15;

    return Math.min(100, score);
  }

  calculateProjectImpact(project) {
    // Simplified impact scoring
    if (project.priority === 'urgent' || project.priority === 'high') return 'high';
    return 'medium';
  }

  calculateInsightRelevance(insight) {
    let score = 50; // Base score

    if (insight.priority === 'high') score += 30;
    else if (insight.priority === 'medium') score += 15;

    if (insight.actionable) score += 20;

    return Math.min(100, score);
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(results) {
    this.performanceMetrics.totalSyncs++;
    this.performanceMetrics.successfulSyncs += results.successful.length;
    this.performanceMetrics.failedSyncs += results.failed.length;

    // Update average sync time
    const totalTime = results.successful.reduce((sum, result) => sum + result.syncTime, 0);
    const totalCount = results.successful.length;
    if (totalCount > 0) {
      this.performanceMetrics.avgSyncTime =
        (this.performanceMetrics.avgSyncTime + (totalTime / totalCount)) / 2;
    }

    // Update data quality score
    const qualityScores = results.successful
      .map(result => result.dataQuality)
      .filter(score => score > 0);

    if (qualityScores.length > 0) {
      const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
      this.performanceMetrics.dataQualityScore =
        (this.performanceMetrics.dataQualityScore + avgQuality) / 2;
    }
  }

  /**
   * Get integration status and performance metrics
   */
  getStatus() {
    const connectorStatus = {};

    for (const [key, connector] of this.dataSourceConnectors) {
      connectorStatus[key] = {
        name: connector.name,
        status: connector.status,
        lastSync: connector.lastSync,
        syncInterval: connector.syncInterval,
        nextSyncDue: connector.lastSync ?
          new Date(connector.lastSync.getTime() + connector.syncInterval) :
          'Immediately'
      };
    }

    return {
      connectors: connectorStatus,
      performance: this.performanceMetrics,
      pipelines: Array.from(this.transformationPipelines.keys()),
      validationRules: Array.from(this.validationRules.keys())
    };
  }

  /**
   * Schedule automatic syncing
   */
  startScheduledSync() {
    // Run sync check every minute
    this.syncInterval = setInterval(async () => {
      try {
        const sourcesToSync = this.determineSyncSources(false);
        if (sourcesToSync.length > 0) {
          this.logger.info(`Scheduled sync triggered for sources: ${sourcesToSync.join(', ')}`);
          await this.syncAllData('system', { scheduledSync: true });
        }
      } catch (error) {
        this.logger.error('Scheduled sync failed:', error);
      }
    }, 60000); // Check every minute

    this.logger.info('Scheduled sync started - checking every 60 seconds');
  }

  /**
   * Stop scheduled syncing
   */
  stopScheduledSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.logger.info('Scheduled sync stopped');
    }
  }
}

// Create and export service instance
export const intelligenceDataIntegrationService = new IntelligenceDataIntegrationService();

// Auto-start scheduled syncing
intelligenceDataIntegrationService.startScheduledSync();

export default intelligenceDataIntegrationService;