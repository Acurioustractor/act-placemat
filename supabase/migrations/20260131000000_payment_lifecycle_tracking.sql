-- Payment Lifecycle Tracking Migration
-- Adds fields for payment prediction, renewal tracking, and lifecycle management
-- Date: 2025-12-31

-- Add payment prediction fields
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS next_payment_date DATE;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS payment_day_of_month INTEGER;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS payment_pattern_confidence NUMERIC(3,2);
ALTER TABLE email_financial_documents ADD CONSTRAINT check_payment_confidence
  CHECK (payment_pattern_confidence IS NULL OR (payment_pattern_confidence BETWEEN 0 AND 1));

-- Note: days_until_due is calculated dynamically in views, not stored
-- (CURRENT_DATE is not immutable, so can't use GENERATED ALWAYS)

-- Add consolidation tracking fields
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS target_account_email TEXT DEFAULT 'accounts@act.place';
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS consolidation_status TEXT DEFAULT 'not_started';
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS vendor_contact_email TEXT;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS consolidation_notes TEXT;
ALTER TABLE email_financial_documents ADD CONSTRAINT check_consolidation_status
  CHECK (consolidation_status IS NULL OR consolidation_status IN ('not_started', 'vendor_contacted', 'awaiting_confirmation', 'completed', 'skipped'));

-- Add lifecycle management fields
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS cancellation_date DATE;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS renewal_reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS last_renewal_reminder_date DATE;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS usage_last_checked_date DATE;
ALTER TABLE email_financial_documents ADD COLUMN IF NOT EXISTS usage_status TEXT DEFAULT 'unknown';
ALTER TABLE email_financial_documents ADD CONSTRAINT check_subscription_status
  CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'cancelled', 'paused', 'trial', 'past_due', 'unknown'));
ALTER TABLE email_financial_documents ADD CONSTRAINT check_usage_status
  CHECK (usage_status IS NULL OR usage_status IN ('active', 'inactive', 'unknown'));

-- Create payment calendar view
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
  subscription_status,
  CASE
    WHEN next_payment_date IS NULL THEN 'no_prediction'
    WHEN (next_payment_date - CURRENT_DATE) <= 0 THEN 'overdue'
    WHEN (next_payment_date - CURRENT_DATE) <= 1 THEN 'due_today'
    WHEN (next_payment_date - CURRENT_DATE) <= 7 THEN 'due_soon'
    WHEN (next_payment_date - CURRENT_DATE) <= 30 THEN 'upcoming'
    ELSE 'future'
  END as urgency,
  created_at,
  updated_at
FROM email_financial_documents
WHERE is_subscription = true
  AND subscription_status != 'cancelled'
  AND next_payment_date IS NOT NULL
ORDER BY next_payment_date;

-- Create cost breakdown by account view
CREATE OR REPLACE VIEW subscription_cost_by_account AS
SELECT
  tenant_id,
  account_email,
  COUNT(*) as subscription_count,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_count,
  COUNT(*) FILTER (WHERE subscription_status = 'cancelled') as cancelled_count,
  SUM(CASE
    WHEN subscription_frequency = 'monthly' AND amount IS NOT NULL
    THEN amount * 12
    WHEN subscription_frequency = 'yearly' AND amount IS NOT NULL
    THEN amount
    WHEN subscription_frequency = 'quarterly' AND amount IS NOT NULL
    THEN amount * 4
    ELSE 0
  END) as total_annual_cost,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM email_financial_documents
WHERE is_subscription = true
  AND subscription_status != 'cancelled'
GROUP BY tenant_id, account_email
ORDER BY total_annual_cost DESC;

