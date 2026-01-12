-- ACT Master Ecosystem: Unified Project Matching
-- Date: January 1, 2026
-- Purpose: Universal project-contact matching across ALL ACT systems
-- Systems: Placemat, JusticeHub (ALMA), Empathy Ledger, The Farm

-- ============================================================================
-- 1. EXTEND person_identity_map with cross-system IDs
-- ============================================================================

-- Add GHL and additional system IDs
ALTER TABLE person_identity_map
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS discovered_via TEXT;

-- Update existing records to add discovered_via if missing
UPDATE person_identity_map
SET discovered_via = 'auto_enrichment_queue'
WHERE discovered_via IS NULL AND data_source = 'exa_enrichment';

-- Create index for GHL sync
CREATE INDEX IF NOT EXISTS idx_person_identity_ghl
  ON person_identity_map(ghl_contact_id);

-- ============================================================================
-- 2. UNIFIED PROJECT-CONTACT MATCHING TABLE
-- ============================================================================

-- Universal table that works across ALL ACT projects
CREATE TABLE IF NOT EXISTS project_contact_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact reference (can use either linkedin_contacts.id or person_identity_map.person_id)
  contact_id UUID REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
  person_id UUID REFERENCES person_identity_map(person_id) ON DELETE CASCADE,

  -- Universal project reference (Notion project ID works across all systems)
  project_notion_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_source TEXT NOT NULL CHECK (project_source IN (
    'placemat',      -- ACT Placemat projects
    'justicehub',    -- JusticeHub / ALMA interventions
    'farm',          -- The Farm incubation projects
    'empathy_ledger',-- Empathy Ledger story projects
    'intelligence_hub' -- Intelligence Hub knowledge projects
  )),

  -- Alignment scoring
  alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),
  matched_keywords TEXT[], -- e.g., ['indigenous', 'justice', 'youth', 'mentoring']
  match_reason TEXT, -- Human-readable explanation

  -- ALMA integration (if project is ALMA intervention)
  alma_intervention_id UUID, -- References alma_interventions.id (if applicable)
  alma_signal_boost INTEGER DEFAULT 0, -- Additional scoring from ALMA portfolio signals

  -- Engagement status tracking
  engagement_status TEXT DEFAULT 'potential' CHECK (engagement_status IN (
    'potential',    -- Matched but not contacted
    'contacted',    -- Initial outreach sent
    'active',       -- Engaged in project
    'obsolete'      -- Community-led, ACT no longer needed (Beautiful Obsolescence!)
  )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure either contact_id or person_id is provided
  CHECK (contact_id IS NOT NULL OR person_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_matches_contact
  ON project_contact_matches(contact_id);

CREATE INDEX IF NOT EXISTS idx_project_matches_person
  ON project_contact_matches(person_id);

CREATE INDEX IF NOT EXISTS idx_project_matches_project
  ON project_contact_matches(project_notion_id);

CREATE INDEX IF NOT EXISTS idx_project_matches_score
  ON project_contact_matches(alignment_score DESC);

CREATE INDEX IF NOT EXISTS idx_project_matches_source
  ON project_contact_matches(project_source);

CREATE INDEX IF NOT EXISTS idx_project_matches_status
  ON project_contact_matches(engagement_status);

CREATE INDEX IF NOT EXISTS idx_project_matches_alma
  ON project_contact_matches(alma_intervention_id)
  WHERE alma_intervention_id IS NOT NULL;

-- ============================================================================
-- 3. GOHIGHLEVEL ENGAGEMENT TRACKING
-- ============================================================================

-- Track Beautiful Obsolescence progress via GHL pipelines
CREATE TABLE IF NOT EXISTS ghl_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact references
  contact_id UUID REFERENCES linkedin_contacts(id) ON DELETE CASCADE,
  person_id UUID REFERENCES person_identity_map(person_id) ON DELETE CASCADE,
  ghl_contact_id TEXT, -- GoHighLevel internal ID

  -- Pipeline tracking
  pipeline_type TEXT CHECK (pipeline_type IN (
    'community',          -- Community Capability Building
    'partnership',        -- Strategic Partnerships
    'indigenous',         -- Indigenous Sovereignty
    'alma_youth_justice'  -- ALMA-specific: Youth Justice domain
  )),
  current_stage TEXT, -- discovery, ignition, thrust, trajectory, orbit

  -- Beautiful Obsolescence tracking
  act_energy_percent INTEGER CHECK (act_energy_percent IN (100, 60, 20, 0)),
  -- 100% = Ignition (100% ACT energy)
  --  60% = Thrust (60% ACT / 40% community)
  --  20% = Trajectory (20% ACT / 80% community)
  --   0% = Orbit (0% ACT / 100% independent) - BEAUTIFUL OBSOLESCENCE ACHIEVED!

  -- Engagement data
  last_engagement TIMESTAMPTZ,
  engagement_count INTEGER DEFAULT 0,
  obsolescence_achieved BOOLEAN DEFAULT FALSE, -- True when current_stage = 'orbit'
  trajectory_to_orbit TEXT, -- Projected date/milestone for independence

  -- Project linking (optional)
  project_match_id UUID REFERENCES project_contact_matches(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure either contact_id or person_id is provided
  CHECK (contact_id IS NOT NULL OR person_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ghl_contact
  ON ghl_engagement_metrics(contact_id);

CREATE INDEX IF NOT EXISTS idx_ghl_person
  ON ghl_engagement_metrics(person_id);

CREATE INDEX IF NOT EXISTS idx_ghl_ghl_id
  ON ghl_engagement_metrics(ghl_contact_id);

CREATE INDEX IF NOT EXISTS idx_ghl_pipeline
  ON ghl_engagement_metrics(pipeline_type);

CREATE INDEX IF NOT EXISTS idx_ghl_stage
  ON ghl_engagement_metrics(current_stage);

CREATE INDEX IF NOT EXISTS idx_ghl_obsolescence
  ON ghl_engagement_metrics(obsolescence_achieved);

CREATE INDEX IF NOT EXISTS idx_ghl_project_match
  ON ghl_engagement_metrics(project_match_id)
  WHERE project_match_id IS NOT NULL;

-- ============================================================================
-- 4. AUTOMATED UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for project_contact_matches
DROP TRIGGER IF EXISTS update_project_contact_matches_updated_at ON project_contact_matches;
CREATE TRIGGER update_project_contact_matches_updated_at
  BEFORE UPDATE ON project_contact_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ghl_engagement_metrics
DROP TRIGGER IF EXISTS update_ghl_engagement_metrics_updated_at ON ghl_engagement_metrics;
CREATE TRIGGER update_ghl_engagement_metrics_updated_at
  BEFORE UPDATE ON ghl_engagement_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE project_contact_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all project matches
CREATE POLICY "Allow authenticated read project_contact_matches"
  ON project_contact_matches
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access to project matches
CREATE POLICY "Allow service role all project_contact_matches"
  ON project_contact_matches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read engagement metrics
CREATE POLICY "Allow authenticated read ghl_engagement_metrics"
  ON ghl_engagement_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access to engagement metrics
CREATE POLICY "Allow service role all ghl_engagement_metrics"
  ON ghl_engagement_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: High-value project matches
CREATE OR REPLACE VIEW vw_high_value_project_matches AS
SELECT
  pcm.*,
  lc.full_name,
  lc.email_address,
  lc.linkedin_url,
  lc.current_company,
  lc.current_position,
  lc.strategic_value,
  lc.alignment_tags,
  pim.notion_person_id,
  pim.ghl_contact_id
FROM project_contact_matches pcm
LEFT JOIN linkedin_contacts lc ON pcm.contact_id = lc.id
LEFT JOIN person_identity_map pim ON pcm.person_id = pim.person_id
WHERE pcm.alignment_score >= 60
  AND pcm.engagement_status != 'obsolete'
ORDER BY pcm.alignment_score DESC, pcm.created_at DESC;

-- View: Beautiful Obsolescence progress
CREATE OR REPLACE VIEW vw_beautiful_obsolescence_progress AS
SELECT
  gem.pipeline_type,
  gem.current_stage,
  gem.act_energy_percent,
  COUNT(*) AS contact_count,
  SUM(CASE WHEN gem.obsolescence_achieved THEN 1 ELSE 0 END) AS obsolete_count,
  ROUND(
    100.0 * SUM(CASE WHEN gem.obsolescence_achieved THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) AS obsolescence_rate_percent
FROM ghl_engagement_metrics gem
GROUP BY gem.pipeline_type, gem.current_stage, gem.act_energy_percent
ORDER BY gem.pipeline_type, gem.act_energy_percent DESC;

-- View: ALMA intervention matches
CREATE OR REPLACE VIEW vw_alma_intervention_matches AS
SELECT
  pcm.*,
  lc.full_name,
  lc.email_address,
  lc.alignment_tags,
  lc.strategic_value
FROM project_contact_matches pcm
LEFT JOIN linkedin_contacts lc ON pcm.contact_id = lc.id
WHERE pcm.project_source = 'justicehub'
  AND pcm.alma_intervention_id IS NOT NULL
  AND pcm.alignment_score >= 60
ORDER BY pcm.alignment_score DESC;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT on views to authenticated users
GRANT SELECT ON vw_high_value_project_matches TO authenticated;
GRANT SELECT ON vw_beautiful_obsolescence_progress TO authenticated;
GRANT SELECT ON vw_alma_intervention_matches TO authenticated;

-- Grant all permissions on tables to service role
GRANT ALL ON project_contact_matches TO service_role;
GRANT ALL ON ghl_engagement_metrics TO service_role;

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE project_contact_matches IS
'Universal project-contact matching table that works across ALL ACT systems:
Placemat, JusticeHub (ALMA), Empathy Ledger, The Farm, Intelligence Hub.
Links enriched contacts to any ACT project using Notion project ID as universal reference.';

COMMENT ON COLUMN project_contact_matches.project_source IS
'Identifies which ACT system owns the project:
- placemat: ACT Placemat projects
- justicehub: JusticeHub / ALMA interventions
- farm: The Farm incubation projects
- empathy_ledger: Empathy Ledger story projects
- intelligence_hub: Intelligence Hub knowledge projects';

COMMENT ON COLUMN project_contact_matches.alma_intervention_id IS
'If project_source = "justicehub", this references the ALMA intervention (alma_interventions.id).
ALMA signal boost field contains additional scoring from ALMA portfolio analytics.';

COMMENT ON TABLE ghl_engagement_metrics IS
'Tracks Beautiful Obsolescence progress via GoHighLevel pipelines.
act_energy_percent shows journey from 100% ACT support → 0% (complete independence).
obsolescence_achieved = true when community no longer needs ACT (MISSION SUCCESS!).';

COMMENT ON COLUMN ghl_engagement_metrics.act_energy_percent IS
'Beautiful Obsolescence tracker (Rocket Booster Model):
100% = Ignition (fully ACT-supported)
 60% = Thrust (60% ACT / 40% community)
 20% = Trajectory (20% ACT / 80% community)
  0% = Orbit (100% community-owned, ACT obsolete)';

COMMENT ON VIEW vw_high_value_project_matches IS
'Shows all project-contact matches with alignment score ≥ 60.
Includes contact details, strategic value, and cross-system IDs (Notion, GHL).
Used for prioritizing outreach and CRM workflows.';

COMMENT ON VIEW vw_beautiful_obsolescence_progress IS
'Dashboard view showing Beautiful Obsolescence progress by pipeline.
Tracks how many contacts have achieved independence (obsolescence_achieved = true).
Higher obsolescence_rate_percent = more mission success!';

COMMENT ON VIEW vw_alma_intervention_matches IS
'Shows contacts matched to ALMA interventions (JusticeHub youth justice domain).
Filtered to high-alignment matches (≥60%) for funder intelligence packs.';

-- ============================================================================
-- SUCCESS! Migration Complete
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('project_contact_matches', 'ghl_engagement_metrics');

  IF table_count = 2 THEN
    RAISE NOTICE '✅ SUCCESS: Unified project matching tables created';
    RAISE NOTICE '📊 Tables: project_contact_matches, ghl_engagement_metrics';
    RAISE NOTICE '👁️  Views: vw_high_value_project_matches, vw_beautiful_obsolescence_progress, vw_alma_intervention_matches';
    RAISE NOTICE '🔐 RLS policies: Enabled for authenticated + service_role access';
    RAISE NOTICE '🌟 Ready for: Cross-system contact matching across ALL ACT projects';
  ELSE
    RAISE EXCEPTION 'Migration failed: Expected 2 tables, found %', table_count;
  END IF;
END $$;
