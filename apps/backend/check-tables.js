/**
 * Check what tables exist in Supabase database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

console.log('🔍 Checking Supabase database tables...\n');

async function checkTables() {
  try {
    const tables = [
      'person_identity_map',
      'contact_campaigns',
      'contact_campaign_assignments',
      'contact_intelligence_scores'
    ];

    console.log('Checking required tables:\n');

    for (const table of tables) {
      const { error: tableError, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (tableError) {
        console.log(`❌ ${table} - NOT FOUND`);
        console.log(`   Error: ${tableError.message}\n`);
      } else {
        console.log(`✅ ${table} - EXISTS (${count} rows)`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTables();
