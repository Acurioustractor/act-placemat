#!/usr/bin/env node
/**
 * Automatic Enrichment Queue
 * Monitors linkedin_contacts for new/unenriched contacts and queues them for Exa enrichment
 *
 * Integration Points:
 * - Gmail discovery → linkedin_contacts → Auto-enrichment queue
 * - Person identity mapping triggered after enrichment
 * - Strategic analysis and tier assignment follow enrichment
 *
 * Usage:
 *   node auto-enrich-queue.js             # Process pending contacts
 *   node auto-enrich-queue.js --watch     # Watch mode (continuous monitoring)
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

// Configuration
const CONFIG = {
  batchSize: 10, // Process 10 contacts at a time
  rateLimit: 1500, // 1.5 seconds between requests
  watchInterval: 60000, // Check every 60 seconds in watch mode
  minConfidenceForPersonMapping: 0.5, // Auto-create person_identity_map if confidence >= 0.5
  autoTriggerAnalysis: true, // Trigger strategic analysis after enrichment
};

class AutoEnrichmentQueue {
  constructor() {
    this.stats = {
      processed: 0,
      enriched: 0,
      failed: 0,
      personMapped: 0,
      startTime: Date.now()
    };
  }

  /**
   * Main queue processor
   */
  async processQueue() {
    console.log('\n🔄 AUTO-ENRICHMENT QUEUE');
    console.log('═'.repeat(60));
    console.log(`Batch Size: ${CONFIG.batchSize}`);
    console.log(`Rate Limit: ${CONFIG.rateLimit}ms`);
    console.log(`Started: ${new Date().toLocaleString()}\n`);

    // Get unenriched contacts with email and company info
    const { data: pendingContacts, error } = await supabase
      .from('linkedin_contacts')
      .select('id, full_name, email_address, current_company, current_position, location, industries')
      .not('email_address', 'is', null)
      .not('current_company', 'is', null)
      .or('exa_enriched.is.null,exa_enriched.eq.false')
      .limit(CONFIG.batchSize);

    if (error) {
      console.error('❌ Error fetching pending contacts:', error.message);
      return;
    }

    if (!pendingContacts || pendingContacts.length === 0) {
      console.log('✅ No pending contacts to enrich');
      return;
    }

    console.log(`📋 Found ${pendingContacts.length} contacts pending enrichment\n`);

    // Process each contact
    for (const contact of pendingContacts) {
      await this.enrichContact(contact);
      this.stats.processed++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.rateLimit));
    }

    // Summary
    const elapsed = Math.round((Date.now() - this.stats.startTime) / 1000);
    console.log(`\n${'═'.repeat(60)}`);
    console.log('📊 BATCH SUMMARY:');
    console.log(`  Processed: ${this.stats.processed}`);
    console.log(`  Enriched: ${this.stats.enriched}`);
    console.log(`  Failed: ${this.stats.failed}`);
    console.log(`  Person Mapped: ${this.stats.personMapped}`);
    console.log(`  Elapsed Time: ${elapsed}s`);
    console.log(`  Success Rate: ${Math.round((this.stats.enriched / this.stats.processed) * 100)}%`);
  }

  /**
   * Enrich a single contact with Exa
   */
  async enrichContact(contact) {
    try {
      console.log(`\n🔍 Enriching: ${contact.full_name} (${contact.current_company})`);

      // Build search query
      const bioQuery = `${contact.full_name} ${contact.current_company} ${contact.current_position || ''} biography background`;

      // Search Exa for bio
      const bioResults = await exa.searchAndContents(bioQuery, {
        type: 'neural',
        useAutoprompt: true,
        numResults: 3,
        text: { maxCharacters: 1000 }
      });

      // Extract bio (avoid login pages)
      const validBioResults = bioResults.results?.filter(r =>
        r.text &&
        r.text.length > 50 &&
        !r.text.toLowerCase().includes('sign in') &&
        !r.text.toLowerCase().includes('log in')
      ) || [];

      const bio = validBioResults[0]?.text?.substring(0, 500) || null;

      // Search for LinkedIn URL
      const linkedinQuery = `site:linkedin.com/in/ "${contact.full_name}" ${contact.current_company}`;

      const linkedinResults = await exa.searchAndContents(linkedinQuery, {
        type: 'keyword',
        numResults: 5,
        text: false
      });

      // Filter valid LinkedIn URLs
      const validLinkedInUrls = linkedinResults.results
        ?.filter(r =>
          r.url.includes('linkedin.com/in/') &&
          !r.url.includes('login') &&
          !r.url.includes('signup') &&
          !r.url.includes('authwall')
        )
        .map(r => r.url) || [];

      const linkedinUrl = validLinkedInUrls[0] || null;

      // Calculate confidence
      let confidence = 0.3; // Base
      if (linkedinUrl) confidence += 0.3;
      if (bio && bio.length > 200) confidence += 0.2;
      if (validLinkedInUrls.length > 1) confidence += 0.1;
      if (bioResults.results && bioResults.results.length >= 3) confidence += 0.1;

      const enrichmentData = {
        linkedin_url: linkedinUrl,
        bio: bio,
        exa_enriched: true,
        exa_last_enriched: new Date().toISOString(),
        exa_confidence_score: Math.min(confidence, 1.0)
      };

      // Update contact
      const { error: updateError } = await supabase
        .from('linkedin_contacts')
        .update(enrichmentData)
        .eq('id', contact.id);

      if (updateError) throw updateError;

      console.log(`  ✅ Enriched | Confidence: ${(confidence * 100).toFixed(0)}%`);
      if (linkedinUrl) console.log(`  🔗 LinkedIn: ${linkedinUrl}`);
      if (bio) console.log(`  📝 Bio: ${bio.substring(0, 80)}...`);

      this.stats.enriched++;

      // INTEGRATION POINT: Auto-trigger person identity mapping
      if (confidence >= CONFIG.minConfidenceForPersonMapping) {
        await this.createPersonIdentityMapping(contact, enrichmentData);
      }

      // INTEGRATION POINT: Auto-trigger strategic analysis (optional)
      if (CONFIG.autoTriggerAnalysis && bio) {
        await this.triggerStrategicAnalysis(contact, bio);
      }

    } catch (error) {
      console.error(`  ❌ Error enriching ${contact.full_name}:`, error.message);

      // Mark as attempted to avoid retry loops
      await supabase
        .from('linkedin_contacts')
        .update({
          exa_enriched: true,
          exa_last_enriched: new Date().toISOString(),
          exa_confidence_score: 0.1
        })
        .eq('id', contact.id);

      this.stats.failed++;
    }
  }

  /**
   * INTEGRATION POINT 1: Create person identity mapping
   * Links enriched LinkedIn contact to canonical person_identity_map
   */
  async createPersonIdentityMapping(contact, enrichmentData) {
    try {
      // Check if person already exists
      const { data: existingPerson } = await supabase
        .from('person_identity_map')
        .select('person_id')
        .eq('email', contact.email_address)
        .maybeSingle();

      if (existingPerson) {
        // Update existing person with enrichment data
        await supabase
          .from('person_identity_map')
          .update({
            full_name: contact.full_name,
            contact_data: {
              linkedin_url: enrichmentData.linkedin_url,
              bio: enrichmentData.bio,
              current_company: contact.current_company,
              current_position: contact.current_position,
              location: contact.location,
              industries: contact.industries
            },
            data_source: 'exa_enrichment',
            updated_at: new Date().toISOString()
          })
          .eq('person_id', existingPerson.person_id);

        // Link linkedin_contacts to person_identity_map
        await supabase
          .from('linkedin_contacts')
          .update({ person_id: existingPerson.person_id })
          .eq('id', contact.id);

        console.log(`  🔗 Updated person_identity_map: ${existingPerson.person_id}`);
      } else {
        // Create new person identity
        const { data: newPerson, error: createError } = await supabase
          .from('person_identity_map')
          .insert([{
            full_name: contact.full_name,
            email: contact.email_address,
            contact_data: {
              linkedin_url: enrichmentData.linkedin_url,
              bio: enrichmentData.bio,
              current_company: contact.current_company,
              current_position: contact.current_position,
              location: contact.location,
              industries: contact.industries
            },
            data_source: 'exa_enrichment',
            discovered_via: 'auto_enrichment_queue',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) throw createError;

        // Link linkedin_contacts to person_identity_map
        await supabase
          .from('linkedin_contacts')
          .update({ person_id: newPerson.person_id })
          .eq('id', contact.id);

        console.log(`  ✨ Created person_identity_map: ${newPerson.person_id}`);
      }

      this.stats.personMapped++;
    } catch (error) {
      console.error(`  ⚠️  Person mapping failed: ${error.message}`);
    }
  }

  /**
   * INTEGRATION POINT 2: Trigger strategic analysis
   * Analyzes bio for ACT strategic keywords
   */
  async triggerStrategicAnalysis(contact, bio) {
    try {
      const strategicKeywords = [
        'sustainability', 'indigenous', 'aboriginal', 'circular economy',
        'regenerative', 'social enterprise', 'impact', 'community',
        'youth', 'justice', 'education', 'environment', 'climate'
      ];

      const text = `${contact.full_name} ${contact.current_company} ${contact.current_position || ''} ${bio}`.toLowerCase();
      const matches = strategicKeywords.filter(keyword => text.includes(keyword));

      if (matches.length > 0) {
        const strategic_value = matches.length >= 3 ? 'high' :
                               matches.length === 2 ? 'medium' : 'low';

        // Update strategic value
        await supabase
          .from('linkedin_contacts')
          .update({
            strategic_value,
            tags: [...(contact.tags || []), ...matches]
          })
          .eq('id', contact.id);

        console.log(`  🎯 Strategic: ${strategic_value.toUpperCase()} (${matches.length} keywords: ${matches.join(', ')})`);
      }
    } catch (error) {
      console.error(`  ⚠️  Strategic analysis failed: ${error.message}`);
    }
  }

  /**
   * Watch mode: continuous monitoring
   */
  async watchMode() {
    console.log('👀 WATCH MODE ENABLED');
    console.log(`Checking every ${CONFIG.watchInterval / 1000}s for new contacts\n`);

    while (true) {
      await this.processQueue();

      console.log(`\n⏳ Waiting ${CONFIG.watchInterval / 1000}s until next check...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.watchInterval));

      // Reset stats for next batch
      this.stats = {
        processed: 0,
        enriched: 0,
        failed: 0,
        personMapped: 0,
        startTime: Date.now()
      };
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');

  const queue = new AutoEnrichmentQueue();

  if (watchMode) {
    await queue.watchMode();
  } else {
    await queue.processQueue();
  }
}

main().catch(console.error);
