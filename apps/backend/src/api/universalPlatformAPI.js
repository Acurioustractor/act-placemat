/**
 * Universal Platform API
 * Central orchestration layer for all ACT platform services
 * Provides unified endpoints for the living brand experience
 */

import express from 'express';
import WebSocket from 'ws';
import notionSyncEngine from '../services/notionSyncEngine.js';
import intelligentInsightsEngine from '../services/intelligentInsightsEngine.js';
import UniversalIntelligenceOrchestrator from '../services/universalIntelligenceOrchestrator.js';
import MultiProviderAI from '../services/multiProviderAI.js';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

const router = express.Router();
const redis = new Redis();
const events = new EventEmitter();

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const universalIntelligence = new UniversalIntelligenceOrchestrator();
const multiAI = new MultiProviderAI();

// WebSocket connections for real-time updates
const wsClients = new Set();

/**
 * Initialize WebSocket server for real-time updates
 */
export function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/live'
  });
  
  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection established');
    wsClients.add(ws);
    
    // Register with Notion sync engine
    notionSyncEngine.registerWebSocket(ws);
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      services: {
        notion_sync: 'active',
        insights_engine: 'active',
        universal_intelligence: 'active'
      }
    }));
    
    // Handle client messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    // Clean up on disconnect
    ws.on('close', () => {
      wsClients.delete(ws);
      console.log('🔌 WebSocket connection closed');
    });
  });
  
  // Set up event listeners for broadcasting
  setupEventBroadcasting();
  
  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
async function handleWebSocketMessage(ws, data) {
  const { type, payload } = data;
  
  switch (type) {
    case 'subscribe':
      // Subscribe to specific event types
      ws.subscriptions = payload.events || ['all'];
      ws.send(JSON.stringify({
        type: 'subscribed',
        events: ws.subscriptions
      }));
      break;
      
    case 'request_insights':
      // Generate real-time insights
      const insights = await intelligentInsightsEngine.generateInsights(payload.timeRange || '7d');
      ws.send(JSON.stringify({
        type: 'insights_update',
        data: insights
      }));
      break;
      
    case 'request_status':
      // Send current system status
      const status = await getSystemStatus();
      ws.send(JSON.stringify({
        type: 'status_update',
        data: status
      }));
      break;
  }
}

/**
 * Set up event broadcasting for real-time updates
 */
function setupEventBroadcasting() {
  // Notion sync events
  notionSyncEngine.on('data-changed', (data) => {
    broadcastToClients({
      type: 'data_update',
      source: 'notion',
      data
    });
  });
  
  // Insights engine events
  intelligentInsightsEngine.on('insights-generated', (insights) => {
    broadcastToClients({
      type: 'insights_update',
      data: insights
    });
  });
  
  // Pattern detection events
  intelligentInsightsEngine.on('pattern-detected', (pattern) => {
    broadcastToClients({
      type: 'pattern_alert',
      data: pattern
    });
  });
}

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcastToClients(message) {
  const messageStr = JSON.stringify(message);
  
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      // Check if client is subscribed to this event type
      if (!ws.subscriptions || ws.subscriptions.includes('all') || 
          ws.subscriptions.includes(message.type)) {
        ws.send(messageStr);
      }
    }
  });
}

// ===== API ENDPOINTS =====

/**
 * GET /api/platform/brand-data
 * Get comprehensive brand data for living brand page
 */
router.get('/brand-data', async (req, res) => {
  try {
    const cacheKey = 'platform:brand-data';
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached && !req.query.force) {
      return res.json(JSON.parse(cached));
    }
    
    // Gather comprehensive brand data
    const [metrics, stories, projects, community, history] = await Promise.all([
      getImpactMetrics(),
      getLatestStories(),
      getActiveProjects(),
      getCommunityData(),
      getHistoricalEvents()
    ]);
    
    const brandData = {
      metrics,
      stories,
      projects,
      community,
      history,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache for 1 minute
    await redis.set(cacheKey, JSON.stringify(brandData), 'EX', 60);
    
    res.json(brandData);
  } catch (error) {
    console.error('Failed to get brand data:', error);
    res.status(500).json({ error: 'Failed to retrieve brand data' });
  }
});

/**
 * GET /api/platform/insights
 * Get AI-powered insights and predictions
 */
