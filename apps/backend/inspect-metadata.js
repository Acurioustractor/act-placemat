import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase
  .from('discovered_subscriptions')
  .select('vendor, metadata, gmail_message_id, account_email')
  .eq('tenant_id', '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0')
  .limit(10);

console.log('\n📧 SUBSCRIPTION METADATA INSPECTION\n');
data.forEach(sub => {
  console.log('='.repeat(60));
  console.log(`Vendor: ${sub.vendor}`);
  console.log(`Gmail ID: ${sub.gmail_message_id || 'none'}`);
  console.log(`Account Email (current): ${sub.account_email || 'not set'}`);
  console.log(`Metadata:`, JSON.stringify(sub.metadata, null, 2));
  console.log('');
});
