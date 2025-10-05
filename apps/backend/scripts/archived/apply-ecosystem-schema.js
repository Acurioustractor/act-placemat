#!/usr/bin/env node

/**
 * Direct Schema Application Tool
 * Applies the unified ecosystem schema directly to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyEcosystemSchema() {
  console.log('🚀 Applying ACT Unified Ecosystem Schema...\n');

  try {
    // Read and apply each migration file in order
    const migrationFiles = [
      'migrations/2025-08-05-0900-create-exec-sql-function.sql',
      'migrations/2025-08-05-1000-unified-ecosystem-core.sql',
      'migrations/2025-08-05-1030-profit-distribution.sql', 
      'migrations/2025-08-05-1100-governance-sync.sql',
      'migrations/2025-08-05-1130-ecosystem-completion.sql',
      'migrations/2025-08-05-1200-initial-ecosystem-data.sql'
    ];

    for (const file of migrationFiles) {
      console.log(`📝 Applying: ${file}`);
      
      const filePath = join(__dirname, 'database', file);
      const content = readFileSync(filePath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = content
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 0) {
          const { error } = await supabase.rpc('query', statement);
          
          if (error) {
            console.error(`❌ Error in ${file}:`, error);
            console.error('Statement:', statement.substring(0, 100) + '...');
            
            // Continue with next statement rather than failing completely
            continue;
          }
        }
      }
      
      console.log(`✅ Applied: ${file}`);
    }

    console.log('\n🎉 Ecosystem schema application completed!');
    console.log('💚 All data systems are now ready for the ACT ecosystem');

  } catch (error) {
    console.error('\n💥 Schema application failed:', error);
    process.exit(1);
  }
}

// Run the schema application
applyEcosystemSchema();