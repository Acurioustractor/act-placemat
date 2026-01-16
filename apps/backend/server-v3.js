#!/usr/bin/env node

/**
 * ACT Platform Server v3 - World-Class Business Agent & CRM
 * 
 * Unified server with consolidated APIs:
 * - Business Agent v3 (unified intelligence)
 * - CRM System v3 (world-class contact management)
 * - All existing functionality maintained
 */

// Load environment variables
if (process.env.VERCEL !== '1') {
  const dotenv = await import('dotenv');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const envPath = path.resolve(__dirname, '../.env');
  console.log('🔧 Loading .env from:', envPath);
  dotenv.config({ path: envPath });
}

// Diagnostic: Check environment variables
console.log('🔍 Environment variables loaded:');
console.log('  - NOTION_TOKEN:', process.env.NOTION_TOKEN ? '✅ Present' : '❌ Missing');
console.log('  - SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing');
console.log('  - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Present' : '❌ Missing');
console.log('  - ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Present' : '❌ Missing');

import express from 'express';
import cors from 'cors';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Import v3 APIs
import businessAgentRoutes from './core/src/api/v3/businessAgent.js';
import crmSystemRoutes from './core/src/api/v3/crmSystem.js';

// Import existing APIs (maintain backward compatibility)
import notionService from './core/src/services/notionService.js';
import gmailService from './core/src/services/gmailService.js';
import financialWebhooksRouter from './core/src/api/events/financialWebhooks.js';
import integrationMonitoringRoutes from './core/src/api/integrationMonitoring.js';
import gmailIntelligenceSyncRoutes from './core/src/api/gmailIntelligenceSync.js';
import xeroIntelligenceSyncRoutes from './core/src/api/xeroIntelligenceSync.js';
import unifiedBusinessIntelligenceRoutes from './core/src/api/unifiedBusinessIntelligence.js';
import automationEngineRoutes from './core/src/api/automationEngine.js';
import dashboardAggregationRoutes from './core/src/api/dashboardAggregation.js';
import financialDiscoveryRoutes from './core/src/api/financialDiscovery.js';
import cashFlowIntelligenceRoutes from './core/src/api/cashFlowIntelligence.js';
import aiBusinessAgentRoutes from './core/src/api/aiBusinessAgent.js';
import projectFinancialsRoutes from './core/src/api/projectFinancials.js';
import financialReportsRoutes from './core/src/api/financialReports.js';
import { setupRealDashboardData } from './core/src/api/real-dashboard-data.js';
import curiousTractorResearchRoutes from './core/src/api/curious-tractor-research.js';
import projectHealthRoutes from './core/src/api/projectHealth.js';
import connectionDiscoveryRoutes from './core/src/api/connectionDiscovery.js';
import contactIntelligenceRoutes from './core/src/api/contact-intelligence.js';
import opportunitiesRoutes from './core/src/api/opportunities.js';
import contactsRoutes from './core/src/api/contacts.js';
import linkedinContactsRouter from './core/src/api/linkedin-contacts.js';
import morningBriefRoutes from './core/src/api/morningBrief.js';
import researchRoutes from './core/src/api/research.js';
import projectActivityRoutes from './core/src/api/projectActivity.js';
import directionIntelligenceRoutes from './core/src/api/directionIntelligence.js';
import projectIntelligenceRoutes from './core/src/api/projectIntelligence.js';
import intelligenceLayerRoutes from './core/src/api/intelligenceLayer.js';
import googleAuthRoutes from './core/src/api/googleAuth.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const primarySupabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const STORY_SUPABASE_URL = process.env.STORY_SUPABASE_URL || SUPABASE_URL;
const STORY_SUPABASE_SERVICE_ROLE_KEY = process.env.STORY_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
const storytellerSupabase =
  STORY_SUPABASE_URL && STORY_SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient(STORY_SUPABASE_URL, STORY_SUPABASE_SERVICE_ROLE_KEY)
    : primarySupabase;

