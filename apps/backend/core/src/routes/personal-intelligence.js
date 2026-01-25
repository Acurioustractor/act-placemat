/**
 * Personal Intelligence API Routes
 *
 * Unified endpoints for personal AI intelligence services:
 * - Mode detection (deep work, shallow work, recovery)
 * - Work recommendations
 * - Morning brief generation
 * - Follow-up detection
 * - Dashboard sync
 */

import { Router } from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import services
const { modeDetector } = require('../services/personal-intelligence/modeDetector.cjs');
const { workRecommender } = require('../services/personal-intelligence/workRecommender.cjs');
const { orchestrator } = require('../services/personal-intelligence/orchestrator.cjs');
const { ActionableBrief } = require('../services/personal-intelligence/actionableBrief.cjs');

const router = Router();

/**
 * GET /api/personal/health
 * Health check for personal intelligence services
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Personal Intelligence',
    timestamp: new Date().toISOString(),
    services: {
      modeDetector: !!modeDetector,
      workRecommender: !!workRecommender,
      orchestrator: !!orchestrator,
      actionableBrief: !!ActionableBrief,
    },
  });
});

/**
 * POST /api/personal/mode
 * Detect current work mode based on calendar, time, energy
 */
router.post('/mode', async (req, res) => {
  try {
    const { energyLevel, forceRefresh } = req.body || {};
    const mode = await modeDetector.detectMode({ energyLevel, forceRefresh });
    res.json(mode);
  } catch (error) {
    console.error('[Personal Intelligence] Mode detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personal/mode
 * Get current mode (simpler GET version)
 */
router.get('/mode', async (req, res) => {
  try {
    const mode = await modeDetector.detectMode();
    res.json(mode);
  } catch (error) {
    console.error('[Personal Intelligence] Mode detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personal/recommendations
 * Get prioritized work recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const mode = req.query.mode || null;
    const recommendations = await workRecommender.getRecommendations({ limit, mode });
    res.json(recommendations);
  } catch (error) {
    console.error('[Personal Intelligence] Recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/personal/brief
 * Generate morning brief with actionable insights
 */
router.post('/brief', async (req, res) => {
  try {
    const options = req.body || {};
    const brief = new ActionableBrief();
    const result = await brief.generate(options);
    res.json(result);
  } catch (error) {
    console.error('[Personal Intelligence] Brief generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personal/brief
 * Get morning brief (simpler GET version)
 */
router.get('/brief', async (req, res) => {
  try {
    const brief = new ActionableBrief();
    const result = await brief.generate();
    res.json(result);
  } catch (error) {
    console.error('[Personal Intelligence] Brief generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/personal/orchestrate
 * Run full intelligence orchestration
 */
router.post('/orchestrate', async (req, res) => {
  try {
    const options = req.body || {};
    const result = await orchestrator.orchestrate(options);
    res.json(result);
  } catch (error) {
    console.error('[Personal Intelligence] Orchestration error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
