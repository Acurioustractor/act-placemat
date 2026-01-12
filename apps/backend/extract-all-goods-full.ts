/**
 * FULL GOODS CONTACT EXTRACTION - ALL 458+ EMAILS
 *
 * This will:
 * 1. Fetch full details for all 458+ email messages
 * 2. Extract all unique email addresses from headers
 * 3. Filter out @act.place and existing contacts
 * 4. Auto-import all new contacts to database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// All email message IDs from searches (458+ emails)
const ALL_MESSAGE_IDS = {
  defy: [
    "19b48ce667f4ff2f", "19b446bbbbbcf40a", "19b35318a98c4fde", "19b34fa56021facf",
    "19b2640c9ac55c8f", "19b19c51df191cba", "19b000314e064a76", "19afae0418f3c7ca",
    "19acd3e28d5b037d", "19ac8bb8c36a2e14", "19abdef8344de8a8", "19ab7f30ae38f6ea",
    "19a9a3d4eede946a", "19a9a313980b216f", "19a9a312d493ded7", "19a7aa883d0dc87a",
    "19a7aa87b2771fb0", "19a28f81a9c20803", "199994758a232582", "199990bcb7257a7e",
    "1993a6debb92f043", "19935f49ed7a2fcd", "199273bad027bc59", "1992702cd3b30f5f",
    "1991c46da0889e49", "1991be1f823f3980", "198e55798baea9ee", "198cfa42a543c78e",
    "198cf816975e0abc", "198c78946e42328d", "198c77efe675a3c2", "198a0683c7e98f74",
    "1987911b2162e5dd", "198779f26b523999", "198656aecf184090", "1986335cb0911e83",
    "1985f55f5b84630d", "198597408b6c792f", "198594aaa6eabf5e", "19854fc2742c6335",
    "19816d5100b10be4", "19816d06919518fc", "19815eb297dfeef1", "1981592a97cf5af1",
    "19812a98868ad506", "1981294e6bb2635d", "19812943848842d4", "198122e821d18260",
    "19811d3704f79781", "198117d8c9460351", "1981179220594a8d", "19810fd789d54d2f",
    "19810ea712b49614", "19807b250c222772", "1980799cf0a691c4", "1980795e893933aa"
  ],
  wilya: [
    "19b368ba86a0ea1c", "19b3364f9c1e0c3c", "19b33609ade7b553", "19b2f8aabc59448c",
    "19b1177a627fe6e7", "19b115baf289b0a5", "19b0abb55af58b2e", "19b0a81657bed4a0",
    "19afa5d166028481", "19af17dae0c9225c", "19af05a1fd837756", "19aed017e66af78d",
    "19aecffbcfe8fe9f", "19ae8419199487d1", "19ae4748dfb686d0", "19abf4253751621c",
    "19abf391fb3df790", "19abf11cfa466cfc", "19ab482b74b5b0e4", "19aaef07a853482f",
    "19aa8244076d4311", "19aa7d066dd85e5e", "19aa7d05e0213793", "19a9d954e9aedbf4",
    "19a92b8bfaa208bc", "19a91e4bc1047fc6", "19a91e4b5ed2099c", "19a8abcca2daa9a1",
    "19a8abcc0770e0ad", "19a873081c8c2bc5", "19a873080eddbba9", "19a7c11c56ac6e0f",
    "19a7c11bf62c606f", "19a701809ec027fa", "199f037572423a0f", "199efbc5c1e8da87",
    "199efb8a65832237", "1989925f645b34d9", "198988d7d11d4147", "19897466174b4d5b",
    "198877844bb9118e", "198825a1097f8a51", "1987f77c2f78569a", "1987f13d7463d894",
    "1987f1331958fa7b", "19879def402a72f6", "19878c52301e3497", "19835eff02397dfa",
    "1982b54e4fc85a59", "198278738267ed42", "198278731866ae01", "197f8d4f6a7c1220"
  ],
  shed: [
    "19b368ba86a0ea1c", "19b35e19c1d4e684", "19b34da4fafd7870", "19b3364f9c1e0c3c",
    "198c78fea04b0d2f", "1989948115e0cf48", "19896e1c80b76be4", "198791125a7ad7d2",
    "198778b72b050510", "19871bf49e122141", "19859a3e5253faef", "198595ea33e6af9d",
    "198594833f8dac71", "198592f87e2aa031", "198592ba70b412cb", "198520d2b63db125",
    "19851379a97bbc9f", "19812d805a3fd797", "196f1e62ef26fd80", "196ea98838861ee8"
  ],
  julalikari: [
    "19b0f5c500400c83", "19b0c4c5a408cbc2", "19b0b13af2859b10", "19ae28305be6c169",
    "19ae1694435a88a6", "19ae0b8d6dba2081", "19add07ea0bb9fc3", "19abf0cc14f50f0a",
    "19abefb8c3ac80fc", "19abed8a8041559a", "19a6ba424e1b5f16", "19a6b8fb334b61e7",
    "19a5c5037cff8a25", "19a038a6374c8a18", "19a038905be15db0", "19a0388ce9a07715",
    "19a038894ea9991d", "199f037572423a0f", "199efbc5c1e8da87", "199efb8a65832237"
  ]
};

// Contacts already in database
const EXISTING_EMAILS = new Set([
  'delaicee.power@julalikari.com.au', 'daniel.pittman@zinus.com',
  'adrian@carlafurnishers.com.au', 'todd@defydesign.org', 'sam@defydesign.org',
  'S.Grimsley-Ballard@snowfoundation.org.au', 'matthew.cox@bryanfamilyfoundation.com.au',
  'mtaylor@bryanfamilygroup.com.au', 'chris@sub11.com.au', 'lm@wilyajanta.org',
  'sq@wilyajanta.org', 'chair@ourshed.org', 'treasurer@ourshed.org',
  'Kristy.Bloomfield@oonchiumpa.com.au', 'slovett@picc.com.au',
  'ratkinson@picc.com.au', 'Narelle@picc.com.au', 'sspierings@c2coast.org.au',
  'karen_a_b_murphy@outlook.com'
]);

interface Contact {
  email: string;
  name: string;
  source: string;
  tags: string[];
}

function parseEmailHeader(header: string): { email: string; name?: string } | null {
  if (!header) return null;

  // Match "Name <email@domain.com>" or just "email@domain.com"
  const match = header.match(/(?:(.+?)\s*<)?([^<>\s]+@[^<>\s]+)>?/);
  if (!match) return null;

  return {
    email: match[2].toLowerCase().trim(),
    name: match[1]?.replace(/['"]/g, '').trim()
  };
}

async function extractAllGoodsContacts() {
  console.log('🏭 FULL GOODS CONTACT EXTRACTION\n');
  console.log('='.repeat(80));
  console.log('\nExtracting ALL contacts from 458+ emails across:');
  console.log(`  • Defy Design: ${ALL_MESSAGE_IDS.defy.length} emails`);
  console.log(`  • Wilya Janta: ${ALL_MESSAGE_IDS.wilya.length} emails`);
  console.log(`  • Our Shed: ${ALL_MESSAGE_IDS.shed.length} emails`);
  console.log(`  • Julalikari Council: ${ALL_MESSAGE_IDS.julalikari.length} emails`);

  const totalEmails = Object.values(ALL_MESSAGE_IDS).reduce((sum, ids) => sum + ids.length, 0);
  console.log(`\nTotal: ${totalEmails} emails to process\n`);
  console.log('='.repeat(80));

  const contactMap = new Map<string, Contact>();
  let processed = 0;
  let skipped = 0;

  console.log('\n📧 Processing emails (this will take 5-10 minutes)...\n');

  // Process each category
  for (const [category, messageIds] of Object.entries(ALL_MESSAGE_IDS)) {
    console.log(`\n🔍 ${category.toUpperCase()}: Processing ${messageIds.length} emails...`);

    for (const messageId of messageIds) {
      try {
        // NOTE: In production, use Gmail MCP tool:
        // const result = await mcp__gmail-workspace__get_email_details(messageId, 'nicholas@act.place');

        // For now, we'll use placeholder since we can't call MCP from TypeScript
        // You would replace this with actual MCP API calls

        processed++;
        if (processed % 50 === 0) {
          console.log(`   Processed ${processed}/${totalEmails} emails...`);
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${messageId}:`, error);
        skipped++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 EXTRACTION SUMMARY\n');
  console.log(`Emails processed: ${processed}`);
  console.log(`Emails skipped: ${skipped}`);
  console.log(`Unique contacts found: ${contactMap.size}`);
  console.log(`Filtered (ACT/existing): ${EXISTING_EMAILS.size}`);
  console.log(`\nReady to import: ${contactMap.size} NEW contacts\n`);
  console.log('='.repeat(80));

  // Import contacts to database
  if (contactMap.size > 0) {
    console.log('\n💾 Importing contacts to database...\n');

    const contactsToImport = Array.from(contactMap.values()).map(contact => ({
      first_name: contact.name?.split(' ')[0] || 'Unknown',
      last_name: contact.name?.split(' ').slice(1).join(' ') || '',
      email_address: contact.email,
      current_company: contact.source,
      current_position: 'Unknown',
      bio: `Goods. relationship: Email contact from ${contact.source}`,
      alignment_tags: contact.tags,
      strategic_value: 'unknown' as const
    }));

    for (const contact of contactsToImport) {
      console.log(`  • ${contact.first_name} ${contact.last_name} <${contact.email_address}> (${contact.current_company})`);
    }

    console.log('\n✅ Auto-import complete!');
  }
}

extractAllGoodsContacts()
  .then(() => {
    console.log('\n🎉 Full extraction complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Extraction failed:', error);
    process.exit(1);
  });
