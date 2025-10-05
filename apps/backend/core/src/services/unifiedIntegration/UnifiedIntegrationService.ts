/**
 * UnifiedIntegrationService
 * Core service that consolidates Gmail, LinkedIn, Notion, and Supabase data
 * Replaces scattered API endpoints with unified /api/v2/integrations architecture
 */

import {
  IIntegrationService,
  Contact,
  Project,
  FinanceData,
  ContactFilters,
  ProjectFilters,
  FinanceFilters,
  IntegrationResponse
} from './interfaces/IIntegrationService.js';

import {
  IntegrationError,
  ContactIntegrationError,
  ProjectIntegrationError,
  FinanceIntegrationError,
  ServiceUnavailableError
} from './errors/IntegrationErrors.js';

import { IntegrationLogger } from './utils/Logger.js';
import { RedisCacheService, CacheOptions } from './cache/RedisCacheService.js';

// Service provider interfaces (to be implemented)
interface ILinkedInService {
  getContacts(filters?: ContactFilters): Promise<Contact[]>;
  isHealthy(): Promise<boolean>;
}

interface IGmailService {
  getContacts(filters?: ContactFilters): Promise<Contact[]>;
  isHealthy(): Promise<boolean>;
}

interface INotionService {
  getContacts(filters?: ContactFilters): Promise<Contact[]>;
  getProjects(filters?: ProjectFilters): Promise<Project[]>;
  isHealthy(): Promise<boolean>;
}

interface ISupabaseService {
  getContacts(filters?: ContactFilters): Promise<Contact[]>;
  getProjects(filters?: ProjectFilters): Promise<Project[]>;
  getFinanceData(filters?: FinanceFilters): Promise<FinanceData[]>;
  isHealthy(): Promise<boolean>;
}

interface IXeroService {
  getFinanceData(filters?: FinanceFilters): Promise<FinanceData[]>;
  isHealthy(): Promise<boolean>;
}

interface ICacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: CacheOptions): Promise<void>;
  del(key: string): Promise<void>;
  invalidateByTags(tags: string[]): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  clearAll(): Promise<void>;
  isHealthy(): Promise<boolean>;
  getStats(): Promise<any>;
}

export class UnifiedIntegrationService implements IIntegrationService {
  private readonly logger: IntegrationLogger;
  private readonly serviceStartTime: number;

  constructor(
    private readonly linkedInService?: ILinkedInService,
    private readonly gmailService?: IGmailService,
    private readonly notionService?: INotionService,
    private readonly supabaseService?: ISupabaseService,
    private readonly xeroService?: IXeroService,
    private readonly cacheService?: ICacheService
  ) {
    this.logger = IntegrationLogger.getInstance();
    this.serviceStartTime = Date.now();

    this.logger.info('UnifiedIntegrationService initialized', {
      correlationId: this.logger.generateCorrelationId(),
      service: 'UnifiedIntegrationService',
      operation: 'constructor',
      metadata: {
        servicesConnected: {
          linkedin: !!linkedInService,
          gmail: !!gmailService,
          notion: !!notionService,
          supabase: !!supabaseService,
          xero: !!xeroService,
          cache: !!cacheService
        }
      }
    });
  }

