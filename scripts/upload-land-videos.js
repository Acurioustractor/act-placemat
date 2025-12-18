#!/usr/bin/env node
/**
 * Land Showcase Video Upload Script
 *
 * Usage:
 *   node scripts/upload-land-videos.js list           - List current videos in storage
 *   node scripts/upload-land-videos.js upload <file> <site-id>  - Upload video for a site
 *   node scripts/upload-land-videos.js status         - Show which sites have videos
 *
 * Site IDs: townsville, sydney, alice-springs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Load environment
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SITES = {
  'townsville': { name: 'Townsville', traditional: 'Gurambilbarra' },
  'sydney': { name: 'Sydney', traditional: 'Warrang' },
  'alice-springs': { name: 'Alice Springs', traditional: 'Mparntwe' }
};

const CURATED_PATH = path.join(process.cwd(), 'apps/webflow-portfolio/data/curated-2025.json');

async function listVideos() {
  console.log('\n📹 Land Showcase Videos in Supabase Storage:\n');

  const { data, error } = await supabase.storage
    .from('photos')
    .list('community', {
      search: 'drone'
    });

  if (error) {
    console.error('Error listing files:', error.message);
    return;
  }

  const videos = (data || []).filter(f => f.name.match(/\.(mp4|webm|mov)$/i));

  if (videos.length === 0) {
    console.log('  No drone videos found in photos/community bucket');
    return;
  }

  for (const video of videos) {
    const url = `${supabaseUrl}/storage/v1/object/public/photos/community/${video.name}`;
    const sizeMB = (video.metadata?.size || 0) / (1024 * 1024);
    console.log(`  📎 ${video.name}`);
    console.log(`     Size: ${sizeMB.toFixed(2)} MB`);
    console.log(`     URL: ${url}\n`);
  }
}

async function showStatus() {
  console.log('\n📊 Land Showcase Video Status:\n');

  const curated = JSON.parse(fs.readFileSync(CURATED_PATH, 'utf-8'));
  const sites = curated.settings?.redevelopmentSites || [];

  for (const site of sites) {
    const hasVideo = !!site.droneVideo;
    const icon = hasVideo ? '✅' : '❌';
    console.log(`  ${icon} ${site.location} (${site.traditionalName || 'N/A'})`);
    if (hasVideo) {
      console.log(`     Video: ${site.droneVideo}\n`);
    } else {
      console.log(`     No video configured\n`);
    }
  }

  console.log('\n💡 To add a video:');
  console.log('   1. Place your video file in the project root');
  console.log('   2. Run: node scripts/upload-land-videos.js upload <filename> <site-id>');
  console.log('   3. Site IDs: townsville, sydney, alice-springs\n');
}

async function uploadVideo(filePath, siteId) {
  if (!SITES[siteId]) {
    console.error(`Unknown site ID: ${siteId}`);
    console.log('Valid site IDs:', Object.keys(SITES).join(', '));
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  const sizeMB = stats.size / (1024 * 1024);

  console.log(`\n📹 Uploading video for ${SITES[siteId].name}...`);
  console.log(`   File: ${filePath}`);
  console.log(`   Size: ${sizeMB.toFixed(2)} MB`);

  // Compress if too large (over 20MB)
  let uploadPath = filePath;
  if (sizeMB > 20) {
    console.log('\n⚠️  File is large, compressing...');
    const compressedPath = `/tmp/${siteId}-drone-compressed.mp4`;
    try {
      execSync(`ffmpeg -i "${filePath}" -c:v libx264 -preset medium -crf 28 -c:a aac -b:a 128k -movflags +faststart -y "${compressedPath}"`, { stdio: 'inherit' });
      uploadPath = compressedPath;
      const newStats = fs.statSync(compressedPath);
      console.log(`   Compressed: ${(newStats.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (err) {
      console.error('Compression failed:', err.message);
      console.log('Proceeding with original file...');
    }
  }

  const fileName = `${siteId}-drone-${Date.now()}.mp4`;
  const fileBuffer = fs.readFileSync(uploadPath);

  console.log(`\n⬆️  Uploading to Supabase...`);

  const { data, error } = await supabase.storage
    .from('photos')
    .upload(`community/${fileName}`, fileBuffer, {
      contentType: 'video/mp4',
      cacheControl: '31536000'
    });

  if (error) {
    console.error('Upload failed:', error.message);
    process.exit(1);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/photos/community/${fileName}`;
  console.log(`\n✅ Upload complete!`);
  console.log(`   URL: ${publicUrl}`);

  // Update curated-2025.json
  console.log('\n📝 Updating curated-2025.json...');

  const curated = JSON.parse(fs.readFileSync(CURATED_PATH, 'utf-8'));
  const sites = curated.settings?.redevelopmentSites || [];

  const siteIndex = sites.findIndex(s => s.id === siteId);
  if (siteIndex >= 0) {
    sites[siteIndex].droneVideo = publicUrl;
    curated.settings.redevelopmentSites = sites;
    fs.writeFileSync(CURATED_PATH, JSON.stringify(curated, null, 2));
    console.log(`   Updated ${SITES[siteId].name} with new video URL`);
  } else {
    console.log(`   ⚠️  Site ${siteId} not found in curated data. Add manually:`);
    console.log(`   "droneVideo": "${publicUrl}"`);
  }

  console.log('\n🎉 Done! Restart the dev server to see changes.');
}

// Main
const command = process.argv[2];

switch (command) {
  case 'list':
    await listVideos();
    break;
  case 'status':
    await showStatus();
    break;
  case 'upload':
    const file = process.argv[3];
    const site = process.argv[4];
    if (!file || !site) {
      console.error('Usage: upload <file> <site-id>');
      console.log('Site IDs:', Object.keys(SITES).join(', '));
      process.exit(1);
    }
    await uploadVideo(file, site);
    break;
  default:
    console.log(`
Land Showcase Video Manager

Commands:
  list              List videos in Supabase storage
  status            Show which sites have videos configured
  upload <file> <site-id>   Upload video for a specific site

Site IDs: townsville, sydney, alice-springs

Examples:
  node scripts/upload-land-videos.js status
  node scripts/upload-land-videos.js upload ./Townsville-Drone.mp4 townsville
`);
}
