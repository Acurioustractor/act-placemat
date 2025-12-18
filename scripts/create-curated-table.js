#!/usr/bin/env node

/**
 * Create the review_curated_entries table directly via Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
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

async function createTable() {
  console.log('🚀 Creating review_curated_entries table...');

  // Check if table already exists by trying to select from it
  const { error: checkError } = await supabase
    .from('review_curated_entries')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Table already exists!');
    return true;
  }

  // If table doesn't exist, we need to create it via the SQL editor in Supabase dashboard
  // Since we can't run raw SQL via the JS client, output instructions
  console.log('⚠️ Table does not exist. Please run this SQL in the Supabase SQL Editor:');
  console.log(`
-- Migration: Store Year in Review curated entries in Supabase

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

-- Enable RLS
ALTER TABLE review_curated_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_year_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for curated entries" ON review_curated_entries
  FOR SELECT USING (true);

CREATE POLICY "Public read access for year settings" ON review_year_settings
  FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service role write access for curated entries" ON review_curated_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role write access for year settings" ON review_year_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
`);

  return false;
}

createTable();
