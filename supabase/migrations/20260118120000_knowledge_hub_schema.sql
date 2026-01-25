-- ACT Knowledge Hub - Initial Schema
-- Migration: 20260118120000_knowledge_hub_schema
-- Source: act-personal-ai/supabase/migrations/20260105000000_knowledge_hub_schema.sql
--
-- This creates foundational tables for the ACT AI Operating System:
--   - knowledge_chunks: Vector-enabled content for RAG
--   - entity_relationships: Contact/project relationship tracking
--   - contact_communications: Email/call/meeting history
--   - conversation_context: Chatbot session memory
--   - sync_state: Incremental sync tracking
--
-- NOTE: calendar_events already exists in target (20250929210100_calendar_integration_tables.sql)
--       with a more comprehensive schema, so it is NOT included in this migration.

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- KNOWLEDGE CHUNKS (RAG)
-- =============================================================================

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  source_type TEXT NOT NULL CHECK (source_type IN ('codebase', 'notion', 'ghl', 'email', 'calendar', 'manual', 'system', 'error_log', 'alert')),
  source_id TEXT,
  project_id TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE knowledge_chunks IS 'Vector-enabled content chunks for RAG retrieval across the ACT ecosystem';
COMMENT ON COLUMN knowledge_chunks.source_type IS 'Origin: codebase, notion, ghl, email, calendar, manual, system, error_log, alert';
COMMENT ON COLUMN knowledge_chunks.embedding IS 'OpenAI ada-002 embedding (1536 dimensions)';

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source
  ON knowledge_chunks (source_type, project_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_created
  ON knowledge_chunks (created_at DESC);

-- =============================================================================
-- ENTITY RELATIONSHIPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'project', 'opportunity', 'issue', 'document', 'user')),
  entity_id TEXT NOT NULL,
  related_entity_type TEXT NOT NULL CHECK (related_entity_type IN ('contact', 'project', 'opportunity', 'issue', 'document', 'user')),
  related_entity_id TEXT NOT NULL,
  relationship_type TEXT CHECK (relationship_type IN ('works_on', 'knows', 'owns', 'related_to', 'depends_on', 'blocks', 'parent_of', 'child_of', 'partner', 'client', 'collaborator', 'community')),
  strength_score FLOAT DEFAULT 0.5 CHECK (strength_score >= 0 AND strength_score <= 1),
  last_interaction TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, related_entity_type, related_entity_id, relationship_type)
);

COMMENT ON TABLE entity_relationships IS 'Tracks relationships between entities (contacts, projects, etc.) with strength scoring';

