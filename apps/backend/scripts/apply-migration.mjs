#!/usr/bin/env node
/**
 * Apply migration to Supabase
 * Usage: node apply-migration.mjs <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

// Get migration file from command line
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node apply-migration.mjs <migration-file>');
  process.exit(1);
}

const migrationPath = resolve(__dirname, '../../../supabase/migrations', migrationFile);

console.log('🔧 Applying migration...');
console.log(`   File: ${migrationFile}`);
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log('');

try {
  // Read migration SQL
  const sql = readFileSync(migrationPath, 'utf8');

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Execute migration using RPC (safer than raw SQL)
  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📊 Found ${statements.length} SQL statements to execute`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and empty statements
    if (statement.startsWith('--') || statement.trim() === '') {
      continue;
    }

    // Show progress
    if (statement.includes('CREATE TABLE')) {
      const match = statement.match(/CREATE TABLE.*?(\w+)\s*\(/i);
      if (match) {
        console.log(`   ⏳ Creating table: ${match[1]}...`);
      }
    } else if (statement.includes('CREATE INDEX')) {
      const match = statement.match(/CREATE INDEX.*?(\w+)/i);
      if (match) {
        console.log(`   ⏳ Creating index: ${match[1]}...`);
      }
    } else if (statement.includes('ALTER TABLE')) {
      const match = statement.match(/ALTER TABLE.*?(\w+)/i);
      if (match) {
        console.log(`   ⏳ Altering table: ${match[1]}...`);
      }
    }

    try {
      // Execute statement (Supabase doesn't support direct SQL exec via JS client)
      // We'll use the postgREST API instead
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // If exec_sql doesn't exist, fall back to trying direct execution
        // This won't work for DDL, but we can at least report the error
        console.warn(`   ⚠️  Statement ${i + 1}: ${error.message.substring(0, 80)}...`);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.warn(`   ⚠️  Statement ${i + 1}: ${err.message.substring(0, 80)}...`);
      errorCount++;
    }
  }

  console.log('');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Warnings: ${errorCount}`);
  console.log('');

  if (errorCount > 0) {
    console.log('⚠️  Note: Supabase JS client cannot execute DDL statements directly.');
    console.log('   Please use one of these methods instead:');
    console.log('   1. Supabase Dashboard → SQL Editor → Paste migration');
    console.log('   2. psql with direct connection string');
    console.log('   3. Supabase CLI: supabase db push');
    console.log('');
    console.log(`   Migration file: ${migrationPath}`);
  } else {
    console.log('✅ Migration completed successfully!');
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
