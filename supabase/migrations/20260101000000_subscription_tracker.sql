-- =====================================================
-- ACT Subscription Tracker Schema
-- R&D Project: AI-Powered Subscription Discovery
-- Migration: 20260101000000
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Core Subscription Tracking Table
-- =====================================================

CREATE TABLE IF NOT EXISTS discovered_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,

  -- Subscription metadata
  vendor TEXT NOT NULL,
  amount NUMERIC(10, 2),
  currency TEXT DEFAULT 'AUD',
  frequency TEXT CHECK (frequency IN ('monthly', 'yearly', 'quarterly', 'irregular', 'unknown')) DEFAULT 'unknown',

  -- Status tracking
  status TEXT CHECK (status IN ('active', 'canceled', 'paused', 'pending_review')) DEFAULT 'active',
  cancel_reason TEXT,
  notes TEXT,

  -- Multi-signal confidence tracking (R&D metric)
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  signals JSONB,  -- {gmail: 0.8, xero: 0.9, ai: 0.7}

  -- External references
  gmail_message_id TEXT,
  xero_contact_id TEXT,
  notion_page_id TEXT,

  -- Timestamps
  first_detected TIMESTAMPTZ DEFAULT NOW(),
  last_scanned TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per tenant+vendor (prevent duplicates)
  UNIQUE(tenant_id, vendor)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status
  ON discovered_subscriptions(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_confidence
  ON discovered_subscriptions(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_last_scanned
  ON discovered_subscriptions(last_scanned DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_vendor
  ON discovered_subscriptions(vendor);

-- Index on signals JSONB for filtering by signal source
CREATE INDEX IF NOT EXISTS idx_subscriptions_signals
  ON discovered_subscriptions USING GIN (signals);

-- =====================================================
-- Receipt Attachments from Gmail/Xero
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES discovered_subscriptions(id) ON DELETE CASCADE,

  -- Receipt metadata
  receipt_date DATE,
  amount NUMERIC(10, 2),
  currency TEXT DEFAULT 'AUD',

  -- File storage (Supabase Storage)
  file_url TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'image', 'email')),

  -- OCR extraction results (R&D tracked)
  ocr_text TEXT,
  ocr_confidence NUMERIC(3, 2),

  -- NER extracted entities
  extracted_vendor TEXT,
  extracted_amount NUMERIC(10, 2),
  extracted_date DATE,
  ner_entities JSONB,  -- Full NER output for analysis

  -- Source tracking
  source TEXT CHECK (source IN ('gmail', 'xero', 'manual')) NOT NULL,
  gmail_message_id TEXT,
  xero_transaction_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_subscription
  ON subscription_receipts(subscription_id);

CREATE INDEX IF NOT EXISTS idx_receipts_date
  ON subscription_receipts(receipt_date DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_source
  ON subscription_receipts(source);

-- =====================================================
-- R&D Activity Log (AusIndustry Compliance)
-- =====================================================

CREATE TABLE IF NOT EXISTS rd_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- R&D metadata (required for AusIndustry claims)
  component TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  methodology TEXT NOT NULL,
  success_metric TEXT NOT NULL,
  findings TEXT,
  technical_uncertainty TEXT,

  -- Development tracking
  developer TEXT NOT NULL,
  time_spent_hours NUMERIC(5, 2) DEFAULT 0,
  category TEXT CHECK (category IN (
    'Software Development',
    'AI Research',
    'Data Analysis',
    'Testing',
    'Architecture'
  )) DEFAULT 'Software Development',

  -- Status
  status TEXT CHECK (status IN (
    'planning',
    'active',
    'complete',
    'failed'
  )) DEFAULT 'active',

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Notion integration
  notion_page_id TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rd_log_developer
  ON rd_activity_log(developer);

CREATE INDEX IF NOT EXISTS idx_rd_log_status
  ON rd_activity_log(status);

CREATE INDEX IF NOT EXISTS idx_rd_log_started
  ON rd_activity_log(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_rd_log_category
  ON rd_activity_log(category);

-- =====================================================
-- Subscription Value Analysis (Future Phase)
-- For AI-powered cancellation recommendations
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES discovered_subscriptions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,

  -- Usage metrics (future integration with actual usage data)
  last_used_date DATE,
  usage_frequency TEXT CHECK (usage_frequency IN (
    'daily',
    'weekly',
    'monthly',
    'rarely',
    'never'
  )),

  -- Value analysis
  estimated_value NUMERIC(10, 2),  -- Perceived value (user input or ML)
  actual_cost NUMERIC(10, 2),      -- Annual cost
  value_score NUMERIC(3, 2),       -- value/cost ratio (0-1)

  -- AI recommendation
  recommendation TEXT CHECK (recommendation IN ('keep', 'review', 'cancel')),
  recommendation_reason TEXT,
  recommendation_confidence NUMERIC(3, 2),

  -- Timestamps
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_subscription
  ON subscription_analytics(subscription_id);

CREATE INDEX IF NOT EXISTS idx_analytics_recommendation
  ON subscription_analytics(recommendation);

CREATE INDEX IF NOT EXISTS idx_analytics_analyzed
  ON subscription_analytics(analyzed_at DESC);

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON discovered_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-complete R&D activity when findings are added
CREATE OR REPLACE FUNCTION auto_complete_rd_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.findings IS NOT NULL AND NEW.findings != 'In progress' AND OLD.findings = 'In progress' THEN
    NEW.status = 'complete';
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rd_activity_auto_complete
  BEFORE UPDATE ON rd_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_rd_activity();

-- =====================================================
-- Row Level Security (RLS)
-- Multi-tenant data isolation
-- =====================================================

ALTER TABLE discovered_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their org's subscriptions
CREATE POLICY "subscriptions_tenant_isolation_select"
  ON discovered_subscriptions FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Policy: Users can insert their org's subscriptions
CREATE POLICY "subscriptions_tenant_isolation_insert"
  ON discovered_subscriptions FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Policy: Users can update their org's subscriptions
CREATE POLICY "subscriptions_tenant_isolation_update"
  ON discovered_subscriptions FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Policy: Users can delete their org's subscriptions
CREATE POLICY "subscriptions_tenant_isolation_delete"
  ON discovered_subscriptions FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Similar policies for receipts (cascades from subscriptions)
CREATE POLICY "receipts_tenant_isolation_select"
  ON subscription_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM discovered_subscriptions
      WHERE discovered_subscriptions.id = subscription_receipts.subscription_id
      AND discovered_subscriptions.tenant_id = current_setting('app.current_tenant_id', true)
    )
  );

CREATE POLICY "receipts_tenant_isolation_insert"
  ON subscription_receipts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM discovered_subscriptions
      WHERE discovered_subscriptions.id = subscription_receipts.subscription_id
      AND discovered_subscriptions.tenant_id = current_setting('app.current_tenant_id', true)
    )
  );

