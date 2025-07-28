/**
 * FilterPanel Component
 * 
 * This component provides filtering controls for projects.
 */

class FilterPanel {
  /**
   * Create a new FilterPanel
   * @param {Object} options Configuration options
   * @param {string} options.containerId ID of the container element
   * @param {Function} options.onFilterChange Callback function when filters change
   * @param {Object} options.initialFilters Initial filter values
   * @param {Array<Object>} options.filterOptions Available filter options
   */
  constructor(options) {
    this.containerId = options.containerId || 'filterPanelContainer';
    this.onFilterChange = options.onFilterChange || (() => {});
    this.initialFilters = options.initialFilters || {
      status: null,
      funding: null,
      search: '',
      tags: []
    };
    this.filterOptions = options.filterOptions || {
      statuses: [],
      funding: [],
      tags: []
    };
    
    // State
    this.filters = { ...this.initialFilters };
    this.expanded = false;
    
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
    
    // Render the component
    this.render();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Render the component
   */
  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Create the filter panel
    const panel = document.createElement('div');
    panel.className = 'filter-panel';
    
    // Create the header
    const header = document.createElement('div');
    header.className = 'filter-panel-header';
    header.innerHTML = `
      <div class="filter-panel-title">
        <h3>Filter Projects</h3>
        <button class="filter-panel-toggle" aria-expanded="${this.expanded}">
          ${this.expanded ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      <div class="filter-panel-search">
        <input type="text" placeholder="Search projects..." class="filter-search-input" value="${this.filters.search || ''}">
      </div>
    `;
    panel.appendChild(header);
    
    // Create the filter controls
    const controls = document.createElement('div');
    controls.className = `filter-panel-controls ${this.expanded ? 'expanded' : ''}`;
    
    // Status filter
    const statusFilter = this.createSelectFilter(
      'status',
      'Status',
      this.filterOptions.statuses,
      this.filters.status
    );
    controls.appendChild(statusFilter);
    
    // Funding filter
    const fundingFilter = this.createSelectFilter(
      'funding',
      'Funding',
      this.filterOptions.funding,
      this.filters.funding
    );
    controls.appendChild(fundingFilter);
    
    // Tags filter
    const tagsFilter = this.createTagsFilter(
      'tags',
      'Tags',
      this.filterOptions.tags,
      this.filters.tags
    );
    controls.appendChild(tagsFilter);
    
    // Reset button
    const resetButton = document.createElement('button');
    resetButton.className = 'filter-reset-btn';
    resetButton.textContent = 'Reset Filters';
    resetButton.addEventListener('click', () => this.resetFilters());
    controls.appendChild(resetButton);
    
    panel.appendChild(controls);
    
    // Add active filters display
    const activeFilters = this.createActiveFiltersDisplay();
    panel.appendChild(activeFilters);
    
    this.container.appendChild(panel);
  }
  
  /**
   * Create a select filter
   * @param {string} name Filter name
   * @param {string} label Filter label
   * @param {Array<string>} options Filter options
   * @param {string} value Current value
   * @returns {HTMLElement} The filter element
   * @private
   */
  createSelectFilter(name, label, options, value) {
    const filter = document.createElement('div');
    filter.className = 'filter-control';
    
    filter.innerHTML = `
      <label for="filter-${name}">${label}</label>
      <select id="filter-${name}" name="${name}">
        <option value="">All ${label}</option>
        ${options.map(option => `
          <option value="${option}" ${value === option ? 'selected' : ''}>
            ${option}
          </option>
        `).join('')}
      </select>
    `;
    
    return filter;
  }
  
  /**
   * Create a tags filter
   * @param {string} name Filter name
   * @param {string} label Filter label
   * @param {Array<string>} options Filter options
   * @param {Array<string>} values Current values
   * @returns {HTMLElement} The filter element
   * @private
   */
  createTagsFilter(name, label, options, values) {
    const filter = document.createElement('div');
    filter.className = 'filter-control filter-tags';
    
    filter.innerHTML = `
      <label>${label}</label>
      <div class="filter-tags-container">
        ${options.map(tag => `
          <label class="filter-tag-checkbox">
            <input type="checkbox" name="${name}" value="${tag}" ${values.includes(tag) ? 'checked' : ''}>
            <span>${tag}</span>
          </label>
        `).join('')}
      </div>
    `;
    
    return filter;
  }
  
