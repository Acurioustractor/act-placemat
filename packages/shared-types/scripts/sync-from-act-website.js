#!/usr/bin/env node

/**
 * Sync shared types from ACT Main Website (source of truth)
 *
 * This script copies year-in-review types from ACT Website to ACT Placemat
 * Following the ecosystem pattern: consumer defines contract, provider implements
 */

const fs = require('fs');
const path = require('path');

const ACT_WEBSITE_PATH = '/Users/benknight/Code/ACT Farm and Regenerative Innovation Studio';
const SOURCE_FILE = path.join(ACT_WEBSITE_PATH, 'src/types/shared/year-in-review.ts');
const DEST_FILE = path.join(__dirname, '../src/year-in-review.ts');

console.log('🔄 Syncing types from ACT Main Website...\n');

// Check if source exists
if (!fs.existsSync(SOURCE_FILE)) {
  console.error('❌ Error: Source file not found at:', SOURCE_FILE);
  console.error('   Make sure ACT Main Website is cloned to:', ACT_WEBSITE_PATH);
  process.exit(1);
}

try {
  // Read source file
  const sourceContent = fs.readFileSync(SOURCE_FILE, 'utf8');

  // Add sync header
  const syncTimestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const header = `/**
 * Year in Review Shared Types
 *
 * SOURCE: ACT Main Website - /src/types/shared/year-in-review.ts
 * SYNCED: ${syncTimestamp}
 *
 * DO NOT MODIFY - This file is copied from ACT Main Website (source of truth)
 * Any changes must be made in the source repository first
 */

`;

  // Write to destination
  fs.writeFileSync(DEST_FILE, header + sourceContent.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, ''));

  console.log('✅ Types synced successfully!');
  console.log(`   From: ${SOURCE_FILE}`);
  console.log(`   To:   ${DEST_FILE}`);
  console.log(`   Date: ${syncTimestamp}\n`);

  console.log('📝 Next steps:');
  console.log('   1. Review the changes: git diff');
  console.log('   2. Test the types in your code');
  console.log('   3. Commit the updated types\n');

} catch (error) {
  console.error('❌ Error syncing types:', error.message);
  process.exit(1);
}
