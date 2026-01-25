-- Xero Financial Data Tables (from act-personal-ai)
-- Migration: 20260118120100_xero_financial_data
-- Source: act-personal-ai/supabase/migrations/20260107000000_xero_financial_data.sql
--
-- Stores invoices, bills, and financial snapshots for historical tracking and trend analysis
-- This enables the Business Intelligence agent to analyze financial health over time
--
-- NOTE: Target database already has xero_sync_status, financial_transactions, xero_contacts,
--       financial_intelligence_insights, bas_tracking in 20250929210200_xero_financial_tables.sql
--       This migration adds complementary tables: xero_invoices, xero_financial_snapshots, xero_financial_alerts

-- ============================================================================
-- INVOICES TABLE - ADD MISSING COLUMNS (table may already exist)
-- ============================================================================
-- Note: xero_invoices may exist from 20250929210200_xero_financial_tables.sql
-- This adds columns needed for the personal-ai financial intelligence features

-- Add missing columns if table exists (safe to run multiple times)
DO $$ BEGIN
    -- Add invoice_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'invoice_type') THEN
        ALTER TABLE xero_invoices ADD COLUMN invoice_type VARCHAR(50);
    END IF;

    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'status') THEN
        ALTER TABLE xero_invoices ADD COLUMN status VARCHAR(50);
    END IF;

    -- Add amount_due if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'amount_due') THEN
        ALTER TABLE xero_invoices ADD COLUMN amount_due DECIMAL(15, 2);
    END IF;

    -- Add due_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'due_date') THEN
        ALTER TABLE xero_invoices ADD COLUMN due_date DATE;
    END IF;

    -- Add tracking columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'tracking_option_1') THEN
        ALTER TABLE xero_invoices ADD COLUMN tracking_category_1 VARCHAR(255);
        ALTER TABLE xero_invoices ADD COLUMN tracking_option_1 VARCHAR(255);
        ALTER TABLE xero_invoices ADD COLUMN tracking_category_2 VARCHAR(255);
        ALTER TABLE xero_invoices ADD COLUMN tracking_option_2 VARCHAR(255);
    END IF;

    -- Add contact columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'contact_xero_id') THEN
        ALTER TABLE xero_invoices ADD COLUMN contact_xero_id VARCHAR(255);
    END IF;
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist - create it
    CREATE TABLE xero_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        xero_invoice_id VARCHAR(255) UNIQUE NOT NULL,
        invoice_number VARCHAR(100),
        contact_name VARCHAR(500),
        contact_xero_id VARCHAR(255),
        contact_email VARCHAR(255),
        invoice_type VARCHAR(50),
        status VARCHAR(50),
        currency_code VARCHAR(10) DEFAULT 'AUD',
        subtotal DECIMAL(15, 2),
        total_tax DECIMAL(15, 2),
        total DECIMAL(15, 2),
        amount_due DECIMAL(15, 2),
        amount_paid DECIMAL(15, 2),
        amount_credited DECIMAL(15, 2),
        invoice_date DATE,
        due_date DATE,
        fully_paid_on DATE,
        tracking_category_1 VARCHAR(255),
        tracking_option_1 VARCHAR(255),
        tracking_category_2 VARCHAR(255),
        tracking_option_2 VARCHAR(255),
        line_items JSONB,
        reference VARCHAR(500),
        url VARCHAR(1000),
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        updated_in_xero_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
END $$;

-- Indexes (only create if columns exist)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'invoice_type') THEN
        CREATE INDEX IF NOT EXISTS idx_xero_invoices_type ON xero_invoices(invoice_type);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_xero_invoices_status ON xero_invoices(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'contact_xero_id') THEN
        CREATE INDEX IF NOT EXISTS idx_xero_invoices_contact ON xero_invoices(contact_xero_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'xero_invoices' AND column_name = 'due_date') THEN
        CREATE INDEX IF NOT EXISTS idx_xero_invoices_due_date ON xero_invoices(due_date);
    END IF;
