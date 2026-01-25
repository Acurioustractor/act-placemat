/**
 * Search API v1 - Unified Semantic Search
 *
 * Provides hybrid search (semantic + keyword) across all ACT data sources:
 * - /api/v1/search - Main search endpoint
 * - /api/v1/search/health - Service health check
 * - /api/v1/search/suggest - Search suggestions (future)
 */

import { Router } from 'express';
import { validateQuery, apiResponse, apiError } from '../../middleware/validation.js';
import { z } from 'zod';
import unifiedSearchService from '../../services/unifiedSearchService.js';

const router = Router();

// Search query schema
const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  sources: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',') : undefined)),
  mode: z.enum(['hybrid', 'semantic', 'keyword']).default('hybrid'),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
});

/**
 * GET /api/v1/search
 * Main unified search endpoint
 *
 * Query params:
 * - q: Search query (required)
 * - sources: Comma-separated list of sources (contacts,projects,stories)
 * - mode: Search mode (hybrid, semantic, keyword)
 * - limit: Max results per source (default 20)
 *
 * Examples:
 * - /api/v1/search?q=youth justice programs
 * - /api/v1/search?q=grants&sources=contacts,projects&mode=semantic
 */
router.get('/', validateQuery(SearchQuerySchema), async (req, res) => {
  try {
    const { q, sources, mode, limit } = req.query;

    const results = await unifiedSearchService.search(q, {
      sources,
      mode,
      limit,
    });

    return apiResponse(res, results);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'SEARCH_ERROR' });
  }
});

/**
 * POST /api/v1/search
 * Advanced search with filters
 *
 * Body:
 * - query: Search query (required)
 * - sources: Array of sources
 * - mode: Search mode
 * - limit: Max results
 * - filters: Per-source filters
 *
 * Example:
 * {
 *   "query": "youth justice",
 *   "sources": ["contacts", "projects"],
 *   "mode": "hybrid",
 *   "filters": {
 *     "contacts": { "strategic_value": "high" },
 *     "projects": { "status": "active" }
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { query, sources, mode, limit, filters } = req.body;

    if (!query || typeof query !== 'string') {
      return apiError(res, new Error('Query is required'), {
        status: 400,
        code: 'INVALID_QUERY',
      });
    }

    const results = await unifiedSearchService.search(query, {
      sources,
      mode,
      limit,
      filters,
    });

    return apiResponse(res, results);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'SEARCH_ERROR' });
  }
});

/**
 * GET /api/v1/search/health
 * Search service health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await unifiedSearchService.healthCheck();
    return apiResponse(res, health);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'HEALTH_CHECK_ERROR' });
  }
});

/**
 * POST /api/v1/search/cache/clear
 * Clear embedding cache (admin only)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { source } = req.body;
    unifiedSearchService.clearCache(source);
    return apiResponse(res, {
      success: true,
      message: source ? `Cache cleared for ${source}` : 'All caches cleared',
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'CACHE_CLEAR_ERROR' });
  }
});

/**
 * GET /api/v1/search/sources
 * List available search sources
 */
router.get('/sources', (req, res) => {
  return apiResponse(res, {
    sources: {
      contacts: {
        description: 'LinkedIn contacts and network connections',
        fields: ['full_name', 'current_position', 'current_company', 'bio', 'location'],
      },
      projects: {
        description: 'Notion projects and initiatives',
        fields: ['name', 'description', 'status'],
      },
      stories: {
        description: 'Stories from Empathy Ledger',
        fields: ['title', 'content', 'summary'],
      },
    },
    modes: {
      hybrid: 'Combines semantic (vector) and keyword (BM25) search using RRF',
      semantic: 'Pure semantic/vector search using embeddings',
      keyword: 'Pure keyword/text matching search',
    },
  });
});

export default router;
