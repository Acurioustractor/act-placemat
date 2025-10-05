-- Xero Financial Integration Tables
-- Provides comprehensive financial intelligence and bookkeeping
-- Created: 2025-09-29

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Xero Sync Status Table
-- Tracks sync state and health for Xero integration
-- ============================================================================
CREATE TABLE IF NOT EXISTS xero_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL UNIQUE, -- Xero tenant/organization ID
  tenant_name TEXT,
  user_email TEXT,
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'error', 'completed')),
  total_transactions INT DEFAULT 0,
  synced_transactions INT DEFAULT 0,
  error_message TEXT,
  error_count INT DEFAULT 0,
  last_error TIMESTAMPTZ,
  consecutive_errors INT DEFAULT 0,
  sync_duration_ms INT,
  api_calls_used INT DEFAULT 0,
  api_calls_remaining INT,
  api_quota_reset TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xero_sync_status_tenant ON xero_sync_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_sync_status_last_sync ON xero_sync_status(last_sync DESC);
CREATE INDEX IF NOT EXISTS idx_xero_sync_status_sync_status ON xero_sync_status(sync_status);

-- ============================================================================
-- Financial Transactions Table
-- Stores all financial transactions from Xero
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id TEXT UNIQUE NOT NULL, -- Xero transaction ID
  tenant_id TEXT NOT NULL,

  -- Transaction basics
  transaction_type TEXT CHECK (transaction_type IN (
    'invoice',
    'bill',
    'payment',
    'credit_note',
    'bank_transaction',
    'manual_journal',
    'expense_claim',
    'receipt'
  )),
  transaction_number TEXT, -- Invoice number, bill number, etc.
  reference TEXT,

  -- Parties
  contact_id TEXT, -- Xero contact ID
  contact_name TEXT,
  contact_email TEXT,
  person_id UUID REFERENCES person_identity_map(person_id),

  -- Amounts
  total_amount NUMERIC(15, 2) NOT NULL,
  subtotal_amount NUMERIC(15, 2),
  tax_amount NUMERIC(15, 2),
  currency_code TEXT DEFAULT 'AUD',
  exchange_rate NUMERIC(10, 6),

  -- Direction
  direction TEXT CHECK (direction IN ('income', 'expense')) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  is_reconciled BOOLEAN DEFAULT false,

  -- Dates
  transaction_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  fully_paid_date DATE,

  -- Status
  status TEXT CHECK (status IN (
    'draft',
    'submitted',
    'authorised',
    'paid',
    'voided',
    'deleted'
  )),

  -- Classification
  category TEXT, -- e.g., "Operating Expenses", "Revenue", "Cost of Goods Sold"
  account_code TEXT, -- Xero account code
  account_name TEXT,
  tracking_categories JSONB, -- Xero tracking categories

  -- Line items
  line_items JSONB DEFAULT '[]'::jsonb, -- Array of line item objects
  line_item_count INT DEFAULT 0,

  -- Tax compliance (Australian)
  gst_amount NUMERIC(15, 2), -- GST component
  gst_type TEXT, -- e.g., "INPUT", "OUTPUT", "NONE"
  is_bas_excluded BOOLEAN DEFAULT false, -- Excluded from BAS reporting

  -- Banking
  bank_account_id TEXT,
  bank_account_name TEXT,
  bank_transaction_id TEXT,

  -- Attachments
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INT DEFAULT 0,
  attachment_urls TEXT[],

  -- Intelligence
  keywords TEXT[],
  mentioned_projects UUID[], -- Project IDs mentioned
  ai_category TEXT, -- AI-suggested category
  ai_tags TEXT[],
  expense_claim_status TEXT, -- For expense claims

  -- Reconciliation
  reconciliation_date TIMESTAMPTZ,
  reconciled_by TEXT,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_xero_id ON financial_transactions(xero_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant ON financial_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_contact ON financial_transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_person_id ON financial_transactions(person_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_direction ON financial_transactions(direction);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_is_paid ON financial_transactions(is_paid) WHERE is_paid = false;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_due_date ON financial_transactions(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_account_code ON financial_transactions(account_code);

-- Index for GST/BAS reporting
CREATE INDEX IF NOT EXISTS idx_financial_transactions_gst ON financial_transactions(gst_type, transaction_date)
  WHERE gst_amount IS NOT NULL AND is_bas_excluded = false;

-- ============================================================================
-- Xero Contacts Table
-- Tracks customers, vendors, and other financial contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS xero_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_contact_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  person_id UUID REFERENCES person_identity_map(person_id),

  -- Contact details
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Type
  contact_type TEXT CHECK (contact_type IN ('customer', 'supplier', 'both')),
  is_customer BOOLEAN DEFAULT false,
  is_supplier BOOLEAN DEFAULT false,

  -- Status
  contact_status TEXT CHECK (contact_status IN ('active', 'archived', 'gdpr_request')),

  -- Address
  street_address TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Australia',

  -- Tax
  tax_number TEXT, -- ABN for Australian businesses
  tax_type TEXT,

  -- Banking
  bank_account_details TEXT,

  -- Financial summary
  accounts_receivable_balance NUMERIC(15, 2) DEFAULT 0,
  accounts_payable_balance NUMERIC(15, 2) DEFAULT 0,
  total_sales NUMERIC(15, 2) DEFAULT 0,
  total_purchases NUMERIC(15, 2) DEFAULT 0,

  -- Payment terms
  payment_terms TEXT,
  default_discount NUMERIC(5, 2),

  -- Relationship metrics
  first_transaction_date DATE,
  last_transaction_date DATE,
  transaction_count INT DEFAULT 0,
  average_transaction_value NUMERIC(15, 2),
  payment_history_score INT, -- 0-100 based on payment timeliness

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xero_contacts_xero_id ON xero_contacts(xero_contact_id);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_tenant ON xero_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_person_id ON xero_contacts(person_id);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_email ON xero_contacts(email);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_type ON xero_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_status ON xero_contacts(contact_status);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_is_customer ON xero_contacts(is_customer) WHERE is_customer = true;
CREATE INDEX IF NOT EXISTS idx_xero_contacts_is_supplier ON xero_contacts(is_supplier) WHERE is_supplier = true;

-- ============================================================================
-- Financial Intelligence Insights Table
-- AI-generated insights from financial analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_intelligence_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,

  -- Insight details
  insight_type TEXT CHECK (insight_type IN (
    'cash_flow_warning',
    'overdue_invoice',
    'payment_pattern_change',
    'expense_anomaly',
    'revenue_opportunity',
    'tax_deadline_approaching',
    'budget_variance',
    'vendor_payment_due',
    'grant_opportunity',
    'r_and_d_tax_eligible'
  )),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),

  -- Financial impact
  estimated_impact_amount NUMERIC(15, 2),
  impact_direction TEXT CHECK (impact_direction IN ('positive', 'negative', 'neutral')),

  -- Related entities
  related_transaction_ids UUID[], -- References financial_transactions
  related_contact_ids TEXT[], -- Xero contact IDs
  related_project_ids UUID[],

  -- Time context
  insight_date DATE,
  deadline_date DATE,

  -- Actions
  suggested_actions JSONB, -- Array of action objects
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,

  -- Compliance (Australian)
  is_tax_related BOOLEAN DEFAULT false,
  is_bas_related BOOLEAN DEFAULT false,
  is_grant_related BOOLEAN DEFAULT false,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_insights_tenant ON financial_intelligence_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_insights_type ON financial_intelligence_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_financial_insights_priority ON financial_intelligence_insights(priority);
CREATE INDEX IF NOT EXISTS idx_financial_insights_is_actioned ON financial_intelligence_insights(is_actioned) WHERE is_actioned = false;
CREATE INDEX IF NOT EXISTS idx_financial_insights_deadline ON financial_intelligence_insights(deadline_date) WHERE deadline_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_insights_tax ON financial_intelligence_insights(is_tax_related) WHERE is_tax_related = true;
CREATE INDEX IF NOT EXISTS idx_financial_insights_bas ON financial_intelligence_insights(is_bas_related) WHERE is_bas_related = true;

-- ============================================================================
-- BAS (Business Activity Statement) Tracking Table
-- Tracks Australian BAS reporting periods and submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS bas_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,

  -- Reporting period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  financial_year TEXT, -- e.g., "2024-2025"

  -- GST Summary
  total_sales NUMERIC(15, 2) DEFAULT 0,
  gst_on_sales NUMERIC(15, 2) DEFAULT 0, -- G1
  export_sales NUMERIC(15, 2) DEFAULT 0, -- G2
  other_gst_free_sales NUMERIC(15, 2) DEFAULT 0, -- G3
  capital_purchases NUMERIC(15, 2) DEFAULT 0, -- G10
  non_capital_purchases NUMERIC(15, 2) DEFAULT 0, -- G11
  gst_on_purchases NUMERIC(15, 2) DEFAULT 0, -- 1A

  -- Calculations
  gst_payable NUMERIC(15, 2), -- G1 - 1A
  net_gst_position NUMERIC(15, 2), -- Total GST owed/refund

  -- PAYG
  payg_withheld NUMERIC(15, 2) DEFAULT 0, -- W1
  payg_installment NUMERIC(15, 2) DEFAULT 0, -- T1

  -- Status
  status TEXT CHECK (status IN ('draft', 'ready_to_lodge', 'lodged', 'overdue')),
  lodgement_due_date DATE,
  lodged_date DATE,
  lodged_by TEXT,

  -- ATO Reference
  ato_reference_number TEXT,
  ato_receipt_number TEXT,

  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_date DATE,
  reconciliation_notes TEXT,

  -- Calculations metadata
  transaction_count INT DEFAULT 0,
  last_calculated TIMESTAMPTZ,
  calculation_errors TEXT[],

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_bas_tracking_tenant ON bas_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bas_tracking_period ON bas_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_bas_tracking_status ON bas_tracking(status);
CREATE INDEX IF NOT EXISTS idx_bas_tracking_due_date ON bas_tracking(lodgement_due_date) WHERE status != 'lodged';
CREATE INDEX IF NOT EXISTS idx_bas_tracking_financial_year ON bas_tracking(financial_year);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================
DO $$ BEGIN
  CREATE TRIGGER update_xero_sync_status_updated_at
    BEFORE UPDATE ON xero_sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_xero_contacts_updated_at
    BEFORE UPDATE ON xero_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_financial_insights_updated_at
    BEFORE UPDATE ON financial_intelligence_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bas_tracking_updated_at
    BEFORE UPDATE ON bas_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE xero_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_intelligence_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE bas_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your tenant/user mapping)
CREATE POLICY "Users can view their organization's xero sync status"
  ON xero_sync_status FOR SELECT
  USING (true); -- Customize based on your tenant-to-user mapping

CREATE POLICY "Users can view their organization's financial transactions"
  ON financial_transactions FOR SELECT
  USING (true); -- Customize based on your tenant-to-user mapping

CREATE POLICY "Users can view their organization's xero contacts"
  ON xero_contacts FOR SELECT
  USING (true);

CREATE POLICY "Users can view their organization's financial insights"
  ON financial_intelligence_insights FOR SELECT
  USING (true);

CREATE POLICY "Users can view their organization's BAS tracking"
  ON bas_tracking FOR SELECT
  USING (true);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE xero_sync_status IS 'Tracks Xero API sync status and health metrics';
COMMENT ON TABLE financial_transactions IS 'Stores all financial transactions from Xero with Australian tax compliance';
COMMENT ON TABLE xero_contacts IS 'Tracks customers, vendors, and financial contacts from Xero';
COMMENT ON TABLE financial_intelligence_insights IS 'AI-generated insights from financial analysis including Australian compliance';
COMMENT ON TABLE bas_tracking IS 'Tracks Australian BAS (Business Activity Statement) reporting periods and submissions';