console.log('🚜 ACT PLATFORM SERVER v3');
console.log('==========================');
console.log(`✅ Server: http://localhost:${PORT}`);
console.log(`✅ Notion: ${notionService?.notion ? 'Connected via notionService' : 'Unavailable'}`);
if (notionService?.databases?.projects?.id) {
  console.log(`✅ Notion Projects DB: ${notionService.databases.projects.id}`);
}
if (primarySupabase) {
  console.log('✅ Primary Supabase integration enabled');
} else {
  console.warn('⚠️ Primary Supabase integration disabled (missing credentials)');
}
if (storytellerSupabase) {
  console.log('✅ Storyteller Supabase integration enabled');
} else if (!primarySupabase) {
  console.warn('⚠️ Storyteller Supabase integration disabled (missing credentials)');
}

// =============================================================================
// NEW v3 APIs - World-Class Business Agent & CRM
// =============================================================================

console.log('🚀 Initializing v3 APIs...');

// Business Agent v3 - Unified Intelligence
businessAgentRoutes(app);

// CRM System v3 - World-Class Contact Management
crmSystemRoutes(app);

console.log('✅ v3 APIs initialized successfully');

// =============================================================================
// EXISTING APIs - Maintain Backward Compatibility
// =============================================================================

console.log('🔄 Initializing existing APIs...');

// Financial Automation Webhooks
app.use('/api/events', financialWebhooksRouter);

// Integration Monitoring API
integrationMonitoringRoutes(app);

// Gmail Intelligence Sync API
gmailIntelligenceSyncRoutes(app);

// Xero Intelligence Sync API
xeroIntelligenceSyncRoutes(app);

// Unified Business Intelligence API
unifiedBusinessIntelligenceRoutes(app);

// Automation Engine API
automationEngineRoutes(app);

// Dashboard Aggregation API
dashboardAggregationRoutes(app);

// Financial Discovery API
financialDiscoveryRoutes(app);

// Cash Flow Intelligence API
cashFlowIntelligenceRoutes(app);

// AI Business Agent API (legacy)
aiBusinessAgentRoutes(app);

// Project Financials API
projectFinancialsRoutes(app);

// Financial Reports API
financialReportsRoutes(app);

// Real Dashboard Data
setupRealDashboardData(app);

// Curious Tractor Research API
app.use('/api/curious-tractor', curiousTractorResearchRoutes);

// Project Health Intelligence API
app.use('/api/v2/projects', projectHealthRoutes);

// Connection Discovery API
app.use('/api/v2/connections', connectionDiscoveryRoutes);

// Contact Intelligence API
app.use('/api/contact-intelligence', contactIntelligenceRoutes);

// Opportunities API
opportunitiesRoutes(app);

// Contacts API
contactsRoutes(app);

// LinkedIn Contacts API
app.use('/api/contacts/linkedin', linkedinContactsRouter);

// Morning Brief API
morningBriefRoutes(app);

// Research API
researchRoutes(app);

// Project Activity API
app.use('/api/v2/projects/activity', projectActivityRoutes);

// Direction Intelligence API
directionIntelligenceRoutes(app);

// Project Intelligence API
projectIntelligenceRoutes(app, primarySupabase || storytellerSupabase);
intelligenceLayerRoutes(app, primarySupabase);

// Google OAuth2 Authentication
googleAuthRoutes(app);

// Make services available to routes
app.locals.notionService = notionService;
app.locals.gmailService = gmailService;

console.log('✅ Existing APIs initialized successfully');

// =============================================================================
// CACHING & DATA MANAGEMENT
// =============================================================================

