import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Export strategic contacts to CSV for outreach
 */
async function exportStrategicContacts() {
  console.log('\n📤 Exporting Strategic Contacts for Outreach...\n');

  // Get all enriched contacts
  const { data: enriched } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .eq('exa_enriched', true)
    .order('relationship_score', { ascending: false });

  if (!enriched || enriched.length === 0) {
    console.log('❌ No enriched contacts found');
    return;
  }

  // Strategic keywords
  const strategicKeywords = [
    'sustainability', 'indigenous', 'aboriginal', 'circular economy',
    'regenerative', 'social enterprise', 'impact', 'community',
    'youth', 'justice', 'education', 'environment', 'climate'
  ];

  // Analyze each contact
  const analyzed = enriched.map(contact => {
    const text = `${contact.full_name} ${contact.current_company} ${contact.current_position} ${contact.bio || ''}`.toLowerCase();
    const matches = strategicKeywords.filter(keyword => text.includes(keyword));

    return {
      ...contact,
      keyword_matches: matches,
      strategic_score: matches.length,
      has_strategic_value: matches.length > 0
    };
  });

  // Filter for strategic contacts
  const strategic = analyzed.filter(c => c.has_strategic_value);

  console.log(`📊 Analysis Results:`);
  console.log(`  Total enriched: ${enriched.length}`);
  console.log(`  Strategic contacts: ${strategic.length} (${((strategic.length / enriched.length) * 100).toFixed(1)}%)`);
  console.log(`  High value (3+ keywords): ${strategic.filter(c => c.strategic_score >= 3).length}`);
  console.log(`  Medium value (2 keywords): ${strategic.filter(c => c.strategic_score === 2).length}`);
  console.log(`  Low value (1 keyword): ${strategic.filter(c => c.strategic_score === 1).length}`);

  // Sort by strategic score
  strategic.sort((a, b) => b.strategic_score - a.strategic_score);

  // Create CSV
  const csvRows = [
    // Header
    [
      'Name',
      'Email',
      'Company',
      'Position',
      'Location',
      'Industry',
      'LinkedIn URL',
      'Strategic Score',
      'Keywords Matched',
      'Confidence Score',
      'Bio Preview',
      'Priority'
    ].join(',')
  ];

  // Data rows
  strategic.forEach(contact => {
    const priority = contact.strategic_score >= 3 ? 'HIGH' :
                     contact.strategic_score === 2 ? 'MEDIUM' : 'LOW';

    const row = [
      `"${contact.full_name || ''}"`,
      `"${contact.email_address || ''}"`,
      `"${contact.current_company || ''}"`,
      `"${contact.current_position || ''}"`,
      `"${contact.location || ''}"`,
      `"${contact.industry || ''}"`,
      `"${contact.linkedin_url || ''}"`,
      contact.strategic_score,
      `"${contact.keyword_matches.join(', ')}"`,
      (contact.exa_confidence_score * 100).toFixed(0),
      `"${(contact.bio || '').substring(0, 100).replace(/"/g, '""')}..."`,
      priority
    ].join(',');

    csvRows.push(row);
  });

  const csv = csvRows.join('\n');

  // Save to file
  const filename = `strategic_contacts_${new Date().toISOString().split('T')[0]}.csv`;
  const filepath = `/Users/benknight/Code/ACT Placemat/${filename}`;

  writeFileSync(filepath, csv);

  console.log(`\n✅ Exported ${strategic.length} strategic contacts to:`);
  console.log(`   ${filepath}`);

  // Show top 10 for preview
  console.log(`\n🎯 TOP 10 STRATEGIC CONTACTS:`);
  console.log('─'.repeat(80));

  strategic.slice(0, 10).forEach((contact, i) => {
    const priority = contact.strategic_score >= 3 ? '🔴 HIGH' :
                     contact.strategic_score === 2 ? '🟡 MEDIUM' : '🟢 LOW';

    console.log(`\n${i + 1}. ${contact.full_name} - ${contact.current_company}`);
    console.log(`   ${priority} | Score: ${contact.strategic_score} | Confidence: ${(contact.exa_confidence_score * 100).toFixed(0)}%`);
    console.log(`   Keywords: ${contact.keyword_matches.join(', ')}`);
    console.log(`   Email: ${contact.email_address}`);
    if (contact.linkedin_url) {
      console.log(`   LinkedIn: ${contact.linkedin_url}`);
    }
  });

  // Breakdown by focus area
  console.log(`\n\n📊 BREAKDOWN BY FOCUS AREA:`);
  console.log('─'.repeat(80));

  const focusAreas = {};
  strategic.forEach(contact => {
    contact.keyword_matches.forEach(keyword => {
      if (!focusAreas[keyword]) focusAreas[keyword] = [];
      focusAreas[keyword].push(contact.full_name);
    });
  });

  Object.entries(focusAreas)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([keyword, contacts]) => {
      console.log(`\n${keyword.toUpperCase()} (${contacts.length} contacts):`);
      contacts.slice(0, 5).forEach(name => {
        console.log(`  • ${name}`);
      });
      if (contacts.length > 5) {
        console.log(`  ... and ${contacts.length - 5} more`);
      }
    });

  console.log(`\n\n💡 NEXT STEPS:`);
  console.log('─'.repeat(80));
  console.log(`1. Open the CSV file: ${filename}`);
  console.log(`2. Sort by Priority (HIGH → MEDIUM → LOW)`);
  console.log(`3. Review Bio Preview for context`);
  console.log(`4. Draft personalized outreach based on Keywords Matched`);
  console.log(`5. Track responses and update strategic_value in database`);

  console.log('\n');
}

exportStrategicContacts().catch(console.error);
