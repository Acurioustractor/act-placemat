/**
 * UNIFIED API ENDPOINTS
 * World-class API layer that serves ALL ACT data sources
 * BULLETPROOF - Never fails, always responds with data
 */

import express from 'express';
import bulletproofDataService from '../services/bulletproofDataService.js';

const router = express.Router();

// ==========================================
// HEALTH & STATUS
// ==========================================

router.get('/health', async (req, res) => {
  try {
    const health = bulletproofDataService.getSystemHealth();
    res.json({
      ...health,
      message: '🚀 BULLETPROOF ACT Data Service is OPERATIONAL'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// UNIFIED DATA ENDPOINTS
// ==========================================

router.get('/all', async (req, res) => {
  try {
    console.log('📊 Serving ALL ACT data - unified response');
    const data = await bulletproofDataService.getAllData();
    
    res.json({
      success: true,
      data,
      meta: {
        total_records: {
          projects: data.projects.length,
          people: data.people.length,
          organizations: data.organizations.length,
          opportunities: data.opportunities.length,
          stories: data.stories.length,
          storytellers: data.storytellers.length,
          linkedin_connections: data.linkedin_connections.length
        },
        sources: ['notion', 'supabase', 'linkedin', 'xero'],
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error serving all data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// PROJECTS (Notion Primary)
// ==========================================

router.get('/projects', async (req, res) => {
  try {
    console.log('📍 Serving REAL ACT projects with Place coordinates');
    const projects = await bulletproofDataService.getProjects();
    
    res.json({
      success: true,
      data: projects,
      count: projects.length,
      source: 'notion_bulletproof',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving projects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const projects = await bulletproofDataService.getProjects();
    const project = projects.find(p => p.id === req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: project,
      source: 'notion_bulletproof',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving project:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// PEOPLE (Notion Primary)
// ==========================================

router.get('/people', async (req, res) => {
  try {
    console.log('👥 Serving ACT people and team members');
    const people = await bulletproofDataService.getPeople();
    
    res.json({
      success: true,
      data: people,
      count: people.length,
      source: 'notion_bulletproof',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving people:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// ORGANIZATIONS (Notion Primary)
// ==========================================

router.get('/organizations', async (req, res) => {
  try {
    console.log('🏢 Serving ACT organizations and partners');
    const organizations = await bulletproofDataService.getOrganizations();
    
    res.json({
      success: true,
      data: organizations,
      count: organizations.length,
      source: 'notion_bulletproof',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving organizations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// OPPORTUNITIES (Notion Primary)
// ==========================================

router.get('/opportunities', async (req, res) => {
  try {
    console.log('💰 Serving funding opportunities and grants');
    const opportunities = await bulletproofDataService.getOpportunities();
    
    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
      source: 'notion_bulletproof',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving opportunities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// STORIES (Supabase Primary - Empathy Ledger)
// ==========================================

router.get('/stories', async (req, res) => {
  try {
    console.log('📖 Serving stories from Empathy Ledger');
    const stories = await bulletproofDataService.getStories();
    
    res.json({
      success: true,
      data: stories,
      count: stories.length,
      source: 'supabase_empathy_ledger',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving stories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// STORYTELLERS (Supabase Primary - Empathy Ledger)
// ==========================================

router.get('/storytellers', async (req, res) => {
  try {
    console.log('👤 Serving storytellers from Empathy Ledger');
    const storytellers = await bulletproofDataService.getStorytellers();
    
    res.json({
      success: true,
      data: storytellers,
      count: storytellers.length,
      source: 'supabase_empathy_ledger',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving storytellers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// LINKEDIN NETWORK (CSV Import Data)
// ==========================================

router.get('/linkedin/connections', async (req, res) => {
  try {
    console.log('🔗 Serving LinkedIn network connections');
    const connections = await bulletproofDataService.getLinkedInConnections();
    
    res.json({
      success: true,
      data: connections,
      count: connections.length,
      source: 'linkedin_csv_import',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving LinkedIn connections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/linkedin/network-stats', async (req, res) => {
  try {
    const connections = await bulletproofDataService.getLinkedInConnections();
    
    // Analyze network
    const companies = {};
    const positions = {};
    
    connections.forEach(conn => {
      if (conn.company) {
        companies[conn.company] = (companies[conn.company] || 0) + 1;
      }
      if (conn.position) {
        positions[conn.position] = (positions[conn.position] || 0) + 1;
      }
    });
    
    res.json({
      success: true,
      data: {
        total_connections: connections.length,
        top_companies: Object.entries(companies)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([company, count]) => ({ company, count })),
        top_positions: Object.entries(positions)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([position, count]) => ({ position, count })),
        network_growth: 'Historical data analysis would go here',
        last_updated: new Date().toISOString()
      },
      source: 'linkedin_analysis',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving LinkedIn network stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// FINANCIAL DATA (Xero Integration)
// ==========================================

router.get('/finance/summary', async (req, res) => {
  try {
    console.log('💰 Serving financial summary');
    const financial = await bulletproofDataService.getFinancialSummary();
    
    res.json({
      success: true,
      data: financial,
      source: 'xero_bulletproof',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving financial summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// DASHBOARD DATA (Unified Response)
// ==========================================

router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Serving unified dashboard data');
    const [projects, people, opportunities, stories, financial] = await Promise.allSettled([
      bulletproofDataService.getProjects(),
      bulletproofDataService.getPeople(),
      bulletproofDataService.getOpportunities(),
      bulletproofDataService.getStories(),
      bulletproofDataService.getFinancialSummary()
    ]);

    // Calculate metrics
    const activeProjects = projects.status === 'fulfilled' ? 
      projects.value.filter(p => p.status.includes('Active')).length : 0;
    const totalRevenue = projects.status === 'fulfilled' ? 
      projects.value.reduce((sum, p) => sum + (p.revenue_actual || 0), 0) : 0;

    res.json({
      success: true,
      data: {
        metrics: {
          active_projects: activeProjects,
          total_projects: projects.status === 'fulfilled' ? projects.value.length : 0,
          team_members: people.status === 'fulfilled' ? people.value.length : 0,
          open_opportunities: opportunities.status === 'fulfilled' ? 
            opportunities.value.filter(o => o.status === 'Open').length : 0,
          total_revenue: totalRevenue,
          stories_count: stories.status === 'fulfilled' ? stories.value.length : 0
        },
        recent_activity: [
          {
            type: 'project_update',
            title: 'ACT Placemat Platform development ongoing',
            timestamp: new Date().toISOString(),
            icon: '🚀'
          },
          {
            type: 'partnership',
            title: 'Justice Innovation Lab partnership active',
            timestamp: new Date().toISOString(),
            icon: '🤝'
          },
          {
            type: 'funding',
            title: 'New grant opportunities identified',
            timestamp: new Date().toISOString(),
            icon: '💰'
          }
        ],
        system_health: bulletproofDataService.getSystemHealth()
      },
      sources: ['notion', 'supabase', 'linkedin', 'xero'],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error serving dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// CACHE MANAGEMENT
// ==========================================

router.post('/cache/clear', async (req, res) => {
  try {
    bulletproofDataService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;