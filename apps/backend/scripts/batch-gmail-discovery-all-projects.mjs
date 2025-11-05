#!/usr/bin/env node
/**
 * Batch Gmail Discovery for ALL Projects
 * Scans actual Gmail email content (not just Notion relations)
 * to discover 500-2,000+ strategic contacts
 *
 * Usage: node batch-gmail-discovery-all-projects.mjs [lookbackDays]
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OAuth2 credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback';
const TOKEN_PATH = path.resolve(__dirname, '../core/.gmail_tokens.json');

/**
 * Extract email address and name from Gmail header
 */
function parseEmail(headerValue) {
  const match = headerValue.match(/([^<]+)<([^>]+)>/) || headerValue.match(/([^<]+)/);
  if (!match) return null;

  const email = match[2] || match[1];
  const name = match[2] ? match[1].trim().replace(/"/g, '') : '';

  return {
    email: email.trim().toLowerCase(),
    name: name || email.split('@')[0]
  };
}

/**
 * Calculate composite intelligence score
 */
function calculateIntelligenceScore(contact, projectContext) {
  let influence = 50;
  let alignment = 50;
  let accessibility = 50;
  let timing = 50;
  let strategicValue = 50;

  // Influence: Based on domain and email frequency
  const domain = contact.email.split('@')[1];
  if (domain?.includes('gov.au') || domain?.includes('.gov')) influence += 30;
  else if (domain?.includes('.edu.au') || domain?.includes('.edu')) influence += 20;
  else if (domain?.includes('.org.au') || domain?.includes('.org')) influence += 15;

  if (contact.emailCount > 10) influence += 20;
  else if (contact.emailCount > 5) influence += 10;

  // Alignment: Project-specific keywords and content
  alignment += Math.min(30, contact.emailCount * 3);

  // Accessibility: Recent and frequent contact
  const daysSinceContact = Math.floor((Date.now() - contact.lastContact) / (1000 * 60 * 60 * 24));
  if (daysSinceContact < 30) accessibility += 30;
  else if (daysSinceContact < 90) accessibility += 20;
  else if (daysSinceContact < 180) accessibility += 10;

  // Timing: Recent activity is hot
  if (daysSinceContact < 7) timing += 40;
  else if (daysSinceContact < 30) timing += 30;
  else if (daysSinceContact < 90) timing += 20;

  // Strategic Value: Cross-project presence
  if (contact.threadCount > 5) strategicValue += 30;
  else if (contact.threadCount > 2) strategicValue += 20;

  // Composite score
  const compositeScore = Math.min(100,
    influence * 0.3 +
    alignment * 0.25 +
    accessibility * 0.2 +
    timing * 0.15 +
    strategicValue * 0.1
  );

  // Assign tier
  let tier;
  if (compositeScore >= 80) tier = 'critical';
  else if (compositeScore >= 65) tier = 'high';
  else if (compositeScore >= 45) tier = 'medium';
  else tier = 'low';

  return {
    compositeScore: Math.round(compositeScore),
    influence: Math.round(influence),
    alignment: Math.round(alignment),
    accessibility: Math.round(accessibility),
    timing: Math.round(timing),
    strategicValue: Math.round(strategicValue),
    tier
  };
}

/**
 * Mine Gmail for a specific project
 */
async function mineProjectEmails(gmail, project, lookbackDays) {
  const after = Math.floor(Date.now() / 1000) - (lookbackDays * 24 * 60 * 60);
  const query = `"${project.name}" after:${after}`;

  console.log(`  🔍 Searching: ${query}`);

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100
    });

    const messages = response.data.messages || [];

    if (messages.length === 0) {
      return { contacts: [], emailCount: 0 };
    }

    console.log(`  📬 Found ${messages.length} emails`);

    // Extract contacts from email headers
    const contactMap = new Map();

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Cc', 'Date']
      });

      const headers = email.payload.headers;
      const dateHeader = headers.find(h => h.name === 'Date')?.value;
      const emailDate = dateHeader ? new Date(dateHeader).getTime() : Date.now();

      // Extract from all header fields
      ['From', 'To', 'Cc'].forEach(headerName => {
        const headerValue = headers.find(h => h.name === headerName)?.value;
        if (!headerValue) return;

        // Split multiple emails
        const emails = headerValue.split(',');
        emails.forEach(emailStr => {
          const parsed = parseEmail(emailStr.trim());
          if (!parsed || !parsed.email.includes('@')) return;

          const key = parsed.email;
          if (!contactMap.has(key)) {
            contactMap.set(key, {
              email: parsed.email,
              name: parsed.name,
              emailCount: 0,
              threadCount: 0,
              lastContact: emailDate,
              threadIds: new Set()
            });
          }

          const contact = contactMap.get(key);
          contact.emailCount++;
          contact.threadIds.add(message.threadId);
          contact.threadCount = contact.threadIds.size;
          if (emailDate > contact.lastContact) {
            contact.lastContact = emailDate;
          }
        });
      });
    }

    return {
      contacts: Array.from(contactMap.values()),
      emailCount: messages.length
    };
  } catch (error) {
    console.error(`  ❌ Error scanning project: ${error.message}`);
    return { contacts: [], emailCount: 0 };
  }
}

