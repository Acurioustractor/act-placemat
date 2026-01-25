/**
 * Contact Intelligence Importer Module
 *
 * Handles batch import, duplicate detection, and contact creation
 * from various data sources.
 *
 * @module contacts/importer
 */

import { logger } from '../utils/logger.js';

/**
 * Import service for contact intelligence
 */
export class ContactImporter {
  constructor(supabase, normalizer, enricher, metrics) {
    this.supabase = supabase;
    this.normalizer = normalizer;
    this.enricher = enricher;
    this.metrics = metrics;
  }

  /**
   * Import and enrich contacts from CSV data
   * @param {Array} csvData - Array of contact data objects
   * @param {Object} options - Import options (batchSize, enableAIEnrichment)
   * @returns {Promise<Object>} Import results with counts
   */
  async importAndEnrichContacts(csvData, options = {}) {
    const startTime = Date.now();
    const batchSize = options.batchSize || 50;
    const enableAIEnrichment = options.enableAIEnrichment !== false;

    try {
      logger.info(`🚀 Starting import of ${csvData.length} contacts`);

      const results = {
        imported: 0,
        enriched: 0,
        errors: [],
        duplicates: 0,
        highPriority: 0
      };

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch, enableAIEnrichment);

        results.imported += batchResults.imported;
        results.enriched += batchResults.enriched;
        results.errors.push(...batchResults.errors);
        results.duplicates += batchResults.duplicates;
        results.highPriority += batchResults.highPriority;

        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const processingTime = Date.now() - startTime;
      logger.info(`✅ Import completed in ${processingTime}ms: ${results.imported} imported, ${results.enriched} enriched`);

      return results;

    } catch (error) {
      logger.error('❌ Contact import failed:', error);
      throw error;
    }
  }

  /**
   * Process a batch of contacts
   * @param {Array} batch - Array of contact data objects
   * @param {boolean} enableAIEnrichment - Whether to enable AI enrichment
   * @returns {Promise<Object>} Batch processing results
   */
  async processBatch(batch, enableAIEnrichment) {
    const results = { imported: 0, enriched: 0, errors: [], duplicates: 0, highPriority: 0 };

    for (const contactData of batch) {
      try {
        // Check for existing contact
        const existingContact = await this.findExistingContact(contactData);

        if (existingContact) {
          results.duplicates++;
          continue;
        }

        // Create contact record
        const contact = await this.createContact(contactData);
        results.imported++;

        // Enrich with AI if enabled
        if (enableAIEnrichment) {
          const enriched = await this.enricher.enrichContactBasic(contact.person_id);
          if (enriched) {
            results.enriched++;

            // Check if high priority
            if (enriched.engagement_priority === 'high' || enriched.engagement_priority === 'critical') {
              results.highPriority++;
            }
          }
        }

      } catch (error) {
        results.errors.push({
          contact: contactData,
          error: error.message
        });
        logger.warn(`⚠️ Failed to process contact ${contactData.email || contactData.name}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Find existing contact by email or name
   * @param {Object} contactData - Contact data to search for
   * @returns {Promise<Object|null>} Existing contact or null
   */
  async findExistingContact(contactData) {
    const { data, error } = await this.supabase
      .from('person_identity_map')
      .select('person_id, full_name, email')
      .or(`email.eq.${contactData.email},full_name.eq.${contactData.name}`)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
  }

  /**
   * Create a new contact record
   * @param {Object} contactData - Contact data to create
   * @returns {Promise<Object>} Created contact record
   */
  async createContact(contactData) {
    // Extract and normalize contact data
    const normalizedData = this.normalizer.normalizeContactData(contactData);

    const { data, error } = await this.supabase
      .from('person_identity_map')
      .insert([{
        full_name: normalizedData.name,
        email: normalizedData.email,
        contact_data: {
          original_source: normalizedData.source || 'csv_import',
          title: normalizedData.title,
          organization: normalizedData.organization,
          phone: normalizedData.phone,
          website: normalizedData.website,
          linkedin_url: normalizedData.linkedin,
          location: normalizedData.location,
          raw_data: contactData
        },
        sector: normalizedData.sector,
        organization_type: normalizedData.organizationType,
        location_region: normalizedData.region,
        indigenous_affiliation: normalizedData.indigenousAffiliation,
        tags: normalizedData.tags,
        notes: normalizedData.notes
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.debug(`✅ Created contact: ${data.full_name} (${data.email})`);
    return data;
  }
}

export default ContactImporter;
