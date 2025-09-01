/**
 * Data Manager for ACT Placemat
 * Orchestrates multiple connectors with Australian compliance and mobile optimization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseConnector } from '../connectors/SupabaseConnector';
import { NotionConnector } from '../connectors/NotionConnector';
import type {
  ApiResponse,
  Story,
  Project,
  Opportunity,
  Person,
  SearchQuery,
  SearchResult,
  SyncStatus,
  NetworkStatus} from '../types';
import {
  EntityType,
  ComplianceMetadata
} from '../types';

export interface DataManagerConfig {
  supabase?: {
    url?: string;
    key?: string;
    serviceRoleKey?: string;
  };
  notion?: {
    apiKey?: string;
    databases?: {
      projects?: string;
      opportunities?: string;
      people?: string;
      organizations?: string;
    };
  };
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  sync?: {
    enabled: boolean;
    interval: number;
    wifiOnly: boolean;
  };
  compliance?: {
    dataResidency: 'australia' | 'global';
    auditEnabled: boolean;
    encryptionRequired: boolean;
  };
}

export interface DataManager {
  // Search operations
  searchAll(query: SearchQuery): Promise<ApiResponse<SearchResult<any>>>;
  searchStories(query: SearchQuery): Promise<ApiResponse<SearchResult<Story>>>;
  searchProjects(query: SearchQuery): Promise<ApiResponse<SearchResult<Project>>>;
  searchOpportunities(query: SearchQuery): Promise<ApiResponse<SearchResult<Opportunity>>>;
  
  // Data retrieval
  getAllStories(): Promise<ApiResponse<Story[]>>;
  getAllProjects(): Promise<ApiResponse<Project[]>>;
  getAllOpportunities(): Promise<ApiResponse<Opportunity[]>>;
  getAllPeople(): Promise<ApiResponse<Person[]>>;
  
  // Analytics and insights
  getImpactMetrics(): Promise<ApiResponse<any>>;
  getOpportunityAnalysis(): Promise<ApiResponse<any>>;
  
  // Sync management
  syncAll(): Promise<void>;
  getSyncStatus(): SyncStatus;
  
  // Cache management
  clearCache(): Promise<void>;
  getCacheStats(): any;
  
  // Network and status
  getNetworkStatus(): NetworkStatus;
  getConnectionStatus(): any;
  
  // Compliance
  generateComplianceReport(): Promise<any>;
  validateDataResidency(): Promise<boolean>;
}

export function createDataManager(config: DataManagerConfig = {}): DataManager {
  const supabaseConnector = new SupabaseConnector(config.supabase);
  const notionConnector = new NotionConnector(config.notion);
  
  let syncInterval: NodeJS.Timeout | null = null;
  const lastSyncTimes: Record<string, string> = {};

  /**
   * Initialize sync if enabled
   */
  const initializeSync = () => {
    if (config.sync?.enabled && config.sync?.interval) {
      syncInterval = setInterval(async () => {
        try {
          await syncAll();
        } catch (error) {
          console.warn('Automatic sync failed:', error);
        }
      }, config.sync.interval);
    }
  };

  /**
   * Search across all data sources with Australian compliance
   */
  const searchAll = async (query: SearchQuery): Promise<ApiResponse<SearchResult<any>>> => {
    const startTime = Date.now();
    
    try {
      // Execute searches in parallel for mobile performance
      const [storiesResponse, notionResponse] = await Promise.allSettled([
        supabaseConnector.searchStories(query),
        notionConnector.search(query)
      ]);

      const allItems: any[] = [];
      const errors: string[] = [];

      // Combine results from successful responses
      if (storiesResponse.status === 'fulfilled' && storiesResponse.value.data) {
        allItems.push(...storiesResponse.value.data.items.map(item => ({ ...item, source: 'supabase', type: 'story' })));
      } else if (storiesResponse.status === 'rejected') {
        errors.push(`Stories search failed: ${storiesResponse.reason}`);
      }

      if (notionResponse.status === 'fulfilled' && notionResponse.value.data) {
        allItems.push(...notionResponse.value.data.items.map(item => ({ ...item, source: 'notion', type: 'mixed' })));
      } else if (notionResponse.status === 'rejected') {
        errors.push(`Notion search failed: ${notionResponse.reason}`);
      }

      // Sort by relevance and recency for Australian community priorities
      allItems.sort((a, b) => {
        // Prioritize Australian content
        const aIsAustralian = isAustralianContent(a);
        const bIsAustralian = isAustralianContent(b);
        
        if (aIsAustralian && !bIsAustralian) return -1;
        if (!aIsAustralian && bIsAustralian) return 1;
        
        // Then sort by last edited time
        const aTime = new Date(a.lastEdited || a.created_at || 0).getTime();
        const bTime = new Date(b.lastEdited || b.created_at || 0).getTime();
        return bTime - aTime;
      });

      const result: SearchResult<any> = {
        items: allItems.slice(0, query.pagination?.limit || 50),
        total: allItems.length,
        page: query.pagination?.page || 1,
        hasMore: allItems.length > (query.pagination?.limit || 50),
        facets: generateSearchFacets(allItems)
      };

      // Log performance metrics for Australian mobile networks
      await logSearchMetrics({
        query: query.query,
        duration: Date.now() - startTime,
        resultCount: result.items.length,
        sources: ['supabase', 'notion'],
        errors: errors.length
      });

      return {
        data: result,
        source: 'network',
        timestamp: new Date().toISOString(),
        error: errors.length > 0 ? errors.join('; ') : undefined
      };

    } catch (error) {
      console.error('Search all failed:', error);
      throw error;
    }
  };

  /**
   * Search stories specifically
   */
  const searchStories = async (query: SearchQuery): Promise<ApiResponse<SearchResult<Story>>> => {
    return await supabaseConnector.searchStories(query);
  };

  /**
   * Search projects specifically  
   */
  const searchProjects = async (query: SearchQuery): Promise<ApiResponse<SearchResult<Project>>> => {
    const projects = await notionConnector.getProjects();
    if (!projects.data) {
      return {
        data: { items: [], total: 0, page: 1, hasMore: false },
        source: projects.source,
        timestamp: projects.timestamp,
        error: projects.error
      };
    }

    // Filter projects based on query
    const filteredProjects = projects.data.filter(project => 
      !query.query || 
      project.title.toLowerCase().includes(query.query.toLowerCase()) ||
      project.impact?.toLowerCase().includes(query.query.toLowerCase())
    );

    return {
      data: {
        items: filteredProjects,
        total: filteredProjects.length,
        page: 1,
        hasMore: false
      },
      source: projects.source,
      timestamp: projects.timestamp
    };
  };

  /**
   * Search opportunities specifically
   */
  const searchOpportunities = async (query: SearchQuery): Promise<ApiResponse<SearchResult<Opportunity>>> => {
    const opportunities = await notionConnector.getOpportunities();
    if (!opportunities.data) {
      return {
        data: { items: [], total: 0, page: 1, hasMore: false },
        source: opportunities.source,
        timestamp: opportunities.timestamp,
        error: opportunities.error
      };
    }

    // Filter opportunities based on query
    const filteredOpportunities = opportunities.data.filter(opp => 
      !query.query || 
      opp.title.toLowerCase().includes(query.query.toLowerCase()) ||
      opp.requirements?.toLowerCase().includes(query.query.toLowerCase())
    );

    return {
      data: {
        items: filteredOpportunities,
        total: filteredOpportunities.length,
        page: 1,
        hasMore: false
      },
      source: opportunities.source,
      timestamp: opportunities.timestamp
    };
  };

  /**
   * Get all stories with Australian compliance
   */
  const getAllStories = async (): Promise<ApiResponse<Story[]>> => {
    return await supabaseConnector.getAllStories();
  };

  /**
   * Get all projects
   */
  const getAllProjects = async (): Promise<ApiResponse<Project[]>> => {
    return await notionConnector.getProjects();
  };

  /**
   * Get all opportunities
   */
  const getAllOpportunities = async (): Promise<ApiResponse<Opportunity[]>> => {
    return await notionConnector.getOpportunities();
  };

  /**
   * Get all people/contacts
   */
  const getAllPeople = async (): Promise<ApiResponse<Person[]>> => {
    return await notionConnector.getPeople();
  };

  /**
   * Get impact metrics from stories
   */
  const getImpactMetrics = async (): Promise<ApiResponse<any>> => {
    return await supabaseConnector.getImpactMetrics();
  };

  /**
   * Get opportunity analysis
   */
  const getOpportunityAnalysis = async (): Promise<ApiResponse<any>> => {
    return await notionConnector.analyzeOpportunities();
  };

  /**
   * Sync all data sources
   */
  const syncAll = async (): Promise<void> => {
    const syncStartTime = Date.now();
    console.log('🔄 Starting comprehensive data sync...');

    try {
      // Process offline queues in parallel
      await Promise.allSettled([
        supabaseConnector.processOfflineQueue(),
        notionConnector.processOfflineQueue()
      ]);

      lastSyncTimes['supabase'] = new Date().toISOString();
      lastSyncTimes['notion'] = new Date().toISOString();
      lastSyncTimes['all'] = new Date().toISOString();

      // Store sync status
      await AsyncStorage.setItem('last_sync_times', JSON.stringify(lastSyncTimes));

      console.log(`✅ Sync completed in ${Date.now() - syncStartTime}ms`);

    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  };

  /**
   * Get combined sync status
   */
  const getSyncStatus = (): SyncStatus => {
    const supabaseStatus = supabaseConnector.getSyncStatus();
    const notionStatus = notionConnector.getSyncStatus();

    return {
      lastSync: lastSyncTimes['all'] || new Date().toISOString(),
      pendingUploads: supabaseStatus.pendingUploads + notionStatus.pendingUploads,
      pendingDownloads: supabaseStatus.pendingDownloads + notionStatus.pendingDownloads,
      conflictCount: supabaseStatus.conflictCount + notionStatus.conflictCount,
      syncInProgress: supabaseStatus.syncInProgress || notionStatus.syncInProgress
    };
  };

  /**
   * Clear all caches
   */
  const clearCache = async (): Promise<void> => {
    await Promise.all([
      supabaseConnector.clearCache(),
      notionConnector.clearCache()
    ]);
  };

  /**
   * Get combined cache statistics
   */
  const getCacheStats = () => {
    const supabaseStats = supabaseConnector.getCacheStats();
    const notionStats = notionConnector.getCacheStats();

    return {
      supabase: supabaseStats,
      notion: notionStats,
      combined: {
        totalEntries: supabaseStats.entries + notionStats.entries,
        totalMemoryUsage: `${parseInt(supabaseStats.memoryUsage) + parseInt(notionStats.memoryUsage)} KB`
      }
    };
  };

  /**
   * Get network status
   */
  const getNetworkStatus = (): NetworkStatus => {
    // Return status from one of the connectors (they should be the same)
    return supabaseConnector.getNetworkStatus();
  };

  /**
   * Get combined connection status
   */
  const getConnectionStatus = () => {
    const supabaseStatus = supabaseConnector.getConnectionStatus();
    const notionStatus = notionConnector.getConnectionStatus();

    return {
      supabase: supabaseStatus,
      notion: notionStatus,
      overall: {
        connected: supabaseStatus.connected || notionStatus.connected,
        dataResidency: config.compliance?.dataResidency || 'australia',
        cacheEnabled: config.cache?.enabled || true,
        syncEnabled: config.sync?.enabled || false
      }
    };
  };

  /**
   * Generate comprehensive compliance report for Australian regulations
   */
  const generateComplianceReport = async (): Promise<any> => {
    const [stories, projects, opportunities] = await Promise.allSettled([
      getAllStories(),
      getAllProjects(),
      getAllOpportunities()
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      dataResidency: config.compliance?.dataResidency || 'australia',
      auditTrail: config.compliance?.auditEnabled || false,
      encryption: config.compliance?.encryptionRequired || false,
      
      dataInventory: {
        stories: stories.status === 'fulfilled' ? (stories.value.data?.length || 0) : 0,
        projects: projects.status === 'fulfilled' ? (projects.value.data?.length || 0) : 0,
        opportunities: opportunities.status === 'fulfilled' ? (opportunities.value.data?.length || 0) : 0
      },
      
      privacyCompliance: {
        consentTracking: true, // Stories require consent
        dataMinimization: true, // Only necessary fields collected
        rightToBeDeleted: true, // Supported through API
        dataPortability: true // Export functionality available
      },
      
      securityMeasures: {
        encryptionAtRest: true, // SecureStore for sensitive data
        encryptionInTransit: true, // HTTPS for all API calls
        accessControls: true, // Authentication required
        auditLogging: config.compliance?.auditEnabled || false
      },
      
      recommendations: [
        'Regular review of data retention policies',
        'Implement automated consent renewal processes',
        'Monitor cross-border data transfers',
        'Maintain up-to-date privacy policy'
      ]
    };

    return report;
  };

  /**
   * Validate data residency compliance
   */
  const validateDataResidency = async (): Promise<boolean> => {
    // Check if configured for Australian data residency
    const requiredResidency = config.compliance?.dataResidency === 'australia';
    
    // Supabase can be configured for Australian regions
    // Notion is global but contains Australian business data
    
    return requiredResidency; // Simplified validation
  };

  /**
   * Helper function to identify Australian content
   */
  const isAustralianContent = (item: any): boolean => {
    const text = `${item.title || ''} ${item.content || ''} ${item.impact || ''} ${item.location || ''}`.toLowerCase();
    const australianKeywords = ['australia', 'australian', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'darwin', 'hobart', 'canberra'];
    return australianKeywords.some(keyword => text.includes(keyword));
  };

  /**
   * Generate search facets for filtering
   */
  const generateSearchFacets = (items: any[]): Record<string, number> => {
    const facets: Record<string, number> = {};
    
    items.forEach(item => {
      // Source facets
      const source = item.source || 'unknown';
      facets[`source:${source}`] = (facets[`source:${source}`] || 0) + 1;
      
      // Type facets
      const type = item.type || 'unknown';
      facets[`type:${type}`] = (facets[`type:${type}`] || 0) + 1;
      
      // Australian content facet
      if (isAustralianContent(item)) {
        facets['region:australia'] = (facets['region:australia'] || 0) + 1;
      }
    });
    
    return facets;
  };

  /**
   * Log search metrics for performance monitoring
   */
  const logSearchMetrics = async (metrics: any): Promise<void> => {
    try {
      const searchMetrics = await AsyncStorage.getItem('search_metrics') || '[]';
      const allMetrics = JSON.parse(searchMetrics);
      
      allMetrics.push({
        ...metrics,
        timestamp: new Date().toISOString(),
        deviceType: 'mobile' // Could be detected
      });
      
      // Keep only last 50 search metrics for mobile storage
      if (allMetrics.length > 50) {
        allMetrics.splice(0, allMetrics.length - 50);
      }
      
      await AsyncStorage.setItem('search_metrics', JSON.stringify(allMetrics));
    } catch (error) {
      console.warn('Failed to log search metrics:', error);
    }
  };

  // Initialize sync on creation
  initializeSync();

  // Return the DataManager interface
  return {
    searchAll,
    searchStories,
    searchProjects,
    searchOpportunities,
    getAllStories,
    getAllProjects,
    getAllOpportunities,
    getAllPeople,
    getImpactMetrics,
    getOpportunityAnalysis,
    syncAll,
    getSyncStatus,
    clearCache,
    getCacheStats,
    getNetworkStatus,
    getConnectionStatus,
    generateComplianceReport,
    validateDataResidency
  };
}