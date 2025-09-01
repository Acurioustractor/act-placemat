/**
 * Metabase Configuration API
 * Provides endpoints for managing Metabase analytics dashboards
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { 
  apiKeyOrAuth, 
  authorizeDashboard, 
  filterDashboardsByAccess,
  authorizeAnalytics,
  requireAdmin
} from '../middleware/auth.js';
import metabaseConfigService from '../services/metabaseConfigService.js';
import metabaseDashboardService from '../services/metabaseDashboardService.js';

const router = express.Router();

/**
 * GET /api/metabase/health
 * Check Metabase service health and connection status
 */
router.get('/health', asyncHandler(async (req, res) => {
  console.log('🔍 Checking Metabase health status...');
  
  try {
    const health = await metabaseConfigService.checkHealth();
    
    res.json({
      success: true,
      metabase_available: health.success,
      status: health.status || 'unknown',
      service_url: metabaseConfigService.baseUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to check Metabase health:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to check Metabase health',
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/status
 * Get comprehensive Metabase configuration status
 */
router.get('/status', apiKeyOrAuth, authorizeAnalytics('operational'), asyncHandler(async (req, res) => {
  console.log('📊 Getting Metabase configuration status...');
  
  try {
    const status = await metabaseConfigService.getStatus();
    
    res.json({
      success: true,
      metabase_status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get Metabase status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Metabase status',
      details: error.message
    });
  }
}));

/**
 * POST /api/metabase/setup
 * Perform complete Metabase setup and configuration
 */
router.post('/setup', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🚀 Starting Metabase setup...');
  
  try {
    const result = await metabaseConfigService.performCompleteSetup();
    
    res.json({
      success: true,
      message: 'Metabase setup completed successfully',
      setup_result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Metabase setup failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Metabase setup failed',
      details: error.message
    });
  }
}));

/**
 * POST /api/metabase/initialize
 * Initialize Metabase connection without full setup
 */
router.post('/initialize', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('🔧 Initializing Metabase connection...');
  
  try {
    const initialized = await metabaseConfigService.initialize();
    
    res.json({
      success: true,
      initialized,
      message: initialized ? 'Metabase connection initialized' : 'Metabase not available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to initialize Metabase:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Metabase',
      details: error.message
    });
  }
}));

/**
 * POST /api/metabase/databases
 * Add database connection to Metabase
 */
router.post('/databases', requireAdmin, asyncHandler(async (req, res) => {
  const {
    name,
    engine = 'postgres',
    host,
    port = 5432,
    database,
    username,
    password,
    ssl = false
  } = req.body;

  if (!name || !host || !database || !username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required database configuration',
      required_fields: ['name', 'host', 'database', 'username', 'password']
    });
  }

  try {
    console.log(`🗄️ Adding database: ${name}`);
    
    const result = await metabaseConfigService.addDatabase({
      name,
      engine,
      host,
      port,
      database,
      username,
      password,
      ssl
    });

    res.json({
      success: true,
      message: `Database '${name}' added successfully`,
      database: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Failed to add database ${name}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to add database',
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/databases
 * Get all configured databases
 */
router.get('/databases', apiKeyOrAuth, authorizeAnalytics('advanced'), asyncHandler(async (req, res) => {
  console.log('📋 Getting Metabase databases...');
  
  try {
    const databases = await metabaseConfigService.getDatabases();
    
    res.json({
      success: true,
      databases,
      count: databases.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get databases:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get databases',
      details: error.message
    });
  }
}));

/**
 * POST /api/metabase/collections
 * Create a new collection for organizing dashboards
 */
router.post('/collections', requireAdmin, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    color = '#509EE3'
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: name'
    });
  }

  try {
    console.log(`📁 Creating collection: ${name}`);
    
    const result = await metabaseConfigService.createCollection(name, description, color);

    res.json({
      success: true,
      message: `Collection '${name}' created successfully`,
      collection: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Failed to create collection ${name}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create collection',
      details: error.message
    });
  }
}));

/**
 * POST /api/metabase/dashboards
 * Create a new dashboard
 */
router.post('/dashboards', requireAdmin, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    collection_id
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: name'
    });
  }

  try {
    console.log(`📊 Creating dashboard: ${name}`);
    
    const result = await metabaseConfigService.createDashboard(name, description, collection_id);

    res.json({
      success: true,
      message: `Dashboard '${name}' created successfully`,
      dashboard: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Failed to create dashboard ${name}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create dashboard',
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/dashboards
 * Get all dashboards (filtered by user permissions)
 */
router.get('/dashboards', apiKeyOrAuth, authorizeAnalytics('basic'), asyncHandler(async (req, res) => {
  console.log('📊 Getting Metabase dashboards...');
  
  try {
    const allDashboards = await metabaseConfigService.getDashboards();
    const userRole = req.user?.role || 'user';
    
    // Filter dashboards based on user access permissions
    const dashboards = filterDashboardsByAccess(allDashboards, userRole);
    
    res.json({
      success: true,
      dashboards,
      count: dashboards.length,
      user_role: userRole,
      filtered_from: allDashboards.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get dashboards:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboards',
      details: error.message
    });
  }
}));

/**
 * POST /api/metabase/setup/act-defaults
 * Set up default ACT Community configurations
 */
router.post('/setup/act-defaults', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('🏗️ Setting up ACT Community defaults...');
  
  try {
    // Initialize if needed
    await metabaseConfigService.initialize();
    
    // Set up databases
    await metabaseConfigService.setupACTDatabases();
    
    // Set up dashboards using the new dashboard service
    await metabaseDashboardService.initialize();
    
    const status = await metabaseDashboardService.getStatus();

    res.json({
      success: true,
      message: 'ACT Community defaults configured successfully',
      configuration: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to setup ACT defaults:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to setup ACT defaults',
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/config
 * Get current Metabase configuration
 */
router.get('/config', apiKeyOrAuth, asyncHandler(async (req, res) => {
  try {
    const config = {
      metabase_url: metabaseConfigService.baseUrl,
      admin_email: metabaseConfigService.adminEmail,
      setup_completed: metabaseConfigService.setupCompleted,
      session_active: !!metabaseConfigService.sessionToken,
      features: {
        database_connections: true,
        dashboard_creation: true,
        collection_management: true,
        automated_setup: true
      }
    };

    res.json({
      success: true,
      configuration: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get configuration:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/embed/:dashboardId
 * Get embed URL for a dashboard (with access control)
 */
router.get('/embed/:dashboardId', apiKeyOrAuth, authorizeDashboard, asyncHandler(async (req, res) => {
  const { dashboardId } = req.params;
  const { 
    width = '100%', 
    height = '600px',
    theme = 'light',
    bordered = false,
    titled = true
  } = req.query;

  try {
    const embedConfig = metabaseDashboardService.getEmbedConfig(dashboardId, {
      theme,
      bordered: bordered === 'true',
      titled: titled === 'true',
      width,
      height
    });
    
    res.json({
      success: true,
      embed_config: embedConfig,
      dashboard_id: dashboardId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to generate embed config:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate embed config',
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/act/dashboards
 * Get all ACT Community dashboards (filtered by user permissions)
 */
router.get('/act/dashboards', apiKeyOrAuth, authorizeAnalytics('basic'), asyncHandler(async (req, res) => {
  try {
    const allDashboards = metabaseDashboardService.getAvailableDashboards();
    const userRole = req.user?.role || 'user';
    
    // Filter dashboards based on user access permissions
    const dashboards = filterDashboardsByAccess(allDashboards, userRole);
    
    res.json({
      success: true,
      dashboards,
      count: dashboards.length,
      user_role: userRole,
      filtered_from: allDashboards.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get ACT dashboards:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get ACT dashboards',
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/act/dashboard/:name
 * Get specific ACT Community dashboard configuration (with access control)
 */
router.get('/act/dashboard/:name', apiKeyOrAuth, authorizeDashboard, asyncHandler(async (req, res) => {
  const { name } = req.params;
  
  try {
    const dashboardConfig = metabaseDashboardService.getDashboardConfig(name);
    
    res.json({
      success: true,
      dashboard: dashboardConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Failed to get dashboard ${name}:`, error.message);
    res.status(404).json({
      success: false,
      error: `Dashboard not found: ${name}`,
      details: error.message
    });
  }
}));

/**
 * GET /api/metabase/act/status
 * Get ACT Community dashboard service status
 */
router.get('/act/status', apiKeyOrAuth, authorizeAnalytics('advanced'), asyncHandler(async (req, res) => {
  try {
    const status = await metabaseDashboardService.getStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get dashboard status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard status',
      details: error.message
    });
  }
}));

export default router;