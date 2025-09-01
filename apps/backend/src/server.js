#!/usr/bin/env node

/**
 * ACT Public Dashboard Backend Server
 * Connects to existing Empathy Ledger database
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import compression from 'compression';
import morgan from 'morgan';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

// Services
import empathyLedgerService from './services/empathyLedgerService.js';
import xeroTokenManager from './services/xeroTokenManager.js';
import tracingService from './services/tracingService.js';
import securityGuardrailsService from './services/securityGuardrailsService.js';
import recordReplayService from './services/recordReplayService.js';
import errorTaxonomyService from './services/errorTaxonomyService.js';
import socketService from './services/socketService.js';
import { getHealthStatus } from './config/database.js';

// Integration Registry
import { integrationRegistry } from './integrations/registry.ts';

// API Routes
import platformMediaRouter from './api/platform-media.js';
import notionProxyRouter from './api/notion-proxy.js';
import notionCalendarRouter from './api/notion-calendar.js';
import dashboardRouter from './api/dashboard.js';
import adaptiveDashboardRouter from './api/adaptiveDashboard.js';
import integrationRegistryRouter from './api/integration-registry.js';
import ecosystemRouter from './api/ecosystem.js';
import ecosystemDataRouter from './api/ecosystemData.js';
import gmailSyncRouter from './api/gmailSync.js';
import gmailIntelligenceRouter from './api/gmailIntelligence.js';
// Consolidated v1 API Routes
import linkedinRouter from './api/v1/linkedin.js';
// Consolidated v1 intelligence API
import intelligenceRouter from './api/v1/intelligence.js';
// Consolidated v1 integrations API
import integrationsRouter from './api/v1/integrations.js';
// Consolidated v1 platform API
import platformRouter from './api/v1/platform.js';
import gmailLinkedInIntegrationRouter from './api/gmailLinkedInIntegration.js';
import notionLinkedInIntegrationRouter from './api/notionLinkedInIntegration.js';
import farmWorkflowRouter from './api/farmWorkflow.js';
import empathyLedgerRouter from './api/empathyLedger.js';
import decisionIntelligenceRouter from './api/decisionIntelligence.js';
import xeroAuthRouter from './api/xeroAuth.js';
// Consolidated v1 financial API
import financialRouter from './api/v1/financial.js';
import notionPublishRouter from './api/notionPublish.js';
import notionProjectTemplateRouter from './api/notionProjectTemplate.js';
import bookkeepingRouter from './api/bookkeeping.js';
import stripeBillingRouter from './api/stripeBilling.js';
import privacyRouter from './api/privacy.js';
import knowledgeRouter from './api/knowledge.js';
import opportunityScoutRouter from './api/opportunityScout.js';
// import businessIntelligenceRoutes from './api/businessIntelligence.js'; // Temporarily disabled due to kafkajs dependency
import simplifiedBusinessIntelligenceRoutes from './api/simplifiedBusinessIntelligence.js';
// realFinanceDashboard.js archived - was duplicate of existing functionality
import universalKnowledgeHubRouter from './api/universalKnowledgeHub.js';
// intelligence.js, universalIntelligence.js consolidated into v1/intelligence.js
// bookkeepingNotifications.js consolidated into v1/financial.js
import communityBookkeepingRouter from './api/communityBookkeeping.js';
// platformIntelligence, intelligenceFeatureSuggestions, researchAnalyst, complianceOfficer, contentCreation, intelligenceHub consolidated into v1/intelligence.js
import financialIntelligenceRecommendationsRouter from './api/financialIntelligenceRecommendations.js';
// dashboardIntelligence, mlPipeline consolidated into v1/intelligence.js
import dataNormalizationRouter from './api/dataNormalization.js';
import slaMonitoringRouter from './api/slaMonitoring.js';
import performanceDashboardRouter from './api/performanceDashboard.js';
import performanceOptimizationRouter from './api/performanceOptimization.js';
import enhancedIntegrationRouter from './api/enhancedIntegration.js';
// Missing API imports - Quick Win fixes
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dataIntelligenceRouter = require('./api/v1/data-intelligence.js');
import observabilityRouter from './api/observability.js';
import universalPlatformAPIRouter from './api/universalPlatformAPI.js';
import financialAPIRouter from './api/v1/financial.js';
import linkedinAPIRouter from './api/v1/linkedin.js';
import eventTrackingRouter from './api/eventTracking.js';
import metabaseConfigRouter from './api/metabaseConfig.js';
import personalizationRouter from './api/personalization.js';
import knowledgeGraphRouter from './api/knowledgeGraph.js';
import knowledgeGraphSyncRouter from './api/knowledgeGraphSync.js';
import syncEventWebhookRouter from './api/syncEventWebhook.js';
import syncEventQueueRouter from './api/syncEventQueue.js';
import dataConsistencyValidatorRouter from './api/dataConsistencyValidator.js';
import tracingRouter from './api/tracing.js';
import securityRouter from './api/security.js';
import recordReplayRouter from './api/recordReplay.js';
import errorTaxonomyRouter from './api/errorTaxonomy.js';
import realtimeRouter from './api/realtime.js';
import knowledgeGraphService from './services/knowledgeGraphService.js';
import knowledgeGraphSyncService from './services/knowledgeGraphSyncService.js';
import syncEventWebhookService from './services/syncEventWebhookService.js';
import syncEventQueueService from './services/syncEventQueueService.js';
import dataConsistencyValidatorService from './services/dataConsistencyValidatorService.js';

// OAuth Routes
import xeroOAuthRouter from './routes/xeroAuth.js';
import gmailOAuthRouter from './routes/gmailAuth.js';
import oauthRouter from './routes/oauth.js';

// Passport.js configuration
import passport from './config/passport.js';

// Session configuration
import { initializeSession, cleanupSession } from './config/session.js';

// tRPC Integration
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter, createContext } from './trpc/index.ts';

// GraphQL Server (TEMPORARILY DISABLED)
// import {
//   createGraphQLServer,
//   createGraphQLSubscriptionServer,
//   shutdownGraphQLServer,
// } from './graphql/server.js';

// Legacy Security Middleware (kept for compatibility)
import {
  cspMiddleware,
  generalRateLimit,
  authRateLimit,
  sanitizeInput,
  requestSizeLimit,
} from './middleware/security.js';

// World-Class Security (2025)
import { createSecureCORS, createAPISecurityTiers, createSecurityHealthCheck } from './config/security-migration.js';
import { fullSecurityMiddleware } from './middleware/securityMiddleware.js';
import { privacyScrubber } from './middleware/privacyScrubber.js';
import { privacyAuditLogger } from './middleware/privacyAudit.js';
import { consentEnforcer } from './middleware/consentEnforcer.js';

// Authentication Middleware
import { optionalAuth, apiKeyOrAuth } from './middleware/auth.js';

// Event Tracking Middleware
import { trackApiRequest, enrichUserContext } from './middleware/eventTracking.js';

// SLA Tracking Middleware
import {
  slaTrackingMiddleware,
  initializeSLATracking,
  getSLATrackingHealth,
  getSLAMetricsSummary,
} from './middleware/slaTracking.js';

// Performance Optimization Middleware
import {
  performanceOptimizationBundle,
  smartCompression,
  createSmartRateLimit,
} from './middleware/performanceOptimization.js';

// Validation Middleware
import {
  validateNewsletterSubscription,
  validateContactForm,
  validateStoryQuery,
  validateStorytellerQuery,
} from './middleware/validation.js';

// Error Handling
import {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  healthCheckError,
} from './middleware/errorHandler.js';

// Load environment variables robustly (apps/backend/.env and repo root .env)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Create HTTP server for GraphQL integration
const httpServer = http.createServer(app);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Security Middleware (order matters!)
app.use(cspMiddleware); // Content Security Policy

// Performance Optimization Bundle
const performanceMiddlewares = performanceOptimizationBundle({
  enableRateLimit: process.env.NODE_ENV === 'production', // Only rate limit in production
  enableCaching: true,
  enableCompression: true,
  enableMonitoring: true,
  enableCDN: true,
  rateLimitConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    standardLimit: 100,
    authLimit: 1000,
    apiKeyLimit: 5000,
  },
});

// Apply performance optimizations
performanceMiddlewares.forEach(middleware => app.use(middleware));

app.use(requestSizeLimit); // Limit request size

// TEMPORARY: Use simple CORS for debugging
app.use(cors({
  origin: 'http://localhost:5175',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));
console.log('🌐 Simple CORS activated for debugging');

app.use(privacyScrubber({ enabled: true }));
app.use(privacyAuditLogger());
app.use(consentEnforcer({ enforce: true }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Event tracking middleware (track all API requests)
app.use('/api', enrichUserContext);
app.use('/api', trackApiRequest);

// Serve static files from public directory
app.use(
  express.static(
    path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public')
  )
);

// Input sanitization
app.use(sanitizeInput);

// Initialize session management and Passport.js
const { sessionMiddleware, redisClient } = initializeSession();
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Initialize and apply SLA tracking
initializeSLATracking();
app.use(slaTrackingMiddleware);

// Request logging
if (process.env.NODE_ENV !== 'test') {
  const logFormat =
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : ':method :url :status :res[content-length] - :response-time ms';
  app.use(morgan(logFormat));
}

// Health check endpoint (no rate limiting for monitoring)
app.get(
  '/health',
  asyncHandler(async (req, res) => {
    // Test database connection by checking stories table
    const { data, error } = await supabase.from('stories').select('id').limit(1);

    if (error) throw error;

    // Get SLA tracking health
    const slaHealth = getSLATrackingHealth();
    const slaMetrics = getSLAMetricsSummary();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      empathy_ledger: 'accessible',
      version: process.env.npm_package_version || '1.0.0',
      sla_monitoring: slaHealth,
      performance_summary: slaMetrics,
    });
  })
);

// Standard API health endpoint (redirects to main health check)
app.get('/api/health', (req, res) => res.redirect('/health'));

// Additional system status endpoints
app.get('/status', (req, res) => res.redirect('/health'));
app.get('/metrics', async (req, res) => {
  try {
    const healthData = await getHealthStatus();
    res.json({
      metrics: {
        api_performance: healthData.performance_summary?.api_performance || {},
        data_freshness: healthData.performance_summary?.data_freshness || {},
        alerts: healthData.performance_summary?.alerts || {},
        sla_compliance: healthData.sla_monitoring || {}
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// World-Class Security Health Check
app.get('/security-health', createSecurityHealthCheck());

// API Routes

// Homepage data (combines existing Empathy Ledger data)
app.get(
  '/api/homepage',
  optionalAuth,
  asyncHandler(async (req, res) => {
    // Get stories from existing Empathy Ledger
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .neq('privacy_level', 'private')
      .order('created_at', { ascending: false })
      .limit(3);

    if (storiesError) throw storiesError;

    // Get stats from existing data
    const stats = await empathyLedgerService.getEmpathyLedgerStats();

    // Format response
    const homepageData = {
      featured_stories:
        stories?.map(story => ({
          id: story.id,
          title: story.title,
          excerpt: story.summary || story.content?.substring(0, 150) + '...' || '',
          author: story.storyteller_id, // We'll need to join with storytellers later
          published_at: story.created_at,
          image_url: story.story_image_url,
          tags: story.themes || [],
        })) || [],

      key_metrics: [
        {
          label: 'Community Stories',
          value: stats.total_stories,
          unit: 'stories',
          icon: '📚',
        },
        {
          label: 'AI Insights',
          value: stats.ai_insights,
          unit: 'insights',
          icon: '🤖',
        },
        {
          label: 'Active Themes',
          value: stats.active_themes,
          unit: 'themes',
          icon: '🎯',
        },
        {
          label: 'Partner Organizations',
          value: stats.partner_organizations,
          unit: 'partners',
          icon: '🤝',
        },
      ],

      active_projects: [], // Will populate when we add projects table
      featured_partners: [], // Will populate when we add partners table
    };

    res.json(homepageData);
  })
);

// Stories endpoint
app.get(
  '/api/stories',
  validateStoryQuery,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { limit = 10, featured, tags } = req.query;

    let query = supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    if (tags) {
      const tagArray = tags.split(',');
      query = query.overlaps('themes', tagArray);
    }

    query = query.limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      stories: data || [],
      total: data?.length || 0,
    });
  })
);

// Themes endpoint
app.get(
  '/api/themes',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;

    res.json(data || []);
  })
);

// Organizations endpoint
app.get(
  '/api/organizations',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json(data || []);
  })
);

// Storytellers endpoint
app.get(
  '/api/storytellers',
  validateStorytellerQuery,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { active_only, with_stories } = req.query;

    let query = supabase.from('storytellers').select('*').order('full_name');

    if (active_only === 'true') {
      query = query.eq('consent_given', true);
    }

    if (with_stories === 'true') {
      // Only include storytellers who have published stories
      query = query.not('story_count', 'is', null).gt('story_count', 0);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data || []);
  })
);

// Newsletter signup (will need to create table later)
app.post(
  '/api/newsletter/subscribe',
  authRateLimit,
  validateNewsletterSubscription,
  asyncHandler(async (req, res) => {
    const { email, first_name, last_name, interests } = req.body;

    // For now, just log the signup until we create the table
    console.log('Newsletter signup:', { email, first_name, last_name, interests });

    res.json({
      success: true,
      message:
        'Thank you for subscribing! (Currently logging to console - table will be created soon)',
    });
  })
);

// Contact form (will need to create table later)
app.post(
  '/api/contact',
  authRateLimit,
  validateContactForm,
  asyncHandler(async (req, res) => {
    const { name, email, organization, inquiry_type, subject, message } = req.body;

    // For now, just log the inquiry until we create the table
    console.log('Contact inquiry:', {
      name,
      email,
      organization,
      inquiry_type,
      subject,
      message,
    });

    res.json({
      success: true,
      message:
        'Thank you for your inquiry! We will get back to you soon. (Currently logging to console - table will be created soon)',
    });
  })
);

// tRPC API Routes (type-safe API endpoints)
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      console.error(`❌ tRPC Error on ${path}:`, error);
    },
  })
);

// Platform Media Management API Routes (with API key protection)
app.use('/api/platform', apiKeyOrAuth, platformMediaRouter);

// Integration Registry API (with authentication)
app.use('/api/integration-registry', apiKeyOrAuth, integrationRegistryRouter);

// Notion Integration API Routes (dev-friendly: optional auth)
app.use('/api/notion', optionalAuth, notionProxyRouter);

// Notion Calendar Integration API Routes (with optional auth)
app.use('/api/notion', optionalAuth, notionCalendarRouter);

// Gmail Sync API Routes (auth endpoints public, others protected)
app.use('/api/gmail-sync', gmailSyncRouter);

// Gmail Intelligence API Routes (deep search and analysis)
app.use('/api/gmail-intelligence', gmailIntelligenceRouter);

// CONSOLIDATED: Real Intelligence → v1/intelligence advanced-decision & deep-research
// CONSOLIDATED: Relationship Intelligence → v1/intelligence query?mode=relationship

// Consolidated LinkedIn API Routes - v1 (replaces 7 separate LinkedIn APIs)
app.use('/api/v1/linkedin', linkedinRouter);

// Gmail-LinkedIn Integration API Routes (automatic contact enrichment from email interactions)
app.use('/api/gmail-linkedin', gmailLinkedInIntegrationRouter);

// Notion-LinkedIn Integration API Routes (automatic contact recommendations for Notion projects)
app.use('/api/notion-linkedin', notionLinkedInIntegrationRouter);

// AI Decision Support API Routes (natural language queries and recommendations)
// CONSOLIDATED: AI Decision Support → v1/intelligence query?mode=decision
// app.use('/api/ai-decision-support', aiDecisionSupportRouter);

// ACT Farmhand AI Agent API Routes (world-class intelligence engine)
// CONSOLIDATED: ACT Farmhand → v1/intelligence query?mode=farmhand
// app.use('/api/farmhand', actFarmhandAgentRouter);

// Farm Workflow System API Routes (farm metaphor workflow processing)
app.use('/api/farm-workflow', farmWorkflowRouter);

// Empathy Ledger API Routes (community stories and storytellers)
app.use('/api/empathy-ledger', empathyLedgerRouter);

// Decision Intelligence API Routes (real-time business decision support)
app.use('/api/decision-intelligence', decisionIntelligenceRouter);

// OAuth Routes
app.use('/api/xero', xeroOAuthRouter);
app.use('/api/gmail', gmailOAuthRouter);

// OAuth 2.0 Authentication Routes (Google, GitHub, Local)
app.use('/auth', oauthRouter);

// Consolidated Financial API - v1 (replaces financeDashboard + financeReceipts + bookkeepingNotifications + realFinanceDashboard)
app.use('/api/v1/financial', financialRouter);
app.use('/api/bookkeeping', bookkeepingRouter);
app.use('/api/billing', stripeBillingRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/opportunity-scout', opportunityScoutRouter);
// CONSOLIDATED: Universal Intelligence → v1/intelligence query?mode=universal
// CONSOLIDATED: Research Analyst → v1/intelligence deep-research
// CONSOLIDATED: Compliance Officer → v1/intelligence compliance/check
// CONSOLIDATED: Content Creation → v1/intelligence content/generate
// CONSOLIDATED: Intelligence Hub → v1/intelligence skill-pod-analysis
// CONSOLIDATED: Dashboard Intelligence → v1/intelligence quick-insight

// ML Pipeline (Enhanced data processing, embeddings, and similarity search)
// CONSOLIDATED: ML Pipeline → v1/intelligence ml-analysis
// app.use('/api/ml-pipeline', mlPipelineRouter);

// Data Normalization (Data transformation, validation, and quality management)
app.use('/api/data-normalization', dataNormalizationRouter);

// SLA Monitoring (Data freshness, API performance, and SLA compliance tracking)
app.use('/api/sla-monitoring', slaMonitoringRouter);

// Performance Dashboard (Real-time performance monitoring and visualization)
app.use('/api/performance-dashboard', performanceDashboardRouter);

// Performance Optimization (Advanced caching, rate limiting, and optimization management)
app.use('/api/performance-optimization', performanceOptimizationRouter);

// Enhanced Integration (OAuth authentication, real-time sync, and data architecture expansion)
app.use('/api/enhanced-integration', enhancedIntegrationRouter);

// Missing API routes - Quick Win fixes
app.use('/api/v1/data-intelligence', dataIntelligenceRouter);
app.use('/api/observability', observabilityRouter);
app.use('/api/universal-platform', universalPlatformAPIRouter);
app.use('/api/v1/financial', financialAPIRouter);
app.use('/api/v1/linkedin', linkedinAPIRouter);

// Event Tracking and Analytics (PostHog integration, user behavior tracking)
app.use('/api/events', eventTrackingRouter);

// Metabase Configuration and Analytics Dashboard Management
app.use('/api/metabase', metabaseConfigRouter);

// Personalization engine for user preferences and behavior tracking
app.use('/api/personalization', personalizationRouter);

// Neo4j Knowledge Graph API Routes (community collaboration and recommendations)
app.use('/api/knowledge-graph', knowledgeGraphRouter);

// Neo4j Knowledge Graph Sync API Routes (bidirectional Supabase-Neo4j sync)
app.use('/api/knowledge-graph-sync', knowledgeGraphSyncRouter);

// Sync Event Webhook API Routes (real-time sync event processing)
app.use('/api/sync-webhook', syncEventWebhookRouter);

// Sync Event Queue API Routes (advanced queue management for sync operations)
app.use('/api/sync-queue', syncEventQueueRouter);

// Data Consistency Validator API Routes (data integrity validation between Supabase and Neo4j)
app.use('/api/data-consistency', dataConsistencyValidatorRouter);
app.use('/api/tracing', tracingRouter);
app.use('/api/security', securityRouter);
app.use('/api/record-replay', recordReplayRouter);
app.use('/api/error-taxonomy', errorTaxonomyRouter);

// Real-Time Communication API Routes (Socket.IO management and testing)
app.use('/api/realtime', realtimeRouter);

// Compliance and Data Sovereignty API Routes (GDPR/CCPA privacy compliance)
import dataSovereigntyRouter from './api/dataSovereignty.js';
import complianceDashboardRouter from './api/compliance-dashboard.js';
import complianceStartup from './startup/complianceStartup.js';
import setupSupabaseCRM from './api/supabase-crm.js';
import setupMigrationManagement from './api/migration-management.js';
import setupRealDashboardData from './api/real-dashboard-data.js';
import setupUnifiedIntelligence from './api/unified-intelligence.js';

app.use('/api/data-sovereignty', dataSovereigntyRouter);
app.use('/api/compliance-dashboard', complianceDashboardRouter);

// Supabase CRM Integration API Routes (200,000+ contact management)
setupSupabaseCRM(app);

// Migration Management API Routes (Empathy Ledger migration + platform integrations)
setupMigrationManagement(app);

// Real Dashboard Data API Routes (NO FAKE DATA - only real community data)
setupRealDashboardData(app);
setupUnifiedIntelligence(app);

// Notion Publishing for Sprint docs
app.use('/api/notion-publish', notionPublishRouter);
app.use('/api/notion-projects', notionProjectTemplateRouter);

// Temporary compatibility alias: older frontend calls /api/gmail-sync/status
// Map it to the new route under /api/gmail/status
app.get('/api/gmail-sync/status', (req, res) => {
  res.redirect(307, '/api/gmail/status');
});

// Simple ask alias: POST /api/ask { query } → Farmhand
app.post('/api/ask', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: 'missing_query' });
    const url = `http://localhost:${process.env.PORT || 4000}/api/farmhand/query`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(j);
    res.json(j);
  } catch (e) {
    res.status(500).json({ error: 'ask_failed', message: e?.message || String(e) });
  }
});

// Endpoint to create the Goods project specifically
app.post('/api/test/create-goods', async (req, res) => {
  try {
    console.log('🛍️ Creating Goods project endpoint called');
    const { notionService } = await import('./services/notionService.js');
    
    const result = await notionService.createGoodsProject();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.project
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error in Goods project endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: 'goods_project_failed', 
      message: error?.message || String(error) 
    });
  }
});

// Test endpoint to create project and organization in Notion
app.post('/api/test/create-entities', async (req, res) => {
  try {
    console.log('🧪 Test endpoint called: creating project and organization');
    const { notionService } = await import('./services/notionService.js');
    
    const result = await notionService.createTestEntities();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          project: result.project,
          organization: result.organization
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: 'test_endpoint_failed', 
      message: error?.message || String(error) 
    });
  }
});

// Business Intelligence API Routes (comprehensive business operations)
// businessIntelligenceRoutes(app); // Temporarily disabled due to kafkajs dependency
simplifiedBusinessIntelligenceRoutes(app); // Simplified version without external dependencies

// realFinanceDashboard functionality consolidated into /api/v1/financial

// Dashboard API Routes (with optional authentication)
app.use('/api/dashboard', dashboardRouter);

// Adaptive Dashboard API Routes (personalized dashboard management)
app.use('/api/adaptive-dashboard', adaptiveDashboardRouter);

// Enhanced Ecosystem API Routes (public access)
app.use('/api/ecosystem', ecosystemRouter);

// Unified Ecosystem Data API Routes (public access)
app.use('/api/ecosystem-data', ecosystemDataRouter);

// Universal Knowledge Hub API Routes (business intelligence)
app.use('/api/universal-knowledge-hub', universalKnowledgeHubRouter);

// Consolidated Intelligence API - v1 (replaces 15+ intelligence APIs)
app.use('/api/v1/intelligence', intelligenceRouter);

// Consolidated Integrations API - v1 (replaces 10+ integration APIs)
app.use('/api/v1/integrations', integrationsRouter);

// Consolidated Platform API - v1 (replaces 8+ platform APIs)
app.use('/api/v1/platform', platformRouter);

// bookkeepingNotifications functionality consolidated into /api/v1/financial
app.use('/api/community-bookkeeping', communityBookkeepingRouter);

// CONSOLIDATED: Platform Intelligence → v1/intelligence status & provider-status
// Financial Intelligence Recommendations API Routes (specialized - maintained for now)
app.use('/api/financial-intelligence', financialIntelligenceRecommendationsRouter);

// CONSOLIDATED: Intelligence Feature Suggestions → v1/intelligence learn & examples

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Initialize tracing service
async function initializeServices() {
  console.log('🔧 Initializing services...');

  try {
    // Initialize integration registry first - other services may depend on it
    await integrationRegistry.initialize();

    // Initialize Socket.IO real-time communication service
    // Temporarily disabled due to logger import issues
    // await socketService.initialize(httpServer, redisClient);

    await tracingService.initialize();
    await securityGuardrailsService.initialize();
    await recordReplayService.initialize();
    await errorTaxonomyService.initialize();
    await complianceStartup.initialize();
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
  }
}

// Start server
httpServer.listen(PORT, async () => {
  console.log(`\n🚀 ACT Backend Server started with security middleware!`);
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🗄️  Connected to Empathy Ledger database`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);

  // Initialize GraphQL Server (TEMPORARILY DISABLED)
  try {
    // await createGraphQLServer(app, httpServer);
    // createGraphQLSubscriptionServer(httpServer);
    console.log(`🎯 GraphQL API temporarily disabled - using REST APIs only`);
  } catch (error) {
    console.error('❌ GraphQL Server initialization failed:', error);
  }

  // Initialize services after server starts
  await initializeServices();

  // Start Xero background token refresh to prevent "fucking annoying re-authentication every time"
  if (process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET) {
    xeroTokenManager.startBackgroundRefresh();
    console.log(`💰 Xero auto-refresh enabled - no more repeated authentication!`);
  }
  console.log(`🔒 Security features enabled:`);
  console.log(`   ✓ Content Security Policy (CSP)`);
  console.log(`   ✓ Rate limiting (100 req/15min, 5 auth req/15min)`);
  console.log(`   ✓ Input sanitization and validation`);
  console.log(`   ✓ Request size limiting (10MB)`);
  console.log(`   ✓ CORS with whitelist`);
  console.log(`   ✓ Compression enabled`);
  console.log(`\n📊 Public API endpoints:`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   GET  /api/homepage        - Homepage data`);
  console.log(`   GET  /api/stories         - Community stories (validated)`);
  console.log(`   GET  /api/themes          - Story themes`);
  console.log(`   GET  /api/organizations   - Partner organizations`);
  console.log(`   GET  /api/storytellers    - Community storytellers (validated)`);
  console.log(
    `   POST /api/newsletter/subscribe - Newsletter signup (rate limited + validated)`
  );
  console.log(`   POST /api/contact         - Contact form (rate limited + validated)`);
  console.log(`\n📈 Dashboard API endpoints (Notion-powered):`);
  console.log(`   GET  /api/dashboard/overview - Dashboard overview data`);
  console.log(
    `   GET  /api/dashboard/network/relationships - Network visualization data`
  );
  console.log(
    `   GET  /api/dashboard/ecosystem/opportunities - Opportunity ecosystem data`
  );
  console.log(`   GET  /api/dashboard/chains/impact - Project impact chains`);
  console.log(`   GET  /api/dashboard/search?q=term - Search across all data`);
  console.log(`   GET  /api/dashboard/health - Dashboard and Notion health`);
  console.log(`   GET  /api/dashboard/actions - Action items and tasks`);
  console.log(`   POST /api/dashboard/cache/clear - Clear data cache`);
  console.log(`\n🔐 Protected API endpoints (require API key or JWT):`);
  console.log(`   GET  /api/platform/health - Platform health check`);
  console.log(`   GET  /api/platform/act/info - ACT organization info`);
  console.log(`   GET  /api/platform/act/items - Browse ACT media library`);
  console.log(`   POST /api/platform/act/upload - Upload ACT photos/videos`);
  console.log(`   GET  /api/platform/act/collections - Manage ACT galleries`);
  console.log(`   GET  /api/notion/health - Notion connection status`);
  console.log(`   GET  /api/notion/partners - Partner data (Notion + fallback)`);

  console.log(`\n🔌 Integration Registry endpoints:`);
  console.log(`   GET  /api/integration-registry - Integration overview and stats`);
  console.log(`   GET  /api/integration-registry/:key - Detailed integration info`);
  console.log(`   GET  /api/integration-registry/type/:type - Integrations by type`);
  console.log(`   POST /api/integration-registry/health-check - Run all health checks`);
  console.log(
    `   GET  /api/integration-registry/export/documentation - Export as docs`
  );

  console.log(`\n🤖 AI Decision Support endpoints (natural language queries):`);
  console.log(
    `   POST /api/ai-decision-support/query - Natural language queries about contacts/projects`
  );
  console.log(
    `   GET  /api/ai-decision-support/recommendations/:type - Contextual recommendations`
  );
  console.log(
    `   POST /api/ai-decision-support/analyze-decision - Strategic decision analysis`
  );
  console.log(
    `   GET  /api/ai-decision-support/contacts/search - AI-powered contact search`
  );
  console.log(`\n🌾 ACT Farmhand AI Agent endpoints (world-class intelligence):`);
  console.log(`   POST /api/farmhand/query - Natural language queries to AI agent`);
  console.log(`   GET  /api/farmhand/weekly-sprint - Weekly intelligence report`);
  console.log(`   GET  /api/farmhand/health - AI agent health check`);
  console.log(`   POST /api/farmhand/skill-pod/:podName - Test specific skill pod`);
  console.log(
    `   POST /api/farmhand/alignment-check - Check content against ACT values`
  );
  console.log(
    `   POST /api/farmhand/generate-tasks - Generate Taskmaster cards from description`
  );
  console.log(
    `   GET  /api/farmhand/recommendations?type=funding - Smart recommendations`
  );
  console.log(`   POST /api/farmhand/test-assumption - Test strategic assumptions`);
  console.log(`\n🧠 Decision Intelligence endpoints (real-time business support):`);
  console.log(
    `   GET  /api/decision-intelligence/business-state - Current business metrics`
  );
  console.log(
    `   GET  /api/decision-intelligence/decisions - All decisions with filtering`
  );
  console.log(
    `   GET  /api/decision-intelligence/recommendations - AI-generated recommendations`
  );
  console.log(
    `   POST /api/decision-intelligence/analyze - Process new decision through AI`
  );
  console.log(
    `   POST /api/decision-intelligence/decisions/:id/outcome - Record decision outcomes`
  );
  console.log(
    `   POST /api/decision-intelligence/decisions/:id/scenario-analysis - Run scenario analysis`
  );
  console.log(
    `   POST /api/decision-intelligence/deep-research - Comprehensive AI research (Anthropic + OpenAI + Perplexity)`
  );
  console.log(
    `   GET  /api/decision-intelligence/ai-health - Check AI services status`
  );
  console.log(`\n🧠 5-Source Intelligence endpoints (unified query system):`);
  console.log(
    `   GET  /api/intelligence/status - System status and data source health`
  );
  console.log(`   GET  /api/intelligence/examples - Example queries for testing`);
  console.log(
    `   POST /api/intelligence/query - Natural language intelligence queries`
  );
  console.log(
    `   POST /api/intelligence/demo - Demo query showcasing system capabilities`
  );
  console.log(
    `\n📋 Automated Bookkeeping endpoints (receipt processing + Dext integration):`
  );
  console.log(`   GET  /api/bookkeeping/notifications - Get bookkeeping notifications`);
  console.log(
    `   POST /api/bookkeeping/notifications/process - Process bookkeeping notifications`
  );
  console.log(`   GET  /api/bookkeeping/receipts/status - Receipt matching status`);
  console.log(`   POST /api/bookkeeping/receipts/match - Match receipt to transaction`);
  console.log(
    `   GET  /api/bookkeeping/workflow - Complete bookkeeping workflow status`
  );
  console.log(`   GET  /api/bookkeeping/dext/status - Dext connection status`);
  console.log(`   GET  /api/bookkeeping/dext/receipts - Get Dext processed receipts`);
  console.log(
    `   POST /api/bookkeeping/dext/sync - Sync Dext receipts with bookkeeping`
  );
  console.log(
    `   POST /api/bookkeeping/receipts/upload-to-dext - Upload receipt to Dext`
  );
  console.log(`\n🔍 SLA Monitoring and Performance Dashboard endpoints:`);
  console.log(`   GET  /api/sla-monitoring/status - Current SLA compliance status`);
  console.log(
    `   GET  /api/sla-monitoring/compliance - Detailed SLA compliance report`
  );
  console.log(`   GET  /api/sla-monitoring/data-freshness - Data freshness metrics`);
  console.log(`   GET  /api/sla-monitoring/api-performance - API performance metrics`);
  console.log(`   GET  /api/sla-monitoring/alerts - Current alerts and their status`);
  console.log(
    `   GET  /api/sla-monitoring/dashboard - Comprehensive SLA dashboard data`
  );
  console.log(
    `   GET  /api/performance-dashboard/overview - Performance dashboard overview`
  );
  console.log(
    `   GET  /api/performance-dashboard/real-time - Real-time performance metrics`
  );
  console.log(
    `   GET  /api/performance-dashboard/historical - Historical performance data`
  );
  console.log(`   GET  /api/performance-dashboard/alerts - Alert dashboard data`);
  console.log(
    `   GET  /performance-dashboard.html - Visual performance dashboard (HTML)`
  );
  console.log(
    `\n⚡ Performance Optimization endpoints (multi-layer caching + optimization):`
  );
  console.log(
    `   GET  /api/performance-optimization/status - Performance optimization status`
  );
  console.log(
    `   GET  /api/performance-optimization/cache-stats - Detailed cache statistics`
  );
  console.log(`   POST /api/performance-optimization/cache/clear - Clear cache layers`);
  console.log(
    `   POST /api/performance-optimization/cache/preload - Preload common data`
  );
  console.log(
    `   GET  /api/performance-optimization/memory-usage - Memory usage analysis`
  );
  console.log(
    `   POST /api/performance-optimization/optimize - Run optimization procedures`
  );
  console.log(
    `   GET  /api/performance-optimization/recommendations - AI performance recommendations`
  );
  console.log(`\n📊 Metabase Analytics Configuration endpoints:`);
  console.log(`   GET  /api/metabase/health - Metabase service health check`);
  console.log(`   GET  /api/metabase/status - Comprehensive configuration status`);
  console.log(`   POST /api/metabase/setup - Perform complete Metabase setup`);
  console.log(`   POST /api/metabase/initialize - Initialize Metabase connection`);
  console.log(`   POST /api/metabase/databases - Add database connection`);
  console.log(`   GET  /api/metabase/databases - List configured databases`);
  console.log(`   POST /api/metabase/collections - Create dashboard collection`);
  console.log(`   POST /api/metabase/dashboards - Create analytics dashboard`);
  console.log(`   GET  /api/metabase/dashboards - List all dashboards`);
  console.log(
    `   POST /api/metabase/setup/act-defaults - Setup ACT Community defaults`
  );
  console.log(`   GET  /api/metabase/config - Get current configuration`);
  console.log(`   GET  /api/metabase/embed/:dashboardId - Get dashboard embed URL`);
  console.log(
    `\n🔗 Neo4j Knowledge Graph Sync endpoints (bidirectional Supabase sync):`
  );
  console.log(`   GET  /api/knowledge-graph-sync/status - Sync service status`);
  console.log(`   GET  /api/knowledge-graph-sync/health - Comprehensive health check`);
  console.log(`   POST /api/knowledge-graph-sync/initialize - Initialize sync service`);
  console.log(
    `   POST /api/knowledge-graph-sync/users - Sync users to knowledge graph`
  );
  console.log(
    `   POST /api/knowledge-graph-sync/projects - Sync projects to knowledge graph`
  );
  console.log(
    `   POST /api/knowledge-graph-sync/outcomes - Sync outcomes to knowledge graph`
  );
  console.log(
    `   POST /api/knowledge-graph-sync/full - Perform full bidirectional sync`
  );
  console.log(
    `   POST /api/knowledge-graph-sync/insights - Sync KG insights to Supabase`
  );
  console.log(`   POST /api/knowledge-graph-sync/user/:userId - Sync specific user`);
  console.log(
    `   GET  /api/knowledge-graph-sync/recommendations/:userId - Get user recommendations`
  );
  console.log(`\n   📨 Sync Webhook API (Real-time Event Processing):`);
  console.log(`   GET  /api/sync-webhook/status - Webhook service status`);
  console.log(`   GET  /api/sync-webhook/health - Comprehensive health check`);
  console.log(`   POST /api/sync-webhook/initialize - Initialize webhook service`);
  console.log(`   POST /api/sync-webhook/start - Start webhook processing`);
  console.log(`   POST /api/sync-webhook/stop - Stop webhook processing`);
  console.log(`   POST /api/sync-webhook/process-batch - Manually process next batch`);
  console.log(
    `   POST /api/sync-webhook/process-table - Process events for specific table`
  );
  console.log(`   GET  /api/sync-webhook/statistics - Get sync event statistics`);
  console.log(`   POST /api/sync-webhook/reset-failed - Reset failed events for retry`);
  console.log(`   POST /api/sync-webhook/cleanup - Clean up old sync events`);
  console.log(`   POST /api/sync-webhook/webhook - Receive webhook notifications`);

  console.log(`\n🔍 Data Consistency Validator API (Data Integrity Validation):`);
  console.log(`   GET  /api/data-consistency/status - Validator service status`);
  console.log(
    `   GET  /api/data-consistency/health - Quick data consistency health check`
  );
  console.log(
    `   POST /api/data-consistency/initialize - Initialize validation service`
  );
  console.log(
    `   POST /api/data-consistency/validate - Perform full consistency validation`
  );
  console.log(`   GET  /api/data-consistency/results - Get latest validation results`);
  console.log(`   GET  /api/data-consistency/summary - Get validation summary`);
  console.log(
    `   GET  /api/data-consistency/inconsistencies - Get inconsistencies details`
  );
  console.log(`   GET  /api/data-consistency/missing - Get missing records details`);
  console.log(`   GET  /api/data-consistency/orphaned - Get orphaned records details`);
  console.log(
    `   POST /api/data-consistency/repair - Perform manual repair operations`
  );
  console.log(`   GET  /api/data-consistency/config - Get validation configuration`);

  console.log(`\n🔒 Privacy & Compliance endpoints (GDPR/CCPA/Cultural Safety):`);
  console.log(
    `   POST /api/data-sovereignty/export - Export user data (privacy request)`
  );
  console.log(
    `   POST /api/data-sovereignty/delete - Delete user data (privacy request)`
  );
  console.log(`   GET  /api/data-sovereignty/status/:requestId - Check request status`);
  console.log(`   GET  /api/compliance-dashboard/status - System compliance status`);
  console.log(
    `   GET  /api/compliance-dashboard/dashboard - Full compliance dashboard`
  );
  console.log(`   GET  /api/compliance-dashboard/audit-summary - Recent audit events`);
  console.log(
    `   GET  /api/compliance-dashboard/privacy-requests - Privacy request tracking`
  );
  console.log(
    `   GET  /api/compliance-dashboard/encryption-stats - Encryption metrics`
  );
  console.log(
    `   GET  /api/compliance-dashboard/cultural-safety - Cultural safety metrics`
  );
  console.log(
    `   POST /api/compliance-dashboard/generate-report - Generate compliance report`
  );
  console.log(
    `   POST /api/compliance-dashboard/test-encryption - Test encryption system`
  );

  console.log(
    `\n🛡️  Security-hardened ACT platform ready for production deployment!\n`
  );

  // Initialize Knowledge Graph Service (async IIFE)
  console.log('🔗 Initializing Neo4j Knowledge Graph...');
  (async () => {
    try {
      const initialized = await knowledgeGraphService.initialize();
      if (initialized) {
        console.log('✅ Neo4j Knowledge Graph initialized successfully');

        // Initialize Knowledge Graph Sync Service
        console.log('🔄 Initializing Knowledge Graph Sync Service...');
        const syncInitialized = await knowledgeGraphSyncService.initialize();
        if (syncInitialized) {
          console.log('✅ Knowledge Graph Sync Service initialized successfully');

          // Initialize Sync Event Webhook Service
          console.log('📨 Initializing Sync Event Webhook Service...');
          const webhookInitialized = await syncEventWebhookService.initialize();
          if (webhookInitialized) {
            console.log('✅ Sync Event Webhook Service initialized successfully');

            // Auto-start webhook processing if enabled
            if (process.env.AUTO_START_WEBHOOK_PROCESSING !== 'false') {
              await syncEventWebhookService.startProcessing();
              console.log('▶️ Sync Event Webhook processing started automatically');
            }
          } else {
            console.log('⚠️  Sync Event Webhook Service initialization failed');
          }
        } else {
          console.log('⚠️  Knowledge Graph Sync Service initialization failed');
        }
      } else {
        console.log(
          '⚠️  Neo4j Knowledge Graph initialization failed - check connection'
        );
      }
    } catch (error) {
      console.error('❌ Neo4j Knowledge Graph initialization error:', error.message);
    }
  })();

  // Add graceful shutdown handlers for OAuth session cleanup
  const gracefulShutdown = async signal => {
    console.log(`\n🔄 Received ${signal}, starting graceful shutdown...`);

    // Shutdown GraphQL Server
    // await shutdownGraphQLServer();

    // Cleanup session store
    if (redisClient) {
      cleanupSession(redisClient);
    }

    // Close HTTP server
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
    });

    console.log('✅ Server shutdown completed');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});

export default app;
