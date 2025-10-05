-- Identity Map and LinkedIn Contacts Enhancements (copied for migration-runner)
-- Created: 2025-09-09T09:00:00Z

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS person_identity_map (
  person_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT,
  email TEXT UNIQUE,
  linkedin_contact_id UUID,
  gmail_id TEXT,
  notion_id TEXT,
  external_ids JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_identity_email ON person_identity_map(email);
CREATE INDEX IF NOT EXISTS idx_person_identity_linkedin ON person_identity_map(linkedin_contact_id);

ALTER TABLE linkedin_contacts
  ADD COLUMN IF NOT EXISTS person_id UUID;

-- Add FK if not present
DO $$ BEGIN
  ALTER TABLE linkedin_contacts
    ADD CONSTRAINT fk_linkedin_contacts_person
    FOREIGN KEY (person_id) REFERENCES person_identity_map(person_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_person ON linkedin_contacts(person_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_person_identity_map_updated_at
    BEFORE UPDATE ON person_identity_map
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE person_identity_map ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated read" ON person_identity_map
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON person_identity_map TO service_role;

CREATE OR REPLACE VIEW vw_identity_high_value_contacts AS
SELECT 
  c.id AS linkedin_id,
  c.full_name,
  c.current_position,
  c.current_company,
  c.email_address,
  c.relationship_score,
  c.strategic_value,
  pim.person_id,
  pim.notion_id,
  pim.gmail_id
FROM linkedin_contacts c
LEFT JOIN person_identity_map pim ON pim.person_id = c.person_id
WHERE c.strategic_value IN ('high','medium') OR c.relationship_score > 0.7
ORDER BY c.relationship_score DESC NULLS LAST;

COMMIT;