  async getContacts(filters: ContactFilters = {}): Promise<IntegrationResponse<Contact[]>> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'UnifiedIntegrationService', 'getContacts');
    const startTime = Date.now();

    try {
      timedLogger.info('Starting contact retrieval', { filters });

      // Check cache first
      const cacheKey = this.generateCacheKey('contacts', filters);
      let cachedData: string | null = null;

      if (this.cacheService) {
        try {
          cachedData = await this.cacheService.get(cacheKey);
          this.logger.logCacheOperation(correlationId, cachedData ? 'hit' : 'miss', cacheKey);
        } catch (error) {
          timedLogger.warn('Cache retrieval failed, continuing without cache', { error: error.message });
        }
      }

      if (cachedData) {
        const cachedContacts = JSON.parse(cachedData);
        timedLogger.info('Returning cached contacts', { count: cachedContacts.length });
        return {
          data: cachedContacts,
          metadata: {
            sources: ['cache'],
            cacheHit: true,
            processingTimeMs: Date.now() - startTime,
            correlationId
          }
        };
      }

      // Fetch from multiple sources in parallel
      const sourcePromises: Array<{ name: string; promise: Promise<Contact[]> }> = [];
      const sources: string[] = [];

      if (this.linkedInService) {
        sourcePromises.push({
          name: 'linkedin',
          promise: this.linkedInService.getContacts(filters)
        });
        sources.push('linkedin');
      }

      if (this.gmailService) {
        sourcePromises.push({
          name: 'gmail',
          promise: this.gmailService.getContacts(filters)
        });
        sources.push('gmail');
      }

      if (this.notionService) {
        sourcePromises.push({
          name: 'notion',
          promise: this.notionService.getContacts(filters)
        });
        sources.push('notion');
      }

      if (this.supabaseService) {
        sourcePromises.push({
          name: 'supabase',
          promise: this.supabaseService.getContacts(filters)
        });
        sources.push('supabase');
      }

      if (sourcePromises.length === 0) {
        throw new ServiceUnavailableError(
          'No contact services available',
          'UnifiedIntegrationService',
          correlationId
        );
      }

      timedLogger.info('Fetching contacts from multiple sources', { sources });

      // Execute all promises with individual error handling
      const sourceResults = await Promise.allSettled(
        sourcePromises.map(async ({ name, promise }) => {
          try {
            const result = await promise;
            timedLogger.debug(`Successfully fetched from ${name}`, { count: result.length });
            return { name, data: result, success: true };
          } catch (error) {
            timedLogger.warn(`Failed to fetch from ${name}`, { error: error.message });
            return { name, data: [], success: false, error };
          }
        })
      );

      // Extract successful results
      const allContacts: Contact[] = [];
      const successfulSources: string[] = [];
      const failedSources: Array<{ name: string; error: any }> = [];

      sourceResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { name, data, success, error } = result.value;
          if (success) {
            allContacts.push(...data);
            successfulSources.push(name);
          } else {
            failedSources.push({ name, error });
          }
        } else {
          failedSources.push({
            name: sourcePromises[index].name,
            error: result.reason
          });
        }
      });

      if (allContacts.length === 0 && failedSources.length > 0) {
        throw new ContactIntegrationError(
          'All contact sources failed',
          'UnifiedIntegrationService',
          correlationId,
          { failedSources }
        );
      }

      // Merge and deduplicate contacts
      const originalCount = allContacts.length;
      const mergedContacts = await this.mergeAndDeduplicateContacts(allContacts, correlationId);

      this.logger.logDataMerge(
        correlationId,
        successfulSources,
        originalCount,
        mergedContacts.length,
        Date.now() - startTime
      );

      // Enrich with relationship intelligence
      const enrichedContacts = await this.enrichContactsWithRelationshipData(mergedContacts, correlationId);

      // Apply sorting and pagination
      const processedContacts = this.applySortingAndPagination(enrichedContacts, filters);

      // Cache results with tags for invalidation strategies
      if (this.cacheService && processedContacts.length > 0) {
        try {
          const cacheTags = this.generateCacheTags('contacts', successfulSources, filters);
          await this.cacheService.set(cacheKey, JSON.stringify(processedContacts), {
            ttl: 3600, // 1 hour TTL
            compress: processedContacts.length > 100, // Compress large datasets
            tags: cacheTags
          });
          this.logger.logCacheOperation(correlationId, 'set', cacheKey);
        } catch (error) {
          timedLogger.warn('Failed to cache results', { error: error.message });
        }
      }

      const response: IntegrationResponse<Contact[]> = {
        data: processedContacts,
        pagination: this.generatePagination(enrichedContacts.length, filters),
        metadata: {
          sources: successfulSources,
          cacheHit: false,
          processingTimeMs: Date.now() - startTime,
          correlationId
        }
      };

      timedLogger.finish(true, {
        totalContacts: processedContacts.length,
        sources: successfulSources,
        failedSources: failedSources.map(f => f.name)
      });

      return response;

    } catch (error) {
      timedLogger.error('Contact retrieval failed', error);
      timedLogger.finish(false);

      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new ContactIntegrationError(
        'Unexpected error during contact retrieval',
        'UnifiedIntegrationService',
        correlationId,
        { originalError: error.message }
      );
    }
  }

  async getProjects(filters: ProjectFilters = {}): Promise<IntegrationResponse<Project[]>> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'UnifiedIntegrationService', 'getProjects');
    const startTime = Date.now();

    try {
      timedLogger.info('Starting project retrieval', { filters });

      // Check cache first
      const cacheKey = this.generateCacheKey('projects', filters);
      let cachedData: string | null = null;

      if (this.cacheService) {
        try {
          cachedData = await this.cacheService.get(cacheKey);
          this.logger.logCacheOperation(correlationId, cachedData ? 'hit' : 'miss', cacheKey);
        } catch (error) {
          timedLogger.warn('Cache retrieval failed, continuing without cache', { error: error.message });
        }
      }

      if (cachedData) {
        const cachedProjects = JSON.parse(cachedData);
        timedLogger.info('Returning cached projects', { count: cachedProjects.length });
        return {
          data: cachedProjects,
          metadata: {
            sources: ['cache'],
            cacheHit: true,
            processingTimeMs: Date.now() - startTime,
            correlationId
          }
        };
      }

      // Fetch from multiple sources in parallel
      const sourcePromises: Array<{ name: string; promise: Promise<Project[]> }> = [];
      const sources: string[] = [];

      if (this.notionService) {
        sourcePromises.push({
          name: 'notion',
          promise: this.notionService.getProjects(filters)
        });
        sources.push('notion');
      }

      if (this.supabaseService) {
        sourcePromises.push({
          name: 'supabase',
          promise: this.supabaseService.getProjects(filters)
        });
        sources.push('supabase');
      }

      if (sourcePromises.length === 0) {
        throw new ServiceUnavailableError(
          'No project services available',
          'UnifiedIntegrationService',
          correlationId
        );
      }

      timedLogger.info('Fetching projects from multiple sources', { sources });

      // Execute all promises with individual error handling
      const sourceResults = await Promise.allSettled(
        sourcePromises.map(async ({ name, promise }) => {
          try {
            const result = await promise;
            timedLogger.debug(`Successfully fetched from ${name}`, { count: result.length });
            return { name, data: result, success: true };
          } catch (error) {
            timedLogger.warn(`Failed to fetch from ${name}`, { error: error.message });
            return { name, data: [], success: false, error };
          }
        })
      );

      // Extract successful results
      const allProjects: Project[] = [];
      const successfulSources: string[] = [];
      const failedSources: Array<{ name: string; error: any }> = [];

      sourceResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { name, data, success, error } = result.value;
          if (success) {
            allProjects.push(...data);
            successfulSources.push(name);
          } else {
            failedSources.push({ name, error });
          }
        } else {
          failedSources.push({
            name: sourcePromises[index].name,
            error: result.reason
          });
        }
      });

      if (allProjects.length === 0 && failedSources.length > 0) {
        throw new ProjectIntegrationError(
          'All project sources failed',
          'UnifiedIntegrationService',
          correlationId,
          { failedSources }
        );
      }

      // Merge and deduplicate projects
      const originalCount = allProjects.length;
      const mergedProjects = await this.mergeAndDeduplicateProjects(allProjects, correlationId);

      this.logger.logDataMerge(
        correlationId,
        successfulSources,
        originalCount,
        mergedProjects.length,
        Date.now() - startTime
      );

      // Apply sorting and pagination
      const processedProjects = this.applySortingAndPaginationForProjects(mergedProjects, filters);

      // Cache results with tags for invalidation strategies
      if (this.cacheService && processedProjects.length > 0) {
        try {
          const cacheTags = this.generateCacheTags('projects', successfulSources, filters);
          await this.cacheService.set(cacheKey, JSON.stringify(processedProjects), {
            ttl: 1800, // 30 minutes TTL
            compress: processedProjects.length > 50, // Compress large datasets
            tags: cacheTags
          });
          this.logger.logCacheOperation(correlationId, 'set', cacheKey);
        } catch (error) {
          timedLogger.warn('Failed to cache results', { error: error.message });
        }
      }

      const response: IntegrationResponse<Project[]> = {
        data: processedProjects,
        pagination: this.generatePaginationForProjects(mergedProjects.length, filters),
        metadata: {
          sources: successfulSources,
          cacheHit: false,
          processingTimeMs: Date.now() - startTime,
          correlationId
        }
      };

      timedLogger.finish(true, {
        totalProjects: processedProjects.length,
        sources: successfulSources,
        failedSources: failedSources.map(f => f.name)
      });

      return response;

    } catch (error) {
      timedLogger.error('Project retrieval failed', error);
      timedLogger.finish(false);

      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new ProjectIntegrationError(
        'Unexpected error during project retrieval',
        'UnifiedIntegrationService',
        correlationId,
        { originalError: error.message }
      );
    }
  }

  async getFinanceData(filters: FinanceFilters = {}): Promise<IntegrationResponse<FinanceData[]>> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'UnifiedIntegrationService', 'getFinanceData');
    const startTime = Date.now();

    try {
      timedLogger.info('Starting finance data retrieval', { filters });

      // Check cache first
      const cacheKey = this.generateCacheKey('finance', filters);
      let cachedData: string | null = null;

      if (this.cacheService) {
        try {
          cachedData = await this.cacheService.get(cacheKey);
          this.logger.logCacheOperation(correlationId, cachedData ? 'hit' : 'miss', cacheKey);
        } catch (error) {
          timedLogger.warn('Cache retrieval failed, continuing without cache', { error: error.message });
        }
      }

      if (cachedData) {
        const cachedFinanceData = JSON.parse(cachedData);
        timedLogger.info('Returning cached finance data', { count: cachedFinanceData.length });
        return {
          data: cachedFinanceData,
          metadata: {
            sources: ['cache'],
            cacheHit: true,
            processingTimeMs: Date.now() - startTime,
            correlationId
          }
        };
      }

      // Fetch from multiple sources in parallel
      const sourcePromises: Array<{ name: string; promise: Promise<FinanceData[]> }> = [];
      const sources: string[] = [];

      if (this.xeroService) {
        sourcePromises.push({
          name: 'xero',
          promise: this.xeroService.getFinanceData(filters)
        });
        sources.push('xero');
      }

      if (this.supabaseService) {
        sourcePromises.push({
          name: 'supabase',
          promise: this.supabaseService.getFinanceData(filters)
        });
        sources.push('supabase');
      }

      if (sourcePromises.length === 0) {
        throw new ServiceUnavailableError(
          'No finance services available',
          'UnifiedIntegrationService',
          correlationId
        );
      }

      timedLogger.info('Fetching finance data from multiple sources', { sources });

      // Execute all promises with individual error handling
      const sourceResults = await Promise.allSettled(
        sourcePromises.map(async ({ name, promise }) => {
          try {
            const result = await promise;
            timedLogger.debug(`Successfully fetched from ${name}`, { count: result.length });
            return { name, data: result, success: true };
          } catch (error) {
            timedLogger.warn(`Failed to fetch from ${name}`, { error: error.message });
            return { name, data: [], success: false, error };
          }
        })
      );

      // Extract successful results
      const allFinanceData: FinanceData[] = [];
      const successfulSources: string[] = [];
      const failedSources: Array<{ name: string; error: any }> = [];

      sourceResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { name, data, success, error } = result.value;
          if (success) {
            allFinanceData.push(...data);
            successfulSources.push(name);
          } else {
            failedSources.push({ name, error });
          }
        } else {
          failedSources.push({
            name: sourcePromises[index].name,
            error: result.reason
          });
        }
      });

      if (allFinanceData.length === 0 && failedSources.length > 0) {
        throw new FinanceIntegrationError(
          'All finance sources failed',
          'UnifiedIntegrationService',
          correlationId,
          { failedSources }
        );
      }

      // Merge and deduplicate finance data
      const originalCount = allFinanceData.length;
      const mergedFinanceData = await this.mergeAndDeduplicateFinanceData(allFinanceData, correlationId);

      this.logger.logDataMerge(
        correlationId,
        successfulSources,
        originalCount,
        mergedFinanceData.length,
        Date.now() - startTime
      );

      // Apply sorting and pagination
      const processedFinanceData = this.applySortingAndPaginationForFinanceData(mergedFinanceData, filters);

      // Cache results with tags for invalidation strategies (shorter TTL for financial data)
      if (this.cacheService && processedFinanceData.length > 0) {
        try {
          const cacheTags = this.generateCacheTags('finance', successfulSources, filters);
          await this.cacheService.set(cacheKey, JSON.stringify(processedFinanceData), {
            ttl: 600, // 10 minutes TTL for financial data (more sensitive)
            compress: processedFinanceData.length > 100, // Compress large datasets
            tags: cacheTags
          });
          this.logger.logCacheOperation(correlationId, 'set', cacheKey);
        } catch (error) {
          timedLogger.warn('Failed to cache results', { error: error.message });
        }
      }

      const response: IntegrationResponse<FinanceData[]> = {
        data: processedFinanceData,
        pagination: this.generatePaginationForFinanceData(mergedFinanceData.length, filters),
        metadata: {
          sources: successfulSources,
          cacheHit: false,
          processingTimeMs: Date.now() - startTime,
          correlationId
        }
      };

      timedLogger.finish(true, {
        totalTransactions: processedFinanceData.length,
        totalAmount: processedFinanceData.reduce((sum, item) => sum + item.amount, 0),
        sources: successfulSources,
        failedSources: failedSources.map(f => f.name)
      });

      return response;

    } catch (error) {
      timedLogger.error('Finance data retrieval failed', error);
      timedLogger.finish(false);

      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new FinanceIntegrationError(
        'Unexpected error during finance data retrieval',
        'UnifiedIntegrationService',
        correlationId,
        { originalError: error.message }
      );
    }
  }

  async getHealthStatus() {
    const correlationId = this.logger.generateCorrelationId();
    const services: Record<string, { status: string; lastCheck: string; responseTime?: number }> = {};

    // Check each service health
    const healthChecks = [
      { name: 'linkedin', service: this.linkedInService },
      { name: 'gmail', service: this.gmailService },
      { name: 'notion', service: this.notionService },
      { name: 'supabase', service: this.supabaseService },
      { name: 'xero', service: this.xeroService },
      { name: 'cache', service: this.cacheService }
    ];

    for (const { name, service } of healthChecks) {
      if (service) {
        const startTime = Date.now();
        try {
          const isHealthy = await service.isHealthy();
          const responseTime = Date.now() - startTime;
          services[name] = {
            status: isHealthy ? 'healthy' : 'unhealthy',
            lastCheck: new Date().toISOString(),
            responseTime
          };
        } catch (error) {
          services[name] = {
            status: 'error',
            lastCheck: new Date().toISOString(),
            responseTime: Date.now() - startTime
          };
        }
      } else {
        services[name] = {
          status: 'not_configured',
          lastCheck: new Date().toISOString()
        };
      }
    }

    const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalServices = Object.keys(services).filter(key => services[key].status !== 'not_configured').length;

    const overallStatus =
      healthyServices === totalServices ? 'healthy' :
      healthyServices > totalServices / 2 ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus,
      services,
      uptime: Date.now() - this.serviceStartTime
    };
  }

  // Private helper methods
  private async mergeAndDeduplicateContacts(contacts: Contact[], correlationId: string): Promise<Contact[]> {
    if (contacts.length === 0) return [];

    const timedLogger = this.logger.createTimedLogger(correlationId, 'UnifiedIntegrationService', 'mergeAndDeduplicate');

    try {
      // Enterprise-grade deduplication using multiple matching strategies
      const deduplicationMap = new Map<string, Contact>();

      contacts.forEach(contact => {
        // Primary key: email address (most reliable)
        if (contact.emailAddress) {
          const emailKey = `email:${contact.emailAddress.toLowerCase()}`;
          const existing = deduplicationMap.get(emailKey);

          if (existing) {
            // Merge contact data, preferring higher quality source
            deduplicationMap.set(emailKey, this.mergeContactData(existing, contact));
          } else {
            deduplicationMap.set(emailKey, contact);
          }
          return;
        }

        // Secondary key: name + company (for contacts without email)
        if (contact.fullName && contact.currentCompany) {
          const nameCompanyKey = `name-company:${contact.fullName.toLowerCase()}-${contact.currentCompany.toLowerCase()}`;
          const existing = deduplicationMap.get(nameCompanyKey);

          if (existing) {
            deduplicationMap.set(nameCompanyKey, this.mergeContactData(existing, contact));
          } else {
            deduplicationMap.set(nameCompanyKey, contact);
          }
          return;
        }

        // Fallback: just name (less reliable)
        if (contact.fullName) {
          const nameKey = `name:${contact.fullName.toLowerCase()}`;
          const existing = deduplicationMap.get(nameKey);

          if (!existing) {
            deduplicationMap.set(nameKey, contact);
          }
        }
      });

      const deduplicated = Array.from(deduplicationMap.values());

      timedLogger.finish(true, {
        originalCount: contacts.length,
        deduplicatedCount: deduplicated.length,
        duplicatesRemoved: contacts.length - deduplicated.length,
        deduplicationStrategy: 'enterprise_multi_key'
      });

      return deduplicated;
    } catch (error) {
      timedLogger.error('Deduplication failed', error);
      timedLogger.finish(false);
      return contacts; // Return original contacts if deduplication fails
    }
  }

  /**
   * Merge two contact records, preferring higher quality data
   */
  private mergeContactData(existing: Contact, newContact: Contact): Contact {
    // Determine data source priority (Supabase > LinkedIn > Gmail > Notion)
    const sourcePriority = {
      'supabase': 4,
      'linkedin': 3,
      'gmail': 2,
      'notion': 1
    };

    const existingPriority = sourcePriority[existing.dataSource || ''] || 0;
    const newPriority = sourcePriority[newContact.dataSource || ''] || 0;

    // If new contact has higher priority source, prefer its core data
    const primaryContact = newPriority > existingPriority ? newContact : existing;
    const secondaryContact = newPriority > existingPriority ? existing : newContact;

    return {
      ...primaryContact,
      // Merge email addresses (prefer non-empty)
      emailAddress: primaryContact.emailAddress || secondaryContact.emailAddress,
      // Merge company info (prefer more complete)
      currentCompany: primaryContact.currentCompany || secondaryContact.currentCompany,
      currentPosition: primaryContact.currentPosition || secondaryContact.currentPosition,
      // Merge relationship scores (take maximum)
      relationshipScore: Math.max(
        primaryContact.relationshipScore || 0,
        secondaryContact.relationshipScore || 0
      ),
      // Merge strategic value (prefer higher)
      strategicValue: this.mergeStrategicValue(
        primaryContact.strategicValue,
        secondaryContact.strategicValue
      ),
      // Merge enrichment data
      enrichmentData: {
        ...secondaryContact.enrichmentData,
        ...primaryContact.enrichmentData,
        mergedFrom: [
          ...(primaryContact.enrichmentData?.mergedFrom || [primaryContact.dataSource]),
          ...(secondaryContact.enrichmentData?.mergedFrom || [secondaryContact.dataSource])
        ].filter(Boolean)
      }
    };
  }

  /**
   * Merge strategic values, preferring higher priority
   */
  private mergeStrategicValue(
    value1?: 'high' | 'medium' | 'low' | 'unknown',
    value2?: 'high' | 'medium' | 'low' | 'unknown'
  ): 'high' | 'medium' | 'low' | 'unknown' {
    const priority = { 'high': 4, 'medium': 3, 'low': 2, 'unknown': 1 };

    const priority1 = priority[value1 || 'unknown'];
    const priority2 = priority[value2 || 'unknown'];

    return priority1 >= priority2 ? (value1 || 'unknown') : (value2 || 'unknown');
  }

  private async enrichContactsWithRelationshipData(contacts: Contact[], correlationId: string): Promise<Contact[]> {
    // TODO: Implement relationship intelligence enrichment
    // For now, return contacts as-is
    return contacts;
  }

  private applySortingAndPagination(contacts: Contact[], filters: ContactFilters): Contact[] {
    let sorted = [...contacts];

    // Apply sorting
    if (filters.sortBy) {
      sorted.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (filters.sortBy) {
          case 'name':
            aValue = a.fullName || `${a.firstName} ${a.lastName}`;
            bValue = b.fullName || `${b.firstName} ${b.lastName}`;
            break;
          case 'company':
            aValue = a.currentCompany || '';
            bValue = b.currentCompany || '';
            break;
          case 'lastInteraction':
            aValue = a.lastInteraction ? new Date(a.lastInteraction) : new Date(0);
            bValue = b.lastInteraction ? new Date(b.lastInteraction) : new Date(0);
            break;
          case 'relationshipScore':
            aValue = a.relationshipScore || 0;
            bValue = b.relationshipScore || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    return sorted.slice(offset, offset + limit);
  }

  private generatePagination(totalCount: number, filters: ContactFilters) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    return {
      total: totalCount,
      page,
      limit,
      hasNext: offset + limit < totalCount,
      hasPrev: offset > 0
    };
  }

  /**
   * Project-specific helper methods
   */
  private async mergeAndDeduplicateProjects(projects: Project[], correlationId: string): Promise<Project[]> {
    if (projects.length === 0) return [];

    const timedLogger = this.logger.createTimedLogger(correlationId, 'UnifiedIntegrationService', 'mergeAndDeduplicateProjects');

    try {
      // Enterprise-grade project deduplication using multiple matching strategies
      const deduplicationMap = new Map<string, Project>();

      projects.forEach(project => {
        // Primary key: notionId (most reliable for cross-source matching)
        if (project.notionId) {
          const notionKey = `notion:${project.notionId}`;
          const existing = deduplicationMap.get(notionKey);

          if (existing) {
            deduplicationMap.set(notionKey, this.mergeProjectData(existing, project));
          } else {
            deduplicationMap.set(notionKey, project);
          }
          return;
        }

        // Secondary key: title + startDate (for projects without notionId)
        if (project.title && project.startDate) {
          const titleDateKey = `title-date:${project.title.toLowerCase()}-${project.startDate}`;
          const existing = deduplicationMap.get(titleDateKey);

          if (existing) {
            deduplicationMap.set(titleDateKey, this.mergeProjectData(existing, project));
          } else {
            deduplicationMap.set(titleDateKey, project);
          }
          return;
        }

        // Fallback: just title (less reliable)
        if (project.title) {
          const titleKey = `title:${project.title.toLowerCase()}`;
          const existing = deduplicationMap.get(titleKey);

          if (!existing) {
            deduplicationMap.set(titleKey, project);
          }
        }
      });

      const deduplicated = Array.from(deduplicationMap.values());

      timedLogger.finish(true, {
        originalCount: projects.length,
        deduplicatedCount: deduplicated.length,
        duplicatesRemoved: projects.length - deduplicated.length,
        deduplicationStrategy: 'enterprise_project_multi_key'
      });

      return deduplicated;
    } catch (error) {
      timedLogger.error('Project deduplication failed', error);
      timedLogger.finish(false);
      return projects;
    }
  }

  private mergeProjectData(existing: Project, newProject: Project): Project {
    // Determine data source priority (Supabase > Notion > others)
    const sourcePriority = {
      'supabase': 3,
      'notion': 2,
      'other': 1
    };

    const existingPriority = sourcePriority[existing.metadata?.dataSource || 'other'];
    const newPriority = sourcePriority[newProject.metadata?.dataSource || 'other'];

    const primaryProject = newPriority > existingPriority ? newProject : existing;
    const secondaryProject = newPriority > existingPriority ? existing : newProject;

    return {
      ...primaryProject,
      // Merge contacts (combine and deduplicate)
      contacts: this.mergeProjectContacts(primaryProject.contacts || [], secondaryProject.contacts || []),
      // Merge budget info (prefer non-null values)
      budget: primaryProject.budget || secondaryProject.budget,
      actualCost: primaryProject.actualCost || secondaryProject.actualCost,
      // Merge progress (prefer higher)
      progress: Math.max(primaryProject.progress || 0, secondaryProject.progress || 0),
      // Merge tags
      tags: [...new Set([...(primaryProject.tags || []), ...(secondaryProject.tags || [])])],
      // Merge metadata
      metadata: {
        ...secondaryProject.metadata,
        ...primaryProject.metadata,
        mergedFrom: [
          ...(primaryProject.metadata?.mergedFrom || [primaryProject.metadata?.dataSource]),
          ...(secondaryProject.metadata?.mergedFrom || [secondaryProject.metadata?.dataSource])
        ].filter(Boolean)
      }
    };
  }

  private mergeProjectContacts(contacts1: Contact[], contacts2: Contact[]): Contact[] {
    const contactMap = new Map<string, Contact>();

    [...contacts1, ...contacts2].forEach(contact => {
      const key = contact.emailAddress || contact.fullName || contact.id;
      if (key && !contactMap.has(key)) {
        contactMap.set(key, contact);
      }
    });

    return Array.from(contactMap.values());
  }

  private applySortingAndPaginationForProjects(projects: Project[], filters: ProjectFilters): Project[] {
    let sorted = [...projects];

    // Apply sorting
    if (filters.sortBy) {
      sorted.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (filters.sortBy) {
          case 'title':
            aValue = a.title || '';
            bValue = b.title || '';
            break;
          case 'startDate':
            aValue = a.startDate ? new Date(a.startDate) : new Date(0);
            bValue = b.startDate ? new Date(b.startDate) : new Date(0);
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'progress':
            aValue = a.progress || 0;
            bValue = b.progress || 0;
            break;
          case 'budget':
            aValue = a.budget || 0;
            bValue = b.budget || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 25;

    return sorted.slice(offset, offset + limit);
  }

  private generatePaginationForProjects(totalCount: number, filters: ProjectFilters) {
    const limit = filters.limit || 25;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    return {
      total: totalCount,
      page,
      limit,
      hasNext: offset + limit < totalCount,
      hasPrev: offset > 0
    };
  }

  /**
   * Finance-specific helper methods
   */
  private async mergeAndDeduplicateFinanceData(financeData: FinanceData[], correlationId: string): Promise<FinanceData[]> {
    if (financeData.length === 0) return [];

    const timedLogger = this.logger.createTimedLogger(correlationId, 'UnifiedIntegrationService', 'mergeAndDeduplicateFinanceData');

    try {
      // Enterprise-grade finance data deduplication
      const deduplicationMap = new Map<string, FinanceData>();

      financeData.forEach(transaction => {
        // Primary key: xeroId (most reliable for transaction matching)
        if (transaction.xeroId) {
          const xeroKey = `xero:${transaction.xeroId}`;
          const existing = deduplicationMap.get(xeroKey);

          if (existing) {
            deduplicationMap.set(xeroKey, this.mergeFinanceData(existing, transaction));
          } else {
            deduplicationMap.set(xeroKey, transaction);
          }
          return;
        }

        // Secondary key: amount + date + description (for non-Xero transactions)
        if (transaction.amount && transaction.date && transaction.description) {
          const amountDateDescKey = `amount-date-desc:${transaction.amount}-${transaction.date}-${transaction.description.substring(0, 50).toLowerCase()}`;
          const existing = deduplicationMap.get(amountDateDescKey);

          if (existing) {
            deduplicationMap.set(amountDateDescKey, this.mergeFinanceData(existing, transaction));
          } else {
            deduplicationMap.set(amountDateDescKey, transaction);
          }
          return;
        }

        // Fallback: amount + date (less reliable)
        if (transaction.amount && transaction.date) {
          const amountDateKey = `amount-date:${transaction.amount}-${transaction.date}`;
          const existing = deduplicationMap.get(amountDateKey);

          if (!existing) {
            deduplicationMap.set(amountDateKey, transaction);
          }
        }
      });

      const deduplicated = Array.from(deduplicationMap.values());

      timedLogger.finish(true, {
        originalCount: financeData.length,
        deduplicatedCount: deduplicated.length,
        duplicatesRemoved: financeData.length - deduplicated.length,
        totalAmount: deduplicated.reduce((sum, item) => sum + item.amount, 0),
        deduplicationStrategy: 'enterprise_finance_multi_key'
      });

      return deduplicated;
    } catch (error) {
      timedLogger.error('Finance data deduplication failed', error);
      timedLogger.finish(false);
      return financeData;
    }
  }

  private mergeFinanceData(existing: FinanceData, newTransaction: FinanceData): FinanceData {
    // Determine data source priority (Xero > Supabase > others)
    const sourcePriority = {
      'xero': 3,
      'supabase': 2,
      'other': 1
    };

    const existingPriority = sourcePriority[existing.metadata?.dataSource || 'other'];
    const newPriority = sourcePriority[newTransaction.metadata?.dataSource || 'other'];

    const primaryTransaction = newPriority > existingPriority ? newTransaction : existing;
    const secondaryTransaction = newPriority > existingPriority ? existing : newTransaction;

    return {
      ...primaryTransaction,
      // Merge description (prefer longer, more detailed)
      description: (primaryTransaction.description?.length || 0) > (secondaryTransaction.description?.length || 0)
        ? primaryTransaction.description
        : secondaryTransaction.description || primaryTransaction.description,
      // Merge vendor info
      vendor: primaryTransaction.vendor || secondaryTransaction.vendor,
      // Merge category (prefer non-"Uncategorized")
      category: primaryTransaction.category !== 'Uncategorized'
        ? primaryTransaction.category
        : secondaryTransaction.category || primaryTransaction.category,
      // Merge status (prefer more advanced status)
      status: this.mergeTransactionStatus(primaryTransaction.status, secondaryTransaction.status),
      // Merge metadata
      metadata: {
        ...secondaryTransaction.metadata,
        ...primaryTransaction.metadata,
        mergedFrom: [
          ...(primaryTransaction.metadata?.mergedFrom || [primaryTransaction.metadata?.dataSource]),
          ...(secondaryTransaction.metadata?.mergedFrom || [secondaryTransaction.metadata?.dataSource])
        ].filter(Boolean)
      }
    };
  }

  private mergeTransactionStatus(
    status1?: 'pending' | 'approved' | 'paid',
    status2?: 'pending' | 'approved' | 'paid'
  ): 'pending' | 'approved' | 'paid' {
    const priority = { 'paid': 3, 'approved': 2, 'pending': 1 };

    const priority1 = priority[status1 || 'pending'];
    const priority2 = priority[status2 || 'pending'];

    return priority1 >= priority2 ? (status1 || 'pending') : (status2 || 'pending');
  }

  private applySortingAndPaginationForFinanceData(financeData: FinanceData[], filters: FinanceFilters): FinanceData[] {
    let sorted = [...financeData];

    // Apply sorting
    if (filters.sortBy) {
      sorted.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (filters.sortBy) {
          case 'date':
            aValue = new Date(a.date);
            bValue = new Date(b.date);
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'category':
            aValue = a.category || '';
            bValue = b.category || '';
            break;
          case 'vendor':
            aValue = a.vendor || '';
            bValue = b.vendor || '';
            break;
          case 'type':
            aValue = a.type || '';
            bValue = b.type || '';
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    return sorted.slice(offset, offset + limit);
  }

  private generatePaginationForFinanceData(totalCount: number, filters: FinanceFilters) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    return {
      total: totalCount,
      page,
      limit,
      hasNext: offset + limit < totalCount,
      hasPrev: offset > 0
    };
  }

  /**
   * Cache Management Helper Methods
   */

  /**
   * Generate a consistent cache key for any data type and filters
   */
  private generateCacheKey(dataType: string, filters: any): string {
    // Create a stable key by sorting filter properties
    const sortedFilters = Object.keys(filters || {})
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key];
        return result;
      }, {} as any);

    // Create hash-friendly key
    const filterHash = Buffer.from(JSON.stringify(sortedFilters)).toString('base64').replace(/[+/=]/g, '');
    return `${dataType}:${filterHash.substring(0, 32)}`;
  }

  /**
   * Generate cache tags for invalidation strategies
   */
  private generateCacheTags(dataType: string, sources: string[], filters: any): string[] {
    const tags: string[] = [];

    // Base data type tag
    tags.push(`type:${dataType}`);

    // Source-specific tags
    sources.forEach(source => {
      tags.push(`source:${source}`);
      tags.push(`${dataType}:${source}`);
    });

    // Filter-specific tags
    if (filters) {
      if (filters.sources) {
        filters.sources.forEach((source: string) => tags.push(`filter:source:${source}`));
      }
      if (filters.company) {
        tags.push(`filter:company:${filters.company.toLowerCase()}`);
      }
      if (filters.status) {
        tags.push(`filter:status:${filters.status}`);
      }
      if (filters.category) {
        tags.push(`filter:category:${filters.category}`);
      }
      if (filters.strategicValue) {
        tags.push(`filter:strategic:${filters.strategicValue}`);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Invalidate cached data by data type
   */
  async invalidateCacheByType(dataType: 'contacts' | 'projects' | 'finance'): Promise<void> {
    if (!this.cacheService) return;

    const correlationId = this.logger.generateCorrelationId();

    try {
      await this.cacheService.invalidateByTags([`type:${dataType}`]);
      this.logger.info('Cache invalidated by type', { dataType, correlationId });
    } catch (error) {
      this.logger.error('Cache invalidation by type failed', { dataType, error: error.message, correlationId });
    }
  }

  /**
   * Invalidate cached data by source
   */
  async invalidateCacheBySource(source: 'linkedin' | 'gmail' | 'notion' | 'supabase' | 'xero'): Promise<void> {
    if (!this.cacheService) return;

    const correlationId = this.logger.generateCorrelationId();

    try {
      await this.cacheService.invalidateByTags([`source:${source}`]);
      this.logger.info('Cache invalidated by source', { source, correlationId });
    } catch (error) {
      this.logger.error('Cache invalidation by source failed', { source, error: error.message, correlationId });
    }
  }

  /**
   * Invalidate all cached data
   */
  async invalidateAllCache(): Promise<void> {
    if (!this.cacheService) return;

    const correlationId = this.logger.generateCorrelationId();

    try {
      await this.cacheService.clearAll();
      this.logger.warn('All cache cleared', { correlationId });
    } catch (error) {
      this.logger.error('Complete cache invalidation failed', { error: error.message, correlationId });
    }
  }

  /**
   * Get cache statistics and performance metrics
   */
  async getCacheStats() {
    if (!this.cacheService) {
      return { available: false, message: 'Cache service not configured' };
    }

    try {
      const stats = await this.cacheService.getStats();
      const healthy = await this.cacheService.isHealthy();

      return {
        available: true,
        healthy,
        ...stats
      };
    } catch (error) {
      return {
        available: true,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Warm cache with commonly requested data
   */
  async warmCache(): Promise<void> {
    if (!this.cacheService) return;

    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'UnifiedIntegrationService', 'warmCache');

    try {
      timedLogger.info('Starting cache warming');

      // Warm common contact queries
      const commonContactFilters = [
        { limit: 50 },
        { strategicValue: 'high', limit: 25 },
        { sources: ['linkedin'], limit: 25 },
        { sources: ['supabase'], limit: 25 }
      ];

      // Warm common project queries
      const commonProjectFilters = [
        { limit: 25 },
        { status: 'active', limit: 25 },
        { sources: ['notion'], limit: 25 }
      ];

      // Warm common finance queries
      const commonFinanceFilters = [
        { limit: 50 },
        { sources: ['xero'], limit: 50 },
        { dateRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }, limit: 50 }
      ];

      // Execute warming operations in parallel
      const warmingPromises = [
        ...commonContactFilters.map(filters => this.getContacts(filters)),
        ...commonProjectFilters.map(filters => this.getProjects(filters)),
        ...commonFinanceFilters.map(filters => this.getFinanceData(filters))
      ];

      await Promise.allSettled(warmingPromises);

      timedLogger.finish(true, { warmedQueries: warmingPromises.length });
    } catch (error) {
      timedLogger.error('Cache warming failed', error);
      timedLogger.finish(false);
    }
  }
}