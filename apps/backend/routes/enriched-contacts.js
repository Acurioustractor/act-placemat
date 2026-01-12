import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/enriched-contacts
 * Get enriched contacts with filtering and sorting
 */
router.get('/', async (req, res) => {
  try {
    const {
      strategic_value,
      min_confidence = 0.3,
      has_linkedin = false,
      industry,
      location,
      limit = 50,
      offset = 0,
      sort_by = 'strategic_value'
    } = req.query;

    let query = supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company, current_position, industry, location, linkedin_url, bio, strategic_value, relationship_score, exa_confidence_score, exa_last_enriched')
      .eq('exa_enriched', true)
      .gte('exa_confidence_score', parseFloat(min_confidence));

    // Filters
    if (strategic_value) {
      query = query.eq('strategic_value', strategic_value);
    }

    if (has_linkedin === 'true') {
      query = query.not('linkedin_url', 'is', null);
    }

    if (industry) {
      query = query.eq('industry', industry);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    // Sorting
    const sortColumn = sort_by === 'strategic_value' ? 'relationship_score' :
                       sort_by === 'confidence' ? 'exa_confidence_score' :
                       sort_by === 'recent' ? 'exa_last_enriched' : 'relationship_score';

    query = query.order(sortColumn, { ascending: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      contacts: data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: count > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching enriched contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/enriched-contacts/stats
 * Get enrichment statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { data: stats } = await supabase.rpc('get_enrichment_stats');

    // If no RPC, calculate manually
    const { count: total } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true });

    const { count: enriched } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('exa_enriched', true);

    const { count: withLinkedIn } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .not('linkedin_url', 'is', null);

    const { count: highValue } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('strategic_value', 'high');

    res.json({
      total_contacts: total,
      enriched: enriched,
      with_linkedin: withLinkedIn,
      high_value: highValue,
      enrichment_rate: ((enriched / total) * 100).toFixed(1),
      linkedin_rate: ((withLinkedIn / enriched) * 100).toFixed(1)
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/enriched-contacts/strategic
 * Get high-value strategic contacts
 */
router.get('/strategic', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const { data, error } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('exa_enriched', true)
      .in('strategic_value', ['high', 'medium'])
      .order('relationship_score', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Group by strategic focus
    const byFocus = data.reduce((acc, contact) => {
      const focus = contact.strategic_focus || 'general';
      if (!acc[focus]) acc[focus] = [];
      acc[focus].push(contact);
      return acc;
    }, {});

    res.json({
      total: data.length,
      contacts: data,
      by_focus: byFocus
    });

  } catch (error) {
    console.error('Error fetching strategic contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/enriched-contacts/:id
 * Get detailed contact information
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(data);

  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/enriched-contacts/:id/tag
 * Add strategic tags to a contact
 */
router.post('/:id/tag', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const { data, error } = await supabase
      .from('linkedin_contacts')
      .update({
        // Assuming we have a tags column (JSONB array)
        tags: tags
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      contact: data
    });

  } catch (error) {
    console.error('Error tagging contact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
