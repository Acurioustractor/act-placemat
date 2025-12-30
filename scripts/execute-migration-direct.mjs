#!/usr/bin/env node

/**
 * Execute Migration Directly Using pg Client
 * Connects to Supabase Postgres and executes the migration SQL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  console.log('='.repeat(80));
  console.log('Applying Subscription Tracker Migration via Direct Connection');
  console.log('='.repeat(80));
  console.log('');

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'apps', 'backend', 'subscription-tracker', 'migrations', '20260101000000_subscription_tracker.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found');
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`✅ Loaded migration (${(sql.length / 1024).toFixed(1)} KB)\n`);

  // Get connection URL from pooler-url file
  const poolerUrlPath = path.join(__dirname, '..', 'supabase', '.temp', 'pooler-url');
  if (!fs.existsSync(poolerUrlPath)) {
    console.error('❌ Connection URL not found in supabase/.temp/pooler-url');
    console.log('\nYou need to provide the database password.');
    console.log('Get it from: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database\n');
    process.exit(1);
  }

  let connectionString = fs.readFileSync(poolerUrlPath, 'utf8').trim();

  // Check if we have the password in environment
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

  if (!dbPassword) {
    console.error('❌ Database password not found in environment variables');
    console.log('\nPlease set SUPABASE_DB_PASSWORD environment variable');
    console.log('Or pass it as: SUPABASE_DB_PASSWORD=your_password node scripts/execute-migration-direct.mjs\n');
    console.log('Get the password from: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database');
    console.log('(Look for "Database password" in the Connection parameters section)\n');
    process.exit(1);
  }

  // Insert password into connection string
  connectionString = connectionString.replace('@', `:${dbPassword}@`);

  console.log('Connecting to database...');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('Executing migration SQL...\n');

    // Execute the entire SQL file as one transaction
    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('COMMIT');

      console.log('\n✅ Migration executed successfully!\n');

      // Verify tables were created
      console.log('Verifying tables...');

      const tables = [
        'discovered_subscriptions',
        'subscription_receipts',
        'rd_activity_log',
        'subscription_analytics'
      ];

      for (const tableName of tables) {
        const result = await client.query(
          `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [tableName]
        );

        if (result.rows[0].count > 0) {
          // Get row count
          const countResult = await client.query(`SELECT count(*) FROM ${tableName}`);
          console.log(`  ✅ ${tableName.padEnd(30)} (${countResult.rows[0].count} rows)`);
        } else {
          console.log(`  ❌ ${tableName.padEnd(30)} NOT FOUND`);
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('✅ Migration completed successfully!');
      console.log('='.repeat(80));

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
