/**
 * Personal Intelligence API Routes
 *
 * API endpoints for personal productivity intelligence services.
 * Provides mode detection, work recommendations, and actionable briefs.
 *
 * Migrated from: act-personal-ai
 */

import { Router } from 'express';
import {
  orchestrator,
  modeDetector,
  workRecommender,
  ActionableBrief,
} from '../../services/personal-intelligence/index.js';

const router = Router();

/**
 * POST /api/v1/personal/brief
 * Generate a morning brief with actionable recommendations
 */
router.post('/brief', async (req, res) => {
  try {
    const { focus = 'morning-brief', userId } = req.body;

    const brief = new ActionableBrief();
    await brief.generateActions({ userId });

    res.json({
      success: true,
      data: brief.toJSON(),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Brief generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate brief',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/personal/recommend
 * Get work recommendations based on current context
 */
router.post('/recommend', async (req, res) => {
  try {
    const { userId, energyLevel, focus } = req.body;

    const recommendations = await workRecommender.getRecommendations({
      userId,
      energyLevel,
      focus,
    });

    res.json({
      success: true,
      data: recommendations,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/personal/mode
 * Get current work mode recommendation
 */
router.get('/mode', async (req, res) => {
  try {
    const { energyLevel } = req.query;

    const mode = await modeDetector.detectMode({
      energyLevel: energyLevel || undefined,
    });

    res.json({
      success: true,
      data: mode,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mode detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect mode',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/personal/mode/suggestions
 * Get mode suggestions for the day
 */
router.get('/mode/suggestions', async (req, res) => {
  try {
    const suggestions = await modeDetector.getDaySuggestions();

    res.json({
      success: true,
      data: suggestions,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mode suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mode suggestions',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/personal/analyze-patterns
 * Analyze work patterns for insights
 */
router.post('/analyze-patterns', async (req, res) => {
  try {
    const { userId, dateRange } = req.body;

    const analysis = await workRecommender.analyzePatterns({
      userId,
      dateRange,
    });

    res.json({
      success: true,
      data: analysis,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze patterns',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/personal/record-completion
 * Record a task completion for pattern learning
 */
router.post('/record-completion', async (req, res) => {
  try {
    const { taskType, duration, mode, energyBefore, energyAfter, userId } = req.body;

    const result = await workRecommender.recordCompletion({
      taskType,
      duration,
      mode,
      energyBefore,
      energyAfter,
      userId,
    });

    res.json({
      success: true,
      data: result,
      recorded_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Record completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record completion',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/personal/predictive
 * Get predictive context for current time
 */
router.get('/predictive', async (req, res) => {
  try {
    const context = await workRecommender.getPredictiveContext();

    res.json({
      success: true,
      data: context,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Predictive context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get predictive context',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/personal/moon
 * Get current moon phase and energy
 */
router.get('/moon', async (req, res) => {
  try {
    const moonPhase = modeDetector.getMoonPhase(new Date());

    res.json({
      success: true,
      data: moonPhase,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Moon phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get moon phase',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/personal/insights
 * Get unified insights from orchestrator
 */
router.post('/insights', async (req, res) => {
  try {
    const { focus = 'morning-brief', userId } = req.body;

    const insights = await orchestrator.getInsights({
      focus,
      userId,
    });

    res.json({
      success: true,
      data: insights,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get insights',
      message: error.message,
    });
  }
});

export default router;
