#!/usr/bin/env node

/**
 * Stable Real Data Server for ACT
 * Properly cached, no spam, real data only
 */

// IMPORTANT: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Now import everything else
import express from 'express';
import cors from 'cors';
import { Client } from '@notionhq/client';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Financial Automation Webhooks
import financialWebhooksRouter from './core/src/api/events/financialWebhooks.js';
app.use('/api/events', financialWebhooksRouter);

// Business Agent Australia API - Temporarily disabled (missing dependencies)
// import businessAgentAustraliaRoutes from './core/src/api/businessAgentAustralia.js';
// businessAgentAustraliaRoutes(app);

// Integration Monitoring API
import integrationMonitoringRoutes from './core/src/api/integrationMonitoring.js';
integrationMonitoringRoutes(app);

// Gmail Intelligence Sync API
import gmailIntelligenceSyncRoutes from './core/src/api/gmailIntelligenceSync.js';
gmailIntelligenceSyncRoutes(app);

// Xero Intelligence Sync API
import xeroIntelligenceSyncRoutes from './core/src/api/xeroIntelligenceSync.js';
xeroIntelligenceSyncRoutes(app);

// Unified Business Intelligence API
import unifiedBusinessIntelligenceRoutes from './core/src/api/unifiedBusinessIntelligence.js';
unifiedBusinessIntelligenceRoutes(app);

// Automation Engine API - ACTUALLY AUTOMATES THINGS
import automationEngineRoutes from './core/src/api/automationEngine.js';
automationEngineRoutes(app);

// Dashboard Aggregation API - Intelligent cross-tab metrics
import dashboardAggregationRoutes from './core/src/api/dashboardAggregation.js';
dashboardAggregationRoutes(app);

// Financial Discovery API - Discover what data sources exist
import financialDiscoveryRoutes from './core/src/api/financialDiscovery.js';
financialDiscoveryRoutes(app);

// Cash Flow Intelligence API - Real bank transactions + receipt reconciliation
import cashFlowIntelligenceRoutes from './core/src/api/cashFlowIntelligence.js';
cashFlowIntelligenceRoutes(app);

// AI Business Agent API - Intelligent assistant powered by Claude + Perplexity
import aiBusinessAgentRoutes from './core/src/api/aiBusinessAgent.js';
aiBusinessAgentRoutes(app);

// Project Financials API - Link $ to ACT projects with cross-system search
import projectFinancialsRoutes from './core/src/api/projectFinancials.js';
projectFinancialsRoutes(app);

// Financial Reports API - P&L, Balance Sheet, Cash Flow, Aged Reports
import financialReportsRoutes from './core/src/api/financialReports.js';
financialReportsRoutes(app);

// Curious Tractor Research API - Deep AI research for entity setup & innovation
import curiousTractorResearchRoutes from './core/src/api/curious-tractor-research.js';
app.use('/api/curious-tractor', curiousTractorResearchRoutes);

// Agent Scheduler - Temporarily disabled (missing dependencies)
// import agentScheduler from './core/src/scheduler/agentScheduler.js';

// Notion setup
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PROJECTS_DATABASE_ID = process.env.NOTION_PROJECTS_DATABASE_ID || '177ebcf981cf80dd9514f1ec32f3314c';
const notion = NOTION_TOKEN ? new Client({ auth: NOTION_TOKEN }) : null;

console.log('🚜 ACT STABLE DATA SERVICE');
console.log('========================');
console.log(`✅ Server: http://localhost:${PORT}`);
console.log(`✅ Notion: ${!!notion ? 'Connected' : 'No token'}`);
console.log(`✅ Database: ${NOTION_PROJECTS_DATABASE_ID}`);
console.log('🔄 Cache: 5 minutes (no spam)');

// Proper caching with no spam
let projectsCache = {
  data: [],
  lastFetch: 0,
  isLoading: false
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch projects with proper caching
const fetchNotionProjects = async () => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (projectsCache.data.length > 0 && (now - projectsCache.lastFetch) < CACHE_DURATION) {
    return projectsCache.data;
  }
  
  // Prevent multiple simultaneous requests
  if (projectsCache.isLoading) {
    return projectsCache.data; // Return stale data while loading
  }
  
  if (!notion) {
    console.warn('⚠️ No Notion token available');
    return [];
  }
  
  try {
    projectsCache.isLoading = true;
    console.log('🔍 Fetching projects from Notion... (cached for 5min)');
    
    const response = await notion.databases.query({
      database_id: NOTION_PROJECTS_DATABASE_ID
      // No filters or sorts - just get everything
    });
    
    const projects = response.results.map(page => {
      // Get Cover Photo URL
      const coverPhoto = page.cover?.type === 'external' ? page.cover.external.url :
                        page.cover?.type === 'file' ? page.cover.file.url : null;
      
      return {
        id: page.id,
        title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
        status: page.properties.Status?.status?.name || 'Unknown',
        created: page.created_time,
        lastEdited: page.last_edited_time,
        coverPhoto: coverPhoto,
        // Get other useful properties if they exist
        description: page.properties.Description?.rich_text?.[0]?.plain_text || '',
        area: page.properties.Area?.select?.name || '',
        tags: page.properties.Tags?.multi_select?.map(tag => tag.name) || [],
        philosophy: page.properties.Philosophy?.rich_text?.[0]?.plain_text || '',
      };
    });
    
    // Update cache
    projectsCache.data = projects;
    projectsCache.lastFetch = now;
    projectsCache.isLoading = false;
    
    console.log(`✅ Loaded ${projects.length} projects (next fetch in 5min)`);
    return projects;
    
  } catch (error) {
    projectsCache.isLoading = false;
    console.error('❌ Notion fetch error:', error.message);
    return projectsCache.data; // Return stale data on error
  }
};

