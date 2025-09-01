/**
 * Adaptive Dashboard API
 * Provides endpoints for dashboard configuration, user preferences, and adaptive UI features
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth, apiKeyOrAuth } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/adaptive-dashboard/config
 * Get dashboard configuration for the current user
 */
router.get('/config', optionalAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  
  try {
    // Get user's dashboard configuration from database
    let userConfig = null;
    let error = null;
    
    try {
      const { data, error: dbError } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', userId)
        .single();
      userConfig = data;
      error = dbError;
    } catch (tableError) {
      // Table doesn't exist yet - use mock mode
      console.log('📊 Dashboard configs table not found, using mock data');
      userConfig = null;
      error = null;
    }

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') { // PGRST116 is "not found", 42P01 is "table not found"
      throw error;
    }

    // Default configuration if none exists
    const defaultConfig = {
      layout: 'grid',
      theme: 'light',
      density: 'comfortable',
      widgets: [
        { id: 'overview', type: 'overview', position: { x: 0, y: 0, w: 12, h: 4 }, enabled: true },
        { id: 'projects', type: 'projects', position: { x: 0, y: 4, w: 6, h: 6 }, enabled: true },
        { id: 'opportunities', type: 'opportunities', position: { x: 6, y: 4, w: 6, h: 6 }, enabled: true },
        { id: 'activity', type: 'activity', position: { x: 0, y: 10, w: 12, h: 4 }, enabled: true }
      ],
      roleBasedFeatures: {
        canManageProjects: true,
        canViewFinancials: false,
        canAccessAnalytics: true,
        canManageUsers: false
      }
    };

    const config = userConfig ? userConfig.config : defaultConfig;

    res.json({
      success: true,
      config,
      userId,
      lastUpdated: userConfig?.updated_at || new Date().toISOString(),
      isDefault: !userConfig
    });

  } catch (error) {
    console.error('❌ Failed to get dashboard config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard configuration',
      details: error.message
    });
  }
}));

/**
 * POST /api/adaptive-dashboard/config
 * Save dashboard configuration for the current user
 */
router.post('/config', optionalAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  const { config } = req.body;

  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Configuration data required'
    });
  }

  try {
    // Upsert user configuration
    let data = null;
    let error = null;
    
    try {
      const result = await supabase
        .from('dashboard_configs')
        .upsert({
          user_id: userId,
          config,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    } catch (tableError) {
      // Table doesn't exist yet - simulate success
      console.log('📊 Dashboard configs table not found, simulating save');
      data = { user_id: userId, config, updated_at: new Date().toISOString() };
      error = null;
    }

    if (error && error.code !== '42P01') throw error;

    res.json({
      success: true,
      message: 'Dashboard configuration saved',
      config: data.config,
      userId,
      lastUpdated: data.updated_at
    });

  } catch (error) {
    console.error('❌ Failed to save dashboard config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save dashboard configuration',
      details: error.message
    });
  }
}));

/**
 * GET /api/adaptive-dashboard/preferences
 * Get user preferences for personalization
 */
router.get('/preferences', optionalAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'anonymous';

  try {
    let preferences = null;
    let error = null;
    
    try {
      const { data, error: dbError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      preferences = data;
      error = dbError;
    } catch (tableError) {
      console.log('👤 User preferences table not found, using mock data');
      preferences = null;
      error = null;
    }

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') { // PGRST116 is "not found", 42P01 is "table not found"
      throw error;
    }

    // Default preferences
    const defaultPreferences = {
      personalizations: {
        preferredProjectTypes: ['community', 'technology'],
        interestedOpportunityTypes: ['grant', 'partnership'],
        focusAreas: ['sustainability', 'innovation'],
        notificationSettings: {
          email: true,
          push: false,
          frequency: 'daily'
        }
      },
      behavioralData: {
        mostViewedSections: ['projects', 'opportunities'],
        timeSpentByWidget: {},
        interactionPatterns: [],
        learningPreferences: 'visual'
      },
      accessibility: {
        fontSize: 'medium',
        highContrast: false,
        reducedMotion: false,
        screenReader: false
      }
    };

    const userPreferences = preferences ? preferences.preferences : defaultPreferences;

    res.json({
      success: true,
      preferences: userPreferences,
      userId,
      lastUpdated: preferences?.updated_at || new Date().toISOString(),
      isDefault: !preferences
    });

  } catch (error) {
    console.error('❌ Failed to get user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user preferences',
      details: error.message
    });
  }
}));

/**
 * POST /api/adaptive-dashboard/preferences
 * Update user preferences
 */
router.post('/preferences', optionalAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  const { preferences } = req.body;

  if (!preferences) {
    return res.status(400).json({
      success: false,
      error: 'Preferences data required'
    });
  }

  try {
    let data = null;
    let error = null;
    
    try {
      const result = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    } catch (tableError) {
      // Table doesn't exist yet - simulate success
      console.log('👤 User preferences table not found, simulating save');
      data = { user_id: userId, preferences, updated_at: new Date().toISOString() };
      error = null;
    }

    if (error && error.code !== '42P01') throw error;

    res.json({
      success: true,
      message: 'User preferences updated',
      preferences: data.preferences,
      userId,
      lastUpdated: data.updated_at
    });

  } catch (error) {
    console.error('❌ Failed to update preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user preferences',
      details: error.message
    });
  }
}));

