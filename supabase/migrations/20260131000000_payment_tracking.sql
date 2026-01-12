-- =====================================================
-- Payment Tracking & Consolidation Schema
-- =====================================================
-- Adds payment due date prediction and email consolidation tracking
-- to the email_financial_documents table

-- Add payment tracking fields
ALTER TABLE email_financial_documents
ADD COLUMN IF NOT EXISTS next_payment_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_day_of_month INTEGER,
ADD COLUMN IF NOT EXISTS payment_pattern_confidence NUMERIC(3,2) CHECK (payment_pattern_confidence >= 0 AND payment_pattern_confidence <= 1);

-- Add consolidation tracking fields
ALTER TABLE email_financial_documents
ADD COLUMN IF NOT EXISTS target_account_email TEXT DEFAULT 'accounts@act.place',
ADD COLUMN IF NOT EXISTS consolidation_status TEXT CHECK (
  consolidation_status IN ('not_started', 'vendor_contacted', 'awaiting_confirmation', 'completed', 'skipped')
) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS vendor_contact_email TEXT,
ADD COLUMN IF NOT EXISTS consolidation_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN email_financial_documents.next_payment_date IS 'Predicted next payment date based on historical patterns';
COMMENT ON COLUMN email_financial_documents.last_payment_date IS 'Most recent payment date from email receipts';
COMMENT ON COLUMN email_financial_documents.payment_day_of_month IS 'Most common day of month for this subscription (e.g., 15 for 15th)';
COMMENT ON COLUMN email_financial_documents.payment_pattern_confidence IS 'Confidence score (0.0-1.0) for payment prediction accuracy';
COMMENT ON COLUMN email_financial_documents.target_account_email IS 'Email account to consolidate this subscription to';
COMMENT ON COLUMN email_financial_documents.consolidation_status IS 'Manual workflow status for email consolidation';
COMMENT ON COLUMN email_financial_documents.vendor_contact_email IS 'Vendor contact email for billing changes';

-- =====================================================
-- Payment Calendar View
-- =====================================================
-- Shows upcoming subscriptions with urgency classification

CREATE OR REPLACE VIEW subscription_payment_calendar AS
SELECT
  id,
  tenant_id,
  vendor,
  amount,
  currency,
  account_email,
  next_payment_date,
  (next_payment_date - CURRENT_DATE) as days_until_due,
  payment_pattern_confidence,
  subscription_frequency,
  CASE
    WHEN (next_payment_date - CURRENT_DATE) <= 0 THEN 'overdue'
    WHEN (next_payment_date - CURRENT_DATE) <= 1 THEN 'due_today'
    WHEN (next_payment_date - CURRENT_DATE) <= 7 THEN 'due_soon'
    ELSE 'upcoming'
  END as urgency
FROM email_financial_documents
WHERE is_subscription = true
  AND next_payment_date IS NOT NULL
ORDER BY next_payment_date;

COMMENT ON VIEW subscription_payment_calendar IS 'Payment timeline with urgency classification for subscription reminders';

-- =====================================================
-- Cost Breakdown by Account View
-- =====================================================
-- Aggregates subscription costs per email account

CREATE OR REPLACE VIEW subscription_cost_by_account AS
SELECT
  tenant_id,
  account_email,
  COUNT(*) as subscription_count,
  SUM(
    CASE
      WHEN subscription_frequency = 'monthly' THEN amount * 12
      WHEN subscription_frequency = 'quarterly' THEN amount * 4
      WHEN subscription_frequency = 'yearly' THEN amount
      ELSE amount * 12  -- Default to monthly if unknown
    END
  ) as annual_cost,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM email_financial_documents
WHERE is_subscription = true
  AND amount IS NOT NULL
  AND amount > 0
GROUP BY tenant_id, account_email
ORDER BY annual_cost DESC;

COMMENT ON VIEW subscription_cost_by_account IS 'Annual subscription costs aggregated by email account';

-- =====================================================
-- Consolidation Progress View
-- =====================================================
-- Tracks email consolidation workflow progress

CREATE OR REPLACE VIEW consolidation_progress AS
SELECT
  tenant_id,
  account_email,
  consolidation_status,
  COUNT(*) as subscription_count,
  SUM(
    CASE
      WHEN subscription_frequency = 'monthly' THEN amount * 12
      ELSE amount
    END
  ) as annual_value
FROM email_financial_documents
WHERE is_subscription = true
GROUP BY tenant_id, account_email, consolidation_status
ORDER BY account_email, consolidation_status;

COMMENT ON VIEW consolidation_progress IS 'Tracks progress of consolidating subscriptions to target email account';

-- =====================================================
-- Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_efd_next_payment_date
  ON email_financial_documents(tenant_id, next_payment_date)
  WHERE is_subscription = true AND next_payment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_efd_consolidation_status
  ON email_financial_documents(tenant_id, consolidation_status)
  WHERE is_subscription = true;

CREATE INDEX IF NOT EXISTS idx_efd_account_email
  ON email_financial_documents(tenant_id, account_email)
  WHERE is_subscription = true;

-- =====================================================
-- Grant permissions (if using RLS)
-- =====================================================

-- Views should inherit permissions from base table
-- No additional grants needed if RLS is properly configured
