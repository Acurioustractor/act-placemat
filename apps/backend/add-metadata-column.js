import { loadEnv } from './core/src/utils/loadEnv.js';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📦 Adding metadata column to discovered_subscriptions...\n');

(async () => {
  // Test if column exists first
  console.log('1️⃣  Checking if metadata column exists...');
  const { data: testData, error: testError } = await supabase
    .from('discovered_subscriptions')
    .select('vendor, metadata')
    .limit(1);

  if (!testError) {
    console.log('   ✅ Column already exists!');
    console.log('   Sample data:', testData[0]);
    process.exit(0);
  }

  console.log('   Column does not exist, adding it...\n');

  // Use SQL directly via a workaround: insert with metadata, which will fail if column doesn't exist
  // Then Supabase will tell us the error
  console.log('2️⃣  Attempting to use metadata column...');
  const { error: insertError } = await supabase
    .from('discovered_subscriptions')
    .update({ metadata: { test: true } })
    .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID

  if (insertError && insertError.message.includes('column "metadata" does not exist')) {
    console.log('   ❌ Column confirmed missing');
    console.log('\n📝 Manual steps required:');
    console.log('   Run this SQL in Supabase SQL Editor:');
    console.log('');
    console.log('   ALTER TABLE discovered_subscriptions');
    console.log('   ADD COLUMN metadata JSONB DEFAULT \'{}\'::jsonb;');
    console.log('');
    console.log('   Then re-run discovery.');
  } else {
    console.log('   ✅ Column exists or different error:', insertError?.message);
  }
})();
