import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEnriched() {
  console.log('📊 Checking enriched data...\n');

  // Check LinkedIn profiles
  const { data: linkedin } = await supabase
    .from('exa_linkedin_profiles')
    .select('person_id, linkedin_url, headline, confidence_score')
    .order('confidence_score', { ascending: false })
    .limit(5);

  console.log('🔗 Top LinkedIn Profiles Found:');
  linkedin?.forEach(p => {
    console.log(`  - ${p.headline || 'N/A'} (confidence: ${p.confidence_score})`);
    console.log(`    ${p.linkedin_url || 'No URL'}`);
  });

  // Check company intel
  const { data: companies } = await supabase
    .from('exa_company_intelligence')
    .select('company_name, industry, company_size')
    .limit(5);

  console.log('\n🏢 Companies Enriched:');
  companies?.forEach(c => {
    console.log(`  - ${c.company_name} (${c.industry || 'Unknown industry'}, ${c.company_size || 'Unknown size'})`);
  });

  // Check media mentions
  const { data: media } = await supabase
    .from('exa_media_mentions')
    .select('title, url, published_date, relevance_score')
    .order('published_date', { ascending: false })
    .limit(5);

  console.log('\n📰 Recent Media Mentions:');
  media?.forEach(m => {
    console.log(`  - ${m.title}`);
    console.log(`    ${m.published_date || 'Unknown date'} (relevance: ${m.relevance_score})`);
  });

  // Check queue status
  const { data: queue } = await supabase
    .from('exa_enrichment_queue')
    .select('status')
    .eq('status', 'completed');

  const { data: queuePending } = await supabase
    .from('exa_enrichment_queue')
    .select('status')
    .eq('status', 'pending');

  console.log(`\n📋 Queue Status:`);
  console.log(`  ✅ Completed: ${queue?.length || 0}`);
  console.log(`  ⏳ Pending: ${queuePending?.length || 0}`);

  // Check API usage
  const { data: usage } = await supabase
    .from('exa_api_usage')
    .select('*')
    .order('period_month', { ascending: false })
    .limit(1)
    .single();

  if (usage) {
    console.log(`\n📊 API Usage This Month:`);
    console.log(`  Requests used: ${usage.total_requests || 0}/1000`);
    console.log(`  Remaining: ${1000 - (usage.total_requests || 0)}`);
  }
}

checkEnriched().catch(console.error);
