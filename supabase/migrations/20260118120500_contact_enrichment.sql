-- Contact Enrichment Tables
-- Migration: 20260118120500_contact_enrichment
-- Source: act-personal-ai/supabase/migrations/20260108030000_contact_enrichment.sql
--
-- Supports review-first workflow for importing contacts from email to GHL
-- Includes tag inference rules and ignored email patterns

-- ============================================
-- Contact Review Decisions
-- ============================================
-- Tracks review decisions for email contacts before GHL import
CREATE TABLE IF NOT EXISTS contact_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  normalized_email TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  name TEXT,
  domain TEXT,
  decision TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approve', 'ignore'
  suggested_tags TEXT[] DEFAULT '{}',
  approved_tags TEXT[] DEFAULT '{}',
  source_context JSONB DEFAULT '{}', -- email subjects, dates, communication stats
  ghl_contact_id TEXT, -- Populated after GHL sync
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contact review
CREATE INDEX IF NOT EXISTS idx_contact_review_email ON contact_review_decisions(normalized_email);
CREATE INDEX IF NOT EXISTS idx_contact_review_decision ON contact_review_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_contact_review_domain ON contact_review_decisions(domain);

-- ============================================
-- Tag Inference Rules
-- ============================================
-- Configurable rules for auto-suggesting tags
CREATE TABLE IF NOT EXISTS tag_inference_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL, -- 'domain', 'keyword', 'email_pattern'
  match_value TEXT NOT NULL, -- domain name, keyword, or regex pattern
  tags TEXT[] NOT NULL, -- tags to apply when rule matches
  priority INTEGER DEFAULT 0, -- higher priority rules apply first
  active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint to prevent duplicate rules
CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_rules_unique ON tag_inference_rules(rule_type, match_value);

-- ============================================
-- Ignored Email Patterns
-- ============================================
-- Known patterns to filter out (newsletters, system emails, etc.)
CREATE TABLE IF NOT EXISTS ignored_email_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL, -- 'domain', 'prefix', 'contains'
  pattern TEXT NOT NULL,
  reason TEXT, -- 'newsletter', 'system', 'bounce', 'marketing'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint to prevent duplicate patterns
CREATE UNIQUE INDEX IF NOT EXISTS idx_ignored_patterns_unique ON ignored_email_patterns(pattern_type, pattern);

-- ============================================
-- Seed Initial Ignore Patterns
-- ============================================
INSERT INTO ignored_email_patterns (pattern_type, pattern, reason) VALUES
  -- Bounce/system addresses
  ('contains', 'bounce', 'bounce'),
  ('contains', 'amazonses', 'system'),
  ('contains', 'noreply', 'system'),
  ('contains', 'no-reply', 'system'),
  ('contains', 'mailer-daemon', 'system'),
  ('contains', 'postmaster', 'system'),
  ('prefix', 'notifications@', 'system'),

  -- Newsletter services
  ('domain', 'beehiiv.com', 'newsletter'),
  ('domain', 'mail.beehiiv.com', 'newsletter'),
  ('domain', 'substack.com', 'newsletter'),
  ('domain', 'skool.com', 'newsletter'),
  ('domain', 'mailchimp.com', 'newsletter'),
  ('domain', 'convertkit.com', 'newsletter'),
  ('domain', 'buttondown.email', 'newsletter'),
  ('domain', 'revue.email', 'newsletter'),
  ('domain', 'getrevue.co', 'newsletter'),

  -- Marketing platforms
  ('domain', 'hubspot.com', 'marketing'),
  ('domain', 'mailgun.com', 'marketing'),
  ('domain', 'sendgrid.net', 'marketing'),
  ('domain', 'intercom.io', 'marketing'),

  -- Common automated senders
  ('domain', 'github.com', 'system'),
  ('domain', 'gitlab.com', 'system'),
  ('domain', 'notion.so', 'system'),
  ('domain', 'slack.com', 'system'),
  ('domain', 'stripe.com', 'system'),
  ('domain', 'dropbox.com', 'system'),
  ('domain', 'google.com', 'system'),
  ('domain', 'calendar-notification.google.com', 'system'),
  ('domain', 'facebookmail.com', 'system'),
  ('domain', 'linkedin.com', 'marketing')
ON CONFLICT DO NOTHING;

-- ============================================
-- Seed Initial Tag Inference Rules
-- ============================================
INSERT INTO tag_inference_rules (rule_type, match_value, tags, priority, description) VALUES
  -- Government domains
  ('domain', '.gov.au', ARRAY['government'], 10, 'Australian government'),
  ('domain', '.gov', ARRAY['government'], 10, 'Government domain'),
  ('domain', 'qld.gov.au', ARRAY['government', 'queensland'], 15, 'Queensland government'),

  -- ACT project domains
  ('domain', 'diagrama.org', ARRAY['diagrama', 'youth-justice'], 20, 'Diagrama Foundation'),
  ('domain', 'justicehub.org', ARRAY['justicehub'], 20, 'JusticeHub'),

  -- Keywords in subject/context
  ('keyword', 'justice', ARRAY['justice'], 5, 'Justice-related'),
  ('keyword', 'youth justice', ARRAY['youth-justice'], 8, 'Youth justice'),
  ('keyword', 'indigenous', ARRAY['indigenous', 'first-nations'], 8, 'Indigenous focus'),
  ('keyword', 'first nations', ARRAY['indigenous', 'first-nations'], 8, 'First Nations'),
  ('keyword', 'aboriginal', ARRAY['indigenous', 'first-nations'], 8, 'Aboriginal'),
  ('keyword', 'regenerative', ARRAY['regenerative'], 5, 'Regenerative'),
  ('keyword', 'investment', ARRAY['investment', 'funder'], 5, 'Investment related'),
  ('keyword', 'funding', ARRAY['funder'], 5, 'Funding related'),
  ('keyword', 'grant', ARRAY['funder'], 5, 'Grant related'),
  ('keyword', 'donate', ARRAY['funder'], 5, 'Donation related'),
  ('keyword', 'partner', ARRAY['partner'], 5, 'Partnership'),
  ('keyword', 'collaboration', ARRAY['partner'], 5, 'Collaboration')
ON CONFLICT DO NOTHING;

-- ============================================
-- Update trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_contact_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_review_updated ON contact_review_decisions;
CREATE TRIGGER contact_review_updated
  BEFORE UPDATE ON contact_review_decisions
  FOR EACH ROW EXECUTE FUNCTION update_contact_review_timestamp();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE contact_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_inference_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ignored_email_patterns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access on contact_review_decisions"
    ON contact_review_decisions FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on tag_inference_rules"
    ON tag_inference_rules FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on ignored_email_patterns"
    ON ignored_email_patterns FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Read access for authenticated users
DO $$ BEGIN
  CREATE POLICY "Authenticated read access on contact_review_decisions"
    ON contact_review_decisions FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read access on tag_inference_rules"
    ON tag_inference_rules FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read access on ignored_email_patterns"
    ON ignored_email_patterns FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE contact_review_decisions IS 'Review decisions for email contacts before GHL import';
COMMENT ON TABLE tag_inference_rules IS 'Configurable rules for auto-suggesting contact tags based on domain, keywords, etc.';
COMMENT ON TABLE ignored_email_patterns IS 'Known patterns to filter out (newsletters, system emails, marketing)';