router.get('/insights', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '7d';
    const includePatterns = req.query.patterns !== 'false';
    const includePredictions = req.query.predictions !== 'false';
    
    const insights = await intelligentInsightsEngine.generateInsights(timeRange);
    
    const response = {
      insights,
      generated_at: new Date().toISOString(),
      time_range: timeRange,
      includes: {
        patterns: includePatterns,
        predictions: includePredictions
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to generate insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * POST /api/platform/sync
 * Trigger manual synchronization
 */
router.post('/sync', async (req, res) => {
  try {
    const { database, full = false } = req.body;
    
    if (database) {
      // Sync specific database
      const result = await notionSyncEngine.syncDatabase(database);
      res.json({
        success: true,
        database,
        items_synced: result.items_synced
      });
    } else if (full) {
      // Full sync
      await notionSyncEngine.performFullSync();
      res.json({
        success: true,
        type: 'full_sync',
        message: 'Full synchronization initiated'
      });
    } else {
      // Incremental sync
      await notionSyncEngine.performIncrementalSync();
      res.json({
        success: true,
        type: 'incremental_sync',
        message: 'Incremental synchronization completed'
      });
    }
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ error: 'Synchronization failed' });
  }
});

/**
 * GET /api/platform/status
 * Get comprehensive system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get system status:', error);
    res.status(500).json({ error: 'Failed to retrieve system status' });
  }
});

/**
 * GET /api/universal-platform/health
 * Get comprehensive system health (alias for status)
 */
router.get('/health', async (req, res) => {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get system health:', error);
    res.status(500).json({ error: 'Failed to retrieve system health' });
  }
});

/**
 * POST /api/platform/generate-content
 * Generate AI-powered content
 */
