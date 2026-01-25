/**
 * ACT Dual Database Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ DATABASE 1: ACT Intelligence Platform                       │
 * │ Project ID: tednluwflfhxyucgwigh                            │
 * │ Tables: person_identity_map, linkedin_contacts,             │
 * │         project_contact_matches, exa_enrichment_queue       │
 * │ Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY          │
 * ├─────────────────────────────────────────────────────────────┤
 * │ DATABASE 2: ACT Knowledge Hub                               │
 * │ Project ID: bhwyqqbovcjoefezgfnq                            │
 * │ Tables: contact_communications, ghl_contacts_master,        │
 * │         knowledge_chunks                                    │
 * │ Env vars: KNOWLEDGE_HUB_SUPABASE_URL, KNOWLEDGE_HUB_SUPABASE_KEY │
 * └─────────────────────────────────────────────────────────────┘
 *
 * CROSS-DATABASE JOIN:
 * person_identity_map.email ↔ contact_communications.ghl_contact_id
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// Environment Validation (Fail Fast)
// ============================================

const REQUIRED_ENV = {
  // Intelligence Platform (primary)
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // Knowledge Hub (secondary)
  KNOWLEDGE_HUB_SUPABASE_URL: process.env.KNOWLEDGE_HUB_SUPABASE_URL,
  KNOWLEDGE_HUB_SUPABASE_KEY: process.env.KNOWLEDGE_HUB_SUPABASE_KEY,
};

const missing = Object.entries(REQUIRED_ENV)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error('❌ Missing required database environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nCheck apps/backend/.env or environment configuration.');
  console.error('See docs/DUAL_DATABASE_ARCHITECTURE.md for details.');
  process.exit(1);
}

// ============================================
// Database 1: ACT Intelligence Platform
// ============================================

/**
 * Primary database for contact management
 *
 * Tables:
 * - person_identity_map (14,804 contacts - single source of truth)
 * - linkedin_contacts (normalized LinkedIn data)
 * - project_contact_matches (contact-project links)
 * - exa_enrichment_queue (pending enrichments)
 */
export const supabase = createClient(
  REQUIRED_ENV.SUPABASE_URL,
  REQUIRED_ENV.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Alias for clarity in code
export const dbIntelligence = supabase;

// ============================================
// Database 2: ACT Knowledge Hub
// ============================================

/**
 * Secondary database for communications and GHL sync
 *
 * Tables:
 * - contact_communications (8,289 email records)
 * - ghl_contacts_master (GHL CRM sync)
 * - knowledge_chunks (288 RAG chunks)
 */
export const supabaseKnowledgeHub = createClient(
  REQUIRED_ENV.KNOWLEDGE_HUB_SUPABASE_URL,
  REQUIRED_ENV.KNOWLEDGE_HUB_SUPABASE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Alias for clarity in code
export const dbKnowledgeHub = supabaseKnowledgeHub;

// ============================================
// Table → Database Mapping (for reference)
// ============================================

export const TABLE_DATABASE_MAP = {
  // Intelligence Platform tables
  person_identity_map: 'intelligence',
  linkedin_contacts: 'intelligence',
  linkedin_imports: 'intelligence',
  project_contact_matches: 'intelligence',
  exa_enrichment_queue: 'intelligence',
  contact_intelligence: 'intelligence',

  // Knowledge Hub tables
  contact_communications: 'knowledge_hub',
  ghl_contacts_master: 'knowledge_hub',
  knowledge_chunks: 'knowledge_hub',
};

/**
 * Get the correct database client for a table
 * @param {string} tableName
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getClientForTable(tableName) {
  const db = TABLE_DATABASE_MAP[tableName];
  if (db === 'intelligence') return supabase;
  if (db === 'knowledge_hub') return supabaseKnowledgeHub;
  throw new Error(`Unknown table: ${tableName}. Add it to TABLE_DATABASE_MAP in database.js`);
}

// Log successful initialization (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  console.log('✅ Database clients initialized:');
  console.log('   - Intelligence Platform (person_identity_map)');
  console.log('   - Knowledge Hub (contact_communications)');
}
