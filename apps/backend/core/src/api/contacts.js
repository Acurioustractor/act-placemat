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
    console.log('📊 Fetching contact statistics...');

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get count with email
    const { count: withEmailCount, error: emailError } = await supabase
      .from('linkedin_contacts')
      .select('*', { count: 'exact', head: true })
      .not('email_address', 'is', null);

    if (emailError) throw emailError;

    const stats = {
      total_contacts: totalCount || 0,
      contacts_with_email: withEmailCount || 0,
      contacts_without_email: (totalCount || 0) - (withEmailCount || 0)
    };

    // Update cache
    statsCache.data = stats;
    statsCache.lastFetch = now;

    console.log(`✅ Contact stats: ${stats.total_contacts} total, ${stats.contacts_with_email} with email`);
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
    console.log(`🔍 Searching contacts: "${query}" (hasEmail: ${hasEmail}, industry: ${industry}, location: ${location}, limit: ${limit})`);

    let queryBuilder = supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company, current_position, location, industry')
      // Always filter out contacts with blank/null names
      .not('full_name', 'is', null)
      .neq('full_name', '')
      .neq('full_name', ' ');

    // Apply filters
    if (query && query.trim()) {
      // Search across multiple fields
      queryBuilder = queryBuilder.or(
        `full_name.ilike.%${query}%,` +
        `current_company.ilike.%${query}%,` +
        `current_position.ilike.%${query}%,` +
        `industry.ilike.%${query}%`
      );
    }

    if (hasEmail) {
      queryBuilder = queryBuilder.not('email_address', 'is', null).not('email_address', 'eq', '');
    }

    if (industry && industry.trim()) {
      queryBuilder = queryBuilder.ilike('industry', `%${industry}%`);
    }

    if (location && location.trim()) {
      queryBuilder = queryBuilder.ilike('location', `%${location}%`);
    }

    // Apply limit and ordering
    const { data, error } = await queryBuilder
      .order('full_name', { ascending: true})
      .limit(limit);

    if (error) throw error;

    // Return all contacts - let frontend handle filtering if needed
    const validContacts = data || [];

    console.log(`✅ Found ${validContacts.length} contacts`);
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
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;

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