-- Create cost breakdown by category view
CREATE OR REPLACE VIEW subscription_cost_by_category AS
SELECT
  tenant_id,
  category,
  COUNT(*) as subscription_count,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_count,
  SUM(CASE
    WHEN subscription_frequency = 'monthly' AND amount IS NOT NULL
    THEN amount * 12
    WHEN subscription_frequency = 'yearly' AND amount IS NOT NULL
    THEN amount
    WHEN subscription_frequency = 'quarterly' AND amount IS NOT NULL
    THEN amount * 4
    ELSE 0
  END) as total_annual_cost,
  SUM(CASE
    WHEN subscription_frequency = 'monthly' AND amount IS NOT NULL
    THEN amount
    WHEN subscription_frequency = 'yearly' AND amount IS NOT NULL
    THEN amount / 12
    WHEN subscription_frequency = 'quarterly' AND amount IS NOT NULL
    THEN amount / 3
    ELSE 0
  END) as total_monthly_cost,
  AVG(amount) as avg_amount
FROM email_financial_documents
WHERE is_subscription = true
  AND subscription_status != 'cancelled'
GROUP BY tenant_id, category
ORDER BY total_annual_cost DESC;

-- Create missing subscriptions view (Xero recurring charges without email receipts)
-- NOTE: This identifies Xero transactions that look like subscriptions (recurring patterns)
-- but have no matching email receipts. Xero is the source of truth for what's actually paid.
CREATE OR REPLACE VIEW missing_subscriptions AS
WITH recurring_vendors AS (
  -- Find vendors with multiple transactions (likely recurring)
  SELECT
    tenant_id,
    contact_name,
    COUNT(*) as transaction_count,
    AVG(total) as avg_amount,
    MIN(date) as first_transaction,
    MAX(date) as last_transaction
  FROM xero_bank_transactions
  WHERE type = 'SPEND'
    AND total > 0  -- SPEND transactions are positive
  GROUP BY tenant_id, contact_name
  HAVING COUNT(*) >= 2  -- At least 2 transactions
)
SELECT
  xbt.id,
  xbt.tenant_id,
  xbt.contact_name as vendor,
  xbt.total as amount,
  xbt.date as transaction_date,
  xbt.bank_account_name,
  xbt.reference as description,
  rv.transaction_count,
  rv.avg_amount
FROM xero_bank_transactions xbt
JOIN recurring_vendors rv
  ON rv.tenant_id = xbt.tenant_id
  AND rv.contact_name = xbt.contact_name
WHERE xbt.type = 'SPEND'
  AND NOT EXISTS (
    SELECT 1
    FROM email_financial_documents efd
    WHERE efd.tenant_id = xbt.tenant_id
      AND LOWER(efd.vendor) = LOWER(xbt.contact_name)
      AND efd.is_subscription = true
  )
ORDER BY xbt.date DESC;

-- Create renewal alerts view (subscriptions due soon)
CREATE OR REPLACE VIEW subscription_renewal_alerts AS
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
  renewal_reminder_sent,
  last_renewal_reminder_date,
  CASE
    WHEN (next_payment_date - CURRENT_DATE) <= 0 THEN 'OVERDUE'
    WHEN (next_payment_date - CURRENT_DATE) <= 1 THEN 'DUE TODAY'
    WHEN (next_payment_date - CURRENT_DATE) <= 7 THEN 'DUE THIS WEEK'
    ELSE 'UPCOMING'
  END as alert_type
FROM email_financial_documents
WHERE is_subscription = true
  AND subscription_status = 'active'
  AND next_payment_date IS NOT NULL
  AND (next_payment_date - CURRENT_DATE) <= 7
  AND (renewal_reminder_sent = FALSE OR last_renewal_reminder_date < CURRENT_DATE - INTERVAL '7 days')
ORDER BY (next_payment_date - CURRENT_DATE);

-- Create unused subscriptions view (no activity in 90 days)
CREATE OR REPLACE VIEW unused_subscriptions AS
SELECT
  efd.id,
  efd.tenant_id,
  efd.vendor,
  efd.amount,
  efd.currency,
  efd.account_email,
  efd.subscription_frequency,
  efd.usage_last_checked_date,
  efd.usage_status,
  MAX(xbt.date) as last_xero_transaction_date,
  CURRENT_DATE - MAX(xbt.date) as days_since_last_activity
