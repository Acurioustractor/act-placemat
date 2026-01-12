/**
 * CHECK GOODS. ENRICHMENT STATUS
 *
 * Verify how many contacts were enriched and provide summary
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkGoodsEnrichmentStatus() {
  console.log('🔍 GOODS. ENRICHMENT STATUS CHECK\n');
  console.log('='.repeat(80));

  // Get Goods. project
  const { data: goodsProject } = await supabase
    .from('notion_projects_cache')
    .select('notion_project_id, project_name')
    .ilike('project_name', '%Goods%')
    .maybeSingle();

  if (!goodsProject) {
    console.log('❌ No Goods. project found');
    return;
  }

  console.log(`\n✅ Found project: ${goodsProject.project_name}`);

  // Get matched contacts
  const { data: matches } = await supabase
    .from('project_contact_matches')
    .select('contact_id')
    .eq('project_notion_id', goodsProject.notion_project_id);

  console.log(`📊 Project matches: ${matches?.length || 0}`);

  if (!matches || matches.length === 0) {
    console.log('\n❌ No contacts matched to Goods. project');
    return;
  }

  const contactIds = matches.map(m => m.contact_id);

  const { data: contacts } = await supabase
    .from('linkedin_contacts')
    .select('id, full_name, email_address, linkedin_url, exa_enriched, current_company, alignment_tags')
    .in('id', contactIds)
    .order('created_at', { ascending: false });

  if (!contacts) {
    console.log('\n❌ No contacts found');
    return;
  }

  const enriched = contacts.filter(c => c.linkedin_url);
  const needEnrichment = contacts.filter(c => !c.linkedin_url);

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 ENRICHMENT SUMMARY\n');
  console.log(`Total Goods. contacts: ${contacts.length}`);
  console.log(`✅ Already enriched: ${enriched.length} (${Math.round(enriched.length/contacts.length*100)}%)`);
  console.log(`❌ Need enrichment: ${needEnrichment.length} (${Math.round(needEnrichment.length/contacts.length*100)}%)`);

  // Show contacts by category
  console.log('\n' + '='.repeat(80));
  console.log('\n📁 CONTACTS BY CATEGORY\n');

  const categories = {
    'Health': contacts.filter(c => c.alignment_tags?.includes('health')),
    'Legal': contacts.filter(c => c.alignment_tags?.includes('legal')),
    'Academic/Research': contacts.filter(c => c.alignment_tags?.includes('research') || c.alignment_tags?.includes('academic')),
    'Indigenous Partners': contacts.filter(c => c.alignment_tags?.includes('indigenous')),
    'Funders': contacts.filter(c => c.alignment_tags?.includes('funding') || c.alignment_tags?.includes('philanthropy')),
    'Media/Communications': contacts.filter(c => c.alignment_tags?.includes('media') || c.alignment_tags?.includes('storytelling')),
    'Product/Manufacturing': contacts.filter(c => c.alignment_tags?.includes('product') || c.alignment_tags?.includes('manufacturing')),
    'Other': contacts.filter(c => !c.alignment_tags || c.alignment_tags.length === 0)
  };

  for (const [category, catContacts] of Object.entries(categories)) {
    if (catContacts.length > 0) {
      const catEnriched = catContacts.filter(c => c.linkedin_url).length;
      console.log(`${category}: ${catContacts.length} contacts (${catEnriched} enriched)`);
    }
  }

  // Show sample enriched contacts
  if (enriched.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ SAMPLE ENRICHED CONTACTS\n');
    enriched.slice(0, 10).forEach(c => {
      console.log(`  • ${c.full_name} (${c.current_company})`);
      console.log(`    ${c.linkedin_url}`);
    });
  }

  // Show contacts needing enrichment
  if (needEnrichment.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('\n❌ CONTACTS NEEDING ENRICHMENT\n');
    needEnrichment.slice(0, 10).forEach(c => {
      console.log(`  • ${c.full_name} (${c.current_company}) - ${c.email_address}`);
    });
    if (needEnrichment.length > 10) {
      console.log(`  ... and ${needEnrichment.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkGoodsEnrichmentStatus()
  .then(() => {
    console.log('\n✅ Status check complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Status check failed:', error);
    process.exit(1);
  });
