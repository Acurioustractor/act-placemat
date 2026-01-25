/**
 * Database Client Helper for Relationship Intelligence Services
 *
 * Wraps the dual database configuration from the main lib/database.js
 * and provides a compatible API for migrated services.
 *
 * Database mapping:
 *   - Intelligence Platform (supabase) - ghl_contacts, ghl_opportunities, entities
 *   - Knowledge Hub (supabaseKnowledgeHub) - communications, calendar, knowledge
 */

const { supabase, supabaseKnowledgeHub } = require('../../lib/database.js');

// Create a compatible db object that matches the act-personal-ai API
const db = {
  /**
   * Main database for personal AI features
   * Maps to Knowledge Hub (bhwyqqbovcjoefezgfnq) which has:
   * - calendar_events
   * - knowledge_chunks
   * - sync_state
   * - contact_communications
   * - learned_thresholds
   * - recommendation_outcomes
   */
  get main() {
    return supabaseKnowledgeHub;
  },

  /**
   * GHL/shared database for CRM data
   * Maps to Intelligence Platform (tednluwflfhxyucgwigh) which has:
   * - ghl_contacts
   * - ghl_opportunities
   * - ghl_pipelines
   * - person_identity_map
   * - entities
   * - entity_mappings
   */
  get ghl() {
    return supabase;
  },

  /**
   * Check if databases are configured
   */
  isConfigured() {
    return {
      main: !!supabaseKnowledgeHub,
      ghl: !!supabase,
    };
  },
};

module.exports = { db };
module.exports.default = db;
