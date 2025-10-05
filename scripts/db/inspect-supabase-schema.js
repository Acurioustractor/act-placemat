/**
 * Inspect Supabase Schema
 * Check what tables and columns actually exist
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase Schema\n');
  console.log('='.repeat(60));

  try {
    // Query information_schema to get all tables
    const { data: tables, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });

    if (error) {
      console.log('⚠️  Using fallback method (exec_sql not available)\n');

      // Try querying known tables
      const knownTables = [
        'contact_cadence_metrics',
        'community_emails',
        'gmail_notion_contacts',
        'gmail_sync_filters',
        'project_support_graph',
        'outreach_tasks',
        'contact_support_recommendations'
      ];

      console.log('📋 Testing Known Tables:\n');

      for (const tableName of knownTables) {
        try {
          const { count, error: tableError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (tableError) {
            console.log(`❌ ${tableName}: ${tableError.message}`);
          } else {
            console.log(`✅ ${tableName}: ${count} records`);

            // Get column info
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);

            if (sample && sample[0]) {
              console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}\n`);
            }
          }
        } catch (e) {
          console.log(`❌ ${tableName}: ${e.message}`);
        }
      }

      return;
    }

    console.log('📋 Available Tables:\n');
    tables.forEach(table => {
      console.log(`   • ${table.table_name}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${tables.length} tables\n`);

  } catch (error) {
    console.error('❌ Schema inspection failed:', error);
  }
}

inspectSchema();
