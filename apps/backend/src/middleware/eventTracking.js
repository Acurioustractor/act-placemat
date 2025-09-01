/**
 * Event Tracking Middleware
 * Automatically tracks API requests and user actions
 */

import eventTrackingService from '../services/eventTrackingService.js';

/**
 * Middleware to track API requests
 */
export const trackApiRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Capture original res.json to track response
  const originalJson = res.json;
  
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Track API usage
    eventTrackingService.trackApiUsage({
      user_id: req.user?.id || req.user?.user_id,
      endpoint: req.path,
      method: req.method,
      status_code: res.statusCode,
      response_time: responseTime,
      context: {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection?.remoteAddress,
        referrer: req.get('Referrer'),
        query_params: req.query,
        body_size: req.body ? JSON.stringify(req.body).length : 0,
        response_size: data ? JSON.stringify(data).length : 0
      }
    }).catch(error => {
      console.warn('⚠️ Failed to track API usage:', error.message);
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to track page views (for server-rendered pages)
 */
export const trackPageView = (req, res, next) => {
  eventTrackingService.trackPageView({
    user_id: req.user?.id || req.user?.user_id,
    session_id: req.session?.id || req.sessionID,
    page_url: req.originalUrl,
    page_title: req.headers['x-page-title'], // Can be set by frontend
    referrer: req.get('Referrer'),
    context: {
      user_agent: req.get('User-Agent'),
      ip_address: req.ip || req.connection?.remoteAddress,
      location: req.headers['x-user-location'] // Can be set by frontend
    }
  }).catch(error => {
    console.warn('⚠️ Failed to track page view:', error.message);
  });
  
  next();
};

/**
 * Middleware to extract user context for event tracking
 */
export const enrichUserContext = (req, res, next) => {
  // Add event tracking helpers to request object
  req.trackEvent = (eventData) => {
    return eventTrackingService.trackEvent({
      ...eventData,
      user_id: req.user?.id || req.user?.user_id,
      session_id: req.session?.id || req.sessionID,
      context: {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection?.remoteAddress,
        referrer: req.get('Referrer'),
        ...eventData.context
      }
    });
  };
  
  req.trackBusinessEvent = (businessData) => {
    return eventTrackingService.trackBusinessEvent({
      ...businessData,
      user_id: req.user?.id || req.user?.user_id,
      session_id: req.session?.id || req.sessionID,
      context: {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection?.remoteAddress,
        ...businessData.context
      }
    });
  };
  
  req.trackFeatureUsage = (featureData) => {
    return eventTrackingService.trackFeatureUsage({
      ...featureData,
      user_id: req.user?.id || req.user?.user_id,
      session_id: req.session?.id || req.sessionID,
      context: {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection?.remoteAddress,
        ...featureData.context
      }
    });
  };
  
  next();
};

/**
 * Middleware specifically for tracking user authentication events
 */
export const trackAuthEvents = (eventType) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only track successful auth responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = data?.user?.id || data?.id || req.body?.email;
        
        eventTrackingService.trackEvent({
          event_name: eventType,
          user_id: userId,
          session_id: req.session?.id || req.sessionID,
          properties: {
            category: 'authentication',
            success: true,
            auth_method: req.body?.provider || 'email',
            user_agent: req.get('User-Agent')
          },
          context: {
            user_agent: req.get('User-Agent'),
            ip_address: req.ip || req.connection?.remoteAddress,
            referrer: req.get('Referrer')
          }
        }).catch(error => {
          console.warn(`⚠️ Failed to track ${eventType} event:`, error.message);
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware for tracking data modification events
 */
export const trackDataEvents = (entityType, action) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only track successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = data?.id || req.params?.id;
        
        eventTrackingService.trackBusinessEvent({
          business_event: `${entityType}_${action}`,
          entity_type: entityType,
          entity_id: entityId,
          user_id: req.user?.id || req.user?.user_id,
          session_id: req.session?.id || req.sessionID,
          context: {
            user_agent: req.get('User-Agent'),
            ip_address: req.ip || req.connection?.remoteAddress,
            entity_data: data,
            business_value: calculateBusinessValue(entityType, action)
          }
        }).catch(error => {
          console.warn(`⚠️ Failed to track ${entityType}_${action} event:`, error.message);
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Calculate business value for different entity actions
 */
function calculateBusinessValue(entityType, action) {
  const valueMap = {
    story_create: 5,
    story_update: 2,
    story_publish: 10,
    project_create: 8,
    project_update: 3,
    project_complete: 15,
    collaboration_start: 12,
    outcome_report: 20,
    user_register: 5,
    user_verify: 3,
    organization_join: 7
  };
  
  const key = `${entityType}_${action}`;
  return valueMap[key] || 1;
}

/**
 * Error tracking middleware
 */
export const trackErrors = (err, req, res, next) => {
  // Track error event
  eventTrackingService.trackEvent({
    event_name: 'error_occurred',
    user_id: req.user?.id || req.user?.user_id,
    session_id: req.session?.id || req.sessionID,
    properties: {
      category: 'technical',
      error_type: err.name || 'UnknownError',
      error_message: err.message,
      error_code: err.code || err.status || 500,
      endpoint: req.path,
      method: req.method,
      stack_trace: err.stack
    },
    context: {
      user_agent: req.get('User-Agent'),
      ip_address: req.ip || req.connection?.remoteAddress,
      referrer: req.get('Referrer'),
      request_body: req.body
    }
  }).catch(trackingError => {
    console.warn('⚠️ Failed to track error event:', trackingError.message);
  });
  
  next(err);
};

/**
 * Batch event tracking for high-frequency events
 */
class BatchEventTracker {
  constructor(flushInterval = 5000, batchSize = 50) {
    this.events = [];
    this.flushInterval = flushInterval;
    this.batchSize = batchSize;
    this.timer = null;
    
    this.startBatchTimer();
  }
  
  addEvent(eventData) {
    this.events.push({
      ...eventData,
      timestamp: new Date().toISOString()
    });
    
    // Flush if batch is full
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }
  
  flush() {
    if (this.events.length === 0) return;
    
    const batch = [...this.events];
    this.events = [];
    
    // Process batch asynchronously
    this.processBatch(batch).catch(error => {
      console.warn('⚠️ Failed to process event batch:', error.message);
    });
  }
  
  async processBatch(events) {
    console.log(`📊 Processing batch of ${events.length} events...`);
    
    for (const event of events) {
      try {
        await eventTrackingService.trackEvent(event);
      } catch (error) {
        console.warn('⚠️ Failed to track batched event:', error.message);
      }
    }
  }
  
  startBatchTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

// Create batch tracker instance
export const batchEventTracker = new BatchEventTracker();

/**
 * Middleware for high-frequency event tracking (uses batching)
 */
export const trackHighFrequencyEvent = (eventName, category = 'engagement') => {
  return (req, res, next) => {
    batchEventTracker.addEvent({
      event_name: eventName,
      user_id: req.user?.id || req.user?.user_id,
      session_id: req.session?.id || req.sessionID,
      properties: {
        category,
        endpoint: req.path,
        method: req.method
      },
      context: {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection?.remoteAddress
      }
    });
    
    next();
  };
};

export default {
  trackApiRequest,
  trackPageView,
  enrichUserContext,
  trackAuthEvents,
  trackDataEvents,
  trackErrors,
  trackHighFrequencyEvent,
  batchEventTracker
};