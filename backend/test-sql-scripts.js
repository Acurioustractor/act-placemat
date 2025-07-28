#!/usr/bin/env node

/**
 * Test SQL Scripts for ACT Media Management System
 * Validates all SQL files before deployment to Supabase
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQL files to test
const sqlFiles = [
  {
    name: 'Media Management Schema',
    path: join(__dirname, 'database', 'apply-media-schema.sql'),
    description: 'Complete media management system'
  },
  {
    name: 'Initial ACT Schema',
    path: join(__dirname, 'database', 'migrations', '2024-01-15-1000-initial-schema.sql'),
    description: 'Core ACT dashboard tables'
  },
  {
    name: 'Row Level Security',
    path: join(__dirname, 'database', 'migrations', '2024-01-15-1030-row-level-security.sql'),
    description: 'Security policies'
  },
  {
    name: 'Media System (Migration)',
    path: join(__dirname, 'database', 'migrations', '2024-01-16-1000-media-management-system.sql'),
    description: 'Media tables (alternative format)'
  }
];

console.log('🧪 Testing ACT SQL Scripts\n');

// Basic SQL validation tests
const tests = [
  {
    name: 'File Exists',
    test: (content, path) => content.length > 0,
    description: 'File can be read and has content'
  },
  {
    name: 'UUID Extension',
    test: (content) => content.includes('uuid-ossp'),
    description: 'Includes UUID extension setup'
  },
  {
    name: 'Safe Creates',
    test: (content) => content.includes('IF NOT EXISTS'),
    description: 'Uses safe CREATE IF NOT EXISTS statements'
  },
  {
    name: 'RLS Security',
    test: (content) => content.includes('ROW LEVEL SECURITY'),
    description: 'Implements row-level security'
  },
  {
    name: 'Performance Indexes',
    test: (content) => content.includes('CREATE INDEX'),
    description: 'Includes performance indexes'
  },
  {
    name: 'No Hardcoded IDs',
    test: (content) => !content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i),
    description: 'No hardcoded UUIDs (uses dynamic references)'
  },
  {
    name: 'Proper Comments',
    test: (content) => content.includes('--') && content.split('--').length > 5,
    description: 'Well-documented with comments'
  }
];

let totalTests = 0;
let passedTests = 0;
let allSqlValid = true;

// Test each SQL file
for (const sqlFile of sqlFiles) {
  console.log(`📄 Testing: ${sqlFile.name}`);
  console.log(`   ${sqlFile.description}`);
  console.log(`   Path: ${sqlFile.path}\n`);

  let content;
  try {
    content = readFileSync(sqlFile.path, 'utf8');
    console.log(`   ✅ File loaded (${content.length} characters)`);
  } catch (error) {
    console.log(`   ❌ Failed to read file: ${error.message}`);
    allSqlValid = false;
    continue;
  }

  // Run tests on this file
  for (const test of tests) {
    totalTests++;
    try {
      const passed = test.test(content, sqlFile.path);
      if (passed) {
        console.log(`   ✅ ${test.name}: ${test.description}`);
        passedTests++;
      } else {
        console.log(`   ❌ ${test.name}: ${test.description}`);
        allSqlValid = false;
      }
    } catch (error) {
      console.log(`   ❌ ${test.name}: Test error - ${error.message}`);
      allSqlValid = false;
    }
  }

  console.log(''); // Blank line between files
}

// Media-specific tests for apply-media-schema.sql
console.log('🎯 Media System Specific Tests\n');

try {
  const mediaSchema = readFileSync(join(__dirname, 'database', 'apply-media-schema.sql'), 'utf8');
  
  const mediaTests = [
    {
      name: 'Media Items Table',
      test: (content) => content.includes('CREATE TABLE IF NOT EXISTS media_items'),
      description: 'Creates media_items table'
    },
    {
      name: 'Collections System',
      test: (content) => content.includes('media_collections') && content.includes('collection_media'),
      description: 'Implements collection/gallery system'
    },
    {
      name: 'AI Integration Ready',
      test: (content) => content.includes('ai_tags') && content.includes('ai_confidence'),
      description: 'Prepared for AI tagging'
    },
    {
      name: 'Consent Tracking',
      test: (content) => content.includes('consent_verified') && content.includes('community_approved'),
      description: 'Implements ethical consent tracking'
    },
    {
      name: 'Usage Tracking',
      test: (content) => content.includes('media_usage'),
      description: 'Tracks how media is used across platform'
    },
    {
      name: 'Processing Jobs',
      test: (content) => content.includes('media_processing_jobs'),
      description: 'Queue system for AI and file processing'
    },
    {
      name: 'Sample Data',
      test: (content) => content.includes('Community Goods Distribution') && content.includes('https://images.unsplash.com'),
      description: 'Includes realistic sample data for testing'
    },
    {
      name: 'Helper View',
      test: (content) => content.includes('public_media_with_collections'),
      description: 'Provides optimized view for frontend'
    }
  ];

  for (const test of mediaTests) {
    totalTests++;
    try {
      const passed = test.test(mediaSchema);
      if (passed) {
        console.log(`   ✅ ${test.name}: ${test.description}`);
        passedTests++;
      } else {
        console.log(`   ❌ ${test.name}: ${test.description}`);
        allSqlValid = false;
      }
    } catch (error) {
      console.log(`   ❌ ${test.name}: Test error - ${error.message}`);
      allSqlValid = false;
    }
  }

} catch (error) {
  console.log(`❌ Could not test media schema: ${error.message}`);
  allSqlValid = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('🎯 SQL Testing Summary');
console.log('='.repeat(60));
console.log(`Total tests run: ${totalTests}`);
console.log(`Tests passed: ${passedTests}`);
console.log(`Tests failed: ${totalTests - passedTests}`);
console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (allSqlValid && passedTests === totalTests) {
  console.log('\n🎉 All SQL scripts are ready for deployment!');
  console.log('\n📋 Next steps:');
  console.log('1. 🗄️  Copy apply-media-schema.sql to Supabase SQL Editor');
  console.log('2. ▶️  Click RUN to apply the schema');
  console.log('3. 🪣 Create storage bucket following setup-storage.md');
  console.log('4. 🚀 Start backend server and test upload flow');
  console.log('\n✨ Your revolutionary media system will be ready!');
} else {
  console.log('\n⚠️  Some issues detected in SQL scripts.');
  console.log('Please review the failed tests above before deployment.');
  process.exit(1);
}

console.log('\n📚 For complete setup instructions, see: COMPLETE_SQL_SETUP_GUIDE.md');