/**
 * NotificationSystem Component
 * 
 * This component displays toast notifications for the application.
 */

class NotificationSystem {
  /**
   * Create a new NotificationSystem
   * @param {Object} options Configuration options
   * @param {string} options.containerId ID of the container element
   * @param {number} options.duration Default duration in milliseconds
   * @param {string} options.position Default position
   */
  constructor(options = {}) {
    this.containerId = options.containerId || 'notificationContainer';
    this.duration = options.duration || 5000;
    this.position = options.position || 'top-right';
    this.notifications = [];
    this.counter = 0;
    
    // Initialize the component
    this.init();
  }
  
  /**
   * Initialize the component
   * @private
   */
  init() {
    // Create container if it doesn't exist
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = `notification-container ${this.position}`;
      document.body.appendChild(container);
    }
    
    this.container = container;
  }
  
  /**
   * Show a notification
   * @param {string} message Notification message
   * @param {Object} options Notification options
   * @param {string} options.type Notification type (success, error, warning, info)
   * @param {number} options.duration Duration in milliseconds
   * @param {boolean} options.dismissible Whether the notification is dismissible
   * @param {string} options.position Position (top-right, top-left, bottom-right, bottom-left)
   * @returns {number} Notification ID
   */
  show(message, options = {}) {
    const id = ++this.counter;
    const type = options.type || 'info';
    const duration = options.duration || this.duration;
    const dismissible = options.dismissible !== false;
    const position = options.position || this.position;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} notification-enter`;
    notification.dataset.id = id;
    
    // Create notification content
    notification.innerHTML = `
      <div class="notification-icon">${this.getIcon(type)}</div>
      <div class="notification-content">
        <div class="notification-message">${message}</div>
      </div>
      ${dismissible ? '<button class="notification-close">&times;</button>' : ''}
    `;
    
    // Add to container
    this.container.appendChild(notification);
    
    // Add to notifications array
    this.notifications.push({
      id,
      element: notification,
      timeout: null
    });
    
    // Set up auto-dismiss
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      
      // Store timeout ID
      const notificationObj = this.notifications.find(n => n.id === id);
      if (notificationObj) {
        notificationObj.timeout = timeout;
      }
    }
    
    // Set up event listeners
    if (dismissible) {
      const closeButton = notification.querySelector('.notification-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.dismiss(id);
        });
      }
    }
    
    // Trigger enter animation
    setTimeout(() => {
      notification.classList.remove('notification-enter');
    }, 10);
    
    return id;
  }
  
  /**
   * Show a success notification
   * @param {string} message Notification message
   * @param {Object} options Notification options
   * @returns {number} Notification ID
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }
  
  /**
   * Show an error notification
   * @param {string} message Notification message
   * @param {Object} options Notification options
   * @returns {number} Notification ID
   */
  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }
  
  /**
   * Show a warning notification
   * @param {string} message Notification message
   * @param {Object} options Notification options
   * @returns {number} Notification ID
   */
  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }
  
  /**
   * Show an info notification
   * @param {string} message Notification message
   * @param {Object} options Notification options
   * @returns {number} Notification ID
   */
  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }
  
  /**
   * Dismiss a notification
   * @param {number} id Notification ID
   */
  dismiss(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return;
    
    // Clear timeout
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }
    
    // Add exit animation
    notification.element.classList.add('notification-exit');
    
    // Remove after animation
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      
      // Remove from notifications array
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 300);
  }
  
  /**
   * Dismiss all notifications
   */
  dismissAll() {
    [...this.notifications].forEach(notification => {
      this.dismiss(notification.id);
    });
  }
  
  /**
   * Get icon for notification type
   * @param {string} type Notification type
   * @returns {string} Icon HTML
   * @private
   */
  getIcon(type) {
    switch (type) {
      case 'success':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>';
      case 'error':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>';
      case 'warning':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>';
      case 'info':
      default:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>';
    }
  }
  
  /**
   * Update container position
   * @param {string} position New position
   */
  updatePosition(position) {
    this.position = position;
    this.container.className = `notification-container ${position}`;
  }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  window.NotificationSystem = NotificationSystem;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSystem;
}