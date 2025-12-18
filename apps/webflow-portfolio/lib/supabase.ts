/**
 * Supabase Client for Year in Review
 * Direct database access - no backend needed
 */

import { createClient } from '@supabase/supabase-js';

// Use anon key for public read access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
