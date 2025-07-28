/**
 * ProjectDisplay Component
 * 
 * This component renders the project cards for the ACT Placemat.
 * It displays projects filtered by area and other criteria.
 */

class ProjectDisplay {
  /**
   * Create a new ProjectDisplay
   * @param {Object} options Configuration options
   * @param {string} options.containerId ID of the container element
   * @param {Function} options.onProjectClick Callback function when a project is clicked
   * @param {Object} options.emptyStateConfig Configuration for empty state
   */
  constructor(options) {
    this.containerId = options.containerId || 'projectsContainer';
    this.onProjectClick = options.onProjectClick || (() => {});
    this.emptyStateConfig = options.emptyStateConfig || {
      message: 'No projects found',
      icon: '🔍'
    };
    
    // State
    this.projects = [];
    this.filteredProjects = [];
    this.selectedArea = null;
    this.filters = {
      status: null,
      funding: null,
      search: '',
      tags: []
    };
    
    // Initialize the component
    this.init();
  }
  
  /**
   * Initialize the component
   * @private
   */
  init() {
    // Get the container element
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container element with ID "${this.containerId}" not found`);
      return;
    }
    
    // Render the initial state
    this.render();
  }
  
  /**
   * Set projects data
   * @param {Array<Object>} projects Array of project objects
   */
  setProjects(projects) {
    this.projects = Array.isArray(projects) ? projects : [];
    this.applyFilters();
    this.render();
  }
  
  /**
   * Set selected area
   * @param {string} area Area name
   */
  setSelectedArea(area) {
    this.selectedArea = area;
    this.applyFilters();
    this.render();
  }
  
  /**
   * Set filters
   * @param {Object} filters Filter criteria
   * @param {string} [filters.status] Status filter
   * @param {string} [filters.funding] Funding filter
   * @param {string} [filters.search] Search text
   * @param {Array<string>} [filters.tags] Tags filter
   */
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.applyFilters();
    this.render();
  }
  
  /**
   * Apply filters to projects
   * @private
   */
  applyFilters() {
    // Start with all projects
    let filtered = [...this.projects];
    
    // Filter by area if selected
    if (this.selectedArea) {
      filtered = filtered.filter(project => project.area === this.selectedArea);
    }
    
    // Filter by status if specified
    if (this.filters.status) {
      filtered = filtered.filter(project => project.status === this.filters.status);
    }
    
    // Filter by funding if specified
    if (this.filters.funding) {
      filtered = filtered.filter(project => project.funding === this.filters.funding);
    }
    
    // Filter by search text if specified
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(project => {
        return (
          (project.name && project.name.toLowerCase().includes(searchLower)) ||
          (project.description && project.description.toLowerCase().includes(searchLower)) ||
          (project.lead && project.lead.toLowerCase().includes(searchLower)) ||
          (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
      });
    }
    
    // Filter by tags if specified
    if (this.filters.tags && this.filters.tags.length > 0) {
      filtered = filtered.filter(project => {
        return project.tags && this.filters.tags.every(tag => project.tags.includes(tag));
      });
    }
    
    this.filteredProjects = filtered;
  }
  
  /**
   * Render the component
   */
  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // If no projects, show empty state
    if (this.filteredProjects.length === 0) {
      this.renderEmptyState();
      return;
    }
    
    // Create the projects grid
    const projectsGrid = document.createElement('div');
    projectsGrid.className = 'projects-grid';
    
    // Create project cards
    this.filteredProjects.forEach(project => {
      const card = this.createProjectCard(project);
      projectsGrid.appendChild(card);
    });
    
    this.container.appendChild(projectsGrid);
  }
  
  /**
   * Create a project card
   * @param {Object} project Project data
   * @returns {HTMLElement} The project card element
   * @private
   */
  createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = project.id;
    
    // Status badge class
    const statusClass = this.getStatusClass(project.status);
    
    // Funding badge class
    const fundingClass = this.getFundingClass(project.funding);
    
    // Format tags
    const tagsHtml = project.tags && project.tags.length > 0
      ? `<div class="project-tags">${project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}</div>`
      : '';
    
    // Create card content
    card.innerHTML = `
      <div class="project-header">
        <h3 class="project-title">${project.name || 'Untitled Project'}</h3>
        <div class="project-badges">
          <span class="project-badge ${statusClass}">${project.status || 'Unknown'}</span>
          ${project.funding ? `<span class="project-badge ${fundingClass}">${project.funding}</span>` : ''}
        </div>
      </div>
      <p class="project-description">${project.description || 'No description available'}</p>
      ${project.lead ? `<p class="project-lead"><strong>Lead:</strong> ${project.lead}</p>` : ''}
      ${tagsHtml}
      <div class="project-footer">
        <span class="project-area">${project.area || ''}</span>
        <button class="project-details-btn">View Details</button>
      </div>
    `;
    
    // Add click event listener
    card.addEventListener('click', () => {
      this.onProjectClick(project);
    });
    
    return card;
  }
  
  /**
   * Render empty state
   * @private
   */
  renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    emptyState.innerHTML = `
      <div class="empty-state-icon">${this.emptyStateConfig.icon}</div>
      <h3 class="empty-state-message">${this.emptyStateConfig.message}</h3>
      ${this.emptyStateConfig.description ? `<p class="empty-state-description">${this.emptyStateConfig.description}</p>` : ''}
    `;
    
    this.container.appendChild(emptyState);
  }
  
  /**
   * Get CSS class for status badge
   * @param {string} status Project status
   * @returns {string} CSS class
   * @private
   */
  getStatusClass(status) {
    if (!status) return 'badge-default';
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'badge-success';
      case 'building':
        return 'badge-primary';
      case 'harvest':
        return 'badge-warning';
      case 'completed':
        return 'badge-info';
      case 'paused':
        return 'badge-secondary';
      default:
        return 'badge-default';
    }
  }
  
  /**
   * Get CSS class for funding badge
   * @param {string} funding Project funding status
   * @returns {string} CSS class
   * @private
   */
  getFundingClass(funding) {
    if (!funding) return 'badge-default';
    
    switch (funding.toLowerCase()) {
      case 'funded':
        return 'badge-success';
      case 'partially funded':
        return 'badge-warning';
      case 'needs funding':
        return 'badge-danger';
      default:
        return 'badge-default';
    }
  }
  
  /**
   * Get project counts by area
   * @returns {Object} Object with area names as keys and counts as values
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
  
  /**
   * Get filtered projects
   * @returns {Array<Object>} Array of filtered projects
   */
  getFilteredProjects() {
    return this.filteredProjects;
  }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  window.ProjectDisplay = ProjectDisplay;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectDisplay;
}