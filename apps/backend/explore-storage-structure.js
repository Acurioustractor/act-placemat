#!/usr/bin/env node

/**
 * Explore Existing Supabase Storage Structure
 * Maps out current bucket organization for optimal media system integration
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Exploring Your Existing Supabase Storage Structure\n');

async function exploreBuckets() {
  try {
    // List all storage buckets
    console.log('📦 Available Storage Buckets:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error fetching buckets:', bucketsError);
      return;
    }

    if (!buckets || buckets.length === 0) {
      console.log('   No buckets found');
      return;
    }

    for (const bucket of buckets) {
      console.log(`   📦 ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
      console.log(`      Created: ${new Date(bucket.created_at).toLocaleDateString()}`);
      console.log(`      Updated: ${new Date(bucket.updated_at).toLocaleDateString()}`);
      
      // If this is the media bucket, explore its structure
      if (bucket.name === 'media') {
        console.log('      🎯 This is your media bucket - exploring structure...\n');
        await exploreMediaBucket();
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error exploring buckets:', error.message);
  }
}

async function exploreMediaBucket() {
  try {
    // List all files in media bucket
    const { data: files, error } = await supabase.storage
      .from('media')
      .list('', {
        limit: 1000,
        offset: 0
      });

    if (error) {
      console.error('❌ Error listing media bucket contents:', error);
      return;
    }

    if (!files || files.length === 0) {
      console.log('      📂 Media bucket is empty');
      return;
    }

    // Organize files by type and folder
    const structure = {
      folders: [],
      files: [],
      totalFiles: 0,
      totalSize: 0
    };

    console.log('      📁 Current Folder Structure:');
    
    // First pass: identify folders
    for (const item of files) {
      if (item.metadata === null) { // This indicates a folder
        structure.folders.push(item.name);
        console.log(`         📁 ${item.name}/`);
        
        // Explore subfolder contents
        await exploreFolderContents(item.name, '            ');
      } else {
        structure.files.push(item);
        structure.totalFiles++;
        structure.totalSize += item.metadata?.size || 0;
      }
    }

    // Files in root directory
    if (structure.files.length > 0) {
      console.log('      📄 Files in root directory:');
      structure.files.forEach(file => {
        const size = file.metadata?.size ? formatFileSize(file.metadata.size) : 'Unknown size';
        console.log(`         📄 ${file.name} (${size})`);
      });
    }

    console.log(`\n      📊 Summary:`);
    console.log(`         Folders: ${structure.folders.length}`);
    console.log(`         Total files: ${structure.totalFiles}`);
    console.log(`         Total size: ${formatFileSize(structure.totalSize)}`);

  } catch (error) {
    console.error('❌ Error exploring media bucket:', error.message);
  }
}

async function exploreFolderContents(folderPath, indent = '') {
  try {
    const { data: folderContents, error } = await supabase.storage
      .from('media')
      .list(folderPath, {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.log(`${indent}❌ Error reading folder: ${error.message}`);
      return;
    }

    if (!folderContents || folderContents.length === 0) {
      console.log(`${indent}📂 (empty)`);
      return;
    }

    let fileCount = 0;
    let folderCount = 0;

    for (const item of folderContents) {
      if (item.metadata === null) { // Subfolder
        folderCount++;
        console.log(`${indent}📁 ${item.name}/`);
        // Recursively explore subfolders (limit depth to avoid infinite loops)
        if (indent.length < 20) {
          await exploreFolderContents(`${folderPath}/${item.name}`, indent + '   ');
        }
      } else { // File
        fileCount++;
        const size = item.metadata?.size ? formatFileSize(item.metadata.size) : 'Unknown';
        const lastModified = item.metadata?.lastModified 
          ? new Date(item.metadata.lastModified).toLocaleDateString()
          : 'Unknown date';
        console.log(`${indent}📄 ${item.name} (${size}, ${lastModified})`);
      }
    }

    console.log(`${indent}📊 ${folderCount} folders, ${fileCount} files`);

  } catch (error) {
    console.log(`${indent}❌ Error: ${error.message}`);
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function analyzeForMediaIntegration() {
  console.log('\n🎯 Analysis for Media Management Integration:\n');
  
  // Check if recommended folders already exist
  const recommendedFolders = ['photos', 'videos', 'thumbnails', 'documents'];
  
  for (const folder of recommendedFolders) {
    const { data, error } = await supabase.storage
      .from('media')
      .list(folder, { limit: 1 });
    
    if (error && error.message.includes('not found')) {
      console.log(`   ✅ ${folder}/ - Ready to create (doesn't exist yet)`);
    } else if (error) {
      console.log(`   ❓ ${folder}/ - Error checking: ${error.message}`);
    } else {
      console.log(`   ⚠️  ${folder}/ - Already exists (${data?.length || 0} items)`);
    }
  }

  console.log('\n💡 Recommendations:');
  console.log('   1. Create new folders for media management alongside existing structure');
  console.log('   2. Existing folders (profile-images, story-images) remain unchanged');
  console.log('   3. New upload system will use organized subfolders');
  console.log('   4. All content served from same CDN domain');
  
  console.log('\n🚀 Integration Strategy:');
  console.log('   • Extend existing bucket rather than creating new one');
  console.log('   • Maintain backward compatibility with current image references');
  console.log('   • Add new organized structure for community media library');
  console.log('   • Implement unified media management across all content types');
}

// Run the exploration
async function main() {
  console.log(`🔗 Connecting to: ${process.env.SUPABASE_URL}`);
  console.log(`🔑 Using service role key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing'}\n`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase configuration. Check your .env file.');
    process.exit(1);
  }

  await exploreBuckets();
  await analyzeForMediaIntegration();
  
  console.log('\n✨ Exploration complete! Ready to integrate media management system.');
}

main().catch(console.error);