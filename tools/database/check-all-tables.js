#!/usr/bin/env node

/**
 * Check ALL tables in Supabase using service role
 */

import { createClient } from '@supabase/supabase-js';

// Use service role for full access
const supabase = createClient(
  'https://tednluwflfhxyucgwigh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo'
);

async function checkAllTables() {
  console.log('🔍 Checking ALL tables in Supabase database...\n');
  
  try {
    // Query information_schema to see all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('❌ Error fetching tables:', error.message);
      
      // Try alternative approach with raw SQL
      console.log('Trying alternative method...');
      
      const response = await fetch(`https://tednluwflfhxyucgwigh.supabase.co/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 
        })
      });
      
      const result = await response.text();
      console.log('Raw query result:', result);
      
    } else if (tables && tables.length > 0) {
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
      
      // Check each table for data
      console.log('\n📊 Checking table contents...');
      for (const table of tables.slice(0, 10)) { // Limit to first 10
        try {
          const { count, error: countError } = await supabase
            .from(table.table_name)
            .select('*', { count: 'exact', head: true });
          
          if (!countError) {
            console.log(`   ${table.table_name}: ${count || 0} records`);
            
            // If it has data and sounds like stories, show sample
            if (count > 0 && (table.table_name.includes('stor') || table.table_name.includes('empathy') || table.table_name.includes('ledger'))) {
              const { data: sample } = await supabase
                .from(table.table_name)
                .select('*')
                .limit(1);
              
              if (sample && sample.length > 0) {
                console.log(`     Sample columns: ${Object.keys(sample[0]).join(', ')}`);
              }
            }
          }
        } catch (e) {
          // Skip
        }
      }
      
    } else {
      console.log('❌ No tables found or database is completely empty');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

checkAllTables();