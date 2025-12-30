/**
 * Media API v1
 */

import { Router } from 'express';
import { validateQuery, validateParams, apiResponse, apiError } from '../../middleware/validation.js';
import { MediaSearchSchema, IDParamSchema } from './schemas.js';
import { supabase } from '../../lib/database.js';

const router = Router();

router.get('/', validateQuery(MediaSearchSchema), async (req, res) => {
  try {
    const { limit, offset, type, tags } = req.query;

    let query = supabase
      .from('media_items')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('file_type', type);
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return apiResponse(res, {
      items: data || [],
      pagination: { limit, offset, total: count || 0, hasMore: offset + limit < (count || 0) },
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'MEDIA_FETCH_ERROR' });
  }
});

router.get('/:id', validateParams(IDParamSchema), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return apiError(res, new Error('Media item not found'), {
        status: 404,
        code: 'MEDIA_NOT_FOUND',
      });
    }

    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'MEDIA_FETCH_ERROR' });
  }
});

export default router;
