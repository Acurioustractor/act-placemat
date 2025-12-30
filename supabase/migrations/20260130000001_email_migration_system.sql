-- =====================================================
-- Email Migration System for Subscription Management
-- Purpose: Track automated vendor email migration to accounts@act.place
-- Migration: 20260130000001
-- =====================================================

-- =====================================================
-- Vendor Contact Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_contact_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES discovered_subscriptions(id) ON DELETE CASCADE,

  -- Email details
  vendor_email TEXT NOT NULL,
  email_subject TEXT,
  email_body TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('queued', 'sent', 'failed', 'bounced', 'replied')) DEFAULT 'queued',
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  error_message TEXT,

  -- Metadata
  gmail_message_id TEXT,  -- For tracking sent email in Gmail
  gmail_thread_id TEXT,   -- For tracking conversation

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for vendor_contact_log
CREATE INDEX IF NOT EXISTS idx_vendor_contact_log_subscription
  ON vendor_contact_log(subscription_id);

CREATE INDEX IF NOT EXISTS idx_vendor_contact_log_status
  ON vendor_contact_log(status);

CREATE INDEX IF NOT EXISTS idx_vendor_contact_log_sent_at
  ON vendor_contact_log(sent_at DESC);

-- =====================================================
-- Add Migration Fields to discovered_subscriptions
-- =====================================================

-- Migration workflow status
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS migration_status TEXT
  CHECK (migration_status IN ('not_started', 'pending_contact', 'contacted', 'vendor_confirmed', 'completed', 'skipped'))
  DEFAULT 'not_started';

-- Priority score (0-100)
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS migration_priority INT DEFAULT 0
  CHECK (migration_priority >= 0 AND migration_priority <= 100);

-- Vendor contact information
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS vendor_contact_email TEXT;

ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS vendor_contact_source TEXT
  CHECK (vendor_contact_source IN ('gmail_from', 'xero_contact', 'web_scrape', 'manual'));

-- Workflow timestamps
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;

ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Notes field for manual tracking
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS migration_notes TEXT;

-- Indexes for migration fields
CREATE INDEX IF NOT EXISTS idx_subscriptions_migration_status
  ON discovered_subscriptions(migration_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_migration_priority
  ON discovered_subscriptions(migration_priority DESC);

-- =====================================================
-- Migration Priority Calculation Function
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_migration_priority(
  sub_amount NUMERIC,
  sub_metadata JSONB,
  sub_confidence NUMERIC
)
RETURNS INT AS $$
DECLARE
  amount_score NUMERIC := 0;
  recency_score NUMERIC := 0;
  confidence_score NUMERIC := 0;
  last_seen_date DATE;
  days_since_last_seen INT;
BEGIN
  -- Amount score (max 40 points) - Scale: $100 = max points
  amount_score := LEAST(40, (COALESCE(sub_amount, 0) / 100.0) * 40);

  -- Recency score (max 30 points) - More recent = higher priority
  last_seen_date := (sub_metadata->>'lastSeen')::DATE;
  IF last_seen_date IS NOT NULL THEN
    days_since_last_seen := CURRENT_DATE - last_seen_date;

    IF days_since_last_seen <= 7 THEN
      recency_score := 30;  -- Last week
    ELSIF days_since_last_seen <= 30 THEN
      recency_score := 20;  -- Last month
    ELSIF days_since_last_seen <= 90 THEN
      recency_score := 10;  -- Last quarter
    ELSE
      recency_score := 5;   -- Older than 3 months
    END IF;
  ELSE
    recency_score := 15;  -- No data, assume medium priority
  END IF;

  -- Confidence score (max 30 points)
  confidence_score := COALESCE(sub_confidence, 0) * 30;

  -- Total score (0-100)
  RETURN LEAST(100, ROUND(amount_score + recency_score + confidence_score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Migration Progress View
-- =====================================================

CREATE OR REPLACE VIEW migration_progress AS
SELECT
  tenant_id,
  COUNT(*) AS total_subscriptions,
  COUNT(*) FILTER (WHERE migration_status = 'not_started') AS not_started,
  COUNT(*) FILTER (WHERE migration_status = 'pending_contact') AS pending_contact,
  COUNT(*) FILTER (WHERE migration_status = 'contacted') AS contacted,
  COUNT(*) FILTER (WHERE migration_status = 'vendor_confirmed') AS vendor_confirmed,
  COUNT(*) FILTER (WHERE migration_status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE migration_status = 'skipped') AS skipped,
  COUNT(*) FILTER (WHERE migration_status IN ('completed', 'skipped')) AS done,
  ROUND(
    COUNT(*) FILTER (WHERE migration_status IN ('completed', 'skipped'))::NUMERIC /
    NULLIF(COUNT(*), 0)::NUMERIC * 100,
    2
  ) AS completion_rate,
  AVG(migration_priority) FILTER (WHERE migration_status NOT IN ('completed', 'skipped')) AS avg_pending_priority,
  COUNT(*) FILTER (WHERE migration_priority >= 80) AS high_priority,
  COUNT(*) FILTER (WHERE migration_priority >= 60 AND migration_priority < 80) AS medium_priority,
  COUNT(*) FILTER (WHERE migration_priority < 60) AS low_priority
FROM discovered_subscriptions
GROUP BY tenant_id;

-- =====================================================
-- Email Rate Limiting Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INT DEFAULT 0,
  emails_queued INT DEFAULT 0,
  daily_limit INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_migration_rate_limits_tenant_date
  ON migration_rate_limits(tenant_id, date);

-- =====================================================
-- Email Templates Table
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, template_name)
);

-- Insert default template
INSERT INTO migration_email_templates (tenant_id, template_name, subject_template, body_template, is_default)
VALUES (
  'act-main',
  'Default Migration Request',
  'Update Billing Email for {{vendor}} - A Curious Tractor',
  'Hi {{vendor}} Team,

I''m writing to update our billing email address for our subscription.

Current Email: {{oldEmail}}
New Email: accounts@act.place

Could you please update your records to send all invoices and billing notifications to the new email address?

Thank you!

Best regards,
Nicholas Morgan
A Curious Tractor
accounts@act.place',
  true
)
ON CONFLICT (tenant_id, template_name) DO NOTHING;

-- =====================================================
-- Trigger to Update migration_priority on Insert/Update
-- =====================================================

CREATE OR REPLACE FUNCTION update_migration_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.migration_priority := calculate_migration_priority(
    NEW.amount,
    NEW.metadata,
    NEW.confidence
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_migration_priority
  BEFORE INSERT OR UPDATE OF amount, metadata, confidence
  ON discovered_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_migration_priority();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE vendor_contact_log IS 'Tracks all automated vendor contact emails sent for email migration';
COMMENT ON TABLE migration_rate_limits IS 'Enforces daily Gmail API rate limits (100 emails/day)';
COMMENT ON TABLE migration_email_templates IS 'Email templates for vendor contact with variable substitution';
COMMENT ON VIEW migration_progress IS 'Real-time dashboard summary of migration progress by tenant';

COMMENT ON COLUMN discovered_subscriptions.migration_status IS 'Current state in migration workflow';
COMMENT ON COLUMN discovered_subscriptions.migration_priority IS 'Priority score (0-100) based on amount, recency, confidence';
COMMENT ON COLUMN discovered_subscriptions.vendor_contact_email IS 'Discovered vendor billing email';
COMMENT ON COLUMN discovered_subscriptions.vendor_contact_source IS 'Source of vendor email (gmail_from, xero_contact, manual)';
