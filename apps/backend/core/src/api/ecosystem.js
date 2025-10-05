/**
 * ACT Ecosystem API Endpoint
 * 
 * Provides enhanced ecosystem data with ACT philosophy integration
 * Features: Real-time Notion data, community scoring, relationship mapping
 */

import express from 'express';
import ecosystemEnrichmentService from '../services/ecosystemEnrichmentService.js';
import { notionService } from '../services/notionService.js';
import { logger } from '../utils/logger.js';
import { unifiedEcosystemSyncService } from '../services/unifiedEcosystemSyncService.js';

const router = express.Router();

/**
 * GET /api/ecosystem/enhanced
 * Returns enriched ecosystem data with ACT philosophy scoring
 */
router.get('/enhanced', async (req, res) => {
    try {
        logger.info('Fetching enhanced ecosystem data');
        
        // Fetch raw data from Notion
        const [projects, opportunities, organizations, people] = await Promise.all([
            notionService.getProjects(),
            notionService.getOpportunities(), 
            notionService.getOrganizations(),
            notionService.getPeople()
        ]);

        const rawData = {
            projects,
            opportunities,
            organizations,
            people
        };

        // Enrich with ACT philosophy and community insights
        const enrichedData = await ecosystemEnrichmentService.enrichEcosystemData(rawData);

        res.json({
            success: true,
            data: enrichedData,
            timestamp: new Date().toISOString(),
            source: 'notion-enhanced'
        });

    } catch (error) {
        logger.error('Enhanced ecosystem fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enhanced ecosystem data',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/ecosystem/insights
 * Returns ecosystem insights and patterns
 */
router.get('/insights', async (req, res) => {
    try {
        // Fetch and analyze data for insights
        const rawData = {
            projects: await notionService.getProjects(),
            opportunities: await notionService.getOpportunities(),
            organizations: await notionService.getOrganizations()
        };

        const insights = await ecosystemEnrichmentService.generateEcosystemInsights(rawData);

        res.json({
            success: true,
            insights,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Ecosystem insights generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate ecosystem insights'
        });
    }
});

/**
 * POST /api/ecosystem/feedback
 * Accept community feedback for data enhancement
 */
router.post('/feedback', async (req, res) => {
    try {
        const { entityId, field, score, confidence, source, comments } = req.body;

        if (!entityId || !field || score === undefined || !confidence) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: entityId, field, score, confidence'
            });
        }

        await ecosystemEnrichmentService.submitCommunityFeedback(
            entityId, 
            field, 
            score, 
            confidence, 
            source || 'community',
            comments
        );

        res.json({
            success: true,
            message: 'Community feedback submitted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Community feedback submission failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit community feedback'
        });
    }
});

/**
 * GET /api/ecosystem/health
 * Returns ecosystem data health and quality metrics
 */
router.get('/health', async (req, res) => {
    try {
        const rawData = {
            projects: await notionService.getProjects(),
            opportunities: await notionService.getOpportunities(),
            organizations: await notionService.getOrganizations(),
            people: await notionService.getPeople()
        };

        const dataQuality = await ecosystemEnrichmentService.assessDataQuality(rawData);

        res.json({
            success: true,
            health: {
                dataQuality: Math.round(dataQuality * 100),
                totalProjects: rawData.projects.length,
                totalOpportunities: rawData.opportunities.length,
                totalOrganizations: rawData.organizations.length,
                totalPeople: rawData.people.length,
                lastSync: new Date().toISOString(),
                status: dataQuality > 0.7 ? 'healthy' : dataQuality > 0.4 ? 'fair' : 'needs-attention'
            }
        });

    } catch (error) {
        logger.error('Ecosystem health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assess ecosystem health'
        });
    }
});

/**
 * GET /api/ecosystem/unified
 * Returns unified ecosystem data from all ACT systems
 */
