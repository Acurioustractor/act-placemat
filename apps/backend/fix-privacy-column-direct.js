#!/usr/bin/env node

/**
 * Direct SQL execution to add privacy_level column to stories table
 * Phase 1: Emergency Foundation Repair - Critical database schema fix
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addPrivacyLevelColumn() {
  console.log('🔧 Adding privacy_level column to stories table...');
  
  try {
    // Direct SQL execution using Supabase's query builder
    const { error } = await supabase
      .rpc('execute_sql', {
        query: `
          -- Add privacy_level column if it doesn't exist
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name='stories' AND column_name='privacy_level'
              ) THEN
                  ALTER TABLE stories ADD COLUMN privacy_level TEXT DEFAULT 'community';
                  
                  -- Add check constraint
                  ALTER TABLE stories ADD CONSTRAINT privacy_level_check 
                  CHECK (privacy_level IN ('private', 'community', 'public', 'cultural_protocol'));
                  
                  -- Create index
                  CREATE INDEX idx_stories_privacy_level ON stories(privacy_level);
                  
                  RAISE NOTICE 'privacy_level column added successfully';
              ELSE
                  RAISE NOTICE 'privacy_level column already exists';
              END IF;
          END
          $$;
        `
      });

    if (error) {
      console.error('❌ Failed to execute SQL:', error.message);
      
      // Try alternative approach using SQL query directly
      console.log('🔄 Trying alternative SQL approach...');
      
      const { data, error: sqlError } = await supabase
        .from('stories')
        .select('id')
        .limit(1);
      
      if (sqlError) {
        console.error('❌ Database connection failed:', sqlError.message);
        return false;
      }
      
      console.log('✅ Database connection works, but column addition failed');
      console.log('💡 Manual fix required:');
      console.log('   1. Go to Supabase Dashboard > Table Editor > stories');
      console.log('   2. Add column: privacy_level, Type: text, Default: community');
      console.log('   3. Add check constraint for valid values');
      
      return false;
    }

    console.log('✅ privacy_level column added successfully!');
    
    // Verify the column was added
    const { data, error: verifyError } = await supabase
      .from('stories')
      .select('privacy_level')
      .limit(1);
    
    if (verifyError) {
      console.error('⚠️ Column may not have been added properly:', verifyError.message);
      return false;
    }
    
    console.log('✅ Column verified - privacy_level now exists in stories table');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Run the fix
async function main() {
  console.log('🚀 Starting privacy_level column fix...');
  
  const success = await addPrivacyLevelColumn();
  
  if (success) {
    console.log('🎉 Database schema fix completed successfully!');
    console.log('📈 This should resolve the "column stories.privacy_level does not exist" errors');
  } else {
    console.log('❌ Automated fix failed - manual intervention required');
  }
}

main();