-- Billing & Subscriptions Schema (idempotent)
-- Core entities to support Sprint 2: Accounts & Billing MVP

BEGIN;

-- Products represent what we sell (map to Xero items/accounts; Stripe products)
CREATE TABLE IF NOT EXISTS public.billing_products (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  accounting_account_code TEXT,     -- Xero account code mapping
  xero_item_code TEXT,              -- Xero inventory item code (optional)
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bprod_tenant ON public.billing_products (tenant_id, active);

-- Prices define how a product is billed (maps to Stripe prices)
CREATE TABLE IF NOT EXISTS public.billing_prices (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES public.billing_products(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  unit_amount NUMERIC(14,2) NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('month','year','one_time')),
  usage_type TEXT DEFAULT 'licensed' CHECK (usage_type IN ('licensed','metered')),
  trial_days INTEGER,
  stripe_price_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bprice_product ON public.billing_prices (product_id, active);

-- Customers link tenants to paying entities (maps to Stripe customers, Xero contacts)
CREATE TABLE IF NOT EXISTS public.billing_customers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  stripe_customer_id TEXT,
  xero_contact_id TEXT,
  default_payment_brand TEXT,
  default_payment_last4 TEXT,
  billing_address JSONB,
  shipping_address JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bcust_tenant_email ON public.billing_customers (tenant_id, email);

-- Subscriptions capture recurring service access
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id BIGINT REFERENCES public.billing_customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN (
    'trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused'
  )),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bsub_tenant_status ON public.billing_subscriptions (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bsub_customer ON public.billing_subscriptions (customer_id);

-- Subscription items connect subscriptions to concrete prices and quantities
CREATE TABLE IF NOT EXISTS public.billing_subscription_items (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT REFERENCES public.billing_subscriptions(id) ON DELETE CASCADE,
  price_id BIGINT REFERENCES public.billing_prices(id),
  quantity INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bsubitem_sub ON public.billing_subscription_items (subscription_id);

-- Invoices generated for subscriptions or one-off charges
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id BIGINT REFERENCES public.billing_customers(id) ON DELETE SET NULL,
  subscription_id BIGINT REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT,
  currency TEXT,
  subtotal NUMERIC(14,2) DEFAULT 0,
  tax_total NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft','open','paid','uncollectible','void')),
  due_date DATE,
  issued_at TIMESTAMP WITH TIME ZONE,
  stripe_invoice_id TEXT,
  xero_invoice_id TEXT,
  pdf_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_binv_tenant_status ON public.billing_invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_binv_customer ON public.billing_invoices (customer_id);

-- Invoice line items
CREATE TABLE IF NOT EXISTS public.billing_invoice_lines (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_amount NUMERIC(14,2) DEFAULT 0,
  amount NUMERIC(14,2) DEFAULT 0,
  product_id BIGINT REFERENCES public.billing_products(id),
  price_id BIGINT REFERENCES public.billing_prices(id),
  tax_rate NUMERIC(5,2) DEFAULT 0,
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_bilines_invoice ON public.billing_invoice_lines (invoice_id);

-- Payments recorded against invoices (maps to Stripe payment intents/charges)
CREATE TABLE IF NOT EXISTS public.billing_payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded','failed','pending','refunded')),
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  failure_code TEXT,
  failure_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bpay_invoice ON public.billing_payments (invoice_id, status);

-- Coupons/discounts (simple MVP)
CREATE TABLE IF NOT EXISTS public.billing_coupons (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  percent_off NUMERIC(5,2) CHECK (percent_off >= 0 AND percent_off <= 100),
  amount_off NUMERIC(14,2),
  currency TEXT,
  duration TEXT CHECK (duration IN ('once','repeating','forever')),
  duration_in_months INTEGER,
  max_redemptions INTEGER,
  redeem_by TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bcoupon_tenant_code ON public.billing_coupons (tenant_id, code);

-- Tax rates/settings
CREATE TABLE IF NOT EXISTS public.billing_tax_rates (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  inclusive BOOLEAN DEFAULT FALSE,
  jurisdiction TEXT,
  active BOOLEAN DEFAULT TRUE,
  stripe_tax_rate_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_btax_tenant_active ON public.billing_tax_rates (tenant_id, active);

CREATE TABLE IF NOT EXISTS public.billing_tax_settings (
  tenant_id TEXT PRIMARY KEY,
  default_tax_rate_id BIGINT REFERENCES public.billing_tax_rates(id),
  tax_behavior TEXT CHECK (tax_behavior IN ('exclusive','inclusive')),
  country TEXT,
  region TEXT,
  metadata JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Webhook events (Stripe, Xero)
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','xero')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','error')),
  error_message TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_bwebhook_provider_status ON public.billing_webhook_events (provider, status);

COMMIT;



