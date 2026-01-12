/**
 * BULK IMPORT - ALL NEW GOODS CONTACTS
 *
 * Import all unique email addresses discovered from email sampling.
 * Excludes @act.place and existing database contacts.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ALL NEW CONTACTS FOUND (excluding existing 19 in database)
const NEW_CONTACTS = [
  // Wilya Janta Team
  { email: 'gw@wilyajanta.org', name: 'Gabriel Waterford', company: 'Wilya Janta', tags: ['indigenous', 'partner', 'community'] },
  { email: 'ae@wilyajanta.org', name: 'Andrea Elliott', company: 'Wilya Janta', tags: ['indigenous', 'partner', 'community'] },
  { email: 'jf@wilyajanta.org', name: 'Jimmy Frank', company: 'Wilya Janta', tags: ['indigenous', 'partner', 'community', 'chairman'] },
  { email: 'accounts@wilyajanta.org', name: 'Wilya Janta Accounts', company: 'Wilya Janta', tags: ['indigenous', 'partner', 'finance'] },
  { email: 'lucy.mcgarry@barklybackbone.com.au', name: 'Lucy McGarry', company: 'Barkly Backbone', tags: ['indigenous', 'evaluation', 'partner'] },

  // Our Shed Team
  { email: 'secretary@ourshed.org', name: 'Our Shed Secretary', company: 'Our Shed', tags: ['partner', 'operations'] },

  // Julalikari Council Team
  { email: 'ceo@julalikari.com.au', name: 'Chief Executive Officer', company: 'Julalikari Council', tags: ['customer', 'leadership'] },
  { email: 'n.lansbury@uq.edu.au', name: 'Nina Lansbury', company: 'University of Queensland', tags: ['research', 'health', 'academic'] },

  // Snow Foundation (already have Sally, but found another contact)
  { email: 'g.byron@snowfoundation.org.au', name: 'Georgina Byron', company: 'Snow Foundation', tags: ['funding', 'philanthropy'] },

  // Allies & Supporters (from Simon's email)
  { email: 'sm@office.org.au', name: 'Steve Mintern', company: 'Unknown', tags: ['ally', 'community'] },
  { email: 'sr@office.org.au', name: 'Simon Robinson', company: 'Unknown', tags: ['ally', 'community'] },
  { email: 'a.gawthorne@gmail.com', name: 'Alycia Gawthorne', company: 'Communications Consultant', tags: ['media', 'communications', 'storytelling'] },
  { email: 'hi@alanaholmberg.com', name: 'Alana Holmberg', company: 'Unknown', tags: ['ally', 'community'] },

  // Health Sector
  { email: 'nathan.evans@ahnt.org.au', name: 'Nathan Evans', company: 'Aboriginal Health NT', tags: ['health', 'indigenous'] },
  { email: 'leeanne.caton@ahnt.org.au', name: 'Leeanne Caton', company: 'Aboriginal Health NT', tags: ['health', 'indigenous'] },
  { email: 'skye.thompson@ahnt.org.au', name: 'Skye Thompson', company: 'Aboriginal Health NT', tags: ['health', 'indigenous'] },

  // Academic/Research
  { email: 'p.memmott@uq.edu.au', name: 'Paul Memmott', company: 'University of Queensland', tags: ['research', 'academic', 'indigenous'] },
  { email: 'kristina.vine@sydney.edu.au', name: 'Kris Vine', company: 'University of Sydney', tags: ['research', 'academic'] },
  { email: 'veronica.matthews@sydney.edu.au', name: 'Veronica Matthews', company: 'University of Sydney', tags: ['research', 'academic'] },
  { email: 'samantha.rich@unsw.edu.au', name: 'Samantha Rich', company: 'UNSW', tags: ['research', 'academic'] },
  { email: 'genevieve.murray@sydney.edu.au', name: 'Genevieve Murray', company: 'University of Sydney', tags: ['research', 'academic'] },

  // Architecture/Design
  { email: 'cary.duffield@troppo.com.au', name: 'Cary Duffield', company: 'Troppo Architects', tags: ['architecture', 'design'] },
  { email: 'phil.harris@troppo.com.au', name: 'Phil Harris', company: 'Troppo Architects', tags: ['architecture', 'design'] },

  // Legal
  { email: 'peggy.dwyer@forbeschambers.com.au', name: 'Peggy Dwyer', company: 'Forbes Chambers', tags: ['legal', 'barrister'] },
  { email: 'hugomoodie@vicbar.com.au', name: 'Hugo Moodie', company: 'Victorian Bar', tags: ['legal', 'barrister'] },
  { email: 'Dusan.Stevic@au.kwm.com', name: 'Dusan Stevic', company: 'King & Wood Mallesons', tags: ['legal', 'corporate'] },
  { email: 'Sofia.Jaquiery@au.kwm.com', name: 'Sofia Jaquiery', company: 'King & Wood Mallesons', tags: ['legal', 'corporate'] },
  { email: 'jonathon.hunyor@piac.asn.au', name: 'Jonathon Hunyor', company: 'PIAC', tags: ['legal', 'advocacy'] },

  // Other Foundations/Funders
  { email: 'alberto.furlan@ianpotter.org.au', name: 'Alberto Furlan', company: 'Ian Potter Foundation', tags: ['funding', 'philanthropy'] },
  { email: 'teya@dusseldorp.org.au', name: 'Teya Dusseldorp', company: 'Dusseldorp Forum', tags: ['funding', 'philanthropy'] },
  { email: 'knorman@tfff.org.au', name: 'Katie Norman', company: 'The Funding Forum', tags: ['funding', 'philanthropy'] },

  // CSIRO
  { email: 'anthony.wright@csiro.au', name: 'Anthony Wright', company: 'CSIRO', tags: ['research', 'technology', 'recycling'] },

  // Original Power (renewable energy)
  { email: 'lauren@originalpower.org.au', name: 'Lauren Mellor', company: 'Original Power', tags: ['energy', 'indigenous', 'community'] },
  { email: 'col@originalpower.org.au', name: 'Col Johnston', company: 'Original Power', tags: ['energy', 'indigenous', 'community'] },

  // NT Shelter
  { email: 'ca@ntshelter.org.au', name: 'Annie Taylor', company: 'NT Shelter', tags: ['housing', 'advocacy'] },

  // Media/Communications
  { email: 'courtneycollinswriter@gmail.com', name: 'Courtney Collins', company: 'Writer', tags: ['media', 'storytelling', 'writer'] },
  { email: 'michellebates@time-place.com.au', name: 'Michelle Bates', company: 'Time & Place', tags: ['media', 'communications'] },

  // Other Allies
  { email: 'andrewquilty@gmail.com', name: 'Andrew Quilty', company: 'Unknown', tags: ['ally'] },
  { email: 'judeemmett74@gmail.com', name: 'Jude Emmett', company: 'Unknown', tags: ['ally'] },
  { email: 'kanderaar@mac.com', name: 'Shane Brennan', company: 'Unknown', tags: ['ally'] },
  { email: 'trudy.hairs@gmail.com', name: 'Trudy Hairs', company: 'Unknown', tags: ['ally'] },
  { email: 'rmmounsey@gmail.com', name: 'Rachel Mounsey', company: 'Unknown', tags: ['ally'] },
  { email: 'npmcauliffe@gmail.com', name: 'Nathan McAuliffe', company: 'Unknown', tags: ['ally'] },
  { email: 'katevwild@gmail.com', name: 'Kate Wild', company: 'Unknown', tags: ['ally'] },
  { email: 'david@dasf.com.au', name: 'David', company: 'DASF', tags: ['ally'] }
];

async function bulkImportContacts() {
  console.log('🏭 BULK IMPORT - ALL NEW GOODS CONTACTS\n');
  console.log('='.repeat(80));
  console.log(`\nImporting ${NEW_CONTACTS.length} new contacts...\n`);
  console.log('='.repeat(80));

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const contact of NEW_CONTACTS) {
    console.log(`\n📌 ${contact.name} <${contact.email}> (${contact.company})`);

    // Check if exists
    const { data: existing, error: checkError } = await supabase
      .from('linkedin_contacts')
      .select('id, full_name, bio, alignment_tags')
      .eq('email_address', contact.email)
      .maybeSingle();

    if (checkError) {
      console.error(`   ❌ Error checking: ${checkError.message}`);
      skipped++;
      continue;
    }

    if (existing) {
      console.log(`   ⚠️  Already exists: ${existing.full_name}`);

      // Update with Goods context
      const updatedBio = existing.bio
        ? `${existing.bio}\n\nGoods. relationship: Email contact from ${contact.company}`
        : `Goods. relationship: Email contact from ${contact.company}`;

      const { error: updateError } = await supabase
        .from('linkedin_contacts')
        .update({
          alignment_tags: existing.alignment_tags
            ? Array.from(new Set([...existing.alignment_tags, ...contact.tags]))
            : contact.tags,
          bio: updatedBio
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
    const [firstName, ...lastNameParts] = contact.name.split(' ');
    const lastName = lastNameParts.join(' ');

    const { error: insertError } = await supabase
      .from('linkedin_contacts')
      .insert([{
        first_name: firstName,
        last_name: lastName || '',
        email_address: contact.email,
        current_company: contact.company,
        current_position: 'Unknown',
        bio: `Goods. relationship: Email contact from ${contact.company}`,
        alignment_tags: contact.tags,
        strategic_value: 'unknown'
      }]);

    if (insertError) {
      console.error(`   ❌ Insert error: ${insertError.message}`);
      skipped++;
    } else {
      console.log(`   ✅ Imported successfully`);
      imported++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 IMPORT SUMMARY\n');
  console.log(`Total processed: ${NEW_CONTACTS.length}`);
  console.log(`✅ Imported (new): ${imported}`);
  console.log(`✅ Updated (existing): ${updated}`);
  console.log(`⚠️  Skipped (errors): ${skipped}`);
  console.log('\n' + '='.repeat(80));

  // Link to Goods project
  console.log('\n🔗 LINKING TO GOODS PROJECT...\n');

  const { data: goodsProject } = await supabase
    .from('notion_projects_cache')
    .select('notion_project_id, project_name')
    .ilike('project_name', '%Goods%')
    .single();

  if (goodsProject && (imported > 0 || updated > 0)) {
    const emails = NEW_CONTACTS.map(c => c.email);
    const { data: contacts } = await supabase
      .from('linkedin_contacts')
      .select('id, email_address, alignment_tags, current_company')
      .in('email_address', emails);

    if (contacts) {
      const matches = contacts.map(contact => {
        const originalContact = NEW_CONTACTS.find(c => c.email === contact.email_address);
        let score = 60; // Base score

        // Scoring
        if (contact.alignment_tags?.includes('partner')) score += 20;
        if (contact.alignment_tags?.includes('funding')) score += 20;
        if (contact.alignment_tags?.includes('customer')) score += 25;
        if (contact.alignment_tags?.includes('indigenous')) score += 15;
        if (contact.alignment_tags?.includes('health')) score += 10;
        if (contact.alignment_tags?.includes('research')) score += 10;

        return {
          contact_id: contact.id,
          project_notion_id: goodsProject.notion_project_id,
          project_name: goodsProject.project_name,
          project_source: 'placemat',
          alignment_score: Math.min(score, 95),
          matched_keywords: contact.alignment_tags || [],
          match_reason: `Email contact: ${originalContact?.company || contact.current_company}`,
          engagement_status: 'potential'
        };
      });

      // Delete existing matches first
      await supabase
        .from('project_contact_matches')
        .delete()
        .in('contact_id', contacts.map(c => c.id))
        .eq('project_notion_id', goodsProject.notion_project_id);

      // Insert new matches
      const { error: matchError } = await supabase
        .from('project_contact_matches')
        .insert(matches);

      if (matchError) {
        console.error('❌ Error linking contacts:', matchError);
      } else {
        console.log(`✅ Linked ${matches.length} contacts to Goods. project`);
      }
    }
  }

  console.log('\n🎉 BULK IMPORT COMPLETE!\n');
}

bulkImportContacts()
  .then(() => {
    console.log('✅ All contacts imported and linked!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });
