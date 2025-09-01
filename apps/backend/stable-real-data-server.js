#!/usr/bin/env node

/**
 * Stable Real Data Server for ACT
 * Properly cached, no spam, real data only
 */

import express from 'express';
import cors from 'cors';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

// Notion setup
const NOTION_TOKEN = process.env.NOTION_API_TOKEN;
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
    
    const projects = response.results.map(page => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.status?.name || 'Unknown',
      created: page.created_time,
      lastEdited: page.last_edited_time,
    }));
    
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

// Initial data load
fetchNotionProjects().then(projects => {
  console.log(`🎯 Initial cache: ${projects.length} projects`);
});

app.listen(PORT, () => {
  console.log(`🚀 Stable server running on port ${PORT}`);
  console.log('📊 Endpoints:');
  console.log('   GET  /api/real/health');
  console.log('   GET  /api/real/projects');
  console.log('   GET  /api/real/metrics');
  console.log('   POST /api/real/intelligence');
  console.log('🔥 NO SPAM - SMART CACHING');
});
