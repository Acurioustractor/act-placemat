-- Financial summary table for community revenue transparency dashboard
create table if not exists public.financial_summary (
  id uuid primary key default gen_random_uuid(),
  reported_at timestamp with time zone not null default now(),
  total_revenue numeric(14,2) not null default 0,
  community_share numeric(14,2) not null default 0,
  community_percentage numeric(5,2) not null default 0,
  operating_expenses numeric(14,2) not null default 0,
  net_available_for_communities numeric(14,2) not null default 0,
  income numeric(14,2) not null default 0,
  expenses numeric(14,2) not null default 0,
  net_income numeric(14,2) not null default 0,
  transaction_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create index if not exists financial_summary_reported_at_idx on public.financial_summary (reported_at desc);
