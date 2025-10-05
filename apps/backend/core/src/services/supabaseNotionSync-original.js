/**
 * Supabase ↔ Notion Bidirectional Sync Service
 *
 * Purpose: Bridge the gap between existing Supabase intelligence system
 * and Notion Communications Dashboard for daily workflow integration.
 *
 * Core Principle: Support relationships through automation, not reduction.
 * ACT becomes obsolete as communities thrive through systematic support.
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

      // Verify Notion connection
      const notionTest = await this.notion.databases.query({
        database_id: this.databases.people,
        page_size: 1
      });

      if (!notionTest) {
        throw new Error('Notion connection failed');
      }

      this.initialized = true;
      console.log('✅ Supabase ↔ Notion Sync Service initialized');
      console.log(`   - Supabase: ${process.env.SUPABASE_URL}`);
      console.log(`   - Notion People: ${this.databases.people}`);
      console.log(`   - Notion Communications: ${this.databases.communications}`);

      return true;
    } catch (error) {
      console.error('❌ Sync service initialization failed:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Main sync operation: Supabase contact_cadence_metrics → Notion Communications Dashboard
   *
   * This is where the magic happens:
   * - Match Supabase contacts to Notion People by email
   * - Update Communications Dashboard with relationship intelligence
   * - Enable habitual check-ins through automated tracking
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

      // Step 1: Get all contact cadence metrics from Supabase
      const cadenceMetrics = await this.getContactCadenceMetrics({
        limit,
        onlyRecentlyActive
      });

      console.log(`   Found ${cadenceMetrics.length} contacts with cadence data`);

      // Step 2: Get all Notion People to match by email
      const notionPeople = await this.getAllNotionPeople();
      console.log(`   Found ${notionPeople.length} Notion People`);

      // Step 3: Match contacts between systems
      const matches = await this.matchContactsByEmail(cadenceMetrics, notionPeople);
      console.log(`   Matched ${matches.length} contacts`);

      // Step 4: Update or create Communications Dashboard records
      let updated = 0;
      let created = 0;
      const errors = [];

      for (const match of matches) {
        try {
          const { supabaseContact, notionPerson } = match;

          // Calculate next contact due date based on cadence
          const nextContactDue = this.calculateNextContactDue(supabaseContact);

          // Check if communication record exists
          const existingRecord = await this.findCommunicationRecord(notionPerson.id);

          const updateData = {
            'Last Contact Date': {
              date: {
                start: supabaseContact.last_interaction || new Date().toISOString()
              }
            },
            'Next Contact Due': nextContactDue ? {
              date: {
                start: nextContactDue
              }
            } : null,
            'Contact Person': {
              relation: [{ id: notionPerson.id }]
            },
            'Touchpoints (7d)': {
              number: supabaseContact.touchpoints_last_7 || 0
            },
            'Touchpoints (30d)': {
              number: supabaseContact.touchpoints_last_30 || 0
            },
            'Total Touchpoints': {
              number: supabaseContact.total_touchpoints || 0
            },
            'Active Sources': {
              multi_select: (supabaseContact.active_sources || []).map(source => ({
                name: source
              }))
            }
          };

          if (dryRun) {
            console.log(`   [DRY RUN] Would update: ${notionPerson.name}`);
            console.log(`     - Last Contact: ${supabaseContact.last_interaction}`);
            console.log(`     - Next Due: ${nextContactDue}`);
            console.log(`     - Touchpoints: ${supabaseContact.touchpoints_last_30 || 0} (30d)`);
          } else {
            if (existingRecord) {
              // Update existing record
              await this.notion.pages.update({
                page_id: existingRecord.id,
                properties: updateData
              });
              updated++;
            } else {
              // Create new record
              await this.notion.pages.create({
                parent: { database_id: this.databases.communications },
                properties: updateData
              });
              created++;
            }
            console.log(`   ✓ Synced: ${notionPerson.name}`);
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
   * Get contact cadence metrics from Supabase
   */
  async getContactCadenceMetrics(options = {}) {
    const { limit = null, onlyRecentlyActive = false } = options;

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

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch cadence metrics: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all Notion People with email addresses
   */
  async getAllNotionPeople() {
    const people = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await this.notion.databases.query({
        database_id: this.databases.people,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const page of response.results) {
        const props = page.properties;

        // Extract email (check both 'Email' and 'email' properties)
        const emailProp = props['Email'] || props['email'];
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

      hasMore = response.has_more;
      startCursor = response.next_cursor;
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
      // Try to find email in contact metadata
      const email = this.extractEmailFromContact(contact);

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
   * Extract email from Supabase contact data
   * (Implementation depends on your contact_cadence_metrics structure)
   */
  extractEmailFromContact(contact) {
    // Check various possible email fields
    const email = contact.email ||
                  contact.contact_email ||
                  contact.primary_email ||
                  null;

    return email ? email.toLowerCase().trim() : null;
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
    const response = await this.notion.databases.query({
      database_id: this.databases.communications,
      filter: {
        property: 'Contact Person',
        relation: {
          contains: personId
        }
      }
    });

    return response.results.length > 0 ? response.results[0] : null;
  }

  /**
   * Get sync status and stats
   */
  getStatus() {
    return {
      initialized: this.initialized,
      syncStats: this.syncStats,
      capabilities: [
        'Contact Cadence Sync',
        'Relationship Intelligence',
        'Automated Check-in Scheduling',
        'Touchpoint Tracking'
      ]
    };
  }

  /**
   * Sync Actions to Outreach Tasks (Phase 2)
   *
   * Query Notion Actions database for:
   * - Type = "Conversation"
   * - Status = "Not started"
   *
   * Create outreach_tasks in Supabase with AI-drafted messages
   */
  async syncActionsToOutreachTasks(options = {}) {
    const { dryRun = false } = options;

    console.log('\n🔄 Syncing Notion Actions → Supabase Outreach Tasks...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE SYNC'}`);

    try {
      // Query Notion Actions for conversations
      const response = await this.notion.databases.query({
        database_id: process.env.NOTION_ACTIONS_DATABASE_ID,
        filter: {
          and: [
            {
              property: 'Type',
              select: {
                equals: 'Conversation'
              }
            },
            {
              property: 'Status',
              select: {
                equals: 'Not started'
              }
            }
          ]
        }
      });

      console.log(`   Found ${response.results.length} conversation actions`);

      // TODO: Create outreach tasks in Supabase
      // TODO: Use AI to draft messages based on context
      // TODO: Link to contact_cadence_metrics

      return {
        actionsProcessed: response.results.length,
        tasksCreated: 0 // TODO: implement
      };

    } catch (error) {
      console.error('❌ Actions sync failed:', error);
      throw error;
    }
  }
}

export default SupabaseNotionSync;
