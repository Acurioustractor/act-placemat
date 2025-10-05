-- Minimal Contact Intelligence Setup for Demo
-- Creates the essential tables and view needed for the CRM system

-- Create person_identity_map table
CREATE TABLE IF NOT EXISTS person_identity_map (
  person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT UNIQUE,
  contact_data JSONB DEFAULT '{}',
  youth_justice_relevance_score INTEGER DEFAULT 0,
  engagement_priority TEXT DEFAULT 'low',
  sector TEXT,
  organization_type TEXT,
  location_region TEXT,
  indigenous_affiliation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact_interactions table
CREATE TABLE IF NOT EXISTS contact_interactions (
  interaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  interaction_date TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  outcome TEXT,
  next_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dashboard summary view
CREATE OR REPLACE VIEW contact_dashboard_summary AS
SELECT
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE engagement_priority = 'high') as high_priority,
  COUNT(*) FILTER (WHERE engagement_priority = 'critical') as critical_priority,
  COUNT(*) FILTER (WHERE sector = 'government') as government_contacts,
  COUNT(*) FILTER (WHERE sector = 'media') as media_contacts,
  COUNT(*) FILTER (WHERE indigenous_affiliation = true) as indigenous_contacts,
  COALESCE(AVG(youth_justice_relevance_score), 0) as avg_relevance_score
FROM person_identity_map;

-- Insert demo data to show the styling
INSERT INTO person_identity_map (full_name, email, engagement_priority, sector, youth_justice_relevance_score, indigenous_affiliation) VALUES
  ('Sarah Johnson', 'sarah@youthadvocacy.org.au', 'high', 'ngo', 85, false),
  ('David Chen', 'david.chen@parliament.act.gov.au', 'high', 'government', 78, false),
  ('Maria Santos', 'maria@abcnews.com.au', 'medium', 'media', 65, false),
  ('Dr. James Wilson', 'j.wilson@anu.edu.au', 'medium', 'academic', 72, false),
  ('Emma Thompson', 'emma@legalaid.org.au', 'high', 'legal', 82, false)
ON CONFLICT (email) DO NOTHING;

-- Verify the setup
SELECT 'Demo data inserted successfully' as status;
SELECT * FROM contact_dashboard_summary;