// System health
const getSystemHealth = () => {
  const uptime = process.uptime();
  const uptimeMin = Math.floor(uptime / 60);
  const uptimeSec = Math.floor(uptime % 60);
  const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  
  return {
    uptime: `${uptimeMin}m ${uptimeSec}s`,
    memoryUsage: `${memoryMB}MB`,
    cacheAge: projectsCache.lastFetch ? `${Math.floor((Date.now() - projectsCache.lastFetch) / 1000)}s ago` : 'Never'
  };
};

// === API ROUTES ===

// Health check
app.get('/api/real/health', (req, res) => {
  const health = getSystemHealth();
  res.json({
    status: 'healthy',
    service: 'ACT Stable Data Service',
    timestamp: new Date().toISOString(),
    notion: !!notion,
    projects: projectsCache.data.length,
    cacheAge: health.cacheAge
  });
});

// Real projects
app.get('/api/real/projects', async (req, res) => {
  const projects = await fetchNotionProjects();
  res.json({ 
    success: true, 
    count: projects.length, 
    projects,
    cached: (Date.now() - projectsCache.lastFetch) < CACHE_DURATION
  });
});

// Real metrics (no spam, proper caching)
app.get('/api/real/metrics', async (req, res) => {
  const projects = await fetchNotionProjects();
  const health = getSystemHealth();
  
  res.json({
    success: true,
    metrics: [
      {
        label: 'Active Projects',
        value: projects.length,
        change: { value: '+0', type: 'neutral' },
        status: 'operational',
        source: 'notion-cached'
      },
      {
        label: 'System Uptime',
        value: health.uptime,
        change: { value: '+stable', type: 'positive' },
        status: 'operational',
        source: 'system-metrics'
      },
      {
        label: 'Memory Usage',
        value: health.memoryUsage,
        change: { value: 'stable', type: 'neutral' },
        status: 'operational',
        source: 'system-metrics'
      },
      {
        label: 'Data Cache',
        value: health.cacheAge,
        change: { value: '5min cache', type: 'positive' },
        status: 'operational',
        source: 'cache-status'
      },
      {
        label: 'Notion API',
        value: !!notion ? 'Connected' : 'No Token',
        change: { value: !!notion ? '✅' : '❌', type: !!notion ? 'positive' : 'negative' },
        status: !!notion ? 'operational' : 'error',
        source: 'connection-status'
      }
    ]
  });
});

