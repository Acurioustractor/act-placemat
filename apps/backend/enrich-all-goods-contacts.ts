/**
 * ENRICH ALL GOODS CONTACTS
 *
 * Run Exa enrichment on all 64 Goods. contacts to get:
 * - LinkedIn profiles
 * - Bio/background
 * - Current work
 * - Strategic value assessment
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Exa from 'exa-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EXA_API_KEY = process.env.EXA_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const exa = new Exa(EXA_API_KEY);

async function enrichAllGoodsContacts() {
  console.log('🔍 ENRICHING ALL GOODS CONTACTS\n');
  console.log('='.repeat(80));

  // Get all Goods. contacts that need enrichment
  const { data: goodsProject } = await supabase
    .from('notion_projects_cache')
    .select('notion_project_id')
    .ilike('project_name', '%Goods%')
    .single();

  if (!goodsProject) {
    console.log('❌ Goods. project not found');
    return;
  }

  const { data: matches } = await supabase
    .from('project_contact_matches')
    .select('contact_id')
    .eq('project_notion_id', goodsProject.notion_project_id);

  if (!matches) {
    console.log('❌ No contacts found');
    return;
  }

  const contactIds = matches.map(m => m.contact_id);

  const { data: contacts } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .in('id', contactIds);

  const contactCount = contacts ? contacts.length : 0;
  console.log(`\nFound ${contactCount} Goods. contacts to enrich\n`);
  console.log('='.repeat(80));

  if (!contacts || contacts.length === 0) return;

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (const contact of contacts) {
    const fullName = contact.full_name || `${contact.first_name} ${contact.last_name}`;

    // Skip if already has LinkedIn URL
    if (contact.linkedin_url) {
      console.log(`\n⏭️  ${fullName} - Already has LinkedIn URL`);
      skipped++;
      continue;
    }

    console.log(`\n🔍 Enriching: ${fullName} (${contact.email_address})`);

    try {
      // Search for LinkedIn profile
      const searchQuery = contact.current_company && contact.current_company !== 'Unknown'
        ? `${fullName} ${contact.current_company} site:linkedin.com/in`
        : `${fullName} site:linkedin.com/in`;

      const results = await exa.searchAndContents(searchQuery, {
        type: 'neural',
        useAutoprompt: true,
        numResults: 3,
        text: { maxCharacters: 2000 }
      });

      if (results.results && results.results.length > 0) {
        const linkedinResult = results.results.find(r =>
          r.url.includes('linkedin.com/in/') &&
          !r.url.includes('/posts/') &&
          !r.url.includes('/activity/')
        );

        if (linkedinResult) {
          // Extract bio from content
          const content = linkedinResult.text || '';
          const bio = content.substring(0, 500);

          // Update contact
          const { error } = await supabase
            .from('linkedin_contacts')
            .update({
              linkedin_url: linkedinResult.url,
              bio: contact.bio
                ? `${contact.bio}\n\nLinkedIn: ${bio}`
                : bio,
              exa_enriched: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', contact.id);

          if (error) {
            console.log(`   ❌ Update failed: ${error.message}`);
            failed++;
          } else {
            console.log(`   ✅ Enriched with LinkedIn: ${linkedinResult.url}`);
            enriched++;
          }
        } else {
          console.log(`   ⚠️  No LinkedIn profile found in results`);
          skipped++;
        }
      } else {
        console.log(`   ⚠️  No results found`);
        skipped++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 ENRICHMENT SUMMARY\n');
  console.log(`Total contacts: ${contacts.length}`);
  console.log(`✅ Enriched: ${enriched}`);
  console.log(`⏭️  Skipped (already enriched): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\n' + '='.repeat(80));
}

enrichAllGoodsContacts()
  .then(() => {
    console.log('\n✅ Enrichment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Enrichment failed:', error);
    process.exit(1);
  });
