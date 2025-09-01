/**
 * Event Tracking API
 * Provides endpoints for event tracking, analytics, and insights
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth, apiKeyOrAuth } from '../middleware/auth.js';
import eventTrackingService from '../services/eventTrackingService.js';
import { enrichUserContext } from '../middleware/eventTracking.js';

const router = express.Router();

// Apply user context enrichment to all routes
router.use(enrichUserContext);

/**
 * POST /api/events/track
 * Track a custom event
 */
router.post('/track', optionalAuth, asyncHandler(async (req, res) => {
  const {
    event_name,
    properties = {},
    context = {}
  } = req.body;

  if (!event_name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: event_name'
    });
  }

  try {
    const result = await req.trackEvent({
      event_name,
      properties,
      context
    });

    res.json({
      success: true,
      message: 'Event tracked successfully',
      event_id: result.event_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to track custom event:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to track event',
      details: error.message
    });
  }
}));

/**
 * POST /api/events/page-view
 * Track a page view
 */
router.post('/page-view', optionalAuth, asyncHandler(async (req, res) => {
  const {
    page_url,
    page_title,
    referrer,
    time_on_page
  } = req.body;

  if (!page_url) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: page_url'
    });
  }

  try {
    const result = await eventTrackingService.trackPageView({
      user_id: req.user?.id || req.user?.user_id,
      session_id: req.session?.id || req.sessionID,
      page_url,
      page_title,
      referrer,
      context: {
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection?.remoteAddress,
        time_on_page
      }
    });

    res.json({
      success: true,
      message: 'Page view tracked successfully',
      event_id: result.event_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to track page view:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to track page view',
      details: error.message
    });
  }
}));

/**
 * POST /api/events/feature-usage
 * Track feature usage
 */
router.post('/feature-usage', optionalAuth, asyncHandler(async (req, res) => {
  const {
    feature_name,
    action,
    success = true,
    metadata = {}
  } = req.body;

  if (!feature_name || !action) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: feature_name, action'
    });
  }

  try {
    const result = await req.trackFeatureUsage({
      feature_name,
      action,
      context: {
        success,
        metadata
      }
    });

    res.json({
      success: true,
      message: 'Feature usage tracked successfully',
      event_id: result.event_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to track feature usage:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to track feature usage',
      details: error.message
    });
  }
}));

/**
 * POST /api/events/business-event
 * Track business events (project creation, collaboration, etc.)
 */
router.post('/business-event', optionalAuth, asyncHandler(async (req, res) => {
  const {
    business_event,
    entity_type,
    entity_id,
    business_value,
    metadata = {}
  } = req.body;

  if (!business_event || !entity_type) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: business_event, entity_type'
    });
  }

  try {
    const result = await req.trackBusinessEvent({
      business_event,
      entity_type,
      entity_id,
      context: {
        business_value,
        metadata
      }
    });

    res.json({
      success: true,
      message: 'Business event tracked successfully',
      event_id: result.event_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to track business event:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to track business event',
      details: error.message
    });
  }
}));

/**
 * POST /api/events/identify
 * Identify user (link anonymous and authenticated sessions)
 */
router.post('/identify', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const {
    user_id,
    previous_id,
    user_properties = {}
  } = req.body;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: user_id'
    });
  }

  try {
    const result = await eventTrackingService.identifyUser(
      user_id,
      previous_id,
      user_properties
    );

    res.json({
      success: true,
      message: 'User identified successfully',
      user_id,
      previous_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to identify user:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to identify user',
      details: error.message
    });
  }
}));

/**
 * GET /api/events/analytics/summary
 * Get analytics summary
 */
router.get('/analytics/summary', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { time_range = '7d' } = req.query;

  try {
    const summary = await eventTrackingService.getAnalyticsSummary(time_range);

    res.json({
      success: true,
      analytics: summary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get analytics summary:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics',
      details: error.message
    });
  }
}));

/**
 * GET /api/events/analytics/dashboard
 * Get dashboard analytics data
 */
router.get('/analytics/dashboard', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const {
    time_range = '7d',
    include_users = true,
    include_events = true,
    include_engagement = true
  } = req.query;

  try {
    const [summary, events] = await Promise.all([
      eventTrackingService.getAnalyticsSummary(time_range),
      include_events ? eventTrackingService.supabase
        .from('community_events')
        .select('event_name, event_category, created_at, engagement_score')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100) : { data: [] }
    ]);

    const dashboardData = {
      overview: {
        total_events: summary.total_events,
        unique_users: summary.unique_users,
        time_range: summary.time_range,
        engagement_score: summary.engagement_metrics.average_engagement
      },
      event_categories: summary.event_categories,
      top_events: summary.top_events,
      engagement_metrics: summary.engagement_metrics,
      recent_events: include_events ? events.data?.slice(0, 20) : [],
      trends: {
        daily_events: await getDailyEventTrends(time_range),
        popular_features: await getPopularFeatures(time_range),
        user_journey: await getUserJourneyInsights(time_range)
      }
    };

    res.json({
      success: true,
      dashboard: dashboardData,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to generate analytics dashboard:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard',
      details: error.message
    });
  }
}));