  /**
   * Create active filters display
   * @returns {HTMLElement} The active filters element
   * @private
   */
  createActiveFiltersDisplay() {
    const activeFilters = document.createElement('div');
    activeFilters.className = 'filter-active-filters';
    
    // Count active filters
    const activeCount = this.countActiveFilters();
    
    if (activeCount === 0) {
      activeFilters.innerHTML = `
        <span class="filter-active-count">No active filters</span>
      `;
      return activeFilters;
    }
    
    // Create active filters display
    activeFilters.innerHTML = `
      <span class="filter-active-count">${activeCount} active filter${activeCount !== 1 ? 's' : ''}</span>
      <div class="filter-active-tags">
        ${this.filters.status ? `
          <span class="filter-active-tag" data-filter="status">
            Status: ${this.filters.status}
            <button class="filter-active-tag-remove" data-filter="status">&times;</button>
          </span>
        ` : ''}
        
        ${this.filters.funding ? `
          <span class="filter-active-tag" data-filter="funding">
            Funding: ${this.filters.funding}
            <button class="filter-active-tag-remove" data-filter="funding">&times;</button>
          </span>
        ` : ''}
        
        ${this.filters.search ? `
          <span class="filter-active-tag" data-filter="search">
            Search: ${this.filters.search}
            <button class="filter-active-tag-remove" data-filter="search">&times;</button>
          </span>
        ` : ''}
        
        ${this.filters.tags.map(tag => `
          <span class="filter-active-tag" data-filter="tag" data-tag="${tag}">
            Tag: ${tag}
            <button class="filter-active-tag-remove" data-filter="tag" data-tag="${tag}">&times;</button>
          </span>
        `).join('')}
      </div>
    `;
    
    return activeFilters;
  }
  
  /**
   * Count active filters
   * @returns {number} Number of active filters
   * @private
   */
  countActiveFilters() {
    let count = 0;
    
    if (this.filters.status) count++;
    if (this.filters.funding) count++;
    if (this.filters.search) count++;
    count += this.filters.tags.length;
    
    return count;
  }
  
  /**
   * Set up event listeners
   * @private
   */
  setupEventListeners() {
    // Toggle button
    const toggleButton = this.container.querySelector('.filter-panel-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggleExpanded());
    }
    
    // Search input
    const searchInput = this.container.querySelector('.filter-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        this.updateFilter('search', event.target.value);
      });
      
      // Add debounce for search
      let debounceTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.notifyFilterChange();
        }, 300);
      });
    }
    
    // Select filters
    const selects = this.container.querySelectorAll('select');
    selects.forEach(select => {
      select.addEventListener('change', (event) => {
        this.updateFilter(event.target.name, event.target.value);
        this.notifyFilterChange();
      });
    });
    
    // Tag checkboxes
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateTagFilters();
        this.notifyFilterChange();
      });
    });
    
    // Active filter remove buttons
    const removeButtons = this.container.querySelectorAll('.filter-active-tag-remove');
    removeButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const filter = event.target.dataset.filter;
        const tag = event.target.dataset.tag;
        
        if (filter === 'tag' && tag) {
          this.removeTagFilter(tag);
        } else {
          this.updateFilter(filter, null);
        }
        
        this.notifyFilterChange();
      });
    });
  }
  
  /**
   * Toggle expanded state
   */
  toggleExpanded() {
    this.expanded = !this.expanded;
    this.render();
  }
  
  /**
   * Update a filter
   * @param {string} name Filter name
   * @param {any} value Filter value
   */
  updateFilter(name, value) {
    this.filters[name] = value;
    this.render();
  }
  
  /**
   * Update tag filters from checkboxes
   * @private
   */
  updateTagFilters() {
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"][name="tags"]');
    const selectedTags = [];
    
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selectedTags.push(checkbox.value);
      }
    });
    
    this.filters.tags = selectedTags;
    this.render();
  }
  
  /**
   * Remove a tag filter
   * @param {string} tag Tag to remove
   */
  removeTagFilter(tag) {
    this.filters.tags = this.filters.tags.filter(t => t !== tag);
    this.render();
  }
  
  /**
   * Reset all filters
   */
  resetFilters() {
    this.filters = { ...this.initialFilters };
    this.render();
    this.notifyFilterChange();
  }
  
  /**
   * Notify filter change
   * @private
   */
  notifyFilterChange() {
    this.onFilterChange({ ...this.filters });
  }
  
  /**
   * Update filter options
   * @param {Object} options New filter options
   */
  updateFilterOptions(options) {
    this.filterOptions = { ...this.filterOptions, ...options };
    this.render();
  }
  
  /**
   * Get current filters
   * @returns {Object} Current filters
   */
  getFilters() {
    return { ...this.filters };
  }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  window.FilterPanel = FilterPanel;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterPanel;
}