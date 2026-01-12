import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeEnrichedContacts() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       ENRICHED CONTACTS INTELLIGENCE ANALYSIS            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get all enriched contacts
  const { data: enriched } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .eq('exa_enriched', true)
    .order('exa_confidence_score', { ascending: false });

  if (!enriched || enriched.length === 0) {
    console.log('❌ No enriched contacts found');
    return;
  }

  console.log(`📊 Analyzing ${enriched.length} enriched contacts...\n`);

  // 1. Industry Distribution
  const industries = {};
  enriched.forEach(c => {
    if (c.industry) {
      industries[c.industry] = (industries[c.industry] || 0) + 1;
    }
  });

  console.log('🏭 TOP INDUSTRIES REPRESENTED:');
  console.log('─'.repeat(60));
  Object.entries(industries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([industry, count], i) => {
      console.log(`${i + 1}. ${industry.padEnd(45)} ${count} contacts`);
    });

  // 2. Location Distribution
  const locations = {};
  enriched.forEach(c => {
    if (c.location) {
      locations[c.location] = (locations[c.location] || 0) + 1;
    }
  });

  console.log('\n📍 TOP LOCATIONS:');
  console.log('─'.repeat(60));
  Object.entries(locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([location, count], i) => {
      console.log(`${i + 1}. ${location.padEnd(45)} ${count} contacts`);
    });

  // 3. Strategic Value Keywords
  const strategicKeywords = [
    'sustainability', 'indigenous', 'aboriginal', 'circular economy',
    'regenerative', 'social enterprise', 'impact', 'community',
    'youth', 'justice', 'education', 'environment', 'climate'
  ];

  const strategicContacts = [];
  enriched.forEach(c => {
    const text = `${c.full_name} ${c.current_company} ${c.current_position} ${c.bio || ''}`.toLowerCase();
    const matches = strategicKeywords.filter(keyword => text.includes(keyword));
    if (matches.length > 0) {
      strategicContacts.push({
        ...c,
        keyword_matches: matches,
        strategic_score: matches.length
      });
    }
  });

  console.log('\n🎯 STRATEGIC VALUE CONTACTS (keyword matching):');
  console.log('─'.repeat(60));
  console.log(`Found ${strategicContacts.length} contacts with strategic keywords\n`);

  strategicContacts
    .sort((a, b) => b.strategic_score - a.strategic_score)
    .slice(0, 15)
    .forEach((c, i) => {
      console.log(`${i + 1}. ${c.full_name} - ${c.current_company}`);
      console.log(`   Keywords: ${c.keyword_matches.join(', ')}`);
      console.log(`   Score: ${c.strategic_score} | Confidence: ${((c.exa_confidence_score || 0) * 100).toFixed(0)}%`);
    });

  // 4. Quality Analysis
  const withLinkedIn = enriched.filter(c => c.linkedin_url && !c.linkedin_url.includes('login'));
  const withBio = enriched.filter(c => c.bio && c.bio.length > 100);
  const highConfidence = enriched.filter(c => c.exa_confidence_score >= 0.7);

  console.log('\n📈 DATA QUALITY METRICS:');
  console.log('─'.repeat(60));
  console.log(`Total Enriched:           ${enriched.length}`);
  console.log(`With LinkedIn URLs:       ${withLinkedIn.length} (${((withLinkedIn.length / enriched.length) * 100).toFixed(1)}%)`);
  console.log(`With Rich Bios (>100ch):  ${withBio.length} (${((withBio.length / enriched.length) * 100).toFixed(1)}%)`);
  console.log(`High Confidence (≥0.7):   ${highConfidence.length} (${((highConfidence.length / enriched.length) * 100).toFixed(1)}%)`);

  // 5. Actionable Recommendations
  console.log('\n💡 ACTIONABLE INSIGHTS:');
  console.log('─'.repeat(60));

  const topStrategic = strategicContacts
    .sort((a, b) => b.strategic_score - a.strategic_score)
    .slice(0, 20);

  console.log(`\n1. PRIORITY OUTREACH (Top 20 strategic contacts):`);
  topStrategic.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.full_name} (${c.current_company})`);
    console.log(`      Focus: ${c.keyword_matches[0]}`);
  });

  // 6. Export top contacts for outreach
  const exportData = topStrategic.map(c => ({
    name: c.full_name,
    email: c.email_address,
    company: c.current_company,
    position: c.current_position,
    linkedin: c.linkedin_url,
    strategic_focus: c.keyword_matches[0],
    keyword_matches: c.keyword_matches.join(', '),
    strategic_score: c.strategic_score,
    confidence_score: c.exa_confidence_score
  }));

  console.log('\n💾 EXPORT READY:');
  console.log(`   ${exportData.length} priority contacts identified`);
  console.log(`   Data includes: name, email, company, LinkedIn, strategic focus`);

  // 7. Update strategic scores in database
  console.log('\n🔄 Updating strategic scores in database...');
  for (const contact of strategicContacts) {
    await supabase
      .from('linkedin_contacts')
      .update({
        strategic_value: contact.strategic_score >= 3 ? 'high' : contact.strategic_score >= 2 ? 'medium' : 'low',
        relationship_score: contact.strategic_score / 10
      })
      .eq('id', contact.id);
  }
  console.log(`   ✅ Updated ${strategicContacts.length} contacts with strategic scores`);

  console.log('\n');
}

analyzeEnrichedContacts().catch(console.error);