FROM email_financial_documents efd
LEFT JOIN xero_bank_transactions xbt
  ON xbt.tenant_id = efd.tenant_id
  AND LOWER(xbt.contact_name) = LOWER(efd.vendor)
WHERE efd.is_subscription = true
  AND efd.subscription_status = 'active'
  AND efd.amount IS NOT NULL
GROUP BY efd.id, efd.tenant_id, efd.vendor, efd.amount, efd.currency,
  efd.account_email, efd.subscription_frequency, efd.usage_last_checked_date, efd.usage_status
HAVING MAX(xbt.date) IS NULL OR CURRENT_DATE - MAX(xbt.date) > 90
ORDER BY days_since_last_activity DESC NULLS FIRST;

-- Create cost anomalies view (unexpected charges)
CREATE OR REPLACE VIEW subscription_cost_anomalies AS
WITH subscription_averages AS (
  SELECT
    vendor,
    AVG(amount) as avg_amount,
    STDDEV(amount) as stddev_amount,
    COUNT(*) as transaction_count
  FROM email_financial_documents
  WHERE is_subscription = true
    AND amount IS NOT NULL
  GROUP BY vendor
  HAVING COUNT(*) >= 3 -- Need at least 3 data points
)
SELECT
  efd.id,
  efd.tenant_id,
  efd.vendor,
  efd.amount as current_amount,
  sa.avg_amount as expected_amount,
  ((efd.amount - sa.avg_amount) / sa.avg_amount * 100) as percent_difference,
  efd.transaction_date,
  efd.account_email,
  CASE
    WHEN ((efd.amount - sa.avg_amount) / sa.avg_amount * 100) > 50 THEN 'CRITICAL'
    WHEN ((efd.amount - sa.avg_amount) / sa.avg_amount * 100) > 20 THEN 'HIGH'
    ELSE 'MEDIUM'
  END as severity
FROM email_financial_documents efd
JOIN subscription_averages sa ON sa.vendor = efd.vendor
WHERE efd.is_subscription = true
  AND efd.amount IS NOT NULL
  AND efd.amount > sa.avg_amount + (2 * sa.stddev_amount) -- More than 2 standard deviations
ORDER BY percent_difference DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_efd_next_payment_date
  ON email_financial_documents(next_payment_date)
  WHERE is_subscription = true AND subscription_status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_efd_subscription_status
  ON email_financial_documents(subscription_status)
  WHERE is_subscription = true;

CREATE INDEX IF NOT EXISTS idx_efd_usage_status
  ON email_financial_documents(usage_status)
  WHERE is_subscription = true AND subscription_status = 'active';

-- Add comments for documentation
COMMENT ON COLUMN email_financial_documents.next_payment_date IS 'Predicted date of next payment based on historical pattern analysis';
COMMENT ON COLUMN email_financial_documents.payment_pattern_confidence IS 'Confidence score (0-1) for payment prediction based on data consistency and volume';
COMMENT ON COLUMN email_financial_documents.consolidation_status IS 'Progress of moving subscription to target account email';
COMMENT ON COLUMN email_financial_documents.subscription_status IS 'Current lifecycle status of the subscription';
COMMENT ON COLUMN email_financial_documents.usage_status IS 'Whether the subscription shows recent usage/activity';

COMMENT ON VIEW subscription_payment_calendar IS 'Active subscriptions with payment due dates and urgency levels';
COMMENT ON VIEW subscription_cost_by_account IS 'Cost analysis grouped by email account';
COMMENT ON VIEW subscription_cost_by_category IS 'Cost analysis grouped by category type';
COMMENT ON VIEW missing_subscriptions IS 'Xero transactions that appear to be subscriptions but have no email receipt';
COMMENT ON VIEW subscription_renewal_alerts IS 'Subscriptions due for renewal within 7 days';
COMMENT ON VIEW unused_subscriptions IS 'Active subscriptions with no Xero activity in 90+ days';
COMMENT ON VIEW subscription_cost_anomalies IS 'Subscriptions with charges significantly higher than historical average';
