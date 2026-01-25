/**
 * Agents API v1 - Proxy to Farmhand (ACT Personal AI)
 *
 * Exposes Farmhand's specialized AI agents ecosystem-wide:
 * - ALMA Agent: Pattern recognition, signal tracking, ethics checking
 * - Grant Agent: Grant research and opportunity discovery
 * - Impact Agent: SROI calculation and impact measurement
 * - Story Analysis Agent: Narrative analysis, evidence extraction
 * - Story Writing Agent: Editorial support, tone checking, refinement
 */

import { Router } from 'express';
import { apiResponse, apiError } from '../../middleware/validation.js';

const router = Router();

// Farmhand API configuration
const FARMHAND_API_URL = process.env.FARMHAND_API_URL || 'http://localhost:8000';
const FARMHAND_API_KEY = process.env.FARMHAND_API_KEY;

/**
 * Proxy helper - forwards requests to Farmhand API
 */
async function proxyToFarmhand(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (FARMHAND_API_KEY) {
    headers['Authorization'] = `Bearer ${FARMHAND_API_KEY}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${FARMHAND_API_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Farmhand API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================
// Health & Status
// ============================================

/**
 * GET /api/v1/agents/health
 * Check Farmhand API connectivity
 */
router.get('/health', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/health');
    return apiResponse(res, {
      farmhand: 'connected',
      ...data,
    });
  } catch (error) {
    return apiResponse(res, {
      farmhand: 'disconnected',
      error: error.message,
      hint: 'Ensure Farmhand API is running at ' + FARMHAND_API_URL,
    });
  }
});

/**
 * GET /api/v1/agents
 * List all available agents and their endpoints
 */
router.get('/', (req, res) => {
  return apiResponse(res, {
    agents: {
      alma: {
        description: 'Pattern recognition, signal tracking, ethics checking',
        endpoints: ['/agents/alma/signals', '/agents/alma/ethics'],
      },
      grants: {
        description: 'Grant research and opportunity discovery',
        endpoints: ['/agents/grants/opportunities'],
      },
      impact: {
        description: 'SROI calculation and impact measurement',
        endpoints: ['/agents/impact/sroi'],
      },
      story: {
        description: 'Story analysis and writing support',
        endpoints: [
          '/agents/story/analyze',
          '/agents/story/evolution',
          '/agents/story/evidence',
          '/agents/story/protocols',
          '/agents/story/refine',
          '/agents/story/titles',
          '/agents/story/tone',
          '/agents/story/questions',
          '/agents/story/summary',
        ],
      },
    },
    farmhandUrl: FARMHAND_API_URL,
    documentation: 'https://github.com/Acurioustractor/act-global-infrastructure/tree/main/act-personal-ai',
  });
});

// ============================================
// ALMA Agent - Pattern Recognition
// ============================================

/**
 * POST /api/v1/agents/alma/signals
 * Track signals in data for pattern recognition
 *
 * Body: { data: [...], signal_types: ["engagement", "opportunity", ...] }
 */
router.post('/alma/signals', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/alma/track-signals', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'ALMA_SIGNALS_ERROR' });
  }
});

/**
 * POST /api/v1/agents/alma/ethics
 * Check content for ethical alignment
 *
 * Body: { content: "...", context: {...} }
 */
router.post('/alma/ethics', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/alma/check-ethics', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'ALMA_ETHICS_ERROR' });
  }
});

// ============================================
// Grant Agent - Opportunity Discovery
// ============================================

/**
 * POST /api/v1/agents/grants/opportunities
 * Find grant opportunities matching criteria
 *
 * Body: { criteria: {...}, max_results: 10 }
 */
router.post('/grants/opportunities', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/grants/find-opportunities', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'GRANTS_SEARCH_ERROR' });
  }
});

// ============================================
// Impact Agent - SROI Calculation
// ============================================

/**
 * POST /api/v1/agents/impact/sroi
 * Calculate Social Return on Investment
 *
 * Body: { project: {...}, outcomes: [...], inputs: [...] }
 */
router.post('/impact/sroi', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/impact/calculate-sroi', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'IMPACT_SROI_ERROR' });
  }
});

// ============================================
// Story Analysis Agent
// ============================================

/**
 * POST /api/v1/agents/story/analyze
 * Analyze narrative structure
 *
 * Body: { story: {...}, analysis_type: "narrative" }
 */
router.post('/story/analyze', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/analyze-narrative', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_ANALYZE_ERROR' });
  }
});

/**
 * POST /api/v1/agents/story/evolution
 * Analyze story evolution over time
 */
router.post('/story/evolution', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/analyze-evolution', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_EVOLUTION_ERROR' });
  }
});

/**
 * POST /api/v1/agents/story/evidence
 * Extract evidence from story content
 */
router.post('/story/evidence', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/extract-evidence', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_EVIDENCE_ERROR' });
  }
});

/**
 * POST /api/v1/agents/story/protocols
 * Check cultural protocols compliance
 */
router.post('/story/protocols', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/check-protocols', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_PROTOCOLS_ERROR' });
  }
});

// ============================================
// Story Writing Agent
// ============================================

/**
 * POST /api/v1/agents/story/refine
 * Refine story draft with suggestions
 */
router.post('/story/refine', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/refine-draft', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_REFINE_ERROR' });
  }
});

/**
 * POST /api/v1/agents/story/titles
 * Generate title suggestions
 */
router.post('/story/titles', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/suggest-titles', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_TITLES_ERROR' });
  }
});

/**
 * POST /api/v1/agents/story/tone
 * Check and adjust tone
 */
router.post('/story/tone', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/check-tone', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_TONE_ERROR' });
  }
});

/**
 * POST /api/v1/agents/story/questions
 * Generate discussion questions
 */
router.post('/story/questions', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/discussion-questions', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_QUESTIONS_ERROR' });
  }
});

/**
 * POST /api/v1/agents/story/summary
 * Generate story summary
 */
router.post('/story/summary', async (req, res) => {
  try {
    const data = await proxyToFarmhand('/story/generate-summary', 'POST', req.body);
    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'STORY_SUMMARY_ERROR' });
  }
});

export default router;
