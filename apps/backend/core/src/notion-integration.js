/**
 * PlacematNotionIntegration - Application-specific wrapper for NotionMCP
 * 
 * This class provides a caching layer and application-specific methods
 * for interacting with Notion data.
 */

const NotionMCP = require('./notion-mcp');
const { config } = require('../server/config');
const { logger } = require('../../utils/logger');

/**
 * PlacematNotionIntegration class for application-specific Notion integration
 */
class PlacematNotionIntegration {
  /**
   * Create a new PlacematNotionIntegration instance
   * @param {Object} [customConfig={}] Configuration options
   */
  constructor(customConfig = {}) {
    this.notion = new NotionMCP(customConfig);
    this.cache = new Map();
    this.cacheTimeout = customConfig.cacheTimeout || config.app.cacheTimeout || 5 * 60 * 1000; // 5 minutes
    
    logger.info(`Initialized PlacematNotionIntegration with ${this.cacheTimeout}ms cache timeout`);
  }
  
  /**
   * Check if a cache entry is valid
   * @param {string} cacheKey Cache key
   * @returns {boolean} True if the cache entry is valid
   * @private
   */
  isCacheValid(cacheKey) {
    if (!this.cache.has(cacheKey)) {
      return false;
    }
    
    const cached = this.cache.get(cacheKey);
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }
  
  /**
   * Get data from cache or fetch it
   * @param {string} cacheKey Cache key
   * @param {Function} fetchFn Function to fetch data if not in cache
   * @param {boolean} [useCache=true] Whether to use cache
   * @returns {Promise<any>} Data from cache or fetch function
   * @private
   */
  async getWithCache(cacheKey, fetchFn, useCache = true) {
    // Return from cache if valid and useCache is true
    if (useCache && this.isCacheValid(cacheKey)) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return this.cache.get(cacheKey).data;
    }
    
    // Fetch fresh data
    logger.debug(`Cache miss for ${cacheKey}, fetching fresh data`);
    const data = await fetchFn();
    
    // Update cache
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  /**
   * Clear a specific cache entry
   * @param {string} cacheKey Cache key
   */
  clearCache(cacheKey) {
    if (this.cache.has(cacheKey)) {
      logger.debug(`Clearing cache for ${cacheKey}`);
      this.cache.delete(cacheKey);
    }
  }
  
  /**
   * Clear all cache entries
   */
  clearAllCache() {
    logger.info('Clearing all cache entries');
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      keys: [],
      totalSizeBytes: 0
    };
    
    this.cache.forEach((value, key) => {
      const entry = {
        key,
        age: Date.now() - value.timestamp,
        isValid: Date.now() - value.timestamp < this.cacheTimeout
      };
      
      try {
        // Estimate size in bytes
        const jsonSize = JSON.stringify(value.data).length;
        entry.sizeBytes = jsonSize;
        stats.totalSizeBytes += jsonSize;
      } catch (error) {
        entry.sizeBytes = 'unknown';
      }
      
      stats.keys.push(entry);
    });
    
