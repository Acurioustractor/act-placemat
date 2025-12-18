#!/usr/bin/env node

/**
 * Setup Year in Review curated entries in Supabase
 * 1. Creates the table via Supabase SQL API (requires privileged access)
 * 2. Migrates existing data from JSON file
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExists() {
  const { error } = await supabase
    .from('review_curated_entries')
    .select('id')
    .limit(1);

  return !error || !error.message.includes('does not exist');
}

async function migrateData(year = 2025) {
  const curatedFile = path.resolve(__dirname, `../apps/data/year-in-review/${year}/curated.json`);

  console.log(`📁 Reading curated data from: ${curatedFile}`);

  let data;
  try {
    const content = await fs.readFile(curatedFile, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to read curated file: ${error.message}`);
    return false;
  }

  console.log(`📊 Found ${data.entries?.length || 0} curated entries`);

  if (!data.entries || data.entries.length === 0) {
    console.log('⚠️ No entries to migrate');
    return true;
  }

  // Transform entries to match Supabase schema
  const entries = data.entries.map(entry => ({
    id: entry.id,
    year: year,
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
    hero_image_id: entry.heroImageId,
    hero_image_alt: entry.heroImageAlt,
    hero_video_url: entry.heroVideoUrl,
    hero_video_platform: entry.heroVideoPlatform,
    hero_video_title: entry.heroVideoTitle,
    photos: entry.photos || [],
    has_project_page: entry.hasProjectPage || false,
    project_slug: entry.projectSlug,
    season_order: entry.seasonOrder,
    display_order: entry.displayOrder,
    updated_at: new Date().toISOString()
  }));

  // Batch upsert in chunks of 50
  const chunkSize = 50;
  let successCount = 0;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);

    const { error } = await supabase
      .from('review_curated_entries')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Failed to upsert chunk ${i}-${i + chunk.length}: ${error.message}`);
      if (error.message.includes('does not exist')) {
        console.log('\n⚠️ Table does not exist. Please run this SQL in Supabase SQL Editor:');
        printCreateTableSQL();
        return false;
      }
    } else {
      successCount += chunk.length;
      console.log(`   ✅ Upserted ${successCount}/${entries.length} entries`);
    }
  }

  // Save year settings
  if (data.seasons || data.settings) {
    console.log('📝 Saving year settings...');

    const { error: settingsError } = await supabase
      .from('review_year_settings')
      .upsert({
        year: year,
        seasons: data.seasons || [],
        settings: data.settings || {},
        last_updated: data.lastUpdated || new Date().toISOString()
      }, { onConflict: 'year' });

    if (settingsError) {
      console.warn(`⚠️ Failed to save settings: ${settingsError.message}`);
    } else {
      console.log('✅ Year settings saved');
    }
  }

  console.log(`\n🎉 Migration complete! ${successCount}/${entries.length} entries migrated`);
  return true;
}

function printCreateTableSQL() {
  console.log(`
-- Run this SQL in the Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

CREATE TABLE IF NOT EXISTS review_curated_entries (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL DEFAULT 2025,
  date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  type TEXT NOT NULL DEFAULT 'milestone',
  tags TEXT[] DEFAULT '{}',
  status TEXT,
  metadata JSONB DEFAULT '{}',
  included BOOLEAN DEFAULT TRUE,
  edited_title TEXT,
  edited_description TEXT,
  hero_image_url TEXT,
  hero_image_id TEXT,
  hero_image_alt TEXT,
  hero_video_url TEXT,
  hero_video_platform TEXT,
  hero_video_title TEXT,
  photos TEXT[] DEFAULT '{}',
  has_project_page BOOLEAN DEFAULT FALSE,
  project_slug TEXT,
  season_order INTEGER,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_curated_year ON review_curated_entries(year);
CREATE INDEX IF NOT EXISTS idx_review_curated_date ON review_curated_entries(date);
CREATE INDEX IF NOT EXISTS idx_review_curated_included ON review_curated_entries(included);

CREATE TABLE IF NOT EXISTS review_year_settings (
  year INTEGER PRIMARY KEY,
  seasons JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE review_curated_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_year_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read access for curated entries" ON review_curated_entries
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Public read access for year settings" ON review_year_settings
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Service role write for curated entries" ON review_curated_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role write for year settings" ON review_year_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
`);
}

async function main() {
  const year = parseInt(process.argv[2]) || 2025;

  console.log(`\n🚀 Setting up Year in Review ${year} curated entries\n`);
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  // Check if table exists
  const tableExists = await checkTableExists();

  if (!tableExists) {
    console.log('\n⚠️ Table does not exist. Please create it first:');
    printCreateTableSQL();
    console.log('\nAfter creating the table, run this script again to migrate data.');
    process.exit(1);
  }

  console.log('✅ Table exists, proceeding with migration...\n');
  await migrateData(year);
}

main().catch(console.error);
