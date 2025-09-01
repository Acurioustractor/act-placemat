#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking Empathy Ledger table schemas...\n');

async function checkTableSchema(tableName) {
  try {
    console.log(`📋 ${tableName.toUpperCase()} TABLE:`);
    
    // Get first few records to see the actual structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error: ${error.message}\n`);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`   Columns: ${columns.join(', ')}`);
      
      // Show sample data
      console.log('   Sample record:');
      for (const [key, value] of Object.entries(data[0])) {
        const preview = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
        console.log(`     ${key}: ${preview}`);
      }
    } else {
      console.log('   No data found');
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`❌ Failed to check ${tableName}: ${error.message}\n`);
  }
}

// Check all tables
await checkTableSchema('stories');
await checkTableSchema('quotes');
await checkTableSchema('themes');
await checkTableSchema('organizations');
await checkTableSchema('storytellers');