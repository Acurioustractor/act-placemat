/**
 * Event Tracking Service
 * Provides comprehensive event tracking for user actions and system events
 * Integrates with PostHog for analytics and stores events in local database
 */

import { createClient } from '@supabase/supabase-js';
import tracingService, { traceAnalytics, traceDatabase } from './tracingService.js';

class EventTrackingService {
  /**
   * Map invalid categories to valid database constraint values
   * Valid categories: 'engagement', 'content', 'collaboration', 'impact', 'technical'
   */
  mapToValidCategory(category) {
    const categoryMapping = {
      'authentication': 'technical',
      'navigation': 'engagement', 
      'feature_usage': 'engagement',
      'api_usage': 'technical',
      'business': 'impact',
      'system': 'technical',
      'admin': 'technical',
      'monitoring': 'technical',
      'financial': 'impact',
      'operational': 'collaboration',
      'cultural': 'content',
      'community': 'collaboration',
      'security': 'technical'
    };
    
    const mapped = categoryMapping[category] || 'engagement';
    
    // Debug logging to identify unmapped categories
    if (!categoryMapping[category] && category !== 'engagement') {
      console.warn(`⚠️ Unmapped category detected: "${category}" -> mapped to "${mapped}"`);
    }
    
    return mapped;
  }

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // PostHog client will be initialized when dependency is available
    this.posthog = null;
    this.isPostHogEnabled = false;
    
    // Event queue for when PostHog is not available
    this.eventQueue = [];
    this.maxQueueSize = 1000;
    