/**
 * Save contacts to Supabase
 */
async function saveContactsToSupabase(contacts, projectId) {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      // Check if person exists
      const { data: existing } = await supabase
        .from('person_identity_map')
        .select('person_id')
        .eq('email', contact.email)
        .single();

      let personId;

      if (existing) {
        personId = existing.person_id;
        updated++;
      } else {
        // Insert new person
        const { data: newPerson, error: insertError } = await supabase
          .from('person_identity_map')
          .insert({
            full_name: contact.name,
            email: contact.email,
            source: 'gmail_discovery'
          })
          .select('person_id')
          .single();

        if (insertError) {
          errors++;
          continue;
        }

        personId = newPerson.person_id;
        inserted++;
      }

      // Insert/update intelligence scores
      await supabase
        .from('contact_intelligence_scores')
        .upsert({
          person_id: personId,
          ...contact.scores,
          engagement_priority: contact.scores.tier,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'person_id'
        });

      // Record interaction
      await supabase
        .from('contact_interactions')
        .insert({
          person_id: personId,
          interaction_type: 'email',
          metadata: {
            project_id: projectId,
            email_count: contact.emailCount,
            thread_count: contact.threadCount
          }
        });

    } catch (error) {
      console.error(`    ❌ Error saving contact ${contact.email}: ${error.message}`);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

/**
 * Main batch discovery function
 */
async function runBatchDiscovery(lookbackDays = 365) {
  console.log('🚀 BATCH GMAIL DISCOVERY - ALL PROJECTS');
  console.log('='.repeat(70));
  console.log(`Lookback Period: ${lookbackDays} days`);
  console.log(`Scanning actual Gmail email content for contacts\n`);

  // Load Gmail tokens
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error('❌ Gmail tokens not found. Please authenticate first.');
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

  // Initialize Gmail
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Fetch all projects
  console.log('📋 Fetching projects from Notion API...');
  const response = await fetch('http://localhost:4000/api/real/projects');
  const projectsData = await response.json();

  if (!projectsData.success) {
    console.error('❌ Failed to fetch projects');
    process.exit(1);
  }

  const projects = projectsData.projects;
  console.log(`✅ Found ${projects.length} projects\n`);

  // Process each project
  const results = [];
  let totalContacts = 0;
  let totalEmails = 0;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    console.log(`[${i + 1}/${projects.length}] ${project.name}`);

    const { contacts, emailCount } = await mineProjectEmails(gmail, project, lookbackDays);

    if (contacts.length === 0) {
      console.log(`  ⚪ No contacts found\n`);
      continue;
    }

    // Calculate scores for each contact
    const scoredContacts = contacts.map(contact => ({
      ...contact,
      scores: calculateIntelligenceScore(contact, project)
    }));

    console.log(`  📊 Discovered ${contacts.length} unique contacts`);
    console.log(`  📧 From ${emailCount} emails`);

    // Save to Supabase
    const { inserted, updated, errors } = await saveContactsToSupabase(scoredContacts, project.id);

    console.log(`  💾 Saved: ${inserted} new, ${updated} updated, ${errors} errors\n`);

    totalContacts += contacts.length;
    totalEmails += emailCount;
    totalInserted += inserted;
    totalUpdated += updated;

    results.push({
      projectName: project.name,
      contactsFound: contacts.length,
      emailsScanned: emailCount,
      inserted,
      updated
    });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('🎉 BATCH DISCOVERY COMPLETE!');
  console.log('='.repeat(70));
  console.log(`✅ Projects Scanned: ${projects.length}`);
  console.log(`📧 Total Emails Found: ${totalEmails}`);
  console.log(`🔗 Total Contacts Discovered: ${totalContacts}`);
  console.log(`💾 New Contacts: ${totalInserted}`);
  console.log(`🔄 Updated Contacts: ${totalUpdated}`);

  console.log(`\n📊 Top 15 Projects by Contact Discoveries:`);
  const topProjects = results
    .sort((a, b) => b.contactsFound - a.contactsFound)
    .slice(0, 15);

  topProjects.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${r.projectName.substring(0, 45).padEnd(45)} → ${r.contactsFound} contacts`);
  });

  // Save full results
  const outputPath = '/tmp/gmail_batch_discovery_results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full results saved to: ${outputPath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const lookbackDays = parseInt(process.argv[2]) || 365;
  runBatchDiscovery(lookbackDays)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
