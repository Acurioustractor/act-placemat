-- Financial API v1 Schema Extensions
-- Additional tables needed for v1/financial endpoints

BEGIN;

-- Xero transactions table (referenced in v1/financial.js)
CREATE TABLE IF NOT EXISTS public.xero_transactions (
  id BIGSERIAL PRIMARY KEY,
  xero_id TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  contact TEXT,
  status TEXT,
  type TEXT CHECK (type IN ('SPEND','RECEIVE')),
  bank_account TEXT,
  line_items JSONB,
  suggested_category TEXT,
  confidence NUMERIC(3,2) DEFAULT 0,
  receipt_matched TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xero_txn_date ON public.xero_transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_xero_txn_category ON public.xero_transactions (suggested_category);
CREATE INDEX IF NOT EXISTS idx_xero_txn_type ON public.xero_transactions (type);

-- Categorisation rules table
CREATE TABLE IF NOT EXISTS public.categorisation_rules (
  id BIGSERIAL PRIMARY KEY,
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.8,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cat_rules_pattern ON public.categorisation_rules (pattern);
CREATE INDEX IF NOT EXISTS idx_cat_rules_category ON public.categorisation_rules (category);

-- Activity log table (for engagement tracking)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_date ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log (user_id);

-- Daily snapshots table (for trend analysis)
CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON public.daily_snapshots (date DESC);

COMMIT;