router.post('/generate-content', async (req, res) => {
  try {
    const { type, context, options = {} } = req.body;
    
    let prompt = '';
    let systemPrompt = '';
    
    switch (type) {
      case 'weekly_update':
        const weeklyData = await gatherWeeklyData();
        prompt = `Generate an inspiring weekly update for ACT community based on:
          - ${weeklyData.newStories} new stories collected
          - ${weeklyData.projectMilestones} project milestones reached
          - ${weeklyData.peopleImpacted} people impacted
          - Key highlights: ${weeklyData.highlights.join(', ')}
          
          Make it engaging, celebratory, and forward-looking.`;
        systemPrompt = 'You are ACT\'s community engagement specialist writing weekly updates';
        break;
        
      case 'impact_report':
        const impactData = await gatherImpactData(context.timeframe);
        prompt = `Generate a comprehensive impact report covering:
          - Total impact: ${impactData.totalImpact} people
          - Stories collected: ${impactData.stories}
          - Projects completed: ${impactData.projectsCompleted}
          - Key achievements: ${impactData.achievements.join(', ')}
          
          Include executive summary, key metrics, success stories, and future outlook.`;
        systemPrompt = 'You are writing a professional impact report for stakeholders';
        break;
        
      case 'social_post':
        prompt = `Create engaging social media content about: ${context.story || context.topic}
          
          Generate versions for:
          - Twitter (280 chars max)
          - LinkedIn (professional tone)
          - Instagram (engaging caption with emoji)`;
        systemPrompt = 'You are a social media content creator for a social impact organization';
        break;
        
      case 'story_enhancement':
        prompt = `Enhance this story while maintaining authenticity:
          Original: ${context.story}
          
          Add narrative structure, emotional depth, and vivid descriptions.`;
        systemPrompt = 'You are a sensitive story editor preserving authentic voices';
        break;
        
      default:
        prompt = context.prompt || 'Generate engaging content for ACT community';
        systemPrompt = context.systemPrompt || 'You are ACT\'s content creator';
    }
    
    // Generate content using multi-provider AI
    const result = await multiAI.generateResponse(prompt, {
      systemPrompt,
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      preferQuality: true
    });
    
    res.json({
      type,
      content: result.response,
      provider: result.provider,
      model: result.model,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Content generation failed:', error);
    res.status(500).json({ error: 'Content generation failed' });
  }
});

/**
 * GET /api/platform/predictions
 * Get predictive analytics
 */
router.get('/predictions', async (req, res) => {
  try {
    const predictions = await intelligentInsightsEngine.generatePredictions();
    const trajectories = await intelligentInsightsEngine.predictGrowthTrajectories();
    
    res.json({
      predictions,
      growth_trajectories: trajectories,
      confidence_scores: predictions.map(p => ({
        type: p.type,
        confidence: p.confidence
      })),
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Prediction generation failed:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

/**
 * GET /api/platform/network-analysis
 * Get network effects analysis
 */
router.get('/network-analysis', async (req, res) => {
  try {
    const analysis = await intelligentInsightsEngine.analyzeNetworkEffects();
    
    res.json({
      network_metrics: {
        density: analysis.network_density,
        clustering: analysis.clustering_coefficient,
        growth_potential: analysis.growth_potential
      },
      key_connectors: analysis.key_connectors,
      collaboration_clusters: analysis.collaboration_clusters,
      insights: analysis.insights,
      visualization_data: {
        nodes: analysis.network_nodes,
        edges: analysis.network_edges
      }
    });
  } catch (error) {
    console.error('Network analysis failed:', error);
    res.status(500).json({ error: 'Network analysis failed' });
  }
});

/**
 * GET /api/platform/collaboration-opportunities
 * Get AI-identified collaboration opportunities
 */
router.get('/collaboration-opportunities', async (req, res) => {
  try {
    const opportunities = await intelligentInsightsEngine.identifyCollaborationOpportunities();
    
    res.json({
      opportunities,
      total_opportunities: opportunities.length,
      by_type: {
        skill_match: opportunities.filter(o => o.type === 'skill_match').length,
        interest_cluster: opportunities.filter(o => o.type === 'interest_cluster').length
      },
      high_priority: opportunities.filter(o => o.priority === 'high'),
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to identify collaboration opportunities:', error);
    res.status(500).json({ error: 'Failed to identify opportunities' });
  }
});

/**
 * POST /api/platform/notion-webhook
 * Handle Notion webhook events (when available)
 */
router.post('/notion-webhook', async (req, res) => {
  try {
    const result = await notionSyncEngine.handleWebhook(req.body);
    res.json(result);
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ===== Helper Functions =====

async function getImpactMetrics() {
  const { data: projects } = await supabase
    .from('projects')
    .select('metrics')
    .eq('status', 'active');
  
  const { data: stories } = await supabase
    .from('stories')
    .select('id');
  
  const { data: people } = await supabase
    .from('people')
    .select('id');
  
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id')
    .eq('partnership_status', 'active');
  
  const totalPeopleImpacted = projects.reduce((sum, p) => 
    sum + (p.metrics?.people_impacted || 0), 0
  );
  
  return {
    totalPeopleImpacted,
    activeProjects: projects.length,
    storiesCollected: stories?.length || 0,
    communitiesEngaged: organizations?.length || 0,
    totalCommunityMembers: people?.length || 0,
    lastUpdated: new Date()
  };
}

async function getLatestStories() {
  const { data: stories } = await supabase
    .from('stories')
    .select(`
      *,
      storyteller:people(full_name, location)
    `)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(10);
  
  return stories?.map(story => ({
    id: story.id,
    title: story.title,
    storyteller: story.storyteller?.full_name || 'Anonymous',
    content: story.content?.substring(0, 500) + '...',
    location: story.storyteller?.location || story.location,
    themes: story.themes || [],
    media: story.media_urls?.[0] ? {
      type: 'image',
      url: story.media_urls[0]
    } : null,
    impact: {
      views: story.impact_metrics?.views || 0,
      shares: story.impact_metrics?.shares || 0
    },
    date: story.created_at
  })) || [];
}

async function getActiveProjects() {
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      team:people(id, full_name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(9);
  
  return projects?.map(project => ({
    id: project.id,
    name: project.title,
    status: project.status,
    impact: project.description?.substring(0, 100) + '...',
    team: project.team?.map(p => p.full_name) || [],
    progress: calculateProjectProgress(project),
    startDate: project.start_date,
    endDate: project.end_date,
    location: project.location || 'National',
    metrics: project.metrics
  })) || [];
}

async function getCommunityData() {
  const { data: people } = await supabase
    .from('people')
    .select('id, full_name, role, organization')
    .limit(100);
  
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, type')
    .limit(50);
  
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, team')
    .limit(50);
  
  // Build network nodes
  const nodes = [
    ...people.map(p => ({
      id: `person-${p.id}`,
      name: p.full_name,
      type: 'person',
      size: 10
    })),
    ...organizations.map(o => ({
      id: `org-${o.id}`,
      name: o.name,
      type: 'organization',
      size: 20
    })),
    ...projects.map(p => ({
      id: `project-${p.id}`,
      name: p.title,
      type: 'project',
      size: 15
    }))
  ];
  
  return nodes;
}

async function getHistoricalEvents() {
  const { data: snapshots } = await supabase
    .from('notion_history')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);
  
  const events = snapshots?.map(snapshot => ({
    date: new Date(snapshot.timestamp).toLocaleDateString(),
    title: `${snapshot.database} Update`,
    description: `Changes recorded in ${snapshot.database}`,
    type: 'update',
    significance: 0.5
  })) || [];
  
  // Add milestone events
  const { data: milestones } = await supabase
    .from('project_milestones')
    .select('*')
    .order('date', { ascending: false })
    .limit(5);
  
  if (milestones) {
    events.push(...milestones.map(m => ({
      date: new Date(m.date).toLocaleDateString(),
      title: m.title,
      description: m.description,
      type: 'milestone',
      significance: 0.8
    })));
  }
  
  return events.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function getSystemStatus() {
  const [syncStatus, aiStatus, cacheStatus] = await Promise.all([
    notionSyncEngine.getSyncStatus(),
    multiAI.getProviderStatus(),
    getCacheStatus()
  ]);
  
  const { data: dbStatus } = await supabase
    .from('people')
    .select('count')
    .single();
  
  return {
    services: {
      notion_sync: syncStatus,
      ai_providers: aiStatus,
      cache: cacheStatus,
      database: dbStatus ? 'healthy' : 'degraded'
    },
    websocket_connections: wsClients.size,
    timestamp: new Date().toISOString()
  };
}

async function getCacheStatus() {
  try {
    const info = await redis.info('stats');
    const hitRate = parseFloat(info.match(/keyspace_hits:(\d+)/)?.[1] || 0) /
                   (parseFloat(info.match(/keyspace_hits:(\d+)/)?.[1] || 0) +
                    parseFloat(info.match(/keyspace_misses:(\d+)/)?.[1] || 1));
    
    return {
      status: 'healthy',
      hit_rate: (hitRate * 100).toFixed(2) + '%',
      memory_usage: info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

async function gatherWeeklyData() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const { data: stories } = await supabase
    .from('stories')
    .select('id')
    .gte('created_at', weekAgo.toISOString());
  
  const { data: milestones } = await supabase
    .from('project_milestones')
    .select('*')
    .gte('date', weekAgo.toISOString());
  
  const { data: projects } = await supabase
    .from('projects')
    .select('metrics');
  
  const weeklyImpact = projects.reduce((sum, p) => 
    sum + (p.metrics?.weekly_impact || 0), 0
  );
  
  return {
    newStories: stories?.length || 0,
    projectMilestones: milestones?.length || 0,
    peopleImpacted: weeklyImpact,
    highlights: milestones?.slice(0, 3).map(m => m.title) || []
  };
}

async function gatherImpactData(timeframe = '30d') {
  const days = parseInt(timeframe) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .gte('created_at', startDate.toISOString());
  
  const { data: stories } = await supabase
    .from('stories')
    .select('*')
    .gte('created_at', startDate.toISOString());
  
  const completedProjects = projects?.filter(p => p.status === 'completed') || [];
  const totalImpact = projects?.reduce((sum, p) => 
    sum + (p.metrics?.people_impacted || 0), 0
  ) || 0;
  
  return {
    totalImpact,
    stories: stories?.length || 0,
    projectsCompleted: completedProjects.length,
    achievements: completedProjects.slice(0, 5).map(p => p.title)
  };
}

function calculateProjectProgress(project) {
  if (!project.start_date) return 0;
  
  const start = new Date(project.start_date);
  const end = project.end_date ? new Date(project.end_date) : new Date();
  const now = new Date();
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const total = end - start;
  const elapsed = now - start;
  
  return Math.round((elapsed / total) * 100);
}

export default router;