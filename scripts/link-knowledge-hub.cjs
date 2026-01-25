#!/usr/bin/env node
/**
 * Link Knowledge Hub to Person Identity Map
 *
 * Links contact_communications from Knowledge Hub to person_identity_map
 * by matching email addresses.
 *
 * Note: contact_communications.ghl_contact_id actually stores email addresses
 *
 * Databases: BOTH (Intelligence Platform + Knowledge Hub)
 *
 * Run: node scripts/link-knowledge-hub.cjs [--dry-run]
 */

const { validateEnv, BOTH_DATABASES } = require('./lib/validate-env.cjs');
validateEnv(BOTH_DATABASES);

const { createClient } = require('@supabase/supabase-js');

// ACT Intelligence Platform (person_identity_map)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Knowledge Hub (contact_communications)
const knowledgeHub = createClient(
  process.env.KNOWLEDGE_HUB_SUPABASE_URL,
  process.env.KNOWLEDGE_HUB_SUPABASE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

async function getAllCommunications() {
  console.log('Fetching all contact_communications...');
  let allComms = [];
  let offset = 0;

  while (true) {
    const { data, error } = await knowledgeHub
      .from('contact_communications')
      .select('ghl_contact_id, direction, occurred_at')
      .range(offset, offset + 999);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allComms = allComms.concat(data);
    offset += 1000;
    if (offset >= 20000) break;
  }

  console.log(`Found ${allComms.length} communications`);
  return allComms;
}

async function getPersonIdentityEmails() {
  console.log('Fetching person_identity_map emails...');
  let allPersons = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('person_identity_map')
      .select('person_id, email')
      .not('email', 'is', null)
      .range(offset, offset + 999);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allPersons = allPersons.concat(data);
    offset += 1000;
    if (offset >= 20000) break;
  }

  console.log(`Found ${allPersons.length} persons with email`);
  return allPersons;
}

function calculateCommunicationStats(communications) {
  const stats = {};

  for (const comm of communications) {
    const email = comm.ghl_contact_id?.toLowerCase().trim();
    if (!email) continue;

    if (!stats[email]) {
      stats[email] = { sent: 0, received: 0, lastAt: null };
    }

    if (comm.direction === 'outbound') {
      stats[email].sent++;
    } else {
      stats[email].received++;
    }

    const date = comm.occurred_at ? new Date(comm.occurred_at) : null;
    if (date && (!stats[email].lastAt || date > new Date(stats[email].lastAt))) {
      stats[email].lastAt = comm.occurred_at;
    }
  }

  return stats;
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Link Knowledge Hub to Person Identity    ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    const communications = await getAllCommunications();
    const emailStats = calculateCommunicationStats(communications);
    console.log(`\nUnique emails in communications: ${Object.keys(emailStats).length}`);

    const persons = await getPersonIdentityEmails();
    const emailToPersonId = {};
    for (const p of persons) {
      if (p.email) emailToPersonId[p.email.toLowerCase().trim()] = p.person_id;
    }

    let matches = 0;
    let noMatch = 0;
    const updates = [];

    for (const [email, stats] of Object.entries(emailStats)) {
      const personId = emailToPersonId[email];
      if (personId) {
        matches++;
        updates.push({ person_id: personId, email, ...stats });
      } else {
        noMatch++;
      }
    }

    console.log(`\nMatches found: ${matches}`);
    console.log(`No match (new contacts): ${noMatch}`);

    console.log('\nSample matches:');
    updates.slice(0, 5).forEach(u => {
      console.log(`  ${u.email}: sent=${u.sent} received=${u.received}`);
    });

    const unmatchedEmails = Object.keys(emailStats).filter(e => !emailToPersonId[e]);
    console.log('\nSample unmatched (potential new contacts):');
    unmatchedEmails.slice(0, 10).forEach(e => {
      const s = emailStats[e];
      console.log(`  ${e}: sent=${s.sent} received=${s.received}`);
    });

    if (DRY_RUN) {
      console.log('\n[DRY RUN] Would update', updates.length, 'person records');
      return;
    }

    // Save matches for later application
    require('fs').writeFileSync(
      'scripts/communication-matches.json',
      JSON.stringify(updates, null, 2)
    );
    console.log('\nMatches saved to: scripts/communication-matches.json');
    console.log('✅ Knowledge Hub linking analysis complete!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
