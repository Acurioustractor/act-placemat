-- Xero Financial Integration Database Schema
-- Australian business compliance focused (GST, BAS, PAYG)

-- Xero sync status tracking
CREATE TABLE IF NOT EXISTS xero_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT UNIQUE NOT NULL,
  organization_name TEXT,
  sync_status TEXT CHECK (sync_status IN ('idle', 'syncing', 'completed', 'error')) DEFAULT 'idle',
  last_sync TIMESTAMPTZ,
  next_sync TIMESTAMPTZ,
  total_invoices INTEGER DEFAULT 0,
  total_bills INTEGER DEFAULT 0,
  total_contacts INTEGER DEFAULT 0,
  synced_items INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_message TEXT,
  last_error TIMESTAMPTZ,
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Xero invoices (sales)
CREATE TABLE IF NOT EXISTS xero_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  invoice_number TEXT,
  type TEXT CHECK (type IN ('ACCREC', 'ACCPAY')) NOT NULL, -- ACCREC=sales, ACCPAY=bills
  status TEXT, -- DRAFT, SUBMITTED, AUTHORISED, PAID
  contact_id TEXT,
  contact_name TEXT,
  date DATE,
  due_date DATE,
  total NUMERIC(15, 2),
  subtotal NUMERIC(15, 2),
  total_tax NUMERIC(15, 2), -- GST amount
  amount_due NUMERIC(15, 2),
  amount_paid NUMERIC(15, 2),
  currency_code TEXT DEFAULT 'AUD',
  line_items JSONB, -- Store full line items
  has_attachments BOOLEAN DEFAULT false,
  reference TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Xero contacts (customers/suppliers)
CREATE TABLE IF NOT EXISTS xero_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  is_customer BOOLEAN DEFAULT false,
  is_supplier BOOLEAN DEFAULT false,
  abn TEXT, -- Australian Business Number
  tax_number TEXT,
  account_number TEXT,
  balance NUMERIC(15, 2) DEFAULT 0,
  outstanding_receivable NUMERIC(15, 2) DEFAULT 0, -- Money owed to you
  outstanding_payable NUMERIC(15, 2) DEFAULT 0, -- Money you owe
  addresses JSONB,
  phones JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Xero bank transactions
CREATE TABLE IF NOT EXISTS xero_bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_id TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('SPEND', 'RECEIVE')) NOT NULL,
  status TEXT,
  contact_id TEXT,
  contact_name TEXT,
  date DATE,
  total NUMERIC(15, 2),
  subtotal NUMERIC(15, 2),
  total_tax NUMERIC(15, 2),
  bank_account_id TEXT,
  bank_account_name TEXT,
  reference TEXT,
  line_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Australian BAS (Business Activity Statement) tracking
CREATE TABLE IF NOT EXISTS xero_bas_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gst_on_sales NUMERIC(15, 2) DEFAULT 0, -- G1: GST collected
  gst_on_purchases NUMERIC(15, 2) DEFAULT 0, -- 1A: GST paid
  payg_withheld NUMERIC(15, 2) DEFAULT 0, -- W1: PAYG withheld
  net_gst NUMERIC(15, 2) DEFAULT 0, -- GST to pay or refund
  status TEXT CHECK (status IN ('draft', 'ready_to_lodge', 'lodged', 'overdue')) DEFAULT 'draft',
  lodged_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX idx_xero_invoices_tenant ON xero_invoices(tenant_id);
CREATE INDEX idx_xero_invoices_date ON xero_invoices(date DESC);
CREATE INDEX idx_xero_invoices_contact ON xero_invoices(contact_id);
CREATE INDEX idx_xero_invoices_status ON xero_invoices(status);
CREATE INDEX idx_xero_contacts_tenant ON xero_contacts(tenant_id);
CREATE INDEX idx_xero_contacts_email ON xero_contacts(email);
CREATE INDEX idx_xero_bank_transactions_tenant ON xero_bank_transactions(tenant_id);
CREATE INDEX idx_xero_bank_transactions_date ON xero_bank_transactions(date DESC);
CREATE INDEX idx_xero_bas_tenant_period ON xero_bas_tracking(tenant_id, period_start, period_end);

-- Disable RLS for backend sync
ALTER TABLE xero_sync_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE xero_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE xero_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE xero_bank_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE xero_bas_tracking DISABLE ROW LEVEL SECURITY;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';