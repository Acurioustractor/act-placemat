/**
 * ACT Placemat Application
 * 
 * This is the main application file that initializes components and handles data loading.
 */

class ACTPlacemat {
  /**
   * Create a new ACT Placemat application
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    // Configuration
    this.config = {
      apiBaseUrl: options.apiBaseUrl || '/api',
      autoRefreshInterval: options.autoRefreshInterval || 5 * 60 * 1000, // 5 minutes
      ...options
    };
    
    // State
    this.isLoading = false;
    this.hasError = false;
    this.errorMessage = '';
    this.lastUpdated = null;
    this.autoRefreshIntervalId = null;
    
    // Data
    this.projects = [];
    this.selectedArea = null;
    
    // Components
    this.components = {};
    
    // Initialize the application
    this.init();
  }
  
  /**
   * Initialize the application
   * @private
   */
  async init() {
    // Create notification system
    this.components.notifications = new NotificationSystem();
    
    // Create loading indicator
    this.createLoadingIndicator();
    
    // Show loading indicator
    this.showLoading('Loading projects...');
    
    try {
      // Initialize Notion integration
      this.notionIntegration = new PlacematNotionIntegration();
      
      // Load initial data
      await this.loadInitialData();
      
      // Initialize components
      this.initComponents();
      
      // Set up auto-refresh
      this.setupAutoRefresh();
      
      // Hide loading indicator
      this.hideLoading();
      
      // Show success notification
      this.components.notifications.success('Projects loaded successfully');
    } catch (error) {
      console.error('Error initializing application:', error);
      
      // Hide loading indicator
      this.hideLoading();
      
      // Show error notification
      this.components.notifications.error('Failed to load projects. Please try again later.');
      
      // Set error state
      this.hasError = true;
      this.errorMessage = error.message || 'Failed to load projects';
      
      // Show error message
      this.showErrorMessage();
    }
  }
  
  /**
   * Load initial data
   * @private
   */
  async loadInitialData() {
    try {
      // Check if we're on a mobile device
      const isMobile = window.innerWidth < 768;
      
      // Check if we're on a slow connection
      const isOnSlowConnection = window.performanceUtils?.isSlowConnection?.() || false;
      
      // Use optimized fetch if available
      if (window.performanceUtils?.optimizedFetch) {
        this.projects = await window.performanceUtils.optimizedFetch(
          () => this.notionIntegration.getProjects(),
          {
            cacheKey: 'act-placemat-projects',
            lowResolution: isMobile || isOnSlowConnection
          }
        );
      } else {
        // Fallback to regular fetch
        this.projects = await this.notionIntegration.getProjects();
      }
      
      // Update last updated timestamp
      this.lastUpdated = new Date();
      
      console.log(`Loaded ${this.projects.length} projects`);
    } catch (error) {
      console.error('Error loading initial data:', error);
      throw error;
    }
  }
  
  /**
   * Initialize components
   * @private
   */
  initComponents() {
    // Get project counts by area
    const areaCounts = this.getProjectCountsByArea();
    
    // Create area selector
    this.components.areaSelector = new AreaSelector({
      containerId: 'areaSelectorContainer',
      onSelect: (area) => this.handleAreaSelect(area),
      areaData: {
        'Story & Sovereignty': {
          icon: '📖',
          description: 'Community-controlled narratives and data ownership',
          count: areaCounts['Story & Sovereignty'] || 0
        },
        'Economic Freedom': {
          icon: '💰',
          description: 'Community ownership and cooperative economics',
          count: areaCounts['Economic Freedom'] || 0
        },
        'Community Engagement': {
          icon: '🤝',
          description: 'Participatory democracy and mutual aid',
          count: areaCounts['Community Engagement'] || 0
        },
        'Operations & Infrastructure': {
          icon: '🔧',
          description: 'Systems and tools for community resilience',
          count: areaCounts['Operations & Infrastructure'] || 0
        },
        'Research & Development': {
          icon: '🔬',
          description: 'Community-led innovation and experimentation',
          count: areaCounts['Research & Development'] || 0
        }
      }
    });
    
    // Create filter panel
    this.components.filterPanel = new FilterPanel({
      containerId: 'filterPanelContainer',
      onFilterChange: (filters) => this.handleFilterChange(filters),
      filterOptions: {
        statuses: this.getUniqueStatuses(),
        funding: this.getUniqueFunding(),
        tags: this.getUniqueTags()
      }
    });
    
    // Create project display
    this.components.projectDisplay = new ProjectDisplay({
      containerId: 'projectsContainer',
      onProjectClick: (project) => this.handleProjectClick(project),
      emptyStateConfig: {
        message: 'No projects found',
        icon: '🔍',
        description: 'Try adjusting your filters or select a different area'
      }
    });
    
    // Set projects data
    this.components.projectDisplay.setProjects(this.projects);
    
    // Create project modal
    this.components.projectModal = new ProjectModal({
      containerId: 'projectModalContainer'
    });
    
    // Create refresh button
    this.createRefreshButton();
  }
  
