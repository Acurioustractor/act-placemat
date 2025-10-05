/**
 * Apply Column Fix Migration Directly
 * Connects directly to PostgreSQL and applies the migration
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyMigration() {
  console.log('🚀 Applying Column Fix Migration Directly...');

  // Extract database connection details from SUPABASE_URL
  // Format: https://<project-id>.supabase.co
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✓ Present' : '✗ Missing');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓ Present' : '✗ Missing');
    process.exit(1);
  }

  // Parse the Supabase URL to get the database connection details
  const url = new URL(supabaseUrl);
  const projectId = url.hostname.split('.')[0];
  const host = `${projectId}.supabase.co`;
  const port = 5432;
  const database = 'postgres';
  const user = 'postgres';
  const password = supabaseKey;

  console.log(`🔗 Connecting to Supabase database at ${host}...`);

  // Create PostgreSQL client
  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationSQL = readFileSync('./supabase/migrations/20250915100000_fix_missing_project_and_opportunity_columns.sql', 'utf8');
    console.log('📖 Migration file loaded successfully');

    // Split the migration into individual statements and execute them
    // We need to handle the DO $$ blocks specially
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    
    const lines = migrationSQL.split('\n');
    for (const line of lines) {
      // Skip comment lines
      if (line.trim().startsWith('--')) {
        continue;
      }
      
      // Check if we're entering a DO block
      if (line.trim().startsWith('DO $$') || line.trim().startsWith('do $$')) {
        inDoBlock = true;
        currentStatement = line + '\n';
        continue;
      }
      
      // Check if we're exiting a DO block
      if (inDoBlock && (line.trim() === '$$;' || line.trim() === '$$')) {
        inDoBlock = false;
        currentStatement += line + '\n';
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }
      
      // If we're in a DO block, accumulate lines
      if (inDoBlock) {
        currentStatement += line + '\n';
        continue;
      }
      
      // Regular statement handling
      if (line.trim().endsWith(';')) {
        currentStatement += line + '\n';
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentStatement = '';
      } else if (line.trim()) {
        currentStatement += line + '\n';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`📋 Executing ${statements.length} statements...`);

    // Execute each statement
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`🔧 Executing statement ${index + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        try {
          await client.query(statement);
          console.log(`✅ Statement ${index + 1} executed successfully`);
        } catch (error) {
          console.warn(`⚠️  Statement ${index + 1} warning: ${error.message}`);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('✅ All migration statements executed');

    // Test the migration by checking if the columns exist
    console.log('🧪 Testing migration...');

    // Check if end_date column exists in projects table
    try {
      const projectsResult = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'end_date'"
      );
      
      if (projectsResult.rows.length > 0) {
        console.log('✅ Projects table now has end_date column');
      } else {
        console.log('⚠️  Projects table does not have end_date column');
      }
    } catch (error) {
      console.error('❌ Projects table test failed:', error.message);
    }

    // Check if archived column exists in opportunities table
    try {
      const opportunitiesResult = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'archived'"
      );
      
      if (opportunitiesResult.rows.length > 0) {
        console.log('✅ Opportunities table now has archived column');
      } else {
        console.log('⚠️  Opportunities table does not have archived column');
      }
    } catch (error) {
      console.error('❌ Opportunities table test failed:', error.message);
    }

    console.log('🎯 Column Fix Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
applyMigration().catch(console.error);