#!/usr/bin/env node
/**
 * Gmail Discovery with Strategic Contact Management
 * Supabase-first flow with automatic tier assignment
 *
 * Usage: node gmail-discover-strategic.mjs "<PROJECT_NAME>" "<PROJECT_ID>" [lookbackDays]
 * Example: node gmail-discover-strategic.mjs "BG Fit" "18febcf9-81cf-80fe-a738-fe374e01cd08" 365
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
 * Mine Gmail for project mentions and process through strategic contact service
 */
async function mineGmailForProject(projectName, projectId, lookbackDays = 365) {
  console.log('📧 GMAIL STRATEGIC DISCOVERY');
  console.log('='.repeat(60));
  console.log(`Project: ${projectName}`);
  console.log(`Project ID: ${projectId}`);
  console.log(`Lookback: ${lookbackDays} days\n`);

  // Load tokens
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error('❌ Gmail tokens not found. Please authenticate first.');
    process.exit(1);
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

  // Initialize OAuth2 and Gmail
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Search Gmail
  const after = Math.floor(Date.now() / 1000) - (lookbackDays * 24 * 60 * 60);
  const query = `"${projectName}" after:${after}`;

  console.log(`🔍 Searching Gmail: ${query}\n`);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100
  });

  const messages = response.data.messages || [];
  console.log(`📬 Found ${messages.length} emails\n`);

  if (messages.length === 0) {
    console.log('No emails found.');
    return;
  }

  // Fetch email details
  console.log('📖 Reading email details...\n');
  const emailDetails = [];

  for (const message of messages) {
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date']
    });
    emailDetails.push(email.data);
  }

  // Extract people and organizations
  console.log('🔬 Analyzing contacts...\n');

  const peopleMap = new Map();
  const orgMap = new Map();

  for (const email of emailDetails) {
    const headers = email.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const cc = headers.find(h => h.name === 'Cc')?.value || '';
    const bcc = headers.find(h => h.name === 'Bcc')?.value || '';

    const allAddresses = [from, to, cc, bcc].join(' ');
    const emailRegex = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = [...allAddresses.matchAll(emailRegex)];

    for (const match of matches) {
      const emailAddr = match[0].toLowerCase();
      const localPart = match[1];
      const domain = match[2];

      // Skip common domains
      if (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'].includes(domain)) {
        continue;
      }

      // Track person
      if (!peopleMap.has(emailAddr)) {
        peopleMap.set(emailAddr, {
          email: emailAddr,
          name: localPart.replace(/[._]/g, ' '),
          count: 0,
          domain: domain
        });
      }
      peopleMap.get(emailAddr).count++;

      // Track organization
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

  // Filter and score
  const people = Array.from(peopleMap.values())
    .filter(p => p.count >= 2) // Minimum 2 mentions
    .map(p => ({
      email: p.email,
      name: p.name,
      confidence: Math.min(0.5 + (p.count * 0.05), 0.95),
      mentionCount: p.count,
      domain: p.domain
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);

  const organizations = Array.from(orgMap.values())
    .filter(o => o.count >= 3) // Minimum 3 mentions
    .map(o => ({
      domain: o.domain,
      name: o.name,
      confidence: Math.min(0.5 + (o.count * 0.05), 0.95),
      mentionCount: o.count
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);

  console.log(`👥 People discovered: ${people.length}`);
  console.log(`🏢 Organizations discovered: ${organizations.length}\n`);

  // Process through strategic contact service
  console.log('🔄 PROCESSING THROUGH STRATEGIC CONTACT SERVICE');
  console.log('='.repeat(60));

  const results = await processStrategicContacts(projectId, projectName, people, organizations);

  // Display results
  console.log('\n📊 PROCESSING RESULTS');
  console.log('='.repeat(60));
  console.log(`\n👥 PEOPLE:`);
  console.log(`   Created: ${results.people.created}`);
  console.log(`   Updated: ${results.people.updated}`);
  console.log(`\n📈 TIER DISTRIBUTION:`);
  console.log(`   Tier 1 (Critical): ${results.people.tierAssignments.critical}`);
  console.log(`   Tier 2 (High): ${results.people.tierAssignments.high}`);
  console.log(`   Tier 3 (Medium): ${results.people.tierAssignments.medium}`);
  console.log(`   Tier 4 (Low): ${results.people.tierAssignments.low}`);

  if (results.people.notionPromotionCandidates.length > 0) {
    console.log(`\n🎯 NOTION PROMOTION CANDIDATES (${results.people.notionPromotionCandidates.length}):`);
    results.people.notionPromotionCandidates.forEach(candidate => {
      console.log(`   ✓ ${candidate.email} (Score: ${candidate.compositeScore}, Tier: ${candidate.tier})`);
    });
  }

  console.log(`\n🏢 ORGANIZATIONS:`);
  console.log(`   Created: ${results.organizations.created}`);
  console.log(`   Updated: ${results.organizations.updated}`);

  // Save results
  const resultsPath = `/tmp/gmail_strategic_${projectName.replace(/\s+/g, '_')}.json`;
  fs.writeFileSync(resultsPath, JSON.stringify({
    project: projectName,
    projectId: projectId,
    emailsScanned: messages.length,
    discovered: { people, organizations },
    processing: results
  }, null, 2));

  console.log(`\n✅ Results saved to: ${resultsPath}`);

  return results;
}

/**
 * Process contacts through strategic contact service
 */
async function processStrategicContacts(projectId, projectName, people, organizations) {
  const results = {
    people: {
      created: 0,
      updated: 0,
      tierAssignments: { critical: 0, high: 0, medium: 0, low: 0 },
      notionPromotionCandidates: []
    },
    organizations: {
      created: 0,
      updated: 0
    }
  };

  // Process people
  for (const person of people) {
    try {
      const result = await upsertPerson(person, projectId, projectName);

      if (result.created) results.people.created++;
      if (result.updated) results.people.updated++;

      results.people.tierAssignments[result.tier]++;

      if (result.shouldPromoteToNotion) {
        results.people.notionPromotionCandidates.push({
          personId: result.personId,
          email: person.email,
          tier: result.tier,
          compositeScore: result.compositeScore
        });
      }

      console.log(`   ${result.created ? '✅ Created' : '✓ Updated'}: ${person.email} → Tier ${result.tier.toUpperCase()}`);
    } catch (error) {
      console.error(`   ❌ Error processing ${person.email}:`, error.message);
    }
  }

  // Process organizations
  for (const org of organizations) {
    try {
      const result = await upsertOrganization(org, projectId, projectName);

      if (result.created) results.organizations.created++;
      if (result.updated) results.organizations.updated++;

      console.log(`   ${result.created ? '✅ Created' : '✓ Updated'}: ${org.name}`);
    } catch (error) {
      console.error(`   ❌ Error processing ${org.name}:`, error.message);
    }
  }

  return results;
}

/**
 * Upsert person to Supabase
 */
async function upsertPerson(person, projectId, projectName) {
  // Find existing
  const { data: existing } = await supabase
    .from('person_identity_map')
    .select('*')
    .eq('email', person.email)
    .maybeSingle();

  const personData = {
    email: person.email,
    full_name: person.name || person.email.split('@')[0],
    data_source: 'gmail',
    updated_at: new Date().toISOString()
  };

  let personRecord;
  if (!existing) {
    const { data, error } = await supabase
      .from('person_identity_map')
      .insert([{ ...personData, created_at: new Date().toISOString() }])
      .select()
      .single();
    if (error) throw error;
    personRecord = data;
  } else {
    const { data, error } = await supabase
      .from('person_identity_map')
      .update(personData)
      .eq('person_id', existing.person_id)
      .select()
      .single();
    if (error) throw error;
    personRecord = data;
  }

  // Create interaction
  await supabase.from('contact_interactions').insert([{
    person_id: personRecord.person_id,
    interaction_type: 'email',
    description: `Discovered via Gmail for: ${projectName}`,
    metadata: { project_id: projectId, mention_count: person.mentionCount }
  }]);

  // Link to project
  await supabase.from('linkedin_project_connections').upsert([{
    contact_id: personRecord.person_id,
    notion_project_id: projectId,
    project_name: projectName,
    connection_type: 'email_contact',
    relevance_score: person.confidence
  }], { onConflict: 'contact_id,notion_project_id' });

  // Update intelligence scores
  const scores = await updateScores(personRecord.person_id, person.mentionCount, person.confidence);

  // Assign tier
  const { data: tier } = await supabase.rpc('assign_engagement_tier', { person_uuid: personRecord.person_id });

  // Check promotion
  const { data: shouldPromote } = await supabase.rpc('should_promote_to_notion', { person_uuid: personRecord.person_id });

  return {
    personId: personRecord.person_id,
    created: !existing,
    updated: true,
    tier: tier || 'low',
    compositeScore: scores.composite_score,
    shouldPromoteToNotion: shouldPromote
  };
}

/**
 * Update intelligence scores
 */
async function updateScores(personId, mentionCount, confidence) {
  const influenceScore = Math.min(100, Math.round(50 + (mentionCount * 3)));
  const accessibilityScore = Math.min(100, Math.round(confidence * 100));
  const alignmentScore = Math.min(100, Math.round(50 + (mentionCount * 2)));
  const timingScore = 80;
  const strategicValueScore = Math.min(100, Math.round(confidence * 80 + mentionCount * 2));
  const compositeScore = Math.round(
    influenceScore * 0.30 +
    alignmentScore * 0.25 +
    accessibilityScore * 0.20 +
    timingScore * 0.15 +
    strategicValueScore * 0.10
  );

  const { data, error } = await supabase
    .from('contact_intelligence_scores')
    .upsert([{
      person_id: personId,
      influence_score: influenceScore,
      accessibility_score: accessibilityScore,
      alignment_score: alignmentScore,
      timing_score: timingScore,
      strategic_value_score: strategicValueScore,
      composite_score: compositeScore,
      engagement_readiness: Math.min(100, Math.round(compositeScore * 0.9)),
      response_likelihood: Math.min(100, Math.round(confidence * 85)),
      confidence_level: confidence
    }], { onConflict: 'person_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upsert organization
 */
async function upsertOrganization(org, projectId, projectName) {
  const { data: existing } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .eq('current_company', org.name)
    .maybeSingle();

  const orgData = {
    first_name: org.name,
    last_name: '(Organization)',
    current_company: org.name,
    email_address: `contact@${org.domain}`,
    data_source: 'gmail',
    relationship_score: org.confidence,
    strategic_value: org.confidence > 0.8 ? 'high' : org.confidence > 0.6 ? 'medium' : 'low'
  };

  let orgRecord;
  if (!existing) {
    const { data, error } = await supabase
      .from('linkedin_contacts')
      .insert([orgData])
      .select()
      .single();
    if (error) throw error;
    orgRecord = data;
  } else {
    const { data, error } = await supabase
      .from('linkedin_contacts')
      .update(orgData)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    orgRecord = data;
  }

  // Link to project
  await supabase.from('linkedin_project_connections').upsert([{
    contact_id: orgRecord.id,
    notion_project_id: projectId,
    project_name: projectName,
    connection_type: 'organization',
    relevance_score: org.confidence
  }], { onConflict: 'contact_id,notion_project_id' });

  return {
    orgId: orgRecord.id,
    created: !existing,
    updated: true
  };
}

// Parse command line arguments
const projectName = process.argv[2];
const projectId = process.argv[3];
const lookbackDays = parseInt(process.argv[4]) || 365;

if (!projectName || !projectId) {
  console.error('Usage: node gmail-discover-strategic.mjs "<PROJECT_NAME>" "<PROJECT_ID>" [lookbackDays]');
  console.error('Example: node gmail-discover-strategic.mjs "BG Fit" "18febcf9-81cf-80fe-a738-fe374e01cd08" 365');
  process.exit(1);
}

// Run the discovery
mineGmailForProject(projectName, projectId, lookbackDays)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
