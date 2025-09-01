#!/usr/bin/env node

/**
 * Simple check for Empathy Ledger data
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tednluwflfhxyucgwigh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzNjY2MjksImV4cCI6MjAzNjk0MjYyOX0.jNE5fGFXKMLK6CQE3cSCHOQ8ZrfGj3ZaHXBhbvXFvX8'
);

console.log('💡 Can you tell me:');
console.log('1. What is the exact table name for the Empathy Ledger stories?');
console.log('2. Are they in the "public" schema or somewhere else?');
console.log('3. What does a typical story record look like?');
console.log('');
console.log('Once I know the table name, I can integrate them into the platform.');

// Test basic connection
async function testConnection() {
  try {
    console.log('🔗 Testing basic Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Connection error:', error.message);
    } else {
      console.log('✅ Supabase connection working');
    }
  } catch (e) {
    console.log('❌ Connection failed:', e.message);
  }
}

testConnection();