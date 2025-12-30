#!/usr/bin/env node

/**
 * Check Database Tables - Diagnostic Script
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking Database Tables');
console.log('===========================');

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
      return false;
    } else {
      console.log(`✅ ${tableName}: Table exists and is accessible`);
      return true;
    }
  } catch (err) {
    console.log(`❌ ${tableName}: Exception - ${err.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🔗 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('linkedin_contacts').select('count').limit(1);
    if (error) {
      console.error('❌ Cannot connect to Supabase:', error);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful');
    console.log('');
    
    // Check intelligence tables
    console.log('📋 Checking Intelligence Tables:');
    const tables = [
      'contact_intelligence',
      'contact_enrichments',
      'project_contact_matches',
      'outreach_strategies',
      'contact_interactions',
      'business_agent_queries',
      'compliance_tracking',
      'grant_opportunities',
      'project_health_analysis',
      'business_alerts'
    ];
    
    let existingTables = 0;
    for (const table of tables) {
      const exists = await checkTable(table);
      if (exists) existingTables++;
    }
    
    console.log('');
    console.log(`📊 Summary: ${existingTables}/${tables.length} intelligence tables exist`);
    
    if (existingTables === 0) {
      console.log('');
      console.log('🚨 NO INTELLIGENCE TABLES FOUND');
      console.log('================================');
      console.log('You need to apply the database migration first:');
      console.log('');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Create a new query');
      console.log('4. Copy and paste the ENTIRE contents of:');
      console.log('   supabase/migrations/20251120020000_intelligence_v3_tables.sql');
      console.log('5. Click "Run"');
      console.log('6. Wait for "Success" message');
      console.log('');
      console.log('Then run this script again to verify.');
    } else if (existingTables < tables.length) {
      console.log('');
      console.log('⚠️ PARTIAL MIGRATION DETECTED');
      console.log('==============================');
      console.log('Some tables exist but not all. This suggests the migration');
      console.log('was partially applied or failed partway through.');
      console.log('');
      console.log('Recommendation: Re-run the full migration SQL.');
    } else {
      console.log('');
      console.log('🎉 ALL INTELLIGENCE TABLES EXIST!');
      console.log('==================================');
      console.log('Your database is ready for intelligence data population.');
      console.log('');
      console.log('Next step: Run the data population script:');
      console.log('node scripts/populate-intelligence-data-fixed.js');
    }
    
  } catch (error) {
    console.error('❌ Error during database check:', error);
    process.exit(1);
  }
}

main();
