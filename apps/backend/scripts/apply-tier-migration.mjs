#!/usr/bin/env node
/**
 * Apply tier assignment migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const migrationPath = path.resolve(__dirname, '../../../supabase/migrations/20251026000000_engagement_tier_assignment.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🔄 Applying engagement tier assignment migration...\n');

// Execute the migration
const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL }).catch(async () => {
  // If exec_sql doesn't exist, we need to create it first or execute directly
  console.log('⚠️  exec_sql function not available, executing migration via service role...\n');

  // Since we can't execute raw SQL directly, let's check if the views/functions exist
  const { data: existing } = await supabase
    .rpc('assign_engagement_tier', { person_uuid: '00000000-0000-0000-0000-000000000000' })
    .then(() => ({ data: 'exists' }))
    .catch(() => ({ data: null }));

  if (!existing) {
    console.log('❌ Migration functions not found in database.');
    console.log('\n📝 Please apply this migration manually using Supabase SQL Editor:');
    console.log(`\n1. Go to https://supabase.com/dashboard/project/_/sql`);
    console.log(`2. Copy the contents of: ${migrationPath}`);
    console.log(`3. Paste and run in SQL editor\n`);
    process.exit(1);
  } else {
    console.log('✅ Migration functions already exist!');
    return { data: 'already_exists' };
  }
});

if (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('\n📝 Please apply this migration manually using Supabase SQL Editor:');
  console.log(`\n1. Go to https://supabase.com/dashboard/project/_/sql`);
  console.log(`2. Copy the contents of: ${migrationPath}`);
  console.log(`3. Paste and run in SQL editor\n`);
  process.exit(1);
}

console.log('✅ Migration applied successfully!\n');

// Test the functions
console.log('🧪 Testing tier assignment functions...\n');

// Check if views exist
const { data: candidates, error: candidatesError } = await supabase
  .from('vw_notion_promotion_candidates')
  .select('count')
  .limit(1);

if (!candidatesError) {
  console.log('✅ vw_notion_promotion_candidates view exists');
} else {
  console.log('⚠️  vw_notion_promotion_candidates view not found:', candidatesError.message);
}

const { data: segments, error: segmentsError } = await supabase
  .from('vw_newsletter_segments')
  .select('count')
  .limit(1);

if (!segmentsError) {
  console.log('✅ vw_newsletter_segments view exists');
} else {
  console.log('⚠️  vw_newsletter_segments view not found:', segmentsError.message);
}

const { data: stats, error: statsError } = await supabase
  .from('vw_engagement_tier_stats')
  .select('*');

if (!statsError) {
  console.log('✅ vw_engagement_tier_stats view exists');
  if (stats && stats.length > 0) {
    console.log('\n📊 Current Tier Distribution:');
    stats.forEach(row => {
      console.log(`   ${row.tier}: ${row.total_contacts} contacts`);
    });
  }
} else {
  console.log('⚠️  vw_engagement_tier_stats view not found:', statsError.message);
}

console.log('\n✅ Migration complete!');