// Proper caching with no spam
let projectsCache = {
  data: [],
  lastFetch: 0,
  isLoading: false
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch projects with proper caching (existing logic maintained)
const fetchNotionProjects = async () => {
  const now = Date.now();
  
  if (projectsCache.data.length > 0 && (now - projectsCache.lastFetch) < CACHE_DURATION) {
    return projectsCache.data;
  }
  
  if (projectsCache.isLoading) {
    return projectsCache.data;
  }
  
  if (!notionService?.notion) {
    console.warn('⚠️ Notion service not initialized');
    return projectsCache.data;
  }

  try {
    projectsCache.isLoading = true;
    console.log('🔍 Fetching projects from Notion service (cached for 5min)…');

    const storytellerClient = storytellerSupabase ?? primarySupabase;

    const [
      notionResult,
      supabaseProjectsResult,
      storytellersResult,
      placesData,
      organizationsData,
      peopleData,
    ] = await Promise.all([
      notionService.getProjects({ useCache: true, getAllPages: true }),
      primarySupabase
        ? primarySupabase
            .from('projects')
            .select('id, name, summary, status, notion_id, notion_project_id, organization_id')
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
      storytellerClient
        ? storytellerClient
            .from('storytellers')
            .select(
              'id, project_id, full_name, bio, expertise_areas, profile_image_url, media_type, created_at, consent_given'
            )
            .eq('consent_given', true)
            .limit(2000)
        : Promise.resolve({ data: [], error: null }),
      notionService.getPlaces(true).catch(err => {
        console.warn('⚠️ Failed to fetch places:', err.message);
        return [];
      }),
      notionService.getOrganizations(true).catch(err => {
        console.warn('⚠️ Failed to fetch organizations:', err.message);
        return [];
      }),
      notionService.getPeople(true).catch(err => {
        console.warn('⚠️ Failed to fetch people:', err.message);
        return [];
      }),
    ]);

    if (supabaseProjectsResult.error) {
      console.warn('⚠️ Primary Supabase projects fetch failed:', supabaseProjectsResult.error.message);
    }

    if (storytellersResult.error) {
      console.warn('⚠️ Storyteller Supabase fetch failed:', storytellersResult.error.message);
    }

    const supabaseProjects = supabaseProjectsResult.data || [];
    const storytellers = (storytellersResult.data || []).filter(
      (storyteller) => storyteller.consent_given !== false
    );

    // Create lookup maps for places, organizations, and people
    const placesMap = new Map();
    (placesData || []).forEach(place => {
      if (place.id) {
        const indigenousName = place.indigenousName || place.displayName || place.name || place.place;
        const westernName = place.westernName;
        if (indigenousName) {
          placesMap.set(place.id, {
            indigenousName,
            westernName,
            displayName: indigenousName,
            map: place.map || null,
            state: place.state || null
          });
        }
      }
    });

    const organizationsMap = new Map();
    (organizationsData || []).forEach(org => {
      if (org.id && org.name) {
        organizationsMap.set(org.id, org.name);
      }
    });

    const peopleMap = new Map();
    (peopleData || []).forEach(person => {
      if (person.id && person.name) {
        peopleMap.set(person.id, person.name);
      }
    });

    console.log(`📍 Loaded ${placesMap.size} places, ${organizationsMap.size} organizations, and ${peopleMap.size} people for relation resolution`);

    const storytellersByProject = new Map();
    storytellers.forEach((storyteller) => {
      if (!storyteller.project_id) return;
      if (!storytellersByProject.has(storyteller.project_id)) {
        storytellersByProject.set(storyteller.project_id, []);
      }
      storytellersByProject.get(storyteller.project_id).push(storyteller);
    });

    const findSupabaseProject = (notionId, notionName) => {
      const shortId = notionId.replace(/-/g, '');

      let match = supabaseProjects.find(
        (project) =>
          project.notion_id === notionId ||
          project.notion_id === shortId ||
          project.notion_project_id === notionId ||
          project.notion_project_id === shortId
      );

      if (!match && notionName) {
        const normalizedNotionName = notionName.trim().toLowerCase();
        match = supabaseProjects.find(
          (project) =>
            project.name &&
            project.name.trim().toLowerCase() === normalizedNotionName
        );

        if (match) {
          console.log(`🔗 Matched Notion project "${notionName}" to Supabase project by name (ID: ${match.id})`);
        }
      }

      return match || null;
    };

    const enrichedProjects = notionResult.map((project) => {
      const supabaseProject = findSupabaseProject(project.id, project.name);
      const supabaseProjectId = supabaseProject?.id || null;
      const projectStorytellers = supabaseProjectId
        ? storytellersByProject.get(supabaseProjectId) || []
        : [];

      const resolvedPlaces = (project.relatedPlaces || [])
        .map(id => placesMap.get(id))
        .filter(place => place);

      const resolvedOrganisations = (project.relatedOrganisations || [])
        .map(id => organizationsMap.get(id))
        .filter(name => name);

      const resolvedPeople = (project.relatedPeople || [])
        .map(id => peopleMap.get(id))
        .filter(name => name);

      return {
        ...project,
        title: project.name || project.title || 'Untitled project',
        supabaseProjectId,
        supabaseProject,
        storytellers: projectStorytellers,
        storytellerCount: projectStorytellers.length,
        relatedPlaces: resolvedPlaces.length > 0 ? resolvedPlaces : project.relatedPlaces,
        relatedOrganisations: resolvedOrganisations.length > 0 ? resolvedOrganisations : project.relatedOrganisations,
        relatedPeople: resolvedPeople.length > 0 ? resolvedPeople : project.relatedPeople,
      };
    });

    const matchedSupabaseIds = new Set(
      enrichedProjects.map((project) => project.supabaseProjectId).filter(Boolean)
    );

    const supplementaryProjects = supabaseProjects
      .filter((project) => !matchedSupabaseIds.has(project.id))
      .map((project) => {
        const storytellersForProject = storytellersByProject.get(project.id) || [];
        const fallbackId = project.notion_id || project.notion_project_id || `supabase-${project.id}`;

        return {
          id: fallbackId,
          name: project.name || 'Supabase Project',
          title: project.name || 'Supabase Project',
          status: project.status || 'Supabase',
          aiSummary: project.summary || 'Supabase project awaiting Notion sync.',
          description: project.summary || null,
          supabaseProjectId: project.id,
          supabaseProject: project,
          storytellers: storytellersForProject,
          storytellerCount: storytellersForProject.length,
          coverImage: null,
          notionUrl: null,
          source: 'supabase-only',
        };
      });

    const combinedProjects = [...enrichedProjects, ...supplementaryProjects];

    projectsCache.data = combinedProjects;
    projectsCache.lastFetch = now;
    console.log(`✅ Loaded ${combinedProjects.length} projects (next fetch in 5min)`);
    return combinedProjects;
  } catch (error) {
    console.error('❌ Project fetch error:', error.message);
    return projectsCache.data;
  } finally {
    projectsCache.isLoading = false;
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

// =============================================================================
// CORE API ROUTES (Existing)
// =============================================================================

// Health check
app.get('/api/real/health', (req, res) => {
  const health = getSystemHealth();
  res.json({
    status: 'healthy',
    service: 'ACT Platform Server v3',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    notion: Boolean(notionService?.notion),
    projects: projectsCache.data.length,
    cacheAge: health.cacheAge,
    features: {
      businessAgent: true,
      crmSystem: true,
      aiIntelligence: true,
      australianCompliance: true
    }
  });
});

app.get('/api/health', (req, res) => {
  const health = getSystemHealth();
  res.json({
    status: 'healthy',
    service: 'ACT Platform Server v3',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptime: health.uptime,
    memoryUsage: health.memoryUsage,
    cacheAge: health.cacheAge,
    notion: Boolean(notionService?.notion),
    supabase: Boolean(primarySupabase),
    projectCacheSize: projectsCache.data.length,
    newFeatures: {
      businessAgentV3: 'World-class unified intelligence',
      crmSystemV3: 'AI-powered contact management',
      australianCompliance: 'BAS, PAYG, R&D tracking',
      grantDiscovery: 'Automated opportunity detection'
    }
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

// Add storyteller to project
app.post('/api/real/projects/:projectId/storytellers', async (req, res) => {
  const storytellerClient = storytellerSupabase ?? primarySupabase;
  if (!storytellerClient || !primarySupabase) {
    return res.status(503).json({
      error: 'Storyteller integration is not configured',
    });
  }

  try {
    const { projectId } = req.params;
    const {
      fullName,
      bio = null,
      consentGranted = false,
      expertiseAreas = [],
      profileImageUrl = null,
      mediaType = null,
    } = req.body || {};

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'fullName is required' });
    }

    const normalizedIds = Array.from(
      new Set(
        [projectId, projectId?.replace(/-/g, '')].filter((value) => typeof value === 'string' && value.length > 0)
      )
    );

    if (normalizedIds.length === 0) {
      return res.status(400).json({ error: 'Invalid project identifier' });
    }

    const supabaseIdMatch =
      typeof projectId === 'string' && projectId.startsWith('supabase-')
        ? projectId.replace('supabase-', '')
        : null;

    let projectRows;

    if (supabaseIdMatch) {
      const { data, error } = await primarySupabase
        .from('projects')
        .select('id, name, notion_id, notion_project_id')
        .eq('id', supabaseIdMatch)
        .limit(1);
      if (error) throw error;
      projectRows = data;
    } else {
      const projectFilter = normalizedIds
        .map((id) => `notion_id.eq.${id}`)
        .concat(normalizedIds.map((id) => `notion_project_id.eq.${id}`))
        .join(',');

      const { data, error } = await primarySupabase
        .from('projects')
        .select('id, name, notion_id, notion_project_id')
        .or(projectFilter)
        .limit(1);
      if (error) throw error;
      projectRows = data;
    }

    if (!projectRows || projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found in Supabase' });
    }

    const projectRecord = projectRows[0];

    const normalizedExpertise = Array.isArray(expertiseAreas)
      ? expertiseAreas.map((value) => (typeof value === 'string' ? value.trim() : value)).filter(Boolean)
      : typeof expertiseAreas === 'string'
        ? expertiseAreas.split(',').map((value) => value.trim()).filter(Boolean)
        : [];

    const insertPayload = {
      full_name: fullName.trim(),
      bio: bio || null,
      consent_given: Boolean(consentGranted),
      expertise_areas: normalizedExpertise,
      profile_image_url: profileImageUrl || null,
      media_type: mediaType || null,
      project_id: projectRecord.id,
      notion_id: normalizedIds[0],
    };

    const { data: insertedStoryteller, error: insertError } = await storytellerClient
      .from('storytellers')
      .insert(insertPayload)
      .select(
        'id, project_id, full_name, bio, expertise_areas, profile_image_url, media_type, created_at, consent_given'
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    // Invalidate cache
    projectsCache.data = [];
    projectsCache.lastFetch = 0;

    res.status(201).json({
      success: true,
      storyteller: insertedStoryteller,
      project: {
        id: projectRecord.id,
        name: projectRecord.name,
        notionId: projectRecord.notion_id || projectRecord.notion_project_id || normalizedIds[0],
      },
    });
  } catch (error) {
    console.error('❌ Failed to add storyteller:', error);
    res.status(500).json({
      error: error.message || 'Failed to add storyteller',
    });
  }
});

// Real metrics
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
        value: notionService?.notion ? 'Connected' : 'No Token',
        change: { value: notionService?.notion ? '✅' : '❌', type: notionService?.notion ? 'positive' : 'negative' },
        status: notionService?.notion ? 'operational' : 'error',
        source: 'connection-status'
      }
    ]
  });
});

