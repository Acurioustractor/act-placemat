#!/usr/bin/env node

/**
 * Stable Real Data Server for ACT
 * Properly cached, no spam, real data only
 */

// IMPORTANT: Load environment variables FIRST before any other imports
// On Vercel, environment variables are provided automatically via process.env
// Only load dotenv in local development
if (process.env.VERCEL !== '1') {
  const dotenv = await import('dotenv');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const envPath = path.resolve(__dirname, '../../.env');
  console.log('🔧 Loading .env from:', envPath);
  dotenv.config({ path: envPath });
}

// Diagnostic: Check if critical environment variables are loaded
console.log('🔍 Environment variables loaded:');
console.log('  - NOTION_TOKEN:', process.env.NOTION_TOKEN ? '✅ Present' : '❌ Missing');
console.log('  - SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing');
console.log('  - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Present' : '❌ Missing');

// Now import everything else
import express from 'express';
import cors from 'cors';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import notionService from './core/src/services/notionService.js';
import gmailService from './core/src/services/gmailService.js';
import xeroTokenManager from './core/src/services/xeroTokenManager.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// =============================================
// API v1 - Standardized Routes (NEW)
// =============================================
import v1Router from './core/src/api/v1/index.js';
app.use('/api/v1', v1Router);

// Subscription Tracker API - AI-powered subscription discovery (V1)
import subscriptionTrackerRoutes from './subscription-tracker/routes/v1/subscriptions.js';
app.use('/api/v1/subscriptions', subscriptionTrackerRoutes);

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

// Xero OAuth Authentication
import xeroAuthRouter from './core/src/api/xeroAuth.js';
app.use('/api/xero', xeroAuthRouter);

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

import { setupRealDashboardData } from './core/src/api/real-dashboard-data.js';
setupRealDashboardData(app);

// Curious Tractor Research API - Deep AI research for entity setup & innovation
import curiousTractorResearchRoutes from './core/src/api/curious-tractor-research.js';
app.use('/api/curious-tractor', curiousTractorResearchRoutes);

// Media Management API - Photos, videos, galleries with Supabase storage
import mediaRoutes from './core/src/api/media.js';
app.use('/api/media', mediaRoutes);

// Project Health Intelligence API - Phase 1: Surface Important Needs
import projectHealthRoutes from './core/src/api/projectHealth.js';

// Connection Discovery API - Auto-discover project connections via Gmail + AI
import connectionDiscoveryRoutes from './core/src/api/connectionDiscovery.js';

// Contact Intelligence API - Strategic contact management & tier assignment
import contactIntelligenceRoutes from './core/src/api/contact-intelligence.js';

// Opportunities API - Grant discovery & application tracking
import opportunitiesRoutes from './core/src/api/opportunities.js';
opportunitiesRoutes(app);

// Contacts API - LinkedIn contact intelligence
import contactsRoutes from './core/src/api/contacts.js';
contactsRoutes(app);

// LinkedIn Contacts API - Properly imported CSV connections (4,459 contacts)
import linkedinContactsRouter from './core/src/api/linkedin-contacts.js';
app.use('/api/contacts/linkedin', linkedinContactsRouter);

// Morning Brief API - Daily intelligence digest
import morningBriefRoutes from './core/src/api/morningBrief.js';
morningBriefRoutes(app);

// Research API - Curious Tractor + Tavily integration
import researchRoutes from './core/src/api/research.js';
researchRoutes(app);

// Project Activity API
import projectActivityRoutes from './core/src/api/projectActivity.js';
app.use('/api/v2/projects/activity', projectActivityRoutes);

// Direction scorecard + workflows
import directionIntelligenceRoutes from './core/src/api/directionIntelligence.js';
directionIntelligenceRoutes(app);

// Project Intelligence API - Gmail, Calendar, Contacts integration
import projectIntelligenceRoutes from './core/src/api/projectIntelligence.js';
import intelligenceLayerRoutes from './core/src/api/intelligenceLayer.js';

// Google OAuth2 Authentication - Gmail & Calendar
import googleAuthRoutes from './core/src/api/googleAuth.js';
googleAuthRoutes(app);

// Year in Review API - 2025 annual review page
import yearInReviewRoutes, { initYearInReviewService } from './core/src/api/yearInReview.js';
import reviewProjectsRoutes from './core/src/api/reviewProjects.js';
import reviewMediaRoutes from './core/src/api/reviewMedia.js';
import contentGenerationRoutes from './core/src/api/contentGeneration.js';

// Agent Scheduler - Temporarily disabled (missing dependencies)
// import agentScheduler from './core/src/scheduler/agentScheduler.js';

