-- Complete Gmail Schema Fix
-- Drop and recreate tables with ALL columns the service expects
-- Run this in Supabase SQL Editor

-- Drop existing tables
DROP TABLE IF EXISTS gmail_messages CASCADE;
DROP TABLE IF EXISTS gmail_sync_status CASCADE;
DROP TABLE IF EXISTS gmail_contacts CASCADE;

-- Create gmail_sync_status with ALL required columns
CREATE TABLE gmail_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT UNIQUE NOT NULL,
  sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'completed', 'error')) DEFAULT 'idle',
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  synced_messages INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_message TEXT,
  last_error TIMESTAMPTZ,
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gmail_messages with ALL required columns
CREATE TABLE gmail_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_id TEXT UNIQUE NOT NULL,
  thread_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[],
  cc_emails TEXT[],
  bcc_emails TEXT[],
  sent_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  body_text TEXT,
  body_html TEXT,
  labels TEXT[],
  importance TEXT CHECK (importance IN ('low', 'medium', 'high')) DEFAULT 'medium',
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INTEGER DEFAULT 0,
  attachment_names TEXT[],
  attachment_total_size BIGINT DEFAULT 0,
  keywords TEXT[],
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_trashed BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gmail_contacts with ALL required columns
CREATE TABLE gmail_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  first_message_date TIMESTAMPTZ,
  last_message_date TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  avg_response_time_hours NUMERIC(10, 2),
  relationship_strength TEXT CHECK (relationship_strength IN ('weak', 'medium', 'strong')) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, contact_email)
);

-- Indexes for performance
CREATE INDEX idx_gmail_messages_user ON gmail_messages(user_email);
CREATE INDEX idx_gmail_messages_thread ON gmail_messages(thread_id);
CREATE INDEX idx_gmail_messages_date ON gmail_messages(sent_date DESC);
CREATE INDEX idx_gmail_messages_from ON gmail_messages(from_email);
CREATE INDEX idx_gmail_messages_labels ON gmail_messages USING GIN(labels);
CREATE INDEX idx_gmail_messages_keywords ON gmail_messages USING GIN(keywords);
CREATE INDEX idx_gmail_contacts_user ON gmail_contacts(user_email);
CREATE INDEX idx_gmail_contacts_email ON gmail_contacts(contact_email);

-- Disable RLS for backend sync
ALTER TABLE gmail_sync_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_contacts DISABLE ROW LEVEL SECURITY;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';