    this.initializePostHog();
  }

  /**
   * Initialize PostHog client when available
   */
  async initializePostHog() {
    try {
      // Dynamic import when posthog-node is available
      const { PostHog } = await import('posthog-node');
      
      if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_HOST) {
        this.posthog = new PostHog(process.env.POSTHOG_API_KEY, {
          host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
          flushAt: 10, // Flush events in batches of 10
          flushInterval: 5000, // Flush every 5 seconds
          requestTimeout: 10000,
          featureFlagsPollingInterval: 30000
        });
        
        this.isPostHogEnabled = true;
        console.log('✅ PostHog event tracking initialized');
        
        // Process any queued events
        await this.processEventQueue();
      } else {
        console.log('⚠️ PostHog not configured - event tracking will use database only');
      }
    } catch (error) {
      console.warn('⚠️ PostHog not available - events will be queued:', error.message);
      this.isPostHogEnabled = false;
    }
  }

  /**
   * Process queued events when PostHog becomes available
   */
  async processEventQueue() {
    if (!this.isPostHogEnabled || this.eventQueue.length === 0) return;
    
    console.log(`📤 Processing ${this.eventQueue.length} queued events...`);
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    for (const event of events) {
      try {
        await this.sendToPostHog(event);
      } catch (error) {
        console.warn('⚠️ Failed to process queued event:', error.message);
      }
    }
  }

  /**
   * Track a user action or system event
   */
  async trackEvent(eventData) {
    const {
      event_name,
      user_id,
      session_id,
      properties = {},
      context = {}
    } = eventData;

    return await traceAnalytics('event_tracking', 'posthog', async (span) => {
      try {
        span.setAttributes({
          'event.name': event_name,
          'event.user_id': user_id || 'anonymous',
          'event.session_id': session_id || 'no_session',
          'event.category': this.mapToValidCategory(properties.category || 'engagement'),
          'event.has_context': Object.keys(context).length > 0
        });

        const enrichedEvent = {
          event_type: 'user_action',
          event_category: this.mapToValidCategory(properties.category || 'engagement'),
          event_name,
          user_id,
          session_id,
          user_agent: context.user_agent,
          ip_address: context.ip_address,
          event_properties: {
            ...properties,
            timestamp: new Date().toISOString(),
            platform: 'web',
            source: 'backend'
          },
          event_metadata: {
            server_timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.APP_VERSION || '1.0.0'
          },
          geographic_data: context.location || {},
          device_data: {
            user_agent: context.user_agent,
            platform: 'web'
          },
          referrer_data: context.referrer || {},
          engagement_score: this.calculateEngagementScore(eventData),
          created_at: new Date().toISOString(),
          event_timestamp: new Date().toISOString()
        };

        // Store in local database with tracing
        await traceDatabase('insert', 'community_events', async () => {
          return await this.storeEventInDatabase(enrichedEvent);
        });
        
        // Send to PostHog if available
        if (this.isPostHogEnabled) {
          const posthogSpan = tracingService.startSpan('analytics.posthog_send', {
            attributes: {
              'posthog.distinct_id': user_id || session_id || 'anonymous',
              'posthog.event': event_name
            }
          });
          
          try {
            await this.sendToPostHog({
              distinctId: user_id || session_id || 'anonymous',
              event: event_name,
              properties: {
                ...enrichedEvent.event_properties,
                ...enrichedEvent.event_metadata,
                $set: {
                  user_id: user_id,
                  session_id: session_id
                }
              }
            });
            posthogSpan.setStatus('OK');
          } catch (posthogError) {
            console.warn('Failed to send event to PostHog:', posthogError.message);
            posthogSpan.recordException(posthogError);
            posthogSpan.setStatus('ERROR');
          } finally {
            posthogSpan.end();
          }
        } else {
          // Queue for later processing
          this.queueEvent({
            distinctId: user_id || session_id || 'anonymous',
            event: event_name,
            properties: enrichedEvent.event_properties
          });
        }
        
        span.setAttributes({
          'event.tracked': true,
          'event.posthog_sent': this.isPostHogEnabled
        });
        
        console.log(`📊 Event tracked: ${event_name} for user ${user_id || 'anonymous'}`);
        return { success: true, event_id: enrichedEvent.created_at };
        
      } catch (error) {
        console.error('❌ Failed to track event:', error.message);
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Track user identification (for linking anonymous and authenticated users)
   */
  async identifyUser(userId, previousId, userProperties = {}) {
    try {
      if (this.isPostHogEnabled) {
        // Alias anonymous user to authenticated user
        if (previousId && previousId !== userId) {
          this.posthog.alias({
            distinctId: userId,
            alias: previousId
          });
        }
        
        // Set user properties
        this.posthog.identify({
          distinctId: userId,
          properties: {
            ...userProperties,
            identified_at: new Date().toISOString()
          }
        });
      }
      
      // Track identification event
      await this.trackEvent({
        event_name: 'user_identified',
        user_id: userId,
        properties: {
          category: this.mapToValidCategory('authentication'),
          previous_id: previousId,
          user_properties: userProperties
        }
      });
      
      console.log(`👤 User identified: ${userId}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to identify user:', error.message);
      throw error;
    }
  }

  /**
   * Track page views
   */
  async trackPageView(pageData) {
    const {
      user_id,
      session_id,
      page_url,
      page_title,
      referrer,
      context = {}
    } = pageData;

    return this.trackEvent({
      event_name: 'page_view',
      user_id,
      session_id,
      properties: {
        category: this.mapToValidCategory('navigation'),
        page_url,
        page_title,
        referrer,
        time_on_page: context.time_on_page || 0
      },
      context
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(featureData) {
    const {
      user_id,
      session_id,
      feature_name,
      action,
      context = {}
    } = featureData;

    return this.trackEvent({
      event_name: 'feature_used',
      user_id,
      session_id,
      properties: {
        category: this.mapToValidCategory('feature_usage'),
        feature_name,
        action,
        success: context.success !== false
      },
      context
    });
  }

  /**
   * Track API usage for monitoring and analytics
   */
  async trackApiUsage(apiData) {
    const {
      user_id,
      endpoint,
      method,
      status_code,
      response_time,
      context = {}
    } = apiData;

    return this.trackEvent({
      event_name: 'api_request',
      user_id,
      properties: {
        category: this.mapToValidCategory('api_usage'),
        endpoint,
        method,
        status_code,
        response_time,
        success: status_code < 400
      },
      context
    });
  }

  /**
   * Track business events (project creation, collaboration, etc.)
   */
  async trackBusinessEvent(businessData) {
    const {
      user_id,
      session_id,
      business_event,
      entity_type,
      entity_id,
      context = {}
    } = businessData;

    return this.trackEvent({
      event_name: business_event,
      user_id,
      session_id,
      properties: {
        category: this.mapToValidCategory('business'),
        entity_type,
        entity_id,
        business_value: context.business_value || 0
      },
      context
    });
  }

  /**
   * Send event to PostHog
   */
  async sendToPostHog(eventData) {
    if (!this.posthog) return;
    
    try {
      this.posthog.capture(eventData);
      return true;
    } catch (error) {
      console.warn('⚠️ PostHog capture failed:', error.message);
      this.queueEvent(eventData);
      return false;
    }
  }

  /**
   * Queue event for later processing
   */
  queueEvent(eventData) {
    if (this.eventQueue.length >= this.maxQueueSize) {
      // Remove oldest event to prevent memory issues
      this.eventQueue.shift();
    }
    
    this.eventQueue.push({
      ...eventData,
      queued_at: new Date().toISOString()
    });
  }

  /**
   * Store event in local database
   */
  async storeEventInDatabase(eventData) {
    try {
      const { data, error } = await this.supabase
        .from('community_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('❌ Failed to store event in database:', error.message);
      throw error;
    }
  }

  /**
   * Calculate engagement score based on event data
   */
  calculateEngagementScore(eventData) {
    const { properties = {} } = eventData;
    
    // Base score
    let score = 1;
    
    // Increase score for meaningful interactions
    if (properties.category === 'collaboration') score += 3;
    if (properties.category === 'content') score += 2;
    if (properties.category === 'impact') score += 4;
    
    // Time-based scoring
    if (properties.time_on_page > 30) score += 1;
    if (properties.time_on_page > 120) score += 2;
    
    // Success-based scoring
    if (properties.success === true) score += 1;
    
    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Get analytics summary for dashboard
   */
  async getAnalyticsSummary(timeRange = '7d') {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange.replace('d', '')));
      
      const { data: events, error } = await this.supabase
        .from('community_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const summary = {
        total_events: events.length,
        unique_users: new Set(events.map(e => e.user_id).filter(Boolean)).size,
        event_categories: this.groupEventsByCategory(events),
        engagement_metrics: this.calculateEngagementMetrics(events),
        top_events: this.getTopEvents(events),
        time_range: timeRange
      };

      return summary;
    } catch (error) {
      console.error('❌ Failed to get analytics summary:', error.message);
      throw error;
    }
  }

  /**
   * Group events by category for analysis
   */
  groupEventsByCategory(events) {
    const categories = {};
    
    events.forEach(event => {
      const category = event.event_category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          unique_users: new Set()
        };
      }
      categories[category].count++;
      if (event.user_id) {
        categories[category].unique_users.add(event.user_id);
      }
    });
    
    // Convert sets to counts
    Object.keys(categories).forEach(category => {
      categories[category].unique_users = categories[category].unique_users.size;
    });
    
    return categories;
  }

  /**
   * Calculate engagement metrics
   */
  calculateEngagementMetrics(events) {
    const totalEngagement = events.reduce((sum, event) => {
      return sum + (event.engagement_score || 0);
    }, 0);
    
    return {
      total_engagement: totalEngagement,
      average_engagement: events.length > 0 ? totalEngagement / events.length : 0,
      high_engagement_events: events.filter(e => (e.engagement_score || 0) >= 5).length
    };
  }

  /**
   * Get top events by frequency
   */
  getTopEvents(events, limit = 10) {
    const eventCounts = {};
    
    events.forEach(event => {
      const eventName = event.event_name;
      if (!eventCounts[eventName]) {
        eventCounts[eventName] = 0;
      }
      eventCounts[eventName]++;
    });
    
    return Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([event, count]) => ({ event, count }));
  }

  /**
   * Flush any pending events (call on app shutdown)
   */
  async flush() {
    if (this.posthog) {
      await this.posthog.shutdown();
    }
    console.log('📊 Event tracking service flushed');
  }
}

// Create singleton instance
const eventTrackingService = new EventTrackingService();

export default eventTrackingService;