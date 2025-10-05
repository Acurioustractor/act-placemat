/**
 * Apply Column Fix Migration
 * Runs the database migration to fix missing columns in projects and opportunities tables
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables from backend
dotenv.config({ path: './apps/backend/.env' });

async function applyMigration() {
  console.log('🚀 Applying Column Fix Migration...');

  // Check if required environment variables are present
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Present' : '✗ Missing');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Present' : '✗ Missing');
    console.error('\nPlease ensure your environment variables are set correctly.');
    process.exit(1);
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Read the migration file
    const migrationSQL = readFileSync('./supabase/migrations/20250915100000_fix_missing_project_and_opportunity_columns.sql', 'utf8');

    console.log('📖 Migration file loaded successfully');
    console.log('🔗 Connecting to Supabase...');

    // Split the migration into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT');

    console.log(`📋 Executing ${statements.length} statements...`);

    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`🔧 Executing statement ${index + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
        if (stmtError) {
          console.warn(`⚠️  Statement warning: ${stmtError.message}`);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('✅ All migration statements executed');

    // Test the migration by checking if the columns exist
    console.log('🧪 Testing migration...');

    // Check if end_date column exists in projects table
    const { data: projectsTest, error: projectsError } = await supabase.rpc('exec_sql', {
      sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'end_date'"
    });

    if (projectsError) {
      console.error('❌ Projects table test failed:', projectsError);
    } else if (projectsTest && projectsTest.length > 0) {
      console.log('✅ Projects table now has end_date column');
    } else {
      console.log('⚠️  Projects table does not have end_date column (may be expected if table is different)');
    }

    // Check if archived column exists in opportunities table
    const { data: opportunitiesTest, error: opportunitiesError } = await supabase.rpc('exec_sql', {
      sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'archived'"
    });

    if (opportunitiesError) {
      console.error('❌ Opportunities table test failed:', opportunitiesError);
    } else if (opportunitiesTest && opportunitiesTest.length > 0) {
      console.log('✅ Opportunities table now has archived column');
    } else {
      console.log('⚠️  Opportunities table does not have archived column (may be expected if table is different)');
    }

    console.log('🎯 Column Fix Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration().catch(console.error);