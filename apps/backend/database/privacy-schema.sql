-- Privacy & DNA Guardian MVP Schema (idempotent)

BEGIN;

-- Per-tenant privacy/consent settings
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  tenant_id TEXT PRIMARY KEY,
  analytics_consent BOOLEAN DEFAULT TRUE,
  email_processing_consent BOOLEAN DEFAULT TRUE,
  data_sharing_consent BOOLEAN DEFAULT FALSE,
  retention_days INTEGER DEFAULT 365,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Extend privacy settings with consent versioning and expiry
ALTER TABLE public.privacy_settings
  ADD COLUMN IF NOT EXISTS consent_version INTEGER DEFAULT 1;
ALTER TABLE public.privacy_settings
  ADD COLUMN IF NOT EXISTS consent_expires_at TIMESTAMPTZ;
ALTER TABLE public.privacy_settings
  ADD COLUMN IF NOT EXISTS policy_ref TEXT;

-- Access audit log
CREATE TABLE IF NOT EXISTS public.privacy_audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  actor TEXT,                  -- user id/email if known
  method TEXT,
  path TEXT,
  resource TEXT,
  ip TEXT,
  status INT,
  query JSONB,
  body JSONB
);
CREATE INDEX IF NOT EXISTS idx_priv_audit_tenant_time ON public.privacy_audit_log (tenant_id, occurred_at DESC);

-- Data Subject Requests (DSR)
CREATE TABLE IF NOT EXISTS public.privacy_dsr_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT,
  subject_identifier TEXT NOT NULL, -- email or external id
  type TEXT NOT NULL CHECK (type IN ('export','delete')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','completed','rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_priv_dsr_tenant_status ON public.privacy_dsr_requests (tenant_id, status);

COMMIT;



