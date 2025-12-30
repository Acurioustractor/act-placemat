/**
 * Apply metadata column migration to Supabase
 */
import { loadEnv } from './core/src/utils/loadEnv.js';
import pg from 'pg';
const { Client } = pg;

loadEnv();

const connectionString = process.env.SUPABASE_DB_URL ||
  `postgres://postgres.tednluwflfhxyucgwigh:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`;

console.log('📦 Applying metadata column migration...\n');

const client = new Client({ connectionString });

const sql = `
-- Add metadata column to discovered_subscriptions table
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for querying metadata
CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata
  ON discovered_subscriptions USING GIN (metadata);

-- Add comment
COMMENT ON COLUMN discovered_subscriptions.metadata IS 'Transaction metadata from Xero: transactionDates, transactionAmounts, firstSeen, lastSeen, latestStatus, isReconciled, occurrences';
`;

(async () => {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    console.log('Executing SQL...');
    await client.query(sql);

    console.log('✅ Migration applied successfully!\n');

    // Test the column
    const test = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'discovered_subscriptions'
      AND column_name = 'metadata'
    `);

    console.log('Column info:', test.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
