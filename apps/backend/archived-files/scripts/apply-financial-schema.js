#!/usr/bin/env node

/**
 * Apply Financial Intelligence Database Schema
 * Run this script to set up the required tables for the finance bookkeeping AI
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applySchema() {
  console.log('🗃️ Applying Financial Intelligence Database Schema...');
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Read schema files
    const schemaFiles = [
      '../database/bookkeeping-schema.sql',
      '../database/financial-v1-schema.sql'
    ];
    
    for (const schemaFile of schemaFiles) {
      const schemaPath = path.join(__dirname, schemaFile);
      
      if (!fs.existsSync(schemaPath)) {
        console.warn(`⚠️  Schema file not found: ${schemaPath}`);
        continue;
      }
      
      console.log(`📄 Processing ${schemaFile}...`);
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split into individual statements (basic parsing)
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*(BEGIN|COMMIT)\s*$/i));
      
      console.log(`   Found ${statements.length} SQL statements`);
      
      let successCount = 0;
      let skipCount = 0;
      
      for (const statement of statements) {
        try {
          // Execute each statement individually
          await supabase.rpc('exec_sql', { query: statement + ';' });
          successCount++;
        } catch (error) {
          // Check if it's a harmless "already exists" error
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')
          )) {
            skipCount++;
            console.log(`   ℹ️  Skipped (already exists): ${statement.substring(0, 60)}...`);
          } else {
            console.error(`   ❌ Failed: ${statement.substring(0, 60)}...`);
            console.error(`      Error: ${error.message}`);
          }
        }
      }
      
      console.log(`   ✅ Applied ${successCount} statements, skipped ${skipCount}`);
    }
    
    // Verify key tables exist
    console.log('\n🔍 Verifying table creation...');
    
    const expectedTables = [
      'bookkeeping_transactions',
      'bookkeeping_rules', 
      'bookkeeping_sync_state',
      'bookkeeping_project_links',
      'bookkeeping_receipts',
      'xero_transactions',
      'categorisation_rules',
      'activity_log',
      'daily_snapshots'
    ];
    
    const verificationResults = {};
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine
          verificationResults[tableName] = 'ERROR: ' + error.message;
        } else {
          verificationResults[tableName] = 'OK';
        }
      } catch (err) {
        verificationResults[tableName] = 'ERROR: ' + err.message;
      }
    }
    
    console.log('\nTable verification results:');
    for (const [table, status] of Object.entries(verificationResults)) {
      const icon = status === 'OK' ? '✅' : '❌';
      console.log(`   ${icon} ${table}: ${status}`);
    }
    
    const okCount = Object.values(verificationResults).filter(s => s === 'OK').length;
    const totalCount = Object.keys(verificationResults).length;
    
    console.log(`\n🎯 Schema application complete: ${okCount}/${totalCount} tables verified`);
    
    if (okCount === totalCount) {
      console.log('🚀 Financial Intelligence system ready!');
      
      // Additional setup recommendations
      console.log('\n📋 Next steps:');
      console.log('   1. Set up Xero OAuth credentials in environment variables');
      console.log('   2. Configure Redis connection for caching');
      console.log('   3. Run integration tests: npm test -- financial-intelligence');
      console.log('   4. Initialize ML models: POST /api/v1/intelligence/init');
    } else {
      console.log('⚠️  Some tables could not be verified. Check the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Schema application failed:', error.message);
    process.exit(1);
  }
}

// Run the schema application
if (import.meta.url === `file://${process.argv[1]}`) {
  applySchema().catch(console.error);
}

export default applySchema;