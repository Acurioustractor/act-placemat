/**
 * Contacts API v1
 */

import { Router } from 'express';
import { validateRequest, validateQuery, validateParams, apiResponse, apiError } from '../../middleware/validation.js';
import { ContactUpdateSchema, ContactsFilterSchema, IDParamSchema } from './schemas.js';
import { supabase, supabaseKnowledgeHub } from '../../lib/database.js';

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

/**
 * GET /all - All contacts from person_identity_map (Gmail + LinkedIn + Notion unified)
 * This is the master contact table with 14,000+ contacts
 */
router.get('/all', async (req, res) => {
  try {
    const { limit = 50, offset = 0, data_source, engagement_priority, search } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 500);
    const offsetNum = parseInt(offset) || 0;

    let query = supabase
      .from('person_identity_map')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    // Apply filters
    if (data_source) {
      query = query.eq('data_source', data_source);
    }
    if (engagement_priority) {
      query = query.eq('engagement_priority', engagement_priority);
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,current_company.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return apiResponse(res, {
      contacts: data,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count,
        hasMore: offsetNum + limitNum < count,
      },
      source: 'person_identity_map'
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'ALL_CONTACTS_FETCH_ERROR' });
  }
});

/**
 * GET /all/stats - Statistics about all contacts
 */
router.get('/all/stats', async (req, res) => {
  try {
    // Total count
    const { count: totalCount } = await supabase
      .from('person_identity_map')
      .select('*', { count: 'exact', head: true });

    // Count by data source
    const { data: bySource } = await supabase
      .from('person_identity_map')
      .select('data_source')
      .limit(10000);

    const sourceCounts = {};
    bySource?.forEach(row => {
      sourceCounts[row.data_source || 'unknown'] = (sourceCounts[row.data_source || 'unknown'] || 0) + 1;
    });

    // Count by engagement priority
    const { data: byPriority } = await supabase
      .from('person_identity_map')
      .select('engagement_priority')
      .limit(10000);

    const priorityCounts = {};
    byPriority?.forEach(row => {
      priorityCounts[row.engagement_priority || 'unset'] = (priorityCounts[row.engagement_priority || 'unset'] || 0) + 1;
    });

    // Count enriched
    const { count: enrichedCount } = await supabase
      .from('person_identity_map')
      .select('*', { count: 'exact', head: true })
      .eq('exa_enriched', true);

    return apiResponse(res, {
      total: totalCount,
      bySource: sourceCounts,
      byEngagementPriority: priorityCounts,
      enriched: enrichedCount || 0,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'CONTACTS_STATS_ERROR' });
  }
});

/**
 * GET /all/search - Search all contacts
 */
router.get('/all/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return apiError(res, new Error('Search query required'), {
        status: 400,
        code: 'SEARCH_QUERY_REQUIRED'
      });
    }

    const limitNum = Math.min(parseInt(limit) || 20, 100);

    const { data, error, count } = await supabase
      .from('person_identity_map')
      .select('*', { count: 'exact' })
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,current_company.ilike.%${q}%`)
      .order('engagement_priority', { ascending: true })
      .limit(limitNum);

    if (error) throw error;

    return apiResponse(res, {
      query: q,
      results: data,
      count: count,
      limit: limitNum
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'CONTACTS_SEARCH_ERROR' });
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

// ============================================
// Contact Communications (from Knowledge Hub)
// 8,289+ email communications with metadata
// ============================================

/**
 * GET /communications - Email communications from Knowledge Hub
 */
router.get('/communications', async (req, res) => {
  try {
    const { limit = 50, offset = 0, contact_email, direction, comm_type, search } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 500);
    const offsetNum = parseInt(offset) || 0;

    let query = supabaseKnowledgeHub
      .from('contact_communications')
      .select('*', { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    // Apply filters
    if (contact_email) {
      query = query.eq('ghl_contact_id', contact_email);
    }
    if (direction) {
      query = query.eq('direction', direction);
    }
    if (comm_type) {
      query = query.eq('comm_type', comm_type);
    }
    if (search) {
      query = query.or(`subject.ilike.%${search}%,ghl_contact_id.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return apiResponse(res, {
      communications: data,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count,
        hasMore: offsetNum + limitNum < count,
      },
      source: 'knowledge_hub.contact_communications'
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'COMMUNICATIONS_FETCH_ERROR' });
  }
});

