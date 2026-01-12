#!/usr/bin/env node
/**
 * Notion Auto-Promotion for High-Value Contacts
 *
 * Automatically promotes enriched contacts to Notion People database based on:
 * - Strategic value (high/medium)
 * - Exa confidence score (≥0.7)
 * - ACT keyword alignment
 * - Person identity mapping status
 *
 * Usage:
 *   node notion-auto-promote.js              # Promote all eligible contacts
 *   node notion-auto-promote.js --strategic  # Only strategic contacts
 *   node notion-auto-promote.js --dry-run    # Preview without creating
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Configuration
const CONFIG = {
  minConfidence: 0.7,           // Minimum Exa confidence for promotion
  strategicOnly: false,         // Only promote strategic contacts
  dryRun: false,                // Preview mode
  notionPeopleDb: process.env.NOTION_PEOPLE_DATABASE_ID,
  batchSize: 10                 // Process 10 at a time
};

class NotionPromoter {
  constructor() {
    this.stats = {
      eligible: 0,
      promoted: 0,
      skipped: 0,
      errors: [],
      startTime: Date.now()
    };
  }

  /**
   * Main promotion workflow
   */
  async promoteContacts() {
    console.log('\n🎯 NOTION AUTO-PROMOTION');
    console.log('═'.repeat(70));
    console.log(`Mode: ${CONFIG.dryRun ? 'DRY RUN (preview only)' : 'LIVE'}`);
    console.log(`Min Confidence: ${CONFIG.minConfidence}`);
    console.log(`Strategic Only: ${CONFIG.strategicOnly}`);
    console.log(`Started: ${new Date().toLocaleString()}\n`);

    // Get eligible contacts for promotion
    const eligibleContacts = await this.getEligibleContacts();

    if (!eligibleContacts || eligibleContacts.length === 0) {
      console.log('✅ No eligible contacts to promote');
      return;
    }

    console.log(`📋 Found ${eligibleContacts.length} eligible contacts\n`);
    this.stats.eligible = eligibleContacts.length;

    // Process each contact
    for (const contact of eligibleContacts) {
      await this.promoteContact(contact);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    this.printSummary();
  }

  /**
   * Get contacts eligible for Notion promotion
   */
  async getEligibleContacts() {
    let query = supabase
      .from('linkedin_contacts')
      .select(`
        id,
        full_name,
        email_address,
        current_company,
        current_position,
        location,
        linkedin_url,
        bio,
        exa_confidence_score,
        strategic_value,
        alignment_tags,
        person_id,
        notion_person_id
      `)
      .eq('exa_enriched', true)
      .gte('exa_confidence_score', CONFIG.minConfidence)
      .not('email_address', 'is', null)
      .is('notion_person_id', null); // Not already in Notion

    // Filter by strategic value if requested
    if (CONFIG.strategicOnly) {
      query = query.in('strategic_value', ['high', 'medium']);
    }

    const { data, error } = await query.limit(CONFIG.batchSize);

    if (error) {
      console.error('❌ Error fetching contacts:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Promote a single contact to Notion
   */
  async promoteContact(contact) {
    try {
      console.log(`\n🔍 Processing: ${contact.full_name} (${contact.current_company})`);
      console.log(`   Email: ${contact.email_address}`);
      console.log(`   Confidence: ${(contact.exa_confidence_score * 100).toFixed(0)}%`);

      if (contact.strategic_value && contact.strategic_value !== 'unknown') {
        console.log(`   Strategic: ${contact.strategic_value.toUpperCase()}`);
      }

      if (CONFIG.dryRun) {
        console.log(`   ✅ Would promote to Notion (dry run)`);
        this.stats.promoted++;
        return;
      }

      // Check if already exists in Notion by email
      const existingPerson = await this.findNotionPersonByEmail(contact.email_address);

      if (existingPerson) {
        console.log(`   ↻ Already exists in Notion: ${existingPerson.id}`);

        // Update local record with Notion ID
        await supabase
          .from('linkedin_contacts')
          .update({ notion_person_id: existingPerson.id })
          .eq('id', contact.id);

        this.stats.skipped++;
        return;
      }

      // Create new Notion person
      const notionPerson = await this.createNotionPerson(contact);

      // Update local record with Notion ID
      await supabase
        .from('linkedin_contacts')
        .update({ notion_person_id: notionPerson.id })
        .eq('id', contact.id);

      console.log(`   ✅ Promoted to Notion: ${notionPerson.id}`);
      this.stats.promoted++;

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.stats.errors.push({ contact: contact.email_address, error: error.message });
    }
  }

  /**
   * Find existing Notion person by email
   */
  async findNotionPersonByEmail(email) {
    try {
      const response = await notion.databases.query({
        database_id: CONFIG.notionPeopleDb,
        filter: {
          property: 'Email',
          email: {
            equals: email
          }
        }
      });

      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      // Email might not exist, that's ok
      return null;
    }
  }

  /**
   * Create new Notion person record
   */
  async createNotionPerson(contact) {
    // Parse first and last name
    const nameParts = contact.full_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Map strategic value to tags
    const tags = this.mapStrategicToTags(contact);

    // Build properties
    const properties = {
      'Name': {
        title: [{ text: { content: contact.full_name } }]
      },
      'Email': {
        email: contact.email_address
      },
      'Source': {
        rich_text: [{ text: { content: 'Exa Enrichment Auto-Promotion' } }]
      }
    };

    // Add LinkedIn if available
    if (contact.linkedin_url) {
      properties['LinkedIn'] = {
        url: contact.linkedin_url
      };
    }

    // Add Business Name (company)
    if (contact.current_company) {
      properties['Business Name'] = {
        rich_text: [{ text: { content: contact.current_company } }]
      };
    }

    // Add Role if available
    if (contact.current_position) {
      // Try to match to existing role or use generic
      properties['Role'] = {
        select: { name: this.mapPositionToRole(contact.current_position) }
      };
    }

    // Add tags
    if (tags.length > 0) {
      properties['Tag'] = {
        multi_select: tags.map(tag => ({ name: tag }))
      };
    }

    // Add status
    properties['Status'] = {
      select: { name: 'Lead' }
    };

    // Add notes with bio
    if (contact.bio) {
      const bioPreview = contact.bio.substring(0, 500);
      properties['Notes'] = {
        rich_text: [{
          text: {
            content: `Exa-enriched contact (confidence: ${(contact.exa_confidence_score * 100).toFixed(0)}%)\n\nBio: ${bioPreview}`
          }
        }]
      };
    }

    // Create page
    const page = await notion.pages.create({
      parent: { database_id: CONFIG.notionPeopleDb },
      properties: properties
    });

    return page;
  }

  /**
   * Map strategic value to Notion tags
   */
  mapStrategicToTags(contact) {
    const tags = [];

    // Add strategic tags based on alignment
    if (contact.alignment_tags && Array.isArray(contact.alignment_tags)) {
      const tagMapping = {
        'indigenous': 'Indigenous',
        'aboriginal': 'Indigenous',
        'justice': 'Justice',
        'community': 'Community',
        'youth': 'Youth Justice',
        'education': 'Research'
      };

      contact.alignment_tags.forEach(alignmentTag => {
        const notionTag = tagMapping[alignmentTag.toLowerCase()];
        if (notionTag && !tags.includes(notionTag)) {
          tags.push(notionTag);
        }
      });
    }

    // Add strategic value indicator
    if (contact.strategic_value === 'high' || contact.strategic_value === 'medium') {
      tags.push('Partner');
    }

    return tags;
  }

  /**
   * Map position to Notion role (simplified)
   */
  mapPositionToRole(position) {
    const lowerPos = position.toLowerCase();

    if (lowerPos.includes('ceo') || lowerPos.includes('chief executive')) {
      return 'CEO';
    }
    if (lowerPos.includes('founder')) {
      return 'Founder';
    }
    if (lowerPos.includes('director') && !lowerPos.includes('executive')) {
      return 'Director';
    }
    if (lowerPos.includes('manager')) {
      return 'Manager';
    }
    if (lowerPos.includes('coordinator')) {
      return 'Coordinator';
    }
    if (lowerPos.includes('consultant')) {
      return 'Consultant';
    }

    // Default to a generic role
    return 'Partner';
  }

  /**
   * Print summary
   */
  printSummary() {
    const elapsed = Math.round((Date.now() - this.stats.startTime) / 1000);

    console.log(`\n${'═'.repeat(70)}`);
    console.log('📊 PROMOTION SUMMARY:');
    console.log(`  Eligible: ${this.stats.eligible}`);
    console.log(`  Promoted: ${this.stats.promoted}`);
    console.log(`  Skipped: ${this.stats.skipped}`);
    console.log(`  Errors: ${this.stats.errors.length}`);
    console.log(`  Elapsed Time: ${elapsed}s`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      this.stats.errors.forEach(err => {
        console.log(`  - ${err.contact}: ${err.error}`);
      });
    }

    if (CONFIG.dryRun) {
      console.log(`\n⚠️  DRY RUN MODE - No contacts were actually promoted`);
      console.log(`   Run without --dry-run to promote contacts to Notion`);
    }
  }
}

// Parse CLI args
const args = process.argv.slice(2);
if (args.includes('--strategic')) CONFIG.strategicOnly = true;
if (args.includes('--dry-run')) CONFIG.dryRun = true;

// Run
async function main() {
  const promoter = new NotionPromoter();
  await promoter.promoteContacts();
}

main().catch(console.error);
