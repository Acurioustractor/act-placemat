/**
 * Year in Review API v1
 */

import { Router } from 'express';
import { validateQuery, validateParams, apiResponse, apiError } from '../../middleware/validation.js';
import { PaginationSchema, IDParamSchema } from './schemas.js';
import { supabase } from '../../lib/database.js';

const router = Router();

router.get('/timeline', validateQuery(PaginationSchema), async (req, res) => {
  try {
    const { limit, offset } = req.query;

    const { data, error, count } = await supabase
      .from('review_curated_entries')
      .select('*', { count: 'exact' })
      .eq('included', true)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return apiResponse(res, {
      entries: data || [],
      pagination: { limit, offset, total: count || 0, hasMore: offset + limit < (count || 0) },
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'TIMELINE_FETCH_ERROR' });
  }
});

router.get('/projects', validateQuery(PaginationSchema), async (req, res) => {
  try {
    const { limit, offset } = req.query;

    const { data, error, count } = await supabase
      .from('review_projects')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('featured_order', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return apiResponse(res, {
      projects: data || [],
      pagination: { limit, offset, total: count || 0, hasMore: offset + limit < (count || 0) },
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'REVIEW_PROJECTS_FETCH_ERROR' });
  }
});

router.get('/projects/:id', validateParams(IDParamSchema), async (req, res) => {
  try {
    const { data, error} = await supabase
      .from('review_projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_published', true)
      .single();

    if (error) throw error;
    if (!data) {
      return apiError(res, new Error('Review project not found'), {
        status: 404,
        code: 'REVIEW_PROJECT_NOT_FOUND',
      });
    }

    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'REVIEW_PROJECT_FETCH_ERROR' });
  }
});

export default router;
