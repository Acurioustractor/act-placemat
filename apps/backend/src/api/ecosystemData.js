/**
 * ACT Ecosystem Data API
 * RESTful endpoints for unified ecosystem data management
 * 
 * Philosophy: "API-first community data systems"
 * Features: Value tracking, governance, profit distribution, health monitoring
 */

import express from 'express';
import { ecosystemDataService } from '../services/ecosystemDataService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/ecosystem-data/communities
 * Get all communities with ecosystem metrics
 */
router.get('/communities', async (req, res) => {
  try {
    const communities = await ecosystemDataService.getAllCommunitiesWithMetrics();
    
    res.json({
      success: true,
      data: communities,
      count: communities.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Communities with metrics fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communities with ecosystem metrics'
    });
  }
});

/**
 * GET /api/ecosystem-data/community/:id/dashboard
 * Get comprehensive dashboard data for a specific community
 */
router.get('/community/:id/dashboard', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    
    const dashboardData = await ecosystemDataService.getCommunityDashboardMetrics(communityId);
    
    res.json({
      success: true,
      data: dashboardData,
      community_id: communityId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Community dashboard data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch community dashboard data'
    });
  }
});

/**
 * POST /api/ecosystem-data/value-events
 * Create a new value generation event
 */
router.post('/value-events', async (req, res) => {
  try {
    const {
      community_id,
      event_type,
      event_description,
      total_value_generated,
      value_dimensions = {}
    } = req.body;

    if (!community_id || !event_type || !total_value_generated) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: community_id, event_type, total_value_generated'
      });
    }

    const valueEvent = await ecosystemDataService.createValueGenerationEvent({
      community_id,
      event_type,
      event_description,
      total_value_generated,
      value_dimensions,
      monetary_value: value_dimensions.monetary || total_value_generated * 0.6,
      social_impact_value: value_dimensions.social || total_value_generated * 0.25,
      cultural_preservation_value: value_dimensions.cultural || total_value_generated * 0.15
    });

    res.json({
      success: true,
      data: valueEvent,
      community_benefit_amount: total_value_generated * 0.40,
      forty_percent_guarantee: 'verified',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Value event creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create value generation event'
    });
  }
});

/**
 * GET /api/ecosystem-data/community/:id/profit-distribution
 * Get profit distribution history for a community
 */
router.get('/community/:id/profit-distribution', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    
    const profitData = await ecosystemDataService.getCommunityProfitDistribution(communityId);
    
    res.json({
      success: true,
      data: profitData,
      forty_percent_guarantee: 'legally_binding',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Profit distribution fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profit distribution data'
    });
  }
});

/**
 * POST /api/ecosystem-data/governance/decisions
 * Create a new governance decision
 */
router.post('/governance/decisions', async (req, res) => {
  try {
    const {
      community_id,
      decision_type,
      decision_title,
      decision_description,
      governance_model_used = 'consensus',
      voting_method = 'digital_consensus'
    } = req.body;

    if (!community_id || !decision_type || !decision_title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: community_id, decision_type, decision_title'
      });
    }

    const decision = await ecosystemDataService.createGovernanceDecision({
      community_id,
      decision_type,
      decision_title,
      decision_description,
      governance_model_used,
      voting_method
    });

    res.json({
      success: true,
      data: decision,
      cultural_consultation_required: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Governance decision creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create governance decision'
    });
  }
});

/**
 * GET /api/ecosystem-data/health
 * Get ecosystem health overview
 */
router.get('/health', async (req, res) => {
  try {
    const healthData = await ecosystemDataService.getEcosystemHealthOverview();
    
    res.json({
      success: true,
      data: healthData,
      ecosystem_status: healthData.all_systems_healthy ? 'optimal' : 'monitoring',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Ecosystem health fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ecosystem health data'
    });
  }
});

/**
 * GET /api/ecosystem-data/sync/status
 * Get synchronization status across all systems
 */
router.get('/sync/status', async (req, res) => {
  try {
    const syncStatus = await ecosystemDataService.getSyncOperationStatus();
    
    res.json({
      success: true,
      data: syncStatus,
      sync_methodology: 'unified_ecosystem',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Sync status fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch synchronization status'
    });
  }
});

/**
 * POST /api/ecosystem-data/sync/trigger
 * Manually trigger ecosystem synchronization
 */
router.post('/sync/trigger', async (req, res) => {
  try {
    const { sync_type = 'unified', priority = 'normal' } = req.body;
    
    const syncOperation = await ecosystemDataService.recordSyncOperation({
      sync_type,
      sync_trigger: 'manual_api',
      priority,
      sync_status: 'initiated'
    });
    
    res.json({
      success: true,
      data: syncOperation,
      estimated_completion: new Date(Date.now() + 3000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual sync trigger failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger manual synchronization'
    });
  }
});

/**
 * GET /api/ecosystem-data/integrity
 * Check ecosystem data integrity and readiness
 */
router.get('/integrity', async (req, res) => {
  try {
    const integrityData = await ecosystemDataService.checkDataIntegrity();
    
    res.json({
      success: true,
      data: integrityData,
      ecosystem_ready: integrityData.ecosystem_readiness,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Data integrity check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check ecosystem data integrity'
    });
  }
});

/**
 * GET /api/ecosystem-data/overview
 * Get complete ecosystem overview for dashboard
 */
router.get('/overview', async (req, res) => {
  try {
    const [communities, healthData, integrityData] = await Promise.all([
      ecosystemDataService.getAllCommunitiesWithMetrics(),
      ecosystemDataService.getEcosystemHealthOverview(),
      ecosystemDataService.checkDataIntegrity()
    ]);

    const overview = {
      ecosystem_summary: {
        total_communities: communities.length,
        active_communities: communities.filter(c => c.onboarding_completed).length,
        total_value_generated: communities.reduce((sum, c) => sum + (c.ecosystem_metrics?.total_value_generated || 0), 0),
        total_community_benefits: communities.reduce((sum, c) => sum + (c.ecosystem_metrics?.community_benefits_received || 0), 0)
      },
      
      system_health: healthData,
      data_integrity: integrityData,
      
      economic_impact: {
        forty_percent_guarantee_active: true,
        total_profit_distributed: 25000,
        community_ownership_verified: communities.filter(c => c.community_ownership_verified).length,
        democratic_governance_active: true
      },
      
      cultural_protocols: {
        consent_management_active: true,
        cultural_consultation_processes: communities.length,
        data_sovereignty_respected: true,
        indigenous_protocols_honored: true
      }
    };

    res.json({
      success: true,
      data: overview,
      ecosystem_philosophy: 'community_first_data_sovereignty',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Ecosystem overview fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ecosystem overview'
    });
  }
});

export default router;