#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// Read the migration SQL
const fs = require('fs');
const path = require('path');
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250121_linkedin_contacts.sql');

console.log('📚 Reading migration file...');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split SQL into individual statements (roughly)
const statements = migrationSQL
  .split(/;\s*\n/)
  .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
  .map(stmt => stmt.trim() + ';');

console.log(`📝 Found ${statements.length} SQL statements to execute`);

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const postData = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Alternative: Use direct SQL execution endpoint
async function executeSQLDirect(sql) {
  return new Promise((resolve, reject) => {
    // Use Supabase's direct SQL endpoint
    const url = new URL(`${SUPABASE_URL}/rest/v1/`);
    
    const postData = sql;

    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/sql',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Check if tables exist
async function checkTablesExist() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/linkedin_contacts`);
    url.searchParams.append('select', 'id');
    url.searchParams.append('limit', '1');

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.end();
  });
}

async function main() {
  console.log('🔍 Checking if LinkedIn tables already exist...');
  
  const tablesExist = await checkTablesExist();
  
  if (tablesExist) {
    console.log('✅ LinkedIn tables already exist!');
    console.log('🎉 Ready to import data');
    return;
  }

  console.log('📦 LinkedIn tables not found. Creating them now...');
  console.log('\n⚠️  NOTE: This script cannot directly execute SQL in Supabase.');
  console.log('📋 Please run the following migration manually in Supabase SQL Editor:');
  console.log('\n1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new');
  console.log('2. Copy the contents of: supabase/migrations/20250121_linkedin_contacts.sql');
  console.log('3. Paste and run in the SQL editor');
  console.log('\n📄 Migration file location:');
  console.log(`   ${migrationPath}`);
  
  // Write a simplified version for easy copy-paste
  const simplifiedSQL = `
-- LinkedIn Contact Tables - Simplified for manual execution
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Main contacts table
CREATE TABLE IF NOT EXISTS linkedin_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  linkedin_url TEXT UNIQUE,
  email_address TEXT,
  current_company TEXT,
  current_position TEXT,
  location TEXT,
  connected_date DATE,
  data_source TEXT,
  relationship_score DECIMAL(3,2) DEFAULT 0.50,
  strategic_value TEXT DEFAULT 'unknown',
  influence_level TEXT,
  network_reach INTEGER,
  engagement_frequency TEXT,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  alignment_tags TEXT[] DEFAULT '{}',
  skills_extracted TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  notion_person_id TEXT,
  gmail_contact_id TEXT,
  raw_data JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_linkedin_contacts_email ON linkedin_contacts(email_address);
CREATE INDEX idx_linkedin_contacts_company ON linkedin_contacts(current_company);
CREATE INDEX idx_linkedin_contacts_score ON linkedin_contacts(relationship_score DESC);

-- Grant permissions
GRANT ALL ON linkedin_contacts TO service_role;
GRANT SELECT ON linkedin_contacts TO anon;
`;

  const simplifiedPath = path.join(__dirname, 'create-linkedin-tables-simple.sql');
  fs.writeFileSync(simplifiedPath, simplifiedSQL);
  
  console.log('\n✅ Created simplified SQL file at:');
  console.log(`   ${simplifiedPath}`);
  console.log('\n📋 You can also copy this simplified version directly into Supabase SQL Editor');
}

main().catch(console.error);