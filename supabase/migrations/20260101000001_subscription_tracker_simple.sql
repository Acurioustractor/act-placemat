-- Simple subscription tracker migration for Supabase
-- Uses gen_random_uuid() instead of uuid_generate_v4()

-- Core subscription tracking table
CREATE TABLE IF NOT EXISTS discovered_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount NUMERIC(10, 2),
  currency TEXT DEFAULT 'AUD',
  frequency TEXT CHECK (frequency IN ('monthly', 'yearly', 'quarterly', 'irregular', 'unknown')),
  status TEXT CHECK (status IN ('active', 'canceled', 'paused', 'pending_review')) DEFAULT 'active',
  cancel_reason TEXT,
  notes TEXT,
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  signals JSONB,
  gmail_message_id TEXT,
  xero_contact_id TEXT,
  notion_page_id TEXT,
  first_detected TIMESTAMPTZ DEFAULT NOW(),
  last_scanned TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, vendor)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON discovered_subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_confidence ON discovered_subscriptions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_last_scanned ON discovered_subscriptions(last_scanned DESC);

-- Receipt attachments
CREATE TABLE IF NOT EXISTS subscription_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES discovered_subscriptions(id) ON DELETE CASCADE,
  receipt_date DATE,
  amount NUMERIC(10, 2),
  currency TEXT DEFAULT 'AUD',
  file_url TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'image', 'email')),
  ocr_text TEXT,
  ocr_confidence NUMERIC(3, 2),
  extracted_vendor TEXT,
  extracted_amount NUMERIC(10, 2),
  extracted_date DATE,
  ner_entities JSONB,
  source TEXT CHECK (source IN ('gmail', 'xero', 'manual')),
  gmail_message_id TEXT,
  xero_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_subscription ON subscription_receipts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON subscription_receipts(receipt_date DESC);

-- R&D activity log
CREATE TABLE IF NOT EXISTS rd_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  methodology TEXT NOT NULL,
  success_metric TEXT NOT NULL,
  findings TEXT,
  developer TEXT NOT NULL,
  time_spent_hours NUMERIC(5, 2),
  category TEXT CHECK (category IN ('Software Development', 'AI Research', 'Data Analysis', 'Testing')),
  status TEXT CHECK (status IN ('planning', 'active', 'complete', 'failed')) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notion_page_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rd_log_developer ON rd_activity_log(developer);
CREATE INDEX IF NOT EXISTS idx_rd_log_status ON rd_activity_log(status);
CREATE INDEX IF NOT EXISTS idx_rd_log_started ON rd_activity_log(started_at DESC);

-- Subscription analytics
CREATE TABLE IF NOT EXISTS subscription_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES discovered_subscriptions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  last_used_date DATE,
  usage_frequency TEXT CHECK (usage_frequency IN ('daily', 'weekly', 'monthly', 'rarely', 'never')),
  estimated_value NUMERIC(10, 2),
  actual_cost NUMERIC(10, 2),
  value_score NUMERIC(3, 2),
  recommendation TEXT CHECK (recommendation IN ('keep', 'review', 'cancel')),
  recommendation_reason TEXT,
  confidence NUMERIC(3, 2),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_subscription ON subscription_analytics(subscription_id);
CREATE INDEX IF NOT EXISTS idx_analytics_recommendation ON subscription_analytics(recommendation);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'subscriptions_updated_at') THEN
    CREATE TRIGGER subscriptions_updated_at
      BEFORE UPDATE ON discovered_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE discovered_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow service role full access for now)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'discovered_subscriptions'
    AND policyname = 'service_role_all_subscriptions'
  ) THEN
    CREATE POLICY service_role_all_subscriptions ON discovered_subscriptions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscription_receipts'
    AND policyname = 'service_role_all_receipts'
  ) THEN
    CREATE POLICY service_role_all_receipts ON subscription_receipts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rd_activity_log'
    AND policyname = 'service_role_all_rd_log'
  ) THEN
    CREATE POLICY service_role_all_rd_log ON rd_activity_log
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscription_analytics'
    AND policyname = 'service_role_all_analytics'
  ) THEN
    CREATE POLICY service_role_all_analytics ON subscription_analytics
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
