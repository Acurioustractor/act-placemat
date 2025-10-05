/**
 * Empathy Ledger API Routes
 * Provides secure access to Empathy Ledger data
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase with service role for backend access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration for Empathy Ledger API');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching Empathy Ledger statistics...');
    
    const [
      storiesResult,
      storytellersResult,
      locationsResult,
      organizationsResult
    ] = await Promise.all([
      supabase.from('stories').select('*', { count: 'exact', head: true }),
      supabase.from('storytellers').select('*', { count: 'exact', head: true }).eq('consent_given', true),
      supabase.from('locations').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*', { count: 'exact', head: true })
    ]);

    const stats = {
      stories: storiesResult.count || 0,
      storytellers: storytellersResult.count || 0,
      locations: locationsResult.count || 0,
      organizations: organizationsResult.count || 0
    };

    console.log('✅ Empathy Ledger stats:', stats);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching Empathy Ledger stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get public stories
router.get('/stories', async (req, res) => {
  try {
    const { limit = 10, offset = 0, search } = req.query;
    
    console.log(`📖 Fetching public stories (limit: ${limit}, offset: ${offset}, search: ${search})`);
    
    let query = supabase
      .from('stories')
      .select('*', { count: 'exact' })
      .eq('privacy_level', 'public') // Only return public stories
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} public stories`);
    
    res.json({
      stories: data || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get storytellers with consent
router.get('/storytellers', async (req, res) => {
  try {
    const { limit = 10, offset = 0, search } = req.query;
    
    console.log(`👥 Fetching storytellers (limit: ${limit}, offset: ${offset}, search: ${search})`);
    
    let query = supabase
      .from('storytellers')
      .select('id, full_name, bio, profile_image_url, media_type, generated_themes, created_at', { count: 'exact' })
      .eq('consent_given', true)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} storytellers`);
    
    res.json({
      storytellers: data || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Error fetching storytellers:', error);
    res.status(500).json({ error: 'Failed to fetch storytellers' });
  }
});

// Get locations
router.get('/locations', async (req, res) => {
  try {
    console.log('📍 Fetching locations...');
    
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} locations`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get organizations
router.get('/organizations', async (req, res) => {
  try {
    console.log('🏢 Fetching organizations...');
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} organizations`);
    res.json(data || []);

  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Search across all content
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.json({ stories: [], storytellers: [], organizations: [] });
    }
    
    console.log(`🔍 Searching Empathy Ledger for: "${query}"`);
    
    const [storiesResult, storytellersResult, organizationsResult] = await Promise.all([
      // Search public stories only
      supabase
        .from('stories')
        .select('*')
        .eq('privacy_level', 'public')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(parseInt(limit) / 3),
      
      // Search storytellers with consent
      supabase
        .from('storytellers')
        .select('id, full_name, bio, profile_image_url, media_type, generated_themes')
        .eq('consent_given', true)
        .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(parseInt(limit) / 3),
      
      // Search organizations
      supabase
        .from('organizations')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(parseInt(limit) / 3)
    ]);

    const results = {
      stories: storiesResult.data || [],
      storytellers: storytellersResult.data || [],
      organizations: organizationsResult.data || []
    };

    const totalResults = results.stories.length + results.storytellers.length + results.organizations.length;
    console.log(`✅ Search found ${totalResults} results`);
    
    res.json(results);

  } catch (error) {
    console.error('❌ Error searching Empathy Ledger:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;