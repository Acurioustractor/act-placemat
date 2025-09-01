#!/usr/bin/env node

/**
 * Comprehensive Supabase Database Diagnostics
 * Identifies table access, schema, and permission issues
 */

import { createClient } from '@supabase/supabase-js';

const CONFIG = {
  supabaseUrl: 'https://tednluwflfhxyucgwigh.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzNjY2MjksImV4cCI6MjAzNjk0MjYyOX0.jNE5fGFXKMLK6CQE3cSCHOQ8ZrfGj3ZaHXBhbvXFvX8'
};

console.log('🔍 SUPABASE DATABASE DIAGNOSTICS');
console.log('='.repeat(50));
console.log(`URL: ${CONFIG.supabaseUrl}`);
console.log(`Key: ${CONFIG.supabaseKey.substring(0, 20)}...`);
console.log('');

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// Test tables we expect to exist
const expectedTables = [
  'stories',
  'projects', 
  'opportunities',
  'organizations',
  'people',
  'artifacts'
];

async function testBasicConnection() {
  console.log('🔗 BASIC CONNECTION TEST');
  console.log('-'.repeat(30));
  
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('✅ Auth connection successful');
    console.log(`   Session: ${data.session ? 'Active' : 'Anonymous'}`);
    return true;
  } catch (error) {
    console.error('❌ Auth connection failed:', error.message);
    return false;
  }
}

