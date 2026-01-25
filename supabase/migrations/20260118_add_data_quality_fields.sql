-- Add data quality tracking fields to person_identity_map
-- Part of contact consolidation project (2026-01-18)

-- Data quality score (0-100)
ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0;

-- Array of data sources that contributed to this record
ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';

-- Flag for records needing manual cleanup
ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS needs_cleanup BOOLEAN DEFAULT false;

-- Last time the record was verified/refreshed
ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Denormalized communication stats (from Knowledge Hub)
ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS total_emails_sent INTEGER DEFAULT 0;

ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS total_emails_received INTEGER DEFAULT 0;

ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS last_communication_at TIMESTAMPTZ;

-- Index for finding low-quality records needing enrichment
CREATE INDEX IF NOT EXISTS idx_pim_data_quality
ON person_identity_map(data_quality_score)
WHERE data_quality_score < 50;

-- Index for finding records needing cleanup
CREATE INDEX IF NOT EXISTS idx_pim_needs_cleanup
ON person_identity_map(needs_cleanup)
WHERE needs_cleanup = true;

COMMENT ON COLUMN person_identity_map.data_quality_score IS 'Quality score 0-100 based on completeness: +20 email, +20 name, +15 company, +15 position, +10 LinkedIn, +10 GHL, +10 enriched';
COMMENT ON COLUMN person_identity_map.data_sources IS 'Array of sources: linkedin_ben, linkedin_nic, gmail, ghl, exa, manual';
COMMENT ON COLUMN person_identity_map.needs_cleanup IS 'True if record needs manual review (conflicting data, low quality)';
