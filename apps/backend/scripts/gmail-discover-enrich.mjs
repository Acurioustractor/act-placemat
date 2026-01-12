#!/usr/bin/env node
/**
 * Gmail Discovery + Exa Enrichment - Integrated Pipeline
 * Combines Gmail contact discovery with automatic Exa enrichment
 *
 * Flow:
 * 1. Mine Gmail for project mentions
 * 2. Extract contacts (people + organizations)
 * 3. Process through strategic contact service
 * 4. AUTO-ENRICH with Exa.ai
 * 5. Create person identity mappings
 * 6. Strategic analysis and tier assignment
 * 7. Notion promotion for high-value contacts
 *
 * Usage: node gmail-discover-enrich.mjs "<PROJECT_NAME>" "<PROJECT_ID>" [lookbackDays] [--enrich]
 * Example: node gmail-discover-enrich.mjs "BG Fit" "18febcf9-81cf-80fe-a738-fe374e01cd08" 365 --enrich
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Exa from 'exa-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Only initialize Exa if API key is available
let exa = null;
if (process.env.EXA_API_KEY) {
  exa = new Exa(process.env.EXA_API_KEY);
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback';
const TOKEN_PATH = path.resolve(__dirname, '../core/.gmail_tokens.json');

/**
 * Main pipeline
 */
