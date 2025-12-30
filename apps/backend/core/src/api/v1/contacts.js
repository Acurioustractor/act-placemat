/**
 * Contacts API v1
 */

import { Router } from 'express';
import { validateRequest, validateQuery, validateParams, apiResponse, apiError } from '../../middleware/validation.js';
import { ContactUpdateSchema, ContactsFilterSchema, IDParamSchema } from './schemas.js';
import { supabase } from '../../lib/database.js';

const router = Router();

router.get('/', validateQuery(ContactsFilterSchema), async (req, res) => {
  try {
    const { limit, offset, strategic_value, data_source, company, search } = req.query;

    let query = supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (strategic_value) {
      query = query.eq('strategic_value', strategic_value);
    }
    if (data_source) {
      query = query.eq('data_source', data_source);
    }
    if (company) {
      query = query.ilike('current_company', `%${company}%`);
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email_address.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return apiResponse(res, {
      contacts: data,
      pagination: {
        limit,
        offset,
        total: count,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'CONTACTS_FETCH_ERROR' });
  }
});

router.get('/:id', validateParams(IDParamSchema), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return apiError(res, new Error('Contact not found'), {
        status: 404,
        code: 'CONTACT_NOT_FOUND',
      });
    }

    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'CONTACT_FETCH_ERROR' });
  }
});

router.patch('/:id', validateParams(IDParamSchema), validateRequest(ContactUpdateSchema), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('linkedin_contacts')
      .update({
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    return apiResponse(res, data);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'CONTACT_UPDATE_ERROR' });
  }
});

export default router;
