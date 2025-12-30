#!/usr/bin/env node
/**
 * Apply Exa migration using Supabase REST API
 * This executes the SQL via the PostgREST admin function
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const MIGRATION_FILE = join(__dirname, '../../supabase/migrations/20251224_exa_enrichment_system.sql');
const SQL = readFileSync(MIGRATION_FILE, 'utf8');

console.log('📦 Applying Exa enrichment migration...\n');
console.log(`📄 File: ${MIGRATION_FILE}`);
console.log(`📊 Size: ${(SQL.length / 1024).toFixed(1)} KB\n`);

// Use Management API to execute SQL
const url = `https://api.supabase.com/v1/projects/${process.env.SUPABASE_URL.match(/\/\/(.+?)\.supabase/)[1]}/database/query`;

async function applyMigration() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: SQL })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const result = await response.json();
    console.log('✅ Migration applied successfully!\n');
    console.log('Result:', result);

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    console.error('\nTrying with split statements...\n');

    // Split SQL into individual statements and execute one by one
    const statements = SQL
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('/*') && !s.startsWith('--'));

    console.log(`Found ${statements.length} statements\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length < 100) {
        console.log(`[${i+1}/${statements.length}] ${stmt.substring(0, 80)}...`);
      } else {
        console.log(`[${i+1}/${statements.length}] ${stmt.substring(0, 50)}...`);
      }

      try {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: stmt + ';' })
        });
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
      }
    }

    console.log('\n✅ Migration complete (with some possible errors)\n');
  }
}

applyMigration();
