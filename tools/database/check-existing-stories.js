#!/usr/bin/env node

/**
 * Check for existing Empathy Ledger stories in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tednluwflfhxyucgwigh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzNjY2MjksImV4cCI6MjAzNjk0MjYyOX0.jNE5fGFXKMLK6CQE3cSCHOQ8ZrfGj3ZaHXBhbvXFvX8'
);

async function checkTables() {
  console.log('🔍 Checking for existing Empathy Ledger tables...\n');
  
  // Try common table names for stories
  const tableNames = [
    'stories', 
    'empathy_ledger', 
    'empathy_stories', 
    'ledger_stories', 
    'community_stories',
    'impact_stories',
    'client_stories'
  ];
  
  const foundTables = [];
  
  for (const table of tableNames) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ Found table: ${table} (${count || 0} records)`);
        foundTables.push({ name: table, count: count || 0 });
        
        // Get sample data to see structure
        if (count > 0) {
          const { data: sample, error: sampleError } = await supabase
            .from(table)
            .select('*')
            .limit(2);
          
          if (!sampleError && sample.length > 0) {
            console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
            console.log(`   Sample: ${JSON.stringify(sample[0], null, 2).substring(0, 200)}...`);
          }
        }
        console.log('');
      }
    } catch (e) {
      // Skip silently
    }
  }
  
  if (foundTables.length === 0) {
    console.log('❌ No story tables found with standard names');
    console.log('\n🔍 Let me check what tables DO exist...');
    
    // Try to get schema info
    try {
      const { data: tables, error } = await supabase.rpc('get_schema_tables');
      if (!error && tables) {
        console.log('Available tables:', tables);
      }
    } catch (e) {
      console.log('Could not fetch table list - checking with direct queries...');
    }
  } else {
    console.log(`\n🎉 Found ${foundTables.length} potential story tables!`);
    foundTables.forEach(table => {
      console.log(`   - ${table.name}: ${table.count} records`);
    });
  }
}

checkTables().catch(console.error);