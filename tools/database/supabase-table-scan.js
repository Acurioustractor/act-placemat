#!/usr/bin/env node

/**
 * Scan for all tables using Supabase REST API directly
 */

const SUPABASE_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo';

// Try common table names for Empathy Ledger
const POSSIBLE_TABLES = [
  'stories',
  'empathy_ledger', 
  'empathy_stories',
  'ledger_stories',
  'community_stories',
  'impact_stories',
  'client_stories',
  'case_studies',
  'testimonials',
  'feedback',
  'reviews',
  'experiences',
  'narratives',
  'accounts',
  'entries',
  'records',
  'data',
  'content',
  'posts',
  'items',
  'notes',
  'submissions',
  'responses'
];

async function checkTable(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Range': '0-0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const countHeader = response.headers.get('content-range');
      const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
      
      console.log(`✅ ${tableName}: ${count} records`);
      
      if (data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        console.log(`   Sample: ${JSON.stringify(data[0], null, 2).substring(0, 300)}...`);
      }
      
      return { name: tableName, count, sample: data[0] };
    }
  } catch (error) {
    // Skip silently
  }
  return null;
}

async function scanAllTables() {
  console.log('🔍 Scanning for Empathy Ledger tables in Supabase...\n');
  
  const foundTables = [];
  
  for (const tableName of POSSIBLE_TABLES) {
    const result = await checkTable(tableName);
    if (result) {
      foundTables.push(result);
    }
  }
  
  console.log(`\n📊 Summary: Found ${foundTables.length} accessible tables`);
  
  if (foundTables.length > 0) {
    console.log('\n🎉 Tables with data:');
    foundTables.forEach(table => {
      console.log(`   - ${table.name}: ${table.count} records`);
    });
    
    // Show the biggest table (likely the main stories table)
    const biggest = foundTables.reduce((prev, current) => 
      (prev.count > current.count) ? prev : current
    );
    
    console.log(`\n💾 Largest table "${biggest.name}" structure:`);
    if (biggest.sample) {
      Object.keys(biggest.sample).forEach(key => {
        const value = biggest.sample[key];
        const type = typeof value;
        const preview = String(value).substring(0, 50);
        console.log(`   ${key}: ${type} - "${preview}"`);
      });
    }
  } else {
    console.log('\n❌ No tables found with common story/empathy names');
    console.log('The data might be in a different table name or schema');
  }
}

scanAllTables();