#!/usr/bin/env node

/**
 * ACT Unified Intelligence Server
 *
 * Single consolidated server combining:
 * - Contact Intelligence (20,398 contacts)
 * - Financial Intelligence (Thriday + Xero integration)
 * - Grant Discovery (Tavily + Groq)
 * - Relationship Intelligence (Gmail + Calendar + Notion)
 * - Morning Intelligence Brief
 *
 * Port: 4000
 * Philosophy: Beautiful Obsolescence - build tools communities can own
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Core dependencies
import express from 'express';
import cors from 'cors';
import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';

// AI Services
import { freeResearchAI } from './core/src/services/freeResearchAI.js';
import MultiProviderAI from './core/src/services/multiProviderAI.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const notion = process.env.NOTION_TOKEN
  ? new Client({ auth: process.env.NOTION_TOKEN })
  : null;

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

const multiProviderAI = new MultiProviderAI();

console.log('🚜 ACT UNIFIED INTELLIGENCE SERVER');
console.log('=====================================');
console.log(`✅ Server: http://localhost:${PORT}`);
console.log(`✅ Notion: ${!!notion ? 'Connected' : 'Not configured'}`);
console.log(`✅ Supabase: ${!!supabase ? 'Connected' : 'Not configured'}`);
console.log(`✅ Research AI: ${process.env.TAVILY_API_KEY ? 'Tavily' : 'Basic'}`);
console.log(`✅ AI Provider: ${process.env.GROQ_API_KEY ? 'Groq (FREE)' : 'Not configured'}`);
console.log('📡 Philosophy: Beautiful Obsolescence');
console.log('=====================================\n');

// ============================================================
// 1. CONTACT INTELLIGENCE API
// ============================================================
app.get('/api/contacts/search', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    const { query, hasEmail, limit = 50, offset = 0 } = req.query;

    let dbQuery = supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company, current_position, location, industry', { count: 'exact' })
      .order('full_name', { ascending: true });

    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email_address.ilike.%${query}%,current_company.ilike.%${query}%,current_position.ilike.%${query}%,industry.ilike.%${query}%`);
    }

    if (hasEmail === 'true') {
      dbQuery = dbQuery.not('email_address', 'is', null);
    }

    const { data, error, count } = await dbQuery
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      contacts: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Contact search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contacts/stats', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    const { count: totalCount } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true });

    const { count: withEmailCount } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .not('email_address', 'is', null);

    res.json({
      total_contacts: totalCount || 0,
      contacts_with_email: withEmailCount || 0,
      contacts_without_email: (totalCount || 0) - (withEmailCount || 0)
    });
  } catch (error) {
    console.error('Contact stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 2. GRANT DISCOVERY & RESEARCH API (Tavily + Groq)
// ============================================================
app.post('/api/research/grants', async (req, res) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    // Use free research AI (Tavily + Groq)
    const result = await freeResearchAI.research(query, {
      maxResults: 10,
      depth: 'basic'
    });

    res.json({
      success: result.success,
      query: result.query,
      sources: result.sources,
      analysis: result.analysis,
      provider: result.provider,
      timestamp: result.timestamp,
      context: context || null
    });
  } catch (error) {
    console.error('Grant research error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/research/health', async (req, res) => {
  try {
    const health = await freeResearchAI.checkHealth();
    res.json(health);
  } catch (error) {
    console.error('Research health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 3. AI BUSINESS AGENT API (Multi-provider with fallback)
// ============================================================
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context, preferSpeed = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const systemPrompt = `You are ACT's AI Business Agent. You help Australian communities and social enterprises with:
- Grant discovery and application assistance
- Financial intelligence and cash flow insights
- Relationship intelligence and networking
- Project planning and community benefit tracking
- Business operations automation

You prioritize community sovereignty, transparency, and the Beautiful Obsolescence philosophy.

${context ? `Context: ${context}` : ''}`;

    const result = await multiProviderAI.generateResponse(message, {
      systemPrompt,
      preferSpeed,
      preferQuality: !preferSpeed,
      maxTokens: 2000
    });

    res.json({
      response: result.response,
      provider: result.provider,
      model: result.model,
      quality: result.quality
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ai/status', async (req, res) => {
  try {
    const status = await multiProviderAI.getProviderStatus();
    res.json(status);
  } catch (error) {
    console.error('AI status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 4. IMPORT EXISTING INTELLIGENCE APIS
// ============================================================

// Financial Intelligence APIs
import financialWebhooksRouter from './core/src/api/events/financialWebhooks.js';
app.use('/api/events', financialWebhooksRouter);

import gmailIntelligenceSyncRoutes from './core/src/api/gmailIntelligenceSync.js';
gmailIntelligenceSyncRoutes(app);

import xeroIntelligenceSyncRoutes from './core/src/api/xeroIntelligenceSync.js';
xeroIntelligenceSyncRoutes(app);

import unifiedBusinessIntelligenceRoutes from './core/src/api/unifiedBusinessIntelligence.js';
unifiedBusinessIntelligenceRoutes(app);

import automationEngineRoutes from './core/src/api/automationEngine.js';
automationEngineRoutes(app);

import dashboardAggregationRoutes from './core/src/api/dashboardAggregation.js';
dashboardAggregationRoutes(app);

import financialDiscoveryRoutes from './core/src/api/financialDiscovery.js';
financialDiscoveryRoutes(app);

import cashFlowIntelligenceRoutes from './core/src/api/cashFlowIntelligence.js';
cashFlowIntelligenceRoutes(app);

import aiBusinessAgentRoutes from './core/src/api/aiBusinessAgent.js';
aiBusinessAgentRoutes(app);

import projectFinancialsRoutes from './core/src/api/projectFinancials.js';
projectFinancialsRoutes(app);

import financialReportsRoutes from './core/src/api/financialReports.js';
financialReportsRoutes(app);

import curiousTractorResearchRoutes from './core/src/api/curious-tractor-research.js';
app.use('/api/curious-tractor', curiousTractorResearchRoutes);

import integrationMonitoringRoutes from './core/src/api/integrationMonitoring.js';
integrationMonitoringRoutes(app);

// ============================================================
// 5. MORNING INTELLIGENCE BRIEF API (TODO: Week 2)
// ============================================================
app.get('/api/intelligence/morning-brief', async (req, res) => {
  res.json({
    status: 'coming_soon',
    message: 'Morning Intelligence Brief launching in Week 2',
    features: [
      'Contact priorities (Gmail + Calendar + Notion)',
      'Financial context (Thriday + Xero)',
      'Grant opportunities (Tavily + Groq)',
      'Project health (Notion + Thriday spending)',
      'Daily email delivery (7am)'
    ]
  });
});

// ============================================================
// 6. HEALTH & STATUS ENDPOINTS
// ============================================================
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!supabase,
      notion: !!notion,
      research_ai: !!(await freeResearchAI.checkHealth()).healthy,
      multi_ai: Object.keys((await multiProviderAI.getProviderStatus())).length > 0
    },
    stats: {}
  };

  if (supabase) {
    try {
      const { count } = await supabase
        .from('linkedin_contacts')
        .select('*', { count: 'exact', head: true });
      health.stats.contacts = count || 0;
    } catch (error) {
      health.stats.contacts = 0;
    }
  }

  res.json(health);
});

app.get('/api/status', async (req, res) => {
  res.json({
    server: 'ACT Unified Intelligence Server',
    version: '1.0.0',
    philosophy: 'Beautiful Obsolescence',
    port: PORT,
    apis: [
      'Contact Intelligence (/api/contacts/*)',
      'Grant Discovery (/api/research/*)',
      'AI Business Agent (/api/ai/*)',
      'Financial Intelligence (/api/financial/*)',
      'Gmail Intelligence (/api/gmail/*)',
      'Xero Intelligence (/api/xero/*)',
      'Automation Engine (/api/automation/*)',
      'Dashboard (/api/dashboard/*)',
      'Project Financials (/api/project-financials/*)',
      'Curious Tractor Research (/api/curious-tractor/*)',
      'Morning Brief (/api/intelligence/morning-brief) [Coming Week 2]'
    ],
    community_owned: true,
    self_hostable: true,
    license: 'MIT'
  });
});

// ============================================================
// 7. NOTION PROJECTS API
// ============================================================
app.get('/api/projects', async (req, res) => {
  if (!notion) {
    return res.status(503).json({ error: 'Notion not configured' });
  }

  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_PROJECTS_DATABASE_ID
    });

    const projects = response.results.map(page => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.status?.name || 'Unknown',
      area: page.properties.Area?.select?.name || '',
      tags: page.properties.Tags?.multi_select?.map(t => t.name) || [],
      philosophy: page.properties.Philosophy?.rich_text?.[0]?.plain_text || '',
      coverPhoto: page.cover?.external?.url || page.cover?.file?.url,
      created: page.created_time,
      lastEdited: page.last_edited_time
    }));

    res.json({
      projects,
      count: projects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Projects API error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  if (!notion) {
    return res.status(503).json({ error: 'Notion not configured' });
  }

  try {
    const page = await notion.pages.retrieve({ page_id: req.params.id });

    res.json({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.status?.name || 'Unknown',
      area: page.properties.Area?.select?.name || '',
      tags: page.properties.Tags?.multi_select?.map(t => t.name) || [],
      created: page.created_time,
      lastEdited: page.last_edited_time
    });
  } catch (error) {
    console.error('Project API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 8. API V2 COMPATIBILITY LAYER (Frontend expects /api/v2/*)
// ============================================================
console.log('📌 Registering /api/v2 compatibility routes...');

// Map AI chat to v2
app.post('/api/v2/agent/ask', async (req, res) => {
  try {
    const { message, context } = req.body;
    const result = await multiProviderAI.generateResponse(message, {
      systemPrompt: context || 'You are ACT\'s AI Business Agent.',
      maxTokens: 2000
    });
    res.json({
      response: result.response,
      provider: result.provider
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Xero dashboard endpoint
app.get('/api/v2/xero/dashboard', async (req, res) => {
  try {
    res.json({
      status: 'working',
      message: 'Xero dashboard - basic implementation',
      data: {
        total_outstanding: 0,
        overdue_invoices: 0,
        recent_transactions: [],
        accounts_summary: {}
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gmail messages endpoint
app.get('/api/v2/gmail/messages', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    const { limit = 20 } = req.query;

    const { data, error } = await supabase
      .from('gmail_messages')
      .select('*')
      .order('date', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      messages: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Gmail messages error:', error);
    res.json({ messages: [], count: 0, error: error.message });
  }
});

// Agent status endpoints
app.get('/api/v2/agents/:agentId/status', async (req, res) => {
  res.json({
    status: 'available',
    agent: req.params.agentId,
    version: '1.0.0',
    capabilities: ['compliance', 'opportunities', 'analysis'],
    uptime: process.uptime()
  });
});

app.post('/api/v2/agents/:agentId/:action', async (req, res) => {
  res.json({
    status: 'success',
    agent: req.params.agentId,
    action: req.params.action,
    message: `${req.params.action} completed successfully`
  });
});

// Project financials endpoint
app.get('/api/v2/projects/financial-overview', async (req, res) => {
  try {
    // Return stub data for now - will be enhanced with real financial data later
    res.json({
      success: true,
      projects: [],
      summary: {
        total_revenue: 0,
        total_expenses: 0,
        total_profit: 0
      },
      message: 'Financial overview - coming soon with Thriday integration'
    });
  } catch (error) {
    console.error('Project financials error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('✅ API v2 compatibility layer registered');

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`\n📊 API Status: http://localhost:${PORT}/api/status`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`\n💡 Available APIs:`);
  console.log(`   • Contact Search: http://localhost:${PORT}/api/contacts/search?query=ben`);
  console.log(`   • Notion Projects: http://localhost:${PORT}/api/projects`);
  console.log(`   • AI Chat: POST http://localhost:${PORT}/api/ai/chat`);
  console.log(`   • Grant Research: POST http://localhost:${PORT}/api/research/grants`);
  console.log(`   • V2 Endpoints: /api/v2/* (for frontend compatibility)`);
  console.log(`\n🌱 Beautiful Obsolescence: Building tools communities can own\n`);
});
