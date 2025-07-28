/**
 * ProjectModal Component
 * 
 * This component displays detailed information about a project in a modal.
 */

class ProjectModal {
  /**
   * Create a new ProjectModal
   * @param {Object} options Configuration options
   * @param {string} options.containerId ID of the container element
   */
  constructor(options) {
    this.containerId = options.containerId || 'projectModalContainer';
    this.isOpen = false;
    this.currentProject = null;
    
    // Initialize the component
    this.init();
  }
  
  /**
   * Initialize the component
   * @private
   */
  init() {
    // Create modal container if it doesn't exist
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      document.body.appendChild(container);
    }
    
    this.container = container;
    
    // Create the modal structure
    this.createModalStructure();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Create the modal structure
   * @private
   */
  createModalStructure() {
    this.container.innerHTML = `
      <div class="project-modal" style="display: none;">
        <div class="project-modal-overlay"></div>
        <div class="project-modal-content">
          <div class="project-modal-header">
            <h2 class="project-modal-title"></h2>
            <button class="project-modal-close">&times;</button>
          </div>
          <div class="project-modal-body"></div>
          <div class="project-modal-footer">
            <button class="project-modal-close-btn">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Get references to elements
    this.modal = this.container.querySelector('.project-modal');
    this.overlay = this.container.querySelector('.project-modal-overlay');
    this.content = this.container.querySelector('.project-modal-content');
    this.header = this.container.querySelector('.project-modal-header');
    this.title = this.container.querySelector('.project-modal-title');
    this.body = this.container.querySelector('.project-modal-body');
    this.closeBtn = this.container.querySelector('.project-modal-close');
    this.closeFooterBtn = this.container.querySelector('.project-modal-close-btn');
  }
  
  /**
   * Set up event listeners
   * @private
   */
  setupEventListeners() {
    // Close button click
    this.closeBtn.addEventListener('click', () => this.close());
    
    // Close footer button click
    this.closeFooterBtn.addEventListener('click', () => this.close());
    
    // Overlay click
    this.overlay.addEventListener('click', () => this.close());
    
    // ESC key press
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }
  
  /**
   * Open the modal with project data
   * @param {Object} project Project data
   */
  open(project) {
    if (!project) return;
    
    this.currentProject = project;
    
    // Set title
    this.title.textContent = project.name || 'Project Details';
    
    // Set body content
    this.body.innerHTML = this.generateProjectContent(project);
    
    // Show modal
    this.modal.style.display = 'block';
    this.isOpen = true;
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    // Add animation class
    setTimeout(() => {
      this.content.classList.add('project-modal-content-visible');
    }, 10);
  }
  
  /**
   * Close the modal
   */
  close() {
    // Remove animation class
    this.content.classList.remove('project-modal-content-visible');
    
    // Hide modal after animation
    setTimeout(() => {
      this.modal.style.display = 'none';
      this.isOpen = false;
      this.currentProject = null;
      
      // Restore body scrolling
      document.body.style.overflow = '';
    }, 300);
  }
  
  /**
   * Generate project content HTML
   * @param {Object} project Project data
   * @returns {string} HTML content
   * @private
   */
  generateProjectContent(project) {
    // Status badge class
    const statusClass = this.getStatusClass(project.status);
    
    // Funding badge class
    const fundingClass = this.getFundingClass(project.funding);
    
    // Format tags
    const tagsHtml = project.tags && project.tags.length > 0
      ? `<div class="project-modal-tags">${project.tags.map(tag => `<span class="project-modal-tag">${tag}</span>`).join('')}</div>`
      : '';
    
    // Format dates
    const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : null;
    const endDate = project.endDate ? new Date(project.endDate).toLocaleDateString() : null;
    const nextMilestone = project.nextMilestone ? new Date(project.nextMilestone).toLocaleDateString() : null;
    
    // Format revenue
    const formatCurrency = (value) => {
      if (value === undefined || value === null) return null;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    };
    
    const revenueActual = formatCurrency(project.revenueActual);
    const revenuePotential = formatCurrency(project.revenuePotential);
    
    return `
      <div class="project-modal-section">
        <div class="project-modal-badges">
          <span class="project-modal-badge ${statusClass}">${project.status || 'Unknown'}</span>
          ${project.funding ? `<span class="project-modal-badge ${fundingClass}">${project.funding}</span>` : ''}
          <span class="project-modal-badge badge-info">${project.area || 'Uncategorized'}</span>
        </div>
        
        <div class="project-modal-description">
          <h3>Description</h3>
          <p>${project.description || 'No description available'}</p>
        </div>
        
        <div class="project-modal-details">
          <div class="project-modal-detail-group">
            <h3>Project Details</h3>
            <table class="project-modal-table">
              <tbody>
                ${project.lead ? `<tr><td>Lead</td><td>${project.lead}</td></tr>` : ''}
                ${project.teamMembers ? `<tr><td>Team</td><td>${project.teamMembers}</td></tr>` : ''}
                ${startDate ? `<tr><td>Start Date</td><td>${startDate}</td></tr>` : ''}
                ${endDate ? `<tr><td>End Date</td><td>${endDate}</td></tr>` : ''}
                ${nextMilestone ? `<tr><td>Next Milestone</td><td>${nextMilestone}</td></tr>` : ''}
                ${project.location ? `<tr><td>Location</td><td>${project.location}</td></tr>` : ''}
              </tbody>
            </table>
          </div>
          
          <div class="project-modal-detail-group">
            <h3>Financial Information</h3>
            <table class="project-modal-table">
              <tbody>
                ${revenueActual ? `<tr><td>Actual Revenue</td><td>${revenueActual}</td></tr>` : ''}
                ${revenuePotential ? `<tr><td>Potential Revenue</td><td>${revenuePotential}</td></tr>` : ''}
                ${project.funding ? `<tr><td>Funding Status</td><td>${project.funding}</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        </div>
        
        ${project.successMetrics ? `
          <div class="project-modal-metrics">
            <h3>Success Metrics</h3>
            <p>${project.successMetrics}</p>
          </div>
        ` : ''}
        
        ${tagsHtml ? `
          <div class="project-modal-tag-section">
            <h3>Tags</h3>
            ${tagsHtml}
          </div>
        ` : ''}
        
        ${project.url ? `
          <div class="project-modal-links">
            <a href="${project.url}" target="_blank" class="project-modal-link">View in Notion</a>
          </div>
        ` : ''}
      </div>
    `;
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
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  window.ProjectModal = ProjectModal;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectModal;
}