/**
 * GET /communications/stats - Statistics about communications
 */
router.get('/communications/stats', async (req, res) => {
  try {
    // Total count
    const { count: totalCount } = await supabaseKnowledgeHub
      .from('contact_communications')
      .select('*', { count: 'exact', head: true });

    // Count by direction
    const { data: byDirection } = await supabaseKnowledgeHub
      .from('contact_communications')
      .select('direction')
      .limit(10000);

    const directionCounts = {};
    byDirection?.forEach(row => {
      directionCounts[row.direction || 'unknown'] = (directionCounts[row.direction || 'unknown'] || 0) + 1;
    });

    // Count by comm_type
    const { data: byType } = await supabaseKnowledgeHub
      .from('contact_communications')
      .select('comm_type')
      .limit(10000);

    const typeCounts = {};
    byType?.forEach(row => {
      typeCounts[row.comm_type || 'unknown'] = (typeCounts[row.comm_type || 'unknown'] || 0) + 1;
    });

    // Unique contacts with communications
    const { data: uniqueContacts } = await supabaseKnowledgeHub
      .from('contact_communications')
      .select('ghl_contact_id')
      .limit(50000);

    const uniqueSet = new Set(uniqueContacts?.map(r => r.ghl_contact_id));

    return apiResponse(res, {
      total: totalCount,
      byDirection: directionCounts,
      byType: typeCounts,
      uniqueContacts: uniqueSet.size,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'COMMUNICATIONS_STATS_ERROR' });
  }
});

/**
 * GET /communications/contact/:email - Communications for a specific contact
 */
router.get('/communications/contact/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 200);

    const { data, error, count } = await supabaseKnowledgeHub
      .from('contact_communications')
      .select('*', { count: 'exact' })
      .eq('ghl_contact_id', email)
      .order('occurred_at', { ascending: false })
      .limit(limitNum);

    if (error) throw error;

    return apiResponse(res, {
      contact: email,
      communications: data,
      total: count
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'CONTACT_COMMUNICATIONS_ERROR' });
  }
});

// ============================================
// Person Identity Map - Single Record + Projects
// ============================================

/**
 * GET /all/:personId - Get a single person with all linked data
 */
router.get('/all/:personId', async (req, res) => {
  try {
    const { personId } = req.params;

    // Get person record
    const { data: person, error: personErr } = await supabase
      .from('person_identity_map')
      .select('*')
      .eq('person_id', personId)
      .single();

    if (personErr) throw personErr;
    if (!person) {
      return apiError(res, new Error('Person not found'), {
        status: 404,
        code: 'PERSON_NOT_FOUND'
      });
    }

    // Get linked projects
    const { data: projects } = await supabase
      .from('project_contact_matches')
      .select('*')
      .eq('person_id', personId);

    // Get communications if email exists
    let communications = [];
    if (person.email) {
      const { data: comms } = await supabaseKnowledgeHub
        .from('contact_communications')
        .select('id, comm_type, direction, subject, occurred_at')
        .eq('ghl_contact_id', person.email)
        .order('occurred_at', { ascending: false })
        .limit(20);
      communications = comms || [];
    }

    return apiResponse(res, {
      person,
      projects: projects || [],
      recentCommunications: communications
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'PERSON_FETCH_ERROR' });
  }
});

/**
 * GET /all/:personId/projects - Get all projects linked to a person
 */
router.get('/all/:personId/projects', async (req, res) => {
  try {
    const { personId } = req.params;

    const { data, error, count } = await supabase
      .from('project_contact_matches')
      .select('*', { count: 'exact' })
      .eq('person_id', personId)
      .order('alignment_score', { ascending: false });

    if (error) throw error;

    return apiResponse(res, {
      personId,
      projects: data || [],
      total: count
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'PERSON_PROJECTS_ERROR' });
  }
});

/**
 * POST /all/:personId/projects - Link a person to a project
 */