CREATE INDEX IF NOT EXISTS idx_entity_relationships_entity
  ON entity_relationships (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_relationships_strength
  ON entity_relationships (strength_score DESC);

-- =============================================================================
-- CONTACT COMMUNICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT NOT NULL,
  comm_type TEXT NOT NULL CHECK (comm_type IN ('email', 'call', 'meeting', 'sms', 'chat', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  subject TEXT,
  summary TEXT,
  full_content TEXT,
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  topics TEXT[],
  action_items TEXT[],
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ghl', 'gmail', 'calendar', 'manual')),
  source_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contact_communications IS 'History of all communications with contacts from GHL, Gmail, Calendar';

CREATE INDEX IF NOT EXISTS idx_contact_communications_contact
  ON contact_communications (ghl_contact_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_communications_date
  ON contact_communications (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_communications_type
  ON contact_communications (comm_type, direction);

-- =============================================================================
-- CONVERSATION CONTEXT (CHATBOT MEMORY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT,
  interface TEXT NOT NULL CHECK (interface IN ('chatbot', 'voice', 'claude_code', 'notion_ai')),
  site TEXT DEFAULT 'act-farm',
  history JSONB DEFAULT '[]',
  intent_detected TEXT,
  entities_mentioned JSONB DEFAULT '[]',
  context_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

COMMENT ON TABLE conversation_context IS 'Chatbot and voice assistant session memory with 7-day expiry';

CREATE INDEX IF NOT EXISTS idx_conversation_context_session
  ON conversation_context (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_context_expiry
  ON conversation_context (expires_at);

-- =============================================================================
-- SYNC STATE (INCREMENTAL SYNC TRACKING)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('gmail', 'calendar', 'ghl', 'notion', 'github', 'google_auth', 'xero')),
  last_sync_token TEXT,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_page_token TEXT,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  state JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sync_state IS 'Tracks sync tokens and state for incremental data syncing';

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
-- Note: update_updated_at_column() function already exists in target database
-- (defined in 20250929210000_gmail_integration_tables.sql and others)

DROP TRIGGER IF EXISTS update_knowledge_chunks_updated_at ON knowledge_chunks;
CREATE TRIGGER update_knowledge_chunks_updated_at
  BEFORE UPDATE ON knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entity_relationships_updated_at ON entity_relationships;
CREATE TRIGGER update_entity_relationships_updated_at
  BEFORE UPDATE ON entity_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_context_updated_at ON conversation_context;
CREATE TRIGGER update_conversation_context_updated_at
  BEFORE UPDATE ON conversation_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_state_updated_at ON sync_state;
CREATE TRIGGER update_sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

-- Service role policies (for backend scripts)
DO $$ BEGIN
  CREATE POLICY "Service role full access on knowledge_chunks"
    ON knowledge_chunks FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on entity_relationships"
    ON entity_relationships FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on contact_communications"
    ON contact_communications FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on conversation_context"
    ON conversation_context FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on sync_state"
    ON sync_state FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anon policies (for website chatbot)
DO $$ BEGIN
  CREATE POLICY "Anon read access on knowledge_chunks"
    ON knowledge_chunks FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anon full access on conversation_context"
    ON conversation_context FOR ALL
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- FUNCTIONS: VECTOR SIMILARITY SEARCH
-- =============================================================================

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_source_type TEXT DEFAULT NULL,
  filter_project_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_id TEXT,
  project_id TEXT,
  file_path TEXT,
  metadata JSONB,
  confidence FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.source_type,
    kc.source_id,
    kc.project_id,
    kc.file_path,
    kc.metadata,
    kc.confidence,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    (filter_source_type IS NULL OR kc.source_type = filter_source_type)
    AND (filter_project_id IS NULL OR kc.project_id = filter_project_id)
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge_chunks IS 'Semantic search across knowledge chunks using vector similarity';

-- =============================================================================
-- FUNCTIONS: RELATIONSHIP HEALTH
-- =============================================================================

CREATE OR REPLACE FUNCTION get_contacts_needing_attention(
  days_threshold INT DEFAULT 14
)
RETURNS TABLE (
  ghl_contact_id TEXT,
  last_communication TIMESTAMPTZ,
  days_since_contact INT,
  total_communications BIGINT,
  last_direction TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH last_comms AS (
    SELECT
      cc.ghl_contact_id,
      MAX(cc.occurred_at) AS last_communication,
      COUNT(*)::BIGINT AS total_communications,
      (SELECT direction FROM contact_communications cc2
       WHERE cc2.ghl_contact_id = cc.ghl_contact_id
       ORDER BY cc2.occurred_at DESC LIMIT 1) AS last_direction
    FROM contact_communications cc
    GROUP BY cc.ghl_contact_id
  )
  SELECT
    lc.ghl_contact_id,
    lc.last_communication,
    EXTRACT(DAY FROM NOW() - lc.last_communication)::INT AS days_since_contact,
    lc.total_communications,
    lc.last_direction
  FROM last_comms lc
  WHERE lc.last_communication < NOW() - (days_threshold || ' days')::INTERVAL
  ORDER BY lc.last_communication ASC;
END;
$$;

COMMENT ON FUNCTION get_contacts_needing_attention IS 'Returns contacts who have not been contacted within the threshold days';

-- =============================================================================
-- FUNCTIONS: CLEANUP EXPIRED SESSIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_conversations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_context
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_conversations IS 'Removes expired chatbot sessions (called by cron)';

-- =============================================================================
-- DONE
-- =============================================================================
