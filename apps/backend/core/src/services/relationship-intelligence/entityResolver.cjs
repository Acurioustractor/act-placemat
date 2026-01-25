/**
 * Entity Resolver Service
 *
 * Resolves the same person across multiple systems (GHL, Calendar, Email, Notion)
 * into a single canonical entity. This enables unified engagement tracking.
 *
 * Matching Strategy:
 * 1. Email (exact match) - primary identifier
 * 2. Fuzzy name matching (for when email differs but name is similar)
 * 3. Company/organization association
 *
 * Usage:
 *   const { entityResolver } = require('./entityResolver');
 *
 *   // Resolve an identifier to an entity
 *   const { entity, created } = await entityResolver.resolveEntity('email@example.com', {
 *     sourceSystem: 'ghl',
 *     sourceId: 'contact-123',
 *   });
 *
 *   // Get entity timeline
 *   const { timeline, entity } = await entityResolver.getEntityTimeline(entityId);
 *
 *   // Get relationship strength
 *   const { score, factors } = await entityResolver.getRelationshipStrength(entityId);
 *
 * Migrated from: act-personal-ai/services/entity-resolver.mjs
 */

const { db } = require('./db.cjs');

// Source systems that can be mapped to entities
const SOURCE_SYSTEMS = ['ghl', 'calendar', 'email', 'notion', 'linkedin'];

/**
 * Calculate Levenshtein distance for fuzzy name matching
 */
function levenshteinDistance(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const matrix = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null)
  );

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[s2.length][s1.length];
}

/**
 * Calculate name similarity score (0-1)
 */
function nameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  const maxLen = Math.max(name1.length, name2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(name1, name2);
  return 1 - (distance / maxLen);
}

/**
 * Normalize email for matching
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Normalize name for matching
 */
function normalizeName(firstName, lastName) {
  const first = (firstName || '').toLowerCase().trim();
  const last = (lastName || '').toLowerCase().trim();
  return `${first} ${last}`.trim();
}

