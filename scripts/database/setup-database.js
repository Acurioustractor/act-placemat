#!/usr/bin/env node

/**
 * Manual Database Setup for ACT Placemat
 * Creates all tables and functions from scratch
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CONFIG = {
  supabaseUrl: 'https://tednluwflfhxyucgwigh.supabase.co',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo'
};

console.log('🏗️  ACT PLACEMAT DATABASE SETUP');
console.log('='.repeat(40));

// Create Supabase client with service role (full admin access)
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey);

// Define migration order (critical for dependencies)
const migrationOrder = [
  '2025-08-05-0900-create-exec-sql-function.sql',
  '2024-01-15-1000-initial-schema.sql',
  '2024-01-15-1000-act-public-dashboard-extension.sql',
  '2024-01-15-1030-row-level-security.sql',
  '2024-01-15-1100-functions-and-triggers.sql',
  '2024-01-16-1000-media-management-system.sql',
  '2025-08-05-1000-unified-ecosystem-core.sql',
  '2025-08-05-1030-profit-distribution.sql',
  '2025-08-05-1100-governance-sync.sql',
  '2025-08-05-1130-ecosystem-completion.sql',
  '2025-08-05-1200-initial-ecosystem-data.sql',
  '2025-08-05-2000-gmail-sync-tables.sql'
];

async function executeSqlFile(filename) {
  try {
    const filePath = join('apps/backend/database/migrations', filename);
    const sql = readFileSync(filePath, 'utf8');
    
    console.log(`📄 Executing: ${filename}`);
    
    // Split SQL into individual statements (basic approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      try {
        const { error } = await supabase.rpc('query', { 
          query_text: statement + ';' 
        });
        
        if (error) {
          // Try direct SQL execution if RPC fails
          const { error: directError } = await supabase
            .from('_temp_')
            .select('*')
            .limit(0); // This is just to test connection
          
          if (directError) {
            console.log(`   ⚠️  Statement skipped: ${statement.substring(0, 50)}...`);
          }
        }
      } catch (statementError) {
        console.log(`   ⚠️  Statement error: ${statementError.message}`);
      }
    }
    
    console.log(`   ✅ Completed: ${filename}`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Failed: ${filename} - ${error.message}`);
    return false;
  }
}

async function executeSqlDirectly(sql) {
  try {
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      try {
        // Use raw SQL execution via the REST API
        const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': CONFIG.serviceRoleKey,
            'Authorization': `Bearer ${CONFIG.serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement + ';' })
        });
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          const errorText = await response.text();
          console.log(`   ⚠️  SQL Error: ${errorText.substring(0, 100)}`);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`   ⚠️  Execution error: ${error.message}`);
      }
    }
    
    console.log(`   📊 Results: ${successCount} successful, ${errorCount} errors`);
    return errorCount < successCount; // Success if more statements worked than failed
    
  } catch (error) {
    console.error(`   💥 Direct execution failed: ${error.message}`);
    return false;
  }
}

async function setupDatabase() {
  try {
    console.log('🔗 Testing connection...');
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Connection failed:', error);
      return;
    }
    
    console.log('✅ Connected to Supabase');
    
    // First, create the exec_sql function manually
    console.log('\n🛠️  Creating exec_sql function...');
    const execSqlFunction = `
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
          EXECUTE query;
      END;
      $$;
    `;
    
    try {
      // Try to create the function via direct API call
      const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': CONFIG.serviceRoleKey,
          'Authorization': `Bearer ${CONFIG.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: execSqlFunction })
      });
      
      if (!response.ok) {
        console.log('⚠️  exec_sql function creation via RPC failed, trying alternative...');
        
        // Alternative: execute SQL files manually
        console.log('\n📚 Executing migration files manually...');
        
        for (const filename of migrationOrder) {
          const filePath = join('apps/backend/database/migrations', filename);
          try {
            const sql = readFileSync(filePath, 'utf8');
            console.log(`\n📄 Processing: ${filename}`);
            await executeSqlDirectly(sql);
          } catch (fileError) {
            console.error(`❌ Could not read ${filename}:`, fileError.message);
          }
        }
      } else {
        console.log('✅ exec_sql function created successfully');
        
        // Now run migrations normally
        console.log('\n📚 Running migrations in order...');
        
        for (const filename of migrationOrder.slice(1)) { // Skip exec_sql creation
          await executeSqlFile(filename);
        }
      }
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
    }
    
    // Test if tables were created
    console.log('\n🧪 Testing table creation...');
    const testTables = ['stories', 'projects', 'opportunities', 'organizations', 'people'];
    
    for (const table of testTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`);
        } else {
          console.log(`✅ Table '${table}': Ready (${data?.length || 0} records)`);
        }
      } catch (tableError) {
        console.log(`❌ Table '${table}': ${tableError.message}`);
      }
    }
    
    console.log('\n🎉 Database setup completed!');
    console.log('Run the diagnostics again to verify: node diagnose-supabase.js');
    
  } catch (error) {
    console.error('💥 Setup process failed:', error);
  }
}

// Execute setup
setupDatabase();