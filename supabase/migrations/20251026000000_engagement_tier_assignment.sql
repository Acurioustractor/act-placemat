-- Engagement Tier Assignment System
-- Automatically assigns contacts to tiers based on intelligence scores and interaction patterns

BEGIN;

-- ============================================
-- Ensure engagement_priority column exists
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'person_identity_map'
    AND column_name = 'engagement_priority'
  ) THEN
    ALTER TABLE person_identity_map
    ADD COLUMN engagement_priority TEXT DEFAULT 'low'
    CHECK (engagement_priority IN ('critical', 'high', 'medium', 'low'));

    CREATE INDEX idx_person_identity_engagement_priority
    ON person_identity_map(engagement_priority);
  END IF;
END $$;

-- ============================================
-- Function: Assign Engagement Tier
-- ============================================
-- Assigns a contact to one of 4 tiers based on:
-- - Composite intelligence score
-- - Interaction frequency and recency
-- - Project connections and roles
-- - Strategic value indicators

CREATE OR REPLACE FUNCTION assign_engagement_tier(person_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  tier TEXT := 'low';
  person_record person_identity_map;
  scores_record contact_intelligence_scores;
  recent_interactions INTEGER;
  project_connections INTEGER;
  has_strategic_role BOOLEAN := FALSE;
BEGIN
  -- Get person data
  SELECT * INTO person_record
  FROM person_identity_map
  WHERE person_id = person_uuid;

  -- Get intelligence scores
  SELECT * INTO scores_record
  FROM contact_intelligence_scores
  WHERE person_id = person_uuid;

  -- Count recent interactions (last 6 months)
  SELECT COUNT(*) INTO recent_interactions
  FROM contact_interactions
  WHERE person_id = person_uuid
    AND interaction_date > NOW() - INTERVAL '6 months';

  -- Count project connections
  SELECT COUNT(*) INTO project_connections
  FROM linkedin_project_connections
  WHERE contact_id = person_uuid;

  -- Check for strategic roles
  SELECT EXISTS (
    SELECT 1 FROM linkedin_project_connections
    WHERE contact_id = person_uuid
      AND connection_type IN ('funder', 'board_member', 'project_lead', 'key_partner')
  ) INTO has_strategic_role;

  -- Tier 1: Core Partners (CRITICAL)
  -- Promote to Notion for Beautiful Obsolescence tracking
  IF (
    (scores_record.composite_score >= 80) OR
    (scores_record.influence_score >= 90) OR
    (scores_record.strategic_value_score >= 85) OR
    (person_record.youth_justice_relevance_score >= 90) OR
    has_strategic_role OR
    (recent_interactions >= 10 AND scores_record.response_likelihood >= 80)
  ) THEN
    tier := 'critical';

  -- Tier 2: Active Network (HIGH)
  -- Quarterly tailored engagement
  ELSIF (
    (scores_record.composite_score >= 70) OR
    (scores_record.engagement_readiness >= 80) OR
    (scores_record.response_likelihood >= 70 AND scores_record.accessibility_score >= 60) OR
    (recent_interactions >= 5) OR
    (project_connections >= 3)
  ) THEN
    tier := 'high';

  -- Tier 3: Warm Network (MEDIUM)
  -- General newsletters
  ELSIF (
    (scores_record.composite_score >= 40) OR
    (scores_record.accessibility_score >= 50) OR
    (recent_interactions >= 1) OR
    (project_connections >= 1) OR
    (person_record.email IS NOT NULL AND
     EXISTS (
       SELECT 1 FROM contact_interactions
       WHERE person_id = person_uuid
         AND interaction_date > NOW() - INTERVAL '12 months'
     ))
  ) THEN
    tier := 'medium';

  -- Tier 4: Broad Network (LOW)
  -- Annual summary only
  ELSE
    tier := 'low';
  END IF;

  -- Update the person record
  UPDATE person_identity_map
  SET engagement_priority = tier,
      updated_at = NOW()
  WHERE person_id = person_uuid;

  RETURN tier;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Batch Assign All Tiers
-- ============================================
CREATE OR REPLACE FUNCTION batch_assign_engagement_tiers()
RETURNS TABLE(
  tier TEXT,
  count BIGINT
) AS $$
DECLARE
  person_rec RECORD;
  assigned_tier TEXT;
BEGIN
  -- Loop through all contacts with intelligence scores
  FOR person_rec IN
    SELECT p.person_id
    FROM person_identity_map p
    LEFT JOIN contact_intelligence_scores s ON p.person_id = s.person_id
    WHERE p.email IS NOT NULL  -- Only process contacts with emails
  LOOP
    -- Assign tier
    SELECT assign_engagement_tier(person_rec.person_id) INTO assigned_tier;
  END LOOP;

  -- Return distribution
  RETURN QUERY
  SELECT
    p.engagement_priority as tier,
    COUNT(*) as count
  FROM person_identity_map p
  WHERE p.email IS NOT NULL
  GROUP BY p.engagement_priority
  ORDER BY
    CASE p.engagement_priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- View: Notion Promotion Candidates
-- ============================================
-- Contacts in Tier 1 (critical) that aren't synced to Notion yet
CREATE OR REPLACE VIEW vw_notion_promotion_candidates AS
SELECT
  p.person_id,
  p.full_name,
  p.email,
  p.current_position,
  p.current_company,
  p.sector,
  p.engagement_priority,
  s.composite_score,
  s.influence_score,
  s.strategic_value_score,
  s.engagement_readiness,
  p.youth_justice_relevance_score,
  (SELECT COUNT(*) FROM contact_interactions ci WHERE ci.person_id = p.person_id) as total_interactions,
  (SELECT MAX(ci.interaction_date) FROM contact_interactions ci WHERE ci.person_id = p.person_id) as last_interaction,
  (SELECT COUNT(*) FROM linkedin_project_connections lpc WHERE lpc.contact_id = p.person_id) as project_count,
  (SELECT ARRAY_AGG(DISTINCT lpc.project_name) FROM linkedin_project_connections lpc WHERE lpc.contact_id = p.person_id) as connected_projects,
  p.alignment_tags,
  p.data_source,
  p.created_at,
  p.updated_at
FROM person_identity_map p
LEFT JOIN contact_intelligence_scores s ON p.person_id = s.person_id
WHERE p.engagement_priority = 'critical'
  AND p.notion_person_id IS NULL
  AND p.email IS NOT NULL
ORDER BY
  s.composite_score DESC NULLS LAST,
  s.strategic_value_score DESC NULLS LAST,
  p.youth_justice_relevance_score DESC;

-- ============================================
-- View: Newsletter Segmentation
-- ============================================
CREATE OR REPLACE VIEW vw_newsletter_segments AS
SELECT
  p.person_id,
  p.full_name,
  p.email,
  p.engagement_priority,
  p.alignment_tags,
  p.sector,
  p.indigenous_affiliation,
  s.composite_score,
  CASE p.engagement_priority
    WHEN 'critical' THEN 'executive_summary'
    WHEN 'high' THEN 'tailored_content'
    WHEN 'medium' THEN 'general_newsletter'
    WHEN 'low' THEN 'annual_summary'
  END as newsletter_type,
  CASE p.engagement_priority
    WHEN 'critical' THEN 'monthly'
    WHEN 'high' THEN 'quarterly'
    WHEN 'medium' THEN 'quarterly'
    WHEN 'low' THEN 'annual'
  END as frequency,
  (SELECT ARRAY_AGG(DISTINCT lpc.project_name) FROM linkedin_project_connections lpc WHERE lpc.contact_id = p.person_id) as connected_projects,
  (SELECT MAX(ci.interaction_date) FROM contact_interactions ci WHERE ci.person_id = p.person_id) as last_interaction
FROM person_identity_map p
LEFT JOIN contact_intelligence_scores s ON p.person_id = s.person_id
WHERE p.email IS NOT NULL
ORDER BY
  CASE p.engagement_priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  s.composite_score DESC NULLS LAST;

-- ============================================
-- View: Tier Distribution Statistics
-- ============================================
CREATE OR REPLACE VIEW vw_engagement_tier_stats AS
SELECT
  engagement_priority as tier,
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN notion_person_id IS NOT NULL THEN 1 END) as synced_to_notion,
  AVG((SELECT s.composite_score FROM contact_intelligence_scores s WHERE s.person_id = person_identity_map.person_id)) as avg_composite_score,
  COUNT(CASE WHEN sector = 'government' THEN 1 END) as government_contacts,
  COUNT(CASE WHEN indigenous_affiliation = true THEN 1 END) as indigenous_contacts,
  COUNT(CASE WHEN (SELECT COUNT(*) FROM linkedin_project_connections lpc WHERE lpc.contact_id = person_identity_map.person_id) > 0 THEN 1 END) as with_project_connections,
  COUNT(CASE WHEN (SELECT COUNT(*) FROM contact_interactions ci WHERE ci.person_id = person_identity_map.person_id AND ci.interaction_date > NOW() - INTERVAL '6 months') > 0 THEN 1 END) as active_last_6_months
FROM person_identity_map
WHERE email IS NOT NULL
GROUP BY engagement_priority
ORDER BY
  CASE engagement_priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

-- ============================================
-- Function: Should Promote to Notion
-- ============================================
-- Business logic for determining if a contact should be in Notion
CREATE OR REPLACE FUNCTION should_promote_to_notion(person_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  person_record person_identity_map;
  scores_record contact_intelligence_scores;
  mention_count INTEGER;
BEGIN
  SELECT * INTO person_record FROM person_identity_map WHERE person_id = person_uuid;
  SELECT * INTO scores_record FROM contact_intelligence_scores WHERE person_id = person_uuid;

  -- Already in Notion
  IF person_record.notion_person_id IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Must be Tier 1 (critical)
  IF person_record.engagement_priority != 'critical' THEN
    RETURN FALSE;
  END IF;

  -- Count mentions across project connections
  SELECT COALESCE(SUM(relevance_score * 100), 0)::INTEGER INTO mention_count
  FROM linkedin_project_connections
  WHERE contact_id = person_uuid;

  -- Promotion criteria
  RETURN (
    scores_record.composite_score >= 80 OR
    scores_record.strategic_value_score >= 85 OR
    mention_count >= 20 OR  -- Mentioned a lot across projects
    EXISTS (
      SELECT 1 FROM linkedin_project_connections
      WHERE contact_id = person_uuid
        AND connection_type IN ('funder', 'board_member', 'project_lead')
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-assign tier on score update
-- ============================================
CREATE OR REPLACE FUNCTION auto_assign_tier_on_score_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM assign_engagement_tier(NEW.person_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_assign_tier ON contact_intelligence_scores;
CREATE TRIGGER trigger_auto_assign_tier
  AFTER INSERT OR UPDATE ON contact_intelligence_scores
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_tier_on_score_update();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON FUNCTION assign_engagement_tier IS 'Assigns a contact to one of 4 engagement tiers (critical/high/medium/low) based on intelligence scores and interaction patterns';
COMMENT ON FUNCTION batch_assign_engagement_tiers IS 'Runs tier assignment for all contacts and returns distribution statistics';
COMMENT ON FUNCTION should_promote_to_notion IS 'Returns true if a contact meets criteria for Notion promotion';
COMMENT ON VIEW vw_notion_promotion_candidates IS 'Tier 1 contacts ready for review and Notion promotion';
COMMENT ON VIEW vw_newsletter_segments IS 'Newsletter audience segmentation by engagement tier';
COMMENT ON VIEW vw_engagement_tier_stats IS 'Distribution statistics for all engagement tiers';

COMMIT;
