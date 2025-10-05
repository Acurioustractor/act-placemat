-- Automated Bookkeeping Schema (idempotent)

BEGIN;

-- Transactions
CREATE TABLE IF NOT EXISTS public.bookkeeping_transactions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  xero_id TEXT UNIQUE,
  txn_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT,
  direction TEXT CHECK (direction IN ('spent','received')),
  description TEXT,
  contact_name TEXT,
  account_code TEXT,
  account_name TEXT,
  category TEXT,
  category_confidence NUMERIC(3,2) DEFAULT 0,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_txn_tenant_date ON public.bookkeeping_transactions (tenant_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_book_txn_category ON public.bookkeeping_transactions (tenant_id, category);

-- Receipt linkage (optional fields)
ALTER TABLE public.bookkeeping_transactions
  ADD COLUMN IF NOT EXISTS receipt_id TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Categorization rules (simple substring match)
CREATE TABLE IF NOT EXISTS public.bookkeeping_rules (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  account_code TEXT,
  priority INT DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_book_rules_tenant_priority ON public.bookkeeping_rules (tenant_id, priority);

-- Sync state
CREATE TABLE IF NOT EXISTS public.bookkeeping_sync_state (
  tenant_id TEXT PRIMARY KEY,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_page INT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMIT;


-- Project costings: link transactions to projects with optional allocation
BEGIN;

CREATE TABLE IF NOT EXISTS public.bookkeeping_project_links (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  transaction_id BIGINT NOT NULL REFERENCES public.bookkeeping_transactions(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  allocation NUMERIC(5,4) DEFAULT 1.0 CHECK (allocation > 0 AND allocation <= 1),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_proj_link_unique ON public.bookkeeping_project_links(tenant_id, transaction_id, project_id);
CREATE INDEX IF NOT EXISTS idx_book_proj_link_project ON public.bookkeeping_project_links(tenant_id, project_id);

COMMIT;

-- Receipts registry for Dext/ingested receipts (optional)
BEGIN;

CREATE TABLE IF NOT EXISTS public.bookkeeping_receipts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  receipt_id TEXT,
  vendor TEXT,
  amount NUMERIC(14,2),
  currency TEXT,
  receipt_date DATE,
  url TEXT,
  status TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_book_receipts_tenant ON public.bookkeeping_receipts(tenant_id, receipt_date DESC);

COMMIT;
