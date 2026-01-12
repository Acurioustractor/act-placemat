-- Add Exa enrichment fields to linkedin_contacts table
ALTER TABLE linkedin_contacts
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS exa_enriched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exa_last_enriched TIMESTAMP,
ADD COLUMN IF NOT EXISTS exa_confidence_score DECIMAL(3,2);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_exa_enriched ON linkedin_contacts(exa_enriched);
CREATE INDEX IF NOT EXISTS idx_linkedin_contacts_confidence ON linkedin_contacts(exa_confidence_score);

-- Update existing records that have linkedin_url to mark as enriched
UPDATE linkedin_contacts
SET exa_enriched = TRUE
WHERE linkedin_url IS NOT NULL AND exa_enriched IS NULL;

COMMENT ON COLUMN linkedin_contacts.linkedin_url IS 'LinkedIn profile URL found via Exa enrichment';
COMMENT ON COLUMN linkedin_contacts.bio IS 'Brief bio/summary from web search';
COMMENT ON COLUMN linkedin_contacts.exa_enriched IS 'Whether contact has been enriched with Exa data';
COMMENT ON COLUMN linkedin_contacts.exa_last_enriched IS 'Timestamp of last Exa enrichment';
COMMENT ON COLUMN linkedin_contacts.exa_confidence_score IS 'Confidence score of enrichment data (0-1)';
