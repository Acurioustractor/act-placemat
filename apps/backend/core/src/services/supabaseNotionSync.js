/**
 * Supabase ↔ Notion Bidirectional Sync Service (FIXED VERSION)
 *
 * Purpose: Bridge the gap between existing Supabase intelligence system
 * and Notion Communications Dashboard for daily workflow integration.
 *
 * FIXES APPLIED:
 * 1. Join contact_cadence_metrics with linkedin_contacts to get emails
 * 2. Handle empty gmail sync tables gracefully
 * 3. Fixed Notion Client initialization
 * 4. Added comprehensive error handling
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import 'dotenv/config';

export class SupabaseNotionSync {
  constructor() {
    // Supabase client (where intelligence lives)
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Notion client (where daily workflow happens)
    this.notion = new Client({
      auth: process.env.NOTION_TOKEN
    });

    // Database IDs
    this.databases = {
      people: process.env.NOTION_PEOPLE_DATABASE_ID,
      communications: process.env.NOTION_COMMUNICATIONS_DATABASE_ID
    };

    this.initialized = false;
    this.syncStats = {
      lastSync: null,
      contactsMatched: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      errors: []
    };
  }

  /**
   * Initialize sync service
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Supabase ↔ Notion Sync Service...');

      // Verify Supabase connection
      const { data: supabaseTest, error: supabaseError } = await this.supabase
        .from('contact_cadence_metrics')
        .select('contact_id')
        .limit(1);

      if (supabaseError) {
        throw new Error(`Supabase connection failed: ${supabaseError.message}`);
      }

      // Verify LinkedIn contacts table
      const { data: linkedinTest, error: linkedinError } = await this.supabase
        .from('linkedin_contacts')
        .select('id')
        .limit(1);

      if (linkedinError) {
        console.warn('⚠️  LinkedIn contacts table not accessible:', linkedinError.message);
      } else {
        console.log('✅ LinkedIn contacts table accessible');
      }

      // Verify Notion connection (fixed - removed .query)
      if (!this.databases.people) {
        throw new Error('NOTION_PEOPLE_DATABASE_ID not set in environment');
      }

      const notionTest = await this.notion.databases.retrieve({
        database_id: this.databases.people
      });

      if (!notionTest) {
        throw new Error('Notion connection failed');
      }

      this.initialized = true;
      console.log('✅ Supabase ↔ Notion Sync Service initialized');
      console.log(`   - Supabase: ${process.env.SUPABASE_URL}`);
      console.log(`   - Notion People: ${this.databases.people}`);
      console.log(`   - Notion Communications: ${this.databases.communications || 'NOT SET'}`);

      return true;
    } catch (error) {
      console.error('❌ Sync service initialization failed:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Get contact cadence metrics from Supabase
   * FIXED: Now joins with linkedin_contacts to get email addresses
   */
  async getContactCadenceMetrics(options = {}) {
    const { limit = null, onlyRecentlyActive = false } = options;

    // First get cadence metrics
    let query = this.supabase
      .from('contact_cadence_metrics')
      .select('*');

    if (onlyRecentlyActive) {
      // Only sync contacts with activity in last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      query = query.gte('last_interaction', ninetyDaysAgo.toISOString());
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: cadenceData, error: cadenceError } = await query;

    if (cadenceError) {
      throw new Error(`Failed to fetch cadence metrics: ${cadenceError.message}`);
    }

    if (!cadenceData || cadenceData.length === 0) {
      return [];
    }

    // Get contact IDs to join with linkedin_contacts
    const contactIds = cadenceData.map(c => parseInt(c.contact_id));

    // Fetch linkedin contact details
    const { data: linkedinData, error: linkedinError } = await this.supabase
      .from('linkedin_contacts')
      .select('id, email_address, full_name, first_name, last_name, current_position, current_company')
      .in('id', contactIds);

    if (linkedinError) {
      console.warn('⚠️  Could not fetch LinkedIn contact details:', linkedinError.message);
      return []; // Cannot proceed without contact details
    }

    // Create lookup map
    const linkedinMap = new Map();
    (linkedinData || []).forEach(contact => {
      linkedinMap.set(contact.id, contact);
    });

    // Enrich cadence data with contact details
    const enrichedData = cadenceData
      .map(cadence => {
        const linkedinContact = linkedinMap.get(parseInt(cadence.contact_id));

        if (!linkedinContact) return null; // Skip if no LinkedIn match

        return {
          ...cadence,
          email: linkedinContact.email_address || null,
          full_name: linkedinContact.full_name || null,
          first_name: linkedinContact.first_name || null,
          last_name: linkedinContact.last_name || null,
          current_position: linkedinContact.current_position || null,
          current_company: linkedinContact.current_company || null
        };
      })
      .filter(c => c !== null && c.email); // Only keep contacts with emails

    return enrichedData;
  }

  /**
   * Main sync operation: Supabase contact_cadence_metrics → Notion Communications Dashboard
   */
  async syncContactCadenceToNotion(options = {}) {
    const {
      dryRun = false,
      limit = null,
      onlyRecentlyActive = false
    } = options;

    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('\n🔄 Starting Contact Cadence Sync...');
      console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE SYNC'}`);

      // Step 1: Get all contact cadence metrics from Supabase (now with emails!)
      const cadenceMetrics = await this.getContactCadenceMetrics({
        limit,
        onlyRecentlyActive
      });

      console.log(`   Found ${cadenceMetrics.length} contacts with cadence data and emails`);

      if (cadenceMetrics.length === 0) {
        console.log('   ⚠️  No contacts with email addresses found');
        return {
          contactsMatched: 0,
          recordsUpdated: 0,
          recordsCreated: 0,
          errors: []
        };
      }

      // Step 2: Get all Notion People to match by email
      const notionPeople = await this.getAllNotionPeople();
      console.log(`   Found ${notionPeople.length} Notion People`);

      // Step 3: Match contacts between systems
      const matches = await this.matchContactsByEmail(cadenceMetrics, notionPeople);
      console.log(`   Matched ${matches.length} contacts`);

      if (matches.length === 0) {
        console.log('   ⚠️  No email matches between Supabase and Notion');
        console.log('   💡 Add email addresses to Notion People or LinkedIn contacts');
      }

      // Step 4: Update or create Communications Dashboard records
      let updated = 0;
      let created = 0;
      const errors = [];

      // Check if Communications Dashboard is configured
      if (!this.databases.communications) {
        console.log('   ⚠️  NOTION_COMMUNICATIONS_DATABASE_ID not set - skipping dashboard updates');
        console.log('   💡 Set this environment variable to enable sync');

        return {
          contactsMatched: matches.length,
          recordsUpdated: 0,
          recordsCreated: 0,
          errors: [{
            contact: 'Configuration',
            error: 'NOTION_COMMUNICATIONS_DATABASE_ID not set'
          }]
        };
      }

      for (const match of matches) {
        try {
          const { supabaseContact, notionPerson } = match;

          // Calculate next contact due date based on cadence
          const nextContactDue = this.calculateNextContactDue(supabaseContact);

          if (dryRun) {
            console.log(`   [DRY RUN] Would sync: ${notionPerson.name} (${notionPerson.email})`);
            console.log(`     - Last Contact: ${supabaseContact.last_interaction || 'Never'}`);
            console.log(`     - Next Due: ${nextContactDue || 'Calculate'}`);
            console.log(`     - Touchpoints: ${supabaseContact.total_touchpoints || 0}`);
            updated++; // Count as if we updated
            continue;
          }

          // Check if communication record exists
          const existingRecord = await this.findCommunicationRecord(notionPerson.id);

          const updateData = this.buildUpdateData(supabaseContact, notionPerson, nextContactDue);

          if (existingRecord) {
            // Update existing record
            await this.notion.pages.update({
              page_id: existingRecord.id,
              properties: updateData
            });
            updated++;
            console.log(`   ✓ Updated: ${notionPerson.name}`);
          } else {
            // Create new record
            await this.notion.pages.create({
              parent: { database_id: this.databases.communications },
              properties: updateData
            });
            created++;
            console.log(`   ✓ Created: ${notionPerson.name}`);
          }

        } catch (error) {
          console.error(`   ✗ Failed to sync contact:`, error.message);
          errors.push({
            contact: match.notionPerson.name,
            error: error.message
          });
        }
      }

      // Update stats
      this.syncStats = {
        lastSync: new Date().toISOString(),
        contactsMatched: matches.length,
        recordsUpdated: updated,
        recordsCreated: created,
        errors
      };

      console.log('\n📊 Sync Complete!');
      console.log(`   - Contacts matched: ${matches.length}`);
      console.log(`   - Records updated: ${updated}`);
      console.log(`   - Records created: ${created}`);
      console.log(`   - Errors: ${errors.length}`);

      return this.syncStats;

    } catch (error) {
      console.error('❌ Contact cadence sync failed:', error);
      throw error;
    }
  }

  /**
   * Build update data for Notion properties
   * Only includes properties that exist in Communications Dashboard
   */
  buildUpdateData(supabaseContact, notionPerson, nextContactDue) {
    const updateData = {
      'Contact Person': {
        relation: [{ id: notionPerson.id }]
      }
    };

    // Core properties that exist in Communications Dashboard
    if (supabaseContact.last_interaction) {
      updateData['Last Contact Date'] = {
        date: { start: supabaseContact.last_interaction.split('T')[0] }
      };
    }

    if (nextContactDue) {
      updateData['Next Contact Due'] = {
        date: { start: nextContactDue }
      };
    }

    // Optional: Add these properties if they're manually created in Notion later
    // Commented out for now since they don't exist yet
    /*
    if (supabaseContact.touchpoints_last_7 !== null) {
      updateData['Touchpoints (7d)'] = {
        number: supabaseContact.touchpoints_last_7 || 0
      };
    }

    if (supabaseContact.touchpoints_last_30 !== null) {
      updateData['Touchpoints (30d)'] = {
        number: supabaseContact.touchpoints_last_30 || 0
      };
    }

    if (supabaseContact.total_touchpoints !== null) {
      updateData['Total Touchpoints'] = {
        number: supabaseContact.total_touchpoints || 0
      };
    }

    if (supabaseContact.active_sources && supabaseContact.active_sources.length > 0) {
      updateData['Active Sources'] = {
        multi_select: supabaseContact.active_sources.map(source => ({ name: source }))
      };
    }
    */

    return updateData;
  }

  /**
   * Get all Notion People with email addresses
   */
  async getAllNotionPeople() {
    const people = [];
    let hasMore = true;
    let startCursor = undefined;

    // WORKAROUND: Use fetch API directly because this.notion.databases.query is mysteriously missing
    while (hasMore) {
      const queryResponse = await fetch(`https://api.notion.com/v1/databases/${this.databases.people}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_cursor: startCursor,
          page_size: 100
        })
      });

      const queryData = await queryResponse.json();

      if (queryData.object === 'error') {
        throw new Error(`Notion API error: ${queryData.message}`);
      }

      for (const page of queryData.results || []) {
        const props = page.properties;

        // Extract email (check multiple possible property names)
        const emailProp = props['Email'] || props['email'] || props['E-mail'];
        const email = emailProp?.email || null;

        // Extract name
        const nameProp = props['Name'] || props['Person'] || props['name'];
        let name = 'Unknown';

        if (nameProp?.title) {
          name = nameProp.title.map(t => t.plain_text).join('');
        }

        if (email) {
          people.push({
            id: page.id,
            email: email.toLowerCase().trim(),
            name
          });
        }
      }

      hasMore = queryData.has_more || false;
      startCursor = queryData.next_cursor;
    }

    return people;
  }

  /**
   * Match Supabase contacts to Notion People by email
   */
  async matchContactsByEmail(supabaseContacts, notionPeople) {
    const matches = [];

    // Create email lookup map for Notion people
    const emailMap = new Map();
    notionPeople.forEach(person => {
      emailMap.set(person.email, person);
    });

    // Match Supabase contacts
    for (const contact of supabaseContacts) {
      const email = contact.email?.toLowerCase().trim();

      if (email && emailMap.has(email)) {
        matches.push({
          supabaseContact: contact,
          notionPerson: emailMap.get(email)
        });
      }
    }

    return matches;
  }

  /**
   * Calculate next contact due date based on cadence pattern
   */
  calculateNextContactDue(contact) {
    if (!contact.last_interaction) {
      return new Date().toISOString().split('T')[0]; // Today if no history
    }

    const lastInteraction = new Date(contact.last_interaction);
    const now = new Date();
    const daysSince = Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));

    // Calculate average cadence from touchpoint patterns
    let recommendedDays = 30; // Default to monthly check-in

    if (contact.touchpoints_last_7 > 2) {
      // Very active relationship - check in weekly
      recommendedDays = 7;
    } else if (contact.touchpoints_last_30 > 3) {
      // Active relationship - check in bi-weekly
      recommendedDays = 14;
    } else if (contact.total_touchpoints > 10) {
      // Established relationship - monthly
      recommendedDays = 30;
    } else {
      // Nurturing relationship - quarterly
      recommendedDays = 90;
    }

    // Calculate next due date
    const nextDue = new Date(lastInteraction);
    nextDue.setDate(nextDue.getDate() + recommendedDays);

    return nextDue.toISOString().split('T')[0];
  }

  /**
   * Find existing communication record for a person
   */
  async findCommunicationRecord(personId) {
    if (!this.databases.communications) {
      return null;
    }

    try {
      // Use fetch API directly (workaround for databases.query issue)
      const queryResponse = await fetch(`https://api.notion.com/v1/databases/${this.databases.communications}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: 'Contact Person',
            relation: {
              contains: personId
            }
          }
        })
      });

      const queryData = await queryResponse.json();
      return queryData.results?.length > 0 ? queryData.results[0] : null;
    } catch (error) {
      console.warn('Could not query communications database:', error.message);
      return null;
    }
  }

  /**
   * Get sync status and stats
   */
  getStatus() {
    return {
      initialized: this.initialized,
      syncStats: this.syncStats,
      capabilities: [
        'Contact Cadence Sync (LinkedIn → Notion)',
        'Email-based Matching',
        'Intelligent Cadence Calculation',
        'Automated Check-in Scheduling'
      ]
    };
  }
}

export default SupabaseNotionSync;
