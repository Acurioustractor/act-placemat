/**
 * Supabase Client Configuration
 * 
 * Centralized Supabase client setup for the backend API
 */

import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * Create and configure Supabase client
 */
export function createSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'ACT-Backend-API'
        }
      }
    });

    console.log('✅ Supabase client initialized');
  }

  return supabaseClient;
}

/**
 * Test database connection
 */
export async function testSupabaseConnection() {
  try {
    const client = createSupabaseClient();
    const { data, error } = await client
      .from('stories')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
}

export default createSupabaseClient;