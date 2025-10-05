-- Ensure bookkeeping receipt linkage columns exist
alter table if exists public.bookkeeping_transactions
  add column if not exists receipt_id text,
  add column if not exists receipt_url text;

-- Create receipts table if missing (idempotent)
create table if not exists public.bookkeeping_receipts (
  id bigserial primary key,
  tenant_id text not null,
  receipt_id text,
  vendor text,
  amount numeric(14,2),
  currency text,
  receipt_date date,
  url text,
  status text,
  raw jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_book_receipts_tenant on public.bookkeeping_receipts(tenant_id, receipt_date desc);

-- Ask PostgREST to reload schema
do $$ begin
  perform pg_notify('pgrst','reload schema');
exception when others then null; end $$;