// Enhanced intelligence
app.post('/api/real/intelligence', async (req, res) => {
  try {
    const { query } = req.body ?? {};
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';

    if (!normalizedQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const projects = await fetchNotionProjects();
    const health = getSystemHealth();

    let response = '';
    let confidence = 0.95;

    const lowerQuery = normalizedQuery.toLowerCase();

    if (lowerQuery.includes('recent') && lowerQuery.includes('project')) {
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

    } else if (lowerQuery.includes('how many') && lowerQuery.includes('project')) {
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
• Version: v3.0.0 (World-Class Business Agent & CRM)
• Uptime: ${health.uptime}
• Memory: ${health.memoryUsage}
• Projects: ${projects.length} (cached ${health.cacheAge})
• API Calls: Minimized (5min cache)

🔗 **Connections:**
• Notion API: ${notionService?.notion ? '✅ Connected' : '❌ No Token'}
• Supabase: ${primarySupabase ? '✅ Connected' : '❌ No Connection'}
• Data Server: ✅ Stable
• Frontend: ✅ Active

🚀 **New Features:**
• Business Agent v3: Unified intelligence
• CRM System v3: AI-powered contact management
• Australian Compliance: BAS, PAYG, R&D tracking
• Grant Discovery: Automated opportunities`;

    } else {
      response = `🤖 **ACT Intelligence v3 (World-Class)**

I have access to your real business data:
• 📊 ${projects.length} projects from Notion
• 🖥️ Live system metrics
• 💾 Smart caching (no API spam)
• 🤖 Business Agent v3 (unified intelligence)
• 🏢 CRM System v3 (AI-powered contacts)
• 📋 Australian compliance tracking
• 💰 Grant discovery automation

💡 **Try asking:**
• "What's my most recent project?"
• "How many projects do I have?"
• "What's the system status?"
• "Show me my BAS obligations"
• "Find grant opportunities"

Data is cached for 5 minutes to avoid API spam.`;
    }

    res.json({
      success: true,
      response,
      confidence,
      sources: ['notion-cached', 'system-metrics'],
      timestamp: new Date().toISOString(),
      query: normalizedQuery,
      version: '3.0.0'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update project infrastructure data
app.post('/api/projects/:projectId/infrastructure', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { projectType, communityLaborMetrics, storytellingMetrics, grantDependencyMetrics } = req.body;

    console.log(`📊 Updating infrastructure data for project: ${projectId}`);

    const properties = {};

    if (projectType) {
      properties['Project Type'] = {
        select: { name: projectType }
      };
    }

    if (communityLaborMetrics) {
      properties['Community Labor Metrics'] = {
        rich_text: [{
          text: { content: JSON.stringify(communityLaborMetrics) }
        }]
      };
    }

    if (storytellingMetrics) {
      properties['Storytelling Metrics'] = {
        rich_text: [{
          text: { content: JSON.stringify(storytellingMetrics) }
        }]
      };
    }

    if (grantDependencyMetrics) {
      properties['Grant Dependency Metrics'] = {
        rich_text: [{
          text: { content: JSON.stringify(grantDependencyMetrics) }
        }]
      };
    }

    await notionService.updatePage(projectId, properties);

    console.log(`✅ Infrastructure data updated successfully`);

    res.json({
      success: true,
      message: 'Infrastructure data saved to Notion'
    });
  } catch (error) {
    console.error('❌ Failed to update infrastructure data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =============================================================================
// COMPATIBILITY ENDPOINTS (Existing)
// =============================================================================

// Integration status
app.get('/api/integrations/status', (req, res) => {
  res.json({
    success: true,
    integrations: {
      notion: { status: notionService?.notion ? 'connected' : 'unavailable', projects: projectsCache.data.length },
      supabase: { status: primarySupabase ? 'connected' : 'unavailable' },
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
    message: 'Intelligence features available in v3 Business Agent'
  });
});

// Outreach tasks
app.get('/api/intelligence/outreach-tasks', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Outreach system available in v3 CRM'
  });
});

// Project support opportunities
app.get('/api/intelligence/project-support', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Project intelligence available in v3 Business Agent'
  });
});

// Project contact alignment
app.get('/api/project-contact-alignment', (req, res) => {
  res.json({
    success: true,
    alignments: [],
    message: 'Contact alignment available in v3 CRM'
  });
});

// Contact coach
app.get('/api/contact-coach', (req, res) => {
  res.json({
    success: true,
    recommendations: [],
    message: 'Contact coaching available in v3 CRM'
  });
});

// CRM LinkedIn contacts
app.get('/api/crm/linkedin-contacts', (req, res) => {
  res.json({
    success: true,
    contacts: [],
    message: 'LinkedIn contacts available in v3 CRM'
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

// Only start the server if not running in Vercel serverless
if (process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    console.log(`🚀 ACT Platform Server v3 running on port ${PORT}`);
    console.log('');
    console.log('🎯 NEW v3 ENDPOINTS:');
    console.log('   🤖 Business Agent v3:');
    console.log('      POST /api/v3/agent/query           - Universal intelligence query');
    console.log('      GET  /api/v3/agent/monitoring      - Proactive business monitoring');
    console.log('      GET  /api/v3/agent/compliance      - Australian compliance tracking');
    console.log('      GET  /api/v3/agent/grants          - Grant discovery & opportunities');
    console.log('      GET  /api/v3/agent/projects/health - Project health analysis');
    console.log('      GET  /api/v3/agent/relationships   - Relationship intelligence');
    console.log('      POST /api/v3/agent/contacts/:id/enrich - Contact enrichment');
    console.log('');
    console.log('   🏢 CRM System v3:');
    console.log('      GET  /api/v3/crm/contacts          - Search & filter contacts');
    console.log('      GET  /api/v3/crm/contacts/:id      - Contact details');
    console.log('      POST /api/v3/crm/contacts/:id/enrich - AI contact enrichment');
    console.log('      GET  /api/v3/crm/projects/:id/matches - Project contact matching');
    console.log('      GET  /api/v3/crm/projects/:id/supporters - Project supporters');
    console.log('      GET  /api/v3/crm/contacts/:id/network - Network analysis');
    console.log('      GET  /api/v3/crm/contacts/:id/outreach - Outreach strategy');
    console.log('');
    console.log('📊 EXISTING ENDPOINTS:');
    console.log('   GET  /api/real/health               - System health');
    console.log('   GET  /api/real/projects             - Cached projects');
    console.log('   GET  /api/real/metrics              - System metrics');
    console.log('   POST /api/real/intelligence         - Legacy intelligence');
    console.log('   💚  /api/v2/monitoring/integrations - Integration health');
    console.log('   💚  /api/v2/monitoring/health       - System health');
    console.log('   📧  /api/v2/gmail/sync/status       - Gmail sync status');
    console.log('   📧  /api/v2/gmail/sync/start        - Start Gmail sync');
    console.log('   📧  /api/v2/gmail/messages          - Query messages');
    console.log('   📧  /api/v2/gmail/contacts          - Discovered contacts');
    console.log('');
    console.log('🔥 FEATURES:');
    console.log('   ✅ World-Class Business Agent with unified intelligence');
    console.log('   ✅ AI-powered CRM with contact enrichment');
    console.log('   ✅ Australian business compliance tracking');
    console.log('   ✅ Automated grant discovery');
    console.log('   ✅ Project health analysis');
    console.log('   ✅ Relationship intelligence');
    console.log('   ✅ Smart outreach strategies');
    console.log('   ✅ NO SPAM - SMART CACHING');
    console.log('');
    console.log('💚 Integration Health Monitoring: Active');
    console.log('   Real-time status tracking for all data sources');
    console.log('');
    console.log('🎉 ACT PLATFORM v3 - WORLD-CLASS BUSINESS AGENT & CRM READY!');
  });
}

// Export for Vercel serverless
export default app;
