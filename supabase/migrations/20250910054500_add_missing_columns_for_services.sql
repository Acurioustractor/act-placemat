-- Add missing columns expected by services to avoid PGRST204 schema cache errors
-- Safe to run multiple times due to IF NOT EXISTS

-- Projects: archived flag used by services for soft-hiding
alter table if exists public.projects
  add column if not exists archived boolean not null default false;

-- Organizations: archived flag referenced by sync/services
alter table if exists public.organizations
  add column if not exists archived boolean not null default false;

-- Opportunities: alignment_score referenced by recommendation/insights
alter table if exists public.opportunities
  add column if not exists alignment_score numeric;

-- Optionally ensure updated_at exists and auto-updates (best-effort)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='projects' and column_name='updated_at'
  ) then
    alter table public.projects add column updated_at timestamp with time zone default now();
  end if;
end $$;

-- Notify PostgREST to reload schema cache (Supabase)
-- Will be ignored if NOTIFY privileges are restricted
do $$ begin
  perform pg_notify('pgrst', 'reload schema');
exception when others then
  -- ignore if not permitted
  null;
end $$;