/**
 * GET /api/events/analytics/user-insights/:userId
 * Get insights for a specific user
 */
router.get('/analytics/user-insights/:userId', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { time_range = '30d' } = req.query;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(time_range.replace('d', '')));

    const { data: userEvents, error } = await eventTrackingService.supabase
      .from('community_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const insights = {
      user_id: userId,
      total_events: userEvents.length,
      event_categories: eventTrackingService.groupEventsByCategory(userEvents),
      engagement_score: userEvents.reduce((sum, e) => sum + (e.engagement_score || 0), 0),
      most_active_days: getMostActiveDays(userEvents),
      feature_usage: getFeatureUsageStats(userEvents),
      user_journey: getUserJourney(userEvents),
      time_range
    };

    res.json({
      success: true,
      user_insights: insights,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get user insights:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user insights',
      details: error.message
    });
  }
}));

/**
 * POST /api/events/batch
 * Submit multiple events in a batch
 */
router.post('/batch', optionalAuth, asyncHandler(async (req, res) => {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: events (must be array)'
    });
  }

  if (events.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Batch size too large (max 100 events)'
    });
  }

  try {
    const results = [];
    const errors = [];

    for (const [index, eventData] of events.entries()) {
      try {
        const result = await req.trackEvent(eventData);
        results.push({ index, success: true, event_id: result.event_id });
      } catch (error) {
        errors.push({ index, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} of ${events.length} events`,
      results,
      errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to process batch events:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch events',
      details: error.message
    });
  }
}));

/**
 * GET /api/events/health
 * Get event tracking system health
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const health = {
      posthog_enabled: eventTrackingService.isPostHogEnabled,
      queued_events: eventTrackingService.eventQueue.length,
      database_connection: true, // Will be false if DB query fails
      last_event_time: null
    };

    // Test database connection
    try {
      const { data: lastEvent } = await eventTrackingService.supabase
        .from('community_events')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastEvent && lastEvent.length > 0) {
        health.last_event_time = lastEvent[0].created_at;
      }
    } catch (error) {
      health.database_connection = false;
      health.database_error = error.message;
    }

    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get event tracking health:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
      details: error.message
    });
  }
}));

// Helper functions for analytics

async function getDailyEventTrends(timeRange) {
  const days = parseInt(timeRange.replace('d', ''));
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      const { data, error } = await eventTrackingService.supabase
        .from('community_events')
        .select('id')
        .gte('created_at', `${dateStr}T00:00:00.000Z`)
        .lt('created_at', `${dateStr}T23:59:59.999Z`);
      
      trends.push({
        date: dateStr,
        event_count: data?.length || 0
      });
    } catch (error) {
      trends.push({
        date: dateStr,
        event_count: 0,
        error: error.message
      });
    }
  }
  
  return trends;
}

async function getPopularFeatures(timeRange) {
  const days = parseInt(timeRange.replace('d', ''));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const { data, error } = await eventTrackingService.supabase
      .from('community_events')
      .select('event_properties')
      .eq('event_name', 'feature_used')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const featureCounts = {};
    data?.forEach(event => {
      const feature = event.event_properties?.feature_name;
      if (feature) {
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      }
    });

    return Object.entries(featureCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([feature, count]) => ({ feature, count }));
  } catch (error) {
    console.warn('⚠️ Failed to get popular features:', error.message);
    return [];
  }
}

async function getUserJourneyInsights(timeRange) {
  // Simplified user journey analysis
  try {
    const { data, error } = await eventTrackingService.supabase
      .from('community_events')
      .select('event_name, user_id, created_at')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (error) throw error;

    const journeys = {};
    data?.forEach(event => {
      if (!journeys[event.user_id]) {
        journeys[event.user_id] = [];
      }
      journeys[event.user_id].push(event.event_name);
    });

    const commonPaths = {};
    Object.values(journeys).forEach(journey => {
      if (journey.length >= 2) {
        const path = journey.slice(0, 3).join(' -> ');
        commonPaths[path] = (commonPaths[path] || 0) + 1;
      }
    });

    return Object.entries(commonPaths)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  } catch (error) {
    console.warn('⚠️ Failed to get user journey insights:', error.message);
    return [];
  }
}

function getMostActiveDays(events) {
  const dayCounts = {};
  
  events.forEach(event => {
    const day = new Date(event.created_at).toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  
  return Object.entries(dayCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([day, count]) => ({ day, count }));
}

function getFeatureUsageStats(events) {
  const featureEvents = events.filter(e => e.event_name === 'feature_used');
  const features = {};
  
  featureEvents.forEach(event => {
    const feature = event.event_properties?.feature_name;
    if (feature) {
      features[feature] = (features[feature] || 0) + 1;
    }
  });
  
  return Object.entries(features)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([feature, count]) => ({ feature, count }));
}

function getUserJourney(events) {
  return events
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(0, 10)
    .map(event => ({
      event: event.event_name,
      timestamp: event.created_at,
      category: event.event_category
    }));
}

export default router;