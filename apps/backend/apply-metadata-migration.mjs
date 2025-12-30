/**
 * Apply metadata column migration via Supabase REST API
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📦 Applying metadata column migration via Supabase API...\n');

const sql = `
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata
  ON discovered_subscriptions USING GIN (metadata);
`;

(async () => {
  try {
    // Use the query method which executes raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n💡 Trying alternative approach via direct table query...');

      // Try to update a record with metadata to test if column exists
      const { error: testError } = await supabase
        .from('discovered_subscriptions')
        .update({ metadata: {} })
        .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID

      if (testError?.message?.includes('column "metadata" does not exist')) {
        console.log('\n⚠️  Column does not exist. Manual SQL execution needed.');
        console.log('\n📝 Please run this SQL in Supabase SQL Editor:');
        console.log('─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60));
      } else {
        console.log('✅ Column already exists!');
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
})();