async function listAllTables() {
  console.log('\n📋 AVAILABLE TABLES DISCOVERY');
  console.log('-'.repeat(30));
  
  try {
    // Try to get schema information
    const { data, error } = await supabase.rpc('get_schema_tables');
    
    if (error) {
      console.log('⚠️  Custom schema function not available');
      console.log('   Trying alternative methods...');
      
      // Try PostgreSQL information_schema (if accessible)
      const { data: pgData, error: pgError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (pgError) {
        console.log('⚠️  PostgreSQL schema query blocked');
        console.log('   Will test expected tables individually');
      } else {
        console.log('✅ Found tables via PostgreSQL schema:');
        pgData.forEach(table => console.log(`   - ${table.table_name}`));
      }
    } else {
      console.log('✅ Found tables via custom function:');
      data.forEach(table => console.log(`   - ${table}`));
    }
  } catch (error) {
    console.log('⚠️  Schema discovery failed, will test individual tables');
  }
}

async function testTableAccess(tableName) {
  const tests = {
    exists: false,
    readable: false,
    writable: false,
    count: 0,
    sampleData: null,
    error: null
  };
  
  try {
    // Test 1: Basic existence and read access
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      tests.error = error.message;
      
      // Check specific error types
      if (error.message.includes('does not exist')) {
        tests.error = 'Table does not exist';
      } else if (error.message.includes('permission denied')) {
        tests.error = 'Permission denied - RLS policy issue';
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        tests.error = 'Table/relation not found in schema';
      }
      
      return tests;
    }
    
    tests.exists = true;
    tests.readable = true;
    tests.count = count || 0;
    
    // Test 2: Get sample data if table has records
    if (count > 0) {
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(2);
      
      if (!sampleError && sampleData) {
        tests.sampleData = sampleData;
      }
    }
    
    // Test 3: Write access (try inserting then immediately deleting)
    try {
      const testRecord = { 
        title: 'DIAGNOSTIC_TEST_DELETE_ME',
        test_field: true 
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert([testRecord])
        .select()
        .single();
      
      if (!insertError && insertData) {
        tests.writable = true;
        
        // Clean up test record
        await supabase
          .from(tableName)
          .delete()
          .eq('id', insertData.id);
      }
    } catch (writeError) {
      // Write test failed, but read might still work
    }
    
  } catch (error) {
    tests.error = error.message;
  }
  
  return tests;
}

async function testRLSPolicies() {
  console.log('\n🔒 ROW LEVEL SECURITY (RLS) ANALYSIS');
  console.log('-'.repeat(30));
  
  try {
    // Try to query RLS policies (may not be accessible with anon key)
    const { data, error } = await supabase.rpc('get_rls_policies');
    
    if (error) {
      console.log('⚠️  RLS policy query not accessible with current permissions');
      console.log('   This is normal for anonymous access');
      console.log('   Will check table access patterns instead...');
    } else {
      console.log('✅ RLS policies found:');
      data.forEach(policy => console.log(`   - ${policy.tablename}: ${policy.policyname}`));
    }
  } catch (error) {
    console.log('⚠️  RLS analysis not available');
  }
}

async function suggestFixes(results) {
  console.log('\n🛠️  DIAGNOSIS & RECOMMENDATIONS');
  console.log('-'.repeat(30));
  
  const issues = [];
  const fixes = [];
  
  // Analyze results
  const existingTables = Object.keys(results).filter(table => results[table].exists);
  const missingTables = Object.keys(results).filter(table => !results[table].exists);
  const unreadableTables = Object.keys(results).filter(table => 
    results[table].exists && !results[table].readable
  );
  const emptyTables = Object.keys(results).filter(table => 
    results[table].exists && results[table].readable && results[table].count === 0
  );
  
  console.log(`📊 Table Analysis:`);
  console.log(`   Existing & Accessible: ${existingTables.length}`);
  console.log(`   Missing: ${missingTables.length}`);
  console.log(`   Permission Issues: ${unreadableTables.length}`);
  console.log(`   Empty (no data): ${emptyTables.length}`);
  
  if (missingTables.length > 0) {
    issues.push(`Missing tables: ${missingTables.join(', ')}`);
    fixes.push(`Create missing tables or check schema migration status`);
  }
  
  if (unreadableTables.length > 0) {
    issues.push(`Permission denied: ${unreadableTables.join(', ')}`);
    fixes.push(`Update RLS policies to allow anonymous or authenticated access`);
  }
  
  if (emptyTables.length > 0) {
    issues.push(`Empty tables: ${emptyTables.join(', ')}`);
    fixes.push(`Populate tables with seed data or check data migration`);
  }
  
  if (issues.length === 0) {
    console.log('✅ No major issues found!');
  } else {
    console.log('\n❌ Issues Found:');
    issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
    
    console.log('\n🔧 Recommended Fixes:');
    fixes.forEach((fix, i) => console.log(`   ${i + 1}. ${fix}`));
  }
  
  // Check if this looks like a fresh database
  if (existingTables.length === 0) {
    console.log('\n💡 This appears to be a fresh Supabase instance.');
    console.log('   You may need to run database migrations first.');
    console.log('   Check: apps/backend/database/migrations/');
  }
}

async function runDiagnostics() {
  try {
    // Step 1: Basic connection
    const connected = await testBasicConnection();
    if (!connected) {
      console.log('❌ Cannot proceed - basic connection failed');
      return;
    }
    
    // Step 2: Discover available tables
    await listAllTables();
    
    // Step 3: Test each expected table
    console.log('\n🧪 INDIVIDUAL TABLE TESTS');
    console.log('-'.repeat(30));
    
    const results = {};
    
    for (const table of expectedTables) {
      console.log(`\nTesting table: ${table}`);
      const result = await testTableAccess(table);
      results[table] = result;
      
      if (result.exists && result.readable) {
        console.log(`✅ ${table}: Accessible (${result.count} records)`);
        if (result.sampleData && result.sampleData.length > 0) {
          const keys = Object.keys(result.sampleData[0]).slice(0, 3);
          console.log(`   Sample fields: ${keys.join(', ')}`);
        }
      } else if (result.exists && !result.readable) {
        console.log(`⚠️  ${table}: Exists but not readable - ${result.error}`);
      } else {
        console.log(`❌ ${table}: ${result.error || 'Not accessible'}`);
      }
    }
    
    // Step 4: RLS Analysis
    await testRLSPolicies();
    
    // Step 5: Recommendations
    await suggestFixes(results);
    
    // Step 6: Generate report
    const report = {
      timestamp: new Date().toISOString(),
      connection: 'successful',
      results,
      summary: {
        total: expectedTables.length,
        existing: Object.values(results).filter(r => r.exists).length,
        accessible: Object.values(results).filter(r => r.readable).length,
        withData: Object.values(results).filter(r => r.count > 0).length
      }
    };
    
    const fs = await import('fs');
    fs.writeFileSync('supabase-diagnostics.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Full diagnostic report saved to: supabase-diagnostics.json');
    
  } catch (error) {
    console.error('\n💥 Diagnostic failed:', error);
  }
}

// Execute
runDiagnostics();