router.get('/unified', async (req, res) => {
    try {
        logger.info('Performing unified ecosystem sync');
        
        const unifiedData = await unifiedEcosystemSyncService.performUnifiedSync();
        
        res.json({
            success: true,
            data: unifiedData,
            timestamp: new Date().toISOString(),
            source: 'unified-ecosystem'
        });

    } catch (error) {
        logger.error('Unified ecosystem sync failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform unified ecosystem sync',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/ecosystem/simple
 * Returns simple methodical sync for easy frontend consumption
 */
router.get('/simple', async (req, res) => {
    try {
        logger.info('Performing simple methodical ecosystem sync');
        
        const simpleData = await unifiedEcosystemSyncService.performSimpleMethodicalSync();
        
        // Extract just the final unified data for frontend
        const frontendData = simpleData.final_data;
        
        res.json({
            success: true,
            data: frontendData,
            sync_methodology: 'simple_methodical',
            sync_steps_completed: simpleData.successful_steps,
            ecosystem_harmony: simpleData.ecosystem_harmony_achieved,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Simple ecosystem sync failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform simple ecosystem sync',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/ecosystem/dashboard
 * Returns optimized data for frontend dashboard consumption
 */
router.get('/dashboard', async (req, res) => {
    try {
        logger.info('Generating unified dashboard data');
        
        // Perform full sync and extract dashboard data
        const syncResult = await unifiedEcosystemSyncService.performUnifiedSync();
        const dashboardData = await unifiedEcosystemSyncService.generateUnifiedDashboardData(syncResult);
        
        res.json({
            success: true,
            data: dashboardData.dashboard_data,
            data_freshness: dashboardData.data_freshness,
            simplified_for_frontend: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Dashboard data generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate dashboard data',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/ecosystem/health/all
 * Returns health status of all ecosystem components
 */
router.get('/health/all', async (req, res) => {
    try {
        const componentHealth = await unifiedEcosystemSyncService.checkAllComponentHealth();
        
        res.json({
            success: true,
            health: componentHealth,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('All component health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check ecosystem component health',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/ecosystem/value-event
 * Create a new value generation event
 */
router.post('/value-event', async (req, res) => {
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

        // Create value event using unifiedEcosystemSyncService
        const valueEvent = await unifiedEcosystemSyncService.createValueGenerationEvent({
            community_id,
            event_type,
            event_description,
            value_dimensions,
            total_value_generated,
            monetary_value: value_dimensions.monetary || total_value_generated * 0.6,
            social_impact_value: value_dimensions.social || total_value_generated * 0.25,
            cultural_preservation_value: value_dimensions.cultural || total_value_generated * 0.15
        });

        res.json({
            success: true,
            data: valueEvent,
            community_benefit_amount: total_value_generated * 0.40,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Value event creation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create value generation event',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/ecosystem/community/:id/metrics
 * Get comprehensive metrics for a specific community
 */
router.get('/community/:id/metrics', async (req, res) => {
    try {
        const { id: communityId } = req.params;
        
        const metrics = await unifiedEcosystemSyncService.getCommunityEcosystemMetrics(communityId);
        
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Community metrics fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch community metrics',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/ecosystem/governance/decision
 * Create a new governance decision
 */
router.post('/governance/decision', async (req, res) => {
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

        const governanceDecision = await unifiedEcosystemSyncService.createGovernanceDecision({
            community_id,
            decision_type,
            decision_title,
            decision_description,
            governance_model_used,
            voting_method,
            cultural_consultation_required: true,
            participation_requirement: 0.60
        });

        res.json({
            success: true,
            data: governanceDecision,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Governance decision creation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create governance decision',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/ecosystem/sync/status
 * Get current synchronization status across all systems
 */
router.get('/sync/status', async (req, res) => {
    try {
        const syncStatus = await unifiedEcosystemSyncService.getSyncStatus();
        
        res.json({
            success: true,
            data: syncStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Sync status fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sync status',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/ecosystem/sync/trigger
 * Manually trigger ecosystem synchronization
 */
router.post('/sync/trigger', async (req, res) => {
    try {
        const { sync_type = 'unified', priority = 'normal' } = req.body;
        
        const syncResult = await unifiedEcosystemSyncService.triggerManualSync(sync_type, priority);
        
        res.json({
            success: true,
            data: syncResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Manual sync trigger failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger manual synchronization',
            timestamp: new Date().toISOString()
        });
    }
});

export default router;