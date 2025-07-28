/**
 * AreaSelector Component
 * 
 * This component renders the area selection cards for the ACT Placemat.
 * It displays the five main project areas and handles selection.
 */

class AreaSelector {
  /**
   * Create a new AreaSelector
   * @param {Object} options Configuration options
   * @param {string} options.containerId ID of the container element
   * @param {Function} options.onSelect Callback function when an area is selected
   * @param {Object} options.areaData Data for each area
   */
  constructor(options) {
    this.containerId = options.containerId || 'areaSelectorContainer';
    this.onSelect = options.onSelect || (() => {});
    this.areaData = options.areaData || AreaSelector.defaultAreaData;
    this.selectedArea = null;
    
    // Area mapping for URL-friendly slugs
    this.areaMapping = {
      'Story & Sovereignty': 'story-sovereignty',
      'Economic Freedom': 'economic-freedom',
      'Community Engagement': 'community-engagement',
      'Operations & Infrastructure': 'operations-infrastructure',
      'Research & Development': 'research-development'
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
    
    // Render the component
    this.render();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check URL for pre-selected area
    this.checkUrlForArea();
  }
  
  /**
   * Render the component
   */
  render() {
    // Clear the container
    this.container.innerHTML = '';
    
    // Create the header
    const header = document.createElement('div');
    header.className = 'area-selector-header';
    header.innerHTML = `
      <h2>ACT Community Project Areas</h2>
      <p>Select an area to explore projects</p>
    `;
    this.container.appendChild(header);
    
    // Create the area cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'area-cards-container';
    
    // Create area cards
    Object.entries(this.areaData).forEach(([areaName, areaInfo]) => {
      const card = this.createAreaCard(areaName, areaInfo);
      cardsContainer.appendChild(card);
    });
    
    this.container.appendChild(cardsContainer);
  }
  
  /**
   * Create an area card
   * @param {string} areaName Name of the area
   * @param {Object} areaInfo Information about the area
   * @returns {HTMLElement} The area card element
   * @private
   */
  createAreaCard(areaName, areaInfo) {
    const slug = this.areaMapping[areaName] || areaName.toLowerCase().replace(/\\s+/g, '-');
    const isSelected = this.selectedArea === areaName;
    
    const card = document.createElement('div');
    card.className = `area-card ${isSelected ? 'selected' : ''}`;
    card.dataset.area = areaName;
    card.dataset.slug = slug;
    
    // Create card content
    card.innerHTML = `
      <div class="area-card-icon">${areaInfo.icon || '🔍'}</div>
      <h3 class="area-card-title">${areaName}</h3>
      <p class="area-card-description">${areaInfo.description || ''}</p>
      <div class="area-card-count" id="${slug}-count">
        <span class="count-number">${areaInfo.count || '0'}</span>
        <span class="count-label">Projects</span>
      </div>
    `;
    
    return card;
  }
  
  /**
   * Set up event listeners
   * @private
   */
  setupEventListeners() {
    // Add click event listeners to area cards
    const areaCards = this.container.querySelectorAll('.area-card');
    areaCards.forEach(card => {
      card.addEventListener('click', () => {
        const area = card.dataset.area;
        this.selectArea(area);
      });
    });
  }
  
  /**
   * Select an area
   * @param {string} area Name of the area to select
   */
  selectArea(area) {
    // Deselect previous area
    if (this.selectedArea) {
      const previousCard = this.container.querySelector(`.area-card[data-area="${this.selectedArea}"]`);
      if (previousCard) {
        previousCard.classList.remove('selected');
      }
    }
    
    // Select new area
    this.selectedArea = area;
    const card = this.container.querySelector(`.area-card[data-area="${area}"]`);
    if (card) {
      card.classList.add('selected');
      
      // Update URL
      const slug = card.dataset.slug;
      history.pushState({ area }, area, `?area=${slug}`);
    }
    
    // Call the onSelect callback
    this.onSelect(area);
  }
  
  /**
   * Check URL for pre-selected area
   * @private
   */
  checkUrlForArea() {
    const urlParams = new URLSearchParams(window.location.search);
    const areaSlug = urlParams.get('area');
    
    if (areaSlug) {
      // Find the area name from the slug
      const areaEntry = Object.entries(this.areaMapping).find(([_, slug]) => slug === areaSlug);
      if (areaEntry) {
        this.selectArea(areaEntry[0]);
      }
    }
  }
  
  /**
   * Update project counts for each area
   * @param {Object} counts Object with area names as keys and counts as values
   */
  updateCounts(counts) {
    Object.entries(counts).forEach(([area, count]) => {
      const slug = this.areaMapping[area] || area.toLowerCase().replace(/\\s+/g, '-');
      const countElement = document.getElementById(`${slug}-count`);
      if (countElement) {
        const countNumber = countElement.querySelector('.count-number');
        if (countNumber) {
          countNumber.textContent = count;
        }
      }
    });
  }
  
  /**
   * Get the currently selected area
   * @returns {string|null} The selected area name or null if none selected
   */
  getSelectedArea() {
    return this.selectedArea;
  }
}

/**
 * Default area data
 */
AreaSelector.defaultAreaData = {
  'Story & Sovereignty': {
    icon: '📖',
    description: 'Community-controlled narratives and data ownership',
    count: 0
  },
  'Economic Freedom': {
    icon: '💰',
    description: 'Community ownership and cooperative economics',
    count: 0
  },
  'Community Engagement': {
    icon: '🤝',
    description: 'Participatory democracy and mutual aid',
    count: 0
  },
  'Operations & Infrastructure': {
    icon: '🔧',
    description: 'Systems and tools for community resilience',
    count: 0
  },
  'Research & Development': {
    icon: '🔬',
    description: 'Community-led innovation and experimentation',
    count: 0
  }
};

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  window.AreaSelector = AreaSelector;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = AreaSelector;
}