-- Policy: Analytics isolation
CREATE POLICY "analytics_tenant_isolation_select"
  ON subscription_analytics FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "analytics_tenant_isolation_insert"
  ON subscription_analytics FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- R&D log: Allow all authenticated users to read (for transparency)
-- but only specific users can write
CREATE POLICY "rd_log_public_read"
  ON rd_activity_log FOR SELECT
  USING (true);

CREATE POLICY "rd_log_developer_write"
  ON rd_activity_log FOR INSERT
  WITH CHECK (developer = current_user);

-- =====================================================
-- Views for Reporting
-- =====================================================

-- Subscription summary by tenant
CREATE OR REPLACE VIEW subscription_summary AS
SELECT
  tenant_id,
  COUNT(*) as total_subscriptions,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
  ROUND(AVG(confidence)::numeric, 3) as avg_confidence,
  SUM(CASE
    WHEN frequency = 'monthly' THEN amount * 12
    WHEN frequency = 'quarterly' THEN amount * 4
    WHEN frequency = 'yearly' THEN amount
    ELSE 0
  END) as total_annual_cost
FROM discovered_subscriptions
GROUP BY tenant_id;

-- R&D summary by developer
CREATE OR REPLACE VIEW rd_summary AS
SELECT
  developer,
  category,
  COUNT(*) as activities,
  SUM(time_spent_hours) as total_hours,
  COUNT(*) FILTER (WHERE status = 'complete') as completed,
  ROUND(AVG(time_spent_hours)::numeric, 2) as avg_hours_per_activity
FROM rd_activity_log
GROUP BY developer, category;

-- High-value cancellation candidates
CREATE OR REPLACE VIEW cancellation_candidates AS
SELECT
  ds.*,
  (CASE
    WHEN ds.frequency = 'monthly' THEN ds.amount * 12
    WHEN ds.frequency = 'quarterly' THEN ds.amount * 4
    WHEN ds.frequency = 'yearly' THEN ds.amount
    ELSE 0
  END) as annual_cost
FROM discovered_subscriptions ds
WHERE
  ds.status = 'active'
  AND ds.confidence < 0.8
  AND ds.amount IS NOT NULL
ORDER BY annual_cost DESC;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE discovered_subscriptions IS 'Core subscription tracking with multi-signal confidence scores for R&D analysis';
COMMENT ON TABLE subscription_receipts IS 'OCR-processed receipt attachments with NER extraction for vendor/amount/date';
COMMENT ON TABLE rd_activity_log IS 'AusIndustry R&D tax claim compliance tracking with hypothesis-driven methodology';
COMMENT ON TABLE subscription_analytics IS 'AI-powered value analysis for cancellation recommendations (future phase)';

COMMENT ON COLUMN discovered_subscriptions.confidence IS 'Weighted confidence score from multi-signal fusion (0-1): Gmail 40%, Xero 40%, AI 20%';
COMMENT ON COLUMN discovered_subscriptions.signals IS 'Individual signal confidence scores: {gmail: 0.8, xero: 0.9, ai: 0.7}';
COMMENT ON COLUMN subscription_receipts.ocr_confidence IS 'OCR extraction confidence from pytesseract (0-1)';
COMMENT ON COLUMN rd_activity_log.technical_uncertainty IS 'Description of technical uncertainty being resolved (required for R&D claim)';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Log this migration in R&D activity
INSERT INTO rd_activity_log (
  component,
  hypothesis,
  methodology,
  success_metric,
  findings,
  developer,
  category,
  status,
  time_spent_hours
) VALUES (
  'Subscription Tracker Database Schema',
  'Optimized schema with RLS policies provides <100ms query performance while maintaining multi-tenant isolation',
  'PostgreSQL with JSONB for flexible signal storage, GIN indexes for performance, RLS for security',
  'Query time <100ms for 1000+ subscriptions, 100% data isolation, zero cross-tenant leaks',
  'Schema created successfully with 4 tables, 15 indexes, 10 RLS policies, 3 views',
  'Ben Knight',
  'Software Development',
  'complete',
  2.0
);
