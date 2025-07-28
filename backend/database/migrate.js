#!/usr/bin/env node

/**
 * Safe Supabase Schema Migration Tool
 * Applies database changes incrementally and safely
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client with service role key for migrations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS _act_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum TEXT NOT NULL
      );
    `
  });

  if (error) {
    console.error('❌ Failed to create migrations table:', error);
    throw error;
  }
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  const { data, error } = await supabase
    .from('_act_migrations')
    .select('filename, checksum')
    .order('id');

  if (error) {
    console.error('❌ Failed to fetch applied migrations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Calculate simple checksum for migration content
 */
function calculateChecksum(content) {
  return Buffer.from(content).toString('base64').slice(0, 32);
}

/**
 * Execute a migration file
 */
async function executeMigration(filename, content) {
  console.log(`🔄 Applying migration: ${filename}`);
  
  // Split content by statement separator and execute each
  const statements = content
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    if (statement.toLowerCase().includes('-- skip-in-migration')) {
      continue;
    }

    const { error } = await supabase.rpc('exec_sql', {
      query: statement + ';'
    });

    if (error) {
      console.error(`❌ Failed to execute statement in ${filename}:`, error);
      console.error('Statement:', statement);
      throw error;
    }
  }

  // Record successful migration
  const checksum = calculateChecksum(content);
  const { error: recordError } = await supabase
    .from('_act_migrations')
    .insert({
      filename,
      checksum
    });

  if (recordError) {
    console.error('❌ Failed to record migration:', recordError);
    throw recordError;
  }

  console.log(`✅ Migration applied: ${filename}`);
}

/**
 * Main migration function
 */
async function runMigrations() {
  console.log('🚀 Starting ACT Database Migrations...\n');

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();

    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations();
    const appliedFiles = new Set(appliedMigrations.map(m => m.filename));

    // Get list of migration files
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Important: apply in alphabetical order

    console.log(`📂 Found ${migrationFiles.length} migration files`);
    console.log(`✅ ${appliedFiles.size} migrations already applied\n`);

    let appliedCount = 0;

    for (const filename of migrationFiles) {
      if (appliedFiles.has(filename)) {
        console.log(`⏭️  Skipping ${filename} (already applied)`);
        continue;
      }

      const filePath = join(migrationsDir, filename);
      const content = readFileSync(filePath, 'utf8');
      
      await executeMigration(filename, content);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('\n🎉 Database is up to date! No migrations needed.');
    } else {
      console.log(`\n🎉 Successfully applied ${appliedCount} migrations!`);
    }

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === '--help' || command === '-h') {
  console.log(`
ACT Database Migration Tool

Usage:
  node migrate.js                    # Run all pending migrations
  node migrate.js --dry-run          # Show what would be migrated
  node migrate.js --status           # Show migration status
  node migrate.js --help             # Show this help

Environment Variables Required:
  SUPABASE_URL                       # Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY          # Service role key (not anon key!)

Migration Files:
  Place .sql files in database/migrations/
  Files are applied in alphabetical order
  Naming convention: YYYY-MM-DD-HHMM-description.sql

Example:
  2024-01-15-1000-initial-schema.sql
  2024-01-15-1030-add-user-tables.sql
  `);
  process.exit(0);
}

if (command === '--status') {
  try {
    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();
    const migrationsDir = join(__dirname, 'migrations');
    const allFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('\n📊 Migration Status:\n');
    
    for (const file of allFiles) {
      const isApplied = applied.some(m => m.filename === file);
      const status = isApplied ? '✅ Applied' : '⏳ Pending';
      console.log(`  ${status}  ${file}`);
    }
    
    console.log(`\nTotal: ${allFiles.length} migrations, ${applied.length} applied\n`);
  } catch (error) {
    console.error('Error checking status:', error);
    process.exit(1);
  }
  process.exit(0);
}

if (command === '--dry-run') {
  console.log('🔍 Dry run mode - showing what would be migrated...\n');
  // Implementation for dry run
  process.exit(0);
}

// Run migrations
runMigrations();