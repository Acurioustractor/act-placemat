#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Testing connection to Empathy Ledger database...\n');

try {
  // Try to access some known tables from Empathy Ledger
  console.log('Checking for existing Empathy Ledger tables...');
  
  const tables = ['stories', 'quotes', 'themes', 'organizations', 'storytellers'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': ${count} records`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}': ${e.message}`);
    }
  }
  
  console.log('\n🎯 Connection test complete!');
  
} catch (error) {
  console.error('💥 Connection failed:', error);
}