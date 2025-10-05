#!/usr/bin/env node

/**
 * Apply Billing & Subscriptions Schema to Supabase via exec_sql
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and public.exec_sql(query text)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🚀 Applying Billing & Subscriptions schema...');

  // Ensure pgcrypto for gen_random_uuid if later needed
  try {
    const { error: extErr } = await supabase.rpc('exec_sql', { query: 'CREATE EXTENSION IF NOT EXISTS pgcrypto;' });
    if (extErr) {
      console.warn(`⚠️ Could not ensure pgcrypto: ${extErr.message}`);
    }
  } catch {}

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const sqlPath = join(__dirname, 'billing-schema.sql');
  let sql = readFileSync(sqlPath, 'utf8');
  // Remove explicit transaction commands which are not supported in exec_sql
  sql = sql.replace(/\bBEGIN;?/gi, '').replace(/\bCOMMIT;?/gi, '');

  const { error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error(`❌ Failed to apply Billing schema: ${error.message}`);
    process.exit(1);
  }

  console.log('✅ Billing schema applied successfully');
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});


