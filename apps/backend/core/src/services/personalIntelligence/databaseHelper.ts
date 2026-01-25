/**
 * Database Helper for Personal Intelligence Services
 *
 * Wraps the dual database configuration from lib/database.js
 * and provides a compatible API for the migrated services.
 *
 * Database mapping:
 *   - Intelligence Platform (supabase) - contacts, linkedin, projects
 *   - Knowledge Hub (supabaseKnowledgeHub) - communications, calendar, knowledge
 *
 * Migrated from: act-personal-ai/services/db.mjs
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseKnowledgeHub } from '../../lib/database.js';
import { DatabaseConfiguration } from './types.js';

/**
 * Database helper that provides access to both Supabase databases
 * with an API compatible with the original act-personal-ai services.
 */
class DatabaseHelper {
  /**
   * Main database for personal AI features
   * Maps to Knowledge Hub (bhwyqqbovcjoefezgfnq) which has:
   * - calendar_events
   * - knowledge_chunks
   * - sync_state
   * - contact_communications
   */
  get main(): SupabaseClient {
    return supabaseKnowledgeHub;
  }

  /**
   * GHL/shared database for CRM data
   * Maps to Intelligence Platform (tednluwflfhxyucgwigh) which has:
   * - ghl_contacts
   * - ghl_opportunities
   * - ghl_pipelines
   * - person_identity_map
   */
  get ghl(): SupabaseClient {
    return supabase;
  }

  /**
   * Check if databases are configured
   */
  isConfigured(): DatabaseConfiguration {
    return {
      main: !!supabaseKnowledgeHub,
      ghl: !!supabase,
    };
  }
}

// Singleton instance
export const db = new DatabaseHelper();

export default db;
