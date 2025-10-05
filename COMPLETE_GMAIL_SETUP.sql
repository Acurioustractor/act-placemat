-- COMPLETE GMAIL & CALENDAR SETUP
-- Run this entire file in Supabase SQL Editor
-- https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- GMAIL TABLES
-- ============================================================================

-- Gmail Sync Status
CREATE TABLE IF NOT EXISTS gmail_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'error', 'completed')),
  total_messages INT DEFAULT 0,
  synced_messages INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gmail Messages
CREATE TABLE IF NOT EXISTS gmail_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_id TEXT UNIQUE NOT NULL,
  thread_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[],
  sent_date TIMESTAMPTZ,
  body_text TEXT,
  labels TEXT[],
  keywords TEXT[],
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gmail Contacts
CREATE TABLE IF NOT EXISTS gmail_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  domain TEXT,
  last_interaction TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gmail_messages_gmail_id ON gmail_messages(gmail_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_user_email ON gmail_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_sent_date ON gmail_messages(sent_date DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_contacts_email ON gmail_contacts(email);

-- ============================================================================
-- RLS POLICIES - DISABLE FOR NOW (Backend sync needs direct access)
-- ============================================================================

ALTER TABLE gmail_sync_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_contacts DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  'Gmail tables created successfully! RLS disabled for backend sync.' AS status,
  COUNT(*) FILTER (WHERE table_name = 'gmail_sync_status') AS gmail_sync_status_exists,
  COUNT(*) FILTER (WHERE table_name = 'gmail_messages') AS gmail_messages_exists,
  COUNT(*) FILTER (WHERE table_name = 'gmail_contacts') AS gmail_contacts_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('gmail_sync_status', 'gmail_messages', 'gmail_contacts');