  /**
   * Create loading indicator
   * @private
   */
  createLoadingIndicator() {
    // Create loading container if it doesn't exist
    let loadingContainer = document.getElementById('loadingContainer');
    if (!loadingContainer) {
      loadingContainer = document.createElement('div');
      loadingContainer.id = 'loadingContainer';
      loadingContainer.className = 'loading-container';
      loadingContainer.style.display = 'none';
      
      loadingContainer.innerHTML = `
        <div class="loading-overlay"></div>
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-message">Loading...</div>
        </div>
      `;
      
      document.body.appendChild(loadingContainer);
    }
    
    this.loadingContainer = loadingContainer;
    this.loadingMessage = loadingContainer.querySelector('.loading-message');
  }
  
  /**
   * Show loading indicator
   * @param {string} message Loading message
   */
  showLoading(message = 'Loading...') {
    this.isLoading = true;
    
    if (this.loadingMessage) {
      this.loadingMessage.textContent = message;
    }
    
    if (this.loadingContainer) {
      this.loadingContainer.style.display = 'flex';
    }
  }
  
  /**
   * Hide loading indicator
   */
  hideLoading() {
    this.isLoading = false;
    
    if (this.loadingContainer) {
      this.loadingContainer.style.display = 'none';
    }
  }
  
  /**
   * Show error message
   * @private
   */
  showErrorMessage() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="error-message">
        <div class="error-icon">❌</div>
        <h3>Error Loading Projects</h3>
        <p>${this.errorMessage}</p>
        <button id="retryButton" class="retry-button">Retry</button>
      </div>
    `;
    
    // Add retry button event listener
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
      retryButton.addEventListener('click', () => this.handleRetry());
    }
  }
  
  /**
   * Create refresh button
   * @private
   */
  createRefreshButton() {
    const container = document.getElementById('refreshButtonContainer');
    if (!container) return;
    
    container.innerHTML = `
      <button id="refreshButton" class="refresh-button">
        <span class="refresh-icon">🔄</span>
        <span class="refresh-text">Refresh Data</span>
      </button>
      <span class="last-updated-text" id="lastUpdatedText"></span>
    `;
    
    // Add refresh button event listener
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => this.handleRefresh());
    }
    
    // Update last updated text
    this.updateLastUpdatedText();
  }
  
  /**
   * Update last updated text
   * @private
   */
  updateLastUpdatedText() {
    const lastUpdatedText = document.getElementById('lastUpdatedText');
    if (!lastUpdatedText || !this.lastUpdated) return;
    
    const formattedDate = this.lastUpdated.toLocaleTimeString();
    lastUpdatedText.textContent = `Last updated: ${formattedDate}`;
  }
  
  /**
   * Set up auto-refresh
   * @private
   */
  setupAutoRefresh() {
    if (this.autoRefreshIntervalId) {
      clearInterval(this.autoRefreshIntervalId);
    }
    
    // Check if we're on a mobile device or slow connection
    const isMobile = window.innerWidth < 768;
    const isOnSlowConnection = window.performanceUtils?.isSlowConnection?.() || false;
    
    // Adjust refresh interval for mobile or slow connections
    let refreshInterval = this.config.autoRefreshInterval;
    if (isMobile || isOnSlowConnection) {
      // Double the interval for mobile or slow connections
      refreshInterval = this.config.autoRefreshInterval * 2;
      console.log(`Adjusted auto-refresh interval to ${refreshInterval}ms for mobile or slow connection`);
    }
    
    // Set up auto-refresh with the adjusted interval
    this.autoRefreshIntervalId = this.notionIntegration.setupAutoRefresh(
      (changeInfo) => this.handleAutoRefresh(changeInfo),
      refreshInterval
    );
  }
  
  /**
   * Handle area selection
   * @param {string} area Selected area
   * @private
   */
  handleAreaSelect(area) {
    this.selectedArea = area;
    
    // Update project display
    if (this.components.projectDisplay) {
      this.components.projectDisplay.setSelectedArea(area);
    }
  }
  
  /**
   * Handle filter change
   * @param {Object} filters Filter values
   * @private
   */
  handleFilterChange(filters) {
    // Update project display
    if (this.components.projectDisplay) {
      this.components.projectDisplay.setFilters(filters);
    }
  }
  
  /**
   * Handle project click
   * @param {Object} project Project data
   * @private
   */
  handleProjectClick(project) {
    // Show project modal
    if (this.components.projectModal) {
      this.components.projectModal.open(project);
    }
  }
  
  /**
   * Handle refresh button click
   * @private
   */
  async handleRefresh() {
    if (this.isLoading) return;
    
    this.showLoading('Refreshing projects...');
    
    try {
      // Check if we're on a mobile device
      const isMobile = window.innerWidth < 768;
      
      // Check if we're on a slow connection
      const isOnSlowConnection = window.performanceUtils?.isSlowConnection?.() || false;
      
      // Show warning for slow connections
      if (isOnSlowConnection) {
        this.components.notifications.warning('You are on a slow connection. This may take longer than usual.');
      }
      
      // Use optimized fetch if available
      if (window.performanceUtils?.optimizedFetch) {
        this.projects = await window.performanceUtils.optimizedFetch(
          () => this.notionIntegration.refreshProjects(),
          {
            cacheKey: 'act-placemat-projects',
            forceRefresh: true,
            lowResolution: isMobile || isOnSlowConnection
          }
        );
      } else {
        // Fallback to regular fetch
        this.projects = await this.notionIntegration.refreshProjects();
      }
      
      // Update last updated timestamp
      this.lastUpdated = new Date();
      this.updateLastUpdatedText();
      
      // Update components
      this.updateComponentsWithNewData();
      
      // Hide loading indicator
      this.hideLoading();
      
      // Show success notification
      this.components.notifications.success('Projects refreshed successfully');
    } catch (error) {
      console.error('Error refreshing projects:', error);
      
      // Hide loading indicator
      this.hideLoading();
      
      // Show error notification
      this.components.notifications.error('Failed to refresh projects');
    }
  }
  
  /**
   * Handle auto-refresh
   * @param {Object} changeInfo Change information
   * @private
   */
  handleAutoRefresh(changeInfo) {
    if (!changeInfo.hasChanges) return;
    
    // Update data
    this.projects = changeInfo.data.projects;
    
    // Update last updated timestamp
    this.lastUpdated = new Date();
    this.updateLastUpdatedText();
    
    // Update components
    this.updateComponentsWithNewData();
    
    // Show notification
    this.components.notifications.info('Projects have been updated with new data');
  }
  
  /**
   * Handle retry button click
   * @private
   */
  async handleRetry() {
    this.hasError = false;
    this.errorMessage = '';
    
    this.showLoading('Loading projects...');
    
    try {
      // Load initial data
      await this.loadInitialData();
      
      // Initialize components
      this.initComponents();
      
      // Hide loading indicator
      this.hideLoading();
      
      // Show success notification
      this.components.notifications.success('Projects loaded successfully');
    } catch (error) {
      console.error('Error retrying data load:', error);
      
      // Hide loading indicator
      this.hideLoading();
      
      // Show error notification
      this.components.notifications.error('Failed to load projects. Please try again later.');
      
      // Set error state
      this.hasError = true;
      this.errorMessage = error.message || 'Failed to load projects';
      
      // Show error message
      this.showErrorMessage();
    }
  }
  
  /**
   * Update components with new data
   * @private
   */
  updateComponentsWithNewData() {
    // Update area selector with new counts
    if (this.components.areaSelector) {
      const areaCounts = this.getProjectCountsByArea();
      this.components.areaSelector.updateCounts(areaCounts);
    }
    
    // Update filter panel with new options
    if (this.components.filterPanel) {
      this.components.filterPanel.updateFilterOptions({
        statuses: this.getUniqueStatuses(),
        funding: this.getUniqueFunding(),
        tags: this.getUniqueTags()
      });
    }
    
    // Update project display with new projects
    if (this.components.projectDisplay) {
      this.components.projectDisplay.setProjects(this.projects);
    }
  }
  
  /**
   * Get project counts by area
   * @returns {Object} Object with area names as keys and counts as values
   * @private
   */
  getProjectCountsByArea() {
    const counts = {};
    
    this.projects.forEach(project => {
      const area = project.area || 'Uncategorized';
      counts[area] = (counts[area] || 0) + 1;
    });
    
    return counts;
  }
  
  /**
   * Get unique status values
   * @returns {Array<string>} Array of unique status values
   * @private
   */
  getUniqueStatuses() {
    const statuses = new Set();
    
    this.projects.forEach(project => {
      if (project.status) {
        statuses.add(project.status);
      }
    });
    
    return Array.from(statuses).sort();
  }
  
  /**
   * Get unique funding values
   * @returns {Array<string>} Array of unique funding values
   * @private
   */
  getUniqueFunding() {
    const funding = new Set();
    
    this.projects.forEach(project => {
      if (project.funding) {
        funding.add(project.funding);
      }
    });
    
    return Array.from(funding).sort();
  }
  
  /**
   * Get unique tags
   * @returns {Array<string>} Array of unique tags
   * @private
   */
  getUniqueTags() {
    const tags = new Set();
    
    this.projects.forEach(project => {
      if (project.tags && Array.isArray(project.tags)) {
        project.tags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags).sort();
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.actPlacemat = new ACTPlacemat();
});