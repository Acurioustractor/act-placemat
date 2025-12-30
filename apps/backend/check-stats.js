import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📊 Database Statistics\n');

async function checkStats() {
  // Total contacts with email
  const { count: totalWithEmail } = await supabase
    .from('person_identity_map')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null);

  // Contacts with tags
  const { count: alreadyTagged } = await supabase
    .from('person_identity_map')
    .select('*', { count: 'exact', head: true })
    .not('tags', 'is', null);

  // Contacts enriched with Exa
  const { count: alreadyEnriched } = await supabase
    .from('person_identity_map')
    .select('*', { count: 'exact', head: true })
    .eq('exa_enriched', true);

  // Tag breakdown
  const { data: tagCounts } = await supabase
    .rpc('count_tags_distribution');

  console.log('Contact Overview:');
  console.log(`  Total with email: ${totalWithEmail || 0}`);
  console.log(`  Tagged: ${alreadyTagged || 0}`);
  console.log(`  Enriched with Exa: ${alreadyEnriched || 0}`);
  console.log(`  Untagged: ${(totalWithEmail || 0) - (alreadyTagged || 0)}\n`);

  console.log('Summary:');
  console.log(`  ${alreadyEnriched}/${totalWithEmail} contacts enriched (${((alreadyEnriched/totalWithEmail)*100).toFixed(1)}%)`);
  console.log(`  ${954} API requests remaining this month`);
  console.log(`  Can enrich ~${Math.floor(954/3)} more contacts\n`);
}

checkStats().then(() => process.exit(0));
