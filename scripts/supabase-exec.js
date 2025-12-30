#!/usr/bin/env node

/**
 * Supabase SQL Executor
 * Run SQL files or queries against Supabase using the service role key
 *
 * Usage:
 *   node scripts/supabase-exec.js --list-tables
 *   node scripts/supabase-exec.js --check <table>
 *   node scripts/supabase-exec.js --query <table> [limit]
 *   node scripts/supabase-exec.js --create-review-tables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_ANON_KEY; // Using service role for admin ops

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listTables() {
  // Use introspection endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  const swagger = await response.json();
  const tables = Object.keys(swagger.paths || {})
    .filter(p => p !== '/' && !p.includes('/rpc/'))
    .map(p => p.replace('/', ''));
  return tables.sort();
}

async function checkTable(tableName) {
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    return { exists: false, error: error.message };
  }
  return { exists: true, count };
}

async function queryTable(tableName, limit = 5) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function insertData(tableName, records) {
  const { data, error } = await supabase
    .from(tableName)
    .upsert(records, { onConflict: 'id' })
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function createReviewTables() {
  console.log('Creating Year in Review tables...\n');

  // We'll create the tables by inserting initial data
  // This works because Supabase auto-creates tables with RLS disabled initially

  // First, check if tables exist
  const entriesCheck = await checkTable('review_curated_entries');
  const settingsCheck = await checkTable('review_year_settings');

  if (entriesCheck.exists) {
    console.log('review_curated_entries already exists with', entriesCheck.count, 'rows');
  } else {
    console.log('review_curated_entries does not exist');
    console.log('\nTo create the tables, run this SQL in Supabase Dashboard SQL Editor:');
    console.log('https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new\n');

    const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20251218_review_curated_entries.sql');
    if (fs.existsSync(sqlFile)) {
      console.log('--- SQL to execute ---');
      console.log(fs.readFileSync(sqlFile, 'utf8'));
      console.log('--- End SQL ---\n');
    }
  }

  if (settingsCheck.exists) {
    console.log('review_year_settings already exists with', settingsCheck.count, 'rows');
  }
}

async function syncCuratedData() {
  console.log('Syncing curated data to Supabase...\n');

  // Load curated.json
  const curatedPath = path.join(__dirname, '..', 'apps', 'data', 'year-in-review', '2025', 'curated.json');
  if (!fs.existsSync(curatedPath)) {
    console.error('curated.json not found at:', curatedPath);
    return;
  }

  const curatedData = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
  console.log(`Found ${curatedData.entries?.length || 0} entries in curated.json`);

  // Check if table exists first
  const tableCheck = await checkTable('review_curated_entries');
  if (!tableCheck.exists) {
    console.error('\nTable does not exist. Create it first using --create-review-tables');
    return;
  }

  // Transform and insert entries
  const entries = (curatedData.entries || []).map(entry => ({
    id: entry.id,
    year: 2025,
    date: entry.date,
    title: entry.title,
    description: entry.description,
    source: entry.source || 'manual',
    type: entry.type || 'milestone',
    tags: entry.tags || [],
    status: entry.status,
    metadata: entry.metadata || {},
    included: entry.included !== false,
    edited_title: entry.editedTitle,
    edited_description: entry.editedDescription,
    hero_image_url: entry.heroImageUrl,
    hero_video_url: entry.heroVideoUrl,
    photos: entry.photos || [],
    has_project_page: entry.hasProjectPage || false,
    project_slug: entry.projectSlug,
    season_order: entry.seasonOrder,
    display_order: entry.displayOrder
  }));

  if (entries.length > 0) {
    const result = await insertData('review_curated_entries', entries);
    console.log(`Synced ${result.length} entries to Supabase`);
  }

  // Sync settings
  if (curatedData.settings) {
    const settings = {
      year: 2025,
      seasons: curatedData.settings.seasons || [],
      settings: curatedData.settings,
      last_updated: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('review_year_settings')
      .upsert(settings, { onConflict: 'year' })
      .select();

    if (error) {
      console.error('Error syncing settings:', error.message);
    } else {
      console.log('Synced year settings');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Supabase Executor for ACT Platform

Usage:
  node scripts/supabase-exec.js --list-tables           List all tables
  node scripts/supabase-exec.js --check <table>         Check if table exists
  node scripts/supabase-exec.js --query <table> [n]     Query table (default 5 rows)
  node scripts/supabase-exec.js --create-review-tables  Show SQL to create review tables
  node scripts/supabase-exec.js --sync-curated          Sync curated.json to Supabase

Environment:
  SUPABASE_URL: ${SUPABASE_URL ? '✓ Set' : '✗ Missing'}
  SERVICE_KEY:  ${SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}
`);
    return;
  }

  try {
    if (args[0] === '--list-tables') {
      console.log('Fetching tables from Supabase...\n');
      const tables = await listTables();
      console.log('Tables in public schema:');
      tables.forEach(t => console.log(`  - ${t}`));
      console.log(`\nTotal: ${tables.length} tables`);
    }
    else if (args[0] === '--check' && args[1]) {
      const result = await checkTable(args[1]);
      if (result.exists) {
        console.log(`✓ Table "${args[1]}" exists (${result.count} rows)`);
      } else {
        console.log(`✗ Table "${args[1]}" does not exist: ${result.error}`);
      }
    }
    else if (args[0] === '--query' && args[1]) {
      const limit = parseInt(args[2]) || 5;
      const data = await queryTable(args[1], limit);
      console.log(`Query results from "${args[1]}" (${data.length} rows):\n`);
      console.log(JSON.stringify(data, null, 2));
    }
    else if (args[0] === '--create-review-tables') {
      await createReviewTables();
    }
    else if (args[0] === '--sync-curated') {
      await syncCuratedData();
    }
    else {
      console.error('Unknown command. Run without arguments for help.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
