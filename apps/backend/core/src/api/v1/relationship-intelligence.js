/**
 * Relationship Intelligence API Routes
 *
 * API endpoints for relationship management and communication intelligence services.
 * Provides follow-up detection, entity resolution, threshold learning,
 * communication planning, and project intelligence.
 *
 * Migrated from: act-personal-ai/services/
 */

import { Router } from 'express';
import { createRequire } from 'module';

// Use createRequire for CommonJS modules
const require = createRequire(import.meta.url);
const {
  followupDetector,
  entityResolver,
  thresholdLearner,
  communicationPlanner,
  projectIntelligence,
} = require('../../services/relationship-intelligence/index.js');

const router = Router();

// =============================================================================
// Follow-up Detection Routes
// =============================================================================

/**
 * GET /api/v1/relationships/followups
 * Get all contacts needing follow-up
 */
router.get('/followups', async (req, res) => {
  try {
    const { urgentOnly, contactId } = req.query;

    const { followups, stats } = await followupDetector.detectAll({
      urgentOnly: urgentOnly === 'true',
      contactId: contactId || null,
    });

    res.json({
      success: true,
      data: {
        followups,
        stats,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Follow-up detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect follow-ups',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/health/:contactId
 * Get health score for a specific contact
 */
router.get('/health/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    const health = await followupDetector.getContactHealth(contactId);

    if (health.error) {
      return res.status(404).json({
        success: false,
        error: health.error,
      });
    }

    res.json({
      success: true,
      data: health,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Contact health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contact health',
      message: error.message,
    });
  }
});

// =============================================================================
// Entity Resolution Routes
// =============================================================================

/**
 * POST /api/v1/relationships/resolve
 * Resolve an entity (email, name) to canonical record
 */
router.post('/resolve', async (req, res) => {
  try {
    const { identifier, sourceSystem, sourceId, firstName, lastName, company, createIfMissing } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: identifier',
      });
    }

    const { entity, created, matchType, sources } = await entityResolver.resolveEntity(identifier, {
      sourceSystem,
      sourceId,
      firstName,
      lastName,
      company,
      createIfMissing: createIfMissing !== false,
    });

    res.json({
      success: true,
      data: {
        entity,
        created,
        matchType,
        sources,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Entity resolution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve entity',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/entities/stats
 * Get entity resolution statistics
 */
router.get('/entities/stats', async (req, res) => {
  try {
    const stats = await entityResolver.getEntityStats();

    res.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Entity stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get entity stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/entities/:id/timeline
 * Get engagement timeline for an entity
 */
router.get('/entities/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const timeline = await entityResolver.getEngagementTimeline(id, {
      limit: limit ? parseInt(limit, 10) : 50,
    });

    res.json({
      success: true,
      data: timeline,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Entity timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get entity timeline',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/entities/:id/strength
 * Get relationship strength for an entity
 */
router.get('/entities/:id/strength', async (req, res) => {
  try {
    const { id } = req.params;

    const strength = await entityResolver.getRelationshipStrength(id);

    res.json({
      success: true,
      data: strength,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Relationship strength error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get relationship strength',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/relationships/entities/sync-ghl
 * Sync GHL contacts to entity system
 */
router.post('/entities/sync-ghl', async (req, res) => {
  try {
    const { limit } = req.body;

    const result = await entityResolver.syncGHLContacts({
      limit: limit || 100,
    });

    res.json({
      success: true,
      data: result,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GHL sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync GHL contacts',
      message: error.message,
    });
  }
});

// =============================================================================
// Threshold Learning Routes
// =============================================================================

/**
 * GET /api/v1/relationships/thresholds
 * Get all learned thresholds
 */
router.get('/thresholds', async (req, res) => {
  try {
    const { type, segment } = req.query;

    if (type && segment) {
      const threshold = await thresholdLearner.getThreshold(type, segment);
      return res.json({
        success: true,
        data: threshold,
        generated_at: new Date().toISOString(),
      });
    }

    const stats = await thresholdLearner.getStats();

    res.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Threshold error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get thresholds',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/relationships/thresholds/learn
 * Record an observation for threshold learning
 */
router.post('/thresholds/learn', async (req, res) => {
  try {
    const { type, segment, observedValue, outcome } = req.body;

    if (!type || !segment || observedValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, segment, observedValue',
      });
    }

    const result = await thresholdLearner.recordObservation({
      type,
      segment,
      observedValue,
      outcome: outcome || 'success',
    });

    res.json({
      success: true,
      data: result,
      recorded_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Threshold learning error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record observation',
      message: error.message,
    });
  }
});

// =============================================================================
// Communication Planning Routes
// =============================================================================

/**
 * GET /api/v1/relationships/communication-plan
 * Generate weekly communication plan
 */
router.get('/communication-plan', async (req, res) => {
  try {
    const plan = await communicationPlanner.generateWeeklyPlan();

    res.json({
      success: true,
      data: plan,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Communication plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate communication plan',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/outreach
 * Get contacts needing outreach (contact-focused view)
 */
router.get('/outreach', async (req, res) => {
  try {
    const contacts = await communicationPlanner.getContactsNeedingOutreach();

    res.json({
      success: true,
      data: contacts,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Outreach error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get outreach contacts',
      message: error.message,
    });
  }
});

// =============================================================================
// Project Intelligence Routes
// =============================================================================

/**
 * GET /api/v1/relationships/projects
 * Get all projects with health scores
 */
router.get('/projects', async (req, res) => {
  try {
    const { forceRefresh, withActions } = req.query;

    let projects;
    if (withActions === 'true') {
      projects = await projectIntelligence.getProjectsWithActions();
    } else {
      projects = await projectIntelligence.getProjectsWithHealth(forceRefresh === 'true');
    }

    res.json({
      success: true,
      data: {
        projects,
        count: projects.length,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get projects',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/projects/stats
 * Get project summary statistics
 */
router.get('/projects/stats', async (req, res) => {
  try {
    const stats = await projectIntelligence.getProjectStats();

    res.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Project stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/projects/:name
 * Get single project by name with full details
 */
router.get('/projects/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const project = await projectIntelligence.getProjectByName(decodeURIComponent(name));

    if (project.error) {
      return res.status(404).json({
        success: false,
        error: project.error,
      });
    }

    res.json({
      success: true,
      data: project,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/relationships/pipeline
 * Get pipeline analysis with contacts mapped to stages
 */
router.get('/pipeline', async (req, res) => {
  try {
    const analysis = await projectIntelligence.getProjectPipelineAnalysis();

    res.json({
      success: true,
      data: analysis,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pipeline analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pipeline analysis',
      message: error.message,
    });
  }
});

export default router;
