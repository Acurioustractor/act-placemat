/**
 * LinkedIn Contacts API
 * Serves LinkedIn connections from linkedin_contacts table (properly imported from CSV)
 * Provides /api/contacts/linkedin/stats and /api/contacts/linkedin/search endpoints
 *
 * Data: 4,459 contacts imported from Ben & Nic's LinkedIn CSV exports
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Lazy-load Supabase client to avoid initialization order issues
let supabase = null;
const getSupabase = () => {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
};

/**
 * GET /api/contacts/linkedin/stats
 * Returns statistics about LinkedIn contacts from properly imported CSV data
 */
router.get('/stats', async (req, res) => {
  try {
    const sb = getSupabase();

    // Get total count from linkedin_contacts
    const { count: totalCount, error: countError } = await sb
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting LinkedIn contacts:', countError);
      return res.status(500).json({ error: 'Failed to fetch contact stats' });
    }

    // Count contacts with email
    const { count: withEmail, error: emailError } = await sb
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .not('email_address', 'is', null);

    if (emailError) {
      console.error('Error counting emails:', emailError);
    }

    // Count contacts with company info
    const { count: withCompany, error: companyError } = await sb
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .not('current_company', 'is', null);

    if (companyError) {
      console.error('Error counting companies:', companyError);
    }

    res.json({
      total_contacts: totalCount || 0,
      contacts_with_email: withEmail || 0,
      contacts_without_email: (totalCount || 0) - (withEmail || 0),
      contacts_with_company: withCompany || 0,
      data_source: 'linkedin_contacts',
      note: 'LinkedIn connections imported from CSV exports (Ben + Nic)'
    });

  } catch (error) {
    console.error('Error in /api/contacts/linkedin/stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/contacts/linkedin/search
 * Search and filter LinkedIn contacts from imported CSV data
 */
router.get('/search', async (req, res) => {
  try {
    const sb = getSupabase();
    const {
      query,
      hasEmail,
      hasCompany,
      dataSource,  // 'ben' or 'nic' or 'both'
      limit = 50,
      offset = 0
    } = req.query;

    let supabaseQuery = sb
      .from('linkedin_contacts')
      .select('*', { count: 'exact' })
      .order('first_name', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply search filter
    if (query) {
      // Search in first name, last name, company, or position
      supabaseQuery = supabaseQuery.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,current_company.ilike.%${query}%,current_position.ilike.%${query}%`
      );
    }

    // Filter by email presence
    if (hasEmail === 'true') {
      supabaseQuery = supabaseQuery.not('email_address', 'is', null);
    } else if (hasEmail === 'false') {
      supabaseQuery = supabaseQuery.is('email_address', null);
    }

    // Filter by company presence
    if (hasCompany === 'true') {
      supabaseQuery = supabaseQuery.not('current_company', 'is', null);
    } else if (hasCompany === 'false') {
      supabaseQuery = supabaseQuery.is('current_company', null);
    }

    // Filter by data source
    if (dataSource && dataSource !== 'both') {
      supabaseQuery = supabaseQuery.eq('data_source', dataSource);
    }

    const { data, error, count } = await supabaseQuery;

    if (error) {
      console.error('Error searching LinkedIn contacts:', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Transform the data to match the frontend Contact interface
    const contacts = (data || []).map(record => ({
      id: record.id,
      full_name: `${record.first_name} ${record.last_name}`.trim(),
      email_address: record.email_address,
      current_company: record.current_company,
      current_position: record.current_position,
      location: null,
      industry: null,
      profile_picture_url: null,
      linkedin_url: record.linkedin_url,
      relationship_strength: null,
      last_contact_date: record.connected_date,
      data_source: `linkedin_${record.data_source}`,
      imported_at: record.created_at
    }));

    res.json({
      contacts,
      total: count || contacts.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error in /api/contacts/linkedin/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