class EntityResolver {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Check if the entities tables exist
   */
  async checkTablesExist() {
    if (!db.isConfigured().ghl) return false;

    try {
      const { error } = await db.ghl
        .from('entities')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        console.log('Note: entities table does not exist. Entity resolution unavailable.');
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find entity by email (exact match)
   */
  async findEntityByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized || !db.isConfigured().ghl) return null;

    try {
      const { data, error } = await db.ghl
        .from('entities')
        .select('*')
        .eq('primary_email', normalized)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding entity by email:', error);
      }

      return data || null;
    } catch {
      return null;
    }
  }

  /**
   * Find entity by name (fuzzy match)
   */
  async findEntityByName(firstName, lastName, threshold = 0.8) {
    const searchName = normalizeName(firstName, lastName);
    if (!searchName || searchName.length < 2 || !db.isConfigured().ghl) return null;

    try {
      // Get all entities and check similarity
      const { data: entities, error } = await db.ghl
        .from('entities')
        .select('*');

      if (error) {
        console.error('Error fetching entities for name match:', error);
        return null;
      }

      // Find best match above threshold
      let bestMatch = null;
      let bestScore = 0;

      for (const entity of entities || []) {
        const entityName = normalizeName(entity.first_name, entity.last_name);
        const score = nameSimilarity(searchName, entityName);

        if (score > threshold && score > bestScore) {
          bestScore = score;
          bestMatch = entity;
        }
      }

      return bestMatch;
    } catch {
      return null;
    }
  }

  /**
   * Create a new canonical entity
   */
  async createEntity(data) {
    if (!db.isConfigured().ghl) {
      return { entity: null, error: new Error('Database not configured') };
    }

    try {
      const { data: entity, error } = await db.ghl
        .from('entities')
        .insert({
          primary_email: normalizeEmail(data.email),
          first_name: data.firstName || null,
          last_name: data.lastName || null,
          display_name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || null,
          company: data.company || null,
          metadata: data.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating entity:', error);
        return { entity: null, error };
      }

      return { entity, error: null };
    } catch (err) {
      return { entity: null, error: err };
    }
  }

  /**
   * Add a source mapping to an entity
   */
  async addEntityMapping(entityId, sourceSystem, sourceId, metadata = {}) {
    if (!SOURCE_SYSTEMS.includes(sourceSystem)) {
      return { error: new Error(`Invalid source system: ${sourceSystem}`) };
    }

    if (!db.isConfigured().ghl) {
      return { mapping: null, error: new Error('Database not configured') };
    }

    try {
      const { data, error } = await db.ghl
        .from('entity_mappings')
        .insert({
          entity_id: entityId,
          source_system: sourceSystem,
          source_id: sourceId,
          metadata,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Ignore duplicate mapping errors
        if (error.code === '23505') {
          return { mapping: null, error: null, duplicate: true };
        }
        console.error('Error adding entity mapping:', error);
        return { mapping: null, error };
      }

      return { mapping: data, error: null };
    } catch (err) {
      return { mapping: null, error: err };
    }
  }

  /**
   * Get all mappings for an entity
   */
  async getEntityMappings(entityId) {
    if (!db.isConfigured().ghl) return [];

    try {
      const { data, error } = await db.ghl
        .from('entity_mappings')
        .select('*')
        .eq('entity_id', entityId);

      if (error) {
        console.error('Error fetching entity mappings:', error);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Resolve an identifier to a canonical entity
   * Creates entity if it doesn't exist
   */
  async resolveEntity(identifier, options = {}) {
    const {
      sourceSystem = null,
      sourceId = null,
      firstName = null,
      lastName = null,
      company = null,
      createIfMissing = true,
    } = options;

    // Check if tables exist
    const tablesExist = await this.checkTablesExist();
    if (!tablesExist) {
      return { entity: null, error: new Error('Entity tables not configured'), created: false };
    }

    // Try to find by email first (most reliable)
    let entity = null;
    const email = normalizeEmail(identifier);

    if (email) {
      entity = await this.findEntityByEmail(email);
    }

    // If not found, try fuzzy name match (only if we have name info)
    if (!entity && firstName && lastName) {
      entity = await this.findEntityByName(firstName, lastName);
    }

    // Create new entity if not found
    let created = false;
    if (!entity && createIfMissing) {
      const result = await this.createEntity({
        email,
        firstName,
        lastName,
        company,
        metadata: { resolvedFrom: identifier, resolvedAt: new Date().toISOString() },
      });

      if (result.error) {
        return { entity: null, error: result.error, created: false };
      }

      entity = result.entity;
      created = true;
    }

    // Add source mapping if we have source info
    if (entity && sourceSystem && sourceId) {
      await this.addEntityMapping(entity.id, sourceSystem, sourceId);
    }

    return { entity, error: null, created };
  }

  /**
   * Get unified timeline of interactions for an entity
   */
  async getEntityTimeline(entityId) {
    if (!db.isConfigured().ghl) {
      return { timeline: [], entity: null, error: new Error('Database not configured') };
    }

    try {
      // Get entity and mappings
      const { data: entity, error: entityError } = await db.ghl
        .from('entities')
        .select('*')
        .eq('id', entityId)
        .single();

      if (entityError) {
        console.error('Error fetching entity:', entityError);
        return { timeline: [], entity: null, error: entityError };
      }

      const mappings = await this.getEntityMappings(entityId);
      const timeline = [];

      // Get GHL contact history if mapped
      const ghlMapping = mappings.find(m => m.source_system === 'ghl');
      if (ghlMapping) {
        try {
          // Get contact info
          const { data: contact } = await db.ghl
            .from('ghl_contacts')
            .select('*')
            .eq('ghl_id', ghlMapping.source_id)
            .single();

          if (contact) {
            timeline.push({
              type: 'ghl_contact',
              source: 'ghl',
              date: contact.created_at,
              description: 'Contact created in GHL',
              data: { contactId: contact.ghl_id },
            });

            if (contact.last_contact_date) {
              timeline.push({
                type: 'ghl_interaction',
                source: 'ghl',
                date: contact.last_contact_date,
                description: 'Last interaction recorded in GHL',
                data: { contactId: contact.ghl_id },
              });
            }
          }

          // Get opportunities
          const { data: opportunities } = await db.ghl
            .from('ghl_opportunities')
            .select('*')
            .eq('ghl_contact_id', ghlMapping.source_id);

          for (const opp of opportunities || []) {
            timeline.push({
              type: 'opportunity',
              source: 'ghl',
              date: opp.created_at,
              description: `Opportunity: ${opp.name}`,
              data: {
                opportunityId: opp.ghl_id,
                status: opp.status,
                value: opp.monetary_value,
              },
            });
          }

          // Get communications
          const { data: communications } = await db.ghl
            .from('contact_communications')
            .select('*')
            .eq('contact_ghl_id', ghlMapping.source_id)
            .order('created_at', { ascending: false })
            .limit(50);

          for (const comm of communications || []) {
            timeline.push({
              type: 'communication',
              source: 'ghl',
              date: comm.created_at,
              description: `${comm.type}: ${comm.subject || comm.body?.substring(0, 50) || 'No content'}`,
              data: {
                communicationId: comm.id,
                type: comm.type,
                direction: comm.direction,
              },
            });
          }
        } catch (err) {
          console.error('Error fetching GHL history:', err.message);
        }
      }

      // Get calendar events if email available
      if (entity.primary_email && db.isConfigured().main) {
        try {
          const { data: events } = await db.main
            .from('calendar_events')
            .select('*')
            .contains('attendees', [entity.primary_email])
            .order('start_time', { ascending: false })
            .limit(20);

          for (const event of events || []) {
            timeline.push({
              type: 'calendar_event',
              source: 'calendar',
              date: event.start_time,
              description: `Meeting: ${event.summary}`,
              data: {
                eventId: event.id,
                duration: event.end_time ?
                  Math.round((new Date(event.end_time) - new Date(event.start_time)) / 60000) : null,
              },
            });
          }
        } catch (err) {
          // calendar_events table might not exist
          if (err.code !== '42P01') {
            console.error('Error fetching calendar events:', err.message);
          }
        }
      }

      // Get recommendation outcomes for this entity
      if (db.isConfigured().main) {
        try {
          const { data: recommendations } = await db.main
            .from('recommendation_outcomes')
            .select('*')
            .eq('entity_id', entityId)
            .order('recommended_at', { ascending: false })
            .limit(20);

          for (const rec of recommendations || []) {
            timeline.push({
              type: 'recommendation',
              source: 'ai',
              date: rec.recommended_at,
              description: `AI Recommendation: ${rec.recommended_action}`,
              data: {
                recommendationId: rec.id,
                outcome: rec.outcome,
                actedUpon: rec.acted_upon,
              },
            });
          }
        } catch (err) {
          console.error('Error fetching recommendations:', err.message);
        }
      }

      // Sort timeline by date (most recent first)
      timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

      return { timeline, entity, mappings, error: null };
    } catch (err) {
      return { timeline: [], entity: null, error: err };
    }
  }

  /**
   * Calculate engagement score for an entity based on timeline
   */
  async getRelationshipStrength(entityId) {
    const { timeline, entity, error } = await this.getEntityTimeline(entityId);

    if (error || !entity) {
      return { score: 0, factors: {}, error };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // Calculate factors
    const factors = {
      recentInteractions: 0,   // Interactions in last 30 days
      totalInteractions: timeline.length,
      communicationFrequency: 0, // Average per month
      meetingsHeld: 0,
      opportunityValue: 0,
      daysSinceLastContact: null,
    };

    // Count recent interactions
    for (const event of timeline) {
      const eventDate = new Date(event.date);

      if (eventDate >= thirtyDaysAgo) {
        factors.recentInteractions++;
      }

      if (event.type === 'calendar_event') {
        factors.meetingsHeld++;
      }

      if (event.type === 'opportunity' && event.data?.value) {
        factors.opportunityValue += event.data.value;
      }
    }

    // Calculate days since last contact
    if (timeline.length > 0) {
      const lastInteraction = new Date(timeline[0].date);
      factors.daysSinceLastContact = Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));
    }

    // Calculate communication frequency (events in last 90 days / 3 months)
    const last90Days = timeline.filter(e => new Date(e.date) >= ninetyDaysAgo);
    factors.communicationFrequency = Math.round((last90Days.length / 3) * 10) / 10;

    // Calculate overall score (0-100)
    let score = 0;

    // Recent activity (0-30 points)
    score += Math.min(factors.recentInteractions * 5, 30);

    // Communication frequency (0-20 points)
    score += Math.min(factors.communicationFrequency * 5, 20);

    // Meetings held (0-20 points)
    score += Math.min(factors.meetingsHeld * 4, 20);

    // Recency penalty (0-30 points lost for inactivity)
    if (factors.daysSinceLastContact !== null) {
      if (factors.daysSinceLastContact <= 7) {
        score += 30;
      } else if (factors.daysSinceLastContact <= 14) {
        score += 20;
      } else if (factors.daysSinceLastContact <= 30) {
        score += 10;
      } else if (factors.daysSinceLastContact <= 60) {
        score += 0;
      } else {
        score -= Math.min((factors.daysSinceLastContact - 60) / 2, 20);
      }
    }

    // Opportunity value bonus (up to 10 points)
    if (factors.opportunityValue > 0) {
      score += Math.min(factors.opportunityValue / 5000, 10);
    }

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, Math.round(score)));

    return { score, factors, entity, error: null };
  }

  /**
   * Merge two entities into one
   */
  async mergeEntities(entityId1, entityId2) {
    if (!db.isConfigured().ghl) {
      return { error: new Error('Database not configured') };
    }

    try {
      // Get both entities
      const { data: entity1 } = await db.ghl
        .from('entities')
        .select('*')
        .eq('id', entityId1)
        .single();

      const { data: entity2 } = await db.ghl
        .from('entities')
        .select('*')
        .eq('id', entityId2)
        .single();

      if (!entity1 || !entity2) {
        return { error: new Error('One or both entities not found') };
      }

      // Merge metadata and choose best values
      const merged = {
        primary_email: entity1.primary_email || entity2.primary_email,
        first_name: entity1.first_name || entity2.first_name,
        last_name: entity1.last_name || entity2.last_name,
        display_name: entity1.display_name || entity2.display_name,
        company: entity1.company || entity2.company,
        metadata: {
          ...entity2.metadata,
          ...entity1.metadata,
          mergedFrom: entityId2,
          mergedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      // Update entity1 with merged data
      const { error: updateError } = await db.ghl
        .from('entities')
        .update(merged)
        .eq('id', entityId1);

      if (updateError) {
        return { error: updateError };
      }

      // Move all mappings from entity2 to entity1
      const { error: mappingError } = await db.ghl
        .from('entity_mappings')
        .update({ entity_id: entityId1 })
        .eq('entity_id', entityId2);

      if (mappingError) {
        console.error('Error moving mappings:', mappingError);
      }

      // Update recommendation_outcomes to point to merged entity
      if (db.isConfigured().main) {
        await db.main
          .from('recommendation_outcomes')
          .update({ entity_id: entityId1 })
          .eq('entity_id', entityId2);
      }

      // Delete entity2
      await db.ghl
        .from('entities')
        .delete()
        .eq('id', entityId2);

      return { mergedEntity: { ...entity1, ...merged }, error: null };
    } catch (err) {
      return { error: err };
    }
  }

  /**
   * Get entity statistics
   */
  async getStats() {
    if (!db.isConfigured().ghl) {
      return { totalEntities: 0, totalMappings: 0, bySystem: {}, error: null };
    }

    try {
      const { data: entities, error } = await db.ghl
        .from('entities')
        .select('id');

      if (error) {
        return { error };
      }

      const { data: mappings } = await db.ghl
        .from('entity_mappings')
        .select('source_system');

      const bySystem = {};
      for (const m of mappings || []) {
        bySystem[m.source_system] = (bySystem[m.source_system] || 0) + 1;
      }

      return {
        totalEntities: entities?.length || 0,
        totalMappings: mappings?.length || 0,
        bySystem,
        error: null,
      };
    } catch (err) {
      return { totalEntities: 0, totalMappings: 0, bySystem: {}, error: err };
    }
  }

  /**
   * Sync GHL contacts to entities (bulk operation)
   */
  async syncGhlContacts() {
    if (!db.isConfigured().ghl) {
      console.log('GHL database not configured');
      return { synced: 0, created: 0, error: null };
    }

    try {
      const { data: contacts, error } = await db.ghl
        .from('ghl_contacts')
        .select('ghl_id, email, first_name, last_name, company_name')
        .eq('sync_status', 'synced');

      if (error) {
        return { synced: 0, created: 0, error };
      }

      let synced = 0;
      let created = 0;

      for (const contact of contacts || []) {
        if (!contact.email) continue;

        const result = await this.resolveEntity(contact.email, {
          sourceSystem: 'ghl',
          sourceId: contact.ghl_id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          company: contact.company_name,
        });

        if (!result.error) {
          synced++;
          if (result.created) created++;
        }
      }

      return { synced, created, error: null };
    } catch (err) {
      return { synced: 0, created: 0, error: err };
    }
  }
}

// Singleton instance
const entityResolver = new EntityResolver();

module.exports = {
  entityResolver,
  EntityResolver,
  SOURCE_SYSTEMS,
  nameSimilarity,
  normalizeEmail,
  normalizeName,
};
module.exports.default = entityResolver;