    return stats;
  }
  
  /**
   * Get projects with caching
   * @param {boolean} [useCache=true] Whether to use cache
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of projects
   */
  async getProjects(useCache = true, filters = {}, sorts = []) {
    const cacheKey = `projects_${JSON.stringify(filters)}_${JSON.stringify(sorts)}`;
    
    return this.getWithCache(
      cacheKey,
      () => this.notion.fetchProjects(filters, sorts),
      useCache
    );
  }
  
  /**
   * Get opportunities with caching
   * @param {boolean} [useCache=true] Whether to use cache
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of opportunities
   */
  async getOpportunities(useCache = true, filters = {}, sorts = []) {
    const cacheKey = `opportunities_${JSON.stringify(filters)}_${JSON.stringify(sorts)}`;
    
    return this.getWithCache(
      cacheKey,
      () => this.notion.fetchOpportunities(filters, sorts),
      useCache
    );
  }
  
  /**
   * Get organizations with caching
   * @param {boolean} [useCache=true] Whether to use cache
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of organizations
   */
  async getOrganizations(useCache = true, filters = {}, sorts = []) {
    const cacheKey = `organizations_${JSON.stringify(filters)}_${JSON.stringify(sorts)}`;
    
    return this.getWithCache(
      cacheKey,
      () => this.notion.fetchOrganizations(filters, sorts),
      useCache
    );
  }
  
  /**
   * Get people with caching
   * @param {boolean} [useCache=true] Whether to use cache
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of people
   */
  async getPeople(useCache = true, filters = {}, sorts = []) {
    const cacheKey = `people_${JSON.stringify(filters)}_${JSON.stringify(sorts)}`;
    
    return this.getWithCache(
      cacheKey,
      () => this.notion.fetchPeople(filters, sorts),
      useCache
    );
  }
  
  /**
   * Get artifacts with caching
   * @param {boolean} [useCache=true] Whether to use cache
   * @param {Object} [filters={}] Filters to apply
   * @param {Array} [sorts=[]] Sorting options
   * @returns {Promise<Array<Object>>} Array of artifacts
   */
  async getArtifacts(useCache = true, filters = {}, sorts = []) {
    const cacheKey = `artifacts_${JSON.stringify(filters)}_${JSON.stringify(sorts)}`;
    
    return this.getWithCache(
      cacheKey,
      () => this.notion.fetchArtifacts(filters, sorts),
      useCache
    );
  }
  
  /**
   * Get all data with caching
   * @param {boolean} [useCache=true] Whether to use cache
   * @returns {Promise<Object>} Object containing all data and summary
   */
  async getAllData(useCache = true) {
    const cacheKey = 'all_data';
    
    return this.getWithCache(
      cacheKey,
      () => this.notion.fetchAllData(),
      useCache
    );
  }
  
  /**
   * Get projects by area
   * @param {string} area Area name
   * @param {boolean} [useCache=true] Whether to use cache
   * @returns {Promise<Array<Object>>} Array of projects in the specified area
   */
  async getProjectsByArea(area, useCache = true) {
    const cacheKey = `projects_area_${area}`;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }
    
    const projects = await this.getProjects(useCache);
    const filteredProjects = projects.filter(project => project.area === area);
    
    this.cache.set(cacheKey, {
      data: filteredProjects,
      timestamp: Date.now()
    });
    
    return filteredProjects;
  }
  
  /**
   * Get projects by status
   * @param {string} status Status name
   * @param {boolean} [useCache=true] Whether to use cache
   * @returns {Promise<Array<Object>>} Array of projects with the specified status
   */
  async getProjectsByStatus(status, useCache = true) {
    const cacheKey = `projects_status_${status}`;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }
    
    const projects = await this.getProjects(useCache);
    const filteredProjects = projects.filter(project => project.status === status);
    
    this.cache.set(cacheKey, {
      data: filteredProjects,
      timestamp: Date.now()
    });
    
    return filteredProjects;
  }
  
  /**
   * Get projects by funding status
   * @param {string} funding Funding status
   * @param {boolean} [useCache=true] Whether to use cache
   * @returns {Promise<Array<Object>>} Array of projects with the specified funding status
   */
  async getProjectsByFunding(funding, useCache = true) {
    const cacheKey = `projects_funding_${funding}`;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }
    
    const projects = await this.getProjects(useCache);
    const filteredProjects = projects.filter(project => project.funding === funding);
    
    this.cache.set(cacheKey, {
      data: filteredProjects,
      timestamp: Date.now()
    });
    
    return filteredProjects;
  }
  
  /**
   * Search projects by text
   * @param {string} searchText Text to search for
   * @param {boolean} [useCache=true] Whether to use cache
   * @returns {Promise<Array<Object>>} Array of matching projects
   */
  async searchProjects(searchText, useCache = true) {
    if (!searchText) {
      return this.getProjects(useCache);
    }
    
    const cacheKey = `projects_search_${searchText}`;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }
    
    const projects = await this.getProjects(useCache);
    const searchLower = searchText.toLowerCase();
    
    const filteredProjects = projects.filter(project => {
      return (
        (project.name && project.name.toLowerCase().includes(searchLower)) ||
        (project.description && project.description.toLowerCase().includes(searchLower)) ||
        (project.lead && project.lead.toLowerCase().includes(searchLower)) ||
        (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    });
    
    this.cache.set(cacheKey, {
      data: filteredProjects,
      timestamp: Date.now()
    });
    
    return filteredProjects;
  }
  
  /**
   * Get opportunities by stage
   * @param {string} stage Stage name
   * @param {boolean} [useCache=true] Whether to use cache
   * @returns {Promise<Array<Object>>} Array of opportunities in the specified stage
   */
  async getOpportunitiesByStage(stage, useCache = true) {
    const cacheKey = `opportunities_stage_${stage}`;
    
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }
    
    const opportunities = await this.getOpportunities(useCache);
    const filteredOpportunities = opportunities.filter(opp => opp.stage === stage);
    
    this.cache.set(cacheKey, {
      data: filteredOpportunities,
      timestamp: Date.now()
    });
    
    return filteredOpportunities;
  }
  
  /**
   * Refresh projects data
   * @returns {Promise<Array<Object>>} Fresh projects data
   */
  async refreshProjects() {
    logger.info('Refreshing projects data');
    
    // Clear all project-related cache entries
    Array.from(this.cache.keys())
      .filter(key => key.startsWith('projects') || key === 'all_data')
      .forEach(key => this.cache.delete(key));
    
    // Fetch fresh data
    return await this.getProjects(false);
  }
  
  /**
   * Refresh opportunities data
   * @returns {Promise<Array<Object>>} Fresh opportunities data
   */
  async refreshOpportunities() {
    logger.info('Refreshing opportunities data');
    
    // Clear all opportunity-related cache entries
    Array.from(this.cache.keys())
      .filter(key => key.startsWith('opportunities') || key === 'all_data')
      .forEach(key => this.cache.delete(key));
    
    // Fetch fresh data
    return await this.getOpportunities(false);
  }
  
  /**
   * Refresh organizations data
   * @returns {Promise<Array<Object>>} Fresh organizations data
   */
  async refreshOrganizations() {
    logger.info('Refreshing organizations data');
    
    // Clear all organization-related cache entries
    Array.from(this.cache.keys())
      .filter(key => key.startsWith('organizations') || key === 'all_data')
      .forEach(key => this.cache.delete(key));
    
    // Fetch fresh data
    return await this.getOrganizations(false);
  }
  
  /**
   * Refresh people data
   * @returns {Promise<Array<Object>>} Fresh people data
   */
  async refreshPeople() {
    logger.info('Refreshing people data');
    
    // Clear all people-related cache entries
    Array.from(this.cache.keys())
      .filter(key => key.startsWith('people') || key === 'all_data')
      .forEach(key => this.cache.delete(key));
    
    // Fetch fresh data
    return await this.getPeople(false);
  }
  
  /**
   * Refresh artifacts data
   * @returns {Promise<Array<Object>>} Fresh artifacts data
   */
  async refreshArtifacts() {
    logger.info('Refreshing artifacts data');
    
    // Clear all artifact-related cache entries
    Array.from(this.cache.keys())
      .filter(key => key.startsWith('artifacts') || key === 'all_data')
      .forEach(key => this.cache.delete(key));
    
    // Fetch fresh data
    return await this.getArtifacts(false);
  }
  
  /**
   * Refresh all data
   * @returns {Promise<Object>} Fresh data
   */
  async refreshAll() {
    logger.info('Refreshing all data');
    
    // Clear all cache
    this.clearAllCache();
    
    // Fetch fresh data
    return await this.getAllData(false);
  }
  
  /**
   * Check for changes in Notion data
   * @returns {Promise<Object>} Object with change information
   */
  async checkForChanges() {
    logger.info('Checking for changes in Notion data');
    
    // Get current data from cache
    const cachedData = this.isCacheValid('all_data') ? this.cache.get('all_data').data : null;
    
    if (!cachedData) {
      logger.info('No cached data available, fetching all data');
      return {
        hasChanges: true,
        changes: {
          projects: true,
          opportunities: true,
          organizations: true,
          people: true,
          artifacts: true
        },
        data: await this.getAllData(false)
      };
    }
    
    // Fetch latest data with minimal fields for comparison
    const latestProjects = await this.notion.fetchProjects();
    const latestOpportunities = await this.notion.fetchOpportunities();
    const latestOrganizations = await this.notion.fetchOrganizations();
    const latestPeople = await this.notion.fetchPeople();
    const latestArtifacts = await this.notion.fetchArtifacts();
    
    // Check for changes
    const changes = {
      projects: this.detectChanges(cachedData.projects, latestProjects),
      opportunities: this.detectChanges(cachedData.opportunities, latestOpportunities),
      organizations: this.detectChanges(cachedData.organizations, latestOrganizations),
      people: this.detectChanges(cachedData.people, latestPeople),
      artifacts: this.detectChanges(cachedData.artifacts, latestArtifacts)
    };
    
    const hasChanges = Object.values(changes).some(Boolean);
    
    logger.info(`Change detection complete. Has changes: ${hasChanges}`, changes);
    
    return {
      hasChanges,
      changes,
      data: hasChanges ? await this.refreshAll() : cachedData
    };
  }
  
  /**
   * Detect changes between cached and latest data
   * @param {Array<Object>} cachedItems Cached items
   * @param {Array<Object>} latestItems Latest items
   * @returns {boolean} True if changes detected
   * @private
   */
  detectChanges(cachedItems, latestItems) {
    // Check for count changes
    if (!cachedItems || !latestItems || cachedItems.length !== latestItems.length) {
      return true;
    }
    
    // Create maps for faster lookup
    const cachedMap = new Map(cachedItems.map(item => [item.id, item]));
    
    // Check for new or modified items
    for (const item of latestItems) {
      const cachedItem = cachedMap.get(item.id);
      
      // New item
      if (!cachedItem) {
        return true;
      }
      
      // Modified item (check lastModified timestamp)
      if (cachedItem.lastModified !== item.lastModified) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Set up auto-refresh with callback
   * @param {Function} callback Function to call when data is refreshed
   * @param {number} [interval] Interval in milliseconds (default: from config)
   * @returns {number} Interval ID for clearing
   */
  setupAutoRefresh(callback, interval = config.app.autoRefreshInterval) {
    logger.info(`Setting up auto-refresh with ${interval}ms interval`);
    
    return setInterval(async () => {
      try {
        logger.debug('Auto-refresh triggered');
        const changeInfo = await this.checkForChanges();
        
        if (changeInfo.hasChanges) {
          logger.info('Changes detected during auto-refresh');
          callback(changeInfo);
        } else {
          logger.debug('No changes detected during auto-refresh');
        }
      } catch (error) {
        logger.error('Auto-refresh error:', error);
      }
    }, interval);
  }
  
  /**
   * Clear auto-refresh interval
   * @param {number} intervalId Interval ID from setupAutoRefresh
   */
  clearAutoRefresh(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
      logger.info('Auto-refresh cleared');
    }
  }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  window.PlacematNotionIntegration = PlacematNotionIntegration;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlacematNotionIntegration;
}