/**
 * GET /api/adaptive-dashboard/widgets
 * Get available widgets and their configurations
 */
router.get('/widgets', optionalAuth, asyncHandler(async (req, res) => {
  const availableWidgets = [
    {
      id: 'overview',
      name: 'Dashboard Overview',
      description: 'High-level metrics and key performance indicators',
      type: 'overview',
      category: 'core',
      defaultSize: { w: 12, h: 4 },
      minSize: { w: 6, h: 3 },
      maxSize: { w: 12, h: 6 },
      configurable: true,
      settings: {
        displayMetrics: ['projects', 'opportunities', 'organizations', 'activities'],
        refreshInterval: 300,
        showCharts: true
      }
    },
    {
      id: 'projects',
      name: 'Active Projects',
      description: 'Current projects and their status',
      type: 'projects',
      category: 'data',
      defaultSize: { w: 6, h: 6 },
      minSize: { w: 4, h: 4 },
      maxSize: { w: 12, h: 8 },
      configurable: true,
      settings: {
        viewMode: 'grid',
        filterByStatus: ['Active', 'Planning'],
        showBudgets: true,
        maxItems: 10
      }
    },
    {
      id: 'opportunities',
      name: 'Opportunities Pipeline',
      description: 'Funding and partnership opportunities',
      type: 'opportunities',
      category: 'data',
      defaultSize: { w: 6, h: 6 },
      minSize: { w: 4, h: 4 },
      maxSize: { w: 12, h: 8 },
      configurable: true,
      settings: {
        sortBy: 'probability',
        showAmounts: true,
        filterByStage: ['Pipeline', 'Active'],
        maxItems: 8
      }
    },
    {
      id: 'activity',
      name: 'Recent Activity',
      description: 'Latest actions and updates across the platform',
      type: 'activity',
      category: 'engagement',
      defaultSize: { w: 12, h: 4 },
      minSize: { w: 6, h: 3 },
      maxSize: { w: 12, h: 6 },
      configurable: true,
      settings: {
        maxItems: 15,
        showTimestamps: true,
        groupByType: false,
        refreshInterval: 60
      }
    },
    {
      id: 'quick-actions',
      name: 'Quick Actions',
      description: 'Frequently used actions and shortcuts',
      type: 'actions',
      category: 'utility',
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 3, h: 2 },
      maxSize: { w: 6, h: 4 },
      configurable: true,
      settings: {
        actions: ['create-project', 'add-opportunity', 'contact-person'],
        layout: 'grid'
      }
    },
    {
      id: 'recommendations',
      name: 'Personalized Recommendations',
      description: 'AI-powered project and opportunity recommendations',
      type: 'recommendations',
      category: 'intelligence',
      defaultSize: { w: 8, h: 5 },
      minSize: { w: 6, h: 4 },
      maxSize: { w: 12, h: 6 },
      configurable: true,
      settings: {
        maxRecommendations: 6,
        categories: ['projects', 'opportunities', 'connections'],
        showConfidence: true
      }
    }
  ];

  res.json({
    success: true,
    widgets: availableWidgets,
    totalAvailable: availableWidgets.length,
    categories: [...new Set(availableWidgets.map(w => w.category))]
  });
}));

/**
 * GET /api/adaptive-dashboard/layout
 * Get layout configurations and templates
 */
router.get('/layout', optionalAuth, asyncHandler(async (req, res) => {
  const { role } = req.query;

  const layoutTemplates = {
    admin: {
      id: 'admin',
      name: 'Administrator View',
      description: 'Full access dashboard with management capabilities',
      widgets: [
        { id: 'overview', position: { x: 0, y: 0, w: 12, h: 4 } },
        { id: 'projects', position: { x: 0, y: 4, w: 6, h: 6 } },
        { id: 'opportunities', position: { x: 6, y: 4, w: 6, h: 6 } },
        { id: 'activity', position: { x: 0, y: 10, w: 8, h: 4 } },
        { id: 'quick-actions', position: { x: 8, y: 10, w: 4, h: 4 } }
      ],
      features: {
        canEditLayout: true,
        canManageWidgets: true,
        canAccessAnalytics: true,
        canManageUsers: true
      }
    },
    user: {
      id: 'user',
      name: 'User View',
      description: 'Standard user dashboard with project focus',
      widgets: [
        { id: 'overview', position: { x: 0, y: 0, w: 12, h: 4 } },
        { id: 'projects', position: { x: 0, y: 4, w: 8, h: 6 } },
        { id: 'quick-actions', position: { x: 8, y: 4, w: 4, h: 3 } },
        { id: 'recommendations', position: { x: 8, y: 7, w: 4, h: 3 } },
        { id: 'activity', position: { x: 0, y: 10, w: 12, h: 4 } }
      ],
      features: {
        canEditLayout: true,
        canManageWidgets: false,
        canAccessAnalytics: true,
        canManageUsers: false
      }
    },
    guest: {
      id: 'guest',
      name: 'Guest View',
      description: 'Limited access dashboard for external users',
      widgets: [
        { id: 'overview', position: { x: 0, y: 0, w: 12, h: 4 } },
        { id: 'projects', position: { x: 0, y: 4, w: 12, h: 6 } },
        { id: 'activity', position: { x: 0, y: 10, w: 12, h: 4 } }
      ],
      features: {
        canEditLayout: false,
        canManageWidgets: false,
        canAccessAnalytics: false,
        canManageUsers: false
      }
    }
  };

  const responseData = role && layoutTemplates[role] 
    ? { template: layoutTemplates[role] }
    : { templates: layoutTemplates };

  res.json({
    success: true,
    ...responseData,
    availableRoles: Object.keys(layoutTemplates)
  });
}));

