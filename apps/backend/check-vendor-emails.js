import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase
  .from('discovered_subscriptions')
  .select('vendor, vendor_contact_email, vendor_contact_source, account_email')
  .eq('tenant_id', '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0')
  .order('vendor');

console.log('\n📊 CURRENT DATABASE STATE\n');
console.log('='.repeat(80));

let withEmail = 0;
let withoutEmail = 0;

data.forEach(sub => {
  console.log(`\nVendor: ${sub.vendor}`);
  console.log(`  Account Email: ${sub.account_email || 'NOT SET'}`);
  console.log(`  Vendor Email: ${sub.vendor_contact_email || 'NOT SET'}`);
  console.log(`  Source: ${sub.vendor_contact_source || 'N/A'}`);

  if (sub.vendor_contact_email) {
    withEmail++;
  } else {
    withoutEmail++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\nSUMMARY:`);
console.log(`  With vendor email: ${withEmail}/${data.length}`);
console.log(`  Without vendor email: ${withoutEmail}/${data.length}`);
console.log(`\n✅ Check complete\n`);
