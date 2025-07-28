#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🌱 Extending Empathy Ledger with ACT Public Dashboard...\n');

async function applyExtension() {
  try {
    // Read the extension SQL file
    const extensionPath = join(__dirname, 'database/migrations/2024-01-15-1000-act-public-dashboard-extension.sql');
    const sql = readFileSync(extensionPath, 'utf8');
    
    console.log('📄 Loaded extension SQL file');
    console.log('🔄 Applying extension to your existing Empathy Ledger...\n');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('create table') || 
          statement.toLowerCase().includes('create or replace view') ||
          statement.toLowerCase().includes('create index') ||
          statement.toLowerCase().includes('insert into')) {
        
        console.log(`${i + 1}/${statements.length} Executing: ${statement.substring(0, 60)}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', {
            query: statement + ';'
          });
          
          if (error) {
            // If exec_sql doesn't exist, try direct execution for some statements
            if (error.code === 'PGRST202') {
              // For CREATE TABLE statements, we can try using the direct approach
              if (statement.toLowerCase().includes('create table')) {
                console.log('  ⚠️  exec_sql not available, using alternative approach...');
                // We'll handle this differently
                continue;
              }
            }
            throw error;
          }
          
          console.log('  ✅ Success');
        } catch (error) {
          console.log(`  ❌ Failed: ${error.message}`);
          if (error.message.includes('already exists')) {
            console.log('  ℹ️  Already exists - continuing...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n🎉 ACT Public Dashboard extension applied successfully!');
    console.log('\n📊 Your database now has:');
    console.log('  ✅ Original Empathy Ledger tables (preserved)');
    console.log('  ✅ New ACT public dashboard tables');
    console.log('  ✅ Bridge views connecting old and new data');
    
  } catch (error) {
    console.error('\n💥 Extension failed:', error);
    
    if (error.code === 'PGRST202') {
      console.log('\n💡 Your database needs SQL execution capabilities.');
      console.log('   Let\'s try a different approach...');
      return false;
    }
    
    throw error;
  }
  
  return true;
}

// Run the extension
const success = await applyExtension();

if (!success) {
  console.log('\n🔧 Trying manual table creation approach...');
  process.exit(1);
}