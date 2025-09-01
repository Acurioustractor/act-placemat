/**
 * Fix missing privacy_level column in stories table
 * This is critical for ACT's consent management system
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPrivacyLevelColumn() {
  console.log('🔧 Fixing missing privacy_level column in stories table...');
  
  try {
    // First, check if the column already exists
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'stories' });
    
    if (columnsError) {
      console.log('⚠️ Could not check columns, proceeding with ALTER TABLE attempt...');
    } else {
      const hasPrivacyLevel = columns?.some(col => col.column_name === 'privacy_level');
      if (hasPrivacyLevel) {
        console.log('✅ privacy_level column already exists!');
        return;
      }
    }

    // Add the column with proper default and constraints
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE stories 
        ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'community';
        
        -- Add check constraint for valid privacy levels
        ALTER TABLE stories 
        ADD CONSTRAINT IF NOT EXISTS privacy_level_check 
        CHECK (privacy_level IN ('private', 'community', 'public', 'cultural_protocol'));
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_stories_privacy_level ON stories(privacy_level);
        
        -- Update any existing NULL values to default
        UPDATE stories SET privacy_level = 'community' WHERE privacy_level IS NULL;
      `
    });

    if (error) {
      console.error('❌ Failed to add privacy_level column:', error.message);
      
      // Try alternative approach - direct SQL execution
      console.log('🔄 Trying direct approach...');
      
      const { error: directError } = await supabase
        .from('_sql')
        .insert({
          query: `
            ALTER TABLE stories 
            ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'community';
          `
        });
        
      if (directError) {
        console.error('❌ Direct approach also failed:', directError.message);
        console.log('💡 Manual fix needed: Add privacy_level column to stories table in Supabase dashboard');
        console.log('   Column definition: privacy_level TEXT DEFAULT \'community\'');
      } else {
        console.log('✅ privacy_level column added successfully!');
      }
    } else {
      console.log('✅ privacy_level column added successfully with constraints and index!');
    }

  } catch (error) {
    console.error('❌ Error fixing privacy_level column:', error.message);
    console.log('💡 You may need to add this column manually in the Supabase dashboard:');
    console.log('   Table: stories');
    console.log('   Column: privacy_level');
    console.log('   Type: TEXT');
    console.log('   Default: community');
    console.log('   Check constraint: IN (\'private\', \'community\', \'public\', \'cultural_protocol\')');
  }
}

// Test the connection and run the fix
async function main() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('stories').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection successful');
    await fixPrivacyLevelColumn();
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

main();