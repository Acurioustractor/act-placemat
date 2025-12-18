#!/usr/bin/env node

/**
 * Migrate Year in Review curated entries from JSON file to Supabase
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCuratedEntries(year = 2025) {
  const curatedFile = path.resolve(__dirname, `../apps/data/year-in-review/${year}/curated.json`);

  console.log(`📁 Reading curated data from: ${curatedFile}`);

  let data;
  try {
    const content = await fs.readFile(curatedFile, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to read curated file: ${error.message}`);
    return;
  }

  console.log(`📊 Found ${data.entries?.length || 0} curated entries`);

  if (!data.entries || data.entries.length === 0) {
    console.log('⚠️ No entries to migrate');
    return;
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

  // Upsert entries
  console.log(`🚀 Upserting ${entries.length} entries to Supabase...`);

  const { data: result, error } = await supabase
    .from('review_curated_entries')
    .upsert(entries, { onConflict: 'id' });

  if (error) {
    console.error(`❌ Failed to upsert entries: ${error.message}`);
    console.error(error);
    return;
  }

  console.log(`✅ Successfully migrated ${entries.length} entries`);

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
      });

    if (settingsError) {
      console.error(`⚠️ Failed to save settings: ${settingsError.message}`);
    } else {
      console.log('✅ Year settings saved');
    }
  }

  console.log('🎉 Migration complete!');
}

// Run migration
const year = parseInt(process.argv[2]) || 2025;
migrateCuratedEntries(year).catch(console.error);