router.post('/all/:personId/projects', async (req, res) => {
  try {
    const { personId } = req.params;
    const {
      project_notion_id,
      project_name,
      project_source = 'manual',
      alignment_score = 50,
      matched_keywords = [],
      match_reason = 'Manually linked',
      engagement_status = 'potential'
    } = req.body;

    if (!project_notion_id && !project_name) {
      return apiError(res, new Error('project_notion_id or project_name required'), {
        status: 400,
        code: 'PROJECT_REQUIRED'
      });
    }

    // Check if link already exists
    const { data: existing } = await supabase
      .from('project_contact_matches')
      .select('id')
      .eq('person_id', personId)
      .eq('project_notion_id', project_notion_id)
      .maybeSingle();

    if (existing) {
      return apiError(res, new Error('Project link already exists'), {
        status: 409,
        code: 'LINK_EXISTS'
      });
    }

    const { data, error } = await supabase
      .from('project_contact_matches')
      .insert({
        person_id: personId,
        project_notion_id,
        project_name,
        project_source,
        alignment_score,
        matched_keywords,
        match_reason,
        engagement_status
      })
      .select()
      .single();

    if (error) throw error;

    return apiResponse(res, {
      message: 'Project linked successfully',
      link: data
    }, 201);
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'PROJECT_LINK_ERROR' });
  }
});

/**
 * PATCH /all/:personId/projects/:linkId - Update a project link
 */
router.patch('/all/:personId/projects/:linkId', async (req, res) => {
  try {
    const { personId, linkId } = req.params;
    const { alignment_score, engagement_status, matched_keywords, match_reason } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (alignment_score !== undefined) updateData.alignment_score = alignment_score;
    if (engagement_status !== undefined) updateData.engagement_status = engagement_status;
    if (matched_keywords !== undefined) updateData.matched_keywords = matched_keywords;
    if (match_reason !== undefined) updateData.match_reason = match_reason;

    const { data, error } = await supabase
      .from('project_contact_matches')
      .update(updateData)
      .eq('id', linkId)
      .eq('person_id', personId)
      .select()
      .single();

    if (error) throw error;

    return apiResponse(res, {
      message: 'Project link updated',
      link: data
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'PROJECT_LINK_UPDATE_ERROR' });
  }
});

/**
 * DELETE /all/:personId/projects/:linkId - Remove a project link
 */
router.delete('/all/:personId/projects/:linkId', async (req, res) => {
  try {
    const { personId, linkId } = req.params;

    const { error } = await supabase
      .from('project_contact_matches')
      .delete()
      .eq('id', linkId)
      .eq('person_id', personId);

    if (error) throw error;

    return apiResponse(res, {
      message: 'Project link removed'
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'PROJECT_UNLINK_ERROR' });
  }
});

/**
 * GET /all/:personId/communications - Get communications for a person
 */
router.get('/all/:personId/communications', async (req, res) => {
  try {
    const { personId } = req.params;
    const { limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 200);

    // First get the person's email
    const { data: person, error: personErr } = await supabase
      .from('person_identity_map')
      .select('email')
      .eq('person_id', personId)
      .single();

    if (personErr) throw personErr;
    if (!person?.email) {
      return apiResponse(res, {
        personId,
        email: null,
        communications: [],
        total: 0,
        message: 'No email associated with this person'
      });
    }

    const { data, error, count } = await supabaseKnowledgeHub
      .from('contact_communications')
      .select('*', { count: 'exact' })
      .eq('ghl_contact_id', person.email)
      .order('occurred_at', { ascending: false })
      .limit(limitNum);

    if (error) throw error;

    return apiResponse(res, {
      personId,
      email: person.email,
      communications: data || [],
      total: count
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'PERSON_COMMUNICATIONS_ERROR' });
  }
});

// ============================================
// Project-centric queries
// ============================================

/**
 * GET /projects/:projectId/contacts - Get all contacts linked to a project
 */
router.get('/projects/:projectId/contacts', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, offset = 0, engagement_status } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offsetNum = parseInt(offset) || 0;

    let query = supabase
      .from('project_contact_matches')
      .select(`
        *,
        person:person_id (
          person_id,
          full_name,
          email,
          current_company,
          current_position,
          engagement_priority
        )
      `, { count: 'exact' })
      .eq('project_notion_id', projectId)
      .order('alignment_score', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (engagement_status) {
      query = query.eq('engagement_status', engagement_status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return apiResponse(res, {
      projectId,
      contacts: data || [],
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count,
        hasMore: offsetNum + limitNum < count
      }
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'PROJECT_CONTACTS_ERROR' });
  }
});

export default router;