// Supabase configuration - use same database for both primary and storyteller
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create primary Supabase client
const primarySupabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Use same Supabase instance for storyteller data (unless separate credentials provided)
const STORY_SUPABASE_URL = process.env.STORY_SUPABASE_URL || SUPABASE_URL;
const STORY_SUPABASE_SERVICE_ROLE_KEY = process.env.STORY_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
const storytellerSupabase =
  STORY_SUPABASE_URL && STORY_SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient(STORY_SUPABASE_URL, STORY_SUPABASE_SERVICE_ROLE_KEY)
    : primarySupabase; // Fallback to primary if no separate storyteller credentials

console.log('🚜 ACT STABLE DATA SERVICE');
console.log('========================');
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
console.log('🔄 Cache: 5 minutes (no spam)');

// Initialize Project Intelligence Routes (needs Supabase client)
projectIntelligenceRoutes(app, primarySupabase || storytellerSupabase);
intelligenceLayerRoutes(app, primarySupabase);

// Make notionService and gmailService available to routes
app.locals.notionService = notionService;
app.locals.gmailService = gmailService;

// Initialize Gmail service with stored tokens for Year in Review
try {
  const fs = await import('fs');
  const path = await import('path');
  const tokenPath = path.default.join(process.cwd(), '.gmail_tokens.json');
  if (fs.default.existsSync(tokenPath)) {
    const tokens = JSON.parse(fs.default.readFileSync(tokenPath, 'utf8'));
    if (tokens.access_token && tokens.refresh_token) {
      await gmailService.authenticate(tokens.access_token, tokens.refresh_token);
      console.log('✅ Gmail service authenticated for Year in Review');
    }
  }
} catch (gmailInitError) {
  console.log('⚠️ Gmail service not authenticated:', gmailInitError.message);
}

// Initialize and mount Year in Review API
initYearInReviewService(notionService, gmailService);
app.use('/api/year-in-review', yearInReviewRoutes);
app.use('/api/year-in-review', reviewProjectsRoutes);
app.use('/api/year-in-review', reviewMediaRoutes);
app.use('/api/content-generation', contentGenerationRoutes);

// Timeline Generator API
import timelineGeneratorRoutes from './core/src/api/timelineGenerator.js';
app.use('/api/timeline-generator', timelineGeneratorRoutes);

// Public Forms API (questions, newsletter)
import publicFormsRoutes from './core/src/api/publicForms.js';
app.use('/api/messages', publicFormsRoutes);
app.use('/api/newsletter', publicFormsRoutes);

// Mount Project Health Intelligence API
app.use('/api/v2/projects', projectHealthRoutes);

// =============================================
// Google Calendar API Endpoints
// =============================================
import googleCalendarService from './core/src/services/googleCalendarService.js';

// GET /api/calendar/events - Query calendar events
app.get('/api/calendar/events', async (req, res) => {
  try {
    const {
      days = 30,
      startDate,
      endDate,
      maxResults = 100,
      q // search query
    } = req.query;

    const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
    const timeMax = endDate
      ? new Date(endDate).toISOString()
      : new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000).toISOString();

    const result = await googleCalendarService.getEventsWithProjectOverlay({
      timeMin,
      timeMax,
      maxResults: parseInt(maxResults),
      q
    });

    const eventList = result?.events || [];
    res.json({
      success: true,
      count: eventList.length,
      timeRange: { from: timeMin, to: timeMax },
      events: eventList
    });
  } catch (error) {
    console.error('Calendar query error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Calendar may need re-authentication. Visit /api/google/auth'
    });
  }
});

