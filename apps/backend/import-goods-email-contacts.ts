/**
 * IMPORT GOODS. CONTACTS FROM NICHOLAS'S EMAIL
 *
 * Extracts contacts from Nicholas's email who are involved with Goods. project
 * and adds them to the Intelligence Hub
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Goods.-related contacts extracted from Nicholas's email
const GOODS_CONTACTS = [
  {
    full_name: 'Lucy McGarry',
    email_address: 'lm@wilyajanta.org',
    current_company: 'Wilya Janta',
    current_position: 'Unknown',
    relationship: 'Partner organization - Goods. project support',
    context: 'Our Community Shed + Goods Project collaboration',
    source: 'nicholas@act.place email',
    tags: ['community', 'indigenous', 'partner']
  },
  {
    full_name: 'Alba (Chair)',
    email_address: 'chair@ourshed.org',
    current_company: 'Our Shed',
    current_position: 'Chair',
    relationship: 'Partner organization - storage and grants support',
    context: 'Goods. project partnership - storage, grants, feedback',
    source: 'nicholas@act.place email',
    tags: ['community', 'nfp', 'partner', 'funding']
  },
  {
    full_name: 'Todd Sidery',
    email_address: 'todd@defydesign.org',
    current_company: 'Defy Design',
    current_position: 'Unknown',
    relationship: 'Product design partner',
    context: 'Defy x Goods - product optimisation and testing',
    source: 'nicholas@act.place email',
    tags: ['product', 'manufacturing', 'technology', 'partner']
  },
  {
    full_name: 'Adrian',
    email_address: 'adrian@carlafurnishers.com.au',
    current_company: 'Carla Furnishers',
    current_position: 'Unknown',
    relationship: 'Supplier - washing machines',
    context: 'Speedqueen washers supplier for Goods. project',
    source: 'nicholas@act.place email',
    tags: ['business', 'manufacturing', 'supplier']
  },
  {
    full_name: 'Chris',
    email_address: 'chris@sub11.com.au',
    current_company: 'Sub11',
    current_position: 'Unknown',
    relationship: 'Bryan Family Foundation connection',
    context: 'BFF + Goods partnership discussion',
    source: 'nicholas@act.place email',
    tags: ['business', 'funding', 'partner']
  },
  {
    full_name: 'Matthew Cox',
    email_address: 'mcox@thebryanfoundation.org.au',
    current_company: 'The Bryan Foundation',
    current_position: 'Unknown',
    relationship: 'Foundation contact',
    context: 'BFF + Goods funding partnership',
    source: 'nicholas@act.place email',
    tags: ['funding', 'philanthropy', 'partner']
  },
  {
    full_name: 'M Taylor',
    email_address: 'mtaylor@bryanfamilygroup.com.au',
    current_company: 'Bryan Family Group',
    current_position: 'Unknown',
    relationship: 'Family office contact',
    context: 'BFF + Goods funding partnership',
    source: 'nicholas@act.place email',
    tags: ['funding', 'philanthropy', 'business']
  }
];

async function importGoodsContacts() {
  console.log('📧 IMPORTING GOODS. CONTACTS FROM EMAIL\n');
  console.log('='.repeat(80));
  console.log(`\nImporting ${GOODS_CONTACTS.length} contacts from Nicholas's email\n`);
  console.log('='.repeat(80));

  try {
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const contact of GOODS_CONTACTS) {
      console.log(`\n📌 Processing: ${contact.full_name} (${contact.email_address})`);

      // Check if contact already exists by email
      const { data: existing, error: checkError } = await supabase
        .from('linkedin_contacts')
        .select('id, full_name, email_address')
        .eq('email_address', contact.email_address)
        .maybeSingle();

      if (checkError) {
        console.error(`   ❌ Error checking: ${checkError.message}`);
        continue;
      }

      if (existing) {
        console.log(`   ⚠️  Already exists: ${existing.full_name}`);

        // Update with additional tags
        const { error: updateError } = await supabase
          .from('linkedin_contacts')
          .update({
            alignment_tags: existing.alignment_tags
              ? Array.from(new Set([...existing.alignment_tags, ...contact.tags]))
              : contact.tags,
            bio: existing.bio
              ? `${existing.bio}\n\nGoods. relationship: ${contact.relationship}. ${contact.context}`
              : `Goods. relationship: ${contact.relationship}. ${contact.context}`
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`   ❌ Update error: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated with Goods. context`);
          updated++;
        }
        continue;
      }

      // Insert new contact
      const { data: newContact, error: insertError} = await supabase
        .from('linkedin_contacts')
        .insert([{
          full_name: contact.full_name,
          email_address: contact.email_address,
          current_company: contact.current_company,
          current_position: contact.current_position,
          bio: `Goods. relationship: ${contact.relationship}. ${contact.context}`,
          alignment_tags: contact.tags,
          strategic_value: 'unknown'
        }])
        .select()
        .single();

      if (insertError) {
        console.error(`   ❌ Insert error: ${insertError.message}`);
        skipped++;
      } else {
        console.log(`   ✅ Imported successfully`);
        console.log(`      Company: ${contact.current_company}`);
        console.log(`      Context: ${contact.context}`);
        imported++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 IMPORT SUMMARY\n');
    console.log(`Total processed: ${GOODS_CONTACTS.length}`);
    console.log(`✅ Imported (new): ${imported}`);
    console.log(`✅ Updated (existing): ${updated}`);
    console.log(`⚠️  Skipped (errors): ${skipped}`);

    // Now match these contacts to Goods. project
    if (imported > 0 || updated > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('\n🔗 LINKING CONTACTS TO GOODS. PROJECT\n');

      // Get Goods. project
      const { data: goodsProject } = await supabase
        .from('notion_projects_cache')
        .select('notion_project_id, project_name')
        .ilike('project_name', '%Goods%')
        .single();

      if (goodsProject) {
        // Get all email-sourced contacts
        const emailContacts = GOODS_CONTACTS.map(c => c.email_address);

        const { data: contacts } = await supabase
          .from('linkedin_contacts')
          .select('id, full_name, email_address, alignment_tags, bio')
          .in('email_address', emailContacts);

        if (contacts) {
          const matches = contacts.map(contact => {
            // Score based on relationship type from bio
            let score = 50; // Base score for email relationship
            const bio = contact.bio || '';

            if (bio.includes('Product design')) score += 30;
            if (bio.includes('Supplier')) score += 20;
            if (bio.includes('funding')) score += 20;
            if (bio.includes('Partner')) score += 15;

            // Extract relationship from bio
            const relationshipMatch = bio.match(/Goods\. relationship: ([^.]+)\./);
            const relationship = relationshipMatch ? relationshipMatch[1] : 'Email contact';

            return {
              contact_id: contact.id,
              project_notion_id: goodsProject.notion_project_id,
              project_name: goodsProject.project_name,
              project_source: 'notion',
              alignment_score: score,
              matched_keywords: contact.alignment_tags || [],
              match_reason: `Email relationship: ${relationship}`,
              engagement_status: 'active' // These are Nicholas's actual working relationships!
            };
          });

          const { error: matchError } = await supabase
            .from('project_contact_matches')
            .upsert(matches, {
              onConflict: 'contact_id,project_notion_id',
              ignoreDuplicates: false
            });

          if (matchError) {
            console.error('❌ Error saving matches:', matchError);
          } else {
            console.log(`✅ Linked ${matches.length} contacts to Goods. project`);
            console.log('\nMatches created:');
            matches.forEach(m => {
              const contact = contacts.find(c => c.id === m.contact_id);
              console.log(`  • ${contact?.full_name} (${m.alignment_score} points) - ${m.match_reason}`);
            });
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 IMPORT COMPLETE!\n');
    console.log('NEXT STEPS:');
    console.log('  1. Review imported contacts in Intelligence Hub');
    console.log('  2. Enrich with LinkedIn/Exa data (especially Todd Sidery - product design)');
    console.log('  3. Update strategic values for key partners');
    console.log('  4. Track engagement status (these are active relationships!)');
    console.log('\n');

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

importGoodsContacts()
  .then(() => {
    console.log('✅ Goods. email contacts imported!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });
