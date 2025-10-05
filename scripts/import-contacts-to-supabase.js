/**
 * Contact Intelligence CSV Importer
 *
 * Imports existing CSV contact data into the new Supabase contact intelligence system
 * Integrates with existing AI services for enrichment
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import ContactIntelligenceService from '../apps/backend/src/services/contactIntelligenceService.js';
import { logger } from '../apps/backend/src/utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ContactImporter {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.contactService = new ContactIntelligenceService();

    this.stats = {
      total_processed: 0,
      successfully_imported: 0,
      duplicates_skipped: 0,
      errors: 0,
      enriched: 0,
      high_priority: 0
    };

    this.errorLog = [];
  }

  /**
   * Import all CSV files from the project
   */
  async importAllCSVFiles() {
    console.log('🚀 Starting Contact Intelligence CSV Import');

    const csvFiles = [
      'youth-justice-master-contacts.csv',
      'scripts/youth-justice-master-contacts.csv',
      'exports/strategic_analysis/strategic_contacts_master_scored.csv'
    ];

    // Try to find the CSV files
    let foundFiles = [];
    for (const filePath of csvFiles) {
      const fullPath = path.resolve(filePath);
      try {
        await fs.access(fullPath);
        foundFiles.push(fullPath);
        console.log(`✅ Found CSV file: ${fullPath}`);
      } catch {
        console.log(`⚠️ CSV file not found: ${fullPath}`);
      }
    }

    if (foundFiles.length === 0) {
      console.log('❌ No CSV files found. Please ensure you have contact CSV files available.');
      return;
    }

    // Run migration to ensure database schema is ready
    await this.ensureSchemaReady();

    // Process each CSV file
    for (const csvFile of foundFiles) {
      console.log(`\n📊 Processing: ${csvFile}`);
      await this.importCSVFile(csvFile);
    }

    // Print final statistics
    this.printFinalStats();
  }

  /**
   * Ensure database schema is ready
   */
  async ensureSchemaReady() {
    console.log('🔧 Checking database schema...');

    try {
      // Check if contact intelligence tables exist
      const { data, error } = await this.supabase
        .from('person_identity_map')
        .select('person_id')
        .limit(1);

      if (error) {
        console.log('❌ Database schema not ready. Please run the migration first:');
        console.log('   cd supabase && npx supabase db reset --local');
        process.exit(1);
      }

      console.log('✅ Database schema is ready');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  /**
   * Import a single CSV file
   */
  async importCSVFile(csvFilePath) {
    return new Promise((resolve, reject) => {
      const contacts = [];

      createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
          // Clean and validate data
          const cleanedData = this.cleanCSVData(data);
          if (cleanedData.email || cleanedData.name) {
            contacts.push(cleanedData);
          }
        })
        .on('end', async () => {
          console.log(`📋 Parsed ${contacts.length} contacts from CSV`);
          await this.processContacts(contacts, csvFilePath);
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ CSV parsing error:', error);
          reject(error);
        });
    });
  }

  /**
   * Clean and normalize CSV data
   */
  cleanCSVData(data) {
    // Handle different CSV column formats
    const cleaned = {
      name: this.getFieldValue(data, ['name', 'full_name', 'Name', 'Full Name']),
      email: this.getFieldValue(data, ['email', 'Email', 'email_address']),
      title: this.getFieldValue(data, ['title', 'role', 'Title', 'Role', 'Title/Role']),
      organization: this.getFieldValue(data, ['organization', 'Organisation', 'company', 'Company']),
      phone: this.getFieldValue(data, ['phone', 'mobile', 'Mobile', 'Phone']),
      website: this.getFieldValue(data, ['website', 'Website', 'url']),
      linkedin: this.getFieldValue(data, ['linkedin', 'LinkedIn', 'linkedin_url', 'LinkedIn URL']),
      location: this.getFieldValue(data, ['location', 'Location', 'address']),
      sector: this.getFieldValue(data, ['sector', 'Sector', 'industry']),
      tags: this.getFieldValue(data, ['tags', 'Tags', 'categories']),
      notes: this.getFieldValue(data, ['notes', 'Notes', 'description']),
      source_file: path.basename(data.source_file || 'csv_import'),

      // Youth justice specific fields
      youth_justice_relevance_score: parseInt(this.getFieldValue(data, ['youth_justice_relevance_score', 'relevance_score'])) || 0,
      engagement_priority: this.getFieldValue(data, ['engagement_priority', 'priority', 'Priority']) || 'low',
      indigenous_affiliation: this.parseBoolean(this.getFieldValue(data, ['indigenous_affiliation', 'Indigenous'])),

      // Scoring fields from strategic analysis
      composite_score: parseInt(this.getFieldValue(data, ['composite_score', 'composite_priority'])) || 0,
      influence_score: parseInt(this.getFieldValue(data, ['influence_score'])) || 0,
      accessibility_score: parseInt(this.getFieldValue(data, ['accessibility_score'])) || 0,

      // Raw data for reference
      raw_data: data
    };

    return cleaned;
  }

  /**
   * Get field value from various possible column names
   */
  getFieldValue(data, possibleFields) {
    for (const field of possibleFields) {
      if (data[field] && data[field].trim()) {
        return data[field].trim();
      }
    }
    return null;
  }

  /**
   * Parse boolean values from CSV
   */
  parseBoolean(value) {
    if (!value) return false;
    const lowerValue = value.toString().toLowerCase();
    return ['true', 'yes', '1', 'y', 't'].includes(lowerValue);
  }

  /**
   * Process contacts in batches
   */
  async processContacts(contacts, sourceFile) {
    const batchSize = 25; // Process in smaller batches to avoid overwhelming the system

    console.log(`⚙️ Processing ${contacts.length} contacts in batches of ${batchSize}`);

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(contacts.length / batchSize);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} contacts)`);

      await this.processBatch(batch, sourceFile);

      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 500));

      // Progress update
      const progress = Math.round(((i + batch.length) / contacts.length) * 100);
      console.log(`   Progress: ${progress}% (${this.stats.successfully_imported} imported, ${this.stats.duplicates_skipped} duplicates, ${this.stats.errors} errors)`);
    }
  }

  /**
   * Process a batch of contacts
   */
  async processBatch(batch, sourceFile) {
    for (const contactData of batch) {
      try {
        this.stats.total_processed++;

        // Check for existing contact
        const existing = await this.findExistingContact(contactData);
        if (existing) {
          this.stats.duplicates_skipped++;
          continue;
        }

        // Create contact
        const contact = await this.createContact(contactData, sourceFile);
        if (contact) {
          this.stats.successfully_imported++;

          // Enrich contact with basic intelligence
          const enriched = await this.contactService.enrichContactBasic(contact.person_id);
          if (enriched) {
            this.stats.enriched++;

            if (enriched.engagement_priority === 'high' || enriched.engagement_priority === 'critical') {
              this.stats.high_priority++;
            }
          }
        }

      } catch (error) {
        this.stats.errors++;
        this.errorLog.push({
          contact: contactData.name || contactData.email,
          error: error.message,
          data: contactData
        });

        console.error(`   ❌ Error processing ${contactData.name || contactData.email}: ${error.message}`);
      }
    }
  }

  /**
   * Find existing contact to avoid duplicates
   */
  async findExistingContact(contactData) {
    if (!contactData.email && !contactData.name) return null;

    let query = this.supabase
      .from('person_identity_map')
      .select('person_id, full_name, email');

    if (contactData.email) {
      query = query.eq('email', contactData.email);
    } else if (contactData.name) {
      query = query.eq('full_name', contactData.name);
    }

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
  }

  /**
   * Create new contact record
   */
  async createContact(contactData, sourceFile) {
    const contactRecord = {
      full_name: contactData.name,
      email: contactData.email,
      contact_data: {
        title: contactData.title,
        organization: contactData.organization,
        phone: contactData.phone,
        website: contactData.website,
        linkedin_url: contactData.linkedin,
        location: contactData.location,
        source_file: sourceFile,
        import_date: new Date().toISOString(),
        raw_csv_data: contactData.raw_data
      },
      youth_justice_relevance_score: contactData.youth_justice_relevance_score,
      engagement_priority: this.normalizeEngagementPriority(contactData.engagement_priority),
      sector: this.normalizeSector(contactData.sector, contactData.title, contactData.organization),
      organization_type: this.determineOrganizationType(contactData.organization, contactData.title),
      location_region: this.extractRegion(contactData.location, contactData.email),
      indigenous_affiliation: contactData.indigenous_affiliation,
      tags: this.parseTags(contactData.tags),
      notes: contactData.notes
    };

    const { data, error } = await this.supabase
      .from('person_identity_map')
      .insert(contactRecord)
      .select()
      .single();

    if (error) throw error;

    // If we have scoring data, create intelligence scores
    if (contactData.composite_score || contactData.influence_score) {
      await this.createIntelligenceScores(data.person_id, contactData);
    }

    return data;
  }

  /**
   * Create intelligence scores if available from CSV
   */
  async createIntelligenceScores(personId, contactData) {
    const scores = {
      person_id: personId,
      influence_score: contactData.influence_score || 50,
      accessibility_score: contactData.accessibility_score || 50,
      alignment_score: contactData.youth_justice_relevance_score || 30,
      timing_score: 50, // Default
      strategic_value_score: Math.max(contactData.composite_score || 30, 30),
      composite_score: contactData.composite_score || 50,
      engagement_readiness: contactData.engagement_priority === 'high' ? 80 : 50,
      response_likelihood: 50, // Default
      last_calculated: new Date().toISOString(),
      calculation_method: 'csv_import',
      confidence_level: 0.7
    };

    const { error } = await this.supabase
      .from('contact_intelligence_scores')
      .insert(scores);

    if (error) {
      console.warn(`⚠️ Failed to create intelligence scores for ${personId}:`, error.message);
    }
  }

  /**
   * Normalize engagement priority
   */
  normalizeEngagementPriority(priority) {
    if (!priority) return 'low';
    const p = priority.toLowerCase();
    if (p.includes('critical') || p.includes('urgent')) return 'critical';
    if (p.includes('high')) return 'high';
    if (p.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Normalize sector classification
   */
  normalizeSector(sector, title = '', organization = '') {
    if (sector) return sector.toLowerCase();

    const text = `${title} ${organization}`.toLowerCase();

    if (text.includes('government') || text.includes('minister') || text.includes('.gov.')) return 'government';
    if (text.includes('media') || text.includes('journalist') || text.includes('abc') || text.includes('sbs')) return 'media';
    if (text.includes('university') || text.includes('academic') || text.includes('.edu.')) return 'academic';
    if (text.includes('foundation') || text.includes('charity') || text.includes('non-profit')) return 'foundation';
    if (text.includes('aboriginal') || text.includes('indigenous') || text.includes('torres strait')) return 'indigenous';
    if (text.includes('legal') || text.includes('lawyer') || text.includes('judge')) return 'legal';
    if (text.includes('ceo') || text.includes('director') || text.includes('company')) return 'corporate';

    return 'other';
  }

  /**
   * Determine organization type
   */
  determineOrganizationType(organization = '', title = '') {
    const text = `${organization} ${title}`.toLowerCase();

    if (text.includes('department')) return 'government_department';
    if (text.includes('university')) return 'university';
    if (text.includes('foundation')) return 'foundation';
    if (text.includes('media') || text.includes('abc') || text.includes('sbs')) return 'media_organization';
    if (text.includes('court')) return 'judiciary';

    return 'other';
  }

  /**
   * Extract region from location or email
   */
  extractRegion(location = '', email = '') {
    const text = `${location} ${email}`.toLowerCase();

    const regions = {
      'NSW': ['nsw', 'new south wales', 'sydney'],
      'VIC': ['vic', 'victoria', 'melbourne'],
      'QLD': ['qld', 'queensland', 'brisbane'],
      'WA': ['wa', 'western australia', 'perth'],
      'SA': ['sa', 'south australia', 'adelaide'],
      'TAS': ['tas', 'tasmania', 'hobart'],
      'NT': ['nt', 'northern territory', 'darwin'],
      'ACT': ['act', 'canberra'],
      'NZ': ['nz', 'new zealand']
    };

    for (const [region, keywords] of Object.entries(regions)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return region;
      }
    }

    return 'unknown';
  }

  /**
   * Parse tags from CSV
   */
  parseTags(tagsString) {
    if (!tagsString) return [];

    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10); // Limit to 10 tags
  }

  /**
   * Print final import statistics
   */
  printFinalStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONTACT IMPORT COMPLETED');
    console.log('='.repeat(60));
    console.log(`Total Processed: ${this.stats.total_processed}`);
    console.log(`✅ Successfully Imported: ${this.stats.successfully_imported}`);
    console.log(`🔄 Duplicates Skipped: ${this.stats.duplicates_skipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`🤖 AI Enriched: ${this.stats.enriched}`);
    console.log(`⭐ High Priority Contacts: ${this.stats.high_priority}`);

    const successRate = ((this.stats.successfully_imported / this.stats.total_processed) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);

    if (this.errorLog.length > 0) {
      console.log('\n❌ Error Summary:');
      this.errorLog.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.contact}: ${error.error}`);
      });

      if (this.errorLog.length > 10) {
        console.log(`   ... and ${this.errorLog.length - 10} more errors`);
      }
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Review imported contacts in the Contact Intelligence dashboard');
    console.log('2. Run additional AI enrichment on high-priority contacts');
    console.log('3. Create campaigns and assign contacts for engagement');
    console.log('4. Set up automation rules for ongoing contact management');
    console.log('='.repeat(60));
  }
}

// Main execution
async function main() {
  try {
    const importer = new ContactImporter();
    await importer.importAllCSVFiles();
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ContactImporter;