END $$;

-- ============================================================================
-- FINANCIAL SNAPSHOTS TABLE
-- ============================================================================
-- Daily/weekly snapshots for trend analysis
CREATE TABLE IF NOT EXISTS xero_financial_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Snapshot timing
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(20) NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'

    -- Accounts Receivable summary
    ar_total DECIMAL(15, 2) DEFAULT 0, -- Total outstanding receivables
    ar_count INTEGER DEFAULT 0, -- Number of outstanding invoices
    ar_overdue_total DECIMAL(15, 2) DEFAULT 0, -- Overdue amount
    ar_overdue_count INTEGER DEFAULT 0, -- Number of overdue invoices
    ar_overdue_1_30_days DECIMAL(15, 2) DEFAULT 0,
    ar_overdue_31_60_days DECIMAL(15, 2) DEFAULT 0,
    ar_overdue_61_90_days DECIMAL(15, 2) DEFAULT 0,
    ar_overdue_90_plus_days DECIMAL(15, 2) DEFAULT 0,

    -- Accounts Payable summary
    ap_total DECIMAL(15, 2) DEFAULT 0, -- Total outstanding payables
    ap_count INTEGER DEFAULT 0, -- Number of outstanding bills
    ap_due_this_week DECIMAL(15, 2) DEFAULT 0,
    ap_due_this_month DECIMAL(15, 2) DEFAULT 0,

    -- Cash flow indicators
    net_position DECIMAL(15, 2) DEFAULT 0, -- AR - AP

    -- Revenue metrics (from paid invoices in period)
    revenue_this_period DECIMAL(15, 2) DEFAULT 0,
    invoices_issued_this_period INTEGER DEFAULT 0,

    -- R&D tracking (if configured)
    rd_spend_this_period DECIMAL(15, 2) DEFAULT 0,
    rd_tracking_category VARCHAR(255),

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint on date + type
    UNIQUE(snapshot_date, snapshot_type)
);

-- Indexes for trend queries
CREATE INDEX IF NOT EXISTS idx_xero_snapshots_date ON xero_financial_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_xero_snapshots_type_date ON xero_financial_snapshots(snapshot_type, snapshot_date DESC);

-- ============================================================================
-- FINANCIAL ALERTS TABLE
-- ============================================================================
-- Track financial alerts for historical reference
CREATE TABLE IF NOT EXISTS xero_financial_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Alert details
    alert_type VARCHAR(100) NOT NULL, -- 'overdue_invoice', 'large_receivable', 'bill_due', etc.
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
    message TEXT NOT NULL,

    -- Related records
    related_invoice_id UUID REFERENCES xero_invoices(id),
    related_xero_id VARCHAR(255),
    amount DECIMAL(15, 2),

    -- Alert lifecycle
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xero_alerts_type ON xero_financial_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_xero_alerts_priority ON xero_financial_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_xero_alerts_active
    ON xero_financial_alerts(detected_at DESC)
    WHERE resolved_at IS NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at on xero_invoices
-- Note: update_updated_at_column already exists, but creating a specific one for safety
CREATE OR REPLACE FUNCTION update_xero_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS xero_invoices_updated_at ON xero_invoices;
CREATE TRIGGER xero_invoices_updated_at
    BEFORE UPDATE ON xero_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_xero_invoice_timestamp();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for current overdue receivables
CREATE OR REPLACE VIEW xero_overdue_receivables AS
SELECT
    xi.*,
    CURRENT_DATE - xi.due_date as days_overdue,
    CASE
        WHEN CURRENT_DATE - xi.due_date <= 30 THEN '1-30 days'
        WHEN CURRENT_DATE - xi.due_date <= 60 THEN '31-60 days'
        WHEN CURRENT_DATE - xi.due_date <= 90 THEN '61-90 days'
        ELSE '90+ days'
    END as aging_bucket
