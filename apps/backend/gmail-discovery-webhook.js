#!/usr/bin/env node
/**
 * Gmail Discovery → Enrichment Webhook
 * Automatically enriches contacts discovered via Gmail mining
 *
 * Integration Flow:
 * 1. Gmail discovery finds contacts in project emails
 * 2. Contacts inserted into linkedin_contacts
 * 3. This webhook triggers automatic Exa enrichment
 * 4. Person identity mapping created
 * 5. Strategic analysis and tier assignment
 *
 * Usage:
 *   As module: import { processGmailDiscoveryBatch } from './gmail-discovery-webhook.js'
 *   As CLI: node gmail-discovery-webhook.js <projectName> <projectId>
 */

import { createClient } from '@supabase/supabase-js';
import Exa from 'exa-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const exa = new Exa(process.env.EXA_API_KEY);

/**
 * Process a batch of Gmail-discovered contacts
 * Called after gmail-discover-strategic.mjs completes
 */
export async function processGmailDiscoveryBatch(projectName, projectId, discoveredContacts) {
  console.log('\n🎯 GMAIL DISCOVERY → ENRICHMENT PIPELINE');
  console.log('═'.repeat(60));
  console.log(`Project: ${projectName}`);
  console.log(`Discovered: ${discoveredContacts.length} contacts\n`);

  const results = {
    inserted: 0,
    enriched: 0,
    personMapped: 0,
    strategic: 0,
    errors: []
  };

  for (const contact of discoveredContacts) {
    try {
      console.log(`\n📧 Processing: ${contact.name} (${contact.email})`);

      // Step 1: Insert/update in linkedin_contacts
      const { data: existingContact } = await supabase
        .from('linkedin_contacts')
        .select('id')
        .eq('email_address', contact.email)
        .maybeSingle();

      let contactId;

      if (existingContact) {
        console.log(`  ↻ Contact exists, will enrich`);
        contactId = existingContact.id;
      } else {
        // Insert new contact
        const { data: newContact, error: insertError } = await supabase
          .from('linkedin_contacts')
          .insert([{
            full_name: contact.name,
            email_address: contact.email,
            current_company: contact.domain,
            data_source: 'gmail_discovery',
            relationship_score: contact.confidence,
            interaction_count: contact.mentionCount
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        contactId = newContact.id;
        results.inserted++;
        console.log(`  ✅ Inserted into linkedin_contacts`);
      }

      // Step 2: Enrich with Exa (only if not already enriched)
      const { data: contactToEnrich } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (!contactToEnrich.exa_enriched) {
        const enrichmentData = await enrichWithExa(contactToEnrich);

        // Update with enrichment
        await supabase
          .from('linkedin_contacts')
          .update(enrichmentData)
          .eq('id', contactId);

        console.log(`  ✅ Enriched with Exa (confidence: ${(enrichmentData.exa_confidence_score * 100).toFixed(0)}%)`);
        results.enriched++;

        // Step 3: Create person identity mapping
        if (enrichmentData.exa_confidence_score >= 0.5) {
          await createPersonIdentity(contactToEnrich, enrichmentData);
          results.personMapped++;
          console.log(`  ✅ Person identity mapped`);
        }

        // Step 4: Strategic analysis
        if (enrichmentData.bio) {
          const isStrategic = await analyzeStrategic(contactToEnrich, enrichmentData.bio);
          if (isStrategic) {
            results.strategic++;
            console.log(`  🎯 Strategic contact identified`);
          }
        }

        // Step 5: Link to project
        await linkToProject(contactId, projectId, projectName, contact.confidence);
        console.log(`  🔗 Linked to project: ${projectName}`);
      } else {
        console.log(`  ↻ Already enriched, skipping`);
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${contact.email}:`, error.message);
      results.errors.push({ contact: contact.email, error: error.message });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 BATCH SUMMARY:');
  console.log(`  Inserted: ${results.inserted}`);
  console.log(`  Enriched: ${results.enriched}`);
  console.log(`  Person Mapped: ${results.personMapped}`);
  console.log(`  Strategic: ${results.strategic}`);
  console.log(`  Errors: ${results.errors.length}`);

  return results;
}

/**
 * Enrich contact with Exa
 */
async function enrichWithExa(contact) {
  // Bio search
  const bioQuery = `${contact.full_name} ${contact.current_company || contact.email.split('@')[1]} biography background`;

  const bioResults = await exa.searchAndContents(bioQuery, {
    type: 'neural',
    useAutoprompt: true,
    numResults: 3,
    text: { maxCharacters: 1000 }
  });

  const validBioResults = bioResults.results?.filter(r =>
    r.text &&
    r.text.length > 50 &&
    !r.text.toLowerCase().includes('sign in')
  ) || [];

  const bio = validBioResults[0]?.text?.substring(0, 500) || null;

  // LinkedIn search
  const linkedinQuery = `site:linkedin.com/in/ "${contact.full_name}"`;

  const linkedinResults = await exa.searchAndContents(linkedinQuery, {
    type: 'keyword',
    numResults: 5,
    text: false
  });

  const validLinkedInUrls = linkedinResults.results
    ?.filter(r =>
      r.url.includes('linkedin.com/in/') &&
      !r.url.includes('login')
    )
    .map(r => r.url) || [];

  const linkedinUrl = validLinkedInUrls[0] || null;

  // Calculate confidence
  let confidence = 0.3;
  if (linkedinUrl) confidence += 0.3;
  if (bio && bio.length > 200) confidence += 0.2;
  if (validLinkedInUrls.length > 1) confidence += 0.1;
  if (bioResults.results && bioResults.results.length >= 3) confidence += 0.1;

  return {
    linkedin_url: linkedinUrl,
    bio: bio,
    exa_enriched: true,
    exa_last_enriched: new Date().toISOString(),
    exa_confidence_score: Math.min(confidence, 1.0)
  };
}

/**
 * Create person identity mapping
 */
async function createPersonIdentity(contact, enrichmentData) {
  const { data: existingPerson } = await supabase
    .from('person_identity_map')
    .select('person_id')
    .eq('email', contact.email_address)
    .maybeSingle();

  if (existingPerson) {
    // Update existing
    await supabase
      .from('person_identity_map')
      .update({
        full_name: contact.full_name,
        contact_data: {
          linkedin_url: enrichmentData.linkedin_url,
          bio: enrichmentData.bio,
          current_company: contact.current_company
        },
        updated_at: new Date().toISOString()
      })
      .eq('person_id', existingPerson.person_id);

    // Link
    await supabase
      .from('linkedin_contacts')
      .update({ person_id: existingPerson.person_id })
      .eq('id', contact.id);

    return existingPerson.person_id;
  } else {
    // Create new
    const { data: newPerson } = await supabase
      .from('person_identity_map')
      .insert([{
        full_name: contact.full_name,
        email: contact.email_address,
        contact_data: {
          linkedin_url: enrichmentData.linkedin_url,
          bio: enrichmentData.bio,
          current_company: contact.current_company
        },
        data_source: 'gmail_discovery',
        discovered_via: 'gmail_enrichment_pipeline',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    // Link
    await supabase
      .from('linkedin_contacts')
      .update({ person_id: newPerson.person_id })
      .eq('id', contact.id);

    return newPerson.person_id;
  }
}

/**
 * Strategic analysis
 */
async function analyzeStrategic(contact, bio) {
  const strategicKeywords = [
    'sustainability', 'indigenous', 'aboriginal', 'circular economy',
    'regenerative', 'social enterprise', 'impact', 'community',
    'youth', 'justice', 'education', 'environment', 'climate'
  ];

  const text = `${contact.full_name} ${contact.current_company || ''} ${bio}`.toLowerCase();
  const matches = strategicKeywords.filter(keyword => text.includes(keyword));

  if (matches.length > 0) {
    const strategic_value = matches.length >= 3 ? 'high' :
                           matches.length === 2 ? 'medium' : 'low';

    await supabase
      .from('linkedin_contacts')
      .update({
        strategic_value,
        tags: [...(contact.tags || []), ...matches]
      })
      .eq('id', contact.id);

    return true;
  }

  return false;
}

/**
 * Link contact to project
 */
async function linkToProject(contactId, projectId, projectName, confidence) {
  await supabase
    .from('linkedin_project_connections')
    .upsert([{
      contact_id: contactId,
      notion_project_id: projectId,
      project_name: projectName,
      connection_type: 'gmail_discovery',
      relevance_score: confidence,
      contact_status: 'active',
      recommended_action: confidence > 0.8 ? 'high_priority_followup' : 'standard_engagement'
    }], {
      onConflict: 'contact_id,notion_project_id'
    });
}

// CLI usage
async function main() {
  const [projectName, projectId] = process.argv.slice(2);

  if (!projectName || !projectId) {
    console.error('Usage: node gmail-discovery-webhook.js <projectName> <projectId>');
    process.exit(1);
  }

  // Mock contacts for testing (replace with actual Gmail discovery results)
  const mockContacts = [
    {
      email: 'test@example.com',
      name: 'Test Contact',
      domain: 'example.com',
      confidence: 0.75,
      mentionCount: 5
    }
  ];

  await processGmailDiscoveryBatch(projectName, projectId, mockContacts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
