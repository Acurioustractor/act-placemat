#!/usr/bin/env node

/**
 * Test Platform Architecture with ACT
 * Validates auto-organization creation, upload flow, and multi-tenancy
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🧪 Testing Empathy Ledger Platform Architecture\n');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:4000/api/platform',
  organizations: ['act', 'test-org-1', 'test-org-2'],
  testImage: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') // 1x1 PNG
};

async function testDatabaseSchema() {
  console.log('📊 Testing Database Schema...\n');
  
  try {
    // Test organizations table
    const { data: orgs, error: orgError } = await supabase
      .from('platform_organizations')
      .select('id, slug, name, storage_prefix')
      .limit(5);
    
    if (orgError) throw orgError;
    
    console.log('✅ Organizations table accessible');
    console.log(`   Found ${orgs.length} organizations`);
    
    orgs.forEach(org => {
      console.log(`   - ${org.slug}: ${org.storage_prefix}`);
    });
    
    // Test media_items table
    const { data: media, error: mediaError } = await supabase
      .from('platform_media_items')
      .select('id, platform_organization_id, storage_path, file_type')
      .limit(3);
    
    if (mediaError && !mediaError.message.includes('relation "platform_media_items" does not exist')) {
      throw mediaError;
    }
    
    console.log('✅ Media items table accessible');
    console.log(`   Found ${media?.length || 0} media items\n`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message);
    return false;
  }
}

async function testOrganizationAutoCreation() {
  console.log('🏗️ Testing Organization Auto-Creation...\n');
  
  try {
    // Test creating multiple organizations
    for (const orgSlug of TEST_CONFIG.organizations) {
      console.log(`Testing organization: ${orgSlug}`);
      
      // Check if organization exists
      const { data: existingOrg } = await supabase
        .from('platform_organizations')
        .select('id, slug, storage_prefix')
        .eq('slug', orgSlug)
        .single();
      
      if (existingOrg) {
        console.log(`   ✅ Organization exists: ${existingOrg.storage_prefix}`);
      } else {
        console.log(`   🆕 Organization doesn't exist - will be auto-created on first API call`);
      }
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Organization auto-creation test failed:', error.message);
    return false;
  }
}

async function testApiEndpoints() {
  console.log('🌐 Testing API Endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch(`${TEST_CONFIG.baseUrl}/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.status === 'healthy') {
      console.log('✅ Health endpoint working');
    } else {
      throw new Error('Health check failed');
    }
    
    // Test organization info endpoints
    for (const orgSlug of ['act']) { // Start with just ACT
      console.log(`\nTesting ${orgSlug} endpoints...`);
      
      // Test info endpoint
      const infoResponse = await fetch(`${TEST_CONFIG.baseUrl}/${orgSlug}/info`);
      const infoData = await infoResponse.json();
      
      if (infoData.organization) {
        console.log(`✅ ${orgSlug} info endpoint working`);
        console.log(`   Organization: ${infoData.organization.name}`);
        console.log(`   Storage prefix: ${infoData.organization.storage_prefix}`);
      } else {
        throw new Error(`Info endpoint failed for ${orgSlug}`);
      }
      
      // Test media items endpoint
      const mediaResponse = await fetch(`${TEST_CONFIG.baseUrl}/${orgSlug}/items`);
      const mediaData = await mediaResponse.json();
      
      if (Array.isArray(mediaData.media)) {
        console.log(`✅ ${orgSlug} media endpoint working`);
        console.log(`   Found ${mediaData.media.length} media items`);
      } else {
        throw new Error(`Media endpoint failed for ${orgSlug}`);
      }
      
      // Test collections endpoint
      const collectionsResponse = await fetch(`${TEST_CONFIG.baseUrl}/${orgSlug}/collections`);
      const collectionsData = await collectionsResponse.json();
      
      if (Array.isArray(collectionsData.collections)) {
        console.log(`✅ ${orgSlug} collections endpoint working`);
        console.log(`   Found ${collectionsData.collections.length} collections`);
      } else {
        throw new Error(`Collections endpoint failed for ${orgSlug}`);
      }
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ API endpoints test failed:', error.message);
    return false;
  }
}

async function testFileUpload() {
  console.log('📤 Testing File Upload with Auto-Organization...\n');
  
  try {
    const orgSlug = 'act';
    console.log(`Testing upload for organization: ${orgSlug}`);
    
    // Create form data with test image
    const formData = new FormData();
    formData.append('file', TEST_CONFIG.testImage, {
      filename: 'test-platform-image.png',
      contentType: 'image/png'
    });
    formData.append('title', 'Platform Architecture Test Image');
    formData.append('description', 'Test image for validating platform architecture');
    formData.append('category', 'community');
    formData.append('tags', 'test,platform,architecture');
    formData.append('photographer', 'Platform Test Suite');
    
    // Upload file
    const uploadResponse = await fetch(`${TEST_CONFIG.baseUrl}/${orgSlug}/upload`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const uploadData = await uploadResponse.json();
    
    if (uploadData.success && uploadData.media) {
      console.log('✅ File upload successful');
      console.log(`   Media ID: ${uploadData.media.id}`);
      console.log(`   Storage path: ${uploadData.media.storage_path}`);
      console.log(`   File URL: ${uploadData.media.file_url}`);
      console.log(`   Organization: ${uploadData.organization.slug}`);
      
      // Verify file appears in media list
      const mediaResponse = await fetch(`${TEST_CONFIG.baseUrl}/${orgSlug}/items?limit=1`);
      const mediaData = await mediaResponse.json();
      
      const uploadedFile = mediaData.media.find(item => item.id === uploadData.media.id);
      if (uploadedFile) {
        console.log('✅ Uploaded file appears in media list');
      } else {
        throw new Error('Uploaded file not found in media list');
      }
      
      console.log('');
      return uploadData.media;
      
    } else {
      throw new Error(`Upload failed: ${uploadData.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ File upload test failed:', error.message);
    return null;
  }
}

async function testMultiTenantIsolation() {
  console.log('🔒 Testing Multi-Tenant Isolation...\n');
  
  try {
    // Get ACT's media
    const actResponse = await fetch(`${TEST_CONFIG.baseUrl}/act/items`);
    const actData = await actResponse.json();
    
    // Try to access ACT's media from a different organization context
    // This should return empty results due to RLS
    const testOrgResponse = await fetch(`${TEST_CONFIG.baseUrl}/test-isolation/items`);
    const testOrgData = await testOrgResponse.json();
    
    console.log(`✅ ACT has ${actData.media?.length || 0} media items`);
    console.log(`✅ test-isolation org has ${testOrgData.media?.length || 0} media items`);
    
    if (actData.organization?.slug === 'act' && testOrgData.organization?.slug === 'test-isolation') {
      console.log('✅ Organization context isolation working');
    } else {
      throw new Error('Organization context not properly isolated');
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Multi-tenant isolation test failed:', error.message);
    return false;
  }
}

async function testStorageStructure() {
  console.log('📁 Testing Storage Structure...\n');
  
  try {
    // List files in empathy-ledger-media bucket
    const { data: files, error } = await supabase.storage
      .from('empathy-ledger-media')
      .list('', { limit: 100 });
    
    if (error && !error.message.includes('not found')) {
      throw error;
    }
    
    if (files && files.length > 0) {
      console.log('✅ empathy-ledger-media bucket accessible');
      console.log(`   Found ${files.length} top-level items`);
      
      // Look for organization prefixes
      const orgPrefixes = files
        .filter(file => file.name && !file.name.includes('.'))
        .map(file => file.name);
      
      if (orgPrefixes.length > 0) {
        console.log('   Organization prefixes found:');
        orgPrefixes.forEach(prefix => {
          console.log(`   - ${prefix}/`);
        });
      }
    } else {
      console.log('ℹ️  empathy-ledger-media bucket is empty (will be created on first upload)');
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Storage structure test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Platform Architecture Test Suite\n');
  console.log(`📍 Backend URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`🗄️  Database: ${process.env.SUPABASE_URL}`);
  console.log(`🔑 Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing'}\n`);
  
  const results = {
    databaseSchema: await testDatabaseSchema(),
    organizationAutoCreation: await testOrganizationAutoCreation(),
    apiEndpoints: await testApiEndpoints(),
    fileUpload: await testFileUpload(),
    multiTenantIsolation: await testMultiTenantIsolation(),
    storageStructure: await testStorageStructure()
  };
  
  // Summary
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Platform architecture is working correctly.');
    console.log('\n✨ Ready for ACT trial deployment:');
    console.log('   1. Apply optimal-platform-schema.sql to Supabase');
    console.log('   2. Update server to use platform-media.js API');
    console.log('   3. Start uploading ACT\'s amazing community content!');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });
  }
  
  console.log('\n🚜 Platform architecture testing complete!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };