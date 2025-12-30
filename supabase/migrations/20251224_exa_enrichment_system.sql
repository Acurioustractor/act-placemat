-- Exa.ai Enrichment System
-- Purpose: Automated people intelligence enrichment using Exa.ai API
-- Focus: Goods on Country & JusticeHub campaigns
-- Free tier: 1,000 requests/month, manual sync triggers

-- Add Exa enrichment columns to person_identity_map
ALTER TABLE person_identity_map
ADD COLUMN IF NOT EXISTS exa_enriched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exa_enriched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exa_enrichment_confidence DECIMAL(3,2) CHECK (exa_enrichment_confidence >= 0 AND exa_enrichment_confidence <= 1),
ADD COLUMN IF NOT EXISTS exa_last_refresh_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exa_refresh_needed BOOLEAN DEFAULT FALSE;

-- Exa LinkedIn profile data (extracted from Exa search)
CREATE TABLE IF NOT EXISTS exa_linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE UNIQUE,

  -- Profile data from Exa
  linkedin_url TEXT,
  headline TEXT,
  summary TEXT,
  current_position TEXT,
  current_company TEXT,
  location TEXT,

  -- Experience history (JSONB array)
  experience JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ company, title, duration, description, start_date, end_date }]

  -- Education history (JSONB array)
  education JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ school, degree, field, start_year, end_year }]

  -- Skills extracted
  skills TEXT[] DEFAULT '{}',

  -- Raw Exa search result
  exa_raw_data JSONB,

  -- Metadata
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_url TEXT, -- Actual URL Exa found (may differ from person's linkedin_contact_id)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exa company intelligence data
CREATE TABLE IF NOT EXISTS exa_company_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL UNIQUE,

  -- Company basics
  industry TEXT,
  company_size TEXT, -- e.g., "50-200 employees"
  headquarters_location TEXT,
  founded_year INTEGER,
  description TEXT,
  website TEXT,

  -- Leadership
  leadership JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ name, title, linkedin_url }]

  -- Recent news & mentions
  recent_news JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ title, url, published_date, excerpt }]

  -- Funding & financial (if available)
  funding_info JSONB,
  -- Format: { total_funding, last_round, investors[] }

  -- Social presence
  twitter_handle TEXT,
  linkedin_company_url TEXT,

  -- Raw Exa data
  exa_raw_data JSONB,

  -- Metadata
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exa media mentions (news articles, interviews, etc.)
CREATE TABLE IF NOT EXISTS exa_media_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,

  -- Article data from Exa
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_date TIMESTAMPTZ,
  source_domain TEXT, -- e.g., "abc.net.au", "theguardian.com"
  excerpt TEXT,
  full_text TEXT,

  -- Classification
  mention_type TEXT CHECK (mention_type IN ('article', 'interview', 'quote', 'mention', 'byline')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),

  -- Topics/tags extracted
  topics TEXT[] DEFAULT '{}',

  -- Metadata
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(person_id, url)
);

-- Exa enrichment queue (manual trigger, campaign-specific)
CREATE TABLE IF NOT EXISTS exa_enrichment_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES person_identity_map(person_id) ON DELETE CASCADE,

  -- Campaign context (Goods on Country or JusticeHub)
  campaign_type TEXT CHECK (campaign_type IN ('goods-on-country', 'justice-hub', 'general')),
  campaign_id UUID, -- References contact_campaigns(id) - constraint added later

  -- Priority (0-100, higher = more urgent)
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),

  -- Error tracking
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  -- Enrichment scope (what to enrich)
  enrich_linkedin BOOLEAN DEFAULT TRUE,
  enrich_company BOOLEAN DEFAULT TRUE,
  enrich_media BOOLEAN DEFAULT TRUE,
  enrich_network BOOLEAN DEFAULT FALSE, -- Find similar people (uses more requests)

  -- Timing
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Cost tracking (Exa free tier: 1,000/month)
  exa_requests_used INTEGER DEFAULT 0,
  estimated_cost_requests INTEGER DEFAULT 3, -- LinkedIn + Company + Media = ~3 requests

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(person_id, campaign_type)
);

-- Exa API usage tracking (monitor free tier limits)
CREATE TABLE IF NOT EXISTS exa_api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Usage period
  period_month DATE NOT NULL, -- First day of month (e.g., 2025-12-01)

  -- Request counts
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,

  -- Free tier limit tracking
  free_tier_limit INTEGER NOT NULL DEFAULT 1000,
  free_tier_remaining INTEGER NOT NULL DEFAULT 1000,
  free_tier_exceeded BOOLEAN DEFAULT FALSE,

  -- Request breakdown by type
  linkedin_requests INTEGER DEFAULT 0,
  company_requests INTEGER DEFAULT 0,
  media_requests INTEGER DEFAULT 0,
  network_discovery_requests INTEGER DEFAULT 0,

  -- Cost tracking (if we upgrade from free tier)
  estimated_cost_usd DECIMAL(10,2) DEFAULT 0.00,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(period_month)
);

-- Indexes for performance

-- Find unenriched people
CREATE INDEX IF NOT EXISTS idx_person_exa_unenriched
ON person_identity_map(exa_enriched, engagement_priority)
WHERE exa_enriched = FALSE;

-- Find people needing refresh
CREATE INDEX IF NOT EXISTS idx_person_exa_refresh_needed
ON person_identity_map(exa_refresh_needed, exa_last_refresh_at)
WHERE exa_refresh_needed = TRUE;

-- Queue processing order
CREATE INDEX IF NOT EXISTS idx_exa_queue_pending
ON exa_enrichment_queue(priority DESC, queued_at)
WHERE status = 'pending';

-- Campaign-specific queues
CREATE INDEX IF NOT EXISTS idx_exa_queue_campaign
ON exa_enrichment_queue(campaign_type, status, priority DESC);

-- Person lookup in LinkedIn profiles
CREATE INDEX IF NOT EXISTS idx_exa_linkedin_person
ON exa_linkedin_profiles(person_id);

-- Company lookup
CREATE INDEX IF NOT EXISTS idx_exa_company_name
ON exa_company_intelligence(company_name);

-- Media mentions by person and date
CREATE INDEX IF NOT EXISTS idx_exa_media_person_date
ON exa_media_mentions(person_id, published_date DESC);

-- Media mentions by relevance
CREATE INDEX IF NOT EXISTS idx_exa_media_relevance
ON exa_media_mentions(relevance_score DESC, published_date DESC);

-- Full-text search on media mentions
CREATE INDEX IF NOT EXISTS idx_exa_media_fulltext
ON exa_media_mentions USING GIN(to_tsvector('english', title || ' ' || COALESCE(excerpt, '')));

-- Functions

-- Function: Queue person for Exa enrichment
CREATE OR REPLACE FUNCTION queue_for_exa_enrichment(
  p_person_id UUID,
  p_campaign_type TEXT DEFAULT 'general',
  p_priority INTEGER DEFAULT 50,
  p_enrich_network BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_existing_status TEXT;
BEGIN
  -- Check if already in queue
  SELECT status INTO v_existing_status
  FROM exa_enrichment_queue
  WHERE person_id = p_person_id AND campaign_type = p_campaign_type;

  IF v_existing_status = 'completed' THEN
    -- Already enriched, skip
    RAISE NOTICE 'Person already enriched for campaign %', p_campaign_type;
    RETURN NULL;
  ELSIF v_existing_status = 'pending' OR v_existing_status = 'processing' THEN
    -- Already queued, just update priority if higher
    UPDATE exa_enrichment_queue
    SET priority = GREATEST(priority, p_priority),
        enrich_network = enrich_network OR p_enrich_network
    WHERE person_id = p_person_id AND campaign_type = p_campaign_type
    RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
  ELSE
    -- New queue entry or failed previous attempt
    INSERT INTO exa_enrichment_queue (
      person_id,
      campaign_type,
      priority,
      enrich_network
    )
    VALUES (p_person_id, p_campaign_type, p_priority, p_enrich_network)
    ON CONFLICT (person_id, campaign_type) DO UPDATE
    SET priority = GREATEST(exa_enrichment_queue.priority, EXCLUDED.priority),
        status = 'pending',
        enrich_network = exa_enrichment_queue.enrich_network OR EXCLUDED.enrich_network,
        retry_count = 0,
        error_message = NULL
    RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Bulk queue campaign contacts for enrichment
CREATE OR REPLACE FUNCTION queue_campaign_for_enrichment(
  p_campaign_id UUID,
  p_campaign_type TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  v_queued_count INTEGER := 0;
  v_person RECORD;
BEGIN
  -- Get campaign contacts not yet enriched
  FOR v_person IN
    SELECT cca.person_id, cca.priority_score
    FROM contact_campaign_assignments cca
    JOIN person_identity_map pim ON cca.person_id = pim.person_id
    WHERE cca.campaign_id = p_campaign_id
      AND (pim.exa_enriched = FALSE OR pim.exa_refresh_needed = TRUE)
      AND cca.status NOT IN ('declined', 'no_response')
    ORDER BY cca.priority_score DESC NULLS LAST
    LIMIT p_limit
  LOOP
    PERFORM queue_for_exa_enrichment(
      v_person.person_id,
      p_campaign_type,
      COALESCE(v_person.priority_score, 50)::integer
    );
    v_queued_count := v_queued_count + 1;
  END LOOP;

  RETURN v_queued_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get next batch from queue
CREATE OR REPLACE FUNCTION get_next_exa_batch(
  p_batch_size INTEGER DEFAULT 10,
  p_campaign_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  queue_id UUID,
  person_id UUID,
  person_name TEXT,
  person_email TEXT,
  current_company TEXT,
  campaign_type TEXT,
  priority INTEGER,
  enrich_linkedin BOOLEAN,
  enrich_company BOOLEAN,
  enrich_media BOOLEAN,
  enrich_network BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eq.id AS queue_id,
    eq.person_id,
    pim.full_name AS person_name,
    pim.email AS person_email,
    pim.current_company,
    eq.campaign_type,
    eq.priority,
    eq.enrich_linkedin,
    eq.enrich_company,
    eq.enrich_media,
    eq.enrich_network
  FROM exa_enrichment_queue eq
  JOIN person_identity_map pim ON eq.person_id = pim.person_id
  WHERE eq.status = 'pending'
    AND (p_campaign_type IS NULL OR eq.campaign_type = p_campaign_type)
    AND eq.retry_count < 3
  ORDER BY eq.priority DESC, eq.queued_at
  LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;

-- Function: Update API usage tracking
CREATE OR REPLACE FUNCTION track_exa_api_usage(
  p_requests_used INTEGER,
  p_request_type TEXT DEFAULT 'general'
)
RETURNS VOID AS $$
DECLARE
  v_current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  v_free_tier_limit INTEGER := 1000;
BEGIN
  -- Upsert usage for current month
  INSERT INTO exa_api_usage (
    period_month,
    total_requests,
    successful_requests,
    free_tier_limit,
    free_tier_remaining
  )
  VALUES (
    v_current_month,
    p_requests_used,
    p_requests_used,
    v_free_tier_limit,
    v_free_tier_limit - p_requests_used
  )
  ON CONFLICT (period_month) DO UPDATE
  SET total_requests = exa_api_usage.total_requests + p_requests_used,
      successful_requests = exa_api_usage.successful_requests + p_requests_used,
      free_tier_remaining = GREATEST(0, exa_api_usage.free_tier_remaining - p_requests_used),
      free_tier_exceeded = (exa_api_usage.total_requests + p_requests_used) > v_free_tier_limit,
      updated_at = NOW();

  -- Track by request type
  IF p_request_type = 'linkedin' THEN
    UPDATE exa_api_usage
    SET linkedin_requests = linkedin_requests + p_requests_used
    WHERE period_month = v_current_month;
  ELSIF p_request_type = 'company' THEN
    UPDATE exa_api_usage
    SET company_requests = company_requests + p_requests_used
    WHERE period_month = v_current_month;
  ELSIF p_request_type = 'media' THEN
    UPDATE exa_api_usage
    SET media_requests = media_requests + p_requests_used
    WHERE period_month = v_current_month;
  ELSIF p_request_type = 'network' THEN
    UPDATE exa_api_usage
    SET network_discovery_requests = network_discovery_requests + p_requests_used
    WHERE period_month = v_current_month;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Views

-- View: Enrichment candidates for Goods on Country campaign
CREATE OR REPLACE VIEW vw_goods_enrichment_candidates AS
SELECT
  p.person_id,
  p.full_name,
  p.email,
  p.current_company,
  p.current_position,
  p.tags,
  p.engagement_priority,
  p.exa_enriched,
  p.exa_enriched_at,
  cis.composite_score,
  cis.influence_score,
  CASE
    WHEN p.engagement_priority = 'critical' THEN 100
    WHEN p.engagement_priority = 'high' THEN 75
    WHEN p.engagement_priority = 'medium' THEN 50
    ELSE 25
  END AS enrichment_priority
FROM person_identity_map p
LEFT JOIN contact_intelligence_scores cis ON p.person_id = cis.person_id
WHERE p.exa_enriched = FALSE
  AND p.email IS NOT NULL
  AND (
    'goods-on-country' = ANY(p.tags)
    OR 'circular-economy' = ANY(p.tags)
    OR 'indigenous-business' = ANY(p.tags)
    OR 'sustainable-products' = ANY(p.tags)
    OR p.sector = 'retail'
    OR p.sector = 'manufacturing'
  )
ORDER BY enrichment_priority DESC, cis.composite_score DESC NULLS LAST;

-- View: Enrichment candidates for JusticeHub campaign
CREATE OR REPLACE VIEW vw_justice_enrichment_candidates AS
SELECT
  p.person_id,
  p.full_name,
  p.email,
  p.current_company,
  p.current_position,
  p.tags,
  p.engagement_priority,
  p.youth_justice_relevance_score,
  p.exa_enriched,
  p.exa_enriched_at,
  cis.composite_score,
  cis.influence_score,
  CASE
    WHEN p.engagement_priority = 'critical' THEN 100
    WHEN p.engagement_priority = 'high' THEN 75
    WHEN p.youth_justice_relevance_score > 70 THEN 80
    WHEN p.engagement_priority = 'medium' THEN 50
    ELSE 25
  END AS enrichment_priority
FROM person_identity_map p
LEFT JOIN contact_intelligence_scores cis ON p.person_id = cis.person_id
WHERE p.exa_enriched = FALSE
  AND p.email IS NOT NULL
  AND (
    p.youth_justice_relevance_score > 50
    OR 'youth-justice' = ANY(p.tags)
    OR 'juvenile-justice' = ANY(p.tags)
    OR 'restorative-justice' = ANY(p.tags)
    OR 'indigenous-youth' = ANY(p.tags)
  )
ORDER BY enrichment_priority DESC, p.youth_justice_relevance_score DESC NULLS LAST, cis.composite_score DESC NULLS LAST;

-- View: Exa API usage summary
CREATE OR REPLACE VIEW vw_exa_usage_summary AS
SELECT
  period_month,
  total_requests,
  successful_requests,
  failed_requests,
  free_tier_limit,
  free_tier_remaining,
  free_tier_exceeded,
  linkedin_requests,
  company_requests,
  media_requests,
  network_discovery_requests,
  ROUND((total_requests::decimal / free_tier_limit) * 100, 2) AS usage_percentage,
  estimated_cost_usd
FROM exa_api_usage
ORDER BY period_month DESC;

-- View: Enrichment queue status
CREATE OR REPLACE VIEW vw_exa_queue_summary AS
SELECT
  campaign_type,
  status,
  COUNT(*) AS count,
  AVG(priority) AS avg_priority,
  MIN(queued_at) AS oldest_queued,
  MAX(queued_at) AS newest_queued
FROM exa_enrichment_queue
GROUP BY campaign_type, status
ORDER BY campaign_type, status;

-- RLS Policies

ALTER TABLE exa_linkedin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exa_company_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE exa_media_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exa_enrichment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE exa_api_usage ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to exa_linkedin_profiles"
ON exa_linkedin_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to exa_company_intelligence"
ON exa_company_intelligence FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to exa_media_mentions"
ON exa_media_mentions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to exa_enrichment_queue"
ON exa_enrichment_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to exa_api_usage"
ON exa_api_usage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read (for dashboard)
CREATE POLICY "Authenticated read exa_linkedin_profiles"
ON exa_linkedin_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read exa_company_intelligence"
ON exa_company_intelligence FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read exa_media_mentions"
ON exa_media_mentions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read exa_enrichment_queue"
ON exa_enrichment_queue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read exa_api_usage"
ON exa_api_usage FOR SELECT TO authenticated USING (true);

-- Comments

COMMENT ON TABLE exa_linkedin_profiles IS 'LinkedIn profile data enriched via Exa.ai neural search';
COMMENT ON TABLE exa_company_intelligence IS 'Company/organization intelligence gathered via Exa.ai';
COMMENT ON TABLE exa_media_mentions IS 'Media mentions, articles, interviews found via Exa.ai';
COMMENT ON TABLE exa_enrichment_queue IS 'Queue for manual-triggered Exa enrichment (campaign-specific)';
COMMENT ON TABLE exa_api_usage IS 'Track Exa.ai API usage against free tier limits (1,000/month)';

COMMENT ON COLUMN exa_enrichment_queue.campaign_type IS 'goods-on-country or justice-hub - focuses enrichment on specific campaign needs';
COMMENT ON COLUMN exa_enrichment_queue.estimated_cost_requests IS 'Estimated Exa API requests needed (LinkedIn + Company + Media ≈ 3 requests)';
COMMENT ON COLUMN exa_api_usage.free_tier_remaining IS 'Requests remaining in free tier (resets monthly)';

-- Initialize current month usage tracking
INSERT INTO exa_api_usage (period_month, free_tier_limit, free_tier_remaining)
VALUES (DATE_TRUNC('month', CURRENT_DATE), 1000, 1000)
ON CONFLICT (period_month) DO NOTHING;

-- Add foreign key constraint for campaign_id (done after table creation to avoid circular dependency issues)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exa_enrichment_queue_campaign_id_fkey'
  ) THEN
    ALTER TABLE exa_enrichment_queue
    ADD CONSTRAINT exa_enrichment_queue_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES contact_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Sample queries (as SQL comments for reference)
/*
-- Queue top 100 Goods on Country contacts for enrichment
SELECT queue_campaign_for_enrichment(
  (SELECT id FROM contact_campaigns WHERE campaign_type = 'goods_on_country' LIMIT 1),
  'goods-on-country',
  100
);

-- Queue top 100 JusticeHub contacts for enrichment
SELECT queue_campaign_for_enrichment(
  (SELECT id FROM contact_campaigns WHERE campaign_type = 'justice_hub' LIMIT 1),
  'justice-hub',
  100
);

-- Get next 10 pending enrichments
SELECT * FROM get_next_exa_batch(10, 'goods-on-country');

-- Check Exa API usage this month
SELECT * FROM vw_exa_usage_summary WHERE period_month = DATE_TRUNC('month', CURRENT_DATE);

-- View all Goods enrichment candidates
SELECT * FROM vw_goods_enrichment_candidates LIMIT 20;

-- View all Justice enrichment candidates
SELECT * FROM vw_justice_enrichment_candidates LIMIT 20;

-- Check queue status
SELECT * FROM vw_exa_queue_summary;

-- Find people with media mentions
SELECT p.full_name, COUNT(emm.*) as mention_count
FROM person_identity_map p
JOIN exa_media_mentions emm ON p.person_id = emm.person_id
GROUP BY p.person_id, p.full_name
ORDER BY mention_count DESC;
*/
