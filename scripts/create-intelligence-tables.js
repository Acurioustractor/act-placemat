#!/usr/bin/env node

/**
 * Create Intelligence Tables for ACT Platform v3
 * 
 * This script creates the essential intelligence tables directly via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Creating Intelligence Tables for ACT Platform v3');
console.log('==================================================');

async function createContactIntelligenceTable() {
  console.log('\n📊 Creating contact_intelligence table...');
  
  try {
    // Check if table exists
    const { data: existingTable } = await supabase
      .from('contact_intelligence')
      .select('id')
      .limit(1);
    
    if (existingTable) {
      console.log('✅ contact_intelligence table already exists');
      return true;
    }
  } catch (error) {
    // Table doesn't exist, which is expected
    console.log('📋 contact_intelligence table does not exist, will create via SQL');
  }

  // Since we can't create tables directly via the client, let's use a different approach
  // We'll create the table by inserting a dummy record that will auto-create the structure
  console.log('⚠️ Cannot create tables directly via Supabase client');
  console.log('📋 Please run the SQL migration manually in Supabase dashboard');
  return false;
}

async function createMinimalTables() {
  console.log('\n🔧 Creating minimal table structure...');
  
  // Let's try to create a simple version using SQL via the REST API
  const createTableSQL = `
    -- Create contact_intelligence table
    CREATE TABLE IF NOT EXISTS contact_intelligence (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      contact_id UUID NOT NULL,
      intelligence JSONB DEFAULT '{}'::jsonb,
      collaboration_score INTEGER DEFAULT 50,
      response_rate INTEGER DEFAULT 70,
      influence_score INTEGER DEFAULT 50,
      last_interaction TIMESTAMPTZ,
      interaction_count INTEGER DEFAULT 0,
      project_matches INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create contact_enrichments table
    CREATE TABLE IF NOT EXISTS contact_enrichments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      contact_id UUID NOT NULL,
      enrichment JSONB DEFAULT '{}'::jsonb,
      mode TEXT DEFAULT 'ai',
      collaboration_potential INTEGER DEFAULT 50,
      reasoning TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Grant permissions
    GRANT ALL ON contact_intelligence TO service_role;
    GRANT ALL ON contact_enrichments TO service_role;
    GRANT SELECT ON contact_intelligence TO anon;
    GRANT SELECT ON contact_enrichments TO anon;
  `;

  console.log('📋 SQL to execute:');
  console.log(createTableSQL);
  
  return createTableSQL;
}

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('linkedin_contacts')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
    
    console.log('✅ Connected to Supabase successfully');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing Supabase connection...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Supabase. Please check your environment variables.');
    process.exit(1);
  }

  // Try to create tables
  await createContactIntelligenceTable();
  
  // Generate SQL for manual execution
  const sql = await createMinimalTables();
  
  console.log('\n📋 MANUAL MIGRATION REQUIRED');
  console.log('============================');
  console.log('Please copy and paste the following SQL into your Supabase SQL Editor:');
  console.log('');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Create a new query');
  console.log('4. Paste the SQL above');
  console.log('5. Click "Run"');
  console.log('');
  console.log('Alternatively, you can copy the full migration file:');
  console.log('supabase/migrations/20251120020000_intelligence_v3_tables.sql');
  console.log('');
  console.log('After running the SQL, restart your server and try again.');
}

main().catch(console.error);
