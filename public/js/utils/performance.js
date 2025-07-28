/**
 * Performance Utilities
 * 
 * This module provides utilities for optimizing performance.
 */

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func Function to debounce
 * @param {number} wait Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit how often a function is called
 * @param {Function} func Function to throttle
 * @param {number} limit Limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Lazy load images
 * @param {string} selector CSS selector for images to lazy load
 */
function lazyLoadImages(selector = 'img[data-src]') {
  // Check if IntersectionObserver is supported
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const image = entry.target;
          image.src = image.dataset.src;
          image.removeAttribute('data-src');
          imageObserver.unobserve(image);
        }
      });
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll(selector).forEach(image => {
      imageObserver.observe(image);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    document.querySelectorAll(selector).forEach(image => {
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
    });
  }
}

/**
 * Detect network connection type
 * @returns {Object} Network information
 */
function getNetworkInfo() {
  const connection = navigator.connection || 
                    navigator.mozConnection || 
                    navigator.webkitConnection;
  
  if (connection) {
    return {
      type: connection.effectiveType || 'unknown',
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  
  return {
    type: 'unknown',
    downlink: null,
    rtt: null,
    saveData: false
  };
}

/**
 * Check if the device is on a slow connection
 * @returns {boolean} True if on a slow connection
 */
function isSlowConnection() {
  const networkInfo = getNetworkInfo();
  
  // Consider slow if 2G or slow 3G
  if (networkInfo.type === '2g' || networkInfo.type === 'slow-2g') {
    return true;
  }
  
  // Consider slow if downlink is less than 1 Mbps
  if (networkInfo.downlink && networkInfo.downlink < 1) {
    return true;
  }
  
  // Consider slow if RTT is greater than 500ms
  if (networkInfo.rtt && networkInfo.rtt > 500) {
    return true;
  }
  
  // Consider slow if saveData is enabled
  if (networkInfo.saveData) {
    return true;
  }
  
  return false;
}

/**
 * Optimize data fetching based on network conditions
 * @param {Function} fetchFunction Function to fetch data
 * @param {Object} options Options for optimization
 * @returns {Promise<any>} Fetched data
 */
async function optimizedFetch(fetchFunction, options = {}) {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    forceRefresh = false,
    lowResolution = false
  } = options;
  
  // Check if we should use cache
  if (!forceRefresh && cacheKey) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const age = Date.now() - timestamp;
        
        // Use cached data if it's not expired
        if (age < cacheDuration) {
          return data;
        }
      } catch (error) {
        console.error('Error parsing cached data:', error);
      }
    }
  }
  
  // Check if we're on a slow connection
  const isOnSlowConnection = isSlowConnection();
  
  // Add query parameters for slow connections
  let fetchOptions = {};
  if (isOnSlowConnection || lowResolution) {
    fetchOptions = {
      lowResolution: true,
      limit: 20 // Limit results for slow connections
    };
  }
  
  // Fetch data
  const data = await fetchFunction(fetchOptions);
  
  // Cache data if cacheKey is provided
  if (cacheKey) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }
  
  return data;
}

// Export utilities
if (typeof window !== 'undefined') {
  window.performanceUtils = {
    debounce,
    throttle,
    lazyLoadImages,
    getNetworkInfo,
    isSlowConnection,
    optimizedFetch
  };
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    throttle,
    lazyLoadImages,
    getNetworkInfo,
    isSlowConnection,
    optimizedFetch
  };
}