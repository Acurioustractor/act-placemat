/**
 * Business Agent Australia API Routes
 *
 * Provides API endpoints for interacting with the always-on business intelligence agent
 */

import BusinessAgentAustralia from '../agents/businessAgentAustralia.js';

// Global agent instance (singleton)
let agentInstance = null;

/**
 * Get or create the agent instance
 */
function getAgentInstance() {
  if (!agentInstance) {
    agentInstance = new BusinessAgentAustralia({
      analysisIntervalMinutes: 60, // Run every hour
      enableComplianceMonitoring: true,
      enableGrantDiscovery: true,
      enableNotifications: true
    });
  }
  return agentInstance;
}

export const businessAgentAustraliaRoutes = (app) => {

  /**
   * Start the business agent
   * POST /api/v2/agents/business-australia/start
   */
  app.post('/api/v2/agents/business-australia/start', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const result = await agent.start();

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Agent start error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Stop the business agent
   * POST /api/v2/agents/business-australia/stop
   */
  app.post('/api/v2/agents/business-australia/stop', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const result = await agent.stop();

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Agent stop error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get agent status
   * GET /api/v2/agents/business-australia/status
   */
  app.get('/api/v2/agents/business-australia/status', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const status = await agent.getStatus();

      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      console.error('Agent status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Run immediate analysis
   * POST /api/v2/agents/business-australia/analyze
   */
  app.post('/api/v2/agents/business-australia/analyze', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const result = await agent.runContinuousAnalysis();

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Agent analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Generate morning intelligence brief
   * GET /api/v2/agents/business-australia/morning-brief
   */
  app.get('/api/v2/agents/business-australia/morning-brief', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const brief = await agent.generateMorningBrief();

      res.json({
        success: true,
        brief
      });
    } catch (error) {
      console.error('Morning brief error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get financial analysis
   * GET /api/v2/agents/business-australia/analyze/financial
   */
  app.get('/api/v2/agents/business-australia/analyze/financial', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const analysis = await agent.analyzeFinancials();

      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      console.error('Financial analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get compliance status
   * GET /api/v2/agents/business-australia/analyze/compliance
   */
  app.get('/api/v2/agents/business-australia/analyze/compliance', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const compliance = await agent.checkAustralianCompliance();

      res.json({
        success: true,
        compliance
      });
    } catch (error) {
      console.error('Compliance analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get grant opportunities
   * GET /api/v2/agents/business-australia/analyze/opportunities
   */
  app.get('/api/v2/agents/business-australia/analyze/opportunities', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const opportunities = await agent.scanGrantOpportunities();

      res.json({
        success: true,
        opportunities
      });
    } catch (error) {
      console.error('Opportunities scan error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get relationship intelligence
   * GET /api/v2/agents/business-australia/analyze/relationships
   */
  app.get('/api/v2/agents/business-australia/analyze/relationships', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const relationships = await agent.analyzeRelationships();

      res.json({
        success: true,
        relationships
      });
    } catch (error) {
      console.error('Relationships analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get project health
   * GET /api/v2/agents/business-australia/analyze/projects
   */
  app.get('/api/v2/agents/business-australia/analyze/projects', async (req, res) => {
    try {
      const agent = getAgentInstance();
      const projects = await agent.analyzeProjects();

      res.json({
        success: true,
        projects
      });
    } catch (error) {
      console.error('Projects analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  console.log('🇦🇺 Business Agent Australia API routes registered');
};

export default businessAgentAustraliaRoutes;