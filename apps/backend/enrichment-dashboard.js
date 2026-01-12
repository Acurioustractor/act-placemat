import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showDashboard() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          EXA ENRICHMENT DASHBOARD                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Total LinkedIn contacts
  const { count: totalContacts } = await supabase
    .from('linkedin_contacts')
    .select('*', { count: 'exact', head: true });

  // Enriched contacts
  const { count: enrichedContacts } = await supabase
    .from('linkedin_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('exa_enriched', true);

  // Contacts with LinkedIn URLs found
  const { count: withLinkedIn } = await supabase
    .from('linkedin_contacts')
    .select('*', { count: 'exact', head: true })
    .not('linkedin_url', 'is', null);

  // High confidence enrichments
  const { count: highConfidence } = await supabase
    .from('linkedin_contacts')
    .select('*', { count: 'exact', head: true })
    .gte('exa_confidence_score', 0.7);

  const enrichmentRate = enrichedContacts > 0 ? ((enrichedContacts / totalContacts) * 100).toFixed(1) : '0.0';
  const linkedInRate = enrichedContacts > 0 ? ((withLinkedIn / enrichedContacts) * 100).toFixed(1) : '0.0';

  console.log('📊 OVERALL STATS');
  console.log('─'.repeat(60));
  console.log(`Total Contacts:           ${totalContacts?.toLocaleString() || 0}`);
  console.log(`Enriched:                 ${enrichedContacts?.toLocaleString() || 0} (${enrichmentRate}%)`);
  console.log(`Remaining:                ${((totalContacts || 0) - (enrichedContacts || 0)).toLocaleString()}`);
  console.log(`\n🔗 LINKEDIN DATA`);
  console.log('─'.repeat(60));
  console.log(`With LinkedIn URL:        ${(withLinkedIn || 0).toLocaleString()} (${linkedInRate}% of enriched)`);
  console.log(`High Confidence (>0.7):   ${(highConfidence || 0).toLocaleString()}`);

  // Get top enriched contacts by confidence
  const { data: topContacts } = await supabase
    .from('linkedin_contacts')
    .select('full_name, current_company, linkedin_url, exa_confidence_score')
    .eq('exa_enriched', true)
    .order('exa_confidence_score', { ascending: false })
    .limit(10);

  console.log(`\n🏆 TOP 10 ENRICHMENTS (by confidence)`);
  console.log('─'.repeat(60));
  topContacts?.forEach((contact, i) => {
    const score = (contact.exa_confidence_score * 100).toFixed(0);
    const company = contact.current_company?.substring(0, 30) || 'N/A';
    console.log(`${i + 1}. ${contact.full_name} - ${company}`);
    console.log(`   Score: ${score}% | ${contact.linkedin_url ? '✅ LinkedIn Found' : '⚠️ No LinkedIn'}`);
  });

  // Company distribution
  const { data: companyStats } = await supabase
    .from('linkedin_contacts')
    .select('current_company')
    .eq('exa_enriched', true)
    .not('current_company', 'is', null)
    .limit(1000);

  const companyCounts = {};
  companyStats?.forEach(c => {
    companyCounts[c.current_company] = (companyCounts[c.current_company] || 0) + 1;
  });

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(`\n🏢 TOP 10 COMPANIES (in enriched contacts)`);
  console.log('─'.repeat(60));
  topCompanies.forEach(([company, count], i) => {
    const companyName = company.substring(0, 40);
    console.log(`${i + 1}. ${companyName.padEnd(42)} ${count} contacts`);
  });

  // Enrichment timeline
  const { data: recentEnrichments } = await supabase
    .from('linkedin_contacts')
    .select('full_name, current_company, exa_last_enriched')
    .eq('exa_enriched', true)
    .not('exa_last_enriched', 'is', null)
    .order('exa_last_enriched', { ascending: false })
    .limit(10);

  console.log(`\n🕐 RECENT ENRICHMENTS`);
  console.log('─'.repeat(60));
  recentEnrichments?.forEach((contact, i) => {
    const time = new Date(contact.exa_last_enriched).toLocaleString();
    const company = contact.current_company?.substring(0, 25) || 'N/A';
    console.log(`${i + 1}. ${contact.full_name} (${company})`);
    console.log(`   ${time}`);
  });

  // API usage estimate
  const estimatedCalls = enrichedContacts * 3; // 3 calls per contact
  const remaining = 1000 - estimatedCalls;

  console.log(`\n💰 API USAGE ESTIMATE`);
  console.log('─'.repeat(60));
  console.log(`Estimated API calls used: ${estimatedCalls.toLocaleString()}`);
  console.log(`Free tier remaining:      ~${remaining > 0 ? remaining.toLocaleString() : 0}`);
  console.log(`Can enrich approximately: ~${Math.max(0, Math.floor(remaining / 3))} more contacts`);

  // Progress bar
  const barLength = 50;
  const filled = Math.floor((enrichedContacts / totalContacts) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  console.log(`\n📈 ENRICHMENT PROGRESS`);
  console.log('─'.repeat(60));
  console.log(`[${bar}] ${enrichmentRate}%`);
  console.log(`${enrichedContacts.toLocaleString()} / ${totalContacts.toLocaleString()} contacts enriched`);

  console.log('\n');
}

showDashboard().catch(console.error);
