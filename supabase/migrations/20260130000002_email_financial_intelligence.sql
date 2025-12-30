-- Email Financial Intelligence System
-- Purpose: Store ALL financial documents from emails (invoices, receipts, payments, refunds)
-- Expands beyond subscriptions to become foundational infrastructure

-- Create email_financial_documents table
CREATE TABLE IF NOT EXISTS email_financial_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,

  -- Document classification
  document_type TEXT CHECK (document_type IN (
    'subscription_receipt',
    'invoice',
    'payment_confirmation',
    'refund',
    'statement',
    'other'
  )) NOT NULL,

  -- Core financial data
  vendor TEXT NOT NULL,
  amount NUMERIC(10, 2),
  currency TEXT DEFAULT 'AUD',
  transaction_date DATE,

  -- Email metadata
  gmail_message_id TEXT NOT NULL UNIQUE,
  account_email TEXT NOT NULL,  -- nicholas@, hi@, accounts@, benjamin@
  subject TEXT,
  from_email TEXT,

  -- AI extraction metadata
  confidence NUMERIC(3, 2) CHECK (confidence BETWEEN 0 AND 1),
  extraction_method TEXT CHECK (extraction_method IN ('ai', 'structured_data', 'manual')),
  raw_extraction JSONB,  -- Full AI extraction response

  -- Reconciliation with Xero
  xero_transaction_id TEXT,
  xero_contact_id TEXT,
  reconciliation_status TEXT CHECK (reconciliation_status IN (
    'unmatched', 'auto_matched', 'manual_review', 'confirmed', 'disputed'
  )) DEFAULT 'unmatched',
  reconciliation_confidence NUMERIC(3, 2),
  reconciliation_date TIMESTAMPTZ,
  reconciliation_notes TEXT,

  -- Subscription-specific fields (nullable for non-subscriptions)
  is_subscription BOOLEAN DEFAULT false,
  subscription_frequency TEXT CHECK (subscription_frequency IN ('monthly', 'quarterly', 'yearly', 'weekly', 'daily')),
  subscription_id UUID REFERENCES discovered_subscriptions(id),

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_by TEXT,  -- 'EmailIntelligenceAgent' or 'manual'

  UNIQUE(tenant_id, gmail_message_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_fin_tenant_date ON email_financial_documents(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_fin_vendor ON email_financial_documents(vendor);
CREATE INDEX IF NOT EXISTS idx_email_fin_reconciliation ON email_financial_documents(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_email_fin_account ON email_financial_documents(account_email);
CREATE INDEX IF NOT EXISTS idx_email_fin_xero ON email_financial_documents(xero_transaction_id) WHERE xero_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_fin_gmail_message ON email_financial_documents(gmail_message_id);

-- GIN index for JSONB raw_extraction for fast querying
CREATE INDEX IF NOT EXISTS idx_email_fin_raw_extraction ON email_financial_documents USING GIN (raw_extraction);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_financial_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_financial_documents_updated_at
  BEFORE UPDATE ON email_financial_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_email_financial_documents_updated_at();

-- View: Unreconciled financial documents needing attention
CREATE OR REPLACE VIEW unreconciled_financial_documents AS
SELECT
  id,
  document_type,
  vendor,
  amount,
  transaction_date,
  account_email,
  confidence,
  CASE
    WHEN reconciliation_status = 'unmatched' AND confidence >= 0.80 THEN 'high_priority'
    WHEN reconciliation_status = 'manual_review' THEN 'needs_review'
    ELSE 'low_priority'
  END as priority
FROM email_financial_documents
WHERE reconciliation_status IN ('unmatched', 'manual_review')
ORDER BY transaction_date DESC;

-- View: Financial summary by account
CREATE OR REPLACE VIEW financial_by_account AS
SELECT
  account_email,
  document_type,
  COUNT(*) as document_count,
  SUM(amount) as total_amount,
  AVG(confidence) as avg_confidence,
  SUM(CASE WHEN reconciliation_status = 'auto_matched' THEN 1 ELSE 0 END) as auto_matched_count
FROM email_financial_documents
GROUP BY account_email, document_type;

-- View: Monthly financial summary
CREATE OR REPLACE VIEW financial_monthly_summary AS
SELECT
  DATE_TRUNC('month', transaction_date) as month,
  account_email,
  document_type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(confidence) as avg_confidence
FROM email_financial_documents
WHERE transaction_date IS NOT NULL
GROUP BY DATE_TRUNC('month', transaction_date), account_email, document_type
ORDER BY month DESC, account_email, document_type;

-- One-time migration: Copy subscription_receipts → email_financial_documents
-- This preserves existing subscription receipt data in the new unified table
INSERT INTO email_financial_documents (
  tenant_id,
  document_type,
  vendor,
  amount,
  currency,
  transaction_date,
  gmail_message_id,
  account_email,
  xero_transaction_id,
  reconciliation_status,
  reconciliation_confidence,
  reconciliation_date,
  is_subscription,
  subscription_id,
  created_at,
  processed_by
)
SELECT
  ds.tenant_id,
  'subscription_receipt',
  ds.vendor,
  sr.amount,
  ds.currency,
  sr.receipt_date,
  sr.gmail_message_id,
  COALESCE(ds.account_email, 'unknown'),  -- May need manual update
  sr.xero_transaction_id,
  sr.reconciliation_status,
  sr.reconciliation_confidence,
  sr.reconciliation_date,
  true,  -- is_subscription
  ds.id,  -- subscription_id
  sr.created_at,
  'migration_script'
FROM subscription_receipts sr
JOIN discovered_subscriptions ds ON ds.id = sr.subscription_id
WHERE sr.gmail_message_id IS NOT NULL
ON CONFLICT (tenant_id, gmail_message_id) DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE email_financial_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to email_financial_documents"
  ON email_financial_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to view their tenant's documents
CREATE POLICY "Users can view their tenant's email financial documents"
  ON email_financial_documents
  FOR SELECT
  TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON email_financial_documents TO service_role;
GRANT SELECT ON email_financial_documents TO authenticated;
GRANT SELECT ON unreconciled_financial_documents TO service_role, authenticated;
GRANT SELECT ON financial_by_account TO service_role, authenticated;
GRANT SELECT ON financial_monthly_summary TO service_role, authenticated;

-- Add comment for documentation
COMMENT ON TABLE email_financial_documents IS 'Unified storage for all financial documents extracted from ACT Workspace emails. Supports subscriptions, invoices, receipts, payments, refunds, and statements with automatic Xero reconciliation.';
COMMENT ON COLUMN email_financial_documents.confidence IS 'AI extraction confidence score (0.0 to 1.0). Auto-reconcile if >=0.80 and amount <=250.';
COMMENT ON COLUMN email_financial_documents.reconciliation_status IS 'Reconciliation workflow: unmatched → auto_matched/manual_review → confirmed/disputed';
COMMENT ON VIEW unreconciled_financial_documents IS 'Documents needing attention with priority scoring based on confidence and reconciliation status.';
COMMENT ON VIEW financial_by_account IS 'Aggregated financial metrics grouped by account email and document type.';
