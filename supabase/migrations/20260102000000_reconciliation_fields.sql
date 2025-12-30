-- =====================================================
-- Subscription Intelligence Hub: Reconciliation Fields
-- R&D Project: Gmail-to-Xero Reconciliation System
-- =====================================================

-- Add reconciliation tracking fields to subscription_receipts
ALTER TABLE subscription_receipts
ADD COLUMN IF NOT EXISTS reconciliation_confidence NUMERIC(3, 2) CHECK (reconciliation_confidence >= 0 AND reconciliation_confidence <= 1),
ADD COLUMN IF NOT EXISTS reconciliation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT CHECK (
  reconciliation_status IN ('auto_matched', 'manual_matched', 'unmatched', 'disputed', 'manual_review')
) DEFAULT 'unmatched';

-- Add multi-account and analytics fields to discovered_subscriptions
ALTER TABLE discovered_subscriptions
ADD COLUMN IF NOT EXISTS account_email TEXT,
ADD COLUMN IF NOT EXISTS annual_cost_cached NUMERIC(10, 2);

-- Create index for reconciliation lookups
CREATE INDEX IF NOT EXISTS idx_receipts_xero_txn
ON subscription_receipts(xero_transaction_id);

CREATE INDEX IF NOT EXISTS idx_receipts_reconciliation_status
ON subscription_receipts(reconciliation_status);

CREATE INDEX IF NOT EXISTS idx_receipts_reconciliation_confidence
ON subscription_receipts(reconciliation_confidence DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_account_email
ON discovered_subscriptions(account_email);

-- Create view for outstanding invoices (receipts with no Xero match)
CREATE OR REPLACE VIEW outstanding_invoices AS
SELECT
  sr.id,
  sr.subscription_id,
  sr.receipt_date,
  sr.amount,
  sr.currency,
  ds.vendor,
  ds.tenant_id,
  EXTRACT(DAY FROM NOW() - sr.receipt_date)::INTEGER as days_overdue,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - sr.receipt_date) > 30 OR sr.amount > 500 THEN 'critical'
    WHEN EXTRACT(DAY FROM NOW() - sr.receipt_date) > 7 OR sr.amount > 100 THEN 'high'
    ELSE 'normal'
  END as priority_status,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - sr.receipt_date) > 30 THEN 50
    WHEN EXTRACT(DAY FROM NOW() - sr.receipt_date) > 7 THEN 30
    ELSE LEAST(EXTRACT(DAY FROM NOW() - sr.receipt_date)::INTEGER, 20)
  END +
  CASE
    WHEN sr.amount > 500 THEN 50
    WHEN sr.amount > 100 THEN 30
    ELSE LEAST(sr.amount / 2, 20)
  END as priority_score,
  sr.gmail_message_id,
  sr.source,
  sr.created_at
FROM subscription_receipts sr
JOIN discovered_subscriptions ds ON ds.id = sr.subscription_id
WHERE sr.xero_transaction_id IS NULL
ORDER BY priority_score DESC, sr.receipt_date DESC;

-- Comment on view
COMMENT ON VIEW outstanding_invoices IS 'Pre-calculated view of unpaid receipts with priority scoring for quick dashboard queries';

-- Update RLS policies to include new view
-- (Assuming service_role policies already exist from previous migration)

-- Add helpful comments
COMMENT ON COLUMN subscription_receipts.reconciliation_confidence IS 'Fuzzy matching confidence score (0.0-1.0) from reconciliation engine';
COMMENT ON COLUMN subscription_receipts.reconciliation_date IS 'When this receipt was reconciled to a Xero transaction';
COMMENT ON COLUMN subscription_receipts.reconciliation_status IS 'auto_matched (>=80% confidence), manual_review (<80%), manual_matched (user verified), unmatched (no match), disputed (conflict)';
COMMENT ON COLUMN discovered_subscriptions.account_email IS 'Which @act.place email account discovered this subscription (multi-account scanning)';
COMMENT ON COLUMN discovered_subscriptions.annual_cost_cached IS 'Cached annual cost estimate for quick analytics queries';