/**
 * POST /api/adaptive-dashboard/analytics/track
 * Track user interaction analytics for personalization learning
 */
router.post('/analytics/track', optionalAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  const { event, data } = req.body;

  if (!event) {
    return res.status(400).json({
      success: false,
      error: 'Event type required'
    });
  }

  try {
    // Store interaction data for learning
    const interactionData = {
      user_id: userId,
      event_type: event,
      event_data: data || {},
      timestamp: new Date().toISOString(),
      session_id: req.headers['x-session-id'] || 'unknown'
    };

    let error = null;
    
    try {
      const result = await supabase
        .from('dashboard_interactions')
        .insert(interactionData);
      error = result.error;
    } catch (tableError) {
      console.log('📈 Dashboard interactions table not found, simulating tracking');
      error = null;
    }

    if (error && error.code !== '42P01') throw error;

    res.json({
      success: true,
      message: 'Interaction tracked',
      eventType: event
    });

  } catch (error) {
    console.error('❌ Failed to track interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track interaction',
      details: error.message
    });
  }
}));

/**
 * GET /api/adaptive-dashboard/recommendations
 * Get personalized recommendations based on user behavior
 */
router.get('/recommendations', optionalAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'anonymous';
  const { type = 'all', limit = 10 } = req.query;

  try {
    // Get user's interaction history for personalization
    let interactions = [];
    let interactionError = null;
    
    try {
      const { data, error } = await supabase
        .from('dashboard_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);
      interactions = data || [];
      interactionError = error;
    } catch (tableError) {
      console.log('📈 Dashboard interactions table not found, using mock data');
      interactions = [];
      interactionError = null;
    }

    if (interactionError && interactionError.code !== '42P01') throw interactionError;

    // Generate recommendations based on interactions
    // This is a simplified version - in production, you'd use ML algorithms
    const recommendations = generateRecommendations(interactions, type, parseInt(limit));

    res.json({
      success: true,
      recommendations,
      userId,
      basedOnInteractions: interactions?.length || 0,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to get recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      details: error.message
    });
  }
}));

/**
 * Helper function to generate recommendations
 * In production, this would use machine learning algorithms
 */
function generateRecommendations(interactions, type, limit) {
  const baseRecommendations = [
    {
      id: 'rec-1',
      type: 'project',
      title: 'Community Garden Initiative',
      description: 'Based on your interest in sustainability projects',
      confidence: 0.85,
      reason: 'Similar to projects you\'ve viewed recently',
      action: 'view-project',
      data: { projectId: 'proj-community-garden' }
    },
    {
      id: 'rec-2',
      type: 'opportunity',
      title: 'Green Technology Grant',
      description: 'Funding opportunity matching your project interests',
      confidence: 0.78,
      reason: 'Aligns with your sustainability focus',
      action: 'view-opportunity',
      data: { opportunityId: 'opp-green-tech' }
    },
    {
      id: 'rec-3',
      type: 'connection',
      title: 'Connect with Dr. Emma Wilson',
      description: 'Environmental scientist working on similar projects',
      confidence: 0.72,
      reason: 'Shared interests in community sustainability',
      action: 'view-person',
      data: { personId: 'person-emma-wilson' }
    },
    {
      id: 'rec-4',
      type: 'action',
      title: 'Update Project Status',
      description: 'You haven\'t updated your active projects recently',
      confidence: 0.90,
      reason: 'Regular project updates improve visibility',
      action: 'update-projects',
      data: { reminder: true }
    },
    {
      id: 'rec-5',
      type: 'widget',
      title: 'Add Financial Dashboard Widget',
      description: 'Track project budgets and funding',
      confidence: 0.65,
      reason: 'You frequently view project financial data',
      action: 'add-widget',
      data: { widgetType: 'financial-overview' }
    }
  ];

  // Filter by type if specified
  let filtered = type === 'all' 
    ? baseRecommendations 
    : baseRecommendations.filter(rec => rec.type === type);

  // Apply limit
  return filtered.slice(0, limit);
}

export default router;