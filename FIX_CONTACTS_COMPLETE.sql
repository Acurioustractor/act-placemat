-- Fix gmail_contacts schema to match service code
-- Drop and recreate with correct schema

DROP TABLE IF EXISTS gmail_contacts CASCADE;

CREATE TABLE gmail_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  domain TEXT,
  last_interaction TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_gmail_contacts_email ON gmail_contacts(email);
CREATE INDEX idx_gmail_contacts_domain ON gmail_contacts(domain);
CREATE INDEX idx_gmail_contacts_last_interaction ON gmail_contacts(last_interaction DESC);

-- Disable RLS
ALTER TABLE gmail_contacts DISABLE ROW LEVEL SECURITY;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';