async function discoverAndEnrich(projectName, projectId, lookbackDays = 365, enableEnrichment = false) {
  console.log('🚀 GMAIL DISCOVERY + EXA ENRICHMENT PIPELINE');
  console.log('═'.repeat(70));
  console.log(`Project: ${projectName}`);
  console.log(`Project ID: ${projectId}`);
  console.log(`Lookback: ${lookbackDays} days`);
  console.log(`Exa Enrichment: ${enableEnrichment ? '✅ ENABLED' : '❌ DISABLED'}\n`);

  // STEP 1: Gmail Discovery
  console.log('📧 STEP 1: GMAIL DISCOVERY');
  console.log('─'.repeat(70));

  const { people, organizations, emailCount } = await discoverFromGmail(projectName, lookbackDays);

  console.log(`\n✅ Discovery complete:`);
  console.log(`   Emails scanned: ${emailCount}`);
  console.log(`   People found: ${people.length}`);
  console.log(`   Organizations found: ${organizations.length}\n`);

  // STEP 2: Insert into Supabase
  console.log('💾 STEP 2: DATABASE INSERTION');
  console.log('─'.repeat(70));

  const insertedContacts = await insertContacts(people, organizations, projectId, projectName);

  console.log(`\n✅ Insertion complete:`);
  console.log(`   People inserted: ${insertedContacts.peopleInserted}`);
  console.log(`   Organizations inserted: ${insertedContacts.orgsInserted}\n`);

  // STEP 3: Exa Enrichment (if enabled)
  let enrichmentResults = null;
  if (enableEnrichment && insertedContacts.contactIds.length > 0) {
    if (!exa) {
      console.log('⚠️  STEP 3: EXA ENRICHMENT SKIPPED - No API key found');
      console.log('   Set EXA_API_KEY in .env to enable enrichment\n');
    } else {
      console.log('🔍 STEP 3: EXA ENRICHMENT');
      console.log('─'.repeat(70));

      enrichmentResults = await enrichContactsBatch(insertedContacts.contactIds);

      console.log(`\n✅ Enrichment complete:`);
      console.log(`   Contacts enriched: ${enrichmentResults.enriched}`);
      console.log(`   Person identities mapped: ${enrichmentResults.personMapped}`);
      console.log(`   Strategic contacts found: ${enrichmentResults.strategic}\n`);
    }
  } else if (enableEnrichment && !insertedContacts.contactIds.length) {
    console.log('⏭️  STEP 3: EXA ENRICHMENT (SKIPPED - no new contacts)\n');
  } else {
    console.log('⏭️  STEP 3: EXA ENRICHMENT (SKIPPED - use --enrich flag)\n');
  }

  // STEP 4: Strategic Analysis & Tier Assignment
  console.log('🎯 STEP 4: STRATEGIC ANALYSIS & TIER ASSIGNMENT');
  console.log('─'.repeat(70));

  const tierResults = await assignTiersAndAnalyze(insertedContacts.contactIds);

  console.log(`\n✅ Analysis complete:`);
  console.log(`   Tier 1 (Critical): ${tierResults.tiers.critical}`);
  console.log(`   Tier 2 (High): ${tierResults.tiers.high}`);
  console.log(`   Tier 3 (Medium): ${tierResults.tiers.medium}`);
  console.log(`   Tier 4 (Low): ${tierResults.tiers.low}\n`);

  // SUMMARY
  console.log('═'.repeat(70));
  console.log('📊 PIPELINE SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\n📧 Gmail Discovery:`);
  console.log(`   Emails scanned: ${emailCount}`);
  console.log(`   Contacts discovered: ${people.length + organizations.length}`);
  console.log(`\n💾 Database:`);
  console.log(`   New contacts inserted: ${insertedContacts.peopleInserted + insertedContacts.orgsInserted}`);

  if (enrichmentResults) {
    console.log(`\n🔍 Exa Enrichment:`);
    console.log(`   Contacts enriched: ${enrichmentResults.enriched}`);
    console.log(`   Success rate: ${Math.round((enrichmentResults.enriched / enrichmentResults.processed) * 100)}%`);
    console.log(`   Strategic contacts: ${enrichmentResults.strategic}`);
  }

  console.log(`\n🎯 Strategic Analysis:`);
  console.log(`   High-priority contacts: ${tierResults.tiers.critical + tierResults.tiers.high}`);
  console.log(`   Notion promotion candidates: ${tierResults.notionCandidates}`);

  // Save results
  const timestamp = new Date().toISOString().split('T')[0];
  const resultsPath = `/tmp/gmail_enrichment_${projectName.replace(/\s+/g, '_')}_${timestamp}.json`;

  fs.writeFileSync(resultsPath, JSON.stringify({
    pipeline: 'gmail-discovery-exa-enrichment',
    timestamp: new Date().toISOString(),
    project: { name: projectName, id: projectId },
    discovery: { emailCount, people: people.length, organizations: organizations.length },
    insertion: insertedContacts,
    enrichment: enrichmentResults,
    analysis: tierResults
  }, null, 2));

  console.log(`\n✅ Results saved: ${resultsPath}\n`);

  return {
    discovery: { people, organizations, emailCount },
    insertion: insertedContacts,
    enrichment: enrichmentResults,
    analysis: tierResults
  };
}

/**
 * Discover contacts from Gmail
 */
async function discoverFromGmail(projectName, lookbackDays) {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Gmail tokens not found. Please authenticate first.');
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const after = Math.floor(Date.now() / 1000) - (lookbackDays * 24 * 60 * 60);
  const query = `"${projectName}" after:${after}`;

  console.log(`🔍 Searching: ${query}`);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100
  });

  const messages = response.data.messages || [];
  console.log(`📬 Found ${messages.length} emails`);

  if (messages.length === 0) {
    return { people: [], organizations: [], emailCount: 0 };
  }

  console.log('📖 Extracting contacts...');

  const peopleMap = new Map();
  const orgMap = new Map();

  for (const message of messages) {
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Cc', 'Subject']
    });

    const headers = email.data.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const cc = headers.find(h => h.name === 'Cc')?.value || '';

    const allAddresses = [from, to, cc].join(' ');
    const emailRegex = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = [...allAddresses.matchAll(emailRegex)];

    for (const match of matches) {
      const emailAddr = match[0].toLowerCase();
      const localPart = match[1];
      const domain = match[2];

      if (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'].includes(domain)) {
        continue;
      }

      if (!peopleMap.has(emailAddr)) {
        peopleMap.set(emailAddr, {
          email: emailAddr,
          name: localPart.replace(/[._]/g, ' '),
          count: 0,
          domain: domain
        });
      }
      peopleMap.get(emailAddr).count++;

      if (!orgMap.has(domain)) {
        orgMap.set(domain, {
          domain: domain,
          name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
          count: 0
        });
      }
      orgMap.get(domain).count++;
    }
  }

  const people = Array.from(peopleMap.values())
    .filter(p => p.count >= 2)
    .map(p => ({
      email: p.email,
      name: p.name,
      confidence: Math.min(0.5 + (p.count * 0.05), 0.95),
      mentionCount: p.count,
      domain: p.domain
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);

  const organizations = Array.from(orgMap.values())
    .filter(o => o.count >= 3)
    .map(o => ({
      domain: o.domain,
      name: o.name,
      confidence: Math.min(0.5 + (o.count * 0.05), 0.95),
      mentionCount: o.count
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);

  return { people, organizations, emailCount: messages.length };
}

/**
 * Insert contacts into Supabase
 */
async function insertContacts(people, organizations, projectId, projectName) {
  const contactIds = [];
  let peopleInserted = 0;
  let orgsInserted = 0;

  console.log(`Inserting ${people.length} people...`);

  for (const person of people) {
    const { data: existing } = await supabase
      .from('linkedin_contacts')
      .select('id')
      .eq('email_address', person.email)
      .maybeSingle();

    if (!existing) {
      const { data: newContact } = await supabase
        .from('linkedin_contacts')
        .insert([{
          full_name: person.name,
          email_address: person.email,
          current_company: person.domain,
          data_source: 'gmail_discovery',
          relationship_score: person.confidence,
          interaction_count: person.mentionCount
        }])
        .select()
        .single();

      if (newContact) {
        contactIds.push(newContact.id);
        peopleInserted++;

        // Link to project
        await supabase
          .from('linkedin_project_connections')
          .insert([{
            contact_id: newContact.id,
            notion_project_id: projectId,
            project_name: projectName,
            connection_type: 'gmail_discovery',
            relevance_score: person.confidence,
            contact_status: 'active'
          }]);
      }
    } else {
      contactIds.push(existing.id);
    }
  }

  console.log(`Inserting ${organizations.length} organizations...`);

  for (const org of organizations) {
    const { data: existing } = await supabase
      .from('linkedin_contacts')
      .select('id')
      .eq('current_company', org.name)
      .maybeSingle();

    if (!existing) {
      const { data: newOrg } = await supabase
        .from('linkedin_contacts')
        .insert([{
          first_name: org.name,
          last_name: '(Organization)',
          current_company: org.name,
          email_address: `contact@${org.domain}`,
          data_source: 'gmail_discovery',
          relationship_score: org.confidence
        }])
        .select()
        .single();

      if (newOrg) {
        orgsInserted++;
      }
    }
  }

  return { contactIds, peopleInserted, orgsInserted };
}

/**
 * Enrich contacts with Exa
 */
async function enrichContactsBatch(contactIds) {
  const results = {
    processed: 0,
    enriched: 0,
    personMapped: 0,
    strategic: 0,
    errors: []
  };

  console.log(`Enriching ${contactIds.length} contacts...`);

  for (const contactId of contactIds) {
    try {
      const { data: contact } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contact.exa_enriched) {
        console.log(`  ↻ ${contact.full_name} already enriched`);
        continue;
      }

      console.log(`  🔍 ${contact.full_name}...`);

      // Exa bio search
      const bioQuery = `${contact.full_name} ${contact.current_company || contact.email_address.split('@')[1]} biography`;
      const bioResults = await exa.searchAndContents(bioQuery, {
        type: 'neural',
        useAutoprompt: true,
        numResults: 3,
        text: { maxCharacters: 1000 }
      });

      const validBio = bioResults.results?.find(r =>
        r.text && r.text.length > 50 && !r.text.toLowerCase().includes('sign in')
      );
      const bio = validBio?.text?.substring(0, 500) || null;

      // LinkedIn search
      const linkedinQuery = `site:linkedin.com/in/ "${contact.full_name}"`;
      const linkedinResults = await exa.searchAndContents(linkedinQuery, {
        type: 'keyword',
        numResults: 5,
        text: false
      });

      const validLinkedIn = linkedinResults.results?.find(r =>
        r.url.includes('linkedin.com/in/') && !r.url.includes('login')
      );
      const linkedinUrl = validLinkedIn?.url || null;

      // Calculate confidence
      let confidence = 0.3;
      if (linkedinUrl) confidence += 0.3;
      if (bio && bio.length > 200) confidence += 0.3;

      // Update contact
      await supabase
        .from('linkedin_contacts')
        .update({
          bio,
          linkedin_url: linkedinUrl,
          exa_enriched: true,
          exa_last_enriched: new Date().toISOString(),
          exa_confidence_score: confidence
        })
        .eq('id', contactId);

      console.log(`    ✅ Enriched (${(confidence * 100).toFixed(0)}%)`);
      results.enriched++;

      // Person mapping
      if (confidence >= 0.5 && contact.email_address) {
        await createPersonMapping(contact, bio, linkedinUrl);
        results.personMapped++;
        console.log(`    🔗 Person mapped`);
      }

      // Strategic analysis
      if (bio) {
        const isStrategic = await analyzeStrategic(contactId, bio, contact);
        if (isStrategic) {
          results.strategic++;
          console.log(`    🎯 Strategic`);
        }
      }

      results.processed++;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
      results.errors.push({ contactId, error: error.message });
    }
  }

  return results;
}

/**
 * Create person identity mapping
 */
async function createPersonMapping(contact, bio, linkedinUrl) {
  const { data: existing } = await supabase
    .from('person_identity_map')
    .select('person_id')
    .eq('email', contact.email_address)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('person_identity_map')
      .update({
        contact_data: { bio, linkedin_url: linkedinUrl, current_company: contact.current_company },
        updated_at: new Date().toISOString()
      })
      .eq('person_id', existing.person_id);

    await supabase
      .from('linkedin_contacts')
      .update({ person_id: existing.person_id })
      .eq('id', contact.id);
  } else {
    const { data: newPerson } = await supabase
      .from('person_identity_map')
      .insert([{
        full_name: contact.full_name,
        email: contact.email_address,
        contact_data: { bio, linkedin_url: linkedinUrl, current_company: contact.current_company },
        data_source: 'gmail_exa_pipeline',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    await supabase
      .from('linkedin_contacts')
      .update({ person_id: newPerson.person_id })
      .eq('id', contact.id);
  }
}

/**
 * Strategic analysis
 */
async function analyzeStrategic(contactId, bio, contact) {
  const keywords = [
    'sustainability', 'indigenous', 'aboriginal', 'circular economy',
    'regenerative', 'social enterprise', 'impact', 'community',
    'youth', 'justice', 'education', 'environment', 'climate'
  ];

  const text = `${contact.full_name} ${contact.current_company || ''} ${bio}`.toLowerCase();
  const matches = keywords.filter(k => text.includes(k));

  if (matches.length > 0) {
    const value = matches.length >= 3 ? 'high' : matches.length === 2 ? 'medium' : 'low';

    await supabase
      .from('linkedin_contacts')
      .update({
        strategic_value: value,
        tags: [...(contact.tags || []), ...matches]
      })
      .eq('id', contactId);

    return true;
  }

  return false;
}

/**
 * Assign tiers and analyze
 */
async function assignTiersAndAnalyze(contactIds) {
  const tiers = { critical: 0, high: 0, medium: 0, low: 0 };
  let notionCandidates = 0;

  console.log(`Analyzing ${contactIds.length} contacts...`);

  for (const contactId of contactIds) {
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*, person_id')
      .eq('id', contactId)
      .single();

    if (contact.person_id) {
      // Use existing tier assignment function
      const { data: tier } = await supabase
        .rpc('assign_engagement_tier', { person_uuid: contact.person_id });

      if (tier) {
        tiers[tier]++;

        if (tier === 'critical' || tier === 'high') {
          notionCandidates++;
        }
      }
    }
  }

  return { tiers, notionCandidates };
}

// CLI
const [projectName, projectId, lookbackDays, enrichFlag] = process.argv.slice(2);

if (!projectName || !projectId) {
  console.error('Usage: node gmail-discover-enrich.mjs "<PROJECT>" "<ID>" [days] [--enrich]');
  process.exit(1);
}

const enableEnrichment = process.argv.includes('--enrich');
const days = parseInt(lookbackDays) || 365;

discoverAndEnrich(projectName, projectId, days, enableEnrichment).catch(console.error);