// GET /api/calendar/year/:year - Get all events for a specific year
app.get('/api/calendar/year/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const timeMin = new Date(`${year}-01-01T00:00:00Z`).toISOString();
    const timeMax = new Date(`${year}-12-31T23:59:59Z`).toISOString();

    const result = await googleCalendarService.getEventsWithProjectOverlay({
      timeMin,
      timeMax,
      maxResults: 500
    });

    const eventList = result?.events || [];
    res.json({
      success: true,
      year,
      count: eventList.length,
      events: eventList
    });
  } catch (error) {
    console.error('Calendar year query error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('📅 Calendar API endpoints registered');

// Mount Connection Discovery API
app.use('/api/v2/connections', connectionDiscoveryRoutes);

// Mount Contact Intelligence API
app.use('/api/contact-intelligence', contactIntelligenceRoutes);

// Enriched Contacts API - Exa.ai powered contact enrichment
import enrichedContactsRouter from './routes/enriched-contacts.js';
app.use('/api/enriched-contacts', enrichedContactsRouter);

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
        // Store the full place object with both Indigenous and Western names, coordinates, and state
        const indigenousName = place.indigenousName || place.displayName || place.name || place.place;
        const westernName = place.westernName;
        if (indigenousName) {
          placesMap.set(place.id, {
            indigenousName,
            westernName,
            displayName: indigenousName, // Primary display is Indigenous name
            map: place.map || null, // Coordinates from Notion
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

      // First try to match by Notion ID
      let match = supabaseProjects.find(
        (project) =>
          project.notion_id === notionId ||
          project.notion_id === shortId ||
          project.notion_project_id === notionId ||
          project.notion_project_id === shortId
      );

      // If no ID match, try to match by name (case-insensitive, trimmed)
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

      // Resolve place IDs to place objects with both Indigenous and Western names
      const resolvedPlaces = (project.relatedPlaces || [])
        .map(id => placesMap.get(id))
        .filter(place => place);

      // Resolve organization IDs to names
      const resolvedOrganisations = (project.relatedOrganisations || [])
        .map(id => organizationsMap.get(id))
        .filter(name => name);

      // Resolve people IDs to names
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
        // Override the ID arrays with resolved names
        relatedPlaces: resolvedPlaces.length > 0 ? resolvedPlaces : project.relatedPlaces,
        relatedOrganisations: resolvedOrganisations.length > 0 ? resolvedOrganisations : project.relatedOrganisations,
        relatedPeople: resolvedPeople.length > 0 ? resolvedPeople : project.relatedPeople,
      };
    });

    // Include Supabase-only projects (without Notion counterparts)
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

// === API ROUTES ===

// Health check
app.get('/api/real/health', (req, res) => {
  const health = getSystemHealth();
  res.json({
    status: 'healthy',
    service: 'ACT Stable Data Service',
    timestamp: new Date().toISOString(),
    notion: Boolean(notionService?.notion),
    projects: projectsCache.data.length,
    cacheAge: health.cacheAge
  });
});

app.get('/api/health', (req, res) => {
  const health = getSystemHealth();
  res.json({
    status: 'healthy',
    service: 'ACT Stable Data Service',
    timestamp: new Date().toISOString(),
    uptime: health.uptime,
    memoryUsage: health.memoryUsage,
    cacheAge: health.cacheAge,
    notion: Boolean(notionService?.notion),
    supabase: Boolean(primarySupabase),
    projectCacheSize: projectsCache.data.length
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

    // Invalidate cache so next fetch returns fresh storyteller data
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
        value: notionService?.notion ? 'Connected' : 'No Token',
        change: { value: notionService?.notion ? '✅' : '❌', type: notionService?.notion ? 'positive' : 'negative' },
        status: notionService?.notion ? 'operational' : 'error',
        source: 'connection-status'
      }
    ]
  });
});

// Enhanced intelligence with detailed responses
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
• Uptime: ${health.uptime}
• Memory: ${health.memoryUsage}
• Projects: ${projects.length} (cached ${health.cacheAge})
• API Calls: Minimized (5min cache)

🔗 **Connections:**
• Notion API: ${notionService?.notion ? '✅ Connected' : '❌ No Token'}
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
      query: normalizedQuery
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

// Update project infrastructure data
app.post('/api/projects/:projectId/infrastructure', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { projectType, communityLaborMetrics, storytellingMetrics, grantDependencyMetrics } = req.body;

    console.log(`📊 Updating infrastructure data for project: ${projectId}`);

    const properties = {};

    // Project Type - use select field
    if (projectType) {
      properties['Project Type'] = {
        select: { name: projectType }
      };
    }

    // Community Labor Metrics - store as JSON in rich_text
    if (communityLaborMetrics) {
      properties['Community Labor Metrics'] = {
        rich_text: [{
          text: { content: JSON.stringify(communityLaborMetrics) }
        }]
      };
    }

    // Storytelling Metrics - store as JSON in rich_text
    if (storytellingMetrics) {
      properties['Storytelling Metrics'] = {
        rich_text: [{
          text: { content: JSON.stringify(storytellingMetrics) }
        }]
      };
    }

    // Grant Dependency Metrics - store as JSON in rich_text
    if (grantDependencyMetrics) {
      properties['Grant Dependency Metrics'] = {
        rich_text: [{
          text: { content: JSON.stringify(grantDependencyMetrics) }
        }]
      };
    }

    // Update in Notion
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

// Initial data load
fetchNotionProjects().then(projects => {
  console.log(`🎯 Initial cache: ${projects.length} projects`);
});

// Only start the server if not running in Vercel serverless
if (process.env.VERCEL !== '1') {
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

    // Start Xero auto token refresh
    if (process.env.XERO_REFRESH_TOKEN) {
      xeroTokenManager.startBackgroundRefresh();
      console.log('💰 Xero token auto-refresh: Active (every 45 minutes)');
    }

    // Business agent scheduler temporarily disabled (missing dependencies)
    console.log('');
    console.log('💚 Integration Health Monitoring: Active');
    console.log('   Real-time status tracking for all data sources');
    console.log('');
  });
}

// Export for Vercel serverless
export default app;