FROM xero_invoices xi
WHERE xi.invoice_type = 'ACCREC'
    AND xi.status IN ('AUTHORISED', 'SUBMITTED')
    AND xi.amount_due > 0
    AND xi.due_date < CURRENT_DATE
ORDER BY xi.due_date ASC;

-- View for upcoming payables (bills due)
CREATE OR REPLACE VIEW xero_upcoming_payables AS
SELECT
    xi.*,
    xi.due_date - CURRENT_DATE as days_until_due
FROM xero_invoices xi
WHERE xi.invoice_type = 'ACCPAY'
    AND xi.status IN ('AUTHORISED', 'SUBMITTED')
    AND xi.amount_due > 0
    AND xi.due_date >= CURRENT_DATE
ORDER BY xi.due_date ASC;

-- View for financial health summary
CREATE OR REPLACE VIEW xero_financial_health AS
SELECT
    (SELECT COALESCE(SUM(amount_due), 0) FROM xero_invoices WHERE invoice_type = 'ACCREC' AND status IN ('AUTHORISED', 'SUBMITTED') AND amount_due > 0) as total_receivables,
    (SELECT COUNT(*) FROM xero_invoices WHERE invoice_type = 'ACCREC' AND status IN ('AUTHORISED', 'SUBMITTED') AND amount_due > 0) as receivable_count,
    (SELECT COALESCE(SUM(amount_due), 0) FROM xero_invoices WHERE invoice_type = 'ACCREC' AND status IN ('AUTHORISED', 'SUBMITTED') AND amount_due > 0 AND due_date < CURRENT_DATE) as overdue_receivables,
    (SELECT COUNT(*) FROM xero_invoices WHERE invoice_type = 'ACCREC' AND status IN ('AUTHORISED', 'SUBMITTED') AND amount_due > 0 AND due_date < CURRENT_DATE) as overdue_count,
    (SELECT COALESCE(SUM(amount_due), 0) FROM xero_invoices WHERE invoice_type = 'ACCPAY' AND status IN ('AUTHORISED', 'SUBMITTED') AND amount_due > 0) as total_payables,
    (SELECT COUNT(*) FROM xero_invoices WHERE invoice_type = 'ACCPAY' AND status IN ('AUTHORISED', 'SUBMITTED') AND amount_due > 0) as payable_count,
    (SELECT COALESCE(SUM(amount_due), 0) FROM xero_invoices WHERE invoice_type = 'ACCPAY' AND status IN ('AUTHORISED', 'SUBMITTED') AND amount_due > 0 AND due_date <= CURRENT_DATE + INTERVAL '7 days') as payables_due_this_week,
    (SELECT MAX(synced_at) FROM xero_invoices) as last_sync;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_financial_alerts ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$ BEGIN
  CREATE POLICY "Service role full access on xero_invoices"
    ON xero_invoices FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on xero_financial_snapshots"
    ON xero_financial_snapshots FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access on xero_financial_alerts"
    ON xero_financial_alerts FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Read access for authenticated users
DO $$ BEGIN
  CREATE POLICY "Authenticated read access on xero_invoices"
    ON xero_invoices FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read access on xero_financial_snapshots"
    ON xero_financial_snapshots FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated read access on xero_financial_alerts"
    ON xero_financial_alerts FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE xero_invoices IS 'Xero invoices and bills for financial tracking. Type: ACCREC (receivable) or ACCPAY (payable)';
COMMENT ON TABLE xero_financial_snapshots IS 'Daily/weekly financial snapshots for trend analysis and reporting';
COMMENT ON TABLE xero_financial_alerts IS 'Financial alerts (overdue invoices, large amounts, etc.) with lifecycle tracking';
COMMENT ON VIEW xero_overdue_receivables IS 'Current overdue receivables with aging analysis';
COMMENT ON VIEW xero_upcoming_payables IS 'Bills due in the future, sorted by due date';
COMMENT ON VIEW xero_financial_health IS 'Summary view of current financial position';
