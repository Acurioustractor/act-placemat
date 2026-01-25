#!/usr/bin/env node
/**
 * Apply Communication Stats to person_identity_map
 *
 * Reads communication-matches.json and updates person_identity_map
 * with total_emails_sent, total_emails_received, last_communication_at
 *
 * Database: Intelligence Platform (person_identity_map)
 *
 * Run: node scripts/apply-communication-stats.cjs [--dry-run]
 */

const { validateEnv, INTELLIGENCE_PLATFORM } = require('./lib/validate-env.cjs');
validateEnv(INTELLIGENCE_PLATFORM);

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Apply Communication Stats                ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Read matches file
  const matchesPath = 'scripts/communication-matches.json';
  if (!fs.existsSync(matchesPath)) {
    console.error('No matches file found. Run link-knowledge-hub.cjs first.');
    process.exit(1);
  }

  const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
  console.log(`Found ${matches.length} matches to apply\n`);

  // Filter out obvious automated emails (newsletters, notifications)
  const automatedDomains = [
    'noreply', 'notification', 'support@', 'team@', 'bounces+',
    'amazonses.com', 'beehiiv.com', 'substack.com', 'medium.com',
    'skool.com', 'slack.com', 'codepen.io', 'twilio.com', 'auspost.com'
  ];

  const realMatches = matches.filter(m => {
    const email = m.email.toLowerCase();
    return !automatedDomains.some(domain => email.includes(domain));
  });

  console.log(`Filtered to ${realMatches.length} real person matches`);
  console.log(`(Excluded ${matches.length - realMatches.length} automated/newsletter addresses)\n`);

  if (DRY_RUN) {
    console.log('Sample updates:');
    realMatches.slice(0, 10).forEach(m => {
      console.log(`  ${m.email}: sent=${m.sent} received=${m.received}`);
    });
    console.log(`\n[DRY RUN] Would update ${realMatches.length} person records`);
    return;
  }

  // Apply updates
  let updated = 0;
  let errors = 0;

  for (const match of realMatches) {
    const { error } = await supabase
      .from('person_identity_map')
      .update({
        total_emails_sent: match.sent,
        total_emails_received: match.received,
        last_communication_at: match.lastAt
      })
      .eq('person_id', match.person_id);

    if (error) {
      errors++;
      console.error(`Error updating ${match.email}:`, error.message);
    } else {
      updated++;
    }

    if (updated % 50 === 0) {
      process.stdout.write(`\rUpdated ${updated}/${realMatches.length} records`);
    }
  }

  console.log(`\n\n✅ Communication stats applied!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\nTo see contacts with most communications:`);
  console.log(`  SELECT full_name, email, total_emails_sent, total_emails_received`);
  console.log(`  FROM person_identity_map`);
  console.log(`  WHERE total_emails_sent > 0 OR total_emails_received > 0`);
  console.log(`  ORDER BY total_emails_sent + total_emails_received DESC LIMIT 20;`);
}

main().catch(console.error);
