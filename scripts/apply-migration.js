#!/usr/bin/env node

/**
 * Apply Intelligence v3 Migration
 * 
 * Manually applies the intelligence tables migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Applying Intelligence v3 Migration');
console.log('=====================================');

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20251120020000_intelligence_v3_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`📏 SQL length: ${migrationSQL.length} characters`);

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Results:');
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with some errors. This may be normal for CREATE IF NOT EXISTS statements.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach: Execute the SQL directly
async function applyMigrationDirect() {
  try {
    console.log('🔄 Trying direct SQL execution...');
    
    // Test with a simple query first
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'contact_intelligence');

    if (error) {
      console.error('❌ Cannot query database:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ contact_intelligence table already exists');
    } else {
      console.log('📋 contact_intelligence table does not exist, creating...');
      
      // Create the most important table manually
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS contact_intelligence (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          contact_id UUID NOT NULL,
          intelligence JSONB NOT NULL DEFAULT '{}'::jsonb,
          collaboration_score INTEGER DEFAULT 50 CHECK (collaboration_score >= 0 AND collaboration_score <= 100),
          response_rate INTEGER DEFAULT 70 CHECK (response_rate >= 0 AND response_rate <= 100),
          influence_score INTEGER DEFAULT 50 CHECK (influence_score >= 0 AND influence_score <= 100),
          last_interaction TIMESTAMPTZ,
          interaction_count INTEGER DEFAULT 0,
          project_matches INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // This won't work with Supabase client directly, so let's use a different approach
      console.log('⚠️ Cannot create tables directly via Supabase client');
      console.log('📋 Please run the migration SQL manually in the Supabase dashboard');
    }

  } catch (error) {
    console.error('❌ Direct migration failed:', error);
  }
}

async function main() {
  try {
    // Test connection
    const { data, error } = await supabase.from('linkedin_contacts').select('count').limit(1);
    if (error) {
      console.error('❌ Cannot connect to Supabase:', error);
      process.exit(1);
    }

    console.log('✅ Connected to Supabase successfully');

    // Try direct approach
    await applyMigrationDirect();

    console.log('\n📋 Manual Migration Required');
    console.log('=============================');
    console.log('Please copy and paste the following SQL into your Supabase SQL Editor:');
    console.log('');
    console.log('File: supabase/migrations/20251120020000_intelligence_v3_tables.sql');
    console.log('');
    console.log('This will create all the necessary tables for the Intelligence v3 system.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
