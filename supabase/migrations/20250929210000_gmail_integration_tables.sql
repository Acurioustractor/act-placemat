-- Gmail Integration Tables
-- Provides comprehensive email intelligence and contact discovery
-- Created: 2025-09-29

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Gmail Sync Status Table
-- Tracks sync state and health for Gmail integration
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmail_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'error', 'completed')),
  history_id TEXT, -- Gmail history ID for incremental sync
  total_messages INT DEFAULT 0,
  synced_messages INT DEFAULT 0,
  error_message TEXT,
  error_count INT DEFAULT 0,
  last_error TIMESTAMPTZ,
  consecutive_errors INT DEFAULT 0,
  sync_duration_ms INT,
  api_calls_used INT DEFAULT 0,
  api_calls_remaining INT,
  api_quota_reset TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_sync_status_email ON gmail_sync_status(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_status_last_sync ON gmail_sync_status(last_sync DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_status_sync_status ON gmail_sync_status(sync_status);

-- ============================================================================
-- Gmail Messages Table
-- Stores email metadata and content for intelligence analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmail_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_id TEXT UNIQUE NOT NULL, -- Gmail message ID
  thread_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  person_id UUID REFERENCES person_identity_map(person_id), -- Link to canonical identity

  -- Message metadata
  subject TEXT,
  snippet TEXT,
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[], -- Array of recipient emails
  cc_emails TEXT[],
  bcc_emails TEXT[],

  -- Dates
  sent_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,

  -- Content
  body_text TEXT, -- Plain text body
  body_html TEXT, -- HTML body

  -- Classification
  labels TEXT[], -- Gmail labels
  categories TEXT[], -- Derived categories (work, personal, etc)
  importance TEXT CHECK (importance IN ('high', 'medium', 'low')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),

  -- Metadata
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INT DEFAULT 0,
  attachment_names TEXT[],
  attachment_total_size INT, -- Bytes

  -- Intelligence
  contacts_mentioned TEXT[], -- Email addresses mentioned in body
  projects_mentioned UUID[], -- Project IDs mentioned
  keywords TEXT[], -- Extracted keywords
  ai_summary TEXT, -- AI-generated summary
  action_items TEXT[], -- Extracted action items
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_trashed BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_messages_gmail_id ON gmail_messages(gmail_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_thread_id ON gmail_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_user_email ON gmail_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_person_id ON gmail_messages(person_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_from_email ON gmail_messages(from_email);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_sent_date ON gmail_messages(sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_labels ON gmail_messages USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_is_read ON gmail_messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_gmail_messages_follow_up ON gmail_messages(follow_up_required, follow_up_date) WHERE follow_up_required = true;

-- ============================================================================
-- Gmail Threads Table
-- Tracks email conversation threads for context
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmail_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_thread_id TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,

  -- Thread metadata
  subject TEXT,
  participants TEXT[], -- All email addresses in thread
  message_count INT DEFAULT 0,

  -- Dates
  first_message_date TIMESTAMPTZ,
  last_message_date TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  has_unread BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  labels TEXT[],

  -- Intelligence
  thread_summary TEXT,
  sentiment_trend TEXT, -- e.g., "positive", "declining", "improving"
  response_required BOOLEAN DEFAULT false,
  last_responder TEXT, -- Email of last person to respond

  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_threads_thread_id ON gmail_threads(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_user_email ON gmail_threads(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_last_message ON gmail_threads(last_message_date DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_is_active ON gmail_threads(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gmail_threads_has_unread ON gmail_threads(has_unread) WHERE has_unread = true;

-- ============================================================================
-- Gmail Contacts Discovery Table
-- Tracks contacts discovered from email interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmail_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  person_id UUID REFERENCES person_identity_map(person_id),

  -- Contact info
  name TEXT,
  display_name TEXT,
  domain TEXT, -- Email domain for company identification

  -- Interaction stats
  total_emails INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  emails_received INT DEFAULT 0,
  first_interaction TIMESTAMPTZ,
  last_interaction TIMESTAMPTZ,

  -- Relationship intelligence
  interaction_frequency TEXT CHECK (interaction_frequency IN ('daily', 'weekly', 'monthly', 'occasional', 'rare')),
  relationship_strength TEXT CHECK (relationship_strength IN ('strong', 'moderate', 'weak')),
  average_response_time_hours NUMERIC,

  -- Classification
  contact_type TEXT CHECK (contact_type IN ('colleague', 'client', 'vendor', 'personal', 'unknown')),
  is_vip BOOLEAN DEFAULT false,

  -- Metadata
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_contacts_email ON gmail_contacts(email);
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_person_id ON gmail_contacts(person_id);
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_domain ON gmail_contacts(domain);
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_last_interaction ON gmail_contacts(last_interaction DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_is_vip ON gmail_contacts(is_vip) WHERE is_vip = true;

-- ============================================================================
-- Gmail Intelligence Insights Table
-- Stores AI-generated insights from email analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS gmail_intelligence_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,

  -- Insight details
  insight_type TEXT CHECK (insight_type IN (
    'follow_up_needed',
    'important_contact',
    'opportunity_detected',
    'meeting_suggested',
    'project_mentioned',
    'deadline_approaching',
    'relationship_change',
    'sentiment_shift'
  )),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),

  -- Related entities
  related_message_ids UUID[], -- References gmail_messages
  related_contact_emails TEXT[],
  related_project_ids UUID[],

  -- Actions
  suggested_actions JSONB, -- Array of action objects
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmail_insights_user_email ON gmail_intelligence_insights(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_insights_type ON gmail_intelligence_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_gmail_insights_priority ON gmail_intelligence_insights(priority);
CREATE INDEX IF NOT EXISTS idx_gmail_insights_is_actioned ON gmail_intelligence_insights(is_actioned) WHERE is_actioned = false;
CREATE INDEX IF NOT EXISTS idx_gmail_insights_generated ON gmail_intelligence_insights(generated_at DESC);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_gmail_sync_status_updated_at
    BEFORE UPDATE ON gmail_sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_gmail_messages_updated_at
    BEFORE UPDATE ON gmail_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_gmail_threads_updated_at
    BEFORE UPDATE ON gmail_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_gmail_contacts_updated_at
    BEFORE UPDATE ON gmail_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_gmail_insights_updated_at
    BEFORE UPDATE ON gmail_intelligence_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE gmail_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_intelligence_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth setup)
-- These are examples - modify based on your actual auth.users() setup

CREATE POLICY "Users can view their own gmail sync status"
  ON gmail_sync_status FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own gmail messages"
  ON gmail_messages FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own gmail threads"
  ON gmail_threads FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own gmail contacts"
  ON gmail_contacts FOR SELECT
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can view their own gmail insights"
  ON gmail_intelligence_insights FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE gmail_sync_status IS 'Tracks Gmail API sync status and health metrics';
COMMENT ON TABLE gmail_messages IS 'Stores email messages with intelligence analysis';
COMMENT ON TABLE gmail_threads IS 'Tracks email conversation threads';
COMMENT ON TABLE gmail_contacts IS 'Contacts discovered from Gmail interactions';
COMMENT ON TABLE gmail_intelligence_insights IS 'AI-generated insights from email analysis';