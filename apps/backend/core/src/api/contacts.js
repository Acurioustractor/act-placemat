/**
 * Contacts API - LinkedIn Contact Intelligence
 *
 * Features:
 * - List contacts from Supabase (20,398 LinkedIn contacts)
 * - Search by name, company, position, industry
 * - Filter by email availability
 * - Statistics and analytics
 *
 * Best Practices:
 * - Pagination for large datasets
 * - Caching for performance
 * - Input validation
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Cache for stats (5 minute TTL)
let statsCache = {
  data: null,
  lastFetch: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

/**
 * Get contact statistics
 */
async function getContactStats() {
  const now = Date.now();

  // Return cached data if valid
  if (statsCache.data && (now - statsCache.lastFetch) < statsCache.ttl) {
    return statsCache.data;
  }

  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    console.log('📊 Fetching contact statistics from linkedin_imports...');

    // Get total count from linkedin_imports
    const { count: totalCount, error: countError } = await supabase
      .from('linkedin_imports')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const stats = {
      total_contacts: totalCount || 0,
      contacts_with_email: 0, // LinkedIn imports only have names
      contacts_without_email: totalCount || 0,
      data_source: 'linkedin_imports',
      note: 'LinkedIn imports contain names only. Full contact data needs re-import from LinkedIn CSV.'
    };

    // Update cache
    statsCache.data = stats;
    statsCache.lastFetch = now;

    console.log(`✅ Contact stats: ${stats.total_contacts} total from linkedin_imports`);
    return stats;

  } catch (error) {
    console.error('❌ Error fetching contact stats:', error.message);
    throw error;
  }
}

/**
 * Search contacts
 */
async function searchContacts(query = '', hasEmail = false, industry = '', location = '', limit = 50) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    console.log(`🔍 Searching linkedin_imports: "${query}" (limit: ${limit})`);

    let queryBuilder = supabase
      .from('linkedin_imports')
      .select('id, payload, imported_at')
      .order('imported_at', { ascending: false })
      .limit(limit);

    // Apply search filter on payload->Notes: field
    if (query && query.trim()) {
      queryBuilder = queryBuilder.ilike('payload->>Notes:', `%${query}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    // Debug: Log first record to see what we're getting
    if (data && data.length > 0) {
      console.log('📝 Sample record from DB:', JSON.stringify(data[0]));
    }

    // Transform linkedin_imports to match Contact interface
    const validContacts = (data || []).map(record => {
      const payload = record.payload || {};

      // Handle two different LinkedIn CSV formats
      let name = 'Unknown Contact';
      if (payload['Notes:']) {
        // Older format: Notes field contains the full name
        name = payload['Notes:'];
      } else if (payload['First Name'] || payload['Last Name']) {
        // Newer format: Separate First Name and Last Name fields
        const firstName = payload['First Name'] || '';
        const lastName = payload['Last Name'] || '';
        name = `${firstName} ${lastName}`.trim();
      }

      return {
        id: record.id,
        full_name: name,
        email_address: payload['Email Address'] || null,
        current_company: payload['Company'] || null,
        current_position: payload['Position'] || null,
        location: null,
        industry: null,
        profile_picture_url: null,
        relationship_strength: null,
        last_contact_date: record.imported_at,
        data_source: 'linkedin_import',
        imported_at: record.imported_at
      };
    });

    console.log(`✅ Found ${validContacts.length} contacts from linkedin_imports`);
    if (validContacts.length > 0) {
      console.log(`   Sample names: ${validContacts.slice(0, 3).map(c => c.full_name).join(', ')}`);
    }
    return validContacts;

  } catch (error) {
    console.error('❌ Error searching contacts:', error.message);
    throw error;
  }
}

/**
 * Get a single contact by ID
 */
async function getContactById(id) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('linkedin_imports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Transform to Contact interface
    const payload = data.payload || {};

    // Handle two different LinkedIn CSV formats
    let name = 'Unknown Contact';
    if (payload['Notes:']) {
      name = payload['Notes:'];
    } else if (payload['First Name'] || payload['Last Name']) {
      const firstName = payload['First Name'] || '';
      const lastName = payload['Last Name'] || '';
      name = `${firstName} ${lastName}`.trim();
    }

    return {
      id: data.id,
      full_name: name,
      email_address: payload['Email Address'] || null,
      current_company: payload['Company'] || null,
      current_position: payload['Position'] || null,
      location: null,
      industry: null,
      data_source: 'linkedin_import',
      imported_at: data.imported_at
    };

  } catch (error) {
    console.error('❌ Error fetching contact:', error.message);
    throw error;
  }
}

/**
 * Register routes
 */
export default function registerContactsRoutes(app) {
  // Get contact statistics
  app.get('/api/contacts/stats', async (req, res) => {
    try {
      const stats = await getContactStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting contact stats:', error);
      res.status(500).json({
        error: 'Failed to fetch contact statistics',
        message: error.message
      });
    }
  });

  // Search contacts
  app.get('/api/contacts/search', async (req, res) => {
    try {
      const {
        query = '',
        hasEmail = 'false',
        industry = '',
        location = '',
        limit = '50'
      } = req.query;

      const contacts = await searchContacts(
        query,
        hasEmail === 'true',
        industry,
        location,
        parseInt(limit)
      );

      res.json({
        success: true,
        count: contacts.length,
        contacts
      });
    } catch (error) {
      console.error('Error searching contacts:', error);
      res.status(500).json({
        error: 'Failed to search contacts',
        message: error.message
      });
    }
  });

  // Get single contact
  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await getContactById(id);

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      res.json(contact);
    } catch (error) {
      console.error('Error getting contact:', error);
      res.status(500).json({
        error: 'Failed to fetch contact',
        message: error.message
      });
    }
  });

  console.log('✅ Contacts API routes registered');
}
