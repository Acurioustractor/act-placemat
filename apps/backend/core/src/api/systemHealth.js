/**
 * System Health API
 * Provides real-time visibility into data source connections
 */

import express from 'express';
const router = express.Router();

// Service health checks
router.get('/system/health', async (req, res) => {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {},
    dataQuality: {},
    configuration: {},
    recommendations: []
  };

  // Check Notion configuration
  const notionConfigured = !!(
    process.env.NOTION_TOKEN ||
    process.env.NOTION_OAUTH_TOKEN
  );

  const notionDatabasesConfigured = !!(
    process.env.NOTION_PROJECTS_DATABASE_ID &&
    process.env.NOTION_PARTNERS_DATABASE_ID &&
    process.env.NOTION_OPPORTUNITIES_DATABASE_ID
  );

  healthStatus.services.notion = {
    status: notionConfigured && notionDatabasesConfigured ? 'connected' : 'fallback',
    configured: notionConfigured,
    databasesConfigured: notionDatabasesConfigured,
    details: {
      hasToken: !!process.env.NOTION_TOKEN,
      hasOAuthToken: !!process.env.NOTION_OAUTH_TOKEN,
      projectsDb: !!process.env.NOTION_PROJECTS_DATABASE_ID,
      partnersDb: !!process.env.NOTION_PARTNERS_DATABASE_ID,
      opportunitiesDb: !!process.env.NOTION_OPPORTUNITIES_DATABASE_ID,
      organizationsDb: !!process.env.NOTION_ORGANIZATIONS_DATABASE_ID,
      activitiesDb: !!process.env.NOTION_ACTIVITIES_DATABASE_ID
    }
  };

  // Check Supabase configuration
  const supabaseConfigured = !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  healthStatus.services.supabase = {
    status: supabaseConfigured ? 'connected' : 'not_configured',
    configured: supabaseConfigured,
    url: process.env.SUPABASE_URL ? 'configured' : 'missing'
  };

  // Check Xero configuration
  const xeroConfigured = !!(
    process.env.XERO_CLIENT_ID &&
    process.env.XERO_CLIENT_SECRET
  );

  healthStatus.services.xero = {
    status: xeroConfigured ? 'configured' : 'not_configured',
    configured: xeroConfigured,
    hasClientId: !!process.env.XERO_CLIENT_ID,
    hasClientSecret: !!process.env.XERO_CLIENT_SECRET,
    redirectUri: process.env.XERO_REDIRECT_URI || 'not set'
  };

  // Check Redis
  healthStatus.services.redis = {
    status: process.env.REDIS_URL ? 'configured' : 'not_configured',
    url: process.env.REDIS_URL ? 'configured' : 'missing'
  };

  // Data quality assessment
  healthStatus.dataQuality = {
    projects: notionConfigured && notionDatabasesConfigured ? 'real' : 'fallback',
    contacts: supabaseConfigured ? 'real' : 'fallback',
    finance: xeroConfigured ? 'configurable' : 'mock',
    stories: supabaseConfigured ? 'real' : 'fallback'
  };

  // Configuration completeness
  let configuredCount = 0;
  let totalCount = 0;

  Object.values(healthStatus.services).forEach(service => {
    totalCount++;
    if (service.configured) configuredCount++;
  });

  healthStatus.configuration = {
    completeness: Math.round((configuredCount / totalCount) * 100),
    configured: configuredCount,
    total: totalCount
  };

  // Recommendations
  if (!notionConfigured) {
    healthStatus.recommendations.push({
      priority: 'high',
      service: 'notion',
      action: 'Add NOTION_TOKEN to your .env file',
      impact: 'Projects, opportunities, and dashboard will show real data instead of fallback'
    });
  }

  if (!notionDatabasesConfigured) {
    healthStatus.recommendations.push({
      priority: 'high',
      service: 'notion',
      action: 'Add Notion database IDs to your .env file',
      impact: 'Enable access to your actual Notion databases'
    });
  }

  if (!supabaseConfigured) {
    healthStatus.recommendations.push({
      priority: 'medium',
      service: 'supabase',
      action: 'Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      impact: 'Enable contact intelligence and story features'
    });
  }

  if (!xeroConfigured) {
    healthStatus.recommendations.push({
      priority: 'low',
      service: 'xero',
      action: 'Configure Xero OAuth credentials',
      impact: 'Enable real financial data integration'
    });
  }

  // Overall health score
  healthStatus.overallHealth = {
    score: healthStatus.configuration.completeness,
    status: healthStatus.configuration.completeness >= 75 ? 'healthy' :
            healthStatus.configuration.completeness >= 50 ? 'degraded' : 'critical',
    message: healthStatus.configuration.completeness === 100 ?
      'All services configured and connected' :
      `${configuredCount} of ${totalCount} services configured. Check recommendations below.`
  };

  res.json(healthStatus);
});

// Test individual service connections
router.get('/system/health/notion', async (req, res) => {
  try {
    const notionService = req.app.get('notionService');
    if (!notionService || !notionService.notion) {
      return res.json({
        connected: false,
        reason: 'Notion service not initialized',
        usingFallback: true
      });
    }

    // Try to fetch one project to test connection
    const projects = await notionService.getProjects({
      useCache: false,
      pageSize: 1,
      getAllPages: false,
    });
    const isRealData = projects.length > 0 && !projects[0].id.startsWith('fallback-');

    res.json({
      connected: true,
      usingFallback: !isRealData,
      sampleData: projects[0] || null,
      dataSource: isRealData ? 'notion' : 'fallback'
    });
  } catch (error) {
    res.json({
      connected: false,
      error: error.message,
      usingFallback: true
    });
  }
});

router.get('/system/health/supabase', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    if (!supabase) {
      return res.json({
        connected: false,
        reason: 'Supabase not configured',
        tables: []
      });
    }

    // Try to query a simple table
    const { data, error } = await supabase
      .from('linkedin_contacts')
      .select('id')
      .limit(1);

    res.json({
      connected: !error,
      error: error?.message,
      hasData: data && data.length > 0,
      tables: ['linkedin_contacts', 'stories', 'themes', 'organizations']
    });
  } catch (error) {
    res.json({
      connected: false,
      error: error.message,
      tables: []
    });
  }
});

export default router;