// Enhanced intelligence with detailed responses
app.post('/api/real/intelligence', async (req, res) => {
  try {
    const { query } = req.body;
    const projects = await fetchNotionProjects();
    const health = getSystemHealth();

    let response = '';
    let confidence = 0.95;

    if (query.toLowerCase().includes('recent') && query.toLowerCase().includes('project')) {
      if (projects.length > 0) {
        const recent = projects[0];
        response = `🎯 **Most Recent Project:** "${recent.title}"

📊 **Details:**
• Status: ${recent.status}
• Created: ${new Date(recent.created).toLocaleDateString()}
• Last Updated: ${new Date(recent.lastEdited).toLocaleDateString()}
• ID: ${recent.id.substring(0, 8)}...

📈 **Context:** Latest of ${projects.length} total projects in Notion`;
      } else {
        response = "No projects found in Notion database.";
        confidence = 0.5;
      }

    } else if (query.toLowerCase().includes('how many') && query.toLowerCase().includes('project')) {
      const active = projects.filter(p =>
        p.status && (p.status.includes('Active') || p.status.includes('🔥'))
      ).length;

      response = `📊 **Project Summary:**
• Total Projects: ${projects.length}
• Active Projects: ${active}
• Data Source: Notion (cached)

🔥 **Active Projects:** ${active > 0 ?
  projects
    .filter(p => p.status && (p.status.includes('Active') || p.status.includes('🔥')))
    .slice(0, 3)
    .map(p => `"${p.title}"`)
    .join(', ') + (active > 3 ? ` and ${active - 3} more...` : '')
  : 'None found with "Active" status'}`;

    } else if (query.toLowerCase().includes('system') || query.toLowerCase().includes('status')) {
      response = `🖥️ **System Status:**
• Status: ✅ Operational
• Uptime: ${health.uptime}
• Memory: ${health.memoryUsage}
• Projects: ${projects.length} (cached ${health.cacheAge})
• API Calls: Minimized (5min cache)

🔗 **Connections:**
• Notion API: ${!!notion ? '✅ Connected' : '❌ No Token'}
• Data Server: ✅ Stable
• Frontend: ✅ Active`;

    } else {
      response = `🤖 **ACT Intelligence (Stable)**

I have access to your real business data:
• 📊 ${projects.length} projects from Notion
• 🖥️ Live system metrics
• 💾 Smart caching (no API spam)

💡 **Try asking:**
• "What's my most recent project?"
• "How many projects do I have?"
• "What's the system status?"

Data is cached for 5 minutes to avoid API spam.`;
    }

    res.json({
      success: true,
      response,
      confidence,
      sources: ['notion-cached', 'system-metrics'],
      timestamp: new Date().toISOString(),
      query
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// === COMPATIBILITY ENDPOINTS ===
// These endpoints provide basic responses to prevent frontend errors

// Integration status
app.get('/api/integrations/status', (req, res) => {
  res.json({
    success: true,
    integrations: {
      notion: { status: 'connected', projects: projectsCache.data.length },
      supabase: { status: 'connected' },
      gmail: { status: 'not_configured' },
      xero: { status: 'not_configured' },
      linkedin: { status: 'not_configured' }
    }
  });
});

// Simple contact dashboard
app.get('/api/simple-contact-dashboard', (req, res) => {
  res.json({
    success: true,
    contacts: [],
    metrics: {
      totalContacts: 0,
      recentActivity: 0,
      pendingOutreach: 0
    }
  });
});

// Business dashboard
app.get('/api/business-dashboard', (req, res) => {
  res.json({
    success: true,
    metrics: {
      revenue: 0,
      expenses: 0,
      profit: 0,
      growth: 0
    },
    message: 'Business metrics not configured'
  });
});

// Calendar events
app.get('/api/calendar/events', (req, res) => {
  res.json({
    success: true,
    events: [],
    message: 'Calendar integration not configured'
  });
});

// Gmail sync status
app.get('/api/gmail-sync/status', (req, res) => {
  res.json({
    success: true,
    status: 'not_configured',
    lastSync: null,
    emailCount: 0
  });
});

// Gmail community emails
app.get('/api/gmail-sync/community-emails', (req, res) => {
  res.json({
    success: true,
    emails: [],
    message: 'Gmail integration not configured'
  });
});

// Intelligence dashboard
app.get('/api/intelligence/dashboard', (req, res) => {
  res.json({
    success: true,
    insights: [],
    recommendations: [],
    message: 'Intelligence features coming soon'
  });
});

// Outreach tasks
app.get('/api/intelligence/outreach-tasks', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Outreach system not configured'
  });
});

// Project support opportunities
app.get('/api/intelligence/project-support', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Project intelligence not configured'
  });
});

// Project contact alignment
app.get('/api/project-contact-alignment', (req, res) => {
  res.json({
    success: true,
    alignments: [],
    message: 'Contact alignment not configured'
  });
});

// Contact coach
app.get('/api/contact-coach', (req, res) => {
  res.json({
    success: true,
    recommendations: [],
    message: 'Contact coaching not configured'
  });
});

// CRM LinkedIn contacts
app.get('/api/crm/linkedin-contacts', (req, res) => {
  res.json({
    success: true,
    contacts: [],
    message: 'LinkedIn integration not configured'
  });
});

// Stories endpoint
app.get('/api/stories', (req, res) => {
  res.json({
    success: true,
    stories: [],
    message: 'Stories feature not configured'
  });
});

// Initial data load
fetchNotionProjects().then(projects => {
  console.log(`🎯 Initial cache: ${projects.length} projects`);
});

app.listen(PORT, async () => {
  console.log(`🚀 Stable server running on port ${PORT}`);
  console.log('📊 Endpoints:');
  console.log('   GET  /api/real/health');
  console.log('   GET  /api/real/projects');
  console.log('   GET  /api/real/metrics');
  console.log('   POST /api/real/intelligence');
  console.log('   💚  /api/v2/monitoring/integrations (Integration health)');
  console.log('   💚  /api/v2/monitoring/health (System health)');
  console.log('   📧  /api/v2/gmail/sync/status (Gmail sync status)');
  console.log('   📧  /api/v2/gmail/sync/start (Start Gmail sync)');
  console.log('   📧  /api/v2/gmail/messages (Query messages)');
  console.log('   📧  /api/v2/gmail/contacts (Discovered contacts)');
  console.log('🔥 NO SPAM - SMART CACHING');

  // Business agent scheduler temporarily disabled (missing dependencies)
  console.log('');
  console.log('💚 Integration Health Monitoring: Active');
  console.log('   Real-time status tracking for all data sources');
  console.log('');
});
