-- Gmail Sync Tables for Smart Community Email Processing
-- Created: 2025-08-05

-- Table to store processed community emails
CREATE TABLE IF NOT EXISTS community_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  thread_id TEXT,
  
  -- Email metadata
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,
  received_date TIMESTAMP NOT NULL,
  
  -- Smart analysis results
  relevance_score INTEGER NOT NULL DEFAULT 0,
  email_type TEXT, -- 'funding_opportunity', 'partnership_inquiry', etc.
  detected_contexts TEXT[], -- Array of detected contexts
  urgency TEXT DEFAULT 'normal', -- 'normal', 'high'
  
  -- Community connections
  community_contact_id UUID REFERENCES notion_people(id),
  mentioned_projects UUID[], -- Array of project IDs
  extracted_info JSONB, -- Structured extracted information
  
  -- Processing metadata
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_version TEXT DEFAULT '1.0',
  
  -- Indexing
  CONSTRAINT valid_urgency CHECK (urgency IN ('normal', 'high')),
  CONSTRAINT valid_relevance_score CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

-- Table to store Gmail OAuth tokens securely
CREATE TABLE IF NOT EXISTS gmail_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Could be 'system' for single-user setup
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP,
  scope TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- Table to track Gmail sync statistics and performance
CREATE TABLE IF NOT EXISTS gmail_sync_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Processing counts
  total_emails_processed INTEGER DEFAULT 0,
  community_emails_detected INTEGER DEFAULT 0,
  contacts_synced INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_processing_time_ms INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  
  -- Last sync times
  last_email_sync TIMESTAMP,
  last_contact_sync TIMESTAMP,
  last_webhook_received TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(stat_date)
);

-- Table to store Gmail-Notion contact mappings
CREATE TABLE IF NOT EXISTS gmail_notion_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Gmail data
  gmail_contact_id TEXT,
  gmail_email TEXT NOT NULL,
  gmail_name TEXT,
  gmail_labels TEXT[], -- Gmail contact labels
  
  -- Notion data
  notion_person_id UUID REFERENCES notion_people(id),
  
  -- Sync metadata
  sync_status TEXT DEFAULT 'active', -- 'active', 'inactive', 'error'
  last_gmail_sync TIMESTAMP,
  last_notion_sync TIMESTAMP,
  sync_error TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(gmail_email),
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('active', 'inactive', 'error'))
);

-- Table to store Gmail filter configurations
CREATE TABLE IF NOT EXISTS gmail_sync_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type TEXT NOT NULL, -- 'project_keyword', 'organization_domain', 'subject_pattern'
  filter_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(filter_type, filter_value)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_emails_from_email ON community_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_community_emails_received_date ON community_emails(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_community_emails_relevance_score ON community_emails(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_community_emails_email_type ON community_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_community_emails_community_contact ON community_emails(community_contact_id);

CREATE INDEX IF NOT EXISTS idx_gmail_notion_contacts_gmail_email ON gmail_notion_contacts(gmail_email);
CREATE INDEX IF NOT EXISTS idx_gmail_notion_contacts_notion_person ON gmail_notion_contacts(notion_person_id);
CREATE INDEX IF NOT EXISTS idx_gmail_notion_contacts_sync_status ON gmail_notion_contacts(sync_status);

CREATE INDEX IF NOT EXISTS idx_gmail_sync_filters_type_active ON gmail_sync_filters(filter_type, is_active);

-- Insert default filters based on your real ACT projects
INSERT INTO gmail_sync_filters (filter_type, filter_value, priority) VALUES
-- Project keywords from your real Notion data
('project_keyword', 'ANAT SPECTRA', 10),
('project_keyword', 'Barkly Backbone', 10),
('project_keyword', 'BG Fit', 10),
('project_keyword', 'Black Cockatoo Valley', 10),
('project_keyword', 'Climate Justice Innovation Lab', 10),
('project_keyword', 'Dad.Lab', 10),
('project_keyword', 'Designing for Obsolescence', 10),
('project_keyword', 'Contained', 10),

-- Organization domains
('organization_domain', '@act.place', 15),
('organization_domain', '@empathyledger.com', 15),
('organization_domain', '@picc.org.au', 15),
('organization_domain', '@climateseed.com', 10),
('organization_domain', '@justiceseed.com', 10),

-- Subject patterns (stored as regex strings)
('subject_pattern', 'partnership', 8),
('subject_pattern', 'collaboration', 8),
('subject_pattern', 'funding', 12),
('subject_pattern', 'grant', 12),
('subject_pattern', 'opportunity', 10),
('subject_pattern', 'proposal', 9),
('subject_pattern', 'letter of support', 11),
('subject_pattern', 'introduction', 7),
('subject_pattern', 'meeting', 6),
('subject_pattern', 'workshop', 6)

ON CONFLICT (filter_type, filter_value) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gmail_auth_tokens_updated_at 
    BEFORE UPDATE ON gmail_auth_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_notion_contacts_updated_at 
    BEFORE UPDATE ON gmail_notion_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_sync_filters_updated_at 
    BEFORE UPDATE ON gmail_sync_filters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();